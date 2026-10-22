import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createDemoData, demoMarker, demoPassword } from '../scripts/demo-data.mjs';
import { initializeDemoDatabase, seedDemo } from '../scripts/seed-demo.mjs';
import { hashPassword, verifyPassword } from '../lib/security.ts';
import { validateLevel, totalScore, validateWeeks, validateRubric, defaultRubric, writingSections } from '../lib/domain.ts';
import { upgradeRubricSettings } from '../lib/rubric-upgrade.ts';
import { createCriteriaDemoData, criteriaDemoMarker } from '../scripts/seed-criteria-demo.mjs';
import {createStudentCourseDemoData} from '../scripts/student-course-demo-data.mjs';
import {seedStudentCourses} from '../scripts/seed-student-courses.mjs';
import {validateAssessment} from '../lib/assessment.ts';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

test('additional student courses preserve existing work, have valid assessments and can be seeded only once',async()=>{
  const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],r2Buckets:['FILES']});
  try{
    const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('FILES');
    await initializeDemoDatabase(db);
    const data=createStudentCourseDemoData(new Date('2026-10-22T07:00:00Z'));
    await assert.rejects(seedStudentCourses(db,bucket,data),/demo gốc/);
    assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM courses').first('n'),0);
    await seedDemo(db,bucket,createDemoData('unused-test-hash'));
    const oldReflections=(await db.prepare('SELECT * FROM reflections ORDER BY id').all()).results;
    const oldCourses=(await db.prepare('SELECT * FROM courses ORDER BY id').all()).results;
    assert.equal(await seedStudentCourses(db,bucket,data),true);
    assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM courses').first('n'),oldCourses.length+8);
    assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM reflections').first('n'),oldReflections.length+24);
    assert.deepEqual((await db.prepare("SELECT * FROM reflections WHERE id NOT LIKE 'demo-ui-%' ORDER BY id").all()).results,oldReflections);
    assert.deepEqual((await db.prepare("SELECT * FROM courses WHERE id NOT LIKE 'demo-course-ui-%' ORDER BY id").all()).results,oldCourses);
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results,[]);
    for(const course of data.tables.courses){
      validateWeeks(JSON.parse(course.weeks_json));validateRubric(JSON.parse(course.rubric_json));
      assert.equal(await db.prepare("SELECT COUNT(*) AS n FROM memberships WHERE course_id=? AND user_id='demo-student' AND role='student'").bind(course.id).first('n'),1);
      assert.equal(data.tables.reflections.filter(r=>r.course_id===course.id).length,3);
    }
    for(const reflection of data.tables.reflections){
      const version=data.tables.versions.find(v=>v.id===reflection.latest_version);
      assert.equal(version.reflection_id,reflection.id);assert.equal(version.content_json,reflection.content_json);
      assert.equal(reflection.rev,data.tables.versions.filter(v=>v.reflection_id===reflection.id).length);
    }
    for(const review of data.tables.reviews){
      const reflection=data.tables.reflections.find(r=>r.id===review.reflection_id);
      assert.ok(data.tables.memberships.some(m=>m.course_id===reflection.course_id&&m.user_id===review.reviewer_id&&m.role==='lecturer'));
      assert.equal(review.version_id,reflection.latest_version);
      const detail=data.tables.learning_records.find(r=>r.id===`review:${review.id}`);
      const criteria=JSON.parse(detail.payload_json).criteria;
      if(review.decision==='final'){
        validateAssessment(criteria,JSON.parse(reflection.content_json),defaultRubric,[]);
        assert.equal(review.total,totalScore(JSON.parse(review.scores_json),defaultRubric));
      }else{assert.equal(review.total,null);assert.deepEqual(criteria,[])}
    }
    for(const row of data.tables.analyses){
      const result=JSON.parse(row.result_json),version=data.tables.versions.find(v=>v.id===row.version_id),content=JSON.parse(version.content_json);
      assert.equal(result.scoreScale,10);assert.equal(result.levelMethod,'demo-classification');
      assert.equal(result.total,totalScore(result.criteria.map(c=>c.score),defaultRubric));
      for(const criterion of result.criteria)assert.ok(content[criterion.evidenceSection].includes(criterion.evidence));
    }
    const courseId=data.tables.courses[0].id,actionId=data.tables.actions[0].id;
    await db.prepare('UPDATE courses SET name=? WHERE id=?').bind('My edited sample course',courseId).run();
    await db.prepare('DELETE FROM actions WHERE id=?').bind(actionId).run();
    assert.equal(await seedStudentCourses(db,bucket,data),false);
    assert.equal(await db.prepare('SELECT name FROM courses WHERE id=?').bind(courseId).first('name'),'My edited sample course');
    assert.equal(await db.prepare('SELECT id FROM actions WHERE id=?').bind(actionId).first(),null);
  }finally{await mf.dispose()}
});

test('local seed preserves existing data and edits, with consistent relational history and R2 evidence', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'], r2Buckets: ['FILES'] });
  try {
    const db = await mf.getD1Database('DB');
    const bucket = await mf.getR2Bucket('FILES');
    await initializeDemoDatabase(db);
    await db.batch([
      db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').bind('existing-user', 'existing@example.edu', 'Existing account', 'admin', 1, '2026-01-01'),
      db.prepare('INSERT INTO settings VALUES (?,?)').bind('owner', 'existing-user'),
      db.prepare('INSERT INTO settings VALUES (?,?)').bind('weeks', 'existing custom weeks'),
    ]);
    const data = createDemoData(await hashPassword(demoPassword), new Date('2026-10-02T15:00:00Z'));
    assert.equal(await seedDemo(db, bucket, data), true);
    assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM users').first('COUNT(*)'), 9);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM reflections').first('COUNT(*)'), 14);
    assert.equal(await db.prepare('SELECT value FROM settings WHERE key=?').bind('owner').first('value'), 'existing-user');
    assert.equal(await db.prepare('SELECT value FROM settings WHERE key=?').bind('weeks').first('value'), 'existing custom weeks');
    const passwordHash = await db.prepare('SELECT password_hash FROM credentials WHERE user_id=?').bind('demo-student').first('password_hash');
    assert.ok(await verifyPassword(demoPassword, passwordHash));
    for (const course of data.tables.courses) {
      validateWeeks(JSON.parse(course.weeks_json));
      validateRubric(JSON.parse(course.rubric_json));
    }
    for (const r of data.tables.reflections) {
      const version = await db.prepare('SELECT * FROM versions WHERE id=?').bind(r.latest_version).first();
      assert.equal(version.reflection_id, r.id);
      assert.equal(version.content_json, r.content_json);
      assert.equal(r.rev, data.tables.versions.filter(v => v.reflection_id === r.id).length);
    }
    for (const analysis of data.tables.analyses) {
      const result = JSON.parse(analysis.result_json), rubric = JSON.parse(analysis.rubric_json);
      const scores = result.criteria.map(c => c.score);
      assert.equal(result.total, totalScore(scores, rubric, result.scoreScale||4));
      assert.equal(validateLevel(result.level), result.level);assert.equal(result.levelMethod,'demo-classification');
      assert.equal(analysis.provider, 'Demo fixture');
      const version = data.tables.versions.find(v => v.id === analysis.version_id);
      for (const criterion of result.criteria) assert.ok(JSON.parse(version.content_json)[criterion.evidenceSection].includes(criterion.evidence));
    }
    for (const attachment of data.tables.attachments) {
      const object = await bucket.get(attachment.object_key);
      assert.ok(object);
      assert.equal(object.size, attachment.size);
      assert.equal(object.httpMetadata.contentType, attachment.type);
    }
    const states = new Set(data.tables.reflections.map(r => r.status));
    assert.deepEqual(states, new Set(['draft', 'submitted', 'returned', 'final']));
    for (const review of data.tables.reviews) {
      const r = data.tables.reflections.find(r => r.id === review.reflection_id);
      const membership = data.tables.memberships.find(m => m.course_id === r.course_id && m.user_id === review.reviewer_id);
      assert.equal(membership.role, 'lecturer');
      assert.equal(review.version_id, r.latest_version);
    }
    const oldRubric=JSON.stringify(writingSections.map(s=>({...s,weight:25,descriptions:['Custom old 1','Custom old 2','Custom old 3','Custom old 4']})));
    await db.batch([
      db.prepare("UPDATE settings SET value=? WHERE key='rubric'").bind(oldRubric),
      db.prepare('UPDATE courses SET rubric_json=? WHERE id=?').bind(oldRubric,'demo-course-reflection'),
      db.prepare('UPDATE analyses SET rubric_json=?').bind(oldRubric),
      db.prepare('UPDATE reviews SET rubric_json=?').bind(oldRubric),
    ]);
    const previousAnalyses=(await db.prepare('SELECT * FROM analyses ORDER BY id').all()).results,previousReviews=(await db.prepare('SELECT * FROM reviews ORDER BY id').all()).results;
    await upgradeRubricSettings(db);
    assert.deepEqual(JSON.parse(await db.prepare("SELECT value FROM settings WHERE key='rubric'").first('value')),defaultRubric);
    assert.equal(await db.prepare("SELECT value FROM settings WHERE key='rubric-archive:system:v1'").first('value'),oldRubric);
    assert.equal(await db.prepare("SELECT value FROM settings WHERE key='rubric-archive:course:demo-course-reflection:v1'").first('value'),oldRubric);
    assert.deepEqual((await db.prepare('SELECT * FROM analyses ORDER BY id').all()).results,previousAnalyses);
    assert.deepEqual((await db.prepare('SELECT * FROM reviews ORDER BY id').all()).results,previousReviews);
    const customized=JSON.stringify(defaultRubric.map(c=>({...c,name:c.name+' custom'})));
    await db.prepare('UPDATE courses SET rubric_json=? WHERE id=?').bind(customized,'demo-course-reflection').run();
    await upgradeRubricSettings(db);
    assert.equal(await db.prepare('SELECT rubric_json FROM courses WHERE id=?').bind('demo-course-reflection').first('rubric_json'),customized);
    await db.prepare('UPDATE reflections SET title=? WHERE id=?').bind('My edited demo', 'demo-student-week-6').run();
    await db.prepare('DELETE FROM actions WHERE id=?').bind('demo-student-action-5').run();
    assert.equal(await seedDemo(db, bucket, data), false);
    assert.equal(await db.prepare('SELECT title FROM reflections WHERE id=?').bind('demo-student-week-6').first('title'), 'My edited demo');
    assert.equal(await db.prepare('SELECT COUNT(*) FROM actions').first('COUNT(*)'), 6);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM reflections').first('COUNT(*)'), 14);
    const sample=createCriteriaDemoData();
    assert.equal(await seedDemo(db,bucket,sample,criteriaDemoMarker),true);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM reflections').first('COUNT(*)'),15);
    const current=JSON.parse(await db.prepare('SELECT result_json FROM analyses WHERE id=?').bind('demo-criteria-v2-feedback').first('result_json'));
    assert.equal(current.total,8.63);assert.equal(current.weightedScore,8.63);assert.equal(current.levelMethod,'demo-classification');
    await db.prepare('UPDATE reflections SET title=? WHERE id=?').bind('My edited criteria example','demo-criteria-v2').run();
    assert.equal(await seedDemo(db,bucket,sample,criteriaDemoMarker),false);
    assert.equal(await db.prepare('SELECT title FROM reflections WHERE id=?').bind('demo-criteria-v2').first('title'),'My edited criteria example');
  } finally { await mf.dispose(); }
});

test('a conflicting account rolls back the entire demo and cleans up uploaded fixtures', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("test")}}', compatibilityDate: '2026-05-15', d1Databases: ['DB'], r2Buckets: ['FILES'] });
  try {
    const db = await mf.getD1Database('DB'), bucket = await mf.getR2Bucket('FILES');
    await initializeDemoDatabase(db);
    await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').bind('existing', 'student@thinkup.local', 'Existing student', 'student', 1, '2026-01-01').run();
    const data = createDemoData('unused-test-hash');
    await assert.rejects(seedDemo(db, bucket, data), /UNIQUE/);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM users').first('COUNT(*)'), 1);
    assert.equal(await db.prepare('SELECT COUNT(*) FROM courses').first('COUNT(*)'), 0);
    assert.equal(await db.prepare('SELECT value FROM settings WHERE key=?').bind(demoMarker).first(), null);
    for (const file of data.files) assert.equal(await bucket.head(file.key), null);
  } finally { await mf.dispose(); }
});
