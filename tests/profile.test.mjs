import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {validateProfileFields,validateAvatar,avatarHref,profileHref,avatarLimit,ProfileError} from '../lib/profile.ts';
const fields={name:' TEST Name ',phone:'+84 (123) 456-789',bio:' Short bio ',revision:'0',avatarMode:'keep'};
export const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=','base64'));
test('self-service fields are explicit; identity, access and assignments always require admin',()=>{
  assert.deepEqual(validateProfileFields(fields),{...fields,name:'TEST Name',bio:'Short bio',revision:0});
  for(const key of ['email','role','active','id','userId','courseIds','memberships','avatarKey','avatarUrl','createdAt'])assert.throws(()=>validateProfileFields({...fields,[key]:'spoofed'}),error=>error instanceof ProfileError&&error.status===403);
  for(const body of [{...fields,name:''},{...fields,name:'x'.repeat(121)},{...fields,name:'line\nbreak'},{...fields,phone:'+'},{...fields,phone:'not a phone'},{...fields,bio:'x'.repeat(801)},{...fields,revision:'-1'},{...fields,revision:Number.MAX_SAFE_INTEGER+1},{...fields,avatarMode:'other'},{...fields,unknown:'extra'}])assert.throws(()=>validateProfileFields(body),ProfileError);
});
test('avatars allow bounded raster files and reject HTML/SVG, spoofed MIME and empty content',()=>{
  validateAvatar('image/png',png);validateAvatar('image/jpeg',new Uint8Array([255,216,255,224]));validateAvatar('image/webp',new TextEncoder().encode('RIFF0000WEBP'));
  for(const [type,bytes] of [['image/svg+xml',new TextEncoder().encode('<svg/>')],['image/png',new TextEncoder().encode('<script>fake</script>')],['image/jpeg',png],['image/png',new Uint8Array()],['image/png',new Uint8Array(avatarLimit+1)]])assert.throws(()=>validateAvatar(type,bytes),ProfileError);
});
test('profiles have role-specific pages and avatar URLs do not expose storage object keys',()=>{
  for(const role of ['student','lecturer','admin'])assert.equal(profileHref(role),`/${role}/profile`);
  assert.equal(avatarHref('student / &',2),'/api/avatars/student%20%2F%20%26?v=2');
});

const Profile=(await import(componentModule(new URL('../app/ProfileWorkspace.tsx',import.meta.url)))).default;
test('all roles have an editable personal form and a separate read-only account section in VN/EN',()=>{
  for(const role of ['student','lecturer','admin'])for(const language of ['en','vi']){
    const initialProfile={user:{id:'test',name:'TEST Profile',email:'test@example.edu',role,active:1,avatarUrl:'/api/avatars/test?v=1'},phone:'',bio:'TEST <script>bio</script>',revision:1,createdAt:'2026-10-02T17:01:00.000Z',courses:[{id:'course',code:'TEST Course',name:'Test course',role:'student'}]};
    const html=renderToStaticMarkup(createElement(Profile,{initialProfile,language}));
    assert.ok(html.includes(`href="/${role}/profile"`));assert.ok(html.includes('aria-label="'+(language==='en'?'Open my profile':'Mở hồ sơ cá nhân')+'"'));
    assert.ok(/<input[^>]*readOnly[^>]*value="test@example.edu"/.test(html));assert.ok(!html.includes('<select'));
    assert.ok(html.includes('type="file"')&&html.includes('accept="image/png,image/jpeg,image/webp"'));
    assert.ok(html.includes('TEST &lt;script&gt;bio&lt;/script&gt;'));
    assert.ok(html.includes('Admin quản lý')||html.includes('Managed by admin'));
    assert.ok(html.includes('href="'+(role==='admin'?'/admin/users':`/${role}/messages`)+'"'));
    if(language==='en')assert.ok(html.includes('Save profile')&&!html.includes('Lưu hồ sơ'));
  }
});
