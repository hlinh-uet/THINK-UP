export const adminPages = [
  {key:'courses',label:'Học phần',icon:'journey',description:'Tạo học phần, thiết lập hành trình 9 tuần và rubric cho từng lớp.'},
  {key:'users',label:'Người dùng',icon:'users',description:'Quản lý sinh viên, giảng viên, tài khoản và phân công học phần.'},
  {key:'settings',label:'Cài đặt & quyền truy cập',icon:'admin',description:'Kiểm tra kết nối AI, cấu hình mặc định và quyền của từng vai trò.'},
  {key:'submissions',label:'Bài nộp toàn hệ thống',icon:'document',description:'Theo dõi bài nộp và các đánh giá trong toàn bộ học phần.'},
  {key:'progress',label:'Tiến độ học tập',icon:'progress',description:'Theo dõi tiến bộ và nhu cầu hỗ trợ của sinh viên trên toàn hệ thống.'},
  {key:'similarity',label:'Kiểm tra trùng lặp',icon:'similarity',description:'Đối chiếu bài nộp giữa các học phần và xem những đoạn trùng lặp.'},
  {key:'messages',label:'Tin nhắn',icon:'messages',description:'Trao đổi trực tiếp với sinh viên, giảng viên và quản trị viên.'},
] as const;

export type AdminSection = typeof adminPages[number]['key'];
export type AdminQuery = {course?:string;role?:string;reflection?:string};

export function isAdminMonitoring(section: AdminSection) {
  return ['submissions','progress','similarity'].includes(section);
}

export function adminHref(section: AdminSection, query: AdminQuery = {}) {
  const params=new URLSearchParams();
  if(isAdminMonitoring(section)&&query.course)params.set('course',query.course);
  if(section==='users'&&['student','lecturer','admin'].includes(query.role||''))params.set('role',query.role!);
  if(section==='submissions'&&query.reflection)params.set('reflection',query.reflection);
  return `/admin/${section}`+(params.size?`?${params}`:'');
}

/** Preserve bookmarks from the former admin tabs, within the admin workspace. */
export function legacyAdminHref(query: AdminQuery & {view?:string;tab?:string}) {
  const section:AdminSection=query.view==='lecturer'
    ?query.tab==='progress'?'progress':query.tab==='similarity'?'similarity':'submissions'
    :query.tab==='users'?'users':query.tab==='settings'?'settings':'courses';
  return adminHref(section,query);
}
