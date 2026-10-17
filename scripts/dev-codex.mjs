import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireChatGPTLogin, startCodexBridge } from './codex-bridge.mjs';

try {
  await requireChatGPTLogin();
  const bridge = await startCodexBridge();
  const cli = fileURLToPath(new URL('../node_modules/vinext/dist/cli.js', import.meta.url));
  console.log(`THINK UP · Codex local (${process.env.CODEX_MODEL || 'gpt-5.6-luna'}). Dùng phiên đăng nhập ChatGPT trên máy này.`);
  const child = spawn(process.execPath, [cli, 'dev', '--hostname', '127.0.0.1', ...process.argv.slice(2)], {
    stdio: 'inherit', shell: false,
    env: { ...process.env, WRANGLER_LOG_PATH: '.wrangler/wrangler.log', THINKUP_CODEX_BRIDGE_URL: bridge.url, THINKUP_CODEX_BRIDGE_TOKEN: bridge.token },
  });
  const stop = signal => child.kill(signal);
  process.once('SIGINT', () => stop('SIGINT')); process.once('SIGTERM', () => stop('SIGTERM'));
  child.once('error', async () => { await bridge.close(); console.error('Không khởi động được THINK UP. Kiểm tra npm install.'); process.exitCode = 1; });
  child.once('exit', async code => { await bridge.close(); process.exitCode = code ?? 0; });
} catch (error) { console.error(error.message); process.exitCode = 1; }
