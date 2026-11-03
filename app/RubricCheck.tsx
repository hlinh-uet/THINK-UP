'use client';

import type {Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {analysisIsCurrent} from '../lib/progress';
import {writingMatchesSaved,writingReadiness,type ReflectionDraft} from '../lib/student-editor';
import {localizedAnalysis} from '../lib/feedback-language';
import FeedbackProvenance from './FeedbackProvenance';
import UiIcon from './UiIcon';

type Props={draft:ReflectionDraft;reflection?:Reflection;language:Language;aiReady:boolean;busy:string;onAnalyze:()=>void};

/** A trial grade against the four rubric criteria before submission. It is reference only; the lecturer sets the real score. */
export default function RubricCheck({draft,reflection,language,aiReady,busy,onAnalyze}:Props){
 const tr=(text:string)=>translate(text,language);
 const readiness=writingReadiness(draft,aiReady,!!busy);
 const saved=reflection?.analyses.find(item=>item.kind==='feedback'),analysis=saved?localizedAnalysis(saved,language):undefined;
 const stale=!!analysis&&!!reflection&&(!analysisIsCurrent(reflection,analysis)||!writingMatchesSaved(draft,reflection));
 const result=analysis?.result,scale=result?.scoreScale||4;
 return <section className="rubric-check" aria-label={tr('Chấm thử theo rubric')}>
  <header className="rubric-check-heading"><h4 className="ai-step-title">{tr('Chấm thử theo rubric')}</h4><em>{tr('Tham khảo')}</em></header>
  {analysis&&result?<>
   <FeedbackProvenance sample={analysis.provider==='Demo fixture'} stale={stale} language={language}/>
   <p className="rubric-check-total"><b>{result.total===null?'—':result.total}</b><span>/ 10 {tr('dự kiến')}</span></p>
   <dl className="rubric-check-bars">{result.criteria.map((c,i)=><div key={c.key}><dt>{tr(analysis.rubric[i]?.name||c.key)}</dt><dd>{c.score===null?'—':c.score}</dd><span aria-hidden="true"><i style={{width:`${c.score===null?0:Math.min(c.score/scale,1)*100}%`}}/></span></div>)}</dl>
  </>:<p className="ai-step-empty">{tr('AI chấm thử 4 tiêu chí như giảng viên để bạn biết bài đang ở đâu. Điểm chính thức do giảng viên chấm.')}</p>}
  {readiness.editable&&<button type="button" className={`button full ai-step-run${analysis?' is-again':''}`} disabled={!readiness.canAnalyze} onClick={onAnalyze}><UiIcon name="progress" size={15}/>{tr(busy==='feedback'?'Đang chấm thử…':analysis?'Chấm lại':'Chấm thử')}</button>}
  {readiness.editable&&aiReady&&readiness.words<20&&<p className="writing-ai-hint">{tr('Viết ít nhất 20 từ để AI có đủ nội dung đối chiếu rubric.')}</p>}
  {readiness.editable&&!aiReady&&<details className="ai-connection-hint"><summary><UiIcon name="help" size={14}/><span>{tr('Chưa kết nối AI')}</span><UiIcon name="chevron" size={13}/></summary><p>{tr('AI cần được quản trị viên kết nối. Bạn vẫn có thể viết, lưu và nộp bài cho giảng viên.')}</p></details>}
 </section>;
}
