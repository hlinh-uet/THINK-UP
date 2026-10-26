import { readFile, rename, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { hashPassword } from '../lib/security.ts';
import { localDatabaseId, localBucketName } from '../lib/local-bindings.mjs';
import { initializeDemoDatabase, seedDemo } from './seed-demo.mjs';
import { createShowcaseData, showcaseMarker, showcasePassword, loginAccounts } from './showcase/data.mjs';

// Replaces the local D1/R2 data with the trial dataset. The previous data is moved aside, never deleted.
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

async function main() {
  if (process.env.NODE_ENV === 'production' || process.argv.slice(2).some(a => a !== '--replace')) throw new Error('Lệnh này chỉ dựng dữ liệu dùng thử trên máy local. Dùng: npm run db:seed:showcase -- --replace');
  if (!process.argv.includes('--replace')) throw new Error('Lệnh sẽ thay toàn bộ dữ liệu local (bản cũ được chuyển sang .wrangler/backups). Dừng dev server rồi chạy lại với --replace.');
  process.chdir(projectRoot);
  const hosting = JSON.parse(await readFile(new URL('../.openai/hosting.json', import.meta.url), 'utf8'));
  const state = resolve(projectRoot, '.wrangler/state/v3'), backup = resolve(projectRoot, `.wrangler/backups/${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(backup, { recursive: true });
  for (const dir of ['d1', 'r2']) { try { await access(resolve(state, dir)); await rename(resolve(state, dir), resolve(backup, dir)); } catch { /* nothing to move */ } }
  const mf = new Miniflare({
    name: 'think-up-showcase-seed', modules: true,
    script: 'export default { fetch() { return new Response("Local seed runner"); } };',
    compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'],
    d1Databases: { [hosting.d1]: localDatabaseId }, r2Buckets: { [hosting.r2]: localBucketName },
    d1Persist: resolve(state, 'd1'), r2Persist: resolve(state, 'r2'),
  });
  try {
    const db = await mf.getD1Database(hosting.d1), bucket = await mf.getR2Bucket(hosting.r2);
    await initializeDemoDatabase(db);
    const data = createShowcaseData(await hashPassword(showcasePassword));
    await seedDemo(db, bucket, data, showcaseMarker);
    const count = table => data.tables[table].length;
    console.log(`Đã dựng dữ liệu dùng thử: ${count('users')} tài khoản, ${count('courses')} học phần, ${count('reflections')} bài reflection, ${count('reviews')} lượt đánh giá, ${count('actions')} cam kết, ${count('chat_messages')} tin nhắn.`);
    console.log(`Dữ liệu cũ đã được chuyển sang ${backup}`);
    console.table(loginAccounts.map(a => ({ ...a, password: showcasePassword })));
  } finally { await mf.dispose(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
