import { database,runtime,session,AppError,failure } from '../../../lib/server';
import { communityStore } from '../../../lib/community-store';
import { CommunityError,imageLimit } from '../../../lib/community';
import { languageCookie,resolveLanguage,translate } from '../../../lib/i18n';
import { readCookie } from '../../../lib/security';

export const dynamic='force-dynamic';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
function errorResponse(error:unknown,request:Request) {
  if(error instanceof CommunityError||error instanceof AppError)return Response.json({error:translate(error.message,resolveLanguage(readCookie(request,languageCookie)))},{status:error.status,headers:{'Cache-Control':'no-store'}});
  return failure(error);
}
export async function GET(request:Request) {
  try {
    const user=(await session(request))!,query=new URL(request.url).searchParams,store=communityStore(database(),runtime.FILES);
    if(query.has('post'))return json({post:await store.post(user,query.get('post'))});
    return json(await store.feed(user,{sort:query.get('sort')==='top'?'top':'new',mine:query.get('mine')==='1'}));
  }catch(error){return errorResponse(error,request)}
}
export async function POST(request:Request) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!,store=communityStore(database(),runtime.FILES);
    // Posts carry an optional picture, so they arrive as a form; every other action is JSON.
    if(request.headers.get('content-type')?.includes('multipart/form-data')){
      if(Number(request.headers.get('content-length'))>imageLimit+40000)throw new CommunityError('Ảnh cần nhỏ hơn hoặc bằng 5 MB.');
      const form=await request.formData(),file=form.get('image');
      if(file!==null&&!(file instanceof File))throw new CommunityError('Ảnh chưa hợp lệ.');
      const image=file instanceof File&&file.size?{type:file.type,bytes:new Uint8Array(await file.arrayBuffer())}:undefined;
      const postId=form.get('postId');
      if(postId)return json({post:await store.update(user,postId,form.get('body'),{image,removeImage:form.get('removeImage')==='1'})});
      return json({post:await store.create(user,form.get('body'),image)});
    }
    let body:Record<string,unknown>;
    try {const raw=await request.text();if(raw.length>10000)throw new Error();body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}
    catch {throw new CommunityError('Yêu cầu chưa hợp lệ.')}
    if(body.action==='react')return json({post:await store.react(user,body.postId,body.kind)});
    if(body.action==='comment')return json({post:await store.comment(user,body.postId,body.text,body.parentId)});
    if(body.action==='comment-like')return json({post:await store.likeComment(user,body.commentId)});
    if(body.action==='comment-remove')return json({post:await store.removeComment(user,body.commentId)});
    if(body.action==='comments')return json({post:await store.setComments(user,body.postId,body.off)});
    if(body.action==='remove')return json(await store.remove(user,body.postId));
    throw new CommunityError('Không tìm thấy thao tác.',404);
  }catch(error){return errorResponse(error,request)}
}
