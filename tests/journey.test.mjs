import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {defaultWeeks,emptyContent} from '../lib/domain.ts';
import {actionsForCourse,previousCommitments} from '../lib/journey.ts';
import {studentPages,resolveView,viewPath} from '../lib/access.ts';

const reflection=(id,week,courseId='course',createdAt=`2026-10-0${week}T00:00:00Z`)=>({id,userId:'student',title:`Reflection ${id}`,week,courseId,content:emptyContent,status:'draft',rev:1,latestVersion:'version',createdAt,updatedAt:createdAt,versions:[],analyses:[],reviews:[],attachments:[]});
const action=(id,reflectionId,status='todo')=>({id,userId:'student',reflectionId,text:`Action ${id}`,status,due:'',review:status==='done'?'I tried it and learned to listen.':'',createdAt:'2026-10-01T00:00:00Z'});
const r1=reflection('first',1),r2=reflection('second',2),r3=reflection('third',3),other=reflection('other',1,'other-course');
const actions=[action('finished','first','done'),action('pending','first'),action('next','second'),action('other','other'),action('personal',null)];

test('one journey navigation item contains actions; old action URLs still reach it',()=>{
  assert.equal(studentPages.filter(page=>page.key==='journey').length,1);
  assert.equal(studentPages.some(page=>page.key==='actions'),false);
  assert.equal(resolveView('student','actions'),'journey');
  assert.equal(viewPath('student','actions'),'/student?view=journey');
  assert.equal(resolveView('lecturer','actions'),'lecturer');
});

test('course action scope follows the source reflection, keeping personal commitments in all courses',()=>{
  assert.deepEqual(actionsForCourse(actions,[r1,r2,r3,other],'course').map(a=>a.id),['finished','pending','next']);
  assert.deepEqual(actionsForCourse(actions,[r1,r2,r3,other],'other-course').map(a=>a.id),['other']);
  assert.deepEqual(actionsForCourse(actions,[r1,r2,r3,other],''),actions);
});

test('next reflection recalls completed and pending commitments from the latest earlier source in the same course',()=>{
  const rows=[r3,other,r2,{...r1,updatedAt:'2026-10-05T00:00:00Z'}];
  const previous=previousCommitments(r2,rows,actions);
  assert.equal(previous.reflection.id,'first');
  assert.deepEqual(previous.actions.map(a=>a.id),['finished','pending']);
  assert.equal(previousCommitments(r1,rows,actions),null,'Do not recall actions from a future reflection');
  assert.equal(previousCommitments({id:null,courseId:'course'},rows,actions,Date.parse('2026-10-05T00:00:00Z')).reflection.id,'second');
  assert.equal(previousCommitments({id:null,courseId:null},rows,actions),null,'Unlinked personal actions do not imply a source reflection');
  const sameWeek=reflection('same-week',1,'course','2026-10-01T01:00:00Z');
  assert.equal(previousCommitments(sameWeek,[r1,sameWeek],actions).reflection.id,'first','The next reflection need not be next week');
});

function componentModule(url) {
  const source=fs.readFileSync(url,'utf8');
  const result=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
  const output=result.outputText.replace(/from ["']([^"']+)["']/g,(match,specifier)=>{
    let resolved;
    if(specifier.startsWith('.')){
      const relative=new URL(specifier,url);
      const target=fs.existsSync(relative)?relative:fs.existsSync(new URL(relative.href+'.tsx'))?new URL(relative.href+'.tsx'):new URL(relative.href+'.ts');
      resolved=target.pathname.endsWith('.tsx')?componentModule(target):target.href;
    }else resolved=import.meta.resolve(specifier);
    return `from ${JSON.stringify(resolved)}`;
  });
  return 'data:text/javascript;base64,'+Buffer.from(output).toString('base64');
}
const Journey=(await import(componentModule(new URL('../app/JourneyTracker.tsx',import.meta.url)))).default;
const Reminder=(await import(componentModule(new URL('../app/ReflectionActionReminder.tsx',import.meta.url)))).default;

test('each weekly card contains its own linked commitments, outcome and source reflection; final review still determines week completion',()=>{
  const html=renderToStaticMarkup(createElement(Journey,{weeks:defaultWeeks,reflections:[r1,r2,other],actions,currentWeek:1,language:'en',onOpen:()=>{},onAction:()=>{}}));
  assert.equal((html.match(/data-week=/g)||[]).length,9);
  const week1=html.slice(html.indexOf('data-week="1"'),html.indexOf('data-week="2"'));
  const week2=html.slice(html.indexOf('data-week="2"'),html.indexOf('data-week="3"'));
  assert.match(week1,/Action finished/);assert.match(week1,/Action pending/);assert.match(week1,/I tried it and learned to listen/);
  assert.doesNotMatch(week1,/Action next/);assert.match(week2,/Action next/);assert.doesNotMatch(week2,/Action pending/);
  assert.match(html,/Actions without a linked reflection/);assert.match(html,/Action personal/);
  assert.match(html,/0 \/ 9 weeks completed/,'Completed actions do not mark a week as lecturer-assessed');
  assert.match(html,/From reflection: Reflection first/);
  assert.match(html,/Review/);
});

test('editor reminder shows all commitments and outcomes for the previous reflection',()=>{
  const previous=previousCommitments(r2,[r1,r2,other],actions);
  const html=renderToStaticMarkup(createElement(Reminder,{previous,language:'en',onReview:()=>{}}));
  assert.match(html,/id="reflection-action-reminder" open=""/);
  assert.match(html,/Action finished/);assert.match(html,/Action pending/);assert.match(html,/I tried it and learned to listen/);
  assert.doesNotMatch(html,/Action other/);assert.doesNotMatch(html,/Action next/);
  assert.equal(renderToStaticMarkup(createElement(Reminder,{previous:null,language:'vi',onReview:()=>{}})),'');
});

test('calendar due dates render on the same day in server and browser timezones',()=>{
 const originalTimezone=process.env.TZ;
 try{
  for(const language of ['vi','en']){
   const props={weeks:defaultWeeks,reflections:[r1],actions:[{...actions[0],due:'2026-09-18'}],currentWeek:1,language,onOpen:()=>{},onAction:()=>{}};
   const renderAt=timezone=>{process.env.TZ=timezone;return renderToStaticMarkup(createElement(Journey,props))};
   const server=renderAt('UTC');assert.match(server,/18\/09\/2026/);
   for(const timezone of ['Asia/Ho_Chi_Minh','America/Los_Angeles','Pacific/Auckland'])assert.equal(renderAt(timezone),server,language+' in '+timezone);
  }
 }finally{process.env.TZ=originalTimezone;}
});
