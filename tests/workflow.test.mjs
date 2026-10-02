import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {defaultRubric,defaultWeeks} from '../lib/domain.ts';
const root=process.env.THINKUP_TEST_URL;
test('private drafts, cohort permissions, revisions, attachments, lecturer override and actions',{skip:!root},async()=>{
const suffix=randomUUID().slice(0,8),student=`test-student-${suffix}`,teacher=`test-teacher-${suffix}`,other=`test-other-${suffix}`,outsider=`test-outsider-${suffix}`;
const headers=(who)=>({'oai-authenticated-user-id':who||'local-owner','oai-authenticated-user-email':who?`${who}@example.edu`:'owner@thinkup.local'});
async function get(who){const response=await fetch(`${root}/api/thinkup`,{headers:headers(who)});const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));return data}
async function post(who,body,status=200){const response=await fetch(`${root}/api/thinkup`,{method:'POST',headers:{...headers(who),'Content-Type':'application/json'},body:JSON.stringify(body)});const payload=await response.json();assert.equal(response.status,status,JSON.stringify(payload));return payload}
const owner=await get();assert.equal(owner.user.role,'admin');
const c=await post(null,{action:'course-save',name:`TEST Workflow ${suffix}`,code:`TEST-${suffix}`,weeks:defaultWeeks,rubric:defaultRubric});
await post(null,{action:'course-save',name:'Invalid',code:'TEST-invalid',weeks:defaultWeeks,rubric:defaultRubric.map(r=>({...r,weight:20}))},400);
for(const [who,role] of [[student,'student'],[teacher,'lecturer'],[other,'student']])await post(null,{action:'invite',email:`${who}@example.edu`,name:`TEST ${who}`,role,courseId:c.id});
assert.equal((await get(student)).user.role,'student');assert.equal((await get(teacher)).user.role,'lecturer');await get(other);await get(outsider);
await post(student,{action:'course-save',name:'Denied',code:'DENY',weeks:defaultWeeks,rubric:defaultRubric},403);
const content={what:'Hôm nay tôi làm việc nhóm để giải quyết một bài tập. Tôi phụ trách trình bày kết quả và lắng nghe các thành viên.',soWhat:'Tôi cảm thấy lo lắng vì chưa chuẩn bị đủ. Khi lắng nghe nhóm, tôi hiểu rằng sự lo lắng của mình xuất phát từ thiếu trao đổi.',nowWhat:'Tôi học được rằng lắng nghe giúp tôi nhìn nhận vấn đề khác đi. Tôi nhận ra giả định ban đầu của tôi về việc tự làm mọi thứ không phù hợp.',action:'Tôi sẽ trao đổi với các thành viên trước buổi học tuần tới, chuẩn bị ba câu hỏi và ghi lại kết quả sau buổi thảo luận.'};
const saved=await post(student,{action:'save',title:`TEST Reflection ${suffix}`,content,week:1,courseId:c.id});let state=await get(student),r=state.reflections.find(r=>r.id===saved.id);assert.equal(r.versions.length,1);assert.equal((await get(teacher)).classReflections.length,0);
await post(other,{action:'save',id:r.id,rev:r.rev,title:'Stolen',content,week:1,courseId:c.id},403);
const form=new FormData();form.append('reflectionId',r.id);form.append('file',new File(['Evidence from group learning.'],'notes.txt',{type:'text/plain'}));const upload=await fetch(`${root}/api/thinkup`,{method:'POST',headers:headers(student),body:form});assert.equal(upload.status,200,await upload.text());r=(await get(student)).reflections.find(x=>x.id===r.id);const fid=r.attachments[0].id;assert.equal((await fetch(`${root}/api/files/${fid}`,{headers:headers(other)})).status,403);assert.equal((await fetch(`${root}/api/files/${fid}`,{headers:headers(teacher)})).status,403);
await post(student,{action:'save',id:r.id,rev:999,title:r.title+' edit',content,week:1,courseId:c.id},409);
await post(student,{action:'save',id:r.id,rev:r.rev,title:r.title,content:{...content,soWhat:content.soWhat+' Tôi sẽ chú ý hơn.'},week:1,courseId:c.id});r=(await get(student)).reflections.find(x=>x.id===r.id);assert.equal(r.versions.length,2);assert.deepEqual(r.versions.find(v=>v.stage==='Draft').content,content);
if(!state.aiReady)await post(student,{action:'coach',id:r.id,rev:r.rev},503);
await post(student,{action:'submit',id:r.id,rev:r.rev});r=(await get(student)).reflections.find(x=>x.id===r.id);assert.equal(r.status,'submitted');assert.equal((await fetch(`${root}/api/files/${fid}`,{headers:headers(teacher)})).status,200);assert.ok((await get(teacher)).classReflections.some(x=>x.id===r.id));assert.equal((await get(outsider)).classReflections.length,0);
await post(student,{action:'save',id:r.id,rev:r.rev,title:'Edit locked',content,week:1,courseId:c.id},409);
await post(other,{action:'review',id:r.id,rev:r.rev,decision:'final',scores:[4,4,4,4],comment:'Denied'},403);
await post(teacher,{action:'review',id:r.id,rev:r.rev,decision:'returned',comment:'TEST Cần bổ sung góc nhìn khác.'});r=(await get(student)).reflections.find(x=>x.id===r.id);assert.equal(r.status,'returned');assert.equal(r.reviews[0].total,null);
await post(student,{action:'save',id:r.id,rev:r.rev,title:r.title,content:{...content,soWhat:content.soWhat+' Một góc nhìn khác là nhóm cần thời gian chuẩn bị.'},week:1,courseId:c.id});r=(await get(student)).reflections.find(x=>x.id===r.id);await post(student,{action:'submit',id:r.id,rev:r.rev});r=(await get(student)).reflections.find(x=>x.id===r.id);
await post(teacher,{action:'review',id:r.id,rev:r.rev,decision:'final',scores:[3,4,2,3],comment:'TEST Đánh giá cuối cùng có lý do rõ ràng.'});r=(await get(student)).reflections.find(x=>x.id===r.id);assert.equal(r.status,'final');assert.equal(r.reviews[0].total,7.5);assert.equal(r.reviews[0].level,3);assert.equal(r.versions[0].stage,'Final');await post(student,{action:'save',id:r.id,rev:r.rev,title:'Edit final',content,week:1,courseId:c.id},409);
await post(student,{action:'action-save',reflectionId:r.id,text:'TEST Gặp nhóm để trao đổi',due:'2026-10-09',status:'done',review:''},400);
await post(student,{action:'action-save',reflectionId:r.id,text:'TEST Gặp nhóm để trao đổi',due:'2026-10-09',status:'todo',review:''});const a=(await get(student)).actions.find(a=>a.reflectionId===r.id);await post(other,{action:'action-save',id:a.id,text:'Stolen',status:'todo',review:''},404);await post(student,{action:'action-save',id:a.id,text:a.text,due:a.due,status:'done',review:'TEST Tôi đã trao đổi và nhận phản hồi.'});assert.equal((await get(student)).actions.find(x=>x.id===a.id).status,'done');
await post(null,{action:'user-save',id:teacher,name:'TEST demoted',role:'student',active:1});assert.equal((await get(teacher)).classReflections.length,0);assert.equal((await fetch(`${root}/api/files/${fid}`,{headers:headers(teacher)})).status,403);
await post(null,{action:'user-save',id:other,name:'TEST inactive',role:'student',active:0});assert.equal((await fetch(`${root}/api/thinkup`,{headers:headers(other)})).status,403);
});
