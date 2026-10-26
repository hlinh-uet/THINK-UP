'use client';
import type {Course,Criterion,Week} from '../lib/domain';
import {levelRanges} from '../lib/assessment';
import {translate,type Language} from '../lib/i18n';

export default function DefaultConfigurationFields({draft,section,weekIndex,criterionIndex,onWeek,onCriterion,editWeek,editCriterion,language}:{draft:Course;section:'journey'|'rubric';weekIndex:number;criterionIndex:number;onWeek:(index:number)=>void;onCriterion:(index:number)=>void;editWeek:(index:number,value:Partial<Week>)=>void;editCriterion:(index:number,value:Partial<Criterion>)=>void;language:Language}){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args),week=draft.weeks[weekIndex]||draft.weeks[0],criterion=draft.rubric[criterionIndex];
  return <div className="admin-default-editor">
    <nav className="admin-default-selector" aria-label={tr(section==='journey'?'Chọn tuần':'Chọn tiêu chí')}>
      {section==='journey'?draft.weeks.map((item,i)=><button key={item.week} type="button" aria-pressed={weekIndex===i} onClick={()=>onWeek(i)}><span>{tr('Tuần {0}',[item.week])}</span><b>{item.title}</b></button>):draft.rubric.map((item,i)=><button key={item.key} type="button" aria-pressed={criterionIndex===i} onClick={()=>onCriterion(i)}><span>{tr('Tiêu chí {0}',[i+1])}<strong>{item.weight}%</strong></span><b>{item.name}</b></button>)}
    </nav>
    <section className="admin-default-detail">
      {section==='journey'?<>
        <header><h2>{tr('Nội dung tuần {0}',[week.week])}</h2><p>{tr('Chọn từng tuần để chỉnh nội dung học phần mới.')}</p></header>
        <label className="lx-field"><span>{tr('Trọng tâm')}</span><input required maxLength={150} value={week.title} onChange={e=>editWeek(weekIndex,{title:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Câu hỏi gợi mở')}</span><textarea required rows={4} maxLength={1000} value={week.prompt} onChange={e=>editWeek(weekIndex,{prompt:e.target.value})}/></label>
        <label className="lx-field"><span>{tr('Yêu cầu bài tập')}</span><textarea rows={5} maxLength={3000} value={week.requirements||''} onChange={e=>editWeek(weekIndex,{requirements:e.target.value})}/></label>
        <label className="lx-field admin-default-date"><span>{tr('Hạn nộp mặc định')}</span><input type="date" value={week.due} onChange={e=>editWeek(weekIndex,{due:e.target.value})}/><small>{tr('Có thể để trống và đặt riêng khi tạo học phần.')}</small></label>
      </>:<>
        <header><h2>{tr('Tiêu chí {0}',[criterionIndex+1])}<span className="lx-weight">{criterion.weight}%</span></h2><p>{tr('Trọng số giữ cố định. Chỉnh mô tả cho từng mức điểm bên dưới.')}</p></header>
        <label className="lx-field"><span>{tr('Tên tiêu chí')}</span><input required maxLength={120} value={criterion.name} onChange={e=>editCriterion(criterionIndex,{name:e.target.value})}/></label>
        <div className="admin-default-levels">{criterion.descriptions.map((description,k)=><label key={k} className="lx-field" htmlFor={`default-${criterion.key}-level-${k}`}><span>{tr('Mức {0}',[k+1])}<small>{levelRanges[k][0]}–{levelRanges[k][1]} / 10</small></span><textarea id={`default-${criterion.key}-level-${k}`} required rows={4} maxLength={1000} value={description} onChange={e=>editCriterion(criterionIndex,{descriptions:criterion.descriptions.map((text,n)=>k===n?e.target.value:text)})}/></label>)}</div>
      </>}
    </section>
  </div>;
}
