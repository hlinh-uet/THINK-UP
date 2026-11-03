import {type Criterion,type Reflection} from './domain.ts';
import {reviewScoresOnTen} from './assessment.ts';

/** A small home-page summary of final lecturer assessments, matched by rubric key. */
export function studentSpaceSummary(reflections:Reflection[],rubric:Criterion[]){
 const assessed=reflections.filter(r=>r.status==='final').flatMap(reflection=>{
  const review=[...(reflection.reviews||[])].filter(r=>r.decision==='final'&&r.scores.length===4)
   .sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
  return review?[{review,week:reflection.week,scores:reviewScoresOnTen(review)}]:[];
 });
 const criteria=rubric.map(criterion=>{
  const scores=assessed.flatMap(({review,scores})=>{
   const index=review.rubric.findIndex(c=>c.key===criterion.key),score=scores[index];
   return typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=10?[score]:[];
  });
  return {key:criterion.key,name:criterion.name,count:scores.length,average:scores.length?scores.reduce((sum,n)=>sum+n,0)/scores.length:null};
 });
 const ranked=criteria.filter(c=>c.average!==null).sort((a,b)=>b.average!-a.average!);
 // A flat profile should not imply a meaningful strength/weakness distinction.
 const spread=ranked.length>1&&ranked[0].average!-ranked.at(-1)!.average!>=.1;
 const gradedCount=assessed.filter(({review,scores})=>rubric.some(c=>{
  const score=scores[review.rubric.findIndex(item=>item.key===c.key)];
  return typeof score==='number'&&Number.isFinite(score)&&score>=0&&score<=10;
 })).length;
 const latest=assessed.filter(({review})=>Number.isInteger(review.level)&&review.level!>=1&&review.level!<=4)
  .sort((a,b)=>b.review.createdAt.localeCompare(a.review.createdAt))[0];
 const assessedWeeks=[...new Set(assessed.map(item=>item.week).filter(week=>Number.isInteger(week)&&week>=1&&week<=9))].sort((a,b)=>a-b);
 let run=0,longestStreak=0,previous=0;
 for(const week of assessedWeeks){run=week===previous+1?run+1:1;longestStreak=Math.max(longestStreak,run);previous=week}
 return {criteria,gradedCount,leading:spread?ranked[0]:undefined,focus:spread?ranked.at(-1):undefined,
  level:latest?.review.level??null,levelWeek:latest?.week,assessedWeeks,longestStreak};
}
