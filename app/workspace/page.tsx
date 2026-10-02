import { redirect } from 'next/navigation';
import { session } from '../../lib/server';
import { pageRequest } from '../../lib/page-request';
import { homePath, isRole } from '../../lib/access';
export const dynamic='force-dynamic';
export default async function WorkspaceRedirect() {
  const user=await session(await pageRequest('/workspace'),false);
  redirect(user && isRole(user.role) ? homePath(user.role) : '/login');
}
