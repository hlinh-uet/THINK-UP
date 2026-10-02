import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
export async function generateMetadata():Promise<Metadata>{const h=await headers();const host=h.get('x-forwarded-host')||h.get('host')||'localhost:3000';const protocol=/^(localhost|127\.0\.0\.1)(:|$)/.test(host)?'http':'https';const base=new URL(`${protocol}://${host}`);const title='THINK UP · Không gian phát triển năng lực phản tư';const description='Viết reflection, khám phá cùng AI Coach và biến trải nghiệm thành hành động qua hành trình 9 tuần.';const image=new URL('/og.png',base).toString();return {metadataBase:base,title,description,openGraph:{title,description,type:'website',locale:'vi_VN',images:[{url:image,alt:'THINK UP · Viết tốt hơn. Nghĩ sâu hơn.'}]},twitter:{card:'summary_large_image',title,description,images:[image]}}}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="vi"><body>{children}</body></html>}
