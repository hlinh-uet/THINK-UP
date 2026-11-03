'use client';

import { levels, type Reflection } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { translate, dateLocale, type Language } from '../lib/i18n';
import { analysisIsCurrent } from '../lib/progress';
import { writingMatchesSaved, writingReadiness, type ReflectionDraft } from '../lib/student-editor';
import UiIcon from './UiIcon';
import FeedbackProvenance from './FeedbackProvenance';
import {localizedAnalysis} from '../lib/feedback-language';

type Props={draft:ReflectionDraft;reflection?:Reflection;language:Language;aiReady:boolean;busy:string;onAnalyze:()=>void;onCommit:(text:string)=>void};

export default function AICoachPanel({draft,reflection,language,aiReady,busy,onAnalyze,onCommit}:Props) {
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const readiness=writingReadiness(draft,aiReady,!!busy);
  const savedAnalysis=reflection?.analyses.find(item=>item.kind==='coach');
  const analysis=savedAnalysis?localizedAnalysis(savedAnalysis,language):undefined;
  const stale=!!analysis&&!!reflection&&(!analysisIsCurrent(reflection,analysis)||!writingMatchesSaved(draft,reflection));
  const say=(text:string)=>demoText(text,analysis!.id,language);
  // Keep every suggestion available, with only the improvement focus expanded initially.
  const groups=analysis?([
    {key:'strengths',label:'Bạn làm tốt',icon:'thumbsUp'},
    {key:'development',label:'Nên phát triển thêm',icon:'grow'},
    {key:'questions',label:'Câu hỏi cho bạn',icon:'help'},
    {key:'suggestedActions',label:'Gợi ý hành động',icon:'target'},
  ] as const).filter(group=>analysis.result[group.key].length>0):[];
  const level=analysis?.result.level??0;
  return <section className="coach-panel" aria-label="AI Coach">
    {/* Locked work keeps its feedback for reading; there is nothing left to ask for. */}
    {readiness.editable&&!analysis&&<button className="button primary full ai-ask is-coach" disabled={!readiness.canAnalyze} onClick={onAnalyze}><UiIcon name="coach" size={17}/>{tr(busy==='coach'?'Đang đọc bài cùng Coach…':'Nhận xét cả bài')}</button>}
    {readiness.editable&&aiReady&&readiness.words<20&&<p className="writing-ai-hint">{tr('Viết ít nhất 20 từ để nhận xét cả bài.')}</p>}
    {analysis?<>
      <div className="ai-result-head is-first"><div><b>AI Coach</b>{analysis.createdAt&&<small>{new Intl.DateTimeFormat(dateLocale(language),{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(analysis.createdAt))}</small>}</div>{readiness.editable&&<button type="button" className="coach-refresh" disabled={!readiness.canAnalyze} onClick={onAnalyze}><UiIcon name="coach" size={14}/>{tr(busy==='coach'?'Đang đọc bài cùng Coach…':'Nhận xét lại')}</button>}</div>
      <FeedbackProvenance sample={analysis.provider==='Demo fixture'} stale={stale} language={language}/>
      {level>=1&&level<=4&&<details className="ai-level"><summary><span>{tr('Mức phản tư hiện tại')}</span><b>{tr('Mức {0}',[level])} · {tr(levels[level])}</b><span className="ai-level-steps" aria-hidden="true">{[1,2,3,4].map(n=><i key={n} className={n<=level?'is-on':''}/>)}</span></summary>{analysis.result.levelReason&&<p>{say(analysis.result.levelReason)}</p>}{analysis.result.levelEvidence&&<blockquote><small className="source-quote-label">{tr('Trích dẫn gốc')}</small>“{say(analysis.result.levelEvidence)}”</blockquote>}</details>}
      {groups.length>0&&<div className="coach-guidance">{groups.map(group=><details key={group.key} className={`coach-group is-${group.key}`} open={group.key===(groups.some(item=>item.key==='development')?'development':groups[0].key)}><summary><span className="ai-item-icon" aria-hidden="true"><UiIcon name={group.icon} size={15}/></span><b>{tr(group.label)}</b><small>{analysis.result[group.key].length}</small><UiIcon name="chevron" size={14}/></summary><ul>{analysis.result[group.key].map((text,i)=><li key={i}><p>{say(text)}</p>{group.key==='suggestedActions'&&<button type="button" className="ai-commit" onClick={()=>onCommit(say(text))}>+ {tr('Biến thành cam kết')}</button>}</li>)}</ul></details>)}</div>}
      {analysis.result.context&&<details className="coach-evidence"><summary><span>{tr('Thông tin từ minh chứng')}</span><UiIcon name="chevron" size={14}/></summary><p>{say(analysis.result.context)}</p></details>}
    </>:readiness.editable?<div className="ai-empty"><span aria-hidden="true"><UiIcon name="coach" size={20}/></span><b>{tr('Sẵn sàng nhận xét')}</b><p>{tr('AI đọc cả bài và cho biết điểm làm tốt, điều nên phát triển, câu hỏi gợi mở và mức phản tư hiện tại.')}</p></div>
    :<div className="ai-empty"><span aria-hidden="true">📝</span><b>{tr('Chưa có nhận xét AI Coach')}</b><p>{tr('Bài này được nộp khi chưa nhận xét cùng AI Coach. Xem nhận xét của giảng viên ở tab Góp ý & điểm.')}</p></div>}
    {readiness.editable&&!aiReady&&<details className="ai-connection-hint"><summary><UiIcon name="help" size={14}/><span>{tr('Chưa kết nối AI')}</span><UiIcon name="chevron" size={13}/></summary><p>{tr('AI cần được quản trị viên kết nối. Bạn vẫn có thể viết, lưu và nộp bài cho giảng viên.')}</p></details>}
  </section>;
}
