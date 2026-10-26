import {assertPermission} from '../../../lib/server';
import {assertStudent} from '../../../lib/learning-actions';
import { all, AppError, content, failure, id, isLocal, now, one, prepare, reflection, session, str } from '../../../lib/server';
import { chatReply, type CoachTurn } from '../../../lib/reflection-chat-ai';
import { thinkingRequest } from '../../../lib/reflection-chat-prompt';
export const dynamic='force-dynamic';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
async function history(reflectionId:string,userId:string) {
  const turns=await all<CoachTurn>('SELECT id,question,reply,status,provider,included_attachments,created_at FROM reflection_coach_turns WHERE reflection_id=? AND user_id=? ORDER BY created_at DESC,rowid DESC LIMIT 40',reflectionId,userId);
  return turns.reverse();
}
export async function GET(request:Request) {
  try {
    const user=(await session(request))!,reflectionId=str(new URL(request.url).searchParams.get('reflectionId'),100,true);
    const row=await one('SELECT user_id FROM reflections WHERE id=?',reflectionId);
    if(!row||row.user_id!==user.id)throw new AppError('Không có quyền mở cuộc trò chuyện này.',403);
    await prepare("UPDATE reflection_coach_turns SET status='failed' WHERE reflection_id=? AND user_id=? AND status='pending' AND created_at<?",reflectionId,user.id,new Date(Date.now()-300000).toISOString()).run();
    return json({turns:await history(reflectionId,user.id)});
  }catch(error){return failure(error)}
}
export async function POST(request:Request) {
  let pendingId:string|undefined;
  try {
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!;assertStudent(user);assertPermission(user,'ai.use');
    const body=await request.json() as Record<string,unknown>;
    const thinking=body.mode==='thinking';
    const reflectionId=str(body.reflectionId,100,true),clientId=str(body.clientId,100,true),question=thinking?thinkingRequest:str(body.question,2000,true);
    const owner=await one('SELECT user_id FROM reflections WHERE id=?',reflectionId);
    if(!owner||owner.user_id!==user.id)throw new AppError('Bạn chỉ được trò chuyện về bài của mình.',403);
    const prior=await one<CoachTurn & {reflection_id:string}>('SELECT * FROM reflection_coach_turns WHERE user_id=? AND client_id=?',user.id,clientId);
    if(prior&&(prior.reflection_id!==reflectionId||prior.question!==question))throw new AppError('Mã câu hỏi đã được sử dụng.',409);
    if(prior?.status==='completed')return json({turn:prior});
    await reflection(user,reflectionId,'write');
    const value=content(body.content),title=str(body.title,200);
    const includeAttachments=thinking||body.includeAttachments===true;
    if(thinking&&!Object.values(value).some(text=>text.trim())&&!await one('SELECT id FROM attachments WHERE reflection_id=? LIMIT 1',reflectionId))throw new AppError('Thêm nội dung hoặc ảnh/tài liệu trong Editor để AI có bối cảnh gợi ý.');
    const expired=new Date(Date.now()-300000).toISOString();
    await prepare("UPDATE reflection_coach_turns SET status='failed' WHERE reflection_id=? AND user_id=? AND status='pending' AND created_at<?",reflectionId,user.id,expired).run();
    if(prior?.status==='failed'||prior?.status==='pending'&&prior.created_at<expired)await prepare("DELETE FROM reflection_coach_turns WHERE user_id=? AND client_id=? AND status='failed'",user.id,clientId).run();
    const turnId=id();
    const inserted=await prepare("INSERT OR IGNORE INTO reflection_coach_turns (id,reflection_id,user_id,client_id,question,status,included_attachments,created_at) SELECT ?,?,?,?,?,'pending',?,? WHERE NOT EXISTS (SELECT 1 FROM reflection_coach_turns WHERE reflection_id=? AND user_id=? AND status='pending')",turnId,reflectionId,user.id,clientId,question,includeAttachments?1:0,now(),reflectionId,user.id).run();
    if(inserted.meta.changes!==1)throw new AppError('AI đang trả lời câu hỏi của bài này. Hãy chờ rồi thử lại.',409);
    pendingId=turnId;
    const result=await chatReply(user.id,reflectionId,title,value,question,thinking?[]:await history(reflectionId,user.id),body.language==='en'?'en':'vi',includeAttachments,{local:isLocal(request),provider:body.aiProvider,thinking});
    assertPermission((await session(request))!,'ai.use'); // Account access must still be active when the response is saved.
    const updated=await prepare("UPDATE reflection_coach_turns SET status='completed',reply=?,provider=? WHERE id=? AND status='pending'",result.reply,result.provider,turnId).run();
    if(updated.meta.changes!==1)throw new AppError('Lượt trò chuyện đã hết hạn. Hãy thử lại.',409);
    pendingId=undefined;
    return json({turn:await one('SELECT id,question,reply,status,provider,included_attachments,created_at FROM reflection_coach_turns WHERE id=?',turnId)});
  }catch(error){if(pendingId)await prepare("UPDATE reflection_coach_turns SET status='failed' WHERE id=? AND status='pending'",pendingId).run();return failure(error)}
}
