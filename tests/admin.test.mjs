import test from 'node:test';
import assert from 'node:assert/strict';
import {adminPages,adminHref,legacyAdminHref,isAdminMonitoring} from '../lib/admin-pages.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';

const {default:WorkspaceHeader}=await import(componentModule(new URL('../app/WorkspaceHeader.tsx',import.meta.url)));
const {default:AdminNavigation}=await import(componentModule(new URL('../app/AdminNavigation.tsx',import.meta.url)));
const {default:CoursePicker}=await import(componentModule(new URL('../app/CoursePicker.tsx',import.meta.url)));

test('admin sidebar keeps every route, current section and relevant filters within the admin workspace',()=>{
  for(const language of ['en','vi'])for(const {key:section} of adminPages){
    const query={course:'course & one',role:'lecturer'};
    const html=renderToStaticMarkup(createElement(WorkspaceHeader,{
      language,sideNavigation:true,mobileSideMenu:true,homeHref:adminHref('courses'),
      controls:createElement('button',null,'Help'),profile:createElement('a',{href:'/admin/profile'},'Profile'),
      sidebarControls:isAdminMonitoring(section)?createElement(CoursePicker,{language,courses:[{id:query.course,code:'REF101',name:'Reflection practice'}],value:query.course,onChange(){throw new Error('Rendering must not navigate')}}):undefined,
    },createElement(AdminNavigation,{section,query,language,unread:3})));
    const header=html.match(/<header[\s\S]*?<\/header>/)?.[0]||'';
    const aside=html.match(/<aside[\s\S]*?<\/aside>/)?.[0]||'';
    assert.match(header,/<a class="brand" href="\/admin\/courses"/);
    assert.doesNotMatch(header,/<nav|course-picker/,'Navigation and course controls belong in the sidebar');
    assert.doesNotMatch(html,/href="\/student/);
    assert.match(header,/class="workspace-menu-toggle"[^>]*aria-controls="[^"]+" aria-expanded="false"/);
    assert.equal((aside.match(/<nav /g)||[]).length,1);
    assert.equal((aside.match(/aria-current="page"/g)||[]).length,1);
    for(const page of adminPages)assert.ok(aside.includes(`href="${adminHref(page.key,query).replaceAll('&','&amp;')}"`));
    assert.match(aside,/class="nav-count"[^>]*>3<\/small>/);
    assert.equal(aside.includes('class="course-picker"'),isAdminMonitoring(section));
    assert.ok(aside.includes(language==='en'?'<span>Settings</span>':'<span>Cài đặt</span>'));
  }
});

test('admin pages have distinct routes with relevant, safely encoded filters',()=>{
  assert.deepEqual(adminPages.map(p=>p.key),['courses','users','settings','submissions','progress','similarity','messages']);
  for(const page of adminPages)assert.equal(adminHref(page.key),`/admin/${page.key}`);
  assert.equal(adminHref('users',{role:'lecturer',course:'ignored',reflection:'ignored'}),'/admin/users?role=lecturer');
  assert.equal(adminHref('users',{role:'invalid'}),'/admin/users');
  assert.equal(adminHref('settings',{course:'ignored',role:'admin'}),'/admin/settings');
  assert.equal(adminHref('submissions',{course:'course / &',reflection:'reflection?&=',role:'student'}),'/admin/submissions?course=course+%2F+%26&reflection=reflection%3F%26%3D');
  assert.equal(adminHref('progress',{course:'course',reflection:'ignored'}),'/admin/progress?course=course');
  assert.equal(isAdminMonitoring('courses'),false);assert.equal(isAdminMonitoring('settings'),false);
  for(const section of ['submissions','progress','similarity'])assert.equal(isAdminMonitoring(section),true);
});

test('former admin bookmarks stay in the admin workspace and retain their relevant filters',()=>{
  assert.equal(legacyAdminHref({}),'/admin/courses');
  assert.equal(legacyAdminHref({tab:'users',role:'student'}),'/admin/users?role=student');
  assert.equal(legacyAdminHref({tab:'settings'}),'/admin/settings');
  assert.equal(legacyAdminHref({view:'lecturer',course:'course'}),'/admin/submissions?course=course');
  assert.equal(legacyAdminHref({view:'lecturer',tab:'progress',course:'course'}),'/admin/progress?course=course');
  assert.equal(legacyAdminHref({view:'lecturer',tab:'similarity'}),'/admin/similarity');
  assert.equal(legacyAdminHref({view:'editor',tab:'invalid',role:'lecturer'}),'/admin/courses');
});
