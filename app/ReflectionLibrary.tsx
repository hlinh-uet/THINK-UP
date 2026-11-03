'use client';

import {useState} from 'react';
import {defaultWeeks,statuses,type Reflection,type Week} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {filterReflections,type LibraryFilters} from '../lib/reflection-library';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import ReflectionNote from './ReflectionNote';
import ScopePicker from './ScopePicker';

type Props={reflections:Reflection[];weeks?:Week[];language:Language;onOpen:(r?:Reflection)=>void};
const step=18;

/** The student's writing archive, searchable by content, status and weekly topic. */
export default function ReflectionLibrary({reflections,weeks=defaultWeeks,language,onOpen}:Props){
 const [filters,setFilters]=useState<LibraryFilters>({search:'',status:'all',topic:'all',sort:'newest'}),[limit,setLimit]=useState(step);
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const statusOptions=[{value:'all',label:tr('Tất cả trạng thái')},...Object.entries(statuses).map(([value,label])=>({value,label:tr(label)}))];
 const topicOptions=[{value:'all',label:tr('Tất cả chủ đề')},...weeks.map(w=>({value:String(w.week),label:tr(w.title),code:tr('Tuần {0}',[w.week])}))];
 const sortOptions=[{value:'newest',label:tr('Mới nhất')},{value:'oldest',label:tr('Cũ nhất')}];
 const rows=filterReflections(reflections,filters,language);
 const shown=rows.slice(0,limit);
 function choose<K extends keyof LibraryFilters>(key:K,value:LibraryFilters[K]){setFilters(previous=>({...previous,[key]:value}));setLimit(step)}
 return <div className="reflection-library">
  <WorkspacePageHeading visible title={tr('Bài viết của tôi')}><button className="button primary" onClick={()=>onOpen()}><UiIcon name="add" size={16}/>{tr('Bài viết mới')}</button></WorkspacePageHeading>
  {reflections.length?<>
   <div className="library-filter-row" role="search" aria-label={tr('Lọc bài viết')}>
    <label className="library-search"><UiIcon name="search" size={19}/><input aria-label={tr('Tìm kiếm theo nội dung')} placeholder={tr('Tìm kiếm theo nội dung…')} value={filters.search} onChange={e=>choose('search',e.target.value)}/></label>
    <ScopePicker options={statusOptions} value={filters.status} label={statusOptions.find(o=>o.value===filters.status)!.label} ariaLabel={tr('Lọc trạng thái')} icon="document" showSelection={false} onChange={value=>choose('status',value)}/>
    <ScopePicker options={topicOptions} value={filters.topic} label={topicOptions.find(o=>o.value===filters.topic)?.label||tr('Tất cả chủ đề')} ariaLabel={tr('Lọc chủ đề')} icon="journey" showSelection={false} onChange={value=>choose('topic',value)}/>
    <ScopePicker options={sortOptions} value={filters.sort} label={sortOptions.find(o=>o.value===filters.sort)!.label} ariaLabel={tr('Sắp xếp')} icon="admin" showSelection={false} onChange={value=>choose('sort',value as LibraryFilters['sort'])}/>
   </div>
   {shown.length>0&&<ul className="library-legend" aria-label={tr('Chú thích màu')}>{(['draft','submitted','returned'] as const).map(key=><li key={key} className={`is-${key}`}><i aria-hidden="true"/>{tr(statuses[key])}</li>)}<li className="is-group"><i aria-hidden="true"/>{tr('Hoàn thành')}</li><li className="library-level-key">{tr('Mức độ phản tư')} 1–4</li></ul>}
   {shown.length?<div className="note-grid">{shown.map(r=><ReflectionNote key={r.id} reflection={r} language={language} onOpen={onOpen}/>)}</div>:<p className="library-empty">{tr('Không tìm thấy bài viết')}</p>}
   {rows.length>limit&&<button className="button library-more" onClick={()=>setLimit(limit+step)}>{tr('Xem thêm')}</button>}
  </>:<section className="library-empty is-first"><h2>{tr('Bắt đầu từ trải nghiệm của bạn')}</h2><button className="button primary" onClick={()=>onOpen()}>{tr('Viết reflection đầu tiên')}<UiIcon name="next" size={16}/></button></section>}
 </div>;
}
