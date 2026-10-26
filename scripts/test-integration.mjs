import {mkdtemp,cp,symlink,readdir,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
const source=fileURLToPath(new URL('../',import.meta.url)),root=await mkdtemp(join(tmpdir(),'thinkup-integration-')),project=join(root,'app');
const excluded=new Set(['.git','node_modules','.wrangler','dist','.next','.vinext','outputs','work','tsconfig.tsbuildinfo']);
await cp(source,project,{recursive:true,filter:path=>!excluded.has(basename(path))&&!basename(path).startsWith('.env')&&!basename(path).startsWith('.dev.vars')});
await symlink(join(source,'node_modules'),join(project,'node_modules'),'dir');
const port=await new Promise((resolvePort,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolvePort(p));});});
const url=`http://localhost:${port}`,env={...process.env,THINKUP_TEST_URL:url};
delete env.THINKUP_CODEX_BRIDGE_URL;delete env.THINKUP_CODEX_BRIDGE_TOKEN;delete env.OPENAI_API_KEY;
async function run(command,args){return new Promise((resolveRun,reject)=>{const child=spawn(command,args,{cwd:project,env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('error',reject);child.on('exit',code=>{process.stdout.write(output);if(code===0)resolveRun();else reject(new Error(`${command} exited ${code}`));});});}
async function clearScratchRateLimits(dir){
 if(!dir.startsWith(root))throw new Error('Test cleanup must remain within its scratch directory.');
 if(!existsSync(dir))return;
 for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await clearScratchRateLimits(path);else if(entry.name.endsWith('.sqlite')){const db=new DatabaseSync(path);try{if(db.prepare("SELECT name FROM sqlite_master WHERE name='auth_limits'").get())db.exec('DELETE FROM auth_limits');}finally{db.close();}}}
}
console.log(`Isolated integration workspace: ${root}`);
await run(process.execPath,['scripts/seed-demo.mjs']);
// Seed an unpublished report before the server starts, exclusively in the disposable D1.
async function seedPrivateReading(dir){
 if(!dir.startsWith(root))throw new Error('Fixtures must remain in the scratch workspace.');
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory()){if(await seedPrivateReading(path))return true;continue;}
  if(!entry.name.endsWith('.sqlite'))continue;
  const db=new DatabaseSync(path);
  try{
   if(!db.prepare("SELECT name FROM sqlite_master WHERE name='learning_records'").get())continue;
   const row=db.prepare("SELECT * FROM reflections WHERE user_id='demo-student' AND status='submitted' LIMIT 1").get();
   if(!row)throw new Error('Missing reading fixture reflection.');
   const stamp=new Date().toISOString(),content=JSON.parse(row.content_json),marker='TEST UNPUBLISHED READING: teacher approval required';
   const payload={provider:'TEST privacy fixture',result:{summary:[{text:'Fixture summary',evidence:content.what,section:'what'}],thinking:[],learning:[],attention:[],feedback:{strengths:marker,development:'Teacher draft',evidence:content.what,questions:'Why?',nextSteps:'Review'}}};
   db.prepare("INSERT INTO learning_records (id,kind,owner_id,reflection_id,course_id,version_id,payload_json,revision,created_at,updated_at) VALUES (?,'reading','demo-lecturer',?,?,?,?,1,?,?)").run('test-private-reading',row.id,row.course_id,row.latest_version,JSON.stringify(payload),stamp,stamp);
   env.THINKUP_READING_FIXTURE_REFLECTION=row.id;
   return true;
  }finally{db.close();}
 }
 return false;
}
if(!await seedPrivateReading(join(project,'.wrangler','state')))throw new Error('Unable to seed privacy fixture.');
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port',String(port)],{cwd:project,env,detached:true,stdio:['ignore','pipe','pipe']});let serverLog='';server.stdout.on('data',x=>serverLog+=x);server.stderr.on('data',x=>serverLog+=x);
try{
 let ready=false;for(let attempt=0;attempt<120;attempt++){try{const response=await fetch(url+'/api/thinkup',{signal:AbortSignal.timeout(2000)});if(response.ok){ready=true;break}}catch{/* Server is still starting. */}await new Promise(r=>setTimeout(r,250));}
 if(!ready)throw new Error('The test server did not start.');
 const available=['permissions-workflow','reading-privacy-workflow','demo-workflow','admin-users-workflow','auth-workflow','workflow','version15-workflow','messages-workflow','profile-workflow','final-workflow'],requested=process.argv.slice(2),files=requested.length?requested:available;
 if(files.some(file=>!available.includes(file)))throw new Error('Unknown integration workflow.');
 for(const file of files){
  // Only the disposable database is reset; production rate limits remain enabled and unchanged.
  await clearScratchRateLimits(join(project,'.wrangler','state'));
  console.log(`\nRunning ${file}`);await run(process.execPath,['--test',`tests/${file}.test.mjs`]);
 }
 console.log(`\nAll ${files.length} integration workflows passed. No paid AI requests were made.`);
}catch(error){console.error(error.message);console.error(serverLog.slice(-9000));process.exitCode=1;}
finally{
 await mkdir(join(root,'results'),{recursive:true});const {writeFile}=await import('node:fs/promises');await writeFile(join(root,'results','server.log'),serverLog);
 try{process.kill(-server.pid,'SIGTERM')}catch{/* Already stopped. */}
}
