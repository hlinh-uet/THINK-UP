import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {demoPassword} from '../scripts/demo-data.mjs';
import {adminPages,adminHref} from '../lib/admin-pages.ts';
import {translate} from '../lib/i18n.ts';

const root=process.env.THINKUP_TEST_URL||'http://localhost:3000';
test('admin creates student and lecturer accounts with real credentials, assignments and bilingual user lists',async()=>{
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(root).hostname));
  const suffix=randomUUID().slice(0,8),password='TEST Account passphrase 2026',cookies=[];
  async function login(email,password){
    const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
    const cookie=response.headers.get('set-cookie').split(';')[0];cookies.push(cookie);return {cookie,data};
  }
  async function state(cookie){const response=await fetch(root+'/api/thinkup',{headers:{cookie}});assert.equal(response.status,200);return response.json()}
  async function create(cookie,body,status=200,origin=root){
    const response=await fetch(root+'/api/thinkup',{method:'POST',headers:{cookie,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify({action:'user-create',...body})});
    const raw=await response.text();assert.equal(response.status,status,raw);assert.ok(!raw.includes(password));assert.ok(!raw.includes('password_hash'));return response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):{error:raw};
  }
  async function visible(path,cookie,language){const response=await fetch(root+path,{headers:{cookie:`${cookie}; thinkup-language=${language}`}});assert.equal(response.status,200);return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')}
  async function access(path,cookie,status,location){const response=await fetch(root+path,{redirect:'manual',headers:cookie?{cookie}:{}});assert.equal(response.status,status,path);if(location)assert.equal(response.headers.get('location'),location)}
  try{
    const admin=await login('admin@thinkup.local',demoPassword),before=await state(admin.cookie);
    const studentEmail=`test-created-student-${suffix}@example.edu`,lecturerEmail=`test-created-lecturer-${suffix}@example.edu`;
    const base={name:`TEST Created ${suffix}`,email:studentEmail,password,role:'student',courseIds:['demo-course-reflection']};
    await create(admin.cookie,{...base,password:'short'},400);
    await create(admin.cookie,{...base,role:'admin'},400);
    await create(admin.cookie,{...base,courseIds:['missing-course']},404);
    await create(admin.cookie,base,403,'https://other.example');await create(admin.cookie,base,403,null);
    assert.equal((await state(admin.cookie)).users.length,before.users.length);
    const student=await create(admin.cookie,{...base,email:studentEmail.toUpperCase(),courseIds:['demo-course-reflection','demo-course-reflection']});
    assert.equal(student.user.email,studentEmail);assert.equal(student.user.role,'student');await create(admin.cookie,base,409);
    const lecturer=await create(admin.cookie,{...base,email:lecturerEmail,role:'lecturer',courseIds:['demo-course-project']});assert.equal(lecturer.user.role,'lecturer');
    const studentLogin=await login(studentEmail,password),lecturerLogin=await login(lecturerEmail,password);
    assert.equal(studentLogin.data.redirect,'/student');assert.equal(lecturerLogin.data.redirect,'/lecturer');
    const studentState=await state(studentLogin.cookie),lecturerState=await state(lecturerLogin.cookie);
    assert.deepEqual(studentState.courses.map(c=>c.id),['demo-course-reflection']);assert.deepEqual(lecturerState.courses.map(c=>c.id),['demo-course-project']);
    assert.ok(lecturerState.classReflections.every(r=>r.courseId==='demo-course-project'));
    await create(studentLogin.cookie,{...base,email:`denied-student-${suffix}@example.edu`},403);
    await create(lecturerLogin.cookie,{...base,email:`denied-lecturer-${suffix}@example.edu`},403);
    const after=await state(admin.cookie);assert.equal(after.memberships.filter(m=>m.userId===student.id).length,1);assert.equal(after.memberships.find(m=>m.userId===lecturer.id).role,'lecturer');
    await access('/admin',admin.cookie,307,'/admin/courses');
    await access('/admin?tab=settings',admin.cookie,307,'/admin/settings');
    await access('/admin?tab=users&role=lecturer',admin.cookie,307,'/admin/users?role=lecturer');
    await access('/admin?view=lecturer&tab=progress&course=demo-course-reflection',admin.cookie,307,'/admin/progress?course=demo-course-reflection');
    for(const language of ['en','vi'])for(const page of adminPages){
      const html=await visible(adminHref(page.key),admin.cookie,language);
      const nav=html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)?.[0];assert.ok(nav,page.key);
      for(const target of adminPages)assert.ok(nav.includes(`href="${adminHref(target.key)}"`),target.key);
      assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);
      assert.ok(nav.includes(translate(page.label,language).replaceAll('&','&amp;')));
      assert.ok(!nav.includes('/lecturer')&&!nav.includes('/student'));
      assert.ok(!html.includes('class="tab-bar"')&&!html.includes('lecturer-tabs'));
      const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)[0];
      assert.ok(main.includes(`<h1>${translate(page.label,language).replaceAll('&','&amp;')}</h1>`),page.key);
      if(page.key==='courses'){assert.ok(main.includes(translate('Tạo học phần',language)));assert.ok(!main.includes(translate('Tạo tài khoản',language)));assert.ok(!html.includes('aria-label="'+translate('Học phần đang xem',language)+'"'))}
      if(page.key==='users'){assert.ok(main.includes(translate('Tạo tài khoản',language)));assert.ok(!main.includes(translate('Ma trận quyền truy cập',language)))}
      if(page.key==='settings'){assert.ok(main.includes(translate('Ma trận quyền truy cập',language)));assert.ok(main.includes(translate('Chỉnh sửa cấu hình',language)));assert.ok(!main.includes(translate('Tạo tài khoản',language)))}
      if(language==='en')assert.ok(!nav.includes('Người dùng')&&!nav.includes('Học phần')&&!nav.includes('Cài đặt'));
    }
    for(const page of adminPages){await access(adminHref(page.key),studentLogin.cookie,307,'/student');await access(adminHref(page.key),lecturerLogin.cookie,307,'/lecturer')}
    await access('/admin/settings',null,307,'/login');
    for(const section of ['submissions','progress','similarity'])await access(adminHref(section,{course:'missing-course'}),admin.cookie,404);
    await access(adminHref('submissions',{reflection:'demo-student-week-6'}),admin.cookie,404);
    await access(adminHref('submissions',{course:'demo-course-project',reflection:'demo-student-week-4'}),admin.cookie,404);
    const detail=await visible(adminHref('submissions',{course:'demo-course-reflection',reflection:'demo-student-week-4'}),admin.cookie,'en');
    const expected=after.classReflections.find(r=>r.id==='demo-student-week-4');
    assert.ok(detail.includes(expected.attachments[0].name));assert.ok(detail.includes(translate('Phiên bản bài viết','en')));
    const scoped=await visible(adminHref('submissions',{course:'demo-course-project'}),admin.cookie,'en');
    const scopedNav=scoped.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/)[0];
    assert.ok(scopedNav.includes('href="/admin/progress?course=demo-course-project"'));
    assert.ok(scopedNav.includes('href="/admin/users"'));
    const en=await visible('/admin?tab=users&role=lecturer',admin.cookie,'en'),vi=await visible('/admin?tab=users&role=lecturer',admin.cookie,'vi');
    assert.ok(en.includes('Students &amp; lecturers'));assert.ok(en.includes('Create account'));assert.ok(en.includes(lecturerEmail));assert.ok(!en.includes(studentEmail));
    assert.ok(vi.includes('Sinh viên &amp; giảng viên'));assert.ok(vi.includes('Tạo tài khoản'));
    const students=await visible('/admin?tab=users&role=student',admin.cookie,'en');assert.ok(students.includes(studentEmail));assert.ok(!students.includes(lecturerEmail));
    const seededStudent=await login('student@thinkup.local',demoPassword);
    const englishOverview=await visible('/student',seededStudent.cookie,'en'),vietnameseOverview=await visible('/student',seededStudent.cookie,'vi');
    assert.ok(englishOverview.includes('What I want to change about how I learn'));assert.ok(!englishOverview.includes('Điều tôi muốn thay đổi trong cách học'));
    assert.ok(englishOverview.includes('Set two survey progress checkpoints each week.'));assert.ok(vietnameseOverview.includes('Điều tôi muốn thay đổi trong cách học'));
  }finally{for(const cookie of cookies)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}})}
});
