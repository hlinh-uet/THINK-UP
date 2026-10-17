import WorkspacePage from './WorkspacePage';
import type { LecturerQuery, LecturerSection } from '../lib/lecturer-pages';

export default async function LecturerPageFrame({section, searchParams, reflectionId}: {
  section: LecturerSection; searchParams: Promise<LecturerQuery>; reflectionId?: string;
}) {
  return <WorkspacePage workspaceRole="lecturer" lecturerSection={section} lecturerQuery={await searchParams} lecturerReflectionId={reflectionId}/>;
}
