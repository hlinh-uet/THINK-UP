import test from 'node:test';
import assert from 'node:assert/strict';
import {adminPages,adminHref,legacyAdminHref} from '../lib/admin-pages.ts';
import {defaultPermissions,permissionDefinitions,toggleRolePermission,validateRolePermissions,normalizePermissionPolicy,hasPermission} from '../lib/permissions.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {defaultRubric,defaultWeeks} from '../lib/domain.ts';

const {default:AdminWorkspace}=await import(componentModule(new URL('../app/AdminWorkspace.tsx',import.meta.url)));
const adminData={user:{id:'admin',role:'admin',name:'Admin',email:'admin@example.test',active:1},local:true,aiReady:false,courses:[],users:[],memberships:[],invitations:[],classReflections:[],reflections:[],actions:[],rubric:defaultRubric,weeks:defaultWeeks};
const {default:DefaultConfigurationFields}=await import(componentModule(new URL('../app/DefaultConfigurationFields.tsx',import.meta.url)));
const {default:AdminSettings}=await import(componentModule(new URL('../app/AdminSettings.tsx',import.meta.url)));

test('settings keep three useful tabs, editable role permissions and spacious defaults in both languages',()=>{
  const data={...adminData,permissionPolicy:{revision:0,roles:defaultPermissions()}};
  for(const language of ['en','vi']){
    const html=renderToStaticMarkup(createElement(AdminSettings,{data,language,initialTab:'permissions',busy:'',onMutate:async()=>true,onReload:async()=>{}}));
    assert.match(html,language==='vi'?/Lưu phân quyền/:/Save permissions/);
    assert.match(html,/role="switch"/);
    assert.match(html,language==='vi'?/Tìm trong nhật ký/:/Search audit log/);
    assert.match(html,language==='vi'?/aria-pressed="true">Phân quyền/:/aria-pressed="true">Permissions/);
    assert.doesNotMatch(html,/AI connection|Kết nối AI|Storage &amp; incidents|Lưu trữ &amp; sự cố|retention-save|incident-save/);
    assert.match(html,/admin-default-selector/);
    assert.equal((html.match(/<textarea/g)||[]).length,2,'Only the selected week has editable fields.');
    if(language==='en')assert.doesNotMatch(html,/[À-ỹ]/);
    const rubric=renderToStaticMarkup(createElement(DefaultConfigurationFields,{draft:{weeks:defaultWeeks,rubric:defaultRubric},section:'rubric',weekIndex:0,criterionIndex:2,onWeek:()=>{},onCriterion:()=>{},editWeek:()=>{},editCriterion:()=>{},language}));
    assert.equal((rubric.match(/<textarea/g)||[]).length,4,'One criterion has four full width level editors.');
    assert.match(rubric,/35%/);assert.match(rubric,/25%/);assert.match(rubric,/20%/);
  }
  for(const old of ['ai','data','invalid'])assert.equal(adminHref('settings',{settingsTab:old}),'/admin/settings');
  assert.equal(adminHref('settings',{settingsTab:'permissions'}),'/admin/settings?settingsTab=permissions');
});

test('role permissions revoke capabilities, preserve role boundaries and protect recovery access',()=>{
  const defaults=defaultPermissions();assert.deepEqual(normalizePermissionPolicy(undefined),{revision:0,roles:defaults});
  for(const role of ['student','lecturer','admin'])for(const p of permissionDefinitions){
    assert.equal(hasPermission({role},p.key),p.roles.includes(role));
    assert.equal(hasPermission({role,permissions:[]},p.key),false);
  }
  let next=toggleRolePermission(defaults,'lecturer','submissions.read',false);
  for(const key of ['submissions.read','reviews.manage','ai.use','similarity.run'])assert.ok(!next.lecturer.includes(key));
  assert.deepEqual(validateRolePermissions(next),next);
  next=toggleRolePermission(next,'lecturer','reviews.manage',true);assert.ok(next.lecturer.includes('submissions.read'));
  assert.throws(()=>validateRolePermissions({...defaults,student:[...defaults.student,'users.manage']}));
  assert.throws(()=>validateRolePermissions({...defaults,admin:[]}));
  assert.throws(()=>validateRolePermissions({...defaults,lecturer:['reviews.manage']}));
  assert.ok(toggleRolePermission(defaults,'admin','permissions.manage',false).admin.includes('permissions.manage'));
});

test('admin workspace exposes management and personal messages in both languages',()=>{
  for(const language of ['en','vi'])for(const {key:section} of adminPages.filter(p=>p.key!=='messages')){
    const query={course:undefined,role:'lecturer'};
    const html=renderToStaticMarkup(createElement(AdminWorkspace,{initialData:adminData,initialLanguage:language,section,query}));
    const header=html.match(/<header class="sidebar">[\s\S]*?<\/header>/)?.[0]||'';
    const aside=html.match(/<aside[\s\S]*?<\/aside>/)?.[0]||'';
    assert.match(header,/<a class="brand" href="\/admin\/users"/);
    assert.doesNotMatch(header,/<nav|course-picker/);
    assert.match(header,/class="workspace-menu-toggle"[^>]*aria-controls="[^"]+" aria-expanded="false"/);
    assert.equal((aside.match(/<a /g)||[]).length,4);
    assert.equal((aside.match(/aria-current="page"/g)||[]).length,1);
    for(const page of adminPages)assert.ok(aside.includes(`href="${adminHref(page.key,query).replaceAll('&','&amp;')}"`));
    assert.doesNotMatch(html,/\/admin\/(overview|submissions|progress|similarity)|\/lecturer|course-picker|lx-scope-controls|nav-count/);
    assert.ok(aside.includes(language==='en'?'<span>Settings</span>':'<span>Cài đặt</span>'));
  }
});

test('admin pages have distinct routes with relevant, safely encoded filters',()=>{
  assert.deepEqual(adminPages.map(p=>p.key),['users','courses','settings','messages']);
  for(const page of adminPages)assert.equal(adminHref(page.key),`/admin/${page.key}`);
  assert.equal(adminHref('users',{role:'lecturer',course:'ignored',reflection:'ignored'}),'/admin/users?role=lecturer');
  assert.equal(adminHref('users',{role:'invalid'}),'/admin/users');
  assert.equal(adminHref('settings',{course:'ignored',role:'admin'}),'/admin/settings');
  assert.equal(adminHref('messages',{course:'ignored',role:'student',settingsTab:'audit'}),'/admin/messages');
  assert.equal(adminHref('courses',{course:'course / &',reflection:'ignored'}),'/admin/courses?course=course+%2F+%26');
});

test('former admin bookmarks stay in the admin workspace and retain their relevant filters',()=>{
  assert.equal(legacyAdminHref({}),'/admin/users');
  assert.equal(legacyAdminHref({tab:'courses'}),'/admin/courses');
  assert.equal(legacyAdminHref({tab:'users',role:'student'}),'/admin/users?role=student');
  assert.equal(legacyAdminHref({tab:'settings'}),'/admin/settings');
  assert.equal(legacyAdminHref({view:'messages'}),'/admin/messages');
  assert.equal(legacyAdminHref({tab:'messages'}),'/admin/messages');
  assert.equal(legacyAdminHref({view:'lecturer',course:'course'}),'/admin/courses?course=course');
  assert.equal(legacyAdminHref({view:'lecturer',tab:'progress',course:'course'}),'/admin/courses?course=course');
  assert.equal(legacyAdminHref({view:'lecturer',tab:'similarity'}),'/admin/courses');
  assert.equal(legacyAdminHref({view:'editor',tab:'invalid',role:'lecturer'}),'/admin/users?role=lecturer');
});
