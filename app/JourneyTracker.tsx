'use client';

import {useId,useRef,useState} from 'react';
import {statuses,type Action,type Course,type Reflection,type Week} from '../lib/domain';
import {dateLocale,translate,type Language} from '../lib/i18n';
import {demoContent,demoText} from '../lib/demo-i18n';
import {reflectionText} from '../lib/student-editor';
import UiIcon from './UiIcon';
import WorkspacePageHeading from './WorkspacePageHeading';
import {studentNextStep} from '../lib/student-next-step';
import WorkspaceSections from './WorkspaceSections';
import TablePagination,{usePageRows} from './TablePagination';

type Props={weeks:Week[];reflections:Reflection[];actions:Action[];currentWeek:number;language:Language;initialWeek?:number;courses?:Course[];combined?:boolean;
 onOpen:(reflection:Reflection|undefined,week:number,support?:'thinking'|'coach'|'feedback')=>void;onAction:(action:Partial<Action>)=>void};

export default function JourneyTracker({weeks,reflections,actions,currentWeek,language,onOpen,onAction,initialWeek,courses=[],combined=false}:Props){
 const [view,setView]=useState('journey'),[selectedWeek,setSelectedWeek]=useState(initialWeek||currentWeek),[search,setSearch]=useState(''),[status,setStatus]=useState('active'),[actionWeek,setActionWeek]=useState('');
 const prefix=useId(),weekButtons=useRef<(HTMLButtonElement|null)[]>([]);
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const dt=(text:string,id?:string)=>demoText(text,id,language);
 const date=(value:string)=>value?new Date(value.length===10?value+'T12:00:00+07:00':value).toLocaleDateString(dateLocale(language),{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric'}):tr('Chưa đặt hạn');
 const title=(row:Reflection)=>dt(row.title,row.id)||tr('Chưa đặt tiêu đề');
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'});
 const doneWeeks=new Set(reflections.filter(r=>r.status==='final').map(r=>r.week));
 const overdue=(a:Action)=>!!a.due&&a.due<today&&a.status!=='done';
 const labels:Record<string,string>={todo:'Chưa bắt đầu',in_progress:'Đang thực hiện',done:'Hoàn thành',needs_adjustment:'Cần điều chỉnh'};
 const sourceFor=(a:Action)=>reflections.find(r=>r.id===a.reflectionId);
 // When every course is shown together, each reflection and commitment carries its course code.
 const courseTag=(row?:Reflection)=>combined&&row?<em className="journey-course-tag">{courses.find(c=>c.id===row.courseId)?.code||tr('Cá nhân')}</em>:null;
 const unlinked=actions.filter(a=>!sourceFor(a));
 const weekData=weeks.map(week=>{
  const rows=reflections.filter(r=>r.week===week.week).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const ids=new Set(rows.map(r=>r.id)),commitments=actions.filter(a=>!!a.reflectionId&&ids.has(a.reflectionId));
  return {week,rows,commitments,done:doneWeeks.has(week.week)};
 });
 const selected=weekData.find(w=>w.week.week===selectedWeek)||weekData.find(w=>w.week.week===currentWeek)||weekData[0];
 const visible=actions.filter(a=>{
  const source=sourceFor(a);
  return (status==='all'||status==='active'&&a.status!=='done'||status==='overdue'&&overdue(a)||a.status===status)&&(!actionWeek||(actionWeek==='unlinked'?!source:source?.week===Number(actionWeek)))&&`${dt(a.text,a.id)} ${source?title(source):''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
 }).sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')||(a.due||'9999').localeCompare(b.due||'9999')||a.createdAt.localeCompare(b.createdAt));
 const pagination=usePageRows(visible,JSON.stringify([status,search,actionWeek]),6);
 function showActions(next:string){setStatus(next);setSearch('');setActionWeek('');setView('actions')}
 function actionCard(a:Action){
  const source=sourceFor(a),follow=reflections.find(r=>r.id===a.followUpReflectionId);
  const details=!!(a.successCriteria||a.evidence||a.review||a.evidenceFiles?.length||follow||source?.attachments.some(f=>a.attachmentIds?.includes(f.id)));
  return <article className={`journey-commitment ${a.status==='done'?'is-done':''}`} key={a.id} data-action-id={a.id}>
   <div className="journey-commitment-heading"><span className={`journey-task-icon ${a.status}`}><UiIcon name={a.status==='done'?'check':a.status==='needs_adjustment'?'editor':'actions'} size={18}/></span><h4>{dt(a.text,a.id)}</h4><span className={`badge ${a.status==='done'?'final':a.status==='needs_adjustment'?'returned':''}`}>{tr(labels[a.status]||a.status)}</span></div>
   <div className="journey-commitment-meta">{courseTag(source)}{source&&<span>{tr('Tuần {0}',[source.week])}</span>}<span className={overdue(a)?'journey-overdue':''}><UiIcon name="journey" size={12}/>{tr('Hạn: ')}{date(a.due)}{overdue(a)&&tr(' · Đã qua hạn')}</span></div>
   {source&&<button className="text-button journey-commitment-source" onClick={()=>onOpen(source,source.week)}>{tr('Từ bài viết: {0}',[title(source)])}<UiIcon name="arrow" size={13}/></button>}
   {details&&<details className="journey-commitment-details"><summary>{tr('Chi tiết và kết quả thực hiện')}</summary>
    {a.successCriteria&&<p><b>{tr('Tiêu chí hoàn thành')}</b>{dt(a.successCriteria,a.id)}</p>}
    {a.review&&<p><b>{tr('BẠN ĐÃ THỰC HIỆN NHƯ THẾ NÀO?')}</b>{dt(a.review,a.id)}</p>}
    {a.evidence&&<p><b>{tr('Minh chứng thực hiện')}</b>{dt(a.evidence,a.id)}</p>}
    {source?.attachments.filter(f=>a.attachmentIds?.includes(f.id)).map(f=><a className="file-chip" key={f.id} href={`/api/files/${f.id}`}>{f.name}<UiIcon name="arrow" size={13}/></a>)}
    {a.evidenceFiles?.map(f=><a className="file-chip" key={f.id} href={`/api/action-evidence/${f.id}`}>{f.name}<UiIcon name="arrow" size={13}/></a>)}
    {follow&&<button className="text-button" onClick={()=>onOpen(follow,follow.week)}>{tr('Reflection tiếp nối')}: {title(follow)}<UiIcon name="arrow" size={13}/></button>}
   </details>}
   <div className="journey-commitment-footer"><button className={`button ${a.status==='done'?'':'primary'}`} onClick={()=>onAction(a)}>{tr(a.status==='done'?'Xem lại cam kết':'Cập nhật kết quả')}<UiIcon name="arrow" size={14}/></button></div>
  </article>;
 }
 const journey=<div className="journey-week-layout">
  <nav className="panel journey-week-nav" aria-label={tr('Chọn tuần trong hành trình')}><div className="journey-nav-heading"><p>{tr('{0} / 9 tuần hoàn thành',[doneWeeks.size])}</p><div className="journey-completion-track" role="meter" aria-label={tr('Tuần hoàn thành')} aria-valuemin={0} aria-valuemax={9} aria-valuenow={doneWeeks.size}><span style={{width:`${doneWeeks.size/9*100}%`}}/></div></div>
   <div className="journey-week-links">{weekData.map(({week,rows,done},index)=><button type="button" key={week.week} ref={node=>{weekButtons.current[index]=node}} className={`${selected?.week.week===week.week?'selected':''} ${done?'complete':''}`} aria-pressed={selected?.week.week===week.week} aria-controls={`${prefix}-week-${week.week}`} onClick={()=>setSelectedWeek(week.week)} onKeyDown={event=>{
    const next=['ArrowDown','ArrowRight'].includes(event.key)?(index+1)%weeks.length:['ArrowUp','ArrowLeft'].includes(event.key)?(index+weeks.length-1)%weeks.length:event.key==='Home'?0:event.key==='End'?weeks.length-1:null;
    if(next===null)return;event.preventDefault();setSelectedWeek(weeks[next].week);weekButtons.current[next]?.focus({preventScroll:true});weekButtons.current[next]?.scrollIntoView({block:'nearest',inline:'nearest'});
   }}><span className="journey-nav-number">{done?<UiIcon name="check" size={15}/>:week.week}</span><span className="journey-nav-copy"><b>{tr('Tuần {0}',[week.week])}</b><small>{tr(week.title)}</small></span><span className={`journey-nav-state ${week.week===currentWeek?'current':''}`} title={tr(done?'Hoàn thành':week.week===currentWeek?'Tuần đang học':rows.length?'Đã có bài viết':'Chưa bắt đầu')}><span className="sr-only">{tr(done?'Hoàn thành':week.week===currentWeek?'Tuần đang học':rows.length?'Đã có bài viết':'Chưa bắt đầu')}</span></span></button>)}</div>
  </nav>
  <div className="journey-week-content">{weekData.map(({week,rows,commitments,done})=>{
   const next=studentNextStep(rows,commitments,[week],week.week);
   const nextLabel={revise:'Xem góp ý',write:'Viết tiếp bài nháp',act:'Cập nhật cam kết',commit:'Chọn hành động',waiting:'Xem bài đã nộp',start:'Bắt đầu viết',complete:'Xem đánh giá'}[next.kind];

   const advance=()=>{if(next.kind==='act'){onAction(next.action);return}if(next.kind==='commit'){onAction({reflectionId:next.reflection.id,text:'',due:'',status:'todo',review:''});return}onOpen('reflection' in next?next.reflection:next.kind==='complete'?rows.find(r=>r.status==='final'):undefined,week.week,['revise','waiting','complete'].includes(next.kind)?'feedback':undefined)};
   const steps=[['Trải nghiệm',rows.length>0],['Viết',rows.length>0],['AI Coach',rows.some(r=>r.analyses.some(a=>a.kind==='coach'))],['Chỉnh sửa',rows.some(r=>r.versions.some(v=>v.stage.startsWith('Revision')))],['Feedback',rows.some(r=>r.analyses.some(a=>a.kind==='feedback'))],['Hành động',commitments.length>0],['Nhìn lại',commitments.some(a=>!!a.review.trim())]] as const;
   return <section className="journey-focused-week" key={week.week} id={`${prefix}-week-${week.week}`} data-week={week.week} hidden={selected?.week.week!==week.week} aria-label={tr('Tuần {0}',[week.week])}>
    <div className="panel journey-week-intro"><span className="journey-intro-number" aria-hidden="true">{String(week.week).padStart(2,'0')}</span><div className="journey-intro-top"><span className="journey-week-eyebrow">{tr('Tuần {0}',[week.week])}{week.week===currentWeek&&<i>{tr('Tuần đang học')}</i>}</span><span className={`badge ${done?'final':rows.some(r=>r.status==='returned')?'returned':''}`}>{tr(done?'Hoàn thành':rows.some(r=>r.status==='returned')?'Cần chỉnh sửa':rows.length?'Đã có bài viết':'Chưa bắt đầu')}</span></div><h2>{tr(week.title)}</h2><p>{tr(week.prompt)}</p>{week.requirements&&<details className="journey-week-requirements"><summary>{tr('Yêu cầu của tuần')}</summary><p>{tr(week.requirements)}</p></details>}<ol className="journey-steps" aria-label={tr('Quá trình phản tư của tuần')}>{steps.map(([label,achieved])=><li key={label} className={achieved?'achieved':''}><i aria-hidden="true">{achieved&&<UiIcon name="check" size={11}/>}</i><span>{tr(label)}</span></li>)}</ol><div className="journey-intro-footer"><span className="journey-next-context"><b>{tr('Bước tiếp theo')}</b>{week.due&&<small>{tr('Hạn nộp: ')}{date(week.due)}</small>}</span><button className="button primary" onClick={advance}>{tr(nextLabel)}<UiIcon name="next" size={15}/></button></div></div>
    <div className="panel journey-week-work"><div className="journey-section-heading"><h3>{tr('Bài viết trong tuần')}{rows.length>0&&<span className="journey-count">{rows.length}</span>}</h3><button type="button" className="text-button journey-new-reflection" onClick={()=>onOpen(undefined,week.week)}><UiIcon name="add" size={15}/>{tr(rows.length?'Viết thêm bài':'Bắt đầu viết')}</button></div>
     {rows.length?<ul className="journey-reflection-list">{rows.map(r=>{const excerpt=reflectionText(demoContent(r.content,r.id,language)).replace(/\s+/g,' ').trim();return <li key={r.id}><button type="button" className={`is-${r.status}`} onClick={()=>onOpen(r,week.week)}>
      <i aria-hidden="true"/><span className="journey-reflection-copy"><b>{courseTag(r)}{title(r)}</b><small>{excerpt||tr('Chưa có nội dung.')}</small></span><span className="journey-reflection-status">{tr(statuses[r.status])}</span><UiIcon name="next" size={15}/>
     </button></li>})}</ul>:<p className="journey-quiet-empty">{tr('Viết reflection trước, rồi chọn một thay đổi nhỏ để thực hiện.')}</p>}
    </div>
    <div className="panel journey-week-actions"><div className="journey-section-heading"><div><h3>{tr('Cam kết từ reflection tuần này')}<span className="journey-count">{commitments.length}</span></h3></div>{rows.length>0&&<button className="button" onClick={()=>onAction({reflectionId:rows[0].id,text:'',due:'',status:'todo',review:''})}><UiIcon name="add" size={14}/>{tr('Thêm cam kết')}</button>}</div>
     {commitments.length?<div className="journey-commitments">{[...commitments].sort((a,b)=>Number(a.status==='done')-Number(b.status==='done')).map(actionCard)}</div>:<div className="journey-no-actions"><span><UiIcon name="actions" size={22}/></span><p>{tr(rows.length?'Sau khi viết, xác nhận một hành động bạn muốn thực hiện.':'Viết reflection trước, rồi chọn một thay đổi nhỏ để thực hiện.')}</p></div>}
    </div>
   </section>;
  })}</div>
 </div>;
 const allActions=<section className="panel journey-all-actions"><div className="journey-section-heading"><div><h2>{tr('Cam kết hành động')}</h2></div><span className="journey-count">{visible.length} / {actions.length}</span></div>
  <div className="toolbar journey-filters"><input aria-label={tr('Tìm cam kết')} value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr('Tìm hành động hoặc bài viết…')}/><select aria-label={tr('Lọc cam kết')} value={status} onChange={e=>setStatus(e.target.value)}>{[['active','Cần thực hiện'],['all','Tất cả cam kết'],['overdue','Đã qua hạn'],...Object.entries(labels)].map(([key,label])=><option key={key} value={key}>{tr(label)}</option>)}</select><select aria-label={tr('Lọc theo tuần')} value={actionWeek} onChange={e=>setActionWeek(e.target.value)}><option value="">{tr('Tất cả tuần')}</option>{weeks.map(w=><option key={w.week} value={w.week}>{tr('Tuần {0}',[w.week])}</option>)}{unlinked.length>0&&<option value="unlinked">{tr('Chưa gắn với reflection')}</option>}</select></div>
  <div className="journey-commitments">{pagination.rows.map(actionCard)}</div>
  {!visible.length&&<div className="journey-no-actions"><span><UiIcon name="check" size={24}/></span><h3>{tr(actions.length?'Không có cam kết phù hợp':'Chưa có cam kết hành động')}</h3><p>{tr(actions.length?'Thử đổi trạng thái, tuần hoặc từ khóa tìm kiếm.':'Mở một bài reflection trong hành trình để thêm cam kết của bạn.')}</p>{actions.length>0&&<button className="button" onClick={()=>showActions('all')}>{tr('Xem tất cả cam kết')}</button>}</div>}
  <TablePagination {...pagination} total={visible.length} language={language}/>
  {unlinked.length>0&&<details className="journey-unlinked"><summary>{tr('Cam kết chưa gắn với reflection')}<span className="journey-count">{unlinked.length}</span></summary><button className="text-button" onClick={()=>{showActions('all');setActionWeek('unlinked')}}>{tr('Xem cam kết chưa gắn với reflection')}<UiIcon name="next" size={14}/></button></details>}
 </section>;
 return <div className="journey-tracker journey-workspace" id="journey-tracker"><WorkspacePageHeading visible title={tr('Hành trình 9 tuần')}/>{combined&&courses.length>1&&<p className="journey-combined-note"><UiIcon name="journey" size={15}/><span><b>{tr('Đang xem gộp tất cả học phần')}</b> · {tr('Mỗi tuần gồm bài viết của mọi học phần; chọn một học phần để xem hành trình riêng.')}</span></p>}
  <WorkspaceSections label={tr('Hành trình & hành động')} value={view} onChange={setView} items={[{id:'journey',label:tr('Theo tuần'),content:journey},{id:'actions',label:tr('Tất cả cam kết'),content:allActions}]}/>
 </div>;
}
