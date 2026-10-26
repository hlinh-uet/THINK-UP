'use client';
import { useState, type FormEvent } from 'react';
import { validateRubric, validateWeeks, type Course, type Criterion, type LearningRecord, type Week } from '../lib/domain';
import { levelRanges } from '../lib/assessment';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import { lecturerHref, type LecturerQuery } from '../lib/lecturer-pages';
import type { LecturerMutation } from './LecturerWorkspace';
import { useUnsavedChanges } from './useUnsavedChanges';
import DefaultConfigurationFields from './DefaultConfigurationFields';
import UiIcon from './UiIcon';
import { formatDate } from './LecturerKit';

type Props={query?:LecturerQuery;courses:Course[];memberships:{courseId:string;userId:string}[];records:LearningRecord[];selectedCourseId:string;language:Language;busy:string;onMutate:LecturerMutation};
export default function LecturerCourses({query={},courses,memberships,records,selectedCourseId,language,busy,onMutate}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const selected=courses.find(c=>c.id===selectedCourseId);
  if(selected)return <CourseSettings key={selected.id+language} course={selected} listHref={lecturerHref('courses',{cohort:query.cohort})} records={records.filter(r=>r.kind==='course-history'&&r.courseId===selected.id)} language={language} busy={busy} onMutate={onMutate}/>;
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
export function CourseSettings({course,listHref,records,language,busy,onMutate,system=false}:{course:Course;listHref?:string;records:LearningRecord[];language:Language;busy:string;onMutate:LecturerMutation;system?:boolean}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [draft,setDraft]=useState(()=>({...structuredClone(course),name:demoText(course.name,course.id,language),weeks:course.weeks.map(w=>({...w,title:tr(w.title),prompt:tr(w.prompt)})),rubric:course.rubric.map(c=>({...c,name:tr(c.name),descriptions:c.descriptions.map(d=>tr(d))}))}));
  const [section,setSection]=useState<'journey'|'rubric'|'history'>('journey'),[openWeek,setOpenWeek]=useState(system?0:-1),[criterionIndex,setCriterionIndex]=useState(0);
  const [error,setError]=useState(''),[changed,setChanged]=useState(false);
  const {markChanged,markSaved}=useUnsavedChanges();
  function edit(next:Course){setDraft(next);setChanged(true);markChanged();setError('')}
  const editWeek=(i:number,value:Partial<Week>)=>edit({...draft,weeks:draft.weeks.map((w,j)=>i===j?{...w,...value}:w)});
  const editCriterion=(i:number,value:Partial<Criterion>)=>edit({...draft,rubric:draft.rubric.map((c,j)=>i===j?{...c,...value}:c)});
  async function save(event:FormEvent) {
    event.preventDefault();setError('');
    try{validateWeeks(draft.weeks)}catch(e){setSection('journey');setOpenWeek(draft.weeks.findIndex(w=>!w.title.trim()||!w.prompt.trim()||(w.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(w.due))));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    try{validateRubric(draft.rubric)}catch(e){setSection('rubric');setCriterionIndex(Math.max(0,draft.rubric.findIndex(c=>!c.name.trim()||c.descriptions.some(d=>!d.trim()))));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    if(await onMutate(system?{action:'config-save',weeks:draft.weeks,rubric:draft.rubric}:{action:'course-save',...draft},tr(system?'Đã lưu cấu hình mặc định.':'Đã lưu cấu hình học phần.'))){setChanged(false);markSaved()}
  }
  return <form className={`lx-stack${system?' admin-defaults':''}`} onSubmit={save}>
    {listHref&&<a className="lx-link" href={listHref}><UiIcon name="next" size={14} className="lx-flip"/>{tr('Danh sách học phần')}</a>}
    <header className="lx-form-head">
      <div>{system?<p className="lx-muted">{tr('Học phần mới được tạo từ cấu hình này. Học phần đã có giữ cấu hình riêng.')}</p>:<><small className="lx-muted">{course.code}</small><h2>{draft.name}</h2></>}</div>
      <div className="lx-row"><span className="lx-muted" role="status">{tr(changed?'Có thay đổi chưa lưu':'Đã lưu')}</span><button className="lx-btn is-primary" disabled={!!busy||!changed}>{tr(busy==='course-save'||busy==='config-save'?'Đang lưu…':'Lưu cấu hình')}</button></div>
    </header>
    {error&&<p className="lx-notice is-error" role="alert">{tr(error)}</p>}
    <fieldset disabled={!!busy} className="lx-fields">
      {!system&&<div className="lx-grid-3">
        <label className="lx-field"><span>{tr('Tên học phần')}</span><input required maxLength={200} value={draft.name} onChange={e=>edit({...draft,name:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Lớp học phần')}</span><input required maxLength={120} value={draft.className||draft.code} onChange={e=>edit({...draft,className:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Mã học phần')}</span><input required maxLength={40} value={draft.code} onChange={e=>edit({...draft,code:e.target.value})}/></label>
      </div>}
      <nav className="lx-tabs" aria-label={tr('Cấu hình học phần')}>
        {(([['journey','Nội dung & hạn nộp'],['rubric','Rubric đánh giá'],['history','Lịch sử thay đổi']] as const).filter(([key])=>!system||key!=='history')).map(([key,label])=><button key={key} type="button" aria-pressed={section===key} onClick={()=>setSection(key)}>{tr(label)}{key==='history'&&records.length>0&&<span>{records.length}</span>}</button>)}
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

      {!system&&section==='rubric'&&<div className="lx-stack is-tight">
        <p className="lx-notice">{tr('Trọng số cố định theo đặc tả: 35% / 25% / 20% / 20%. Có thể điều chỉnh mô tả từng mức điểm; đánh giá cũ giữ nguyên rubric đã dùng.')}</p>
        {draft.rubric.map((c,i)=><section className="lx-rubric" key={c.key}>
          <header><input aria-label={tr('Tên tiêu chí')} maxLength={120} value={c.name} onChange={e=>editCriterion(i,{name:e.target.value})}/><span className="lx-weight">{c.weight}%</span></header>
          <div className="lx-rubric-levels">{c.descriptions.map((d,k)=><label key={k}><span>Level {k+1} <small>{levelRanges[k][0]}–{levelRanges[k][1]}</small></span><textarea rows={5} maxLength={1000} value={d} onChange={e=>editCriterion(i,{descriptions:c.descriptions.map((text,n)=>k===n?e.target.value:text)})}/></label>)}</div>
        </section>)}
      </div>}

      {section==='history'&&<div className="lx-stack is-tight">{records.length?<ol className="lx-timeline">{records.map(r=><li key={r.id}>
        <small>{formatDate(String(r.payload.effectiveAt||r.createdAt),language,true)}</small>
        <p><b>{String(r.payload.code)}</b> · {String(r.payload.name)}</p>
        <details className="lx-disclosure"><summary>{tr('Xem cấu hình tại thời điểm này')}</summary>
          {(r.payload.rubric as Criterion[]||[]).map(c=><p key={c.key}><b>{tr(c.name)} · {c.weight}%</b></p>)}
          <ul>{(r.payload.weeks as Week[]||[]).map(w=><li key={w.week}>{tr('T{0}',[w.week])} · {w.title} · {w.due||'—'}</li>)}</ul>
        </details>
      </li>)}</ol>:<p className="lx-empty-line">{tr('Các thay đổi cấu hình sẽ được lưu tại đây khi học phần được cập nhật.')}</p>}</div>}
    </fieldset>
  </form>;
}
