import {base64} from './analysis-input';
import {selectAIProvider} from './ai-provider';
import {normalizeRubricSuggestion,rubricPromptBase,rubricSuggestionInstructions,rubricSuggestionSchema} from './rubric-suggestion';
import {AppError,id,now,prepare,runtime} from './server';
import type {Criterion} from './domain';
import type {Language} from './i18n';
export async function suggestRubric(userId:string,courseId:string,course:{name:string;code:string},base:Criterion[],file:{name:string;bytes:Uint8Array},language:Language,local:boolean){
 let provider;try{provider=selectAIProvider(runtime,local)}catch(e){throw new AppError(e instanceof Error?e.message:'AI chưa được kết nối.',503)}
 const saved=await prepare("INSERT INTO audit (id,user_id,action,target_id,detail,created_at) SELECT ?,?,'ai-analysis-request',?,'rubric-suggestion',? WHERE (SELECT count(*) FROM audit WHERE user_id=? AND action='ai-analysis-request' AND created_at>?)<5",id(),userId,courseId,now(),userId,new Date(Date.now()-60000).toISOString()).run();
 if(saved.meta.changes!==1)throw new AppError('Hãy chờ một phút trước khi phân tích tiếp.',429);
 const input=[{type:'input_text',text:JSON.stringify({course,defaultRubric:rubricPromptBase(base)})},{type:'input_file',filename:file.name,file_data:`data:application/pdf;base64,${base64(file.bytes)}`}];
 const instructions=rubricSuggestionInstructions(language);let data:unknown;
 if(provider==='codex'){
  const response=await fetch(`${runtime.CODEX_BRIDGE_URL}/rubric`,{method:'POST',headers:{Authorization:`Bearer ${runtime.CODEX_BRIDGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({input,instructions}),signal:AbortSignal.timeout(270000)});
  const payload=await response.json() as {feedback?:unknown;error?:string};if(!response.ok)throw new AppError(payload.error||'AI chưa phản hồi thành công.',502);data=payload.feedback;
 }else{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${runtime.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:runtime.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions,input:[{role:'user',content:input}],text:{format:{type:'json_schema',name:'rubric_suggestion',strict:true,schema:rubricSuggestionSchema}},max_output_tokens:6000}),signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw new AppError('AI chưa phản hồi thành công. Rubric hiện tại không thay đổi.',502);
  const payload=await response.json() as {status:string;output?:{content?:{type:string;text?:string}[]}[]};
  if(payload.status!=='completed')throw new AppError('Gợi ý rubric chưa hoàn tất.',502);
  try{data=JSON.parse(payload.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('')||'')}catch{throw new AppError('Gợi ý rubric chưa hợp lệ.',502)}
 }
 try{return normalizeRubricSuggestion(data)}catch(e){throw new AppError(e instanceof Error?e.message:'Gợi ý rubric chưa hợp lệ.',502)}
}
