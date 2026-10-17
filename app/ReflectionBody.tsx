import { writingSections, type Content } from '../lib/domain';
import { demoText } from '../lib/demo-i18n';
import { translate, type Language } from '../lib/i18n';

export default function ReflectionBody({content,id,language,highlight=''}:{content:Content;id?:string;language:Language;highlight?:string}) {
  const render=(text:string)=>{const at=highlight?text.indexOf(highlight):-1;return at<0?text:<>{text.slice(0,at)}<mark>{text.slice(at,at+highlight.length)}</mark>{text.slice(at+highlight.length)}</>};
  const legacy=!!(content.soWhat.trim()||content.nowWhat.trim()||content.action.trim());
  if(!legacy)return <article className="review-section"><h4>{translate('Nội dung reflection',language)}</h4><p>{render(highlight?content.what:demoText(content.what,id,language))||translate('Chưa viết nội dung.',language)}</p></article>;
  return <>{writingSections.map((section,i)=><article className="review-section" key={section.key}><span className="eyebrow">0{i+1} · {section.label}</span><h4>{translate(section.name,language)}</h4><p>{render(highlight?content[section.key]:demoText(content[section.key],id,language))||translate('Chưa viết nội dung.',language)}</p></article>)}</>;
}
