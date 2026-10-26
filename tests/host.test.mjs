import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { tunnelRequest } from '../lib/tunnel-request.ts';
import { startHostGateway, blockedHostPath, hostIsReady, isTunnelOrigin } from '../scripts/host-support.mjs';
import { sessionCookieHeader } from '../lib/security.ts';

test('host accepts both HTTPS tunnel providers and rejects other origins', () => {
  for (const origin of ['https://class.trycloudflare.com', 'https://abc.lhr.life', 'https://abc.localhost.run']) assert.equal(isTunnelOrigin(origin), true, origin);
  for (const origin of ['http://abc.lhr.life', 'https://abc.lhr.life/path', 'https://abc.lhr.life:8443', 'https://user:pass@abc.lhr.life', 'https://lhr.life', 'https://abc.lhr.life.attacker.example', 'https://example.com']) assert.equal(isTunnelOrigin(origin), false, origin);
});

test('public requests preserve the body and enforce HTTPS without trusting identity/proxy headers', async () => {
  const incoming = new Request('http://localhost:3000/api/auth/login?next=%2Fadmin', {
    method: 'POST', body: JSON.stringify({ email: 'student@example.edu' }),
    headers: { origin: 'https://class.trycloudflare.com', 'content-type': 'application/json', 'oai-authenticated-user-id': 'local-owner', 'oai-authenticated-user-email': 'owner@thinkup.local', 'x-forwarded-host': 'localhost:3000', 'x-forwarded-proto': 'http', forwarded: 'host=localhost', cookie: 'thinkup-session=test' },
  });
  const request = tunnelRequest(incoming, 'https://class.trycloudflare.com');
  assert.equal(request.url, 'https://class.trycloudflare.com/api/auth/login?next=%2Fadmin');
  assert.equal(request.headers.get('host'), 'class.trycloudflare.com');
  for (const name of ['oai-authenticated-user-id', 'oai-authenticated-user-email', 'x-forwarded-host', 'x-forwarded-proto', 'forwarded']) assert.equal(request.headers.get(name), null);
  assert.equal(request.headers.get('origin'), new URL(request.url).origin);
  assert.equal(request.headers.get('cookie'), 'thinkup-session=test');
  assert.equal((await request.json()).email, 'student@example.edu');
  assert.match(sessionCookieHeader('test', request), /; Secure$/);
  const crossSite = tunnelRequest(new Request('http://localhost/api/auth', { headers: { origin: 'https://attacker.example' } }), 'https://class.trycloudflare.com');
  assert.notEqual(crossSite.headers.get('origin'), new URL(crossSite.url).origin);
});

test('normal local/Sites hosting is unchanged and invalid tunnel origins fail closed', () => {
  const request = new Request('http://localhost/api/auth');
  assert.equal(tunnelRequest(request), request);
  for (const origin of ['http://class.trycloudflare.com', 'https://localhost', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com?debug=1']) assert.throws(() => tunnelRequest(request, origin));
});

test('gateway denies debug, setup, hidden files and encoded bypasses', () => {
  for (const path of ['/cdn-cgi/explorer', '/CDN-CGI/explorer', '/%63dn-cgi/explorer', '/%2563dn-cgi/explorer', '/.dev.vars', '/@vite/client', '/__debug', '/setup', '/setup/', '/foo/../cdn-cgi/explorer', '/foo%2f..%2fcdn-cgi/explorer', '/%']) assert.equal(blockedHostPath(path), true, path);
  for (const path of ['/', '/login', '/api/auth/login', '/api/files/test', '/_vinext/image?url=test', '/assets/index.js', '/student?view=editor']) assert.equal(blockedHostPath(path), false, path);
});

test('gateway streams uploads and cookies, rejects foreign hosts and strips forged identities', async () => {
  const backend = createServer((request, response) => {
    if (request.url === '/api/auth') { response.end(JSON.stringify({ user: null, setup: null })); return; }
    let body = ''; request.on('data', chunk => body += chunk);
    request.on('end', () => { response.setHeader('set-cookie', 'thinkup-session=test; Secure; HttpOnly'); response.end(JSON.stringify({ method: request.method, path: request.url, headers: request.headers, body })); });
  });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  const gateway = await startHostGateway(backend.address().port);
  async function send(path, headers = {}, body = '') {
    return new Promise((resolve, reject) => {
      const request = httpRequest({ hostname: '127.0.0.1', port: gateway.port, method: body ? 'POST' : 'GET', path, headers }, response => {
        let text = ''; response.on('data', chunk => text += chunk); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text }));
      });
      request.on('error', reject); request.end(body);
    });
  }
  try {
    assert.equal((await send('/')).status, 503);
    gateway.setPublicOrigin('https://class.trycloudflare.com');
    assert.equal((await send('/')).status, 404);
    assert.equal(await hostIsReady(gateway.port, 'https://class.trycloudflare.com'), true);
    assert.equal((await send('/cdn-cgi/explorer', { host: 'class.trycloudflare.com' })).status, 404);
    const response = await send('/api/auth/login', { host: 'class.trycloudflare.com', origin: 'https://class.trycloudflare.com', 'oai-authenticated-user-id': 'local-owner', 'x-forwarded-host': 'localhost' }, 'test upload body');
    assert.equal(response.status, 200);
    const payload = JSON.parse(response.text);
    assert.equal(payload.body, 'test upload body');
    assert.equal(payload.method, 'POST');
    assert.equal(payload.headers.origin, 'https://class.trycloudflare.com');
    assert.equal(payload.headers['oai-authenticated-user-id'], undefined);
    assert.equal(payload.headers['x-forwarded-host'], undefined);
    assert.match(response.headers['set-cookie'][0], /Secure; HttpOnly/);
  } finally {
    await gateway.close();
    backend.closeAllConnections();
    await new Promise(resolve => backend.close(resolve));
  }
});
