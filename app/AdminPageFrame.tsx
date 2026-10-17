import WorkspacePage from './WorkspacePage';
import type { AdminQuery, AdminSection } from '../lib/admin-pages';

export default async function AdminPageFrame({section,searchParams}:{section:AdminSection;searchParams:Promise<AdminQuery>}) {
  return <WorkspacePage workspaceRole="admin" adminSection={section} adminQuery={await searchParams}/>;
}
