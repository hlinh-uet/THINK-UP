import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {homePath,type Role} from '../lib/access';
import {profileHref} from '../lib/profile';
import {pageRequest} from '../lib/page-request';
import {session,AppError,database} from '../lib/server';
import {profileStore} from '../lib/profile-store';
import {languageCookie,resolveLanguage} from '../lib/i18n';
import ProfileWorkspace from './ProfileWorkspace';
export default async function ProfilePageFrame({workspaceRole}:{workspaceRole:Role}) {
  let user;
  try{user=await session(await pageRequest(profileHref(workspaceRole)))}catch(error){if(error instanceof AppError&&[401,403].includes(error.status))redirect('/login');throw error}
  if(!user)redirect('/login');if(user.role!==workspaceRole)redirect(homePath(user.role as Role));
  const preferences=await cookies();
  return <ProfileWorkspace initialProfile={await profileStore(database()).load(user.id)} language={resolveLanguage(preferences.get(languageCookie)?.value)}/>;
}
