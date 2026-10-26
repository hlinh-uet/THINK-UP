import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { initializeDemoDatabase, seedDemo } from './seed-demo.mjs';
import { createDemoData, demoPassword } from './demo-data.mjs';
import { localDatabaseId, localBucketName } from '../lib/local-bindings.mjs';
import { hashPassword } from '../lib/security.ts';
import { startHostGateway, hostIsReady } from './host-support.mjs';
import { startHostBackend } from './host-backend.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'thinkup-host-test-'));
const state = join(scratch, '.wrangler/state');
const publicOrigin = 'https://host-test.trycloudflare.com';
const password = demoPassword;
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const mf = new Miniflare({ name: 'think-up-host-test-seed', modules: true, script: 'export default { fetch() { return new Response("Test seed"); } };', d1Databases: { DB: localDatabaseId }, r2Buckets: { FILES: localBucketName }, d1Persist: join(state, 'v3/d1'), r2Persist: join(state, 'v3/r2'), cache: false });
try {
  const db = await mf.getD1Database('DB');
  await initializeDemoDatabase(db);
  await seedDemo(db, await mf.getR2Bucket('FILES'), createDemoData(await hashPassword(demoPassword)));
} finally { await mf.dispose(); }

const backendPort = await new Promise((resolvePort, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolvePort(port)); });
});
const config = JSON.parse(await readFile(resolve(root, 'dist/server/wrangler.json'), 'utf8'));
config.main = resolve(root, 'dist/server', config.main);
config.assets.directory = resolve(root, 'dist/server', config.assets.directory);
config.vars = { THINKUP_PUBLIC_ORIGIN: publicOrigin };
const configPath = join(scratch, 'wrangler.json');
await writeFile(configPath, JSON.stringify(config));
const gateway = await startHostGateway(backendPort);
gateway.setPublicOrigin(publicOrigin);
const environment = { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_LOG_PATH: join(scratch, '.wrangler/test.log'), MINIFLARE_REGISTRY_PATH: join(scratch, '.wrangler/registry') };
for (const key of ['OPENAI_API_KEY', 'THINKUP_CODEX_BRIDGE_URL', 'THINKUP_CODEX_BRIDGE_TOKEN', 'CODEX_BRIDGE_URL', 'CODEX_BRIDGE_TOKEN']) delete environment[key];
// Exercise the same backend as npm run host, with watching disabled and isolated data.
const backend = await startHostBackend({root,main:config.main,config:configPath,port:backendPort,vars:config.vars,env:environment,persistTo:state});
let backendExited=false;
backend.waitUntilExit().then(()=>{backendExited=true});

async function request(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolveRequest, reject) => {
    const req = httpRequest({ hostname: '127.0.0.1', port: gateway.port, path, method, headers: { host: new URL(publicOrigin).host, ...headers } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolveRequest({ status: response.statusCode, headers: response.headers, text: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.setTimeout(15000, () => req.destroy(new Error('Request timed out.'))); req.end(body);
  });
}
async function auth(operation, data, origin = publicOrigin) {
  const response = await request(`/api/auth/${operation}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) });
  return { ...response, json: JSON.parse(response.text), cookie: response.headers['set-cookie']?.[0].split(';')[0] };
}
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    if (await hostIsReady(gateway.port, publicOrigin)) { ready = true; break; }
    if (backendExited) break;
    await new Promise(resolveWait => setTimeout(resolveWait, 300));
  }
  assert.ok(ready, 'Production host backend did not become ready.');
  // Document navigation must work through the public gateway, without a client-router fetch.
  const landing=await request('/');assert.equal(landing.status,200);
  assert.match(landing.text,/<a[^>]*class="public-login"[^>]*href="\/login"/);
  assert.match(landing.text,/<a[^>]*class="button primary public-account"[^>]*href="\/register"/);
  for(const path of ['/login','/register']){
    const page=await request(path);assert.equal(page.status,200,page.text);
    assert.match(page.text,/<form/);assert.match(page.text,/name="email"/);assert.match(page.text,/name="password"/);
    if(path==='/register')assert.match(page.text,/name="confirmation"/);
  }
  const stateResponse = await request('/api/auth', { headers: { 'oai-authenticated-user-id': 'local-owner', 'oai-authenticated-user-email': 'owner@thinkup.local', 'x-forwarded-host': 'localhost:3000' } });
  assert.equal(JSON.parse(stateResponse.text).setup, null);
  assert.equal(JSON.parse(stateResponse.text).user, null);
  assert.equal((await auth('login', { email: 'admin@thinkup.local', password }, 'https://other.example')).status, 403);
  const admin = await auth('login', { email: 'admin@thinkup.local', password });
  assert.equal(admin.status, 200, admin.text);
  assert.equal(admin.json.user.role, 'admin');
  assert.match(admin.headers['set-cookie'][0], /; Secure/);
  assert.equal((await request('/admin/courses', { headers: { cookie: admin.cookie } })).status, 200);
  const student = await auth('login', { email: 'student@thinkup.local', password: demoPassword });
  assert.equal(student.status, 200, student.text);
  const stateResponse2 = await request('/api/thinkup', { headers: { cookie: student.cookie } });
  const studentState = JSON.parse(stateResponse2.text);
  assert.equal(studentState.user.role, 'student');
  assert.equal(studentState.aiReady, false);
  assert.equal((await request('/student', { headers: { cookie: student.cookie } })).status, 200);
  const draft = studentState.reflections.find(reflection => reflection.status === 'draft');
  const saved = await request('/api/thinkup', { method: 'POST', headers: { cookie: student.cookie, origin: publicOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'save', id: draft.id, rev: draft.rev, title: 'TEST hosting round trip', content: draft.content, week: draft.week, courseId: draft.courseId }) });
  assert.equal(saved.status, 200, saved.text);
  const boundary = 'thinkup-test-upload';
  const body = `--${boundary}\r\nContent-Disposition: form-data; name="reflectionId"\r\n\r\n${draft.id}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="host-test.txt"\r\nContent-Type: text/plain\r\n\r\nTEST tunnel evidence\r\n--${boundary}--\r\n`;
  const uploaded = await request('/api/thinkup', { method: 'POST', headers: { cookie: student.cookie, origin: publicOrigin, 'content-type': `multipart/form-data; boundary=${boundary}` }, body });
  assert.equal(uploaded.status, 200, uploaded.text);
  const updated = JSON.parse((await request('/api/thinkup', { headers: { cookie: student.cookie } })).text);
  const attachment = updated.reflections.find(reflection => reflection.id === draft.id).attachments.find(file => file.name === 'host-test.txt');
  const downloaded = await request(`/api/files/${attachment.id}`, { headers: { cookie: student.cookie } });
  assert.equal(downloaded.status, 200, downloaded.text);
  assert.equal(downloaded.text, 'TEST tunnel evidence');
  assert.equal((await request(`/api/files/${attachment.id}`)).status, 401);
  for (const path of ['/setup', '/cdn-cgi/explorer', '/.dev.vars', '/@vite/client']) assert.equal((await request(path)).status, 404, path);
  console.log('PASS: production worker + gateway: landing links, registration/sign-in forms, admin/student login, secure cookies, SSR, D1 save, R2 upload/download, access checks and debug blocking.');
  console.log(`Scratch data only: ${scratch}. No AI calls or changes to the workspace database.`);
} catch (error) {
  console.error(`Scratch workspace: ${scratch}`);
  throw error;
} finally {
  await gateway.close();
  await backend.stop();
}
