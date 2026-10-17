import {session,failure,AppError} from '../../../lib/server';
import {learningAction,learningState} from '../../../lib/learning-actions';
export const dynamic='force-dynamic';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{return json(await learningState((await session(request))!,new URL(request.url).searchParams.get('mode')||'governance'))}catch(e){return failure(e)}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
 const user=(await session(request))!,raw=await request.text();if(raw.length>80000)throw new AppError('Nội dung yêu cầu quá dài.',413);
 let body:Record<string,unknown>;try{body=JSON.parse(raw);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}catch{throw new AppError('Nội dung yêu cầu chưa hợp lệ.')}
 return json(await learningAction(request,user,body));
}catch(e){return failure(e)}}
