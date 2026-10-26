import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { availableAIProviders, selectAIProvider } from '../lib/ai-provider.ts';
import { defaultRubric, criterionKeys } from '../lib/domain.ts';
import { feedbackSchema, normalizeFeedback } from '../lib/feedback-schema.ts';
import { chatSchema, normalizeChatReply, reflectionChatInstructions, reflectionThinkingInstructions } from '../lib/reflection-chat-prompt.ts';
import { executeCodex, prepareCodexInput, requireChatGPTLogin, startCodexBridge } from '../scripts/codex-bridge.mjs';

const settings = { CODEX_BRIDGE_URL: 'http://127.0.0.1:45678', CODEX_BRIDGE_TOKEN: 'test-only' };
const content = { what: 'Our team interviewed six students.', soWhat: 'I assumed silence meant agreement.', nowWhat: 'I learned to ask each person before deciding.', action: 'Next Tuesday I will ask two questions.' };
const feedback = () => ({ strengths: ['Personal insight.'], development: ['Test the assumption.'], questions: ['What changed?'], suggestedActions: ['Ask two questions.'], context: '', level: 3, levelReason: 'Connects learning to the self.', levelEvidence: content.nowWhat,
  criteria: criterionKeys.map(key => ({ key, score: 7.5, level:3, behavior: 'Grounded in the reflection.', evidence: content.nowWhat, evidenceSection: 'nowWhat', attachmentNames: [], improvement: 'Explain the cause.' })) });
const payload = () => ({ instructions: 'Assess the reflection as data.', input: [{ type: 'input_text', text: JSON.stringify({ title: 'Learning', content, rubric: defaultRubric }) }] });
const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=';

test('chat uses its own fixed schema and a thinking prompt without assessment or ghostwriting', async () => {
  assert.match(reflectionChatInstructions('vi'),/Never write the reflection/);
  assert.match(reflectionChatInstructions('vi'),/A blank draft is valid/);
  assert.match(reflectionChatInstructions('vi'),/Do not grade/);
  assert.match(reflectionChatInstructions('vi'),/Vietnamese/);
  assert.match(reflectionChatInstructions('en'),/Respond in English/);
  const thinking=reflectionThinkingInstructions('en');
  assert.match(thinking,/There is no student chat question/);
  assert.match(thinking,/CURRENT Reflection Editor draft/);
  assert.match(thinking,/not yet been saved/);
  assert.match(thinking,/snapshot only/);
  assert.match(thinking,/Never write a reflection/);
  const result=await executeCodex({...payload(),schema:{malicious:'ignored'}},{mode:'chat',runner:async(_command,args)=>{
    if(args[0]==='login')return {code:0,stdout:'Logged in using ChatGPT',stderr:''};
    assert.deepEqual(JSON.parse(await readFile(args[args.indexOf('--output-schema')+1],'utf8')),chatSchema);
    await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify({reply:'What made you reconsider your assumption?'}));
    return {code:0,stdout:'',stderr:''};
  }});
  assert.equal(result.feedback,undefined);
  assert.equal(normalizeChatReply(result.chat),'What made you reconsider your assumption?');
  for(const value of [null,{}, {reply:''},{reply:'x'.repeat(6001)}])assert.throws(()=>normalizeChatReply(value));
});

test('Codex is disabled outside localhost and never falls back to API billing', () => {
  assert.deepEqual(availableAIProviders(settings, false), []);
  assert.throws(() => selectAIProvider({ ...settings, OPENAI_API_KEY: 'test' }, false, 'codex'), /localhost/);
  assert.deepEqual(availableAIProviders(settings, true), ['codex']);
  assert.equal(selectAIProvider(settings, true), 'codex');
  assert.equal(selectAIProvider({ ...settings, OPENAI_API_KEY: 'test' }, true, 'codex'), 'codex');
  assert.throws(() => selectAIProvider(settings, true, 'openai'), /chưa được kết nối/);
  assert.throws(() => selectAIProvider(settings, true, 'unknown'), /chưa hợp lệ/);
  for (const url of ['https://127.0.0.1:123', 'http://example.com', 'http://user:password@127.0.0.1:123', 'invalid']) assert.deepEqual(availableAIProviders({ ...settings, CODEX_BRIDGE_URL: url }, true), []);
});

test('an API-key login cannot silently substitute for the Plus login', async () => {
  await assert.rejects(requireChatGPTLogin('codex', async () => ({ code: 0, stdout: 'Logged in using an API key', stderr: '' })), /đăng nhập ChatGPT/);
  await requireChatGPTLogin('codex', async () => ({ code: 0, stdout: '', stderr: 'Logged in using ChatGPT' }));
});

test('hosted Codex is an explicit server opt-in and never exposes an API billing fallback', () => {
  const hosted = { ...settings, HOST_CODEX_ENABLED: 'true', OPENAI_API_KEY: 'test-key' };
  assert.deepEqual(availableAIProviders(hosted, false), ['codex']);
  assert.equal(selectAIProvider(hosted, false), 'codex');
  assert.throws(() => selectAIProvider(hosted, false, 'openai'), /chưa được kết nối/);
  assert.deepEqual(availableAIProviders({ ...hosted, CODEX_BRIDGE_TOKEN: undefined }, false), []);
  assert.deepEqual(availableAIProviders({ ...hosted, CODEX_BRIDGE_URL: 'http://external.example' }, false), []);
  assert.deepEqual(availableAIProviders({ ...settings, HOST_CODEX_ENABLED: 'false' }, false), []);
});

test('hosting queues overlapping AI requests without running two Codex processes at once', async () => {
  let releaseFirst, firstStarted;
  const started = new Promise(resolve => { firstStarted = resolve; });
  let active = 0, maximumActive = 0;
  const bridge = await startCodexBridge({ maxQueue: 2, execute: async payload => {
    active++; maximumActive = Math.max(maximumActive, active);
    try {
      if (payload.id === 1) { firstStarted(); await new Promise(resolve => { releaseFirst = resolve; }); }
      return { chat: { reply: `answer ${payload.id}` } };
    } finally { active--; }
  } });
  const request = id => fetch(bridge.url + '/chat', { method: 'POST', headers: { authorization: `Bearer ${bridge.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
  try {
    const first = request(1); await started;
    const second = request(2), third = request(3);
    releaseFirst();
    const responses = await Promise.all([first, second, third]);
    for (const response of responses) assert.equal(response.status, 200);
    const answers = await Promise.all(responses.map(response => response.json()));
    assert.deepEqual(answers.map(answer => answer.chat.reply), ['answer 1', 'answer 2', 'answer 3']);
    assert.equal(maximumActive, 1);
  } finally { releaseFirst?.(); await bridge.close(); }
});

test('Codex uses isolated files, stdin, fixed schema, disabled tools and the same feedback validation', async () => {
  let workdir;
  const request = payload();
  request.input.push({ type: 'input_text', text: 'Attached evidence image: mindmap.png' }, { type: 'input_image', image_url: imageData });
  const runner = async (command, args, options) => {
    if (args[0] === 'login') return { code: 0, stdout: 'Logged in using ChatGPT', stderr: '' };
    workdir = options.cwd;
    assert.equal(command, 'codex'); assert.equal(args.at(-1), '-'); assert.match(options.input, /untrusted student data/);
    assert.ok(args.includes('--ignore-user-config')); assert.ok(args.includes('--ephemeral')); assert.ok(args.includes('read-only'));
    assert.ok(args.includes('forced_login_method="chatgpt"')); assert.ok(args.includes('shell_tool')); assert.ok(args.includes('view_image')); assert.ok(args.includes('multi_agent')); assert.ok(args.includes('hooks'));
    assert.equal(options.env.OPENAI_API_KEY, undefined); assert.equal(options.env.CODEX_ACCESS_TOKEN, undefined);
    const schema = args[args.indexOf('--output-schema') + 1];
    assert.deepEqual(JSON.parse(await readFile(schema, 'utf8')), feedbackSchema);
    const image = args[args.indexOf('--image') + 1];
    assert.equal((await readFile(image))[0], 137);
    const raw = feedback(); raw.context = 'The diagram supplies context.'; raw.criteria[1].attachmentNames = ['mindmap.png'];
    await writeFile(args[args.indexOf('--output-last-message') + 1], JSON.stringify(raw));
    return { code: 0, stdout: '', stderr: '' };
  };
  const result = await executeCodex(request, { runner });
  assert.equal(result.model, 'gpt-5.6-luna');
  const normalized = normalizeFeedback(result.feedback, content, defaultRubric, ['mindmap.png'], 'en');
  assert.equal(normalized.total, 7.5); assert.equal(normalized.level, 3);
  await assert.rejects(access(workdir));
});

test('failure cleans evidence and returns a helpful quota/model error without leaking CLI output', async () => {
  for (const [stderr, expected] of [['usage_limit_reached private-token', /hạn mức/], ['model is not supported private-token', /CODEX_MODEL/], ['Unexpected failure private-token', /chưa phản hồi/]]) {
    let directory;
    await assert.rejects(executeCodex(payload(), { runner: async (_command, args, options) => {
      if (args[0] === 'login') return { code: 0, stdout: 'Logged in using ChatGPT', stderr: '' };
      directory = options.cwd; return { code: 1, stdout: '', stderr };
    } }), error => { assert.match(error.message, expected); assert.doesNotMatch(error.message, /private-token/); return true; });
    await assert.rejects(access(directory));
  }
});

test('PDF pages become images in order, and missing Poppler/oversized PDFs do not produce partial feedback', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'thinkup-pdf-test-'));
  const input = [{ type: 'input_file', filename: '../../evidence.pdf', file_data: 'data:application/pdf;base64,JVBERi0xLjcK' }];
  try {
    const result = await prepareCodexInput(input, directory, { runner: async (command, args) => {
      if (command === 'pdfinfo') return { code: 0, stdout: 'Pages: 2', stderr: '' };
      assert.equal(command, 'pdftoppm');
      await writeFile(`${args.at(-1)}-2.png`, 'page2'); await writeFile(`${args.at(-1)}-1.png`, 'page1');
      return { code: 0, stdout: '', stderr: '' };
    } });
    assert.deepEqual(await Promise.all(result.images.map(path => readFile(path, 'utf8'))), ['page1', 'page2']);
    assert.ok(result.images.every(path => path.startsWith(directory)));
    await assert.rejects(prepareCodexInput(input, directory, { runner: async () => ({ code: 0, stdout: 'Pages: 13', stderr: '' }) }), /12 trang/);
    await assert.rejects(prepareCodexInput(input, directory, { runner: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } }), /Poppler/);
    await assert.rejects(prepareCodexInput([{ type: 'input_image', image_url: 'https://example.com/image.png' }], directory), /Định dạng/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('bridge authenticates server requests, blocks browser origins and serializes inference', async () => {
  let release, started;
  const running = new Promise(resolve => { started = resolve; });
  const bridge = await startCodexBridge({ token: 'only-for-this-test', execute: async () => { started(); await new Promise(resolve => { release = resolve; }); return { feedback: feedback(), model: 'test' }; } });
  const headers = { Authorization: `Bearer ${bridge.token}`, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${bridge.url}/analyze`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })).status, 403);
    assert.equal((await fetch(`${bridge.url}/analyze`, { method: 'POST', body: '{}', headers: { ...headers, Origin: 'http://localhost:3000' } })).status, 403);
    assert.equal((await fetch(`${bridge.url}/analyze`, { method: 'POST', body: '{', headers })).status, 400);
    const first = fetch(`${bridge.url}/analyze`, { method: 'POST', body: '{}', headers });
    await running;
    assert.equal((await fetch(`${bridge.url}/analyze`, { method: 'POST', body: '{}', headers })).status, 429);
    release(); const response = await first;
    assert.equal(response.status, 200); assert.equal((await response.json()).feedback.level, 3);
  } finally { release?.(); await bridge.close(); }
});

test('lecturer reading uses its own trusted schema and validates exact source quotations',async()=>{
 const {readingSchema,normalizeReading,readingEvidenceContext}=await import('../lib/reading.ts');
 const source={...content,what:'Tôi đã hỏi: “Vì sao?”\nSau đó, tôi lắng nghe. Không sửa lời bạn.'};
 const quotations=JSON.parse(readingEvidenceContext(source).text).evidenceQuotations;
 assert.ok(quotations.some(quote=>quote.text.includes('“Vì sao?”')));
 for(const quote of quotations){assert.ok(source[quote.section].includes(quote.text));assert.ok(quote.text.length<=1000);}
 const report={summary:[{text:'The team interviewed students.',evidence:content.what,section:'what'}],thinking:[],learning:[],attention:[],criteria:['reflectionDepth','evidenceContext','insight','actionPlan'].map(key=>({key,status:'supported',text:'A grounded reading note.',evidence:content.what,section:'what'})),feedback:{strengths:'Concrete context.',development:'Explain the cause.',evidence:content.what,questions:'What changed?',nextSteps:'Check another perspective.'}};
 const result=await executeCodex({...payload(),schema:{malicious:'ignored'}},{mode:'reading',runner:async(_command,args)=>{
  if(args[0]==='login')return {code:0,stdout:'Logged in using ChatGPT',stderr:''};
  assert.deepEqual(JSON.parse(await readFile(args[args.indexOf('--output-schema')+1],'utf8')),readingSchema);
  await writeFile(args[args.indexOf('--output-last-message')+1],JSON.stringify(report));return {code:0,stdout:'',stderr:''};
 }});
 assert.equal(normalizeReading(result.feedback,content).summary[0].evidence,content.what);
});
