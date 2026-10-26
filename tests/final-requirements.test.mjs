import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRubric,criterionKeys,totalScore,validateScores} from '../lib/domain.ts';
import {criterionLevel,validateAssessment,reviewScoresOnTen} from '../lib/assessment.ts';
import {normalizeFeedback} from '../lib/feedback-schema.ts';
import {normalizeReading} from '../lib/reading.ts';
import {diffText} from '../lib/revision-diff.ts';
import {translate} from '../lib/i18n.ts';
import {classAnalytics,reportRows} from '../lib/learning-analytics.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
const {default:ReadingCriteria}=await import(componentModule(new URL('../app/ReadingCriteria.tsx',import.meta.url)));
const {default:LecturerCoachHistory}=await import(componentModule(new URL('../app/LecturerCoachHistory.tsx',import.meta.url)));
const {default:LecturerAnalytics}=await import(componentModule(new URL('../app/LecturerAnalytics.tsx',import.meta.url)));
const content={what:'Our team interviewed six students.',soWhat:'I questioned my assumption about silence.',nowWhat:'I learned to ask before deciding, but this depends on the situation.',action:'Next Tuesday I will ask two questions and count the replies.'};
const criteria=(scores=[8.2,7.1,8.8,7.6])=>criterionKeys.map((key,i)=>({key,level:criterionLevel(scores[i]),score:scores[i],evidence:Object.values(content)[i],reason:'Specific evidence supports this assessment.',improvement:'Check another perspective and its evidence.',attachmentNames:[]}));
const feedback=()=>({strengths:[],development:['Explain the cause.'],questions:[],suggestedActions:[],context:'',level:3,levelReason:'Connects a grounded lesson to the self.',levelEvidence:content.nowWhat,criteria:criteria().map(c=>({...c,behavior:c.reason,evidenceSection:null}))});
test('final rubric accepts distinct decimal scores inside all level boundaries and keeps historical totals explicit',()=>{
 for(const [score,level] of [[0,1],[2.5,1],[2.6,2],[5,2],[5.1,3],[7.5,3],[7.6,4],[10,4]])assert.equal(criterionLevel(score),level);
 assert.deepEqual(validateScores([0,2.6,7.5,10]),[0,2.6,7.5,10]);
 for(const bad of [NaN,Infinity,-.1,10.1,2.55,'8'])assert.throws(()=>validateScores([bad,5,5,5]));
 assert.equal(totalScore([8.2,7.1,8.8,7.6],defaultRubric),7.93);
 assert.equal(totalScore([3,4,2,3],defaultRubric,4),7.63);
 assert.deepEqual(reviewScoresOnTen({scores:[3,4,2,3]}),[7.5,10,5,7.5]);
});
test('confirmed criteria need matching level, actual evidence, rationale and improvement; absence requires explicit low-level confirmation',()=>{
 assert.equal(validateAssessment(criteria(),content,defaultRubric,[]).length,4);
 for(const patch of [{level:2},{evidence:'Invented quotation.'},{reason:''},{improvement:''},{attachmentNames:['foreign.png']}]){const value=criteria();value[0]={...value[0],...patch};assert.throws(()=>validateAssessment(value,content,defaultRubric,[]));}
 const absent=criteria();absent[3]={...absent[3],score:0,level:1,evidence:'',missingReason:'No future action is described in this reflection.'};assert.equal(validateAssessment(absent,content,defaultRubric,[])[3].score,0);
 absent[3].level=4;absent[3].score=8;assert.throws(()=>validateAssessment(absent,content,defaultRubric,[]));
});
test('invalid or missing AI evidence remains unscored and blocks an overall total',()=>{
 const valid=normalizeFeedback(feedback(),content,defaultRubric,[],'en');assert.equal(valid.scoreScale,10);assert.equal(valid.total,7.93);assert.equal(valid.reviewRequired,false);
 const raw=feedback();raw.criteria[1].evidence='Not in the writing.';const result=normalizeFeedback(raw,content,defaultRubric,[],'en');assert.equal(result.criteria[1].score,null);assert.equal(result.criteria[1].level,null);assert.equal(result.total,null);assert.equal(result.reviewRequired,true);
 raw.criteria[1].score=null;raw.criteria[1].level=null;assert.equal(normalizeFeedback(raw,content,defaultRubric,[],'en').total,null);
});
test('reading assistant rejects invented source excerpts and requires grounded pedagogical feedback',()=>{
 const report={summary:[{text:'The team interviewed students.',evidence:content.what,section:'action'}],thinking:[],learning:[],attention:[],criteria:['reflectionDepth','evidenceContext','insight','actionPlan'].map(key=>({key,status:'supported',text:'A grounded reading note.',evidence:content.what,section:'what'})),feedback:{strengths:'Concrete context.',development:'Consider another perspective.',evidence:content.what,questions:'Why?',nextSteps:'Explain a cause.'}};
 assert.equal(normalizeReading(report,content).summary[0].section,'what');
 assert.throws(()=>normalizeReading({...report,summary:[{...report.summary[0],evidence:'Fabricated.'}]},content));
 assert.throws(()=>normalizeReading({...report,feedback:{...report.feedback,evidence:'Fabricated.'}},content));
 assert.throws(()=>normalizeReading({...report,criteria:undefined},content));
 assert.throws(()=>normalizeReading({...report,criteria:report.criteria.map(c=>({...c,key:'reflectionDepth'}))},content));
 assert.throws(()=>normalizeReading({...report,criteria:report.criteria.map(c=>({...c,evidence:'Invented criterion quote.'}))},content));
 assert.throws(()=>normalizeReading({...report,criteria:report.criteria.map(c=>({...c,evidence:''}))},content));
 const insufficient=normalizeReading({...report,criteria:report.criteria.map(c=>({...c,status:'insufficient',evidence:'',section:'action',text:'No specific action or supporting evidence is stated.'}))},content);
 assert.equal(insufficient.criteria[3].section,null);
 assert.equal(insufficient.criteria[3].status,'insufficient');
 for(const language of ['en','vi']){
  const html=renderToStaticMarkup(createElement(ReadingCriteria,{report:insufficient,rubric:defaultRubric,language,quote:text=>text?createElement('button',null,text):null}));
  for(const c of defaultRubric)assert.ok(html.includes(translate(c.name,language).replaceAll('&','&amp;')));
  assert.equal((html.match(/No specific action/g)||[]).length,4);
  assert.ok(!html.includes('<button'),'Insufficient evidence must not be presented as a source quotation.');
  const old=renderToStaticMarkup(createElement(ReadingCriteria,{report:{...report,criteria:undefined},rubric:defaultRubric,language,quote:()=>null}));
  assert.match(old,language==='vi'?/Báo cáo cũ/:/historical report/);
 }
});
test('teacher Coach history includes all five groups, source versions, stale context and thinking replies',()=>{
 const result={...feedback(),strengths:['Unique strength'],development:['Unique development'],questions:['Unique question?'],suggestedActions:['Unique action']};
 const reflection={id:'r',title:'Updated',content,versions:[{id:'v',title:'Before edit',content}],analyses:[{id:'a',kind:'coach',versionId:'v',provider:'TEST',createdAt:'2026-10-25T00:00:00Z',result}],coachTurns:[{id:'turn',question:'__reflection_thinking__',reply:'Unique thinking reply',createdAt:'2026-10-25T01:00:00Z'}]};
 for(const language of ['en','vi']){
  const html=renderToStaticMarkup(createElement(LecturerCoachHistory,{reflection,language}));
  for(const text of ['Unique strength','Unique development','Unique question?','Unique action','Unique thinking reply',result.levelReason,content.nowWhat])assert.ok(html.includes(text),text);
  assert.match(html,language==='vi'?/Nội dung đã thay đổi sau phân tích này./:/writing has changed since this analysis/);
  assert.match(html,language==='vi'?/Mức phản tư/:/Reflection level/);
  assert.doesNotMatch(html,/<button|<form|<input/,'Reading history never confirms actions on behalf of the student.');
 }
});
test('version diff preserves exact before/after text for additions, removals, Vietnamese and long documents',()=>{
 for(const [a,b] of [['Tôi nghĩ nhóm sai.','Tôi nghĩ lại: cách phân công chưa rõ.'],['','new'],['removed',''],['a '.repeat(1000)+'old','a '.repeat(1000)+'new']]){const parts=diffText(a,b);assert.equal(parts.filter(p=>p.kind!=='added').map(p=>p.text).join(''),a);assert.equal(parts.filter(p=>p.kind!=='removed').map(p=>p.text).join(''),b);}
});
test('class statistics have criterion denominators, distinct levels, actions, missing values and full CSV fields',()=>{
 const review={decision:'final',scores:[8.2,7.1,8.8,7.6],scoreScale:10,criteria:criteria(),rubric:defaultRubric,total:7.93,level:3};
 const final={id:'one',userId:'student',courseId:'course',title:'One',week:1,status:'final',content,latestVersion:'v',versions:[{id:'v',title:'One',content}],reviews:[review],analyses:[]};
 const pending={...final,id:'two',status:'submitted',reviews:[]};const summary=classAnalytics([final,pending],[{status:'done'},{status:'needs_adjustment'}],defaultRubric);
 assert.equal(summary.criteria[0].average,8.2);assert.equal(summary.criteria[0].count,1);assert.equal(summary.criteria[0].missing,1);assert.deepEqual(summary.criteria[0].distribution,[0,0,0,1]);assert.equal(summary.actions.rate,.5);assert.equal(summary.actions.needsAdjustment,1);assert.equal(summary.agreement.meanAbsoluteError,null);assert.equal(reportRows([final],defaultRubric)[0].length,31);
 assert.equal(summary.criteria[0].students,1);
 assert.equal(classAnalytics([final,{...final,id:'three'}],[],defaultRubric).criteria[0].students,1,'Two articles from one student are one assessed student.');
});
test('class phase comparison shows original means and separate article/student denominators, including empty phases',()=>{
 const row=(id,userId,week,score)=>({id,userId,courseId:'c',title:id,week,status:score===null?'submitted':'final',content,createdAt:'2026-10-01',versions:[{id:'v',stage:'Revision 1',title:id,content}],analyses:[],reviews:score===null?[]:[{decision:'final',scores:[score,score,score,score],scoreScale:10,criteria:criteria([score,score,score,score]),rubric:defaultRubric,total:score,level:3}]});
 const rows=[row('a','one',1,6),row('b','one',2,8),row('c','two',5,9),row('d','three',6,null)];
 const early=classAnalytics(rows.filter(r=>r.week<=4),[],defaultRubric),late=classAnalytics(rows.filter(r=>r.week>4),[],defaultRubric);
 assert.equal(early.criteria[0].average,7);assert.equal(early.criteria[0].count,2);assert.equal(early.criteria[0].students,1);
 assert.equal(late.criteria[0].average,9);assert.equal(late.criteria[0].count,1);assert.equal(late.criteria[0].students,1);assert.equal(late.criteria[0].missing,1);
 const props={courses:[],students:['one','two','three'].map(id=>({id,name:id})),memberships:[],actions:[],participation:[],rubric:defaultRubric,detailHref:id=>id,studentHref:id=>id,language:'en'};
 const html=renderToStaticMarkup(createElement(LecturerAnalytics,{...props,reflections:rows}));
 for(const text of ['W1–W4','W5–W9','7.00','9.00','2 scored reflections / 1 student','1 reflection without a score','2 students without a score','+2.0'])assert.ok(html.includes(text),text);
 const empty=renderToStaticMarkup(createElement(LecturerAnalytics,{...props,reflections:rows.filter(r=>r.week<=4)}));
 assert.ok(empty.includes('0 scored reflections / 0 students'));assert.doesNotMatch(empty,/NaN|Infinity/);
});
