import ThinkUp from './ThinkUp';
import { cookies } from 'next/headers';
import { languageCookie, resolveLanguage } from '../lib/i18n';
export default async function Home(){const preferences=await cookies();return <ThinkUp initialLanguage={resolveLanguage(preferences.get(languageCookie)?.value)}/>}
