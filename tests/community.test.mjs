import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunityError,commentText,communityHref,communityId,isModerator,postText,reactionKind,validateImage } from '../lib/community.ts';
import { canView,studentPages,viewPath } from '../lib/access.ts';
import { lecturerPages } from '../lib/lecturer-pages.ts';
import { adminHref,adminPages } from '../lib/admin-pages.ts';

const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13]);

test('community is reachable from every role, beside messages',()=>{
  for(const role of ['student','lecturer','admin'])assert.ok(canView(role,'community'));
  assert.equal(viewPath('student','community'),'/student/community');
  assert.ok(studentPages.some(p=>p.key==='community'));
  assert.ok(lecturerPages.some(p=>p.key==='community'));
  assert.ok(adminPages.some(p=>p.key==='community'));
  assert.equal(adminHref('community'),'/admin/community');
  assert.equal(communityHref('lecturer','post-1'),'/lecturer/community?post=post-1');
});

test('posts and comments are trimmed and bounded',()=>{
  assert.equal(postText('  Xin chào \r\n '),'Xin chào');
  assert.equal(postText(undefined),'');
  assert.throws(()=>postText('a'.repeat(5001)),CommunityError);
  assert.equal(commentText(' Hay quá '),'Hay quá');
  assert.throws(()=>commentText('   '),/Hãy viết nội dung bình luận/);
  assert.throws(()=>commentText('a'.repeat(1501)),CommunityError);
});

test('one reaction per person from the three offered kinds',()=>{
  assert.equal(reactionKind('love'),'love');
  assert.equal(reactionKind(null),null);
  assert.equal(reactionKind(''),null);
  assert.throws(()=>reactionKind('angry'),/Cảm xúc chưa hợp lệ/);
});

test('identifiers and pictures are checked before use',()=>{
  assert.equal(communityId('post-abc_1'),'post-abc_1');
  assert.throws(()=>communityId('../etc'),e=>e instanceof CommunityError&&e.status===404);
  assert.doesNotThrow(()=>validateImage('image/png',png));
  assert.throws(()=>validateImage('image/jpeg',png),/PNG, JPG hoặc WebP/);
  assert.throws(()=>validateImage('image/gif',png),CommunityError);
  assert.throws(()=>validateImage('image/png',new Uint8Array(5*1024*1024+1)),/5 MB/);
});

test('lecturers and administrators moderate; students do not',()=>{
  assert.equal(isModerator('lecturer'),true);
  assert.equal(isModerator('admin'),true);
  assert.equal(isModerator('student'),false);
});
