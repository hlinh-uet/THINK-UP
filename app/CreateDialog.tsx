'use client';
import { useEffect, useRef } from 'react';
import UiIcon from './UiIcon';

export default function CreateDialog({title,closeLabel,onClose,children}:{title:string;closeLabel:string;onClose:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose},[onClose]);
  useEffect(()=>{
    const prior=document.activeElement as HTMLElement|null, overflow=document.body.style.overflow;
    ref.current?.focus();document.body.style.overflow='hidden';
    const listener=(e:KeyboardEvent)=>{
      if(e.key==='Escape')closeRef.current();
      if(e.key==='Tab'){
        const elements=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]');
        if(!elements?.length)return;
        const first=elements[0],last=elements[elements.length-1];
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last.focus()}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
      }
    };
    addEventListener('keydown',listener);
    return()=>{document.body.style.overflow=overflow;removeEventListener('keydown',listener);prior?.focus()};
  },[]);
  return <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}><div className="modal-header"><h3>{title}</h3><button type="button" className="close-button" aria-label={closeLabel} onClick={onClose}><UiIcon name="close"/></button></div><div className="modal-body">{children}</div></div></div>;
}
