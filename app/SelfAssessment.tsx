'use client';
import {useState} from 'react';
import {blankAssessment,rubricVersion} from '../lib/assessment';
import type {Criterion,Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import AssessmentFields from './AssessmentFields';
export default function SelfAssessment({reflection,rubric,language,ensureSaved,onSaved}:{reflection:Reflection;rubric:Criterion[];language:Language;ensureSaved:()=>Promise<Reflection|null>;onSaved:()=>Promise<unknown>}){
 const tr=(s:string)=>translate(s,language),[criteria,setCriteria]=useState(()=>blankAssessment(rubric)),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(){setBusy(true);setMessage('');try{const current=await ensureSaved();if(!current)throw new Error(tr('Lưu bài trước khi tự đánh giá.'));const response=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'self-assess',id:current.id,rev:current.rev,criteria,rubricVersion:rubricVersion(rubric)})});const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error);await onSaved();setMessage(tr('Đã lưu phiếu tự đánh giá.'))}catch(e){setMessage(e instanceof Error?e.message:tr('Chưa lưu được phiếu tự đánh giá.'))}finally{setBusy(false)}}
 return <details className="self-assessment section-margin"><summary>{tr('Phiếu tự đánh giá trước khi nộp')}</summary><p>{tr('Tự chọn Level, điểm và minh chứng cho từng tiêu chí. Phiếu này không thay điểm giảng viên.')}</p>
  {['draft','returned'].includes(reflection.status)&&<><AssessmentFields criteria={criteria} rubric={rubric} language={language} attachments={reflection.attachments} disabled={busy} onChange={setCriteria}/><button className="button" disabled={busy} onClick={()=>void save()}>{tr('Lưu phiếu tự đánh giá')}</button></>}
  {message&&<p role="status">{message}</p>}{reflection.selfAssessments?.map(a=><details key={a.id}><summary>{new Date(a.createdAt).toLocaleString()} · {String(a.payload.total)}/10</summary><div>{(a.payload.criteria as import('../lib/domain').AssessmentCriterion[]).map(c=><article key={c.key}><b>{tr(rubric.find(r=>r.key===c.key)?.name||c.key)} · Level {c.level} · {c.score}/10</b><blockquote>{c.evidence||c.missingReason}</blockquote><p>{c.reason}</p><p>{c.improvement}</p></article>)}</div></details>)}
 </details>;
}
