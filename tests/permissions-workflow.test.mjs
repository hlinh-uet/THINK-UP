import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {defaultRubric,defaultWeeks} from '../lib/domain.ts';
import {defaultPermissions,toggleRolePermission} from '../lib/permissions.ts';

const root=process.env.THINKUP_TEST_URL;
test('role permissions persist, reject stale saves and revoke access for existing sessions without widening scope',{skip:!root},async()=>{
  assert.ok(['localhost','127.0.0.1'].includes(new URL(root).hostname));
  const owner={'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@thinkup.local'},suffix=randomUUID().slice(0,8),sessions=[];
  async function call(path,actor,body,status=200){
    const response=await fetch(root+path,{method:body?'POST':'GET',headers:{...(typeof actor==='string'?{cookie:actor}:actor),...(body?{Origin:root,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const text=await response.text();assert.equal(response.status,status,`${path}: ${text}`);return text?JSON.parse(text):{};
  }
  const mutate=(actor,body,status)=>call('/api/thinkup',actor,body,status),learning=(actor,body,status)=>call('/api/learning',actor,body,status);
  const initial=await call('/api/learning?mode=permissions',owner);let current=initial;
  async function setPermissions(roles){const result=await learning(owner,{action:'permissions-save',roles,revision:current.revision});current=result.policy;assert.deepEqual((await call('/api/learning?mode=permissions',owner)),current)}
  async function actor(role,courseId){
    const password='TEST permissions password 2026',created=await mutate(owner,{action:'user-create',name:`TEST Permission ${role}`,email:`test-permissions-${role}-${suffix}@example.edu`,role,password,courseIds:[courseId]});
    const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email:created.user.email,password})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return {...created.user,cookie};
  }
  try{
    await setPermissions(defaultPermissions());
    const course=(await mutate(owner,{action:'course-save',name:'TEST Permissions',code:'PERM-'+suffix,className:'TEST Permissions',weeks:defaultWeeks,rubric:defaultRubric})).id;
    const student=await actor('student',course),teacher=await actor('lecturer',course);
    const content={what:'I asked each team member about their experience.',soWhat:'I reconsidered my assumption about silence.',nowWhat:'I learned that listening changes my perspective.',action:'Next week I will record two questions and compare the answers.'};
    const draft=(await mutate(student.cookie,{action:'save',title:'TEST Permission reflection',content,week:1,courseId:course})).id;
    const own=(await call('/api/thinkup',student.cookie)).reflections.find(r=>r.id===draft);
    await call('/api/learning?mode=permissions',student.cookie,null,403);
    await learning(teacher.cookie,{action:'permissions-save',roles:defaultPermissions(),revision:current.revision},403);
    await learning(owner,{action:'permissions-save',roles:{...defaultPermissions(),student:['users.manage']},revision:current.revision},400);
    await learning(owner,{action:'permissions-save',roles:{...defaultPermissions(),admin:[]},revision:current.revision},400);
    await learning(owner,{action:'permissions-save',roles:defaultPermissions(),revision:current.revision-1},409);
    await learning(owner,{action:'permissions-save',roles:defaultPermissions(),revision:undefined},409);

    // Every student capability is checked against the saved policy on the same cookie.
    await setPermissions({...current.roles,student:[]});
    for(const action of ['save','submit','coach','feedback','action-save'])await mutate(student.cookie,{action,id:draft,rev:own.rev,content,week:1,courseId:course},403);
    await learning(student.cookie,{action:'self-assess',id:draft},403);
    await learning(student.cookie,{action:'archive-reflection',id:draft},403);
    await call('/api/reflection-chat',student.cookie,{reflectionId:draft,mode:'thinking'},403);
    await call('/api/messages',student.cookie,null,403);
    await call('/api/messages',student.cookie,{action:'send',peerId:teacher.id,text:'Denied',clientId:randomUUID()},403);
    const deniedPage=await fetch(root+'/student/messages',{headers:{cookie:student.cookie}});assert.equal(deniedPage.status,200);assert.match(await deniedPage.text(),/Vai trò của bạn chưa được cấp quyền/);
    for(const path of ['/api/thinkup','/api/action-evidence']){
      const response=await fetch(root+path,{method:'POST',headers:{cookie:student.cookie,Origin:root},body:new FormData()});assert.equal(response.status,403,await response.text());
    }
    assert.deepEqual((await call('/api/thinkup',student.cookie)).user.permissions,[]);
    assert.ok((await call('/api/thinkup',student.cookie)).reflections.some(r=>r.id===draft),'Revoking edits does not delete or hide personal writing.');
    await setPermissions({...current.roles,student:defaultPermissions().student});
    await mutate(student.cookie,{action:'submit',id:draft,rev:own.rev});
    assert.ok((await call('/api/thinkup',teacher.cookie)).classReflections.some(r=>r.id===draft));
    await call('/api/messages',student.cookie);

    // Removing class access also revokes its dependent capabilities and data reads.
    await setPermissions(toggleRolePermission(current.roles,'lecturer','submissions.read',false));
    const restricted=await call('/api/thinkup',teacher.cookie);
    assert.deepEqual(restricted.classReflections,[]);assert.deepEqual(restricted.classActions,[]);assert.deepEqual(restricted.participation,[]);
    for(const action of ['review','review-analyze'])await mutate(teacher.cookie,{action,id:draft},403);
    for(const action of ['review-draft-save','reading-analyze'])await learning(teacher.cookie,{action,id:draft},403);
    await call('/api/similarity',teacher.cookie,{courseId:course},403);
    await setPermissions({...current.roles,lecturer:defaultPermissions().lecturer});
    assert.ok((await call('/api/thinkup',teacher.cookie)).classReflections.some(r=>r.id===draft));
    // A valid role grant cannot allow a student to review somebody's writing.
    await mutate(student.cookie,{action:'review',id:draft},403);
    await setPermissions({...current.roles,lecturer:[]});
    await learning(teacher.cookie,{action:'template-save',courseId:course,title:'Denied',text:'Denied'},403);
    await mutate(teacher.cookie,{action:'course-save',id:course,name:'Denied'},403);
    await setPermissions({...current.roles,lecturer:defaultPermissions().lecturer});
    const template=await learning(teacher.cookie,{action:'template-save',courseId:course,title:'TEST Restored template',text:'TEST feedback',criterionKey:'all',revision:0});
    await learning(teacher.cookie,{action:'template-remove',id:template.id});

    // Administrators always retain the route needed to restore configuration access.
    await setPermissions({...current.roles,admin:['permissions.manage']});
    await call('/api/thinkup?adminSection=users',owner,null,403);
    await call('/api/thinkup?adminSection=courses',owner,null,403);
    await call('/api/learning?mode=audit',owner,null,403);
    await call('/api/messages',owner,null,403);
    for(const action of ['user-create','user-save','invite','membership-remove','course-save','config-save','review','review-analyze'])await mutate(owner,{action},403);
    await call('/api/similarity',owner,{courseId:course},403);
    await learning(owner,{action:'reading-analyze',id:draft},403);
    assert.equal((await call('/api/thinkup?adminSection=settings',owner)).permissionPolicy.revision,current.revision);
    await setPermissions(defaultPermissions());
    await call('/api/thinkup?adminSection=users',owner);await call('/api/thinkup?adminSection=courses',owner);
    const audit=await call('/api/learning?mode=audit',owner);assert.ok(audit.audit.some(a=>a.action==='permissions-save'));assert.equal(audit.incidents,undefined);
    await mutate(owner,{action:'config-save',weeks:defaultWeeks,rubric:defaultRubric});
  }finally{
    current=await call('/api/learning?mode=permissions',owner);await setPermissions(initial.roles);
    for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{cookie,Origin:root}});
  }
});
