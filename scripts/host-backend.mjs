import { fork } from 'node:child_process';
import { resolve } from 'node:path';

// Keep Wrangler's CLI signal handlers in their own process. Credentials travel
// over private IPC, never through argv, files or the public HTTP gateway.
export async function startHostBackend({ root, main, config, port, vars, env, signal, persistTo }) {
  const child = fork(resolve(root, 'scripts/host-worker.mjs'), [], {
    cwd: root, env, execArgv: [], detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const exited = new Promise(resolveExit => child.once('close', resolveExit));
  let stopping, closing = false;
  function stop() {
    return stopping ??= (async () => {
      closing = true;
      signal?.removeEventListener('abort', abort);
      if (child.exitCode !== null || child.signalCode !== null) return;
      if (child.connected) child.send({ type: 'stop' }, () => {});
      const timer = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }, 5000); timer.unref();
      await exited; clearTimeout(timer);
    })();
  }
  const abort = () => { void stop(); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    signal?.throwIfAborted();
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error('Backend không khởi động được trong 60 giây.')), 60000);
      function done(error) { clearTimeout(timer); if (error) reject(error); else resolveReady(); }
      child.once('error', error => done(error));
      child.on('message', message => {
        if (message.type === 'ready') done();
        if (message.type === 'error') done(new Error('Backend chưa khởi động được. Hãy chạy lại npm run host.'));
      });
      child.once('close', () => done(new Error(closing ? 'Đã dừng host.' : 'Backend đã dừng khi khởi động.')));
      child.send({ type: 'start', options: { root, main, config, port, vars, persistTo } }, error => { if (error) done(error); });
    });
    return { stop, waitUntilExit: () => exited };
  } catch (error) { await stop(); throw error; }
}
