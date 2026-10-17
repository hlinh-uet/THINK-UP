import { redirect } from 'next/navigation';
import { lecturerHref } from '../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export default async function LecturerPage({searchParams}:{searchParams:Promise<{view?:string;tab?:string}>}) {
  const query=await searchParams;
  redirect(lecturerHref(query.tab==='progress'?'progress':query.tab==='similarity'?'similarity':'submissions'));
}
