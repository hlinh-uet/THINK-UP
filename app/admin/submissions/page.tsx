import { redirect } from 'next/navigation';
import { adminHref, type AdminQuery } from '../../../lib/admin-pages';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<AdminQuery>}) {
  const query=await searchParams;
  redirect(adminHref('courses',{course:query.course}));
}
