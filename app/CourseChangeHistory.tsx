'use client';
import { courseChangeHeadlines, type CourseChange, type CourseChangeGroup, type CourseHistoryEntry } from '../lib/course-history';
import { formatActionDeadline, validateCommitmentDeadline } from '../lib/commitment-deadline';
import type { Criterion, Week } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { formatDate } from './LecturerKit';

const groups:[CourseChangeGroup,string][]=[['info','Thông tin học phần'],['rubric','Rubric đánh giá'],['due','Hạn nộp'],['week','Nội dung tuần'],['deadline','Hạn cam kết']];
const roles:Record<string,string>={lecturer:'Giảng viên',admin:'Quản trị viên'};
const fields:Record<string,string>={name:'Tên học phần',code:'Mã học phần',className:'Lớp học phần',title:'Tiêu đề',prompt:'Câu hỏi gợi ý',requirements:'Yêu cầu',deadline:'Quy định'};
const shortDate=(value:unknown)=>String(value||'').split('-').reverse().join('/')||'—';

export function describeCommitmentDeadline(value:unknown,language:Language){const policy=validateCommitmentDeadline(value);return policy?.kind==='days'?translate('{0} ngày từ khi tạo cam kết',language,[policy.days]):policy?.kind==='fixed'?`${formatActionDeadline({due:'',dueAt:policy.at},language)} · UTC+7`:translate('Chưa quy định',language)}

export default function CourseChangeHistory({entries,language}:{entries:CourseHistoryEntry[];language:Language}) {
 const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
 const shown=(value:unknown)=>tr(String(value??''))||'—';
 const describeDeadline=(value:unknown)=>describeCommitmentDeadline(value,language);
 function headline(entry:CourseHistoryEntry){
  if(entry.initial)return tr('Cấu hình ban đầu của học phần');
  const parts=courseChangeHeadlines(entry.changes).map(text=>tr(text));
  return parts.length?parts.map((text,index)=>index?text.charAt(0).toLowerCase()+text.slice(1):text).join(', '):tr('Lưu lại, không có thay đổi');
 }
 function label(change:CourseChange){
  if(change.field==='weight'||change.field==='criterion')return shown(change.criterion);
  if(change.field==='description')return `${shown(change.criterion)} · ${tr('Mức {0}',[(change.level||0)+1])}`;
  if(change.field==='due')return `${tr('T{0}',[change.week])} · ${shown(change.criterion)}`;
  return change.week?`${tr('T{0}',[change.week])} · ${tr(fields[change.field])}`:tr(fields[change.field]);
 }
 function row(change:CourseChange,key:number){
  const long=change.field==='description'||change.field==='prompt'||change.field==='requirements';
  const value=(v:unknown)=>change.field==='weight'?`${v}%`:change.field==='due'?shortDate(v):change.field==='deadline'?describeDeadline(v):shown(v);
  return long
   ?<div className="lx-change-row is-long" key={key}><span>{label(change)}</span><del>{value(change.before)}</del><ins>{value(change.after)}</ins></div>
   :<div className="lx-change-row" key={key}><span>{label(change)}</span><span className="lx-change-values"><del>{value(change.before)}</del><i aria-hidden="true">→</i><ins>{value(change.after)}</ins></span></div>;
 }
 return <ol className="lx-change-log">{entries.map(entry=>{const {record}=entry,payload=record.payload;return <li key={record.id} className={entry.current?'is-current':undefined}>
  <div className="lx-change-when"><time dateTime={entry.at}>{formatDate(entry.at,language,true)}</time>{entry.current&&<span>{tr('Đang áp dụng')}</span>}</div>
  <article>
   <h4>{headline(entry)}</h4>
   {entry.showOwner&&record.ownerName&&<p className="lx-change-who">{record.ownerName}{roles[record.ownerRole||'']?` · ${tr(roles[record.ownerRole||''])}`:''}</p>}
   {groups.map(([group,title])=>{const rows=entry.changes.filter(c=>c.group===group);return rows.length?<div className="lx-change-group" key={group}><h5>{tr(title)}</h5>{rows.map(row)}</div>:null})}
   <details className="lx-change-snapshot"><summary>{tr('Xem toàn bộ cấu hình lúc này')}</summary><div>
    <section><h5>{tr('Rubric đánh giá')}</h5>{(payload.rubric as Criterion[]||[]).map(c=><p key={c.key}><span>{tr(c.name)}</span><b>{c.weight}%</b></p>)}
     <h5>{tr('Hạn cam kết')}</h5><p><span>{describeDeadline(payload.commitmentDeadline)}</span></p></section>
    <section><h5>{tr('Nội dung & hạn nộp')}</h5>{(payload.weeks as Week[]||[]).map(w=><p key={w.week}><span>{tr('T{0}',[w.week])} · {tr(w.title)}</span><b>{shortDate(w.due)}</b></p>)}</section>
   </div></details>
  </article>
 </li>})}</ol>;
}
