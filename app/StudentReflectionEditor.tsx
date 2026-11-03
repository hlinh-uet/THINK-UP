'use client';

import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { wordCount, type Course, type Reflection, type Week } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoContent, demoText } from '../lib/demo-i18n';
import { freeContent, reflectionText, writingMatchesSaved, writingReadiness, type ReflectionDraft } from '../lib/student-editor';
import { analysisIsCurrent } from '../lib/progress';
import {writingNextStep} from '../lib/student-next-step';
import UiIcon from './UiIcon';
import {useWritingTranslation} from './useWritingTranslation';

type Props = {
  draft:ReflectionDraft;current?:Reflection;courses:Course[];weeks:Week[];
  language:Language;busy:string;saveLabel:string;includeEvidence:boolean;
  thinking:ReactNode;coach:ReactNode;reminder:ReactNode;score?:ReactNode;selfCheck?:ReactNode;
  /** The feedback tab may be given the editor's Edit action, so a revision request can open the draft directly. */
  feedback:ReactNode|((edit:()=>void)=>ReactNode);
  initialSupport?:'thinking'|'coach'|'feedback';onTranslationSaved?:()=>void;
  onNextAction?:()=>void;nextActionLabel?:string;
  onChange:(draft:ReflectionDraft)=>void;onBack:()=>void;onSave:()=>void;onReload:()=>void;onHistory:()=>void;
  onExport:()=>void;onArchive:()=>void;onRubric:()=>void;onSubmit:()=>void;onUpload:(file:File)=>void;onEvidence:(included:boolean)=>void;
};

type Stage='write'|'review'|'score'|'self'|'send';
const stages:{key:Stage;label:string;icon:'editor'|'coach'|'progress'|'selfCheck'|'send'}[]=[
  {key:'write',label:'Viết',icon:'editor'},{key:'review',label:'Nhận xét',icon:'coach'},{key:'score',label:'Chấm thử',icon:'progress'},
  {key:'self',label:'Tự đánh giá',icon:'selfCheck'},{key:'send',label:'Nộp bài',icon:'send'}];

const stageHints:Record<Stage,string>={write:'AI gợi ý câu hỏi để bạn viết tiếp',review:'AI Coach đọc cả bài và góp ý',score:'AI chấm thử 4 tiêu chí như giảng viên',self:'Bạn tự chấm bài theo rubric',send:'Kiểm tra lần cuối rồi gửi giảng viên'};

export default function StudentReflectionEditor(props:Props) {
  const {draft,current,courses,weeks,language,busy,saveLabel,onChange}=props;
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const dt=(text:string,id:string|null|undefined)=>demoText(text,id,language);
  const [support,setSupport]=useState<'assistant'|'feedback'>(props.initialSupport==='feedback'?'feedback':'assistant');
  // The assistant walks the draft through five stages: write, Coach review, rubric trial, self-assessment, submit.
  // Any stage can be opened at any time; a reflection with Coach feedback opens on the review stage.
  const [stage,setStage]=useState<Stage>(props.initialSupport==='coach'||current?.analyses.some(a=>a.kind==='coach')?'review':'write');
  const [feedbackSeen,setFeedbackSeen]=useState(false);
  // A fresh page opens without the assistant; feedback and earlier commitments open it.
  // The assistant sits beside the writing at all times; its content follows the stage chosen in the progress bar.
  const panelOpen=true;
  const evidenceInput=useRef<HTMLInputElement>(null),supportRef=useRef<HTMLElement>(null);
  const settingsRef=useRef<HTMLDetailsElement>(null),canvasRef=useRef<HTMLElement>(null),bodyRef=useRef<HTMLTextAreaElement>(null);
  const readiness=writingReadiness(draft,false,!!busy);
  // Opening a reflection shows it in full; Edit switches to writing. An empty draft opens ready to write.
  const [editing,setEditing]=useState(()=>readiness.editable&&!reflectionText(draft.content).trim());
  const [askSubmit,setAskSubmit]=useState(false);
  const preview=!editing||!readiness.editable;
  const writing=useWritingTranslation(draft,current,language,preview,props.onTranslationSaved);
  const content=preview?writing.view.content:demoContent(draft.content,draft.id,language);
  const text=reflectionText(content),course=courses.find(c=>c.id===draft.courseId);
  const week=(course?.weeks||weeks).find(w=>w.week===draft.week);
  const nextStep=writingNextStep(draft,{preview:preview&&askSubmit,feedbackSeen,hasLecturerFeedback:!!current?.reviews?.length,hasCourses:courses.length>0});
  const canSend=readiness.canSubmit;
  // A new draft has nothing to grade yet and completed work is no longer written, so each shows only the tab it can use.
  const supportTabs=[{key:'assistant' as const,label:'AI Assistant',icon:'sparkle' as const},{key:'feedback' as const,label:tr('Góp ý & điểm'),icon:'progress' as const}]
    .filter(tab=>draft.status==='final'?tab.key==='feedback':draft.status==='draft'&&!current?.reviews?.length?tab.key==='assistant':true);
  const shown=supportTabs.some(tab=>tab.key===support)?support:supportTabs[0].key,tabbed=supportTabs.length>1;
  const hasTab=(key:'assistant'|'feedback')=>supportTabs.some(tab=>tab.key===key);
  function selectSupport(tab:'assistant'|'feedback'){setSupport(tab);if(tab==='feedback')setFeedbackSeen(true)}

  const nextLabel=nextStep==='action'?(props.nextActionLabel||'Xem phản hồi'):nextStep==='feedback'?'Xem góp ý':nextStep==='write'?'Bắt đầu viết':nextStep==='course'?'Chọn học phần':nextStep==='submit'?(canSend?'Xác nhận nộp bài':'Quay lại viết'):'Đọc lại & nộp bài';
  function showSupport(tab:'assistant'|'feedback'){
    setSupport(tab);if(tab==='feedback')setFeedbackSeen(true);
    requestAnimationFrame(()=>{const target=tab==='feedback'?supportRef.current?.querySelector<HTMLElement>('.lecturer-feedback')||supportRef.current:supportRef.current;target?.focus({preventScroll:true});target?.scrollIntoView({block:'start'})});
  }
  function chooseCourse(){if(settingsRef.current){settingsRef.current.open=true;settingsRef.current.scrollIntoView({block:'start'});settingsRef.current.querySelector('select')?.focus({preventScroll:true})}}
  function next(){
    if(busy)return;
    if(nextStep==='action'){if(props.onNextAction)props.onNextAction();else showSupport('feedback');return}
    if(nextStep==='feedback'){showSupport('feedback');return}
    if(nextStep==='course'){chooseCourse();return}
    if(nextStep==='submit'&&canSend){props.onSubmit();return}
    if(nextStep==='review'){reviewForSubmit();return}
    edit();
  }
  // Reading through shows the whole reflection in the editor; the confirmation itself stays in the assistant's submit stage.
  function reviewForSubmit(){setEditing(false);setAskSubmit(true);setSupport('assistant');setStage('send');canvasRef.current?.scrollIntoView({block:'start'})}
  function openStage(next:Stage){setStage(next);setSupport('assistant')}
  function backToWriting(){setStage('write');edit()}
  // A stage is done when its saved result exists, and needs redoing when the writing changed after it.
  const fresh=(kind:string)=>{const a=current?.analyses.find(item=>item.kind===kind);return !a?'':current&&analysisIsCurrent(current,a)&&writingMatchesSaved(draft,current)?'done':'redo'};
  const stageState:Record<Stage,string>={write:readiness.words>=20?'done':'',review:fresh('coach'),score:fresh('feedback'),self:current?.selfAssessments?.length?'done':'',send:''};
  const completedStageCount=(['write','review','score','self'] as const).filter(key=>stageState[key]==='done').length;
  const stageIndex=stages.findIndex(item=>item.key===stage),stale=stages.filter(item=>stageState[item.key]==='redo');
  function edit(){
    setEditing(true);setAskSubmit(false);requestAnimationFrame(()=>{bodyRef.current?.focus({preventScroll:true});bodyRef.current?.scrollIntoView({block:'center'})});
  }
  const stepNav=(to:Stage)=><div className="ai-step-nav"><button type="button" className="button ai-step-back" onClick={backToWriting}><UiIcon name="back" size={14}/>{tr('Sửa bài')}</button><button type="button" className="button ai-step-forward" onClick={()=>setStage(to)}>{tr('Tiếp tục')}<UiIcon name="next" size={14}/></button></div>;
  const stageProgress=readiness.editable&&hasTab('assistant')?(
     <span className={`ai-steps-count${completedStageCount===4?' is-complete':''}`} role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={completedStageCount} aria-label={tr('Đã xong {0} trong 4 bước',[completedStageCount])}>
      <svg className="ai-count-ring" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="10" className="ai-count-track"/><circle cx="14" cy="14" r="10" className="ai-count-fill" strokeDasharray={`${completedStageCount/4*62.832} 62.832`} strokeOpacity={completedStageCount?1:0}/></svg>
      <span className="ai-count-copy"><strong>{completedStageCount}<small>/4</small></strong><span>{tr('Hoàn thành')}</span></span>
     </span>
  ):null;
  return <div className="student-writing-workspace">
    <h1 className="sr-only">{tr(readiness.editable?'Viết reflection':'Xem toàn bài')}</h1>
    <div className="writing-toolbar">
      <button className="text-button writing-back" disabled={!!busy} onClick={props.onBack}>{tr('← Danh sách bài viết')}</button>
      <div className="writing-save-state" role="status"><span className={saveLabel==='Lưu chưa thành công'?'error-dot':/^Đã/.test(saveLabel)?'saved-dot':'pending-dot'}/>{tr(saveLabel)}<span className={`badge ${draft.status}`}>{tr(draft.status==='draft'?'Bản nháp':draft.status==='returned'?'Cần chỉnh sửa':draft.status==='final'?'Hoàn thành':'Đã nộp')}</span>{stageProgress}</div>
      <section className="writing-next-step" aria-label={tr('Bước tiếp theo')}><button type="button" className="button primary" disabled={!!busy} onClick={next}>{tr(busy?'Đang xử lý…':nextLabel)}<UiIcon name="next" size={16}/></button></section>
    </div>
    {/* The stages before submitting stay in view above the writing, so a student always sees what is left to do. */}
    {readiness.editable&&hasTab('assistant')&&<nav className="ai-steps-bar" aria-label={tr('Các bước trước khi nộp')}>
     <ol className="ai-steps" style={{'--ai-fill':`${stageIndex/4*80}%`,'--ai-stage-ratio':stageIndex/4} as CSSProperties}>{stages.map(item=>{const state=stageState[item.key];return <li key={item.key}>
      <button type="button" className={`ai-step${item.key===stage?' is-now':''}${state?` is-${state}`:''}`} aria-current={item.key===stage?'step':undefined} onClick={()=>openStage(item.key)}>
       <i aria-hidden="true" style={item.key===stage&&state!=='redo'?{background:'#34415a',borderColor:'#34415a',color:'#ffe58a'}:undefined}>{state==='done'&&item.key!==stage?<UiIcon name="check" size={13}/>:state==='redo'?'!':<UiIcon name={item.icon} size={13}/>}</i>{tr(item.label)}</button></li>})}</ol>

    </nav>}
    <div className={`writing-workspace-grid free-writing-grid ${panelOpen?'with-support':'is-focused'}${draft.status!=='draft'?' is-review':''}`}>
      <section ref={canvasRef} className="panel writing-canvas" aria-label={tr('Không gian viết reflection')}>
        <details ref={settingsRef} open={!draft.courseId||undefined} className="writing-settings"><summary><span>{course?`${course.code} · ${tr('Tuần {0}',[draft.week])}`:tr('Reflection cá nhân')}</span><span>{tr('Học phần & chủ đề')}<UiIcon name="down" size={14}/></span></summary><div className="editor-selectors"><label>{tr('Học phần')}<select disabled={!readiness.editable||!!busy} value={draft.courseId||''} onChange={e=>onChange({...draft,courseId:e.target.value||null})}><option value="">{tr('Reflection cá nhân')}</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} · {dt(tr(c.name),c.id)}</option>)}</select></label><label>{tr('Tuần')}<select disabled={!readiness.editable||!!busy} value={draft.week} onChange={e=>onChange({...draft,week:Number(e.target.value)})}>{(course?.weeks||weeks).map(w=><option key={w.week} value={w.week}>{tr('Tuần {0}',[w.week])} · {tr(w.title)}</option>)}</select></label></div>{week&&<div className="writing-week-prompt"><b>{tr(week.title)}</b><p>{tr(week.prompt)}</p>{week.requirements&&<p>{tr(week.requirements)}</p>}</div>}</details>
        <input id="reflection-title" className="title-input" aria-label={tr('Tiêu đề reflection')} placeholder={tr('Tiêu đề (không bắt buộc)…')} maxLength={200} value={preview?writing.view.title:dt(draft.title,draft.id)} readOnly={preview} disabled={!readiness.editable||!!busy} onChange={e=>onChange({...draft,title:e.target.value})}/>
        {!readiness.editable&&<div className="notice writing-readonly">{tr(draft.status==='final'?'Bài đã được đánh giá cuối cùng. Bạn có thể đọc lại bài và phản hồi.':'Bài đã nộp. Bạn có thể chỉnh sửa khi giảng viên trả bài.')}</div>}
        {(writing.loading||writing.error||writing.translated)&&<p className="writing-translation-status" role="status">{tr(writing.loading?'Đang dịch bài viết…':writing.error||(!preview?'Đang chỉnh sửa bản gốc.':'Bản dịch · Bản gốc được giữ nguyên.'))}</p>}
        {preview?<section className="writing-preview" aria-label={tr('Xem toàn bài')}><p>{text||tr('Bài viết chưa có nội dung.')}</p></section>:<div className="writing-area free-writing-area"><div className="writing-body-heading"><label htmlFor="reflection-body"><UiIcon name="editor" size={16}/>{tr('Nội dung reflection')}</label></div><textarea ref={bodyRef} id="reflection-body" aria-describedby="reflection-word-count" placeholder={tr('Bắt đầu viết reflection…')} value={text} maxLength={80000} readOnly={!readiness.editable} disabled={!!busy} onChange={e=>onChange({...draft,content:freeContent(e.target.value)})}/><div className="word-counter" id="reflection-word-count"><span>{tr('{0} từ',[wordCount(content)])}</span></div></div>}

        <details className="writing-evidence"><summary><span><UiIcon name="attachment"/>{tr('Bối cảnh & minh chứng')}<small>{current?.attachments.length||0}/3</small></span><UiIcon name="add" size={16}/></summary><p className="muted">{tr('Tối đa 3 tệp · 5 MB/tệp · Ảnh, PDF hoặc TXT')}</p><div className="writing-files">{current?.attachments.map(a=><a className={`file-chip ${a.type.startsWith('image/')?'image-evidence':''}`} key={a.id} href={`/api/files/${a.id}`} target="_blank" rel="noreferrer">{a.type.startsWith('image/')?<>{/* Private authenticated evidence must load directly from the access-checked file endpoint. */}
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={`/api/files/${a.id}`} alt={a.name} loading="lazy"/></>:<UiIcon name="document" size={15}/>}<span>{a.name}<small>{(a.size/1024).toFixed(0)} KB</small></span><UiIcon name="arrow" size={14}/></a>)}</div><input ref={evidenceInput} hidden aria-label={tr('Thêm minh chứng')} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" disabled={!readiness.editable||!!busy||(current?.attachments.length||0)>=3} onChange={e=>{const file=e.target.files?.[0];if(file)props.onUpload(file);e.target.value=''}}/><button type="button" className="button" disabled={!readiness.editable||!!busy||(current?.attachments.length||0)>=3} onClick={()=>evidenceInput.current?.click()}><UiIcon name="add" size={16}/>{tr('Thêm ảnh / tài liệu')}</button><label className="evidence-option" htmlFor="writing-include-evidence"><input id="writing-include-evidence" type="checkbox" checked={props.includeEvidence} disabled={!!busy||!readiness.editable||!current?.attachments.length} onChange={e=>props.onEvidence(e.target.checked)}/><span>{tr('Gửi minh chứng cho Coach & Feedback')}<small>{tr('Tư duy cùng AI luôn đọc tệp. Coach & Feedback chỉ đọc khi bật.')}</small></span></label></details>
        <details className="writing-outline"><summary>{tr('Gợi ý cấu trúc reflection')}</summary><p><b>{language==='en'?'What?':tr('Mô tả trải nghiệm')}</b> {tr('Điều gì đã xảy ra? Chi tiết nào làm căn cứ?')}</p><p><b>{language==='en'?'So what?':tr('Phân tích & cảm xúc')}</b> {tr('Bạn nghĩ gì, cảm thấy thế nào, vì sao và còn góc nhìn nào khác?')}</p><p><b>{language==='en'?'Now what?':tr('Nhận thức & bài học')}</b> {tr('Bạn rút ra bài học nào? Bài học áp dụng trong điều kiện nào?')}</p><p><b>{language==='en'?'Action':tr('Chuyển hóa thành hành động')}</b> {tr('Bạn sẽ làm gì, khi nào và đo kết quả như thế nào?')}</p></details>
        <div className="writing-bottom-bar"><details className="writing-tools"><summary>{tr('Công cụ bài viết')}<UiIcon name="down" size={14}/></summary><div><button className="text-button" disabled={!current||!!busy} onClick={props.onHistory}>{tr('Lịch sử phiên bản')}</button><button className="text-button" disabled={!current||!!busy} onClick={props.onExport}>{tr('Xuất bài viết')}</button><button className="text-button" disabled={!current||!!busy||draft.status!=='draft'} onClick={props.onArchive}>{tr('Lưu trữ bài')}</button><button className="text-button" onClick={props.onRubric}>{tr('Xem rubric')}</button><button className="text-button" disabled={!current||!!busy} onClick={props.onReload}>{tr('Dùng bản đã lưu')}</button></div></details><div><button className="button" disabled={!!busy||!readiness.editable} onClick={props.onSave}>{tr('Lưu bài')}</button><button className={`button writing-edit-toggle${editing&&readiness.editable?' is-on':''}`} aria-pressed={editing&&readiness.editable} disabled={!!busy||!readiness.editable} onClick={()=>editing?setEditing(false):edit()}><UiIcon name="editor" size={16}/>{tr('Sửa bài')}</button></div></div>
      </section>
      <div className="writing-context-column" hidden={!panelOpen}>{props.reminder}<aside ref={supportRef} tabIndex={-1} id="writing-support" className="writing-support-panel" aria-labelledby="reflection-assistant-title"><div className="reflection-assistant-heading"><span><UiIcon name="coach" size={21}/></span><div><h2 id="reflection-assistant-title">{tr('Trợ lý phản tư của bạn')}</h2></div></div>
       {tabbed&&<div className="reflection-support-tabs" role="tablist" aria-label={tr('Góp ý & hỗ trợ')}>{supportTabs.map((tab,index)=><button type="button" key={tab.key} id={`reflection-${tab.key}-tab`} role="tab" className={shown===tab.key?'selected':''} aria-selected={shown===tab.key} tabIndex={shown===tab.key?0:-1} aria-controls={`reflection-${tab.key}-panel`} onClick={()=>selectSupport(tab.key)} onKeyDown={event=>{const count=supportTabs.length,next=event.key==='ArrowRight'?(index+1)%count:event.key==='ArrowLeft'?(index+count-1)%count:event.key==='Home'?0:event.key==='End'?count-1:null;if(next===null)return;event.preventDefault();selectSupport(supportTabs[next].key);supportRef.current?.querySelector<HTMLButtonElement>(`#reflection-${supportTabs[next].key}-tab`)?.focus({preventScroll:true})}}><UiIcon name={tab.icon} size={19}/><span className="support-tab-label">{tab.label}</span></button>)}</div>}
       {hasTab('assistant')&&<div role={tabbed?'tabpanel':undefined} aria-labelledby={tabbed?'reflection-assistant-tab':undefined} id="reflection-assistant-panel" className="ai-assistant" hidden={shown!=='assistant'}>
        <div className="ai-assistant-head"><span className="ai-orb" aria-hidden="true"><UiIcon name="bot" size={22}/></span><div><b>AI Assistant</b><small>{tr('Trợ lý phản tư của bạn')}</small></div></div>
        {readiness.editable?<span className="ai-stage-chip" title={tr(stageHints[stage])}><UiIcon name={stages[stageIndex].icon} size={13}/><span>{tr('Bước {0}',[stageIndex+1])} · {tr(stages[stageIndex].label)}</span></span>:<span className="ai-stage-chip"><UiIcon name="coach" size={13}/><span>{tr('Nhận xét của AI Coach cho bài đã nộp')}</span></span>}
        {/* Submitted work is no longer being written, so it only shows the Coach feedback. */}
        {readiness.editable?<>
         {/* Every stage stays mounted so suggestions, results and unsaved self-assessment survive moving between stages. */}
         <div id="reflection-thinking-panel" className="ai-stage-pane" hidden={stage!=='write'}>
          {stale.length>0&&<p className="ai-stale"><b aria-hidden="true">!</b>{tr('Bạn đã sửa bài sau khi AI đọc. Bấm chặng có dấu ! để AI đọc lại bản mới.')}</p>}
          {props.thinking}
          <button type="button" className="button full ai-step-next" onClick={()=>setStage('review')}>{tr('Viết xong, sang Nhận xét')}<UiIcon name="next" size={14}/></button>
         </div>
         <div id="reflection-coach-panel" className="ai-stage-pane" hidden={stage!=='review'}>{props.coach}{stepNav('score')}</div>
         <div className="ai-stage-pane" hidden={stage!=='score'}>{props.score}{stepNav('self')}</div>
         <div className="ai-stage-pane" hidden={stage!=='self'}>{props.selfCheck}{stepNav('send')}</div>
         <div className={`ai-stage-pane ai-send${askSubmit?' is-confirm':''}`} hidden={stage!=='send'}>
          <div className="ai-send-head"><span aria-hidden="true"><UiIcon name="send" size={17}/></span><div><b>{tr(askSubmit?'Xác nhận nộp bài':'Sẵn sàng nộp bài')}</b><small>{tr(askSubmit?'Bài viết đang hiện đầy đủ bên trái để bạn đọc lại lần cuối.':'Đọc lại lần cuối rồi gửi cho giảng viên.')}</small></div></div>
          <dl className="ai-send-list">{(['review','score','self'] as const).map(key=><div key={key}><dt>{tr(stages.find(item=>item.key===key)!.label)}</dt><dd className={`is-${stageState[key]||'todo'}`}>{tr(stageState[key]==='done'?'✓ Đã xong':stageState[key]==='redo'?'! Cần làm lại':'Chưa làm')}</dd></div>)}</dl>
          {askSubmit?<>
           <p className={`ai-send-course${course?'':' is-missing'}`}>{course?<><b>{tr('Học phần')}</b>{course.code} · {dt(tr(course.name),course.id)}</>:<>{tr('Chọn học phần trong mục Học phần & chủ đề trước khi nộp.')} <button type="button" className="text-button" onClick={chooseCourse}>{tr('Chọn học phần')}</button></>}</p>
           <p className="ai-send-note">{tr('Sau khi nộp, giảng viên học phần có thể xem bài, phiên bản, quá trình AI hỗ trợ và cam kết gắn với bài. Bản nháp chưa nộp vẫn riêng tư.')}</p>
           <button type="button" className="button full ai-send-button" disabled={!readiness.canSubmit||!!busy} onClick={props.onSubmit}><UiIcon name="send" size={15}/>{busy==='submit'?tr('Đang nộp…'):tr('Xác nhận nộp bài')}</button>
          </>:<button type="button" className="button full ai-send-button" disabled={!!busy} onClick={reviewForSubmit}><UiIcon name="send" size={15}/>{tr('Đọc lại & nộp bài')}</button>}
          <button type="button" className="button full ai-step-back" onClick={backToWriting}><UiIcon name="back" size={14}/>{tr('Sửa bài thêm')}</button>
         </div>
        </>:<div id="reflection-coach-panel">{props.coach}</div>}
       </div>}{hasTab('feedback')&&<div role={tabbed?'tabpanel':undefined} aria-labelledby={tabbed?'reflection-feedback-tab':undefined} id="reflection-feedback-panel" hidden={shown!=='feedback'}>{typeof props.feedback==='function'?props.feedback(edit):props.feedback}</div>}
      </aside></div>
    </div>
  </div>;
}
