'use client';
import { useEffect, useRef } from 'react';

export function usePageReveal() {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=ref.current;
    if(!root||!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const items=root.querySelectorAll<HTMLElement>('[data-reveal]');
    root.classList.add('motion-ready');
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');observer.unobserve(entry.target)}
    },{threshold:0.08});
    items.forEach(item=>observer.observe(item));
    return()=>{observer.disconnect();root.classList.remove('motion-ready')};
  },[]);
  return ref;
}
