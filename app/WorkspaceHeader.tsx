'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

export default function WorkspaceHeader({language,children,controls,profile}:{language:Language;children:ReactNode;controls:ReactNode;profile:ReactNode}) {
 const [open,setOpen]=useState(false),id=useId(),root=useRef<HTMLDivElement>(null),navigation=useRef<HTMLDivElement>(null),toggle=useRef<HTMLButtonElement>(null);
 const tr=(text:string)=>translate(text,language);
 useEffect(()=>{
  if(!open)return;
  navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus({preventScroll:true});
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}};
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
  const resize=()=>{if(window.matchMedia('(min-width: 1281px)').matches)setOpen(false)};
  window.addEventListener('keydown',keydown);window.addEventListener('pointerdown',outside);window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize)};
 },[open]);
 return <header className="sidebar"><div className={`workspace-header ${open?'menu-open':''}`} ref={root}>
  <a className="skip-link" href="#workspace-main">{tr('Đi đến nội dung chính')}</a>
  {/* A full navigation keeps the existing beforeunload protection for unsaved workspace edits. */}
  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
  <a className="brand" href="/" aria-label="THINK UP">think<span>up</span><i><UiIcon name="arrow" size={18}/></i></a>
  <div className={`workspace-navigation ${open?'is-open':''}`} id={id} ref={navigation} onClickCapture={event=>{if((event.target as Element).closest('a:not([aria-disabled="true"])'))setOpen(false)}}>{children}</div>
  <div className="workspace-header-actions">{controls}<div className="workspace-account" onClickCapture={()=>setOpen(false)}>{profile}</div><button className="workspace-menu-toggle" ref={toggle} type="button" aria-label={tr(open?'Đóng menu':'Mở menu')} aria-controls={id} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><UiIcon name={open?'close':'menu'} size={19}/></button></div>
 </div></header>;
}
