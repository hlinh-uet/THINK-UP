import { authState } from '../../../lib/auth';
import { failure } from '../../../lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request) { try{return await authState(request)}catch(error){return failure(error)} }
