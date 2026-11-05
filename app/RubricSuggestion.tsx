'use client';
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { levelNames, levelRanges } from '../lib/assessment';
import type { Criterion } from '../lib/domain';
import { translate, type Language } from '../lib/i18n';
import { rubricSlideMaxBytes, type RubricSuggestion as Suggestion } from '../lib/rubric-suggestion';
import UiIcon from './UiIcon';

type Row=Suggestion['criteria'][number];
type Props={courseId:string;rubric:Criterion[];language:Language;onApply:(rows:Row[])=>void};
/** Proposes level descriptions from a PDF. Applied text only fills the draft; the lecturer still reviews and saves it. */
export default function RubricSuggestion({courseId,rubric,language,onApply}:Props) {
  const tr=(text:string,args:readonly unknown[]=[])=>translate(text,language,args);
  const picker=useRef<HTMLInputElement>(null);
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const [result,setResult]=useState<(Suggestion&{submissions:number;file:string})|null>(null),[handled,setHandled]=useState<Record<string,'applied'|'dismissed'>>({}),[step,setStep]=useState(0);
  const [editing,setEditing]=useState<{key:string;level:number;value:string}|null>(null),[edited,setEdited]=useState<string[]>([]);
  const editor=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{editor.current?.focus()},[editing?.key,editing?.level]);
  async function choose(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(file.type!=='application/pdf'){setError('Chọn slide ở định dạng PDF.');return}
    if(file.size>rubricSlideMaxBytes){setError('Slide cần nhỏ hơn 5 MB.');return}
    setPending(true);setError('');
    try{
      const form=new FormData();form.set('courseId',courseId);form.set('language',language);form.set('file',file);
      const response=await fetch('/api/rubric-suggestion',{method:'POST',body:form}),payload=await response.json().catch(()=>({})) as Suggestion&{submissions:number;error?:string};
      if(!response.ok)throw new Error(payload.error||'Chưa tạo được gợi ý. Rubric hiện tại không thay đổi.');
      setResult({...payload,file:file.name});setHandled({});setStep(0);setEditing(null);setEdited([]);
    }catch(e){setError(e instanceof Error?e.message:'Chưa tạo được gợi ý. Rubric hiện tại không thay đổi.')}
    finally{setPending(false)}
  }
  const rows=result?.criteria||[],active=rows[step],current=rubric.find(c=>c.key===active?.key),state=active&&handled[active.key];
  const open=rows.filter(row=>!handled[row.key]),done=rows.length>0&&!open.length;
  // Move to the next criterion still waiting for a decision, wrapping around to any that were skipped over.
  function advance(next:Record<string,'applied'|'dismissed'>){const index=[...rows.slice(step+1),...rows.slice(0,step)].find(row=>!next[row.key]);if(index)setStep(rows.indexOf(index))}
  function decide(value:'applied'|'dismissed'){const next={...handled,[active.key]:value};if(value==='applied')onApply([active]);setHandled(next);advance(next)}
  function applyAll(){onApply(open);setHandled({...handled,...Object.fromEntries(open.map(row=>[row.key,'applied' as const]))})}
  // An edit changes the suggestion only; it reaches the rubric through Apply and the course through Save.
  function saveEdit(){if(!result||!editing)return;const {key,level}=editing,value=editing.value.trim();if(!value)return;setResult({...result,criteria:result.criteria.map(row=>row.key===key?{...row,descriptions:row.descriptions.map((text,k)=>k===level?value:text)}:row)});setEdited(list=>[...new Set([...list,`${key}-${level}`])]);setEditing(null)}
  function editKeys(event:KeyboardEvent<HTMLTextAreaElement>){if(event.key==='Escape'){event.preventDefault();setEditing(null)}else if(event.key==='Enter'&&(event.metaKey||event.ctrlKey)){event.preventDefault();saveEdit()}}
  const stepStatus=(row:Row,i:number)=>handled[row.key]==='applied'?'Đã áp dụng':handled[row.key]==='dismissed'?'Đã bỏ qua':i===step?'Đang xem':'Chưa xem';
  return <section className="lx-rubric-ai">
    <div className="lx-rubric-ai-head">
      <span className="lx-rubric-ai-mark"><UiIcon name="sparkle" size={19}/></span>
      <div><h3>{tr('AI gợi ý rubric từ slide')}</h3><p>{tr('Tải slide của học phần, AI viết lại mô tả các mức cho sát nội dung. Bạn xem, sửa rồi mới lưu.')}</p><small>{tr('PDF, tối đa 5 MB · Dựa trên rubric mặc định, giữ nguyên 4 tiêu chí và trọng số')}</small></div>
      <input ref={picker} type="file" accept="application/pdf,.pdf" hidden onChange={choose}/>
      <button type="button" className="lx-btn is-primary" disabled={pending||!!editing} aria-busy={pending} onClick={()=>picker.current?.click()}><UiIcon name={pending?'spinner':'document'} size={15}/>{tr(pending?'AI đang đọc slide…':result?'Chọn slide khác':'Chọn slide PDF')}</button>
    </div>
    {(pending||error||result)&&<div className="lx-rubric-ai-body">
      <div aria-live="polite">{pending&&<p className="lx-muted">{tr('Việc này có thể mất vài phút với slide dài.')}</p>}</div>
      {error&&<p className="lx-notice is-error" role="alert">{tr(error)}</p>}
      {result&&active&&current&&<>
        <div className="lx-rubric-ai-source"><b><UiIcon name="document" size={14}/>{result.file}</b>{result.summary&&<p>{result.summary}</p>}</div>
        {result.submissions>0&&<p className="lx-notice is-warn">{tr('Học phần đã có {0} bài nộp. Bài đã chấm giữ rubric cũ, bài chấm sau khi lưu sẽ dùng rubric mới.',[result.submissions])}</p>}
        <div className="lx-rubric-steps" role="group" aria-label={tr('Các tiêu chí cần duyệt')}>{rows.map((row,i)=>{const criterion=rubric.find(c=>c.key===row.key);return <button type="button" key={row.key} aria-pressed={i===step} disabled={!!editing} className={handled[row.key]?`is-${handled[row.key]}`:''} onClick={()=>setStep(i)}>
          <i>{handled[row.key]==='applied'?<UiIcon name="check" size={13}/>:i+1}</i><span>{criterion?.name}<small>{criterion?.weight}% · {tr(stepStatus(row,i))}</small></span>
        </button>})}</div>
        <div className="lx-rubric-focus">{active.descriptions.map((text,k)=>{const open=editing?.key===active.key&&editing.level===k;return <article key={active.key+k} className={`course-rubric-level is-level-${k+1}${open?' is-editing':''}`}>
          <div className="course-rubric-level-head"><span><b>{tr('Mức {0}',[k+1])}</b><span>{tr(levelNames[k])}</span></span><div className="lx-rubric-level-tools">{edited.includes(`${active.key}-${k}`)&&<em>{tr('Đã chỉnh sửa')}</em>}<strong>{levelRanges[k][0]}–{levelRanges[k][1]}<small> / 10</small></strong>{state!=='applied'&&!open&&<button type="button" className="lx-rubric-edit" disabled={!!editing} aria-label={tr('Sửa mô tả mức {0}',[k+1])} title={tr('Sửa mô tả mức {0}',[k+1])} onClick={()=>setEditing({key:active.key,level:k,value:text})}><UiIcon name="editor" size={14}/></button>}</div></div>
          {open?<div className="lx-rubric-edit-form"><textarea ref={editor} rows={6} maxLength={1000} aria-label={tr('Sửa mô tả mức {0}',[k+1])} value={editing.value} onChange={event=>setEditing({...editing,value:event.target.value})} onKeyDown={editKeys}/><div><small>{editing.value.length}/1000</small><button type="button" className="lx-btn is-small" onClick={()=>setEditing(null)}>{tr('Hủy')}</button><button type="button" className="lx-btn is-small is-primary" disabled={!editing.value.trim()} onClick={saveEdit}><UiIcon name="check" size={14}/>{tr('Lưu')}</button></div></div>:<p className="lx-rubric-suggested">{text}</p>}
          <details><summary>{tr('Xem mô tả hiện tại')}</summary><p>{current.descriptions[k]}</p></details>
        </article>})}</div>
        <footer className="lx-rubric-ai-bar">
          <span>{editing?tr('Lưu hoặc hủy phần đang sửa trước khi áp dụng.'):done?tr('Đã duyệt xong. Bạn có thể sửa tiếp ở bên dưới, rồi bấm Lưu cấu hình.'):state==='applied'?tr('Đã áp dụng tiêu chí này. Bạn có thể sửa tiếp trong phần Tùy chỉnh rubric bên dưới.'):tr('Tiêu chí {0}/{1}',[step+1,rows.length])}</span>
          {open.length>1&&<button type="button" className="lx-btn" disabled={!!editing} onClick={applyAll}>{tr('Áp dụng tất cả')}</button>}
          {!state&&<button type="button" className="lx-btn" disabled={!!editing} onClick={()=>decide('dismissed')}>{tr('Bỏ qua')}</button>}
          {state!=='applied'&&<button type="button" className="lx-btn is-primary" disabled={!!editing} onClick={()=>decide('applied')}>{tr(open.filter(row=>row.key!==active.key).length?'Áp dụng và sang tiêu chí sau':'Áp dụng')}</button>}
        </footer>
      </>}
    </div>}
  </section>;
}
