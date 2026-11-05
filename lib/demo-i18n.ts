import english from './translations.demo.en.json' with { type: 'json' };
import showcase from './translations.showcase.en.json' with { type: 'json' };
import { translate, type Language } from './i18n.ts';
import type { Content, Course } from './domain';

const dictionary: Record<string,string> = { ...english, ...showcase };
const vietnamese = Object.fromEntries(Object.entries(dictionary).map(([vi,en])=>[en,vi]));

// Seeded records: the original demo pack (demo-…) and the trial dataset (c- courses, r- reflections with their
// reviews and analyses, a- commitments). Records people create get random ids and are never translated.
const seeded = (id: string) => id.startsWith('demo-') || /^[rca]-/.test(id);

/** Only known, unchanged seeded text is localized. Authored and edited text stays intact. */
export function demoText(text: string, recordId: string|null|undefined, language: Language): string {
  if (!recordId || !seeded(recordId)) return text;
  return (language==='en'?dictionary[text]:vietnamese[text]) ?? translate(text,language);
}
export function demoContent(content: Content, recordId: string|null|undefined, language: Language): Content {
  return Object.fromEntries(Object.entries(content).map(([key,value])=>[key,demoText(value,recordId,language)])) as Content;
}

/** Prepared sample feedback is labelled as such instead of showing its internal provider key. */
/** Editors show built-in course text in the viewer's language. */
export function courseForEditing(course: Course, language: Language): Course {
  const tr = (text: string) => translate(text, language);
  return { ...structuredClone(course), name: demoText(course.name, course.id, language), weeks: course.weeks.map(w => ({ ...w, title: tr(w.title), prompt: tr(w.prompt) })), rubric: course.rubric.map(c => ({ ...c, name: tr(c.name), descriptions: c.descriptions.map(tr) })) };
}
/** Text left untouched goes back to its stored wording, so saving never replaces it with the viewer's translation. */
export function courseToStore(draft: Course, course: Course, language: Language): Course {
  const shown = courseForEditing(course, language);
  const stored = (value: string, display: string | undefined, original: string | undefined) => value === display && original !== undefined ? original : value;
  return { ...draft, name: stored(draft.name, shown.name, course.name),
    weeks: draft.weeks.map((w, i) => ({ ...w, title: stored(w.title, shown.weeks[i]?.title, course.weeks[i]?.title), prompt: stored(w.prompt, shown.weeks[i]?.prompt, course.weeks[i]?.prompt) })),
    rubric: draft.rubric.map(c => { const k = course.rubric.findIndex(r => r.key === c.key); return { ...c, name: stored(c.name, shown.rubric[k]?.name, course.rubric[k]?.name), descriptions: c.descriptions.map((d, n) => stored(d, shown.rubric[k]?.descriptions[n], course.rubric[k]?.descriptions[n])) } }) };
}
export function providerLabel(provider: string, language: Language): string {
  return provider==='Demo fixture'?translate('Phản hồi mẫu',language):provider;
}
