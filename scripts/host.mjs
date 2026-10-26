import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { requireChatGPTLogin, startCodexBridge } from './codex-bridge.mjs';
import { startHostGateway, hostIsReady } from './host-support.mjs';
import { startPublicTunnel, publicFetch, tunnelReachable } from './host-tunnel.mjs';
import { startHostBackend } from './host-backend.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
// Wrangler receives bridge credentials in memory. Do not log runtime bindings.
process.env.WRANGLER_WRITE_LOGS = 'false';
process.env.WRANGLER_SEND_METRICS = 'false';
process.env.MINIFLARE_REGISTRY_PATH = resolve(root, '.wrangler/registry');
const environment = { ...process.env };
for (const key of ['OPENAI_API_KEY', 'CODEX_API_KEY', 'CODEX_ACCESS_TOKEN', 'THINKUP_CODEX_BRIDGE_URL', 'THINKUP_CODEX_BRIDGE_TOKEN', 'CODEX_BRIDGE_URL', 'CODEX_BRIDGE_TOKEN']) delete environment[key];
const children = new Set();
const controller = new AbortController();
let gateway, bridge, worker, tunnel, generatedConfig, statusFile;
let exitCode = 0, restart = false, watchdog;
const restarts = Number(process.env.THINKUP_HOST_RESTARTS || 0), maxRestarts = 30;
const stamp = () => new Date().toLocaleTimeString('vi-VN', { hour12: false });

function stop(code = 0) {
  if (controller.signal.aborted) return;
  exitCode = code;
  controller.abort();
  for (const child of children) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  }
}
// npm and the terminal may both forward Ctrl+C. Keep these handlers installed
// until cleanup finishes, including when a second signal arrives.
// Ctrl+C always ends the session, including while a restart is pending.
process.on('SIGINT', () => { restart = false; stop(); });
process.on('SIGTERM', () => { restart = false; stop(); });
function checkRunning() { controller.signal.throwIfAborted(); }
function start(command, args, stdio = 'inherit') {
  checkRunning();
  const child = spawn(command, args, { cwd: root, env: environment, stdio, shell: false, detached: process.platform !== 'win32' });
  children.add(child);
  child.once('close', () => children.delete(child));
  return child;
}
async function run(command, args) {
  await new Promise((resolveRun, reject) => {
    const child = start(command, args);
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolveRun() : reject(new Error(`${command} kết thúc với mã ${code}.`)));
  });
  checkRunning();
}
// A free tunnel can drop during a long session. Reopen everything (the link changes) instead of leaving a dead link.
function unexpectedExit(reason = 'Backend hoặc tunnel đã dừng.') {
  if (controller.signal.aborted) return;
  if (restarts < maxRestarts) { console.error(`\n[${stamp()}] ${reason} Đang tự mở lại host (link sẽ đổi)…`); restart = true; }
  else console.error(`\n[${stamp()}] ${reason} Đã tự mở lại ${maxRestarts} lần; chạy lại npm run host.`);
  stop(1);
}

try {
  try { await requireChatGPTLogin(); }
  catch (error) {
    if (!process.stdin.isTTY) throw error;
    console.log('Đăng nhập ChatGPT trên máy host để dùng hạn mức Codex của bạn…');
    await run(process.env.CODEX_BIN || 'codex', ['login']);
    await requireChatGPTLogin();
  }
  checkRunning();
  console.log('AI dùng tài khoản ChatGPT đã đăng nhập trên máy host; không dùng API key.');
  console.log('Đang build giao diện, backend, D1 và R2…');
  await run('npm', ['run', 'build']);
  bridge = await startCodexBridge({ maxQueue: 4 });
  checkRunning();
  const backendPort = await new Promise((resolvePort, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolvePort(port)); });
  });
  gateway = await startHostGateway(backendPort);
  checkRunning();
  tunnel = await startPublicTunnel(gateway, { root, signal: controller.signal, onExit: () => unexpectedExit('Tunnel đã ngắt.') });
  checkRunning();
  const publicOrigin = tunnel.origin;
  // Keep local bindings/data locations. Only non-secret settings go on disk.
  const config = JSON.parse(await readFile(resolve(root, 'dist/server/wrangler.json'), 'utf8'));
  config.main = resolve(root, 'dist/server', config.main);
  if (config.assets?.directory) config.assets.directory = resolve(root, 'dist/server', config.assets.directory);
  config.vars = { ...config.vars, THINKUP_PUBLIC_ORIGIN: publicOrigin, HOST_CODEX_ENABLED: 'true' };
  for (const key of ['OPENAI_API_KEY', 'CODEX_BRIDGE_TOKEN', 'CODEX_BRIDGE_URL']) delete config.vars[key];
  generatedConfig = resolve(root, `.wrangler-host-${process.pid}.json`);
  await writeFile(generatedConfig, JSON.stringify(config), { mode: 0o600, flag: 'wx' });
  checkRunning();
  worker = await startHostBackend({
    root, main: config.main, config: generatedConfig, port: backendPort,
    env: environment, signal: controller.signal,
    vars: { ...config.vars, CODEX_BRIDGE_URL: bridge.url, CODEX_BRIDGE_TOKEN: bridge.token },
  });
  checkRunning();
  worker.waitUntilExit().then(() => unexpectedExit('Backend đã dừng.'), () => unexpectedExit('Backend đã dừng.'));
  if (!await hostIsReady(gateway.port, publicOrigin)) throw new Error('Backend chưa sẵn sàng. Hãy chạy lại npm run host.');
  const response = await publicFetch(publicOrigin + '/api/auth', { timeout: 15000 });
  if (response.status !== 200 || JSON.parse(response.text).setup !== null) throw new Error('Chưa xác minh được backend qua HTTPS. Hãy chạy lại npm run host.');
  checkRunning();
  if (process.platform === 'darwin') {
    const awake = start('/usr/bin/caffeinate', ['-i', '-w', String(process.pid)], 'ignore');
    awake.on('error', () => console.warn('Hãy giữ máy không sleep trong lúc host.'));
  }
  await mkdir(resolve(root, '.wrangler'), { recursive: true });
  await writeFile(resolve(root, '.wrangler/host-url.txt'), `${publicOrigin}\n`);
  // Check the public link every minute; three misses in a row means the tunnel is gone even if its process lingers.
  let misses = 0;
  watchdog = setInterval(async () => {
    if (controller.signal.aborted) return;
    if (await tunnelReachable(publicOrigin, gateway)) { if (misses) console.log(`[${stamp()}] Link hoạt động lại.`); misses = 0; return; }
    misses += 1;
    console.warn(`[${stamp()}] Không truy cập được link công khai (${misses}/3).`);
    if (misses >= 3) unexpectedExit('Link công khai không còn truy cập được.');
  }, 60000);
  statusFile = resolve(root, `.wrangler/host-${process.pid}.json`);
  await writeFile(statusFile, JSON.stringify({ pid: process.pid, origin: publicOrigin, gatewayPort: gateway.port, provider: tunnel.provider, ai: 'codex-chatgpt', model: process.env.CODEX_MODEL || 'gpt-5.6-luna', ready: true }), { mode: 0o600, flag: 'wx' });
  console.log(`\n[${stamp()}] THINK UP đã sẵn sàng qua ${tunnel.provider}: web + backend + database + tệp + AI.\n\n  ${publicOrigin}\n\n${tunnel.provider==='Cloudflare'?'':'Lưu ý: đang dùng đường dự phòng localhost.run, kém ổn định hơn Cloudflare và có thể đổi link sau vài giờ.\n\n'}Link hiện tại luôn được ghi trong .wrangler/host-url.txt. Nếu link rớt, host tự mở lại và in link mới.\nMọi người đăng nhập bằng tài khoản THINK UP hiện tại. Các lượt AI dùng hạn mức Codex của tài khoản ChatGPT trên máy này.\nGiữ Terminal mở, máy có mạng và nắp máy mở. Ctrl+C để dừng.\nLần sau: npm run host (URL mới, giữ dữ liệu và mật khẩu cũ).\n`);
  await new Promise(resolveStop => {
    if (controller.signal.aborted) resolveStop();
    else controller.signal.addEventListener('abort', resolveStop, { once: true });
  });
} catch (error) {
  if (!controller.signal.aborted) { console.error(error.message); exitCode = 1; }
} finally {
  clearInterval(watchdog);
  stop(exitCode);
  await Promise.allSettled([tunnel?.close(), gateway?.close(), worker?.stop(), bridge?.close()]);
  for (const path of [generatedConfig, statusFile]) if (path) await unlink(path).catch(() => {});
  process.exitCode = exitCode;
  if (restart) await new Promise(resolveWait => setTimeout(resolveWait, 5000));
  if (restart) {
    const next = spawn(process.execPath, [fileURLToPath(import.meta.url)], { cwd: root, stdio: 'inherit', env: { ...process.env, THINKUP_HOST_RESTARTS: String(restarts + 1) } });
    // Ctrl+C reaches the new host through the terminal's process group; this process only waits for it.
    process.exitCode = await new Promise(resolveExit => next.once('exit', code => resolveExit(code ?? 0)));
  } else console.log('\nĐã dừng host. Database và tệp trong .wrangler/state được giữ nguyên.');
}
