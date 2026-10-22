'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

export default function WorkspaceHeader({language,children,controls,profile,sideNavigation=false,sidebarControls,homeHref=sideNavigation?'/student':'/',mobileSideMenu=false}:{language:Language;children:ReactNode;controls:ReactNode;profile:ReactNode;sideNavigation?:boolean;sidebarControls?:ReactNode;homeHref?:string;mobileSideMenu?:boolean}) {
 const [open,setOpen]=useState(false),id=useId(),root=useRef<HTMLDivElement>(null),navigation=useRef<HTMLDivElement>(null),rail=useRef<HTMLElement>(null),toggle=useRef<HTMLButtonElement>(null);
 const tr=(text:string)=>translate(text,language);
 useEffect(()=>{
  if(!open)return;
  navigation.current?.querySelector<HTMLAnchorElement>('a')?.focus({preventScroll:true});
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);toggle.current?.focus()}};
  const outside=(event:PointerEvent|FocusEvent)=>{if(!root.current?.contains(event.target as Node)&&!navigation.current?.contains(event.target as Node)&&!rail.current?.contains(event.target as Node))setOpen(false)};
  const resize=()=>{if(window.matchMedia(sideNavigation?'(min-width: 1001px)':'(min-width: 1281px)').matches)setOpen(false)};
  window.addEventListener('keydown',keydown);window.addEventListener('pointerdown',outside);window.addEventListener('focusin',outside);window.addEventListener('resize',resize);
  return()=>{window.removeEventListener('keydown',keydown);window.removeEventListener('pointerdown',outside);window.removeEventListener('focusin',outside);window.removeEventListener('resize',resize)};
 },[open,sideNavigation]);
 const links=<div className={`workspace-navigation ${!sideNavigation&&open?'is-open':''}`} id={id} ref={navigation} onClickCapture={event=>{if((event.target as Element).closest('a:not([aria-disabled="true"])'))setOpen(false)}}>{children}</div>;
 return <>
  <header className="sidebar"><div className={`workspace-header ${open?'menu-open':''} ${sideNavigation?'has-side-navigation':''}`} ref={root}>
   <a className="skip-link" href="#workspace-main">{tr('Đi đến nội dung chính')}</a>
   {/* A full navigation keeps the existing beforeunload protection for unsaved workspace edits. */}
   <a className="brand" href={homeHref} aria-label="THINK UP">think<span>up</span><i><UiIcon name="arrow" size={18}/></i></a>
   {!sideNavigation&&links}
   <div className="workspace-header-actions"><div className="workspace-preferences" onClickCapture={()=>setOpen(false)}>{controls}</div><div className="workspace-account" onClickCapture={()=>setOpen(false)}>{profile}</div>{(!sideNavigation||mobileSideMenu)&&<button className="workspace-menu-toggle" ref={toggle} type="button" aria-label={tr(open?'Đóng menu':'Mở menu')} aria-controls={id} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><UiIcon name={open?'close':'menu'} size={19}/></button>}</div>
  </div></header>
  {sideNavigation&&<>
   {mobileSideMenu&&open&&<button className="workspace-navigation-backdrop" type="button" aria-label={tr('Đóng menu')} tabIndex={-1} onClick={()=>{setOpen(false);toggle.current?.focus()}}/>}
   <aside className={`workspace-side-navigation ${mobileSideMenu&&open?'is-open':''}`} ref={rail} aria-label={tr('Điều hướng chính')}>{sidebarControls&&<div className="workspace-sidebar-controls">{sidebarControls}</div>}{links}</aside>
  </>}
 </>;
}
