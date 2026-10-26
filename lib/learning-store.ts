import {all,one,prepare,now,id} from './server';
import type {Action,LearningRecord,Reflection,User,Participation} from './domain';

type Stored={id:string;kind:string;owner_id:string;reflection_id:string|null;course_id:string|null;version_id:string|null;payload_json:string;revision:number;created_at:string;updated_at:string};
export function parseLearningRecord(row:Stored):LearningRecord{return {id:row.id,kind:row.kind,ownerId:row.owner_id,reflectionId:row.reflection_id,courseId:row.course_id,versionId:row.version_id,payload:JSON.parse(row.payload_json),revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at};}
export async function records(sql:string,...args:unknown[]){return (await all<Stored>(sql,...args)).map(parseLearningRecord);}
export function recordInsert(recordId:string,kind:string,ownerId:string,reflectionId:string|null,courseId:string|null,versionId:string|null,payload:unknown){const stamp=now();return prepare('INSERT INTO learning_records (id,kind,owner_id,reflection_id,course_id,version_id,payload_json,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)',recordId,kind,ownerId,reflectionId,courseId,versionId,JSON.stringify(payload),stamp,stamp);}
export async function enrichReflections(rows:Reflection[],viewer?:User):Promise<Reflection[]>{
 if(!rows.length)return rows;
 const ids=JSON.stringify(rows.map(r=>r.id));
 // Reading reports contain unpublished teacher feedback. Default to withholding them.
 let readingAccess='';
 const readingArgs:string[]=[];
 if(viewer?.role==='admin'){
  readingAccess=" OR (kind='reading' AND owner_id=?)";
  readingArgs.push(viewer.id);
 }else if(viewer?.role==='lecturer'){
  readingAccess=" OR (kind='reading' AND owner_id=? AND EXISTS(SELECT 1 FROM memberships m WHERE m.course_id=learning_records.course_id AND m.user_id=? AND m.role='lecturer'))";
  readingArgs.push(viewer.id,viewer.id);
 }
 const extras=await records(`SELECT * FROM learning_records WHERE reflection_id IN (SELECT value FROM json_each(?)) AND (kind IN ('review-detail','self-assessment','archive')${readingAccess}) ORDER BY created_at DESC,rowid DESC`,ids,...readingArgs);
 const metadata=await records(`SELECT * FROM learning_records WHERE kind='course-metadata' AND course_id IN (SELECT value FROM json_each(?))`,JSON.stringify(rows.map(r=>r.courseId)));
 const turns=await all<{id:string;reflection_id:string;question:string;reply:string|null;created_at:string}>(`SELECT id,reflection_id,question,reply,created_at FROM reflection_coach_turns WHERE reflection_id IN (SELECT value FROM json_each(?)) AND status='completed' ORDER BY created_at`,ids);
 return rows.map(row=>{
  const linked=extras.filter(e=>e.reflectionId===row.id);
  return {...row,className:String(metadata.find(m=>m.courseId===row.courseId)?.payload.className||row.courseId||''),archived:linked.some(e=>e.kind==='archive'),readingReports:linked.filter(e=>e.kind==='reading'),selfAssessments:linked.filter(e=>e.kind==='self-assessment'),coachTurns:turns.filter(t=>t.reflection_id===row.id).map(({id,question,reply,created_at})=>({id,question,reply,createdAt:created_at})),reviews:row.reviews.map(review=>{
   const detail=linked.find(e=>e.kind==='review-detail'&&e.id===`review:${review.id}`);
   return {...review,scoreScale:detail?10 as const:4 as const,criteria:detail?.payload.criteria as typeof review.criteria,rubricVersion:detail?.payload.rubricVersion as string|undefined};
  })};
 });
}
export function parseAction(row:Record<string,unknown>):Action{return {id:String(row.id),userId:String(row.user_id),reflectionId:row.reflection_id?String(row.reflection_id):null,text:String(row.text),due:String(row.due),status:String(row.status),review:String(row.review),createdAt:String(row.created_at)};}
export async function enrichActions(rows:Action[]):Promise<Action[]>{
 if(!rows.length)return rows;
 const ids=JSON.stringify(rows.map(a=>`action:${a.id}`)),actionIds=JSON.stringify(rows.map(a=>a.id));
 const details=await records(`SELECT * FROM learning_records WHERE id IN (SELECT value FROM json_each(?)) AND kind='action'`,ids);
 const files=await records(`SELECT * FROM learning_records WHERE kind='action-evidence' AND json_extract(payload_json,'$.actionId') IN (SELECT value FROM json_each(?))`,actionIds);
 const history=await records(`SELECT * FROM learning_records WHERE kind='action-event' AND json_extract(payload_json,'$.actionId') IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC,rowid DESC`,actionIds);
 return rows.map(a=>{const detail=details.find(d=>d.id===`action:${a.id}`);return {...a,successCriteria:String(detail?.payload.successCriteria||''),evidence:String(detail?.payload.evidence||''),attachmentIds:(detail?.payload.attachmentIds||[]) as string[],followUpReflectionId:detail?.payload.followUpReflectionId as string|null||null,revision:detail?.revision||0,evidenceFiles:files.filter(f=>f.payload.actionId===a.id).map(f=>({id:f.id,name:String(f.payload.name),type:String(f.payload.type),size:Number(f.payload.size)})),history:history.filter(h=>h.payload.actionId===a.id)};});
}
export async function teachingExtras(user:User,courseIds:string[]){
 if(!courseIds.length)return {classActions:[] as Action[],participation:[] as Participation[]};
 const q=JSON.stringify(courseIds);
 const [actions,participation]=await Promise.all([
  all(`SELECT a.* FROM actions a JOIN reflections r ON r.id=a.reflection_id WHERE r.course_id IN (SELECT value FROM json_each(?)) AND r.status!='draft' AND NOT EXISTS(SELECT 1 FROM learning_records l WHERE l.kind='archive' AND l.reflection_id=r.id)`,q),
  all<{course_id:string;user_id:string;week:number;status:string;n:number}>(`SELECT course_id,user_id,week,status,count(*) n FROM reflections WHERE course_id IN (SELECT value FROM json_each(?)) AND NOT EXISTS(SELECT 1 FROM learning_records l WHERE l.kind='archive' AND l.reflection_id=reflections.id) GROUP BY course_id,user_id,week,status`,q),
 ]);
 const visible=await all<{id:string}>(`SELECT id FROM reflections WHERE course_id IN (SELECT value FROM json_each(?)) AND status!='draft' AND NOT EXISTS(SELECT 1 FROM learning_records l WHERE l.kind='archive' AND l.reflection_id=reflections.id)`,q);
 const visibleIds=new Set(visible.map(r=>r.id));
 const shared=(await enrichActions(actions.map(parseAction))).map(a=>({...a,followUpReflectionId:a.followUpReflectionId&&visibleIds.has(a.followUpReflectionId)?a.followUpReflectionId:null,history:a.history?.map(h=>({...h,payload:{...h.payload,followUpReflectionId:typeof h.payload.followUpReflectionId==='string'&&visibleIds.has(h.payload.followUpReflectionId)?h.payload.followUpReflectionId:null}}))}));
 // Only progress metadata is shared for private drafts: no id/title/content/versions.
 return {classActions:shared,participation:participation.map(p=>({courseId:p.course_id,userId:p.user_id,week:p.week,status:p.status,count:p.n}))};
}
export async function workspaceRecords(user:User,courseIds:string[]){
 const own=user.role!=='student'&&courseIds.length?await records(`SELECT * FROM learning_records WHERE owner_id=? AND kind IN ('review-draft','feedback-template') AND course_id IN (SELECT value FROM json_each(?)) ORDER BY updated_at DESC`,user.id,JSON.stringify(courseIds)):[];
 const history=courseIds.length?await records(`SELECT * FROM learning_records WHERE kind IN ('course-history','course-metadata') AND course_id IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC`,JSON.stringify(courseIds)):[];
 return [...own,...history];
}
export async function saveCourseHistory(user:User,courseId:string,payload:unknown){await recordInsert(id(),'course-history',user.id,null,courseId,null,payload).run();}

export async function archiveCourseBaseline(user:User,courseId:string){
 const row=await one<{name:string;code:string;weeks_json:string;rubric_json:string;created_at:string}>('SELECT * FROM courses WHERE id=?',courseId);if(!row)return;
 const stamp=now();await prepare("INSERT OR IGNORE INTO learning_records (id,kind,owner_id,course_id,payload_json,revision,created_at,updated_at) VALUES (?,'course-history',?,?,?,1,?,?)",`course-base:${courseId}`,user.id,courseId,JSON.stringify({name:row.name,code:row.code,weeks:JSON.parse(row.weeks_json),rubric:JSON.parse(row.rubric_json),effectiveAt:row.created_at,baseline:true}),stamp,stamp).run();
}
