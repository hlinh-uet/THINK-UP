import WorkspacePage from '../WorkspacePage';
export const dynamic='force-dynamic';
export default async function LecturerPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const query=await searchParams;
  return <WorkspacePage role="lecturer" requestedView={query.view}/>;
}
