import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPassword} from '../scripts/demo-data.mjs';

const root=process.env.THINKUP_TEST_URL,reflectionId=process.env.THINKUP_READING_FIXTURE_REFLECTION;
test('unpublished reading is available only to its assigned teacher; student API and SSR withhold it',{skip:!root||!reflectionId},async()=>{
 assert.ok(['localhost','127.0.0.1'].includes(new URL(root).hostname));
 const sessions=[];
 async function login(email){
  const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password:demoPassword})});
  assert.equal(response.status,200,await response.clone().text());
  const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return cookie;
 }
 async function state(cookie){const r=await fetch(root+'/api/thinkup',{headers:{cookie}});assert.equal(r.status,200);return r.json();}
 try{
  const teacher=await login('lecturer@thinkup.local'),student=await login('student@thinkup.local'),admin=await login('admin@thinkup.local');
  const report=(await state(teacher)).classReflections.find(r=>r.id===reflectionId)?.readingReports.find(r=>r.id==='test-private-reading');
  assert.ok(report,'Fixture must be readable by its author; withholding every report is not a fix.');
  assert.match(report.payload.result.feedback.strengths,/TEST UNPUBLISHED READING/);
  for(const cookie of [student,admin]){
   const data=await state(cookie);assert.ok(!JSON.stringify(data).includes('TEST UNPUBLISHED READING'));
   for(const r of [...data.reflections,...data.classReflections])assert.ok(!r.readingReports.some(p=>p.id==='test-private-reading'));
  }
  const html=await fetch(root+'/student',{headers:{cookie:student}});assert.equal(html.status,200);
  assert.ok(!(await html.text()).includes('TEST UNPUBLISHED READING'),'SSR and hydration data also withhold internal feedback.');
  const owner={'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@thinkup.local'};
  async function mutate(body){const r=await fetch(root+'/api/thinkup',{method:'POST',headers:{...owner,Origin:root,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());}
  const before=await state(teacher),membership=before.memberships.find(m=>m.userId===before.user.id&&m.courseId===report.courseId);
  assert.ok(membership);
  try{
   await mutate({action:'membership-remove',id:membership.id});
   assert.ok(!JSON.stringify(await state(teacher)).includes('TEST UNPUBLISHED READING'),'Revoked assignments take effect on the existing session.');
  }finally{await mutate({action:'invite',email:before.user.email,name:before.user.name,role:'lecturer',courseId:report.courseId});}
 }finally{for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}});}
});
