import english from './translations.demo.en.json' with { type: 'json' };
import showcase from './translations.showcase.en.json' with { type: 'json' };
import { translate, type Language } from './i18n.ts';
import type { Content } from './domain';

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
export function providerLabel(provider: string, language: Language): string {
  return provider==='Demo fixture'?translate('Phản hồi mẫu',language):provider;
}
