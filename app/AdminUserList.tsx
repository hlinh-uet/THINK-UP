'use client';
import { useState, type FormEvent } from 'react';
import type { Data, User } from '../lib/domain';
import { adminHref } from '../lib/admin-pages';
import { translate, type Language } from '../lib/i18n';
import type { LecturerMutation } from './LecturerWorkspace';
import UiIcon from './UiIcon';
import UserAvatar from './UserAvatar';
import { Section } from './LecturerKit';
import { useUnsavedChanges } from './useUnsavedChanges';

const roleLabels:Record<string,string>={student:'Sinh viên',lecturer:'Giảng viên',admin:'Quản trị viên'};
const emptyAccount={name:'',email:'',password:'',role:'student',courseIds:[] as string[]};
const emptyInvite={name:'',email:'',role:'student',courseId:''};

/** Accounts and course assignments (spec 2.9): create, edit, suspend, assign by email and approve pending assignments. */
export default function AdminUserList({data,language,busy,initialRole='',onMutate}:{data:Data;language:Language;busy:string;initialRole?:string;onMutate:LecturerMutation}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const [role,setRole]=useState(['student','lecturer','admin'].includes(initialRole)?initialRole:'all');
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all');
  const [creating,setCreating]=useState(false),[account,setAccount]=useState(emptyAccount),[created,setCreated]=useState<{email:string;password:string}|null>(null),[showPassword,setShowPassword]=useState(false);
  const [editing,setEditing]=useState<User|null>(null),[assignCourse,setAssignCourse]=useState('');
  const [invite,setInvite]=useState(emptyInvite);
  const {markChanged,markSaved}=useUnsavedChanges();
  const courseCode=(id:string|null)=>data.courses.find(c=>c.id===id)?.code||'—';
  const visible=data.users.filter(u=>(role==='all'||u.role===role)&&(status==='all'||u.active===Number(status))&&`${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b)=>['admin','lecturer','student'].indexOf(a.role)-['admin','lecturer','student'].indexOf(b.role)||a.name.localeCompare(b.name,'vi'));
  function pickRole(next:string){setRole(next);history.replaceState({},'',adminHref('users',{role:next==='all'?undefined:next}))}
  function generatePassword(){
    const bytes=crypto.getRandomValues(new Uint8Array(14)),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    setAccount(a=>({...a,password:Array.from(bytes,b=>alphabet[b%alphabet.length]).join('')}));setShowPassword(true);markChanged();
  }
  async function create(event:FormEvent){
    event.preventDefault();
    if(await onMutate({action:'user-create',...account},tr('Đã tạo tài khoản. Người dùng có thể đăng nhập ngay.'))){setCreated({email:account.email,password:account.password});setAccount(emptyAccount);markSaved()}
  }
  async function save(event:FormEvent){
    event.preventDefault();if(!editing)return;
    if(await onMutate({action:'user-save',id:editing.id,name:editing.name,email:editing.email,role:editing.role,active:editing.active},tr('Đã cập nhật người dùng.'))){setEditing(null);markSaved()}
  }
  async function assign(user:User){
    if(!assignCourse)return;
    if(await onMutate({action:'invite',email:user.email,name:user.name,role:user.role==='admin'?'admin':user.role,courseId:assignCourse},tr('Đã phân công vào học phần.')))setAssignCourse('');
  }
  async function sendInvite(event:FormEvent){
    event.preventDefault();
    if(await onMutate({action:'invite',...invite,courseId:invite.courseId||null},tr('Đã lưu phân công.'))){setInvite(emptyInvite);markSaved()}
  }
  const counts={all:data.users.length,student:0,lecturer:0,admin:0} as Record<string,number>;
  for(const u of data.users)counts[u.role]=(counts[u.role]||0)+1;
  return <div className="lx-stack">
    <>
      <div className="lx-row lx-users-bar">
        <nav className="lx-tabs" aria-label={tr('Lọc theo vai trò')}>{['all','student','lecturer','admin'].map(key=><button key={key} type="button" aria-pressed={role===key} onClick={()=>pickRole(key)}>{tr(key==='all'?'Tất cả':roleLabels[key])}<span>{counts[key]||0}</span></button>)}</nav>
        <button type="button" className="lx-btn is-primary lx-push" onClick={()=>{setCreating(v=>!v);setCreated(null)}}><UiIcon name="add" size={15}/>{tr('Tạo tài khoản')}</button>
      </div>
      {creating&&<Section title={tr('Tài khoản mới')}>
        {created?<div className="lx-stack is-tight">
          <p className="lx-notice">{tr('Đã tạo tài khoản. Gửi thông tin đăng nhập cho người dùng qua kênh an toàn.')}</p>
          <p><b>{created.email}</b> · <code>{created.password}</code></p>
          <div className="lx-row"><button type="button" className="lx-btn" onClick={()=>void navigator.clipboard?.writeText(`${created.email}\n${created.password}`)}>{tr('Sao chép thông tin đăng nhập')}</button><button type="button" className="lx-btn" onClick={()=>setCreated(null)}>{tr('Tạo tài khoản khác')}</button></div>
        </div>:<form onSubmit={create}><fieldset className="lx-fields" disabled={!!busy}>
          <div className="lx-grid-3">
            <label className="lx-field"><span>{tr('Họ và tên')}</span><input required maxLength={120} value={account.name} onChange={e=>{setAccount({...account,name:e.target.value});markChanged()}}/></label>
            <label className="lx-field"><span>Email</span><input type="email" required maxLength={254} value={account.email} onChange={e=>{setAccount({...account,email:e.target.value});markChanged()}}/></label>
            <label className="lx-field"><span>{tr('Vai trò')}</span><select value={account.role} onChange={e=>setAccount({...account,role:e.target.value})}><option value="student">{tr('Sinh viên')}</option><option value="lecturer">{tr('Giảng viên')}</option></select></label>
          </div>
          <label className="lx-field"><span>{tr('Mật khẩu')}</span><span className="lx-row"><input type={showPassword?'text':'password'} required minLength={12} maxLength={72} autoComplete="new-password" value={account.password} onChange={e=>{setAccount({...account,password:e.target.value});markChanged()}}/><button type="button" className="lx-btn" onClick={generatePassword}>{tr('Tạo mật khẩu')}</button><button type="button" className="lx-link" onClick={()=>setShowPassword(v=>!v)}>{tr(showPassword?'Ẩn':'Hiện')}</button></span><small className="lx-muted">{tr('Ít nhất 12 ký tự, tối đa 72 byte.')}</small></label>
          <fieldset className="lx-check-group"><legend>{tr('Phân công học phần')}</legend>{data.courses.map(c=><label key={c.id} className="lx-check"><input type="checkbox" checked={account.courseIds.includes(c.id)} onChange={e=>setAccount({...account,courseIds:e.target.checked?[...account.courseIds,c.id]:account.courseIds.filter(id=>id!==c.id)})}/>{c.code}</label>)}</fieldset>
          <div className="lx-row"><button className="lx-btn is-primary">{tr(busy==='user-create'?'Đang tạo…':'Tạo tài khoản')}</button><button type="button" className="lx-btn" onClick={()=>{setCreating(false);setAccount(emptyAccount);markSaved()}}>{tr('Hủy')}</button></div>
        </fieldset></form>}
      </Section>}
      <div className="lx-filters">
        <label className="lx-search"><UiIcon name="search" size={15}/><input aria-label={tr('Tìm người dùng')} placeholder={tr('Tìm theo tên hoặc email…')} maxLength={200} value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <select aria-label={tr('Lọc trạng thái tài khoản')} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{tr('Tất cả trạng thái')}</option><option value="1">{tr('Đang hoạt động')}</option><option value="0">{tr('Tạm ngừng')}</option></select>
        <span className="lx-muted">{tr('{0} người dùng',[visible.length])}</span>
      </div>
      <div className="lx-table-wrap"><table className="lx-table lx-users">
        <thead><tr><th>{tr('Người dùng')}</th><th>{tr('Vai trò')}</th><th>{tr('Học phần')}</th><th/></tr></thead>
        <tbody>{visible.map(u=>{const own=data.memberships.filter(m=>m.userId===u.id),open=editing?.id===u.id;return [<tr key={u.id} className={open?'is-open':''}>
          <td><span className="lx-person"><UserAvatar person={u}/><span><b>{u.name}{!u.active&&<em className="lx-tag">{tr('Tạm ngừng')}</em>}</b><small>{u.email}</small></span></span></td>
          <td>{tr(roleLabels[u.role]||u.role)}</td>
          <td>{own.length?<span className="lx-chips">{own.map(m=><span className="lx-chip" key={m.id} title={tr(m.role==='lecturer'?'Giảng viên':'Sinh viên')}>{courseCode(m.courseId)}{m.role==='lecturer'&&u.role!=='lecturer'?` · ${tr('GV')}`:''}<button type="button" aria-label={tr('Gỡ khỏi {0}',[courseCode(m.courseId)])} disabled={!!busy} onClick={()=>{if(confirm(tr('Gỡ {0} khỏi {1}?',[u.name,courseCode(m.courseId)])))void onMutate({action:'membership-remove',id:m.id},tr('Đã gỡ phân công.'))}}><UiIcon name="close" size={11}/></button></span>)}</span>:<span className="lx-muted">{tr(u.role==='admin'?'Toàn hệ thống':'Chưa phân công')}</span>}</td>
          <td className="is-num"><button type="button" className="lx-link" onClick={()=>{setEditing(open?null:{...u});setAssignCourse('')}}>{tr(open?'Đóng':'Chỉnh sửa')}</button></td>
        </tr>,open&&editing?<tr key={u.id+'-edit'} className="lx-subrow"><td colSpan={4}>
          <form className="lx-edit-user" onSubmit={save}><fieldset className="lx-fields" disabled={!!busy}>
            <div className="lx-grid-3">
              <label className="lx-field"><span>{tr('Họ và tên')}</span><input required maxLength={120} value={editing.name} onChange={e=>{setEditing({...editing,name:e.target.value});markChanged()}}/></label>
              <label className="lx-field"><span>Email</span><input type="email" required maxLength={254} value={editing.email} onChange={e=>{setEditing({...editing,email:e.target.value});markChanged()}}/></label>
              <label className="lx-field"><span>{tr('Vai trò')}</span><select value={editing.role} onChange={e=>{setEditing({...editing,role:e.target.value});markChanged()}}><option value="student">{tr('Sinh viên')}</option><option value="lecturer">{tr('Giảng viên')}</option><option value="admin">{tr('Quản trị viên')}</option></select></label>
            </div>
            <label className="lx-check"><input type="checkbox" checked={!!editing.active} onChange={e=>{setEditing({...editing,active:e.target.checked?1:0});markChanged()}}/>{tr('Tài khoản đang hoạt động (bỏ chọn để tạm ngừng; bài viết cũ vẫn được giữ)')}</label>
            {u.role!=='admin'&&<div className="lx-row"><select aria-label={tr('Thêm vào học phần')} value={assignCourse} onChange={e=>setAssignCourse(e.target.value)}><option value="">{tr('Thêm vào học phần…')}</option>{data.courses.filter(c=>!own.some(m=>m.courseId===c.id)).map(c=><option key={c.id} value={c.id}>{c.code} · {c.className||c.code}</option>)}</select><button type="button" className="lx-btn" disabled={!assignCourse||!!busy} onClick={()=>void assign(u)}>{tr('Phân công')}</button></div>}
            <div className="lx-row"><button className="lx-btn is-primary">{tr(busy==='user-save'?'Đang lưu…':'Lưu thay đổi')}</button><button type="button" className="lx-btn" onClick={()=>{setEditing(null);markSaved()}}>{tr('Hủy')}</button></div>
          </fieldset></form>
        </td></tr>:null]})}</tbody>
      </table>{!visible.length&&<p className="lx-empty-line">{tr('Không có người dùng phù hợp bộ lọc.')}</p>}</div>
    </>
    <div className="lx-split is-even">
      <Section title={tr('Phân công bằng email')}>
        <p className="lx-muted">{tr('Phân công tài khoản đã có, hoặc lưu phân công chờ người dùng đăng ký bằng email này.')}</p>
        <form onSubmit={sendInvite}><fieldset className="lx-fields" disabled={!!busy}>
          <div className="lx-grid-2 is-even">
            <label className="lx-field"><span>{tr('Họ và tên')}</span><input maxLength={120} value={invite.name} onChange={e=>{setInvite({...invite,name:e.target.value});markChanged()}}/></label>
            <label className="lx-field"><span>Email</span><input type="email" required maxLength={254} placeholder="name@university.edu" value={invite.email} onChange={e=>{setInvite({...invite,email:e.target.value});markChanged()}}/></label>
            <label className="lx-field"><span>{tr('Vai trò')}</span><select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}><option value="student">{tr('Sinh viên')}</option><option value="lecturer">{tr('Giảng viên')}</option></select></label>
            <label className="lx-field"><span>{tr('Học phần')}</span><select value={invite.courseId} onChange={e=>setInvite({...invite,courseId:e.target.value})}><option value="">{tr('Chưa chọn học phần')}</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.code} · {c.className||c.code}</option>)}</select></label>
          </div>
          <div className="lx-row"><button className="lx-btn is-primary">{tr(busy==='invite'?'Đang lưu…':'Lưu phân công')}</button></div>
        </fieldset></form>
      </Section>
      <Section title={tr('Phân công chờ duyệt')} count={data.invitations.length}>
        {data.invitations.length?<ul className="lx-invites">{data.invitations.map(i=><li key={i.id}>
          <span><b>{i.name||i.email}</b><small>{i.email} · {tr(roleLabels[i.role]||i.role)}{i.courseId?` · ${courseCode(i.courseId)}`:''}</small></span>
          <span className="lx-row"><button type="button" className="lx-btn is-small" disabled={!!busy||!data.users.some(u=>u.email===i.email)} title={data.users.some(u=>u.email===i.email)?undefined:tr('Người dùng cần đăng ký trước khi xác nhận phân công.')} onClick={()=>void onMutate({action:'invite-approve',id:i.id},tr('Đã duyệt phân công.'))}>{tr('Duyệt')}</button><button type="button" className="lx-link" disabled={!!busy} onClick={()=>void onMutate({action:'invite-remove',id:i.id},tr('Đã hủy phân công.'))}>{tr('Hủy')}</button></span>
        </li>)}</ul>:<p className="lx-empty-line">{tr('Không có phân công nào đang chờ.')}</p>}
      </Section>
    </div>
  </div>;
}
