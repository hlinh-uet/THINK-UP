'use client';
import {criterionLevel} from '../lib/assessment';
import {writingMatchesSaved,type ReflectionDraft} from '../lib/student-editor';
import {analysisIsCurrent} from '../lib/progress';
import {translate,type Language} from '../lib/i18n';
import {demoText,providerLabel} from '../lib/demo-i18n';
import type {Analysis,Reflection} from '../lib/domain';
import FeedbackProvenance from './FeedbackProvenance';
import UiIcon from './UiIcon';
import {localizedAnalysis} from '../lib/feedback-language';
export function AnalysisResults({analysis:sourceAnalysis,language,compact=false,stale=false}:{analysis:Analysis;language:Language;compact?:boolean;stale?:boolean}){
 const analysis=localizedAnalysis(sourceAnalysis,language);
 const tr=(s:string)=>translate(s,language),result=analysis.result,scale=result.scoreScale||4;
 const levelOf=(c:typeof result.criteria[number])=>c.level===null?tr('Cần xem xét'):`Level ${c.level??(scale===4?c.score:criterionLevel(c.score!))}`;
 // Show scores together; one disclosure holds all supporting explanations.
 if(compact)return <div className="analysis-results is-compact">
  <div className="rubric-summary"><b>{result.total===null?'—':result.total}<small>/10</small></b>{result.level!=null&&<span className="rubric-kember" title={tr('Mức Kember của toàn bài')}>Kember {result.level}/4</span>}<small className="rubric-provider">{providerLabel(analysis.provider,language)}</small></div>
  <FeedbackProvenance sample={analysis.provider==='Demo fixture'} stale={stale} language={language}/>
  {scale===4&&<p className="rubric-note">{tr('Đánh giá lịch sử dùng thang 1–4. Điểm gốc được giữ nguyên.')}</p>}
  {result.reviewRequired&&<p className="rubric-note is-warning">{tr('Chưa đủ minh chứng. Cần giảng viên xem xét trước khi xác định điểm.')}</p>}
  <dl className="feedback-score-list">{result.criteria.map((c,i)=><div key={c.key}><dt>{tr(analysis.rubric[i]?.name||c.key)}<small>{analysis.rubric[i]?.weight}%</small></dt><dd>{c.score===null?'—':c.score}<small>/{scale}</small></dd></div>)}</dl>
  <details className="feedback-explanation"><summary><span>{tr('Minh chứng và gợi ý cải thiện')}</span><UiIcon name="chevron" size={15}/></summary><div className="criterion-explanations">
   {result.criteria.map((c,i)=><article key={c.key}><h5>{tr(analysis.rubric[i]?.name||c.key)}<small>{levelOf(c)}</small></h5><p>{translate(demoText(c.behavior,analysis.id,language),language)}</p>{c.evidence&&<blockquote><small className="source-quote-label">{tr('Trích dẫn gốc')}</small>{demoText(c.evidence,analysis.id,language)}</blockquote>}{!!c.attachmentNames?.length&&<small>{c.attachmentNames.join(', ')}</small>}{c.improvement&&<p><b>{tr('Gợi ý cải thiện')}</b>{demoText(c.improvement,analysis.id,language)}</p>}</article>)}
   {result.levelReason&&<article><h5>{tr('Mức Kember của toàn bài')}<small>{result.level}/4</small></h5><p>{demoText(result.levelReason,analysis.id,language)}</p>{result.levelEvidence&&<blockquote><small className="source-quote-label">{tr('Trích dẫn gốc')}</small>{demoText(result.levelEvidence,analysis.id,language)}</blockquote>}</article>}
  </div></details>
 </div>;
 return <div className="analysis-results">
  {analysis.provider==='Demo fixture'&&<p className="notice warning">{tr('Phản hồi mẫu có sẵn trong dữ liệu dùng thử, không phải kết quả AI thực tế. Bạn có thể yêu cầu AI phân tích lại bài viết.')}</p>}
  {scale===4&&<p className="notice">{tr('Đánh giá lịch sử dùng thang 1–4. Điểm gốc được giữ nguyên.')}</p>}
  <p><b>{result.total===null?'—':`${result.total}/10`}</b> · {providerLabel(analysis.provider,language)}</p>
  {result.reviewRequired&&<p className="notice warning">{tr('Chưa đủ minh chứng. Cần giảng viên xem xét trước khi xác định điểm.')}</p>}
  {result.criteria.map((c,i)=><article className="review-ai-criterion" key={c.key}><div className="section-head"><h4>{tr(analysis.rubric[i]?.name||c.key)}</h4><b>{c.score===null?'—':`${c.score}/${scale}`}</b></div>
   <small>{c.level===null?tr('Cần xem xét'):`Level ${c.level??(scale===4?c.score:criterionLevel(c.score!))}`} · {analysis.rubric[i]?.weight}%</small>
   <p>{translate(demoText(c.behavior,analysis.id,language),language)}</p>{c.evidence&&<blockquote>{demoText(c.evidence,analysis.id,language)}</blockquote>}
   {!!c.attachmentNames?.length&&<small>{c.attachmentNames.join(', ')}</small>}<p>{demoText(c.improvement,analysis.id,language)}</p>
  </article>)}
  {result.levelReason&&<p><b>{tr('Mức Kember của toàn bài')}: {result.level}/4.</b> {demoText(result.levelReason,analysis.id,language)}</p>}
  {result.levelEvidence&&<blockquote>{demoText(result.levelEvidence,analysis.id,language)}</blockquote>}
 </div>;
}
export default function FeedbackResults({reflection,language,draft}:{reflection:Reflection;language:Language;draft?:ReflectionDraft|null}){
 const tr=(s:string)=>translate(s,language),analysis=reflection.analyses.find(a=>a.kind==='feedback');
 return analysis?<AnalysisResults analysis={analysis} language={language} compact stale={!analysisIsCurrent(reflection,analysis)||!!draft&&!writingMatchesSaved(draft,reflection)}/>:<p className="rubric-empty">{tr('Chưa có phân tích theo rubric. Bạn có thể tự đánh giá hoặc yêu cầu AI hỗ trợ trước khi nộp.')}</p>;
}
