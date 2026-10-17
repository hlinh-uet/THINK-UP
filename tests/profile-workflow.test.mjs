import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {demoPassword} from '../scripts/demo-data.mjs';
const root=process.env.THINKUP_TEST_URL||'http://localhost:3000';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64');
test('own profiles, private image uploads and admin-only account changes work through authenticated HTTP',async()=>{
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(root).hostname));
  const suffix=randomUUID().slice(0,8),password='TEST Profile passphrase 2026',sessions=[],actors=[];let owner;
  async function read(response,status){const raw=await response.text();if(Array.isArray(status))assert.ok(status.includes(response.status),raw);else assert.equal(response.status,status,raw);try{return JSON.parse(raw)}catch{return {error:raw}}}
  async function api(path,cookie,body,status=200,origin=root){return read(await fetch(root+path,{headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json',...(origin?{Origin:origin}:{})}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})}),status)}
  async function login(email,pass=password,status=200){const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});await read(response,status);if(status!==200)return;const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return cookie}
  async function page(path,cookie,status=200,location){const response=await fetch(root+path,{redirect:'manual',headers:cookie?{cookie}:{}});assert.equal(response.status,status,path);if(location)assert.equal(response.headers.get('location'),location);return (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')}
  async function save(actor,fields={},status=200,origin=root,file){const form=new FormData();for(const [key,value] of Object.entries({name:actor.name,phone:'+84 123 456',bio:'TEST <script>bio</script>',revision:'0',avatarMode:file?'replace':'keep',...fields}))form.set(key,String(value));if(file)form.set('avatar',new Blob([file.bytes],{type:file.type}),'photo.png');return read(await fetch(root+'/api/profile',{method:'POST',headers:{...(actor.cookie?{cookie:actor.cookie}:{}),...(origin?{Origin:origin}:{})},body:form}),status)}
  async function update(actor,fields={},status=200){return api('/api/thinkup',owner,{action:'user-save',id:actor.id,name:actor.name,email:actor.email,role:actor.role,active:1,...fields},status)}
  try{
    owner=await login('admin@thinkup.local',demoPassword);
    for(const role of ['student','lecturer','admin']){
      const actor={role,name:`TEST Profile ${role} ${suffix}`,email:`test-profile-${role}-${suffix}@example.edu`};
      const created=await api('/api/thinkup',owner,{action:'user-create',name:actor.name,email:actor.email,password,role:role==='admin'?'student':role,courseIds:role==='admin'?[]:['demo-course-reflection']});actor.id=created.id;actors.push(actor);if(role==='admin')await update(actor);actor.cookie=await login(actor.email);
    }
    const [student,lecturer,admin]=actors;
    await api('/api/profile',null,undefined,401);await save({name:'TEST Anonymous'},{},401);
    await save(student,{},403,null);await save(student,{},403,'https://other.example');
    for(const field of ['email','role','active','userId','courseIds','avatarUrl'])await save(student,{[field]:'spoofed'},403);
    const initial=await api('/api/profile',student.cookie);assert.equal(initial.user.role,'student');assert.deepEqual(initial.courses.map(c=>c.id),['demo-course-reflection']);
    const ownOnly=await api('/api/profile?userId='+lecturer.id,student.cookie);assert.equal(ownOnly.user.id,student.id);
    await save(student,{name:''},400);await save(student,{},400,root,{bytes:Buffer.from('<svg/>'),type:'image/svg+xml'});await save(student,{},400,root,{bytes:Buffer.from('<script/>'),type:'image/png'});await save(student,{},[400,413],root,{bytes:Buffer.alloc(2*1024*1024+1),type:'image/png'});
    const photoBytes=Buffer.concat([png,Buffer.alloc(2*1024*1024-png.length)]);
    const changedName=`TEST Updated ${suffix}`,updated=await save(student,{name:changedName},200,root,{bytes:photoBytes,type:'image/png'});student.name=changedName;
    assert.equal(updated.user.email,student.email);assert.equal(updated.user.role,'student');assert.equal(updated.user.active,1);assert.equal(updated.revision,1);assert.deepEqual(updated.courses,initial.courses);assert.ok(!JSON.stringify(updated).includes('avatar_key'));
    const photo=await fetch(root+updated.user.avatarUrl,{headers:{cookie:lecturer.cookie}});assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/png');assert.ok(photo.headers.get('cache-control').includes('no-store'));assert.deepEqual(Buffer.from(await photo.arrayBuffer()),photoBytes);
    await read(await fetch(root+updated.user.avatarUrl),401);
    const contacts=await api('/api/messages',lecturer.cookie);assert.ok(contacts.contacts.find(p=>p.id===student.id).avatarUrl);assert.ok(!JSON.stringify(contacts).includes('TEST <script>bio</script>'));
    const state=await api('/api/thinkup',student.cookie);assert.equal(state.user.name,changedName);assert.equal(state.user.avatarUrl,updated.user.avatarUrl);
    await save(student,{name:'TEST stale'},409);assert.equal((await api('/api/profile',student.cookie)).user.name,changedName);
    for(const language of ['en','vi'])for(const actor of actors){
      const html=await page(`/${actor.role}/profile`,`${actor.cookie}; thinkup-language=${language}`);assert.ok(html.includes('<h1>'+(language==='en'?'My profile':'Hồ sơ cá nhân')+'</h1>'));assert.ok(html.includes('readOnly=""'));assert.ok(html.includes(actor.email));assert.ok(html.includes('aria-current="page"'));
      const home=await page(actor.role==='admin'?'/admin/users':actor.role==='lecturer'?'/lecturer/submissions':'/student',`${actor.cookie}; thinkup-language=${language}`);assert.ok(home.includes(`href="/${actor.role}/profile"`));
      for(const other of actors.filter(a=>a.role!==actor.role))await page(`/${other.role}/profile`,actor.cookie,307,`/${actor.role}`);
      await page(`/${actor.role}/profile`,null,307,'/login');
    }
    await api('/api/thinkup',student.cookie,{action:'user-save',id:student.id,name:student.name,email:'spoofed@example.edu',role:'admin',active:1},403);
    await update(student,{email:lecturer.email},409);
    const newEmail=`test-profile-updated-${suffix}@example.edu`;await update(student,{email:newEmail});await login(student.email,password,401);student.email=newEmail;assert.ok(await login(newEmail));
    assert.equal((await api('/api/profile',student.cookie)).user.email,newEmail);
    await save(lecturer);await save(admin);
    const removed=await save(student,{revision:1,avatarMode:'remove'});assert.equal(removed.user.avatarUrl,undefined);await read(await fetch(root+updated.user.avatarUrl,{headers:{cookie:student.cookie}}),404);
    await update(student,{active:0});await api('/api/profile',student.cookie,undefined,403);
  }finally{
    if(owner)for(const actor of actors)await update(actor,{active:0});
    for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}});
  }
});
