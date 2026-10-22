import {lecturerHref,type LecturerSection} from '../lib/lecturer-pages';
import {translate,type Language} from '../lib/i18n';
import UiIcon from './UiIcon';

export default function LecturerClassFilter({classes,value,section,language,busy=false}:{classes:string[];value:string;section:LecturerSection;language:Language;busy?:boolean}) {
 const tr=(text:string)=>translate(text,language);
 if(classes.length<2&&!value)return null;
 return <details className="lecturer-class-filter">
  <summary><UiIcon name="users" size={17}/><span>{tr('Lọc theo lớp')}</span><b>{value||tr('Tất cả lớp')}</b><UiIcon name="chevron" size={16}/></summary>
  <div className="lecturer-class-options" aria-label={tr('Lọc theo lớp')}>
   {['',...classes].map(name=><a key={name} href={lecturerHref(section,{cohort:name})} aria-current={name===value?'true':undefined} aria-disabled={busy||undefined} onClick={event=>{if(busy)event.preventDefault()}}>{name||tr('Tất cả lớp')}{name===value&&<UiIcon name="check" size={15}/>}</a>)}
  </div>
 </details>;
}
