import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyContent, defaultWeeks } from '../lib/domain.ts';
import { draftSnapshot, hasUnsavedWriting, writingReadiness, writingMatchesSaved, reflectionText, freeContent } from '../lib/student-editor.ts';
import { mergeCoachTurns } from '../lib/reflection-chat-history.ts';

const draft=(overrides={})=>({id:null,rev:0,title:'My experience',week:1,courseId:'course',status:'draft',content:{...emptyContent},...overrides});
const fullContent={what:'Our project had two possible directions.',soWhat:'I felt anxious and asked the group to explain their reasoning.',nowWhat:'I learned to question my assumptions and listen before deciding.',action:'Next week I will record three assumptions and review them with my group.'};

test('slow chat history cannot erase or downgrade a new answer and completed retries do not duplicate it',()=>{
  const completed={id:'turn',question:'Why?',reply:'What led you there?',status:'completed',provider:'Codex local',included_attachments:0,created_at:'2026-10-05T00:00:00Z'};
  assert.deepEqual(mergeCoachTurns([completed],[]),[completed]);
  assert.deepEqual(mergeCoachTurns([completed],[{...completed,status:'pending',reply:null}]),[completed]);
  assert.deepEqual(mergeCoachTurns([completed],[completed]),[completed]);
  assert.equal(mergeCoachTurns([{...completed,status:'pending',reply:null}],[{...completed,status:'failed',reply:null}])[0].status,'failed');
});

test('untitled writing and clearing an existing reflection still require saving before leaving',()=>{
  const empty=draft({title:'',courseId:null}),saved=draftSnapshot(empty);
  assert.equal(hasUnsavedWriting(null,saved),false);
  assert.equal(hasUnsavedWriting(empty,saved),false);
  assert.equal(hasUnsavedWriting({...empty,content:{...emptyContent,what:'An unsaved experience'}},saved),true);
  const existing=draft({id:'reflection',content:fullContent});
  assert.equal(hasUnsavedWriting(existing,draftSnapshot(existing)),false);
  assert.equal(hasUnsavedWriting({...existing,title:'',content:{...emptyContent}},draftSnapshot(existing)),true);
  assert.equal(hasUnsavedWriting({...existing,week:2},draftSnapshot(existing)),true);
  assert.equal(hasUnsavedWriting({...existing,courseId:'other'},draftSnapshot(existing)),true);
  for(const status of ['submitted','final'])assert.equal(hasUnsavedWriting({...existing,status},'old snapshot'),false);
});

test('free writing can be submitted with a course; rubric assessment needs 20 words and no title',()=>{
  const ready=draft({title:'',content:freeContent(Array(20).fill('word').join(' '))});
  assert.equal(writingReadiness(ready,true,false).canAnalyze,true);
  assert.equal(writingReadiness(ready,false,false).canSubmit,true);
  assert.equal(writingReadiness({...ready,courseId:null},true,false).canSubmit,false);
  assert.equal(writingReadiness(draft(),true,false).canSubmit,false);
  const short=draft({title:'',content:freeContent('One thought.')});
  assert.equal(writingReadiness(short,true,false).canAnalyze,false);
  assert.equal(writingReadiness(short,true,false).canSubmit,true);
  assert.equal(reflectionText(fullContent),Object.values(fullContent).join('\n\n'));
  assert.equal(reflectionText(freeContent('My unstructured reflection.')),'My unstructured reflection.');
});

test('submitted/final work and pending operations cannot be analyzed or submitted again; returned work remains editable',()=>{
  const ready=draft({content:fullContent});
  for(const status of ['submitted','final']){const state=writingReadiness({...ready,status},true,false);assert.equal(state.editable,false);assert.equal(state.canAnalyze,false);assert.equal(state.canSubmit,false)}
  const pending=writingReadiness(ready,true,true);assert.equal(pending.canAnalyze,false);assert.equal(pending.canSubmit,false);
  const returned=writingReadiness({...ready,status:'returned'},true,false);assert.equal(returned.editable,true);assert.equal(returned.canAnalyze,true);assert.equal(returned.canSubmit,true);
});

test('AI staleness includes title edits and writing that has not yet autosaved',()=>{
  const writing=draft({content:fullContent});
  assert.equal(writingMatchesSaved(writing,{title:writing.title,content:{...fullContent}}),true);
  assert.equal(writingMatchesSaved({...writing,title:'A different experience'},writing),false);
  assert.equal(writingMatchesSaved({...writing,content:{...fullContent,soWhat:'I changed my mind.'}},writing),false);
});

// Render the real TSX components with React, without a browser or fixture copies.
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
const StudentEditor=(await import(componentModule(new URL('../app/StudentReflectionEditor.tsx',import.meta.url)))).default;
const Guidance=(await import(componentModule(new URL('../app/ReflectionGuidance.tsx',import.meta.url)))).default;
const Thinking=(await import(componentModule(new URL('../app/ReflectionThinking.tsx',import.meta.url)))).default;
const Body=(await import(componentModule(new URL('../app/ReflectionBody.tsx',import.meta.url)))).default;
const Coach=(await import(componentModule(new URL('../app/AICoachPanel.tsx',import.meta.url)))).default;
const noop=()=>{};
const props={draft:draft({content:fullContent}),courses:[],weeks:defaultWeeks,language:'en',busy:'',saveLabel:'Đã lưu',includeEvidence:false,thinking:'Thinking content',coach:'Coach content',feedback:'Rubric content',reminder:null,onChange:noop,onBack:noop,onSave:noop,onReload:noop,onHistory:noop,onExport:noop,onRubric:noop,onSubmit:noop,onUpload:noop,onEvidence:noop};

test('thinking, AI Coach and rubric have distinct panels and Coach can be opened directly',()=>{
  const html=renderToStaticMarkup(createElement(StudentEditor,props));
  assert.ok(/id="reflection-thinking-panel">Thinking content/.test(html));
  assert.ok(/id="reflection-coach-panel" hidden="">Coach content/.test(html));
  assert.ok(/id="reflection-feedback-panel" hidden="">Rubric content/.test(html));
  assert.equal((html.match(/aria-controls="reflection-(?:thinking|coach|feedback)-panel"/g)||[]).length,3);
  const coach=renderToStaticMarkup(createElement(StudentEditor,{...props,initialSupport:'coach'}));
  assert.ok(/id="reflection-coach-panel">Coach content/.test(coach));
  assert.ok(/id="reflection-thinking-panel" hidden="">Thinking content/.test(coach));
});

test('AI Coach reads its own analysis and shows five guidance groups with a reflection level',()=>{
  const writing=draft({id:'reflection',content:fullContent});
  const result={strengths:['Coach-specific strength.'],development:['Explain why.'],questions:['What changed your perspective?'],suggestedActions:['Review one assumption.'],context:'',level:3,levelReason:'Personal learning is present.',levelEvidence:fullContent.nowWhat};
  const analysis={id:'coach-analysis',versionId:'version',kind:'coach',provider:'Codex local',result};
  const reflection={...writing,versions:[{id:'version',title:writing.title,content:fullContent}],analyses:[{...analysis,id:'feedback-analysis',kind:'feedback',result:{...result,strengths:['Rubric-only strength.']}},analysis]};
  const coachProps={draft:writing,reflection,language:'en',aiReady:true,busy:'',onAnalyze:noop,onCommit:noop};
  const html=renderToStaticMarkup(createElement(Coach,coachProps));
  for(const label of ['Strengths','Areas to develop','Reflective questions','Suggested actions','Reflection level'])assert.ok(html.includes(label),label);
  assert.ok(html.includes('Coach-specific strength.'));
  assert.ok(!html.includes('Rubric-only strength.')&&!html.includes('/10'));
  assert.ok(html.includes('Review and confirm action'));
  const stale=renderToStaticMarkup(createElement(Coach,{...coachProps,draft:{...writing,title:'Changed title'}}));
  assert.ok(stale.includes('notice warning'));
  for(const status of ['submitted','final']){
    const locked=renderToStaticMarkup(createElement(Coach,{...coachProps,draft:{...writing,status}}));
    assert.ok(/<button[^>]*disabled=""[^>]*>Get feedback from AI Coach/.test(locked));
  }
});

test('thinking uses a button and editor context with no chat prompt; blank work needs context first',()=>{
  const thinkingProps={draft:draft({title:''}),language:'en',provider:'codex',aiReady:true,attachmentCount:0,busy:false,ensureSaved:async()=>({id:'reflection'})};
  const blank=renderToStaticMarkup(createElement(Thinking,thinkingProps));
  assert.ok(blank.includes('Think with AI'));
  assert.ok(/id="reflection-think-button"[^>]*disabled/.test(blank));
  assert.ok(!blank.includes('<textarea')&&!blank.includes('<form'));
  for(const options of [{attachmentCount:1},{draft:draft({title:'',content:freeContent('One thought.')})}]){
    const html=renderToStaticMarkup(createElement(Thinking,{...thinkingProps,...options}));
    assert.ok(!/id="reflection-think-button"[^>]*disabled/.test(html));
  }
  const body=renderToStaticMarkup(createElement(Body,{content:freeContent('My free writing'),language:'en'}));
  assert.ok(body.includes('My free writing'));
  assert.ok(!body.includes('What?')&&!body.includes('So what?'));
});

test('the editor has one free-form body, visible AI sidebar and optional evidence',()=>{
  const html=renderToStaticMarkup(createElement(StudentEditor,props));
  assert.ok(html.includes('free-writing-grid'));
  assert.ok(!/<aside[^>]+id="writing-support"[^>]+hidden/.test(html));
  assert.equal((html.match(/<textarea/g)||[]).length,1);
  assert.ok(html.includes('id="reflection-body"'));
  for(const text of Object.values(fullContent))assert.ok(html.includes(text));
  assert.ok(html.includes('Coach content'));
  assert.ok(html.includes('Your reflection companion')&&!html.includes('Chat with AI'));
  assert.ok(!html.includes('writing-tab-')&&!html.includes('/4'));
  const checkbox=html.match(/<input[^>]+id="writing-include-evidence"[^>]*>/)[0];assert.ok(!checkbox.includes('checked'));
  assert.ok(html.includes('Review &amp; submit'));
});

test('read-only submissions remain readable and busy operations disable input changes',()=>{
  for(const status of ['submitted','final']){
    const html=renderToStaticMarkup(createElement(StudentEditor,{...props,draft:{...props.draft,status}}));
    const inputs=html.match(/<textarea\b[^>]*>/g);assert.equal(inputs.length,1);assert.ok(inputs.every(tag=>tag.includes('readOnly')));
    assert.ok(/<input\b[^>]+id="reflection-title"[^>]+disabled/.test(html));
  }
  const html=renderToStaticMarkup(createElement(StudentEditor,{...props,busy:'feedback'}));
  assert.ok((html.match(/<textarea\b[^>]*>/g)).every(tag=>tag.includes('disabled')));
});

test('Coach and Feedback keep all four guidance groups and require explicit confirmation for suggested actions',()=>{
  const analysis={id:'real-analysis',result:{strengths:['Context is clear.'],development:['Explain why.'],questions:['What changed your perspective?'],suggestedActions:['Review one assumption tomorrow.'],context:''}};
  const html=renderToStaticMarkup(createElement(Guidance,{analysis,language:'en',onCommit:noop}));
  for(const label of ['Strengths','Areas to develop','Reflective questions','Suggested actions'])assert.ok(html.includes(label),label);
  assert.equal((html.match(/<details/g)||[]).length,4);
  assert.equal((html.match(/open=""/g)||[]).length,1);
  assert.ok(html.includes('Review and confirm action'));
});
