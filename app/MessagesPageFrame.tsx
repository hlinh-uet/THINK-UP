import { cookies } from 'next/headers';
import { notFound,redirect } from 'next/navigation';
import { homePath,type Role } from '../lib/access';
import { languageCookie,resolveLanguage } from '../lib/i18n';
import { loadWorkspaceData } from '../lib/workspace';
import { pageRequest } from '../lib/page-request';
import { AppError,database } from '../lib/server';
import { messageStore } from '../lib/message-store';
import { MessageError } from '../lib/messaging';
import MessagesWorkspace from './MessagesWorkspace';

export default async function MessagesPageFrame({workspaceRole,searchParams}:{workspaceRole:Role;searchParams:Promise<{peer?:string}>}) {
  let data;
  try{data=await loadWorkspaceData(await pageRequest(homePath(workspaceRole)))}catch(error){if(error instanceof AppError&&[401,403].includes(error.status))redirect('/login');throw error}
  if(!data.user)redirect('/login');
  if(data.user.role!==workspaceRole)redirect(homePath(data.user.role as Role));
  const preferences=await cookies(),language=resolveLanguage(preferences.get(languageCookie)?.value);
  const query=await searchParams,store=messageStore(database());
  let thread=null;
  if(query.peer){try{thread=await store.thread(data.user.id,query.peer)}catch(error){if(error instanceof MessageError&&[400,404].includes(error.status))notFound();throw error}}
  return <MessagesWorkspace user={data.user} language={language} initialInbox={await store.inbox(data.user.id)} initialThread={thread}/>;
}
