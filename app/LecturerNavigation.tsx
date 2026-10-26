import {lecturerHref,lecturerPages,type LecturerQuery,type LecturerSection} from '../lib/lecturer-pages';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';
import MessageUnreadBadge from './MessageUnreadBadge';

export default function LecturerNavigation({section,query={},language,busy=false,pending=0,unread}:{section?:LecturerSection;query?:LecturerQuery;language:Language;busy?:boolean;pending?:number;unread?:number}) {
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 return <nav className="lecturer-navigation" aria-label={tr('Điều hướng chính')}>
  {[...new Set(lecturerPages.map(page=>page.group))].map(group=><div className="lx-nav-group" key={group} role="group" aria-label={tr(group)}><p className="lx-nav-label">{tr(group)}</p>
  {lecturerPages.filter(page=>page.group===group).map(page=><a key={page.key} href={lecturerHref(page.key,query)} className={section===page.key?'active':''} aria-current={section===page.key?'page':undefined} aria-disabled={busy||undefined} title={tr(page.label)} onClick={event=>{if(busy)event.preventDefault()}}>
   <UiIcon name={page.icon} className="nav-icon"/><span>{tr(page.navLabel)}</span>
   {page.key==='submissions'&&pending>0&&<small className="nav-count" aria-label={tr('{0} bài chờ đánh giá',[pending])}>{pending>99?'99+':pending}</small>}
   {page.key==='messages'&&<MessageUnreadBadge language={language} count={unread}/>}
  </a>)}</div>)}
 </nav>;
}
