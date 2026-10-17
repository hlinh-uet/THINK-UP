'use client';
import {criterionLevel} from '../lib/assessment';
import {writingMatchesSaved,type ReflectionDraft} from '../lib/student-editor';
import {analysisIsCurrent} from '../lib/progress';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import type {Analysis,Reflection} from '../lib/domain';
export function AnalysisResults({analysis,language}:{analysis:Analysis;language:Language}){
 const tr=(s:string)=>translate(s,language),result=analysis.result,scale=result.scoreScale||4;
 return <div className="analysis-results">
  {analysis.provider==='Demo fixture'&&<p className="notice warning">{tr('Phản hồi mẫu để kiểm thử giao diện; không phải kết quả AI thực tế.')}</p>}
  {scale===4&&<p className="notice">{tr('Đánh giá lịch sử dùng thang 1–4. Điểm gốc được giữ nguyên.')}</p>}
  <p><b>{result.total===null?'—':`${result.total}/10`}</b> · {analysis.provider}</p>
  {result.reviewRequired&&<p className="notice warning">{tr('Chưa đủ minh chứng. Cần giảng viên xem xét trước khi xác định điểm.')}</p>}
  {result.criteria.map((c,i)=><article className="review-ai-criterion" key={c.key}><div className="section-head"><h4>{tr(analysis.rubric[i]?.name||c.key)}</h4><b>{c.score===null?'—':`${c.score}/${scale}`}</b></div>
   <small>{c.level===null?tr('Cần xem xét'):`Level ${c.level??(scale===4?c.score:criterionLevel(c.score!))}`} · {analysis.rubric[i]?.weight}%</small>
   <p>{demoText(c.behavior,analysis.id,language)}</p>{c.evidence&&<blockquote>{demoText(c.evidence,analysis.id,language)}</blockquote>}
   {!!c.attachmentNames?.length&&<small>{c.attachmentNames.join(', ')}</small>}<p>{demoText(c.improvement,analysis.id,language)}</p>
  </article>)}
  {result.levelReason&&<p><b>{tr('Mức Kember của toàn bài')}: {result.level}/4.</b> {demoText(result.levelReason,analysis.id,language)}</p>}
  {result.levelEvidence&&<blockquote>{demoText(result.levelEvidence,analysis.id,language)}</blockquote>}
 </div>;
}
export default function FeedbackResults({reflection,language,draft}:{reflection:Reflection;language:Language;draft?:ReflectionDraft|null}){
 const tr=(s:string)=>translate(s,language),analysis=reflection.analyses.find(a=>a.kind==='feedback');
 return analysis?<>{(!analysisIsCurrent(reflection,analysis)||!!draft&&!writingMatchesSaved(draft,reflection))&&<p className="notice warning">{tr('Kết quả này thuộc phiên bản trước, chưa phản ánh chỉnh sửa mới nhất.')}</p>}<AnalysisResults analysis={analysis} language={language}/></>:<p>{tr('Chưa có phân tích theo rubric. Bạn có thể tự đánh giá hoặc yêu cầu AI hỗ trợ trước khi nộp.')}</p>;
}
