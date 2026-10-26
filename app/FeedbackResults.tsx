'use client';
import {criterionLevel} from '../lib/assessment';
import {writingMatchesSaved,type ReflectionDraft} from '../lib/student-editor';
import {analysisIsCurrent} from '../lib/progress';
import {translate,type Language} from '../lib/i18n';
import {demoText,providerLabel} from '../lib/demo-i18n';
import type {Analysis,Reflection} from '../lib/domain';
export function AnalysisResults({analysis,language,compact=false}:{analysis:Analysis;language:Language;compact?:boolean}){
 const tr=(s:string)=>translate(s,language),result=analysis.result,scale=result.scoreScale||4;
 const levelOf=(c:typeof result.criteria[number])=>c.level===null?tr('Cần xem xét'):`Level ${c.level??(scale===4?c.score:criterionLevel(c.score!))}`;
 // Students scan the totals first and open one criterion at a time.
 if(compact)return <div className="analysis-results is-compact">
  <div className="rubric-summary"><b>{result.total===null?'—':result.total}<small>/10</small></b>{result.level!=null&&<span className="rubric-kember" title={tr('Mức Kember của toàn bài')}>Kember {result.level}/4</span>}<small className="rubric-provider">{providerLabel(analysis.provider,language)}</small></div>
  {analysis.provider==='Demo fixture'&&<p className="rubric-note">{tr('Phản hồi mẫu có sẵn trong dữ liệu dùng thử, không phải kết quả AI thực tế. Bạn có thể yêu cầu AI phân tích lại bài viết.')}</p>}
  {scale===4&&<p className="rubric-note">{tr('Đánh giá lịch sử dùng thang 1–4. Điểm gốc được giữ nguyên.')}</p>}
  {result.reviewRequired&&<p className="rubric-note is-warning">{tr('Chưa đủ minh chứng. Cần giảng viên xem xét trước khi xác định điểm.')}</p>}
  <div className="rubric-rows">{result.criteria.map((c,i)=><details className="rubric-row" key={c.key}>
   <summary><span className="rubric-row-name">{tr(analysis.rubric[i]?.name||c.key)}<small>{analysis.rubric[i]?.weight}%</small></span><span className="rubric-row-bar" aria-hidden="true"><i style={{width:`${c.score===null?0:c.score/scale*100}%`}}/></span><b>{c.score===null?'—':c.score}<small>/{scale}</small></b></summary>
   <div className="rubric-row-body"><p><span className="rubric-level">{levelOf(c)}</span>{translate(demoText(c.behavior,analysis.id,language),language)}</p>{c.evidence&&<blockquote>{demoText(c.evidence,analysis.id,language)}</blockquote>}
    {!!c.attachmentNames?.length&&<small>{c.attachmentNames.join(', ')}</small>}{c.improvement&&<p className="rubric-improve"><b>{tr('Gợi ý cải thiện')}</b>{demoText(c.improvement,analysis.id,language)}</p>}</div>
  </details>)}</div>
  {result.levelReason&&<details className="rubric-row rubric-kember-reason"><summary><span className="rubric-row-name">{tr('Mức Kember của toàn bài')}</span><b>{result.level}<small>/4</small></b></summary><div className="rubric-row-body"><p>{demoText(result.levelReason,analysis.id,language)}</p>{result.levelEvidence&&<blockquote>{demoText(result.levelEvidence,analysis.id,language)}</blockquote>}</div></details>}
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
 return analysis?<>{(!analysisIsCurrent(reflection,analysis)||!!draft&&!writingMatchesSaved(draft,reflection))&&<p className="rubric-note is-warning">{tr('Kết quả này thuộc phiên bản trước, chưa phản ánh chỉnh sửa mới nhất.')}</p>}<AnalysisResults analysis={analysis} language={language} compact/></>:<p className="rubric-empty">{tr('Chưa có phân tích theo rubric. Bạn có thể tự đánh giá hoặc yêu cầu AI hỗ trợ trước khi nộp.')}</p>;
}
