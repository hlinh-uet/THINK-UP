import test from 'node:test';
import assert from 'node:assert/strict';
import { lecturerHref, lecturerPages, lecturerScope, safeCsv, weeklyClassProgress } from '../lib/lecturer-pages.ts';
import { canAssess, initialLecturerReview, reviewDecision } from '../lib/lecturer-review.ts';
import { defaultRubric } from '../lib/domain.ts';

test('lecturer pages have distinct URLs and safely preserve course and detail context',()=>{
  assert.equal(new Set(lecturerPages.map(p=>lecturerHref(p.key))).size,6);
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
