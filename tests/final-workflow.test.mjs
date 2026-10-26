import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultRubric,defaultWeeks,criterionKeys} from '../lib/domain.ts';
import {criterionLevel,rubricVersion} from '../lib/assessment.ts';
const root=process.env.THINKUP_TEST_URL;
test('final requirements: decimal grading, private drafts, actions, snapshots, retention and all role boundaries',{skip:!root},async()=>{
 assert.ok(['localhost','127.0.0.1'].includes(new URL(root).hostname));
 const suffix=randomUUID().slice(0,8),owner={'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@thinkup.local'},sessions=[];
 const password='TEST Final requirements 2026';
 async function call(path,actor,body,status=200){const response=await fetch(root+path,{method:body?'POST':'GET',headers:{...(typeof actor==='string'?{cookie:actor}:actor||{}),...(body?{Origin:root,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();assert.equal(response.status,status,`${path}: ${text}`);return text?JSON.parse(text):{};}
 const mutate=(actor,body,status=200)=>call('/api/thinkup',actor,body,status),learning=(actor,body,status=200)=>call('/api/learning',actor,body,status),state=actor=>call('/api/thinkup',actor);
 async function actor(label,role,courseId){const created=await mutate(owner,{action:'user-create',name:`TEST Final ${label} ${suffix}`,email:`test-final-${label}-${suffix}@example.edu`,role,password,courseIds:[courseId]});const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email:created.user.email,password})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return {...created.user,cookie};}
 async function page(path,actor,language='vi'){const response=await fetch(root+path,{headers:{cookie:`${actor.cookie}; thinkup-language=${language}`}});assert.equal(response.status,200);return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');}
 try{
  const legacyBefore=(await state(owner)).classReflections.filter(r=>r.id.startsWith('demo-')).map(r=>({id:r.id,reviews:r.reviews,analyses:r.analyses}));
  const courses=[];for(const label of ['A','B'])courses.push((await mutate(owner,{action:'course-save',name:`TEST Final Course ${label} ${suffix}`,className:`TEST Class ${label} ${suffix}`,code:`FINAL-${label}-${suffix}`,weeks:defaultWeeks,rubric:defaultRubric})).id);
  const student=await actor('student','student',courses[0]),teacher=await actor('teacher','lecturer',courses[0]),outside=await actor('outside','lecturer',courses[1]);
  const content={what:'Our team interviewed six students and recorded their answers during the project.',soWhat:'I questioned my assumption that silence meant agreement after listening to another team member.',nowWhat:'I learned to ask before deciding; this principle depends on the situation and available evidence.',action:'Next Tuesday I will ask each member two questions and count the replies before Friday.'};
  const criteria=criterionKeys.map((key,i)=>({key,score:[8.2,7.1,8.8,7.6][i],level:criterionLevel([8.2,7.1,8.8,7.6][i]),evidence:Object.values(content)[i],reason:'The excerpt shows the behavior described by this criterion.',improvement:'Add another perspective and check the results.',attachmentNames:[]}));
  const saved=await mutate(student.cookie,{action:'save',title:`TEST Private Final Draft ${suffix}`,content,week:1,courseId:courses[0]});
  let row=(await state(student.cookie)).reflections.find(r=>r.id===saved.id);
  let classroom=await state(teacher.cookie);assert.ok(!JSON.stringify(classroom).includes(row.id));assert.ok(!JSON.stringify(classroom).includes(row.title));assert.ok(classroom.participation.some(p=>p.status==='draft'&&p.userId===student.id));
  await mutate(teacher.cookie,{action:'save',title:'Denied',content,week:1,courseId:courses[0]},403);
  await learning(teacher.cookie,{action:'self-assess',id:row.id,rev:row.rev,criteria},403);
  await learning(student.cookie,{action:'self-assess',id:row.id,rev:row.rev,criteria,rubricVersion:rubricVersion(defaultRubric)});assert.equal((await state(student.cookie)).reflections.find(r=>r.id===row.id).selfAssessments[0].payload.total,7.93);
  const action=await mutate(student.cookie,{action:'action-save',reflectionId:row.id,text:'Ask each member two questions',due:'2026-12-01',status:'todo',review:'',successCriteria:'Four replies are recorded.',evidence:'',attachmentIds:[],revision:0});
  assert.ok(!(await state(teacher.cookie)).classActions.some(a=>a.id===action.id));
  await mutate(student.cookie,{action:'submit',id:row.id,rev:row.rev});row=(await state(student.cookie)).reflections.find(r=>r.id===row.id);
  classroom=await state(teacher.cookie);assert.ok(classroom.classActions.some(a=>a.id===action.id));assert.ok(!(await state(outside.cookie)).classActions.some(a=>a.id===action.id));
  assert.ok((await page(`/lecturer/submissions?cohort=${encodeURIComponent(`TEST Class A ${suffix}`)}`,teacher)).includes(row.title));
  const sourceVersion=row.latestVersion,versionKey=rubricVersion(defaultRubric);
  const draft=await learning(teacher.cookie,{action:'review-draft-save',id:row.id,rev:row.rev,criteria,level:3,comment:'PRIVATE teacher draft',feedback:{strengths:'Strong context.',development:'Consider another perspective.',evidence:content.what,questions:'Why?',nextSteps:'Check the outcome.'},draftRevision:0});assert.equal(draft.revision,1);
  await learning(teacher.cookie,{action:'review-draft-save',id:row.id,rev:row.rev,criteria,level:3,comment:'PRIVATE teacher draft updated',draftRevision:1});
  await learning(teacher.cookie,{action:'review-draft-save',id:row.id,rev:row.rev,criteria,level:3,comment:'stale',draftRevision:1},409);
  assert.ok(!JSON.stringify(await state(student.cookie)).includes('PRIVATE teacher draft'));assert.ok(!(await state(student.cookie)).learningRecords.some(r=>r.kind==='review-draft'));
  assert.equal((await state(teacher.cookie)).learningRecords.find(r=>r.kind==='review-draft'&&r.reflectionId===row.id).revision,2);
  await learning(student.cookie,{action:'template-save',courseId:courses[0],title:'Denied',text:'Denied',criterionKey:'all'},403);
  await learning(outside.cookie,{action:'review-draft-save',id:row.id,rev:row.rev,criteria,draftRevision:0},403);
  const template=await learning(teacher.cookie,{action:'template-save',courseId:courses[0],title:'TEST Template',text:'Specific strengths and next steps.',criterionKey:'reflectionDepth'});assert.ok((await state(teacher.cookie)).learningRecords.some(r=>r.id===template.id));assert.ok(!(await state(student.cookie)).learningRecords.some(r=>r.id===template.id));
  await learning(outside.cookie,{action:'template-remove',id:template.id},404);
  await mutate(owner,{action:'user-save',id:teacher.id,name:teacher.name,email:teacher.email,role:'student',active:1});
  await learning(teacher.cookie,{action:'template-remove',id:template.id},403);
  await learning(teacher.cookie,{action:'template-save',courseId:courses[0],title:'Denied',text:'Denied'},403);
  const demoted=await state(teacher.cookie);assert.equal(demoted.learningRecords.filter(r=>r.kind==='review-draft').length,0);assert.equal(demoted.classReflections.length,0);assert.equal(demoted.classActions.length,0);assert.equal(demoted.courses.length,0);
  await mutate(owner,{action:'user-save',id:teacher.id,name:teacher.name,email:teacher.email,role:'lecturer',active:1});
  const grade={action:'review',id:row.id,rev:row.rev,decision:'final',comment:'Final confirmed pedagogical feedback.',criteria,level:3,sourceVersion,rubricVersion:versionKey};
  await mutate(outside.cookie,grade,403);await mutate(student.cookie,grade,403);
  await mutate(teacher.cookie,{...grade,sourceVersion:'old'},409);
  await mutate(teacher.cookie,{...grade,criteria:criteria.map((c,i)=>i===0?{...c,score:2.5}:c)},400);
  await mutate(teacher.cookie,{...grade,criteria:criteria.map((c,i)=>i===0?{...c,evidence:'Fabricated.'}:c)},400);
  for(const language of ['en','vi']){
   const detail=await page(`/lecturer/submissions/${row.id}`,teacher,language);assert.ok(detail.includes(language==='vi'?'Lưu nháp':'Save draft'));assert.ok(detail.includes(language==='vi'?'Tự đánh giá':'Self-assessment'));assert.ok(detail.includes(language==='vi'?'Phiên bản':'Versions'));
   assert.ok(detail.includes(language==='vi'?'Đánh giá bài viết':'Assess reflection'));assert.ok(detail.includes(language==='vi'?'4/4 tiêu chí':'4/4 criteria'));assert.ok(detail.includes('PRIVATE teacher draft updated'));
   assert.equal((detail.match(/class="lx-crit is-done/g)||[]).length,4,'Saved criteria restore as complete before final submission.');
   const progress=await page('/lecturer/progress',teacher,language);assert.ok(progress.includes(language==='vi'?'Chất lượng phản tư':'Reflection quality'));assert.ok(progress.includes(language==='vi'?'Cam kết &amp; hành động':'Commitments &amp; actions'));
   const home=await page('/student',student,language);assert.ok(!home.includes('PRIVATE teacher draft'));
  }
  if(!(await state(teacher.cookie)).aiReady){await learning(teacher.cookie,{action:'reading-analyze',id:row.id,rev:row.rev},503);await mutate(teacher.cookie,{action:'review-analyze',id:row.id,rev:row.rev},503);}
  await learning(outside.cookie,{action:'reading-analyze',id:row.id,rev:row.rev},403);
  await mutate(teacher.cookie,grade);row=(await state(student.cookie)).reflections.find(r=>r.id===row.id);
  assert.equal(row.status,'final');assert.equal(row.reviews[0].total,7.93);assert.equal(row.reviews[0].scoreScale,10);assert.deepEqual(row.reviews[0].criteria,criteria.map(c=>({...c,missingReason:''})));assert.equal(row.reviews[0].rubricVersion,versionKey);
  assert.equal((await state(teacher.cookie)).learningRecords.filter(r=>r.kind==='review-draft'&&r.reflectionId===row.id).length,0);
  let commitment=(await state(student.cookie)).actions.find(a=>a.id===action.id);
  const update={action:'action-save',...commitment,status:'done',review:'I recorded four replies and learned why one member was quiet.',evidence:'My notes contain four replies.'};
  await mutate(student.cookie,{...update,review:''},400);await mutate(outside.cookie,update,403);
  await mutate(student.cookie,update);await mutate(student.cookie,update,409);
  commitment=(await state(student.cookie)).actions.find(a=>a.id===action.id);assert.equal(commitment.status,'done');assert.equal(commitment.history.length,2);assert.equal((await state(teacher.cookie)).classActions.find(a=>a.id===action.id).evidence,update.evidence);
  const form=new FormData();form.append('actionId',action.id);form.append('file',new File(['Four replies recorded after the final reflection.'],'action-result.txt',{type:'text/plain'}));
  const uploaded=await fetch(root+'/api/action-evidence',{method:'POST',headers:{cookie:student.cookie,Origin:root},body:form});assert.equal(uploaded.status,200,await uploaded.clone().text());const evidenceFile=await uploaded.json();
  const sharedFile=await fetch(root+`/api/action-evidence/${evidenceFile.id}`,{headers:{cookie:teacher.cookie}});assert.equal(sharedFile.status,200);assert.equal(await sharedFile.text(),'Four replies recorded after the final reflection.');
  assert.equal((await fetch(root+`/api/action-evidence/${evidenceFile.id}`,{headers:{cookie:outside.cookie}})).status,403);assert.equal((await fetch(root+`/api/action-evidence/${evidenceFile.id}`)).status,401);
  const exposed=(await state(teacher.cookie)).classActions.find(a=>a.id===action.id);assert.equal(exposed.evidenceFiles.length,1);assert.ok(!JSON.stringify(exposed).includes('objectKey'));
  const currentAction=(await state(student.cookie)).actions.find(a=>a.id===action.id);
  const concurrent=await Promise.all([1,2].map(n=>fetch(root+'/api/thinkup',{method:'POST',headers:{cookie:student.cookie,Origin:root,'Content-Type':'application/json'},body:JSON.stringify({action:'action-save',...currentAction,review:`Concurrent result ${n}`,status:'done'})})));assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  const originalReview=JSON.stringify(row.reviews),configuration=(await state(teacher.cookie)).courses.find(c=>c.id===courses[0]);
  await mutate(teacher.cookie,{action:'course-save',...configuration,weeks:configuration.weeks.map((w,i)=>i===0?{...w,requirements:'TEST assignment instructions'}:w),rubric:configuration.rubric.map((c,i)=>i===0?{...c,descriptions:c.descriptions.map(d=>d+' TEST revised')}:c)});
  const updated=(await state(student.cookie)).reflections.find(r=>r.id===row.id);assert.equal(JSON.stringify(updated.reviews),originalReview);assert.equal(updated.reviews[0].rubricVersion,versionKey);assert.ok((await state(teacher.cookie)).learningRecords.filter(r=>r.kind==='course-history'&&r.courseId===courses[0]).length>=2);
  await learning(student.cookie,{action:'archive-reflection',id:row.id},400);await learning(outside.cookie,{action:'archive-reflection',id:row.id},403);
  await learning(owner,{action:'archive-reflection',id:row.id,reason:'TEST reversible archival'});assert.ok(!(await state(student.cookie)).reflections.some(r=>r.id===row.id));assert.ok(!(await state(teacher.cookie)).classReflections.some(r=>r.id===row.id));
  await learning(owner,{action:'restore-reflection',id:row.id});assert.ok((await state(student.cookie)).reflections.some(r=>r.id===row.id));
  await call('/api/learning',student.cookie,null,403);await learning(teacher.cookie,{action:'retention-save',days:365,policy:'Denied'},403);
  await learning(owner,{action:'retention-save',days:365,policy:'TEST retain then review; no automatic deletion.'});await learning(owner,{action:'incident-save',summary:'TEST incident',response:'TEST reviewed access logs; responsible: test admin.',status:'closed'});
  const governance=await call('/api/learning',owner);assert.ok(governance.audit.some(a=>a.action==='action-save'));assert.ok(governance.audit.some(a=>a.action==='Final'));assert.ok(governance.incidents.some(i=>i.payload.summary==='TEST incident'));
  const incident=governance.incidents.find(i=>i.payload.summary==='TEST incident');
  await learning(owner,{action:'incident-save',id:incident.id,revision:incident.revision,summary:'TEST incident updated',response:'TEST follow-up completed.',status:'open'});
  await learning(owner,{action:'incident-save',id:incident.id,revision:incident.revision,summary:'Stale edit',response:'Stale',status:'closed'},409);
  const changedIncident=(await call('/api/learning',owner)).incidents.find(i=>i.id===incident.id);
  await learning(owner,{action:'incident-save',id:incident.id,revision:changedIncident.revision,summary:changedIncident.payload.summary,response:changedIncident.payload.response,status:'closed'});
  assert.equal((await call('/api/learning',owner)).incidents.find(i=>i.id===incident.id).payload.status,'closed');
  const fullAdmin=await state(owner),lightSettings=await call('/api/thinkup?adminSection=settings',owner),lightUsers=await call('/api/thinkup?adminSection=users',owner),lightCoursesList=await call('/api/thinkup?adminSection=courses',owner);
  for(const light of [lightSettings,lightUsers,lightCoursesList]){assert.equal(light.user.role,'admin');assert.deepEqual(light.classReflections,[]);assert.deepEqual(light.reflections,[]);assert.equal(light.adminSummary,undefined)}
  assert.deepEqual(lightSettings.users,[]);assert.deepEqual(lightSettings.courses,[]);
  assert.ok(JSON.stringify(lightSettings).length<JSON.stringify(fullAdmin).length/10,'Settings never carry reflection content or AI histories.');
  assert.deepEqual(lightUsers.users.map(u=>u.id).sort(),fullAdmin.users.map(u=>u.id).sort());
  assert.deepEqual(lightUsers.memberships,fullAdmin.memberships);
  const studentLight=await call('/api/thinkup?adminSection=settings',student.cookie);assert.equal(studentLight.aiConfig,undefined);assert.equal(studentLight.adminSummary,undefined);assert.ok(studentLight.reflections.every(r=>r.userId===student.id));
  const lightCourses=await call(`/api/thinkup?adminSection=courses&course=${courses[0]}`,owner);
  assert.ok(lightCourses.learningRecords.filter(r=>r.kind==='course-history').every(r=>r.courseId===courses[0]));assert.ok(lightCourses.learningRecords.some(r=>r.kind==='course-history'));
  assert.equal(lightSettings.aiConfig,undefined);
  await learning(owner,{action:'ai-settings-save',enabled:false,defaultProvider:'auto'},400);
  const membership=(await state(owner)).memberships.find(m=>m.userId===teacher.id&&m.courseId===courses[0]);
  await mutate(owner,{action:'membership-remove',id:membership.id});
  await learning(teacher.cookie,{action:'template-remove',id:template.id},403);
  await mutate(owner,{action:'invite',email:teacher.email,name:teacher.name,role:'lecturer',courseId:courses[0]});
  assert.ok((await state(teacher.cookie)).learningRecords.some(r=>r.id===template.id));
  await learning(teacher.cookie,{action:'template-remove',id:template.id});
  assert.ok(!(await state(teacher.cookie)).learningRecords.some(r=>r.id===template.id));
  const legacyAfter=(await state(owner)).classReflections.filter(r=>r.id.startsWith('demo-')).map(r=>({id:r.id,reviews:r.reviews,analyses:r.analyses}));assert.deepEqual(legacyAfter,legacyBefore);
  for(const path of ['/student','/lecturer/submissions','/admin/courses']){const r=await fetch(root+path);assert.equal(new URL(r.url).pathname,'/login');}
  console.log('Verified decimal scores, private review drafts, class-scoped actions, historical grades, all roles and new VN/EN screens.');
 }finally{for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}})}
});
