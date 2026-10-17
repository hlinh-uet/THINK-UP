import LecturerPageFrame from '../../../LecturerPageFrame';
import type { LecturerQuery } from '../../../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<LecturerQuery>}) {
  return <LecturerPageFrame section="submissions" reflectionId={(await params).id} searchParams={searchParams}/>;
}
