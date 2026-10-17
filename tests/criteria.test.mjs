import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultRubric, criterionKeys, writingSections, rubricSpecification, validateRubric } from '../lib/domain.ts';
import { normalizeFeedback, feedbackSchema } from '../lib/feedback-schema.ts';
import { learnerProgress } from '../lib/progress.ts';
import { coachInstructions } from '../lib/coach-prompt.ts';

const content={what:'We interviewed six students and recorded two different needs.',soWhat:'I felt uncertain because I had assumed that silence meant agreement.',nowWhat:'I now understand that I must ask about each person’s needs before deciding.',action:'Next Tuesday I will ask every team member two questions and record their answers.'};
function output(){return {strengths:['Specific personal insight.'],development:['Test the assumption.'],questions:['What did you learn?'],suggestedActions:['Ask two questions.'],context:'',level:2,levelReason:'The reflection connects a lesson but does not yet demonstrate a changed core belief.',levelEvidence:content.nowWhat,criteria:criterionKeys.map((key,i)=>({key,score:[5,10,5,10][i],level:[2,4,2,4][i],behavior:'Observed behavior.',evidence:content.nowWhat,evidenceSection:'nowWhat',attachmentNames:[],improvement:'Explain the cause.'})),total:999};}
test('the specification uses distinct grading criteria and the exact 35/25/20/20 weights',()=>{
  assert.deepEqual(defaultRubric.map(c=>c.label),['Reflection Depth','Evidence & Context Quality','Insight Realized','Action Plan']);
  assert.deepEqual(defaultRubric.map(c=>c.weight),[35,25,20,20]);assert.ok(defaultRubric.every(c=>c.descriptions.length===4));
  assert.deepEqual(writingSections.map(s=>s.key),['what','soWhat','nowWhat','action']);assert.ok(!criterionKeys.some(key=>writingSections.some(s=>s.key===key)));
  assert.throws(()=>validateRubric(defaultRubric.map(c=>({...c,weight:25}))));
  assert.deepEqual(feedbackSchema.properties.criteria.items.properties.key.enum,criterionKeys);assert.ok(feedbackSchema.required.includes('level'));
});
test('Kember classification stays independent of score calculation and quotations can come from any section',()=>{
  const raw=output(),original=JSON.stringify(raw),result=normalizeFeedback(raw,content,defaultRubric,[],'en');
  assert.equal(result.total,7.25);assert.equal(result.weightedScore,7.25);assert.equal(result.level,2);
  assert.equal(result.levelMethod,'ai-classification');assert.equal(result.rubricSpecification,rubricSpecification);
  assert.ok(result.criteria.every(c=>c.evidenceSection==='nowWhat'));assert.equal(JSON.stringify(raw),original);
  for(const language of ['en','vi']){const prompt=coachInstructions(language);assert.match(prompt,/whole reflection/i);assert.match(prompt,/NOT grading criteria/);assert.match(prompt,/Do NOT infer Kember level/);assert.match(prompt,/SMART/);}
});
test('only actually supplied attachments support Evidence & Context Quality',()=>{
  const raw=output();raw.criteria[1].evidence='';raw.criteria[1].evidenceSection=null;raw.criteria[1].attachmentNames=['product.png'];
  assert.equal(normalizeFeedback(raw,content,defaultRubric,['product.png'],'en').criteria[1].score,10);
  const missing=normalizeFeedback(raw,content,defaultRubric,[],'en');assert.equal(missing.criteria[1].score,null);assert.deepEqual(missing.criteria[1].attachmentNames,[]);
  raw.criteria[0].evidence='Fabricated personal thought.';raw.criteria[0].attachmentNames=['product.png'];
  const result=normalizeFeedback(raw,content,defaultRubric,['product.png'],'vi');assert.equal(result.criteria[0].score,null);assert.equal(result.criteria[0].evidence,'');assert.deepEqual(result.criteria[0].attachmentNames,[]);assert.equal(result.level,2);
});
test('malformed classification or legacy AI keys cannot be stored as new assessments',()=>{
  for(const value of [0,5,'3',null]){const raw=output();raw.level=value;assert.throws(()=>normalizeFeedback(raw,content,defaultRubric,[],'en'));}
  for(const field of ['levelReason','levelEvidence']){const raw=output();raw[field]='';assert.throws(()=>normalizeFeedback(raw,content,defaultRubric,[],'en'));}
  const fabricated=output();fabricated.levelEvidence='An invented statement.';assert.throws(()=>normalizeFeedback(fabricated,content,defaultRubric,[],'en'));
  const legacy=output();legacy.criteria[0].key='what';assert.throws(()=>normalizeFeedback(legacy,content,defaultRubric,[],'en'));
});
test('criterion statistics do not relabel historical What/So what scores as the new criteria',()=>{
  const legacy=writingSections.map(s=>({...s,weight:25,descriptions:['1','2','3','4']}));
  const reflection=(id,rubric)=>({id,userId:'student',courseId:'course',week:1,status:'final',versions:[],reviews:[{decision:'final',scores:[4,4,4,4],total:10,level:3,rubric}]});
  const progress=learnerProgress([reflection('old',legacy),reflection('new',defaultRubric)]);
  assert.equal(progress.final,2);assert.equal(progress.average,10);assert.ok(progress.criteria.every(c=>c.count===1&&c.average===10));
});
