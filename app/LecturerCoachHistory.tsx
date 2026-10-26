import type {Reflection} from '../lib/domain';
import {levels} from '../lib/domain';
import {analysisIsCurrent} from '../lib/progress';
import {demoText,providerLabel} from '../lib/demo-i18n';
import {translate,type Language} from '../lib/i18n';
import {formatDate} from './LecturerKit';

export default function LecturerCoachHistory({reflection:r,language}:{reflection:Reflection;language:Language}){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const groups=[['strengths','Điểm mạnh'],['development','Điểm cần phát triển'],['questions','Câu hỏi gợi mở'],['suggestedActions','Gợi ý hành động']] as const;
 const analyses=r.analyses.filter(a=>a.kind==='coach');
 return <>
  <p className="lx-pane-intro">{tr('Lịch sử AI Coach theo từng phiên bản bài viết và các lượt sinh viên tư duy cùng AI.')}</p>
  <ol className="lx-timeline">
   {analyses.map(a=>{const version=r.versions.find(v=>v.id===a.versionId);return <li key={a.id}>
    <small>{tr('AI Coach')} · {providerLabel(a.provider,language)} · {formatDate(a.createdAt,language,true)} · {version?tr('Phiên bản {0}',[r.versions.length-r.versions.indexOf(version)]):tr('Phiên bản cũ')}{!analysisIsCurrent(r,a)&&` · ${tr('Nội dung đã thay đổi sau phân tích này.')}`}</small>
    {groups.map(([key,label])=><div key={key} className="lx-insight"><h3>{tr(label)}</h3>{a.result[key].length?<ul>{a.result[key].map((text,i)=><li key={i}>{demoText(text,a.id,language)}</li>)}</ul>:<p className="lx-muted">{tr('Chưa có dữ liệu.')}</p>}</div>)}
    <div className="lx-insight"><h3>{tr('Mức phản tư')}</h3><p>{tr(levels[a.result.level]||levels[0])}</p>
     {a.result.levelReason&&<p>{demoText(a.result.levelReason,a.id,language)}</p>}
     {a.result.levelEvidence&&<blockquote>{a.result.levelEvidence}</blockquote>}
    </div>
   </li>})}
   {r.coachTurns?.map(t=><li key={t.id}><small>{formatDate(t.createdAt,language,true)}</small><p><b>{t.question==='__reflection_thinking__'?tr('Tư duy cùng AI'):t.question}</b></p>{t.reply&&<p>{t.reply}</p>}</li>)}
  </ol>
  {!analyses.length&&!r.coachTurns?.length&&<p className="lx-empty-line">{tr('Chưa có hỗ trợ AI Coach.')}</p>}
 </>;
}
