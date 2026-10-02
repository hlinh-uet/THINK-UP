import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const root=process.env.THINKUP_TEST_URL;

test('email sign-in, SSR screens, route isolation, invitation approval, role changes and logout',{skip:!root},async()=>{
  const suffix=randomUUID().slice(0,8),password='TEST strong passphrase 2026';
  const email=`test-email-${suffix}@example.edu`,lecturerEmail=`test-lecturer-${suffix}@example.edu`;
  const ownerHeaders={'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@thinkup.local'};
  async function auth(action,body={},cookie=''){
    const response=await fetch(`${root}/api/auth/${action}`,{method:'POST',headers:{Origin:root,'Content-Type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(body)});
    const payload=await response.json();return {status:response.status,payload,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
  }
  async function state(cookie='',headers={}){const r=await fetch(`${root}/api/thinkup`,{headers:{...headers,...(cookie?{cookie}:{})}});return {status:r.status,payload:await r.json()};}
  async function owner(body){const r=await fetch(`${root}/api/thinkup`,{method:'POST',headers:{...ownerHeaders,Origin:root,'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,await r.clone().text());return r.json();}
  async function page(path,cookie=''){return fetch(root+path,{headers:cookie?{cookie}:{},redirect:'manual'});}
  async function visible(path,cookie){const r=await page(path,cookie);assert.equal(r.status,200,await r.clone().text());return (await r.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');}
  assert.equal((await state()).payload.user,null);
  for(const path of ['/admin','/lecturer','/student']){const response=await page(path);assert.ok([302,303,307,308].includes(response.status));assert.equal(new URL(response.headers.get('location'),root).pathname,'/login');}
  const landing=await visible('/',null);assert.ok(landing.includes('/register'));assert.ok(landing.includes('/login'));assert.ok(!landing.includes('class="sidebar"'));
  const wrongOrigin=await fetch(`${root}/api/auth/register`,{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:JSON.stringify({name:'TEST',email,password})});assert.equal(wrongOrigin.status,403);
  const weak=await auth('register',{name:'TEST',email,password:'short'});assert.equal(weak.status,400);
  // Registering an intended admin/lecturer email cannot claim elevated privileges.
  await owner({action:'invite',email:lecturerEmail,name:`TEST Lecturer ${suffix}`,role:'lecturer',courseId:''});
  const register=await auth('register',{name:`TEST Student ${suffix}`,email:email.toUpperCase(),password,role:'admin'});
  assert.equal(register.status,200,JSON.stringify(register.payload));assert.equal(register.payload.user.role,'student');assert.equal(register.payload.redirect,'/student');assert.ok(register.cookie);
  assert.ok(!JSON.stringify(register.payload).includes('password'));assert.equal(register.payload.user.email,email);
  const studentCookie=register.cookie;assert.equal((await state(studentCookie)).payload.user.role,'student');
  const studentHtml=await visible('/student',studentCookie);assert.match(studentHtml,/STUDY SPACE|LEARNING WORKSPACE|LEARNING SPACE/);assert.ok(studentHtml.includes('/student?view=editor'));assert.ok(!studentHtml.includes('href="/admin'));assert.ok(!studentHtml.includes('href="/lecturer'));
  const redirected=await page('/admin',studentCookie);assert.ok([302,303,307,308].includes(redirected.status));assert.equal(new URL(redirected.headers.get('location'),root).pathname,'/student');
  const forbiddenQuery=await visible('/student?view=admin',studentCookie);assert.ok(!forbiddenQuery.includes('class="invite-form"'));
  const lecturerRegister=await auth('register',{name:`TEST Lecturer ${suffix}`,email:lecturerEmail,password,role:'lecturer'});assert.equal(lecturerRegister.payload.user.role,'student');
  const ownerData=(await state('',ownerHeaders)).payload,pending=ownerData.invitations.find(i=>i.email===lecturerEmail);assert.ok(pending);
  const denied=await fetch(`${root}/api/thinkup`,{method:'POST',headers:{cookie:studentCookie,Origin:root,'Content-Type':'application/json'},body:JSON.stringify({action:'invite-approve',id:pending.id})});assert.equal(denied.status,403);
  await owner({action:'invite-approve',id:pending.id});
  const lecturerLogin=await auth('login',{email:lecturerEmail,password});assert.equal(lecturerLogin.payload.redirect,'/lecturer');assert.equal(lecturerLogin.payload.user.role,'lecturer');
  const lecturerHtml=await visible('/lecturer',lecturerLogin.cookie);assert.ok(lecturerHtml.includes('TEACHING WORKSPACE'));assert.ok(!lecturerHtml.includes('/student?view=editor'));assert.ok(!lecturerHtml.includes('href="/admin'));
  const wrong=await auth('login',{email,password:'Wrong passphrase 2026'});assert.equal(wrong.status,401);
  const login=await auth('login',{email,password});assert.equal(login.status,200);assert.equal(login.payload.redirect,'/student');
  await owner({action:'user-save',...register.payload.user,role:'admin',active:1});
  const adminLogin=await auth('login',{email,password});assert.equal(adminLogin.payload.redirect,'/admin');
  const adminHtml=await visible('/admin',adminLogin.cookie);assert.ok(adminHtml.includes('ADMIN WORKSPACE'));assert.ok(adminHtml.includes('/admin?view=lecturer'));assert.ok(!adminHtml.includes('/student?view=editor'));
  // Permissions use the live database role, including already issued sessions.
  await owner({action:'user-save',...register.payload.user,role:'student',active:1});assert.equal((await state(adminLogin.cookie)).payload.user.role,'student');
  const lowered=await page('/admin',adminLogin.cookie);assert.equal(new URL(lowered.headers.get('location'),root).pathname,'/student');
  await owner({action:'user-save',...register.payload.user,role:'student',active:0});assert.equal((await state(studentCookie)).status,403);
  await owner({action:'user-save',...register.payload.user,role:'student',active:1});
  const logout=await auth('logout',{},login.cookie);assert.equal(logout.status,200);assert.equal(logout.cookie,'thinkup-session=');assert.equal((await state(login.cookie)).payload.user,null);
  const duplicate=await auth('register',{name:'TEST Duplicate',email,password});assert.equal(duplicate.status,409);
  const sharedEmail=await fetch(`${root}/api/auth`,{headers:{'oai-authenticated-user-id':`platform-${suffix}`,'oai-authenticated-user-email':email}});assert.equal(sharedEmail.status,200);assert.equal((await sharedEmail.json()).user,null);
  const platformId=`test-existing-${suffix}`,platformEmail=`${platformId}@example.edu`,platformHeaders={'oai-authenticated-user-id':platformId,'oai-authenticated-user-email':platformEmail};
  await owner({action:'invite',name:'TEST Existing Lecturer',email:platformEmail,role:'lecturer',courseId:''});
  const activationState=await fetch(`${root}/api/auth`,{headers:platformHeaders});const activation=await activationState.json();assert.equal(activation.setup.role,'lecturer');assert.equal(activation.setup.email,platformEmail);
  const setup=await fetch(`${root}/api/auth/setup`,{method:'POST',headers:{...platformHeaders,Origin:root,'Content-Type':'application/json'},body:JSON.stringify({password,email:'other@example.edu',role:'admin'})});assert.equal(setup.status,200);const setupResult=await setup.json();assert.equal(setupResult.user.id,platformId);assert.equal(setupResult.user.role,'lecturer');assert.equal(setupResult.user.email,platformEmail);
  const activatedLogin=await auth('login',{email:platformEmail,password});assert.equal(activatedLogin.payload.user.id,platformId);assert.equal(activatedLogin.payload.redirect,'/lecturer');
  const unknown=`unknown-${suffix}@example.edu`;for(let n=0;n<8;n++)assert.equal((await auth('login',{email:unknown,password})).status,401);assert.equal((await auth('login',{email:unknown,password})).status,429);
});
