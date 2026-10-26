// Explicit opt-in: uses the host's existing ChatGPT/Codex allowance, without an API key.
import test from 'node:test';
import assert from 'node:assert/strict';
import {startCodexBridge} from '../scripts/codex-bridge.mjs';
import {readingInstructions,readingEvidenceContext,normalizeReading} from '../lib/reading.ts';
import {analysisInput} from '../lib/analysis-input.ts';
import {defaultRubric,criterionKeys} from '../lib/domain.ts';

test('real Codex Reading returns four grounded rubric notes and acknowledges the missing action plan',{skip:process.env.THINKUP_LIVE_READING!=='1',timeout:290000},async()=>{
 const content={
  what:'Our team interviewed six students on Tuesday. I wrote down their feedback about the prototype.',
  soWhat:'I had assumed silence meant agreement. Listening to one member explain their hesitation made me question that assumption. I felt uncomfortable because I had rushed the decision.',
  nowWhat:'I learned that silence is missing information rather than evidence of agreement. This lesson comes from overlooking the concerns of two quiet members.',
  action:'',
 };
 const input=await analysisInput('TEST Reading: an assumption about silence',content,defaultRubric,[],false,async()=>null);
 input.push(readingEvidenceContext(content));
 const bridge=await startCodexBridge();
 try{
  const response=await fetch(bridge.url+'/reading',{method:'POST',headers:{Authorization:`Bearer ${bridge.token}`,'Content-Type':'application/json'},body:JSON.stringify({input,instructions:readingInstructions('vi')}),signal:AbortSignal.timeout(270000)});
  const payload=await response.json();assert.equal(response.status,200,JSON.stringify(payload));
  const report=normalizeReading(payload.feedback,content);
  assert.deepEqual(report.criteria.map(c=>c.key),[...criterionKeys]);
  assert.equal(report.criteria[3].status,'insufficient');
  assert.ok(report.criteria.slice(0,3).some(c=>c.status==='supported'));
  for(const c of report.criteria)if(c.evidence)assert.ok(Object.values(content).some(text=>text.includes(c.evidence)));
  console.log(`Real Codex Reading validated: ${report.criteria.length} criteria; absent action plan marked insufficient; all quotations grounded. Model: ${payload.model}`);
 }finally{await bridge.close();}
});
