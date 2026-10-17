import {finalAssessmentRequest} from './helpers/final-assessment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { demoPassword } from '../scripts/demo-data.mjs';
import { defaultWeeks, defaultRubric } from '../lib/domain.ts';

const root=process.env.THINKUP_TEST_URL||'http://localhost:3000';
test('lecturer pages, assessments, course settings, progress and similarity respect assigned classes',async()=>{
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(root).hostname));
  const suffix=randomUUID().slice(0,8),password='TEST Version 15 passphrase',cookies=[];
  async function login(email,pass=password){const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));const cookie=response.headers.get('set-cookie').split(';')[0];cookies.push(cookie);return cookie}
  async function post(path,cookie,body,status=200,origin=root){if(body.action==='review')body=finalAssessmentRequest(body,await state(cookie));const response=await fetch(root+path,{method:'POST',headers:{cookie,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body)});const raw=await response.text();assert.equal(response.status,status,raw);return response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):{error:raw}}
  const mutate=(cookie,body,status=200)=>post('/api/thinkup',cookie,body,status);
  const scan=(cookie,body={},status=200)=>post('/api/similarity',cookie,body,status);
  async function state(cookie){const response=await fetch(root+'/api/thinkup',{headers:{cookie}});assert.equal(response.status,200);return response.json()}
  async function page(path,cookie,language){const response=await fetch(root+path,{headers:{cookie:`${cookie}; thinkup-language=${language}`}});assert.equal(response.status,200);return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')}
  async function access(path,cookie,status,location){const response=await fetch(root+path,{headers:{cookie},redirect:'manual'});assert.equal(response.status,status,path);if(location)assert.equal(response.headers.get('location'),location)}
  try{
    const admin=await login('admin@thinkup.local',demoPassword);
    const courses=[];
    for(const name of ['A','B'])courses.push((await mutate(admin,{action:'course-save',name:`TEST V15 ${name} ${suffix}`,code:`V15-${name}-${suffix}`,weeks:defaultWeeks,rubric:defaultRubric})).id);
    const accounts=[];
    for(const [label,role,course] of [['student-a','student',0],['student-b','student',0],['student-outside','student',1],['lecturer-a','lecturer',0],['lecturer-b','lecturer',1]]){
      const email=`test-v15-${label}-${suffix}@example.edu`,user=await mutate(admin,{action:'user-create',name:`TEST ${label} ${suffix}`,email,password,role,courseIds:[courses[course]]});accounts.push({id:user.id,cookie:await login(email)});
    }
    const [a,b,outside,lecturer,otherLecturer]=accounts;
    const what=Array.from({length:75},(_,i)=>`experience${i}`).join(' '),content={what,soWhat:'I felt uncertain and asked my team for another perspective.',nowWhat:'I learned to test my assumptions and listen to everyone before deciding.',action:'Next week I will document three assumptions and discuss their evidence with my team.'};
    async function submission(account,course,week=1,submit=true){const saved=await mutate(account.cookie,{action:'save',title:`TEST V15 Reflection ${suffix}`,content,week,courseId:course});let r=(await state(account.cookie)).reflections.find(r=>r.id===saved.id);if(submit){await mutate(account.cookie,{action:'submit',id:r.id,rev:r.rev});r=(await state(account.cookie)).reflections.find(row=>row.id===r.id)}return r}
    const first=await submission(a,courses[0]),sameAuthor=await submission(a,courses[0],2),second=await submission(b,courses[0]),draft=await submission(b,courses[0],3,false),external=await submission(outside,courses[1]);
    const sections=['submissions','students','progress','similarity','courses'];
    for(const language of ['en','vi'])for(const section of sections){
      const html=await page(`/lecturer/${section}?course=${courses[0]}`,lecturer.cookie,language);
      const nav=html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0];assert.ok(nav,section);
      for(const target of sections)assert.ok(nav.includes(`href="/lecturer/${target}?course=${courses[0]}"`),target);
      assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);
      assert.ok(!html.includes('TEST student-outside'));assert.ok(!html.includes('lecturer-tabs'));
      if(language==='en')assert.ok(!nav.includes('Bài nộp')&&!nav.includes('Học phần'));
    }
    await access('/lecturer',lecturer.cookie,307,'/lecturer/submissions');
    await access('/lecturer?tab=progress',lecturer.cookie,307,'/lecturer/progress');
    await access('/lecturer/submissions',a.cookie,307,'/student');
    const detailPath=`/lecturer/submissions/${second.id}?course=${courses[0]}`;
    for(let reload=0;reload<2;reload++){
      const detail=await page(detailPath,lecturer.cookie,'en');assert.ok(detail.includes('TEST student-b'));
      const numbers=detail.match(/<input\b[^>]*type="number"[^>]*>/g)||[];assert.equal(numbers.length,4);assert.ok(numbers.every(input=>input.includes('value=""')));
      assert.ok(detail.includes('Select a Kember level'));assert.ok(detail.includes('TEST V15 Reflection'));
    }
    await page(`/lecturer/students?student=${a.id}&course=${courses[0]}`,lecturer.cookie,'en');
    await page(`/lecturer/courses?course=${courses[0]}`,lecturer.cookie,'en');
    for(const path of [`/lecturer/submissions/${external.id}`,`/lecturer/submissions/${draft.id}`,`/lecturer/students?student=${outside.id}`,`/lecturer/courses?course=${courses[1]}`,`/lecturer/submissions/${second.id}?course=${courses[1]}`])await access(path,lecturer.cookie,404);
    const report=await scan(lecturer.cookie,{courseId:courses[0]});assert.equal(report.documents,3);assert.equal(report.comparedPairs,2);assert.equal(report.matches.length,2);assert.ok(report.matches.every(m=>m.left.courseId===courses[0]&&m.right.courseId===courses[0]&&m.left.userId!==m.right.userId));
    assert.ok(!JSON.stringify(report).includes(draft.id));assert.ok(!JSON.stringify(report).includes(external.id));
    assert.equal((await scan(lecturer.cookie,{reflectionId:first.id})).matches.length,1);
    const system=await scan(admin,{reflectionId:external.id});assert.ok(system.matches.some(m=>m.left.courseId!==m.right.courseId));
    await scan(a.cookie,{courseId:courses[0]},403);await scan(otherLecturer.cookie,{courseId:courses[0]},403);await scan(lecturer.cookie,{reflectionId:external.id},403);await scan(lecturer.cookie,{reflectionId:draft.id},403);
    await post('/api/similarity',lecturer.cookie,{},403,null);await post('/api/similarity',lecturer.cookie,{},403,'https://other.example');
    const before=(await state(lecturer.cookie)).classReflections.find(r=>r.id===second.id);assert.equal(before.status,'submitted');assert.equal(before.reviews.length,0);
    await mutate(a.cookie,{action:'review-analyze',id:second.id,rev:second.rev},403);await mutate(otherLecturer.cookie,{action:'review-analyze',id:second.id,rev:second.rev},403);await mutate(lecturer.cookie,{action:'review-analyze',id:draft.id,rev:draft.rev},403);await mutate(lecturer.cookie,{action:'review-analyze',id:second.id,rev:second.rev-1},409);
    // Never call a paid AI service from this integration test.
    if(!(await state(lecturer.cookie)).aiReady)await mutate(lecturer.cookie,{action:'review-analyze',id:second.id,rev:second.rev},503);
    await mutate(lecturer.cookie,{action:'review',id:first.id,rev:first.rev,decision:'invalid',comment:'TEST Invalid decision.'},400);
    assert.equal((await state(lecturer.cookie)).classReflections.find(r=>r.id===first.id).rev,first.rev);
    await mutate(lecturer.cookie,{action:'review',id:first.id,rev:first.rev,decision:'returned',comment:'TEST Revise with your own experience.'});await scan(lecturer.cookie,{reflectionId:first.id},409);assert.equal((await scan(lecturer.cookie)).documents,2);
    const returned=(await state(lecturer.cookie)).classReflections.find(r=>r.id===first.id);assert.equal(returned.reviews[0].total,null);assert.deepEqual(returned.reviews[0].scores,[]);
    const returnedPage=await page(`/lecturer/submissions/${first.id}`,lecturer.cookie,'en');assert.ok(returnedPage.includes('Wait for resubmission'));assert.ok(!returnedPage.includes('type="radio"'));
    await mutate(lecturer.cookie,{action:'review-analyze',id:first.id,rev:first.rev+1},409);
    await mutate(lecturer.cookie,{action:'review',id:second.id,rev:second.rev,decision:'final',comment:'TEST Missing Kember level.',scores:[2,3,3,4]},400);
    assert.equal((await state(lecturer.cookie)).classReflections.find(r=>r.id===second.id).rev,second.rev);
    await mutate(lecturer.cookie,{action:'review',id:second.id,rev:second.rev,decision:'final',level:2,comment:'TEST Lecturer final assessment.',scores:[2,3,3,4]});
    const final=(await state(lecturer.cookie)).classReflections.find(r=>r.id===second.id);assert.equal(final.status,'final');assert.equal(final.reviews[0].total,7.13);assert.equal(final.reviews[0].level,2);
    const config=(await state(lecturer.cookie)).courses.find(c=>c.id===courses[0]);
    const update={action:'course-save',...config,weeks:config.weeks.map((w,i)=>i===0?{...w,title:'TEST Updated week',due:'2026-12-01'}:w),rubric:config.rubric.map((c,i)=>i===0?{...c,descriptions:c.descriptions.map(d=>d+' TEST updated descriptor')}:c)};
    await mutate(otherLecturer.cookie,update,403);await mutate(a.cookie,update,403);await mutate(lecturer.cookie,update);
    const afterSettings=await state(lecturer.cookie);assert.equal(afterSettings.courses.find(c=>c.id===courses[0]).weeks[0].title,'TEST Updated week');
    const historical=afterSettings.classReflections.find(r=>r.id===second.id);assert.deepEqual(historical.reviews,final.reviews);assert.equal(historical.rev,final.rev);
    const changedRubric=await page(detailPath,lecturer.cookie,'en');const cleared=changedRubric.match(/<input\b[^>]*type="number"[^>]*>/g)||[];assert.equal(cleared.length,4);assert.ok(cleared.every(input=>input.includes('value=""')));
    for(const language of ['en','vi']){
      const progress=await page('/lecturer?tab=progress',lecturer.cookie,language),similarity=await page('/lecturer?tab=similarity',lecturer.cookie,language);
      assert.ok(progress.includes(language==='en'?'Students needing support by criterion':'Sinh viên cần hỗ trợ theo tiêu chí'));
      assert.ok(similarity.includes(language==='en'?'Similarity check':'Kiểm tra trùng lặp'));
      if(language==='en'){assert.ok(!similarity.includes('Kiểm tra ngay'));assert.ok(!progress.includes('Sinh viên cần hỗ trợ theo tiêu chí'));}
    }
    assert.equal((await state(a.cookie)).reflections.find(r=>r.id===sameAuthor.id).status,'submitted');
  }finally{for(const cookie of cookies)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}})}
});
