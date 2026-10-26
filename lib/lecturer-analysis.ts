import { analyze } from './ai';
import { AppError, configFor, id, isLocal, log, now, prepare, reflection, session, str, assertPermission } from './server';
import { wordCount, type User } from './domain';

export async function lecturerAnalysis(request: Request,user: User,body: Record<string,unknown>) {
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
  const reflectionId=str(body.id,100,true),row=await reflection(user,reflectionId,'review');
  if(!['submitted','final'].includes(String(row.status)))throw new AppError('Chờ sinh viên nộp lại bài trước khi phân tích.',409);
  if(body.rev!==row.rev)throw new AppError('Bài đã thay đổi. Tải lại trước khi phân tích.',409);
  const content=JSON.parse(String(row.content_json));
  if(wordCount(content)<20)throw new AppError('Hãy viết ít nhất 20 từ để Coach có bối cảnh gợi mở.');
  const rubric=await configFor(row);
  const {result,provider}=await analyze(user.id,reflectionId,String(row.title),content,rubric,body.language==='en'?'en':'vi',body.includeAttachments===true,{local:isLocal(request),provider:body.aiProvider});
  const live=(await session(request))!;assertPermission(live,live.role==='admin'?'courses.manage':'ai.use');const latest=await reflection(live,reflectionId,'review');
  if(latest.rev!==row.rev||!['submitted','final'].includes(String(latest.status)))throw new AppError('Bài đã thay đổi. Tải lại trước khi phân tích.',409);
  const analysisId=id();
  const saved=await prepare("INSERT INTO analyses (id,reflection_id,version_id,kind,provider,result_json,rubric_json,created_at) SELECT ?,id,latest_version,'feedback',?,?,?,? FROM reflections WHERE id=? AND rev=? AND latest_version=? AND status IN ('submitted','final')",analysisId,provider,JSON.stringify(result),JSON.stringify(rubric),now(),reflectionId,row.rev,row.latest_version).run();
  if(saved.meta.changes!==1)throw new AppError('Bài đã thay đổi. Tải lại trước khi phân tích.',409);
  await log(live,'lecturer-analysis',reflectionId,{analysisId,versionId:row.latest_version});
  return {id:reflectionId};
}
