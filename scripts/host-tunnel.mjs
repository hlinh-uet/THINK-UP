import { spawn } from 'node:child_process';
import { Resolver } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

// A new trycloudflare hostname takes 10–30 s to appear in DNS. Asking the system resolver earlier makes macOS cache
// the "not found" answer, so the link looks dead from this machine for minutes. Check through public resolvers instead.
const publicDns = new Resolver({ timeout: 3000, tries: 2 });
publicDns.setServers(['1.1.1.1', '8.8.8.8']);
function publicLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  publicDns.resolve4(hostname).then(addresses => {
    if (options?.all) callback(null, addresses.map(address => ({ address, family: 4 })));
    else callback(null, addresses[0], 4);
  }, error => callback(error));
}

/** GET a public tunnel URL without touching the system DNS cache. */
export function publicFetch(url, { timeout = 8000 } = {}) {
  return new Promise((resolveFetch, reject) => {
    const request = httpsRequest(url, { method: 'GET', lookup: publicLookup, headers: { 'user-agent': 'think-up-host-check' } }, response => {
      let text = '';
      response.on('data', chunk => { text += chunk; if (text.length > 65536) request.destroy(); });
      response.on('end', () => resolveFetch({ status: response.statusCode, headers: response.headers, text }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.setTimeout(timeout, () => request.destroy(new Error('timeout')));
    request.end();
  });
}

async function launchTunnel(command, args, pattern, { signal, onExit }) {
  let child, closing = false, closePromise, output = '', accepted = false;
  function close() {
    return closePromise ??= (async () => {
      closing = true;
      signal?.removeEventListener('abort', abort);
      if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise(resolveExit => child.once('close', resolveExit));
      child.kill('SIGTERM');
      const timer = setTimeout(() => child.kill('SIGKILL'), 2000); timer.unref();
      await exited; clearTimeout(timer);
    })();
  }
  const abort = () => { void close(); };
  try {
    if (signal?.aborted) throw new Error('Đã dừng host.');
    child = spawn(command, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    signal?.addEventListener('abort', abort, { once: true });
    const origin = await new Promise((resolveOrigin, reject) => {
      const timer = setTimeout(() => reject(new Error('Không nhận được URL HTTPS trong 45 giây.')), 45000);
      const done = (error, value) => { clearTimeout(timer); if (error) reject(error); else resolveOrigin(value); };
      for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
        output = (output + chunk).slice(-8000);
        const match = output.match(pattern);
        if (match) done(null, match[0]);
      });
      child.once('error', error => done(error));
      child.once('exit', code => done(new Error(`Tunnel kết thúc (${code}). ${output.slice(-500)}`)));
    });
    child.once('exit', () => { if (accepted && !closing && !signal?.aborted) onExit?.(); });
    return { origin, close, accept() {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error('Tunnel đã đóng.');
      accepted = true;
    } };
  } catch (error) { await close(); throw error; }
}

/** True when the public URL reaches this machine's gateway (its check header carries our random id). */
export async function tunnelReachable(origin, gateway, timeout = 8000) {
  try { return (await publicFetch(origin + '/.thinkup-host-check', { timeout })).headers['x-thinkup-host-check'] === gateway.checkId; }
  catch { return false; }
}

async function verifyTunnel(tunnel, gateway, signal, waitSeconds) {
  gateway.setPublicOrigin(tunnel.origin);
  const deadline = Date.now() + waitSeconds * 1000;
  let failure = '';
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Đã dừng host.');
    try {
      const response = await publicFetch(tunnel.origin + '/.thinkup-host-check', { timeout: 6000 });
      if (response.headers['x-thinkup-host-check'] === gateway.checkId) return;
      failure = `HTTP ${response.status}`;
    } catch (error) { failure = error.code || error.message; }
    await new Promise(resolveWait => setTimeout(resolveWait, 3000));
  }
  throw new Error(`Chưa truy cập được link HTTPS sau ${waitSeconds} giây (${failure}).`);
}

export async function startPublicTunnel(gateway, { root, signal, onExit, log = console.log } = {}) {
  const localOrigin = `http://127.0.0.1:${gateway.port}`;
  const options = { signal, onExit };
  const attempts = [
    { name: 'Cloudflare', command: process.env.CLOUDFLARED_PATH || 'cloudflared', args: ['tunnel', '--no-autoupdate', '--protocol', 'http2', '--url', localOrigin], pattern: /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/, wait: 90 },
    { name: 'localhost.run', command: 'ssh', args: ['-T', '-o', 'BatchMode=yes', '-o', 'PreferredAuthentications=none', '-o', 'IdentityAgent=none', '-o', 'IdentityFile=none', '-o', 'StrictHostKeyChecking=accept-new', '-o', `UserKnownHostsFile=${resolve(root, '.wrangler/tunnel-known-hosts')}`, '-o', 'ConnectTimeout=15', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ExitOnForwardFailure=yes', '-R', `80:127.0.0.1:${gateway.port}`, 'nokey@localhost.run'], pattern: /https:\/\/(?!admin\.|www\.)[a-z0-9-]+\.(?:lhr\.life|localhost\.run)\b/, wait: 30 },
  ];
  const failures = [];
  await mkdir(resolve(root, '.wrangler'), { recursive: true });
  for (const attempt of attempts) {
    if (signal?.aborted) throw new Error('Đã dừng host.');
    let tunnel;
    try {
      log(`Đang mở HTTPS qua ${attempt.name}…`);
      tunnel = await launchTunnel(attempt.command, attempt.args, attempt.pattern, options);
      await verifyTunnel(tunnel, gateway, signal, attempt.wait);
      tunnel.accept();
      return { ...tunnel, provider: attempt.name };
    } catch (error) {
      await tunnel?.close();
      failures.push(`${attempt.name}: ${error.message}`);
      if (!signal?.aborted) log(`${attempt.name} chưa kết nối được: ${error.message}\nĐang thử đường dự phòng…`);
    }
  }
  throw new Error(`Chưa mở được HTTPS. Kiểm tra kết nối mạng rồi chạy lại npm run host.\n${failures.join('\n')}`);
}
