// Explicit opt-in integration test: consumes the signed-in ChatGPT allowance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { demoPassword } from '../scripts/demo-data.mjs';
import { defaultRubric, defaultWeeks } from '../lib/domain.ts';

const root = process.env.THINKUP_TEST_URL || 'http://127.0.0.1:3011';
function image() {
  const width = 128, height = 128, rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * (width * 3 + 1) + 1 + x * 3;
    const color = x < width / 2 ? [255, 0, 0] : [0, 0, 255];
    color.forEach((value, index) => { rows[offset + index] = value; });
  }
  function chunk(type, value) {
    const body = Buffer.concat([Buffer.from(type), value]); let crc = 0xffffffff;
    for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    const length = Buffer.alloc(4), checksum = Buffer.alloc(4); length.writeUInt32BE(value.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
function pdf() {
  const stream = 'BT /F1 22 Tf 50 700 Td (TEST EVIDENCE: 17 responses recorded) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let value = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(value)); value += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(value); value += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(value);
}

test('local ChatGPT Codex analyzes text, images/PDF and lecturer submissions through THINK UP', { timeout: 600000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(root).hostname));
  const cookies = [], suffix = randomUUID().slice(0, 8);
  async function post(path, cookie, body) {
    const response = await fetch(root + path, { method: 'POST', headers: { Origin: root, ...(cookie ? { cookie } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(290000) });
    const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result));
    return { result, response };
  }
  async function login(email, password) {
    const { response } = await post('/api/auth/login', null, { email, password });
    const cookie = response.headers.get('set-cookie').split(';')[0]; cookies.push(cookie); return cookie;
  }
  const state = async cookie => { const response = await fetch(root + '/api/thinkup', { headers: { cookie } }); assert.equal(response.status, 200); return response.json(); };
  const mutate = async (cookie, body) => (await post('/api/thinkup', cookie, { ...body, aiProvider: 'codex', language: 'en' })).result;
  try {
    const email = `codex-local-${suffix}@thinkup.test`, password = `Codex local test ${suffix}!`;
    await post('/api/auth/register', null, { email, password, name: `TEST Codex ${suffix}` });
    const student = await login(email, password), initial = await state(student);
    assert.equal(initial.local, true); assert.ok(initial.aiProviders.includes('codex'));
    assert.equal(initial.CODEX_BRIDGE_TOKEN, undefined); assert.equal(initial.CODEX_BRIDGE_URL, undefined);
    const html = await (await fetch(root + '/student', { headers: { cookie: student } })).text();
    assert.match(html, /Codex local · ChatGPT/);
    const content = {
      what: 'Our team interviewed six students about a prototype. I recorded their comments and prepared a diagram and a report.',
      soWhat: 'I felt uncertain because I had assumed silence meant agreement. Comparing the comments revealed different needs that I had overlooked.',
      nowWhat: 'I learned that I must ask each person before making a decision. I will treat silence as missing information rather than consent.',
      action: 'Next Tuesday I will ask every team member two questions, record the answers, and review the prototype with the team before Friday.',
    };
    const saved = await mutate(student, { action: 'save', title: `TEST Codex local ${suffix}`, content, week: 1, courseId: '' });
    let reflection = (await state(student)).reflections.find(row => row.id === saved.id);
    await mutate(student, { action: 'coach', id: reflection.id, rev: reflection.rev, includeAttachments: false });
    reflection = (await state(student)).reflections.find(row => row.id === saved.id);
    assert.equal(reflection.analyses[0].provider, 'Codex local'); assert.equal(reflection.analyses[0].result.includedAttachments, false);
    console.log('Verified: text Coach persisted with Codex provider and validated rubric.');
    for (const [name, type, bytes] of [['diagram.png', 'image/png', image()], ['report.pdf', 'application/pdf', pdf()]]) {
      const form = new FormData(); form.append('reflectionId', reflection.id); form.append('file', new Blob([bytes], { type }), name);
      const response = await fetch(root + '/api/thinkup', { method: 'POST', headers: { Origin: root, cookie: student }, body: form });
      assert.equal(response.status, 200, await response.text());
    }
    await mutate(student, { action: 'feedback', id: reflection.id, rev: reflection.rev, includeAttachments: true });
    reflection = (await state(student)).reflections.find(row => row.id === saved.id);
    const result = reflection.analyses[0].result;
    assert.equal(reflection.analyses[0].provider, 'Codex local'); assert.equal(result.includedAttachments, true);
    assert.match(result.context, /red|blue/i); assert.match(result.context, /17/);
    assert.ok(result.total >= 2.5 && result.total <= 10); assert.equal(result.criteria.length, 4);
    console.log('Verified: image colors and PDF-only number were read; Feedback persisted.');
    const admin = await login('admin@thinkup.local', demoPassword);
    const lecturerEmail = `codex-lecturer-${suffix}@thinkup.test`;
    const courseId = (await mutate(admin, { action: 'course-save', name: `TEST Codex ${suffix}`, code: `CDX${suffix}`, rubric: defaultRubric, weeks: defaultWeeks })).id;
    await mutate(admin, { action: 'invite', email, role: 'student', courseId });
    await mutate(admin, { action: 'user-create', email: lecturerEmail, name: `TEST Codex lecturer ${suffix}`, password, role: 'lecturer', courseIds: [courseId] });
    const lecturer = await login(lecturerEmail, password);
    await mutate(student, { action: 'save', id: reflection.id, rev: reflection.rev, title: reflection.title, content, week: 1, courseId });
    reflection = (await state(student)).reflections.find(row => row.id === saved.id);
    await mutate(student, { action: 'submit', id: reflection.id, rev: reflection.rev });
    reflection = (await state(student)).reflections.find(row => row.id === saved.id);
    await mutate(lecturer, { action: 'review-analyze', id: reflection.id, rev: reflection.rev, includeAttachments: false });
    const reviewed = (await state(lecturer)).classReflections.find(row => row.id === saved.id);
    assert.equal(reviewed.status, 'submitted'); assert.equal(reviewed.reviews.length, 0);
    assert.equal(reviewed.analyses[0].provider, 'Codex local');
    console.log('Verified: lecturer Codex proposal persisted without finalizing the grade.');
  } finally { for (const cookie of cookies) await fetch(root + '/api/auth/logout', { method: 'POST', headers: { Origin: root, cookie } }); }
});
