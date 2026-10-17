import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { compareSubmissions } from '../lib/similarity.ts';
import { learnerProgress, currentFeedback, analysisIsCurrent } from '../lib/progress.ts';
import { analysisInput } from '../lib/analysis-input.ts';
import { defaultRubric, emptyContent } from '../lib/domain.ts';

const text=Array.from({length:65},(_,i)=>`experience${i}`).join(' ');
const document=(id,userId=id,what=text)=>({id,userId,courseId:'course',versionId:`v-${id}`,title:id,studentName:id,studentEmail:`${id}@example.edu`,courseName:'Course',content:{...emptyContent,what}});

test('similarity uses actual excerpts, counts overlapping windows once and handles Vietnamese Unicode',()=>{
  const vi='Tôi nhận ra rằng lắng nghe và kiểm tra giả định giúp nhóm của chúng tôi hiểu nhau rõ hơn. '+text;
  const left=document('a','alice',vi),right=document('b','bob',vi.normalize('NFD').toUpperCase().replaceAll(' ', ', '));
  const report=compareSubmissions([left,right]);
  assert.equal(report.matches.length,1);assert.equal(report.comparedPairs,1);
  const match=report.matches[0];assert.equal(match.coverageLeft,100);assert.equal(match.coverageRight,100);
  for(const excerpt of match.excerpts){assert.ok(left.content[excerpt.left.section].includes(excerpt.left.text));assert.ok(right.content[excerpt.right.section].includes(excerpt.right.text));}
  assert.ok(!('content' in match.left));
  assert.equal(compareSubmissions([document('c'),document('d','d',Array.from({length:70},(_,i)=>`different${i}`).join(' '))]).matches.length,0);
});
test('similarity excludes same author, short work and guidance, and compares only the requested source',()=>{
  const docs=[document('a','alice'),document('b','alice'),document('c','bob'),document('d','carol')];
  const original=JSON.stringify(docs),all=compareSubmissions(docs),focused=compareSubmissions(docs,[],'a');
  assert.equal(all.comparedPairs,5);assert.equal(all.matches.length,5);assert.equal(focused.comparedPairs,2);assert.equal(focused.matches.length,2);
  assert.ok(focused.matches.every(m=>m.left.id==='a'||m.right.id==='a'));assert.equal(JSON.stringify(docs),original);
  const short=compareSubmissions([document('short','short','A small reflection'),document('long')]);assert.equal(short.skipped,1);assert.equal(short.comparedPairs,0);
  assert.equal(compareSubmissions(docs,[text]).eligible,0);
  const longer=document('longer','eve',text+' '+Array.from({length:65},(_,i)=>`unique${i}`).join(' '));
  const match=compareSubmissions([document('a'),longer]).matches[0];assert.equal(match.coverageLeft,100);assert.equal(match.coverageRight,50);
});
test('similarity bounds the displayed report while preserving the number of matching pairs',()=>{
  const report=compareSubmissions(Array.from({length:22},(_,i)=>document(String(i))));
  assert.equal(report.matchedPairs,231);assert.equal(report.matches.length,200);assert.equal(report.versions.length,22);
});
const reflection=(id,week,score,status='final',courseId='course')=>({id,week,courseId,userId:'alice',title:id,status,content:{...emptyContent,what:text},versions:[{id:'version',title:id,content:{...emptyContent,what:text},stage:'Revision 1'}],analyses:[],reviews:[{decision:'final',rubric:defaultRubric,scores:[score,score,score,score],total:score*2.5,level:score}],attachments:[]});
test('lecturer trends and criterion averages use final grades and keep missing weeks empty',()=>{
  const rows=[reflection('first',1,2),reflection('second',1,4,'final','other-course'),reflection('pending',2,1,'submitted'),reflection('returned',3,1,'returned')];
  const progress=learnerProgress(rows);assert.equal(progress.final,2);assert.equal(progress.finishedUnits,2);assert.equal(progress.totalUnits,18);
  assert.equal(progress.average,7.5);assert.equal(progress.points[0].level,3);assert.equal(progress.points[1].level,null);
  assert.equal(progress.criteria[0].average,7.5);assert.equal(progress.criteria[0].weak,1);assert.equal(progress.revisions,4);
});
test('old AI proposals cannot prefill new work or a changed rubric',()=>{
  const row=reflection('first',1,2);const analysis={kind:'feedback',versionId:'version',rubric:defaultRubric,result:{criteria:[]}};row.analyses=[analysis];
  assert.equal(currentFeedback(row,defaultRubric),analysis);assert.ok(analysisIsCurrent(row,analysis));
  assert.equal(currentFeedback(row,defaultRubric.map(c=>({...c,descriptions:c.descriptions.map(d=>d+' updated')}))),undefined);
  row.content.what+=' a new sentence';assert.equal(currentFeedback(row),undefined);
});
test('AI evidence is opt-in; text-only mode never reads stored files',async()=>{
  const files=[{object_key:'image',type:'image/png',name:'image.png'},{object_key:'pdf',type:'application/pdf',name:'report.pdf'},{object_key:'text',type:'text/plain',name:'notes.txt'},{object_key:'extra',type:'text/plain',name:'extra.txt'}];
  const reads=[],read=async key=>{reads.push(key);return new TextEncoder().encode('Evidence').buffer};
  const without=await analysisInput('Title',emptyContent,defaultRubric,files,false,read);assert.equal(without.length,1);assert.deepEqual(reads,[]);
  const withFiles=await analysisInput('Title',emptyContent,defaultRubric,files,true,read);
  assert.deepEqual(reads,['image','pdf','text']);assert.equal(withFiles.find(i=>i.type==='input_image').detail,'auto');assert.ok(withFiles.some(i=>i.type==='input_file'));assert.ok(withFiles.some(i=>i.type==='input_text'&&i.text.includes('Evidence')));
});
test('all new lecturer UI text and server errors have English translations',()=>{
  const dictionary=JSON.parse(fs.readFileSync(new URL('../lib/translations.en.json',import.meta.url),'utf8'));
  for(const file of ['app/ActionEditor.tsx','app/ActionMonitoring.tsx','app/AdminMonitoring.tsx','app/ArchivePanel.tsx','app/AssessmentFields.tsx','app/CourseHistory.tsx','app/FeedbackResults.tsx','app/GovernancePanel.tsx','app/LearningAnalytics.tsx','app/ParticipationPanel.tsx','app/RevisionComparison.tsx','app/SelfAssessment.tsx','app/StudentProgress.tsx','lib/learning-actions.ts','lib/action-evidence.ts','lib/assessment.ts','lib/reading.ts','lib/reading-ai.ts','app/api/learning/route.ts','app/api/action-evidence/route.ts','app/ProfileWorkspace.tsx','app/ProfilePageFrame.tsx','app/WorkspaceProfile.tsx','app/UserAvatar.tsx','app/api/profile/route.ts','app/api/avatars/[id]/route.ts','lib/profile.ts','lib/profile-store.ts','lib/admin-users.ts','app/MessagesWorkspace.tsx','app/MessagesPageFrame.tsx','app/MessageUnreadBadge.tsx','app/api/messages/route.ts','lib/messaging.ts','lib/message-store.ts','lib/access.ts','app/AdminNavigation.tsx','lib/admin-pages.ts','app/StudentReflectionEditor.tsx','app/ReflectionGuidance.tsx','app/LanguageToggle.tsx','app/PublicHome.tsx','app/PublicSite.tsx','app/SiteFooter.tsx','app/SimilarityPanel.tsx','app/LecturerInsights.tsx','app/RoleHelp.tsx','app/LecturerWorkspace.tsx','app/LecturerReview.tsx','app/LecturerCourses.tsx','lib/lecturer-pages.ts','lib/lecturer-review.ts','lib/lecturer-analysis.ts','app/api/similarity/route.ts']){
    const text=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node){if(ts.isStringLiteral(node)||ts.isJsxText(node)){const label=node.text.trim();if(/[À-ỹĐđ]/.test(label))assert.ok(label in dictionary,`${file}: ${label}`)}ts.forEachChild(node,visit)}visit(source);
  }
});
