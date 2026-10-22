'use client';
import {useId,useRef,useState} from 'react';
import type {Action,Reflection} from '../lib/domain';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {formatMessageTimestamp} from '../lib/message-date';
import UiIcon from './UiIcon';

const statuses=[['todo','Chưa bắt đầu'],['in_progress','Đang thực hiện'],['done','Hoàn thành'],['needs_adjustment','Cần điều chỉnh']] as const;

export default function ActionEditor({initial,reflections,language,busy,onSave,onCancel}:{initial:Partial<Action>;reflections:Reflection[];language:Language;busy:boolean;onSave:(value:Partial<Action>)=>Promise<void>;onCancel?:()=>void}){
 const tr=(s:string)=>translate(s,language),dt=(s:string,id?:string)=>demoText(s,id,language);
 const [uploading,setUploading]=useState(false),[message,setMessage]=useState(''),[value,setValue]=useState<Partial<Action>>({...initial,revision:initial.revision||0});
 const statusName=useId(),followUpName=useId(),fileInput=useRef<HTMLInputElement>(null);
 const source=reflections.find(r=>r.id===value.reflectionId),locked=busy||uploading;
 const followUps=reflections.filter(r=>r.id!==source?.id&&r.courseId===source?.courseId);
 const patch=(part:Partial<Action>)=>setValue(v=>({...v,...part}));
 const showOutcome=!!value.id||value.status==='done'||!!value.review;
 async function upload(file?:File){
  if(!file||!value.id)return;
  setUploading(true);setMessage('');
  try{
   const form=new FormData();form.append('actionId',value.id);form.append('file',file);
   const response=await fetch('/api/action-evidence',{method:'POST',body:form}),result=await response.json() as {id:string;name:string;type:string;size:number;error?:string};
   if(!response.ok)throw new Error(result.error);
   setValue(v=>({...v,evidenceFiles:[...(v.evidenceFiles||[]),result]}));
  }catch(error){setMessage(error instanceof Error?error.message:tr('Thao tác chưa hoàn tất.'))}
  finally{setUploading(false)}
 }
 return <form className="action-editor" onSubmit={e=>{e.preventDefault();if(!locked)void onSave(value)}}>
  <div className="action-editor-scroll">
   {source&&<div className="action-source"><UiIcon name="document" size={16}/><span>{dt(source.title,source.id)||tr('Reflection chưa đặt tên')}</span></div>}
   <fieldset disabled={locked} className="action-fields">
    <label className="field action-goal">{tr('Tôi cam kết…')}<textarea required maxLength={1500} rows={2} value={value.text||''} onChange={e=>patch({text:e.target.value})}/></label>
    <div className="action-basics">
     <label className="field">{tr('Tiêu chí hoàn thành')}<textarea maxLength={1500} rows={2} value={value.successCriteria||''} onChange={e=>patch({successCriteria:e.target.value})}/></label>
     <label className="field action-due">{tr('Hạn thực hiện')}<input type="date" value={value.due||''} onChange={e=>patch({due:e.target.value})}/></label>
    </div>
    <fieldset className="action-status-group"><legend>{tr('Trạng thái')}</legend><div className="action-status-options">
     {statuses.map(([key,label])=><label className="action-status-choice" key={key}><input className="action-choice-input" type="radio" name={statusName} value={key} checked={(value.status||'todo')===key} onChange={()=>patch({status:key})}/><span className="action-choice-mark" aria-hidden="true">{(value.status||'todo')===key&&<UiIcon name="check" size={12}/>}</span><span>{tr(label)}</span></label>)}
    </div></fieldset>
    {showOutcome&&<label className="field action-outcome">{tr('Kết quả và rào cản')}<textarea rows={2} maxLength={3000} required={value.status==='done'} value={value.review||''} onChange={e=>patch({review:e.target.value})}/></label>}
    <details className="action-extras"><summary><UiIcon name="attachment" size={17}/><span>{tr('Minh chứng và bài tiếp nối')}</span><UiIcon name="chevron" size={17}/></summary><div className="action-extras-content">
     <label className="field">{tr('Minh chứng thực hiện')}<textarea rows={2} maxLength={3000} value={value.evidence||''} onChange={e=>patch({evidence:e.target.value})}/></label>
     {!!source?.attachments?.length&&<fieldset className="action-source-files"><legend>{tr('Minh chứng từ bài nguồn')}</legend>{source.attachments.map(a=><label key={a.id}><input type="checkbox" checked={value.attachmentIds?.includes(a.id)||false} onChange={e=>patch({attachmentIds:e.target.checked?[...(value.attachmentIds||[]),a.id]:(value.attachmentIds||[]).filter(id=>id!==a.id)})}/><span>{a.name}</span></label>)}</fieldset>}
     {!!value.evidenceFiles?.length&&<div className="action-files">{value.evidenceFiles.map(f=><a className="action-file" key={f.id} href={`/api/action-evidence/${encodeURIComponent(f.id)}`}><UiIcon name="attachment" size={15}/><span>{f.name}</span><UiIcon name="arrow" size={14}/></a>)}</div>}
     {value.id?<div className="action-upload"><input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" disabled={locked||(value.evidenceFiles?.length||0)>=3} onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file)}}/><button type="button" className="button action-attach" disabled={locked||(value.evidenceFiles?.length||0)>=3} onClick={()=>fileInput.current?.click()}><UiIcon name="add" size={16}/>{tr(uploading?'Đang tải…':'Thêm tệp')}</button></div>:<p className="action-save-first">{tr('Lưu cam kết trước khi thêm tệp kết quả thực hiện.')}</p>}
     {message&&<p className="action-upload-message" role="status">{message}</p>}
     <fieldset className="action-follow-ups"><legend>{tr('Reflection tiếp nối')}</legend><div className="action-reflection-options">
      <label className="action-reflection-choice"><input className="action-choice-input" type="radio" name={followUpName} checked={!value.followUpReflectionId} onChange={()=>patch({followUpReflectionId:null})}/><span className="action-choice-mark" aria-hidden="true">{!value.followUpReflectionId&&<UiIcon name="check" size={12}/>}</span><span>{tr('Chưa liên kết')}</span></label>
      {followUps.map(r=><label className="action-reflection-choice" key={r.id}><input className="action-choice-input" type="radio" name={followUpName} value={r.id} checked={value.followUpReflectionId===r.id} onChange={()=>patch({followUpReflectionId:r.id})}/><span className="action-choice-mark" aria-hidden="true">{value.followUpReflectionId===r.id&&<UiIcon name="check" size={12}/>}</span><span>{dt(r.title,r.id)||tr('Reflection chưa đặt tên')}<small>{translate('Tuần {0}',language,[r.week])}</small></span></label>)}
     </div></fieldset>
    </div></details>
   </fieldset>
   {!!initial.history?.length&&<details className="action-history"><summary>{tr('Lịch sử điều chỉnh cam kết')}<UiIcon name="chevron" size={16}/></summary>{initial.history.map(h=>{const stamp=formatMessageTimestamp(h.createdAt,language);return <div key={h.id}><time dateTime={h.createdAt}>{stamp.date} · {stamp.time}</time><p>{String(h.payload.text||'')}</p>{!!h.payload.review&&<p>{String(h.payload.review)}</p>}</div>})}</details>}
  </div>
  <footer className="action-editor-footer">{onCancel&&<button className="button action-cancel" type="button" disabled={locked} onClick={onCancel}>{tr('Hủy')}</button>}<button className="button primary" type="submit" disabled={locked}>{tr(busy?'Đang lưu…':value.id?'Lưu thay đổi':'Tạo cam kết')}</button></footer>
 </form>;
}
