'use client';

import { useRef, useState, type ReactNode } from 'react';
import { wordCount, type Course, type Reflection, type Week } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoContent, demoText } from '../lib/demo-i18n';
import { freeContent, reflectionText, writingReadiness, type ReflectionDraft } from '../lib/student-editor';
import {writingNextStep} from '../lib/student-next-step';
import UiIcon from './UiIcon';

type Props = {
  draft:ReflectionDraft;current?:Reflection;courses:Course[];weeks:Week[];
  language:Language;busy:string;saveLabel:string;includeEvidence:boolean;
  thinking:ReactNode;coach:ReactNode;feedback:ReactNode;reminder:ReactNode;
  initialSupport?:'thinking'|'coach'|'feedback';
  onNextAction?:()=>void;nextActionLabel?:string;
  onChange:(draft:ReflectionDraft)=>void;onBack:()=>void;onSave:()=>void;onReload:()=>void;onHistory:()=>void;
  onExport:()=>void;onArchive:()=>void;onRubric:()=>void;onSubmit:()=>void;onUpload:(file:File)=>void;onEvidence:(included:boolean)=>void;
};

export default function StudentReflectionEditor(props:Props) {
  const {draft,current,courses,weeks,language,busy,saveLabel,onChange}=props;
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const dt=(text:string,id:string|null|undefined)=>demoText(text,id,language);
  const [support,setSupport]=useState<'thinking'|'coach'|'feedback'>(props.initialSupport||'thinking');
  const [feedbackSeen,setFeedbackSeen]=useState(false);
  // A fresh page opens without the assistant; feedback and earlier commitments open it.
  const [panelOpen,setPanelOpen]=useState(!!props.reminder||(!!props.initialSupport&&props.initialSupport!=='thinking'));
  const evidenceInput=useRef<HTMLInputElement>(null),supportRef=useRef<HTMLElement>(null);
  const settingsRef=useRef<HTMLDetailsElement>(null),canvasRef=useRef<HTMLElement>(null),bodyRef=useRef<HTMLTextAreaElement>(null);
  const readiness=writingReadiness(draft,false,!!busy);
  // Opening a reflection shows it in full; Edit switches to writing. An empty draft opens ready to write.
  const [editing,setEditing]=useState(()=>readiness.editable&&!reflectionText(draft.content).trim());
  const [askSubmit,setAskSubmit]=useState(false);
  const preview=!editing||!readiness.editable;
  const content=demoContent(draft.content,draft.id,language);
  const text=reflectionText(content),course=courses.find(c=>c.id===draft.courseId);
  const week=(course?.weeks||weeks).find(w=>w.week===draft.week);
  const nextStep=writingNextStep(draft,{preview:preview&&askSubmit,feedbackSeen,hasLecturerFeedback:!!current?.reviews?.length,hasCourses:courses.length>0});
  const canSend=readiness.canSubmit;

  const nextLabel=nextStep==='action'?(props.nextActionLabel||'Xem phản hồi'):nextStep==='feedback'?'Xem góp ý':nextStep==='write'?'Bắt đầu viết':nextStep==='course'?'Chọn học phần':nextStep==='submit'?(canSend?'Xác nhận nộp bài':'Quay lại viết'):'Đọc lại & nộp bài';
  function showSupport(tab:'thinking'|'coach'|'feedback'){
    setSupport(tab);setPanelOpen(true);if(tab==='feedback')setFeedbackSeen(true);
    requestAnimationFrame(()=>{const target=tab==='feedback'?supportRef.current?.querySelector<HTMLElement>('.lecturer-feedback')||supportRef.current:supportRef.current;target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'})});
  }
  function chooseCourse(){if(settingsRef.current){settingsRef.current.open=true;settingsRef.current.scrollIntoView({block:'start'});settingsRef.current.querySelector('select')?.focus({preventScroll:true})}}
  function next(){
    if(busy)return;
    if(nextStep==='action'){if(props.onNextAction)props.onNextAction();else showSupport('feedback');return}
    if(nextStep==='feedback'){showSupport('feedback');return}
    if(nextStep==='course'){chooseCourse();return}
    if(nextStep==='submit'&&canSend){props.onSubmit();return}
    if(nextStep==='review'){setEditing(false);setAskSubmit(true);canvasRef.current?.scrollIntoView({block:'start'});return}
    edit();
  }
  function edit(){
    setEditing(true);setAskSubmit(false);requestAnimationFrame(()=>{bodyRef.current?.focus({preventScroll:true});bodyRef.current?.scrollIntoView({block:'center'})});
  }
  return <div className="student-writing-workspace">
    <h1 className="sr-only">{tr(readiness.editable?'Viết reflection':'Xem toàn bài')}</h1>
    <div className="writing-toolbar">
      <button className="text-button writing-back" disabled={!!busy} onClick={props.onBack}>{tr('← Danh sách bài viết')}</button>
      <div className="writing-save-state" role="status"><span className={saveLabel==='Lưu chưa thành công'?'error-dot':/^Đã/.test(saveLabel)?'saved-dot':'pending-dot'}/>{tr(saveLabel)}<span className={`badge ${draft.status}`}>{tr(draft.status==='draft'?'Bản nháp':draft.status==='returned'?'Cần chỉnh sửa':draft.status==='final'?'Hoàn thành':'Đã nộp')}</span></div>
      <button type="button" className={`button writing-panel-toggle ${panelOpen?'is-on':''}`} aria-pressed={panelOpen} aria-controls="writing-support" onClick={()=>setPanelOpen(value=>!value)}><UiIcon name="coach" size={16}/>{tr('Trợ lý AI')}</button>
      <section className="writing-next-step" aria-label={tr('Bước tiếp theo')}><button type="button" className="button primary" disabled={!!busy} onClick={next}>{tr(busy?'Đang xử lý…':nextLabel)}<UiIcon name="next" size={16}/></button></section>
    </div>
    <div className={`writing-workspace-grid free-writing-grid ${panelOpen?'with-support':'is-focused'}${draft.status!=='draft'?' is-review':''}`}>
      <section ref={canvasRef} className="panel writing-canvas" aria-label={tr('Không gian viết reflection')}>
        <details ref={settingsRef} open={!draft.courseId||undefined} className="writing-settings"><summary><span>{course?`${course.code} · ${tr('Tuần {0}',[draft.week])}`:tr('Reflection cá nhân')}</span><span>{tr('Học phần & chủ đề')}<UiIcon name="down" size={14}/></span></summary><div className="editor-selectors"><label>{tr('Học phần')}<select disabled={!readiness.editable||!!busy} value={draft.courseId||''} onChange={e=>onChange({...draft,courseId:e.target.value||null})}><option value="">{tr('Reflection cá nhân')}</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} · {dt(tr(c.name),c.id)}</option>)}</select></label><label>{tr('Tuần')}<select disabled={!readiness.editable||!!busy} value={draft.week} onChange={e=>onChange({...draft,week:Number(e.target.value)})}>{(course?.weeks||weeks).map(w=><option key={w.week} value={w.week}>{tr('Tuần {0}',[w.week])} · {tr(w.title)}</option>)}</select></label></div>{week&&<div className="writing-week-prompt"><b>{tr(week.title)}</b><p>{tr(week.prompt)}</p>{week.requirements&&<p>{tr(week.requirements)}</p>}</div>}</details>
        <input id="reflection-title" className="title-input" aria-label={tr('Tiêu đề reflection')} placeholder={tr('Tiêu đề (không bắt buộc)…')} maxLength={200} value={dt(draft.title,draft.id)} disabled={!readiness.editable||!!busy} onChange={e=>onChange({...draft,title:e.target.value})}/>
        {!readiness.editable&&<div className="notice writing-readonly">{tr(draft.status==='final'?'Bài đã được đánh giá cuối cùng. Bạn có thể đọc lại bài và phản hồi.':'Bài đã nộp. Bạn có thể chỉnh sửa khi giảng viên trả bài.')}</div>}
        {preview?<section className="writing-preview" aria-label={tr('Xem toàn bài')}><p>{text||tr('Bài viết chưa có nội dung.')}</p>{readiness.editable&&askSubmit&&<div className="writing-submit-check"><b>{tr('Sẵn sàng gửi cho giảng viên?')}</b><p>{course?dt(tr(course.name),course.id):tr('Chọn học phần trong mục Học phần & chủ đề trước khi nộp.')}</p><p>{tr('Sau khi nộp, giảng viên học phần có thể xem bài, phiên bản, quá trình AI hỗ trợ và cam kết gắn với bài. Bản nháp chưa nộp vẫn riêng tư.')}</p><button className="button primary" disabled={!readiness.canSubmit} onClick={props.onSubmit}>{busy==='submit'?tr('Đang nộp…'):tr('Xác nhận nộp bài')}</button></div>}</section>:<div className="writing-area free-writing-area"><div className="writing-body-heading"><label htmlFor="reflection-body"><UiIcon name="editor" size={16}/>{tr('Nội dung reflection')}</label></div><textarea ref={bodyRef} id="reflection-body" aria-describedby="reflection-word-count" placeholder={tr('Bắt đầu viết reflection…')} value={text} maxLength={80000} readOnly={!readiness.editable} disabled={!!busy} onChange={e=>onChange({...draft,content:freeContent(e.target.value)})}/><div className="word-counter" id="reflection-word-count"><span>{tr('{0} từ',[wordCount(content)])}</span></div></div>}

        <details className="writing-evidence"><summary><span><UiIcon name="attachment"/>{tr('Bối cảnh & minh chứng')}<small>{current?.attachments.length||0}/3</small></span><UiIcon name="add" size={16}/></summary><p className="muted">{tr('Tối đa 3 tệp · 5 MB/tệp · Ảnh, PDF hoặc TXT')}</p><div className="writing-files">{current?.attachments.map(a=><a className={`file-chip ${a.type.startsWith('image/')?'image-evidence':''}`} key={a.id} href={`/api/files/${a.id}`} target="_blank" rel="noreferrer">{a.type.startsWith('image/')?<>{/* Private authenticated evidence must load directly from the access-checked file endpoint. */}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={`/api/files/${a.id}`} alt={a.name} loading="lazy"/></>:<UiIcon name="document" size={15}/>}<span>{a.name}<small>{(a.size/1024).toFixed(0)} KB</small></span><UiIcon name="arrow" size={14}/></a>)}</div><input ref={evidenceInput} hidden aria-label={tr('Thêm minh chứng')} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" disabled={!readiness.editable||!!busy||(current?.attachments.length||0)>=3} onChange={e=>{const file=e.target.files?.[0];if(file)props.onUpload(file);e.target.value=''}}/><button type="button" className="button" disabled={!readiness.editable||!!busy||(current?.attachments.length||0)>=3} onClick={()=>evidenceInput.current?.click()}><UiIcon name="add" size={16}/>{tr('Thêm ảnh / tài liệu')}</button><label className="evidence-option" htmlFor="writing-include-evidence"><input id="writing-include-evidence" type="checkbox" checked={props.includeEvidence} disabled={!!busy||!readiness.editable||!current?.attachments.length} onChange={e=>props.onEvidence(e.target.checked)}/><span>{tr('Gửi minh chứng cho Coach & Feedback')}<small>{tr('Tư duy cùng AI luôn đọc tệp. Coach & Feedback chỉ đọc khi bật.')}</small></span></label></details>
        <details className="writing-outline"><summary>{tr('Gợi ý cấu trúc reflection')}</summary><p><b>{language==='en'?'What?':tr('Mô tả trải nghiệm')}</b> {tr('Điều gì đã xảy ra? Chi tiết nào làm căn cứ?')}</p><p><b>{language==='en'?'So what?':tr('Phân tích & cảm xúc')}</b> {tr('Bạn nghĩ gì, cảm thấy thế nào, vì sao và còn góc nhìn nào khác?')}</p><p><b>{language==='en'?'Now what?':tr('Nhận thức & bài học')}</b> {tr('Bạn rút ra bài học nào? Bài học áp dụng trong điều kiện nào?')}</p><p><b>{language==='en'?'Action':tr('Chuyển hóa thành hành động')}</b> {tr('Bạn sẽ làm gì, khi nào và đo kết quả như thế nào?')}</p></details>
        <div className="writing-bottom-bar"><details className="writing-tools"><summary>{tr('Công cụ bài viết')}<UiIcon name="down" size={14}/></summary><div><button className="text-button" disabled={!current||!!busy} onClick={props.onHistory}>{tr('Lịch sử phiên bản')}</button><button className="text-button" disabled={!current||!!busy} onClick={props.onExport}>{tr('Xuất bài viết')}</button><button className="text-button" disabled={!current||!!busy||draft.status!=='draft'} onClick={props.onArchive}>{tr('Lưu trữ bài')}</button><button className="text-button" onClick={props.onRubric}>{tr('Xem rubric')}</button><button className="text-button" disabled={!current||!!busy} onClick={props.onReload}>{tr('Dùng bản đã lưu')}</button></div></details><div><button className="button" disabled={!!busy||!readiness.editable} onClick={props.onSave}>{tr('Lưu bài')}</button><button className={`button writing-edit-toggle${editing&&readiness.editable?' is-on':''}`} aria-pressed={editing&&readiness.editable} disabled={!!busy||!readiness.editable} onClick={()=>editing?setEditing(false):edit()}><UiIcon name="editor" size={16}/>{tr('Sửa bài')}</button></div></div>
      </section>
      <div className="writing-context-column" hidden={!panelOpen}>{props.reminder}<aside ref={supportRef} tabIndex={-1} id="writing-support" className="writing-support-panel" aria-labelledby="reflection-assistant-title"><div className="reflection-assistant-heading"><span><UiIcon name="coach" size={21}/></span><div><h2 id="reflection-assistant-title">{tr('Trợ lý phản tư của bạn')}</h2></div></div><div className="reflection-support-tabs"><button className={support==='thinking'?'selected':''} aria-pressed={support==='thinking'} aria-controls="reflection-thinking-panel" onClick={()=>setSupport('thinking')}><UiIcon name="messages" size={17}/>{tr('Tư duy cùng AI')}</button><button className={support==='coach'?'selected':''} aria-pressed={support==='coach'} aria-controls="reflection-coach-panel" onClick={()=>setSupport('coach')}><UiIcon name="coach" size={17}/>AI Coach</button><button className={support==='feedback'?'selected':''} aria-pressed={support==='feedback'} aria-controls="reflection-feedback-panel" onClick={()=>{setSupport('feedback');setFeedbackSeen(true)}}><UiIcon name="progress" size={17}/>{tr('Feedback & rubric')}</button></div><div id="reflection-thinking-panel" hidden={support!=='thinking'}>{props.thinking}</div><div id="reflection-coach-panel" hidden={support!=='coach'}>{props.coach}</div><div id="reflection-feedback-panel" hidden={support!=='feedback'}>{props.feedback}</div></aside></div>
    </div>
  </div>;
}
