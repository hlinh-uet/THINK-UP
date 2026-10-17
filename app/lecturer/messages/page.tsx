import MessagesPageFrame from '../../MessagesPageFrame';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<{peer?:string}>}) {
  return <MessagesPageFrame workspaceRole='lecturer' searchParams={searchParams}/>;
}
