'use client';
import { useState, type FormEvent } from 'react';
import type { Data } from '../lib/domain';
import { adminHref } from '../lib/admin-pages';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';
import type { LecturerMutation } from './LecturerWorkspace';
import UiIcon from './UiIcon';
import UserAvatar from './UserAvatar';
import { CourseSettings } from './LecturerCourses';
import { Section, dayKey } from './LecturerKit';

/** All courses: create one, configure its journey and rubric, and see who teaches and studies in it. */
export default function AdminCourses({data,language,busy,selectedCourseId,onMutate}:{data:Data;language:Language;busy:string;selectedCourseId:string;onMutate:LecturerMutation}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [creating,setCreating]=useState(false),[form,setForm]=useState({name:'',code:'',className:''});
  const [today]=useState(()=>dayKey(Date.now()));
  const members=(courseId:string,role:string)=>data.memberships.filter(m=>m.courseId===courseId&&m.role===role);
  const name=(userId:string)=>data.users.find(u=>u.id===userId)?.name||'—';
  const selected=data.courses.find(c=>c.id===selectedCourseId);
  if(selected){
    const rows=data.memberships.filter(m=>m.courseId===selected.id).sort((a,b)=>a.role.localeCompare(b.role)||name(a.userId).localeCompare(name(b.userId),'vi'));
    return <div className="lx-stack">
      <CourseSettings key={selected.id+language} course={selected} listHref={adminHref('courses')} records={(data.learningRecords||[]).filter(r=>r.kind==='course-history'&&r.courseId===selected.id)} language={language} busy={busy} onMutate={onMutate}/>
      <Section title={tr('Giảng viên & sinh viên')} count={rows.length} action={<a className="lx-link" href={adminHref('users')}>{tr('Phân công thêm')}<UiIcon name="next" size={13}/></a>}>
        <div className="lx-table-wrap"><table className="lx-table">
          <thead><tr><th>{tr('Người dùng')}</th><th>{tr('Vai trò trong học phần')}</th><th/></tr></thead>
          <tbody>{rows.map(m=>{const user=data.users.find(u=>u.id===m.userId);return <tr key={m.id}>
            <td>{user?<span className="lx-person"><UserAvatar person={user}/><span><b>{user.name}{!user.active&&<em className="lx-tag">{tr('Tạm ngừng')}</em>}</b><small>{user.email}</small></span></span>:'—'}</td>
            <td>{tr(m.role==='lecturer'?'Giảng viên':'Sinh viên')}</td>
            <td className="is-num"><button type="button" className="lx-link" disabled={!!busy} onClick={()=>{if(confirm(tr('Gỡ {0} khỏi học phần này?',[user?.name||''])))void onMutate({action:'membership-remove',id:m.id},tr('Đã gỡ phân công.'))}}>{tr('Gỡ khỏi học phần')}</button></td>
          </tr>})}</tbody>
        </table>{!rows.length&&<p className="lx-empty-line">{tr('Chưa có ai được phân công vào học phần này.')}</p>}</div>
      </Section>
    </div>;
  }
  async function create(event:FormEvent){
    event.preventDefault();
    if(await onMutate({action:'course-save',name:form.name,code:form.code,className:form.className||form.code,weeks:data.weeks,rubric:data.rubric},tr('Đã tạo học phần.'))){setCreating(false);setForm({name:'',code:'',className:''})}
  }
  return <div className="lx-stack">
    <div className="lx-filters"><span className="lx-muted">{tr('{0} học phần',[data.courses.length])}</span><button type="button" className="lx-btn is-primary lx-push" onClick={()=>setCreating(v=>!v)}><UiIcon name="add" size={15}/>{tr('Tạo học phần')}</button></div>
    {creating&&<Section title={tr('Học phần mới')}>
      <form className="lx-fields" onSubmit={create}><fieldset className="lx-fields" disabled={!!busy}>
        <div className="lx-grid-3">
          <label className="lx-field"><span>{tr('Tên học phần')}</span><input required maxLength={200} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label className="lx-field"><span>{tr('Mã học phần')}</span><input required maxLength={40} value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></label>
          <label className="lx-field"><span>{tr('Lớp học phần')}</span><input maxLength={120} placeholder={form.code} value={form.className} onChange={e=>setForm({...form,className:e.target.value})}/></label>
        </div>
        <p className="lx-muted">{tr('Học phần mới dùng hành trình 9 tuần và rubric mặc định; bạn có thể chỉnh sau khi tạo.')}</p>
        <div className="lx-row"><button className="lx-btn is-primary">{tr(busy==='course-save'?'Đang lưu…':'Tạo học phần')}</button><button type="button" className="lx-btn" onClick={()=>setCreating(false)}>{tr('Hủy')}</button></div>
      </fieldset></form>
    </Section>}
    <div className="lx-table-wrap"><table className="lx-table">
      <thead><tr><th>{tr('Học phần')}</th><th>{tr('Lớp học phần')}</th><th>{tr('Giảng viên')}</th><th className="is-num">{tr('Sinh viên')}</th><th>{tr('Hạn nộp gần nhất')}</th><th/></tr></thead>
      <tbody>{data.courses.map(c=>{const next=c.weeks.find(w=>w.due&&w.due>=today),lecturers=members(c.id,'lecturer').map(m=>name(m.userId));return <tr key={c.id}>
        <td className="lx-title-cell"><a className="lx-row-link" href={adminHref('courses',{course:c.id})}>{c.code}</a><small>{demoText(c.name,c.id,language)}</small></td>
        <td>{c.className||c.code}</td>
        <td>{lecturers.length?lecturers.join(', '):<span className="lx-attention">{tr('Chưa phân công')}</span>}</td>
        <td className="is-num">{members(c.id,'student').length}</td>
        <td className="lx-muted">{next?`${tr('Tuần {0}',[next.week])} · ${next.due.split('-').reverse().join('/')}`:'—'}</td>
        <td className="is-num"><a className="lx-link" href={adminHref('courses',{course:c.id})}>{tr('Cấu hình')}<UiIcon name="next" size={13}/></a></td>
      </tr>})}</tbody>
    </table>{!data.courses.length&&<p className="lx-empty-line">{tr('Chưa có học phần. Tạo học phần đầu tiên để bắt đầu.')}</p>}</div>
  </div>;
}
