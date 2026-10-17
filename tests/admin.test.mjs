import test from 'node:test';
import assert from 'node:assert/strict';
import {adminPages,adminHref,legacyAdminHref,isAdminMonitoring} from '../lib/admin-pages.ts';

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
