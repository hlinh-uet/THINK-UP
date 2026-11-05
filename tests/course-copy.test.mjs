import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRubric,defaultWeeks,validateRubric,validateWeeks} from '../lib/domain.ts';
import {anchorWeek,copyCourseSettings,shiftedDueDates} from '../lib/course-copy.ts';

const course=(id,start)=>({id,code:id.toUpperCase(),name:`Tên ${id}`,className:`${id}-01`,rubric:structuredClone(defaultRubric),commitmentDeadline:null,weeks:defaultWeeks.map((w,i)=>({...w,due:new Date(Date.UTC(2026,0,start+i*7)).toISOString().slice(0,10)}))});
const all={rubric:true,content:true,due:true,commitment:true},none={rubric:false,content:false,due:false,commitment:false};

test('due dates keep their spacing across month and year ends',()=>{
 const source=course('a',1);source.weeks[1].due='2026-01-10';
 const dates=shiftedDueDates(source.weeks,'2026-12-25');
 assert.equal(dates[0],'2026-12-25');assert.equal(dates[1],'2027-01-03');assert.equal(dates[8],'2027-02-19');
});
test('a week without a date stays empty and the first dated week is the anchor',()=>{
 const source=course('a',1);source.weeks[0].due='';source.weeks[4].due='';
 assert.equal(anchorWeek(source.weeks).week,2);
 const dates=shiftedDueDates(source.weeks,'2026-09-08');
 assert.equal(dates[0],'');assert.equal(dates[1],'2026-09-08');assert.equal(dates[2],'2026-09-15');assert.equal(dates[4],'');
});
test('everything chosen is copied, while identity stays and the result still validates',()=>{
 const source=course('a',1),target=course('b',1);source.rubric[0].weight=30;source.rubric[3].weight=25;source.rubric[1].descriptions[2]='Mô tả nguồn';source.rubric[0].name='Tên nguồn';source.weeks[2].title='Tuần nguồn';source.weeks[2].requirements='Yêu cầu nguồn';source.commitmentDeadline={kind:'days',days:5};
 const out=copyCourseSettings(target,source,all,{anchorDue:'2026-09-01'});
 assert.deepEqual([out.id,out.code,out.name,out.className],['b','B','Tên b','b-01']);
 assert.equal(out.rubric[0].weight,30);assert.equal(out.rubric[1].descriptions[2],'Mô tả nguồn');assert.equal(out.weeks[2].title,'Tuần nguồn');assert.equal(out.weeks[2].requirements,'Yêu cầu nguồn');assert.equal(out.weeks[0].due,'2026-09-01');assert.deepEqual(out.commitmentDeadline,{kind:'days',days:5});
 assert.equal(out.rubric[0].name,target.rubric[0].name);
 validateRubric(out.rubric);validateWeeks(out.weeks);
 assert.equal(copyCourseSettings(target,source,all).weeks[0].due,target.weeks[0].due);
 assert.equal(copyCourseSettings(target,source,all,{keepCriterionNames:false}).rubric[0].name,'Tên nguồn');
});
test('parts left out are not touched and the inputs are not changed',()=>{
 const source=course('a',1),target=course('b',8),before=structuredClone(target);source.commitmentDeadline={kind:'days',days:5};source.rubric[0].weight=30;source.rubric[3].weight=25;
 assert.deepEqual(copyCourseSettings(target,source,none),before);
 const out=copyCourseSettings(target,source,{...none,rubric:true});
 assert.deepEqual(out.weeks,before.weeks);assert.equal(out.commitmentDeadline,null);assert.deepEqual(target,before);
 out.rubric[1].descriptions[0]='x';assert.notEqual(source.rubric[1].descriptions[0],'x');
});
