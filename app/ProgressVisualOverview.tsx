'use client';

import {useState,type CSSProperties} from 'react';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {finalReview} from '../lib/progress';
import {studentProgressVisuals} from '../lib/student-progress-visuals';
import {type Reflection} from '../lib/domain';
import UiIcon from './UiIcon';

type Visuals=ReturnType<typeof studentProgressVisuals>;
type Props={visuals:Visuals;reflections:Reflection[];language:Language;activity:{final:number;total:number;revisions:number;done:number;actions:number};onOpen:(r:Reflection)=>void};
const colors=['#8d5f0f','#287367','#42689a','#a35432'];
const surfaces=['#fbf0d3','#e8f3ed','#ebf0f8','#faede4'];
const icons=['progress','eye','sparkle','actions'] as const;
const sparkX=(week:number,first?:number,last?:number)=>first!==undefined&&last!==undefined&&first!==last?10+(week-first)/(last-first)*160:90;
const X=(week:number)=>(week-.5)*600/9,Y=(value:number)=>190-value*16;
function segments(points:{week:number;value:number|null}[]){
 const runs:{week:number;value:number}[][]=[];
 points.forEach((p,i)=>{if(p.value===null)return;if(i===0||points[i-1].value===null)runs.push([]);runs.at(-1)!.push({week:p.week,value:p.value})});
 return runs;
}

export default function ProgressVisualOverview({visuals,reflections,language,activity,onOpen}:Props){
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args),dt=(s:string,id?:string)=>demoText(s,id,language);
 const {criteria,change,coach,milestones}=visuals;
 const weeks=Array.from({length:9},(_,i)=>({week:i+1,hasScore:criteria.some(c=>c.weeks[i].value!==null)}));
 const [chosenWeek,setChosenWeek]=useState(weeks.findLast(w=>w.hasScore)?.week??1),[solo,setSolo]=useState<string|null>(null);
 const selected=weeks.find(w=>w.week===chosenWeek&&w.hasScore)||weeks.findLast(w=>w.hasScore);
 const hasScores=weeks.some(w=>w.hasScore),selectedRows=reflections.filter(r=>r.week===selected?.week&&finalReview(r));
 const ranked=criteria.filter(c=>c.average!==null).sort((a,b)=>b.average!-a.average!);
 const established=ranked.filter(c=>c.count>=3&&c.average!>=7.6),highlighted=(established.length?established:ranked).slice(0,2);
 const reviewed=reflections.filter(r=>finalReview(r)).sort((a,b)=>finalReview(b)!.createdAt.localeCompare(finalReview(a)!.createdAt));
 const teacher=reviewed.find(r=>finalReview(r)?.comment.trim());
 const source=coach?.reflection||teacher;
 const quote=coach?(coach.analysis.result.strengths.slice(0,2).map(text=>dt(text,coach.analysis.id)).join(' ')||dt(coach.analysis.result.context,coach.analysis.id)):teacher?dt(finalReview(teacher)!.comment,finalReview(teacher)!.id):'';
 const next=coach?.analysis.result.development[0];
 const milestoneCopy={writing:['Người viết bền bỉ','{0} / 4 bài đã được đánh giá','document'],consistency:['Nhịp học đều đặn','{0} / 4 tuần liên tiếp có bài được đánh giá','progress'],practice:['Từ suy nghĩ đến hành động','{0} / 3 cam kết hoàn thành','check']} as const;
 return <>
  <p className="progress-page-intro">{tr('Nhìn lại sự phát triển qua 9 tuần, từ chất lượng phản tư đến hành động thực tế.')}</p>
  <section className="progress-overview" aria-labelledby="progress-overview-title">
   <div className="progress-section-heading"><h2 id="progress-overview-title">{tr('Tổng quan tiến trình')}</h2><span>{tr('Trung bình các bài đã đánh giá · thang 10')}</span></div>
   <div className="progress-overview-metrics">{criteria.map((c,i)=><article className="progress-skill" key={c.key} style={{'--skill-color':colors[i%colors.length],'--skill-surface':surfaces[i%surfaces.length]} as CSSProperties}>
    <h3><UiIcon name={icons[i%icons.length]} size={16}/>{tr(c.name)}</h3>
    <p className="progress-skill-value"><b>{c.average===null?'—':c.average.toFixed(1)}</b><span>/ 10</span></p>
    <svg className="progress-sparkline" viewBox="0 0 180 34" aria-hidden="true">{segments(c.weeks).map((run,n)=><polyline key={n} points={run.map(p=>`${sparkX(p.week,c.firstWeek,c.lastWeek)},${29-p.value*2.4}`).join(' ')}/>)}{c.weeks.filter(p=>p.value!==null).map(p=><circle key={p.week} cx={sparkX(p.week,c.firstWeek,c.lastWeek)} cy={29-p.value!*2.4} r="2.5"/>)}</svg>
    <p className="progress-skill-change">{c.delta===null?tr(c.count?'Cần thêm một tuần để so sánh':'Chưa có điểm đánh giá'):<><span className={c.delta>0?'is-up':c.delta<0?'is-down':''}>{c.delta>0?'+':''}{c.delta.toFixed(1)}</span> {tr('điểm · T{0} → T{1}',[c.firstWeek!,c.lastWeek!])}</>}</p>
   </article>)}</div>
   <div className="progress-overview-footer">
   {change.delta!==null&&change.first&&change.latest&&<div className="progress-change-summary">
    <div className={`progress-change-value${change.delta<0?' is-down':''}`} title={tr('Điểm tổng hợp theo trọng số bốn tiêu chí, từ đánh giá cuối của giảng viên.')}><UiIcon name="progress" size={16}/><b>{change.delta>0?'+':''}{change.delta.toFixed(2)}</b><span>{tr('điểm tổng hợp')} · {tr('Tuần {0}',[change.first.week])} → {tr('Tuần {0}',[change.latest.week])}</span></div>
    <span className="progress-change-before"><b>{change.first.value!.toFixed(2)}</b><UiIcon name="next" size={14}/><b>{change.latest.value!.toFixed(2)}</b><small>/10</small></span>
   </div>}
   <div className="progress-activity"><span><b>{activity.final}/{activity.total}</b> {tr('bài được đánh giá')}</span><span><b>{activity.revisions}</b> {tr('lần chỉnh sửa')}</span><span><b>{activity.done}/{activity.actions}</b> {tr('cam kết hoàn thành')}</span></div>
   </div>
  </section>
  <div className="progress-visual-layout">
   <section className="progress-trend" aria-labelledby="progress-trend-title">
    <div className="progress-section-heading"><div><h2 id="progress-trend-title">{tr('Năng lực thay đổi qua từng tuần')}</h2><p>{tr('Điểm trung bình của các bài đã được giảng viên đánh giá trong mỗi tuần.')}</p></div><UiIcon name="progress" size={19}/></div>
    <div className="progress-trend-key" aria-label={tr('Chọn tiêu chí trên biểu đồ')}>{criteria.map((c,i)=><button key={c.key} type="button" aria-pressed={!solo||solo===c.key} title={tr('Bấm để xem riêng tiêu chí; bấm lại để xem tất cả.')} style={{'--skill-color':colors[i%colors.length]} as CSSProperties} onClick={()=>setSolo(solo===c.key?null:c.key)}><i aria-hidden="true"/>{tr(c.name)}</button>)}</div>
    <div className="progress-trend-plot">
     <div className="progress-trend-y" aria-hidden="true"><span>10</span><span>5</span><span>0</span></div>
     <div className="progress-trend-canvas">
      <svg viewBox="0 0 600 210" preserveAspectRatio="none" role="img" aria-label={tr('Điểm bốn tiêu chí qua 9 tuần, thang điểm 0 đến 10.')}>
       {[0,2.5,5,7.5,10].map(n=><line key={n} className="progress-trend-grid" x1="0" x2="600" y1={Y(n)} y2={Y(n)}/>)}
       {selected&&<rect className="progress-trend-selected" x={X(selected.week)-600/18+2} y="20" width={600/9-4} height="176" rx="7"/>}
       {criteria.map((c,i)=>(!solo||solo===c.key)&&<g key={c.key} style={{color:colors[i%colors.length]}}>{segments(c.weeks).map((run,n)=><polyline className="progress-trend-line" key={n} points={run.map(p=>`${X(p.week)},${Y(p.value)}`).join(' ')}/>)}{c.weeks.filter(p=>p.value!==null).map(p=><circle className="progress-trend-dot" key={p.week} cx={X(p.week)} cy={Y(p.value!)} r={selected?.week===p.week?4.5:3}><title>{`${tr(c.name)} · ${tr('Tuần {0}',[p.week])}: ${p.value!.toFixed(1)}/10`}</title></circle>)}</g>)}
      </svg>
      {!hasScores&&<div className="progress-trend-empty"><UiIcon name="progress" size={24}/><b>{tr('Biểu đồ bắt đầu từ đánh giá đầu tiên')}</b><p>{tr('Điểm sẽ xuất hiện tại tuần có bài được giảng viên đánh giá.')}</p></div>}
      <div className="progress-trend-weeks">{weeks.map(w=><button key={w.week} type="button" disabled={!w.hasScore} aria-label={tr('Tuần {0}',[w.week])} aria-pressed={selected?.week===w.week} onClick={()=>setChosenWeek(w.week)}>{tr('T{0}',[w.week])}</button>)}</div>
     </div>
    </div>
    {change.mostImproved&&<span className="progress-change-best" style={{color:colors[Math.max(0,criteria.findIndex(c=>c.key===change.mostImproved!.key))%colors.length]}}><UiIcon name="sparkle" size={14}/>{tr(change.mostImproved.name)} <b>+{change.mostImproved.delta.toFixed(1)}</b><small>{tr('Tiến bộ rõ nhất')}</small></span>}
    <p className="progress-trend-note">{tr('Tuần chưa có đánh giá được để trống. Bấm tên tiêu chí để xem riêng.')}</p>
   </section>
   <aside className="progress-week-aside">
    {selected&&<div className="progress-week-reading" aria-live="polite"><strong>{tr('Tuần {0}',[selected.week])}</strong><dl>{criteria.map((c,i)=><div key={c.key} style={{color:colors[i%colors.length]}}><dt><i style={{background:colors[i%colors.length]}} aria-hidden="true"/>{tr(c.name)}</dt><dd>{c.weeks[selected.week-1].value?.toFixed(1)??'—'}<small>/10</small></dd></div>)}</dl><div className="progress-week-sources">{selectedRows.map(r=><button key={r.id} type="button" className="text-button" onClick={()=>onOpen(r)}>{dt(r.title,r.id)||tr('Reflection chưa đặt tên')}<UiIcon name="arrow" size={13}/></button>)}</div></div>}
    <section className="progress-strengths" aria-labelledby="progress-strengths-title"><div className="progress-section-heading"><h2 id="progress-strengths-title">{tr(established.length?'Điểm mạnh của bạn':'Tiêu chí nổi bật hiện tại')}</h2><UiIcon name="sparkle" size={17}/></div>
     {highlighted.length?<><p>{tr(established.length?'Các tiêu chí đạt từ 7,6/10, qua ít nhất 3 bài được đánh giá.':'Các tiêu chí có điểm trung bình cao nhất; cần thêm bài để xác nhận điểm mạnh ổn định.')}</p><ul>{highlighted.map(c=><li key={c.key}><div><b>{tr(c.name)}</b><span>{tr('Trung bình từ {0} bài đã đánh giá',[c.count])}</span></div><strong>{c.average!.toFixed(1)}<small>/10</small></strong></li>)}</ul></>:<p>{tr('Điểm mạnh sẽ rõ hơn khi bài viết được giảng viên đánh giá.')}</p>}
    </section>
   </aside>
  </div>
  <div className="progress-insights">
    <section className="progress-coach" aria-labelledby="progress-coach-title"><span className="progress-insight-eyebrow"><UiIcon name="coach" size={16}/>{tr('Góc nhìn cho lần viết tiếp theo')}</span><h2 id="progress-coach-title">{tr(coach?(coach.analysis.kind==='coach'?'Gợi ý từ AI Coach':'Nhận xét từ AI'):'Nhận xét giảng viên')}</h2>
     {source&&<p className="progress-coach-source">{tr('Từ bài viết: {0}',[dt(source.title,source.id)||tr('Reflection chưa đặt tên')])}</p>}
     <div className="progress-coach-body">
     {quote?<blockquote>{quote}</blockquote>:<p>{tr('Nhận xét sẽ xuất hiện khi bạn dùng AI Coach hoặc nhận đánh giá của giảng viên.')}</p>}
     {next&&<div className="progress-coach-next"><b>{tr('Điều nên thử tiếp')}</b><p>{dt(next,coach!.analysis.id)}</p></div>}
     </div>
     {source&&<button type="button" className="text-button" onClick={()=>onOpen(source)}>{tr('Xem bài viết và phản hồi')}<UiIcon name="next" size={14}/></button>}
     {coach&&<small>{tr('Gợi ý AI gắn với phiên bản hiện tại của bài viết; điểm trên biểu đồ do giảng viên xác nhận.')}</small>}
    </section>
    <section className="progress-milestones" aria-labelledby="progress-milestones-title"><div className="progress-section-heading"><h2 id="progress-milestones-title">{tr('Cột mốc của bạn')}</h2><UiIcon name="check" size={17}/></div><p>{tr('Những bước tiến nhỏ, ghi nhận từ hoạt động thực tế.')}</p><ul>{milestones.map(m=>{const [label,description,icon]=milestoneCopy[m.key as keyof typeof milestoneCopy],earned=m.value>=m.target;return <li key={m.key} className={earned?'is-earned':''}><span className="progress-milestone-icon"><UiIcon name={icon} size={18}/></span><div><h3>{tr(label)}</h3><p>{tr(description,[Math.min(m.value,m.target)])}</p><span className="progress-milestone-track" role="meter" aria-label={tr(label)} aria-valuemin={0} aria-valuemax={m.target} aria-valuenow={Math.min(m.value,m.target)}><span style={{width:`${Math.min(m.value/m.target,1)*100}%`}}/></span></div>{earned&&<UiIcon name="check" size={15}/>}</li>})}</ul></section>
  </div>
 </>;
}
