import { adminHref, adminPages, type AdminQuery, type AdminSection } from '../lib/admin-pages';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import MessageUnreadBadge from './MessageUnreadBadge';

export default function AdminNavigation({section,query,language,busy=false,unread}:{section?:AdminSection;query:AdminQuery;language:Language;busy?:boolean;unread?:number}) {
  const tr=(text:string)=>translate(text,language);
  return <nav className="admin-navigation" aria-label={tr('Điều hướng quản trị')}>
    {adminPages.map((page,i)=><a key={page.key} href={adminHref(page.key,query)} className={`${section===page.key?'active':''} ${i===3?'admin-monitoring-start':''}`} aria-current={section===page.key?'page':undefined} aria-disabled={busy||undefined} onClick={event=>{if(busy)event.preventDefault()}} title={tr(page.label)}><UiIcon name={page.icon} className="nav-icon"/><span>{tr(page.navLabel)}</span>{page.key==='messages'&&<MessageUnreadBadge language={language} count={unread}/>}</a>)}
  </nav>;
}
