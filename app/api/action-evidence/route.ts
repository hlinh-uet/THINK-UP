import {AppError,failure,session} from '../../../lib/server';
import {uploadActionEvidence} from '../../../lib/action-evidence';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
 if(Number(request.headers.get('content-length')||0)>6*1024*1024)throw new AppError('Tệp quá lớn.',413);
 return Response.json(await uploadActionEvidence(request,(await session(request))!),{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e)}}
