'use client';
import { useState, type ReactNode } from 'react';
import { lecturerStatuses } from '../lib/lecturer-pages';
import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';

/** Presentational pieces shared by the lecturer pages, in the same notebook language as the student pages. */

type Icon=Parameters<typeof UiIcon>[0]['name'];

// Dates are formatted by hand in Vietnam time (UTC+7, no daylight saving) so the server and every browser print
// exactly the same text; locale formatting differs between Node and browsers and breaks hydration.
const pad=(n:number)=>String(n).padStart(2,'0');
function vietnamParts(value:string|number){
  const d=new Date(new Date(value).getTime()+7*3600e3);
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),weekday:d.getUTCDay()};
}
export function formatDate(value:string|number,_language?:Language,withTime=false) {
  const p=vietnamParts(value),date=`${pad(p.day)}/${pad(p.month)}/${p.year}`;
  return withTime?`${pad(p.hour)}:${pad(p.minute)} · ${date}`:date;
}
export function dayKey(value:string|number) {const p=vietnamParts(value);return `${p.year}-${pad(p.month)}-${pad(p.day)}`}
const weekdays={vi:['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function longDate(value:number,language:Language) {
  const p=vietnamParts(value);
  return language==='en'?`${weekdays.en[p.weekday]}, ${p.day} ${months[p.month-1]} ${p.year}`:`${weekdays.vi[p.weekday]}, ${p.day} tháng ${p.month}, ${p.year}`;
}
export function daysSince(value:string,now:number) {
  return Math.max(0,Math.floor((now-new Date(value).getTime())/864e5));
}

export function StatusTag({status,language}:{status:string;language:Language}) {
  return <span className={`lx-status is-${status}`}><i aria-hidden="true"/>{translate(lecturerStatuses[status]||status,language)}</span>;
}

/** One block of content with an optional title. Inside a tab the tab names it, so the title is left out. */
export function Section({title,count,action,children,className=''}:{title?:ReactNode;count?:ReactNode;action?:ReactNode;children:ReactNode;className?:string}) {
  return <section className={`lx-section ${className}`}>
    {(title||action)&&<header className="lx-section-head">{title&&<h2>{title}</h2>}{count!==undefined&&<span className="lx-count">{count}</span>}{action&&<div className="lx-section-action">{action}</div>}</header>}
    {children}
  </section>;
}

export function Empty({children}:{children:ReactNode}) {
  return <p className="lx-empty-line">{children}</p>;
}

/** A quiet row of figures separated by hairlines. */
export function Metrics({items,className=''}:{items:{label:string;icon?:Icon;value:ReactNode;of?:ReactNode;note?:ReactNode;ring?:number|null;href?:string;tone?:'attention'}[];className?:string}) {
  return <div className={`lx-metrics ${className}`}>{items.map(m=>{
    const ring=m.ring==null?null:Math.max(0,Math.min(1,m.ring));
    const body=<>
      <span className="lx-metric-label">{m.icon&&<UiIcon name={m.icon} size={15}/>}{m.label}</span>
      <span className="lx-metric-value"><b>{m.value}</b>{m.of!=null&&<span>/ {m.of}</span>}</span>
      {m.note&&<small>{m.note}</small>}
      {ring!==null&&<svg className="lx-ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20"/><circle className="lx-ring-arc" cx="24" cy="24" r="20" pathLength={100} strokeDasharray={`${ring*100} 100`}/><text x="24" y="28">{Math.round(ring*100)}%</text></svg>}
    </>;
    return m.href?<a key={m.label} href={m.href} className={`lx-metric${m.tone?` is-${m.tone}`:''}`}>{body}</a>:<div key={m.label} className={`lx-metric${m.tone?` is-${m.tone}`:''}`}>{body}</div>;
  })}</div>;
}

/** Nine weeks. `compact` draws the student-style row of dots; otherwise numbered tiles that can link to the week's work. */
export function WeekStrip({weeks,language,compact=false,href}:{weeks:{week:number;state:string;label?:string;title?:string}[];language:Language;compact?:boolean;href?:(week:number)=>string|undefined}) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  return <ol className={compact?'lx-dots':'lx-weeks'} aria-label={tr('Chín tuần')}>
    {weeks.map(w=>{const link=href?.(w.week),title=w.title||`${tr('Tuần {0}',[w.week])} · ${tr(lecturerStatuses[w.state]||'Chưa bắt đầu')}`;
      const body=compact?<span className="sr-only">{title}</span>:<><small>{tr('Tuần')}</small><b>{w.week}</b><em>{w.label||tr(lecturerStatuses[w.state]||'Chưa bắt đầu')}</em></>;
      return <li key={w.week} className={`is-${w.state||'none'}`} title={title}>{link?<a href={link}>{body}</a>:<span>{body}</span>}</li>})}
  </ol>;
}

/** One group of information at a time. Every panel is rendered and the inactive ones are hidden, so the server
 *  markup stays complete and switching tabs never refetches. */
export function Tabbed({label,tabs,activeKey,onChange}:{label:string;tabs:{key:string;label:string;count?:ReactNode;content:ReactNode}[];activeKey?:string;onChange?:(key:string)=>void}) {
  const [selection,setSelection]=useState(tabs[0]?.key);
  const active=activeKey??selection;
  return <div className="lx-tabbed">
    <nav className="lx-tabs" aria-label={label}>{tabs.map(t=><button key={t.key} type="button" aria-pressed={active===t.key} onClick={()=>{setSelection(t.key);onChange?.(t.key)}}>{t.label}{t.count!==undefined&&<span>{t.count}</span>}</button>)}</nav>
    {tabs.map(t=><div key={t.key} className="lx-tab-panel" hidden={active!==t.key}>{t.content}</div>)}
  </div>;
}
