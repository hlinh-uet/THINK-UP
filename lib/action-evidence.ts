import {assertPermission} from './server';
import {one,session,reflection,AppError,prepare,runtime,id,now,log,str} from './server';
import {assertStudent} from './learning-actions';
import type {User} from './domain';
const allowed=['image/png','image/jpeg','image/webp','application/pdf','text/plain'];
export async function uploadActionEvidence(request:Request,user:User){
 assertStudent(user);assertPermission(user,'actions.manage');
 const form=await request.formData(),actionId=str(form.get('actionId'),100,true),action=await one<{user_id:string;reflection_id:string|null}>('SELECT user_id,reflection_id FROM actions WHERE id=?',actionId);
 if(!action||action.user_id!==user.id)throw new AppError('Không có quyền thêm minh chứng cam kết.',403);
 const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>5*1024*1024||!allowed.includes(file.type))throw new AppError('Chọn ảnh PNG/JPG/WebP, PDF hoặc TXT, tối đa 5 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),head=new TextDecoder('latin1').decode(bytes.subarray(0,12));
 const valid=file.type==='image/png'?bytes[0]===137&&head.slice(1,4)==='PNG':file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/webp'?head.startsWith('RIFF')&&head.slice(8,12)==='WEBP':file.type==='application/pdf'?head.startsWith('%PDF-'):!bytes.subarray(0,1024).includes(0);
 if(!valid)throw new AppError('Nội dung tệp không khớp định dạng.');
 const fileId=id(),objectKey=`actions/${user.id}/${actionId}/${fileId}`,name=file.name.replace(/[\r\n\\/]/g,'_').slice(0,150),stamp=now();
 await runtime.FILES.put(objectKey,bytes,{httpMetadata:{contentType:file.type}});
 try{
  const live=(await session(request))!;assertStudent(live);assertPermission(live,'actions.manage');if(live.id!==user.id)throw new AppError('Phiên đăng nhập đã thay đổi.',403);
  const saved=await prepare("INSERT INTO learning_records (id,kind,owner_id,reflection_id,payload_json,revision,created_at,updated_at) SELECT ?,'action-evidence',?,reflection_id,?,1,?,? FROM actions WHERE id=? AND user_id=? AND (SELECT count(*) FROM learning_records WHERE kind='action-evidence' AND json_extract(payload_json,'$.actionId')=?)<3",fileId,user.id,JSON.stringify({actionId,objectKey,name,type:file.type,size:file.size}),stamp,stamp,actionId,user.id,actionId).run();
  if(saved.meta.changes!==1)throw new AppError('Mỗi cam kết hỗ trợ tối đa ba tệp minh chứng.',409);
 }catch(e){await runtime.FILES.delete(objectKey);throw e;}
 await log(user,'action-evidence-upload',actionId,{fileId});return {id:fileId,name,type:file.type,size:file.size};
}
export async function downloadActionEvidence(request:Request,fileId:string){
 const user=(await session(request))!,row=await one<{owner_id:string;reflection_id:string|null;payload_json:string}>("SELECT owner_id,reflection_id,payload_json FROM learning_records WHERE id=? AND kind='action-evidence'",fileId);
 if(!row)throw new AppError('Không tìm thấy tệp.',404);
 if(row.owner_id!==user.id){if(!row.reflection_id)throw new AppError('Không có quyền đọc minh chứng cam kết.',403);await reflection(user,row.reflection_id);}
 const payload=JSON.parse(row.payload_json) as {objectKey:string;name:string;type:string},file=await runtime.FILES.get(payload.objectKey);
 if(!file)throw new AppError('Tệp không còn tồn tại.',404);
 return new Response(file.body,{headers:{'Content-Type':payload.type,'Content-Disposition':`attachment; filename="evidence"; filename*=UTF-8''${encodeURIComponent(payload.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
