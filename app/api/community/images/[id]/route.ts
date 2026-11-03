import { database,runtime,session,failure } from '../../../../../lib/server';
import { communityStore } from '../../../../../lib/community-store';
import { CommunityError } from '../../../../../lib/community';

export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await session(request);
    const {body,type}=await communityStore(database(),runtime.FILES).image((await params).id);
    return new Response(body,{headers:{'Content-Type':type,'Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
  }catch(error){
    if(error instanceof CommunityError)return new Response(null,{status:error.status});
    return failure(error);
  }
}
