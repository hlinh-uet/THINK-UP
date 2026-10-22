import test from 'node:test';
import assert from 'node:assert/strict';
import {translate, resolveLanguage, dateLocale, stageLabel} from '../lib/i18n.ts';
import {demoText,demoContent} from '../lib/demo-i18n.ts';
import {createDemoData} from '../scripts/demo-data.mjs';
import {createStudentCourseDemoData,studentDemoTranslations} from '../scripts/student-course-demo-data.mjs';
import {coachInstructions} from '../lib/coach-prompt.ts';
import {defaultRubric, defaultWeeks, roles, statuses, levels} from '../lib/domain.ts';

test('language preferences have a safe English default',()=>{
  for(const value of [undefined,null,'','fr','EN','<script>'])assert.equal(resolveLanguage(value),'en');
  assert.equal(resolveLanguage('vi'),'vi');
  assert.equal(dateLocale('vi'),'vi-VN');assert.equal(dateLocale('en'),'en-GB');
});
test('translated labels support dynamic values without translating or re-interpolating authored text',()=>{
  assert.equal(translate('  Tổng quan ','en'),'  Overview ');
  const name='Linh {1}';
  assert.equal(translate('Chào {0}, cùng think up ✦','en',[name]),'Hi Linh {1}, let’s think up ✦');
  assert.equal(translate('Từ bài viết tuần {0}','en',[3]),'From your week 3 reflection');
  assert.equal(translate('Draft','vi'),'Bản nháp');
  assert.equal(translate('Tất cả','en'),'All');
  const custom='Tôi nhận ra một góc nhìn khác của riêng mình.';
  assert.equal(translate(custom,'en'),custom);
});
test('every default rubric, week, role, status and level is available in English',()=>{
  const labels=[...defaultRubric.flatMap(c=>[c.name,...c.descriptions]),...defaultWeeks.flatMap(w=>[w.title,w.prompt]),...Object.values(roles),...Object.values(statuses),...levels];
  for(const value of labels){const english=translate(value,'en');assert.notEqual(english,value,value);assert.equal(translate(value,'vi'),value);}
});
test('AI output follows the selected language while preserving evidence quotations',()=>{
  const en=coachInstructions('en'),vi=coachInstructions('vi');
  assert.match(en,/Write all feedback and questions in English/);
  assert.match(vi,/Write all feedback and questions in Vietnamese/);
  for(const prompt of [en,vi]){assert.match(prompt,/do not translate quotations/);assert.match(prompt,/never write a student's reflection/);}
});

test('demo content has complete bilingual views without changing stored or authored text',()=>{
  const data=createDemoData('unused'),original=JSON.stringify(data),fields=[];
  for(const c of data.tables.courses)fields.push([c.name,c.id]);
  for(const r of [...data.tables.reflections,...data.tables.versions])fields.push([r.title,r.id],...Object.values(JSON.parse(r.content_json)).map(v=>[v,r.id]));
  for(const a of data.tables.actions)fields.push([a.text,a.id],[a.review,a.id]);
  for(const r of data.tables.reviews)fields.push([r.comment,r.id]);
  for(const a of data.tables.analyses){
    const result=JSON.parse(a.result_json);
    fields.push(...[...result.strengths,...result.development,...result.questions,...result.suggestedActions,result.context,result.levelReason,result.levelEvidence].map(text=>[text,a.id]));
    const version=data.tables.versions.find(v=>v.id===a.version_id),english=demoContent(JSON.parse(version.content_json),version.id,'en');
    for(const c of result.criteria){
      fields.push([c.behavior,a.id],[c.evidence,a.id],[c.improvement,a.id]);
      assert.ok(english[c.evidenceSection].includes(demoText(c.evidence,a.id,'en')),c.evidence);
    }
  }
  for(const [text,id] of fields){
    if(!text)continue;
    const en=demoText(text,id,'en');assert.notEqual(en,text,`${id}: ${text}`);assert.equal(demoText(en,id,'vi'),text,`${id}: ${en}`);
  }
  assert.equal(JSON.stringify(data),original);
  const custom='Tôi đã tự chỉnh sửa bài này bằng suy nghĩ của mình.';
  assert.equal(demoText(custom,'demo-student-week-6','en'),custom);
  assert.equal(demoText(data.tables.reflections[0].title,'real-user-reflection','en'),data.tables.reflections[0].title);
  assert.equal(stageLabel('Revision 2','vi'),'Lần chỉnh sửa 2');assert.equal(stageLabel('Revision 2','en'),'Revision 2');assert.equal(stageLabel('Lecturer Review','vi'),'Giảng viên nhận xét');
});

test('additional course samples keep bilingual content and grounded quotations without changing stored data',()=>{
  const data=createStudentCourseDemoData(),before=JSON.stringify(data);
  for(const [vi,en] of Object.entries(studentDemoTranslations)){
    assert.equal(demoText(vi,'demo-ui-example','en'),en);
    assert.equal(demoText(en,'demo-ui-example','vi'),vi);
  }
  for(const row of data.tables.analyses){
    const version=data.tables.versions.find(v=>v.id===row.version_id),english=demoContent(JSON.parse(version.content_json),version.id,'en');
    for(const criterion of JSON.parse(row.result_json).criteria)assert.ok(english[criterion.evidenceSection].includes(demoText(criterion.evidence,row.id,'en')));
  }
  assert.equal(JSON.stringify(data),before);
  assert.equal(demoText('My edited sample course',data.tables.courses[0].id,'vi'),'My edited sample course');
});
