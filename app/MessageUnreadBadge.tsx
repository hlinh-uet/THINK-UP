'use client';
import { useEffect,useState } from 'react';
import { translate,type Language } from '../lib/i18n';

export default function MessageUnreadBadge({language,count}:{language:Language;count?:number}) {
  const [unread,setUnread]=useState(0);
  useEffect(()=>{
    if(count!==undefined)return;
    let active=true;
    const controller=new AbortController();
    const refresh=async()=>{
      if(document.visibilityState==='hidden')return;
      try{const response=await fetch('/api/messages?summary=1',{cache:'no-store',signal:controller.signal});if(response.ok){const data=await response.json() as {unreadTotal:number};if(active)setUnread(data.unreadTotal)}}catch{/* Refresh on the next visible interval. */}
    };
    void refresh();const timer=setInterval(refresh,30000);
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh)};
  },[count]);
  const value=count??unread;
  return value>0?<small className="nav-count" aria-label={translate('{0} tin chưa đọc',language,[value])}>{value>99?'99+':value}</small>:null;
}
