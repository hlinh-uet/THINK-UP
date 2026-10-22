import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {localDatabaseId,localBucketName} from '../lib/local-bindings.mjs';
import {initializeDemoDatabase,seedDemo} from './seed-demo.mjs';
import {createStudentCourseDemoData,studentCourseDemoMarker} from './student-course-demo-data.mjs';

export async function seedStudentCourses(db,bucket,data=createStudentCourseDemoData()){
 for(const [id,role] of [['demo-student','student'],['demo-lecturer','lecturer'],['demo-lecturer-2','lecturer']]){
  const user=await db.prepare('SELECT role FROM users WHERE id=?').bind(id).first();
  if(user?.role!==role)throw new Error('Cần bộ tài khoản demo gốc. Chạy npm run db:seed trước; không thay tài khoản hiện có.');
 }
 return seedDemo(db,bucket,data,studentCourseDemoMarker);
}

async function main(){
 if(process.argv.length>2||process.env.NODE_ENV==='production')throw new Error('Chỉ thêm học phần demo local; không nhận tùy chọn remote/production.');
 const projectRoot=fileURLToPath(new URL('../',import.meta.url));
 const hosting=JSON.parse(await readFile(new URL('../.openai/hosting.json',import.meta.url),'utf8'));
 if(!hosting.d1||!hosting.r2)throw new Error('Dự án cần khai báo D1 và R2 local.');
 const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
 const mf=new Miniflare({name:'thinkup-student-course-demo',modules:true,script:'export default {fetch(){return new Response("Local student course fixtures")}}',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{[hosting.d1]:localDatabaseId},r2Buckets:{[hosting.r2]:localBucketName},d1Persist:resolve(projectRoot,'.wrangler/state/v3/d1'),r2Persist:resolve(projectRoot,'.wrangler/state/v3/r2')});
 try{
  const db=await mf.getD1Database(hosting.d1),bucket=await mf.getR2Bucket(hosting.r2);
  await initializeDemoDatabase(db);
  const data=createStudentCourseDemoData(),inserted=await seedStudentCourses(db,bucket,data);
  console.log(inserted?`Đã thêm ${data.tables.courses.length} học phần, ${data.tables.reflections.length} bài viết, ${data.tables.actions.length} cam kết và ${data.tables.reviews.length} góp ý demo.`:'Bộ học phần demo đã có; giữ nguyên các chỉnh sửa, không thêm trùng.');
  const counts=await db.prepare("SELECT (SELECT COUNT(*) FROM memberships WHERE user_id='demo-student' AND role='student') AS courses,(SELECT COUNT(*) FROM reflections WHERE user_id='demo-student') AS reflections,(SELECT COUNT(*) FROM actions WHERE user_id='demo-student') AS actions").first();
  console.log('student@thinkup.local:',counts);
 }finally{await mf.dispose()}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1});
