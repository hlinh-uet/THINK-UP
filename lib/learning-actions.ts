import {all,one,prepare,database,session,reflection,course,configFor,assertAdmin,AppError,str,id,now,log,isLocal,assertPermission} from './server';
import {records,recordInsert} from './learning-store';
import {validateAssessment,rubricVersion} from './assessment';
import {readWithAI} from './reading-ai';
import {totalScore,type User} from './domain';
import {actionPermission,normalizePermissionPolicy,validateRolePermissions} from './permissions';

export function assertStudent(user:User){if(user.role!=='student')throw new AppError('Thao tác này dành cho sinh viên.',403);}
export async function checkedAssessment(_user:User,row:Record<string,unknown>,value:unknown){
 const rubric=await configFor(row),attachments=await all<{name:string}>('SELECT name FROM attachments WHERE reflection_id=?',row.id);
 try{return validateAssessment(value,JSON.parse(String(row.content_json)),rubric,attachments.map(a=>a.name))}catch(e){throw new AppError(e instanceof Error?e.message:'Phiếu đánh giá chưa hợp lệ.')}
}
async function saveRecord(recordId:string,kind:string,user:User,row:Record<string,unknown>|null,payload:unknown,expected:unknown){
 if(!Number.isInteger(expected)||Number(expected)<0)throw new AppError('Thiếu phiên bản dữ liệu. Tải lại trước khi lưu.',409);
 const stamp=now(),revision=Number(expected);
 const result=await prepare(`INSERT INTO learning_records (id,kind,owner_id,reflection_id,course_id,version_id,payload_json,revision,created_at,updated_at)
 SELECT ?,?,?,?,?,?,?,1,?,? WHERE ?=0
 ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,version_id=excluded.version_id,revision=learning_records.revision+1,updated_at=excluded.updated_at WHERE learning_records.owner_id=? AND learning_records.kind=? AND learning_records.revision=?`,recordId,kind,user.id,row?.id||null,row?.course_id||null,row?.latest_version||null,JSON.stringify(payload),stamp,stamp,revision,user.id,kind,revision).run();
 // Existing records need an update path even when the INSERT SELECT predicate is false.
 if(revision>0){const updated=await prepare('UPDATE learning_records SET payload_json=?,version_id=?,revision=revision+1,updated_at=? WHERE id=? AND kind=? AND owner_id=? AND revision=?',JSON.stringify(payload),row?.latest_version||null,stamp,recordId,kind,user.id,revision).run();if(updated.meta.changes!==1)throw new AppError('Dữ liệu đã thay đổi ở phiên khác. Tải lại trước khi lưu.',409);}
 else if(result.meta.changes!==1)throw new AppError('Dữ liệu đã thay đổi ở phiên khác. Tải lại trước khi lưu.',409);
 return revision+1;
}
export async function saveAction(user:User,body:Record<string,unknown>){
 assertStudent(user);assertPermission(user,'actions.manage');
 const actionId=body.id?str(body.id,100,true):id();
 const prior=body.id?await one<Record<string,unknown>>('SELECT * FROM actions WHERE id=? AND user_id=?',actionId,user.id):null;
 if(body.id&&!prior)throw new AppError('Không tìm thấy cam kết.',404);
 const reflectionId=prior?.reflection_id?String(prior.reflection_id):body.reflectionId?str(body.reflectionId,100):null;
 const source=reflectionId?await reflection(user,reflectionId):null;
 if(source&&source.user_id!==user.id)throw new AppError('Chỉ lưu cam kết từ bài của bạn.',403);
 const text=str(body.text,1500,true),due=str(body.due||'',10),review=str(body.review||'',3000);
 if(due&&(!/^\d{4}-\d{2}-\d{2}$/.test(due)||Number.isNaN(Date.parse(due+'T12:00:00Z'))||new Date(due+'T12:00:00Z').toISOString().slice(0,10)!==due))throw new AppError('Ngày hạn chưa hợp lệ.');
 if(!['todo','in_progress','done','needs_adjustment'].includes(String(body.status)))throw new AppError('Trạng thái cam kết chưa hợp lệ.');
 if(body.status==='done'&&!review)throw new AppError('Hãy ghi lại kết quả thực hiện trước khi hoàn thành cam kết.');
 const details=await records("SELECT * FROM learning_records WHERE id=? AND kind='action' AND owner_id=?",`action:${actionId}`,user.id),previous=details[0];
 if(prior&&body.revision!==previous?.revision&&!(body.revision===0&&!previous))throw new AppError('Cam kết đã thay đổi. Tải lại trước khi lưu.',409);
 const successCriteria=str(body.successCriteria??previous?.payload.successCriteria??'',1500),evidence=str(body.evidence??previous?.payload.evidence??'',3000);
 const followUpReflectionId=body.followUpReflectionId?str(body.followUpReflectionId,100):null;
 if(followUpReflectionId){const follow=await reflection(user,followUpReflectionId);if(follow.user_id!==user.id||follow.id===reflectionId||follow.course_id!==source?.course_id)throw new AppError('Reflection tiếp nối cần là bài khác của bạn trong cùng học phần.');}
 const attachmentIds=body.attachmentIds??previous?.payload.attachmentIds??[];
 if(!Array.isArray(attachmentIds)||attachmentIds.length>3||attachmentIds.some(a=>typeof a!=='string'))throw new AppError('Minh chứng cam kết chưa hợp lệ.');
 if(attachmentIds.length){const files=await all<{id:string}>('SELECT id FROM attachments WHERE reflection_id=?',reflectionId);if(attachmentIds.some(a=>!files.some(f=>f.id===a)))throw new AppError('Minh chứng cần thuộc bài reflection nguồn.');}
 const payload={successCriteria,evidence,attachmentIds,followUpReflectionId};
 const stamp=now(),event={actionId,text,due,status:body.status,review,...payload};
 // Guard the complete write batch with a revision assertion; a failed assertion rolls back every write.
 const guard=previous?prepare("INSERT INTO learning_records (id,kind,owner_id,payload_json,revision,created_at,updated_at) SELECT 'revision-conflict','guard',?,'{}',NULL,?,? WHERE NOT EXISTS(SELECT 1 FROM learning_records WHERE id=? AND revision=?)",user.id,stamp,stamp,previous.id,previous.revision):prepare("INSERT INTO learning_records (id,kind,owner_id,payload_json,revision,created_at,updated_at) SELECT 'revision-conflict','guard',?,'{}',NULL,?,? WHERE EXISTS(SELECT 1 FROM learning_records WHERE id=?)",user.id,stamp,stamp,`action:${actionId}`);
 try{await database().batch([guard,
  ...(prior?[prepare('UPDATE actions SET text=?,due=?,status=?,review=? WHERE id=? AND user_id=?',text,due,body.status,review,actionId,user.id)]:[prepare('INSERT INTO actions (id,user_id,reflection_id,text,due,status,review,created_at) VALUES (?,?,?,?,?,?,?,?)',actionId,user.id,reflectionId,text,due,body.status,review,stamp)]),
  ...(previous?[prepare('UPDATE learning_records SET payload_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?',JSON.stringify(payload),stamp,previous.id,previous.revision)]:[recordInsert(`action:${actionId}`,'action',user.id,reflectionId,source?.course_id?String(source.course_id):null,null,payload)]),
  recordInsert(id(),'action-event',user.id,reflectionId,source?.course_id?String(source.course_id):null,null,event),
 ])}catch(e){if(e instanceof Error&&/NOT NULL|revision-conflict/.test(e.message))throw new AppError('Cam kết đã thay đổi. Tải lại trước khi lưu.',409);throw e;}
 await log(user,'action-save',actionId,{status:body.status});return {id:actionId,revision:(previous?.revision||0)+1};
}
export async function learningAction(request:Request,user:User,body:Record<string,unknown>){
 const action=body.action;
 const permission=actionPermission(action,user.role);if(permission)assertPermission(user,permission);
 if(action==='permissions-save'){
  assertAdmin(user);let roles;try{roles=validateRolePermissions(body.roles)}catch(e){throw new AppError(e instanceof Error?e.message:'Cấu hình phân quyền chưa hợp lệ.')}
  const prior=await one<{value:string}>("SELECT value FROM settings WHERE key='role-permissions'"),policy=normalizePermissionPolicy(prior?JSON.parse(prior.value):undefined);
  if(body.revision!==policy.revision)throw new AppError('Phân quyền đã thay đổi ở phiên khác. Tải lại trước khi lưu.',409);
  const next={revision:policy.revision+1,roles},value=JSON.stringify(next);
  const saved=await prepare("INSERT INTO settings (key,value) VALUES ('role-permissions',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE settings.value=?",value,prior?.value??'').run();
  if(saved.meta.changes!==1)throw new AppError('Phân quyền đã thay đổi ở phiên khác. Tải lại trước khi lưu.',409);
  await log(user,'permissions-save','system',{before:policy.roles,after:roles});return {ok:true,policy:next};
 }
 if(action==='reading-analyze'){
  const row=await reflection(user,str(body.id,100,true),'review');
  if(!['submitted','final'].includes(String(row.status))||body.rev!==row.rev)throw new AppError('Bài đã thay đổi hoặc đang chỉnh sửa. Tải lại trước khi phân tích.',409);
  const rubric=await configFor(row),output=await readWithAI(user.id,String(row.id),String(row.title),JSON.parse(String(row.content_json)),rubric,body.language==='vi'?'vi':'en',body.includeAttachments===true,{local:isLocal(request),provider:body.aiProvider});
  const live=(await session(request))!;assertPermission(live,live.role==='admin'?'courses.manage':'ai.use');const latest=await reflection(live,String(row.id),'review');if(latest.rev!==row.rev)throw new AppError('Bài đã thay đổi. Phân tích chưa được lưu.',409);
  const reportId=id(),stamp=now();
  const saved=await prepare("INSERT INTO learning_records (id,kind,owner_id,reflection_id,course_id,version_id,payload_json,revision,created_at,updated_at) SELECT ?,'reading',?,id,course_id,latest_version,?,1,?,? FROM reflections WHERE id=? AND rev=? AND status IN ('submitted','final')",reportId,user.id,JSON.stringify({...output,rubricVersion:rubricVersion(rubric),includeAttachments:body.includeAttachments===true}),stamp,stamp,row.id,row.rev).run();
  if(saved.meta.changes!==1)throw new AppError('Bài đã thay đổi. Phân tích chưa được lưu.',409);
  await log(live,'reading-analyze',String(row.id));return {id:reportId,...output};
 }
 if(action==='review-draft-save'){
  const row=await reflection(user,str(body.id,100,true),'review');if(!['submitted','final'].includes(String(row.status))||body.rev!==row.rev)throw new AppError('Bài đã thay đổi. Tải lại trước khi lưu nháp.',409);
  const payload={comment:str(body.comment||'',8000),criteria:body.criteria,level:body.level,feedback:body.feedback,sourceVersion:row.latest_version,rubricVersion:rubricVersion(await configFor(row))};
  if(JSON.stringify(payload).length>40000)throw new AppError('Phiếu đánh giá quá dài.');
  const revision=await saveRecord(`draft:${user.id}:${row.id}`,'review-draft',user,row,payload,body.draftRevision);
  await log(user,'review-draft-save',String(row.id));return {revision};
 }
 if(action==='template-save'){
  if(!['lecturer','admin'].includes(user.role))throw new AppError('Cần quyền giảng viên hoặc quản trị viên.',403);
  const courseId=str(body.courseId,100,true);await course(user,courseId,true);
  const criterionKey=str(body.criterionKey||'all',100),title=str(body.title,150,true),text=str(body.text,8000,true);
  if(!['all','reflectionDepth','evidenceContext','insight','actionPlan'].includes(criterionKey))throw new AppError('Tiêu chí mẫu chưa hợp lệ.');
  const recordId=id();await recordInsert(recordId,'feedback-template',user.id,null,courseId,null,{criterionKey,title,text}).run();await log(user,'template-save',recordId);return {id:recordId};
 }
 if(action==='template-remove'){
  if(!['lecturer','admin'].includes(user.role))throw new AppError('Cần quyền giảng viên hoặc quản trị viên.',403);
  const recordId=str(body.id,100,true);
  const template=(await records("SELECT * FROM learning_records WHERE id=? AND kind='feedback-template' AND owner_id=?",recordId,user.id))[0];
  if(!template?.courseId)throw new AppError('Không tìm thấy mẫu nhận xét.',404);
  await course(user,template.courseId,true);
  const result=await prepare("DELETE FROM learning_records WHERE id=? AND kind='feedback-template' AND owner_id=?",recordId,user.id).run();if(!result.meta.changes)throw new AppError('Không tìm thấy mẫu nhận xét.',404);await log(user,'template-remove',recordId);return {ok:true};
 }
 if(action==='self-assess'){
  assertStudent(user);const row=await reflection(user,str(body.id,100,true),'write');if(body.rev!==row.rev)throw new AppError('Lưu phiên bản mới nhất trước khi tự đánh giá.',409);
  const rubric=await configFor(row);if(body.rubricVersion!==rubricVersion(rubric))throw new AppError('Phiên bản bài hoặc rubric đã thay đổi. Tải lại trước khi xác nhận.',409);const criteria=await checkedAssessment(user,row,body.criteria);const recordId=id();
  await recordInsert(recordId,'self-assessment',user.id,String(row.id),row.course_id?String(row.course_id):null,String(row.latest_version),{criteria,total:totalScore(criteria.map(c=>c.score!),rubric),scoreScale:10,rubric,rubricVersion:rubricVersion(rubric)}).run();await log(user,'self-assess',String(row.id));return {id:recordId};
 }
 if(action==='archive-reflection'||action==='restore-reflection'){
  const row=await one<Record<string,unknown>>('SELECT * FROM reflections WHERE id=?',str(body.id,100,true));if(!row)throw new AppError('Không tìm thấy bài reflection.',404);
  if(row.user_id!==user.id&&user.role!=='admin')throw new AppError('Chỉ chủ bài hoặc quản trị viên được lưu trữ bài.',403);
  // Students may archive private work; submitted work remains available to its assessors.
  if(user.role!=='admin'&&row.status!=='draft')throw new AppError('Bài đã nộp cần quản trị viên xử lý yêu cầu lưu trữ.');
  if(action==='archive-reflection'){const stamp=now();await prepare("INSERT OR IGNORE INTO learning_records (id,kind,owner_id,reflection_id,course_id,version_id,payload_json,revision,created_at,updated_at) VALUES (?,'archive',?,?,?,?,?,1,?,?)",`archive:${row.id}`,String(row.user_id),row.id,row.course_id,row.latest_version,JSON.stringify({reason:str(body.reason||'',1000),actor:user.id}),stamp,stamp).run();}
  else await prepare("DELETE FROM learning_records WHERE id=? AND kind='archive'",`archive:${row.id}`).run();
  await log(user,String(action),String(row.id));return {ok:true};
 }
 if(action==='retention-save'){
  assertAdmin(user);const days=Number(body.days);if(!Number.isInteger(days)||days<30||days>3650)throw new AppError('Thời gian lưu trữ cần từ 30 đến 3650 ngày.');
  await prepare("INSERT INTO settings (key,value) VALUES ('retention',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify({days,policy:str(body.policy,5000,true),updatedAt:now()})).run();await log(user,'retention-save','system');return {ok:true};
 }
 if(action==='incident-save'){
  assertAdmin(user);const recordId=body.id?str(body.id,100,true):id(),payload={summary:str(body.summary,3000,true),response:str(body.response,5000,true),status:body.status==='closed'?'closed':'open'};if(body.id){const result=await prepare("UPDATE learning_records SET payload_json=?,revision=revision+1,updated_at=? WHERE id=? AND kind='incident' AND revision=?",JSON.stringify(payload),now(),recordId,body.revision).run();if(result.meta.changes!==1)throw new AppError('Dữ liệu đã thay đổi ở phiên khác. Tải lại trước khi lưu.',409);}else await recordInsert(recordId,'incident',user.id,null,null,null,payload).run();await log(user,'incident-save',recordId);return {id:recordId};
 }
 throw new AppError('Thao tác chưa được hỗ trợ.');
}
export async function learningState(user:User,mode:string){
 if(mode==='archives'){
  if(user.role==='admin')assertPermission(user,'courses.manage');
  const archived=await all(`SELECT r.id,r.title,r.week,r.status,l.created_at FROM learning_records l JOIN reflections r ON r.id=l.reflection_id WHERE l.kind='archive' ${user.role==='admin'?'':'AND r.user_id=?'} ORDER BY l.created_at DESC`,...(user.role==='admin'?[]:[user.id]));return {archived};
 }
 assertAdmin(user);
 if(mode==='permissions'){assertPermission(user,'permissions.manage');const stored=await one<{value:string}>("SELECT value FROM settings WHERE key='role-permissions'");return normalizePermissionPolicy(stored?JSON.parse(stored.value):undefined)}
 assertPermission(user,'audit.read');
 if(mode==='audit'){const audit=await all(`SELECT a.id,a.user_id,a.action,a.target_id,a.created_at,actor.name AS actor_name,COALESCE(target_user.name,target_reflection.title,target_course.code,'') AS target_label FROM audit a LEFT JOIN users actor ON actor.id=a.user_id LEFT JOIN users target_user ON target_user.id=a.target_id LEFT JOIN reflections target_reflection ON target_reflection.id=a.target_id LEFT JOIN courses target_course ON target_course.id=a.target_id ORDER BY a.created_at DESC,a.rowid DESC LIMIT 200`);return {audit}}
 const [audit,incidents,retention]=await Promise.all([all(`SELECT a.id,a.user_id,a.action,a.target_id,a.detail,a.created_at,actor.name AS actor_name,COALESCE(target_user.name,target_reflection.title,target_course.code,'') AS target_label FROM audit a LEFT JOIN users actor ON actor.id=a.user_id LEFT JOIN users target_user ON target_user.id=a.target_id LEFT JOIN reflections target_reflection ON target_reflection.id=a.target_id LEFT JOIN courses target_course ON target_course.id=a.target_id ORDER BY a.created_at DESC,a.rowid DESC LIMIT 200`),records("SELECT * FROM learning_records WHERE kind='incident' ORDER BY created_at DESC LIMIT 100"),one<{value:string}>("SELECT value FROM settings WHERE key='retention'")]);
 return {audit,incidents,retention:retention?JSON.parse(retention.value):{days:365,policy:'Lưu hồ sơ trong 365 ngày sau khi kết thúc học phần; rà soát trước khi xóa. Lưu trữ có thể khôi phục, không tự xóa dữ liệu.'}};
}
