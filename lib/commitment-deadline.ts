import type {Action,CommitmentDeadline} from './domain';

export const commitmentZone='Asia/Ho_Chi_Minh';
export function validateCommitmentDeadline(value:unknown):CommitmentDeadline|null{
 if(value==null)return null;
 if(typeof value!=='object')throw new Error('Quy định hạn cam kết chưa hợp lệ.');
 const v=value as Record<string,unknown>;
 if(v.kind==='days'&&Number.isInteger(v.days)&&Number(v.days)>=1&&Number(v.days)<=365)return {kind:'days',days:Number(v.days)};
 if(v.kind==='fixed'&&typeof v.at==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v.at)&&Number.isFinite(Date.parse(v.at))&&new Date(v.at).toISOString()===v.at)return {kind:'fixed',at:v.at};
 throw new Error('Chọn thời hạn từ 1 đến 365 ngày hoặc ngày giờ cụ thể hợp lệ.');
}
export function deadlineDay(at:string){return new Date(at).toLocaleDateString('sv-SE',{timeZone:commitmentZone})}
export function policyDeadline(policy:CommitmentDeadline,createdAt:string){return policy.kind==='fixed'?policy.at:new Date(Date.parse(createdAt)+policy.days*864e5).toISOString()}
export function deadlineInput(at:string){return new Date(Date.parse(at)+7*3600e3).toISOString().slice(0,16)}
export function deadlineFromInput(value:string){return value?new Date(value+':00+07:00').toISOString():''}

/** Only unfinished work follows a changed course rule. Finished work keeps its original deadline. */
export function actionDeadline(action:Pick<Action,'status'|'createdAt'|'due'|'dueAt'|'deadlineSource'|'deadlinePolicy'>,policy?:CommitmentDeadline|null){
 if(action.status!=='done'&&policy){const dueAt=policyDeadline(policy,action.createdAt);return {due:deadlineDay(dueAt),dueAt,deadlineSource:'lecturer' as const,deadlinePolicy:policy}}
 return {due:action.due,dueAt:action.dueAt,deadlineSource:action.deadlineSource,deadlinePolicy:action.deadlinePolicy};
}
export function actionDueTime(action:Pick<Action,'due'|'dueAt'>){return action.dueAt?Date.parse(action.dueAt):action.due?Date.parse(action.due+'T23:59:59.999+07:00'):NaN}
export function actionOverdue(action:Pick<Action,'due'|'dueAt'|'status'>,now=Date.now()){return action.status!=='done'&&actionDueTime(action)<now}
export function actionCompletedLate(action:Pick<Action,'due'|'dueAt'|'status'|'completedAt'>){return action.status==='done'&&!!action.completedAt&&Date.parse(action.completedAt)>actionDueTime(action)}
export function actionTimingLabel(action:Action,now=Date.now()){
 return actionOverdue(action,now)?'Quá hạn':action.status==='done'?(actionCompletedLate(action)?'Hoàn thành muộn':action.completedAt&&Number.isFinite(actionDueTime(action))?'Hoàn thành đúng hạn':'Hoàn thành'):action.status==='in_progress'?'Đang thực hiện':action.status==='needs_adjustment'?'Cần điều chỉnh':'Chưa bắt đầu';
}
export function formatActionDeadline(action:Pick<Action,'due'|'dueAt'>,language:'vi'|'en'){
 if(!action.due&&!action.dueAt)return '';
 return new Intl.DateTimeFormat(language==='vi'?'vi-VN':'en-GB',{timeZone:commitmentZone,day:'2-digit',month:'2-digit',year:'numeric',...(action.dueAt?{hour:'2-digit',minute:'2-digit',hour12:false}:{})}).format(new Date(action.dueAt||action.due+'T12:00:00+07:00'));
}
