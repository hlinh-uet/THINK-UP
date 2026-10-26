import LecturerPageFrame, { lecturerMetadata } from '../../LecturerPageFrame';
import type { LecturerQuery } from '../../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export const generateMetadata=lecturerMetadata('courses');
export default function Page({searchParams}:{searchParams:Promise<LecturerQuery>}) {
  return <LecturerPageFrame section="courses" searchParams={searchParams}/>;
}
