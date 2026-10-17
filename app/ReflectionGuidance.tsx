import { type Analysis } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import UiIcon from './UiIcon';

export default function ReflectionGuidance({analysis,language,onCommit}:{analysis:Analysis;language:Language;onCommit:(text:string)=>void}) {
  const tr=(text:string)=>translate(text,language);
  const groups=[
    {key:'strengths' as const,label:tr('Điểm mạnh')},
    {key:'development' as const,label:tr('Điểm cần phát triển')},
    {key:'questions' as const,label:tr('Câu hỏi gợi mở')},
    {key:'suggestedActions' as const,label:tr('Gợi ý hành động')},
  ];
  return <>{groups.map(group=><details key={group.key} className="feedback-group" open={group.key==='questions'}>
    <summary>{group.label}<small> · {analysis.result[group.key].length}</small></summary>
    {analysis.result[group.key].map((text,i)=><div key={i}><p>{demoText(text,analysis.id,language)}</p>{group.key==='suggestedActions'&&<button className="suggestion-button" onClick={()=>onCommit(demoText(text,analysis.id,language))}><UiIcon name="add" size={16}/>{tr('Xem và xác nhận cam kết')}</button>}</div>)}
  </details>)}{analysis.result.context&&<details className="feedback-group"><summary>{tr('Thông tin từ minh chứng')}</summary><p>{demoText(analysis.result.context,analysis.id,language)}</p></details>}</>;
}
