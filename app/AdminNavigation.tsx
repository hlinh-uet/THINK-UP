import { adminHref, adminPages, type AdminQuery, type AdminDestination } from '../lib/admin-pages';
import { translate, type Language } from '../lib/i18n';
import type {User} from '../lib/domain';
import {hasPermission} from '../lib/permissions';
import UiIcon from './UiIcon';
import MessageUnreadBadge from './MessageUnreadBadge';

/** Management destinations and the administrator's own conversations. */
export default function AdminNavigation({section,query,language,busy=false,unread,user}:{section?:AdminDestination;query:AdminQuery;language:Language;busy?:boolean;unread?:number;user?:Pick<User,'role'|'permissions'>}) {
  const tr=(text:string)=>translate(text,language);
  const messagesAllowed=hasPermission(user||{role:'admin'},'messages.use');
  return <nav className="lecturer-navigation admin-navigation" aria-label={tr('Điều hướng quản trị')}>
    {[...new Set(adminPages.map(page=>page.group))].map(group=><div className="lx-nav-group" key={group} role="group" aria-label={tr(group)}><p className="lx-nav-label">{tr(group)}</p>
    {adminPages.filter(page=>page.group===group).map(page=><a key={page.key} href={adminHref(page.key,query)} className={section===page.key?'active':''} aria-current={section===page.key?'page':undefined} aria-disabled={busy||(page.key==='messages'&&!messagesAllowed)||undefined} onClick={event=>{if(busy||(page.key==='messages'&&!messagesAllowed))event.preventDefault()}} title={tr(page.key==='messages'&&!messagesAllowed?'Vai trò của bạn chưa được cấp quyền thực hiện thao tác này.':page.label)}>
      <UiIcon name={page.icon} className="nav-icon"/><span>{tr(page.navLabel)}</span>
      {page.key==='messages'&&messagesAllowed&&<MessageUnreadBadge language={language} count={unread}/>}
    </a>)}</div>)}
  </nav>;
}
