import {criterionKeys,defaultRubric,type Action,type Criterion,type Reflection} from './domain.ts';
import {criterionLevel,reviewScoresOnTen,scoreOnTen} from './assessment.ts';
import {finalReview,currentFeedback} from './progress.ts';
export function classAnalytics(reflections:Reflection[],actions:Action[],rubric:Criterion[]){
 const final=reflections.filter(r=>finalReview(r));
 const criteria=rubric.map(c=>{
  const points=final.flatMap(r=>{const g=finalReview(r)!,index=g.rubric.findIndex(x=>x.key===c.key);if(index<0)return [];return [{score:reviewScoresOnTen(g)[index],level:g.criteria?.[index]?.level||(g.scoreScale===10?criterionLevel(g.scores[index]):g.scores[index]),legacy:g.scoreScale!==10}];});
  return {...c,count:points.length,missing:reflections.length-points.length,average:points.length?points.reduce((s,p)=>s+p.score,0)/points.length:null,legacy:points.filter(p=>p.legacy).length,distribution:[1,2,3,4].map(level=>points.filter(p=>p.level===level).length)};
 });
 const done=actions.filter(a=>a.status==='done').length;
 const difficulties=new Map<string,{text:string;count:number;reflectionIds:string[]}>();
 for(const r of reflections){const feedback=currentFeedback(r);if(!feedback||feedback.result.reviewRequired)continue;for(const text of new Set(feedback.result.development)){const k=text.trim().toLocaleLowerCase();if(!k)continue;const item=difficulties.get(k)||{text,count:0,reflectionIds:[]};item.count++;item.reflectionIds.push(r.id);difficulties.set(k,item);}}
 const paired=final.flatMap(r=>{const a=currentFeedback(r),g=finalReview(r)!;if(!a||JSON.stringify(a.rubric)!==JSON.stringify(g.rubric)||a.result.reviewRequired||a.result.criteria.length!==4||criterionKeys.some((key,i)=>a.result.criteria[i].key!==key||g.rubric[i]?.key!==key||a.result.criteria[i].score===null))return [];
  return a.result.criteria.map((c,i)=>({ai:scoreOnTen(c.score!,a.result.scoreScale),teacher:reviewScoresOnTen(g)[i],aiLevel:c.level||(a.result.scoreScale===10?criterionLevel(c.score!):c.score!),teacherLevel:g.criteria?.[i]?.level||(g.scoreScale===10?criterionLevel(g.scores[i]):g.scores[i])}));});
 return {criteria,students:new Set(reflections.map(r=>r.userId)).size,gradedStudents:new Set(final.map(r=>r.userId)).size,articles:reflections.length,graded:final.length,actions:{count:actions.length,done,rate:actions.length?done/actions.length:null,needsAdjustment:actions.filter(a=>a.status==='needs_adjustment').length},difficulties:[...difficulties.values()].sort((a,b)=>b.count-a.count),agreement:{pairs:paired.length,articles:paired.length/4,meanAbsoluteError:paired.length?paired.reduce((n,p)=>n+Math.abs(p.ai-p.teacher),0)/paired.length:null,levelAgreement:paired.length?paired.filter(p=>p.aiLevel===p.teacherLevel).length/paired.length:null}};
}
export function criterionTimeSeries(rows:Reflection[],rubric:Criterion[]){return [...rows].sort((a,b)=>a.week-b.week||a.createdAt.localeCompare(b.createdAt)).map(r=>{const g=finalReview(r);return {reflection:r,scores:rubric.map(c=>{const i=g?.rubric.findIndex(x=>x.key===c.key)??-1;return i<0?null:reviewScoresOnTen(g!)[i]})};});}
export function reportRows(rows:Reflection[],rubric:Criterion[]){return rows.map(r=>{
 const g=finalReview(r),a=currentFeedback(r),scores=g?reviewScoresOnTen(g):[];
 return [r.courseName||r.courseId,r.className||r.courseId,r.studentName||r.userId,r.studentEmail||'',r.week,r.title,r.status,a?.result.total??'',g?.total??'',g?.level??'',g?.scoreScale||4,...rubric.flatMap(c=>{const i=g?.rubric.findIndex(x=>x.key===c.key)??-1,detail=i>=0?g?.criteria?.[i]:null;return [i>=0?scores[i]:'',detail?.level??(i>=0?g?.scoreScale===10?criterionLevel(g!.scores[i]):g!.scores[i]:''),detail?.evidence||detail?.missingReason||'',detail?.reason||'',detail?.improvement||''];})];
 });}
export const reportHeaders=['Học phần','Lớp học phần','Sinh viên','Email','Tuần','Bài reflection','Trạng thái','AI đề xuất','Điểm cuối','Mức Kember của toàn bài','Thang điểm gốc',...defaultRubric.flatMap(c=>[`${c.label} /10`,`${c.label} Level`,`${c.label} evidence`,`${c.label} rationale`,`${c.label} improvement`])];
