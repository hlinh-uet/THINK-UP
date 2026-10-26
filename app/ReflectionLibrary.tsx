'use client';

import {useState} from 'react';
import {statuses,type Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import ReflectionNote from './ReflectionNote';

type Props={reflections:Reflection[];language:Language;onOpen:(r?:Reflection)=>void};
const step=18;

/** The student's writing archive as a grid of notes, latest week first. */
export default function ReflectionLibrary({reflections,language,onOpen}:Props){
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[limit,setLimit]=useState(step);
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const title=(r:Reflection)=>demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên');
 const query=search.trim().toLocaleLowerCase();
 const rows=reflections.filter(r=>(filter==='all'||r.status===filter)&&title(r).toLocaleLowerCase().includes(query)).sort((a,b)=>b.week-a.week||b.updatedAt.localeCompare(a.updatedAt));
 const shown=rows.slice(0,limit);
 function choose(next:string){setFilter(next);setLimit(step)}
 return <div className="reflection-library">
  <WorkspacePageHeading visible title={tr('Bài viết của tôi')}><button className="button primary" onClick={()=>onOpen()}><UiIcon name="add" size={16}/>{tr('Bài viết mới')}</button></WorkspacePageHeading>
  {reflections.length?<>
   <div className="library-toolbar">
    <div className="library-filters" role="group" aria-label={tr('Lọc trạng thái')}>{[['all',tr('Tất cả')],...Object.entries(statuses).map(([key,label])=>[key,tr(label)])].map(([key,label])=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>choose(key)}>{label}</button>)}</div>
    <label className="library-search"><UiIcon name="search" size={17}/><input aria-label={tr('Tìm bài reflection')} placeholder={tr('Tìm bài viết…')} value={search} onChange={e=>{setSearch(e.target.value);setLimit(step)}}/></label>
   </div>
   {shown.length?<div className="note-grid">{shown.map(r=><ReflectionNote key={r.id} reflection={r} language={language} onOpen={onOpen}/>)}</div>:<p className="library-empty">{tr('Không tìm thấy bài viết')}</p>}
   {rows.length>limit&&<button className="button library-more" onClick={()=>setLimit(limit+step)}>{tr('Xem thêm')}</button>}
  </>:<section className="library-empty is-first"><h2>{tr('Bắt đầu từ trải nghiệm của bạn')}</h2><button className="button primary" onClick={()=>onOpen()}>{tr('Viết reflection đầu tiên')}<UiIcon name="next" size={16}/></button></section>}
 </div>;
}
