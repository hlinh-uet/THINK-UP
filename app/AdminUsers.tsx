'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Data, User } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import UiIcon from './UiIcon';
import TablePagination,{usePageRows} from './TablePagination';
import UserAvatar from './UserAvatar';
import { adminHref } from '../lib/admin-pages';
import { useUnsavedChanges } from './useUnsavedChanges';

type Props = {
  data: Data;
  language: Language;
  busy: string;
  initialRole?: string;
  onRoleFilter: (role: string) => void;
  onMutate: (body: Record<string, unknown>, message: string) => Promise<{id?:string;ok?:boolean}|null>;
  onEditUser: (user: User) => void;
};
const emptyForm = { name: '', email: '', password: '', role: 'student', courseIds: [] as string[] };

export default function AdminUsers({data,language,busy,initialRole='all',onRoleFilter,onMutate,onEditUser}: Props) {
  const tr = (text: string, parameters: readonly unknown[] = []) => translate(text, language, parameters);
  const dt = (text: string, id: string) => demoText(text, id, language);
  const [roleFilter,setRoleFilter] = useState(['student','lecturer','admin'].includes(initialRole)?initialRole:'all');
  const [search,setSearch] = useState('');
  const [status,setStatus] = useState('all');
  const [creating,setCreating] = useState(false);
  const [form,setForm] = useState({...emptyForm});
  const [showPassword,setShowPassword] = useState(false);
  const [created,setCreated] = useState(false);
  const [copied,setCopied] = useState(false);
  const [formError,setFormError] = useState('');
  const [invite,setInvite] = useState({name:'',email:'',role:'student',courseId:''});
  const {markChanged,markSaved}=useUnsavedChanges();
  useEffect(()=>{
    const accountDirty=creating&&!created&&JSON.stringify(form)!==JSON.stringify(emptyForm);
    const assignmentDirty=!!(invite.name||invite.email||invite.courseId||invite.role!=='student');
    if(accountDirty||assignmentDirty)markChanged();else markSaved();
  },[creating,created,form,invite,markChanged,markSaved]);
  const roles = {student:tr('Sinh viên'),lecturer:tr('Giảng viên'),admin:tr('Quản trị viên')};
  const visible = data.users.filter(u => (roleFilter==='all'||u.role===roleFilter) && (status==='all'||u.active===Number(status)) && `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pagination=usePageRows(visible,JSON.stringify([roleFilter,status,search]));
  function filterRole(next: string) {
    setRoleFilter(next);onRoleFilter(next);
    history.replaceState({},'',adminHref('users',{role:next}));
  }
  function closeCreate() { if(busy==='user-create')return;setCreating(false);setForm({...emptyForm});setCreated(false);setShowPassword(false);setCopied(false);setFormError(''); }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();setFormError('');
    const result = await onMutate({action:'user-create',...form},tr('Đã tạo tài khoản. Người dùng có thể đăng nhập ngay.'));
    if(result)setCreated(true);else setFormError('Chưa tạo được tài khoản. Kiểm tra thông báo lỗi và thử lại.');
  }
  function generatePassword() {
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#';
    setForm({...form,password:Array.from(bytes,b=>alphabet[b%alphabet.length]).join('')});setShowPassword(true);
  }
  async function copyLogin() {
    try { await navigator.clipboard.writeText(`Email: ${form.email.trim().toLowerCase()}\n${tr('Mật khẩu')}: ${form.password}`);setCopied(true); }
    catch { setFormError('Không thể sao chép tự động. Bạn có thể chọn và sao chép thông tin bên dưới.'); }
  }
  return <>
    <section className="panel user-management">
      <div className="section-head"><div><h3>{tr('Sinh viên & giảng viên')}</h3></div><button className="button primary" onClick={()=>setCreating(true)}><UiIcon name="add" size={17}/>{tr('Tạo tài khoản')}</button></div>
      <div className="user-role-tabs" aria-label={tr('Lọc theo vai trò')}>{(['all','student','lecturer','admin'] as const).map(role=><button type="button" className={roleFilter===role?'selected':''} aria-pressed={roleFilter===role} key={role} onClick={()=>filterRole(role)}>{role==='all'?tr('Tất cả'):roles[role]}<span>{data.users.filter(u=>role==='all'||u.role===role).length}</span></button>)}</div>
      <div className="toolbar"><input aria-label={tr('Tìm người dùng')} placeholder={tr('Tìm theo tên hoặc email…')} value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label={tr('Lọc trạng thái tài khoản')} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">{tr('Tất cả trạng thái')}</option><option value="1">{tr('Hoạt động')}</option><option value="0">{tr('Tạm ngừng')}</option></select></div>
      <div className="table-scroll"><table><thead><tr><th>{tr('Người dùng')}</th><th>{tr('Vai trò')}</th><th>{tr('Trạng thái')}</th><th>{tr('Học phần')}</th><th>{tr('Thao tác')}</th></tr></thead><tbody>{pagination.rows.map(u=><tr key={u.id}><td><div className="user-cell"><UserAvatar person={u}/><div><b>{dt(u.name,u.id)}</b><small>{u.email}</small></div></div></td><td>{roles[u.role as keyof typeof roles]}</td><td><span className={`badge ${u.active?'final':'returned'}`}>{u.active?tr('Hoạt động'):tr('Tạm ngừng')}</span></td><td>{data.memberships.filter(m=>m.userId===u.id).length?data.memberships.filter(m=>m.userId===u.id).map(m=><div className="membership-chip" key={m.id}><span>{data.courses.find(c=>c.id===m.courseId)?.code} · {m.role==='lecturer'?tr('Giảng viên'):tr('Sinh viên')}</span><button aria-label={tr('Gỡ phân công học phần')} title={tr('Gỡ phân công')} disabled={!!busy} onClick={()=>onMutate({action:'membership-remove',id:m.id},tr('Đã gỡ phân công học phần.'))}>×</button></div>):<span className="muted">{tr('Chưa phân công')}</span>}</td><td><button className="text-button" onClick={()=>onEditUser({...u})}>{tr('Chỉnh sửa ↗')}</button></td></tr>)}</tbody></table></div>
      <TablePagination {...pagination} total={visible.length} language={language}/>
      {!visible.length&&<div className="empty"><h4>{tr('Không tìm thấy người dùng phù hợp')}</h4><p>{tr('Thử đổi vai trò, trạng thái hoặc từ khóa tìm kiếm.')}</p></div>}
    </section>
    <details className="panel section-margin"><summary>{tr('Phân công bằng email')}</summary><p className="muted">{tr('Phân công tài khoản đã có, hoặc lưu email chờ người dùng đăng ký. Tạo tài khoản trực tiếp bằng nút phía trên.')}</p>
      <form className="invite-form" onSubmit={async e=>{e.preventDefault();const result=await onMutate({action:'invite',...invite},tr('Đã lưu phân công người dùng.'));if(result)setInvite({name:'',email:'',role:'student',courseId:''})}}>
        <label className="field">{tr('Họ và tên')}<input maxLength={120} value={invite.name} onChange={e=>setInvite({...invite,name:e.target.value})} placeholder={tr('Tên người học hoặc giảng viên')}/></label>
        <label className="field">Email<input type="email" required value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})} placeholder="name@university.edu"/></label>
        <label className="field">{tr('Vai trò')}<select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}>{Object.entries(roles).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
        <label className="field">{tr('Học phần')}<select value={invite.courseId} onChange={e=>setInvite({...invite,courseId:e.target.value})}><option value="">{tr('Chưa phân công học phần')}</option>{data.courses.map(c=><option key={c.id} value={c.id}>{c.code} · {dt(tr(c.name),c.id)}</option>)}</select></label>
        <button className="button primary" disabled={!!busy}>{tr('Lưu phân công')}</button>
      </form>
    </details>
    {data.invitations.length>0&&<section className="panel section-margin"><h3>{tr('Phân công chờ xác nhận')}</h3><div className="table-scroll"><table><thead><tr><th>Email</th><th>{tr('Vai trò')}</th><th>{tr('Học phần')}</th><th>{tr('Thao tác')}</th></tr></thead><tbody>{data.invitations.map(i=><tr key={i.id}><td>{dt(i.name,i.id)}<small>{i.email}</small></td><td>{roles[i.role as keyof typeof roles]}</td><td>{data.courses.find(c=>c.id===i.courseId)?dt(tr(data.courses.find(c=>c.id===i.courseId)!.name),i.courseId!):tr('Chưa phân công')}</td><td><div className="button-group">{data.users.some(u=>u.email===i.email)&&<button className="text-button" disabled={!!busy} onClick={()=>onMutate({action:'invite-approve',id:i.id},tr('Đã xác nhận phân công.'))}>{tr('Xác nhận phân công')}</button>}<button className="text-button" disabled={!!busy} onClick={()=>onMutate({action:'invite-remove',id:i.id},tr('Đã hủy phân công chờ.'))}>{tr('Hủy')}</button></div></td></tr>)}</tbody></table></div></section>}
    {creating&&<CreateDialog title={tr(created?'Tài khoản đã tạo':'Tạo tài khoản sinh viên / giảng viên')} closeLabel={tr('Đóng')} onClose={closeCreate}>
      {created?<div className="created-account"><span className="badge final" role="status">{tr('Có thể đăng nhập ngay')}</span><h3>{form.name}</h3><p className="muted">{roles[form.role as 'student'|'lecturer']}</p><dl><dt>Email</dt><dd>{form.email.trim().toLowerCase()}</dd><dt>{tr('Mật khẩu')}</dt><dd>{form.password}</dd></dl><p className="notice">{tr('Cung cấp thông tin này cho người dùng. Mật khẩu chỉ hiển thị trong lần tạo này.')}</p><button className="button primary full" onClick={()=>void copyLogin()}>{tr(copied?'Đã sao chép':'Sao chép thông tin đăng nhập')}</button><button className="button full" onClick={closeCreate}>{tr('Hoàn tất')}</button></div>:<form onSubmit={create}>
        <p className="muted">{tr('Tài khoản được tạo trực tiếp và có thể đăng nhập ngay bằng email và mật khẩu.')}</p>
        <label className="field">{tr('Họ và tên')}<input required maxLength={120} autoComplete="off" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} disabled={!!busy}/></label>
        <label className="field">Email<input type="email" required maxLength={254} autoComplete="off" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} disabled={!!busy}/></label>
        <label className="field">{tr('Vai trò')}<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} disabled={!!busy}><option value="student">{tr('Sinh viên')}</option><option value="lecturer">{tr('Giảng viên')}</option></select></label>
        <label className="field">{tr('Mật khẩu')}<div className="password-field"><input type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={72} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} disabled={!!busy}/><button type="button" aria-label={tr(showPassword?'Ẩn mật khẩu':'Hiện mật khẩu')} aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{tr(showPassword?'Ẩn':'Hiện')}</button></div></label>
        <div className="password-tools"><small className="muted">{tr('Ít nhất 12 ký tự, tối đa 72 byte.')}</small><button className="text-button" type="button" disabled={!!busy} onClick={generatePassword}>{tr('Tạo mật khẩu ngẫu nhiên')}</button></div>
        <fieldset className="create-user-courses"><legend>{tr('Phân công học phần (không bắt buộc)')}</legend>{data.courses.length?data.courses.map(c=><label key={c.id} aria-label={c.code}><input type="checkbox" checked={form.courseIds.includes(c.id)} disabled={!!busy} onChange={e=>setForm({...form,courseIds:e.target.checked?[...form.courseIds,c.id]:form.courseIds.filter(id=>id!==c.id)})}/><span><b>{c.code}</b><small>{dt(tr(c.name),c.id)}</small></span></label>):<p className="muted">{tr('Chưa có học phần. Bạn có thể phân công sau.')}</p>}</fieldset>
        <button className="button primary full" disabled={!!busy}>{tr(busy==='user-create'?'Đang tạo tài khoản…':'Tạo tài khoản')}</button>
      </form>}
      {formError&&<p className="auth-error" role="alert">{tr(formError)}</p>}
    </CreateDialog>}
  </>;
}

function CreateDialog({title,closeLabel,onClose,children}:{title:string;closeLabel:string;onClose:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose},[onClose]);
  useEffect(()=>{
    const prior=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow;
    ref.current?.focus();document.body.style.overflow='hidden';
    const listener=(e:KeyboardEvent)=>{
      if(e.key==='Escape')closeRef.current();
      if(e.key==='Tab'){
        const elements=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]');
        if(!elements?.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    };
    addEventListener('keydown',listener);
    return()=>{document.body.style.overflow=overflow;removeEventListener('keydown',listener);prior?.focus()};
  },[]);
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="modal-header"><h3>{title}</h3><button className="close-button" aria-label={closeLabel} onClick={onClose}><UiIcon name="close"/></button></div><div className="modal-body">{children}</div></div></div>;
}
