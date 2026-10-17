'use client';
import {useState} from 'react';
import {blankAssessment,rubricVersion,validateAssessment} from '../lib/assessment';
import {currentFeedback,finalReview,analysisIsCurrent} from '../lib/progress';
import {levels,statuses,totalScore,type AssessmentCriterion,type Data,type ReadingReport,type Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {canAssess} from '../lib/lecturer-review';
import {useUnsavedChanges} from './useUnsavedChanges';
import type {LecturerMutation} from './LecturerWorkspace';
import AssessmentFields from './AssessmentFields';
import {AnalysisResults} from './FeedbackResults';
import ReflectionBody from './ReflectionBody';
import RevisionComparison from './RevisionComparison';
import ActionMonitoring from './ActionMonitoring';

const feedbackLabels={strengths:'Điểm mạnh',development:'Điểm cần phát triển',evidence:'Căn cứ nhận xét',questions:'Câu hỏi tiếp nối',nextSteps:'Hướng cải thiện'};
export default function LecturerReview({reflection:r,data,language,busy,onMutate,backHref,backLabel,similarityHref}:{reflection:Reflection;data:Data;language:Language;busy:string;onMutate:LecturerMutation;backHref:string;backLabel:string;similarityHref:string}){
 const tr=(s:string)=>translate(s,language),rubric=data.courses.find(c=>c.id===r.courseId)?.rubric||data.rubric,versionKey=rubricVersion(rubric);
 const draft=data.learningRecords?.find(d=>d.kind==='review-draft'&&d.ownerId===data.user!.id&&d.reflectionId===r.id);
 const usableDraft=draft?.versionId===r.latestVersion&&draft.payload.rubricVersion===versionKey;
 const final=finalReview(r),prior=final?.scoreScale===10&&final.rubricVersion===versionKey?final:undefined;
 const [criteria,setCriteria]=useState<AssessmentCriterion[]>(()=>usableDraft&&Array.isArray(draft.payload.criteria)?draft.payload.criteria as AssessmentCriterion[]:prior?.criteria||blankAssessment(rubric));
 const [level,setLevel]=useState<number|null>(()=>usableDraft?draft.payload.level as number|null:prior?.level||null);
 const [comment,setComment]=useState(()=>usableDraft?String(draft.payload.comment||''):prior?.comment||'');
 const [draftRevision,setDraftRevision]=useState(draft?.revision||0),[versionId,setVersionId]=useState(r.latestVersion),[highlight,setHighlight]=useState('');
 const [pending,setPending]=useState(''),[message,setMessage]=useState(''),[includeAttachments,setIncludeAttachments]=useState(false);
 const storedReading=r.readingReports?.find(p=>{const v=r.versions.find(v=>v.id===p.versionId);return v?.title===r.title&&JSON.stringify(v.content)===JSON.stringify(r.content)});
 const [reading,setReading]=useState<ReadingReport|null>(()=>storedReading?.payload.result as ReadingReport||null);
 const [feedback,setFeedback]=useState<ReadingReport['feedback']>(()=>usableDraft&&draft.payload.feedback?draft.payload.feedback as ReadingReport['feedback']:{strengths:'',development:'',evidence:'',questions:'',nextSteps:''});
 const [templates,setTemplates]=useState(data.learningRecords?.filter(t=>t.kind==='feedback-template'&&t.courseId===r.courseId)||[]);
 const [templateTitle,setTemplateTitle]=useState(''),[templateCriterion,setTemplateCriterion]=useState('all');
 const {markChanged,markSaved}=useUnsavedChanges();
 const version=r.versions.find(v=>v.id===versionId),proposal=currentFeedback(r,rubric),displayed=versionId===r.latestVersion?proposal:r.analyses.find(a=>a.kind==='feedback'&&a.versionId===versionId);
 const eligible=canAssess(r,data.user!.id,versionId),locked=!!busy||!!pending;
 let complete=false,assessmentError='';try{validateAssessment(criteria,r.content,rubric,r.attachments.map(a=>a.name));complete=level!==null&&!!comment.trim()}catch(e){assessmentError=e instanceof Error?e.message:'';}
 const total=criteria.every(c=>c.score!==null)?totalScore(criteria.map(c=>c.score!),rubric):null;
 async function learning(action:string,extra:Record<string,unknown>={}){setPending(action);setMessage('');try{const response=await fetch('/api/learning',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:r.id,rev:r.rev,language,includeAttachments,...extra})});const value=await response.json() as {id:string;revision:number;result:ReadingReport;error?:string};if(!response.ok)throw new Error(value.error);return value}catch(e){setMessage(e instanceof Error?e.message:tr('Thao tác chưa hoàn tất.'));return null}finally{setPending('')}}
 async function review(decision:'final'|'returned'){
  if(await onMutate({action:'review',id:r.id,rev:r.rev,decision,comment,criteria,level,sourceVersion:r.latestVersion,rubricVersion:versionKey},tr(decision==='final'?'Đã xác nhận đánh giá cuối cùng.':'Đã trả bài kèm hướng dẫn chỉnh sửa.'))){markSaved();location.assign(backHref)}
 }
 function inspect(quote:string){setVersionId(r.latestVersion);setHighlight(quote);document.getElementById('reflection-original')?.scrollIntoView({behavior:'smooth',block:'start'});}
 return <div className="lecturer-review">
  <a className="text-button review-back" href={backHref}>← {tr(backLabel)}</a>
  <div className="page-heading"><div><h1>{r.title||tr('Reflection chưa đặt tên')}</h1><p>{r.studentName} · {r.studentEmail}</p><p>{tr('Tuần')} {r.week} · {data.courses.find(c=>c.id===r.courseId)?.name}</p></div><span className={`badge ${r.status}`}>{tr(statuses[r.status])}</span></div>
  {message&&<p className="notice" role="status">{message}</p>}
  {draft&&!usableDraft&&<p className="notice warning">{tr('Bản nháp đánh giá thuộc bài hoặc rubric trước. Cần đọc lại và chấm phiên bản hiện tại.')}</p>}
  <div className="lecturer-review-layout"><div className="review-reading">
   <section className="panel" id="reflection-original"><div className="section-head"><h3>{tr('Bài viết của sinh viên')}</h3><label className="field review-version">{tr('Phiên bản bài viết')}<select value={versionId} onChange={e=>{setVersionId(e.target.value);setHighlight('')}}>{r.versions.map(v=><option key={v.id} value={v.id}>{v.stage} · {new Date(v.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</option>)}</select></label></div>
    {versionId!==r.latestVersion&&<p className="notice warning">{tr('Chỉ chấm phiên bản mới nhất của bài viết.')}</p>}
    {version&&<ReflectionBody content={version.content} language={language} id={version.id} highlight={highlight}/>}
    <div className="attachment-area">{r.attachments.map(a=><a className="file-chip" key={a.id} href={`/api/files/${a.id}`}>{a.name}</a>)}</div>
    <a className="button section-margin" href={similarityHref}>{tr('Kiểm tra trùng lặp bài này')}</a>
   </section>
   <section className="panel section-margin"><h3>{tr('Trợ lý đọc và phân tích sơ bộ')}</h3><p className="muted">{tr('Mỗi nhận định có trích dẫn để kiểm tra với bài gốc. Giảng viên vẫn cần đọc toàn văn.')}</p>
    <label className="evidence-option"><input type="checkbox" checked={includeAttachments} disabled={locked||!r.attachments.length} onChange={e=>setIncludeAttachments(e.target.checked)}/>{tr('Gửi kèm minh chứng')}</label>
    <button className="button" disabled={locked||!eligible||!data.aiReady} onClick={async()=>{const result=await learning('reading-analyze');if(result)setReading(result.result)}}>{tr(pending==='reading-analyze'?'Đang đọc bài…':'Phân tích để hỗ trợ đọc bài')}</button>
    {!data.aiReady&&<p className="muted">{tr('Chưa cấu hình kết nối')}</p>}
    {reading&&<>{(['summary','thinking','learning','attention'] as const).map((key,i)=><div key={key}><h4>{tr(['Tóm tắt trải nghiệm','Suy nghĩ, cảm xúc và nguyên nhân','Bài học và kế hoạch hành động','Những điểm cần xem xét kỹ'][i])}</h4>{reading[key].map((p,j)=><article key={j}><p>{p.text}</p><blockquote>{p.evidence}</blockquote><button className="text-button" onClick={()=>inspect(p.evidence)}>{tr('Xem đoạn gốc')}</button></article>)}{!reading[key].length&&<p className="muted">{tr('Chưa đủ thông tin để nhận định.')}</p>}</div>)}
     <button className="button" disabled={!eligible||locked} onClick={()=>{setFeedback(reading.feedback);markChanged()}}>{tr('Đưa gợi ý vào trình soạn nhận xét')}</button>
    </>}
   </section>
   <details className="panel section-margin"><summary>{tr('Feedback AI theo rubric')}</summary>{displayed?<AnalysisResults analysis={displayed} language={language}/>:<p>{tr('Chưa có phân tích theo phiên bản này.')}</p>}</details>
   {!!r.selfAssessments?.length&&<details className="panel section-margin"><summary>{tr('Tự đánh giá của sinh viên')}</summary>{r.selfAssessments.map(a=><article key={a.id}><small>{new Date(a.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})} · {String(a.payload.total)}/10</small>{(a.payload.criteria as AssessmentCriterion[]).map(c=><details key={c.key}><summary>{tr(rubric.find(r=>r.key===c.key)?.name||c.key)} · Level {c.level} · {c.score}/10</summary><blockquote>{c.evidence||c.missingReason}</blockquote><p>{c.reason}</p><p>{c.improvement}</p></details>)}</article>)}</details>}
   <details className="panel section-margin"><summary>{tr('Lịch sử AI Coach và quá trình hỗ trợ')}</summary>{r.analyses.filter(a=>a.kind==='coach').map(a=><details key={a.id}><summary>{a.provider} · {new Date(a.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</summary><AnalysisResults analysis={a} language={language}/>{a.result.questions.map((q,i)=><p key={i}>{q}</p>)}</details>)}{r.coachTurns?.map(t=><article key={t.id}><small>{new Date(t.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</small><p>{t.question==='__reflection_thinking__'?tr('Tư duy cùng AI'):t.question}</p><p>{t.reply}</p></article>)}</details>
   <RevisionComparison reflection={r} language={language}/>
   <ActionMonitoring actions={(data.classActions||[]).filter(a=>a.reflectionId===r.id)} reflections={data.classReflections} users={data.users} language={language}/>
   {r.reviews.length>0&&<section className="panel section-margin"><h3>{tr('Lịch sử nhận xét')}</h3>{r.reviews.map(g=><article key={g.id}><b>{g.total===null?tr('Trả bài chỉnh sửa'):`${g.total}/10`}</b><small> · {new Date(g.createdAt).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</small><p>{g.comment}</p>{g.criteria?.map(c=><details key={c.key}><summary>{tr(g.rubric.find(r=>r.key===c.key)?.name||c.key)} · Level {c.level} · {c.score}/10</summary><blockquote>{c.evidence||c.missingReason}</blockquote><p>{c.reason}</p><p>{c.improvement}</p></details>)}</article>)}</section>}
  </div>
  <aside className="panel lecturer-grading"><h3>{tr('Đánh giá của giảng viên')}</h3>
   {!eligible?<p className="notice warning">{tr(r.userId===data.user!.id?'Bài của bạn cần một giảng viên khác đánh giá.':'Chờ sinh viên nộp lại hoặc chọn phiên bản mới nhất để đánh giá.')}</p>:<>
    <p className="muted">{tr('Mỗi tiêu chí có Level, điểm /10, căn cứ và hướng cải thiện. Mức Kember được chọn riêng cho toàn bài.')}</p>
    <details><summary>{tr('AI hỗ trợ đánh giá (tùy chọn)')}</summary>
     <button className="button full" disabled={locked||!data.aiReady} onClick={()=>onMutate({action:'review-analyze',id:r.id,rev:r.rev,includeAttachments},tr('Đã phân tích bài để hỗ trợ giảng viên.'))}>{tr('Phân tích bài bằng AI')}</button>
     {proposal&&<button className="button full" disabled={locked||proposal.result.scoreScale!==10||proposal.result.reviewRequired||!analysisIsCurrent(r,proposal)} onClick={()=>{setCriteria(proposal.result.criteria.map(c=>({key:c.key,score:c.score,level:c.level??null,evidence:c.evidence,reason:c.behavior,improvement:c.improvement,attachmentNames:c.attachmentNames||[],missingReason:''})));setLevel(proposal.result.level);markChanged()}}>{tr('Dùng đề xuất AI để xem xét')}</button>}
    </details>
    <AssessmentFields collapsible criteria={criteria} rubric={rubric} attachments={r.attachments} language={language} disabled={locked} onChange={next=>{setCriteria(next);markChanged()}}/>
    <label className="field">{tr('Mức Kember của toàn bài')}<select value={level??''} disabled={locked} onChange={e=>{setLevel(e.target.value?Number(e.target.value):null);markChanged()}}><option value="">{tr('Chọn mức Kember')}</option>{[1,2,3,4].map(n=><option key={n} value={n}>{n} · {tr(levels[n])}</option>)}</select></label>
    <details><summary>{tr('Soạn nhận xét sư phạm')}</summary>{Object.entries(feedbackLabels).map(([key,label])=><label className="field" key={key}>{tr(label)}<textarea rows={2} maxLength={3000} value={feedback[key as keyof typeof feedback]} disabled={locked} onChange={e=>{setFeedback(f=>({...f,[key]:e.target.value}));markChanged()}}/></label>)}<button className="button" disabled={locked} onClick={()=>{setComment(Object.entries(feedbackLabels).filter(([k])=>feedback[k as keyof typeof feedback].trim()).map(([k,label])=>`${tr(label)}: ${feedback[k as keyof typeof feedback]}`).join('\n\n'));markChanged()}}>{tr('Đưa vào nhận xét cuối')}</button></details>
    <label className="field">{tr('Nhận xét cuối cùng gửi sinh viên')}<textarea rows={7} maxLength={8000} value={comment} disabled={locked} onChange={e=>{setComment(e.target.value);markChanged()}}/></label>
    <details><summary>{tr('Mẫu nhận xét theo học phần và tiêu chí')}</summary><label className="field">{tr('Tiêu chí')}<select value={templateCriterion} onChange={e=>setTemplateCriterion(e.target.value)}><option value="all">{tr('Toàn bài')}</option>{rubric.map(c=><option key={c.key} value={c.key}>{tr(c.name)}</option>)}</select></label>
     {templates.filter(t=>t.payload.criterionKey===templateCriterion).map(t=><div key={t.id}><button className="text-button" disabled={locked} onClick={()=>{setComment(c=>[c,String(t.payload.text)].filter(Boolean).join('\n\n'));markChanged()}}>{String(t.payload.title)}</button><button className="text-button" disabled={locked} onClick={async()=>{if(await learning('template-remove',{id:t.id}))setTemplates(ts=>ts.filter(x=>x.id!==t.id))}}>{tr('Xóa mẫu')}</button></div>)}
     <label className="field">{tr('Tên mẫu mới')}<input maxLength={150} value={templateTitle} onChange={e=>setTemplateTitle(e.target.value)}/></label><button className="button" disabled={locked||!templateTitle.trim()||!comment.trim()} onClick={async()=>{const value=await learning('template-save',{courseId:r.courseId,title:templateTitle,text:comment,criterionKey:templateCriterion});if(value){setTemplates(t=>[...t,{id:value.id,kind:'feedback-template',ownerId:data.user!.id,reflectionId:null,courseId:r.courseId,versionId:null,payload:{title:templateTitle,text:comment,criterionKey:templateCriterion},revision:1,createdAt:'',updatedAt:''}]);setTemplateTitle('')}}}>{tr('Lưu nhận xét thành mẫu')}</button>
    </details>
    <div className="grading-actions"><p className="review-total">{tr('Điểm cuối')}: <b>{total??'—'}/10</b></p>
    <button className="button full" disabled={locked} onClick={async()=>{const result=await learning('review-draft-save',{criteria,comment,level,feedback,draftRevision});if(result){setDraftRevision(result.revision);markSaved();setMessage(tr('Đã lưu nháp đánh giá. Sinh viên chưa nhìn thấy nhận xét này.'))}}}>{tr('Lưu nháp, chưa gửi')}</button>
    {assessmentError&&criteria.some(c=>c.score!==null)&&<p className="muted" role="status">{tr(assessmentError)}</p>}<button className="button primary full section-margin" disabled={locked||!complete} onClick={()=>void review('final')}>{tr('Duyệt và gửi đánh giá cuối')}</button>
    <button className="button full section-margin" disabled={locked||!comment.trim()} onClick={()=>void review('returned')}>{tr('Trả bài kèm nhận xét')}</button></div>
   </>}
  </aside></div>
 </div>;
}
