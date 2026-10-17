'use client';
import {useState} from 'react';
import {translate,type Language} from '../lib/i18n';
import type {Action,Reflection,User} from '../lib/domain';
export default function ActionMonitoring({actions,reflections,users,language}:{actions:Action[];reflections:Reflection[];users:User[];language:Language}){
 const tr=(s:string)=>translate(s,language),[status,setStatus]=useState('all');
 const labels:Record<string,string>={todo:'Chưa bắt đầu',in_progress:'Đang thực hiện',done:'Hoàn thành',needs_adjustment:'Cần điều chỉnh'};
 const done=actions.filter(a=>a.status==='done').length;
 return <section className="panel section-margin action-monitoring"><div className="section-head"><h3>{tr('Theo dõi kế hoạch hành động')}</h3><label className="field">{tr('Trạng thái')}<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{tr('Tất cả')}</option>{Object.entries(labels).map(([k,label])=><option key={k} value={k}>{tr(label)}</option>)}</select></label></div>
  <p>{done}/{actions.length} {tr('cam kết hoàn thành')}{actions.length?` · ${(done/actions.length*100).toFixed(1)}%`:''}</p><p className="muted">{tr('Kết quả hành động không tự thay đổi điểm reflection. Sinh viên có thể giải thích rào cản và điều chỉnh kế hoạch.')}</p>
  {actions.filter(a=>status==='all'||a.status===status).map(a=>{const source=reflections.find(r=>r.id===a.reflectionId),follow=reflections.find(r=>r.id===a.followUpReflectionId);return <article className="journey-action" key={a.id}>
   <div className="section-head"><h4>{a.text}</h4><span className="badge">{tr(labels[a.status]||a.status)}</span></div><small>{users.find(u=>u.id===a.userId)?.name} · {source?.title} · {tr('Hạn')}: {a.due||'—'}</small>
   <p><b>{tr('Tiêu chí hoàn thành')}: </b>{a.successCriteria||'—'}</p><p><b>{tr('Kết quả và rào cản')}: </b>{a.review||'—'}</p><p><b>{tr('Minh chứng thực hiện')}: </b>{a.evidence||'—'}</p>
   {source?.attachments.filter(f=>a.attachmentIds?.includes(f.id)).map(f=><a className="file-chip" key={f.id} href={`/api/files/${f.id}`}>{f.name}</a>)}
   {a.evidenceFiles?.map(f=><a className="file-chip" key={f.id} href={`/api/action-evidence/${f.id}`}>{f.name}</a>)}{follow&&<p>{tr('Reflection tiếp nối')}: <button className="text-button" onClick={()=>location.assign(location.pathname.startsWith('/admin')?`/admin/submissions?reflection=${encodeURIComponent(follow.id)}`:`/lecturer/submissions/${encodeURIComponent(follow.id)}`)}>{follow.title}</button></p>}
   {!!a.history?.length&&<details><summary>{tr('Lịch sử điều chỉnh cam kết')}</summary>{a.history.map(h=><article key={h.id}><small>{new Date(h.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</small><p>{String(h.payload.text)} · {tr(labels[String(h.payload.status)]||String(h.payload.status))}</p><p>{String(h.payload.review||'')}</p></article>)}</details>}
  </article>})}{!actions.length&&<p>{tr('Chưa có cam kết được chia sẻ từ bài nộp trong phạm vi này.')}</p>}
 </section>;
}
