import { type Analysis } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import UiIcon from './UiIcon';
import {localizedAnalysis} from '../lib/feedback-language';

export default function ReflectionGuidance({analysis:sourceAnalysis,language,onCommit}:{analysis:Analysis;language:Language;onCommit:(text:string)=>void}) {
  const analysis=localizedAnalysis(sourceAnalysis,language);
  const tr=(text:string)=>translate(text,language);
  const groups=[
    {key:'strengths' as const,label:tr('Điểm mạnh'),icon:'check' as const},
    {key:'development' as const,label:tr('Điểm cần phát triển'),icon:'arrow' as const},
    {key:'questions' as const,label:tr('Câu hỏi gợi mở'),icon:'messages' as const},
    {key:'suggestedActions' as const,label:tr('Gợi ý hành động'),icon:'actions' as const},
  ].filter(group=>analysis.result[group.key].length>0);
  const renderGroup=(group:typeof groups[number])=><section key={group.key} className={`guidance-section is-${group.key}`}>
    <h4>{group.label}</h4>
    <ul className="guidance-list">{analysis.result[group.key].map((text,i)=><li key={i}><p>{demoText(text,analysis.id,language)}</p>{group.key==='suggestedActions'&&<button type="button" className="suggestion-button" onClick={()=>onCommit(demoText(text,analysis.id,language))}><UiIcon name="add" size={16}/>{tr('Xem và xác nhận cam kết')}</button>}</li>)}</ul>
  </section>;
  const next=groups.filter(group=>group.key==='questions'||group.key==='suggestedActions');
  return <div className="reflection-guidance">
    {groups.filter(group=>group.key==='strengths'||group.key==='development').map(renderGroup)}
    {(next.length>0||analysis.result.context)&&<details className="guidance-next feedback-explanation"><summary><span>{tr('Câu hỏi và hướng hành động')}</span><UiIcon name="chevron" size={15}/></summary><div>
      {next.map(renderGroup)}
      {analysis.result.context&&<section className="guidance-section"><h4>{tr('Thông tin từ minh chứng')}</h4><p>{demoText(analysis.result.context,analysis.id,language)}</p></section>}
    </div></details>}
  </div>;
}
