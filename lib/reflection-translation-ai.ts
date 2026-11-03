import {selectAIProvider} from './ai-provider';
import {AppError,runtime} from './server';
import {validateWritingTranslation,writingTranslationInstructions,writingTranslationSchema,type WritingView} from './reflection-translation';
import type {Language} from './i18n';

export async function translateWriting(source:WritingView,language:Language,local:boolean){
 let provider;try{provider=selectAIProvider(runtime,local)}catch{throw new AppError('Cần kết nối AI để dịch bài viết này. Bản gốc vẫn được giữ nguyên.',503)}
 const instructions=writingTranslationInstructions(language),input=[{type:'input_text',text:JSON.stringify(source)}];
 let value:unknown;
 if(provider==='codex'){
  const response=await fetch(`${runtime.CODEX_BRIDGE_URL}/translate`,{method:'POST',headers:{Authorization:`Bearer ${runtime.CODEX_BRIDGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({instructions,input}),signal:AbortSignal.timeout(270000)});
  const body=await response.json() as {feedback?:unknown;error?:string};if(!response.ok)throw new AppError(body.error||'Chưa dịch được bài viết. Vui lòng thử lại.',response.status);value=body.feedback;
 }else{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${runtime.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:runtime.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions,input:[{role:'user',content:input}],text:{format:{type:'json_schema',name:'reflection_translation',strict:true,schema:writingTranslationSchema}},max_output_tokens:12000}),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw new AppError('Chưa dịch được bài viết. Vui lòng thử lại.',503);
  const body=await response.json() as {status:string;output?:{content?:{type:string;text?:string}[]}[]};if(body.status!=='completed')throw new AppError('Bản dịch chưa hoàn tất. Vui lòng thử lại.',502);
  try{value=JSON.parse(body.output?.flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text||'').join('')||'')}catch{throw new AppError('Bản dịch chưa hợp lệ. Vui lòng thử lại.',502)}
 }
 return validateWritingTranslation(value,source);
}
