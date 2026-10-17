'use client';
import { useState, type FormEvent } from 'react';
import { validateRubric, validateWeeks, type Course } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import { lecturerHref } from '../lib/lecturer-pages';
import type { LecturerMutation } from './LecturerWorkspace';
import { useUnsavedChanges } from './useUnsavedChanges';
import UiIcon from './UiIcon';

type Props={courses:Course[];memberships:{courseId:string;userId:string}[];selectedCourseId:string;language:Language;busy:string;onMutate:LecturerMutation};
export default function LecturerCourses({courses,memberships,selectedCourseId,language,busy,onMutate}:Props) {
  const tr=(text:string)=>translate(text,language);
  const selected=courses.find(c=>c.id===selectedCourseId);
  return selected?<CourseSettings key={selected.id+language} course={selected} language={language} busy={busy} onMutate={onMutate}/>:<div className="course-grid">{courses.map(c=><section className="panel course-card" key={c.id}><span className="pill">{c.code}</span><h3>{demoText(c.name,c.id,language)}</h3><p>{new Set(memberships.filter(m=>m.courseId===c.id).map(m=>m.userId)).size} {tr('sinh viên')} · 9 {tr('tuần')}</p><p className="muted">{tr('Nội dung tuần, hạn nộp và rubric đánh giá.')}</p><a className="button full" href={lecturerHref('courses',{course:c.id})}>{tr('Cấu hình học phần')}<UiIcon name="next" size={16}/></a></section>)}</div>;
}

function CourseSettings({course,language,busy,onMutate}:{course:Course;language:Language;busy:string;onMutate:LecturerMutation}) {
  const tr=(text:string)=>translate(text,language);
  const [draft,setDraft]=useState(()=>({...structuredClone(course),name:demoText(course.name,course.id,language),weeks:course.weeks.map(w=>({...w,title:tr(w.title),prompt:tr(w.prompt)})),rubric:course.rubric.map(c=>({...c,name:tr(c.name),descriptions:c.descriptions.map(tr)}))}));
  const [section,setSection]=useState<'journey'|'rubric'>('journey'),[openWeek,setOpenWeek]=useState(0),[openCriterion,setOpenCriterion]=useState(0);
  const [error,setError]=useState(''),[changed,setChanged]=useState(false);
  const {markChanged,markSaved}=useUnsavedChanges();
  function edit(next:Course){setDraft(next);setChanged(true);markChanged();setError('')}
  async function save(event:FormEvent) {
    event.preventDefault();setError('');
    try{validateWeeks(draft.weeks)}catch(e){setSection('journey');setOpenWeek(draft.weeks.findIndex(w=>!w.title.trim()||!w.prompt.trim()||(w.due!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(w.due))));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    try{validateRubric(draft.rubric)}catch(e){setSection('rubric');setOpenCriterion(draft.rubric.findIndex(c=>!c.name.trim()||c.descriptions.some(d=>!d.trim())));setError(e instanceof Error?e.message:'Thông tin chưa hợp lệ.');return}
    if(await onMutate({action:'course-save',...draft},tr('Đã lưu cấu hình học phần.'))){setChanged(false);markSaved()}
  }
  return <>
    <a className="text-button review-back" href={lecturerHref('courses')}>← {tr('Danh sách học phần')}</a>
    <form className="panel lecturer-course-settings" onSubmit={save}>
      <div className="section-head"><div><span className="eyebrow">{course.code}</span><h3>{draft.name}</h3></div><div className="button-group"><span className="muted" role="status">{tr(changed?'Có thay đổi chưa lưu':'Đã lưu')}</span><button className="button primary" disabled={!!busy||!changed}>{tr(busy==='course-save'?'Đang lưu…':'Lưu cấu hình')}</button></div></div>
      {error&&<p className="auth-error" role="alert">{tr(error)}</p>}
      <fieldset disabled={!!busy} className="course-fields"><div className="form-grid"><label className="field">{tr('Tên học phần')}<input required maxLength={200} value={draft.name} onChange={e=>edit({...draft,name:e.target.value})}/></label><label className="field">{tr('Lớp học phần')}<input required maxLength={120} value={draft.className||draft.code} onChange={e=>edit({...draft,className:e.target.value})}/></label><label className="field">{tr('Mã học phần')}<input required maxLength={40} value={draft.code} onChange={e=>edit({...draft,code:e.target.value})}/></label></div>
        <div className="tab-bar" aria-label={tr('Cấu hình học phần')}><button type="button" className={section==='journey'?'selected':''} aria-pressed={section==='journey'} onClick={()=>setSection('journey')}>{tr('Nội dung & hạn nộp')}</button><button type="button" className={section==='rubric'?'selected':''} aria-pressed={section==='rubric'} onClick={()=>setSection('rubric')}>{tr('Rubric đánh giá')}</button></div>
        {section==='journey'?<><p className="muted">{tr('Chọn một tuần để chỉnh trọng tâm, câu hỏi gợi mở và hạn nộp.')}</p>{draft.weeks.map((w,i)=><section className="course-config-item" key={w.week}><button className="course-config-toggle" type="button" aria-expanded={openWeek===i} aria-controls={`week-fields-${i}`} onClick={()=>setOpenWeek(openWeek===i?-1:i)}><span className="week-config-index">{String(w.week).padStart(2,'0')}</span><span className="grow"><b>{w.title}</b><small>{w.due||tr('Chưa đặt hạn')}</small></span><span aria-hidden="true">{openWeek===i?'−':'+'}</span></button>{openWeek===i&&<div className="course-config-body" id={`week-fields-${i}`}><label className="field">{tr('Trọng tâm')}<input maxLength={150} value={w.title} onChange={e=>edit({...draft,weeks:draft.weeks.map((v,j)=>i===j?{...v,title:e.target.value}:v)})}/></label><label className="field">{tr('Câu hỏi gợi mở')}<textarea rows={3} maxLength={1000} value={w.prompt} onChange={e=>edit({...draft,weeks:draft.weeks.map((v,j)=>i===j?{...v,prompt:e.target.value}:v)})}/></label><label className="field">{tr('Yêu cầu bài tập')}<textarea rows={3} maxLength={3000} value={w.requirements||''} onChange={e=>edit({...draft,weeks:draft.weeks.map((v,j)=>i===j?{...v,requirements:e.target.value}:v)})}/></label><label className="field">{tr('Hạn nộp')}<input type="date" value={w.due} onChange={e=>edit({...draft,weeks:draft.weeks.map((v,j)=>i===j?{...v,due:e.target.value}:v)})}/></label></div>}</section>)}</>:<><p className="notice">{tr('Trọng số cố định theo đặc tả: 35% / 25% / 20% / 20%. Có thể điều chỉnh mô tả từng mức điểm; đánh giá cũ giữ nguyên rubric đã dùng.')}</p>{draft.rubric.map((c,i)=><section className="course-config-item" key={c.key}><button className="course-config-toggle" type="button" aria-expanded={openCriterion===i} aria-controls={`rubric-fields-${i}`} onClick={()=>setOpenCriterion(openCriterion===i?-1:i)}><span className="grow"><b>{c.name}</b><small>{c.label}</small></span><span className="badge">{c.weight}%</span><span aria-hidden="true">{openCriterion===i?'−':'+'}</span></button>{openCriterion===i&&<div className="course-config-body" id={`rubric-fields-${i}`}><label className="field">{tr('Tên tiêu chí')}<input maxLength={120} value={c.name} onChange={e=>edit({...draft,rubric:draft.rubric.map((v,j)=>i===j?{...v,name:e.target.value}:v)})}/></label>{c.descriptions.map((d,k)=><label className="field" key={k}>{tr('Mức điểm')} {k+1} · {['0–2,5','2,6–5,0','5,1–7,5','7,6–10'][k]}/10<textarea rows={3} maxLength={1000} value={d} onChange={e=>edit({...draft,rubric:draft.rubric.map((v,j)=>i===j?{...v,descriptions:v.descriptions.map((text,n)=>k===n?e.target.value:text)}:v)})}/></label>)}</div>}</section>)}</>}
      </fieldset>
    </form>
  </>;
}
