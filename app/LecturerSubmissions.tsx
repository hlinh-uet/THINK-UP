'use client';
import { useState } from 'react';
import type { Course, Criterion, Reflection } from '../lib/domain';
import { currentFeedback, finalReview } from '../lib/progress';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import UserAvatar from './UserAvatar';
import { StatusTag, daysSince, formatDate } from './LecturerKit';

export type SubmissionFilters = { status:string; week:string; q:string; criterion:string; level:string; sort:string };

const tabs=[['submitted','Chờ duyệt'],['returned','Đang chỉnh sửa'],['final','Đã hoàn tất'],['all','Tất cả']] as const;

/** Every submitted reflection in scope as one sortable table; the status tabs answer "what is waiting for me". */
export default function LecturerSubmissions({language,filters,onFilters,rows,all,courses,rubric,detailHref,studentHref}:{
  language:Language; filters:SubmissionFilters; onFilters:(next:Partial<SubmissionFilters>)=>void; rows:Reflection[]; all:Reflection[];
  courses:Course[]; rubric:Criterion[]; detailHref:(id:string)=>string; studentHref:(id:string)=>string;
}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [now]=useState(()=>Date.now());
  const filtered=!!(filters.week||filters.q||filters.criterion||filters.level);
  return <div className="lx-stack">
    <nav className="lx-tabs" aria-label={tr('Lọc bài nộp')}>
      {tabs.map(([key,label])=><button key={key} type="button" aria-pressed={filters.status===key} onClick={()=>onFilters({status:key})}>
        {tr(label)}<span>{all.filter(r=>key==='all'||r.status===key).length}</span>
      </button>)}
    </nav>

    <div className="lx-filters">
      <label className="lx-search"><UiIcon name="search" size={15}/><input aria-label={tr('Tìm bài hoặc sinh viên')} maxLength={200} value={filters.q} placeholder={tr('Tìm theo tên, email hoặc tiêu đề…')} onChange={e=>onFilters({q:e.target.value})}/></label>
      <select aria-label={tr('Lọc theo tuần')} value={filters.week} onChange={e=>onFilters({week:e.target.value})}><option value="">{tr('Tất cả tuần')}</option>{Array.from({length:9},(_,i)=><option key={i} value={i+1}>{tr('Tuần {0}',[i+1])}</option>)}</select>
      <select aria-label={tr('Lọc theo tiêu chí')} value={filters.criterion} onChange={e=>onFilters({criterion:e.target.value,level:e.target.value?filters.level:''})}><option value="">{tr('Tất cả tiêu chí')}</option>{rubric.map(c=><option key={c.key} value={c.key}>{tr(c.name)}</option>)}</select>
      <select aria-label="Level" value={filters.level} disabled={!filters.criterion} onChange={e=>onFilters({level:e.target.value})}><option value="">{tr('Mọi Level')}</option>{[1,2,3,4].map(n=><option key={n} value={n}>Level {n}</option>)}</select>
      <select aria-label={tr('Sắp xếp')} value={filters.sort} onChange={e=>onFilters({sort:e.target.value})}>{[['oldest','Chờ lâu nhất trước'],['newest','Mới cập nhật trước'],['name','Theo tên sinh viên']].map(([value,label])=><option key={value} value={value}>{tr(label)}</option>)}</select>
      {filtered&&<button type="button" className="lx-link" onClick={()=>onFilters({week:'',q:'',criterion:'',level:''})}>{tr('Xóa bộ lọc')}</button>}
    </div>

    <div className="lx-table-wrap">
      <table className="lx-table lx-submissions">
        <thead><tr>
          <th>{tr('Sinh viên')}</th><th>{tr('Bài reflection')}</th><th>{tr('Tuần')}</th><th>{tr('Trạng thái')}</th>
          <th className="is-num">{tr('AI đề xuất')}</th><th className="is-num">{tr('Điểm cuối')}</th><th className="is-num">{tr('Cập nhật')}</th>
        </tr></thead>
        <tbody>{rows.map(r=>{
          const final=finalReview(r),proposal=currentFeedback(r),course=courses.find(c=>c.id===r.courseId),wait=daysSince(r.updatedAt,now);
          return <tr key={r.id}>
            <td><a className="lx-person" href={studentHref(r.userId)}><UserAvatar person={{name:r.studentName||'?'}}/><span><b>{r.studentName}</b><small>{r.studentEmail}</small></span></a></td>
            <td className="lx-title-cell"><a className="lx-row-link" href={detailHref(r.id)}>{demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên')}</a><small>{course?.code}{r.versions.length>1&&<> · {tr('{0} phiên bản',[r.versions.length])}</>}</small></td>
            <td><span className="lx-week-tile">{tr('T{0}',[r.week])}</span></td>
            <td><StatusTag status={r.status} language={language}/></td>
            <td className="is-num lx-muted">{proposal?.result.total!=null?proposal.result.total.toFixed(2):'—'}</td>
            <td className="is-num"><b>{final?.total!=null?final.total.toFixed(2):'—'}</b></td>
            <td className="is-num">{r.status==='submitted'?<span className={`lx-wait${wait>=7?' is-late':''}`}>{wait?tr('{0} ngày',[wait]):tr('Hôm nay')}</span>:<span className="lx-muted">{formatDate(r.updatedAt,language)}</span>}</td>
          </tr>})}</tbody>
      </table>
      {!rows.length&&<div className="lx-table-empty">
        <p>{tr(filters.status==='submitted'&&!filtered?'Không có bài nào đang chờ duyệt.':'Không có bài phù hợp bộ lọc.')}</p>
        {(filtered||filters.status!=='all')&&<button type="button" className="lx-btn" onClick={()=>onFilters({status:'all',week:'',q:'',criterion:'',level:''})}>{tr('Xem tất cả bài nộp')}</button>}
      </div>}
    </div>
  </div>;
}
