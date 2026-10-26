import LecturerPageFrame, { lecturerMetadata } from '../../LecturerPageFrame';
import type { LecturerQuery } from '../../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export const generateMetadata=lecturerMetadata('overview');
export default function Page({searchParams}:{searchParams:Promise<LecturerQuery>}) {
  return <LecturerPageFrame section="overview" searchParams={searchParams}/>;
}
