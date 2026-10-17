'use client';

import {useState} from 'react';
import {learnerProgress,finalReview} from '../lib/progress';
import {classAnalytics,criterionTimeSeries,reportHeaders,reportRows} from '../lib/learning-analytics';
import {safeCsv} from '../lib/lecturer-pages';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {levels,statuses,type Action,type Course,type Criterion,type Reflection} from '../lib/domain';
import LearningAnalytics from './LearningAnalytics';
import WorkspaceSections from './WorkspaceSections';
import TablePagination,{usePageRows} from './TablePagination';
import UiIcon from './UiIcon';

type Props={reflections:Reflection[];actions:Action[];courses:Course[];rubric:Criterion[];language:Language;onOpen:(r:Reflection)=>void};

export default function StudentProgress({reflections,actions,courses,rubric,language,onOpen}:Props){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args);
 const dt=(s:string,id?:string|null)=>demoText(s,id,language);
 const progress=learnerProgress(reflections),summary=classAnalytics(reflections,actions,rubric),series=criterionTimeSeries(reflections,rubric);
 const graded=reflections.filter(r=>finalReview(r)).sort((a,b)=>finalReview(b)!.createdAt.localeCompare(finalReview(a)!.createdAt));
 const classified=graded.filter(r=>{const level=finalReview(r)!.level;return level!==null&&level>=1&&level<=4;});
 const chartPoints=progress.points.map(p=>{const rows=classified.filter(r=>r.week===p.week);return {...p,count:rows.length,level:rows.length?rows.reduce((sum,r)=>sum+finalReview(r)!.level!,0)/rows.length:null};});
 const latestReview=graded[0]?finalReview(graded[0]):undefined;
 const latestPoint=chartPoints.findLast(p=>p.count>0),[week,setWeek]=useState(latestPoint?.week||1);
 const selected=chartPoints.find(p=>p.week===week&&p.count>0)||latestPoint;
 const weekRows=classified.filter(r=>r.week===selected?.week);
 const done=actions.filter(a=>a.status==='done').length,actionRate=actions.length?Math.round(done/actions.length*100):0;
 const strengths=summary.criteria.filter(c=>c.count>=3&&c.average!==null&&c.average>=7.6),weak=summary.criteria.filter(c=>c.average!==null&&c.average<5.1);
 const evidencePage=usePageRows(series,series.map(p=>p.reflection.id).join(','),8);
 const pointX=(i:number)=>592*(i+.5)/9,pointY=(level:number)=>170-(level-1)*48;
 // A missing week breaks the line; no scores are inferred between assessments.
 const segments:string[][]=[];
 chartPoints.forEach((p,i)=>{if(p.level===null)return;if(i===0||chartPoints[i-1].level===null)segments.push([]);segments.at(-1)!.push(`${pointX(i)},${pointY(p.level)}`)});
 function download(){const rows=reportRows(reflections,rubric),url=URL.createObjectURL(new Blob(['\uFEFF'+safeCsv([reportHeaders.map(label=>tr(label)),...rows])],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='think-up-progress.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const title=(r:Reflection)=>dt(r.title,r.id)||tr('Reflection chưa đặt tên');
 const overview=<>
  <div className="personal-progress-grid">
   <section className="panel progress-chart-card" aria-labelledby="progress-chart-title">
    <div className="progress-card-heading"><div><h2 id="progress-chart-title">{tr('Mức độ phản tư qua từng tuần')}</h2><p>{tr('Mức Kember từ đánh giá cuối của giảng viên')}</p></div><span className="progress-chart-key"><i/>{tr('Mức Kember')}</span></div>
    <div className="progress-chart" role="group" aria-label={tr('Mức độ phản tư qua từng tuần')}>
     <div className="progress-chart-axis" aria-hidden="true">{[4,3,2,1].map(n=><span key={n} style={{top:`${pointY(n)}px`}}>{n}</span>)}</div>
     <div className="progress-chart-plot"><svg viewBox="0 0 592 194" preserveAspectRatio="none" aria-hidden="true">
      {[1,2,3,4].map(n=><line key={n} x1={pointX(0)} x2={pointX(8)} y1={pointY(n)} y2={pointY(n)} className="progress-gridline"/>)}
      {segments.map((points,i)=><polyline key={i} points={points.join(' ')} className="progress-line"/>)}
      {chartPoints.map((p,i)=>p.level!==null?<g key={p.week}><line x1={pointX(i)} x2={pointX(i)} y1="26" y2="170" className={selected?.week===p.week?'progress-selection':'progress-guide'}/><circle cx={pointX(i)} cy={pointY(p.level)} r={selected?.week===p.week?6:4} className="progress-point"/></g>:null)}
     </svg>{!latestPoint&&<div className="progress-chart-empty"><UiIcon name="progress" size={25}/><b>{tr('Tiến bộ bắt đầu từ bài viết đầu tiên')}</b><span>{tr('Biểu đồ xuất hiện khi bài viết có đánh giá mức Kember.')}</span></div>}
      <div className="progress-week-buttons">{chartPoints.map(p=><button key={p.week} type="button" disabled={!p.count} aria-pressed={selected?.week===p.week} aria-label={tr('Tuần {0}',[p.week])+(p.level!==null?` · ${p.level.toFixed(1)}/4`:` · ${tr('Chưa có đánh giá')}`)} onClick={()=>setWeek(p.week)}>{tr('T{0}',[p.week])}</button>)}</div>
     </div>
    </div>
    {selected?<div className="progress-chart-caption"><div><small>{tr('Tuần {0}',[selected.week])}</small><strong>{selected.level?.toFixed(1)}<span> / 4</span></strong></div><div className="progress-chart-reflections">{weekRows.map(r=><button className="text-button" key={r.id} onClick={()=>onOpen(r)} title={title(r)}>{title(r)}<UiIcon name="arrow" size={14}/></button>)}</div></div>:<p className="progress-chart-note">{tr('Tiếp tục viết và nộp bài để nhìn lại hành trình của bạn.')}</p>}
    <p className="progress-chart-note">{tr('Mỗi điểm là mức Kember trung bình của các bài đã đánh giá trong tuần; tuần chưa có đánh giá để trống.')}</p>
   </section>
   <section className="panel progress-focus" aria-labelledby="progress-focus-title"><div className="progress-card-heading"><h2 id="progress-focus-title">{tr('Tiêu điểm học tập')}</h2><span className="progress-heading-icon"><UiIcon name="coach" size={19}/></span></div>
    <div className="progress-focus-section"><span className="progress-focus-label"><UiIcon name="check" size={15}/>{tr('Điểm mạnh thường xuyên')}</span>{strengths.length?<ul>{strengths.map(c=><li key={c.key}>{tr(c.name)}<b>{c.average?.toFixed(1)}/10</b></li>)}</ul>:<p>{tr('Cần ba bài có điểm ở cùng tiêu chí để nhận diện điểm mạnh thường xuyên.')}</p>}</div>
    <div className="progress-focus-section"><span className="progress-focus-label"><UiIcon name="editor" size={15}/>{tr('Tiêu chí cần cải thiện')}</span>{weak.length?<ul>{weak.map(c=><li key={c.key}>{tr(c.name)}<b>{c.average?.toFixed(1)}/10</b></li>)}</ul>:<p>{tr(summary.criteria.some(c=>c.count)?'Chưa có tiêu chí nào dưới 5,1/10 trong các đánh giá tương ứng với rubric hiện tại.':summary.graded?'Chưa có điểm tương ứng với các tiêu chí trong rubric hiện tại.':'Phản hồi của giảng viên sẽ giúp bạn nhận ra điều cần luyện tập tiếp theo.')}</p>}</div>
    {latestReview?.comment&&<div className="progress-teacher-note"><span className="progress-focus-label">{tr('Từ nhận xét gần nhất')}</span><blockquote>{dt(latestReview.comment,latestReview.id)}</blockquote><button className="text-button" onClick={()=>onOpen(graded[0])}>{tr('Xem nhận xét')}<UiIcon name="arrow" size={13}/></button></div>}
    <div className="progress-action-summary"><div><span>{tr('Từ bài học đến hành động')}</span><b>{done}<small> / {actions.length}</small></b></div><div className="personal-progress-track" role="meter" aria-label={tr('Hành động hoàn thành')} aria-valuemin={0} aria-valuemax={Math.max(1,actions.length)} aria-valuenow={done}><span style={{width:`${actionRate}%`}}/></div><p>{actions.length?tr('{0}% cam kết đã hoàn thành',[actionRate]):tr('Xác nhận một cam kết sau reflection để bắt đầu.')}</p></div>
   </section>
  </div>
  <div className="progress-bottom-grid">
   <section className="panel progress-course-panel"><div className="progress-card-heading"><h2>{tr('Hành trình theo học phần')}</h2><UiIcon name="journey" size={19}/></div>
    {courses.map(c=>{const completed=new Set(reflections.filter(r=>r.courseId===c.id&&finalReview(r)).map(r=>r.week));return <div className="progress-course" key={c.id}><div className="progress-course-heading"><div><small>{c.code}</small><h3>{dt(c.name,c.id)}</h3></div><b>{completed.size}<span> / 9</span></b></div><div className="progress-course-weeks" role="meter" aria-label={dt(c.name,c.id)} aria-valuemin={0} aria-valuemax={9} aria-valuenow={completed.size}>{Array.from({length:9},(_,i)=><span key={i} className={completed.has(i+1)?'complete':''}/>)}</div><p>{tr('{0} / 9 tuần đã hoàn thành',[completed.size])}</p></div>})}
    {!courses.length&&<div className="progress-quiet-empty"><UiIcon name="journey" size={24}/><p>{tr('Học phần được phân công sẽ xuất hiện tại đây. Bạn vẫn có thể theo dõi các reflection cá nhân.')}</p></div>}
   </section>
   <section className="panel progress-recent"><div className="progress-card-heading"><h2>{tr('Bài đã đánh giá gần đây')}</h2><span className="progress-count">{progress.final}</span></div>
    {graded.slice(0,3).map(r=>{const review=finalReview(r)!;return <button className="progress-reviewed-row" key={r.id} onClick={()=>onOpen(r)}><span className="progress-document"><UiIcon name="document" size={18}/></span><span className="progress-reviewed-copy"><b>{title(r)}</b><small>{tr('Tuần {0}',[r.week])} · {review.level?tr(levels[review.level]):tr('Đã hoàn thành')}</small></span><span className="progress-reviewed-score">{review.total??'—'}<small>/10</small></span><UiIcon name="arrow" size={15}/></button>})}
    {!graded.length&&<div className="progress-quiet-empty"><UiIcon name="document" size={24}/><p>{tr('Bài đã đánh giá sẽ xuất hiện tại đây để bạn xem lại nhận xét và minh chứng.')}</p></div>}
   </section>
  </div>
 </>;
 const criteria=<>
  <div className="progress-criteria-grid">{summary.criteria.map(c=><section className="panel progress-criterion-card" key={c.key}><div className="progress-card-heading"><h2>{tr(c.name)}</h2><span className="progress-count">{c.weight}%</span></div><div className="progress-criterion-value"><b>{c.average?.toFixed(1)??'—'}</b><span>/ 10</span></div><div className="personal-progress-track" role="meter" aria-label={tr(c.name)} aria-valuemin={0} aria-valuemax={10} aria-valuenow={c.average??0} aria-valuetext={c.average===null?tr('Chưa có đánh giá'):`${c.average.toFixed(1)}/10`}><span style={{width:`${(c.average??0)*10}%`}}/></div><p>{c.count?tr('Trung bình từ {0} bài đã đánh giá',[c.count]):tr('Chưa có điểm theo tiêu chí này.')}</p></section>)}</div>
  <details className="panel progress-detailed-report"><summary>{tr('Xem báo cáo và so sánh chi tiết')}</summary><LearningAnalytics reflections={reflections} actions={actions} rubric={rubric} language={language} onOpen={id=>{const r=reflections.find(r=>r.id===id);if(r)onOpen(r)}}/></details>
 </>;
 const evidence=<section className="panel progress-portfolio"><div className="progress-card-heading"><div><h2>{tr('Hồ sơ minh chứng phát triển')}</h2><p>{tr('Nhìn lại bài viết, phiên bản và những hành động bạn đã cam kết.')}</p></div><span className="progress-count">{series.length}</span></div>{evidencePage.rows.map(({reflection:r})=><button className="progress-portfolio-row" key={r.id} onClick={()=>onOpen(r)}><span className="progress-document"><UiIcon name="document" size={20}/></span><span className="progress-portfolio-copy"><b>{title(r)}</b><span>{tr('Tuần {0}',[r.week])}<i>·</i>{tr('{0} phiên bản',[r.versions.length])}<i>·</i>{tr('{0} minh chứng',[r.attachments.length])}<i>·</i>{tr('{0} cam kết',[actions.filter(a=>a.reflectionId===r.id).length])}</span></span><span className={`badge ${r.status}`}>{tr(statuses[r.status])}</span><UiIcon name="arrow" size={16}/></button>)}{!series.length&&<div className="progress-quiet-empty"><UiIcon name="document" size={26}/><p>{tr('Bài viết và minh chứng của bạn sẽ được lưu lại tại đây.')}</p></div>}<TablePagination {...evidencePage} total={series.length} language={language}/></section>;
 return <div className="student-progress"><div className="page-heading"><div><h1>{tr('Tiến bộ của tôi')}</h1><p>{tr('Mỗi lần nhìn lại, một bước tiến xa hơn.')}</p></div><button className="button progress-export" onClick={download}><UiIcon name="down" size={15}/>{tr('Xuất CSV')}</button></div>
  <WorkspaceSections label={tr('Tiến bộ của tôi')} items={[{id:'overview',label:tr('Tổng quan'),content:overview},{id:'criteria',label:tr('Theo tiêu chí'),content:criteria},{id:'evidence',label:tr('Hồ sơ học tập'),content:evidence}]}/>
  <div className="progress-metrics">{[
   {icon:'document' as const,label:tr('Bài đã hoàn thành'),value:progress.final,unit:tr('bài'),note:tr('Đã được giảng viên đánh giá')},
   {icon:'editor' as const,label:tr('Lần chỉnh sửa'),value:progress.revisions,unit:tr('lần'),note:tr('Từ viết đến hoàn thiện')},
   {icon:'progress' as const,label:tr('Điểm cuối trung bình'),value:progress.average?.toFixed(2)??'—',unit:'/ 10',note:tr('Theo đánh giá cuối của giảng viên')},
   {icon:'actions' as const,label:tr('Hành động hoàn thành'),value:done,unit:`/ ${actions.length}`,note:actions.length?tr('{0}% cam kết đã hoàn thành',[actionRate]):tr('Chưa có cam kết')},
  ].map(metric=><div className="progress-metric" key={metric.label}><div className="progress-metric-label"><span>{metric.label}</span><UiIcon name={metric.icon} size={18}/></div><div className="progress-metric-value"><b>{metric.value}</b><span>{metric.unit}</span></div><p>{metric.note}</p></div>)}</div>
 </div>;
}
