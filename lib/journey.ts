import type { Action, Reflection } from './domain';

/** An action belongs to a course/week through its source reflection. */
export function actionsForCourse(actions:Action[], reflections:Reflection[], courseId:string):Action[] {
  if(!courseId)return actions;
  const ids=new Set(reflections.filter(row=>row.courseId===courseId).map(row=>row.id));
  return actions.filter(action=>!!action.reflectionId&&ids.has(action.reflectionId));
}

/** Recall the latest earlier reflection with commitments, including completed ones. */
export function previousCommitments(draft:{id:string|null;courseId:string|null}, reflections:Reflection[], actions:Action[], now=Date.now()) {
  const current=reflections.find(row=>row.id===draft.id);
  const before=current?Date.parse(current.createdAt):now;
  const linkedIds=new Set(actions.map(action=>action.reflectionId));
  const reflection=reflections.filter(row=>row.id!==draft.id&&row.courseId===draft.courseId&&Date.parse(row.createdAt)<before&&linkedIds.has(row.id))
    .sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)||a.id.localeCompare(b.id))[0];
  return reflection?{reflection,actions:actions.filter(action=>action.reflectionId===reflection.id)}:null;
}
