import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRubric} from '../lib/domain.ts';
import {studentSpaceSummary} from '../lib/student-space-summary.ts';

const review=(scores,overrides={})=>({id:'review',decision:'final',createdAt:'2026-10-21T00:00:00Z',scores,scoreScale:10,rubric:defaultRubric,...overrides});
const reflection=(reviews,overrides={})=>({id:'reflection',status:'final',reviews,...overrides});

test('the home profile uses the latest final lecturer review and normalizes historical scales',()=>{
 const rows=[
  reflection([review([1,1,1,1],{createdAt:'2026-10-01T00:00:00Z'}),review([8,7,6,5])]),
  reflection([review([3,4,2,1],{scoreScale:4})]),
  reflection([review([10,10,10,10])],{status:'returned'}),
  reflection([],{status:'draft',analyses:[{kind:'feedback',result:{total:10}}]}),
 ];
 const before=JSON.stringify(rows),result=studentSpaceSummary(rows,defaultRubric);
 assert.equal(result.gradedCount,2);
 assert.deepEqual(result.criteria.map(c=>c.average),[7.75,8.5,5.5,3.75]);
 assert.deepEqual(result.criteria.map(c=>c.count),[2,2,2,2]);
 assert.equal(result.leading.key,'evidenceContext');
 assert.equal(result.focus.key,'actionPlan');
 assert.equal(JSON.stringify(rows),before);
});

test('unknown criteria and missing scores remain empty, while an actual zero stays a score',()=>{
 const unknown=defaultRubric.map((c,i)=>({...c,key:`old-${i}`}));
 const empty=studentSpaceSummary([reflection([]),reflection([review([8,8,8,8],{rubric:unknown})])],defaultRubric);
 assert.equal(empty.gradedCount,0);
 assert.ok(empty.criteria.every(c=>c.average===null&&c.count===0));
 assert.equal(empty.leading,undefined);assert.equal(empty.focus,undefined);
 const zero=studentSpaceSummary([reflection([review([0,NaN,Infinity,12])])],defaultRubric);
 assert.equal(zero.gradedCount,1);
 assert.deepEqual(zero.criteria.map(c=>c.average),[0,null,null,null]);
});

test('similar criterion scores do not produce arbitrary strength and improvement labels',()=>{
 const profile=studentSpaceSummary([reflection([review([7,7,7,7])])],defaultRubric);
 assert.equal(profile.gradedCount,1);
 assert.equal(profile.leading,undefined);assert.equal(profile.focus,undefined);
});

test('reflection level comes from the latest valid lecturer assessment, not an average or AI estimate',()=>{
 const result=studentSpaceSummary([
  reflection([review([8,8,8,8],{level:4,createdAt:'2026-10-01T00:00:00Z'})],{week:1}),
  reflection([review([6,6,6,6],{level:3,createdAt:'2026-10-20T00:00:00Z'})],{week:4}),
  reflection([review([7,7,7,7],{level:null,createdAt:'2026-10-25T00:00:00Z'})],{week:5}),
  reflection([review([10,10,10,10],{level:4,createdAt:'2026-10-27T00:00:00Z'})],{status:'submitted',week:6}),
 ],defaultRubric);
 assert.equal(result.level,3);assert.equal(result.levelWeek,4);
 assert.equal(studentSpaceSummary([],defaultRubric).level,null);
});

test('streak counts distinct assessed weeks and breaks at gaps, matching the progress page',()=>{
 const rows=[1,2,2,3,5,6,8].map(week=>reflection([review([7,7,7,7])],{week}));
 rows.push(reflection([review([7,7,7,7])],{week:4,status:'submitted'}));
 rows.push(reflection([],{week:7}));
 rows.push(reflection([review([7,7,7,7])],{week:10}));
 const result=studentSpaceSummary(rows,defaultRubric);
 assert.deepEqual(result.assessedWeeks,[1,2,3,5,6,8]);
 assert.equal(result.longestStreak,3);
 assert.equal(studentSpaceSummary([],defaultRubric).longestStreak,0);
});
