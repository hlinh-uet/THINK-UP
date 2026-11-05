import type { Course, Week } from './domain';

export type CourseCopyParts = {rubric:boolean;content:boolean;due:boolean;commitment:boolean};
const dayMs=86400000;
const dayNumber=(date:string)=>Date.parse(`${date}T00:00:00.000Z`)/dayMs;
const shifted=(date:string,days:number)=>new Date((dayNumber(date)+days)*dayMs).toISOString().slice(0,10);

/** The first dated week anchors the move, so a course without a date in week 1 still keeps its spacing. */
export const anchorWeek=(weeks:Week[])=>weeks.find(w=>w.due);
export function shiftedDueDates(weeks:Week[],anchorDue:string) {
 const anchor=anchorWeek(weeks);if(!anchor)return weeks.map(()=>'');
 const days=dayNumber(anchorDue)-dayNumber(anchor.due);
 return weeks.map(w=>w.due?shifted(w.due,days):'');
}
/** Copies the chosen parts into a course. Its identity stays, and so do criterion names unless the viewer may change them. */
export function copyCourseSettings(target:Course,source:Course,parts:CourseCopyParts,{anchorDue='',keepCriterionNames=true}:{anchorDue?:string;keepCriterionNames?:boolean}={}):Course {
 const dates=parts.due&&anchorDue?shiftedDueDates(source.weeks,anchorDue):null;
 return {...target,
  weeks:target.weeks.map(week=>{
   const index=source.weeks.findIndex(w=>w.week===week.week);if(index<0)return week;
   const from=source.weeks[index];
   return {...week,...(parts.content?{title:from.title,prompt:from.prompt,requirements:from.requirements}:{}),...(dates?{due:dates[index]}:{})};
  }),
  rubric:parts.rubric?target.rubric.map(criterion=>{
   const from=source.rubric.find(c=>c.key===criterion.key);
   return from?{...criterion,weight:from.weight,descriptions:[...from.descriptions],...(keepCriterionNames?{}:{name:from.name})}:criterion;
  }):target.rubric,
  ...(parts.commitment?{commitmentDeadline:source.commitmentDeadline??null}:{}),
 };
}
