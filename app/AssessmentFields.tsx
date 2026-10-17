'use client';
import type {AssessmentCriterion,Attachment,Criterion} from '../lib/domain';
import {levelRanges} from '../lib/assessment';
import {translate,type Language} from '../lib/i18n';
export default function AssessmentFields({criteria,rubric,attachments=[],language,disabled=false,collapsible=false,onChange}:{criteria:AssessmentCriterion[];rubric:Criterion[];attachments?:Attachment[];language:Language;disabled?:boolean;collapsible?:boolean;onChange:(value:AssessmentCriterion[])=>void}){
 const tr=(s:string)=>translate(s,language);
 function edit(i:number,patch:Partial<AssessmentCriterion>){onChange(criteria.map((c,j)=>i===j?{...c,...patch}:c));}
 return <div className="assessment-fields">{rubric.map((r,i)=>{const c=criteria[i];if(!c)return null;const fields=<fieldset className="grade-criterion" key={r.key} disabled={disabled}>
  <legend>{tr(r.name)} <small>{r.weight}%</small></legend>
  <div className="form-grid"><label className="field">Level<select value={c.level??''} onChange={e=>edit(i,{level:e.target.value?Number(e.target.value):null,score:null})}><option value="">{tr('Chọn Level')}</option>{levelRanges.map(([min,max],j)=><option key={j} value={j+1}>Level {j+1} · {min}–{max}/10</option>)}</select></label>
  <label className="field">{tr('Điểm tiêu chí /10')}<input type="number" step="0.1" min={c.level?levelRanges[c.level-1][0]:0} max={c.level?levelRanges[c.level-1][1]:10} disabled={disabled||!c.level} value={c.score??''} onChange={e=>edit(i,{score:e.target.value===''?null:Number(e.target.value)})}/></label></div>
  {c.level&&<p className="muted">{tr(r.descriptions[c.level-1])}</p>}
  <label className="field">{tr('Minh chứng nguyên văn')}<textarea rows={2} maxLength={3000} value={c.evidence} onChange={e=>edit(i,{evidence:e.target.value})} placeholder={tr('Sao chép đúng đoạn từ bài viết để làm căn cứ.')}/></label>
  {r.key==='evidenceContext'&&attachments.length>0&&<div className="evidence-options">{attachments.map(a=><label key={a.id}><input type="checkbox" checked={c.attachmentNames.includes(a.name)} onChange={e=>edit(i,{attachmentNames:e.target.checked?[...c.attachmentNames,a.name]:c.attachmentNames.filter(n=>n!==a.name)})}/>{a.name}</label>)}</div>}
  {c.level===1&&!c.evidence.trim()&&!c.attachmentNames.length&&<label className="field">{tr('Xác nhận thành phần còn thiếu')}<textarea rows={2} maxLength={3000} value={c.missingReason||''} onChange={e=>edit(i,{missingReason:e.target.value})} placeholder={tr('Giải thích rõ thành phần chưa xuất hiện; tối thiểu 10 ký tự.')}/></label>}
  <label className="field">{tr('Giải thích đánh giá')}<textarea rows={2} maxLength={3000} value={c.reason} onChange={e=>edit(i,{reason:e.target.value})}/></label>
  <label className="field">{tr('Hướng cải thiện')}<textarea rows={2} maxLength={3000} value={c.improvement} onChange={e=>edit(i,{improvement:e.target.value})}/></label>
 </fieldset>;return collapsible?<details className="assessment-criterion" key={r.key} open={i===0}><summary><span><b>{tr(r.name)}</b><small>{r.weight}%</small></span><span className="criterion-result">{c.score===null?'—':`${c.score}/10`}</span></summary>{fields}</details>:fields;})}</div>;
}
