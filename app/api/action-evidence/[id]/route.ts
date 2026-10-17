import {failure} from '../../../../lib/server';
import {downloadActionEvidence} from '../../../../lib/action-evidence';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{return await downloadActionEvidence(request,(await params).id)}catch(e){return failure(e)}}
