import { demoText } from './demo-i18n.ts';
import type { Criterion, LearningRecord, Week } from './domain';
import { translate } from './i18n.ts';

export type CourseChangeGroup = 'info'|'rubric'|'due'|'week'|'deadline';
export type CourseChange = {group:CourseChangeGroup;field:'name'|'code'|'className'|'weight'|'criterion'|'description'|'due'|'title'|'prompt'|'requirements'|'deadline';week?:number;criterion?:string;level?:number;before:unknown;after:unknown};
export type CourseHistoryEntry = {record:LearningRecord;at:string;initial:boolean;current:boolean;showOwner:boolean;changes:CourseChange[]};

/** A snapshot saved from the English screen holds translations of the same text; that is not an edit. */
function sameText(before:unknown,after:unknown,courseId:string|null) {
 const canonical=(value:unknown)=>{const text=String(value??'');return translate(demoText(text,courseId,'en'),'en')};
 return before===after||canonical(before)===canonical(after);
}
function compare(previous:Record<string,unknown>,next:Record<string,unknown>,courseId:string|null) {
 const changes:CourseChange[]=[];
 for(const field of ['name','code','className'] as const)if(next[field]!==undefined&&!sameText(previous[field],next[field],courseId))changes.push({group:'info',field,before:previous[field],after:next[field]});
 const rubric=previous.rubric as Criterion[]|undefined||[];
 for(const criterion of next.rubric as Criterion[]|undefined||[]){
  const old=rubric.find(c=>c.key===criterion.key);if(!old)continue;
  if(!sameText(old.name,criterion.name,courseId))changes.push({group:'rubric',field:'criterion',criterion:old.name,before:old.name,after:criterion.name});
  if(old.weight!==criterion.weight)changes.push({group:'rubric',field:'weight',criterion:criterion.name,before:old.weight,after:criterion.weight});
  criterion.descriptions.forEach((text,level)=>{if(!sameText(old.descriptions[level],text,courseId))changes.push({group:'rubric',field:'description',criterion:criterion.name,level,before:old.descriptions[level],after:text})});
 }
 const weeks=previous.weeks as Week[]|undefined||[];
 for(const week of next.weeks as Week[]|undefined||[]){
  const old=weeks.find(w=>w.week===week.week);
  if((old?.due||'')!==(week.due||''))changes.push({group:'due',field:'due',week:week.week,criterion:week.title,before:old?.due,after:week.due});
  for(const field of ['title','prompt','requirements'] as const)if(!sameText(old?.[field],week[field],courseId))changes.push({group:'week',field,week:week.week,before:old?.[field],after:week[field]});
 }
 if(next.commitmentDeadline!==undefined&&JSON.stringify(previous.commitmentDeadline)!==JSON.stringify(next.commitmentDeadline))changes.push({group:'deadline',field:'deadline',before:previous.commitmentDeadline,after:next.commitmentDeadline});
 return changes;
}
/** Newest first. Each saved snapshot is compared with the one before it; the archived copy of an unchanged course is left out. */
export function courseHistoryEntries(records:LearningRecord[]):CourseHistoryEntry[] {
 const entries:CourseHistoryEntry[]=[];let previous:Record<string,unknown>|null=null;
 for(const record of [...records].sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){
  const changes:CourseChange[]=previous?compare(previous,record.payload,record.courseId):[],baseline=record.payload.baseline===true;
  if(!previous||!baseline||changes.length)entries.push({record,at:String(record.payload.effectiveAt||record.createdAt),initial:!previous,current:false,showOwner:!baseline,changes});
  previous={...(previous||{}),...record.payload};
 }
 entries.reverse();if(entries[0])entries[0].current=true;
 return entries;
}
/** The short sentence for one save, in the order the changes matter to a lecturer. */
export function courseChangeHeadlines(changes:CourseChange[]) {
 const has=(field:CourseChange['field'])=>changes.some(c=>c.field===field);
 return [has('weight')&&'Đổi trọng số rubric',has('description')&&'Sửa mô tả rubric',has('criterion')&&'Đổi tên tiêu chí',has('due')&&'Đổi hạn nộp',changes.some(c=>c.group==='week')&&'Sửa nội dung tuần',has('deadline')&&'Đổi hạn cam kết',changes.some(c=>c.group==='info')&&'Sửa thông tin học phần'].filter((text):text is string=>!!text);
}
