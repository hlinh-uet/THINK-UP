import type {Criterion,LearningRecord,Week} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
export default function CourseHistory({records,courseId,language}:{records:LearningRecord[];courseId?:string;language:Language}){
 const tr=(s:string)=>translate(s,language),rows=records.filter(r=>r.kind==='course-history'&&(!courseId||r.courseId===courseId));
 return <details className="panel section-margin course-history"><summary>{tr('Lịch sử cấu hình và rubric học phần')}</summary>{rows.map(r=><details key={r.id}><summary>{String(r.payload.code)} · {new Date(String(r.payload.effectiveAt||r.createdAt)).toLocaleString(language==='vi'?'vi-VN':'en-GB',{timeZone:'Asia/Ho_Chi_Minh'})}</summary><p>{String(r.payload.name)}</p>{(r.payload.rubric as Criterion[]||[]).map(c=><article key={c.key}><b>{tr(c.name)} · {c.weight}%</b><ol>{c.descriptions.map((d,i)=><li key={i}>{tr(d)}</li>)}</ol></article>)}{(r.payload.weeks as Week[]||[]).map(w=><p key={w.week}>T{w.week} · {w.title} · {w.due||'—'}<br/>{w.prompt}<br/>{w.requirements}</p>)}</details>)}{!rows.length&&<p>{tr('Các thay đổi cấu hình sẽ được lưu tại đây khi học phần được cập nhật.')}</p>}</details>;
}
