import { all, AppError, course, failure, log, now, reflection, session, str } from '../../../lib/server';
import { defaultWeeks, type Content, type Week } from '../../../lib/domain';
import { compareSubmissions, type SimilarityDocument } from '../../../lib/similarity';

export const dynamic='force-dynamic';
export async function POST(request: Request) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!;
    if(!['lecturer','admin'].includes(user.role))throw new AppError('Cần quyền giảng viên hoặc quản trị viên.',403);
    const body=await request.json() as Record<string,unknown>;
    const courseId=body.courseId?str(body.courseId,100,true):null;
    const reflectionId=body.reflectionId?str(body.reflectionId,100,true):null;
    const scopes=await all<{id:string;weeks_json:string}>(user.role==='admin'?'SELECT id,weeks_json FROM courses':"SELECT c.id,c.weeks_json FROM courses c JOIN memberships m ON m.course_id=c.id WHERE m.user_id=? AND m.role='lecturer'",...(user.role==='admin'?[]:[user.id]));
    if(courseId)await course(user,courseId,true);
    const courseIds=scopes.filter(c=>!courseId||c.id===courseId).map(c=>c.id);
    if(reflectionId){
      const target=await reflection(user,reflectionId);
      if(target.user_id===user.id||!courseIds.includes(String(target.course_id)))throw new AppError('Không có quyền kiểm tra trùng lặp bài này.',403);
      if(!['submitted','final'].includes(String(target.status)))throw new AppError('Chỉ kiểm tra trùng lặp bài đã nộp hoặc đã hoàn thành.',409);
    }
    const rows=courseIds.length?await all<Record<string,unknown>>(`SELECT r.*,u.name AS student_name,u.email AS student_email,c.name AS course_name FROM reflections r JOIN users u ON u.id=r.user_id JOIN courses c ON c.id=r.course_id WHERE r.course_id IN (${courseIds.map(()=>'?').join(',')}) AND r.status IN ('submitted','final') AND NOT EXISTS(SELECT 1 FROM learning_records l WHERE l.kind='archive' AND l.reflection_id=r.id) AND u.role='student' AND r.user_id!=? ORDER BY r.id LIMIT 501`,...courseIds,user.id):[];
    if(rows.length>500)throw new AppError('Chọn một học phần nhỏ hơn để kiểm tra trùng lặp.',413);
    const documents:SimilarityDocument[]=rows.map(r=>({id:String(r.id),userId:String(r.user_id),courseId:String(r.course_id),versionId:String(r.latest_version),title:String(r.title),studentName:String(r.student_name),studentEmail:String(r.student_email),courseName:String(r.course_name),content:JSON.parse(String(r.content_json)) as Content}));
    const ignoredTexts=[...defaultWeeks,...scopes.flatMap(c=>JSON.parse(c.weeks_json) as Week[])].flatMap(w=>[w.title,w.prompt]);
    let result;
    try{result=compareSubmissions(documents,ignoredTexts,reflectionId||undefined)}catch(error){throw new AppError(error instanceof Error?error.message:'Không thể kiểm tra trùng lặp.',413)}
    // Check live access again after processing; never return another class's text.
    const live=(await session(request))!;
    if(live.role!==user.role)throw new AppError('Quyền tài khoản đã thay đổi. Vui lòng tải lại.',403);
    for(const scope of courseIds)await course(live,scope,true);
    await log(live,'similarity-check',reflectionId||courseId||'assigned-courses',{courseIds,documents:result.documents,pairs:result.comparedPairs,matches:result.matches.length});
    return Response.json({...result,courseIds,reflectionId,checkedAt:now()},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error)}
}
