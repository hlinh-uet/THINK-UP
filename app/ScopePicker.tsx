'use client';

import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import UiIcon from './UiIcon';

export type ScopeOption = { value:string; label:string; code?:string };
type Props = {options:ScopeOption[];value:string;label:string;ariaLabel:string;icon:Parameters<typeof UiIcon>[0]['name'];disabled?:boolean;showSelection?:boolean;compactLabel?:string;onChange:(value:string)=>void};

/** Shared sidebar selector: one popover, selection and keyboard behaviour for both class and course. */
export default function ScopePicker({options,value,label,ariaLabel,icon,disabled=false,showSelection=true,compactLabel,onChange}:Props) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),focusIndex=useRef(0);
  const [open,setOpen]=useState(false),[position,setPosition]=useState<CSSProperties>({});
  const selected=options.find(option=>option.value===value)||options[0];
  const selection=[selected.code,selected.label].filter(Boolean).join(' · ');
  const selectedIndex=Math.max(0,options.findIndex(option=>option.value===value));

  // The browser's popover layer escapes the scrollable sidebar and handles light dismissal.
  useEffect(()=>{if(disabled)menu.current?.hidePopover()},[disabled]);
  useEffect(()=>{
    if(!open)return;
    const dismiss=(event:Event)=>{if(!(event.target instanceof Node)||!menu.current?.contains(event.target))menu.current?.hidePopover()};
    window.addEventListener('resize',dismiss);window.addEventListener('scroll',dismiss,true);
    return()=>{window.removeEventListener('resize',dismiss);window.removeEventListener('scroll',dismiss,true)};
  },[open]);

  function items(){return Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')??[])}
  function close(){menu.current?.hidePopover();trigger.current?.focus({preventScroll:true})}
  function positionMenu(){
    if(disabled||!trigger.current||!menu.current)return;
    const rect=trigger.current.getBoundingClientRect(),gap=8,margin=12;
    const width=Math.min(Math.max(rect.width,320),420,window.innerWidth-margin*2);
    const below=window.innerHeight-rect.bottom-gap-margin,above=rect.top-gap-margin;
    const upward=below<200&&above>below;
    setPosition({left:Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin)),width,maxHeight:Math.max(0,Math.min(380,upward?above:below)),...(upward?{top:'auto',bottom:window.innerHeight-rect.top+gap,transformOrigin:'bottom left'}:{top:rect.bottom+gap,bottom:'auto',transformOrigin:'top left'})});
  }
  function show(){
    if(disabled||!menu.current)return;
    positionMenu();focusIndex.current=selectedIndex;
    if(menu.current.matches(':popover-open'))items()[selectedIndex]?.focus({preventScroll:true});else menu.current.showPopover();
  }

  return <div className="course-picker" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))menu.current?.hidePopover()}}>
    <button ref={trigger} className="course-picker-trigger" type="button" popoverTarget={id} disabled={disabled} title={selection} aria-label={ariaLabel} aria-describedby={`${id}-selection`} aria-haspopup="menu" aria-expanded={open&&!disabled} aria-controls={id}
      onClick={()=>{focusIndex.current=selectedIndex;positionMenu()}}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show()}
        else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close()}
      }}>
      <UiIcon name={icon} size={18}/>{showSelection?<span className="course-picker-label"><small>{label}</small><b>{selected.code||selected.label}</b></span>:<span>{compactLabel||label}</span>}<UiIcon name="chevron" size={16} className="course-picker-chevron"/>
    </button>
    <span className="course-picker-selection" id={`${id}-selection`}>{selection}</span>
    <div ref={menu} id={id} className="course-picker-menu" popover="auto" role="menu" tabIndex={-1} aria-label={label} style={position}
      onToggle={event=>{const expanded=event.newState==='open';setOpen(expanded);if(expanded){const selected=items()[focusIndex.current];selected?.focus({preventScroll:true});selected?.scrollIntoView({block:'nearest'})}}}
      onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
        const buttons=items(),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
          event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
          buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView({block:'nearest'});
        }
      }}>
      {options.map(option=><button key={option.value} className={`course-picker-option ${option.value===''?'course-picker-all':''}`} type="button" role="menuitemradio" aria-checked={option.value===options[selectedIndex].value} tabIndex={-1} disabled={disabled}
        onClick={()=>{if(disabled)return;close();if(option.value!==value)onChange(option.value)}}>
        <span className="course-option-icon"><UiIcon name={option.value?icon:'overview'} size={18}/></span>
        <span className="course-option-copy">{option.code&&<small>{option.code}</small>}<span>{option.label}</span></span>
        <span className="course-option-check">{option.value===options[selectedIndex].value&&<UiIcon name="check" size={16}/>}</span>
      </button>)}
    </div>
  </div>;
}
