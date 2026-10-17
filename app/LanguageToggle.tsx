'use client';
import { translate, type Language } from '../lib/i18n';

export default function LanguageToggle({language,onChange,disabled=false,title}:{language:Language;onChange:(language:Language)=>void;disabled?:boolean;title?:string}) {
  return <div className="language-toggle" role="group" aria-label={translate('Ngôn ngữ',language)} title={title}>
    <button type="button" aria-label="English" aria-pressed={language==='en'} disabled={disabled} onClick={()=>onChange('en')}>EN</button>
    <button type="button" aria-label="Tiếng Việt" aria-pressed={language==='vi'} disabled={disabled} onClick={()=>onChange('vi')}>VN</button>
  </div>;
}
