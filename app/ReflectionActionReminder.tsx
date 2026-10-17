'use client';

import type { Action, Reflection } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import UiIcon from './UiIcon';

export default function ReflectionActionReminder({previous,language,onReview}:{
  previous:{reflection:Reflection;actions:Action[]}|null;language:Language;onReview:(action:Action)=>void;
}) {
  if(!previous)return null;
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  return <details className="writing-action-reminder" id="reflection-action-reminder" open>
    <summary><UiIcon name="actions" size={17}/>{tr('Nhìn lại cam kết lần trước')}<span className="badge">{previous.actions.length}</span></summary>
    <p>{tr('Bạn đã thực hiện điều mình cam kết như thế nào?')}</p>
    <small className="muted">{tr('Từ bài viết tuần {0}',[previous.reflection.week])} · {demoText(previous.reflection.title,previous.reflection.id,language)}</small>
    <div className="previous-commitments">{previous.actions.map(action=><div className="previous-commitment" key={action.id}>
      <div><b>{demoText(action.text,action.id,language)}</b><span className="badge">{tr(action.status==='done'?'Hoàn thành':action.status==='in_progress'?'Đang thực hiện':'Chưa bắt đầu')}</span></div>
      {action.review&&<p>{demoText(action.review,action.id,language)}</p>}
      <button className="text-button" onClick={()=>onReview(action)}>{tr(action.status==='done'?'Xem lại cam kết':'Cập nhật kết quả')} ↗</button>
    </div>)}</div>
    <ul><li>{tr('Điều gì thuận lợi hoặc cản trở việc thực hiện?')}</li><li>{tr('Bạn có bằng chứng gì cho thấy mình đã tiến bộ?')}</li><li>{tr('Bạn cần điều chỉnh hành động tiếp theo như thế nào?')}</li></ul><p className="muted">{tr('Dùng kết quả thực hiện làm trải nghiệm để tiếp tục phản tư trong bài viết này.')}</p>
  </details>;
}
