import test from 'node:test';
import assert from 'node:assert/strict';
import { lecturerHref, lecturerPages, lecturerScope, safeCsv, weeklyClassProgress } from '../lib/lecturer-pages.ts';
import { canAssess, initialLecturerReview, reviewDecision } from '../lib/lecturer-review.ts';
import { defaultRubric,defaultWeeks } from '../lib/domain.ts';
import { blankAssessment, criterionLevel, rubricVersion, validateAssessment, validateAssessmentCriterion } from '../lib/assessment.ts';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';

const {default:LecturerNavigation}=await import(componentModule(new URL('../app/LecturerNavigation.tsx',import.meta.url)));
const {default:LecturerWorkspace}=await import(componentModule(new URL('../app/LecturerWorkspace.tsx',import.meta.url)));
const {default:CoursePicker}=await import(componentModule(new URL('../app/CoursePicker.tsx',import.meta.url)));
const {default:LecturerReview}=await import(componentModule(new URL('../app/LecturerReview.tsx',import.meta.url)));

const reviewContent={what:'We interviewed six students.',soWhat:'I questioned my assumptions.',nowWhat:'I learned to ask before deciding.',action:'Next Tuesday I will record two answers.'};
const completeCriteria=()=>defaultRubric.map((c,i)=>({key:c.key,level:criterionLevel(8),score:8,evidence:Object.values(reviewContent)[i],reason:'The passage supports this judgment.',improvement:'Compare a second perspective.',attachmentNames:[],missingReason:''}));
function renderReview({language='en',status='submitted',version='current',draft}={}){
 const reflection={id:'review-test',userId:'student',studentName:'Test Student',studentEmail:'student@example.test',courseId:'course',title:'Test reflection',week:1,status,rev:1,latestVersion:version,content:reviewContent,updatedAt:'2026-10-01',createdAt:'2026-10-01',versions:[{id:version,title:'Test reflection',content:reviewContent,stage:'Submitted',createdAt:'2026-10-01'}],analyses:[],reviews:[],attachments:[]};
 const data={user:{id:'teacher'},courses:[{id:'course',code:'REF101',rubric:defaultRubric}],rubric:defaultRubric,aiReady:false,learningRecords:draft?[{id:'draft',kind:'review-draft',ownerId:'teacher',reflectionId:reflection.id,versionId:'current',revision:1,payload:{rubricVersion:rubricVersion(defaultRubric),...draft}}]:[]};
 return renderToStaticMarkup(createElement(LecturerReview,{reflection,data,language,busy:'',onMutate:async()=>true,backHref:'/lecturer/submissions',backLabel:'Bài nộp',similarityHref:'/lecturer/similarity'}));
}

test('guided review restores matching drafts, blocks incomplete final assessments and keeps revision requests separate',()=>{
 const blank=renderReview();
 assert.match(blank,/0\/4 criteria/);
 assert.match(blank,/>Next criterion<svg/);
 assert.doesNotMatch(blank,/>Confirm and send/,'Final submission is only offered in the feedback step.');
 assert.match(blank,/id="lx-response-panel" hidden=""/);
 assert.match(blank,/id="lx-assistant-panel" hidden=""/);
 assert.equal((blank.match(/aria-expanded="true" aria-controls="lx-[^"]+-body"/g)||[]).length,1);
 assert.doesNotMatch(blank,/[À-ỹ]/,'The complete English form, including hidden panels, is translated.');
 const saved=renderReview({draft:{criteria:completeCriteria(),level:3,comment:'Saved feedback'}});
 assert.match(saved,/4\/4 criteria/);assert.match(saved,/>Saved feedback<\/textarea>/);
 assert.match(saved,/<button type="button" class="lx-btn is-primary">Write feedback/);
 const stale=renderReview({version:'new-version',draft:{criteria:completeCriteria(),level:3,comment:'Stale feedback'}});
 assert.match(stale,/0\/4 criteria/);assert.doesNotMatch(stale,/>Stale feedback<\/textarea>/);
 const returned=renderReview({status:'returned'});assert.doesNotMatch(returned,/class="lx-review-tabs"/);
 assert.match(returned,/Waiting for the student to resubmit/);
});

test('single-criterion progress uses the final assessment rules for scores, quotations and missing evidence',()=>{
 const rows=completeCriteria();
 assert.deepEqual(rows.map((row,i)=>validateAssessmentCriterion(row,i,reviewContent,defaultRubric,[])),validateAssessment(rows,reviewContent,defaultRubric,[]));
 for(const patch of [{score:8.05},{level:2},{evidence:'Invented passage.'},{reason:''},{improvement:''},{attachmentNames:['foreign.png']}])assert.throws(()=>validateAssessmentCriterion({...rows[0],...patch},0,reviewContent,defaultRubric,[]));
 assert.throws(()=>validateAssessmentCriterion(blankAssessment(defaultRubric)[0],0,reviewContent,defaultRubric,[]));
 const absent={...rows[0],level:1,score:0,evidence:'',missingReason:'The reflection does not examine an assumption.'};
 assert.equal(validateAssessmentCriterion(absent,0,reviewContent,defaultRubric,[]).score,0);
 assert.throws(()=>validateAssessmentCriterion({...absent,missingReason:'Missing'},0,reviewContent,defaultRubric,[]));
});

test('identical course names and codes remain distinguishable by their class names',()=>{
 const courses=['Class A','Class B'].map((className,i)=>({id:String(i),name:'Same course',code:'REF101',className}));
 const html=renderToStaticMarkup(createElement(CoursePicker,{courses,value:'1',language:'en',showSelection:true,onChange:()=>{}}));
 for(const name of ['Class A','Class B'])assert.ok(html.includes(`REF101 · ${name}`));
 assert.match(html,/title="REF101 · Class B · Same course"/);
});

test('teacher sidebar preserves class and course context, current destination and pending work',()=>{
  const query={course:'course & one',cohort:'Class / A'};
  for(const language of ['en','vi'])for(const {key:section} of lecturerPages){
    const html=renderToStaticMarkup(createElement(LecturerNavigation,{section,query,language,pending:7,unread:3,busy:true}));
    assert.equal((html.match(/<a /g)||[]).length,lecturerPages.length);
    assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
    assert.equal((html.match(/aria-disabled="true"/g)||[]).length,lecturerPages.length);
    for(const page of lecturerPages)assert.ok(html.includes(`href="${lecturerHref(page.key,query).replaceAll('&','&amp;')}"`));
    assert.ok(html.includes(language==='en'?'7 submissions awaiting assessment':'7 bài chờ đánh giá'));
    assert.match(html,/class="nav-count"[^>]*>3<\/small>/);
    assert.doesNotMatch(html,/href="\/(student|admin)/);
  }
});

test('teacher frame keeps course and class choices within teaching assignments in both languages',()=>{
  const course=(id,name,className)=>({id,name,className,code:id,weeks:defaultWeeks,rubric:defaultRubric});
  const data={user:{id:'teacher',name:'Teacher',email:'teacher@example.test',role:'lecturer',active:1},
    courses:[course('one','Assigned course A','Class A'),course('two','Assigned course B','Class B'),course('outside','Private unassigned course','Private class')],
    memberships:[{userId:'teacher',courseId:'one',role:'lecturer'},{userId:'teacher',courseId:'two',role:'lecturer'}],
    users:[],classReflections:[],classActions:[],rubric:defaultRubric,weeks:defaultWeeks,learningRecords:[],participation:[],aiReady:false};
  const before=JSON.stringify(data);
  for(const initialLanguage of ['en','vi'])for(const {key:section} of lecturerPages.filter(page=>page.key!=='messages')){
    const html=renderToStaticMarkup(createElement(LecturerWorkspace,{initialData:data,initialLanguage,section,query:{course:'one',cohort:'Class A'}}));
    const header=html.match(/<header class="sidebar">[\s\S]*?<\/header>/)?.[0]||'';
    const aside=html.match(/<aside class="workspace-side-navigation[^"]*"[\s\S]*?<\/aside>/)?.[0]||'';
    assert.match(header,/<a class="brand" href="\/lecturer\/overview"/);
    assert.match(header,/class="help-button"/);
    assert.doesNotMatch(header,/<nav|course-picker/);
    assert.match(aside,/class="course-picker-trigger"/);
    const menus=aside.match(/<div[^>]*class="course-picker-menu"[\s\S]*?<\/div>/g)||[];
    assert.equal(menus.length,2,'Class and course use the same popover control');
    assert.equal((menus[0].match(/role="menuitemradio"/g)||[]).length,3,'Every assigned class remains selectable');
    assert.equal((menus[1].match(/role="menuitemradio"/g)||[]).length,2,'Course choices follow the selected class');
    assert.match(aside,/aria-checked="true"[^>]*>[\s\S]*?Assigned course A/);
    assert.match(aside,/class="course-picker-label"[\s\S]*?<b>one · Class A<\/b>/,'The sidebar names the course in scope');
    assert.match(menus[0],/aria-checked="true"[\s\S]*?Class A/);
    assert.match(menus[0],/Class B/);
    assert.doesNotMatch(aside,/<select/);
    assert.doesNotMatch(html,/Private unassigned course|Private class|class="topbar"/);
  }
  const invalid=renderToStaticMarkup(createElement(LecturerWorkspace,{initialData:data,initialLanguage:'en',section:'submissions',query:{cohort:'Deleted class'}}));
  assert.match(invalid,/No courses match the class filter/);assert.match(invalid,/Clear filters/);
  assert.doesNotMatch(invalid,/No courses assigned yet/);
  assert.match(invalid,/role="menuitemradio"[\s\S]*?Class B/,'An invalid URL filter still allows choosing an assigned class.');
  const empty=renderToStaticMarkup(createElement(LecturerWorkspace,{initialData:{...data,memberships:[]},initialLanguage:'en',section:'submissions',query:{}}));
  assert.match(empty,/No courses assigned yet/);
  assert.doesNotMatch(empty,/class="course-picker-trigger"|Private class|Assigned course A/);
  assert.equal(JSON.stringify(data),before,'Rendering never modifies course configuration');
});

test('lecturer pages have distinct URLs and safely preserve course and detail context',()=>{
  assert.equal(new Set(lecturerPages.map(p=>lecturerHref(p.key))).size,lecturerPages.length);
  assert.equal(lecturerHref('students',{course:'a & b',student:'s/1'}),'/lecturer/students?course=a+%26+b&student=s%2F1');
  assert.equal(lecturerHref('submissions',{course:'a'},'r/1'),'/lecturer/submissions/r%2F1?course=a');
});
test('lecturer scope uses teaching assignments, includes unassessed students and excludes drafts',()=>{
  const data={user:{id:'teacher'},courses:[{id:'a'},{id:'b'}],memberships:[
    {userId:'teacher',courseId:'a',role:'lecturer'}, {userId:'teacher',courseId:'b',role:'student'},
    {userId:'student-a',courseId:'a',role:'student'}, {userId:'no-work',courseId:'a',role:'student'}, {userId:'student-b',courseId:'b',role:'student'},
  ],users:[{id:'student-a'},{id:'no-work'},{id:'student-b'}],classReflections:[{id:'visible',courseId:'a',status:'submitted'},{id:'draft',courseId:'a',status:'draft'},{id:'outside',courseId:'b',status:'final'}]};
  const scope=lecturerScope(data);
  assert.deepEqual(scope.courses.map(c=>c.id),['a']);assert.deepEqual(scope.students.map(u=>u.id),['student-a','no-work']);assert.deepEqual(scope.reflections.map(r=>r.id),['visible']);
  assert.equal(lecturerScope(data,'b').reflections.length,0);
});
test('weekly progress counts enrollment pairs once and uses final assessments only',()=>{
  const row=(id,courseId,userId,status,total=10)=>({id,courseId,userId,status,week:1,reviews:[{decision:'final',scores:[4,4,4,4],total,level:4}]});
  const memberships=[{courseId:'a',userId:'alice'},{courseId:'a',userId:'alice'},{courseId:'b',userId:'alice'},{courseId:'a',userId:'bob'}];
  const points=weeklyClassProgress([row('one','a','alice','final',8),row('two','a','alice','final',10),row('three','b','alice','submitted'),row('four','a','bob','returned')],memberships);
  assert.equal(points[0].expected,3);assert.equal(points[0].submitted,3);assert.equal(points[0].completed,1);assert.equal(points[0].pending,1);assert.equal(points[0].average,9);
  assert.equal(points[1].average,null);assert.equal(points[1].submitted,0);
});
test('assessment begins without assumed scores, preserves matching final grades and locks historical/self/returned work',()=>{
  const r={userId:'student',latestVersion:'current',status:'submitted',reviews:[]};
  assert.deepEqual(initialLecturerReview(r,defaultRubric),{scores:[null,null,null,null],level:null,comment:''});
  // AI proposals are never accepted just by opening the page.
  r.analyses=[{kind:'feedback',result:{criteria:[{score:4}]}}];assert.equal(initialLecturerReview(r,defaultRubric).level,null);
  r.status='final';r.reviews=[{decision:'final',rubric:defaultRubric,scores:[5,7.5,7.5,10],scoreScale:10,level:2,total:7.13,comment:'Specific feedback'}];
  assert.deepEqual(initialLecturerReview(r,defaultRubric).scores,[5,7.5,7.5,10]);assert.equal(initialLecturerReview(r,defaultRubric).level,2);
  assert.ok(initialLecturerReview(r,defaultRubric.map(c=>({...c,name:c.name+' changed'}))).scores.every(s=>s===null));
  assert.ok(canAssess(r,'teacher','current'));assert.equal(canAssess(r,'student','current'),false);assert.equal(canAssess(r,'teacher','old'),false);r.status='returned';assert.equal(canAssess(r,'teacher','current'),false);
  assert.equal(reviewDecision('returned'),'returned');for(const value of [undefined,null,'typo','draft'])assert.throws(()=>reviewDecision(value));
});
test('CSV protects authored spreadsheet formulas without changing numeric grades or quoted content',()=>{
  assert.equal(safeCsv([['=HYPERLINK("x")','  @SUM(1)',7.13,'A, B\n"C"']]),'"\'=HYPERLINK(""x"")","\'  @SUM(1)","7.13","A, B\n""C"""');
});
