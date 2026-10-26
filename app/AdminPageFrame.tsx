import { cookies } from 'next/headers';
import WorkspacePage from './WorkspacePage';
import { adminPages, type AdminQuery, type AdminSection } from '../lib/admin-pages';
import { languageCookie, resolveLanguage, translate } from '../lib/i18n';

// The server title must equal the one the client sets, or the streamed metadata fails to hydrate.
export function adminMetadata(section: AdminSection) {
  return async function generateMetadata() {
    const language = resolveLanguage((await cookies()).get(languageCookie)?.value);
    return { title: translate(adminPages.find(p => p.key === section)!.label, language) + ' · THINK UP' };
  };
}

export default async function AdminPageFrame({section,searchParams}:{section:AdminSection;searchParams:Promise<AdminQuery>}) {
  return <WorkspacePage workspaceRole="admin" adminSection={section} adminQuery={await searchParams}/>;
}
