import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

/** Keep sample/version warnings visible together, with their full explanation one click away. */
export default function FeedbackProvenance({sample=false,stale=false,language}:{sample?:boolean;stale?:boolean;language:Language}){
 const tr=(text:string)=>translate(text,language);
 if(!sample&&!stale)return null;
 return <details className={`feedback-provenance${stale?' notice warning':''}`}>
  <summary><UiIcon name="help" size={15}/><span>{sample&&<b>{tr('Phản hồi mẫu')}</b>}{stale&&<b className="is-stale">{tr('Phản hồi cũ')}</b>}</span><UiIcon name="chevron" size={14}/></summary>
  {sample&&<p>{tr('Phản hồi mẫu có sẵn trong dữ liệu dùng thử, không phải kết quả AI thực tế. Bạn có thể yêu cầu AI phân tích lại bài viết.')}</p>}
  {stale&&<p>{tr('Phản hồi thuộc phiên bản trước. Phân tích lại sau khi chỉnh sửa.')}</p>}
 </details>;
}
