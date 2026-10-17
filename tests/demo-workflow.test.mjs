import test from 'node:test';
import assert from 'node:assert/strict';
import { demoPassword } from '../scripts/demo-data.mjs';

const root = process.env.THINKUP_TEST_URL || 'http://localhost:3000';
test('seeded accounts sign in, render their workspaces and respect course/evidence permissions', async () => {
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(root).hostname), 'Demo checks only run against localhost.');
  const cookies = [];
  async function login(email, expectedRole) {
    const response = await fetch(`${root}/api/auth/login`, { method: 'POST', headers: { Origin: root, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: demoPassword }) });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.user.role, expectedRole);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    cookies.push(cookie);
    const stateResponse = await fetch(`${root}/api/thinkup`, { headers: { cookie } });
    assert.equal(stateResponse.status, 200);
    const state = await stateResponse.json();
    const page = await fetch(root + data.redirect, { headers: { cookie } });
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes('class="sidebar"'));
    return { cookie, state };
  }
  try {
    const student = await login('student@thinkup.local', 'student');
    assert.equal(student.state.reflections.filter(r=>r.id!=='demo-criteria-v2').length, 6);
    assert.equal(student.state.actions.length, 5);
    assert.equal(student.state.courses[0].code, 'DEMO-REF101');
    assert.deepEqual(new Set(student.state.reflections.map(r => r.status)), new Set(['final', 'returned', 'submitted', 'draft']));
    assert.ok(student.state.reflections.every(r => r.userId === 'demo-student'));
    const criteriaSample=student.state.reflections.find(r=>r.id==='demo-criteria-v2');
    if(criteriaSample){
      const feedback=criteriaSample.analyses.find(a=>a.kind==='feedback');
      assert.equal(criteriaSample.week,7);
      assert.deepEqual(feedback.rubric.map(c=>c.weight),[35,25,20,20]);
      assert.equal(feedback.result.total,8.63);
      assert.equal(feedback.result.level,3);
      assert.equal(feedback.result.levelMethod,'demo-classification');
    }
    assert.deepEqual(student.state.courses[0].rubric.map(c=>c.weight),[35,25,20,20]);
    const lecturer = await login('lecturer@thinkup.local', 'lecturer');
    assert.equal(lecturer.state.courses.length, 1);
    assert.ok(lecturer.state.classReflections.every(r => r.courseId === 'demo-course-reflection' && r.status !== 'draft'));
    assert.equal(lecturer.state.classReflections.filter(r => r.id.startsWith('demo-')&&r.id!=='demo-criteria-v2').length, 9);
    const otherLecturer = await login('lecturer2@thinkup.local', 'lecturer');
    assert.ok(otherLecturer.state.classReflections.every(r => r.courseId === 'demo-course-project'));
    const admin = await login('admin@thinkup.local', 'admin');
    assert.equal(admin.state.courses.filter(c => c.id.startsWith('demo-')).length, 2);
    assert.equal(admin.state.users.filter(u => u.id.startsWith('demo-')).length, 8);
    const evidenceUrl = `${root}/api/files/demo-student-week-4-attachment`;
    for (const { cookie } of [student, lecturer, admin]) {
      const evidence = await fetch(evidenceUrl, { headers: { cookie } });
      assert.equal(evidence.status, 200);
      assert.ok((await evidence.text()).includes('MINH CHỨNG DEMO'));
    }
    assert.equal((await fetch(evidenceUrl, { headers: { cookie: otherLecturer.cookie } })).status, 403);
    const privateEvidence = `${root}/api/files/demo-student-week-6-attachment`;
    assert.equal((await fetch(privateEvidence, { headers: { cookie: lecturer.cookie } })).status, 403);
    assert.equal((await fetch(privateEvidence, { headers: { cookie: student.cookie } })).status, 200);
    const inactive = await fetch(`${root}/api/auth/login`, { method: 'POST', headers: { Origin: root, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'inactive@thinkup.local', password: demoPassword }) });
    assert.equal(inactive.status, 403);
  } finally {
    for (const cookie of cookies) await fetch(`${root}/api/auth/logout`, { method: 'POST', headers: { Origin: root, cookie } });
  }
});
