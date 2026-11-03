import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './helpers/component-module.mjs';
import {defaultRubric,emptyContent} from '../lib/domain.ts';

const {default:Panel}=await import(componentModule(new URL('../app/StudentFeedbackPanel.tsx',import.meta.url)));
const {default:Guidance}=await import(componentModule(new URL('../app/ReflectionGuidance.tsx',import.meta.url)));
const {default:Coach}=await import(componentModule(new URL('../app/AICoachPanel.tsx',import.meta.url)));
const content={...emptyContent,what:'A concrete experience with my group that helped me rethink how I respond to uncertainty.'};
const review=(id,createdAt,decision='final')=>({id,versionId:'current',createdAt,decision,reviewerId:'teacher',comment:`Lecturer feedback ${id}: examine how your assumptions affected your choices.`,scores:decision==='final'?[6.8,6.9,6.7,7.1]:[],total:decision==='final'?6.86:null,level:decision==='final'?3:null,scoreScale:10,rubric:defaultRubric,criteria:decision==='final'?defaultRubric.map((c,i)=>({key:c.key,level:3,score:[6.8,6.9,6.7,7.1][i],evidence:'Grounded evidence.',reason:'A specific reason.',improvement:'Try another perspective.'})):[]});
const analysis={id:'analysis',versionId:'current',kind:'feedback',provider:'Demo fixture',createdAt:'2026-10-12T00:00:00Z',rubric:defaultRubric,result:{total:7.04,scoreScale:10,level:3,criteria:defaultRubric.map(c=>({key:c.key,score:7,level:3,behavior:'Specific analysis.',evidence:'Grounded evidence.',improvement:'Try another perspective.'})),strengths:['The context is specific.'],development:['Examine the cause.'],questions:['What changed your perspective?'],suggestedActions:[],context:'',levelReason:'Personal learning is present.'}};
const reflection={id:'reflection',title:'A group discussion',userId:'student',courseId:'course',week:4,content,status:'final',rev:3,latestVersion:'current',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-13T00:00:00Z',versions:[{id:'current',title:'A group discussion',content,createdAt:'2026-10-12T00:00:00Z',stage:'Submitted'}],reviews:[review('older','2026-10-10T00:00:00Z'),review('latest','2026-10-13T00:00:00Z')],analyses:[analysis],attachments:[],selfAssessments:[]};
const props={reflection,draft:{...reflection},rubric:defaultRubric,language:'en',aiReady:false,busy:'',onAnalyze(){},onRubric(){},onCommit(){},ensureSaved:async()=>reflection,onSaved:async()=>{}};
const render=overrides=>renderToStaticMarkup(createElement(Panel,{...props,...overrides}));

test('support prioritises the latest lecturer assessment and keeps AI grades in a closed reference section',()=>{
 const before=JSON.stringify(reflection),html=render();
 assert.ok(html.indexOf('Lecturer feedback latest')<html.indexOf('AI rubric reference'));
 assert.match(html,/class="teacher-feedback-score">6\.86/);
 assert.match(html,/<details class="support-disclosure ai-rubric-section">/);
 assert.match(html,/AI scores are for reference/);
 assert.match(html,/7\.04/,'AI result remains available inside its reference section');
 assert.match(html,/Earlier lecturer feedback/);assert.match(html,/Lecturer feedback older/);
 assert.match(html,/Evidence and improvements/);assert.match(html,/Grounded evidence/);
 const primary=html.slice(html.indexOf('class="lecturer-feedback'),html.indexOf('<details class="support-disclosure ai-rubric-section'));
 assert.ok(primary.indexOf('6.8')<primary.indexOf('<details'),'Criterion scores are visible without opening a disclosure');
 assert.equal((primary.match(/<details/g)||[]).length,1,'Supporting explanations have a single disclosure');
 assert.doesNotMatch(primary,/teacher-criterion/,'No nested per-criterion disclosures');
 assert.doesNotMatch(html,/Compare versions and rubric scores/,'A single version does not need a comparison tool');
 assert.doesNotMatch(html,/Reflection Depth: 6\.8\/10 ·/,'Do not repeat the criterion scores as a concatenated sentence');
 assert.equal(JSON.stringify(reflection),before);
});

test('returned work has no assumed teacher score and a missing teacher review opens the AI reference instead',()=>{
 const returned={...reflection,status:'returned',reviews:[review('returned','2026-10-14T00:00:00Z','returned'),reflection.reviews[1]]};
 const html=render({reflection:returned,draft:returned});
 const primary=html.slice(html.indexOf('class="lecturer-feedback'),html.indexOf('<details class="support-disclosure ai-rubric-section'));
 assert.match(primary,/Revision requested/);assert.doesNotMatch(primary,/teacher-feedback-score/);
 const empty=render({reflection:{...reflection,reviews:[]}});
 assert.match(empty,/No lecturer feedback yet/);assert.match(empty,/<details class="support-disclosure ai-rubric-section" open="">/);
});

test('sample and stale Coach warnings share one disclosure and empty guidance groups do not create dead ends',()=>{
 const row={...reflection,status:'draft',analyses:[{...analysis,kind:'coach'}]};
 const html=renderToStaticMarkup(createElement(Coach,{draft:{...row,title:'An unsaved edit'},reflection:row,language:'en',aiReady:false,busy:'',onAnalyze(){},onCommit(){}}));
 assert.equal((html.match(/class="feedback-provenance/g)||[]).length,1);
 assert.match(html,/Sample feedback/);assert.match(html,/Outdated feedback/);
 assert.match(html,/not an actual AI result/);assert.match(html,/earlier version/);
 assert.doesNotMatch(html,/Suggested actions/,'An empty suggestion list should not look actionable');
 const guidance=renderToStaticMarkup(createElement(Guidance,{analysis,language:'en',onCommit(){}}));
 assert.equal((guidance.match(/class="guidance-section/g)||[]).length,3);
 assert.equal((guidance.match(/<details/g)||[]).length,1,'Questions are grouped into one secondary disclosure');
 assert.ok(guidance.indexOf('The context is specific.')<guidance.indexOf('<details'));
 assert.ok(guidance.indexOf('Examine the cause.')<guidance.indexOf('<details'));
});

test('the support panel remains bilingual with the original teacher grades and evidence',()=>{
 const html=render({language:'vi'});
 for(const text of ['Phản hồi bài viết','Đánh giá của giảng viên','Minh chứng và gợi ý cải thiện','Đối chiếu rubric với AI','Tham khảo'])assert.ok(html.includes(text),text);
 assert.match(html,/6\.86/);assert.match(html,/Grounded evidence/);
});
