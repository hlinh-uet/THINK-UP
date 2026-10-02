import WorkspacePage from '../WorkspacePage';
export const dynamic='force-dynamic';
export default async function StudentPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const query=await searchParams;
  return <WorkspacePage role="student" requestedView={query.view}/>;
}
