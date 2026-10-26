import { resolve } from 'node:path';

let worker, starting = false, stopping = false;
async function stop() {
  stopping = true;
  if (starting) return;
  await worker?.stop();
  process.exit(0);
}
process.on('disconnect', () => { void stop(); });
process.on('message', async message => {
  if (message.type === 'stop') { await stop(); return; }
  if (message.type !== 'start' || starting || worker || stopping) return;
  starting = true;
  try {
    const { root, main, config, port, vars, persistTo } = message.options;
    const { unstable_dev } = await import('wrangler');
    worker = await unstable_dev(main, {
      config, local: true, ip: '127.0.0.1', port, inspectorPort: 0,
      persist: true, persistTo: persistTo || resolve(root, '.wrangler/state'), logLevel: 'none', vars,
      experimental: { disableExperimentalWarning: true, disableDevRegistry: true, watch: false, showInteractiveDevSession: false },
    });
    starting = false;
    if (stopping || !process.connected) { await stop(); return; }
    process.send({ type: 'ready' });
    worker.waitUntilExit().then(() => { if (!stopping) process.exit(1); });
  } catch {
    if (process.connected) process.send({ type: 'error' });
    process.exit(1);
  }
});
