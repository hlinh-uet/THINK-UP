import {AppError,assertPermission,course,failure,isLocal,one,session,str} from '../../../lib/server';
import {defaultRubric,isSpecificationRubric,type Criterion} from '../../../lib/domain';
import {isPdf,rubricSlideMaxBytes} from '../../../lib/rubric-suggestion';
import {suggestRubric} from '../../../lib/rubric-suggestion-ai';
export const dynamic='force-dynamic';
// Slides are only sent to the AI: nothing is stored and the course stays unchanged until the lecturer saves.
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
 if(Number(request.headers.get('content-length')||0)>6*1024*1024)throw new AppError('Slide cần nhỏ hơn 5 MB.',413);
 const user=(await session(request))!;assertPermission(user,'courses.manage');if(user.role!=='admin')assertPermission(user,'ai.use');
 const form=await request.formData(),courseId=str(form.get('courseId'),100,true),row=await course(user,courseId,true),file=form.get('file');
 if(!(file instanceof File)||!file.size||file.size>rubricSlideMaxBytes)throw new AppError('Slide cần nhỏ hơn 5 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());if(file.type!=='application/pdf'||!isPdf(bytes))throw new AppError('Chọn slide ở định dạng PDF.');
 const setting=await one<{value:string}>("SELECT value FROM settings WHERE key='rubric'"),saved=setting?JSON.parse(setting.value) as Criterion[]:[],base=isSpecificationRubric(saved)?saved:defaultRubric;
 const suggestion=await suggestRubric(user.id,courseId,{name:String(row.name),code:String(row.code)},base,{name:(file.name||'slides.pdf').slice(-150),bytes},form.get('language')==='vi'?'vi':'en',isLocal(request));
 const submissions=await one<{n:number}>("SELECT count(*) n FROM reflections WHERE course_id=? AND status IN ('submitted','final')",courseId);
 return Response.json({...suggestion,submissions:submissions?.n||0},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e)}}
