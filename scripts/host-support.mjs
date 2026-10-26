import { createServer, request as httpRequest } from 'node:http';
import { randomBytes } from 'node:crypto';

export function isTunnelOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.origin === origin && !url.port && ['.trycloudflare.com', '.lhr.life', '.localhost.run'].some(suffix => url.hostname.endsWith(suffix));
  } catch { return false; }
}

export function blockedHostPath(rawPath) {
  try {
    let path = new URL(rawPath, 'http://localhost').pathname;
    for (let i = 0; i < 3; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
    path = path.replaceAll('\\', '/');
    return /(?:^|\/)\.{1,2}(?:\/|$)/.test(path) || /^\/(?:cdn-cgi(?:\/|$)|__|@|\.|setup(?:\/|$))/i.test(path);
  } catch { return true; }
}

export async function hostIsReady(port, publicOrigin) {
  return new Promise(resolve => {
    // Node fetch does not preserve a custom Host header. Use the HTTP client
    // here, exactly as cloudflared does when it forwards the public hostname.
    const request = httpRequest({ hostname: '127.0.0.1', port, path: '/api/auth', headers: { host: new URL(publicOrigin).host } }, response => {
      let body = '';
      response.on('data', chunk => { body += chunk; if (body.length > 65536) request.destroy(); });
      response.on('error', () => resolve(false));
      response.on('end', () => {
        try { resolve(response.statusCode === 200 && JSON.parse(body).setup === null); }
        catch { resolve(false); }
      });
    });
    request.on('error', () => resolve(false));
    request.setTimeout(2000, () => request.destroy());
    request.end();
  });
}

// Never tunnel Wrangler's listener directly: it also has development endpoints.
export async function startHostGateway(backendPort) {
  let publicOrigin;
  const checkId = randomBytes(12).toString('hex');
  const server = createServer((request, response) => {
    response.setHeader('x-thinkup-host-check', checkId);
    if (!publicOrigin) { response.writeHead(503); response.end('THINK UP is starting.'); return; }
    if (request.headers.host !== new URL(publicOrigin).host || blockedHostPath(request.url)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const headers = { ...request.headers, host: new URL(publicOrigin).host };
    for (const name of Object.keys(headers)) {
      if (name.startsWith('oai-authenticated-') || name.startsWith('x-forwarded-') || name === 'forwarded' || name === 'connection' || name === 'upgrade') delete headers[name];
    }
    const upstream = httpRequest({ hostname: '127.0.0.1', port: backendPort, path: request.url, method: request.method, headers }, result => {
      response.writeHead(result.statusCode, result.headers);
      result.pipe(response);
      result.on('error', () => response.destroy());
    });
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end('THINK UP is unavailable.'); });
    request.on('aborted', () => upstream.destroy());
    response.on('close', () => { if (!response.writableFinished) upstream.destroy(); });
    request.pipe(upstream);
  });
  server.on('upgrade', (_request, socket) => socket.destroy());
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    port: server.address().port,
    checkId,
    setPublicOrigin(origin) {
      if (!isTunnelOrigin(origin)) throw new Error('Expected a supported tunnel HTTPS origin.');
      publicOrigin = origin;
    },
    async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
