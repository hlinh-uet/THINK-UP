import { redirect } from 'next/navigation';
import { adminHref } from '../../../lib/admin-pages';
export const dynamic='force-dynamic';
export default function Page() { redirect(adminHref('users')); }
