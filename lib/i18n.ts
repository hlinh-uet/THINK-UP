import english from './translations.en.json' with { type: 'json' };

export type Language = 'en' | 'vi';
export const languageCookie = 'thinkup-language';
export function resolveLanguage(value: unknown): Language { return value === 'vi' ? 'vi' : 'en'; }
const dictionary: Record<string, string> = english;
const vietnamese = Object.fromEntries(Object.entries(dictionary).map(([vi, en]) => [en, vi]));
export function translate(text: string, language: Language, parameters: readonly unknown[] = []): string {
  const key = text.trim();
  const translated = (language === 'en' ? dictionary[key] : vietnamese[key]) ?? key;
  const result = text.slice(0, text.length - text.trimStart().length) + translated + text.slice(text.trimEnd().length);
  return result.replace(/\{(\d+)\}/g, (token, index: string) => Number(index) < parameters.length ? String(parameters[Number(index)] ?? '') : token);
}
export function dateLocale(language: Language) { return language === 'vi' ? 'vi-VN' : 'en-GB'; }
export function stageLabel(stage: string, language: Language): string {
  const revision = /^Revision (\d+)$/.exec(stage);
  if(revision)return translate('Lần chỉnh sửa {0}',language,[revision[1]]);
  const labels:Record<string,string>={Draft:'Bản nháp',Submitted:'Đã nộp',Final:'Hoàn thành', 'Lecturer Review':'Giảng viên nhận xét', 'AI Coach':'AI Coach', 'AI Feedback':'AI Feedback'};
  return translate(labels[stage]??stage,language);
}
