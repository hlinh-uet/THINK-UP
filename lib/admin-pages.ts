import type { LecturerQuery } from './lecturer-pages.ts';

// Administration and personal conversations; teaching tools have their own workspace.
export const adminPages = [
  {key:'users',label:'Người dùng',navLabel:'Người dùng',icon:'users',group:'Quản trị',description:'Tài khoản sinh viên, giảng viên và phân công học phần.'},
  {key:'courses',label:'Học phần',navLabel:'Học phần',icon:'journey',group:'Quản trị',description:'Tạo học phần, thiết lập hành trình 9 tuần và rubric cho từng lớp.'},
  {key:'settings',label:'Cài đặt & quyền truy cập',navLabel:'Cài đặt',icon:'admin',group:'Quản trị',description:'Cấu hình mặc định cho học phần mới, quyền theo vai trò và nhật ký thao tác.'},
  {key:'messages',label:'Tin nhắn',navLabel:'Tin nhắn',icon:'messages',group:'Quản trị',description:'Trao đổi trực tiếp với sinh viên và đồng nghiệp.'},
] as const;

export type AdminDestination = typeof adminPages[number]['key'];
export type AdminSection = Exclude<AdminDestination,'messages'>;
export type AdminQuery = LecturerQuery & {role?:string;settingsTab?:string};

export function adminHref(section: AdminDestination, query: AdminQuery = {}) {
  const params=new URLSearchParams();
  if(section==='courses'&&query.course)params.set('course',query.course);
  if(section==='users'&&['student','lecturer','admin'].includes(query.role||''))params.set('role',query.role!);
  if(section==='settings'&&['defaults','permissions','audit'].includes(query.settingsTab||''))params.set('settingsTab',query.settingsTab!);
  return `/admin/${section}`+(params.size?`?${params}`:'');
}

/** Preserve bookmarks from the former admin tabs, within the admin workspace. */
export function legacyAdminHref(query: AdminQuery & {view?:string;tab?:string}) {
  if(query.view==='messages'||query.tab==='messages')return adminHref('messages');
  const section:AdminSection=query.view==='lecturer'||['courses','progress','similarity','submissions'].includes(query.tab||'')?'courses':query.tab==='settings'?'settings':'users';
  return adminHref(section,query);
}
