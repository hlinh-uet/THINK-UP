export {generateMetadata} from '../../CommunityPageFrame';
import CommunityPageFrame from '../../CommunityPageFrame';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<{post?:string}>}) {
  return <CommunityPageFrame workspaceRole='student' searchParams={searchParams}/>;
}
