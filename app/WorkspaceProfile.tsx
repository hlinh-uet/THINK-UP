'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {User} from '../lib/domain';
import type {Role} from '../lib/access';
import {profileHref} from '../lib/profile';
import {translate,type Language} from '../lib/i18n';
import {demoText} from '../lib/demo-i18n';
import {roles} from '../lib/domain';
import UserAvatar from './UserAvatar';
import UiIcon from './UiIcon';

export default function WorkspaceProfile({user,language,busy=false,current=false,onLogout}:{user:User;language:Language;busy?:boolean;current?:boolean;onLogout:()=>void}) {
  const [open,setOpen]=useState(false);
  const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
  const tr=(text:string)=>translate(text,language);
  useEffect(()=>{
    if(!open)return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({preventScroll:true});
    const outside=(event:PointerEvent|FocusEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('focusin',outside);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside)};
  },[open]);
  return <div className="profile account-profile" ref={root}>
    <button ref={trigger} type="button" className={`account-trigger ${open?'is-open':''}`} disabled={busy}
      aria-label={tr('Menu tài khoản')} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
      onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true)}
      }}>
      <UserAvatar person={user}/><UiIcon name="down" size={13}/>
    </button>
    <div className="account-dropdown" hidden={!open}>
      <div className="account-summary"><UserAvatar person={user}/><div><b>{demoText(user.name,user.id,language)}</b><small>{tr(roles[user.role])}</small></div><span className="account-email" title={user.email}>{user.email}</span></div>
      <div id={id} role="menu" tabIndex={-1} aria-label={tr('Menu tài khoản')} ref={menu} onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();return}
        const items=Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled]):not([aria-disabled="true"])')??[]);
        const index=items.indexOf(document.activeElement as HTMLElement);
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();
          const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
          items[next]?.focus();
        }
      }}>
        <a className="account-menu-item profile-link" role="menuitem" href={profileHref(user.role as Role)} aria-current={current?'page':undefined} aria-disabled={busy||undefined} aria-label={tr('Mở hồ sơ cá nhân')} onClick={event=>{if(busy)event.preventDefault();else setOpen(false)}}>
          <UiIcon name="users" size={18}/><span>{tr('Hồ sơ cá nhân')}</span><UiIcon name="next" size={14}/>
        </a>
        <button className="account-menu-item account-signout" role="menuitem" type="button" disabled={busy} onClick={()=>{setOpen(false);onLogout()}}><UiIcon name="logout" size={18}/><span>{tr('Đăng xuất')}</span></button>
      </div>
    </div>
  </div>;
}
