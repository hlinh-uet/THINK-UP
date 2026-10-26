'use client';
import {useState} from 'react';
import {diffText} from '../lib/revision-diff';
import {reflectionText} from '../lib/student-editor';
import {demoContent,demoText} from '../lib/demo-i18n';
import {stageLabel,translate,type Language} from '../lib/i18n';
import type {Reflection,Version} from '../lib/domain';
export default function RevisionComparison({reflection:r,language,open}:{reflection:Reflection;language:Language;open?:boolean}){
 const tr=(s:string)=>translate(s,language),[left,setLeft]=useState(r.versions.at(-1)?.id||''),[right,setRight]=useState(r.latestVersion);
 const a=r.versions.find(v=>v.id===left),b=r.versions.find(v=>v.id===right);
 function scores(v:Version){const review=r.reviews.find(g=>g.versionId===v.id&&g.decision==='final'),analysis=r.analyses.find(g=>g.versionId===v.id&&g.kind==='feedback');return {criteria:review?.criteria,rubric:review?.rubric||analysis?.rubric,values:review?.scores||analysis?.result.criteria.map(c=>c.score),scale:review?.scoreScale||analysis?.result.scoreScale||4,total:review?.total??analysis?.result.total};}
 const av=a?scores(a):null,bv=b?scores(b):null;
 return <details className="panel section-margin revision-comparison" open={open}><summary>{tr('So sánh phiên bản và điểm rubric')}</summary>
  <div className="form-grid">{[[left,setLeft,'Phiên bản trước'],[right,setRight,'Phiên bản sau']].map(([value,change,label],i)=><label className="field" key={i}>{tr(label as string)}<select value={value as string} onChange={e=>(change as (s:string)=>void)(e.target.value)}>{r.versions.map(v=><option key={v.id} value={v.id}>{stageLabel(v.stage,language)} · {new Date(v.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</option>)}</select></label>)}</div>
  {a&&b&&<><p><span className="diff-added">{tr('Thêm')}</span> · <span className="diff-removed">{tr('Xóa')}</span></p><div className="diff-content">{diffText(reflectionText(demoContent(a.content,r.id,language)),reflectionText(demoContent(b.content,r.id,language))).map((p,i)=>p.kind==='added'?<ins key={i}>{p.text}</ins>:p.kind==='removed'?<del key={i}>{p.text}</del>:<span key={i}>{p.text}</span>)}</div>
   <div className="table-scroll"><table><thead><tr><th>{tr('Tiêu chí')}</th><th>{tr('Phiên bản trước')}</th><th>{tr('Phiên bản sau')}</th></tr></thead><tbody>{(bv?.rubric||av?.rubric||[]).map(c=>{const score=(v:typeof av)=>{const index=v?.rubric?.findIndex(r=>r.key===c.key)??-1;return index<0||v?.values?.[index]==null?'—':`${v.values[index]}/${v.scale}`;};return <tr key={c.key}><td>{tr(c.name)}</td><td>{score(av)}</td><td>{score(bv)}</td></tr>})}<tr><td>{tr('Điểm tổng')}</td><td>{av?.total??'—'}</td><td>{bv?.total??'—'}</td></tr></tbody></table></div>
   <p className="muted">{tr('Giữ thang điểm và rubric gốc của từng lần đánh giá. Điểm tăng ở một bài chưa đủ để kết luận năng lực phát triển bền vững.')}</p>
   {r.reviews.filter(g=>g.createdAt>=a.createdAt&&g.createdAt<=b.createdAt).map(g=><blockquote key={g.id}>{demoText(g.comment,g.id,language)}</blockquote>)}
  </>}
 </details>;
}
