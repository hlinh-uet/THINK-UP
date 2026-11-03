import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {emptyContent,defaultWeeks} from '../lib/domain.ts';
import {reflectionWritingView,validateWritingTranslation,writingIdentity,writingTranslationInstructions} from '../lib/reflection-translation.ts';
import {filterReflections} from '../lib/reflection-library.ts';

const source={title:'Bài học của tôi',content:{...emptyContent,what:'Tôi nhận ra mình cần lắng nghe.\n\nTôi sẽ hỏi trước khi quyết định.'}};
const view={title:'My lesson',content:{...emptyContent,what:'I realised I need to listen.\n\nI will ask before deciding.'}};
const reflection={id:'authored-reflection',...source,week:3,courseId:'course',status:'draft',rev:1,createdAt:'2026-10-31T00:00:00Z',updatedAt:'2026-10-31T00:00:00Z',translations:[{source,language:'en',view}],reviews:[],analyses:[],attachments:[],versions:[]};
const {default:Editor}=await import(componentModule(new URL('../app/StudentReflectionEditor.tsx',import.meta.url)));
const {default:Note}=await import(componentModule(new URL('../app/ReflectionNote.tsx',import.meta.url)));

test('ordinary student-authored writing has bilingual views without changing the source or paragraph breaks',()=>{
 const before=JSON.stringify(reflection);
 assert.deepEqual(reflectionWritingView(reflection,'en'),view);
 assert.deepEqual(reflectionWritingView(reflection,'vi'),source);
 assert.equal(JSON.stringify(reflection),before);
 assert.equal(writingIdentity(source),writingIdentity({...source,content:{action:'',nowWhat:'',soWhat:'',what:source.content.what}}));
 const edited={...source,content:{...source.content,what:source.content.what+' Nội dung mới.'}};
 assert.deepEqual(reflectionWritingView(reflection,'en',edited),edited,'A translation of an older draft is never shown as the new draft');
});

test('editor previews, titles, library excerpts and search all use the selected language',()=>{
 const props={draft:{...reflection},current:reflection,courses:[],weeks:defaultWeeks,language:'en',busy:'',saveLabel:'Đã lưu',includeEvidence:false,onChange(){},onBack(){},onSave(){},onReload(){},onHistory(){},onExport(){},onArchive(){},onRubric(){},onSubmit(){},onUpload(){},onEvidence(){}};
 const html=renderToStaticMarkup(createElement(Editor,props));
 assert.match(html,/value="My lesson"/);assert.ok(html.includes(view.content.what));assert.ok(!html.includes(source.content.what));
 assert.match(html,/readOnly=""/,'The translated preview is not silently autosaved over the original');
 const note=renderToStaticMarkup(createElement(Note,{reflection,language:'en',onOpen(){}}));
 assert.match(note,/My lesson/);assert.match(note,/I realised I need to listen/);assert.doesNotMatch(note,/Bài học của tôi/);
 assert.deepEqual(filterReflections([reflection],{search:'before deciding',status:'all',topic:'all',sort:'newest'},'en'),[reflection]);
 const vi=renderToStaticMarkup(createElement(Editor,{...props,language:'vi'}));assert.ok(vi.includes(source.content.what));assert.match(vi,/Bài học của tôi/);
});

test('translation only preserves existing sections and empty titles instead of generating new reflection content',()=>{
 assert.deepEqual(validateWritingTranslation(view,source),view);
 assert.throws(()=>validateWritingTranslation({...view,content:{...view.content,action:'Invented plan'}},source));
 assert.throws(()=>validateWritingTranslation({...view,title:''},source));
 assert.throws(()=>validateWritingTranslation({...view,content:{...view.content,what:''}},source));
 assert.match(writingTranslationInstructions('en'),/English/);assert.match(writingTranslationInstructions('vi'),/Vietnamese/);
 assert.match(writingTranslationInstructions('en'),/Do not add reflection/);
});
