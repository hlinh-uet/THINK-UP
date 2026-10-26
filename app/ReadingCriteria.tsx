import type {Criterion,ReadingReport} from '../lib/domain';
import {defaultRubric} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import type {ReactNode} from 'react';

export default function ReadingCriteria({report,rubric,language,quote}:{report:ReadingReport;rubric:Criterion[];language:Language;quote:(text:string)=>ReactNode}){
 const tr=(s:string)=>translate(s,language);
 return <div className="lx-insight"><h3>{tr('Căn cứ theo từng tiêu chí rubric')}</h3>
  {!report.criteria?<p className="lx-notice">{tr('Báo cáo cũ chưa có căn cứ theo từng tiêu chí. Phân tích lại để bổ sung.')}</p>:
   defaultRubric.map(fixed=>{const c=report.criteria?.find(c=>c.key===fixed.key);return <div className="lx-insight" key={fixed.key}>
    <h4>{tr(rubric.find(r=>r.key===fixed.key)?.name||fixed.name)}</h4>
    {(!c||c.status==='insufficient')&&<p className="lx-attention">{tr('Chưa đủ căn cứ cho tiêu chí này.')}</p>}
    {c&&<><p>{c.text}</p>{quote(c.evidence)}</>}
   </div>})}
 </div>;
}
