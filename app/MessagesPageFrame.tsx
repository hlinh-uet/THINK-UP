import {hasPermission} from '../lib/permissions';
import { cookies } from 'next/headers';
import { notFound,redirect } from 'next/navigation';
import { homePath,type Role } from '../lib/access';
import { languageCookie,resolveLanguage,translate } from '../lib/i18n';
import { pageRequest } from '../lib/page-request';
import { AppError,database,session } from '../lib/server';
import { messageStore } from '../lib/message-store';
import { MessageError } from '../lib/messaging';
import MessagesWorkspace from './MessagesWorkspace';

export async function generateMetadata(){
  const preferences=await cookies();
  return {title:translate('Tin nhắn',resolveLanguage(preferences.get(languageCookie)?.value))+' · THINK UP'};
}

export default async function MessagesPageFrame({workspaceRole,searchParams}:{workspaceRole:Role;searchParams:Promise<{peer?:string}>}) {
  let user;
  try{user=await session(await pageRequest(homePath(workspaceRole)))}catch(error){if(error instanceof AppError&&[401,403].includes(error.status))redirect('/login');throw error}
  if(!user)redirect('/login');
  if(user.role!==workspaceRole)redirect(homePath(user.role as Role));
  const preferences=await cookies(),language=resolveLanguage(preferences.get(languageCookie)?.value);
  if(!hasPermission(user,'messages.use'))return <main className="access-screen"><h1>{translate('Tin nhắn',language)}</h1><p role="alert">{translate('Vai trò của bạn chưa được cấp quyền thực hiện thao tác này.',language)}</p><a href={homePath(workspaceRole)}>{translate('Về trang chủ',language)}</a></main>;
  const query=await searchParams,store=messageStore(database());
  let thread=null;
  if(query.peer){try{thread=await store.thread(user.id,query.peer)}catch(error){if(error instanceof MessageError&&[400,404].includes(error.status))notFound();throw error}}
  return <MessagesWorkspace user={user} language={language} initialInbox={await store.inbox(user.id)} initialThread={thread}/>;
}
