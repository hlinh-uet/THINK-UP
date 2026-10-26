import {assertPermission} from '../../../lib/server';
import { all, AppError, course, failure, log, now, reflection, session, str } from '../../../lib/server';
import { defaultWeeks, type Content, type Week } from '../../../lib/domain';
import { compareSubmissions, type SimilarityDocument } from '../../../lib/similarity';

export const dynamic='force-dynamic';
export async function POST(request: Request) {
  try {
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!;assertPermission(user,user.role==='admin'?'courses.manage':'similarity.run');
    if(!['lecturer','admin'].includes(user.role))throw new AppError('Cần quyền giảng viên hoặc quản trị viên.',403);
    const body=await request.json() as Record<string,unknown>;
    const courseId=body.courseId?str(body.courseId,100,true):null;
    const reflectionId=body.reflectionId?str(body.reflectionId,100,true):null;
    const studentId=body.studentId?str(body.studentId,100,true):null;
    const week=body.week==null?null:typeof body.week==='number'?body.week:NaN;
    if(week!==null&&(!Number.isInteger(week)||week<1||week>9))throw new AppError('Tuần kiểm tra không hợp lệ.',400);
    if(body.courseIds!==undefined&&(!Array.isArray(body.courseIds)||body.courseIds.some(id=>typeof id!=='string'||!id||id.length>100)))throw new AppError('Phạm vi học phần không hợp lệ.',400);
    const requested=Array.isArray(body.courseIds)?new Set(body.courseIds as string[]):null;
    const scopes=await all<{id:string;weeks_json:string}>(user.role==='admin'?'SELECT id,weeks_json FROM courses':"SELECT c.id,c.weeks_json FROM courses c JOIN memberships m ON m.course_id=c.id WHERE m.user_id=? AND m.role='lecturer'",...(user.role==='admin'?[]:[user.id]));
    if(courseId)await course(user,courseId,true);
    if(requested&&[...requested].some(id=>!scopes.some(c=>c.id===id)))throw new AppError('Không có quyền kiểm tra học phần này.',403);
    if(courseId&&requested&&!requested.has(courseId))throw new AppError('Phạm vi học phần không hợp lệ.',400);
    const courseIds=scopes.filter(c=>(!courseId||c.id===courseId)&&(!requested||requested.has(c.id))).map(c=>c.id);
    if(studentId){
      const enrolled=courseIds.length?await all<{user_id:string}>(`SELECT user_id FROM memberships WHERE user_id=? AND role='student' AND course_id IN (SELECT value FROM json_each(?))`,studentId,JSON.stringify(courseIds)):[];
      if(!enrolled.length)throw new AppError('Sinh viên không thuộc phạm vi học phần đã chọn.',403);
    }
    if(reflectionId){
      const target=await reflection(user,reflectionId);
      if(target.user_id===user.id||!courseIds.includes(String(target.course_id)))throw new AppError('Không có quyền kiểm tra trùng lặp bài này.',403);
      if(!['submitted','final'].includes(String(target.status)))throw new AppError('Chỉ kiểm tra trùng lặp bài đã nộp hoặc đã hoàn thành.',409);
      if((studentId&&target.user_id!==studentId)||(week&&Number(target.week)!==week))throw new AppError('Bài được chọn không khớp bộ lọc kiểm tra.',400);
    }
    const rows=courseIds.length?await all<Record<string,unknown>>(`SELECT r.*,u.name AS student_name,u.email AS student_email,c.name AS course_name FROM reflections r JOIN users u ON u.id=r.user_id JOIN courses c ON c.id=r.course_id WHERE r.course_id IN (SELECT value FROM json_each(?)) AND r.status IN ('submitted','final') ${week?'AND r.week=?':''} AND NOT EXISTS(SELECT 1 FROM learning_records l WHERE l.kind='archive' AND l.reflection_id=r.id) AND u.role='student' AND r.user_id!=? ORDER BY r.id LIMIT 501`,JSON.stringify(courseIds),...(week?[week]:[]),user.id):[];
    if(rows.length>500)throw new AppError('Chọn một học phần nhỏ hơn để kiểm tra trùng lặp.',413);
    const documents:SimilarityDocument[]=rows.map(r=>({id:String(r.id),userId:String(r.user_id),courseId:String(r.course_id),versionId:String(r.latest_version),title:String(r.title),studentName:String(r.student_name),studentEmail:String(r.student_email),courseName:String(r.course_name),content:JSON.parse(String(r.content_json)) as Content}));
    const ignoredTexts=[...defaultWeeks,...scopes.flatMap(c=>JSON.parse(c.weeks_json) as Week[])].flatMap(w=>[w.title,w.prompt]);
    let result;
    try{result=compareSubmissions(documents,ignoredTexts,reflectionId||undefined,studentId||undefined)}catch(error){throw new AppError(error instanceof Error?error.message:'Không thể kiểm tra trùng lặp.',413)}
    // Check live access again after processing; never return another class's text.
    const live=(await session(request))!;assertPermission(live,live.role==='admin'?'courses.manage':'similarity.run');
    if(live.role!==user.role)throw new AppError('Quyền tài khoản đã thay đổi. Vui lòng tải lại.',403);
    for(const scope of courseIds)await course(live,scope,true);
    await log(live,'similarity-check',reflectionId||studentId||courseId||'assigned-courses',{courseIds,studentId,week,documents:result.documents,pairs:result.comparedPairs,matches:result.matches.length});
    return Response.json({...result,courseIds,reflectionId,studentId,week,checkedAt:now()},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error)}
}
