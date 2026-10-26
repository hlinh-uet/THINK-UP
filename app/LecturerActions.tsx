'use client';
import {useState} from 'react';
import type {Action,Reflection,User} from '../lib/domain';
import {demoText} from '../lib/demo-i18n';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';
import {dayKey,formatDate} from './LecturerKit';

export const planLabels:Record<string,string>={todo:'Chưa thực hiện',in_progress:'Đang thực hiện',done:'Đã hoàn thành',needs_adjustment:'Cần điều chỉnh'};

/** Action plans committed after a reflection, with their follow-up evidence (spec 2.7). Each row opens to the details. */
export default function LecturerActions({actions,reflections,users,language,hideSource=false,hideStudent=false,detailHref,limit}:{
 actions:Action[];reflections:Reflection[];users:User[];language:Language;hideSource?:boolean;hideStudent?:boolean;detailHref?:(id:string)=>string;limit?:number;
}){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const [status,setStatus]=useState('all'),[expanded,setExpanded]=useState(false);
 const [today]=useState(()=>dayKey(Date.now()));
 const href=(id:string)=>detailHref?detailHref(id):`/lecturer/submissions/${encodeURIComponent(id)}`;
 const rows=actions.filter(a=>status==='all'||a.status===status).sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||(a.due||'9').localeCompare(b.due||'9'));
 const dt=(text:string,id:string)=>demoText(text,id,language);
 if(!actions.length)return <p className="lx-empty-line">{tr('Chưa có cam kết được chia sẻ từ bài nộp trong phạm vi này.')}</p>;
 return <div className="lx-stack is-tight">
  <nav className="lx-tabs is-compact" aria-label={tr('Trạng thái')}>
   {['all',...Object.keys(planLabels)].map(key=><button key={key} type="button" aria-pressed={status===key} onClick={()=>setStatus(key)}>{tr(key==='all'?'Tất cả':planLabels[key])}<span>{actions.filter(a=>key==='all'||a.status===key).length}</span></button>)}
  </nav>
  <ul className="lx-plans">{(limit&&!expanded?rows.slice(0,limit):rows).map(a=>{
   const source=reflections.find(r=>r.id===a.reflectionId),follow=reflections.find(r=>r.id===a.followUpReflectionId),late=!!a.due&&a.due<today&&a.status!=='done';
   const files=[...(source?.attachments.filter(f=>a.attachmentIds?.includes(f.id)).map(f=>({...f,href:`/api/files/${f.id}`}))||[]),...(a.evidenceFiles?.map(f=>({...f,href:`/api/action-evidence/${f.id}`}))||[])];
   return <li key={a.id}><details>
    <summary>
     <span className={`lx-plan-dot is-${a.status}`} aria-hidden="true"/>
     <span className="lx-plan-main"><b>{dt(a.text,a.id)}</b><small>{!hideStudent&&<>{users.find(u=>u.id===a.userId)?.name} · </>}{!hideSource&&source&&<>{demoText(source.title,source.id,language)} · </>}{tr(planLabels[a.status]||a.status)}</small></span>
     <span className={`lx-plan-due${late?' is-late':''}`}>{a.due?formatDate(a.due+'T12:00:00+07:00',language):'—'}{late&&<small>{tr('Quá hạn')}</small>}</span>
     <UiIcon name="chevron" size={14}/>
    </summary>
    <dl className="lx-facts">
     {source&&!hideSource&&<div><dt>{tr('Từ bài viết')}</dt><dd><a className="lx-link" href={href(source.id)}>{demoText(source.title,source.id,language)}</a></dd></div>}
     <div><dt>{tr('Tiêu chí hoàn thành')}</dt><dd>{a.successCriteria?dt(a.successCriteria,a.id):'—'}</dd></div>
     <div><dt>{tr('Kết quả và rào cản')}</dt><dd>{a.review?dt(a.review,a.id):'—'}</dd></div>
     <div><dt>{tr('Minh chứng thực hiện')}</dt><dd>{a.evidence?dt(a.evidence,a.id):files.length?'':'—'}{files.length>0&&<span className="lx-files is-inline">{files.map(f=><a key={f.id} className="lx-file" href={f.href}><UiIcon name="attachment" size={13}/>{f.name}</a>)}</span>}</dd></div>
     {follow&&<div><dt>{tr('Reflection tiếp nối')}</dt><dd><a className="lx-link" href={href(follow.id)}>{demoText(follow.title,follow.id,language)}</a></dd></div>}
     {!!a.history?.length&&<div><dt>{tr('Lịch sử điều chỉnh cam kết')}</dt><dd><ol className="lx-mini-history">{a.history.map(h=><li key={h.id}><small>{formatDate(h.createdAt,language,true)}</small> {String(h.payload.text)} · {tr(planLabels[String(h.payload.status)]||String(h.payload.status))}{h.payload.review?<> — {String(h.payload.review)}</>:null}</li>)}</ol></dd></div>}
    </dl>
   </details></li>})}</ul>
  {limit&&!expanded&&rows.length>limit&&<button type="button" className="lx-link" onClick={()=>setExpanded(true)}>{tr('Xem tất cả {0} cam kết',[rows.length])}</button>}
  <p className="lx-footnote">{tr('Kết quả hành động không tự thay đổi điểm reflection. Sinh viên có thể giải thích rào cản và điều chỉnh kế hoạch.')}</p>
 </div>;
}
