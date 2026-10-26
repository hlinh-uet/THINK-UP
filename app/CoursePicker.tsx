'use client';

import type {Course} from '../lib/domain';
import {demoText} from '../lib/demo-i18n';
import {translate,type Language} from '../lib/i18n';
import ScopePicker from './ScopePicker';

export default function CoursePicker({courses,value,language,disabled=false,showSelection=false,onChange}:{courses:Course[];value:string;language:Language;disabled?:boolean;showSelection?:boolean;onChange:(value:string)=>void}) {
  const tr=(text:string)=>translate(text,language);
  const options=[{value:'',label:tr('Tất cả học phần'),code:''},...courses.map(course=>({value:course.id,label:demoText(tr(course.name),course.id,language),code:[course.code,course.className&&course.className!==course.code?course.className:''].filter(Boolean).join(' · ')}))];
  return <ScopePicker options={options} value={value} label={tr('Học phần')} ariaLabel={tr('Học phần đang xem')} icon="journey" disabled={disabled} showSelection={showSelection} compactLabel={tr('Học phần')} onChange={onChange}/>;
}
