'use client';

import {useState} from 'react';
import {learnerProgress,finalReview} from '../lib/progress';
import {classAnalytics,criterionTimeSeries,reportHeaders,reportRows} from '../lib/learning-analytics';
import {safeCsv} from '../lib/lecturer-pages';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {levels,statuses,type Action,type Course,type Criterion,type Reflection} from '../lib/domain';
import LearningAnalytics from './LearningAnalytics';
import TablePagination,{usePageRows} from './TablePagination';
import UiIcon from './UiIcon';
import CountUp from './CountUp';
import WorkspacePageHeading from './WorkspacePageHeading';

type Props={reflections:Reflection[];actions:Action[];courses:Course[];rubric:Criterion[];language:Language;onOpen:(r:Reflection)=>void};

// Chart geometry: nine week columns on graph paper, Kember levels 1–4 from bottom to top.
const W=600,H=230,colX=(i:number)=>(i+.5)*W/9,levelY=(level:number)=>196-(level-1)*54;
/** A smooth line through points (Catmull-Rom as cubic Béziers). */
const smooth=(pts:[number,number][])=>pts.map((p,i)=>{if(!i)return `M${p[0]} ${p[1]}`;const a=pts[i-2]||pts[i-1],b=pts[i-1],c=p,d=pts[i+1]||p;return `C${b[0]+(c[0]-a[0])/6} ${b[1]+(c[1]-a[1])/6} ${c[0]-(d[0]-b[0])/6} ${c[1]-(d[1]-b[1])/6} ${c[0]} ${c[1]}`}).join(' ');

export default function StudentProgress({reflections,actions,courses,rubric,language,onOpen}:Props){
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
 const done=actions.filter(a=>a.status==='done').length,actionRate=actions.length?Math.round(done/actions.length*100):0;
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
 const metrics:{key:string;icon:'document'|'editor'|'progress'|'actions';label:string;value:number|null;decimals?:number;unit:string;note:string;bar?:number}[]=[
  {key:'final',icon:'document',label:tr('Bài đã hoàn thành'),value:progress.final,unit:reflections.length?`/ ${reflections.length}`:'',note:tr('Đã được giảng viên đánh giá'),bar:reflections.length?progress.final/reflections.length:0},
  {key:'revisions',icon:'editor',label:tr('Lần chỉnh sửa'),value:progress.revisions,unit:'',note:tr('Từ viết đến hoàn thiện')},
  {key:'score',icon:'progress',label:tr('Điểm cuối trung bình'),value:progress.average,decimals:2,unit:'/ 10',note:tr('Theo đánh giá cuối của giảng viên'),bar:(progress.average??0)/10},
  {key:'actions',icon:'actions',label:tr('Hành động hoàn thành'),value:done,unit:`/ ${actions.length}`,note:actions.length?tr('{0}% cam kết đã hoàn thành',[actionRate]):tr('Chưa có cam kết'),bar:actions.length?done/actions.length:0},
 ];

 return <div className="growth">
  <WorkspacePageHeading visible title={tr('Tiến bộ của tôi')}><button className="button progress-export" onClick={download}><UiIcon name="down" size={15}/>{tr('Xuất CSV')}</button></WorkspacePageHeading>

  <section className="growth-metrics" aria-label={tr('Tóm tắt học tập')}>{metrics.map(m=><div className={`growth-metric is-${m.key}`} key={m.key}>
   <span className="growth-metric-label"><UiIcon name={m.icon} size={15}/>{m.label}</span>
   <span className="growth-metric-value">{m.value===null?<strong className="growth-metric-number">—</strong>:<CountUp value={m.value} decimals={m.decimals} className="growth-metric-number"/>}{m.unit&&<span>{m.unit}</span>}</span>
   <small>{m.note}</small>
   {m.bar!==undefined&&<svg className="growth-metric-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19"/><circle className="growth-metric-arc" cx="24" cy="24" r="19" pathLength={100} strokeDasharray={`${Math.round(m.bar*100)} 100`}/><text x="24" y="28">{Math.round(m.bar*100)}%</text></svg>}
  </div>)}</section>

  <section className="growth-sheet growth-reflection" aria-labelledby="progress-chart-title">
   <div className="growth-chart-side">
    <h2 className="growth-label" id="progress-chart-title">{tr('Mức độ phản tư qua từng tuần')}</h2>
    <div className="growth-chart-wrap" role="group" aria-label={tr('Mức độ phản tư qua từng tuần')}>
     <svg className="growth-chart" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs><linearGradient id="growth-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e8c766" stopOpacity=".45"/><stop offset="1" stopColor="#e8c766" stopOpacity="0"/></linearGradient></defs>
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

  <section className="growth-sheet growth-criteria" aria-labelledby="progress-criteria-title">
   <h2 className="growth-label" id="progress-criteria-title">{tr('Theo tiêu chí')}</h2>
   <div className="growth-criteria-body">
    <svg className="growth-radar" viewBox="0 0 260 260" role="img" aria-label={tr('Theo tiêu chí')}>
     {[.25,.5,.75,1].map(s=><polygon key={s} className="growth-radar-ring" points={summary.criteria.map((_,i)=>axis(i,summary.criteria.length,s).join(',')).join(' ')}/>)}
     {summary.criteria.map((c,i)=>{const [x,y]=axis(i,summary.criteria.length);const [lx,ly]=axis(i,summary.criteria.length,1.18);return <g key={c.key}><line className="growth-radar-axis" x1="130" y1="130" x2={x} y2={y}/><text className="growth-radar-tag" x={lx} y={ly+4}>{i+1}</text></g>})}
     <polygon className="growth-radar-shape" points={radar}/>
     {summary.criteria.map((c,i)=>{const [x,y]=axis(i,summary.criteria.length,(c.average??0)/10);return <circle key={c.key} className="growth-radar-dot" cx={x} cy={y} r="4"/>})}
    </svg>
    <ol className="growth-criteria-list">{summary.criteria.map((c,i)=>{const strong=strengths.includes(c),low=weak.includes(c);return <li key={c.key}>
     <span className="growth-criterion-num">{i+1}</span>
     <div className="growth-criterion-copy">
      <p><b>{tr(c.name)}</b><span className="growth-count">{c.weight}%</span>{strong&&<em className="is-strong">{tr('Điểm mạnh thường xuyên')}</em>}{low&&<em className="is-weak">{tr('Tiêu chí cần cải thiện')}</em>}</p>
      <span className="growth-track" role="meter" aria-label={tr(c.name)} aria-valuemin={0} aria-valuemax={10} aria-valuenow={c.average??0} aria-valuetext={c.average===null?tr('Chưa có đánh giá'):`${c.average.toFixed(1)}/10`}><span style={{width:`${(c.average??0)*10}%`}}/></span>
      <small>{c.count?tr('Trung bình từ {0} bài đã đánh giá',[c.count]):tr('Chưa có điểm theo tiêu chí này.')}</small>
     </div>
     <span className="growth-criterion-score"><b>{c.average?.toFixed(1)??'—'}</b>/10</span>
    </li>})}</ol>
   </div>
   {!strengths.length&&!weak.length&&<p className="growth-hint">{tr(summary.criteria.some(c=>c.count)?'Chưa có tiêu chí nào dưới 5,1/10 trong các đánh giá tương ứng với rubric hiện tại.':summary.graded?'Chưa có điểm tương ứng với các tiêu chí trong rubric hiện tại.':'Phản hồi của giảng viên sẽ giúp bạn nhận ra điều cần luyện tập tiếp theo.')}</p>}
  </section>

  <div className="growth-ledgers">
   <section className="growth-ledger" aria-labelledby="progress-courses-title">
    <h2 className="growth-label" id="progress-courses-title">{tr('Hành trình theo học phần')}</h2>
    {courses.length?<ul className="growth-course-list">{courses.map(c=>{const completed=new Set(reflections.filter(r=>r.courseId===c.id&&finalReview(r)).map(r=>r.week));return <li className="growth-course" key={c.id}>
     <span className="growth-course-copy"><small>{c.code}</small><b title={dt(c.name,c.id)}>{dt(c.name,c.id)}</b></span>
     <span className="growth-course-weeks" role="meter" aria-label={dt(c.name,c.id)} aria-valuemin={0} aria-valuemax={9} aria-valuenow={completed.size}>{Array.from({length:9},(_,i)=><i key={i} className={completed.has(i+1)?'complete':''}/>)}</span>
     <span className="growth-course-count"><b>{completed.size}</b>/9</span>
    </li>})}</ul>:<p className="growth-hint">{tr('Học phần được phân công sẽ xuất hiện tại đây. Bạn vẫn có thể theo dõi các reflection cá nhân.')}</p>}
   </section>

   <section className="growth-ledger" aria-labelledby="progress-portfolio-title">
    <h2 className="growth-label" id="progress-portfolio-title">{tr('Hồ sơ minh chứng phát triển')}<span className="growth-count">{series.length}</span></h2>
    {series.length?<ul className="growth-portfolio">{evidencePage.rows.map(({reflection:r})=><li key={r.id}><button className="growth-portfolio-row" onClick={()=>onOpen(r)}>
     <span className="growth-portfolio-week">{tr('T{0}',[r.week])}</span>
     <span className="growth-portfolio-copy"><b>{title(r)}</b><span>{tr('{0} phiên bản',[r.versions.length])}<i>·</i>{tr('{0} minh chứng',[r.attachments.length])}<i>·</i>{tr('{0} cam kết',[actions.filter(a=>a.reflectionId===r.id).length])}</span></span>
     <span className={`book-status is-${r.status}`}><i aria-hidden="true"/>{tr(statuses[r.status])}</span>
    </button></li>)}</ul>:<p className="growth-hint">{tr('Bài viết và minh chứng của bạn sẽ được lưu lại tại đây.')}</p>}
    <TablePagination {...evidencePage} total={series.length} language={language}/>
   </section>
  </div>

  <details className="growth-details"><summary><UiIcon name="search" size={16}/>{tr('Xem báo cáo và so sánh chi tiết')}<UiIcon name="next" size={15}/></summary><LearningAnalytics reflections={reflections} actions={actions} rubric={rubric} language={language} onOpen={id=>{const r=reflections.find(r=>r.id===id);if(r)onOpen(r)}}/></details>
 </div>;
}
