import type {Analysis,Feedback,FeedbackTranslation} from './domain';
import type {Language} from './i18n';

const groups=['strengths','development','questions','suggestedActions'] as const;
const text=(value:unknown,max=2000):value is string=>typeof value==='string'&&value.length<=max;

/** Translations may change prose only. Scores and source quotations always come from the original. */
export function feedbackTranslations(value:unknown,source:Feedback):Partial<Record<Language,FeedbackTranslation>> {
 const result:Partial<Record<Language,FeedbackTranslation>>={};
 if(!value||typeof value!=='object')return result;
 for(const language of ['en','vi'] as const){
  const candidate=(value as Record<string,unknown>)[language] as FeedbackTranslation|undefined;
  if(!candidate||groups.some(key=>!Array.isArray(candidate[key])||candidate[key].length!==source[key].length||candidate[key].some(item=>!text(item,1500)))||!text(candidate.context)||!text(candidate.levelReason,1500)||!Array.isArray(candidate.criteria)||candidate.criteria.length!==source.criteria.length||candidate.criteria.some((c,i)=>!c||c.key!==source.criteria[i].key||!text(c.behavior,1500)||!text(c.improvement,1500)))continue;
  result[language]={strengths:[...candidate.strengths],development:[...candidate.development],questions:[...candidate.questions],suggestedActions:[...candidate.suggestedActions],context:candidate.context,levelReason:candidate.levelReason,criteria:candidate.criteria.map(c=>({key:c.key,behavior:c.behavior,improvement:c.improvement}))};
 }
 return result;
}

export function localizedAnalysis(analysis:Analysis,language:Language):Analysis {
 const translated=feedbackTranslations(analysis.result.translations,analysis.result)[language];
 if(!translated)return analysis;
 return {...analysis,result:{...analysis.result,...translated,language,criteria:analysis.result.criteria.map((c,i)=>({...c,behavior:c.reviewRequired?c.behavior:translated.criteria[i].behavior,improvement:translated.criteria[i].improvement}))}};
}

export function replyTranslations(value:unknown):Partial<Record<Language,string>> {
 if(!value||typeof value!=='object')return {};
 return Object.fromEntries((['en','vi'] as const).flatMap(language=>{const item=(value as Record<string,unknown>)[language];return text(item,6000)&&item.trim()?[[language,item.trim()]]:[]}));
}
