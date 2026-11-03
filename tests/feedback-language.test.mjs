import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {feedbackTranslations,localizedAnalysis,replyTranslations} from '../lib/feedback-language.ts';
import {defaultRubric,emptyContent} from '../lib/domain.ts';
import {normalizeFeedback,feedbackSchema} from '../lib/feedback-schema.ts';
import {chatSchema,reflectionThinkingInstructions} from '../lib/reflection-chat-prompt.ts';
import {coachInstructions} from '../lib/coach-prompt.ts';

const {default:Guidance}=await import(componentModule(new URL('../app/ReflectionGuidance.tsx',import.meta.url)));
const {AnalysisResults}=await import(componentModule(new URL('../app/FeedbackResults.tsx',import.meta.url)));
const evidence='Tôi đã thay đổi cách đặt câu hỏi.';
const result={language:'vi',strengths:['Điểm mạnh bằng tiếng Việt.'],development:['Điểm cần cải thiện bằng tiếng Việt.'],questions:['Câu hỏi bằng tiếng Việt?'],suggestedActions:['Hành động bằng tiếng Việt.'],context:'Bối cảnh bằng tiếng Việt.',level:3,levelReason:'Lý do bằng tiếng Việt.',levelEvidence:evidence,criteria:defaultRubric.map(c=>({key:c.key,level:3,score:7,behavior:'Nhận xét bằng tiếng Việt.',evidence,evidenceSection:'what',attachmentNames:[],improvement:'Cải thiện bằng tiếng Việt.'})),total:7};
const en={strengths:['A specific strength.'],development:['A specific improvement.'],questions:['What would you change?'],suggestedActions:['Try one open question.'],context:'A specific context.',levelReason:'A personal lesson is identified.',criteria:defaultRubric.map(c=>({key:c.key,behavior:'An English explanation.',improvement:'An English next step.'}))};
const analysis={id:'authored-ai-output',kind:'feedback',provider:'Codex local',rubric:defaultRubric,result:{...result,translations:{en}},versionId:'v1',createdAt:'2026-10-31T00:00:00Z'};

test('saved AI translations change commentary but preserve grades, evidence and the original stored response',()=>{
 const original=JSON.stringify(analysis);
 const localized=localizedAnalysis(analysis,'en');
 assert.deepEqual(localized.result.strengths,en.strengths);
 assert.equal(localized.result.levelReason,en.levelReason);
 assert.equal(localized.result.criteria[0].behavior,en.criteria[0].behavior);
 assert.equal(localized.result.criteria[0].improvement,en.criteria[0].improvement);
 assert.equal(localized.result.criteria[0].evidence,evidence);
 assert.equal(localized.result.levelEvidence,evidence);
 assert.equal(localized.result.total,7);assert.equal(localized.result.level,3);
 assert.equal(localized.result.criteria[0].score,7);
 assert.equal(localizedAnalysis(analysis,'vi'),analysis);
 assert.equal(JSON.stringify(analysis),original);
});

test('both Coach guidance and rubric explanations render translated content for ordinary non-demo analyses',()=>{
 const english=renderToStaticMarkup(createElement(Guidance,{analysis,language:'en',onCommit(){}}));
 for(const text of [...en.strengths,...en.development,...en.questions,...en.suggestedActions,en.context])assert.ok(english.includes(text),text);
 assert.doesNotMatch(english,/bằng tiếng Việt/);
 const rubric=renderToStaticMarkup(createElement(AnalysisResults,{analysis,language:'en',compact:true}));
 assert.match(rubric,/An English explanation/);assert.match(rubric,/An English next step/);assert.match(rubric,/A personal lesson/);
 assert.doesNotMatch(rubric,/bằng tiếng Việt/);
 assert.ok(rubric.includes(evidence),'Verbatim source evidence remains in the original language');
 const vietnamese=renderToStaticMarkup(createElement(Guidance,{analysis,language:'vi',onCommit(){}}));
 assert.match(vietnamese,/Điểm mạnh bằng tiếng Việt/);assert.doesNotMatch(vietnamese,/A specific strength/);
});

test('translation validation rejects incomplete or misaligned versions and cannot overwrite assessment values',()=>{
 assert.deepEqual(feedbackTranslations({en:{...en,questions:[]}},result),{});
 assert.deepEqual(feedbackTranslations({en:{...en,criteria:[...en.criteria].reverse()}},result),{});
 const candidate={...en,total:10,level:4,levelEvidence:'Forged quotation',criteria:en.criteria.map(c=>({...c,score:10,evidence:'Forged quotation'}))};
 const normalized=normalizeFeedback({...result,translations:{en:candidate}},{...emptyContent,what:evidence},defaultRubric,[],'vi');
 assert.equal(normalized.total,7);assert.equal(normalized.criteria[0].score,7);
 assert.equal(normalized.criteria[0].evidence,evidence);
 assert.equal(normalized.translations.en.total,undefined);
 assert.equal(normalized.translations.en.criteria[0].score,undefined);
 assert.equal(normalized.translations.en.criteria[0].evidence,undefined);
});

test('new AI schemas request saved bilingual prose and thinking replies without reassessing on a language switch',()=>{
 assert.ok(feedbackSchema.required.includes('translations'));assert.ok(chatSchema.required.includes('translations'));
 for(const language of ['en','vi']){
  assert.ok(feedbackSchema.properties.translations.required.includes(language));
  assert.ok(chatSchema.properties.translations.required.includes(language));
  assert.match(coachInstructions(language),/Translate the SAME feedback/);
  assert.match(reflectionThinkingInstructions(language),/SAME reply/);
 }
 assert.deepEqual(replyTranslations({en:'  English reply  ',vi:'Câu trả lời tiếng Việt',bad:'unused'}),{en:'English reply',vi:'Câu trả lời tiếng Việt'});
 assert.deepEqual(replyTranslations({en:42,vi:'x'.repeat(6001)}),{});
});
