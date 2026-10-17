import {reviewScoresOnTen} from './assessment.ts';
import { sectionKeys, criterionKeys, type Analysis, type Criterion, type Reflection } from './domain.ts';

export function currentFeedback(reflection: Reflection,rubric?:Criterion[]): Analysis | undefined {
  return reflection.analyses.find(a=>a.kind==='feedback'&&analysisIsCurrent(reflection,a)&&(!rubric||JSON.stringify(a.rubric)===JSON.stringify(rubric)));
}
export function analysisIsCurrent(reflection: Reflection, analysis: Analysis): boolean {
  const version=reflection.versions.find(v=>v.id===analysis.versionId);
  return !!version&&version.title===reflection.title&&sectionKeys.every(key=>version.content[key]===reflection.content[key]);
}
export function finalReview(reflection: Reflection) {
  return reflection.status==='final'?reflection.reviews.find(r=>r.decision==='final'&&r.scores.length===4):undefined;
}
export function learnerProgress(reflections: Reflection[]) {
  const final=reflections.filter(r=>finalReview(r));
  const courses=new Set(reflections.map(r=>r.courseId).filter(Boolean));
  const points=Array.from({length:9},(_,i)=>{
    const rows=final.filter(r=>r.week===i+1);
    const total=rows.length?rows.reduce((n,r)=>n+(finalReview(r)!.total||0),0)/rows.length:null;
    const level=rows.length?rows.reduce((n,r)=>n+(finalReview(r)!.level||0),0)/rows.length:null;
    return {week:i+1,count:rows.length,total,level};
  });
  const criteria=criterionKeys.map(key=>{
    const scores=final.flatMap(r=>{const review=finalReview(r)!,index=review.rubric.findIndex(c=>c.key===key);return index>=0?[reviewScoresOnTen(review)[index]]:[]});
    return {key,average:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,weak:scores.filter(s=>s<5.1).length,count:scores.length};
  });
  const finishedUnits=new Set(final.map(r=>`${r.courseId||'personal'}:${r.week}`)).size;
  return {submitted:reflections.length,final:final.length,pending:reflections.filter(r=>r.status==='submitted').length,
    revisions:reflections.reduce((n,r)=>n+r.versions.filter(v=>v.stage.startsWith('Revision')).length,0),
    finishedUnits,totalUnits:Math.max(1,courses.size)*9,points,criteria,
    average:final.length?final.reduce((n,r)=>n+(finalReview(r)!.total||0),0)/final.length:null};
}
