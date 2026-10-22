import type {Action,Reflection,Week} from './domain.ts';
import {reflectionText,type ReflectionDraft} from './student-editor.ts';

export type StudentNextStep =
  | {kind:'revise'|'write'|'commit'|'waiting';reflection:Reflection;week:number}
  | {kind:'act';action:Action;week:number}
  | {kind:'start'|'complete';week:number};

/** Recommend work the student can actually act on, using their existing records. */
export function studentNextStep(reflections:Reflection[],actions:Action[],weeks:Week[],currentWeek:number):StudentNextStep {
  const recent=[...reflections].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const returned=recent.find(r=>r.status==='returned');
  if(returned)return {kind:'revise',reflection:returned,week:returned.week};
  const draft=recent.find(r=>r.status==='draft'&&r.week===currentWeek)||recent.find(r=>r.status==='draft');
  if(draft)return {kind:'write',reflection:draft,week:draft.week};
  const pending=[...actions].filter(a=>a.status!=='done').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'))[0];
  if(pending)return {kind:'act',action:pending,week:reflections.find(r=>r.id===pending.reflectionId)?.week||currentWeek};
  const submitted=recent.find(r=>r.status==='submitted'&&r.week===currentWeek);
  if(submitted)return {kind:actions.some(a=>a.reflectionId===submitted.id)?'waiting':'commit',reflection:submitted,week:submitted.week};
  const completed=new Set(reflections.filter(r=>r.status==='final').map(r=>r.week));
  return {kind:weeks.length>0&&weeks.every(w=>completed.has(w.week))?'complete':'start',week:currentWeek};
}

export function writingNextStep(draft:ReflectionDraft,{preview,feedbackSeen,hasLecturerFeedback,hasCourses}:{preview:boolean;feedbackSeen:boolean;hasLecturerFeedback:boolean;hasCourses:boolean}) {
  if(!['draft','returned'].includes(draft.status))return 'action';
  if(draft.status==='returned'&&hasLecturerFeedback&&!feedbackSeen)return 'feedback';
  if(!reflectionText(draft.content).trim())return 'write';
  if(!draft.courseId&&hasCourses)return 'course';
  return preview?'submit':'review';
}
