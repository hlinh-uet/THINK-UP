'use client';

import {translate,type Language} from '../lib/i18n';
import ScopePicker from './ScopePicker';

export default function ClassPicker({classes,value,language,disabled=false,onChange}:{classes:string[];value:string;language:Language;disabled?:boolean;onChange:(value:string)=>void}) {
  const tr=(text:string)=>translate(text,language);
  const names=value&&!classes.includes(value)?[value,...classes]:classes;
  return <ScopePicker options={[{value:'',label:tr('Tất cả lớp')},...names.map(name=>({value:name,label:name}))]} value={value} label={tr('Lớp học phần')} ariaLabel={tr('Lớp học phần')} icon="users" disabled={disabled} onChange={onChange}/>;
}
