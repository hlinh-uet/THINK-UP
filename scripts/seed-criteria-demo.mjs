import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultRubric } from '../lib/domain.ts';
import { normalizeFeedback } from '../lib/feedback-schema.ts';
import { upgradeRubricSettings } from '../lib/rubric-upgrade.ts';
import { localDatabaseId, localBucketName } from '../lib/local-bindings.mjs';
import { createDemoData } from './demo-data.mjs';
import { initializeDemoDatabase, seedDemo } from './seed-demo.mjs';

export const criteriaDemoMarker='demo-criteria-v2-seed';
export function createCriteriaDemoData() {
  const original=createDemoData('unused-local-fixture'),source=original.tables.reflections.find(r=>r.id==='demo-student-week-3');
  const content=JSON.parse(source.content_json),id='demo-criteria-v2',title='DEMO · Reflection theo rubric mới',stamp=new Date().toISOString();
  const versions=['Draft','AI Feedback','Submitted'].map((stage,i)=>({id:`${id}-v${i+1}`,reflection_id:id,content_json:source.content_json,title,stage,created_at:stamp}));
  const analysis=JSON.parse(original.tables.analyses.find(a=>a.reflection_id===source.id&&a.kind==='feedback').result_json);
  const scores=[3,4,3,4];analysis.criteria=analysis.criteria.map((c,i)=>({...c,score:scores[i]*2.5,level:scores[i],behavior:defaultRubric[i].descriptions[scores[i]-1]}));
  const result=normalizeFeedback(analysis,content,defaultRubric,[],'vi');result.levelMethod='demo-classification';
  return {files:[],tables:{
    reflections:[{...source,id,title,week:7,status:'submitted',rev:3,latest_version:versions[2].id,created_at:stamp,updated_at:stamp}],
    versions,
    analyses:[{id:`${id}-feedback`,reflection_id:id,version_id:versions[1].id,kind:'feedback',provider:'Demo fixture',result_json:JSON.stringify(result),rubric_json:JSON.stringify(defaultRubric),created_at:stamp}],
    audit:[{id:`${id}-audit`,user_id:'demo-student',action:'Criteria demo seed',target_id:id,detail:JSON.stringify({demo:true,rubric:'thinkup-criteria-v2'}),created_at:stamp}],
  }};
}
async function main() {
  if(process.argv.length>2||process.env.NODE_ENV==='production')throw new Error('Chỉ nạp mẫu rubric vào database local.');
  const projectRoot=fileURLToPath(new URL('../',import.meta.url));
  const hosting=JSON.parse(await readFile(new URL('../.openai/hosting.json',import.meta.url),'utf8'));
  const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
  const mf=new Miniflare({name:'thinkup-criteria-demo',modules:true,script:'export default {fetch(){return new Response("Local criteria fixture")}}',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{[hosting.d1]:localDatabaseId},r2Buckets:{[hosting.r2]:localBucketName},d1Persist:resolve(projectRoot,'.wrangler/state/v3/d1'),r2Persist:resolve(projectRoot,'.wrangler/state/v3/r2')});
  try{
    const db=await mf.getD1Database(hosting.d1),bucket=await mf.getR2Bucket(hosting.r2);
    await initializeDemoDatabase(db);
    if(!await db.prepare("SELECT id FROM users WHERE id='demo-student'").first()||!await db.prepare("SELECT id FROM courses WHERE id='demo-course-reflection'").first())throw new Error('Cần nạp bộ demo cơ bản bằng npm run db:seed trước.');
    await upgradeRubricSettings(db);
    const inserted=await seedDemo(db,bucket,createCriteriaDemoData(),criteriaDemoMarker);
    console.log(inserted?'Đã thêm một bài mẫu rubric mới ở tuần 7, tài khoản student@thinkup.local.':'Bài mẫu rubric đã có; giữ nguyên chỉnh sửa hiện tại.');
    console.log('Đây là feedback mẫu để kiểm thử giao diện, không phải kết quả gọi AI.');
  }finally{await mf.dispose()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1});
