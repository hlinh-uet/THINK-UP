import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRubric,defaultWeeks} from '../lib/domain.ts';
import {courseChangeHeadlines,courseHistoryEntries} from '../lib/course-history.ts';

const payload=(extra={})=>({name:'Tư duy',code:'KNM1',className:'KNM1-01',weeks:structuredClone(defaultWeeks),rubric:structuredClone(defaultRubric),...extra});
const record=(id,createdAt,value)=>({id,kind:'course-history',ownerId:'u',reflectionId:null,courseId:'c-new',versionId:null,payload:value,revision:1,createdAt,updatedAt:createdAt});

test('each save is compared with the one before and newest comes first',()=>{
 const edited=payload();edited.rubric[0].weight-=5;edited.rubric[3].weight+=5;edited.weeks[3].due='2026-10-18';
 const entries=courseHistoryEntries([record('b','2026-02',edited),record('a','2026-01',payload())]);
 assert.deepEqual(entries.map(e=>[e.record.id,e.current,e.initial]),[['b',true,false],['a',false,true]]);
 assert.deepEqual(entries[0].changes.map(c=>c.field),['weight','weight','due']);
 assert.deepEqual(courseChangeHeadlines(entries[0].changes),['Đổi trọng số rubric','Đổi hạn nộp']);
 assert.equal(entries[0].changes[0].after,defaultRubric[0].weight-5);
});

test('an archived copy of an unchanged course is not a change',()=>{
 const {className,...baseline}=payload();assert.ok(className);
 const entries=courseHistoryEntries([record('seed','2026-01',payload()),record('base','2026-02',{...baseline,baseline:true}),record('save','2026-03',payload({commitmentDeadline:{kind:'days',days:7}}))]);
 assert.deepEqual(entries.map(e=>e.record.id),['save','seed']);
 assert.deepEqual(entries[0].changes.map(c=>c.field),['deadline']);
});

test('the same text saved in the other language is not an edit, and a first baseline hides its owner',()=>{
 const english=payload();english.rubric[0].name='Reflection Depth';
 const entries=courseHistoryEntries([record('base','2026-01',payload({baseline:true})),record('save','2026-02',english)]);
 assert.equal(entries[1].showOwner,false);
 assert.deepEqual(entries[0].changes,[]);
});

test('a description edit records the level and both wordings',()=>{
 const edited=payload();edited.rubric[2].descriptions[2]='Mới';
 const [entry]=courseHistoryEntries([record('a','2026-01',payload()),record('b','2026-02',edited)]);
 assert.deepEqual(entry.changes.map(c=>[c.field,c.level,c.after]),[['description',2,'Mới']]);
 assert.deepEqual(courseChangeHeadlines(entry.changes),['Sửa mô tả rubric']);
});
