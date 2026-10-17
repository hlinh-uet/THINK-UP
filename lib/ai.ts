import { coachInstructions } from './coach-prompt';
import { type Language } from './i18n';
import { feedbackSchema, normalizeFeedback } from './feedback-schema';
import { runtime, all, AppError, prepare, id, now } from './server';
import { analysisInput } from './analysis-input';
import { type Criterion, type Content, type Feedback } from './domain';
import { selectAIProvider } from './ai-provider';

export async function analyze(userId: string,reflectionId: string,title: string,content: Content,rubric: Criterion[],language: Language='vi',includeAttachments=false,options:{local?:boolean;provider?:unknown}={}): Promise<{result:Feedback;provider:string}> {
  let selected;
  try { selected=selectAIProvider(runtime,options.local===true,options.provider); }
  catch(error){throw new AppError(error instanceof Error?error.message:'AI chưa được kết nối.',503)}
  // Reserve requests atomically, including subscription usage and failed attempts.
  const reservation=await prepare("INSERT INTO audit (id,user_id,action,target_id,detail,created_at) SELECT ?,?,'ai-analysis-request',?,?,? WHERE (SELECT count(*) FROM audit WHERE user_id=? AND action='ai-analysis-request' AND created_at>?)<5",id(),userId,reflectionId,JSON.stringify({includeAttachments}),now(),userId,new Date(Date.now()-60000).toISOString()).run();
  if(reservation.meta.changes!==1)throw new AppError('Bạn đã phân tích nhiều lần liên tiếp. Hãy chờ một phút và thử lại.',429);
  const files=includeAttachments?await all<{object_key:string;type:string;name:string}>('SELECT object_key,type,name FROM attachments WHERE reflection_id=? ORDER BY created_at DESC LIMIT 3',reflectionId):[];
  const suppliedAttachments:string[]=[];
  const input=await analysisInput(title,content,rubric,files,includeAttachments,async key=>{
    const object=await runtime.FILES.get(key);if(object)suppliedAttachments.push(files.find(file=>file.object_key===key)!.name);return object?object.arrayBuffer():null;
  });
  let data:unknown;
  if(selected==='codex') {
    let response:Response;
    try { response=await fetch(`${runtime.CODEX_BRIDGE_URL}/analyze`,{
      method:'POST',headers:{Authorization:`Bearer ${runtime.CODEX_BRIDGE_TOKEN}`,'Content-Type':'application/json'},
      body:JSON.stringify({instructions:coachInstructions(language),input}),signal:AbortSignal.timeout(270000),
    }); } catch { throw new AppError('Chưa thể kết nối Codex local. Khởi động bằng npm run dev:codex rồi thử lại.',503); }
    const payload=await response.json() as {feedback?:unknown;error?:string};
    if(!response.ok)throw new AppError(payload.error||'Codex chưa phản hồi thành công. Bài viết vẫn được lưu.',response.status);
    data=payload.feedback;
  } else {
  const response=await fetch('https://api.openai.com/v1/responses',{
    method:'POST',headers:{Authorization:`Bearer ${runtime.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({model:runtime.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions:coachInstructions(language),input:[{role:'user',content:input}],text:{format:{type:'json_schema',name:'reflection_feedback',strict:true,schema:feedbackSchema}},max_output_tokens:3200}),signal:AbortSignal.timeout(90000),
  });
  if(!response.ok) {
    if(response.status===429)throw new AppError('Dịch vụ AI đang giới hạn lượt sử dụng. Vui lòng thử lại sau.',503);
    if(response.status===401||response.status===403)throw new AppError('Kết nối AI cần được quản trị viên kiểm tra.',503);
    throw new AppError('AI chưa phản hồi thành công. Bài viết của bạn vẫn được lưu.',502);
  }
  const payload=await response.json() as {status:string;output:{type:string;content?:{type:string;text?:string}[]}[]};
  if(payload.status!=='completed')throw new AppError('Phân tích AI chưa hoàn tất. Hãy thử lại với bài viết ngắn hơn.',502);
  const output=payload.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('');
  try{data=JSON.parse(output)}catch{throw new AppError('AI không trả về phản hồi hợp lệ. Hãy thử lại.',502)}
  }
  try { const result=normalizeFeedback(data,content,rubric,suppliedAttachments,language);result.includedAttachments=includeAttachments;return {result,provider:selected==='codex'?'Codex local':'OpenAI'}; }
  catch(error){throw new AppError(error instanceof Error?error.message:'AI không trả về phản hồi hợp lệ. Hãy thử lại.',502)}
}
