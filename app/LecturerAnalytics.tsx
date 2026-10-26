'use client';

import { useState } from 'react';
import type { Action, Course, Criterion, Data, Reflection, User } from '../lib/domain';
import { classAnalytics } from '../lib/learning-analytics';
import { weeklyClassProgress } from '../lib/lecturer-pages';
import { learnerProgress } from '../lib/progress';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import LecturerActions, { planLabels } from './LecturerActions';
import { Empty, Metrics, Section, Tabbed } from './LecturerKit';

type Props={language:Language;courses:Course[];students:User[];memberships:Data['memberships'];reflections:Reflection[];actions:Action[];
  rubric:Criterion[];detailHref:(id:string)=>string;studentHref:(id:string)=>string};
const hints:Record<string,string>={
  reflectionDepth:'Thêm câu hỏi “vì sao” và yêu cầu sinh viên xem xét giả định ban đầu trước khi kết luận.',
  evidenceContext:'Yêu cầu nêu một tình huống cụ thể: ai, khi nào, điều gì đã xảy ra, kèm một chi tiết hoặc sản phẩm làm căn cứ.',
  insight:'Bổ sung hoạt động phân tích tình huống, hướng dẫn phân biệt giữa kể lại trải nghiệm và rút ra bài học.',
  actionPlan:'Hướng dẫn viết kế hoạch theo SMART: việc làm cụ thể, thời hạn và cách tự kiểm tra kết quả.',
};

export default function LecturerAnalytics({language,courses,students,memberships,reflections,actions,rubric,detailHref,studentHref}:Props){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const weeks=weeklyClassProgress(reflections,memberships.filter(m=>m.role==='student'));
  const summary=classAnalytics(reflections,actions,rubric),progress=learnerProgress(reflections);
  const [split,setSplit]=useState(4),[openWeak,setOpenWeak]=useState('');
  const early=classAnalytics(reflections.filter(r=>r.week<=split),[],rubric),late=classAnalytics(reflections.filter(r=>r.week>split),[],rubric);
  const weak=rubric.map(c=>{
    const scored=students.map(user=>({user,avg:learnerProgress(reflections.filter(r=>r.userId===user.id)).criteria.find(x=>x.key===c.key)?.average??null})).filter(v=>v.avg!==null);
    return {assessed:scored.length,users:scored.filter(v=>v.avg!<5.1).map(v=>v.user)};
  });
  const agreement=summary.agreement;
  return <div className="lx-stack lx-analytics">
    <p className="lx-analysis-context">{tr('{0} học phần · {1} sinh viên',[courses.length,students.length])}<span>{tr('Chỉ dùng điểm đã được giảng viên xác nhận.')}</span></p>
    <Metrics items={[
      {label:tr('Sinh viên đã có bài'),value:new Set(reflections.map(r=>r.userId)).size,of:students.length},
      {label:tr('Bài đã hoàn tất'),value:summary.graded,of:summary.articles,note:tr('Trên tổng số bài đã nộp')},
      {label:tr('Điểm cuối trung bình'),value:progress.average?.toFixed(2)??'—',of:10},
    ]}/>
    <Tabbed label={tr('Phân tích lớp')} tabs={[
      {key:'weeks',label:tr('Nhịp nộp bài'),content:<Section title={tr('Chín tuần, nhìn trong một trang')}>
        <p className="lx-muted">{tr('Theo dõi số sinh viên đã nộp bài và số bài còn chờ đánh giá theo từng tuần.')}</p>
        <div className="lx-table-wrap"><table className="lx-table lx-weekly-table">
          <caption className="sr-only">{tr('Nộp bài theo tuần')}</caption>
          <thead><tr><th>{tr('Tuần')}</th><th>{tr('Đã có bài / Phân công')}</th><th className="is-num">{tr('Đã hoàn tất')}</th><th className="is-num">{tr('Chờ duyệt')}</th><th className="is-num">{tr('Điểm TB')}</th></tr></thead>
          <tbody>{weeks.map(w=><tr key={w.week}>
            <td><span className="lx-week-index">{String(w.week).padStart(2,'0')}</span></td>
            <td><div className="lx-weekly-progress"><span className="lx-weekly-track" aria-hidden="true"><i style={{width:`${w.expected?w.submitted/w.expected*100:0}%`}}/><i className="is-final" style={{width:`${w.expected?w.completed/w.expected*100:0}%`}}/></span><span>{w.submitted}<small> / {w.expected}</small></span></div></td>
            <td className="is-num">{w.completed}</td><td className="is-num">{w.pending?<span className="lx-pending-count">{w.pending}</span>:'—'}</td><td className="is-num">{w.average?.toFixed(2)??'—'}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="lx-legend lx-columns-legend"><span><i className="is-submitted"/>{tr('Đã nộp')}</span><span><i className="is-final"/>{tr('Đã hoàn tất')}</span></p>
        <p className="lx-footnote">{tr('Mỗi sinh viên tính một lần cho mỗi tuần trong từng học phần. Điểm trung bình chỉ lấy đánh giá cuối.')}</p>
      </Section>},
      {key:'criteria',label:tr('Chất lượng phản tư'),content:<div className="lx-stack">
        <Section title={tr('Bốn tiêu chí đánh giá')}>
          <p className="lx-muted">{tr('Đọc điểm trung bình, phân bố mức độ và nhóm sinh viên cần hỗ trợ trước khi xem phân tích sâu hơn.')}</p>
          <div className="lx-table-wrap"><table className="lx-table lx-criteria-table">
            <thead><tr><th>{tr('Tiêu chí')}</th><th className="is-num">{tr('Điểm TB')}</th><th>{tr('Phân bố Level 1–4')}</th><th className="is-num">{tr('SV dưới 5,1')}</th></tr></thead>
            <tbody>{summary.criteria.map((c,i)=>{const total=c.distribution.reduce((x,y)=>x+y,0);return [
              <tr key={c.key}><td className="lx-title-cell"><b>{tr(c.name)}</b><small>{c.weight}% · n={c.count}</small></td><td className="is-num"><b>{c.average?.toFixed(2)??'—'}</b><small className="lx-muted"> /10</small></td>
                <td>{total?<span className="lx-dist" aria-label={c.distribution.map((n,k)=>`Level ${k+1}: ${n}`).join(', ')}>{c.distribution.map((n,k)=>n?<i key={k} className={`is-l${k+1}`} style={{flexGrow:n}} title={`Level ${k+1}: ${n}`}>{n}</i>:null)}</span>:'—'}</td>
                <td className="is-num">{weak[i].assessed?<button type="button" className="lx-link" disabled={!weak[i].users.length} aria-expanded={openWeak===c.key} onClick={()=>setOpenWeak(openWeak===c.key?'':c.key)}>{weak[i].users.length}/{weak[i].assessed}<UiIcon name="chevron" size={13}/></button>:'—'}</td></tr>,
              openWeak===c.key&&<tr key={`${c.key}-weak`} className="lx-subrow"><td colSpan={4}>{weak[i].users.map(u=><a className="lx-chip" key={u.id} href={studentHref(u.id)}>{u.name}</a>)}</td></tr>,
            ]})}</tbody>
          </table></div>
          <p className="lx-legend">{[1,2,3,4].map(n=><span key={n}><i className={`is-l${n}`}/>Level {n}</span>)}</p>
        </Section>
        <details className="lx-analysis-detail"><summary><span><b>{tr('So sánh hai giai đoạn')}</b><small>{tr('Xem thay đổi về điểm với số bài và số sinh viên làm căn cứ.')}</small></span><UiIcon name="chevron" size={18}/></summary><div className="lx-analysis-detail-body lx-stack is-tight">
          <label className="lx-inline-field">{tr('So sánh trước / sau')}<select value={split} onChange={e=>setSplit(Number(e.target.value))}>{Array.from({length:8},(_,i)=><option key={i} value={i+1}>{tr('Tuần {0}',[i+1])}</option>)}</select></label>
          <div className="lx-table-wrap"><table className="lx-table"><thead><tr><th>{tr('Tiêu chí')}</th><th>{tr('T1–T{0}',[split])}</th><th>{tr('T{0}–T9',[split+1])}</th><th className="is-num">{tr('Thay đổi')}</th></tr></thead>
            <tbody>{rubric.map((c,i)=>{const e=early.criteria[i].average,l=late.criteria[i].average,delta=e!==null&&l!==null?l-e:null;return <tr key={c.key}><td>{tr(c.name)}</td><td className="lx-phase"><PhaseBasis criterion={early.criteria[i]} students={students.length} language={language}/></td><td className="lx-phase"><PhaseBasis criterion={late.criteria[i]} students={students.length} language={language}/></td><td className={`is-num lx-delta${delta===null?'':delta>=0?' is-up':' is-down'}`}>{delta===null?'—':`${delta>=0?'+':''}${delta.toFixed(1)}`}</td></tr>})}</tbody>
          </table></div>
          <p className="lx-footnote">{tr('Hai giai đoạn có thể khác nhóm sinh viên; chênh lệch không tự chứng minh tiến bộ.')}</p>
        </div></details>
        <details className="lx-analysis-detail"><summary><span><b>{tr('Gợi ý cho buổi học tiếp theo')}</b><small>{tr('Khó khăn thường gặp, gợi ý giảng dạy và độ nhất quán với AI.')}</small></span><UiIcon name="chevron" size={18}/></summary><div className="lx-analysis-detail-body lx-stack">
          <Section title={tr('Khó khăn thường gặp')}>{summary.difficulties.length?<ol className="lx-ranked">{summary.difficulties.slice(0,5).map((d,i)=><li key={i}><span>{demoText(d.text,d.reflectionIds[0],language)}</span><b>{d.count}</b></li>)}</ol>:<Empty>{tr('Chưa có dữ liệu.')}</Empty>}</Section>
          {summary.criteria.filter(c=>{const n=c.distribution.reduce((a,b)=>a+b,0);return n>=3&&(c.distribution[0]+c.distribution[1])/n>=.5&&hints[c.key]}).map(c=><p className="lx-teaching-hint" key={c.key}><b>{tr(c.name)}</b>{tr(hints[c.key])}</p>)}
          <Section title={tr('Độ nhất quán AI – giảng viên')}>{agreement.pairs?<dl className="lx-figures"><div><dt>{tr('Bài có cả hai kết quả')}</dt><dd>{agreement.articles}</dd></div><div><dt>{tr('Trùng Level')}</dt><dd>{Math.round((agreement.levelAgreement||0)*100)}<small>%</small></dd></div><div><dt>{tr('Chênh lệch điểm TB')}</dt><dd>{agreement.meanAbsoluteError?.toFixed(2)??'—'}<small>/10</small></dd></div></dl>:<Empty>{tr('Chưa có bài nào vừa có đề xuất AI vừa có đánh giá cuối trên cùng rubric.')}</Empty>}</Section>
        </div></details>
      </div>},
      {key:'actions',label:tr('Cam kết & hành động'),count:actions.length,content:<div className="lx-stack">
        <Section title={tr('Từ suy nghĩ đến hành động')} action={<span className="lx-action-completion">{summary.actions.done}<small> / {summary.actions.count} {tr('hoàn thành')}</small></span>}>
          <p className="lx-muted">{tr('Theo dõi việc thực hiện cam kết sau mỗi bài reflection.')}</p>
          <ul className="lx-bars">{Object.entries(planLabels).map(([key,label])=><li key={key}><span>{tr(label)}</span><span className="lx-bar"><i className={`is-${key}`} style={{width:`${actions.length?actions.filter(a=>a.status===key).length/actions.length*100:0}%`}}/></span><b>{actions.filter(a=>a.status===key).length}</b></li>)}</ul>
        </Section>
        <details className="lx-analysis-detail"><summary><span><b>{tr('Xem từng cam kết')}</b><small>{tr('Mở bài nguồn để đọc bối cảnh và kết quả thực hiện.')}</small></span><UiIcon name="chevron" size={18}/></summary><div className="lx-analysis-detail-body"><LecturerActions actions={actions} reflections={reflections} users={students} language={language} detailHref={detailHref} limit={6}/></div></details>
      </div>},
    ]}/>
  </div>;
}

function PhaseBasis({criterion:c,students,language}:{criterion:ReturnType<typeof classAnalytics>['criteria'][number];students:number;language:Language}){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  return <><b>{c.average===null?'—':c.average.toFixed(2)}</b><small>{tr('{0} bài / {1} SV có điểm',[c.count,c.students])}</small><small>{tr('{0} bài chưa có điểm',[c.missing])}</small><small>{tr('{0} SV chưa có điểm',[Math.max(0,students-c.students)])}</small></>;
}
