import AdminPageFrame, { adminMetadata } from '../../AdminPageFrame';
import type { AdminQuery } from '../../../lib/admin-pages';
export const dynamic='force-dynamic';
export const generateMetadata=adminMetadata('users');
export default function Page({searchParams}:{searchParams:Promise<AdminQuery>}) {
  return <AdminPageFrame section='users' searchParams={searchParams}/>;
}
