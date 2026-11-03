import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { homePath,type Role } from '../lib/access';
import { languageCookie,resolveLanguage,translate } from '../lib/i18n';
import { pageRequest } from '../lib/page-request';
import { AppError,database,runtime,session } from '../lib/server';
import { communityStore } from '../lib/community-store';
import CommunityWorkspace from './CommunityWorkspace';

export async function generateMetadata(){
  const preferences=await cookies();
  return {title:translate('Cộng đồng',resolveLanguage(preferences.get(languageCookie)?.value))+' · THINK UP'};
}

export default async function CommunityPageFrame({workspaceRole,searchParams}:{workspaceRole:Role;searchParams:Promise<{post?:string}>}) {
  let user;
  try{user=await session(await pageRequest(homePath(workspaceRole)))}catch(error){if(error instanceof AppError&&[401,403].includes(error.status))redirect('/login');throw error}
  if(!user)redirect('/login');
  if(user.role!==workspaceRole)redirect(homePath(user.role as Role));
  const preferences=await cookies(),language=resolveLanguage(preferences.get(languageCookie)?.value);
  const query=await searchParams;
  return <CommunityWorkspace user={user} language={language} initialFeed={await communityStore(database(),runtime.FILES).feed(user)} focusPost={query.post}/>;
}
