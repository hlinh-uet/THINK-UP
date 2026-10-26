import {normalizePermissionPolicy} from './permissions';
import { all, database, assertPermission } from './server';
import { records } from './learning-store';
import { attachAvatars } from './profile-store';
import type { Data, User } from './domain';

export const adminManagementSections = ['users', 'courses', 'settings'] as const;

/** Configuration pages need accounts and assignments, never submissions or teaching statistics. */
export async function adminManagementData(user:User,section:string,courseId:string|undefined,base:Pick<Data,'local'|'aiReady'|'aiProviders'>):Promise<Data> {
  if(section==='users')assertPermission(user,'users.manage');
  if(section==='courses')assertPermission(user,'courses.manage');
  const settingsPage=section==='settings';
  const [settings,courses,users,memberships,invitations,metadata,history]=await Promise.all([
    all<{key:string;value:string}>("SELECT key,value FROM settings WHERE key IN ('rubric','weeks','role-permissions')"),
    settingsPage?[]:all('SELECT * FROM courses ORDER BY created_at DESC'),
    settingsPage?[]:all<User>('SELECT id,email,name,role,active FROM users ORDER BY created_at'),
    settingsPage?[]:all<{id:string;course_id:string;user_id:string;role:string}>('SELECT * FROM memberships'),
    section==='users'?all<{id:string;email:string;name:string;role:string;course_id:string|null}>('SELECT * FROM invitations'):[],
    settingsPage?[]:records("SELECT * FROM learning_records WHERE kind='course-metadata'"),
    section==='courses'&&courseId?records("SELECT * FROM learning_records WHERE kind='course-history' AND course_id=? ORDER BY created_at DESC",courseId):[],
  ]);
  return {
    ...base,user,...(settingsPage?{permissionPolicy:normalizePermissionPolicy(settings.find(s=>s.key==='role-permissions')?JSON.parse(settings.find(s=>s.key==='role-permissions')!.value):undefined)}:{}),
    courses:courses.map(c=>({id:String(c.id),code:String(c.code),name:String(c.name),className:String(metadata.find(m=>m.courseId===c.id)?.payload.className||c.code),weeks:JSON.parse(String(c.weeks_json)),rubric:JSON.parse(String(c.rubric_json))})),
    users:await attachAvatars(database(),users),
    memberships:memberships.map(m=>({id:m.id,courseId:m.course_id,userId:m.user_id,role:m.role})),
    invitations:invitations.map(i=>({id:i.id,email:i.email,name:i.name,role:i.role,courseId:i.course_id})),
    reflections:[],classReflections:[],actions:[],classActions:[],participation:[],learningRecords:[...metadata,...history],
    rubric:JSON.parse(settings.find(s=>s.key==='rubric')!.value),weeks:JSON.parse(settings.find(s=>s.key==='weeks')!.value),
  };
}
