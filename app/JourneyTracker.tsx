'use client';

import {useId,useRef,useState} from 'react';
import {CalendarDays,Clock3} from 'lucide-react';
import {statuses,type Action,type Course,type Reflection,type Week} from '../lib/domain';
import {dateLocale,translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import {studentNextStep} from '../lib/student-next-step';
import WorkspaceSections from './WorkspaceSections';
import TablePagination,{usePageRows} from './TablePagination';
import {actionCompletedLate,actionDueTime,actionOverdue,actionTimingLabel,formatActionDeadline} from '../lib/commitment-deadline';
import {useCommitmentClock} from './useCommitmentClock';

type Props={weeks:Week[];reflections:Reflection[];actions:Action[];currentWeek:number;language:Language;initialWeek?:number;courses?:Course[];combined?:boolean;
 onOpen:(reflection:Reflection|undefined,week:number,support?:'thinking'|'coach'|'feedback')=>void;onAction:(action:Partial<Action>)=>void};

/** A quiet notebook illustration, kept decorative beside the week's real content. */
function WeekNotebook(){
 return <svg className="jr-week-art" viewBox="0 0 180 132" fill="none" aria-hidden="true" focusable="false">
  <ellipse cx="91" cy="112" rx="68" ry="9" fill="#eadba9" opacity=".55"/>
  <circle cx="95" cy="66" r="48" fill="#f5e9c5"/>
  <g transform="rotate(-7 85 73)" stroke="#b49751" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
   <path d="M31 42C50 34 65 36 84 44V105C66 96 49 94 31 99V42Z" fill="#fffdf5"/>
   <path d="M84 44C103 35 122 35 138 41V98C118 93 103 96 84 105V44Z" fill="#fff8e2"/>
   <path d="M84 47V101M41 54C53 51 64 53 73 57M41 65C53 62 64 64 73 68M41 76C52 74 63 76 72 80M96 55C107 51 119 51 128 54M96 67C107 63 119 63 128 66M96 79C104 76 113 75 121 76" stroke="#d6c38d"/>
   <path d="M113 40V61L119 57L125 61V39" fill="#e4ca7c"/>
  </g>
  <g stroke="#8d925d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
   <path d="M92 45C92 34 94 27 99 20"/>
   <path d="M95 30C83 29 81 23 82 18C91 18 96 22 95 30Z" fill="#d9dcb7"/>
   <path d="M98 24C99 15 105 12 112 13C110 21 105 25 98 24Z" fill="#e3e3c8"/>
  </g>
  <path d="M20 31V39M16 35H24M150 22V32M145 27H155" stroke="#c0a150" strokeWidth="1.5" strokeLinecap="round"/>
  <circle cx="156" cy="83" r="3" fill="#dec87e"/><circle cx="39" cy="20" r="2" fill="#dec87e"/>
 </svg>;
}

export default function JourneyTracker({weeks,reflections,actions,currentWeek,language,onOpen,onAction,initialWeek,courses=[],combined=false}:Props){
 const [view,setView]=useState('journey'),[selectedWeek,setSelectedWeek]=useState(initialWeek||currentWeek),[search,setSearch]=useState(''),[status,setStatus]=useState('active'),[openDetails,setOpenDetails]=useState('');
 const now=useCommitmentClock();
 const prefix=useId(),weekButtons=useRef<(HTMLButtonElement|null)[]>([]);
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const dt=(text:string,id?:string)=>demoText(text,id,language);
 const date=(value:string)=>value?new Date(value.length===10?value+'T12:00:00+07:00':value).toLocaleDateString(dateLocale(language),{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}):tr('Chưa đặt hạn');
 const title=(row:Reflection)=>dt(row.title,row.id)||tr('Chưa đặt tiêu đề');
 const doneWeeks=new Set(reflections.filter(r=>r.status==='final').map(r=>r.week));
 const overdue=(a:Action)=>actionOverdue(a,now);
 const sourceFor=(a:Action)=>reflections.find(r=>r.id===a.reflectionId);
 // When every course is shown together, each reflection and commitment carries its course code.
 const courseTag=(row?:Reflection)=>combined&&row?<em className="journey-course-tag">{courses.find(c=>c.id===row.courseId)?.code||tr('Cá nhân')}</em>:null;
 const weekData=weeks.map(week=>{
  const rows=reflections.filter(r=>r.week===week.week).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const ids=new Set(rows.map(r=>r.id)),commitments=actions.filter(a=>!!a.reflectionId&&ids.has(a.reflectionId));
  return {week,rows,commitments,done:doneWeeks.has(week.week)};
 });
 const selected=weekData.find(w=>w.week.week===selectedWeek)||weekData.find(w=>w.week.week===currentWeek)||weekData[0];
 const visible=actions.filter(a=>{
  const source=sourceFor(a);
  return (status==='all'||status==='active'&&a.status!=='done'||status==='overdue'&&overdue(a)||status==='late'&&actionCompletedLate(a)||a.status===status)&&`${dt(a.text,a.id)} ${source?title(source):''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
 }).sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||(a.due||'9999').localeCompare(b.due||'9999')||a.createdAt.localeCompare(b.createdAt));
 const pagination=usePageRows(visible,JSON.stringify([status,search]),6);
 function showActions(next:string){setStatus(next);setSearch('');setView('actions')}
 // Each task has one frame: context and status, full text, then due date and actions.
 // Supporting evidence expands beneath the footer without introducing another card.
 function actionCard(a:Action,presentation:'card'|'week'='card'){
  const source=sourceFor(a),follow=reflections.find(r=>r.id===a.followUpReflectionId),late=overdue(a);
  const files=source?.attachments.filter(f=>a.attachmentIds?.includes(f.id))||[];
  const details=!!(source||a.successCriteria||a.evidence||a.review||a.evidenceFiles?.length||follow),open=openDetails===a.id;
  const state=a.status==='done'?'done':late?'overdue':a.status==='needs_adjustment'?'adjust':'open';
  const daysLate=late?Math.floor((now-actionDueTime(a))/864e5):0;
  const detailId=`${prefix}-${presentation}-action-${a.id}`;
  const detailContent=details?<div className="commit-row-details" id={detailId} hidden={!open}>
    {source&&<button type="button" className="text-button" onClick={()=>onOpen(source,source.week)}>{tr('Từ bài viết: {0}',[title(source)])}<UiIcon name="arrow" size={13}/></button>}
    {a.successCriteria&&<p><b>{tr('Tiêu chí hoàn thành')}</b>{dt(a.successCriteria,a.id)}</p>}
    {a.review&&<p><b>{tr('BẠN ĐÃ THỰC HIỆN NHƯ THẾ NÀO?')}</b>{dt(a.review,a.id)}</p>}
    {a.evidence&&<p><b>{tr('Minh chứng thực hiện')}</b>{dt(a.evidence,a.id)}</p>}
    {files.map(f=><a className="file-chip" key={f.id} href={`/api/files/${f.id}`}>{f.name}<UiIcon name="arrow" size={13}/></a>)}
    {a.evidenceFiles?.map(f=><a className="file-chip" key={f.id} href={`/api/action-evidence/${f.id}`}>{f.name}<UiIcon name="arrow" size={13}/></a>)}
    {follow&&<button type="button" className="text-button" onClick={()=>onOpen(follow,follow.week)}>{tr('Reflection tiếp nối')}: {title(follow)}<UiIcon name="arrow" size={13}/></button>}
   </div>:null;
  return <article className={`commit-row${presentation==='week'?' is-week-task':''}${open?' is-expanded':''} is-${state}`} key={a.id} data-action-id={a.id}>
   <header className="commit-card-header">
    <div className="commit-card-context"><span className="commit-card-mark" aria-hidden="true">{state==='overdue'?<Clock3 size={19} strokeWidth={1.7}/>:<UiIcon name={state==='done'?'check':state==='adjust'?'editor':'actions'} size={19}/>}</span><span className="commit-card-context-copy"><span>{tr('Cam kết')}</span><strong>{courseTag(source)||(source?tr('Tuần {0}',[source.week]):tr('Cá nhân'))}</strong></span></div>
    <span className={`commit-row-status is-${state}${actionCompletedLate(a)?' is-completed-late':''}`}><i aria-hidden="true"/>{late&&daysLate>0?tr('trễ {0} ngày',[daysLate]):tr(actionTimingLabel(a,now))}</span>
   </header>
   <div className="commit-row-main" id={presentation==='week'?`${detailId}-text`:undefined}>
    <h4><button type="button" className="commit-row-title" onClick={()=>onAction(a)}><span className={presentation==='week'?'commit-preview':undefined}>{dt(a.text,a.id)}</span></button></h4>
   </div>
   <footer className="commit-card-footer">
    <div className="commit-card-deadline"><CalendarDays size={17} strokeWidth={1.7} aria-hidden="true"/><span><small>{tr(a.deadlineSource==='lecturer'?'Hạn do giảng viên quy định':'Hạn thực hiện')}</small><time dateTime={a.dueAt||a.due||undefined}>{formatActionDeadline(a,language)||tr('Chưa đặt hạn')}{a.dueAt&&' · UTC+7'}</time>{a.completedAt&&<small>{tr('Hoàn thành lúc')}: {formatActionDeadline({due:'',dueAt:a.completedAt},language)}</small>}</span></div>
    <div className="commit-card-controls">
     {details&&<button type="button" className="commit-row-more" aria-expanded={open} aria-controls={presentation==='week'?`${detailId}-text ${detailId}`:detailId} onClick={()=>setOpenDetails(open?'':a.id)}>{tr(presentation==='week'?(open?'Thu gọn':'Xem đầy đủ'):'Chi tiết')}</button>}
     <button className={`button commit-row-action${a.status==='done'?' is-quiet':''}`} onClick={()=>onAction(a)}>{tr(a.status==='done'?'Xem lại':'Cập nhật kết quả')}<UiIcon name="next" size={14}/></button>
    </div>
   </footer>
   {detailContent}
  </article>;
 }
 // Week tab: the weeks as a contents list on the left, the chosen week as three stacked cards on the right.
 const journey=<div className="jr-weeks">
  <nav className="jr-week-nav" aria-label={tr('Chọn tuần trong hành trình')}>
   <div className="jr-progress-overview"><div className="jr-progress" role="meter" aria-label={tr('Tuần hoàn thành')} aria-valuemin={0} aria-valuemax={9} aria-valuenow={doneWeeks.size} style={{background:`conic-gradient(#cfaa47 ${doneWeeks.size/9*360}deg, #e5dfd2 0deg)`}}><span>{doneWeeks.size}<small>/9</small></span></div>
    <div><strong>{tr('Hành trình 9 tuần')}</strong><p className="jr-progress-label">{tr('{0} / 9 tuần hoàn thành',[doneWeeks.size])}</p></div>
   </div>
   <div className="jr-week-list">{weekData.map(({week,rows,done},index)=>{
    const state=tr(done?'Hoàn thành':week.week===currentWeek?'Tuần đang học':rows.length?'Đã có bài viết':'Chưa bắt đầu');
    return <button type="button" key={week.week} ref={node=>{weekButtons.current[index]=node}} className={`jr-week${selected?.week.week===week.week?' is-selected':''}${done?' is-done':''}${week.week===currentWeek?' is-current':''}`} aria-pressed={selected?.week.week===week.week} aria-controls={`${prefix}-week-${week.week}`} title={state} onClick={()=>setSelectedWeek(week.week)} onKeyDown={event=>{
     const next=['ArrowDown','ArrowRight'].includes(event.key)?(index+1)%weeks.length:['ArrowUp','ArrowLeft'].includes(event.key)?(index+weeks.length-1)%weeks.length:event.key==='Home'?0:event.key==='End'?weeks.length-1:null;
     if(next===null)return;event.preventDefault();setSelectedWeek(weeks[next].week);weekButtons.current[next]?.focus({preventScroll:true});weekButtons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});
    }}><i aria-hidden="true">{done?<UiIcon name="check" size={12}/>:week.week}</i><span className="jr-week-copy"><b>{tr('Tuần {0}',[week.week])}</b><small>{tr(week.title)}</small></span><span className="sr-only">{state}</span></button>;
   })}</div>
  </nav>
  <div className="jr-week-content">{weekData.map(({week,rows,commitments})=>{
   const next=studentNextStep(rows,commitments,[week],week.week);
   const nextLabel={revise:'Xem góp ý',write:'Viết tiếp bài nháp',act:'Cập nhật cam kết',commit:'Chọn hành động',waiting:'Xem bài đã nộp',start:'Bắt đầu viết',complete:'Xem đánh giá'}[next.kind];
   const advance=()=>{if(next.kind==='act'){onAction(next.action);return}if(next.kind==='commit'){onAction({reflectionId:next.reflection.id,text:'',due:'',status:'todo',review:''});return}onOpen('reflection' in next?next.reflection:next.kind==='complete'?rows.find(r=>r.status==='final'):undefined,week.week,['revise','waiting','complete'].includes(next.kind)?'feedback':undefined)};
   const nextContext='reflection' in next?title(next.reflection):tr(next.kind==='act'?'Cam kết đang thực hiện':next.kind==='complete'?'Hoàn thành':'Câu hỏi khởi đầu');
   const steps=[['Trải nghiệm',rows.length>0],['Viết',rows.length>0],['AI Coach',rows.some(r=>r.analyses.some(a=>a.kind==='coach'))],['Chỉnh sửa',rows.some(r=>r.versions.some(v=>v.stage.startsWith('Revision')))],['Feedback',rows.some(r=>r.analyses.some(a=>a.kind==='feedback'))],['Hành động',commitments.length>0],['Nhìn lại',commitments.some(a=>!!a.review.trim())]] as const;
   return <section className="jr-week-detail" key={week.week} id={`${prefix}-week-${week.week}`} data-week={week.week} hidden={selected?.week.week!==week.week} aria-label={tr('Tuần {0}',[week.week])}>
    <div className="jr-card jr-week-head">
     <div className="jr-week-introduction">
      <span className="jr-week-stamp" aria-hidden="true"><small>{tr('Tuần')}</small><b>{String(week.week).padStart(2,'0')}</b></span>
      <div className="jr-week-topic"><span className={`jr-eyebrow${week.week===currentWeek?' is-current':''}`}>{tr(week.week===currentWeek?'Tuần đang học':'Tuần {0}',[week.week])}</span>
       <h2>{tr(week.title)}</h2><p className="jr-prompt">{tr(week.prompt)}</p>
       {week.requirements&&<details className="jr-requirements"><summary>{tr('Yêu cầu của tuần')}</summary><p>{tr(week.requirements)}</p></details>}
      </div>
      <WeekNotebook/>
     </div>
    <dl className="jr-week-snapshot" aria-label={tr('Tổng quan tuần')}>
     <div className="is-writing"><dt><UiIcon name="document" size={15}/>{tr('Bài viết')}</dt><dd>{rows.length}</dd></div>
     <div className="is-review"><dt><UiIcon name="eye" size={15}/>{tr('Chờ đánh giá')}</dt><dd>{rows.filter(r=>r.status==='submitted').length}</dd></div>
     <div className="is-action"><dt><UiIcon name="check" size={15}/>{tr('Cam kết hoàn thành')}</dt><dd>{commitments.filter(a=>a.status==='done').length}<small> / {commitments.length}</small></dd></div>
    </dl>
     <div className="jr-week-foot">
      <div className="jr-next-label"><span>{tr('Bước tiếp theo')}</span><span className="jr-next-context">{nextContext}</span>{week.due&&<small>{tr('Hạn nộp: ')}{date(week.due)}</small>}</div>
      <div className="jr-next"><button className="button jr-next-button" onClick={advance}>{tr(nextLabel)}<UiIcon name="next" size={15}/></button></div>
     </div>
     <details className="jr-process"><summary><span>{tr('Quá trình phản tư của tuần')}</span><span className="jr-process-count"><span className="jr-process-track" aria-hidden="true"><span style={{width:`${steps.filter(([,achieved])=>achieved).length/steps.length*100}%`}}/></span>{steps.filter(([,achieved])=>achieved).length}/{steps.length}<UiIcon name="chevron" size={14}/></span></summary>
      <ol className="jr-steps" aria-label={tr('Quá trình phản tư của tuần')}>{steps.map(([label,achieved])=><li key={label} className={achieved?'is-done':''}><span className="jr-step-mark" aria-hidden="true">{achieved?<UiIcon name="check" size={11}/>:null}</span>{tr(label)}</li>)}</ol>
     </details>
    </div>

    <div className="jr-week-work">
    <div className="jr-card jr-week-reflections">
     <div className="jr-card-heading"><h3><UiIcon name="document" size={17}/>{tr('Bài viết')}{rows.length>0&&<span>{rows.length}</span>}</h3><button type="button" className="jr-link jr-writing-create" aria-label={tr(rows.length?'Viết thêm bài':'Bắt đầu viết')} onClick={()=>onOpen(undefined,week.week)}><UiIcon name="add" size={14}/>{tr('Viết')}</button></div>
     {rows.length?<ul className="jr-reflections">{rows.map(r=><li key={r.id}><button type="button" className={`is-${r.status}`} onClick={()=>onOpen(r,week.week)}><i aria-hidden="true"><UiIcon name="document" size={16}/></i><span className="jr-reflection-copy"><b>{title(r)}</b><span className="jr-reflection-meta">{courseTag(r)}<span className="jr-reflection-status">{tr(statuses[r.status])}</span></span></span><UiIcon name="next" size={15}/></button></li>)}</ul>
      :<p className="jr-empty">{tr('Viết reflection trước, rồi chọn một thay đổi nhỏ để thực hiện.')}</p>}
    </div>
    <div className="jr-card jr-week-commitments">
     <div className="jr-card-heading"><h3><UiIcon name="actions" size={17}/>{tr('Cam kết')}{commitments.length>0&&<span>{commitments.length}</span>}</h3>{rows.length>0&&<button type="button" className="jr-link" onClick={()=>onAction({reflectionId:rows[0].id,text:'',due:'',status:'todo',review:''})}><UiIcon name="add" size={14}/>{tr('Thêm cam kết')}</button>}</div>
     {commitments.some(a=>a.status!=='done')&&<div className="journey-commitments">{commitments.filter(a=>a.status!=='done').sort((a,b)=>Number(overdue(b))-Number(overdue(a))||(a.due||'9999').localeCompare(b.due||'9999')).map(a=>actionCard(a,'week'))}</div>}
     {commitments.some(a=>a.status==='done')&&<details className="jr-completed-actions"><summary><UiIcon name="check" size={14}/>{tr('Cam kết hoàn thành')}<span>{commitments.filter(a=>a.status==='done').length}</span><UiIcon name="chevron" size={14}/></summary><div className="journey-commitments">{commitments.filter(a=>a.status==='done').map(a=>actionCard(a,'week'))}</div></details>}
     {!commitments.length&&<p className="jr-empty">{tr(rows.length?'Sau khi viết, xác nhận một hành động bạn muốn thực hiện.':'Viết reflection trước, rồi chọn một thay đổi nhỏ để thực hiện.')}</p>}
    </div>
    </div>
   </section>;
  })}</div>
 </div>;
 // Commitments tab: status chips and search, then the matching commitments grouped by week on a timeline.
 const counts:Record<string,number>={active:actions.filter(a=>a.status!=='done').length,overdue:actions.filter(overdue).length,done:actions.filter(a=>a.status==='done').length,late:actions.filter(a=>actionCompletedLate(a)).length,all:actions.length};
 const groups=[...new Set(pagination.rows.map(a=>sourceFor(a)?.week??0))].sort((a,b)=>(a||99)-(b||99)).map(week=>({week,rows:pagination.rows.filter(a=>(sourceFor(a)?.week??0)===week)}));
 const allActions=<section className="jr-all" aria-label={tr('Cam kết hành động')}>
  <div className="jr-filters">
   <div className="jr-chips" role="group" aria-label={tr('Lọc cam kết')}>{[['active','Cần làm'],['overdue','Quá hạn'],['done','Hoàn thành'],['late','Hoàn thành muộn'],['all','Tất cả']].map(([key,label])=><button type="button" key={key} className={`jr-chip is-${key}`} aria-pressed={status===key} onClick={()=>setStatus(key)}>{tr(label)}<i>{counts[key]}</i></button>)}</div>
   <label className="jr-search"><UiIcon name="search" size={15}/><input aria-label={tr('Tìm cam kết')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr('Tìm cam kết…')}/></label>
  </div>
  {visible.length>0&&<ol className="jr-timeline">{groups.map(({week,rows})=>{const info=weeks.find(w=>w.week===week);
   return <li key={`${status}:${search}:${pagination.page}:${week}`} className={`jr-tl-item${doneWeeks.has(week)?' is-done':''}${week===currentWeek?' is-current':''}`}>
    <i aria-hidden="true">{week||'·'}</i>
    <details className="jr-action-week" open>
     <summary className="jr-tl-head"><span className="jr-tl-label">{week?<><b>{tr('Tuần {0}',[week])}</b>{info&&<span>{tr(info.title)}</span>}</>:<b>{tr('Cam kết chưa gắn với reflection')}</b>}</span><span className="jr-tl-toggle"><span className="jr-tl-count">{rows.length}</span><UiIcon name="chevron" size={16}/></span></summary>
     <div className={`journey-commitments jr-card${rows.length>1?' is-grouped':''}`}>{rows.map(a=>actionCard(a))}</div>
    </details>
   </li>})}</ol>}
  {!visible.length&&<div className="jr-card jr-none"><h3>{tr(actions.length?'Không có cam kết phù hợp':'Chưa có cam kết hành động')}</h3><p>{tr(actions.length?'Thử đổi trạng thái hoặc từ khóa tìm kiếm.':'Mở một bài reflection trong hành trình để thêm cam kết của bạn.')}</p>{actions.length>0&&status!=='all'&&<button className="button" onClick={()=>showActions('all')}>{tr('Xem tất cả cam kết')}</button>}</div>}
  <TablePagination {...pagination} total={visible.length} language={language}/>
 </section>;
 return <div className="journey-tracker journey-workspace" id="journey-tracker"><WorkspacePageHeading visible title={tr('Hành trình 9 tuần')}/>{combined&&courses.length>1&&<p className="journey-combined-note"><UiIcon name="journey" size={15}/><span><b>{tr('Đang xem gộp tất cả học phần')}</b> · {tr('Mỗi tuần gồm bài viết của mọi học phần; chọn một học phần để xem hành trình riêng.')}</span></p>}
  <WorkspaceSections label={tr('Hành trình & hành động')} value={view} onChange={setView} items={[{id:'journey',label:tr('Theo tuần'),icon:<CalendarDays size={17} strokeWidth={1.8}/>,content:journey},{id:'actions',label:tr('Tất cả cam kết'),icon:<UiIcon name="actions" size={17}/>,content:allActions}]}/>
 </div>;
}
