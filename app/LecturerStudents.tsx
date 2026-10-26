'use client';
import { useState } from 'react';
import type { Action, Course, Criterion, Data, Participation, Reflection, User } from '../lib/domain';
import { learnerProgress } from '../lib/progress';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import UserAvatar from './UserAvatar';
import LecturerStudent from './LecturerStudent';
import { Section, Tabbed, WeekStrip } from './LecturerKit';

type Props={language:Language;studentId?:string;courses:Course[];memberships:Data['memberships'];students:User[];reflections:Reflection[];actions:Action[];rubric:Criterion[];
  participation:Participation[];detailHref:(id:string)=>string;studentHref:(id:string)=>string;listHref:string};

/** The roster as a table, including students who have not submitted anything yet; a row opens the student's growth file. */
export default function LecturerStudents({language,studentId,courses,memberships,students,reflections,actions,participation,rubric,detailHref,studentHref,listHref}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [search,setSearch]=useState('');
  const student=students.find(u=>u.id===studentId);
  if(student)return <LecturerStudent language={language} student={student} courses={courses.filter(c=>memberships.some(m=>m.userId===student.id&&m.courseId===c.id))} reflections={reflections} actions={actions} rubric={rubric} detailHref={detailHref} backHref={listHref}/>;
  const visibleStudents=students.filter(u=>`${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const rows=visibleStudents
    .map(u=>{const own=reflections.filter(r=>r.userId===u.id),plans=actions.filter(a=>a.userId===u.id);return {user:u,progress:learnerProgress(own),plans,done:plans.filter(a=>a.status==='done').length}})
    .sort((a,b)=>b.progress.pending-a.progress.pending||a.user.name.localeCompare(b.user.name,'vi'));
  const studentOrder=new Map(rows.map((row,i)=>[row.user.id,i]));
  const roster=memberships.filter(m=>m.role==='student'&&studentOrder.has(m.userId))
    .sort((a,b)=>studentOrder.get(a.userId)!-studentOrder.get(b.userId)!||a.courseId.localeCompare(b.courseId));
  return <div className="lx-stack">
    <div className="lx-filters">
      <label className="lx-search"><UiIcon name="search" size={15}/><input aria-label={tr('Tìm sinh viên')} placeholder={tr('Tìm theo tên hoặc email…')} maxLength={200} value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <span className="lx-muted">{tr('{0} sinh viên',[rows.length])}</span>
    </div>
    <Tabbed label={tr('Sinh viên')} tabs={[
      {key:'roster',label:tr('Danh sách lớp'),count:rows.length,content:<>
<div className="lx-table-wrap"><table className="lx-table">
      <thead><tr><th>{tr('Sinh viên')}</th><th>{tr('Học phần')}</th><th className="is-num">{tr('Đã nộp')}</th><th className="is-num">{tr('Chờ duyệt')}</th><th className="is-num">{tr('Điểm TB')}</th><th className="is-num">{tr('Cam kết')}</th></tr></thead>
      <tbody>{rows.map(({user:u,progress,plans,done})=><tr key={u.id}>
        <td><a className="lx-person lx-row-link" href={studentHref(u.id)}><UserAvatar person={u}/><span><b>{u.name}{!u.active&&<em className="lx-tag">{tr('Tạm ngừng')}</em>}</b><small>{u.email}</small></span></a></td>
        <td className="lx-muted">{courses.filter(c=>memberships.some(m=>m.userId===u.id&&m.courseId===c.id)).map(c=>c.code).join(', ')}</td>
        <td className="is-num">{progress.submitted}</td>
        <td className="is-num">{progress.pending?<b className="lx-attention">{progress.pending}</b>:<span className="lx-muted">—</span>}</td>
        <td className="is-num">{progress.average!==null?<b>{progress.average.toFixed(2)}</b>:<span className="lx-muted">—</span>}</td>
        <td className="is-num">{plans.length?`${done}/${plans.length}`:<span className="lx-muted">—</span>}</td>
      </tr>)}</tbody>
    </table>
    {!rows.length&&<div className="lx-table-empty"><p>{tr(students.length?'Không có sinh viên phù hợp bộ lọc':'Chưa có sinh viên được phân công')}</p></div>}
    </div>
      </>},
      {key:'journey',label:tr('Hành trình chín tuần'),count:roster.length,content:<>
        <Section>
          <div className="lx-table-wrap"><table className="lx-table lx-matrix">
            <thead><tr><th>{tr('Sinh viên')}</th><th>{tr('Học phần')}</th>{Array.from({length:9},(_,i)=><th key={i} className="is-center">{tr('T{0}',[i+1])}</th>)}</tr></thead>
            <tbody>{roster.map(m=>{const u=students.find(s=>s.id===m.userId);return <tr key={`${m.courseId}:${m.userId}`}>
              <td>{u?<a className="lx-row-link" href={studentHref(u.id)}>{u.name}</a>:'—'}</td>
              <td className="lx-muted">{courses.find(c=>c.id===m.courseId)?.code}</td>
              {Array.from({length:9},(_,i)=>{const states=participation.filter(p=>p.courseId===m.courseId&&p.userId===m.userId&&p.week===i+1),state=['final','submitted','returned','draft'].find(s=>states.some(p=>p.status===s))||'';
                return <td key={i} className="is-center"><WeekStrip compact language={language} weeks={[{week:i+1,state}]}/></td>})}
            </tr>})}</tbody>
          </table></div>
          {!rows.length&&<p className="lx-empty-line">{tr(students.length?'Không có sinh viên phù hợp bộ lọc':'Chưa có sinh viên được phân công')}</p>}
    <p className="lx-legend"><span><i className="is-final"/>{tr('Đã hoàn tất')}</span><span><i className="is-submitted"/>{tr('Chờ duyệt')}</span><span><i className="is-returned"/>{tr('Đang chỉnh sửa')}</span><span><i className="is-draft"/>{tr('Bản nháp')}</span><span><i className="is-none"/>{tr('Chưa nộp')}</span></p>
        </Section>
      </>},
    ]}/>
  </div>;
}
