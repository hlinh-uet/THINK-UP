'use client';

import {useId,useRef,useState,type ReactNode} from 'react';

/** Keeps related reports on one route while showing one task at a time. */
export default function WorkspaceSections({label,items,value,onChange}:{label:string;items:{id:string;label:string;content:ReactNode}[];value?:string;onChange?:(id:string)=>void}) {
 const [internal,setInternal]=useState(items[0].id),prefix=useId(),buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const selected=value??internal;
 function setSelected(id:string){if(value===undefined)setInternal(id);onChange?.(id)}
 return <div className="workspace-sections">
  <div className="workspace-tabs" role="tablist" aria-label={label}>{items.map((item,index)=><button key={item.id} ref={node=>{buttons.current[index]=node}} id={`${prefix}-tab-${item.id}`} type="button" role="tab" aria-selected={selected===item.id} aria-controls={`${prefix}-panel-${item.id}`} tabIndex={selected===item.id?0:-1} onClick={()=>setSelected(item.id)} onKeyDown={event=>{
   const next=event.key==='ArrowRight'?(index+1)%items.length:event.key==='ArrowLeft'?(index+items.length-1)%items.length:event.key==='Home'?0:event.key==='End'?items.length-1:null;
   if(next===null)return;event.preventDefault();setSelected(items[next].id);buttons.current[next]?.focus();
  }}>{item.label}</button>)}</div>
  {items.map(item=><div className="workspace-section-content" key={item.id} id={`${prefix}-panel-${item.id}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${item.id}`} hidden={selected!==item.id} tabIndex={0}>{item.content}</div>)}
 </div>;
}
