import test from 'node:test';
import assert from 'node:assert/strict';
import {canView,homePath,homeView,resolveView,viewPath} from '../lib/access.ts';
import {validPassword,hashPassword,verifyPassword,newSessionToken,sessionDigest,readCookie,sessionCookieHeader} from '../lib/security.ts';

test('each role has its own home and prevents unauthorized query navigation',()=>{
  assert.equal(homePath('admin'),'/admin');assert.equal(homeView('admin'),'admin');
  assert.equal(homePath('lecturer'),'/lecturer');assert.equal(homeView('lecturer'),'lecturer');
  assert.equal(homePath('student'),'/student');assert.equal(homeView('student'),'overview');
  for(const view of ['admin','lecturer'])assert.equal(canView('student',view),false);
  for(const view of ['admin','editor','overview','actions','progress'])assert.equal(canView('lecturer',view),false);
  assert.equal(canView('admin','editor'),false);assert.equal(canView('admin','lecturer'),true);
  assert.equal(resolveView('student','admin'),'overview');assert.equal(resolveView('lecturer','admin'),'lecturer');assert.equal(resolveView('admin','editor'),'admin');
  assert.equal(viewPath('student','editor'),'/student?view=editor');assert.equal(canView('unknown','admin'),false);
});
test('password hashing preserves full password values and rejects bcrypt truncation',async()=>{
  assert.equal(validPassword('short'),false);assert.equal(validPassword('é'.repeat(37)),false);assert.equal(validPassword('x'.repeat(73)),false);assert.equal(validPassword('  twelve characters  '),true);
  const password='A long passphrase 123 ';
  const first=await hashPassword(password),second=await hashPassword(password);
  assert.notEqual(first,second);assert.notEqual(first,password);
  assert.equal(await verifyPassword(password,first),true);assert.equal(await verifyPassword(password.trim(),first),false);
});
test('session credentials are random, stored as digests, and use protected cookies',async()=>{
  const token=newSessionToken();assert.match(token,/^[a-f0-9]{64}$/);assert.notEqual(token,newSessionToken());assert.notEqual(await sessionDigest(token),token);
  const req=new Request('https://thinkup.example',{headers:{cookie:`other=abc; thinkup-session=${token}`}});
  assert.equal(readCookie(req,'thinkup-session'),token);assert.equal(readCookie(req,'missing'),null);
  const cookie=sessionCookieHeader(token,req);for(const part of ['HttpOnly','SameSite=Lax','Secure','Path=/'])assert.ok(cookie.includes(part));
  assert.ok(sessionCookieHeader('',req,0).includes('Max-Age=0'));
});
