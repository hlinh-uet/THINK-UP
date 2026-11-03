import test from 'node:test';
import assert from 'node:assert/strict';
import {demoPassword} from '../scripts/demo-data.mjs';
const root=process.env.THINKUP_TEST_URL,reflectionId=process.env.THINKUP_TRANSLATION_FIXTURE_REFLECTION;

test('saved translations work offline, preserve source writing, and enforce owner and snapshot boundaries',{skip:!root||!reflectionId},async()=>{
 const cookies=[];
 async function login(email){const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password:demoPassword})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];cookies.push(cookie);return cookie;}
 async function state(cookie){const response=await fetch(root+'/api/thinkup',{headers:{cookie}});assert.equal(response.status,200);return response.json();}
 async function translate(cookie,body,status=200,origin=root){const response=await fetch(root+'/api/reflection-translation',{method:'POST',headers:{cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});const text=await response.text();assert.equal(response.status,status,text);return response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):{error:text};}
 try{
  const student=await login('student@thinkup.local'),teacher=await login('lecturer@thinkup.local');
  const before=await state(student),row=before.reflections.find(r=>r.id===reflectionId);
  const request={reflectionId,language:'en',title:row.title,content:row.content};
  const translated=await translate(student,request);
  assert.equal(translated.view.title,'Translated fixture title');assert.match(translated.view.content.what,/English translation/);
  await translate(teacher,request,403);
  await translate(student,request,403,'https://untrusted.example');
  await translate(student,{...request,content:{...request.content,what:'An unsaved change to locked work.'}},409);
  const after=(await state(student)).reflections.find(r=>r.id===reflectionId);
  for(const key of ['title','content','rev','latestVersion','versions','reviews','analyses'])assert.deepEqual(after[key],row[key],key);
  assert.ok(after.translations.some(t=>t.view.title==='Translated fixture title'));
  for(const cookie of [student,teacher])assert.ok(!JSON.stringify(await state(cookie)).includes('TEST PRIVATE UNSAVED TRANSLATION'),'Unsaved translation snapshots must not leak through workspace data');
 }finally{for(const cookie of cookies)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}});}
});
