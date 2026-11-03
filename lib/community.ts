import type { Role } from './access.ts';

export const reactionKinds=['like','love','haha'] as const;
export type ReactionKind=typeof reactionKinds[number];
export const postLimit=5000,commentLimit=1500,imageLimit=5*1024*1024;
export const imageTypes=['image/png','image/jpeg','image/webp'];
export type CommunitySort='new'|'top';

export class CommunityError extends Error{
  status:number;
  constructor(message:string,status=400){super(message);this.status=status}
}

export type CommunityAuthor={id:string;name:string;role:Role;avatarUrl?:string};
export type CommunityComment={id:string;postId:string;parentId:string|null;author:CommunityAuthor;body:string;createdAt:string;likes:number;liked:boolean;canDelete:boolean};
export type CommunityPost={
  id:string;author:CommunityAuthor;body:string;imageUrl:string|null;commentsOff:boolean;edited:boolean;createdAt:string;updatedAt:string;
  reactions:Record<ReactionKind,number>;reactionTotal:number;myReaction:ReactionKind|null;comments:CommunityComment[];commentCount:number;mine:boolean;canRemove:boolean;
};
export type CommunityFeed={posts:CommunityPost[]};

export const isModerator=(role:string)=>role==='lecturer'||role==='admin';
export const communityHref=(role:Role,postId?:string)=>`/${role}/community`+(postId?`?post=${encodeURIComponent(postId)}`:'');
export const communityImageHref=(postId:string,updatedAt:string)=>`/api/community/images/${encodeURIComponent(postId)}?v=${encodeURIComponent(updatedAt)}`;

export function communityId(value:unknown){
  if(typeof value!=='string'||!/^[\w-]{1,80}$/.test(value))throw new CommunityError('Không tìm thấy bài viết.',404);
  return value;
}
export function postText(value:unknown){
  const text=typeof value==='string'?value.replace(/\r\n/g,'\n').trim():'';
  if(text.length>postLimit)throw new CommunityError('Bài viết cần ngắn hơn 5.000 ký tự.');
  return text;
}
export function commentText(value:unknown){
  const text=typeof value==='string'?value.replace(/\r\n/g,'\n').trim():'';
  if(!text)throw new CommunityError('Hãy viết nội dung bình luận.');
  if(text.length>commentLimit)throw new CommunityError('Bình luận cần ngắn hơn 1.500 ký tự.');
  return text;
}
export function reactionKind(value:unknown):ReactionKind|null{
  if(value===null||value===undefined||value==='')return null;
  if(!reactionKinds.includes(value as ReactionKind))throw new CommunityError('Cảm xúc chưa hợp lệ.');
  return value as ReactionKind;
}
/** Checks the declared type against the file's own signature, as for profile pictures. */
export function validateImage(type:string,bytes:Uint8Array){
  if(!bytes.length||bytes.length>imageLimit)throw new CommunityError('Ảnh cần nhỏ hơn hoặc bằng 5 MB.');
  const head=new TextDecoder('latin1').decode(bytes.subarray(0,12));
  const valid=type==='image/png'?bytes[0]===137&&head.slice(1,8)==='PNG\r\n\x1a\n':type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/webp'?head.startsWith('RIFF')&&head.slice(8,12)==='WEBP':false;
  if(!valid)throw new CommunityError('Chọn ảnh PNG, JPG hoặc WebP có nội dung đúng định dạng.');
}
