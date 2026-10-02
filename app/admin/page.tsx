import WorkspacePage from '../WorkspacePage';
export const dynamic='force-dynamic';
export default async function AdminPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const query=await searchParams;
  return <WorkspacePage role="admin" requestedView={query.view}/>;
}
