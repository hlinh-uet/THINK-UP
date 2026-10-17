import {avatarHref,ProfileError,validateAvatar,type OwnProfile,type ProfileFields} from './profile.ts';
import type {User} from './domain.ts';

type StoredProfile={phone:string;bio:string;avatar_key:string|null;avatar_type:string|null;revision:number};
export async function attachAvatars<T extends {id:string;avatarUrl?:string}>(db:D1Database,users:T[]) {
  if(!users.length)return users;
  const queries=[];
  for(let start=0;start<users.length;start+=95){
    const group=users.slice(start,start+95);
    queries.push(db.prepare(`SELECT user_id,revision FROM user_profiles WHERE avatar_key IS NOT NULL AND user_id IN (${group.map(()=>'?').join(',')})`).bind(...group.map(u=>u.id)));
  }
  const rows=(await db.batch<{user_id:string;revision:number}>(queries)).flatMap(result=>result.results);
  const revisions=new Map(rows.map(r=>[r.user_id,r.revision]));
  return users.map(u=>revisions.has(u.id)?{...u,avatarUrl:avatarHref(u.id,revisions.get(u.id)!)}:u);
}
export function profileStore(db:D1Database,bucket?:R2Bucket) {
  const prepare=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
  const stored=(userId:string)=>prepare('SELECT phone,bio,avatar_key,avatar_type,revision FROM user_profiles WHERE user_id=?',userId).first<StoredProfile>();
  async function load(userId:string):Promise<OwnProfile> {
    const [user,profile,assignments]=await Promise.all([
      prepare('SELECT id,email,name,role,active,created_at FROM users WHERE id=?',userId).first<User&{created_at:string}>(),stored(userId),
      prepare('SELECT c.id,c.code,c.name,m.role FROM memberships m JOIN courses c ON c.id=m.course_id WHERE m.user_id=? ORDER BY c.code,c.id',userId).all<OwnProfile['courses'][number]>(),
    ]);
    if(!user)throw new ProfileError('Không tìm thấy hồ sơ của bạn.',404);
    const {created_at,...person}=user;
    return {user:profile?.avatar_key?{...person,avatarUrl:avatarHref(userId,profile.revision)}:person,createdAt:created_at,phone:profile?.phone||'',bio:profile?.bio||'',revision:profile?.revision||0,courses:assignments.results};
  }
  async function save(userId:string,fields:ProfileFields,avatar?:{type:string;bytes:Uint8Array}) {
    const current=await stored(userId);
    if((current?.revision||0)!==fields.revision)throw new ProfileError('Hồ sơ đã thay đổi ở nơi khác. Tải lại thông tin trước khi lưu.',409);
    if(fields.avatarMode==='replace'&&!avatar||fields.avatarMode!=='replace'&&avatar)throw new ProfileError('Thao tác ảnh đại diện chưa hợp lệ.');
    const timestamp=new Date().toISOString(),oldKey=current?.avatar_key||null;
    let avatarKey=fields.avatarMode==='remove'?null:oldKey,avatarType=fields.avatarMode==='remove'?null:current?.avatar_type||null,uploaded:string|null=null;
    if(avatar){
      validateAvatar(avatar.type,avatar.bytes);
      if(!bucket)throw new ProfileError('Nơi lưu ảnh đại diện chưa sẵn sàng.',503);
      avatarKey=`avatars/${userId}/${crypto.randomUUID()}`;avatarType=avatar.type;
      await bucket.put(avatarKey,avatar.bytes,{httpMetadata:{contentType:avatarType}});uploaded=avatarKey;
    }
    try{
      const results=await db.batch([
        prepare('INSERT OR IGNORE INTO user_profiles (user_id,updated_at) VALUES (?,?)',userId,timestamp),
        prepare(`UPDATE users SET name=? WHERE id=? AND active=1 AND EXISTS (SELECT 1 FROM user_profiles WHERE user_id=? AND revision=?)`,fields.name,userId,userId,fields.revision),
        prepare(`UPDATE user_profiles SET phone=?,bio=?,avatar_key=?,avatar_type=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? AND EXISTS (SELECT 1 FROM users WHERE id=? AND active=1)`,fields.phone,fields.bio,avatarKey,avatarType,timestamp,userId,fields.revision,userId),
      ]);
      if(!results[2].meta.changes)throw new ProfileError('Hồ sơ đã thay đổi hoặc tài khoản bị ngừng. Tải lại thông tin trước khi lưu.',409);
    }catch(error){if(uploaded&&bucket)await bucket.delete(uploaded);throw error}
    // Metadata is committed before removing the old image. Failed cleanup must
    // not turn a successful save into a retry that overwrites newer changes.
    if(oldKey&&oldKey!==avatarKey&&bucket)try{await bucket.delete(oldKey)}catch{/* A stale unreferenced object cannot be retrieved through the avatar API. */}
    return load(userId);
  }
  return {load,save,stored};
}
