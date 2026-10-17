import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultRubric,criterionKeys,totalScore,validateScores} from '../lib/domain.ts';
import {criterionLevel,validateAssessment,reviewScoresOnTen} from '../lib/assessment.ts';
import {normalizeFeedback} from '../lib/feedback-schema.ts';
import {normalizeReading} from '../lib/reading.ts';
import {diffText} from '../lib/revision-diff.ts';
import {classAnalytics,reportRows} from '../lib/learning-analytics.ts';
const content={what:'Our team interviewed six students.',soWhat:'I questioned my assumption about silence.',nowWhat:'I learned to ask before deciding, but this depends on the situation.',action:'Next Tuesday I will ask two questions and count the replies.'};
const criteria=(scores=[8.2,7.1,8.8,7.6])=>criterionKeys.map((key,i)=>({key,level:criterionLevel(scores[i]),score:scores[i],evidence:Object.values(content)[i],reason:'Specific evidence supports this assessment.',improvement:'Check another perspective and its evidence.',attachmentNames:[]}));
const feedback=()=>({strengths:[],development:['Explain the cause.'],questions:[],suggestedActions:[],context:'',level:3,levelReason:'Connects a grounded lesson to the self.',levelEvidence:content.nowWhat,criteria:criteria().map(c=>({...c,behavior:c.reason,evidenceSection:null}))});
test('final rubric accepts distinct decimal scores inside all level boundaries and keeps historical totals explicit',()=>{
 for(const [score,level] of [[0,1],[2.5,1],[2.6,2],[5,2],[5.1,3],[7.5,3],[7.6,4],[10,4]])assert.equal(criterionLevel(score),level);
 assert.deepEqual(validateScores([0,2.6,7.5,10]),[0,2.6,7.5,10]);
 for(const bad of [NaN,Infinity,-.1,10.1,2.55,'8'])assert.throws(()=>validateScores([bad,5,5,5]));
 assert.equal(totalScore([8.2,7.1,8.8,7.6],defaultRubric),7.93);
 assert.equal(totalScore([3,4,2,3],defaultRubric,4),7.63);
 assert.deepEqual(reviewScoresOnTen({scores:[3,4,2,3]}),[7.5,10,5,7.5]);
});
test('confirmed criteria need matching level, actual evidence, rationale and improvement; absence requires explicit low-level confirmation',()=>{
 assert.equal(validateAssessment(criteria(),content,defaultRubric,[]).length,4);
 for(const patch of [{level:2},{evidence:'Invented quotation.'},{reason:''},{improvement:''},{attachmentNames:['foreign.png']}]){const value=criteria();value[0]={...value[0],...patch};assert.throws(()=>validateAssessment(value,content,defaultRubric,[]));}
 const absent=criteria();absent[3]={...absent[3],score:0,level:1,evidence:'',missingReason:'No future action is described in this reflection.'};assert.equal(validateAssessment(absent,content,defaultRubric,[])[3].score,0);
 absent[3].level=4;absent[3].score=8;assert.throws(()=>validateAssessment(absent,content,defaultRubric,[]));
});
test('invalid or missing AI evidence remains unscored and blocks an overall total',()=>{
 const valid=normalizeFeedback(feedback(),content,defaultRubric,[],'en');assert.equal(valid.scoreScale,10);assert.equal(valid.total,7.93);assert.equal(valid.reviewRequired,false);
 const raw=feedback();raw.criteria[1].evidence='Not in the writing.';const result=normalizeFeedback(raw,content,defaultRubric,[],'en');assert.equal(result.criteria[1].score,null);assert.equal(result.criteria[1].level,null);assert.equal(result.total,null);assert.equal(result.reviewRequired,true);
 raw.criteria[1].score=null;raw.criteria[1].level=null;assert.equal(normalizeFeedback(raw,content,defaultRubric,[],'en').total,null);
});
test('reading assistant rejects invented source excerpts and requires grounded pedagogical feedback',()=>{
 const report={summary:[{text:'The team interviewed students.',evidence:content.what,section:'action'}],thinking:[],learning:[],attention:[],feedback:{strengths:'Concrete context.',development:'Consider another perspective.',evidence:content.what,questions:'Why?',nextSteps:'Explain a cause.'}};
 assert.equal(normalizeReading(report,content).summary[0].section,'what');
 assert.throws(()=>normalizeReading({...report,summary:[{...report.summary[0],evidence:'Fabricated.'}]},content));
 assert.throws(()=>normalizeReading({...report,feedback:{...report.feedback,evidence:'Fabricated.'}},content));
});
test('version diff preserves exact before/after text for additions, removals, Vietnamese and long documents',()=>{
 for(const [a,b] of [['Tôi nghĩ nhóm sai.','Tôi nghĩ lại: cách phân công chưa rõ.'],['','new'],['removed',''],['a '.repeat(1000)+'old','a '.repeat(1000)+'new']]){const parts=diffText(a,b);assert.equal(parts.filter(p=>p.kind!=='added').map(p=>p.text).join(''),a);assert.equal(parts.filter(p=>p.kind!=='removed').map(p=>p.text).join(''),b);}
});
test('class statistics have criterion denominators, distinct levels, actions, missing values and full CSV fields',()=>{
 const review={decision:'final',scores:[8.2,7.1,8.8,7.6],scoreScale:10,criteria:criteria(),rubric:defaultRubric,total:7.93,level:3};
 const final={id:'one',userId:'student',courseId:'course',title:'One',week:1,status:'final',content,latestVersion:'v',versions:[{id:'v',title:'One',content}],reviews:[review],analyses:[]};
 const pending={...final,id:'two',status:'submitted',reviews:[]};const summary=classAnalytics([final,pending],[{status:'done'},{status:'needs_adjustment'}],defaultRubric);
 assert.equal(summary.criteria[0].average,8.2);assert.equal(summary.criteria[0].count,1);assert.equal(summary.criteria[0].missing,1);assert.deepEqual(summary.criteria[0].distribution,[0,0,0,1]);assert.equal(summary.actions.rate,.5);assert.equal(summary.actions.needsAdjustment,1);assert.equal(summary.agreement.meanAbsoluteError,null);assert.equal(reportRows([final],defaultRubric)[0].length,31);
});
