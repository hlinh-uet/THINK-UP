import { sectionKeys, wordCount, type Content, type Reflection } from './domain.ts';

// Keep existing four-field records readable; new writing uses one free-form body.
export function reflectionText(content: Content): string {
  return sectionKeys.map(key=>content[key]).filter(text=>text.trim()).join('\n\n');
}
export function freeContent(text: string): Content {
  return {what:text,soWhat:'',nowWhat:'',action:''};
}

export type ReflectionDraft = {
  id: string | null; rev: number; title: string; week: number;
  courseId: string | null; content: Content; status: string;
};

export function draftSnapshot(draft: ReflectionDraft): string {
  return JSON.stringify({title:draft.title,content:draft.content,week:draft.week,courseId:draft.courseId});
}

export function hasUnsavedWriting(draft: ReflectionDraft | null, saved: string): boolean {
  return !!draft && ['draft','returned'].includes(draft.status) &&
    !!(draft.id || draft.title.trim() || sectionKeys.some(key=>draft.content[key].trim())) && draftSnapshot(draft)!==saved;
}

export function writingReadiness(draft: ReflectionDraft, aiReady: boolean, busy: boolean) {
  const editable=['draft','returned'].includes(draft.status);
  const completed=sectionKeys.filter(key=>draft.content[key].trim());
  const words=wordCount(draft.content);
  return {editable,completed,words,
    canAnalyze:editable && !busy && aiReady && words>=20,
    canSubmit:editable && !busy && !!draft.courseId && words>0};
}

export function writingMatchesSaved(draft: ReflectionDraft, reflection: Reflection): boolean {
  return draft.title===reflection.title && sectionKeys.every(key=>draft.content[key]===reflection.content[key]);
}
