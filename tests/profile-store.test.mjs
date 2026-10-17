import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {initializeDemoDatabase} from '../scripts/seed-demo.mjs';
import {profileStore,attachAvatars} from '../lib/profile-store.ts';
import {validateProfileFields} from '../lib/profile.ts';
import {messageStore} from '../lib/message-store.ts';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64'));
const fields=overrides=>validateProfileFields({name:'TEST Changed name',phone:'+84 123 456',bio:'TEST bio',revision:0,avatarMode:'keep',...overrides});
test('D1/R2 profiles preserve locked fields, avatar history, revisions and private details',async()=>{
  const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['FILES']});
  try{
    const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('FILES');await initializeDemoDatabase(db);
    await db.batch(['student','lecturer'].map(role=>db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').bind(role,role+'@test.local','TEST '+role,role,1,new Date().toISOString())));
    const store=profileStore(db,bucket),original=await store.load('student');assert.equal(original.revision,0);assert.equal(original.phone,'');assert.equal(original.user.avatarUrl,undefined);
    const chat=messageStore(db),message=await chat.send('student','lecturer','TEST before rename',randomUUID());
    const first=await store.save('student',fields({avatarMode:'replace'}),{type:'image/png',bytes:png});
    assert.equal(first.user.name,'TEST Changed name');assert.equal(first.user.email,original.user.email);assert.equal(first.user.role,'student');assert.equal(first.user.active,1);assert.equal(first.phone,'+84 123 456');assert.equal(first.bio,'TEST bio');assert.ok(first.user.avatarUrl.endsWith('?v=1'));
    const firstKey=(await store.stored('student')).avatar_key;assert.deepEqual(new Uint8Array(await (await bucket.get(firstKey)).arrayBuffer()),png);
    const directory=await chat.inbox('lecturer');assert.ok(directory.contacts.find(p=>p.id==='student').avatarUrl);assert.ok(!JSON.stringify(directory).includes('TEST bio')&&!JSON.stringify(directory).includes('+84 123 456')&&!JSON.stringify(directory).includes(firstKey));
    const thread=await chat.thread('lecturer','student');assert.equal(thread.messages[0].senderName,'TEST student');assert.equal(thread.peer.name,'TEST Changed name');assert.ok(thread.peer.avatarUrl);
    await assert.rejects(store.save('student',fields({name:'stale'})),error=>error.status===409);
    const results=await Promise.allSettled([store.save('student',fields({revision:1,name:'TEST A',avatarMode:'replace'}),{type:'image/png',bytes:png}),store.save('student',fields({revision:1,name:'TEST B',avatarMode:'replace'}),{type:'image/png',bytes:png})]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.status,409);
    assert.equal((await bucket.list()).objects.length,1);assert.equal(await bucket.head(firstKey),null);
    const avatar=(await store.stored('student')).avatar_key;
    await assert.rejects(profileStore(db).save('student',fields({revision:2,avatarMode:'replace'}),{type:'image/png',bytes:png}),error=>error.status===503);
    assert.equal((await store.load('student')).revision,2);
    const before=(await db.prepare('SELECT * FROM user_profiles').all()).results;await initializeDemoDatabase(db);assert.deepEqual((await db.prepare('SELECT * FROM user_profiles').all()).results,before);assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
    const removed=await store.save('student',fields({revision:2,avatarMode:'remove'}));assert.equal(removed.user.avatarUrl,undefined);assert.equal(await bucket.head(avatar),null);
    assert.equal((await chat.thread('lecturer','student')).messages[0].id,message.id);
    const account=(await store.load('student')).user;const bulk=Array.from({length:200},(_,i)=>i===199?account:{id:'missing-'+i,name:'Missing'});assert.equal((await attachAvatars(db,bulk)).length,200);
    await db.prepare('UPDATE users SET active=0 WHERE id=?').bind('student').run();await assert.rejects(store.save('student',fields({revision:3})),error=>error.status===409);
    assert.equal((await store.load('student')).revision,3);
    const plan=(await db.prepare('EXPLAIN QUERY PLAN SELECT * FROM user_profiles WHERE user_id=?').bind('student').all()).results;assert.ok(plan.some(r=>r.detail.includes('sqlite_autoindex_user_profiles')));
  }finally{await mf.dispose()}
});
