import english from './translations.demo.en.json' with { type: 'json' };
import { translate, type Language } from './i18n.ts';
import type { Content } from './domain';

const dictionary: Record<string,string> = english;
const vietnamese = Object.fromEntries(Object.entries(dictionary).map(([vi,en])=>[en,vi]));

/** Only known, unchanged seeded text is localized. Authored and edited text stays intact. */
export function demoText(text: string, recordId: string|null|undefined, language: Language): string {
  if (!recordId?.startsWith('demo-')) return text;
  return (language==='en'?dictionary[text]:vietnamese[text]) ?? translate(text,language);
}
export function demoContent(content: Content, recordId: string|null|undefined, language: Language): Content {
  return Object.fromEntries(Object.entries(content).map(([key,value])=>[key,demoText(value,recordId,language)])) as Content;
}
