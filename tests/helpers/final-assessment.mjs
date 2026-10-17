import {rubricVersion,criterionLevel} from '../../lib/assessment.ts';
/** Adapt older workflow scenarios to the new, explicit assessment request contract. */
export function finalAssessmentRequest(body,state){
 if(body.action!=='review')return body;
 const row=[...state.classReflections,...state.reflections].find(r=>r.id===body.id);if(!row)return body;
 const rubric=state.courses.find(c=>c.id===row.courseId)?.rubric||state.rubric;
 const criteria=body.decision==='final'&&Array.isArray(body.scores)?rubric.map((c,i)=>({key:c.key,score:body.scores[i]*2.5,level:criterionLevel(body.scores[i]*2.5),evidence:Object.values(row.content).find(s=>s.trim())||'',reason:'TEST The excerpt supports this criterion.',improvement:'TEST Explain another perspective with evidence.',attachmentNames:[]})):[];
 return {...body,sourceVersion:row.latestVersion,rubricVersion:rubricVersion(rubric),criteria};
}
