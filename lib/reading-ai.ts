import {analysisInput} from './analysis-input';
import {selectAIProvider} from './ai-provider';
import {readingInstructions,readingSchema,normalizeReading,readingEvidenceContext} from './reading';
import {all,AppError,id,now,prepare,runtime} from './server';
import type {Content,Criterion} from './domain';
import type {Language} from './i18n';
export async function readWithAI(userId:string,reflectionId:string,title:string,content:Content,rubric:Criterion[],language:Language,includeAttachments:boolean,options:{local:boolean;provider:unknown}){
 let provider;try{provider=selectAIProvider(runtime,options.local,options.provider)}catch(e){throw new AppError(e instanceof Error?e.message:'AI chưa được kết nối.',503)}
 const saved=await prepare("INSERT INTO audit (id,user_id,action,target_id,detail,created_at) SELECT ?,?,'ai-analysis-request',?,'reading',? WHERE (SELECT count(*) FROM audit WHERE user_id=? AND action='ai-analysis-request' AND created_at>?)<5",id(),userId,reflectionId,now(),userId,new Date(Date.now()-60000).toISOString()).run();
 if(saved.meta.changes!==1)throw new AppError('Hãy chờ một phút trước khi phân tích tiếp.',429);
 const files=includeAttachments?await all<{object_key:string;type:string;name:string}>('SELECT object_key,type,name FROM attachments WHERE reflection_id=? ORDER BY created_at DESC LIMIT 3',reflectionId):[];
 const input=await analysisInput(title,content,rubric,files,includeAttachments,async key=>{const file=await runtime.FILES.get(key);return file?file.arrayBuffer():null});
 input.push(readingEvidenceContext(content));
 const instructions=readingInstructions(language);let data:unknown;
 if(provider==='codex'){
  const response=await fetch(`${runtime.CODEX_BRIDGE_URL}/reading`,{method:'POST',headers:{Authorization:`Bearer ${runtime.CODEX_BRIDGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({input,instructions}),signal:AbortSignal.timeout(270000)});
  const payload=await response.json() as {feedback?:unknown;error?:string};if(!response.ok)throw new AppError(payload.error||'AI chưa phản hồi thành công.',502);data=payload.feedback;
 }else{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${runtime.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:runtime.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions,input:[{role:'user',content:input}],text:{format:{type:'json_schema',name:'lecturer_reading',strict:true,schema:readingSchema}},max_output_tokens:6500}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw new AppError('AI chưa phản hồi thành công. Bài viết vẫn được lưu.',502);
  const payload=await response.json() as {status:string;output?:{content?:{type:string;text?:string}[]}[]};
  if(payload.status!=='completed')throw new AppError('Phân tích đọc bài chưa hoàn tất.',502);
  try{data=JSON.parse(payload.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('')||'')}catch{throw new AppError('Phân tích đọc bài chưa hợp lệ.',502)}
 }
 try{return {result:normalizeReading(data,content),provider:provider==='codex'?'Codex local':'OpenAI'}}catch(e){throw new AppError(e instanceof Error?e.message:'Phân tích đọc bài chưa hợp lệ.',502)}
}
