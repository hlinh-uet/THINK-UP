import english from './translations.en.json' with { type: 'json' };

export type Language = 'en' | 'vi';
export const languageCookie = 'thinkup-language';
export function resolveLanguage(value: unknown): Language { return value === 'en' ? 'en' : 'vi'; }
const dictionary: Record<string, string> = english;
const vietnamese = Object.fromEntries(Object.entries(dictionary).map(([vi, en]) => [en, vi]));
export function translate(text: string, language: Language, parameters: readonly unknown[] = []): string {
  const key = text.trim();
  const translated = (language === 'en' ? dictionary[key] : vietnamese[key]) ?? key;
  const result = text.slice(0, text.length - text.trimStart().length) + translated + text.slice(text.trimEnd().length);
  const filled = result.replace(/\{(\d+)\}/g, (token, index: string) => Number(index) < parameters.length ? String(parameters[Number(index)] ?? '') : token);
  return language === 'en' ? singular(filled) : filled;
}

// English strings are written in the plural; "1 students need" becomes "1 student needs".
const singularNouns: Record<string, string> = { days: 'day', reflections: 'reflection', students: 'student', commitments: 'commitment', pairs: 'pair', submissions: 'submission', versions: 'version', courses: 'course', revisions: 'revision', criteria: 'criterion', weeks: 'week', files: 'file', messages: 'message', lecturers: 'lecturer', assessments: 'assessment', actions: 'action', users: 'user', accounts: 'account' };
const singularVerbs: Record<string, string> = { are: 'is', have: 'has', need: 'needs', were: 'was' };
function singular(text: string) {
  return text.replace(/(^|[^\d.,/])1 (days|reflections|students|commitments|pairs|submissions|versions|courses|revisions|criteria|weeks|files|messages|lecturers|assessments|actions|users|accounts)\b( (?:are|have|need|were)\b)?/g,
    (_, before: string, noun: string, verb?: string) => `${before}1 ${singularNouns[noun]}${verb ? ' ' + singularVerbs[verb.trim()] : ''}`);
}
export function dateLocale(language: Language) { return language === 'vi' ? 'vi-VN' : 'en-GB'; }
export function stageLabel(stage: string, language: Language): string {
  const revision = /^Revision (\d+)$/.exec(stage);
  if(revision)return translate('Lần chỉnh sửa {0}',language,[revision[1]]);
  const labels:Record<string,string>={Draft:'Bản nháp',Submitted:'Đã nộp',Final:'Hoàn thành', 'Lecturer Review':'Giảng viên nhận xét', 'AI Coach':'AI Coach', 'AI Feedback':'AI Feedback'};
  return translate(labels[stage]??stage,language);
}
