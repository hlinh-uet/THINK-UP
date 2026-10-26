import { cookies } from 'next/headers';
import WorkspacePage from './WorkspacePage';
import { lecturerPages, type LecturerQuery, type LecturerSection } from '../lib/lecturer-pages';
import { languageCookie, resolveLanguage, translate } from '../lib/i18n';

// The server title must equal the one the client sets, or the streamed metadata fails to hydrate.
export function lecturerMetadata(section: LecturerSection) {
  return async function generateMetadata() {
    const language = resolveLanguage((await cookies()).get(languageCookie)?.value);
    return { title: translate(lecturerPages.find(p => p.key === section)!.label, language) + ' · THINK UP' };
  };
}

export default async function LecturerPageFrame({section, searchParams, reflectionId}: {
  section: LecturerSection; searchParams: Promise<LecturerQuery>; reflectionId?: string;
}) {
  return <WorkspacePage workspaceRole="lecturer" lecturerSection={section} lecturerQuery={await searchParams} lecturerReflectionId={reflectionId}/>;
}
