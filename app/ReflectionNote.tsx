import {statuses,type Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {demoContent,demoText} from '../lib/demo-i18n';
import {reflectionText} from '../lib/student-editor';

/** A reflection shown as a small sheet of paper: week, title, the opening lines and its status. */
export default function ReflectionNote({reflection:r,language,onOpen}:{reflection:Reflection;language:Language;onOpen:(r:Reflection)=>void}) {
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const excerpt=reflectionText(demoContent(r.content,r.id,language)).replace(/\s+/g,' ').trim();
 return <button type="button" className={`reflection-note is-${r.status}`} onClick={()=>onOpen(r)}>
  <span className="note-week">{tr('Tuần {0}',[r.week])}</span>
  <b className="note-title">{demoText(r.title,r.id,language)||tr('Reflection chưa đặt tên')}</b>
  <span className="note-excerpt">{excerpt||tr('Chưa có nội dung.')}</span>
  <span className="note-status"><i aria-hidden="true"/>{tr(statuses[r.status])}</span>
 </button>;
}
