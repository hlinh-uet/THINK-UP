'use client';

import type { Action, Course, Criterion, Reflection, User } from '../lib/domain';
import { levels } from '../lib/domain';
import { finalReview, learnerProgress } from '../lib/progress';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import UserAvatar from './UserAvatar';
import UiIcon from './UiIcon';
import LecturerActions from './LecturerActions';
import { Empty, Metrics, Section, StatusTag, Tabbed, WeekStrip, formatDate } from './LecturerKit';

type Props={language:Language;student:User;courses:Course[];reflections:Reflection[];actions:Action[];rubric:Criterion[];detailHref:(id:string)=>string;backHref:string};

/** The strongest state a student reached in one week: completed beats waiting beats being revised. */
export function weekState(rows:Reflection[],week:number){
  const list=rows.filter(r=>r.week===week);
  return list.some(r=>r.status==='final')?'final':list.some(r=>r.status==='submitted')?'submitted':list.some(r=>r.status==='returned')?'returned':list.length?'draft':'';
}

/** One student's growth file: nine weeks, the four criteria, every reflection and their action plans. */
export default function LecturerStudent({language,student,courses,reflections,actions,rubric,detailHref,backHref}:Props){
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const rows=reflections.filter(r=>r.userId===student.id).sort((a,b)=>a.week-b.week||a.updatedAt.localeCompare(b.updatedAt));
  const own=actions.filter(a=>a.userId===student.id);
  const progress=learnerProgress(rows);
  const done=own.filter(a=>a.status==='done').length;
  return <div className="lx-stack">
    <a className="lx-link" href={backHref}><UiIcon name="next" size={14} className="lx-flip"/>{tr('Tất cả sinh viên')}</a>
    <header className="lx-profile-head">
      <UserAvatar person={student}/>
      <div><h1>{student.name}{!student.active&&<em className="lx-tag">{tr('Tạm ngừng')}</em>}</h1><p>{student.email}{courses.length>0&&<> · {courses.map(c=>c.code).join(', ')}</>}</p></div>
    </header>

    <Metrics items={[
      {label:tr('Bài đã hoàn tất'),icon:'document',value:progress.final,of:progress.submitted,note:tr('Đã được giảng viên xác nhận'),ring:progress.submitted?progress.final/progress.submitted:null},
      {label:tr('Lần chỉnh sửa'),icon:'editor',value:progress.revisions,note:tr('Từ bản nháp đến hoàn thiện')},
      {label:tr('Điểm cuối trung bình'),icon:'progress',value:progress.average?.toFixed(2)??'—',of:10,ring:progress.average!=null?progress.average/10:null},
      {label:tr('Cam kết hoàn thành'),icon:'actions',value:done,of:own.length,ring:own.length?done/own.length:null},
    ]}/>

    <div className="lx-journey">
      <p className="lx-journey-label">{tr('Hành trình chín tuần')}</p>
      <WeekStrip language={language} weeks={progress.points.map(p=>{const s=weekState(rows,p.week);return {week:p.week,state:s,label:p.level!==null?`Kember ${p.level.toFixed(1)}`:undefined}})}
        href={week=>{const first=rows.find(r=>r.week===week&&r.status!=='draft');return first?detailHref(first.id):undefined}}/>
    </div>

    <Tabbed label={tr('Hồ sơ sinh viên')} tabs={[
      {key:'reflections',label:tr('Bài viết'),count:rows.length,content:
    <Section>
      {rows.length?<div className="lx-table-wrap"><table className="lx-table">
        <thead><tr><th>{tr('Tuần')}</th><th>{tr('Bài reflection')}</th><th>{tr('Trạng thái')}</th><th className="is-num">{tr('Điểm cuối')}</th><th>{tr('Mức Kember')}</th><th className="is-num">{tr('Cập nhật')}</th></tr></thead>
        <tbody>{rows.map(r=>{const f=finalReview(r);return <tr key={r.id}>
          <td><span className="lx-week-tile">{tr('T{0}',[r.week])}</span></td>
          <td className="lx-title-cell"><a className="lx-row-link" href={detailHref(r.id)}>{demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên')}</a><small>{courses.find(c=>c.id===r.courseId)?.code}</small></td>
          <td><StatusTag status={r.status} language={language}/></td>
          <td className="is-num"><b>{f?.total!=null?f.total.toFixed(2):'—'}</b></td>
          <td className="lx-muted">{f?tr(levels[f.level||0]):'—'}</td>
          <td className="is-num lx-muted">{formatDate(r.updatedAt,language)}</td>
        </tr>})}</tbody>
      </table></div>:<Empty>{tr('Sinh viên này chưa có bài nộp trong phạm vi đã chọn.')}</Empty>}
    </Section>},
      {key:'criteria',label:tr('Theo tiêu chí'),content:
    <Section>
      <ul className="lx-bars">{progress.criteria.map((c,i)=><li key={c.key}>
        <span>{tr(rubric[i]?.name||c.key)}<small>{rubric[i]?.weight}%</small></span>
        <span className="lx-bar"><i className={c.average!==null&&c.average<5.1?'is-low':''} style={{width:`${(c.average??0)*10}%`}}/></span>
        <b>{c.average?.toFixed(1)??'—'}<small>/10</small></b>
      </li>)}</ul>
    </Section>},
      {key:'plans',label:tr('Kế hoạch hành động'),count:own.length,content:
    <Section>
      <LecturerActions actions={own} reflections={reflections} users={[student]} language={language} hideStudent detailHref={detailHref}/>
    </Section>},
    ]}/>
  </div>;
}
