'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

export default function LanguageToggle({language,onChange,disabled=false,title}:{language:Language;onChange:(language:Language)=>void;disabled?:boolean;title?:string}) {
 const [open,setOpen]=useState(false),id=useId();
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),focusIndex=useRef(0);
 const options:readonly {value:Language;label:string}[]=[{value:'vi',label:'Tiếng Việt'},{value:'en',label:'English'}];
 const tr=(text:string)=>translate(text,language);
 useEffect(()=>{
  if(!open)return;
  menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')[focusIndex.current]?.focus({preventScroll:true});
  const outside=(event:PointerEvent|FocusEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside)};
 },[open]);
 const expanded=open&&!disabled;
 function close(){setOpen(false);trigger.current?.focus()}
 return <div className="language-picker" ref={root}>
  <button ref={trigger} className="language-trigger" type="button" disabled={disabled} title={title||tr('Chọn ngôn ngữ')} aria-label={tr('Chọn ngôn ngữ')} aria-haspopup="menu" aria-expanded={expanded} aria-controls={id}
   onClick={()=>{focusIndex.current=options.findIndex(option=>option.value===language);setOpen(!expanded)}}
   onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();focusIndex.current=event.key==='ArrowDown'?0:options.length-1;if(expanded)menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')[focusIndex.current]?.focus();else setOpen(true)}else if(event.key==='Escape'&&expanded){event.preventDefault();event.stopPropagation();close()}}}>
   <UiIcon name="language" size={20}/><UiIcon name="down" size={11}/>
  </button>
  <div className="language-menu" id={id} ref={menu} role="menu" tabIndex={-1} aria-label={tr('Ngôn ngữ')} hidden={!expanded} onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
   const items=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')??[]),index=items.indexOf(document.activeElement as HTMLButtonElement);
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next]?.focus()}
  }}>
   <span className="language-menu-label">{tr('Ngôn ngữ')}</span>
   {options.map(option=><button className="language-option" key={option.value} type="button" role="menuitemradio" tabIndex={-1} lang={option.value} aria-checked={language===option.value} disabled={disabled} onClick={()=>{if(option.value!==language)onChange(option.value);close()}}><span>{option.label}</span>{language===option.value&&<UiIcon name="check" size={16}/>}</button>)}
  </div>
 </div>;
}
