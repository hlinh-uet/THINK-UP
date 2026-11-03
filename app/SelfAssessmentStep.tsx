'use client';

import {useState} from 'react';
import {blankAssessment,levelRanges,rubricVersion} from '../lib/assessment';
import type {AssessmentCriterion,Criterion,Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

type Props={reflection?:Reflection;rubric:Criterion[];language:Language;aiTotal?:number|null;ensureSaved:()=>Promise<Reflection|null>;onSaved:()=>Promise<unknown>};

/** Self-assessment as one row per criterion: pick a level 1–4, then give the evidence and reasons the form requires. */
export default function SelfAssessmentStep({reflection,rubric,language,aiTotal,ensureSaved,onSaved}:Props){
 const tr=(text:string)=>translate(text,language);
 const latest=reflection?.selfAssessments?.at(-1)?.payload.criteria as AssessmentCriterion[]|undefined;
 const [criteria,setCriteria]=useState<AssessmentCriterion[]>(()=>latest?.length===rubric.length?latest:blankAssessment(rubric));
 const [open,setOpen]=useState(-1),[busy,setBusy]=useState(false),[message,setMessage]=useState<{text:string;error?:boolean}|null>(null);
 const editable=!!reflection&&['draft','returned'].includes(reflection.status);
 const edit=(i:number,patch:Partial<AssessmentCriterion>)=>setCriteria(rows=>rows.map((c,j)=>i===j?{...c,...patch}:c));
 // Choosing a level gives it the middle score of that level's range; the score can still be adjusted.
 const pick=(i:number,level:number)=>{const [min,max]=levelRanges[level-1];edit(i,{level,score:Math.round((min+max)/2*10)/10});setOpen(i)};
 const chosen=criteria.filter(c=>c.level).length,weighted=chosen===rubric.length?Math.round(criteria.reduce((n,c,i)=>n+(c.score??0)*rubric[i].weight/100,0)*10)/10:null;
 async function save(){setBusy(true);setMessage(null);try{const current=await ensureSaved();if(!current)throw new Error(tr('Lưu bài trước khi tự đánh giá.'));const response=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'self-assess',id:current.id,rev:current.rev,criteria,rubricVersion:rubricVersion(rubric)})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error);await onSaved();setMessage({text:tr('Đã lưu phiếu tự đánh giá.')})}catch(e){setMessage({text:e instanceof Error?tr(e.message):tr('Chưa lưu được phiếu tự đánh giá.'),error:true})}finally{setBusy(false)}}
 return <section className="self-step" aria-label={tr('Tự đánh giá')}>
  <h4 className="ai-step-title"><UiIcon name="selfCheck" size={15}/>{tr('Tự đánh giá')}<em>{tr('Mức 1–4')}</em></h4>
  {!reflection?<p className="ai-step-empty">{tr('Lưu bài trước khi tự đánh giá.')}</p>:<>
   <ul className="self-step-list">{rubric.map((r,i)=>{const c=criteria[i];return <li key={r.key} className={open===i?'is-open':''}>
    <div className="self-step-row"><button type="button" className="self-step-name" aria-expanded={open===i} onClick={()=>setOpen(open===i?-1:i)}>{tr(r.name)}<UiIcon name="chevron" size={13}/></button>
     <span className="self-step-levels" role="radiogroup" aria-label={tr(r.name)}>{[1,2,3,4].map(n=><button type="button" key={n} role="radio" aria-checked={c.level===n} className={c.level===n?'is-on':''} disabled={!editable||busy} onClick={()=>pick(i,n)}>{n}</button>)}</span></div>
    {open===i&&<div className="self-step-detail">
     {c.level&&<p className="self-step-desc">{tr(r.descriptions[c.level-1])}</p>}
     <label>{tr('Minh chứng nguyên văn')}<textarea rows={2} maxLength={3000} value={c.evidence} disabled={!editable||busy} placeholder={tr('Sao chép đúng đoạn từ bài viết để làm căn cứ.')} onChange={e=>edit(i,{evidence:e.target.value})}/></label>
     {c.level===1&&!c.evidence.trim()&&<label>{tr('Xác nhận thành phần còn thiếu')}<textarea rows={2} maxLength={3000} value={c.missingReason||''} disabled={!editable||busy} onChange={e=>edit(i,{missingReason:e.target.value})}/></label>}
     <label>{tr('Giải thích đánh giá')}<textarea rows={2} maxLength={3000} value={c.reason} disabled={!editable||busy} onChange={e=>edit(i,{reason:e.target.value})}/></label>
     <label>{tr('Hướng cải thiện')}<textarea rows={2} maxLength={3000} value={c.improvement} disabled={!editable||busy} onChange={e=>edit(i,{improvement:e.target.value})}/></label>
    </div>}
   </li>})}</ul>
   {(weighted!==null||aiTotal!=null)&&<p className="self-step-compare"><span>{tr('Bạn tự chấm')} <b>{weighted===null?'—':`${weighted}/10`}</b></span><span>{tr('AI chấm thử')} <b>{aiTotal==null?'—':`${aiTotal}/10`}</b></span></p>}
   {message&&<p className={`self-step-message${message.error?' is-error':''}`} role="status">{message.text}</p>}
   {editable&&<button type="button" className="button full ai-step-run" disabled={busy||chosen<rubric.length} onClick={()=>void save()}>{tr(busy?'Đang lưu…':'Lưu phiếu tự đánh giá')}</button>}
  </>}
 </section>;
}
