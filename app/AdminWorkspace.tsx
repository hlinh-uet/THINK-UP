'use client';
import {useEffect,useRef,useState} from 'react';
import {homePath,type Role} from '../lib/access';
import {adminHref,adminPages,type AdminQuery,type AdminSection} from '../lib/admin-pages';
import type {Data} from '../lib/domain';
import {languageCookie,translate,type Language} from '../lib/i18n';
import type {LecturerMutation} from './LecturerWorkspace';
import AdminNavigation from './AdminNavigation';
import AdminUserList from './AdminUserList';
import AdminCourses from './AdminCourses';
import AdminSettings from './AdminSettings';
import WorkspaceHeader from './WorkspaceHeader';
import WorkspaceProfile from './WorkspaceProfile';
import LanguageToggle from './LanguageToggle';
import RoleHelp from './RoleHelp';
import UiIcon from './UiIcon';

/** Account, course and system configuration, with no teaching or monitoring state. */
export default function AdminWorkspace({initialData,initialLanguage,section,query}:{initialData:Data;initialLanguage:Language;section:AdminSection;query:AdminQuery}){
  const [data,setData]=useState(initialData),[language,setLanguage]=useState(initialLanguage);
  const [busy,setBusy]=useState(''),[hasUnsaved,setHasUnsaved]=useState(false),[help,setHelp]=useState(false);
  const [notice,setNotice]=useState<{text:string;error?:boolean}|null>(null),helpRef=useRef<HTMLElement>(null);
  const tr=(text:string)=>translate(text,language),page=adminPages.find(p=>p.key===section)!;
  const workspaceUrl='/api/thinkup?'+new URLSearchParams({adminSection:section,...(query.course?{course:query.course}:{})});
  useEffect(()=>{const change=(event:Event)=>setHasUnsaved(!!(event as CustomEvent<boolean>).detail);window.addEventListener('thinkup:unsaved',change);return()=>window.removeEventListener('thinkup:unsaved',change)},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer)},[notice]);
  useEffect(()=>{document.documentElement.lang=language;document.title=translate(page.label,language)+' · THINK UP';document.cookie=languageCookie+'='+language+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')},[language,page.label]);
  useEffect(()=>{if(!help)return;helpRef.current?.scrollIntoView({behavior:'smooth',block:'start'});helpRef.current?.focus({preventScroll:true});const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setHelp(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[help]);
  async function refresh(){
    const response=await fetch(workspaceUrl,{cache:'no-store'}),fresh=await response.json() as Data&{error?:string};
    if([401,403].includes(response.status)){location.assign('/login');return}
    if(!response.ok)throw new Error(fresh.error||tr('Chưa thể tải lại dữ liệu. Vui lòng thử lại.'));
    if(!fresh.user){location.assign('/login');return}
    if(fresh.user.role!=='admin'){location.assign(homePath(fresh.user.role as Role));return}
    setData(fresh);
  }
  async function reload(){try{await refresh()}catch{setNotice({text:'Chưa thể tải lại dữ liệu. Vui lòng thử lại.',error:true})}}
  const mutate:LecturerMutation=async(body,message)=>{
    setBusy(String(body.action));
    try{
      const response=await fetch('/api/thinkup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,language})}),result=await response.json() as {error?:string};
      if(!response.ok)throw new Error(result.error||'Thao tác chưa hoàn tất.');
      try{await refresh();setNotice({text:message})}catch{setNotice({text:'Đã lưu thay đổi. Hãy tải lại để xem dữ liệu mới.',error:true})}
      return true;
    }catch(error){setNotice({text:error instanceof Error?error.message:'Thao tác chưa hoàn tất.',error:true});return false}
    finally{setBusy('')}
  };
  async function logout(){
    if(hasUnsaved){setNotice({text:'Hãy lưu thay đổi hiện tại trước khi đăng xuất.',error:true});return}
    setBusy('logout');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error();location.assign('/')}catch{setNotice({text:'Chưa thể đăng xuất. Vui lòng thử lại.',error:true});setBusy('')}
  }
  return <div className="app-shell lecturer-workspace rail-workspace admin-workspace">
    <WorkspaceHeader sideNavigation mobileSideMenu homeHref={adminHref('users')} language={language}
      controls={<><button type="button" className="help-button" aria-label={tr('Hướng dẫn sử dụng')} onClick={()=>setHelp(true)}><UiIcon name="help"/></button><LanguageToggle language={language} onChange={setLanguage} disabled={!!busy||hasUnsaved} title={hasUnsaved?tr('Lưu cấu hình trước khi đổi ngôn ngữ.'):undefined}/></>}
      profile={data.user&&<WorkspaceProfile user={data.user} language={language} busy={!!busy} onLogout={()=>void logout()}/>}>
      <AdminNavigation section={section} query={query} language={language} busy={!!busy} user={data.user||undefined}/>
    </WorkspaceHeader>
    <div className="main-shell"><main id="workspace-main" tabIndex={-1} className="lx">
      <header className="lx-page-head"><div><h1>{tr(page.label)}</h1><p>{tr(page.description)}</p></div></header>
      {section==='users'?<AdminUserList data={data} language={language} busy={busy} initialRole={query.role} onMutate={mutate}/>
        :section==='courses'?<AdminCourses data={data} language={language} busy={busy} selectedCourseId={query.course||''} onMutate={mutate}/>
        :<AdminSettings data={data} language={language} busy={busy} initialTab={query.settingsTab} onMutate={mutate} onReload={reload}/>}
      {help&&<section ref={helpRef} tabIndex={-1} className="lx-help"><header><h2>{tr('Hướng dẫn sử dụng')}</h2><button type="button" className="lx-icon-btn" aria-label={tr('Đóng')} onClick={()=>setHelp(false)}><UiIcon name="close" size={16}/></button></header><RoleHelp audience="admin" language={language}/></section>}
    </main></div>
    {notice&&<div className={`lx-toast${notice.error?' is-error':''}`} role={notice.error?'alert':'status'}><UiIcon name={notice.error?'help':'check'} size={16}/><span>{tr(notice.text)}</span><button type="button" aria-label={tr('Đóng thông báo')} onClick={()=>setNotice(null)}><UiIcon name="close" size={14}/></button></div>}
  </div>;
}
