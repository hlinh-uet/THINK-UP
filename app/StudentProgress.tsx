'use client';

import {useState,type CSSProperties,type KeyboardEvent} from 'react';
import {learnerProgress,finalReview} from '../lib/progress';
import {classAnalytics,criterionTimeSeries,reportHeaders,reportRows} from '../lib/learning-analytics';
import {safeCsv} from '../lib/lecturer-pages';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {levels,statuses,type Action,type Course,type Criterion,type Reflection} from '../lib/domain';
import LearningAnalytics from './LearningAnalytics';
import TablePagination,{usePageRows} from './TablePagination';
import UiIcon from './UiIcon';
import {studentProgressVisuals} from '../lib/student-progress-visuals';
import WorkspacePageHeading from './WorkspacePageHeading';
import {actionOverdue} from '../lib/commitment-deadline';

type Props={reflections:Reflection[];actions:Action[];courses:Course[];rubric:Criterion[];language:Language;currentWeek?:number;onOpen:(r:Reflection)=>void;onWrite?:(week:number)=>void};

// Chart geometry: nine week columns on graph paper, Kember levels 1–4 from bottom to top.
const W=600,H=230,colX=(i:number)=>(i+.5)*W/9,levelY=(level:number)=>196-(level-1)*54;
/** A smooth line through points (Catmull-Rom as cubic Béziers). */
const smooth=(pts:[number,number][])=>pts.map((p,i)=>{if(!i)return `M${p[0]} ${p[1]}`;const a=pts[i-2]||pts[i-1],b=pts[i-1],c=p,d=pts[i+1]||p;return `C${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6} ${c[0]-(d[0]-b[0])/6} ${c[1]-(d[1]-b[1])/6} ${c[0]} ${c[1]}`}).join(' ');

// Student-facing names for the Kember levels and rubric criteria; the rubric keeps its formal wording elsewhere.
const levelNames=['','Làm theo thói quen','Hiểu bài','Biết suy ngẫm','Suy ngẫm sâu sắc'];
type ProgressTab='overview'|'reflections'|'insight'|'streak'|'comparison';
const progressTabs:{id:ProgressTab;label:string;icon:ProgressIcon}[]=[
 {id:'overview',label:'Tổng quan',icon:'progress'},
 {id:'reflections',label:'Phản tư & Bài viết',icon:'editor'},
 {id:'insight',label:'Insight',icon:'sparkle'},
 {id:'streak',label:'Streak',icon:'streak'},
 {id:'comparison',label:'So sánh theo thời gian',icon:'arrow'},
];
type ProgressIcon=Parameters<typeof UiIcon>[0]['name'];
const skillCopy:Record<string,{name:string;icon:ProgressIcon;good:string;tip:string}>={
 reflectionDepth:{name:'Đào sâu suy nghĩ',icon:'progress',good:'Bạn nhìn lại trải nghiệm và giải thích được vì sao nó xảy ra.',tip:'Hỏi thêm “vì sao?” ít nhất hai lần và thử nhìn sự việc từ góc nhìn của người khác.'},
 evidenceContext:{name:'Dẫn chứng cụ thể',icon:'search',good:'Bạn kể lại tình huống cụ thể với chi tiết thực tế.',tip:'Thêm một ví dụ cụ thể: ai, ở đâu, đã nói hoặc làm gì; đính kèm ảnh hay số liệu nếu có.'},
 insight:{name:'Rút ra bài học',icon:'sparkle',good:'Bạn rút ra được bài học rõ ràng từ trải nghiệm của mình.',tip:'Viết bài học thành một câu ngắn bạn có thể áp dụng lại ở tình huống khác.'},
 actionPlan:{name:'Lên kế hoạch hành động',icon:'actions',good:'Bạn đặt ra những bước hành động cụ thể cho tuần tới.',tip:'Viết rõ bạn sẽ làm gì, khi nào và làm sao biết mình đã làm được.'},
};
const ringColors={best:'#87a48b',work:'#c69978',other:['#8ea9bf','#aaa0bb']};

export default function StudentProgress({reflections,actions,courses,rubric,language,currentWeek,onOpen,onWrite}:Props){
 const [tab,setTab]=useState<ProgressTab>('overview');
 function openTab(destination:ProgressTab){setTab(destination);document.getElementById('progress-report')?.scrollIntoView({block:'start'});}
 function tabKey(event:KeyboardEvent<HTMLButtonElement>,index:number){
  const next=event.key==='ArrowRight'?(index+1)%progressTabs.length:event.key==='ArrowLeft'?(index+progressTabs.length-1)%progressTabs.length:event.key==='Home'?0:event.key==='End'?progressTabs.length-1:null;
  if(next===null)return;
  event.preventDefault();setTab(progressTabs[next].id);
  const button=event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next];
  button?.focus();button?.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const dt=(s:string,id?:string|null)=>demoText(s,id,language);
 const progress=learnerProgress(reflections),summary=classAnalytics(reflections,actions,rubric),series=criterionTimeSeries(reflections,rubric);
 const graded=reflections.filter(r=>finalReview(r)).sort((a,b)=>finalReview(b)!.createdAt.localeCompare(finalReview(a)!.createdAt));
 const classified=graded.filter(r=>{const level=finalReview(r)!.level;return level!==null&&level>=1&&level<=4;});
 const chartPoints=progress.points.map(p=>{const rows=classified.filter(r=>r.week===p.week);return {...p,count:rows.length,level:rows.length?rows.reduce((sum,r)=>sum+finalReview(r)!.level!,0)/rows.length:null};});
 const latestReview=graded[0]?finalReview(graded[0]):undefined;
 const latestPoint=chartPoints.findLast(p=>p.count>0),firstPoint=chartPoints.find(p=>p.count>0),[week,setWeek]=useState(latestPoint?.week||1);
 const selected=chartPoints.find(p=>p.week===week&&p.count>0)||latestPoint;
 const weekRows=classified.filter(r=>r.week===selected?.week);
 const visuals=studentProgressVisuals(reflections,actions,rubric);
 const strengths=summary.criteria.filter(c=>c.count>=3&&c.average!==null&&c.average>=7.6),weak=summary.criteria.filter(c=>c.average!==null&&c.average<5.1);
 const evidencePage=usePageRows(series,series.map(p=>p.reflection.id).join(','),8);
 const title=(r:Reflection)=>dt(r.title,r.id)||tr('Reflection chưa đặt tên');
 // A missing week breaks the line; no scores are inferred between assessments.
 const runs:[number,number][][]=[];
 chartPoints.forEach((p,i)=>{if(p.level===null)return;if(i===0||chartPoints[i-1].level===null)runs.push([]);runs.at(-1)!.push([colX(i),levelY(p.level)])});
 const delta=latestPoint&&firstPoint&&latestPoint.week!==firstPoint.week?latestPoint.level!-firstPoint.level!:null;
 const currentLevel=latestPoint?.level??null;
 // Radar: four criteria on axes at 12, 3, 6 and 9 o'clock, scored out of ten.
 const R=92,axis=(i:number,n:number,scale=1)=>{const angle=-Math.PI/2+i*2*Math.PI/n;return [130+Math.cos(angle)*R*scale,130+Math.sin(angle)*R*scale] as const};
 const radar=summary.criteria.map((c,i)=>axis(i,summary.criteria.length,(c.average??0)/10).join(',')).join(' ');
 function download(){const rows=reportRows(reflections,rubric),url=URL.createObjectURL(new Blob(['﻿'+safeCsv([reportHeaders.map(label=>tr(label)),...rows])],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='think-up-progress.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

 // Level: the Kember level of the most recent final assessment.
 const level=latestReview?.level&&latestReview.level>=1&&latestReview.level<=4?latestReview.level:0;
 const change=visuals.change;
 // Journey: a week is done once a reflection in it has a final assessment.
 const doneWeeks=new Set(graded.map(r=>r.week)),nowWeek=currentWeek??(Array.from({length:9},(_,i)=>i+1).find(w=>!doneWeeks.has(w))||9);
 const allDone=Array.from({length:9},(_,i)=>i+1).every(w=>doneWeeks.has(w));
 const nowRow=reflections.filter(r=>r.week===nowWeek&&!finalReview(r)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 // Statistics
 const weekly=change.weeks,scored=weekly.filter(w=>w.value!==null),best=scored.reduce<typeof scored[number]|undefined>((top,w)=>!top||w.value!>top.value!?w:top,undefined);
 const latestScored=scored.at(-1)?.week;
 const comments=reflections.reduce((n,r)=>n+r.reviews.filter(v=>v.comment.trim()).length,0),evidence=reflections.reduce((n,r)=>n+r.attachments.length,0);
 const done=actions.filter(a=>a.status==='done').length,overdue=actions.filter(a=>actionOverdue(a)).length,doing=actions.length-done-overdue;
 const C=2*Math.PI*48,arc=(n:number)=>actions.length?n/actions.length*C:0;
 const donut=[{n:done,color:'#87a48b'},{n:doing,color:'#dcc175'},{n:overdue,color:'#bd8179'}].filter(s=>s.n>0);
 // Skills, strongest first.
 const skills=visuals.criteria.map(c=>({...c,copy:skillCopy[c.key]})).sort((a,b)=>(b.average??-1)-(a.average??-1));
 const rated=skills.filter(s=>s.average!==null),top=rated.length>1&&rated[0].average!>rated.at(-1)!.average!?rated[0]:undefined,low=top?rated.at(-1):undefined;
 const coachTip=visuals.coach?.analysis.result.development[0];
 const skillName=(c:typeof skills[number])=>tr(c.copy?.name||c.name);
 const skillColors=Object.fromEntries(skills.map(s=>[s.key,s===top?ringColors.best:s===low?ringColors.work:ringColors.other[skills.filter(x=>x!==top&&x!==low).indexOf(s)%2]]));
 const metrics:{icon:ProgressIcon;surface:string;color:string;value:number|string;label:string}[]=[
  {icon:'editor',surface:'#f7f0dd',color:'#886726',value:reflections.length,label:'bài đã viết'},
  {icon:'check',surface:'#edf3ed',color:'#52715a',value:graded.length,label:'bài đã được chấm'},
  {icon:'progress',surface:'#edf1f5',color:'#55748d',value:best?best.value!.toFixed(1):'—',label:best?tr('điểm cao nhất (Tuần {0})',[best.week]):'điểm cao nhất'},
  {icon:'document',surface:'#f1edf4',color:'#7d6d91',value:progress.revisions,label:'lần sửa bài'},
  {icon:'attachment',surface:'#f6eee7',color:'#936a4e',value:evidence,label:'minh chứng đính kèm'},
  {icon:'messages',surface:'#f7f0dd',color:'#817141',value:comments,label:'nhận xét từ giảng viên'},
 ];

 return <div className="growth progress-journal pg">
  <WorkspacePageHeading visible title={tr('Tiến trình của tôi')} description={tr('Theo dõi và nhìn lại hành trình phát triển của bạn.')}>
   <button type="button" className="button progress-export" onClick={download}><UiIcon name="down" size={16}/>{tr('Xuất CSV')}</button>
  </WorkspacePageHeading>
  <div className="pg-tabs" id="progress-report" role="tablist" aria-label={tr('Các mục tiến bộ')}>
   {progressTabs.map((item,index)=><button key={item.id} type="button" role="tab" className={tab===item.id?'is-active':undefined} id={`pg-tab-${item.id}`} aria-controls={`pg-panel-${item.id}`} aria-selected={tab===item.id} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)} onKeyDown={event=>tabKey(event,index)}><UiIcon name={item.icon} size={19}/>{tr(item.label)}</button>)}
  </div>
  <section className="pg-tab-panel pg-overview" role="tabpanel" id="pg-panel-overview" aria-labelledby="pg-tab-overview" hidden={tab!=='overview'} tabIndex={0}>
  <section className="pg-card pg-hero" aria-labelledby="pg-level-title">
   <div className="pg-badge" role="meter" aria-label={tr('Cấp độ phản tư')} aria-valuemin={0} aria-valuemax={4} aria-valuenow={level}>
    <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="#ece7dc" strokeWidth="9"/>{level>0&&<circle cx="60" cy="60" r="52" fill="none" stroke="#dcc175" strokeWidth="9" strokeLinecap="round" strokeDasharray={2*Math.PI*52} strokeDashoffset={2*Math.PI*52*(1-level/4)}/>}</svg>
    <div className="pg-badge-copy"><span>{tr('CẤP')}</span><b>{level||'—'}</b><span>{tr('trên 4')}</span></div>
   </div>
   <div className="pg-hero-copy">
    <div className="pg-hero-topline"><span className="pg-level-eyebrow">{tr('Cấp độ phản tư')}</span><span className="pg-week-label">{tr('Tuần {0}',[nowWeek])} / 9</span></div>
    <h2 id="pg-level-title">{level?tr(levelNames[level]):tr('Chưa có đánh giá')}</h2>
    <div className="pg-chips">
     <span className="pg-chip is-streak"><UiIcon name="journey" size={18}/><span className="pg-chip-copy"><b>{visuals.longestStreak}</b><small>{tr('tuần liên tiếp')}</small></span></span>
     {change.delta!==null&&<span className={`pg-chip${change.delta<0?' is-down':change.delta>0?' is-up':''}`}><UiIcon name={change.delta<0?'down':'progress'} size={18}/><span className="pg-chip-copy"><b>{change.delta>0?'+':''}{change.delta.toFixed(1)}</b><small>{tr('điểm so với tuần đầu')}</small></span></span>}
     <span className="pg-chip is-commitment"><UiIcon name="actions" size={18}/><span className="pg-chip-copy"><b>{done}/{actions.length}</b><small>{tr('cam kết đã làm')}</small></span></span>
    </div>
    <ol className="pg-ladder">{[1,2,3,4].map(n=><li key={n} className={n===level?'is-now':n<level?'is-done':''} aria-current={n===level?'step':undefined} aria-label={tr('Cấp {0} · {1}',[n,tr(levelNames[n])])} title={tr(levelNames[n])}><b>{tr('Cấp {0}',[n])}</b><span>{tr(levelNames[n])}</span></li>)}</ol>
   </div>
  </section>

  <section className="pg-overview-metrics pg-framed" aria-labelledby="pg-stats-title">
   <div className="pg-overview-heading"><h2 id="pg-stats-title">{tr('Những con số nổi bật')}</h2><button type="button" className="pg-section-link" onClick={()=>openTab('reflections')}>{tr('Thống kê bài viết')}<UiIcon name="next" size={15}/></button></div>
   <ul className="pg-tiles">{metrics.slice(0,3).map(m=><li key={m.icon} className="pg-tile"><span className="pg-tile-icon" style={{background:m.surface,color:m.color}}><UiIcon name={m.icon} size={19}/></span><div><b style={{color:m.color}}>{m.value}</b><span>{tr(m.label)}</span></div></li>)}</ul>
  </section>
  <div className="pg-summary-layout pg-overview-layout">
  <section className="pg-card pg-journey pg-framed" aria-labelledby="pg-journey-title">
   <div className="pg-section-heading pg-journey-heading"><h2 id="pg-journey-title"><UiIcon name="journey" size={21}/>{tr('Hành trình 9 tuần')}</h2><span className="pg-journey-count"><b>{doneWeeks.size}/9</b> {tr('hoàn thành')}</span></div>
   <ol className="pg-path" style={{'--pg-done':(allDone?8:nowWeek-1)/8} as CSSProperties}>{Array.from({length:9},(_,i)=>i+1).map(w=>{const state=doneWeeks.has(w)?'is-done':w===nowWeek&&!allDone?'is-now':'';return <li key={w} className={`pg-node ${state}`} aria-current={state==='is-now'?'step':undefined}>
    <i aria-hidden="true">{doneWeeks.has(w)?'✓':w}</i>{tr('Tuần {0}',[w])}</li>})}</ol>
   {!allDone&&<div className="pg-now">
    <div className="pg-now-context"><UiIcon name={nowRow?.status==='returned'?'messages':nowRow?.status==='submitted'?'document':'editor'} size={18}/><div className="pg-now-copy"><b>{tr('Bài phản tư tuần {0}',[nowWeek])}</b><span>{tr(nowRow?.status==='returned'?'Cần chỉnh sửa':nowRow?.status==='submitted'?'Chờ đánh giá':nowRow?'Bản nháp':'Chưa bắt đầu')}</span></div></div>
    {nowRow?<button type="button" className="pg-button" onClick={()=>onOpen(nowRow)}>{tr(nowRow.status==='returned'?'Xem nhận xét':nowRow.status==='submitted'?'Xem bài':'Viết tiếp')}<UiIcon name="next" size={16}/></button>
     :onWrite&&<button type="button" className="pg-button" onClick={()=>onWrite(nowWeek)}>{tr('Bắt đầu viết')}<UiIcon name="next" size={16}/></button>}
   </div>}
   {latestReview?.comment&&<div className="pg-overview-feedback"><div className="pg-overview-heading"><h3><UiIcon name="messages" size={17}/>{tr('Nhận xét gần nhất')}</h3><button type="button" className="pg-section-link" onClick={()=>onOpen(graded[0])}>{tr('Đọc nhận xét')}<UiIcon name="next" size={15}/></button></div><blockquote>{dt(latestReview.comment,latestReview.id)}</blockquote></div>}
  </section>
   <section className="pg-overview-highlights pg-framed" aria-labelledby="pg-highlights-title">
    <div className="pg-overview-heading"><h2 id="pg-highlights-title"><UiIcon name="sparkle" size={19}/>{tr('Điểm đáng chú ý')}</h2><button type="button" className="pg-section-link" onClick={()=>openTab('insight')}>Insight<UiIcon name="next" size={15}/></button></div>
    {rated.length?<ul className="pg-highlight-list">
     {top&&<li className="is-strength"><UiIcon name="check" size={17}/><div><small>{tr('Điểm mạnh của bạn')}</small><b>{skillName(top)}</b></div><strong>{top.average!.toFixed(1)}<small>/10</small></strong></li>}
     {change.mostImproved&&<li className="is-improving"><UiIcon name="progress" size={17}/><div><small>{tr('Tiến bộ rõ nhất')}</small><b>{tr(skillCopy[change.mostImproved.key]?.name||change.mostImproved.name)}</b></div><strong>+{change.mostImproved.delta.toFixed(1)}<small>/10</small></strong></li>}
     {low&&<li className="is-practice"><UiIcon name="editor" size={17}/><div><small>{tr('Ưu tiên luyện thêm')}</small><b>{skillName(low)}</b></div><strong>{low.average!.toFixed(1)}<small>/10</small></strong></li>}
     {!top&&!change.mostImproved&&<li><UiIcon name="actions" size={17}/><div><small>{tr('Kỹ năng của bạn')}</small><b>{tr('Các tiêu chí đang ở mức tương đương.')}</b></div></li>}
    </ul>:<p className="pg-highlight-empty">{tr('Phản hồi của giảng viên sẽ giúp bạn nhận ra điều cần luyện tập tiếp theo.')}</p>}
    <div className="pg-overview-actions">
     <h3 className="pg-chart-heading"><UiIcon name="actions" size={18}/>{tr('Cam kết hành động')}</h3><p className="pg-mini">{actions.length?tr('{0} cam kết bạn đặt ra sau khi viết bài.',[actions.length]):tr('Bạn chưa đặt cam kết nào.')}</p>
     <div className="pg-donut-wrap">
      <div className="pg-donut-summary" role="img" aria-label={`${done} / ${actions.length} ${tr('cam kết đã làm')}`}><div className="pg-donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="#ece7dc" strokeWidth="13"/>
       {donut.map((s,i)=>{const start=donut.slice(0,i).reduce((n,p)=>n+arc(p.n),0),gap=donut.length>1?2:0;return <circle key={s.color} cx="60" cy="60" r="48" fill="none" stroke={s.color} strokeWidth="13" strokeDasharray={`${Math.max(0,arc(s.n)-gap)} ${C}`} strokeDashoffset={-start}/>})}</svg>
       <div className="pg-donut-copy"><b>{actions.length?Math.round(done/actions.length*100):0}%</b></div></div><span className="pg-donut-label">{tr('hoàn thành')}</span></div>
      <ul className="pg-legend">
       <li><i style={{background:'#87a48b'}}/>{tr('Đã làm xong')}<b>{done}</b></li>
       <li><i style={{background:'#dcc175'}}/>{tr('Đang làm')}<b>{doing}</b></li>
       <li><i style={{background:'#bd8179'}}/>{tr('Quá hạn')}<b>{overdue}</b></li>
      </ul>
     </div>
    </div>

   </section>
  </div>
  </section>
  <section className="pg-tab-panel pg-report" role="tabpanel" id="pg-panel-reflections" aria-labelledby="pg-tab-reflections" hidden={tab!=='reflections'} tabIndex={0}>
  <section className="pg-card pg-statistics pg-framed pg-writing-statistics" aria-labelledby="pg-writing-stats-title">
   <div className="pg-section-heading"><h2 id="pg-writing-stats-title"><UiIcon name="progress" size={21}/>{tr('Thống kê bài viết')}</h2></div><p className="pg-sub">{tr('Những gì bạn đã làm trong học phần này.')}</p>
   <ul className="pg-tiles">
    {metrics.map(m=><li key={m.icon} className="pg-tile">
     <span className="pg-tile-icon" style={{background:m.surface,color:m.color}}><UiIcon name={m.icon} size={16}/></span><div><b style={{color:m.color}}>{m.value}</b><span>{tr(m.label)}</span></div></li>)}
   </ul>
  </section>
  <div className="growth-ledgers">
   <section className="growth-ledger pg-framed" aria-labelledby="progress-courses-title">
    <h2 className="growth-label" id="progress-courses-title"><UiIcon name="journey" size={18}/>{tr('Hành trình theo học phần')}</h2>
    {courses.length?<ul className="growth-course-list">{courses.map(c=>{const completed=new Set(reflections.filter(r=>r.courseId===c.id&&finalReview(r)).map(r=>r.week));return <li className="growth-course" key={c.id}>
     <span className="growth-course-copy"><small>{c.code}</small><b title={dt(c.name,c.id)}>{dt(c.name,c.id)}</b></span>
     <span className="growth-course-weeks" role="meter" aria-label={dt(c.name,c.id)} aria-valuemin={0} aria-valuemax={9} aria-valuenow={completed.size}>{Array.from({length:9},(_,i)=><i key={i} className={completed.has(i+1)?'complete':''}/>)}</span>
     <span className="growth-course-count"><b>{completed.size}</b>/9</span>
    </li>})}</ul>:<p className="growth-hint">{tr('Học phần được phân công sẽ xuất hiện tại đây. Bạn vẫn có thể theo dõi các reflection cá nhân.')}</p>}
   </section>

   <section className="growth-ledger pg-framed" aria-labelledby="progress-portfolio-title">
    <h2 className="growth-label" id="progress-portfolio-title"><UiIcon name="document" size={18}/>{tr('Hồ sơ minh chứng phát triển')}<span className="growth-count">{series.length}</span></h2>
    {series.length?<ul className="growth-portfolio">{evidencePage.rows.map(({reflection:r})=><li key={r.id}><button className="growth-portfolio-row" onClick={()=>onOpen(r)}>
     <span className="growth-portfolio-week">{tr('T{0}',[r.week])}</span>
     <span className="growth-portfolio-copy"><b>{title(r)}</b><span>{tr('{0} phiên bản',[r.versions.length])}<i>·</i>{tr('{0} minh chứng',[r.attachments.length])}<i>·</i>{tr('{0} cam kết',[actions.filter(a=>a.reflectionId===r.id).length])}</span></span>
     <span className={`book-status is-${r.status}`}><i aria-hidden="true"/>{tr(statuses[r.status])}</span>
    </button></li>)}</ul>:<p className="growth-hint">{tr('Bài viết và minh chứng của bạn sẽ được lưu lại tại đây.')}</p>}
    <TablePagination {...evidencePage} total={series.length} language={language}/>
   </section>
  </div>
  <LearningAnalytics reflections={reflections} actions={actions} rubric={rubric} language={language} onOpen={id=>{const r=reflections.find(r=>r.id===id);if(r)onOpen(r)}} view="reflections"/>
  </section>
  <section className="pg-tab-panel pg-report" role="tabpanel" id="pg-panel-insight" aria-labelledby="pg-tab-insight" hidden={tab!=='insight'} tabIndex={0}>
  <section className="pg-card pg-skill-section pg-framed" aria-labelledby="pg-skills-title">
   <div className="pg-section-heading"><h2 id="pg-skills-title"><UiIcon name="sparkle" size={21}/>{tr('Kỹ năng của bạn')}</h2></div><p className="pg-sub">{tr('Vòng càng đầy, kỹ năng càng tốt. Cột nhỏ bên dưới là điểm từng tuần.')}</p>
   <ul className="pg-skills">{skills.map(s=>{const kind=s===top?'best':s===low?'work':'',color=skillColors[s.key],pct=s.average===null?null:Math.round(s.average*10),points=s.weeks.filter(w=>w.value!==null),r=42,c=2*Math.PI*r;
    return <li key={s.key} className={`pg-skill${kind?` is-${kind}`:''}`}>
     {kind&&<span className={`pg-flag is-${kind}`}>{kind==='best'?`★ ${tr('Giỏi nhất')}`:tr('Luyện thêm')}</span>}
     <div className="pg-ring" role="meter" aria-label={skillName(s)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct??0}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r={r} fill="none" stroke="#ece7dc" strokeWidth="8"/>{pct!==null&&<circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-pct/100)}/>}</svg><span><UiIcon name={s.copy?.icon||'sparkle'} size={25}/></span></div>
     <h3>{skillName(s)}</h3><p>{pct===null?tr('Chưa có điểm'):`${pct}%`}</p>
     {points.length>0&&<div className="pg-spark" aria-hidden="true">{points.map((p,i)=><i key={p.week} title={`${tr('Tuần {0}',[p.week])}: ${p.value!.toFixed(1)}`} style={{height:`${p.value!*4.4}px`,background:color,opacity:i===points.length-1?1:.35}}/>)}</div>}
     {s.delta!==null?<span className={`pg-trend${s.delta<0?' is-down':''}`}>{s.delta<0?'▼':'▲'} {s.delta>0?'+':''}{Math.round(s.delta*10)}% {tr('từ Tuần {0}',[s.firstWeek!])}</span>:pct!==null&&<span className="pg-trend is-flat">{tr('Cần thêm một tuần để so sánh')}</span>}
    </li>})}</ul>
   {top&&low&&<div className="pg-advice">
    <div className="is-good"><b><UiIcon name="check" size={16}/>{tr('Bạn làm tốt')}</b>{tr(top.copy?.good||'Tiêu chí “{0}” là điểm mạnh nhất của bạn.',[skillName(top)])}</div>
    <div className="is-tip"><b><UiIcon name="editor" size={16}/>{tr('Thử ngay tuần này')}</b>{coachTip?dt(coachTip,visuals.coach!.analysis.id):tr(low.copy?.tip||'Tập trung luyện thêm tiêu chí “{0}” trong bài tiếp theo.',[skillName(low)])}</div>
   </div>}
  </section>
  <section className="growth-sheet growth-criteria pg-framed" aria-labelledby="progress-criteria-title">
   <h2 className="growth-label" id="progress-criteria-title"><UiIcon name="actions" size={18}/>{tr('Theo tiêu chí')}</h2>
   <div className="growth-criteria-body">
    <svg className="growth-radar" viewBox="0 0 260 260" role="img" aria-label={tr('Theo tiêu chí')}>
     {[.25,.5,.75,1].map(s=><polygon key={s} className="growth-radar-ring" points={summary.criteria.map((_,i)=>axis(i,summary.criteria.length,s).join(',')).join(' ')}/>)}
     {summary.criteria.map((c,i)=>{const [x,y]=axis(i,summary.criteria.length);const [lx,ly]=axis(i,summary.criteria.length,1.18);return <g key={c.key}><line className="growth-radar-axis" x1="130" y1="130" x2={x} y2={y}/><text className="growth-radar-tag" x={lx} y={ly+4}>{i+1}</text></g>})}
     <polygon className="growth-radar-shape" points={radar}/>
     {summary.criteria.map((c,i)=>{const [x,y]=axis(i,summary.criteria.length,(c.average??0)/10);return <circle key={c.key} className="growth-radar-dot" cx={x} cy={y} r="4"/>})}
    </svg>
    <ol className="growth-criteria-list">{summary.criteria.map((c,i)=>{const strong=strengths.includes(c),lowC=weak.includes(c);return <li key={c.key} style={{'--criterion-color':skillColors[c.key]||'#b59a59'} as CSSProperties}>
     <span className="growth-criterion-num">{i+1}</span>
     <div className="growth-criterion-copy">
      <p><b>{tr(c.name)}</b><span className="growth-count">{c.weight}%</span>{strong&&<em className="is-strong">{tr('Điểm mạnh thường xuyên')}</em>}{lowC&&<em className="is-weak">{tr('Tiêu chí cần cải thiện')}</em>}</p>
      <span className="growth-track" role="meter" aria-label={tr(c.name)} aria-valuemin={0} aria-valuemax={10} aria-valuenow={c.average??0} aria-valuetext={c.average===null?tr('Chưa có đánh giá'):`${c.average.toFixed(1)}/10`}><span style={{width:`${(c.average??0)*10}%`}}/></span>
      <small>{c.count?tr('Trung bình từ {0} bài đã đánh giá',[c.count]):tr('Chưa có điểm theo tiêu chí này.')}</small>
     </div>
     <span className="growth-criterion-score"><b>{c.average?.toFixed(1)??'—'}</b>/10</span>
    </li>})}</ol>
   </div>
   {!strengths.length&&!weak.length&&<p className="growth-hint">{tr(summary.criteria.some(c=>c.count)?'Chưa có tiêu chí nào dưới 5,1/10 trong các đánh giá tương ứng với rubric hiện tại.':summary.graded?'Chưa có điểm tương ứng với các tiêu chí trong rubric hiện tại.':'Phản hồi của giảng viên sẽ giúp bạn nhận ra điều cần luyện tập tiếp theo.')}</p>}
  </section>
  <LearningAnalytics reflections={reflections} actions={actions} rubric={rubric} language={language} onOpen={id=>{const r=reflections.find(r=>r.id===id);if(r)onOpen(r)}} view="insight"/>
  </section>
  <section className="pg-tab-panel pg-report" role="tabpanel" id="pg-panel-streak" aria-labelledby="pg-tab-streak" hidden={tab!=='streak'} tabIndex={0}>
   <div className="pg-streak-summary">
    <div className="pg-streak-lead"><span className="pg-streak-icon"><UiIcon name="streak" size={28}/></span><div><span>{tr('Chuỗi tuần dài nhất')}</span><p><b>{visuals.longestStreak}</b> {tr('tuần liên tiếp')}</p></div></div>
    <p>{tr('Chuỗi tuần liên tiếp có bài được giảng viên đánh giá.')}</p>
    <div className="pg-streak-total"><b>{doneWeeks.size}<small>/9</small></b><span>{tr('tuần đã có đánh giá')}</span></div>
   </div>
   <section className="pg-streak-activity" aria-labelledby="pg-activity-title">
    <div className="pg-section-heading"><h2 id="pg-activity-title"><UiIcon name="journey" size={21}/>{tr('Hoạt động từng tuần')}</h2></div>
    <ul className="pg-activity-weeks">{Array.from({length:9},(_,i)=>i+1).map(w=>{const assessed=graded.filter(r=>r.week===w).length,written=reflections.filter(r=>r.week===w).length,state=assessed?'is-done':w===nowWeek?'is-now':'';return <li key={w} className={state} aria-current={w===nowWeek?'step':undefined}>
     <span>{tr('Tuần {0}',[w])}</span><i aria-hidden="true">{assessed?<UiIcon name="check" size={20}/>:w}</i><b>{written}</b><small>{tr('bài đã viết')}</small><span className="pg-activity-status">{assessed?tr('{0} bài đã đánh giá',[assessed]):tr(w>nowWeek?'Sắp tới':w===nowWeek?'Tuần hiện tại':'Chưa có đánh giá')}</span>
    </li>})}</ul>
    <p className="pg-mini">{tr('Tuần có bài được đánh giá tính vào streak; tuần chưa có đánh giá không được tính là hoàn thành.')}</p>
   </section>
  </section>
  <section className="pg-tab-panel pg-report" role="tabpanel" id="pg-panel-comparison" aria-labelledby="pg-tab-comparison" hidden={tab!=='comparison'} tabIndex={0}>
  <section className="pg-card pg-chart-section pg-framed">
   <div className="pg-stat-grid pg-weekly-chart">
    <div>
     <h3 className="pg-chart-heading"><UiIcon name="progress" size={18}/>{tr('Điểm từng tuần')}</h3><p className="pg-mini">{tr('Điểm giảng viên chấm, thang 10. Đường xanh là mục tiêu 7.')}</p>
     <div className="pg-bars" role="img" aria-label={weekly.map(w=>`${tr('Tuần {0}',[w.week])}: ${w.value===null?tr('Chưa có điểm'):`${w.value.toFixed(1)}/10`}`).join('; ')}>
      <div className="pg-goal" style={{bottom:'70%'}}><em>{tr('Mục tiêu 7')}</em></div>
      {weekly.map(w=><div key={w.week} className={`pg-bar${w.value===null?' is-off':w.week===latestScored?' is-now':''}`} title={w.value===null?undefined:`${tr('Tuần {0}',[w.week])}: ${w.value.toFixed(1)}`}>
       {w.value!==null&&<em style={{bottom:`${w.value*10}%`}}>{w.value.toFixed(1)}</em>}<span style={w.value===null?undefined:{height:`${w.value*10}%`}}/></div>)}
     </div>
     <div className="pg-bar-axis" aria-hidden="true">{weekly.map(w=><span key={w.week} className={w.week===latestScored?'is-now':''}>{tr('T{0}',[w.week])}</span>)}</div>
    </div>
   </div>
  </section>
  <section className="growth-sheet growth-reflection pg-framed" aria-labelledby="progress-chart-title">
   <div className="growth-chart-side">
    <h2 className="growth-label" id="progress-chart-title"><UiIcon name="progress" size={18}/>{tr('Mức độ phản tư qua từng tuần')}</h2>
    <div className="growth-chart-wrap" role="group" aria-label={tr('Mức độ phản tư qua từng tuần')}>
     <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {[1,2,3,4].map(n=><g key={n} className="growth-level"><line x1="0" x2={W} y1={levelY(n)} y2={levelY(n)}/><text x={W-4} y={levelY(n)-6}>{n} · {tr(levels[n])}</text></g>)}
      {runs.map((pts,i)=><g key={i}>{pts.length>1&&<path className="growth-area" d={`${smooth(pts)} L${pts.at(-1)![0]} ${levelY(1)} L${pts[0][0]} ${levelY(1)} Z`}/>}<path className="growth-line" d={smooth(pts)} pathLength={100}/></g>)}
      {chartPoints.map((p,i)=>p.level!==null&&<g key={p.week} className={`growth-point${selected?.week===p.week?' is-selected':''}`} transform={`translate(${colX(i)} ${levelY(p.level)})`}>
       {selected?.week===p.week&&<circle className="growth-point-halo" r="15"/>}<circle className="growth-dot" r={selected?.week===p.week?7:5}/>
      </g>)}
     </svg>
     {!latestPoint&&<div className="growth-empty"><UiIcon name="progress" size={25}/><b>{tr('Tiến bộ bắt đầu từ bài viết đầu tiên')}</b><span>{tr('Biểu đồ xuất hiện khi bài viết có đánh giá mức Kember.')}</span></div>}
     <div className="growth-weeks">{chartPoints.map(p=><button key={p.week} type="button" disabled={!p.count} aria-pressed={selected?.week===p.week} aria-label={tr('Tuần {0}',[p.week])+(p.level!==null?` · ${p.level.toFixed(1)}/4`:` · ${tr('Chưa có đánh giá')}`)} onClick={()=>setWeek(p.week)}>{tr('T{0}',[p.week])}</button>)}</div>
    </div>
    {selected&&<div className="growth-caption"><span>{tr('Tuần {0}',[selected.week])} · <b>{selected.level?.toFixed(1)}</b> / 4</span><span className="growth-caption-links">{weekRows.map(r=><button className="text-button" key={r.id} onClick={()=>onOpen(r)} title={title(r)}>{title(r)}<UiIcon name="arrow" size={14}/></button>)}</span></div>}
   </div>

   <aside className="growth-now">
    <span className="growth-label">{tr('Mức Kember')}</span>
    <p className="growth-now-value"><b>{currentLevel===null?'—':currentLevel.toFixed(1)}</b><span>/ 4</span></p>
    {currentLevel!==null&&<p className="growth-now-name">{tr(levels[Math.round(currentLevel)])}</p>}
    {delta!==null&&<p className={`growth-delta${delta<0?' is-down':''}`}><UiIcon name="progress" size={14}/>{delta>=0?'+':''}{delta.toFixed(1)} · {tr('Tuần {0}',[firstPoint!.week])} → {tr('Tuần {0}',[latestPoint!.week])}</p>}
    {latestReview?.comment&&<figure className="growth-note">
     <blockquote>{dt(latestReview.comment,latestReview.id)}</blockquote>
     <figcaption><button className="text-button" onClick={()=>onOpen(graded[0])}>{tr('Xem nhận xét')}<UiIcon name="arrow" size={13}/></button></figcaption>
    </figure>}
   </aside>
  </section>
  <LearningAnalytics reflections={reflections} actions={actions} rubric={rubric} language={language} onOpen={id=>{const r=reflections.find(r=>r.id===id);if(r)onOpen(r)}} view="comparison"/>
  </section>
 </div>;
}
