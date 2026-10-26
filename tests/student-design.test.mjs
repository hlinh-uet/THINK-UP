import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {defaultWeeks,emptyContent} from '../lib/domain.ts';
import {studentNextStep,writingNextStep} from '../lib/student-next-step.ts';

const {default:Overview}=await import(componentModule(new URL('../app/StudentOverview.tsx',import.meta.url)));
const {default:CoursePicker}=await import(componentModule(new URL('../app/CoursePicker.tsx',import.meta.url)));
const reflection=(id,status,week,updatedAt)=>({id,status,week,updatedAt,title:`A reflection ${id}`,content:emptyContent,versions:[],courseId:null});
const props={reflections:[],actions:[],courses:[],weeks:defaultWeeks,currentWeek:defaultWeeks[3],language:'en',onOpen(){},onLibrary(){},onJourney(){},onProgress(){},onAction(){}};
const render=overrides=>renderToStaticMarkup(createElement(Overview,{...props,...overrides}));
const feature=html=>html.match(/<section class="overview-feature"[\s\S]*?<\/section>/)?.[0]||'';

test('course menu preserves one selected filter and exposes the current course with a compact trigger',()=>{
  const courses=[{id:'first',code:'REF101',name:'Reflection practice'},{id:'second',code:'REF202',name:'Applying the learning'}];
  const before=JSON.stringify(courses);
  for(const language of ['en','vi'])for(const value of ['', 'first', 'second', 'unavailable']){
    const html=renderToStaticMarkup(createElement(CoursePicker,{courses,value,language,onChange(){throw new Error('Rendering cannot change the filter')}}));
    const selected=html.match(/<button[^>]*role="menuitemradio"[^>]*aria-checked="true"[^>]*>[\s\S]*?<\/button>/g)||[];
    assert.equal(selected.length,1);
    assert.ok(selected[0].includes(courses.find(course=>course.id===value)?.name||(language==='en'?'All courses':'Tất cả học phần')));
    const trigger=html.match(/<button[^>]*class="course-picker-trigger"[^>]*>[\s\S]*?<\/button>/)?.[0]||'';
    assert.ok(trigger.includes(language==='en'?'<span>Course</span>':'<span>Học phần</span>'));assert.match(trigger,/aria-expanded="false"/);
    assert.match(html,/popover="auto" role="menu"/);
    assert.equal((html.match(/role="menuitemradio"/g)||[]).length,courses.length+1);
  }
  const disabled=renderToStaticMarkup(createElement(CoursePicker,{courses:[],value:'',language:'en',disabled:true,onChange(){}}));
  assert.match(disabled,/class="course-picker-trigger"[^>]*disabled=""/);
  assert.equal((disabled.match(/aria-checked="true"/g)||[]).length,1,'The all-courses option remains available with no enrollments');
  assert.equal(JSON.stringify(courses),before);
});

test('student home gives returned work priority and never offers to edit a submitted reflection',()=>{
  const submitted=reflection('submitted','submitted',4,'2026-10-15T12:00:00Z');
  const draft=reflection('draft','draft',6,'2026-10-16T12:00:00Z');
  const returned=reflection('returned','returned',5,'2026-10-14T12:00:00Z');
  const rows=[submitted,draft,returned],before=JSON.stringify(rows);
  const html=feature(render({reflections:rows}));
  assert.match(html,/View lecturer feedback/);assert.match(html,/Week 5/);assert.match(html,/A reflection returned/);
  assert.match(feature(render({reflections:[submitted,draft]})),/Continue writing/);
  assert.match(feature(render({reflections:[submitted]})),/Choose an action/);
  const locked=feature(render({reflections:[submitted],actions:[{id:'done',reflectionId:submitted.id,status:'done',text:'Already applied',due:''}]}));
  assert.match(locked,/Read your submission/);assert.doesNotMatch(locked,/Continue writing|Start writing/);
  assert.equal(JSON.stringify(rows),before,'Rendering does not reorder or alter stored reflections');
});

test('student home renders empty, completed and bilingual states using actual records',()=>{
  const empty=render({});assert.match(empty,/Write your first page/);assert.match(empty,/aria-valuenow="0"/);
  const rows=[reflection('one','final',1,'2026-10-13T12:00:00Z'),reflection('two','final',1,'2026-10-14T12:00:00Z'),reflection('three','draft',2,'2026-10-15T12:00:00Z')];
  const actions=[{id:'done',status:'done',text:'Completed commitment',due:''},{id:'todo',status:'todo',text:'My next step',due:''}];
  const english=render({reflections:rows,actions});assert.match(english,/aria-valuenow="1"/);
  const tile=(html,name)=>html.match(new RegExp(`<span class="space-tile-name">${name}</span>[\\s\\S]*?</button>`))?.[0]||'';
  assert.match(tile(english,'My writing'),/space-tile-value">3</);assert.match(tile(english,'My writing'),/1 draft/);
  assert.match(tile(english,'Commitments'),/space-tile-value">1</,'Only open commitments are counted');
  assert.match(tile(english,'Progress'),/space-tile-value">2</);
  assert.doesNotMatch(english,/My next step|Completed commitment|A reflection two/,'The home page summarises other pages instead of repeating their lists');
  const vietnamese=render({language:'vi',reflections:rows,actions});assert.match(vietnamese,/Mở nhanh/);assert.match(vietnamese,/Cam kết/);
});

test('student home matches server and browser when ICU abbreviates September differently',()=>{
  const original=Date.prototype.toLocaleDateString,originalTimezone=process.env.TZ;
  const rows=[reflection('september','draft',4,'2026-09-30T16:59:00.000Z')];
  const actions=[{id:'september-action',status:'todo',text:'Review the outcome',due:'2026-09-30'}];
  const renderWithICU=(month,timezone,language)=>{
    process.env.TZ=timezone;
    Date.prototype.toLocaleDateString=function(locales,options){
      const result=original.call(this,locales,options);
      return options?.month==='short'?result.replace(/\bSept?\b/g,month):result;
    };
    return render({reflections:rows,actions,language});
  };
  try{
    for(const language of ['en','vi']){
      const server=renderWithICU('Sept','UTC',language);
      for(const timezone of ['Asia/Ho_Chi_Minh','America/Los_Angeles','Pacific/Auckland'])assert.equal(renderWithICU('Sep',timezone,language),server,`${language}/${timezone}`);
      assert.ok(server.includes(language==='en'?'30 Sep 2026':'30/09/2026'));
    }
  }finally{
    Date.prototype.toLocaleDateString=original;
    if(originalTimezone===undefined)delete process.env.TZ;else process.env.TZ=originalTimezone;
  }
});


test('next task follows work the student can do instead of leaving them on a waiting screen',()=>{
  const draft=reflection('draft','draft',4,'2026-10-02T00:00:00Z'),returned=reflection('returned','returned',3,'2026-10-01T00:00:00Z'),submitted=reflection('submitted','submitted',4,'2026-10-03T00:00:00Z');
  const action={id:'action',reflectionId:submitted.id,status:'todo',text:'Apply the learning',due:'2026-10-05'};
  assert.equal(studentNextStep([draft,returned,submitted],[action],defaultWeeks,4).kind,'revise');
  assert.equal(studentNextStep([draft,submitted],[action],defaultWeeks,4).kind,'write');
  assert.equal(studentNextStep([submitted],[action],defaultWeeks,4).kind,'act');
  assert.equal(studentNextStep([submitted],[],defaultWeeks,4).kind,'commit');
  assert.equal(studentNextStep([submitted],[{...action,status:'done'}],defaultWeeks,4).kind,'waiting');
  assert.equal(studentNextStep([submitted],[],defaultWeeks,2).kind,'start','A future submission must not hide the current unwritten week');
  const finished=defaultWeeks.map(w=>reflection(`final-${w.week}`,'final',w.week,'2026-10-01T00:00:00Z'));
  assert.equal(studentNextStep(finished,[],defaultWeeks,9).kind,'complete');
});

test('editor points to feedback, writing, course selection, review, submission and action in order',()=>{
  const blank={...reflection('draft','draft',4,'2026-10-01T00:00:00Z'),courseId:'course'};
  const options={preview:false,feedbackSeen:false,hasLecturerFeedback:false,hasCourses:true};
  assert.equal(writingNextStep(blank,options),'write');
  const writing={...blank,content:{...emptyContent,what:'My own experience and what I learned.'}};
  assert.equal(writingNextStep({...writing,status:'returned'},{...options,hasLecturerFeedback:true}),'feedback');
  assert.equal(writingNextStep({...writing,status:'returned'},{...options,hasLecturerFeedback:true,feedbackSeen:true}),'review');
  assert.equal(writingNextStep({...writing,courseId:null},options),'course');
  assert.equal(writingNextStep(writing,options),'review');
  assert.equal(writingNextStep(writing,{...options,preview:true}),'submit');
  for(const status of ['submitted','final'])assert.equal(writingNextStep({...writing,status},{...options,preview:true,hasLecturerFeedback:true}),'action');
});
