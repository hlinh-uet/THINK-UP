'use client';

import { useEffect, useRef, useState } from 'react';
import { reflectionText, type ReflectionDraft } from '../lib/student-editor';
import { translate, dateLocale, type Language } from '../lib/i18n';
import type { AIProvider } from '../lib/ai-provider';
import { mergeCoachTurns, type CoachTurn } from '../lib/reflection-chat-history';
import { thinkingRequest } from '../lib/reflection-chat-prompt';
import UiIcon from './UiIcon';

type Props={draft:ReflectionDraft;language:Language;provider:AIProvider;aiReady:boolean;attachmentCount:number;busy:boolean;ensureSaved:()=>Promise<{id:string}|null>};
type Attempt={body:Record<string,unknown>;snapshot:string};

export default function ReflectionThinking({draft,language,provider,aiReady,attachmentCount,busy,ensureSaved}:Props) {
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const [turns,setTurns]=useState<CoachTurn[]>([]),[pending,setPending]=useState(false),[loading,setLoading]=useState(!!draft.id),[error,setError]=useState('');
  const [attempt,setAttempt]=useState<Attempt|null>(null),[lastContext,setLastContext]=useState<{id:string;snapshot:string}|null>(null);
  const locked=useRef(false);
  const editable=['draft','returned'].includes(draft.status);
  const hasContext=!!reflectionText(draft.content).trim()||attachmentCount>0;
  const snapshot=JSON.stringify({title:draft.title,content:draft.content,attachmentCount});
  const hasServerPending=turns.some(turn=>turn.status==='pending');
  const suggestions=turns.filter(turn=>turn.status==='completed'&&turn.question===thinkingRequest);
  const latest=suggestions.at(-1);
  const stale=!!latest&&lastContext?.id===latest.id&&snapshot!==lastContext.snapshot;
  useEffect(()=>{
    if(!draft.id)return;
    let alive=true;const controller=new AbortController();
    const load=async()=>{try{const response=await fetch(`/api/reflection-chat?reflectionId=${encodeURIComponent(draft.id!)}`,{signal:controller.signal});const body=await response.json() as {turns:CoachTurn[];error?:string};if(!response.ok)throw new Error(body.error);if(alive)setTurns(current=>mergeCoachTurns(current,body.turns))}catch(e){if(alive)setError(e instanceof Error?e.message:tr('Chưa tải được gợi ý.'))}finally{if(alive)setLoading(false)}};
    void load();
    const timer=hasServerPending?setInterval(()=>void load(),3000):undefined;
    return()=>{alive=false;controller.abort();if(timer)clearInterval(timer)};
  // History loads independently of writing and never triggers inference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[draft.id,hasServerPending,language]);
  async function think(retry=false) {
    if(locked.current||hasServerPending||!editable||!aiReady||busy||loading||!hasContext)return;
    locked.current=true;setPending(true);setError('');
    try {
      let request=retry?attempt:null;
      if(!request){
        const context={title:draft.title,content:{...draft.content}};
        const saved=draft.id?{id:draft.id}:await ensureSaved();
        if(!saved)throw new Error(tr('Chưa thể lưu bài để nhận gợi ý.'));
        request={body:{...context,reflectionId:saved.id,clientId:crypto.randomUUID(),mode:'thinking',language,aiProvider:provider},snapshot};
        setAttempt(request);
      }
      const response=await fetch('/api/reflection-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request.body),signal:AbortSignal.timeout(290000)});
      const body=await response.json() as {turn:CoachTurn;error?:string};if(!response.ok)throw new Error(body.error||tr('AI chưa trả lời. Hãy thử lại.'));
      setTurns(rows=>mergeCoachTurns(rows.filter(row=>row.status!=='failed'),[body.turn]));
      setLastContext({id:body.turn.id,snapshot:request.snapshot});setAttempt(null);
    }catch(e){setError(e instanceof Error?e.message:tr('AI chưa trả lời. Hãy thử lại.'))}
    finally{locked.current=false;setPending(false)}
  }
  const time=(value:string)=>new Intl.DateTimeFormat(dateLocale(language),{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
  const earlier=suggestions.slice(0,-1).reverse().slice(0,5);
  return <section className="reflection-thinking" aria-label={tr('Gợi ý để viết tiếp')}>
    <button id="reflection-think-button" className="button primary full ai-ask" disabled={pending||hasServerPending||loading||busy||!editable||!aiReady||!hasContext} onClick={()=>void think()}><UiIcon name="idea" size={17}/>{tr(pending||hasServerPending?'Đang tư duy cùng bạn…':'Gợi ý để viết tiếp')}</button>
    {!hasContext&&editable&&<p className="writing-ai-hint">{tr('Viết vài ý hoặc thêm tệp để bắt đầu.')}</p>}
    {!aiReady&&<div className="notice">{tr('AI chưa được kết nối. Bạn vẫn có thể viết và lưu bài.')}</div>}
    {!editable&&<p className="writing-ai-hint">{tr('Bài đã khóa. Bạn có thể đọc lại các gợi ý.')}</p>}
    {error&&<div className="notice warning" role="alert">{tr(error)}{attempt&&<button className="text-button" disabled={pending||busy||!editable} onClick={()=>void think(true)}>{tr('Thử lại gợi ý')}</button>}</div>}
    <div className="reflection-thinking-output" aria-live="polite" aria-busy={pending||loading||hasServerPending}>
      {loading?<p className="muted">{tr('Đang tải gợi ý…')}</p>
      :pending||hasServerPending?<div className="ai-message" role="status"><span className="ai-avatar" aria-hidden="true"><UiIcon name="bot" size={16}/></span><div className="ai-bubble is-typing"><small>{tr('AI đang đọc bối cảnh của bạn…')}</small><p>{tr('Bạn cứ tiếp tục viết. Gợi ý sẽ xuất hiện ở đây khi hoàn tất.')}</p></div></div>
      :latest?<article className="ai-message thinking-suggestion"><span className="ai-avatar" aria-hidden="true"><UiIcon name="bot" size={16}/></span><div className="ai-bubble"><small>{tr('Gợi ý mới nhất')} · {time(latest.created_at)}</small>{stale&&<div className="notice warning">{tr('Bạn đã thay đổi bối cảnh. Bấm tư duy tiếp để nhận gợi ý mới.')}</div>}<p>{latest.translations?.[language]||latest.reply}</p></div></article>
      :<div className="ai-empty"><span aria-hidden="true"><UiIcon name="idea" size={20}/></span><b>{tr('Bí ý tưởng?')}</b><p>{tr('Bấm nút, AI sẽ hỏi bạn một câu để viết tiếp. AI không viết thay bạn.')}</p></div>}
    </div>
    {earlier.length>0&&<details className="thinking-history ai-history"><summary><span>{tr('{0} gợi ý trước đây',[suggestions.length-1])}</span><b>{tr('Xem lại')}</b></summary>{earlier.map(turn=><article key={turn.id}><small>{time(turn.created_at)}</small><p>{turn.translations?.[language]||turn.reply}</p></article>)}</details>}
  </section>;
}
