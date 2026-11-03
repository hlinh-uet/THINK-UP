'use client';
import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {translate,type Language} from '../lib/i18n';

export function usePageRows<T>(rows:T[],scope:string,pageSize=12) {
 const [selection,setSelection]=useState({scope,page:1});
 if(selection.scope!==scope)setSelection({scope,page:1});
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const page=selection.scope===scope?Math.min(selection.page,pages):1;
 return {page,pageSize,rows:rows.slice((page-1)*pageSize,page*pageSize),onChange:(next:number)=>setSelection({scope,page:Math.max(1,Math.min(pages,next))})};
}

export default function TablePagination({page,pageSize,total,onChange,language}:{page:number;pageSize:number;total:number;onChange:(page:number)=>void;language:Language}) {
 const tr=(s:string,args:readonly unknown[]=[])=>translate(s,language,args),pages=Math.max(1,Math.ceil(total/pageSize));
 if(total<=pageSize)return null;
 return <nav className="table-pagination" aria-label={tr('Phân trang')}><span className="muted" role="status">{tr('Hiển thị {0}–{1} / {2}',[(page-1)*pageSize+1,Math.min(page*pageSize,total),total])}</span><div><button className="table-page-arrow" type="button" aria-label={tr('Trang trước')} title={tr('Trang trước')} disabled={page<=1} onClick={()=>onChange(page-1)}><ChevronLeft size={22} strokeWidth={1.8} aria-hidden="true"/></button><span>{page} / {pages}</span><button className="table-page-arrow" type="button" aria-label={tr('Trang sau')} title={tr('Trang sau')} disabled={page>=pages} onClick={()=>onChange(page+1)}><ChevronRight size={22} strokeWidth={1.8} aria-hidden="true"/></button></div></nav>;
}
