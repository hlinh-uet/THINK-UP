'use client';
import {useEffect,useState} from 'react';
import type {Reflection} from '../lib/domain';
import type {ReflectionDraft} from '../lib/student-editor';
import type {Language} from '../lib/i18n';
import {reflectionWritingView,writingIdentity,writingLanguage,type WritingView} from '../lib/reflection-translation.ts';

export function useWritingTranslation(draft:ReflectionDraft,current:Reflection|undefined,language:Language,enabled:boolean,onTranslated?:()=>void){
 const source={title:draft.title,content:draft.content},key=JSON.stringify({reflectionId:draft.id,language,source});
 const cached=reflectionWritingView({id:draft.id||'',...source,translations:current?.translations},language,source);
 const available=writingIdentity(cached)!==writingIdentity(source);
 const needs=enabled&&!!draft.id&&!available&&writingLanguage(source)!==language;
 const [response,setResponse]=useState<{key:string;view?:WritingView;error?:string}|null>(null);
 useEffect(()=>{
  if(!needs)return;
  let alive=true;const controller=new AbortController(),request=JSON.parse(key) as {reflectionId:string;language:Language;source:WritingView};
  void (async()=>{try{
   const res=await fetch('/api/reflection-translation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reflectionId:request.reflectionId,language:request.language,...request.source}),signal:controller.signal});
   const body=await res.json() as {view?:WritingView;error?:string};if(!res.ok||!body.view)throw new Error(body.error||'Chưa dịch được bài viết. Vui lòng thử lại.');
   if(alive){setResponse({key,view:body.view});onTranslated?.();}
  }catch(error){if(alive)setResponse({key,error:error instanceof Error?error.message:'Chưa dịch được bài viết. Vui lòng thử lại.'})}})();
  return()=>{alive=false;controller.abort()};
 },[needs,key,onTranslated]);
 const local=response?.key===key?response:null,view=local?.view||cached;
 return {view,translated:writingIdentity(view)!==writingIdentity(source),loading:needs&&!local,error:local?.error};
}
