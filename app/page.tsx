import PublicSite from './PublicSite';
import { cookies } from 'next/headers';
import { languageCookie, resolveLanguage } from '../lib/i18n';
export const dynamic='force-dynamic';
export default async function Home(){const preferences=await cookies();return <PublicSite initialLanguage={resolveLanguage(preferences.get(languageCookie)?.value)}/>}
