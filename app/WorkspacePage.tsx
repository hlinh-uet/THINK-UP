import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ThinkUp from './ThinkUp';
import LecturerWorkspace from './LecturerWorkspace';
import { lecturerScope, type LecturerQuery, type LecturerSection } from '../lib/lecturer-pages';
import { isAdminMonitoring, type AdminQuery, type AdminSection } from '../lib/admin-pages';
import { homePath, resolveView, type Role } from '../lib/access';
import { pageRequest } from '../lib/page-request';
import { loadWorkspaceData } from '../lib/workspace';
import { AppError } from '../lib/server';
import { languageCookie, resolveLanguage, translate } from '../lib/i18n';

export default async function WorkspacePage({workspaceRole:role, requestedView, requestedAdminTab, requestedUserRole, requestedLecturerTab, lecturerSection='submissions', lecturerQuery={}, lecturerReflectionId,adminSection,adminQuery={}}: {workspaceRole: Role; requestedView?: string; requestedAdminTab?:string; requestedUserRole?:string;requestedLecturerTab?:string;lecturerSection?:LecturerSection;lecturerQuery?:LecturerQuery;lecturerReflectionId?:string;adminSection?:AdminSection;adminQuery?:AdminQuery}) {
  const preferences = await cookies();
  const language = resolveLanguage(preferences.get(languageCookie)?.value);
  let data;
  try { data = await loadWorkspaceData(await pageRequest(homePath(role))); }
  catch (error) {
    if (!(error instanceof AppError) || ![401,403].includes(error.status)) throw error;
    return <main className="access-screen"><Link className="brand" href="/">think<span>up</span><i>↗</i></Link><h1>{translate('Không thể mở không gian',language)}</h1><p role="alert">{translate(error.message,language)}</p><Link className="button primary" href="/login">{translate('Đăng nhập',language)}</Link><Link className="text-button" href="/">{translate('Về trang chủ',language)}</Link></main>;
  }
  if (!data.user) redirect('/login');
  if (data.user.role !== role) redirect(homePath(data.user.role as Role));
  if(requestedView==='messages'||lecturerSection==='messages'||adminSection==='messages')redirect(`/${role}/messages`);
  if(role==='lecturer'){
    const scope=lecturerScope(data,lecturerQuery.course,lecturerQuery.cohort);
    if(lecturerQuery.course&&!scope.courses.some(c=>c.id===lecturerQuery.course))notFound();
    if(lecturerReflectionId&&!scope.reflections.some(r=>r.id===lecturerReflectionId))notFound();
    if(lecturerQuery.student&&!scope.students.some(u=>u.id===lecturerQuery.student))notFound();
    if(lecturerQuery.reflection&&!scope.reflections.some(r=>r.id===lecturerQuery.reflection&&['submitted','final'].includes(r.status)))notFound();
    return <LecturerWorkspace initialData={data} initialLanguage={language} section={lecturerSection} query={lecturerQuery} reflectionId={lecturerReflectionId}/>;
  }
  if(role==='admin'&&adminSection){
    if(isAdminMonitoring(adminSection)&&adminQuery.course&&!data.courses.some(c=>c.id===adminQuery.course))notFound();
    if(adminSection==='submissions'&&adminQuery.reflection&&!data.classReflections.some(r=>r.id===adminQuery.reflection&&(!adminQuery.course||r.courseId===adminQuery.course)))notFound();
    return <ThinkUp initialLanguage={language} initialData={data} initialView={isAdminMonitoring(adminSection)?'lecturer':'admin'} initialAdminTab={adminSection} initialUserRole={adminQuery.role} initialLecturerTab={isAdminMonitoring(adminSection)?adminSection:undefined} adminSection={adminSection} adminQuery={adminQuery}/>;
  }
  return <ThinkUp initialLanguage={language} initialData={data} initialView={resolveView(role,requestedView)} initialAdminTab={requestedAdminTab} initialUserRole={requestedUserRole} initialLecturerTab={requestedLecturerTab}/>;
}
