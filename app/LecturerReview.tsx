'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {blankAssessment,levelRanges,rubricVersion,validateAssessment,validateAssessmentCriterion} from '../lib/assessment';
import {currentFeedback,finalReview,analysisIsCurrent} from '../lib/progress';
import {kemberDefinitions,levels,totalScore,type Analysis,type AssessmentCriterion,type Criterion,type Data,type ReadingReport,type Reflection} from '../lib/domain';
import {diffText} from '../lib/revision-diff';
import {reflectionText} from '../lib/student-editor';
import {demoContent,demoText,providerLabel} from '../lib/demo-i18n';
import {stageLabel,translate,type Language} from '../lib/i18n';
import {canAssess} from '../lib/lecturer-review';
import {useUnsavedChanges} from './useUnsavedChanges';
import type {LecturerMutation} from './LecturerWorkspace';
import ReflectionBody from './ReflectionBody';
import LecturerActions from './LecturerActions';
import LecturerCoachHistory from './LecturerCoachHistory';
import ReadingCriteria from './ReadingCriteria';
import UiIcon from './UiIcon';
import {StatusTag,formatDate} from './LecturerKit';

type Composer=ReadingReport['feedback'];
type Pager={index:number;total:number;prev?:string;next?:string};
const feedbackLabels:Record<keyof Composer,string>={strengths:'Điểm mạnh',development:'Điểm cần phát triển',evidence:'Căn cứ nhận xét',questions:'Câu hỏi tiếp nối',nextSteps:'Hướng cải thiện'};
const feedbackHints:Record<keyof Composer,string>={strengths:'Sinh viên đã thể hiện tốt điều gì?',development:'Thành phần nào cần được đào sâu hoặc bổ sung?',evidence:'Đoạn viết nào cho thấy điểm mạnh hoặc hạn chế đó?',questions:'Câu hỏi nào giúp sinh viên suy nghĩ sâu hơn?',nextSteps:'Sinh viên nên làm gì trong lần viết tiếp theo?'};
const emptyComposer:Composer={strengths:'',development:'',evidence:'',questions:'',nextSteps:''};
const rangeLabel=(i:number)=>`${String(levelRanges[i][0]).replace('.',',')}–${String(levelRanges[i][1]).replace('.',',')}`;

/** Reading and grading one reflection: the text on the left, the assessment sheet on the right.
 *  AI proposals sit beside the lecturer's own choices and are only copied over on request. */
export default function LecturerReview({reflection:r,data,language,busy,onMutate,backHref,backLabel,similarityHref,afterHref,studentHref,pager,readOnly=false}:{
 reflection:Reflection;data:Data;language:Language;busy:string;onMutate:LecturerMutation;backHref:string;backLabel:string;similarityHref:string;
 afterHref?:string;studentHref?:string;pager?:Pager;readOnly?:boolean;
}){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const course=data.courses.find(c=>c.id===r.courseId),rubric=course?.rubric||data.rubric,versionKey=rubricVersion(rubric);
 const draft=data.learningRecords?.find(d=>d.kind==='review-draft'&&d.ownerId===data.user!.id&&d.reflectionId===r.id);
 const usableDraft=draft?.versionId===r.latestVersion&&draft.payload.rubricVersion===versionKey;
 const final=finalReview(r),prior=final?.scoreScale===10&&final.rubricVersion===versionKey?final:undefined;
 const [criteria,setCriteria]=useState<AssessmentCriterion[]>(()=>usableDraft&&Array.isArray(draft.payload.criteria)?draft.payload.criteria as AssessmentCriterion[]:prior?.criteria||blankAssessment(rubric));
 const [pane,setPane]=useState('reflection');
 const [panel,setPanel]=useState<'grade'|'comment'|'assistant'>('grade'),[assistantPane,setAssistantPane]=useState<'reading'|'feedback'>('reading');
 const [activeCriterion,setActiveCriterion]=useState(0),[triedNext,setTriedNext]=useState(false),[decision,setDecision]=useState<'final'|'returned'>('final');
 const sheetBody=useRef<HTMLDivElement>(null);
 const [level,setLevel]=useState<number|null>(()=>usableDraft?draft.payload.level as number|null:prior?.level||null);
 const [comment,setComment]=useState(()=>usableDraft?String(draft.payload.comment||''):prior?.comment||'');
 const [draftRevision,setDraftRevision]=useState(draft?.revision||0),[versionId,setVersionId]=useState(r.latestVersion),[highlight,setHighlight]=useState('');
 const [pending,setPending]=useState(''),[message,setMessage]=useState<{text:string;error?:boolean}|null>(null),[includeAttachments,setIncludeAttachments]=useState(false);
 const storedReading=r.readingReports?.find(p=>{if(p.payload.rubricVersion&&p.payload.rubricVersion!==versionKey)return false;const v=r.versions.find(v=>v.id===p.versionId);return v?.title===r.title&&JSON.stringify(v.content)===JSON.stringify(r.content)});
 const [reading,setReading]=useState<ReadingReport|null>(()=>storedReading?.payload.result as ReadingReport||null);
 const [feedback,setFeedback]=useState<Composer>(()=>usableDraft&&draft.payload.feedback?draft.payload.feedback as Composer:emptyComposer);
 const [composerOpen,setComposerOpen]=useState(false),[templatesOpen,setTemplatesOpen]=useState(false);
 const [templates,setTemplates]=useState(data.learningRecords?.filter(t=>t.kind==='feedback-template'&&t.courseId===r.courseId)||[]);
 const [templateTitle,setTemplateTitle]=useState(''),[templateCriterion,setTemplateCriterion]=useState('all');
 const selection=useRef('');
 const {markChanged,markSaved}=useUnsavedChanges();
 const version=r.versions.find(v=>v.id===versionId),proposal=currentFeedback(r,rubric),earlier=proposal?undefined:currentFeedback(r),displayed=versionId===r.latestVersion?proposal||earlier:r.analyses.find(a=>a.kind==='feedback'&&a.versionId===versionId);
 // The administrator follows submissions but never grades: assessment belongs to the assigned lecturer (spec 2.9).
 const eligible=!readOnly&&canAssess(r,data.user!.id,versionId),locked=!!busy||!!pending;
 const proposalUsable=!!proposal&&proposal.result.scoreScale===10&&!proposal.result.reviewRequired&&analysisIsCurrent(r,proposal);
 let assessmentError='';try{validateAssessment(criteria,r.content,rubric,r.attachments.map(a=>a.name))}catch(e){assessmentError=e instanceof Error?e.message:''}
 const complete=!assessmentError&&level!==null&&!!comment.trim();
 const criterionIssues=rubric.map((c,i)=>{
  const value=criteria[i],name=tr(c.name);
  if(!value||value.level===null)return tr('Chọn mức độ cho “{0}”.',[name]);
  if(value.score===null)return tr('Nhập điểm “{0}” trong khoảng {1}.',[name,rangeLabel(value.level-1)]);
  if(!value.evidence.trim()&&!value.attachmentNames.length&&!(value.level===1&&(value.missingReason?.trim().length||0)>=10))return tr('Thêm minh chứng nguyên văn cho “{0}”.',[name]);
  if(!value.reason.trim()||!value.improvement.trim())return tr('Viết giải thích và hướng cải thiện cho “{0}”.',[name]);
  try{validateAssessmentCriterion(value,i,r.content,rubric,r.attachments.map(a=>a.name));return ''}catch(error){return tr(error instanceof Error?error.message:'Thao tác chưa hoàn tất.')}
 });
 const completedCount=criterionIssues.filter(issue=>!issue).length;
 const total=criteria.every(c=>c.score!==null)?totalScore(criteria.map(c=>c.score!),rubric):null;
 const missing=criterionIssues.find(Boolean)||tr(assessmentError)||(level===null?tr('Chọn mức Kember cho toàn bài.'):!comment.trim()?tr('Viết nhận xét gửi sinh viên.'):'');

 // Remember the last passage the lecturer highlighted in the reflection, to paste as verbatim evidence.
 useEffect(()=>{
  const track=()=>{const s=window.getSelection(),text=s?.toString().trim()||'';if(text&&s?.anchorNode&&document.getElementById('reflection-original')?.contains(s.anchorNode))selection.current=text};
  document.addEventListener('selectionchange',track);return()=>document.removeEventListener('selectionchange',track);
 },[]);

 function edit(next:AssessmentCriterion[]){setCriteria(next);markChanged()}
 function patch(i:number,value:Partial<AssessmentCriterion>){edit(criteria.map((c,j)=>i===j?{...c,...value}:c))}
 function fromAI(c:Analysis['result']['criteria'][number]):AssessmentCriterion{return {key:c.key,score:c.score,level:c.level??null,evidence:c.evidence,reason:c.behavior,improvement:c.improvement,attachmentNames:c.attachmentNames||[],missingReason:''}}
 async function learning(action:string,extra:Record<string,unknown>={}){setPending(action);setMessage(null);try{const response=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:r.id,rev:r.rev,language,includeAttachments,...extra})});const value=await response.json() as {id:string;revision:number;result:ReadingReport;error?:string};if(!response.ok)throw new Error(value.error);return value}catch(e){setMessage({text:e instanceof Error?e.message:tr('Thao tác chưa hoàn tất.'),error:true});return null}finally{setPending('')}}
 async function review(decision:'final'|'returned'){
  if(await onMutate({action:'review',id:r.id,rev:r.rev,decision,comment,criteria,level,sourceVersion:r.latestVersion,rubricVersion:versionKey},tr(decision==='final'?'Đã xác nhận đánh giá cuối cùng.':'Đã trả bài kèm hướng dẫn chỉnh sửa.'))){markSaved();location.assign(afterHref||backHref)}
 }
 function inspect(quote:string){setPane('reflection');setVersionId(r.latestVersion);setHighlight(quote);requestAnimationFrame(()=>document.querySelector('#reflection-original mark')?.scrollIntoView({behavior:'smooth',block:'center'}))}
 const date=(value:string)=>formatDate(value,language,true);
 // Seeded quotes are shown, and highlighted, in the reader's language.
 const quote=(text:string)=>{const shown=demoText(text,r.id,language);return text?<button type="button" className="lx-quote" title={tr('Xem đoạn gốc')} onClick={()=>inspect(shown)}>“{shown}”</button>:null};

 function showCriterion(index:number){if(!rubric[index])return;setPanel('grade');setActiveCriterion(index);setTriedNext(false);requestAnimationFrame(()=>document.getElementById(`lx-criterion-${rubric[index].key}`)?.scrollIntoView({block:'nearest'}))}
 function showPanel(next:'grade'|'comment'|'assistant'){setPanel(next);setTriedNext(false);requestAnimationFrame(()=>sheetBody.current?.scrollTo({top:0}))}
 function nextAssessment(){
  if(criterionIssues[activeCriterion]){setTriedNext(true);return}
  const next=criterionIssues.findIndex((issue,i)=>i>activeCriterion&&!!issue);
  if(next>=0)showCriterion(next);else {const first=criterionIssues.findIndex(Boolean);if(first>=0)showCriterion(first);else showPanel('comment')}
 }
 const tools:[string,string][]=[['versions','Phiên bản'],['coach','AI Coach'],...(r.selfAssessments?.length?[['self','Tự đánh giá'] as [string,string]]:[]),['actions','Hành động'],...(r.reviews.length?[['history','Nhận xét cũ'] as [string,string]]:[])];
 const paneLabel=tools.find(([key])=>key===pane)?.[1]||'Bài viết';

 return <div className="lx-review is-guided">
  <div className="lx-review-bar">
   <a className="lx-link" href={backHref}><UiIcon name="next" size={15} className="lx-flip"/>{tr(backLabel)}</a>
   <div className="lx-review-toolbar-end"><StatusTag status={r.status} language={language}/>
    {pager&&pager.total>1&&<div className="lx-pager">
     {pager.prev?<a className="lx-icon-btn" href={pager.prev} aria-label={tr('Bài trước')}><UiIcon name="next" size={15} className="lx-flip"/></a>:<span className="lx-icon-btn" aria-hidden="true"><UiIcon name="next" size={15} className="lx-flip"/></span>}
     <span>{tr('{0} / {1}',[pager.index+1,pager.total])}</span>
     {pager.next?<a className="lx-icon-btn" href={pager.next} aria-label={tr('Bài tiếp theo')}><UiIcon name="next" size={15}/></a>:<span className="lx-icon-btn" aria-hidden="true"><UiIcon name="next" size={15}/></span>}
    </div>}
   </div>
  </div>
  {message&&<p className={`lx-notice${message.error?' is-error':''}`} role={message.error?'alert':'status'}>{message.text}</p>}
  {draft&&!usableDraft&&<p className="lx-notice is-warn">{tr('Bản nháp đánh giá thuộc bài hoặc rubric trước. Cần đọc lại và chấm phiên bản hiện tại.')}</p>}
  <div className="lx-review-grid">
   <article className="lx-reading" aria-label={tr('Bài viết của sinh viên')}>
    <div className="lx-document-context"><span>{course?.code} · {tr('Tuần {0}',[r.week])}</span><details className="lx-document-menu"><summary>{tr('Công cụ bài viết')}<UiIcon name="chevron" size={15}/></summary><div>
     {tools.map(([key,label])=><button key={key} type="button" aria-pressed={pane===key} onClick={event=>{setPane(key);event.currentTarget.closest('details')?.removeAttribute('open')}}>{tr(label)}</button>)}
     <a href={similarityHref}>{tr('Kiểm tra trùng lặp bài này')}</a>
    </div></details></div>
    <header className="lx-document-title"><h1>{demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên')}</h1><p>{studentHref?<a href={studentHref}>{r.studentName}</a>:<span>{r.studentName}</span>}</p></header>
    {pane!=='reflection'&&<div className="lx-document-view"><h2>{tr(paneLabel)}</h2><button type="button" className="lx-link" onClick={()=>setPane('reflection')}><UiIcon name="next" className="lx-flip" size={14}/>{tr('Trở về bài viết')}</button></div>}
    {pane==='reflection'&&<>
     {versionId!==r.latestVersion&&<p className="lx-notice is-warn">{tr('Đang xem phiên bản cũ. Chỉ chấm phiên bản mới nhất của bài viết.')} <button className="lx-link" type="button" onClick={()=>{setVersionId(r.latestVersion);setHighlight('')}}>{tr('Xem bản mới nhất')}</button></p>}
     <div className="lx-prose" id="reflection-original">{version&&<ReflectionBody content={version.content} language={language} id={r.id} highlight={highlight} continuous/>}</div>
     <details className="lx-document-details"><summary>{tr('Thông tin & minh chứng')}<UiIcon name="chevron" size={15}/></summary><div className="lx-stack is-tight">
      <p className="lx-muted">{r.studentEmail} · {tr('Cập nhật {0}',[date(r.updatedAt)])}</p>
      <label className="lx-field"><span>{tr('Phiên bản đang đọc')}</span><select value={versionId} onChange={e=>{setVersionId(e.target.value);setHighlight('')}}>{[...r.versions].reverse().map(v=><option key={v.id} value={v.id}>{stageLabel(v.stage,language)} · {date(v.createdAt)}{v.id===r.latestVersion?` · ${tr('mới nhất')}`:''}</option>)}</select></label>
      {r.attachments.length>0?<div className="lx-files">{r.attachments.map(a=><a className="lx-file" key={a.id} href={`/api/files/${a.id}`} target="_blank" rel="noreferrer"><UiIcon name="attachment" size={15}/>{a.name}</a>)}</div>:<p className="lx-muted">{tr('Không có tệp đính kèm.')}</p>}
     </div></details>
    </>}
    {pane==='versions'&&<section className="lx-pane"><Versions reflection={r} language={language}/></section>}

    {pane==='coach'&&<section className="lx-pane"><LecturerCoachHistory reflection={r} language={language}/></section>}

    {pane==='self'&&<section className="lx-pane">{r.selfAssessments?.map(a=><div className="lx-insight" key={a.id}>
     <h3>{tr('Tự đánh giá của sinh viên')} · {String(a.payload.total)}/10 <small className="lx-muted">{date(a.createdAt)}</small></h3>
     <CriteriaTable rubric={rubric} rows={a.payload.criteria as AssessmentCriterion[]} language={language} quote={quote} recordId={r.id}/>
    </div>)}</section>}

    {pane==='actions'&&<section className="lx-pane"><LecturerActions actions={(data.classActions||[]).filter(a=>a.reflectionId===r.id)} reflections={data.classReflections} users={data.users} language={language} hideSource/></section>}

    {pane==='history'&&<section className="lx-pane"><ol className="lx-timeline">{r.reviews.map(g=><li key={g.id}>
     <small>{date(g.createdAt)}</small>
     <p><b>{g.total===null?tr('Trả bài chỉnh sửa'):`${g.total}/10 · ${tr(levels[g.level||0])}`}</b></p>
     <p className="lx-pre">{demoText(g.comment,g.id,language)}</p>
     {g.criteria&&<CriteriaTable rubric={g.rubric} rows={g.criteria} language={language} quote={quote} recordId={g.id}/>}
    </li>)}</ol></section>}

   </article>
   <aside className="lx-sheet" aria-label={tr('Phiếu đánh giá')}>
    <header className="lx-sheet-head"><h2>{tr('Đánh giá bài viết')}</h2>{eligible&&<span className="lx-review-progress">{tr('{0}/4 tiêu chí',[completedCount])}</span>}</header>
    {!eligible?<div className="lx-sheet-body"><p className="lx-notice is-warn">{tr(readOnly?'Quản trị viên chỉ xem bài. Giảng viên phụ trách học phần là người đánh giá.':r.userId===data.user!.id?'Bài của bạn cần một giảng viên khác đánh giá.':r.status==='returned'?'Bài đã được trả để chỉnh sửa. Chờ sinh viên nộp lại.':'Chọn phiên bản mới nhất để đánh giá.')}</p>
     {versionId!==r.latestVersion&&<button type="button" className="lx-btn" onClick={()=>{setVersionId(r.latestVersion);setPane('reflection');setHighlight('')}}>{tr('Xem bản mới nhất')}</button>}
     {final&&<div className="lx-final"><p><b>{final.total}/10</b> · {tr(levels[final.level||0])}</p><p className="lx-pre">{demoText(final.comment,final.id,language)}</p></div>}</div>:<>
    <nav className="lx-review-tabs" aria-label={tr('Các bước đánh giá')}>
     <button type="button" aria-pressed={panel==='grade'} aria-controls="lx-grade-panel" onClick={()=>showPanel('grade')}><span>1</span>{tr('Chấm điểm')}</button>
     <button type="button" aria-pressed={panel==='comment'} aria-controls="lx-response-panel" onClick={()=>showPanel('comment')}><span>2</span>{tr('Nhận xét')}</button>
     <button type="button" aria-pressed={panel==='assistant'} aria-controls="lx-assistant-panel" onClick={()=>showPanel('assistant')}><UiIcon name="coach" size={16}/>{tr('Trợ lý AI')}</button>
    </nav>
    <div className="lx-sheet-body" ref={sheetBody}>
     <div id="lx-grade-panel" hidden={panel!=='grade'} className="lx-grade-panel">
      <p className="lx-step-intro">{tr('Đọc bài bên trái, rồi đánh giá lần lượt bốn tiêu chí.')}</p>
      {rubric.map((c,i)=><CriterionCard key={c.key} criterion={c} value={criteria[i]} index={i} open={activeCriterion===i} done={!criterionIssues[i]} onToggle={()=>showCriterion(i)} ai={proposal?.result.criteria[i]} aiUsable={proposalUsable} attachments={r.attachments.map(a=>a.name)} language={language} disabled={locked}
       onChange={value=>{patch(i,value);setTriedNext(false)}} onUseAI={()=>{if(proposal)patch(i,fromAI(proposal.result.criteria[i]));setTriedNext(false)}} onUseSelection={()=>{if(selection.current)patch(i,{evidence:demoText(selection.current,r.id,'vi')});else setMessage({text:tr('Hãy bôi đen một đoạn trong bài viết trước.'),error:true})}}/>)}
     </div>
     <div id="lx-response-panel" hidden={panel!=='comment'} className="lx-response-panel">
      <fieldset className="lx-return-choice" disabled={locked}><legend>{tr('Bạn muốn gửi gì cho sinh viên?')}</legend><div><button type="button" aria-pressed={decision==='final'} onClick={()=>setDecision('final')}><UiIcon name="check" size={17}/>{tr('Đánh giá cuối')}</button><button type="button" aria-pressed={decision==='returned'} onClick={()=>setDecision('returned')}><UiIcon name="editor" size={17}/>{tr('Yêu cầu chỉnh sửa')}</button></div></fieldset>
      {decision==='final'&&<>
       <div className="lx-review-total"><span>{tr('Điểm cuối')}</span><b>{total!==null?total.toFixed(2):'—'}<small> /10</small></b></div>
       {completedCount<4&&<button type="button" className="lx-grade-reminder" onClick={()=>showCriterion(criterionIssues.findIndex(Boolean))}>{tr('Hoàn tất {0} tiêu chí còn lại',[4-completedCount])}<UiIcon name="next" size={16}/></button>}
       <fieldset className="lx-kember" disabled={locked}><legend>{tr('Mức Kember của toàn bài')}</legend><div className="lx-seg">{[1,2,3,4].map(n=><button key={n} type="button" aria-pressed={level===n} title={tr(kemberDefinitions[n-1])} onClick={()=>{setLevel(n);markChanged()}}><b>{tr('Mức {0}',[n])}</b></button>)}</div>{level&&<p className="lx-level-desc"><b>{tr(levels[level])}</b> · {tr(kemberDefinitions[level-1])}</p>}</fieldset>
      </>}
      {decision==='returned'&&<p className="lx-step-intro">{tr('Viết góp ý để sinh viên biết cần sửa gì. Bạn có thể trả bài mà chưa cần chấm điểm.')}</p>}
     <div className="lx-comment">
      <div className="lx-comment-head"><label htmlFor="lx-final-comment">{tr('Nhận xét gửi sinh viên')}</label>
       <div className="lx-row"><button type="button" className="lx-link" aria-expanded={composerOpen} onClick={()=>setComposerOpen(v=>!v)}>{tr('Soạn theo 5 phần')}</button><button type="button" className="lx-link" aria-expanded={templatesOpen} onClick={()=>setTemplatesOpen(v=>!v)}>{tr('Mẫu nhận xét')}{templates.length>0&&` (${templates.length})`}</button></div>
      </div>
      {composerOpen&&<div className="lx-composer">
       {(Object.keys(feedbackLabels) as (keyof Composer)[]).map(key=><label key={key}><span>{tr(feedbackLabels[key])}</span><textarea rows={2} maxLength={3000} placeholder={tr(feedbackHints[key])} value={feedback[key]} disabled={locked} onChange={e=>{setFeedback(f=>({...f,[key]:e.target.value}));markChanged()}}/></label>)}
       <button type="button" className="lx-btn is-small" disabled={locked||!Object.values(feedback).some(v=>v.trim())} onClick={()=>{setComment((Object.keys(feedbackLabels) as (keyof Composer)[]).filter(k=>feedback[k].trim()).map(k=>`${tr(feedbackLabels[k])}: ${feedback[k]}`).join('\n\n'));markChanged()}}>{tr('Ghép vào nhận xét')}</button>
      </div>}
      {templatesOpen&&<div className="lx-composer">
       <label><span>{tr('Phạm vi mẫu')}</span><select value={templateCriterion} onChange={e=>setTemplateCriterion(e.target.value)}><option value="all">{tr('Toàn bài')}</option>{rubric.map(c=><option key={c.key} value={c.key}>{tr(c.name)}</option>)}</select></label>
       <ul className="lx-templates">{templates.filter(t=>t.payload.criterionKey===templateCriterion).map(t=><li key={t.id}>
        <button type="button" className="lx-link" disabled={locked} title={String(t.payload.text)} onClick={()=>{setComment(c=>[c,String(t.payload.text)].filter(Boolean).join('\n\n'));markChanged()}}>+ {String(t.payload.title)}</button>
        <button type="button" className="lx-icon-btn" aria-label={tr('Xóa mẫu')} disabled={locked} onClick={async()=>{if(await learning('template-remove',{id:t.id}))setTemplates(ts=>ts.filter(x=>x.id!==t.id))}}><UiIcon name="close" size={13}/></button>
       </li>)}{!templates.some(t=>t.payload.criterionKey===templateCriterion)&&<li className="lx-muted">{tr('Chưa có mẫu trong phạm vi này.')}</li>}</ul>
       <div className="lx-row"><input aria-label={tr('Tên mẫu mới')} placeholder={tr('Tên mẫu mới')} maxLength={150} value={templateTitle} onChange={e=>setTemplateTitle(e.target.value)}/><button type="button" className="lx-btn is-small" disabled={locked||!templateTitle.trim()||!comment.trim()} onClick={async()=>{const value=await learning('template-save',{courseId:r.courseId,title:templateTitle,text:comment,criterionKey:templateCriterion});if(value){setTemplates(t=>[...t,{id:value.id,kind:'feedback-template',ownerId:data.user!.id,reflectionId:null,courseId:r.courseId,versionId:null,payload:{title:templateTitle,text:comment,criterionKey:templateCriterion},revision:1,createdAt:'',updatedAt:''}]);setTemplateTitle('')}}}>{tr('Lưu nhận xét thành mẫu')}</button></div>
      </div>}
      <textarea id="lx-final-comment" rows={6} maxLength={8000} value={comment} disabled={locked} placeholder={tr('Nhận xét cụ thể, gắn với bài viết và định hướng lần viết tiếp theo.')} onChange={e=>{setComment(e.target.value);markChanged()}}/>
     </div>

     </div>
     <div id="lx-assistant-panel" hidden={panel!=='assistant'} className="lx-assistant-panel">
      <div className="lx-assistant-switch"><button type="button" aria-pressed={assistantPane==='reading'} onClick={()=>setAssistantPane('reading')}>{tr('Trợ lý đọc')}</button><button type="button" aria-pressed={assistantPane==='feedback'} onClick={()=>setAssistantPane('feedback')}>{tr('AI đề xuất')}</button></div>
     {assistantPane==='feedback'&&<div className="lx-ai-bar">
      {proposal?<p><UiIcon name="coach" size={15}/><span>{tr('AI đề xuất')} <b>{proposal.result.total!=null?proposal.result.total.toFixed(2):'—'}</b>/10 · Kember {proposal.result.level}</span></p>:<p><UiIcon name="coach" size={15}/><span>{tr(earlier?'Đề xuất AI hiện có dùng rubric cũ, chỉ để tham khảo.':'Chưa có đề xuất AI cho bài này.')}</span></p>}
      <div className="lx-row">
       {proposal&&<button type="button" className="lx-btn is-small" disabled={locked||!proposalUsable} onClick={()=>{edit(proposal.result.criteria.map(fromAI));setLevel(proposal.result.level);showCriterion(0);}}>{tr('Áp dụng tất cả đề xuất')}</button>}
       <button type="button" className="lx-btn is-small is-quiet" title={data.aiReady?undefined:tr('Chưa cấu hình kết nối AI. Bạn vẫn có thể chấm trực tiếp.')} disabled={locked||!data.aiReady} onClick={()=>onMutate({action:'review-analyze',id:r.id,rev:r.rev,includeAttachments},tr('Đã phân tích bài để hỗ trợ giảng viên.'))}>{tr(busy==='review-analyze'?'Đang phân tích…':proposal?'Phân tích lại':'Yêu cầu AI đề xuất')}</button>
      </div>
      {r.attachments.length>0&&<label className="lx-check"><input type="checkbox" checked={includeAttachments} disabled={locked} onChange={e=>setIncludeAttachments(e.target.checked)}/>{tr('Gửi kèm minh chứng')}</label>}
      {proposal?.result.reviewRequired&&<small className="lx-warn-text">{tr('AI chưa đủ căn cứ ở một số tiêu chí — cần giảng viên xem xét.')}</small>}
      <small className="lx-muted">{tr('AI chỉ đề xuất; điểm cuối do bạn xác nhận.')}</small>
     </div>}

    {assistantPane==='reading'&&<section className="lx-pane">
     <div className="lx-pane-intro">
      <p>{tr('Tóm tắt kèm trích dẫn để đối chiếu với bài gốc.')}</p>
      <div className="lx-row">
       <button type="button" className="lx-btn" disabled={locked||!eligible||!data.aiReady} onClick={async()=>{const result=await learning('reading-analyze');if(result)setReading(result.result)}}><UiIcon name={pending==='reading-analyze'?'spinner':'search'} size={15}/>{tr(pending==='reading-analyze'?'Đang đọc bài…':reading?'Phân tích lại':'Phân tích sơ bộ bài viết')}</button>
       {r.attachments.length>0&&<label className="lx-check"><input type="checkbox" checked={includeAttachments} disabled={locked} onChange={e=>setIncludeAttachments(e.target.checked)}/>{tr('Gửi kèm minh chứng')}</label>}
       {!data.aiReady&&<small className="lx-muted">{tr('Chưa cấu hình kết nối')}</small>}
      </div>
     </div>
     {reading?<>
      {(['summary','thinking','learning','attention'] as const).map((key,i)=><div className="lx-insight" key={key}>
       <h3>{tr(['Tóm tắt trải nghiệm','Suy nghĩ, cảm xúc và nguyên nhân','Bài học và kế hoạch hành động','Những điểm cần xem xét kỹ'][i])}</h3>
       {reading[key].length?<ul>{reading[key].map((p,j)=><li key={j}><p>{p.text}</p>{quote(p.evidence)}</li>)}</ul>:<p className="lx-muted">{tr('Chưa đủ thông tin để nhận định.')}</p>}
      </div>)}
      <ReadingCriteria report={reading} rubric={rubric} language={language} quote={quote}/>
      {eligible&&<button type="button" className="lx-btn" disabled={locked} onClick={()=>{setFeedback(reading.feedback);setComposerOpen(true);showPanel('comment');markChanged()}}>{tr('Đưa gợi ý vào trình soạn nhận xét')}</button>}
     </>:<p className="lx-empty-line">{tr('Chưa có phân tích cho phiên bản này.')}</p>}
    </section>}

    {assistantPane==='feedback'&&<section className="lx-pane">{displayed?<AIProposal analysis={displayed} rubric={rubric} language={language} quote={quote} current={displayed===proposal&&analysisIsCurrent(r,displayed)} otherRubric={displayed===earlier}/>:<p className="lx-empty-line">{tr('Chưa có đề xuất AI cho phiên bản này. Dùng nút “Yêu cầu AI đề xuất” trong phiếu đánh giá.')}</p>}</section>}


     </div>
    </div>
    <div className="lx-sheet-foot">
     {panel==='grade'&&triedNext&&criterionIssues[activeCriterion]&&<p className="lx-hint" role="alert">{criterionIssues[activeCriterion]}</p>}
     {panel==='comment'&&decision==='final'&&!complete&&<p className="lx-hint" role="status">{missing}</p>}
     {panel==='comment'&&decision==='returned'&&!comment.trim()&&<p className="lx-hint">{tr('Viết nhận xét gửi sinh viên.')}</p>}
     <div className="lx-row"><button type="button" className="lx-btn" disabled={locked} onClick={async()=>{const result=await learning('review-draft-save',{criteria,comment,level,feedback,draftRevision});if(result){setDraftRevision(result.revision);markSaved();setMessage({text:tr('Đã lưu nháp đánh giá. Sinh viên chưa nhìn thấy nhận xét này.')})}}}>{tr('Lưu nháp')}</button>
      {panel==='grade'?<button type="button" className="lx-btn is-primary" disabled={locked} onClick={nextAssessment}>{tr(criterionIssues.some((issue,i)=>i!==activeCriterion&&!!issue)?'Tiêu chí tiếp theo':'Viết nhận xét')}<UiIcon name="next" size={16}/></button>
       :panel==='assistant'?<button type="button" className="lx-btn is-primary" disabled={locked} onClick={()=>showPanel('grade')}>{tr('Tiếp tục đánh giá')}<UiIcon name="next" size={16}/></button>
       :<button type="button" className="lx-btn is-primary" disabled={locked||(decision==='final'?!complete:!comment.trim())} onClick={()=>void review(decision)}>{tr(decision==='final'?'Duyệt và gửi':'Gửi yêu cầu chỉnh sửa')}<UiIcon name="send" size={16}/></button>}
     </div>
    </div>
    </>}
   </aside>
  </div>
 </div>;
}

function CriterionCard({criterion:c,value:v,index,open,done,onToggle,ai,aiUsable,attachments,language,disabled,onChange,onUseAI,onUseSelection}:{
 criterion:Criterion;value:AssessmentCriterion;index:number;open:boolean;done:boolean;onToggle:()=>void;ai?:Analysis['result']['criteria'][number];aiUsable:boolean;attachments:string[];language:Language;disabled:boolean;
 onChange:(value:Partial<AssessmentCriterion>)=>void;onUseAI:()=>void;onUseSelection:()=>void;
}){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args),range=v.level?levelRanges[v.level-1]:null,id=`lx-${c.key}`;
 return <section className={`lx-crit${done?' is-done':''}${open?' is-open':''}`} id={`lx-criterion-${c.key}`}>
  <button type="button" className="lx-criterion-heading" onClick={onToggle} aria-expanded={open} aria-controls={`${id}-body`}><span className="lx-criterion-number">{done?<UiIcon name="check" size={15}/>:index+1}</span><span><b>{tr(c.name)}</b><small>{c.weight}%</small></span><span className="lx-criterion-result">{v.score!==null?`${v.score}/10`:''}</span><UiIcon name="chevron" size={16}/></button>
  <div className="lx-criterion-body" id={`${id}-body`} hidden={!open}>
   <fieldset className="lx-level-picker" disabled={disabled}><legend>{tr('Chọn mức độ')}</legend><div className="lx-seg" role="group" aria-label={`${tr(c.name)} · Level`}>{levelRanges.map((_,j)=><button key={j} type="button" aria-pressed={v.level===j+1} title={tr(c.descriptions[j])} onClick={()=>onChange({level:j+1,score:v.score!==null&&v.score>=levelRanges[j][0]&&v.score<=levelRanges[j][1]?v.score:null})}><b>{tr('Mức {0}',[j+1])}</b></button>)}</div></fieldset>
   {v.level&&<p className="lx-selected-level">{tr(c.descriptions[v.level-1])}</p>}
   <label className="lx-criterion-score" htmlFor={`${id}-score`}><span>{tr('Điểm /10')}</span><input id={`${id}-score`} aria-label={`${tr(c.name)} · ${tr('Điểm /10')}`} type="number" inputMode="decimal" step="0.1" min={range?.[0]??0} max={range?.[1]??10} disabled={disabled||!v.level} placeholder={range?`${range[0]}–${range[1]}`:'—'} value={v.score??''} onChange={e=>onChange({score:e.target.value===''?null:Number(e.target.value)})}/></label>
   {ai&&aiUsable&&!ai.reviewRequired&&<details className="lx-criterion-ai"><summary>{tr('Xem đề xuất AI')}<UiIcon name="chevron" size={14}/></summary><div><p>{tr('AI đề xuất')} {ai.score??'—'}/10 · Level {ai.level}</p><button type="button" className="lx-link" disabled={disabled} onClick={onUseAI}>{tr('Dùng đề xuất')}</button></div></details>}
   <div className="lx-evidence-label"><label htmlFor={`${id}-evidence`}>{tr('Minh chứng nguyên văn')}</label><button type="button" className="lx-link" disabled={disabled} onClick={onUseSelection}><UiIcon name="add" size={14}/>{tr('Lấy đoạn bôi đen')}</button></div>
   <textarea id={`${id}-evidence`} rows={2} maxLength={3000} disabled={disabled} value={v.evidence} placeholder={tr('Bôi đen đoạn trong bài bên trái rồi bấm “Lấy đoạn bôi đen”.')} onChange={e=>onChange({evidence:e.target.value})}/>
   {c.key==='evidenceContext'&&attachments.length>0&&<div className="lx-row">{attachments.map(name=><label className="lx-check" key={name}><input type="checkbox" disabled={disabled} checked={v.attachmentNames.includes(name)} onChange={e=>onChange({attachmentNames:e.target.checked?[...v.attachmentNames,name]:v.attachmentNames.filter(n=>n!==name)})}/>{name}</label>)}</div>}
   {v.level===1&&!v.evidence.trim()&&!v.attachmentNames.length&&<label className="lx-review-field"><span>{tr('Xác nhận thành phần còn thiếu')}</span><textarea rows={2} maxLength={3000} disabled={disabled} value={v.missingReason||''} placeholder={tr('Giải thích rõ thành phần chưa xuất hiện; tối thiểu 10 ký tự.')} onChange={e=>onChange({missingReason:e.target.value})}/></label>}
   <label className="lx-review-field"><span>{tr('Vì sao chọn mức này?')}</span><textarea rows={2} maxLength={3000} disabled={disabled} value={v.reason} placeholder={tr('Giải thích đánh giá dựa trên minh chứng.')} onChange={e=>onChange({reason:e.target.value})}/></label>
   <label className="lx-review-field"><span>{tr('Gợi ý cải thiện')}</span><textarea rows={2} maxLength={3000} disabled={disabled} value={v.improvement} placeholder={tr('Một việc cụ thể sinh viên có thể làm tốt hơn.')} onChange={e=>onChange({improvement:e.target.value})}/></label>
  </div>
 </section>;
}

function AIProposal({analysis:a,rubric,language,quote,current,otherRubric}:{analysis:Analysis;rubric:Criterion[];language:Language;quote:(text:string)=>ReactNode;current:boolean;otherRubric:boolean}){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const result=a.result,names=a.rubric?.length?a.rubric:rubric;
 const demo=a.provider==='Demo fixture';
 return <div className="lx-stack is-tight">
  <div className="lx-ai-summary">
   <div><small>{tr('Tổng điểm AI đề xuất')}</small><b>{result.total!=null?result.total.toFixed(2):'—'}<span>/10</span></b></div>
   <div><small>{tr('Mức Kember AI phân loại')}</small><b>{result.level}<span> · {tr(levels[result.level]||'')}</span></b></div>
   <p className="lx-muted">{providerLabel(a.provider,language)} · {formatDate(a.createdAt,language,true)}{!current&&!otherRubric&&` · ${tr('không khớp phiên bản hiện tại')}`}</p>
  </div>
  {otherRubric&&<p className="lx-notice is-warn">{tr('Đề xuất này dùng rubric trước khi học phần được cập nhật nên không điền được vào phiếu đánh giá.')}</p>}
  {demo&&<p className="lx-notice">{tr('Phản hồi mẫu có sẵn trong dữ liệu dùng thử, không phải kết quả AI thực tế. Bạn có thể yêu cầu AI phân tích lại bài viết.')}</p>}
  {result.reviewRequired&&<p className="lx-notice is-warn">{tr('AI chưa đủ căn cứ ở một số tiêu chí — cần giảng viên xem xét.')}</p>}
  {result.levelReason&&<div className="lx-insight"><h3>{tr('Lý do phân loại Kember')}</h3><p>{result.levelReason}</p>{result.levelEvidence&&quote(result.levelEvidence)}</div>}
  <CriteriaTable rubric={names} language={language} quote={quote} recordId={a.id} rows={result.criteria.map(c=>({key:c.key,level:c.level??null,score:c.score,evidence:c.evidence,reason:c.behavior,improvement:c.improvement,attachmentNames:c.attachmentNames||[],missingReason:c.reviewRequired?tr('Cần xem xét'):''}))} scale={result.scoreScale||4}/>
  {[['Điểm mạnh',result.strengths],['Điểm cần phát triển',result.development],['Câu hỏi gợi mở',result.questions]].filter(([,list])=>(list as string[]).length).map(([label,list])=><div className="lx-insight" key={label as string}><h3>{tr(label as string)}</h3><ul>{(list as string[]).map((t,i)=><li key={i}>{t}</li>)}</ul></div>)}
 </div>;
}

/** The fields of the assessment sheet for one source (AI, self-assessment or an earlier review), one row per criterion. */
function CriteriaTable({rubric,rows,language,quote,scale=10,recordId}:{rubric:Criterion[];rows:AssessmentCriterion[];language:Language;quote:(text:string)=>ReactNode;scale?:number;recordId?:string}){
 const tr=(s:string)=>translate(s,language);
 return <div className="lx-criteria">{rows.map(c=>{const name=rubric.find(x=>x.key===c.key);return <article key={c.key}>
  <header><h4>{tr(name?.name||c.key)}{name&&<small>{name.weight}%</small>}</h4><span>{c.level?`Level ${c.level} · `:''}<b>{c.score??'—'}</b>/{scale}</span></header>
  {c.evidence?quote(c.evidence):c.missingReason?<p className="lx-warn-text">{c.missingReason}</p>:null}
  {c.reason&&<p><span className="lx-label">{tr('Giải thích')}</span>{demoText(c.reason,recordId,language)}</p>}
  {c.improvement&&<p><span className="lx-label">{tr('Gợi ý cải thiện')}</span>{demoText(c.improvement,recordId,language)}</p>}
 </article>})}</div>;
}

/** Draft → AI Coach → revisions → lecturer review, then a side-by-side diff with rubric scores per version. */
function Versions({reflection:r,language}:{reflection:Reflection;language:Language}){
 const tr=(s:string)=>translate(s,language);
 const ordered=[...r.versions].sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
 const [left,setLeft]=useState(ordered.at(-2)?.id||ordered[0]?.id||''),[right,setRight]=useState(r.latestVersion);
 const a=r.versions.find(v=>v.id===left),b=r.versions.find(v=>v.id===right);
 const scores=(id:string)=>{const review=r.reviews.find(g=>g.versionId===id&&g.decision==='final'),analysis=r.analyses.find(g=>g.versionId===id&&g.kind==='feedback');return {rubric:review?.rubric||analysis?.rubric,values:review?.scores||analysis?.result.criteria.map(c=>c.score),scale:review?.scoreScale||analysis?.result.scoreScale||4,total:review?.total??analysis?.result.total,source:review?'GV':analysis?'AI':''}};
 const av=a?scores(a.id):null,bv=b?scores(b.id):null;
 const select=(value:string,change:(v:string)=>void,label:string)=><label className="lx-inline-field">{tr(label)}<select value={value} onChange={e=>change(e.target.value)}>{ordered.map(v=><option key={v.id} value={v.id}>{stageLabel(v.stage,language)} · {formatDate(v.createdAt,language,true)}</option>)}</select></label>;
 return <div className="lx-stack is-tight">
  <ol className="lx-stages">{ordered.map(v=>{const s=scores(v.id);return <li key={v.id} className={v.id===left||v.id===right?'is-picked':''}><b>{stageLabel(v.stage,language)}</b><small>{formatDate(v.createdAt,language,true)}</small>{s.total!=null&&<small>{s.source} {s.total}</small>}</li>})}</ol>
  <div className="lx-pane-tools">{select(left,setLeft,'Phiên bản trước')}{select(right,setRight,'Phiên bản sau')}</div>
  {a&&b&&<>
   <p className="lx-legend"><span><ins>{tr('Thêm')}</ins></span><span><del>{tr('Xóa')}</del></span></p>
   <div className="lx-diff">{diffText(reflectionText(demoContent(a.content,r.id,language)),reflectionText(demoContent(b.content,r.id,language))).map((p,i)=>p.kind==='added'?<ins key={i}>{p.text}</ins>:p.kind==='removed'?<del key={i}>{p.text}</del>:<span key={i}>{p.text}</span>)}</div>
   <table className="lx-table"><thead><tr><th>{tr('Tiêu chí')}</th><th className="is-num">{tr('Phiên bản trước')}</th><th className="is-num">{tr('Phiên bản sau')}</th></tr></thead><tbody>
    {(bv?.rubric||av?.rubric||[]).map(c=>{const score=(v:typeof av)=>{const index=v?.rubric?.findIndex(x=>x.key===c.key)??-1;return index<0||v?.values?.[index]==null?'—':`${v.values[index]}/${v.scale}`};return <tr key={c.key}><td>{tr(c.name)}</td><td className="is-num">{score(av)}</td><td className="is-num">{score(bv)}</td></tr>})}
    <tr><td><b>{tr('Điểm tổng')}</b></td><td className="is-num">{av?.total??'—'} {av?.source&&<small className="lx-muted">{av.source}</small>}</td><td className="is-num">{bv?.total??'—'} {bv?.source&&<small className="lx-muted">{bv.source}</small>}</td></tr>
   </tbody></table>
   <p className="lx-footnote">{tr('Giữ thang điểm và rubric gốc của từng lần đánh giá. Điểm tăng ở một bài chưa đủ để kết luận năng lực phát triển bền vững.')}</p>
  </>}
 </div>;
}
