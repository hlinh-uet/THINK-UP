import {session,one,runtime,AppError,failure} from '../../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await session(request);const {id}=await params;
    const row=await one<{avatar_key:string;avatar_type:string}>('SELECT avatar_key,avatar_type FROM user_profiles WHERE user_id=? AND avatar_key IS NOT NULL',id);
    if(!row||!['image/png','image/jpeg','image/webp'].includes(row.avatar_type))throw new AppError('Không tìm thấy ảnh đại diện.',404);
    if(!runtime.FILES)throw new AppError('Nơi lưu ảnh đại diện chưa sẵn sàng.',503);
    const object=await runtime.FILES.get(row.avatar_key);if(!object)throw new AppError('Không tìm thấy ảnh đại diện.',404);
    return new Response(object.body,{headers:{'Content-Type':row.avatar_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }catch(error){return failure(error)}
}
