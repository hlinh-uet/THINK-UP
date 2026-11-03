import {levels,statuses,type Reflection} from '../lib/domain';
import {finalReview} from '../lib/progress';
import {translate,type Language} from '../lib/i18n';
import {reflectionWritingView} from '../lib/reflection-translation';
import {reflectionText} from '../lib/student-editor';

/** A reflection as a small coloured tile: week, date, title and its status.
 *  Unfinished work is white (draft), yellow (awaiting review) or red (revision requested);
 *  graded work shares one sage surface; a labelled four-step meter distinguishes reflection levels. */
export default function ReflectionNote({reflection:r,language,onOpen}:{reflection:Reflection;language:Language;onOpen:(r:Reflection)=>void}) {
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const view=reflectionWritingView(r,language),excerpt=reflectionText(view.content).replace(/\s+/g,' ').trim();
 const level=finalReview(r)?.level,graded=!!level&&level>=1&&level<=4;
 const date=r.updatedAt?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'2-digit',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(r.updatedAt)):'';
 // The opening lines stay available on hover so the tile can stay short.
 return <button type="button" className={`reflection-note is-${r.status}${graded?` is-level-${level}`:''}`} title={excerpt.slice(0,240)||undefined} onClick={()=>onOpen(r)}>
  <span className="note-head"><span className="note-week">{tr('Tuần {0}',[r.week])}</span>{level===4&&<span className="note-star">★<span> {tr('Xuất sắc')}</span></span>}{date&&<span className="note-date">{date}</span>}</span>
  <b className={`note-title${view.title?'':' is-untitled'}`}>{view.title||tr('Chưa đặt tiêu đề')}</b>
  <span className="note-foot"><span className="note-status">{graded?<><span className="note-level-code">{tr('Mức {0}',[level])}</span><span className="note-level-name">{tr(levels[level])}</span></>:tr(statuses[r.status])}</span>
   {graded&&<span className="note-dots" role="img" aria-label={tr('Mức {0} trên 4',[level])}>{[1,2,3,4].map(n=><i key={n} className={n<=level?'is-on':''}/>)}</span>}</span>
 </button>;
}
