import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ThinkUp from './ThinkUp';
import { homePath, resolveView, type Role } from '../lib/access';
import { pageRequest } from '../lib/page-request';
import { loadWorkspaceData } from '../lib/workspace';
import { AppError } from '../lib/server';
import { languageCookie, resolveLanguage, translate } from '../lib/i18n';

export default async function WorkspacePage({role, requestedView}: {role: Role; requestedView?: string}) {
  const preferences = await cookies();
  const language = resolveLanguage(preferences.get(languageCookie)?.value);
  let data;
  try { data = await loadWorkspaceData(await pageRequest(homePath(role))); }
  catch (error) {
    if (!(error instanceof AppError) || ![401,403].includes(error.status)) throw error;
    return <main className="access-screen"><a className="brand" href="/">think<span>up</span><i>↗</i></a><h1>{translate('Không thể mở không gian',language)}</h1><p role="alert">{translate(error.message,language)}</p><a className="button primary" href="/login">{translate('Đăng nhập',language)}</a><a className="text-button" href="/">{translate('Về trang chủ',language)}</a></main>;
  }
  if (!data.user) redirect('/login');
  if (data.user.role !== role) redirect(homePath(data.user.role as Role));
  return <ThinkUp initialLanguage={language} initialData={data} initialView={resolveView(role,requestedView)}/>;
}
