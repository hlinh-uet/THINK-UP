'use client';
import {useState} from 'react';
import {translate,type Language} from '../lib/i18n';
export default function ArchivePanel({language,onChanged}:{language:Language;onChanged:()=>Promise<unknown>}){
 const tr=(s:string)=>translate(s,language),[rows,setRows]=useState<{id:string;title:string;week:number}[]>([]),[message,setMessage]=useState(''),[loaded,setLoaded]=useState(false);
 async function load(){try{const res=await fetch('/api/learning?mode=archives'),body=await res.json() as {error?:string;archived:{id:string;title:string;week:number}[]};if(!res.ok)throw new Error(body.error);setRows(body.archived);setLoaded(true)}catch(e){setMessage(e instanceof Error?e.message:tr('Thao tác chưa hoàn tất.'))}}
 return <details className="panel section-margin archive-panel" onToggle={e=>{if(e.currentTarget.open&&!loaded)void load()}}><summary>{tr('Bài đã lưu trữ')}</summary>{message&&<p role="status">{message}</p>}{rows.map(r=><div key={r.id}><span>T{r.week} · {r.title}</span><button className="text-button" onClick={async()=>{try{const res=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'restore-reflection',id:r.id})}),body=await res.json() as {error?:string;archived:{id:string;title:string;week:number}[]};if(!res.ok)throw new Error(body.error);await onChanged();await load()}catch(e){setMessage(e instanceof Error?e.message:tr('Thao tác chưa hoàn tất.'))}}}>{tr('Khôi phục bài')}</button></div>)}{loaded&&!rows.length&&<p>{tr('Chưa có bài lưu trữ.')}</p>}</details>;
}
