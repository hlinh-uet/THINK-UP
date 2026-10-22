'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {studentPages,viewPath,type Role} from '../lib/access';
import {adminHref} from '../lib/admin-pages';
import {lecturerHref} from '../lib/lecturer-pages';
import {avatarLimit,validateAvatar,type OwnProfile} from '../lib/profile';
import {languageCookie,translate,type Language} from '../lib/i18n';
import {formatMessageTimestamp} from '../lib/message-date';
import {roles} from '../lib/domain';
import {demoText} from '../lib/demo-i18n';
import {messagesHref} from '../lib/messaging';
import AdminNavigation from './AdminNavigation';
import MessageUnreadBadge from './MessageUnreadBadge';
import WorkspaceProfile from './WorkspaceProfile';
import WorkspaceHeader from './WorkspaceHeader';
import LecturerNavigation from './LecturerNavigation';
import UserAvatar from './UserAvatar';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import LanguageToggle from './LanguageToggle';
import SiteFooter from './SiteFooter';
import {useUnsavedChanges} from './useUnsavedChanges';

const values=(profile:OwnProfile)=>({name:profile.user.name,phone:profile.phone,bio:profile.bio});
export default function ProfileWorkspace({initialProfile,language:initialLanguage}:{initialProfile:OwnProfile;language:Language}) {
  const [profile,setProfile]=useState(initialProfile),[form,setForm]=useState(values(initialProfile)),[language,setLanguage]=useState(initialLanguage);
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[avatarMode,setAvatarMode]=useState<'keep'|'replace'|'remove'>('keep');
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState<{text:string;error:boolean}|null>(null),[conflict,setConflict]=useState(false),[help,setHelp]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null),previewRef=useRef(''),selection=useRef(0),mounted=useRef(true);
  const controller=useRef<AbortController|null>(null),{markChanged,markSaved}=useUnsavedChanges();
  const role=profile.user.role as Role,dirty=JSON.stringify(form)!==JSON.stringify(values(profile))||avatarMode!=='keep';
  const tr=(text:string)=>translate(text,language);
  const avatarUrl=avatarMode==='remove'?undefined:preview||profile.user.avatarUrl;
  useEffect(()=>{if(dirty)markChanged();else markSaved()},[dirty,markChanged,markSaved]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;controller.current?.abort();if(previewRef.current)URL.revokeObjectURL(previewRef.current)}},[]);
  useEffect(()=>{document.documentElement.lang=language;document.title=translate('Hồ sơ cá nhân',language)+' · THINK UP';document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')},[language]);
  function clearPreview(){if(previewRef.current)URL.revokeObjectURL(previewRef.current);previewRef.current='';setPreview('');setFile(null);if(fileInput.current)fileInput.current.value='';selection.current++}
  function reset(next=profile){clearPreview();setAvatarMode('keep');setForm(values(next));setConflict(false);markSaved()}
  async function selectAvatar(selected:File|undefined){
    if(!selected)return;const token=++selection.current;
    try{
      if(selected.size>avatarLimit)throw new Error('Ảnh đại diện cần nhỏ hơn hoặc bằng 2 MB.');
      validateAvatar(selected.type,new Uint8Array(await selected.arrayBuffer()));
      if(!mounted.current||selection.current!==token)return;
      if(previewRef.current)URL.revokeObjectURL(previewRef.current);
      const url=URL.createObjectURL(selected);previewRef.current=url;setPreview(url);setFile(selected);setAvatarMode('replace');setNotice(null);
    }catch(error){if(mounted.current&&selection.current===token){setNotice({text:error instanceof Error?error.message:'Chưa thể đọc ảnh đại diện.',error:true});if(fileInput.current)fileInput.current.value=''}}
  }
  async function request(body?:FormData){
    const abort=new AbortController();controller.current=abort;const timer=setTimeout(()=>abort.abort(),30000);
    try{
      const response=await fetch('/api/profile',{cache:'no-store',signal:abort.signal,...(body?{method:'POST',body}:{})});
      const raw=await response.text();let data:OwnProfile&{error?:string};
      try{data=JSON.parse(raw)}catch{throw new Error(response.status===413?'Ảnh đại diện cần nhỏ hơn hoặc bằng 2 MB.':'Chưa thể cập nhật hồ sơ.')}
      if(!response.ok){if(response.status===401)location.assign('/login');if(response.status===409)setConflict(true);throw new Error(data.error||'Chưa thể cập nhật hồ sơ.')}
      return data;
    }finally{clearTimeout(timer)}
  }
  async function save(event:FormEvent){
    event.preventDefault();if(busy||!dirty)return;
    const body=new FormData();Object.entries(form).forEach(([key,value])=>body.set(key,value));body.set('revision',String(profile.revision));body.set('avatarMode',avatarMode);if(file)body.set('avatar',file);
    setBusy(true);setNotice(null);
    try{const next=await request(body);if(mounted.current){setProfile(next);reset(next);setNotice({text:'Đã lưu hồ sơ cá nhân.',error:false})}}
    catch(error){if(mounted.current)setNotice({text:error instanceof Error&&!(error instanceof TypeError)&&error.name!=='AbortError'?error.message:'Chưa lưu được hồ sơ. Thay đổi đang soạn vẫn được giữ để thử lại.',error:true})}
    finally{if(mounted.current)setBusy(false)}
  }
  async function reload(){
    if(busy||dirty&&!window.confirm(tr('Tải lại sẽ bỏ thay đổi hồ sơ chưa lưu. Tiếp tục?')))return;
    setBusy(true);try{const next=await request();if(mounted.current){setProfile(next);reset(next);setNotice(null)}}catch{if(mounted.current)setNotice({text:'Chưa thể tải lại hồ sơ. Vui lòng thử lại.',error:true})}finally{if(mounted.current)setBusy(false)}
  }
  async function logout(){
    if(busy)return;if(dirty){setNotice({text:'Lưu hoặc bỏ thay đổi hồ sơ trước khi đăng xuất.',error:true});return}
    try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/')}catch{setNotice({text:'Chưa thể đăng xuất. Vui lòng thử lại.',error:true})}
  }
  return <div className={`app-shell profile-workspace ${role==='admin'?'admin-workspace':''} rail-workspace ${role==='lecturer'?'lecturer-workspace':''} ${role==='student'?'student-workspace':''}`}><WorkspaceHeader sideNavigation mobileSideMenu={role!=='student'} homeHref={role==='admin'?adminHref('courses'):role==='student'?'/student':lecturerHref('submissions')} language={language} controls={<><button type="button" className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(value=>!value)}><UiIcon name="help"/></button><LanguageToggle language={language} onChange={setLanguage} disabled={busy}/></>} profile={<WorkspaceProfile user={profile.user} language={language} busy={busy} current onLogout={()=>void logout()}/>}>
{role==='admin'?<AdminNavigation section={undefined} query={{}} language={language} busy={busy}/>:role==='lecturer'?<LecturerNavigation language={language} busy={busy}/>:<nav aria-label={tr('Điều hướng chính')}>{studentPages.map(page=><a key={page.key} href={viewPath(role,page.key)} title={tr(page.label)} onClick={e=>{if(busy)e.preventDefault()}}><UiIcon name={page.key}/><span>{tr(page.label)}</span>{page.key==='messages'&&<MessageUnreadBadge language={language}/>}</a>)}</nav>}
</WorkspaceHeader><div className="main-shell">
    <main id="workspace-main" tabIndex={-1}><WorkspacePageHeading title={tr('Hồ sơ cá nhân')}/>
      {help&&<section className="notice profile-help"><b>{tr('Bạn tự chỉnh sửa những gì?')}</b><p>{tr('Bạn có thể đổi tên hiển thị, số điện thoại, giới thiệu và ảnh đại diện. Email đăng nhập, vai trò, trạng thái và phân công học phần do admin quản lý.')}</p><button className="text-button" onClick={()=>setHelp(false)}>{tr('Đóng')}</button></section>}
      {notice&&<div className={`notice profile-notice ${notice.error?'warning':'profile-success'}`} role={notice.error?'alert':'status'}><span>{tr(notice.text)}</span>{conflict&&<button className="text-button" disabled={busy} onClick={()=>void reload()}>{tr('Tải lại thông tin')}</button>}<button className="icon-button" aria-label={tr('Đóng thông báo')} onClick={()=>setNotice(null)}><UiIcon name="close" size={16}/></button></div>}
      <div className="profile-page-grid"><form className="panel profile-edit-card" onSubmit={save}>
        <div className="profile-hero"><UserAvatar person={{name:form.name||profile.user.name,avatarUrl}} className="profile-portrait"/><div><span className="eyebrow">{tr('Ảnh đại diện')}</span><h2>{form.name||profile.user.name}</h2><span className={`chat-role ${role}`}>{tr(roles[role])}</span></div></div>
        <div className="profile-avatar-controls"><label className={`button ${busy?'disabled':''}`} htmlFor="profile-avatar"><UiIcon name="attachment" size={16}/>{tr('Chọn ảnh mới')}</label><input ref={fileInput} id="profile-avatar" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void selectAvatar(e.target.files?.[0])}/>{avatarUrl&&<button className="text-button" type="button" disabled={busy} onClick={()=>{clearPreview();setAvatarMode('remove')}}>{tr('Xóa ảnh đại diện')}</button>}<small>{tr('PNG, JPG hoặc WebP · tối đa 2 MB')}</small></div>
        <div className="profile-form-fields"><label className="field">{tr('Tên hiển thị')}<input required maxLength={120} autoComplete="name" value={form.name} disabled={busy} onChange={e=>setForm({...form,name:e.target.value})}/><small>{tr('Tên này hiển thị trong lớp học và các tin nhắn mới.')}</small></label>
          <label className="field">{tr('Số điện thoại')}<input type="tel" maxLength={30} autoComplete="tel" value={form.phone} disabled={busy} onChange={e=>setForm({...form,phone:e.target.value})} placeholder={tr('Không bắt buộc')}/></label>
          <label className="field">{tr('Giới thiệu về bạn')}<textarea rows={4} maxLength={800} value={form.bio} disabled={busy} onChange={e=>setForm({...form,bio:e.target.value})} placeholder={tr('Một vài dòng về sở thích, việc học hoặc điều bạn quan tâm…')}/><small>{form.bio.length}/800 · {tr('Không bắt buộc')}</small></label>
        </div><div className="profile-save-row"><span>{tr(dirty?'Có thay đổi chưa lưu':'Thông tin đã được lưu')}</span><div><button className="button" type="button" disabled={busy||!dirty} onClick={()=>{reset();setNotice(null)}}>{tr('Bỏ thay đổi')}</button><button className="button primary" disabled={busy||!dirty}>{tr(busy?'Đang lưu…':'Lưu hồ sơ')}<UiIcon name="check" size={16}/></button></div></div>
        <p className="profile-privacy-note">{tr('Tên và avatar được hiển thị cho tài khoản đã đăng nhập. Số điện thoại và giới thiệu chỉ xuất hiện trong hồ sơ của bạn.')}</p>
      </form><aside className="profile-account-column"><section className="panel profile-account-card"><div className="section-head"><h2>{tr('Thông tin tài khoản')}</h2><span className="profile-managed-label">{tr('Admin quản lý')}</span></div><p className="muted">{tr('Cần thay đổi các mục bên dưới? Liên hệ admin để được cập nhật.')}</p>
        <label className="field">Email<input readOnly value={profile.user.email} aria-describedby="profile-managed-note"/></label><div className="profile-readonly-row"><span>{tr('Vai trò')}</span><b>{tr(roles[role])}</b></div><div className="profile-readonly-row"><span>{tr('Trạng thái')}</span><span className={`badge ${profile.user.active?'final':'returned'}`}>{tr(profile.user.active?'Hoạt động':'Tạm ngừng')}</span></div><div className="profile-readonly-row"><span>{tr('Ngày tạo tài khoản')}</span><b>{formatMessageTimestamp(profile.createdAt,language).date}</b></div>
        <p id="profile-managed-note" className="profile-locked-note">{tr('Email là địa chỉ đăng nhập. Bạn không thể tự đổi email, quyền hoặc phân công học phần tại đây.')}</p><a className="button full" href={role==='admin'?adminHref('users'):messagesHref(role)}>{tr(role==='admin'?'Quản lý tài khoản trên admin':'Liên hệ admin qua Tin nhắn')}<UiIcon name="arrow" size={15}/></a>
      </section><section className="panel profile-courses-card"><div className="section-head"><h2>{tr('Học phần của bạn')}</h2><span className="profile-managed-label">{tr('Admin quản lý')}</span></div>{profile.courses.length?profile.courses.map(course=><div className="profile-course" key={course.id}><span className="pill">{course.code}</span><h3>{demoText(course.name,course.id,language)}</h3><small>{tr(course.role==='lecturer'?'Giảng viên':'Sinh viên')}</small></div>):<p className="muted">{tr('Bạn chưa được phân công học phần.')}</p>}<p className="profile-locked-note">{tr('Admin thêm, gỡ hoặc thay đổi phân công học phần cho bạn.')}</p></section></aside></div>
      <SiteFooter language={language} compact onHelp={()=>setHelp(!help)}/>
    </main></div></div>;
}
