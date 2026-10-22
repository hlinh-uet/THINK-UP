'use client';

import {statuses, type Action, type Course, type Reflection, type Week} from '../lib/domain';
import {translate, type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {formatMessageTimestamp} from '../lib/message-date';
import {studentNextStep} from '../lib/student-next-step';
import UiIcon from './UiIcon';

type Props = {
  reflections:Reflection[]; actions:Action[]; courses:Course[];
  weeks:Week[]; currentWeek:Week; language:Language;
  onOpen:(reflection?:Reflection, week?:number, support?:'thinking'|'coach'|'feedback')=>void;
  onLibrary:()=>void; onJourney:()=>void; onProgress:()=>void;
  onAction:(action:Action)=>void;
  onCreateAction?:(reflection:Reflection)=>void;
};

export default function StudentOverview({reflections,actions,courses,weeks,currentWeek,language,onOpen,onLibrary,onJourney,onProgress,onAction,onCreateAction}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const dt=(text:string,id?:string|null)=>demoText(text,id,language);
  // Numeric date parts and fixed month names keep SSR and browser ICU versions identical.
  const date=(value:string)=>value?formatMessageTimestamp(value.length===10?value+'T12:00:00+07:00':value,language).date:tr('Chưa đặt hạn');
  const recent=[...reflections].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const next=studentNextStep(reflections,actions,weeks,currentWeek.week);
  const source='reflection' in next?next.reflection:undefined;
  const focusWeek=weeks.find(w=>w.week===next.week)||currentWeek;
  const complete=new Set(reflections.filter(r=>r.status==='final').map(r=>r.week));
  const pending=actions.filter(a=>a.status!=='done').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
  const nextLabel={revise:'Xem góp ý',write:'Viết tiếp bài nháp',act:'Cập nhật cam kết',commit:'Chọn hành động',waiting:'Xem bài đã nộp',start:'Bắt đầu viết',complete:'Xem tiến bộ'}[next.kind];
  const nextTitle={revise:'Chỉnh sửa bài được trả lại',write:'Tiếp tục bài đang viết',act:'Thực hiện cam kết của bạn',commit:'Chọn một hành động tiếp theo',waiting:'Bài đang chờ giảng viên',start:'Viết bài tuần {0}',complete:'Bạn đã hoàn thành hành trình'}[next.kind];
  const nextDescription=source?dt(source.title,source.id)||tr('Reflection chưa đặt tên'):next.kind==='act'?dt(next.action.text,next.action.id):next.kind==='start'?tr(focusWeek.title):'';
  function continueTask(){
    if(next.kind==='act'){onAction(next.action);return}
    if(next.kind==='complete'){onProgress();return}
    if(next.kind==='commit'){if(onCreateAction)onCreateAction(next.reflection);else onJourney();return}
    onOpen(source,focusWeek.week,next.kind==='revise'||next.kind==='waiting'?'feedback':'thinking');
  }

  return <div className="student-overview">
    <section className="overview-feature" aria-labelledby="overview-week-title">
      <div className="overview-feature-copy">
        <div className="overview-kicker"><span>{tr('Bước tiếp theo')}</span>{next.kind!=='complete'&&<span className="overview-week-label">· {tr('Tuần {0}',[focusWeek.week])}</span>}</div>
        <h1 id="overview-week-title">{tr(nextTitle,[focusWeek.week])}</h1>
        {nextDescription&&<p>{nextDescription}</p>}
        {next.kind==='act'&&next.action.due&&<small className="overview-task-due">{tr('Hạn thực hiện')} · {date(next.action.due)}</small>}
      </div>
      <div className="overview-feature-actions"><button className="button primary" onClick={continueTask}>{tr(nextLabel)}<UiIcon name="next" size={16}/></button></div>
    </section>

    <section className="overview-journey" aria-label={tr('Tiến độ hành trình')}>
      <div className="overview-journey-heading"><span>{tr('Hành trình của bạn')}</span><b>{complete.size}<small> / {weeks.length} {tr('tuần')}</small></b></div>
      <div className="overview-week-track" role="progressbar" aria-label={tr('Tuần hoàn thành')} aria-valuemin={0} aria-valuemax={weeks.length} aria-valuenow={complete.size}>{weeks.map(w=><span key={w.week} className={complete.has(w.week)?'done':w.week===currentWeek.week?'current':''} title={`${tr('Tuần {0}',[w.week])} · ${tr(complete.has(w.week)?'Hoàn thành':w.week===currentWeek.week?'Tuần đang học':'Chưa hoàn thành')}`}><i>{complete.has(w.week)?<UiIcon name="check" size={12}/>:String(w.week).padStart(2,'0')}</i><span/></span>)}</div>
      <button className="text-button" onClick={onProgress}>{tr('Xem tiến bộ')}<UiIcon name="next" size={15}/></button>
    </section>

    <div className="overview-content">
      <section className="overview-reflections"><div className="section-head"><div><h3>{tr('Bài viết gần đây')}</h3></div><button className="text-button overview-new" onClick={()=>onOpen()}><UiIcon name="add" size={16}/>{tr('Bài viết mới')}</button></div>
        {recent.length?<div className="overview-reading-list">{recent.slice(0,4).map(r=><button className="overview-reading-row" key={r.id} onClick={()=>onOpen(r)}><span className="reading-copy"><b>{dt(r.title,r.id)||tr('Reflection chưa đặt tên')}</b><small>{tr('Tuần {0}',[r.week])}<i>·</i>{date(r.updatedAt)}{courses.length>1&&courses.find(c=>c.id===r.courseId)&&<span className="reading-course">{courses.find(c=>c.id===r.courseId)!.code}</span>}</small></span><span className={`badge ${r.status}`}>{tr(statuses[r.status])}</span><UiIcon name="arrow" size={16}/></button>)}</div>:<div className="overview-empty"><UiIcon name="document" size={26}/><h4>{tr('Câu chuyện đầu tiên của bạn')}</h4><p>{tr('Chưa có bài viết.')}</p><button className="text-button" onClick={()=>onOpen()}>{tr('Viết trang đầu tiên')}<UiIcon name="next" size={15}/></button></div>}
        {recent.length>0&&<button className="text-button overview-all-reflections" onClick={onLibrary}>{tr('Xem tất cả')}<UiIcon name="next" size={14}/></button>}
      </section>

      <aside className="overview-aside"><section className="overview-actions"><div className="section-head"><div><h3>{tr('Cam kết')}<small className="overview-action-count">{pending.length}</small></h3></div><UiIcon name="actions" size={19}/></div>
        {pending.length?<div className="overview-action-list">{pending.slice(0,3).map(a=><button key={a.id} className="action-mini" onClick={()=>onAction(a)}><span className="task-circle" aria-hidden="true"/><span className="overview-action-copy"><b>{dt(a.text,a.id)}</b><small className={a.due&&a.due<today?'is-overdue':''}>{a.due&&a.due<today?tr('Đã qua hạn'):tr('Hạn thực hiện')}{' · '}{date(a.due)}</small></span><UiIcon name="next" size={14}/></button>)}</div>:<p className="overview-action-empty">{tr('Chưa có cam kết.')}</p>}
        <button className="text-button overview-all-actions" onClick={onJourney}>{tr('Xem hành trình')}<UiIcon name="next" size={15}/></button>
      </section></aside>
    </div>
  </div>;
}
