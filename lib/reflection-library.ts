import type {Reflection} from './domain';
import {reflectionWritingView} from './reflection-translation.ts';
import type {Language} from './i18n';
import {reflectionText} from './student-editor.ts';

export type LibraryFilters={search:string;status:string;topic:string;sort:'newest'|'oldest'};
const searchable=(value:string)=>value.normalize('NFD').replace(/\p{M}/gu,'').replace(/đ/gi,'d').toLocaleLowerCase();

/** Topics follow the weekly reflection prompts; sorting uses the latest saved edit. */
export function filterReflections(reflections:Reflection[],filters:LibraryFilters,language:Language):Reflection[]{
 const query=searchable(filters.search.trim());
 return reflections.filter(r=>(filters.status==='all'||r.status===filters.status)
  &&(filters.topic==='all'||r.week===Number(filters.topic))
  &&(!query||searchable(`${reflectionWritingView(r,language).title} ${reflectionText(reflectionWritingView(r,language).content)}`).includes(query)))
  .sort((a,b)=>filters.sort==='oldest'?a.updatedAt.localeCompare(b.updatedAt)||a.id.localeCompare(b.id):b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
