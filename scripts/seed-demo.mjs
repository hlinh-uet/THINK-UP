import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { hashPassword } from '../lib/security.ts';
import { localDatabaseId, localBucketName } from '../lib/local-bindings.mjs';
import { createDemoData, demoMarker, demoPassword, demoUsers } from './demo-data.mjs';

// Use Wrangler's own Miniflare, including when npm does not hoist dependencies.
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const projectRoot = fileURLToPath(new URL('../', import.meta.url));

export async function initializeDemoDatabase(db) {
  for (const file of ['0000_polite_slyde.sql', '0001_heavy_the_watchers.sql', '0002_unusual_ben_parker.sql', '0003_whole_psylocke.sql', '0004_friendly_energizer.sql', '0005_final_requirements.sql']) {
    const sql = await readFile(new URL(`../drizzle/${file}`, import.meta.url), 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean).map(s => s.replace(/^CREATE TABLE /, 'CREATE TABLE IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /, 'CREATE UNIQUE INDEX IF NOT EXISTS ').replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS '));
    await db.batch(statements.map(s => db.prepare(s)));
  }
}

export async function seedDemo(db, bucket, data, marker=demoMarker) {
  if (await db.prepare('SELECT value FROM settings WHERE key=?').bind(marker).first()) return false;
  const statements = [];
  for (const [table, rows] of Object.entries(data.tables)) {
    for (const row of rows) {
      const columns = Object.keys(row);
      // Every write is guarded; the final marker is committed in the same D1 batch.
      const sql = `INSERT ${table === 'settings' ? 'OR IGNORE ' : ''}INTO ${table} (${columns.join(',')}) SELECT ${columns.map(() => '?').join(',')} WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key=?)`;
      statements.push(db.prepare(sql).bind(...Object.values(row), marker));
    }
  }
  statements.push(db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').bind(marker, new Date().toISOString()));
  const uploaded = [];
  try {
    for (const file of data.files) {
      // Never overwrite a user's attachment if a prior interrupted run left it here.
      if (!await bucket.head(file.key)) {
        await bucket.put(file.key, file.text, { httpMetadata: { contentType: 'text/plain' } });
        uploaded.push(file.key);
      }
    }
    await db.batch(statements);
  } catch (error) {
    for (const key of uploaded) await bucket.delete(key);
    throw error;
  }
  return true;
}

async function main() {
  if (process.argv.length > 2 || process.env.NODE_ENV === 'production') throw new Error('Lệnh này chỉ nạp demo local; không nhận tùy chọn remote/production.');
  process.chdir(projectRoot);
  const hosting = JSON.parse(await readFile(new URL('../.openai/hosting.json', import.meta.url), 'utf8'));
  if (!hosting.d1 || !hosting.r2) throw new Error('Dự án cần khai báo D1 và R2 để nạp dữ liệu demo.');
  const mf = new Miniflare({
    name: 'think-up-demo-seed', modules: true,
    script: 'export default { fetch() { return new Response("Local seed runner"); } };',
    compatibilityDate: '2026-05-15', compatibilityFlags: ['nodejs_compat'],
    d1Databases: { [hosting.d1]: localDatabaseId },
    r2Buckets: { [hosting.r2]: localBucketName },
    d1Persist: resolve(projectRoot, '.wrangler/state/v3/d1'),
    r2Persist: resolve(projectRoot, '.wrangler/state/v3/r2'),
  });
  try {
    const db = await mf.getD1Database(hosting.d1);
    const bucket = await mf.getR2Bucket(hosting.r2);
    await initializeDemoDatabase(db);
    const data = createDemoData(await hashPassword(demoPassword));
    const inserted = await seedDemo(db, bucket, data);
    console.log(inserted ? 'Đã nạp demo vào D1/R2 local (.wrangler/state).' : 'Demo đã được nạp trước đó. Giữ nguyên mọi chỉnh sửa, không thêm trùng.');
    console.log('8 tài khoản, 2 học phần, 14 bài reflection, 7 cam kết, 2 minh chứng.');
    console.table(demoUsers.map(({ email, role, active }) => ({ email, role, status: active ? 'Hoạt động' : 'Tạm ngừng' })));
    console.log(`Mật khẩu demo local: ${demoPassword}`);
  } finally {
    await mf.dispose();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
