'use client';

import { useState } from 'react';
import type { Action, Reflection } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import CommitmentSheet from './CommitmentSheet';
import UiIcon from './UiIcon';

/** One quiet button beside the editor, opening the shared commitment sheet for the previous reflection. */
export default function ReflectionActionReminder({previous,reflections=[],language,busy=false,onReview,onSave}:{
  previous:{reflection:Reflection;actions:Action[]}|null;reflections?:Reflection[];language:Language;busy?:boolean;
  onReview:(action:Action)=>void;onSave?:(value:Partial<Action>)=>Promise<unknown>;
}) {
  const [open,setOpen]=useState(false);
  if(!previous)return null;
  const tr=(text:string,parameters:readonly unknown[]=[])=>translate(text,language,parameters);
  const pending=previous.actions.filter(a=>a.status!=='done').length;
  function start(){if(onSave)setOpen(true);else if(previous?.actions[0])onReview(previous.actions[0])}
  return <section className="commit-recall" id="reflection-action-reminder">
    <button type="button" className="commit-recall-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={start}>
      <span className="commit-recall-icon"><UiIcon name="actions" size={18}/></span>
      <span className="commit-recall-copy"><b>{tr('Nhìn lại cam kết lần trước')}</b><small>{tr('Tuần {0}',[previous.reflection.week])} · {tr('{0} cam kết',[previous.actions.length])}{pending>0&&<> · <em>{tr('{0} chưa hoàn thành',[pending])}</em></>}</small></span>
      <UiIcon name="next" size={16}/>
    </button>
    <CommitmentSheet source={previous.reflection} actions={previous.actions} reflections={reflections} language={language} busy={busy} open={open} onClose={()=>setOpen(false)} onSave={value=>onSave?onSave(value):Promise.resolve(false)}/>
  </section>;
}
