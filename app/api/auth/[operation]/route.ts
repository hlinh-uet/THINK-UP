import { authenticate } from '../../../../lib/auth';
import { failure } from '../../../../lib/server';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{operation:string}>}) {
  try {const {operation}=await params;return await authenticate(request,operation)}catch(error){return failure(error)}
}
