import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {filterReflections} from '../lib/reflection-library.ts';
import {defaultWeeks,emptyContent} from '../lib/domain.ts';

const {default:Library}=await import(componentModule(new URL('../app/ReflectionLibrary.tsx',import.meta.url)));
const defaults={search:'',status:'all',topic:'all',sort:'newest'};
const record=(id,status,week,updatedAt,title,body)=>({id,status,week,updatedAt,title,content:{...emptyContent,what:body},versions:[],reviews:[],analyses:[],attachments:[],courseId:null});
const records=[
 record('first','draft',5,'2026-10-01T12:00:00Z','Kế hoạch học tập','Tôi sẽ đặt câu hỏi trong lớp.'),
 record('second','final',2,'2026-10-03T12:00:00Z','Buổi thuyết trình','Cần lắng nghe phản hồi từ bạn.'),
 record('third','final',5,'2026-10-02T12:00:00Z','Làm việc nhóm','Tôi học cách đặt câu hỏi rõ ràng.'),
];
const ids=options=>filterReflections(records,{...defaults,...options},'vi').map(r=>r.id);

test('archive filters combine status, weekly topic and content without mutating records',()=>{
 const before=JSON.stringify(records);
 assert.deepEqual(ids({}),['second','third','first']);
 assert.deepEqual(ids({sort:'oldest'}),['first','third','second']);
 assert.deepEqual(ids({status:'final',topic:'5',search:'DAT CAU HOI'}),['third']);
 assert.deepEqual(ids({search:'ke hoach'}),['first']);
 assert.deepEqual(ids({search:'  lắng nghe  '}),['second']);
 assert.deepEqual(ids({status:'draft',topic:'2'}),[]);
 assert.equal(JSON.stringify(records),before);
});

test('archive renders the reference filter row with translated choices and configured topics',()=>{
 for(const language of ['vi','en']){
  const html=renderToStaticMarkup(createElement(Library,{reflections:records,weeks:[{...defaultWeeks[0],title:'A custom course topic'}],language,onOpen(){}}));
  assert.match(html,/class="library-filter-row" role="search"/);
  assert.equal((html.match(/class="course-picker-trigger"/g)||[]).length,3);
  assert.equal((html.match(/aria-checked="true"/g)||[]).length,3);
  assert.ok(html.includes(language==='vi'?'Tất cả trạng thái':'All statuses'));
  assert.ok(html.includes(language==='vi'?'Tất cả chủ đề':'All topics'));
  assert.ok(html.includes(language==='vi'?'Mới nhất':'Newest'));
  assert.ok(html.includes(language==='vi'?'Cũ nhất':'Oldest'));
  assert.match(html,/A custom course topic/);
  assert.doesNotMatch(html,/class="library-filters"/);
  assert.equal((html.match(/class="reflection-note /g)||[]).length,3);
 }
});
