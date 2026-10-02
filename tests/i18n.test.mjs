import test from 'node:test';
import assert from 'node:assert/strict';
import {translate, resolveLanguage, dateLocale} from '../lib/i18n.ts';
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
