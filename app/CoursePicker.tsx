'use client';

import {useEffect,useId,useRef,useState,type CSSProperties} from 'react';
import type {Course} from '../lib/domain';
import {demoText} from '../lib/demo-i18n';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

export default function CoursePicker({courses,value,language,disabled=false,onChange}:{courses:Course[];value:string;language:Language;disabled?:boolean;onChange:(value:string)=>void}) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),focusIndex=useRef(0);
  const [open,setOpen]=useState(false),[position,setPosition]=useState<CSSProperties>({});
  const tr=(text:string)=>translate(text,language);
  const name=(course:Course)=>demoText(tr(course.name),course.id,language);
  const selected=courses.find(course=>course.id===value);
  const label=selected?name(selected):tr('Tất cả học phần');

  const options=[{value:'',label:tr('Tất cả học phần'),code:''},...courses.map(course=>({value:course.id,label:name(course),code:course.code}))];
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
    <button ref={trigger} className="course-picker-trigger" type="button" popoverTarget={id} disabled={disabled} title={selected?`${selected.code} · ${label}`:label} aria-label={tr('Học phần đang xem')} aria-describedby={`${id}-selection`} aria-haspopup="menu" aria-expanded={open&&!disabled} aria-controls={id}
      onClick={()=>{focusIndex.current=selectedIndex;positionMenu()}}
      onKeyDown={event=>{
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show()}
        else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close()}
      }}>
      <UiIcon name="journey" size={18}/><span>Course</span><UiIcon name="chevron" size={16} className="course-picker-chevron"/>
    </button>
    <span className="course-picker-selection" id={`${id}-selection`}>{selected?`${selected.code} · ${label}`:label}</span>
    <div ref={menu} id={id} className="course-picker-menu" popover="auto" role="menu" tabIndex={-1} aria-label={tr('Học phần')} style={position}
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
        <span className="course-option-icon"><UiIcon name={option.value?'journey':'overview'} size={18}/></span>
        <span className="course-option-copy">{option.code&&<small>{option.code}</small>}<span>{option.label}</span></span>
        <span className="course-option-check">{option.value===options[selectedIndex].value&&<UiIcon name="check" size={16}/>}</span>
      </button>)}
    </div>
  </div>;
}
