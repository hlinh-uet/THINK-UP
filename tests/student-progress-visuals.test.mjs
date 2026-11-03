import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {studentProgressVisuals} from '../lib/student-progress-visuals.ts';
import {defaultRubric,emptyContent,writingSections} from '../lib/domain.ts';
import {componentModule} from './helpers/component-module.mjs';

const row=(id,week,scores=[6,7,8,9],extra={})=>({id,userId:'student',courseId:'course',title:`Reflection ${id}`,week,content:emptyContent,status:'final',createdAt:'2026-10-01',updatedAt:'2026-10-01',versions:[],analyses:[],attachments:[],reviews:[{id:`review-${id}`,decision:'final',scores,scoreScale:10,total:7,level:3,rubric:defaultRubric,comment:'',createdAt:'2026-10-02'}],...extra});
test('progress charts average actual lecturer scores per week, break at missing weeks, and preserve scales',()=>{
 const legacy=row('legacy',4,[4,3,2,1]);legacy.reviews[0].scoreScale=4;
 const rows=[row('one',1,[4,5,6,7]),row('two',1,[8,7,8,9],{courseId:'another'}),row('three',3,[7,8,9,10]),legacy,row('draft',2,[10,10,10,10],{status:'draft'})];
 const before=JSON.stringify(rows),v=studentProgressVisuals(rows,[],defaultRubric),depth=v.criteria[0];
 assert.deepEqual(depth.weeks.slice(0,4).map(p=>p.value),[6,null,7,10]);
 assert.equal(depth.average,7.25,'Average weights individual assessments, rather than equally weighting weeks');
 assert.equal(depth.count,4);assert.equal(depth.delta,4);assert.equal(v.criteria[3].weeks[3].value,2.5);
 assert.equal(JSON.stringify(rows),before);
});
test('historical writing-section grades do not become modern criterion scores',()=>{
 const historical=row('old',1);historical.reviews[0].rubric=writingSections.map(s=>({...s,weight:25,descriptions:[]}));
 const v=studentProgressVisuals([historical],[],defaultRubric);
 assert.ok(v.criteria.every(c=>c.average===null&&c.delta===null&&c.count===0&&c.weeks.every(w=>w.value===null)));
});
test('the progress headline compares the same weighted criteria in the first and latest scored weeks',()=>{
 const start=row('start',2,[4,5,6,7]),latest=row('latest',5,[6,8,7,9]);
 const {change}=studentProgressVisuals([latest,start],[],defaultRubric);
 assert.equal(change.first.week,2);assert.equal(change.latest.week,5);
 assert.equal(Number(change.first.value.toFixed(2)),5.25);assert.equal(Number(change.latest.value.toFixed(2)),7.3);
 assert.equal(change.delta,2.05);assert.equal(change.mostImproved.key,'evidenceContext');assert.equal(change.mostImproved.delta,3);
 const decline=studentProgressVisuals([row('a',1,[8,8,8,8]),row('b',3,[5,5,5,5])],[],defaultRubric).change;
 assert.equal(decline.delta,-3);assert.equal(decline.mostImproved,undefined);
 const single=studentProgressVisuals([start],[],defaultRubric).change;
 assert.equal(single.delta,null);assert.equal(single.mostImproved,undefined);
 assert.equal(studentProgressVisuals([],[],defaultRubric).change.latest,undefined);
});
test('milestones count consecutive distinct weeks and completed actions only, without inventing achievements',()=>{
 const rows=[row('a',1),row('b',2),row('duplicate',2),row('c',4),row('d',5),row('e',6)];
 const actions=[{status:'done'},{status:'todo'},{status:'in_progress'}];
 const v=studentProgressVisuals(rows,actions,defaultRubric);
 assert.equal(v.longestStreak,3);assert.deepEqual(v.milestones.map(m=>m.value),[6,3,1]);
 const empty=studentProgressVisuals([],[],defaultRubric);
 assert.equal(empty.coach,undefined);assert.ok(empty.milestones.every(m=>m.value===0));
});
test('AI feedback is attached to a current writing version and excludes results awaiting review',()=>{
 const r=row('one',1);r.versions=[{id:'current',title:r.title,content:emptyContent},{id:'old',title:'Earlier title',content:emptyContent}];
 const analysis=(id,versionId,createdAt,reviewRequired=false)=>({id,versionId,kind:'coach',createdAt,rubric:defaultRubric,result:{reviewRequired,context:'Actual feedback',strengths:[],development:[]}});
 r.analyses=[analysis('valid','current','2026-10-01'),analysis('stale','old','2026-10-03'),analysis('incomplete','current','2026-10-04',true)];
 assert.equal(studentProgressVisuals([r],[],defaultRubric).coach.analysis.id,'valid');
});

const {default:StudentProgress}=await import(componentModule(new URL('../app/StudentProgress.tsx',import.meta.url)));
const {default:LearningAnalytics}=await import(componentModule(new URL('../app/LearningAnalytics.tsx',import.meta.url)));
test('progress starts with one visible overview and five labelled, keyboard-reachable tab destinations',()=>{
 const html=renderToStaticMarkup(createElement(StudentProgress,{reflections:[row('one',1)],actions:[],courses:[],rubric:defaultRubric,language:'en',onOpen(){}}));
 assert.equal((html.match(/role="tab"/g)||[]).length,5);
 assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
 for(const tab of ['overview','reflections','insight','streak','comparison']){
  assert.match(html,new RegExp(`id="pg-tab-${tab}" aria-controls="pg-panel-${tab}" aria-selected="${tab==='overview'}" tabindex="${tab==='overview'?0:-1}"`));
  assert.match(html,new RegExp(`id="pg-panel-${tab}" aria-labelledby="pg-tab-${tab}"${tab==='overview'?'':' hidden=""'} tabindex="0"`));
 }
 assert.match(html,/Longest streak/);
 assert.match(html,/Consecutive weeks with lecturer-assessed reflections/);
});
test('report tabs keep reflection scores, insights and time comparison in their own views while shared reports retain all sections',()=>{
 const props={reflections:[row('one',1),row('two',5)],actions:[],rubric:defaultRubric,language:'en'};
 const render=view=>renderToStaticMarkup(createElement(LearningAnalytics,{...props,...(view?{view}:{})}));
 const writing=render('reflections'),insight=render('insight'),comparison=render('comparison'),shared=render();
 assert.match(writing,/Criterion scores across reflections/);assert.doesNotMatch(writing,/Compare course stages|Criterion report|AI–lecturer/);
 assert.match(insight,/Criterion report/);assert.doesNotMatch(insight,/Compare course stages|Criterion scores across reflections/);
 assert.match(comparison,/Compare course stages/);assert.doesNotMatch(comparison,/Criterion scores across reflections|Criterion report/);
 assert.match(comparison,/aria-haspopup="menu"/);assert.equal((comparison.match(/role="menuitemradio"/g)||[]).length,8);
 assert.equal((comparison.match(/aria-checked="true"/g)||[]).length,1);
 assert.match(comparison,/Weeks 1–4/);assert.match(comparison,/Weeks 5–9/);
 assert.doesNotMatch(comparison,/<select/);assert.match(shared,/<select/);
 for(const label of ['Criterion scores across reflections','Compare course stages','Criterion report'])assert.ok(shared.includes(label));
 assert.match(writing,/<details class="report-disclosure" open="">/);assert.match(comparison,/<details class="report-disclosure" open="">/);
});
test('overview keeps the headline, key numbers and actionable highlights while detailed statistics and weekly charts stay in their tabs',()=>{
 const reflections=[row('first',1,[4,5,6,7]),row('latest',4,[7,8,9,10])];
 reflections[1].reviews[0].createdAt='2026-10-15';reflections[1].reviews[0].comment='A specific lecturer comment.';
 const html=renderToStaticMarkup(createElement(StudentProgress,{reflections,actions:[],courses:[],rubric:defaultRubric,language:'en',onOpen(){}}));
 const overview=html.slice(html.indexOf('id="pg-panel-overview"'),html.indexOf('id="pg-panel-reflections"'));
 const writing=html.slice(html.indexOf('id="pg-panel-reflections"'),html.indexOf('id="pg-panel-insight"'));
 const comparison=html.slice(html.indexOf('id="pg-panel-comparison"'));
 assert.match(overview,/pg-hero/);assert.match(overview,/At a glance/);assert.match(overview,/What stands out/);assert.match(overview,/Latest feedback/);
 assert.match(overview,/A specific lecturer comment/);assert.match(overview,/Your biggest step forward/);
 assert.doesNotMatch(overview,/pg-bars|pg-writing-statistics|revisions|evidence files/);
 assert.match(writing,/pg-writing-statistics/);assert.match(writing,/revisions/);
 assert.match(comparison,/pg-bars/);
});
test('progress renders understandable sections in both languages, with empty and assessed states',()=>{
 for(const language of ['en','vi'])for(const reflections of [[],[row('one',1),row('two',3)]]){
  const html=renderToStaticMarkup(createElement(StudentProgress,{reflections,actions:[],courses:[],rubric:defaultRubric,language,onOpen(){}}));
  for(const id of ['pg-level-title','pg-journey-title','pg-stats-title','pg-skills-title'])assert.match(html,new RegExp(`id="${id}"`));
  assert.ok(html.includes(language==='en'?'9-Week Journey':'Hành trình 9 tuần'));
  assert.equal((html.match(/class="pg-node/g)||[]).length,9);
  if(!reflections.length){assert.match(html,/<b>—<\/b>/);assert.doesNotMatch(html,/class="pg-flag/);assert.equal((html.match(/pg-bar is-off/g)||[]).length,9);}
  else{
   assert.match(html,/aria-valuenow="3"/,'The level comes from the latest final assessment');
   assert.equal((html.match(/pg-node is-done/g)||[]).length,2);assert.match(html,/pg-node is-now"[^>]*><i aria-hidden="true">2</);
   assert.match(html,/<em style="bottom:72.5%">7.3<\/em>/,'Weekly bars show the weighted lecturer score');
   assert.match(html,/pg-flag is-best/);assert.match(html,/pg-flag is-work/);
  }
 }
});
