import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {defaultRubric,criterionKeys,validateRubric} from '../lib/domain.ts';
import {isPdf,normalizeRubricSuggestion,rubricPromptBase,rubricSuggestionInstructions,rubricSuggestionSchema} from '../lib/rubric-suggestion.ts';
import {executeCodex,prepareCodexInput} from '../scripts/codex-bridge.mjs';

const levels=key=>[1,2,3,4].map(n=>`${key} level ${n}`);
const answer=()=>({summary:'Topics',criteria:criterionKeys.map(key=>({key,descriptions:levels(key)}))});
test('a suggestion can only change level descriptions, so the applied rubric still passes validation',()=>{
 assert.deepEqual(Object.keys(rubricSuggestionSchema.properties.criteria.items.properties),['key','descriptions']);
 const reordered=answer();reordered.criteria.reverse();
 const {criteria}=normalizeRubricSuggestion(reordered);assert.deepEqual(criteria.map(c=>c.key),[...criterionKeys]);
 const applied=defaultRubric.map(c=>({...c,descriptions:criteria.find(row=>row.key===c.key).descriptions}));
 assert.deepEqual(validateRubric(applied).map(c=>[c.name,c.weight]),defaultRubric.map(c=>[c.name,c.weight]));
});
test('malformed suggestions are rejected rather than partly applied',()=>{
 const change=fn=>{const value=answer();fn(value);return value};
 for(const bad of [null,change(v=>v.criteria.pop()),change(v=>{v.criteria[1].key=v.criteria[0].key}),change(v=>v.criteria[0].descriptions.pop()),change(v=>{v.criteria[0].descriptions[2]=' '}),change(v=>{v.criteria[0].descriptions[2]='x'.repeat(1001)})])assert.throws(()=>normalizeRubricSuggestion(bad),/chưa hợp lệ/);
});
test('the prompt treats slides as untrusted and keeps the default rubric as its base',()=>{
 assert.match(rubricSuggestionInstructions('vi'),/untrusted data/);assert.match(rubricSuggestionInstructions('vi'),/in Vietnamese\.$/);assert.match(rubricSuggestionInstructions('en'),/in English\.$/);
 assert.deepEqual(rubricPromptBase(defaultRubric).map(c=>c.descriptions),defaultRubric.map(c=>c.descriptions));
 assert.ok(isPdf(new TextEncoder().encode('%PDF-1.7')));assert.ok(!isPdf(new TextEncoder().encode('<html>')));
});
test('Codex accepts longer slide decks only in rubric mode and uses the rubric schema',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'thinkup-rubric-test-'));
 try{
  const input=[{type:'input_file',filename:'slides.pdf',file_data:`data:application/pdf;base64,${Buffer.from('%PDF-').toString('base64')}`}];
  const pages=n=>async()=>({code:0,stdout:`Pages: ${n}`,stderr:''});
  await assert.rejects(prepareCodexInput(input,directory,{runner:pages(13)}),/12 trang/);
  let schema='';
  const runner=async(command,args)=>{
   if(args[0]==='login')return {code:0,stdout:'Logged in using ChatGPT',stderr:''};
   if(command==='pdfinfo')return {code:0,stdout:'Pages: 41',stderr:''};
   schema=args[args.indexOf('--output-schema')+1];return {code:0,stdout:'',stderr:''};
  };
  await assert.rejects(executeCodex({instructions:'x',input},{runner,mode:'rubric'}),/tối đa 40 trang/);
  assert.equal(schema,'');
 }finally{await rm(directory,{recursive:true,force:true})}
});
