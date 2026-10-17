import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {messageText,personId,conversationPair,messageCursor,sendId,chatPerson,messagesHref,mergeMessages,MessageError} from '../lib/messaging.ts';
import {canView,studentPages,viewPath} from '../lib/access.ts';

test('messages validate text, recipients, history cursors and retry IDs',()=>{
  assert.equal(messageText('  Xin chào\nHello  '),'Xin chào\nHello');
  for(const value of [null,{},42,' ','x'.repeat(4001)])assert.throws(()=>messageText(value),MessageError);
  for(const value of [null,'',' '.repeat(5),'x'.repeat(101)])assert.throws(()=>personId(value),MessageError);
  assert.equal(personId(' peer '),'peer');
  assert.deepEqual(conversationPair('z','a'),conversationPair('a','z'));assert.throws(()=>conversationPair('a','a'),MessageError);
  assert.equal(messageCursor('003'),3);assert.equal(messageCursor(0),0);
  for(const value of ['-1','1.2','1e3','',null,Number.MAX_SAFE_INTEGER+1,{},NaN])assert.throws(()=>messageCursor(value),MessageError);
  const id=randomUUID();assert.equal(sendId(id.toUpperCase()),id);assert.throws(()=>sendId('client-chosen-short-ID'),MessageError);
});
test('all roles can reach their own messages page and contact payloads exclude private account fields',()=>{
  for(const role of ['student','lecturer','admin']){
    assert.ok(canView(role,'messages'));assert.equal(viewPath(role,'messages'),`/${role}/messages`);
    assert.equal(messagesHref(role,'peer /&'),`/${role}/messages?peer=peer%20%2F%26`);
  }
  assert.ok(studentPages.some(p=>p.key==='messages'));
  assert.deepEqual(chatPerson({id:'a',name:'Name',role:'student',active:1,email:'private',password_hash:'secret'}),{id:'a',name:'Name',role:'student',active:1});
  assert.throws(()=>chatPerson({id:'a',name:'Name',role:'unknown',active:1}),MessageError);
});
test('refresh and older history merge into chronological messages without duplicate retry entries',()=>{
  const one={id:1,body:'old'},two={id:2,body:'two'},three={id:3,body:'three'};
  const previous=[two,three];assert.deepEqual(mergeMessages(previous,[three,one]),[one,two,three]);assert.deepEqual(previous,[two,three]);
});
