import { translate, type Language } from '../lib/i18n';
import UiIcon from './UiIcon';
import Link from 'next/link';

export default function SiteFooter({language,compact=false,onHelp}:{language:Language;compact?:boolean;onHelp?:()=>void}) {
  const tr=(text:string)=>translate(text,language);
  // Full navigation invokes the workspace warning before leaving an unsaved assessment.
  // eslint-disable-next-line @next/next/no-html-link-for-pages
  if(compact)return <footer className="workspace-footer"><a href="/" className="footer-wordmark">think<span>up</span></a><span>{tr('Một chút suy ngẫm. Một bước tiến bộ.')}</span><div><a href="/#how-it-works">{tr('Về THINK UP')}</a>{onHelp&&<button onClick={onHelp}>{tr('Hướng dẫn sử dụng')}<UiIcon name="arrow" size={13}/></button>}</div></footer>;
  return <footer className="site-footer">
    <div className="site-footer-main"><div className="site-footer-brand"><Link className="brand" href="/">think<span>up</span><i><UiIcon name="arrow"/></i></Link><p>{tr('Một không gian để nhìn lại trải nghiệm, hiểu mình hơn và trưởng thành qua từng tuần.')}</p><span className="footer-motto">REFLECT · LEARN · ACT</span></div>
      <div className="site-footer-column"><h3>{tr('Khám phá')}</h3><Link href="/#how-it-works">{tr('Cách hoạt động')}</Link><Link href="/#for-you">{tr('Dành cho bạn')}</Link><Link href="/#questions">{tr('Câu hỏi thường gặp')}</Link></div>
      <div className="site-footer-column"><h3>{tr('Không gian của bạn')}</h3><Link href="/login">{tr('Đăng nhập')}</Link><Link href="/register">{tr('Tạo tài khoản')}</Link><Link href="/workspace">{tr('Tiếp tục hành trình')}<UiIcon name="arrow" size={14}/></Link></div>
    </div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} THINK UP</span><span>{tr('Bạn tự viết. THINK UP đồng hành.')}</span><a href="#page-top">{tr('Về đầu trang')}<UiIcon name="up" size={15}/></a></div>
  </footer>;
}
