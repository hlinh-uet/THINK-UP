import { analysisInput } from './analysis-input';
import { selectAIProvider } from './ai-provider';
import { chatSchema, normalizeChatReply, reflectionChatInstructions, reflectionThinkingInstructions } from './reflection-chat-prompt';
import { all, AppError, id, now, prepare, runtime } from './server';
import type { Content } from './domain';
import type { Language } from './i18n';
import type { CoachTurn } from './reflection-chat-history';
export type { CoachTurn } from './reflection-chat-history';

export async function chatReply(userId:string,reflectionId:string,title:string,content:Content,question:string,history:CoachTurn[],language:Language,includeAttachments:boolean,options:{local:boolean;provider:unknown;thinking?:boolean}) {
  let provider;
  try {provider=selectAIProvider(runtime,options.local,options.provider)}
  catch(error){throw new AppError(error instanceof Error?error.message:'AI chưa được kết nối.',503)}
  const reservation=await prepare("INSERT INTO audit (id,user_id,action,target_id,detail,created_at) SELECT ?,?,'ai-analysis-request',?,?,? WHERE (SELECT count(*) FROM audit WHERE user_id=? AND action='ai-analysis-request' AND created_at>?)<5",id(),userId,reflectionId,JSON.stringify({kind:options.thinking?'thinking':'chat',includeAttachments}),now(),userId,new Date(Date.now()-60000).toISOString()).run();
  if(reservation.meta.changes!==1)throw new AppError('Bạn đã gửi nhiều câu hỏi liên tiếp. Hãy chờ một phút và thử lại.',429);
  const files=includeAttachments?await all<{object_key:string;type:string;name:string}>('SELECT object_key,type,name FROM attachments WHERE reflection_id=? ORDER BY created_at DESC LIMIT 3',reflectionId):[];
  const input=await analysisInput(title,content,[],files,includeAttachments,async key=>{const object=await runtime.FILES.get(key);return object?object.arrayBuffer():null});
  // Bounded history plus a fresh snapshot on every turn; never reuse an outdated saved draft.
  if(options.thinking)input.push({type:'input_text',text:JSON.stringify({task:'Suggest the next reflection thinking step from the current editor snapshot.',attachmentsIncludedThisTurn:includeAttachments})});
  else {
    const previous=history.filter(turn=>turn.status==='completed').slice(-8).map(turn=>({student:turn.question,coach:turn.reply?.slice(0,4000)}));
    input.push({type:'input_text',text:JSON.stringify({previousConversation:previous,latestStudentMessage:question,attachmentsIncludedThisTurn:includeAttachments})});
  }
  const instructions=options.thinking?reflectionThinkingInstructions(language):reflectionChatInstructions(language);
  let value:unknown;
  if(provider==='codex') {
    let response:Response;
    try {response=await fetch(`${runtime.CODEX_BRIDGE_URL}/chat`,{method:'POST',headers:{Authorization:`Bearer ${runtime.CODEX_BRIDGE_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({instructions,input}),signal:AbortSignal.timeout(270000)})}
    catch {throw new AppError('Chưa thể kết nối Codex local. Khởi động bằng npm run dev:codex rồi thử lại.',503)}
    const payload=await response.json() as {chat?:unknown;error?:string};
    if(!response.ok)throw new AppError(payload.error||'AI chưa trả lời. Hãy thử lại.',response.status);
    value=payload.chat;
  } else {
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${runtime.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:runtime.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions,input:[{role:'user',content:input}],text:{format:{type:'json_schema',name:'reflection_chat',strict:true,schema:chatSchema}},max_output_tokens:1800}),signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new AppError(response.status===429?'Dịch vụ AI đang giới hạn lượt sử dụng. Hãy thử lại sau.':'AI chưa trả lời. Hãy kiểm tra kết nối và thử lại.',502);
    const payload=await response.json() as {status:string;output?:{content?:{type:string;text?:string}[]}[]};
    if(payload.status!=='completed')throw new AppError('Câu trả lời chưa hoàn tất. Hãy thử lại.',502);
    try {value=JSON.parse(payload.output?.flatMap(item=>item.content||[]).filter(item=>item.type==='output_text').map(item=>item.text||'').join('')||'')}
    catch {throw new AppError('AI chưa trả về câu trả lời hợp lệ. Hãy thử lại.',502)}
  }
  try {return {reply:normalizeChatReply(value),provider:provider==='codex'?'Codex local':'OpenAI'}}
  catch(error){throw new AppError(error instanceof Error?error.message:'Câu trả lời chưa hợp lệ.',502)}
}
