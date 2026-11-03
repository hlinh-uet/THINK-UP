import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {defaultWeeks,defaultRubric,emptyContent} from '../lib/domain.ts';
import {actionDeadline,actionOverdue,actionCompletedLate,actionTimingLabel,validateCommitmentDeadline,policyDeadline,deadlineFromInput,deadlineInput} from '../lib/commitment-deadline.ts';

const createdAt='2026-10-01T03:00:00.000Z',dueAt='2026-10-08T03:00:00.000Z';
const pending={id:'commitment',userId:'student',reflectionId:'reflection',createdAt,text:'Ask my group for feedback',due:'2099-01-01',status:'in_progress',review:'',revision:1};
const course={id:'course',name:'Study skills',code:'KNM1101',weeks:defaultWeeks,rubric:defaultRubric,commitmentDeadline:{kind:'days',days:7}};
const source={id:'reflection',courseId:course.id,userId:'student',week:1,title:'Working with my group',content:emptyContent,status:'submitted',createdAt,updatedAt:createdAt,attachments:[],analyses:[],reviews:[],versions:[]};

test('deadline rules validate and calculate exact Vietnam-time deadlines',()=>{
 for(const value of [{kind:'days',days:0},{kind:'days',days:1.5},{kind:'days',days:366},{kind:'days',days:'7'},{kind:'fixed',at:'2026-02-30T00:00:00.000Z'},{kind:'fixed',at:'2026-10-08'},'7'])assert.throws(()=>validateCommitmentDeadline(value));
 assert.equal(validateCommitmentDeadline(null),null);
 assert.equal(policyDeadline(validateCommitmentDeadline(course.commitmentDeadline),createdAt),dueAt);
 const midnight='2026-10-31T17:30:00.000Z';
 assert.equal(deadlineInput(midnight),'2026-11-01T00:30');
 assert.equal(deadlineFromInput('2026-11-01T00:30'),midnight);
 assert.equal(actionDeadline(pending,{kind:'fixed',at:midnight}).due,'2026-11-01');
});

test('pending work follows course changes while completed work retains its deadline and late classification',()=>{
 const timing=actionDeadline(pending,course.commitmentDeadline);
 assert.deepEqual(timing,{due:'2026-10-08',dueAt,deadlineSource:'lecturer',deadlinePolicy:course.commitmentDeadline});
 const action={...pending,...timing};
 assert.equal(actionOverdue(action,Date.parse(dueAt)),false);
 assert.equal(actionOverdue(action,Date.parse(dueAt)+1),true);
 const complete={...action,status:'done',completedAt:'2026-10-08T03:00:00.001Z'};
 assert.equal(actionOverdue(complete,Date.parse(dueAt)+864e5),false);
 assert.equal(actionCompletedLate(complete),true);
 assert.equal(actionTimingLabel(complete),'Hoàn thành muộn');
 assert.deepEqual(actionDeadline(complete,{kind:'days',days:30}),timing);
 assert.equal(actionTimingLabel({...complete,completedAt:dueAt}),'Hoàn thành đúng hạn');
 assert.equal(actionTimingLabel({...complete,completedAt:null}),'Hoàn thành','Do not invent punctuality for older records');
 assert.equal(actionOverdue({...pending,due:'2026-10-08'},Date.parse('2026-10-08T16:59:59.999Z')),false);
 assert.equal(actionOverdue({...pending,due:'2026-10-08'},Date.parse('2026-10-08T17:00:00Z')),true);
});

test('student course deadlines are read-only and the lecturer sees completion timing and evidence',async()=>{
 const {default:Editor}=await import(componentModule(new URL('../app/ActionEditor.tsx',import.meta.url)));
 const {default:Monitor}=await import(componentModule(new URL('../app/LecturerActions.tsx',import.meta.url)));
 const complete={...pending,...actionDeadline(pending,course.commitmentDeadline),status:'done',completedAt:'2026-10-09T03:00:00.000Z',review:'Recorded feedback from three members.',evidence:'Three interview notes.'};
 for(const language of ['vi','en']){
  const editor=renderToStaticMarkup(createElement(Editor,{initial:pending,reflections:[source],courses:[course],language,busy:false,onSave:async()=>{}}));
  assert.doesNotMatch(editor,/type="date"/);
  assert.match(editor,/08\/10\/2026/);
  assert.ok(editor.includes(language==='vi'?'Do giảng viên quy định':'Assigned by the lecturer'));
  const personal=renderToStaticMarkup(createElement(Editor,{initial:{...pending,reflectionId:null},reflections:[],courses:[course],language,busy:false,onSave:async()=>{}}));
  assert.match(personal,/type="date"/);
  const monitor=renderToStaticMarkup(createElement(Monitor,{actions:[complete],reflections:[source],users:[{id:'student',name:'Student One'}],language}));
  assert.ok(monitor.includes(language==='vi'?'Hoàn thành muộn':'Completed late'));
  assert.match(monitor,/09\/10\/2026/);
  assert.match(monitor,/Three interview notes/);
 }
});

test('course settings expose a separate deadline rule and preserve the reflection submission dates',async()=>{
 const {CourseSettings}=await import(componentModule(new URL('../app/LecturerCourses.tsx',import.meta.url)));
 const html=renderToStaticMarkup(createElement(CourseSettings,{course,initialSection:'commitments',records:[],language:'en',busy:'',onMutate:async()=>true}));
 assert.match(html,/Commitment deadlines/);assert.match(html,/Days from commitment creation/);assert.match(html,/value="7"/);
 assert.match(html,/Monitor student commitments/);assert.match(html,/tab=actions/);
 assert.match(html,/Completed commitments keep their original deadline/);
});
