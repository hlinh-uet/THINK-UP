import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {demoPassword} from '../scripts/demo-data.mjs';

const root=process.env.THINKUP_TEST_URL||'http://localhost:3000';
test('authenticated chat works between all roles, renders names/roles in both languages and protects third-party history',async()=>{
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(root).hostname));
  const suffix=randomUUID().slice(0,8),password='TEST Chat passphrase 2026',sessions=[],actors=[];
  let owner;
  async function login(email,password){
    const response=await fetch(root+'/api/auth/login',{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await response.json();assert.equal(response.status,200,JSON.stringify(data));
    const cookie=response.headers.get('set-cookie').split(';')[0];sessions.push(cookie);return cookie;
  }
  async function api(path,cookie,body,status=200,origin=root){
    const response=await fetch(root+path,{headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json',...(origin?{Origin:origin}:{})}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
    const raw=await response.text();let data;try{data=JSON.parse(raw)}catch{data={error:raw}}
    assert.equal(response.status,status,path+': '+raw);return data;
  }
  async function update(actor,active=true){return api('/api/thinkup',owner,{action:'user-save',id:actor.id,name:actor.name,role:actor.role,active})}
  async function page(path,cookie,status=200,location){const response=await fetch(root+path,{redirect:'manual',headers:cookie?{cookie}:{}});assert.equal(response.status,status,path);if(location)assert.equal(response.headers.get('location'),location);return response.text()}
  try{
    owner=await login('admin@thinkup.local',demoPassword);
    for(const role of ['student','lecturer','admin']){
      const email=`test-chat-${role}-${suffix}@example.edu`,name=`TEST Chat ${role} ${suffix}`;
      const created=await api('/api/thinkup',owner,{action:'user-create',name,email,password,role:role==='admin'?'student':role,courseIds:[]});
      const actor={id:created.id,name,role,email};actors.push(actor);if(role==='admin')await update(actor);
      actor.cookie=await login(email,password);
    }
    const [student,lecturer,admin]=actors;
    await api('/api/messages',null,undefined,401);
    await api('/api/messages',null,{action:'send'},401);
    await api('/api/messages',student.cookie,{action:'send'},403,null);
    await api('/api/messages',student.cookie,{action:'send'},403,'https://other.example');
    const contacts=await api('/api/messages',student.cookie);assert.equal(contacts.unreadTotal,0);
    assert.ok(contacts.contacts.some(p=>p.id===lecturer.id&&p.role==='lecturer'));assert.ok(contacts.contacts.some(p=>p.id===admin.id&&p.role==='admin'));
    for(const person of contacts.contacts)assert.deepEqual(Object.keys(person).sort(),['active','id','name','role']);
    const send={action:'send',peerId:lecturer.id,text:'TEST Xin chào <script>hello</script>\nSecond line',clientId:randomUUID(),senderId:admin.id,senderRole:'admin',senderName:'Spoofed sender'};
    const first=(await api('/api/messages',student.cookie,send)).message;
    assert.equal(first.senderId,student.id);assert.equal(first.senderName,student.name);assert.equal(first.senderRole,'student');
    assert.equal((await api('/api/messages',student.cookie,send)).message.id,first.id);
    await api('/api/messages',student.cookie,{...send,text:'changed'},409);
    await api('/api/messages',student.cookie,{...send,peerId:student.id,clientId:randomUUID()},400);
    await api('/api/messages',student.cookie,{...send,text:' ',clientId:randomUUID()},400);
    await api('/api/messages',student.cookie,{...send,text:'x'.repeat(4001),clientId:randomUUID()},400);
    await api('/api/messages',student.cookie,{...send,peerId:'missing-user',clientId:randomUUID()},403);
    assert.equal((await api('/api/messages?summary=1',lecturer.cookie)).unreadTotal,1);
    const conversation=await api(`/api/messages?peer=${student.id}`,lecturer.cookie);assert.equal(conversation.messages.length,1);
    assert.equal((await api(`/api/messages?peer=${student.id}`,admin.cookie)).messages.length,0);
    assert.ok(!(await api('/api/messages',admin.cookie)).conversations.some(c=>c.id===first.conversationId));
    await api('/api/messages',admin.cookie,{action:'read',conversationId:first.conversationId,through:first.id},404);
    await api('/api/messages',lecturer.cookie,{action:'read',conversationId:first.conversationId,through:first.id});
    assert.equal((await api('/api/messages?summary=1',lecturer.cookie)).unreadTotal,0);
    assert.equal((await api(`/api/messages?peer=${lecturer.id}`,student.cookie)).peerReadId,first.id);
    await api('/api/messages',lecturer.cookie,{action:'send',peerId:student.id,text:'TEST Lecturer reply',clientId:randomUUID()});
    await api('/api/messages',admin.cookie,{action:'send',peerId:student.id,text:'TEST Administrator message',clientId:randomUUID()});
    await api('/api/messages',lecturer.cookie,{action:'send',peerId:admin.id,text:'TEST Lecturer to administrator',clientId:randomUUID()});
    assert.equal((await api('/api/messages?summary=1',student.cookie)).unreadTotal,2);
    assert.equal((await api('/api/messages?summary=1',admin.cookie)).unreadTotal,1);
    for(const language of ['en','vi'])for(const actor of actors){
      const other=actor===student?lecturer:student;
      const html=(await page(`/${actor.role}/messages?peer=${other.id}`,`${actor.cookie}; thinkup-language=${language}`)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
      assert.ok(html.includes('<h1>'+(language==='en'?'Messages':'Tin nhắn')+'</h1>'));
      assert.ok(html.includes(other.name));assert.ok(html.includes('class="chat-role '+other.role+'"'));
      assert.ok(html.includes(`href="/${actor.role}/messages"`));
      if(actor!==admin){assert.ok(html.includes('&lt;script&gt;hello&lt;/script&gt;'));assert.ok(!html.includes('Spoofed sender'))}
      if(language==='en')assert.ok(html.includes('Compose a message')&&!html.includes('Soạn tin nhắn'));
      await page(`/${actor.role}/messages`,null,307,'/login');
      for(const different of actors.filter(p=>p.role!==actor.role))await page(`/${different.role}/messages`,actor.cookie,307,`/${actor.role}`);
    }
    await page('/student?view=messages',student.cookie,307,'/student/messages');
    await api(`/api/messages?peer=${lecturer.id}&before=nope`,student.cookie,undefined,400);
    await update(lecturer,false);
    const history=await api(`/api/messages?peer=${lecturer.id}`,student.cookie);assert.equal(history.peer.active,0);assert.equal(history.messages.length,2);
    await api('/api/messages',student.cookie,{...send,clientId:randomUUID()},403);
    await api('/api/messages',lecturer.cookie,undefined,403);
  }finally{
    if(owner)for(const actor of actors)await update(actor,false);
    for(const cookie of sessions)await fetch(root+'/api/auth/logout',{method:'POST',headers:{Origin:root,cookie}});
  }
});
