import LecturerPageFrame from '../../LecturerPageFrame';
import type { LecturerQuery } from '../../../lib/lecturer-pages';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<LecturerQuery>}) {
  return <LecturerPageFrame section="similarity" searchParams={searchParams}/>;
}
