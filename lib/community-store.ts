import { CommunityError,commentText,communityId,communityImageHref,isModerator,postText,reactionKind,reactionKinds,validateImage,type CommunityComment,type CommunityFeed,type CommunityPost,type CommunitySort,type ReactionKind } from './community.ts';
import { attachAvatars } from './profile-store.ts';
import type { Role } from './access.ts';

type Row=Record<string,unknown>;
type Viewer={id:string;role:string};
type Image={type:string;bytes:Uint8Array};
const roleOf=(value:unknown):Role=>value==='lecturer'||value==='admin'?value:'student';

export function communityStore(db:D1Database,files?:R2Bucket) {
  const prepare=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args);
  const all=async(sql:string,...args:unknown[])=>(await prepare(sql,...args).all<Row>()).results;
  const one=(sql:string,...args:unknown[])=>prepare(sql,...args).first<Row>();

  async function feed(viewer:Viewer,{sort='new',mine=false,limit=50}:{sort?:CommunitySort;mine?:boolean;limit?:number}={}):Promise<CommunityFeed> {
    const order=sort==='top'?'reaction_total DESC,p.created_at DESC':'p.created_at DESC';
    const rows=await all(`SELECT p.*,u.name AS author_name,u.role AS author_role,
      (SELECT COUNT(*) FROM community_reactions r WHERE r.post_id=p.id) AS reaction_total
      FROM community_posts p JOIN users u ON u.id=p.author_id
      ${mine?'WHERE p.author_id=?':''} ORDER BY ${order} LIMIT ?`,...(mine?[viewer.id]:[]),limit);
    return {posts:await expand(viewer,rows)};
  }
  async function post(viewer:Viewer,postId:unknown):Promise<CommunityPost> {
    const row=await one(`SELECT p.*,u.name AS author_name,u.role AS author_role FROM community_posts p JOIN users u ON u.id=p.author_id WHERE p.id=?`,communityId(postId));
    if(!row)throw new CommunityError('Không tìm thấy bài viết.',404);
    return (await expand(viewer,[row]))[0];
  }
  async function expand(viewer:Viewer,rows:Row[]):Promise<CommunityPost[]> {
    if(!rows.length)return [];
    const ids=rows.map(r=>String(r.id)),marks=ids.map(()=>'?').join(',');
    const [reactions,comments]=await Promise.all([
      all(`SELECT post_id,user_id,kind FROM community_reactions WHERE post_id IN (${marks})`,...ids),
      all(`SELECT c.*,u.name AS author_name,u.role AS author_role,
        (SELECT COUNT(*) FROM community_comment_reactions l WHERE l.comment_id=c.id) AS likes,
        EXISTS(SELECT 1 FROM community_comment_reactions l WHERE l.comment_id=c.id AND l.user_id=?) AS liked
        FROM community_comments c JOIN users u ON u.id=c.author_id WHERE c.post_id IN (${marks}) ORDER BY c.created_at,c.id`,viewer.id,...ids),
    ]);
    const people=[...rows.map(r=>({id:String(r.author_id),name:String(r.author_name),role:roleOf(r.author_role)})),...comments.map(c=>({id:String(c.author_id),name:String(c.author_name),role:roleOf(c.author_role)}))];
    const authors=new Map((await attachAvatars(db,[...new Map(people.map(p=>[p.id,p])).values()])).map(p=>[p.id,p]));
    const moderator=isModerator(viewer.role);
    return rows.map(row=>{
      const id=String(row.id),mine=row.author_id===viewer.id;
      const counts=Object.fromEntries(reactionKinds.map(kind=>[kind,0])) as Record<ReactionKind,number>;
      let myReaction:ReactionKind|null=null;
      for(const r of reactions.filter(r=>r.post_id===id)){counts[r.kind as ReactionKind]+=1;if(r.user_id===viewer.id)myReaction=r.kind as ReactionKind}
      const list:CommunityComment[]=comments.filter(c=>c.post_id===id).map(c=>({id:String(c.id),postId:id,parentId:c.parent_id?String(c.parent_id):null,author:authors.get(String(c.author_id))!,body:String(c.body),createdAt:String(c.created_at),likes:Number(c.likes),liked:Boolean(c.liked),canDelete:c.author_id===viewer.id||mine||moderator}));
      return {id,author:authors.get(String(row.author_id))!,body:String(row.body),imageUrl:row.image_key?communityImageHref(id,String(row.updated_at)):null,
        commentsOff:Boolean(row.comments_off),edited:Boolean(row.edited),createdAt:String(row.created_at),updatedAt:String(row.updated_at),
        reactions:counts,reactionTotal:Object.values(counts).reduce((a,b)=>a+b,0),myReaction,comments:list,commentCount:list.length,mine,canRemove:mine||moderator};
    });
  }
  async function owned(viewer:Viewer,postId:unknown,{moderate=false}={}) {
    const row=await one('SELECT * FROM community_posts WHERE id=?',communityId(postId));
    if(!row)throw new CommunityError('Không tìm thấy bài viết.',404);
    if(row.author_id!==viewer.id&&!(moderate&&isModerator(viewer.role)))throw new CommunityError('Bạn chỉ có thể thay đổi bài viết của mình.',403);
    return row;
  }
  async function throttle(userId:string) {
    const minute=Math.floor(Date.now()/60000)*60000;
    const rate=await one(`INSERT INTO auth_limits (key,window_start,attempts) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET
      attempts=CASE WHEN window_start=excluded.window_start THEN attempts+1 ELSE 1 END,window_start=excluded.window_start RETURNING attempts`,`community:${userId}`,minute);
    if(Number(rate?.attempts)>30)throw new CommunityError('Bạn thao tác quá nhanh. Vui lòng chờ một phút.',429);
  }
  async function storeImage(postId:string,image:Image) {
    if(!files)throw new CommunityError('Nơi lưu ảnh chưa sẵn sàng.',503);
    validateImage(image.type,image.bytes);
    const key=`community/${postId}/${crypto.randomUUID()}`;
    await files.put(key,image.bytes,{httpMetadata:{contentType:image.type}});
    return key;
  }
  async function create(viewer:Viewer,text:unknown,image?:Image) {
    const body=postText(text);
    if(!body&&!image)throw new CommunityError('Hãy viết nội dung hoặc thêm một ảnh.');
    await throttle(viewer.id);
    const id=crypto.randomUUID(),stamp=new Date().toISOString(),key=image?await storeImage(id,image):null;
    await prepare('INSERT INTO community_posts (id,author_id,body,image_key,image_type,comments_off,edited,created_at,updated_at) VALUES (?,?,?,?,?,0,0,?,?)',id,viewer.id,body,key,image?.type??null,stamp,stamp).run();
    return post(viewer,id);
  }
  async function update(viewer:Viewer,postId:unknown,text:unknown,{image,removeImage=false}:{image?:Image;removeImage?:boolean}={}) {
    const row=await owned(viewer,postId),id=String(row.id),body=postText(text);
    const keepImage=!removeImage&&!image&&row.image_key;
    if(!body&&!image&&!keepImage)throw new CommunityError('Hãy viết nội dung hoặc thêm một ảnh.');
    const key=image?await storeImage(id,image):keepImage?String(row.image_key):null;
    await prepare('UPDATE community_posts SET body=?,image_key=?,image_type=?,edited=1,updated_at=? WHERE id=?',body,key,key?(image?.type??row.image_type):null,new Date().toISOString(),id).run();
    if(row.image_key&&row.image_key!==key)await files?.delete(String(row.image_key));
    return post(viewer,id);
  }
  async function setComments(viewer:Viewer,postId:unknown,off:unknown) {
    const row=await owned(viewer,postId);
    await prepare('UPDATE community_posts SET comments_off=? WHERE id=?',off?1:0,row.id).run();
    return post(viewer,row.id);
  }
  async function remove(viewer:Viewer,postId:unknown) {
    const row=await owned(viewer,postId,{moderate:true}),id=String(row.id);
    await db.batch([
      prepare('DELETE FROM community_comment_reactions WHERE comment_id IN (SELECT id FROM community_comments WHERE post_id=?)',id),
      prepare('DELETE FROM community_comments WHERE post_id=?',id),
      prepare('DELETE FROM community_reactions WHERE post_id=?',id),
      prepare('DELETE FROM community_posts WHERE id=?',id),
      ...(row.author_id!==viewer.id?[prepare('INSERT INTO audit (id,user_id,action,target_id,detail,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),viewer.id,'community-remove',id,String(row.author_id),new Date().toISOString())]:[]),
    ]);
    if(row.image_key)await files?.delete(String(row.image_key));
    return {removed:id};
  }
  async function react(viewer:Viewer,postId:unknown,value:unknown) {
    const id=communityId(postId),kind=reactionKind(value);
    if(!await one('SELECT id FROM community_posts WHERE id=?',id))throw new CommunityError('Không tìm thấy bài viết.',404);
    if(kind)await prepare(`INSERT INTO community_reactions (post_id,user_id,kind,created_at) VALUES (?,?,?,?) ON CONFLICT(post_id,user_id) DO UPDATE SET kind=excluded.kind`,id,viewer.id,kind,new Date().toISOString()).run();
    else await prepare('DELETE FROM community_reactions WHERE post_id=? AND user_id=?',id,viewer.id).run();
    return post(viewer,id);
  }
  async function comment(viewer:Viewer,postId:unknown,text:unknown,parent?:unknown) {
    const id=communityId(postId),body=commentText(text);
    const row=await one('SELECT comments_off FROM community_posts WHERE id=?',id);
    if(!row)throw new CommunityError('Không tìm thấy bài viết.',404);
    if(row.comments_off)throw new CommunityError('Bài viết này đã tắt bình luận.',403);
    let parentId:string|null=null;
    if(parent){
      // Replies stay one level deep: answering a reply attaches to its parent.
      const target=await one('SELECT id,parent_id FROM community_comments WHERE id=? AND post_id=?',communityId(parent),id);
      if(!target)throw new CommunityError('Không tìm thấy bình luận.',404);
      parentId=String(target.parent_id||target.id);
    }
    await throttle(viewer.id);
    await prepare('INSERT INTO community_comments (id,post_id,author_id,parent_id,body,created_at) VALUES (?,?,?,?,?,?)',crypto.randomUUID(),id,viewer.id,parentId,body,new Date().toISOString()).run();
    return post(viewer,id);
  }
  async function removeComment(viewer:Viewer,commentId:unknown) {
    const row=await one('SELECT c.id,c.post_id,c.author_id,p.author_id AS post_author FROM community_comments c JOIN community_posts p ON p.id=c.post_id WHERE c.id=?',communityId(commentId));
    if(!row)throw new CommunityError('Không tìm thấy bình luận.',404);
    if(row.author_id!==viewer.id&&row.post_author!==viewer.id&&!isModerator(viewer.role))throw new CommunityError('Bạn không thể xoá bình luận này.',403);
    await db.batch([
      prepare('DELETE FROM community_comment_reactions WHERE comment_id IN (SELECT id FROM community_comments WHERE id=? OR parent_id=?)',row.id,row.id),
      prepare('DELETE FROM community_comments WHERE id=? OR parent_id=?',row.id,row.id),
    ]);
    return post(viewer,row.post_id);
  }
  async function likeComment(viewer:Viewer,commentId:unknown) {
    const row=await one('SELECT id,post_id FROM community_comments WHERE id=?',communityId(commentId));
    if(!row)throw new CommunityError('Không tìm thấy bình luận.',404);
    const existing=await one('SELECT 1 AS hit FROM community_comment_reactions WHERE comment_id=? AND user_id=?',row.id,viewer.id);
    if(existing)await prepare('DELETE FROM community_comment_reactions WHERE comment_id=? AND user_id=?',row.id,viewer.id).run();
    else await prepare('INSERT INTO community_comment_reactions (comment_id,user_id,created_at) VALUES (?,?,?)',row.id,viewer.id,new Date().toISOString()).run();
    return post(viewer,row.post_id);
  }
  async function image(postId:unknown) {
    const row=await one('SELECT image_key,image_type FROM community_posts WHERE id=? AND image_key IS NOT NULL',communityId(postId));
    if(!row||!files)throw new CommunityError('Không tìm thấy ảnh.',404);
    const object=await files.get(String(row.image_key));
    if(!object)throw new CommunityError('Không tìm thấy ảnh.',404);
    return {body:object.body,type:String(row.image_type)};
  }
  return {feed,post,create,update,setComments,remove,react,comment,removeComment,likeComment,image};
}
