'use client';

import {useState,useSyncExternalStore,type ReactNode} from 'react';
import {statuses, type Action, type Course, type Reflection, type Week} from '../lib/domain';
import {translate, type Language} from '../lib/i18n';
import {demoContent,demoText} from '../lib/demo-i18n';
import {formatMessageTimestamp} from '../lib/message-date';
import {studentNextStep} from '../lib/student-next-step';
import {reflectionText} from '../lib/student-editor';
import UiIcon from './UiIcon';
import CountUp from './CountUp';


const narrowQuery='(max-width: 760px)';
const watchNarrow=(change:()=>void)=>{const media=matchMedia(narrowQuery);media.addEventListener('change',change);return ()=>media.removeEventListener('change',change)};

type Page={key:string;label:string;body:ReactNode};

/** An open notebook: two pages side by side (one on phones), turned with a 3D page flip. */
function Notebook({pages,language}:{pages:Page[];language:Language}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const narrow=useSyncExternalStore(watchNarrow,()=>matchMedia(narrowQuery).matches,()=>false);
  const per=narrow?1:2;
  const [at,setAt]=useState(0);
  const [turning,setTurning]=useState<'next'|'prev'|null>(null);
  const [turned,setTurned]=useState(false);
  const start=at-at%per, last=Math.ceil(pages.length/per)*per-per;
  function turn(dir:'next'|'prev'){
    if(turning||(dir==='next'?start>=last:start<=0))return;
    const target=dir==='next'?start+per:start-per;
    setTurned(true);
    if(per===1||matchMedia('(prefers-reduced-motion: reduce)').matches){setAt(target);return}
    setTurning(dir);
  }
  function settle(){
    if(!turning)return;
    setAt(turning==='next'?start+per:start-per);setTurning(null);
  }
  const sheet=(index:number,side:'left'|'right')=>{const page=pages[index];return <div className={`book-page is-${side}`}>{page&&<><span className="book-page-label">{page.label}</span><div className="book-page-body">{page.body}</div><span className="book-folio">{index+1}</span></>}</div>};
  const spreads=Math.ceil(pages.length/per);
  return <section className={`space-book${turned?' has-turned':''}`} aria-roledescription={tr('Sổ tay')} aria-label={tr('Góc học tập')}>
    <div className={`book-spread${per===1?' is-single':''}`}>
      {per===1?<div key={start} className="book-single">{sheet(start,'right')}</div>:<>
        {sheet(turning==='prev'?start-2:start,'left')}
        {sheet(turning==='next'?start+3:start+1,'right')}
        {turning==='next'&&<div className="book-leaf is-next" aria-hidden="true" onAnimationEnd={e=>{if(e.target===e.currentTarget)settle()}}><div className="book-leaf-face is-front">{sheet(start+1,'right')}</div><div className="book-leaf-face is-back">{sheet(start+2,'left')}</div></div>}
        {turning==='prev'&&<div className="book-leaf is-prev" aria-hidden="true" onAnimationEnd={e=>{if(e.target===e.currentTarget)settle()}}><div className="book-leaf-face is-front">{sheet(start,'left')}</div><div className="book-leaf-face is-back">{sheet(start-1,'right')}</div></div>}
      </>}
      {start<last&&<button type="button" className="book-corner" aria-label={tr('Trang sau')} onClick={()=>turn('next')}/>}
      <span className="book-dots" aria-hidden="true">{Array.from({length:spreads},(_,i)=><i key={i} className={i*per===start?'is-on':''}/>)}</span>
    </div>
    <button type="button" className="book-arrow is-prev" aria-label={tr('Trang trước')} disabled={start<=0||!!turning} onClick={()=>turn('prev')}><UiIcon name="next" size={18}/></button>
    <button type="button" className="book-arrow is-next" aria-label={tr('Trang sau')} disabled={start>=last||!!turning} onClick={()=>turn('next')}><UiIcon name="next" size={18}/></button>
  </section>;
}

type Props = {
  reflections:Reflection[]; actions:Action[]; courses:Course[];
  weeks:Week[]; currentWeek:Week; language:Language;
  onOpen:(reflection?:Reflection, week?:number, support?:'thinking'|'coach'|'feedback')=>void;
  onLibrary:()=>void; onJourney:()=>void; onProgress:()=>void; onMessages?:()=>void;
  onAction:(action:Action)=>void;
  onCreateAction?:(reflection:Reflection)=>void;
  userName?:string;
};

export default function StudentOverview({reflections,actions,courses,weeks,currentWeek,language,onOpen,onLibrary,onJourney,onProgress,onMessages,onAction,onCreateAction,userName}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const dt=(text:string,id?:string|null)=>demoText(text,id,language);
  const displayName=userName?.trim();
  // Numeric date parts and fixed month names keep SSR and browser ICU versions identical.
  const date=(value:string)=>value?formatMessageTimestamp(value.length===10?value+'T12:00:00+07:00':value,language).date:tr('Chưa đặt hạn');
  const next=studentNextStep(reflections,actions,weeks,currentWeek.week);
  const source='reflection' in next?next.reflection:undefined;
  const focusWeek=weeks.find(w=>w.week===next.week)||currentWeek;
  const complete=new Set(reflections.filter(r=>r.status==='final').map(r=>r.week));
  const pending=actions.filter(a=>a.status!=='done').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
  const nextLabel={revise:'Xem góp ý',write:'Viết tiếp bài nháp',act:'Cập nhật cam kết',commit:'Chọn hành động',waiting:'Xem bài đã nộp',start:'Bắt đầu viết',complete:'Xem tiến bộ'}[next.kind];
  const nextTitle={revise:'Chỉnh sửa bài được trả lại',write:'Tiếp tục bài đang viết',act:'Thực hiện cam kết của bạn',commit:'Chọn một hành động tiếp theo',waiting:'Bài đang chờ giảng viên',start:'Viết bài tuần {0}',complete:'Bạn đã hoàn thành hành trình'}[next.kind];
  const nextDescription=source?dt(source.title,source.id)||tr('Reflection chưa đặt tên'):next.kind==='act'?dt(next.action.text,next.action.id):next.kind==='start'?tr(focusWeek.title):'';
  const focusTitle=nextDescription||tr(nextTitle,[focusWeek.week]);
  const excerpt=source?reflectionText(demoContent(source.content,source.id,language)).replace(/\s+/g,' ').trim():'';
  const overdue=pending.filter(a=>a.due&&a.due<today).length;
  const counts=(['draft','returned','submitted'] as const).map(status=>[status,reflections.filter(r=>r.status===status).length] as const).filter(([,n])=>n>0);
  const finals=reflections.filter(r=>r.status==='final').length;
  const byStatus=(['final','submitted','returned','draft'] as const).map(status=>({key:status,size:reflections.filter(r=>r.status===status).length}));
  const tiles:{key:string;icon:'editor'|'actions'|'progress'|'messages';name:string;value:number|null;note:string;warn?:boolean;bar?:{key:string;size:number}[];open:()=>void}[]=[
   {key:'writing',icon:'editor',name:tr('Bài viết'),value:reflections.length,note:counts.length?counts.map(([status,n])=>`${n} ${tr(statuses[status]).toLocaleLowerCase()}`).join(' · '):tr('Viết trang đầu tiên'),bar:byStatus,open:onLibrary},
   {key:'actions',icon:'actions',name:tr('Cam kết'),value:pending.length,note:pending.length?overdue?tr('{0} đã quá hạn',[overdue]):tr('Không có việc quá hạn'):tr('Chưa có cam kết.'),warn:overdue>0,bar:[{key:'overdue',size:overdue},{key:'open',size:pending.length-overdue}],open:onJourney},
   {key:'progress',icon:'progress',name:tr('Tiến bộ'),value:finals,note:tr('Bài đã hoàn thành'),bar:[{key:'final',size:finals},{key:'rest',size:reflections.length-finals}],open:onProgress},
   ...(onMessages?[{key:'messages',icon:'messages' as const,name:tr('Tin nhắn'),value:null,note:tr('Trao đổi với giảng viên và bạn học'),open:onMessages}]:[]),
  ];
  // The nine weeks as stops along a winding road, walked up to the current week.
  const stops=weeks.map((w,i)=>({week:w.week,x:14+i*(212/Math.max(1,weeks.length-1)),y:40+Math.sin(i*1.15)*20,state:complete.has(w.week)?'done':w.week===currentWeek.week?'current':''}));
  const road=stops.map((p,i)=>i?`C${(stops[i-1].x+p.x)/2} ${stops[i-1].y} ${(stops[i-1].x+p.x)/2} ${p.y} ${p.x} ${p.y}`:`M${p.x} ${p.y}`).join(' ');
  const walked=Math.max(0,weeks.findIndex(w=>w.week===currentWeek.week))/Math.max(1,weeks.length-1)*100;
  const sourceCourse=courses.find(course=>course.id===source?.courseId);
  const latest=[...reflections].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).find(r=>r.id!==source?.id);
  const latestExcerpt=latest?reflectionText(demoContent(latest.content,latest.id,language)).replace(/\s+/g,' ').trim():'';
  const feedback=reflections.flatMap(r=>(r.reviews||[]).filter(review=>review.comment?.trim()).map(review=>({review,reflection:r}))).sort((a,b)=>b.review.createdAt.localeCompare(a.review.createdAt))[0];
  const upcoming=weeks.find(w=>w.week===currentWeek.week+1);
  function continueTask(){
    if(next.kind==='act'){onAction(next.action);return}
    if(next.kind==='complete'){onProgress();return}
    if(next.kind==='commit'){if(onCreateAction)onCreateAction(next.reflection);else onJourney();return}
    onOpen(source,focusWeek.week,next.kind==='revise'||next.kind==='waiting'?'feedback':'thinking');
  }

  return <div className="student-overview">
    <header className="space-welcome">
      <div>
        <h1>{displayName?<><span className="space-salutation">{tr('Chào,')} </span><span className="space-name">{displayName}</span></>:tr('Góc học tập')}</h1>
      </div>
      <button className="button space-new-page" onClick={()=>onOpen()}><UiIcon name="editor" size={17}/>{tr('Bài viết mới')}</button>
    </header>

    <Notebook language={language} pages={[
      {key:'next',label:tr('Tiếp tục từ đây'),body:<section className="overview-feature" data-status={source?.status??next.kind} aria-labelledby="overview-week-title">
        <div className="space-paper-meta">
          <span>{source?tr(statuses[source.status]):tr('Bước tiếp theo')}</span>
          {next.kind!=='complete'&&<span className="overview-week-label">{tr('Tuần {0}',[focusWeek.week])}{sourceCourse&&<> · {sourceCourse.code}</>}</span>}
        </div>
        <h2 id="overview-week-title">{focusTitle}</h2>
        {excerpt&&<p className="space-paper-excerpt">{excerpt}</p>}
        {nextDescription&&!source&&<p className="space-paper-context">{tr(nextTitle,[focusWeek.week])}</p>}
        {next.kind==='act'&&next.action.due&&<p className="overview-task-due">{tr('Hạn thực hiện')} {date(next.action.due)}</p>}
        <div className="space-paper-actions"><button className="button primary" onClick={continueTask}>{tr(nextLabel)}<UiIcon name="next" size={16}/></button>{source&&<span className="space-paper-updated">{tr('Cập nhật')} {date(source.updatedAt)}</span>}</div>
      </section>},
      {key:'journey',label:tr('Hành trình của bạn'),body:<div className="space-journey">
        <p className="space-journey-week"><span>{tr('Tuần')}</span><b>{String(currentWeek.week).padStart(2,'0')}</b><span>/ {String(weeks.length).padStart(2,'0')}</span></p>
        <p className="space-journey-theme">{tr(currentWeek.title)}</p>
        {currentWeek.prompt&&<p className="space-journey-prompt">{tr(currentWeek.prompt)}</p>}
        <div className="space-journey-track" role="progressbar" aria-label={tr('Tuần hoàn thành')} aria-valuemin={0} aria-valuemax={weeks.length} aria-valuenow={complete.size}>
          <svg viewBox="0 0 240 76" aria-hidden="true">
            <path className="space-road" d={road}/>
            <path className="space-road-walked" d={road} pathLength={100} strokeDasharray={`${walked} 100`}/>
            {stops.map(p=><g key={p.week} className={`space-stop ${p.state}`} transform={`translate(${p.x} ${p.y})`}>
              {p.state==='current'&&<circle className="space-stop-halo" r="13"/>}
              <circle r={p.state==='current'?10:5.5}/>
              {p.state==='current'&&<text dy="3.6">{p.week}</text>}
            </g>)}
          </svg>
        </div>
        <button type="button" className="text-button book-link" onClick={onJourney}>{tr('Xem hành trình')}<UiIcon name="next" size={15}/></button>
      </div>},
      {key:'feedback',label:tr('Lời nhắn từ giảng viên'),body:feedback?<div className="book-quote">
        <blockquote>{dt(feedback.review.comment,feedback.review.id)}</blockquote>
        <p className="book-quote-source">{dt(feedback.reflection.title,feedback.reflection.id)||tr('Reflection chưa đặt tên')} · {date(feedback.review.createdAt)}</p>
        <button type="button" className="text-button book-link" onClick={()=>onOpen(feedback.reflection,feedback.reflection.week,'feedback')}>{tr('Xem góp ý')}<UiIcon name="next" size={15}/></button>
      </div>:<p className="book-empty">{tr('Chưa có góp ý từ giảng viên.')}</p>},
      {key:'actions',label:tr('Cam kết sắp tới'),body:pending.length?<div>
        <ul className="book-todos">{pending.slice(0,3).map(a=><li key={a.id}><button type="button" onClick={()=>onAction(a)}><span className="book-check" aria-hidden="true"/><span><span className="book-todo-text">{dt(a.text,a.id)}</span><small className={a.due&&a.due<today?'is-overdue':''}>{date(a.due)}</small></span></button></li>)}</ul>
        {pending.length>3&&<button type="button" className="text-button book-link" onClick={onJourney}>{tr('Xem tất cả cam kết')}<UiIcon name="next" size={15}/></button>}
      </div>:<p className="book-empty">{tr('Chưa có cam kết.')}</p>},
      {key:'latest',label:tr('Bài viết gần nhất'),body:latest?<div className="book-latest">
        <span className={`book-status is-${latest.status}`}><i aria-hidden="true"/>{tr(statuses[latest.status])} · {tr('Tuần {0}',[latest.week])}</span>
        <h3>{dt(latest.title,latest.id)||tr('Reflection chưa đặt tên')}</h3>
        {latestExcerpt&&<p>{latestExcerpt}</p>}
        <button type="button" className="text-button book-link" onClick={()=>onOpen(latest)}>{tr('Mở bài viết')}<UiIcon name="next" size={15}/></button>
      </div>:<p className="book-empty">{tr('Chưa có bài viết khác.')}</p>},
      {key:'upcoming',label:tr('Tuần tới'),body:upcoming?<div className="book-latest">
        <span className="book-status">{tr('Tuần {0}',[upcoming.week])}{upcoming.due&&<> · {tr('Hạn nộp: ')}{date(upcoming.due)}</>}</span>
        <h3>{tr(upcoming.title)}</h3>
        {upcoming.prompt&&<p className="space-journey-prompt">{tr(upcoming.prompt)}</p>}
        <button type="button" className="text-button book-link" onClick={onJourney}>{tr('Xem hành trình')}<UiIcon name="next" size={15}/></button>
      </div>:<p className="book-empty">{tr('Đây là tuần cuối của hành trình.')}</p>},
    ]}/>

    <nav className="book-tabs" aria-label={tr('Mở nhanh')}>{tiles.map(t=><button key={t.key} type="button" className={`book-tab is-${t.key}`} onClick={t.open}>
      <span className="book-tab-head"><span className="book-tab-icon"><UiIcon name={t.icon} size={16}/></span><span className="space-tile-name">{t.name}</span>{t.value!==null?<CountUp value={t.value}/>:<UiIcon name="next" size={16}/>}</span>
      {t.bar&&t.bar.some(part=>part.size>0)&&<span className="space-tile-bar" aria-hidden="true">{t.bar.filter(part=>part.size>0).map(part=><i key={part.key} className={`is-${part.key}`} style={{flexGrow:part.size}}/>)}</span>}
      <small className={t.warn?'is-overdue':''}>{t.note}</small>
    </button>)}</nav>
  </div>;
}
