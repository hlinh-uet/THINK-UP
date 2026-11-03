import {type Action,type Criterion,type Reflection} from './domain.ts';
import {reviewScoresOnTen} from './assessment.ts';
import {analysisIsCurrent,finalReview} from './progress.ts';

/** Comparable lecturer scores only; missing weeks stay missing and old rubric keys stay distinct. */
export function studentProgressVisuals(reflections:Reflection[],actions:Action[],rubric:Criterion[]){
 const graded=reflections.filter(r=>finalReview(r));
 const criteria=rubric.map(c=>{
  const weeks=Array.from({length:9},(_,i)=>{
   const scores=graded.filter(r=>r.week===i+1).flatMap(r=>{
    const review=finalReview(r)!,index=review.rubric.findIndex(item=>item.key===c.key);
    const score=index<0?undefined:reviewScoresOnTen(review)[index];
    return typeof score==='number'&&Number.isFinite(score)?[score]:[];
   });
   return {week:i+1,count:scores.length,value:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null};
  });
  const points=weeks.filter(p=>p.value!==null),first=points[0],last=points.at(-1);
  const count=weeks.reduce((n,p)=>n+p.count,0);
  return {...c,weeks,count,average:count?weeks.reduce((n,p)=>n+(p.value??0)*p.count,0)/count:null,
   delta:points.length>1?last!.value!-first.value!:null,firstWeek:first?.week,lastWeek:last?.week};
 });
 const overallWeeks=Array.from({length:9},(_,i)=>({week:i+1,value:criteria.length&&criteria.every(c=>c.weeks[i].value!==null)?Math.round((criteria.reduce((sum,c)=>sum+c.weeks[i].value!*c.weight/100,0)+1e-9)*100)/100:null}));
 const comparable=overallWeeks.filter(p=>p.value!==null),first=comparable[0],latest=comparable.at(-1);
 const overallDelta=comparable.length>1?Math.round((latest!.value!-first.value!+1e-9)*100)/100:null;
 const mostImproved=overallDelta===null?undefined:criteria.map(c=>({key:c.key,name:c.name,delta:Math.round((c.weeks[latest!.week-1].value!-c.weeks[first.week-1].value!+1e-9)*10)/10})).filter(c=>c.delta>0).sort((a,b)=>b.delta-a.delta)[0];
 const change={weeks:overallWeeks,first,latest,delta:overallDelta,mostImproved};
 const assessedWeeks=new Set(graded.filter(r=>r.week>=1&&r.week<=9).map(r=>r.week));
 let streak=0,longestStreak=0;
 for(let week=1;week<=9;week++){streak=assessedWeeks.has(week)?streak+1:0;longestStreak=Math.max(longestStreak,streak)}
 const coach=reflections.flatMap(reflection=>reflection.analyses
  .filter(analysis=>['coach','feedback'].includes(analysis.kind)&&!analysis.result.reviewRequired&&analysisIsCurrent(reflection,analysis))
  .map(analysis=>({reflection,analysis}))).sort((a,b)=>b.analysis.createdAt.localeCompare(a.analysis.createdAt))[0];
 return {criteria,change,longestStreak,coach,milestones:[
  {key:'writing',value:graded.length,target:4},
  {key:'consistency',value:longestStreak,target:4},
  {key:'practice',value:actions.filter(a=>a.status==='done').length,target:3},
 ]};
}
