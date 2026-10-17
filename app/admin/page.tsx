import { redirect } from 'next/navigation';
import { legacyAdminHref, type AdminQuery } from '../../lib/admin-pages';
export const dynamic='force-dynamic';
export default async function AdminPage({searchParams}:{searchParams:Promise<AdminQuery & {view?:string;tab?:string}>}) {
  redirect(legacyAdminHref(await searchParams));
}
