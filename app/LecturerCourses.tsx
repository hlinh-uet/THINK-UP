'use client';
import { useState, type FormEvent } from 'react';
import { validateRubric, validateWeeks, type Course, type Criterion, type LearningRecord, type Week } from '../lib/domain';
import { courseForEditing, courseToStore, demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import { lecturerHref, type LecturerQuery } from '../lib/lecturer-pages';
import type { LecturerMutation } from './LecturerWorkspace';
import { useUnsavedChanges } from './useUnsavedChanges';
import DefaultConfigurationFields from './DefaultConfigurationFields';
import RubricSuggestion from './RubricSuggestion';
import CourseRubricEditor from './CourseRubricEditor';
import CourseChangeHistory from './CourseChangeHistory';
import CourseCopyDialog from './CourseCopyDialog';
import { copyCourseSettings, type CourseCopyParts } from '../lib/course-copy';
import { courseHistoryEntries } from '../lib/course-history';
import UiIcon from './UiIcon';
import {deadlineFromInput,deadlineInput,validateCommitmentDeadline} from '../lib/commitment-deadline';

type Props={query?:LecturerQuery;courses:Course[];teachingCourses?:Course[];memberships:{courseId:string;userId:string}[];records:LearningRecord[];selectedCourseId:string;language:Language;busy:string;onMutate:LecturerMutation};
export default function LecturerCourses({query={},courses,teachingCourses=courses,memberships,records,selectedCourseId,language,busy,onMutate}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const selected=courses.find(c=>c.id===selectedCourseId);
  if(selected)return <CourseSettings key={selected.id+language} sources={teachingCourses} initialSection={query.tab==='commitments'?'commitments':undefined} course={selected} listHref={lecturerHref('courses',{cohort:query.cohort})} records={records.filter(r=>r.kind==='course-history'&&r.courseId===selected.id)} language={language} busy={busy} onMutate={onMutate}/>;
  return <div className="lx-stack">
    <div className="lx-table-wrap"><table className="lx-table">
      <thead><tr><th>{tr('Học phần')}</th><th>{tr('Lớp học phần')}</th><th className="is-num">{tr('Sinh viên')}</th><th>{tr('Hạn nộp gần nhất')}</th><th/></tr></thead>
      <tbody>{courses.map(c=>{const today=new Date().toISOString().slice(0,10),next=c.weeks.find(w=>w.due&&w.due>=today);return <tr key={c.id}>
        <td className="lx-title-cell"><a className="lx-row-link" href={lecturerHref('courses',{course:c.id,cohort:query.cohort})}>{c.code}</a><small>{demoText(c.name,c.id,language)}</small></td>
        <td>{c.className||c.code}</td>
        <td className="is-num">{new Set(memberships.filter(m=>m.courseId===c.id).map(m=>m.userId)).size}</td>
        <td className="lx-muted">{next?`${tr('Tuần {0}',[next.week])} · ${next.due.split('-').reverse().join('/')}`:'—'}</td>
        <td className="is-num"><a className="lx-link" href={lecturerHref('courses',{course:c.id,cohort:query.cohort})}>{tr('Cấu hình')}<UiIcon name="next" size={13}/></a></td>
      </tr>})}</tbody>
    </table></div>
  </div>;
}

/** One course's journey, rubric and history. `system` edits the defaults new courses start from (administrator only). */
export function CourseSettings({course,sources=[],listHref,records,language,busy,onMutate,system=false,admin=false,initialSection='journey'}:{admin?:boolean;course:Course;sources?:Course[];listHref?:string;records:LearningRecord[];language:Language;busy:string;onMutate:LecturerMutation;system?:boolean;initialSection?:'journey'|'commitments'}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [draft,setDraft]=useState(()=>courseForEditing(course,language));
  const [section,setSection]=useState<'journey'|'commitments'|'rubric'|'history'>(initialSection),[openWeek,setOpenWeek]=useState(system?0:-1),[criterionIndex,setCriterionIndex]=useState(0);
  const [error,setError]=useState(''),[changed,setChanged]=useState(false),history=courseHistoryEntries(records);
  // Copied text keeps its stored wording, so saving from the English screen never stores a translation.
  const [copyBase,setCopyBase]=useState<Course|null>(null),[copying,setCopying]=useState(false),[copied,setCopied]=useState<{code:string;undo:{draft:Course;copyBase:Course|null;changed:boolean}}|null>(null);
  const [savedRubric,setSavedRubric]=useState(()=>structuredClone(draft.rubric));
  const {markChanged,markSaved}=useUnsavedChanges();
  function edit(next:Course){setDraft(next);setChanged(true);markChanged();setError('')}
  const editWeek=(i:number,value:Partial<Week>)=>edit({...draft,weeks:draft.weeks.map((w,j)=>i===j?{...w,...value}:w)});
  const editCriterion=(i:number,value:Partial<Criterion>)=>edit({...draft,rubric:draft.rubric.map((c,j)=>i===j?{...c,...value}:c)});
  function applyCopy(source:Course,parts:CourseCopyParts,anchorDue:string){
    const options={anchorDue,keepCriterionNames:!admin};
    setCopied({code:source.code,undo:{draft,copyBase,changed}});setCopyBase(copyCourseSettings(copyBase||course,source,parts,options));
    edit(copyCourseSettings(draft,courseForEditing(source,language),parts,options));setCopying(false);
  }
  function undoCopy(){if(!copied)return;const {undo}=copied;setDraft(undo.draft);setCopyBase(undo.copyBase);setChanged(undo.changed);if(!undo.changed)markSaved();setCopied(null)}
  async function save(event:FormEvent) {
    event.preventDefault();setError('');
    try{validateWeeks(draft.weeks)}catch(e){setSection('journey');setOpenWeek(draft.weeks.findIndex(w=>!w.title.trim()||!w.prompt.trim()||(w.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(w.due))));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    try{validateRubric(draft.rubric)}catch(e){setSection('rubric');setCriterionIndex(Math.max(0,draft.rubric.findIndex(c=>!c.name.trim()||!Number.isInteger(c.weight)||c.weight<1||c.descriptions.some(d=>!d.trim()))));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    try{validateCommitmentDeadline(draft.commitmentDeadline)}catch(e){setSection('commitments');setError(e instanceof Error?e.message:'Quy định hạn cam kết chưa hợp lệ.');return}
    const stored=courseToStore(draft,copyBase||course,language);
    if(await onMutate(system?{action:'config-save',weeks:stored.weeks,rubric:stored.rubric}:{action:'course-save',...stored},tr(system?'Đã lưu cấu hình mặc định.':'Đã lưu cấu hình học phần.'))){setChanged(false);setSavedRubric(structuredClone(draft.rubric));markSaved()}
  }
  return <><form className={`lx-stack${system?' admin-defaults':' lx-course-settings'}`} onSubmit={save}>
    {listHref&&<a className="lx-link" href={listHref}><UiIcon name="next" size={14} className="lx-flip"/>{tr('Danh sách học phần')}</a>}
    <header className="lx-form-head">
      <div>{system?<p className="lx-muted">{tr('Học phần mới được tạo từ cấu hình này. Học phần đã có giữ cấu hình riêng.')}</p>:<><small className="lx-muted">{course.code}</small><h2>{draft.name}</h2></>}</div>
      <div className="lx-row course-settings-save">{!system&&<button type="button" className="lx-btn course-copy-open" disabled={!!busy} onClick={()=>setCopying(true)}><UiIcon name="copy" size={15}/>{tr('Sao chép cài đặt')}</button>}<span className={`course-settings-status${changed?' is-dirty':''}`} role="status"><UiIcon name={changed?'editor':'check'} size={14}/>{tr(changed?'Có thay đổi chưa lưu':'Đã lưu')}</span><button className="lx-btn is-primary" disabled={!!busy||!changed}>{tr(busy==='course-save'||busy==='config-save'?'Đang lưu…':'Lưu cấu hình')}</button></div>
    </header>
    {error&&<p className="lx-notice is-error" role="alert">{tr(error)}</p>}
    <fieldset disabled={!!busy} className="lx-fields">
      {!system&&<details className="course-settings-info"><summary><span><UiIcon name="journey" size={17}/><b>{draft.code}</b><span>{draft.className||draft.code}</span></span><span>{tr('Thông tin học phần')}<UiIcon name="chevron" size={14}/></span></summary><div className="lx-grid-3">
        <label className="lx-field"><span>{tr('Tên học phần')}</span><input required readOnly={!admin} maxLength={200} value={draft.name} onChange={e=>edit({...draft,name:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Lớp học phần')}</span><input required readOnly={!admin} maxLength={120} value={draft.className||draft.code} onChange={e=>edit({...draft,className:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Mã học phần')}</span><input required readOnly={!admin} maxLength={40} value={draft.code} onChange={e=>edit({...draft,code:e.target.value})}/></label>
      </div>{!admin&&<p className="course-settings-locked"><UiIcon name="help" size={15}/>{tr('Tên học phần, lớp học phần và mã học phần do quản trị viên quản lý. Nếu cần sửa, hãy liên hệ quản trị viên.')}</p>}</details>}
      {copied&&<p className="course-copy-done" role="status"><UiIcon name="check" size={15}/><span>{tr('Đã sao chép từ {0}. Kiểm tra lại rồi bấm Lưu cấu hình.',[copied.code])}</span><button type="button" className="lx-link" onClick={undoCopy}>{tr('Hoàn tác')}</button></p>}
      <nav className="lx-tabs" aria-label={tr('Cấu hình học phần')}>
        {(([['journey','Nội dung & hạn nộp'],['commitments','Hạn cam kết'],['rubric','Rubric đánh giá'],['history','Lịch sử thay đổi']] as const).filter(([key])=>!system||(key!=='history'&&key!=='commitments'))).map(([key,label])=><button key={key} type="button" aria-pressed={section===key} onClick={()=>setSection(key)}>{tr(label)}{key==='history'&&history.length>0&&<span>{history.length}</span>}</button>)}
      </nav>

      {system&&(section==='journey'||section==='rubric')&&<DefaultConfigurationFields draft={draft} section={section} weekIndex={Math.max(0,openWeek)} criterionIndex={criterionIndex} onWeek={setOpenWeek} onCriterion={setCriterionIndex} editWeek={editWeek} editCriterion={editCriterion} language={language}/>}
      {!system&&section==='journey'&&<ol className="lx-weeks-config">{draft.weeks.map((w,i)=><li key={w.week} className={openWeek===i?'is-open':''}>
        <button type="button" aria-expanded={openWeek===i} onClick={()=>setOpenWeek(openWeek===i?-1:i)}>
          <span className="lx-week-no">{tr('T{0}',[w.week])}</span><b>{w.title}</b><span className="lx-muted">{w.due?w.due.split('-').reverse().join('/'):tr('Chưa đặt hạn')}</span><UiIcon name="chevron" size={14}/>
        </button>
        {openWeek===i&&<div className="lx-week-body">
          <div className="lx-grid-2">
            <label className="lx-field"><span>{tr('Trọng tâm')}</span><input maxLength={150} value={w.title} onChange={e=>editWeek(i,{title:e.target.value})}/></label>
            <label className="lx-field"><span>{tr('Hạn nộp')}</span><input type="date" value={w.due} onChange={e=>editWeek(i,{due:e.target.value})}/></label>
          </div>
          <label className="lx-field"><span>{tr('Câu hỏi gợi mở')}</span><textarea rows={3} maxLength={1000} value={w.prompt} onChange={e=>editWeek(i,{prompt:e.target.value})}/></label>
          <label className="lx-field"><span>{tr('Yêu cầu bài tập')}</span><textarea rows={3} maxLength={3000} value={w.requirements||''} onChange={e=>editWeek(i,{requirements:e.target.value})}/></label>
        </div>}
      </li>)}</ol>}

      {!system&&section==='commitments'&&<section className="lx-deadline-settings">
        <header><span className="lx-deadline-icon"><UiIcon name="actions" size={23}/></span><div><h3>{tr('Thời hạn thực hiện cam kết')}</h3><p>{tr('Đặt mốc hoàn thành chung cho các cam kết trong học phần này.')}</p></div></header>
        <div className="lx-deadline-modes" role="group" aria-label={tr('Cách đặt hạn cam kết')}>
          {([['none','Chưa quy định'],['days','Theo số ngày'],['fixed','Ngày giờ cố định']] as const).map(([kind,label])=><button type="button" key={kind} aria-pressed={(draft.commitmentDeadline?.kind||'none')===kind} onClick={()=>edit({...draft,commitmentDeadline:kind==='none'?null:kind==='days'?{kind,days:7}:{kind,at:new Date(Date.now()+7*864e5).toISOString()}})}>{tr(label)}</button>)}
        </div>
        {draft.commitmentDeadline?.kind==='days'&&<label className="lx-field lx-deadline-input"><span>{tr('Số ngày tính từ khi tạo cam kết')}</span><input type="number" required min={1} max={365} step={1} value={draft.commitmentDeadline.days} onChange={e=>edit({...draft,commitmentDeadline:{kind:'days',days:Number(e.target.value)}})}/><small>{tr('Ví dụ: tạo lúc 10:00 ngày 01/11, hạn 7 ngày là 10:00 ngày 08/11.')}</small></label>}
        {draft.commitmentDeadline?.kind==='fixed'&&<label className="lx-field lx-deadline-input"><span>{tr('Ngày giờ hết hạn')}</span><input type="datetime-local" required value={draft.commitmentDeadline.at?deadlineInput(draft.commitmentDeadline.at):''} onChange={e=>edit({...draft,commitmentDeadline:{kind:'fixed',at:deadlineFromInput(e.target.value)}})}/><small>{tr('Múi giờ Việt Nam (UTC+7).')}</small></label>}
        <p className="lx-deadline-note"><UiIcon name="help" size={17}/>{tr(draft.commitmentDeadline?'Hạn mới áp dụng cho cam kết chưa hoàn thành. Cam kết đã hoàn thành giữ hạn và lịch sử cũ. Sinh viên không tự thay đổi hạn do giảng viên đặt.':'Chưa giao hạn mới. Cam kết đã có hạn vẫn giữ hạn đã lưu; sinh viên không tự sửa hạn của môn học.')}</p>
        <a className="lx-link" href={lecturerHref('progress',{course:course.id,tab:'actions'})}>{tr('Theo dõi cam kết của sinh viên')}<UiIcon name="next" size={15}/></a>
      </section>}

      {!system&&section==='rubric'&&<div className="lx-stack is-tight course-rubric-section">
        <RubricSuggestion courseId={course.id} rubric={draft.rubric} language={language} onApply={rows=>edit({...draft,rubric:draft.rubric.map(c=>({...c,descriptions:rows.find(row=>row.key===c.key)?.descriptions||c.descriptions}))})}/>
        <CourseRubricEditor rubric={draft.rubric} savedRubric={savedRubric} canEditName={admin} index={criterionIndex} onSelect={setCriterionIndex} onEdit={editCriterion} language={language}/>
      </div>}

      {section==='history'&&<div className="lx-stack is-tight">{history.length?<CourseChangeHistory entries={history} language={language}/>:<p className="lx-empty-line">{tr('Các thay đổi cấu hình sẽ được lưu tại đây khi học phần được cập nhật.')}</p>}</div>}
    </fieldset>
  </form>{copying&&<CourseCopyDialog course={course} sources={sources.filter(c=>c.id!==course.id)} language={language} onApply={applyCopy} onClose={()=>setCopying(false)}/>}</>;
}
