import type { Role } from './access.ts';

export const permissionDefinitions = [
  {key:'writing.manage',label:'Viết và chỉnh sửa bài',description:'Tạo bài, sửa bản nháp, thêm minh chứng và tự đánh giá.',roles:['student']},
  {key:'writing.submit',label:'Nộp bài',description:'Gửi bài viết cho giảng viên đánh giá.',roles:['student']},
  {key:'actions.manage',label:'Quản lý cam kết',description:'Tạo, cập nhật cam kết và tải minh chứng hành động.',roles:['student']},
  {key:'submissions.read',label:'Xem bài nộp và tiến bộ lớp',description:'Đọc bài đã nộp, hồ sơ sinh viên và tiến bộ trong học phần được phân công.',roles:['lecturer']},
  {key:'reviews.manage',label:'Chấm và trả bài',description:'Lưu nháp đánh giá, trả bài sửa và xác nhận điểm.',roles:['lecturer'],requires:'submissions.read'},
  {key:'ai.use',label:'Sử dụng trợ lý AI',description:'Yêu cầu AI gợi ý, phân tích và đề xuất đánh giá.',roles:['student','lecturer']},
  {key:'similarity.run',label:'Kiểm tra trùng lặp',description:'Đối chiếu bài nộp trong học phần được phân công.',roles:['lecturer'],requires:'submissions.read'},
  {key:'templates.manage',label:'Quản lý mẫu nhận xét',description:'Tạo, sửa và xóa mẫu nhận xét của bản thân.',roles:['lecturer']},
  {key:'courses.manage',label:'Cấu hình học phần',description:'Sửa nội dung tuần và rubric; quản trị viên có thể tạo học phần.',roles:['lecturer','admin']},
  {key:'users.manage',label:'Quản lý tài khoản và phân công',description:'Tạo, sửa tài khoản, đổi vai trò và cấp hoặc gỡ học phần.',roles:['admin']},
  {key:'defaults.manage',label:'Sửa cấu hình mặc định',description:'Thay đổi nội dung 9 tuần và rubric cho học phần mới.',roles:['admin']},
  {key:'audit.read',label:'Xem và xuất nhật ký',description:'Tra cứu thao tác và tải nhật ký dưới dạng CSV.',roles:['admin']},
  {key:'permissions.manage',label:'Cấu hình phân quyền',description:'Luôn bật để quản trị viên có thể khôi phục quyền truy cập.',roles:['admin'],locked:true},
  {key:'messages.use',label:'Sử dụng tin nhắn',description:'Xem và gửi tin nhắn trong hội thoại có bản thân tham gia.',roles:['student','lecturer','admin']},
] as const;
export type Permission = typeof permissionDefinitions[number]['key'];
export type RolePermissions = Record<Role,Permission[]>;
export type PermissionPolicy = {revision:number;roles:RolePermissions};
export const roleKeys:Role[]=['student','lecturer','admin'];
export function permissionsForRole(role:Role):Permission[]{return permissionDefinitions.filter(p=>(p.roles as readonly string[]).includes(role)).map(p=>p.key)}
export function defaultPermissions():RolePermissions{return {student:permissionsForRole('student'),lecturer:permissionsForRole('lecturer'),admin:permissionsForRole('admin')}}
export function normalizePermissionPolicy(value:unknown):PermissionPolicy{
  const stored=value&&typeof value==='object'?value as Partial<PermissionPolicy>:{};
  const defaults=defaultPermissions();
  for(const role of roleKeys)if(Array.isArray(stored.roles?.[role]))defaults[role]=permissionsForRole(role).filter(key=>key==='permissions.manage'||stored.roles![role].includes(key));
  return {revision:Number.isInteger(stored.revision)&&Number(stored.revision)>=0?Number(stored.revision):0,roles:defaults};
}
export function validateRolePermissions(value:unknown):RolePermissions{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Cấu hình phân quyền chưa hợp lệ.');
  const roles=value as Record<string,unknown>;
  if(Object.keys(roles).length!==3)throw new Error('Cấu hình cần đủ ba vai trò.');
  for(const role of roleKeys){
    const list=roles[role],allowed=permissionsForRole(role);
    if(!Array.isArray(list)||list.some(key=>!allowed.includes(key))||new Set(list).size!==list.length)throw new Error('Quyền không phù hợp với vai trò.');
    if(role==='admin'&&!list.includes('permissions.manage'))throw new Error('Không thể tắt quyền cấu hình phân quyền.');
    if(role==='lecturer'&&!list.includes('submissions.read')&&list.some(key=>['reviews.manage','ai.use','similarity.run'].includes(key)))throw new Error('Cần bật quyền xem bài nộp trước khi chấm bài, dùng AI hoặc kiểm tra trùng lặp.');
  }
  return normalizePermissionPolicy({roles}).roles;
}
export function hasPermission(user:{role:string;permissions?:readonly Permission[]}|null|undefined,key:Permission):boolean{
  if(!user||!roleKeys.includes(user.role as Role)||!permissionsForRole(user.role as Role).includes(key))return false;
  return user.permissions?user.permissions.includes(key):true;
}
export function toggleRolePermission(roles:RolePermissions,role:Role,key:Permission,enabled:boolean):RolePermissions{
  const next=new Set(roles[role]);
  if(enabled)next.add(key);else next.delete(key);
  if(role==='lecturer'){
    if(enabled&&['reviews.manage','ai.use','similarity.run'].includes(key))next.add('submissions.read');
    if(!enabled&&key==='submissions.read')for(const dependent of ['reviews.manage','ai.use','similarity.run'] as const)next.delete(dependent);
  }
  return {...roles,[role]:permissionsForRole(role).filter(permission=>next.has(permission)||permission==='permissions.manage')};
}
export function actionPermission(action:unknown,role:string):Permission|undefined{
  // Existing administrative API tools remain tied to course-management access.
  if(role==='admin'&&['review','review-analyze','reading-analyze','review-draft-save','template-save','template-remove'].includes(String(action)))return 'courses.manage';
  const permissions:Record<string,Permission>={save:'writing.manage',submit:'writing.submit',coach:'ai.use',feedback:'ai.use','action-save':'actions.manage',review:'reviews.manage','review-analyze':'ai.use','reading-analyze':'ai.use','review-draft-save':'reviews.manage','template-save':'templates.manage','template-remove':'templates.manage','self-assess':'writing.manage','course-save':'courses.manage','config-save':'defaults.manage','user-create':'users.manage','user-save':'users.manage',invite:'users.manage','invite-approve':'users.manage','invite-remove':'users.manage','membership-remove':'users.manage','retention-save':'defaults.manage','incident-save':'defaults.manage','permissions-save':'permissions.manage'};
  if(action==='archive-reflection'||action==='restore-reflection')return role==='admin'?'courses.manage':'writing.manage';
  return permissions[String(action)];
}
