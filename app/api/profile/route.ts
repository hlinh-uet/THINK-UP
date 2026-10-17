import {database,session,runtime,AppError,failure} from '../../../lib/server';
import {profileStore} from '../../../lib/profile-store';
import {avatarLimit,ProfileError,validateProfileFields} from '../../../lib/profile';
import {languageCookie,resolveLanguage,translate} from '../../../lib/i18n';
import {readCookie} from '../../../lib/security';
export const dynamic='force-dynamic';
const json=(value:unknown)=>Response.json(value,{headers:{'Cache-Control':'private, no-store'}});
function errorResponse(error:unknown,request:Request){
  if(error instanceof ProfileError||error instanceof AppError)return Response.json({error:translate(error.message,resolveLanguage(readCookie(request,languageCookie)))},{status:error.status,headers:{'Cache-Control':'private, no-store'}});
  return failure(error);
}
export async function GET(request:Request){
  try{const user=(await session(request))!;return json(await profileStore(database()).load(user.id))}catch(error){return errorResponse(error,request)}
}
export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)throw new AppError('Yêu cầu không cùng nguồn.',403);
    const user=(await session(request))!;
    if(!request.headers.get('content-type')?.includes('multipart/form-data'))throw new ProfileError('Thông tin hồ sơ chưa hợp lệ.');
    if(Number(request.headers.get('content-length'))>avatarLimit+20000)throw new ProfileError('Ảnh đại diện cần nhỏ hơn hoặc bằng 2 MB.');
    let form:FormData;
    try{form=await request.formData()}catch{throw new ProfileError('Thông tin hồ sơ chưa hợp lệ.')}
    const body:Record<string,unknown>={};
    for(const [key,value] of form){if(key in body)throw new ProfileError('Thông tin hồ sơ chưa hợp lệ.');body[key]=value}
    const fields=validateProfileFields(body),file=form.get('avatar');
    if(file!==null&&(!(file instanceof File)||!file.size||file.size>avatarLimit))throw new ProfileError('Ảnh đại diện cần nhỏ hơn hoặc bằng 2 MB.');
    const avatar=file instanceof File?{type:file.type,bytes:new Uint8Array(await file.arrayBuffer())}:undefined;
    await session(request); // Recheck the live account after processing the upload.
    return json(await profileStore(database(),runtime.FILES).save(user.id,fields,avatar));
  }catch(error){return errorResponse(error,request)}
}
