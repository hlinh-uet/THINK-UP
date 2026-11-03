'use client';

import {useState} from 'react';
import {levels,type Criterion,type Reflection,type Review} from '../lib/domain';
import {criterionLevel} from '../lib/assessment';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {formatMessageTimestamp} from '../lib/message-date';
import type {ReflectionDraft} from '../lib/student-editor';
import FeedbackResults from './FeedbackResults';
import ReflectionGuidance from './ReflectionGuidance';
import SelfAssessment from './SelfAssessment';
import RevisionComparison from './RevisionComparison';
import UiIcon from './UiIcon';

type Props={reflection?:Reflection;draft:ReflectionDraft|null;rubric:Criterion[];language:Language;aiReady:boolean;busy:string;
 onAnalyze:()=>void;onRubric:()=>void;onCommit:(text:string)=>void;ensureSaved:()=>Promise<Reflection|null>;onSaved:()=>Promise<unknown>;onEdit?:()=>void};

/** The lecturer's assessment in four parts: the result, the comment, what to do next, then the criterion details.
 *  Earlier reviews reuse it in compact form, without the result block or the next step. */
function LecturerFeedback({review,language,compact=false,editable=false,onEdit,onCommit}:{review:Review;language:Language;compact?:boolean;editable?:boolean;onEdit?:()=>void;onCommit?:(text:string)=>void}){
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args),dt=(text:string)=>demoText(text,review.id,language);
 const [expanded,setExpanded]=useState(false),comment=dt(review.comment),long=compact&&comment.length>280;
 const final=review.decision==='final',scale=review.scoreScale||4,level=review.level&&review.level>=1&&review.level<=4?review.level:0;
 const scores=review.rubric.map((criterion,index)=>{const detail=review.criteria?.find(c=>c.key===criterion.key);return {criterion,detail,score:detail?.score??review.scores[index]}});
 const rated=scores.filter(s=>typeof s.score==='number');
 const best=rated.length>1?rated.reduce((a,b)=>b.score!>a.score!?b:a):undefined,weakest=rated.length>1?rated.reduce((a,b)=>b.score!<a.score!?b:a):undefined;
 const spread=!!best&&!!weakest&&best.score!>weakest.score!;
 // Bars use the same green scale as the reflection tiles: the criterion level sets the shade.
 const levelOf=(score:number)=>scale===4?Math.round(score):criterionLevel(score);
 const tip=weakest?(weakest.detail?.improvement?dt(weakest.detail.improvement):tr('Tập trung cải thiện tiêu chí “{0}” ở bài tiếp theo.',[tr(weakest.criterion.name)])):'';
 const R=42,C=2*Math.PI*R,total=review.total??0;
 return <section className={`lecturer-feedback${final?' is-final':' is-returned'}${compact?' is-compact':''}`} tabIndex={-1} aria-label={tr('Đánh giá của giảng viên')}>
  {!compact&&(final?<div className={`fb-hero is-final${level===4?' is-top':''}`}>
   {level===4&&<span className="fb-star"><UiIcon name="sparkle" size={13}/>{tr('Xuất sắc')}</span>}
   {review.total!=null&&<div className="fb-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="fb-ring-track" cx="50" cy="50" r={R} fill="none" stroke="#dde5d7" strokeWidth="10"/><circle className="fb-ring-value" cx="50" cy="50" r={R} fill="none" stroke="#718b65" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C*(1-Math.min(total,10)/10)}/></svg><div><strong className="teacher-feedback-score">{review.total}</strong><span>/ 10</span></div></div>}
   <div className="fb-hero-copy"><small><UiIcon name="check" size={13}/>{tr('Đánh giá cuối cùng')}</small><h4>{level?`${tr('Mức {0}',[level])} · ${tr(levels[level])}`:tr('Đánh giá cuối cùng')}</h4>
    {level>0&&<span className="fb-steps" role="img" aria-label={tr('Mức Kember của toàn bài')+`: ${level}/4`}>{[1,2,3,4].map(n=><i key={n} className={n<=level?'is-on':''}/>)}<em>{tr(level===4?'mức cao nhất':'Mức Kember của toàn bài')}</em></span>}</div>
  </div>:<div className="fb-hero is-returned"><span className="fb-hero-icon" aria-hidden="true"><UiIcon name="editor" size={24}/></span><div className="fb-hero-copy"><small>{tr('Cần chỉnh sửa')}</small><h4>{tr('Đề nghị chỉnh sửa')}</h4><p>{tr('Sửa bài theo nhận xét dưới đây rồi nộp lại. Chưa có điểm chính thức.')}</p></div></div>)}
  <div className="fb-message"><span className="fb-avatar" aria-hidden="true"><UiIcon name="lecturer" size={16}/></span><div className="fb-bubble"><small>{tr('Đánh giá của giảng viên')} · {formatMessageTimestamp(review.createdAt,language).date}</small>
   <p className={`teacher-feedback-comment${long&&!expanded?' is-collapsed':''}`}>{comment}</p>
   {long&&<button type="button" className="teacher-feedback-read" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{tr(expanded?'Thu gọn':'Đọc đầy đủ')}<UiIcon name="chevron" size={13}/></button>}</div></div>
  {!compact&&(!final?<div className="fb-next"><b><UiIcon name="next" size={14}/>{tr('Việc cần làm tiếp')}</b><p>{tr('Mở bài, sửa theo các ý trên rồi nộp lại.')}</p>{editable&&onEdit&&<button type="button" className="fb-next-button" onClick={onEdit}><UiIcon name="editor" size={16}/>{tr('Sửa bài ngay')}</button>}</div>
   :weakest&&spread?<div className="fb-next"><b><UiIcon name="next" size={14}/>{tr('Việc cần làm tiếp')}</b><p>{tr('Tiêu chí thấp nhất là')} <strong>{tr(weakest.criterion.name)}</strong>: {tip}</p>{onCommit&&<button type="button" className="fb-next-button is-green" onClick={()=>onCommit(tip)}><UiIcon name="actions" size={16}/>{tr('Tạo cam kết từ góp ý này')}</button>}</div>:null)}
  {rated.length>0&&<>
   <div className="fb-section-head"><b>{tr('Điểm từng tiêu chí')}</b></div>
   <dl className="feedback-score-list fb-bars">{scores.map(({criterion,score})=><div key={criterion.key}><dt>{tr(criterion.name)}{spread&&criterion===best?.criterion&&<span className="fb-tag is-best"><UiIcon name="check" size={11}/>{tr('Mạnh nhất')}</span>}{spread&&criterion===weakest?.criterion&&<span className="fb-tag is-low">{tr('Cần cải thiện')}</span>}</dt><dd>{score??'—'}<small>/{scale}</small></dd>{typeof score==='number'&&<span className={`fb-bar is-level-${levelOf(score)}`} aria-hidden="true"><i style={{width:`${Math.min(score/scale,1)*100}%`}}/></span>}</div>)}
    {compact&&review.level!=null&&<div className="score-level"><dt>{tr('Mức Kember của toàn bài')}</dt><dd>{review.level}<small>/4</small></dd></div>}
   </dl>
   {!!review.criteria?.length&&<details className="teacher-feedback-criteria feedback-explanation"><summary><span><UiIcon name="document" size={15}/>{tr('Minh chứng và gợi ý cải thiện')}</span><UiIcon name="chevron" size={15}/></summary><div className="criterion-explanations">
    {review.rubric.map(criterion=>{const detail=review.criteria?.find(c=>c.key===criterion.key);return detail?<article key={criterion.key}><h5>{tr(criterion.name)}{detail.level!=null&&<small>Level {detail.level}</small>}</h5>{(detail.evidence||detail.missingReason)&&<blockquote>{dt(detail.evidence||detail.missingReason||'')}</blockquote>}{detail.reason&&<p>{dt(detail.reason)}</p>}{detail.improvement&&<p><b>{tr('Gợi ý cải thiện')}</b>{dt(detail.improvement)}</p>}</article>:null})}
   </div></details>}
   {scale===4&&<p className="support-caption">{tr('Đánh giá lịch sử dùng thang 1–4. Điểm gốc được giữ nguyên.')}</p>}
  </>}
 </section>;
}

/** Confirmed lecturer feedback comes first; AI scores remain clearly labelled reference material. */
export default function StudentFeedbackPanel({reflection,draft,rubric,language,onRubric,onCommit,ensureSaved,onSaved,onEdit}:Props){
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const reviews=[...(reflection?.reviews||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),latest=reviews[0];
 const analysis=reflection?.analyses.find(a=>a.kind==='feedback'),editable=!!draft&&['draft','returned'].includes(draft.status);
 return <section className="panel feedback-panel student-feedback-panel">
  <div className="support-section-heading"><h3>{tr('Phản hồi bài viết')}</h3><button type="button" className="text-button" onClick={onRubric}>{tr('Xem rubric')}<UiIcon name="arrow" size={13}/></button></div>
  {latest?<LecturerFeedback key={latest.id} review={latest} language={language} editable={editable} onEdit={onEdit} onCommit={onCommit}/>
   :<div className="fb-hero is-waiting"><span className="fb-hero-icon" aria-hidden="true"><UiIcon name={reflection?.status==='submitted'?'lecturer':'document'} size={24}/></span><div className="fb-hero-copy"><small>{tr(reflection?.status==='submitted'?'Chờ giảng viên':'Bản nháp')}</small><h4 className="teacher-feedback-empty">{tr('Chưa có nhận xét từ giảng viên.')}</h4><p>{tr(reflection?.status==='submitted'?'Giảng viên sẽ chấm và nhận xét bài này. Trong lúc chờ, bạn có thể xem đối chiếu rubric với AI bên dưới.':'Nộp bài để nhận nhận xét của giảng viên. Bạn có thể đối chiếu rubric với AI trước khi nộp.')}</p></div></div>}
  <details className="support-disclosure ai-rubric-section" open={!latest}>
   <summary><span><UiIcon name="progress" size={15}/>{tr('Đối chiếu rubric với AI')}</span><small className="support-reference">{tr('Tham khảo')}</small><UiIcon name="chevron" size={15}/></summary>
   <div className="support-disclosure-body">
    <p className="support-caption">{tr('Điểm AI là tham khảo; điểm chính thức do giảng viên xác nhận.')}</p>
    {/* While writing, the trial grade is run from the assistant's Chấm thử stage; this keeps its latest result for reference. */}
    {reflection?<FeedbackResults reflection={reflection} language={language} draft={draft}/>:<p className="rubric-empty">{tr('Lưu bài để bắt đầu xem kết quả đánh giá.')}</p>}
    {analysis&&<div className="feedback-more"><ReflectionGuidance analysis={analysis} language={language} onCommit={onCommit}/></div>}
   </div>
  </details>
  {reflection&&<div className="feedback-tools">
   {reviews.length>1&&<details className="support-disclosure teacher-feedback-history"><summary><span>{tr('Nhận xét trước đây')}</span><small>{reviews.length-1}</small><UiIcon name="chevron" size={15}/></summary><div className="support-disclosure-body">{reviews.slice(1).map(review=><div key={review.id} className="teacher-history-item"><LecturerFeedback review={review} language={language} compact/></div>)}</div></details>}
   {/* Self-assessment is filled in the assistant while writing; locked work keeps the saved forms here. */}
   {!editable&&!!reflection.selfAssessments?.length?<SelfAssessment key={reflection.id} reflection={reflection} rubric={rubric} language={language} ensureSaved={ensureSaved} onSaved={onSaved}/>:null}
   {reflection.versions.length>1&&<RevisionComparison reflection={reflection} language={language}/>}
  </div>}
 </section>;
}
