import { database,session,AppError,failure } from '../../../lib/server';
import { messageStore } from '../../../lib/message-store';
import { MessageError } from '../../../lib/messaging';
import { languageCookie,resolveLanguage,translate } from '../../../lib/i18n';
import { readCookie } from '../../../lib/security';

export const dynamic='force-dynamic';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
function errorResponse(error:unknown,request:Request) {
  if(error instanceof MessageError||error instanceof AppError)return Response.json({error:translate(error.message,resolveLanguage(readCookie(request,languageCookie)))},{status:error.status,headers:{'Cache-Control':'no-store'}});
  return failure(error);
}
export async function GET(request:Request) {
  try {
    const user=(await session(request))!,store=messageStore(database()),query=new URL(request.url).searchParams;
    if(query.get('summary')==='1')return json({unreadTotal:await store.unread(user.id)});
    if(query.has('peer'))return json(await store.thread(user.id,query.get('peer'),{...(query.has('after')?{after:query.get('after')}:{}),...(query.has('before')?{before:query.get('before')}:{})}));
    return json(await store.inbox(user.id));
  }catch(error){return errorResponse(error,request)}
}
export async function POST(request:Request) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!;
    if(!request.headers.get('content-type')?.includes('application/json'))throw new MessageError('Yêu cầu tin nhắn chưa hợp lệ.');
    let body:Record<string,unknown>;
    try {const raw=await request.text();if(raw.length>25000)throw new Error();body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}
    catch {throw new MessageError('Yêu cầu tin nhắn chưa hợp lệ.')}
    const store=messageStore(database());
    if(body.action==='send')return json({message:await store.send(user.id,body.peerId,body.text,body.clientId)});
    if(body.action==='read')return json(await store.markRead(user.id,body.conversationId,body.through));
    throw new MessageError('Không tìm thấy thao tác tin nhắn.',404);
  }catch(error){return errorResponse(error,request)}
}
