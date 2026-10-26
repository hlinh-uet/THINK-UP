'use client';

import {useEffect,useState} from 'react';

/** Counts a figure up from zero once the page settles; the server and reduced-motion users see the final number. */
export default function CountUp({value,decimals=0,className='space-tile-value'}:{value:number;decimals?:number;className?:string}) {
  const [shown,setShown]=useState(value);
  useEffect(()=>{
    const still=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame=0;const start=performance.now();
    const tick=(now:number)=>{const p=still?1:Math.min(1,(now-start)/900);setShown(value*(1-Math.pow(1-p,3)));if(p<1)frame=requestAnimationFrame(tick)};
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[value]);
  return <strong className={className}>{shown.toFixed(decimals)}</strong>;
}
