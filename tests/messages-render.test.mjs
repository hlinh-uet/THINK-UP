import test from 'node:test';
import assert from 'node:assert/strict';
import {componentModule} from './helpers/component-module.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const Messages=(await import(componentModule(new URL('../app/MessagesWorkspace.tsx',import.meta.url)))).default;
const user={id:'student',name:'TEST Student',role:'student',active:1},peer={id:'lecturer',name:'TEST Lecturer',role:'lecturer',active:1};
const messages=[
  {id:1,conversationId:'room',senderId:user.id,senderName:user.name,senderRole:user.role,body:'TEST before midnight',createdAt:'2026-10-02T16:59:00.000Z'},
  {id:2,conversationId:'room',senderId:peer.id,senderName:peer.name,senderRole:peer.role,body:'TEST after midnight',createdAt:'2026-10-02T17:01:00.000Z'},
];
const initialInbox={contacts:[peer],conversations:[{id:'room',peer,lastMessage:messages[1],unread:1}],unreadTotal:1};
const initialThread={peer,conversationId:'room',messages,hasOlder:false,hasMore:false,peerReadId:1};

test('messages in all three workspaces start with actions and chats without the repeated introduction',()=>{
  for(const role of ['student','lecturer','admin'])for(const language of ['en','vi']){
    const html=renderToStaticMarkup(createElement(Messages,{user:{...user,role},language,initialInbox,initialThread:null}));
    assert.ok(html.includes(`<h1 class="sr-only">${language==='en'?'Messages':'Tin nhắn'}</h1>`),'Page identity remains available to screen readers');
    assert.doesNotMatch(html,/class="page-heading"|Talk directly with students, lecturers and administrators|Trao đổi trực tiếp với sinh viên, giảng viên và quản trị viên/);
    assert.match(html,/class="workspace-page-actions"/);
    assert.ok(html.includes(language==='en'?'New message':'Tin nhắn mới'));
    assert.match(html,/class="chat-directory"/);
  }
});

test('messages render identical server/client text across timezones in both languages and all roles',()=>{
  const originalTimezone=process.env.TZ;
  try{
    for(const role of ['student','lecturer','admin'])for(const language of ['en','vi'])for(const thread of [null,initialThread]){
      const props={user:{...user,role},language,initialInbox,initialThread:thread};
      const renderAt=timezone=>{process.env.TZ=timezone;return renderToStaticMarkup(createElement(Messages,props))};
      const server=renderAt('UTC');
      for(const timezone of ['Asia/Ho_Chi_Minh','America/Los_Angeles','Pacific/Auckland'])assert.equal(renderAt(timezone),server,`${role}/${language}/${thread?'thread':'inbox'} in ${timezone}`);
      assert.ok(server.includes('class="chat-person-tail"><small>00:01</small>'));
      if(thread){
        assert.ok(server.includes('<time dateTime="2026-10-02T16:59:00.000Z">23:59</time>'));
        assert.ok(server.includes('<time dateTime="2026-10-02T17:01:00.000Z">00:01</time>'));
        assert.equal((server.match(/class="chat-day"/g)||[]).length,2);
      }
    }
  }finally{if(originalTimezone===undefined)delete process.env.TZ;else process.env.TZ=originalTimezone}
});
