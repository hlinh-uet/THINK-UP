import { redirect } from 'next/navigation';
import { lecturerHref, type LecturerQuery } from '../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export default async function LecturerPage({searchParams}:{searchParams:Promise<LecturerQuery & {view?:string;tab?:string}>}) {
  const {tab,view,...query}=await searchParams;
  const section=tab==='progress'?'progress':tab==='similarity'?'similarity':'overview';
  // Legacy entry links keep the selected class and course.
  void view;
  redirect(lecturerHref(section,query));
}
