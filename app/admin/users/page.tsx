import AdminPageFrame from '../../AdminPageFrame';
import type { AdminQuery } from '../../../lib/admin-pages';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<AdminQuery>}) {
  return <AdminPageFrame section='users' searchParams={searchParams}/>;
}
