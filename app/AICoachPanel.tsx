'use client';

import { levels, type Reflection } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import { analysisIsCurrent } from '../lib/progress';
import { writingMatchesSaved, writingReadiness, type ReflectionDraft } from '../lib/student-editor';
import ReflectionGuidance from './ReflectionGuidance';
import UiIcon from './UiIcon';

type Props={draft:ReflectionDraft;reflection?:Reflection;language:Language;aiReady:boolean;busy:string;onAnalyze:()=>void;onCommit:(text:string)=>void};

export default function AICoachPanel({draft,reflection,language,aiReady,busy,onAnalyze,onCommit}:Props) {
  const tr=(text:string)=>translate(text,language);
  const readiness=writingReadiness(draft,aiReady,!!busy);
  const analysis=reflection?.analyses.find(item=>item.kind==='coach');
  const stale=!!analysis&&!!reflection&&(!analysisIsCurrent(reflection,analysis)||!writingMatchesSaved(draft,reflection));
  return <section className="coach-panel panel" aria-label="AI Coach">
    <div className="section-head"><div className="coach-title"><UiIcon name="coach" size={20}/><h3>AI Coach</h3></div><span className={`tiny-status ${aiReady?'online':''}`}>{tr(aiReady?'Sẵn sàng':'Chưa kết nối')}</span></div>
    {!aiReady&&<div className="notice">{tr('AI cần được quản trị viên kết nối. Bạn vẫn có thể viết, lưu và nộp bài cho giảng viên.')}</div>}
    <button className="button primary full" disabled={!readiness.canAnalyze} onClick={onAnalyze}>{tr(busy==='coach'?'Đang đọc bài cùng Coach…':'Nhận phản hồi từ AI Coach')}</button>
    {readiness.editable&&aiReady&&readiness.words<20&&<p className="writing-ai-hint">{tr('Viết ít nhất 20 từ để nhận phản hồi.')}</p>}
    {analysis?<>
      {analysis.provider==='Demo fixture'&&<div className="notice warning">{tr('Phản hồi mẫu có sẵn trong dữ liệu dùng thử, không phải kết quả AI thực tế. Bạn có thể yêu cầu AI phân tích lại bài viết.')}</div>}
      {stale&&<div className="notice warning">{tr('Phản hồi thuộc phiên bản trước. Phân tích lại sau khi chỉnh sửa.')}</div>}
      <ReflectionGuidance analysis={analysis} language={language} onCommit={onCommit}/>
      <div className="coach-reflection-level"><h4>{tr('Mức độ phản tư')}</h4><span className="badge">{tr(levels[analysis.result.level])}</span>{analysis.result.levelReason&&<p>{demoText(analysis.result.levelReason,analysis.id,language)}</p>}{analysis.result.levelEvidence&&<blockquote>“{demoText(analysis.result.levelEvidence,analysis.id,language)}”</blockquote>}</div>
    </>:<div className="coach-empty"><p>{tr('Chưa có phản hồi.')}</p></div>}
  </section>;
}
