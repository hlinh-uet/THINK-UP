import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultRubric,defaultWeeks} from '../lib/domain.ts';
import {actionCompletedLate,actionOverdue} from '../lib/commitment-deadline.ts';
const root=process.env.THINKUP_TEST_URL;

test('lecturer deadline policies enforce course isolation, immutable student deadlines and historical completion timing',{skip:!root},async()=>{
 assert.ok(['localhost','127.0.0.1'].includes(new URL(root).hostname));
 const suffix=randomUUID().slice(0,8),owner={'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@thinkup.local'},sessions=[];
 const password='TEST Commitment deadlines 2026';
 async function call(actor,body,status=200,path='/api/thinkup'){
  const response=await fetch(root+path,{method:body?'POST':'GET',headers:{...(typeof actor==='string'?{cookie:actor}:actor),...(body?{Origin:root,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const text=await response.text();assert.equal(response.status,status,text);return text?JSON.parse(text):{};
 }
 const state=actor=>call(actor);
 async function actor(label,role,courseIds){
  const result=await call(owner,{action:'user-create',name:`TEST Deadlines ${label} ${suffix}`,email:`test-deadline-${label}-${suffix}@example.edu`,role,password,courseIds});
  const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email:result.user.email,password})});
  assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return {...result.user,cookie};
 }
 try{
  const config={name:`TEST Deadlines ${suffix}`,code:`DDL-${suffix}`,weeks:defaultWeeks,rubric:defaultRubric,commitmentDeadline:{kind:'days',days:7}};
  const first=(await call(owner,{action:'course-save',...config})).id,second=(await call(owner,{action:'course-save',...config,name:`TEST Other ${suffix}`,code:`OTHER-${suffix}`,commitmentDeadline:{kind:'days',days:14}})).id;
  const student=await actor('student','student',[first,second]),teacher=await actor('teacher','lecturer',[first]),outside=await actor('outside','lecturer',[second]);
  await call(student.cookie,{action:'course-save',...config,id:first},403);await call(outside.cookie,{action:'course-save',...config,id:first},403);
  await call(teacher.cookie,{action:'course-save',...config,id:first,commitmentDeadline:{kind:'days',days:-1}},400);
  const content={what:'Our group practised a presentation and recorded feedback from three classmates to understand what should change in our next rehearsal.',soWhat:'',nowWhat:'',action:''};
  const reflection=(await call(student.cookie,{action:'save',title:`TEST Deadline Reflection ${suffix}`,content,week:1,courseId:first})).id;
  const created=await call(student.cookie,{action:'action-save',reflectionId:reflection,text:'Ask for three concrete suggestions',due:'2099-01-01',dueAt:'2099-01-01T00:00:00.000Z',completedAt:'2000-01-01T00:00:00.000Z',status:'todo',review:'',revision:0});
  let action=(await state(student.cookie)).actions.find(a=>a.id===created.id);
  assert.equal(Date.parse(action.dueAt)-Date.parse(action.createdAt),7*864e5);assert.equal(action.completedAt,null);assert.equal(action.deadlineSource,'lecturer');
  assert.ok(!(await state(teacher.cookie)).classActions.some(a=>a.id===action.id),'Private source drafts remain private');
  const source=(await state(student.cookie)).reflections.find(r=>r.id===reflection);await call(student.cookie,{action:'submit',id:reflection,rev:source.rev});
  assert.equal((await state(teacher.cookie)).classActions.find(a=>a.id===action.id).dueAt,action.dueAt);
  assert.ok(!(await state(outside.cookie)).classActions.some(a=>a.id===action.id));
  const past=new Date(Date.now()-864e5).toISOString();
  await call(teacher.cookie,{action:'course-save',...config,id:first,commitmentDeadline:{kind:'fixed',at:past}});
  action=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.equal(action.dueAt,past);assert.ok(actionOverdue(action));
  await call(student.cookie,{action:'action-save',...action,due:'2099-12-31',dueAt:'2099-12-31T23:59:00.000Z',status:'in_progress'});
  action=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.equal(action.dueAt,past);
  await call(student.cookie,{action:'action-save',...action,status:'done',review:'I recorded feedback from three classmates.',completedAt:'2000-01-01T00:00:00.000Z'});
  action=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.ok(actionCompletedLate(action));assert.ok(action.completedAt.startsWith(new Date().toISOString().slice(0,10)));
  const completedAt=action.completedAt;
  await call(student.cookie,{action:'action-save',...action,review:'The same completed outcome, with more detail.'});
  action=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.equal(action.completedAt,completedAt);
  await call(teacher.cookie,{action:'course-save',...config,id:first,commitmentDeadline:{kind:'days',days:30}});
  action=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.equal(action.dueAt,past);assert.ok(actionCompletedLate(action));
  const next=await call(student.cookie,{action:'action-save',reflectionId:reflection,text:'Try the revised rehearsal',status:'todo',review:'',due:'2099-01-01',revision:0});
  const nextAction=(await state(student.cookie)).actions.find(a=>a.id===next.id);assert.equal(Date.parse(nextAction.dueAt)-Date.parse(nextAction.createdAt),30*864e5);
  const teacherData=await state(teacher.cookie);assert.equal(teacherData.classActions.find(a=>a.id===action.id).completedAt,completedAt);
  assert.equal(teacherData.courses.find(c=>c.id===first).commitmentDeadline.days,30);
  // Older clients saving the rest of a course must not silently erase its policy.
  await call(teacher.cookie,{action:'course-save',id:first,name:config.name,code:config.code,weeks:defaultWeeks,rubric:defaultRubric});
  assert.equal((await state(student.cookie)).courses.find(c=>c.id===first).commitmentDeadline.days,30);
  for(const language of ['vi','en']){
   const response=await fetch(root+`/lecturer/progress?course=${first}&tab=actions`,{headers:{cookie:`${teacher.cookie}; thinkup-language=${language}`}});assert.equal(response.status,200);
   const html=await response.text();assert.ok(html.includes(language==='vi'?'Hoàn thành muộn':'Completed late'));assert.ok(html.includes(language==='vi'?'Theo dõi cam kết của sinh viên':'Monitor student commitments'));
  }
  const otherReflection=(await call(student.cookie,{action:'save',title:'TEST Other course',content,week:1,courseId:second})).id;
  const otherAction=await call(student.cookie,{action:'action-save',reflectionId:otherReflection,text:'A separate course commitment',status:'todo',review:'',due:'',revision:0});
  const isolated=(await state(student.cookie)).actions.find(a=>a.id===otherAction.id);assert.equal(Date.parse(isolated.dueAt)-Date.parse(isolated.createdAt),14*864e5);
 }finally{for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:root}})}
});
