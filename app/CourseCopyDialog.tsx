'use client';
import { useState } from 'react';
import { anchorWeek, shiftedDueDates, type CourseCopyParts } from '../lib/course-copy';
import { courseForEditing } from '../lib/demo-i18n';
import type { Course } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { describeCommitmentDeadline } from './CourseChangeHistory';
import CreateDialog from './CreateDialog';
import UiIcon from './UiIcon';

const shortDate=(value:string)=>value.split('-').reverse().join('/');

export default function CourseCopyDialog({course,sources,language,onApply,onClose}:{course:Course;sources:Course[];language:Language;onApply:(source:Course,parts:CourseCopyParts,anchorDue:string)=>void;onClose:()=>void}) {
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const [sourceId,setSourceId]=useState(sources[0]?.id||''),[parts,setParts]=useState<CourseCopyParts>({rubric:true,content:true,due:true,commitment:true}),[dates,setDates]=useState<Record<string,string>>({});
 const source=sources.find(c=>c.id===sourceId),shown=source&&courseForEditing(source,language),anchor=source&&anchorWeek(source.weeks);
 const canDue=!!anchor,wantsDue=parts.due&&canDue,anchorDue=anchor?(dates[sourceId]??course.weeks.find(w=>w.week===anchor.week)?.due??''):'';
 const nextDates=wantsDue&&anchorDue&&source?shiftedDueDates(source.weeks,anchorDue):[],lastDue=nextDates.filter(Boolean).at(-1);
 const dated=source?.weeks.filter(w=>w.due)||[],fixedDeadline=parts.commitment&&source?.commitmentDeadline?.kind==='fixed';
 const canCommitment=!!source?.commitmentDeadline,chosen:CourseCopyParts={...parts,due:wantsDue,commitment:parts.commitment&&canCommitment},ready=!!source&&(chosen.rubric||chosen.content||chosen.due||chosen.commitment)&&(!wantsDue||!!anchorDue);
 const option=(key:keyof CourseCopyParts,title:string,detail:string,disabled=false)=><label className="course-copy-part" key={key}><input type="checkbox" disabled={disabled} checked={parts[key]&&!disabled} onChange={e=>setParts({...parts,[key]:e.target.checked})}/><span>{tr(title)}<small>{detail}</small></span></label>;
 return <CreateDialog title={tr('Sao chép từ học phần khác')} closeLabel={tr('Đóng')} onClose={onClose}>
  {!source||!shown?<div className="course-copy"><p className="lx-muted">{tr('Bạn chưa có học phần nào khác để sao chép. Khi được phân công thêm học phần, học phần đó sẽ hiện ở đây.')}</p><div className="course-copy-actions"><button type="button" className="lx-btn" onClick={onClose}>{tr('Đóng')}</button></div></div>
  :<div className="course-copy">
   <label className="lx-field"><span>{tr('Học phần nguồn')}</span><select value={sourceId} onChange={e=>setSourceId(e.target.value)}>{sources.map(c=>{const name=courseForEditing(c,language).name;return <option key={c.id} value={c.id}>{c.code} · {name}{c.className&&c.className!==c.code?` · ${c.className}`:''}</option>})}</select></label>
   <fieldset className="course-copy-parts"><legend>{tr('Phần muốn sao chép')}</legend>
    {option('rubric','Rubric đánh giá',`${tr('Trọng số và mô tả các mức')} · ${shown.rubric.map(c=>`${c.weight}%`).join(' / ')}`)}
    {option('content','Nội dung và yêu cầu các tuần',tr('Tiêu đề, câu hỏi gợi ý và yêu cầu bài tập của {0} tuần',[shown.weeks.length]))}
    {option('due','Hạn nộp',canDue?`${shortDate(dated[0].due)} – ${shortDate(dated[dated.length-1].due)}`:tr('Học phần này chưa có hạn nộp'),!canDue)}
    {wantsDue&&anchor&&<div className="course-copy-due"><label className="lx-field"><span>{tr('Hạn nộp mới của tuần {0}',[anchor.week])}</span><input type="date" value={anchorDue} onChange={e=>setDates({...dates,[sourceId]:e.target.value})}/></label><p>{lastDue?tr('Các tuần sau dời theo đúng khoảng cách cũ, tuần cuối là {0}.',[shortDate(lastDue)]):tr('Chọn ngày này để các tuần sau tự dời theo.')}</p></div>}
    {option('commitment','Hạn cam kết',canCommitment?describeCommitmentDeadline(source.commitmentDeadline,language):tr('Học phần này chưa đặt hạn cam kết'),!canCommitment)}
   </fieldset>
   {fixedDeadline&&<p className="course-copy-warn"><UiIcon name="help" size={15}/>{tr('Hạn cam kết này là một ngày cố định và không tự dời. Hãy kiểm tra lại ở tab Hạn cam kết.')}</p>}
   <p className="lx-muted course-copy-note">{tr('Các phần đã chọn sẽ thay nội dung đang có. Chưa có gì được ghi cho đến khi bạn bấm Lưu cấu hình.')}</p>
   <div className="course-copy-actions"><button type="button" className="lx-btn" onClick={onClose}>{tr('Hủy')}</button><button type="button" className="lx-btn is-primary" disabled={!ready} onClick={()=>onApply(source,chosen,anchorDue)}>{tr('Sao chép vào bản nháp')}</button></div>
  </div>}
 </CreateDialog>;
}
