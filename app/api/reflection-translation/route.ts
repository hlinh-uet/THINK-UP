import {AppError,assertPermission,content,failure,id,isLocal,now,one,prepare,reflection,session,str} from '../../../lib/server';
import {translateWriting} from '../../../lib/reflection-translation-ai';
import {validateWritingTranslation,writingIdentity} from '../../../lib/reflection-translation';
export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
  const user=(await session(request))!,body=await request.json() as Record<string,unknown>;
  const reflectionId=str(body.reflectionId,100,true),row=await reflection(user,reflectionId);
  if(row.user_id!==user.id)throw new AppError('Bạn chỉ được dịch bài viết của mình.',403);
  const language=body.language==='en'?'en':'vi',source={title:str(body.title,200),content:content(body.content)};
  // Submitted work can only translate an existing saved snapshot.
  if(!['draft','returned'].includes(String(row.status))&&(source.title!==row.title||JSON.stringify(source.content)!==JSON.stringify(JSON.parse(String(row.content_json)))))throw new AppError('Bài đã khóa. Bạn chỉ có thể dịch nội dung đã lưu.',409);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(writingIdentity(source))))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const recordId=`writing:${reflectionId}:${language}:${digest}`;
  const cached=await one<{payload_json:string}>("SELECT payload_json FROM learning_records WHERE id=? AND owner_id=? AND kind='reflection-translation'",recordId,user.id);
  if(cached)return Response.json({view:validateWritingTranslation(JSON.parse(cached.payload_json).view,source)},{headers:{'Cache-Control':'no-store'}});
  assertPermission(user,'ai.use');
  const reservation=await prepare("INSERT INTO audit (id,user_id,action,target_id,detail,created_at) SELECT ?,?,'ai-translation-request',?,'{}',? WHERE (SELECT count(*) FROM audit WHERE user_id=? AND action='ai-translation-request' AND created_at>?)<5",id(),user.id,reflectionId,now(),user.id,new Date(Date.now()-60000).toISOString()).run();
  if(reservation.meta.changes!==1)throw new AppError('Bạn đã yêu cầu dịch nhiều lần. Hãy chờ một phút rồi thử lại.',429);
  const view=await translateWriting(source,language,isLocal(request));
  const fresh=(await session(request))!;assertPermission(fresh,'ai.use');await reflection(fresh,reflectionId);
  await prepare("INSERT OR IGNORE INTO learning_records (id,kind,owner_id,reflection_id,payload_json,revision,created_at,updated_at) VALUES (?,'reflection-translation',?,?,?,1,?,?)",recordId,user.id,reflectionId,JSON.stringify({source,language,view}),now(),now()).run();
  return Response.json({view},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error)}
}
