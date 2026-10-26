import type { Metadata } from 'next';
import { headers, cookies } from 'next/headers';
import './globals.css';
import './reflection-theme.css';
import './workspace-layout.css';
import './student-progress.css';
import './journey.css';
import './workspace-theme.css';
import './student-overview.css';
import './reflection-editor.css';
import './student-learning.css';
import './language-picker.css';
import './workspace-navigation.css';
import './student-navigation.css';
import './student-experience.css';
import './course-picker.css';
import './messages.css';
import './action-editor.css';
import './workspace-ui.css';
import './staff-experience.css';
import './auth-experience.css';
import './student-ui.css';
import './lecturer.css';
import { translate, resolveLanguage, languageCookie } from '../lib/i18n';
export async function generateMetadata():Promise<Metadata>{const h=await headers();const preferences=await cookies();const language=resolveLanguage(preferences.get(languageCookie)?.value);const host=h.get('x-forwarded-host')||h.get('host')||'localhost:3000';const protocol=/^(localhost|127\.0\.0\.1)(:|$)/.test(host)?'http':'https';const base=new URL(`${protocol}://${host}`);const title=translate('THINK UP · Không gian phát triển năng lực phản tư',language);const description=translate('Viết reflection, khám phá cùng AI Coach và biến trải nghiệm thành hành động qua hành trình 9 tuần.',language);const image=new URL('/og-v2.png',base).toString();return {metadataBase:base,title,description,openGraph:{title,description,type:'website',locale:language==='vi'?'vi_VN':'en_GB',images:[{url:image,alt:translate('THINK UP · Viết tốt hơn. Nghĩ sâu hơn.',language)}]},twitter:{card:'summary_large_image',title,description,images:[image]}}}
export default async function RootLayout({children}:Readonly<{children:React.ReactNode}>){const preferences=await cookies();return <html lang={resolveLanguage(preferences.get(languageCookie)?.value)}><body>{children}</body></html>}
