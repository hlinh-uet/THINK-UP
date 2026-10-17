import type { Role } from './access.ts';
import type { User } from './domain.ts';

export type OwnProfile={user:User;phone:string;bio:string;revision:number;createdAt:string;courses:{id:string;code:string;name:string;role:string}[]};
export type ProfileFields={name:string;phone:string;bio:string;revision:number;avatarMode:'keep'|'replace'|'remove'};
export class ProfileError extends Error {
  status:number;
  constructor(message:string,status=400){super(message);this.status=status}
}
export const avatarLimit=2*1024*1024;
export const profileHref=(role:Role)=>`/${role}/profile`;
export const avatarHref=(id:string,revision:number|string)=>`/api/avatars/${encodeURIComponent(id)}?v=${encodeURIComponent(revision)}`;
const editable=new Set(['name','phone','bio','revision','avatarMode','avatar']);
const protectedFields=new Set(['id','userId','email','role','active','courseIds','memberships','createdAt','avatarKey','avatarUrl']);
export function validateProfileFields(body:Record<string,unknown>):ProfileFields {
  for(const key of Object.keys(body))if(!editable.has(key))throw new ProfileError(protectedFields.has(key)?'Email, vai trò, trạng thái và học phần chỉ do admin thay đổi.':'Thông tin hồ sơ chưa hợp lệ.',protectedFields.has(key)?403:400);
  const field=(value:unknown,max:number,required=false)=>{
    if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw new ProfileError('Thông tin hồ sơ chưa hợp lệ.');
    return value.trim();
  };
  const name=field(body.name,120,true),phone=field(body.phone,30),bio=field(body.bio,800);
  if(Array.from(name).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)||phone&&(!/^[+\d\s().-]+$/.test(phone)||!/[0-9]/.test(phone)))throw new ProfileError('Tên hoặc số điện thoại chưa hợp lệ.');
  const revision=typeof body.revision==='string'&&/^\d+$/.test(body.revision)?Number(body.revision):body.revision;
  if(!Number.isSafeInteger(revision)||Number(revision)<0)throw new ProfileError('Phiên bản hồ sơ chưa hợp lệ.');
  if(!['keep','replace','remove'].includes(String(body.avatarMode)))throw new ProfileError('Thao tác ảnh đại diện chưa hợp lệ.');
  return {name,phone,bio,revision:Number(revision),avatarMode:body.avatarMode as ProfileFields['avatarMode']};
}
export function validateAvatar(type:string,bytes:Uint8Array) {
  if(!bytes.length||bytes.length>avatarLimit)throw new ProfileError('Ảnh đại diện cần nhỏ hơn hoặc bằng 2 MB.');
  const head=new TextDecoder('latin1').decode(bytes.subarray(0,12));
  const valid=type==='image/png'?bytes[0]===137&&head.slice(1,8)==='PNG\r\n\x1a\n':type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/webp'?head.startsWith('RIFF')&&head.slice(8,12)==='WEBP':false;
  if(!valid)throw new ProfileError('Chọn ảnh PNG, JPG hoặc WebP có nội dung đúng định dạng.');
}
