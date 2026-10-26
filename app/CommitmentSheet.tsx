'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Action, Reflection } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { demoText } from '../lib/demo-i18n';
import ActionEditor from './ActionEditor';
import UiIcon from './UiIcon';

const statusLabel=(status:string)=>status==='done'?'Hoàn thành':status==='in_progress'?'Đang thực hiện':status==='needs_adjustment'?'Cần điều chỉnh':'Chưa bắt đầu';

type Props={title?:string;source?:Reflection;actions:Action[];initialId?:string;reflections:Reflection[];language:Language;busy:boolean;
  open?:boolean;onClose:()=>void;onSave:(value:Partial<Action>)=>Promise<unknown>};

/** The one place a commitment outcome is updated: guidance and the reflection's commitments on the left,
 *  the outcome form for the chosen commitment on the right. Rendered in the app shell so toolbars cannot cover it. */
export default function CommitmentSheet({title='Nhìn lại cam kết lần trước',source,actions,initialId,reflections,language,busy,open=true,onClose,onSave}:Props){
  const [chosen,setChosen]=useState(initialId||actions.find(a=>a.status!=='done')?.id||actions[0]?.id);
  const closeRef=useRef<HTMLButtonElement>(null),closeAction=useRef(onClose);
  useEffect(()=>{closeAction.current=onClose});
  useEffect(()=>{
    if(!open)return;
    closeRef.current?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')closeAction.current()};
    addEventListener('keydown',key);return ()=>removeEventListener('keydown',key);
  },[open]);
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const dt=(text:string,id:string)=>demoText(text,id,language);
  const selected=actions.find(a=>a.id===chosen)||actions[0];
  const sheet=<div className="commit-recall-backdrop" hidden={!open}>
    <button type="button" className="commit-recall-scrim" tabIndex={-1} aria-label={tr('Đóng')} onClick={onClose}/>
    <div className="commit-recall-sheet" role="dialog" aria-modal="true" aria-labelledby="commit-recall-title">
      <aside className="commit-recall-guide">
        <h2 id="commit-recall-title">{tr(title)}</h2>
        {source&&<p className="commit-recall-source">{tr('Từ bài viết tuần {0}',[source.week])} · {dt(source.title,source.id)||tr('Reflection chưa đặt tên')}</p>}
        <ul className="commit-recall-list" aria-label={tr('Cam kết')}>{actions.map(action=><li key={action.id}>
          <button type="button" aria-pressed={action.id===selected?.id} className={`is-${action.status}`} onClick={()=>setChosen(action.id)}>
            <i aria-hidden="true"/><span>{dt(action.text,action.id)}</span><small>{tr(statusLabel(action.status))}</small>
            {action.review&&<q>{dt(action.review,action.id)}</q>}
          </button>
        </li>)}</ul>
        <div className="commit-recall-prompts">
          <b>{tr('Bạn đã thực hiện điều mình cam kết như thế nào?')}</b>
          <ul><li>{tr('Điều gì thuận lợi hoặc cản trở việc thực hiện?')}</li><li>{tr('Bạn có bằng chứng gì cho thấy mình đã tiến bộ?')}</li><li>{tr('Bạn cần điều chỉnh hành động tiếp theo như thế nào?')}</li></ul>
        </div>
        <small className="commit-recall-hint">{tr('Dùng kết quả thực hiện làm trải nghiệm để tiếp tục phản tư trong bài viết này.')}</small>
      </aside>
      <section className="commit-recall-form" aria-label={tr('Cập nhật kết quả')}>
        <header><h3>{tr(selected?.status==='done'?'Xem lại cam kết':'Cập nhật kết quả')}</h3><button ref={closeRef} type="button" className="commit-recall-close" aria-label={tr('Đóng')} onClick={onClose}><UiIcon name="close" size={18}/></button></header>
        {open&&selected&&<ActionEditor key={selected.id} initial={selected} reflections={reflections} language={language} busy={busy} onCancel={onClose} onSave={async value=>{if(await onSave(value))onClose()}}/>}
      </section>
    </div>
  </div>;
  return open&&typeof document!=='undefined'?createPortal(sheet,document.querySelector('.app-shell')||document.body):sheet;
}
