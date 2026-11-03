'use client';
import {useEffect,useState} from 'react';

/** Refresh due-time classification while a student or lecturer keeps the page open. */
export function useCommitmentClock(){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  const update=()=>setNow(Date.now()),timer=setInterval(update,30000);
  window.addEventListener('focus',update);
  return()=>{clearInterval(timer);window.removeEventListener('focus',update)};
 },[]);
 return now;
}
