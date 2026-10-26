import {hasPermission,type Permission} from '../lib/permissions';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import ThinkUp from './ThinkUp';
import LecturerWorkspace from './LecturerWorkspace';
import AdminWorkspace from './AdminWorkspace';
import { lecturerScope, type LecturerQuery, type LecturerSection } from '../lib/lecturer-pages';
import type { AdminQuery, AdminSection } from '../lib/admin-pages';
import { homePath, resolveView, type Role } from '../lib/access';
import { pageRequest } from '../lib/page-request';
import { loadWorkspaceData } from '../lib/workspace';
import { AppError } from '../lib/server';
import { languageCookie, resolveLanguage, translate } from '../lib/i18n';

export default async function WorkspacePage({workspaceRole:role, requestedView, requestedAdminTab, requestedUserRole, requestedLecturerTab, lecturerSection='submissions', lecturerQuery={}, lecturerReflectionId,adminSection,adminQuery={}}: {workspaceRole: Role; requestedView?: string; requestedAdminTab?:string; requestedUserRole?:string;requestedLecturerTab?:string;lecturerSection?:LecturerSection;lecturerQuery?:LecturerQuery;lecturerReflectionId?:string;adminSection?:AdminSection;adminQuery?:AdminQuery}) {
  const preferences = await cookies();
  const language = resolveLanguage(preferences.get(languageCookie)?.value);
  let data;
  try { data = await loadWorkspaceData(await pageRequest(homePath(role)),{adminSection:role==='admin'?adminSection:undefined,courseId:adminQuery.course}); }
  catch (error) {
    if (!(error instanceof AppError) || ![401,403].includes(error.status)) throw error;
    return <main className="access-screen"><Link className="brand" href="/">think<span>up</span><i>↗</i></Link><h1>{translate('Không thể mở không gian',language)}</h1><p role="alert">{translate(error.message,language)}</p>{role==='admin'&&error.status===403&&<Link className="button primary" href="/admin/settings?settingsTab=permissions">{translate('Phân quyền',language)}</Link>}<Link className="button primary" href="/login">{translate('Đăng nhập',language)}</Link><Link className="text-button" href="/">{translate('Về trang chủ',language)}</Link></main>;
  }
  if (!data.user) redirect('/login');
  if (data.user.role !== role) redirect(homePath(data.user.role as Role));
  if(requestedView==='messages'||lecturerSection==='messages')redirect(`/${role}/messages`);
  if(role==='lecturer'){
    const required:Permission=lecturerSection==='courses'?'courses.manage':lecturerSection==='similarity'?'similarity.run':'submissions.read';
    if(!hasPermission(data.user,required))return <main className="access-screen"><h1>{translate('Không thể mở không gian',language)}</h1><p role="alert">{translate('Vai trò của bạn chưa được cấp quyền thực hiện thao tác này.',language)}</p><Link href="/lecturer/profile">{translate('Hồ sơ cá nhân',language)}</Link></main>;
    const scope=lecturerScope(data,lecturerQuery.course,lecturerQuery.cohort);
    if(lecturerQuery.course&&!scope.courses.some(c=>c.id===lecturerQuery.course))notFound();
    if(lecturerReflectionId&&!scope.reflections.some(r=>r.id===lecturerReflectionId))notFound();
    if(lecturerQuery.student&&!scope.students.some(u=>u.id===lecturerQuery.student))notFound();
    if(lecturerQuery.reflection&&!scope.reflections.some(r=>r.id===lecturerQuery.reflection&&['submitted','final'].includes(r.status)))notFound();
    return <LecturerWorkspace initialData={data} initialLanguage={language} section={lecturerSection} query={lecturerQuery} reflectionId={lecturerReflectionId}/>;
  }
  if(role==='admin'&&adminSection){
    if(adminQuery.course&&!data.courses.some(c=>c.id===adminQuery.course))notFound();
    return <AdminWorkspace initialData={data} initialLanguage={language} section={adminSection} query={adminQuery}/>;
  }
  if(role==='admin')redirect('/admin/users');
  return <ThinkUp initialLanguage={language} initialData={data} initialView={resolveView(role,requestedView)} initialAdminTab={requestedAdminTab} initialUserRole={requestedUserRole} initialLecturerTab={requestedLecturerTab}/>;
}
