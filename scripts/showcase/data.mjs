// A realistic trial dataset: one admin, three lecturers, 22 students, four courses in week 6 of the nine-week journey.
// All people and events are fictional. Dates are relative to the seeding day so the semester always looks current.
import { defaultRubric, defaultWeeks, criterionKeys, totalScore } from '../../lib/domain.ts';
import { criterionLevel, rubricVersion, validateAssessment } from '../../lib/assessment.ts';
import { normalizeFeedback } from '../../lib/feedback-schema.ts';
import knm1101 from './knm1101.mjs';
import knm1203 from './knm1203.mjs';
import tks2105 from './tks2105.mjs';
import cds2302 from './cds2302.mjs';
import knm1101En from './en/knm1101.mjs';
import knm1203En from './en/knm1203.mjs';
import tks2105En from './en/tks2105.mjs';
import cds2302En from './en/cds2302.mjs';

export const showcaseMarker = 'showcase-seed-v1';
export const showcasePassword = 'ThinkUp@2026';
export const loginAccounts = [
  { role: 'student', email: 'sinhvien@thinkup.test', name: 'Nguyễn Minh Anh' },
  { role: 'lecturer', email: 'giangvien@thinkup.test', name: 'TS. Nguyễn Thu Hà' },
  { role: 'admin', email: 'admin@thinkup.test', name: 'Phạm Quốc Huy' },
];

const people = [
  ['admin', 'admin@thinkup.test', 'Phạm Quốc Huy', 'admin'],
  ['thu-ha', 'giangvien@thinkup.test', 'TS. Nguyễn Thu Hà', 'lecturer', 'Cô'],
  ['minh-duc', 'duc.tranminh@thinkup.test', 'ThS. Trần Minh Đức', 'lecturer', 'Thầy'],
  ['hai-yen', 'yen.lehai@thinkup.test', 'TS. Lê Hải Yến', 'lecturer', 'Cô'],
  ['minh-anh', 'sinhvien@thinkup.test', 'Nguyễn Minh Anh'],
  ['gia-bao', 'bao.trangia@thinkup.test', 'Trần Gia Bảo'],
  ['thao-vy', 'vy.lethao@thinkup.test', 'Lê Thảo Vy'],
  ['hoang-nam', 'nam.phamhoang@thinkup.test', 'Phạm Hoàng Nam'],
  ['khanh-linh', 'linh.dokhanh@thinkup.test', 'Đỗ Khánh Linh'],
  ['duc-huy', 'huy.vuduc@thinkup.test', 'Vũ Đức Huy'],
  ['ngoc-mai', 'mai.hoangngoc@thinkup.test', 'Hoàng Ngọc Mai'],
  ['quang-khai', 'khai.buiquang@thinkup.test', 'Bùi Quang Khải'],
  ['phuong-thao', 'thao.ngophuong@thinkup.test', 'Ngô Phương Thảo'],
  ['tuan-kiet', 'kiet.dangtuan@thinkup.test', 'Đặng Tuấn Kiệt'],
  ['thu-trang', 'trang.phanthu@thinkup.test', 'Phan Thu Trang'],
  ['minh-quan', 'quan.trinhminh@thinkup.test', 'Trịnh Minh Quân'],
  ['hai-dang', 'dang.lyhai@thinkup.test', 'Lý Hải Đăng'],
  ['anh-thu', 'thu.maianh@thinkup.test', 'Mai Anh Thư'],
  ['van-loc', 'loc.caovan@thinkup.test', 'Cao Văn Lộc'],
  ['bao-ngoc', 'ngoc.dinhbao@thinkup.test', 'Đinh Bảo Ngọc'],
  ['gia-han', 'han.hogia@thinkup.test', 'Hồ Gia Hân'],
  ['quoc-viet', 'viet.taquoc@thinkup.test', 'Tạ Quốc Việt'],
  ['khanh-vy', 'vy.luongkhanh@thinkup.test', 'Lương Khánh Vy'],
  ['duc-anh', 'anh.kieuduc@thinkup.test', 'Kiều Đức Anh'],
  ['ha-my', 'my.toha@thinkup.test', 'Tô Hà My'],
  ['nhat-minh', 'minh.chunhat@thinkup.test', 'Chu Nhật Minh', 'student', null, 0],
];
const uid = key => `u-${key}`;

const courses = [
  { key: 'knm1101', code: 'KNM1101', name: 'Kỹ năng học tập và tư duy phản biện', className: 'KNM1101-01', nameEn: 'Study skills and critical thinking', lecturer: 'thu-ha', shift: 0, entries: knm1101, english: knm1101En,
    students: ['minh-anh', 'gia-bao', 'thao-vy', 'hoang-nam', 'khanh-linh', 'duc-huy', 'ngoc-mai', 'quang-khai', 'phuong-thao', 'tuan-kiet'] },
  { key: 'knm1203', code: 'KNM1203', name: 'Giao tiếp và làm việc nhóm', className: 'KNM1203-02', nameEn: 'Communication and teamwork', lecturer: 'thu-ha', shift: 1, entries: knm1203, english: knm1203En,
    students: ['minh-anh', 'thu-trang', 'minh-quan', 'hai-dang', 'anh-thu', 'van-loc', 'bao-ngoc', 'gia-han', 'nhat-minh'] },
  { key: 'tks2105', code: 'TKS2105', name: 'Tư duy thiết kế', className: 'TKS2105-01', nameEn: 'Design thinking', lecturer: 'minh-duc', shift: 2, entries: tks2105, english: tks2105En,
    students: ['minh-anh', 'thao-vy', 'quoc-viet', 'khanh-vy', 'duc-anh', 'ha-my', 'minh-quan'] },
  { key: 'cds2302', code: 'CDS2302', name: 'Học tập phục vụ cộng đồng', className: 'CDS2302-03', nameEn: 'Community-engaged learning', lecturer: 'hai-yen', shift: 1, entries: cds2302, english: cds2302En,
    students: ['khanh-linh', 'phuong-thao', 'anh-thu', 'gia-han', 'duc-anh', 'ha-my'] },
];
const cid = key => `c-${key}`;

// Deterministic variety without randomness, so reseeding produces the same dataset.
function hash(text) { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
const pick = (list, seed) => list[hash(seed) % list.length];
const firstSentence = text => (text.match(/^.*?[.!?](\s|$)/)?.[0] || text).trim();
const round = n => Math.round(n * 10) / 10;

const requirements = 'Viết 250–450 từ theo bốn phần: Trải nghiệm, Phân tích, Bài học và Hành động. Nêu ít nhất một chi tiết cụ thể (lời nói, số liệu, thời điểm) và một kế hoạch có thời hạn.';

const requirementsEn = 'Write 250–450 words in four parts: Experience, Analysis, Learning and Action. Include at least one concrete detail (a quote, a figure, a moment) and a plan with a deadline.';
const draftActionEn = 'I will pay more attention next time.';
const strengthsEn = {
  reflectionDepth: ['You went beyond retelling events and began to explain why you reacted as you did.', 'Your analysis shows you are willing to revisit your initial way of thinking.', 'You identified your feelings and linked them to specific causes in the situation.'],
  evidenceContext: ['The situation is described concretely, with time, people and details that help the reader picture it.', 'You use real details (quotes, figures) as evidence for your claims.', 'The context is clear, so the argument that follows has something to stand on.'],
  insight: ['The lesson comes directly from the experience rather than a generic slogan.', 'You express the lesson as a principle that can be reused in other situations.', 'You explain why this lesson matters to you personally.'],
  actionPlan: ['The plan has a concrete action, a deadline and a way to check the result.', 'The proposed action is directly linked to the lesson you drew.', 'You break the plan into small steps you can start next week.'],
};
const developmentEn = {
  reflectionDepth: ['The analysis stays at surface feelings; ask “why do I think this?” at least once more.', 'You could consider another explanation for the situation before drawing a conclusion.'],
  evidenceContext: ['The situation is still general; adding a concrete detail such as a quote, a figure or a moment would make the argument more convincing.', 'Describe more clearly the roles of the people involved so the reader understands the context.'],
  insight: ['The lesson is still fairly general; explain which detail of the experience it came from.', 'Try stating where else the lesson could apply and under which conditions it would no longer hold.'],
  actionPlan: ['The plan needs to be more specific: what you will do, when, and how you will know you have done it.', 'The action should have a deadline and a small criterion you can check yourself.'],
};
const questionsByWeekEn = [
  ['What in this experience made you stop and think?', 'If you told a friend about it, which detail would you emphasise?'],
  ['Why does this detail matter to you more than the others?', 'What does that detail show about how you see the situation?'],
  ['When did that feeling appear, and what made it stronger?', 'If that feeling were a signal, what would it be telling you?'],
  ['Apart from the cause you named, what else might have contributed to the result?', 'Which part of the cause comes from how you acted?'],
  ['How would someone else involved describe this situation?', 'How does their perspective change your conclusion?'],
  ['Would this lesson still hold in a completely different situation?', 'How will you know you have really applied this lesson?'],
];
const reasonsEn = {
  reflectionDepth: ['The reflection mostly describes events without analysing thoughts and causes.', 'Feelings are identified, but the explanation stays at the level of personal reaction.', 'Causes and the writer’s own role in the situation are analysed.', 'Initial assumptions are questioned and several explanations are weighed.'],
  evidenceContext: ['General statements with too few details to understand the experience.', 'There is context, but the real details remain vague.', 'The situation, how it unfolded and the people involved are described concretely.', 'Details, figures and quotes are used as convincing evidence for the argument.'],
  insight: ['No lesson linked to the experience yet.', 'There is a lesson, but how it came from the experience is not explained.', 'The lesson is specific and its link to the experience is explained clearly.', 'The lesson is generalised into a principle, with conditions for applying it.'],
  actionPlan: ['No concrete action for the coming period.', 'There is an intention to improve, but the action, deadline or way of evaluating it is unclear.', 'The action is specific, feasible and has a time to carry it out.', 'The plan has a goal, measurable criteria and a clear deadline linked to the lesson.'],
};
const improvementsEn = {
  reflectionDepth: 'Try adding a paragraph answering “why did I react like that?” and one alternative explanation for the situation.',
  evidenceContext: 'Add one concrete detail (a quote, a figure, a moment) as evidence for your main claim.',
  insight: 'Explain in which other situations this lesson could be reused and what its limits are.',
  actionPlan: 'Add a deadline and a small criterion to check the result of your action.',
};
const openersEn = ['The reflection retells the situation, but most of it stays at the level of description.', 'You have described the situation and your feelings, which is a good start.', 'The reflection has a concrete situation and you have started to analyse the causes quite clearly.', 'You analyse the situation in depth and link it clearly to your own role.', 'An excellent reflection: you not only analyse but also question your own initial assumptions.'];
const nextHintsEn = {
  reflectionDepth: 'Next time, try asking yourself “why do I think this?” to dig deeper into the causes.',
  evidenceContext: 'Add concrete details (time, quotes, figures) so the reader can see the situation clearly.',
  insight: 'Explain in which other situations this lesson could apply and what its limits are.',
  actionPlan: 'The action plan needs to be more specific: what you will do, when, and how you will know you have done it.',
};
const successCriteriaEn = ['Do it at least twice and record the result each time.', 'Keep notes comparing before and after the change.', 'Finish before the deadline and get at least one response from the people involved.', 'Keep it up for two weeks without missing more than once.', 'Have concrete figures to compare with last week.'];
const outcomesEn = ['Done twice. The first time was still awkward, the second went much more smoothly and I could see the difference.', 'Completed 5 of 6 sessions. I missed one because of an exam; I noted it to adjust next week.', 'The group responded positively and suggested keeping this approach for the next sessions.', 'Better than expected: the time dropped by almost half compared with last week.', 'Tried it and kept full notes; I realised I need to start a day earlier to leave time for adjustments.'];
const barriersEn = ['My part-time schedule changed this week so I could not follow the plan. I will move it to lunchtime.', 'The group has not agreed on a common time yet; we need to switch to discussing by message first.', 'I set a goal that was too ambitious for the time I actually have; I will split it into two steps.'];
const inProgressEn = 'Started; following the results.';
const returnIntroEn = prompt => `The reflection is still short and does not yet fully answer this week’s question (“${prompt}”). Please add the following before resubmitting:`;
const strengths = {
  reflectionDepth: ['Bạn đã đi xa hơn việc kể lại sự kiện và bắt đầu lý giải vì sao mình phản ứng như vậy.', 'Phần phân tích cho thấy bạn sẵn sàng xem lại cách nghĩ ban đầu của mình.', 'Bạn nhận diện được cảm xúc và nối nó với nguyên nhân cụ thể trong tình huống.'],
  evidenceContext: ['Tình huống được mô tả cụ thể, có thời gian, con người và chi tiết giúp người đọc hình dung rõ.', 'Bạn dùng chi tiết thực tế (lời nói, số liệu) làm căn cứ cho nhận định của mình.', 'Bối cảnh được trình bày rõ ràng nên lập luận phía sau có chỗ dựa.'],
  insight: ['Bài học được rút ra trực tiếp từ trải nghiệm chứ không phải một câu khẩu hiệu chung.', 'Bạn diễn đạt bài học thành một nguyên tắc có thể dùng lại ở tình huống khác.', 'Bạn giải thích được vì sao bài học này quan trọng với chính mình.'],
  actionPlan: ['Kế hoạch có hành động cụ thể, thời hạn và cách kiểm tra kết quả.', 'Hành động đề xuất gắn trực tiếp với bài học vừa rút ra.', 'Bạn chia kế hoạch thành bước nhỏ có thể bắt đầu ngay trong tuần tới.'],
};
const development = {
  reflectionDepth: ['Phần phân tích còn dừng ở cảm xúc bề mặt; hãy hỏi thêm “vì sao mình nghĩ như vậy” ít nhất một lần nữa.', 'Bạn có thể xem xét một cách giải thích khác cho tình huống trước khi đi đến kết luận.'],
  evidenceContext: ['Tình huống còn chung chung; bổ sung một chi tiết cụ thể như lời nói, con số hoặc thời điểm sẽ giúp lập luận thuyết phục hơn.', 'Hãy mô tả rõ hơn vai trò của những người liên quan để người đọc hiểu bối cảnh.'],
  insight: ['Bài học còn khá chung; hãy giải thích nó hình thành từ chi tiết nào trong trải nghiệm.', 'Thử nêu bài học có thể áp dụng ở đâu khác và trong điều kiện nào thì không còn đúng.'],
  actionPlan: ['Kế hoạch cần cụ thể hơn: làm gì, khi nào và bạn sẽ biết mình đã làm được bằng cách nào.', 'Hành động nên có mốc thời gian và một tiêu chí nhỏ để tự kiểm tra.'],
};
const questionsByWeek = [
  ['Điều gì trong trải nghiệm này khiến bạn muốn dừng lại suy nghĩ?', 'Nếu kể lại cho một người bạn, bạn sẽ nhấn mạnh chi tiết nào?'],
  ['Vì sao chi tiết này lại có ý nghĩa với bạn hơn những chi tiết khác?', 'Chi tiết đó cho thấy điều gì về cách bạn nhìn tình huống?'],
  ['Cảm xúc đó xuất hiện từ lúc nào và điều gì làm nó mạnh lên?', 'Nếu cảm xúc đó là một tín hiệu, nó đang nói với bạn điều gì?'],
  ['Ngoài nguyên nhân bạn đã nêu, còn yếu tố nào có thể góp phần vào kết quả?', 'Phần nào của nguyên nhân thuộc về cách bạn đã làm?'],
  ['Người trong cuộc khác sẽ kể lại tình huống này như thế nào?', 'Góc nhìn của họ thay đổi điều gì trong kết luận của bạn?'],
  ['Bài học này có còn đúng ở một tình huống hoàn toàn khác không?', 'Bạn sẽ biết mình đã thật sự áp dụng bài học này bằng cách nào?'],
];
const reasons = {
  reflectionDepth: ['Bài viết chủ yếu mô tả sự việc, chưa phân tích suy nghĩ và nguyên nhân.', 'Đã nhận diện cảm xúc nhưng phần giải thích còn ở mức phản ứng cá nhân.', 'Phân tích được nguyên nhân và vai trò của bản thân trong tình huống.', 'Chất vấn được giả định ban đầu và cân nhắc nhiều cách giải thích.'],
  evidenceContext: ['Trình bày chung chung, thiếu chi tiết để hiểu trải nghiệm.', 'Có bối cảnh nhưng chi tiết thực tế còn mơ hồ.', 'Tình huống, diễn biến và người liên quan được mô tả cụ thể.', 'Chi tiết, số liệu và lời nói được dùng làm căn cứ thuyết phục cho lập luận.'],
  insight: ['Chưa rút ra bài học gắn với trải nghiệm.', 'Có bài học nhưng chưa giải thích nó hình thành từ trải nghiệm như thế nào.', 'Bài học cụ thể và được giải thích rõ mối liên hệ với trải nghiệm.', 'Bài học được khái quát thành nguyên tắc, có nêu điều kiện áp dụng.'],
  actionPlan: ['Chưa có hành động cụ thể cho thời gian tới.', 'Có ý định cải thiện nhưng chưa rõ hành động, thời hạn hoặc cách đánh giá.', 'Hành động cụ thể, khả thi và có thời điểm thực hiện.', 'Kế hoạch có mục tiêu, tiêu chí đo lường và thời hạn rõ ràng, gắn với bài học.'],
};
const improvements = {
  reflectionDepth: 'Thử viết thêm một đoạn trả lời câu hỏi “vì sao mình phản ứng như vậy” và một cách giải thích khác cho tình huống.',
  evidenceContext: 'Bổ sung một chi tiết cụ thể (lời nói, con số, thời điểm) làm căn cứ cho nhận định chính.',
  insight: 'Giải thích bài học này có thể dùng lại ở tình huống nào khác và giới hạn của nó.',
  actionPlan: 'Thêm thời hạn và một tiêu chí nhỏ để tự kiểm tra kết quả hành động.',
};
const openers = [
  [4, 'Bài viết đã kể lại được tình huống nhưng phần lớn vẫn dừng ở mô tả.'],
  [5.5, 'Em đã nêu được tình huống và cảm xúc của mình, đây là bước khởi đầu tốt.'],
  [7, 'Bài viết có tình huống cụ thể và em đã bắt đầu phân tích nguyên nhân khá rõ.'],
  [8, 'Em phân tích tình huống sâu và liên hệ rõ với vai trò của bản thân.'],
  [11, 'Bài viết rất tốt: em không chỉ phân tích mà còn tự chất vấn giả định ban đầu của mình.'],
];
const nextHints = {
  reflectionDepth: 'Lần tới, em thử hỏi thêm “vì sao mình nghĩ như vậy” để đi sâu hơn vào nguyên nhân.',
  evidenceContext: 'Em nên bổ sung chi tiết cụ thể (thời gian, lời nói, số liệu) để người đọc thấy rõ tình huống.',
  insight: 'Hãy giải thích bài học này có thể áp dụng ở tình huống nào khác và giới hạn của nó.',
  actionPlan: 'Kế hoạch hành động cần cụ thể hơn: làm gì, khi nào và em sẽ biết mình làm được bằng cách nào.',
};
const successCriteria = ['Thực hiện ít nhất hai lần và ghi lại kết quả sau mỗi lần.', 'Có ghi chép so sánh trước và sau khi thay đổi.', 'Hoàn thành trước hạn và nhận được ít nhất một phản hồi từ người liên quan.', 'Duy trì liên tục trong hai tuần, không bỏ quá một lần.', 'Có số liệu cụ thể để so sánh với tuần trước.'];
const outcomes = ['Đã làm đủ hai lần. Lần đầu còn lúng túng, lần thứ hai trôi chảy hơn và mình thấy rõ sự khác biệt.', 'Thực hiện được 5/6 buổi. Buổi bỏ lỡ là do trùng lịch thi; mình ghi lại để điều chỉnh tuần sau.', 'Nhóm phản hồi tích cực và đề nghị giữ cách làm này cho các buổi tiếp theo.', 'Kết quả tốt hơn dự kiến: thời gian giảm gần một nửa so với tuần trước.', 'Đã thử và ghi chép đầy đủ; mình nhận ra cần bắt đầu sớm hơn một ngày để có thời gian điều chỉnh.'];
const barriers = ['Tuần này lịch làm thêm thay đổi nên mình chưa làm được như kế hoạch. Mình sẽ dời sang khung giờ buổi trưa.', 'Nhóm chưa thống nhất được thời gian chung, cần đổi cách làm sang trao đổi qua tin nhắn trước.', 'Mình đặt mục tiêu quá cao so với thời gian thực tế; sẽ chia nhỏ lại thành hai bước.'];

export function createShowcaseData(passwordHash, referenceDate = new Date()) {
  const base = new Date(referenceDate); base.setUTCHours(1, 0, 0, 0); // 08:00 in Vietnam
  const at = (days, minutes = 0) => new Date(base.getTime() + days * 86400000 + minutes * 60000).toISOString();
  const day = days => at(days).slice(0, 10);
  const rubricJson = JSON.stringify(defaultRubric), rubricKey = rubricVersion(defaultRubric);
  const tables = { settings: [], users: [], credentials: [], user_profiles: [], courses: [], memberships: [], invitations: [], reflections: [], versions: [], analyses: [], reviews: [], actions: [], attachments: [], learning_records: [], chat_conversations: [], chat_messages: [], audit: [] };
  const files = [];
  const semesterStart = -60;
  // Vietnamese → English for every seeded text, so switching to English shows the same records in English.
  const translations = new Map();
  const translate = (vi, en) => { if (vi && en && vi !== en) translations.set(vi, en); };
  const sentences = text => text.trim() ? text.trim().split(/(?<=[.!?])\s+/) : [];
  const pairContent = (e, en) => {
    if (!en) throw new Error(`Thiếu bản tiếng Anh cho ${e.s} tuần ${e.w}`);
    translate(e.t, en.t);
    for (const [vk, ek] of [['what', 'what'], ['so', 'so'], ['now', 'now'], ['act', 'act']]) {
      translate(e[vk], en[ek]);
      const a = sentences(e[vk] || ''), b = sentences(en[ek] || '');
      if (a.length === b.length) a.forEach((t, i) => translate(t, b[i]));
    }
  };
  const translateWeekPrompt = week => ({ 1: 'What has a recent experience made you think about?', 2: 'Which detail in this experience matters most to you?', 3: 'How did you feel, and why?', 4: 'What really led to that outcome?', 5: 'How might someone else see this situation?', 6: 'What new understanding did you gain from the experience?' })[week];
  tables.settings.push({ key: 'rubric', value: rubricJson }, { key: 'weeks', value: JSON.stringify(defaultWeeks) }, { key: 'owner', value: uid('admin') });
  const record = (id, kind, owner, payload, extra = {}, created = at(semesterStart)) => tables.learning_records.push({ id, kind, owner_id: owner, reflection_id: extra.reflection || null, course_id: extra.course || null, version_id: extra.version || null, payload_json: JSON.stringify(payload), revision: 1, created_at: created, updated_at: created });

  for (const [key, email, name, role = 'student', , active = 1] of people) {
    tables.users.push({ id: uid(key), email, name, role, active, created_at: at(semesterStart - (role === 'student' ? 0 : 20), hash(key) % 600) });
    tables.credentials.push({ user_id: uid(key), password_hash: passwordHash, created_at: at(semesterStart) });
  }
  for (const [key, phone, bio] of [
    ['thu-ha', '0912 345 678', 'Giảng viên Khoa Kỹ năng và Phát triển cá nhân. Giờ tiếp sinh viên: sáng thứ Năm, phòng 305 nhà A2.'],
    ['minh-duc', '0987 654 321', 'Giảng viên bộ môn Thiết kế trải nghiệm. Liên hệ qua tin nhắn trên THINK UP trước 21 giờ.'],
    ['hai-yen', '0903 222 118', 'Phụ trách các học phần học tập phục vụ cộng đồng và hoạt động tình nguyện của khoa.'],
    ['admin', '024 3754 0000', 'Phòng Đào tạo – hỗ trợ tài khoản và phân công học phần.'],
    ['minh-anh', '0936 118 205', 'Sinh viên năm nhất ngành Quản trị kinh doanh. Thích đọc sách và chạy bộ buổi sáng.'],
    ['thao-vy', '', 'Năm nhất, thành viên CLB Nghiên cứu khoa học.'],
  ]) tables.user_profiles.push({ user_id: uid(key), phone, bio, avatar_key: null, avatar_type: null, revision: 1, updated_at: at(semesterStart + 3) });

  const lecturerOf = {}, honorific = Object.fromEntries(people.filter(p => p[3] === 'lecturer').map(p => [p[0], p[4]]));
  const weekDue = (course, w) => semesterStart + 22 + w * 7 + course.shift; // week 6 is due in a few days
  for (const course of courses) {
    const id = cid(course.key);
    lecturerOf[course.key] = course.lecturer;
    const weeks = defaultWeeks.map(w => ({ ...w, due: day(weekDue(course, w.week)), requirements }));
    tables.courses.push({ id, name: course.name, code: course.code, weeks_json: JSON.stringify(weeks), rubric_json: rubricJson, created_at: at(semesterStart - 10) });
    tables.memberships.push({ id: `${id}-${course.lecturer}`, course_id: id, user_id: uid(course.lecturer), role: 'lecturer' });
    for (const s of course.students) tables.memberships.push({ id: `${id}-${s}`, course_id: id, user_id: uid(s), role: 'student' });
    record(`metadata:${id}`, 'course-metadata', uid('admin'), { className: course.className }, { course: id }, at(semesterStart - 10));
    record(`history:${id}:1`, 'course-history', uid('admin'), { name: course.name, code: course.code, className: course.className, weeks, rubric: defaultRubric, rubricVersion: rubricKey, effectiveAt: at(semesterStart - 10) }, { course: id }, at(semesterStart - 10));
    tables.audit.push({ id: `audit-course-${course.key}`, user_id: uid('admin'), action: 'course-save', target_id: id, detail: JSON.stringify({ code: course.code }), created_at: at(semesterStart - 10) });
  }

  const built = [];
  for (const course of courses) for (const e of course.entries) {
    const courseId = cid(course.key), lecturer = course.lecturer, id = `r-${e.s}-${course.key}-w${e.w}`;
    const content = { what: e.what, soWhat: e.so, nowWhat: e.now, action: e.act };
    const draft = { what: e.what, soWhat: e.so ? firstSentence(e.so) : '', nowWhat: '', action: '' };
    const middle = { what: e.what, soWhat: e.so, nowWhat: e.now ? firstSentence(e.now) : '', action: 'Tôi sẽ chú ý hơn trong lần sau.' };
    pairContent(e, course.english[`${e.s}:${e.w}`]);
    const due = weekDue(course, e.w), seed = id;
    const submittedDay = e.st === 'submitted' ? -(1 + hash(seed) % 5) : due - 1 - hash(seed) % 2;
    // Minutes from the seeding morning: early afternoon three days before submitting; drafts were last touched yesterday.
    const t0 = e.st === 'draft' ? Math.min((submittedDay - 3) * 1440, -1440) + 600 + hash(seed) % 300 : (submittedDay - 3) * 1440 + 13 * 60 + hash(seed) % 300;
    const stamp = minutes => new Date(base.getTime() + minutes * 60000).toISOString();
    const stages = e.st === 'draft' ? [['Draft', content, 0]]
      : e.st === 'returned' ? [['Draft', content, 0], ['AI Feedback', content, 1500], ['Submitted', content, 3 * 1440], ['Lecturer Review', content, 5 * 1440 + 120]]
      : e.st === 'final*' ? [['Draft', draft, 0], ['AI Coach', draft, 40], ['Revision 1', middle, 1440], ['AI Feedback', middle, 1500], ['Submitted', middle, 3 * 1440], ['Lecturer Review', middle, 5 * 1440 + 120], ['Revision 2', content, 6 * 1440], ['Submitted', content, 6 * 1440 + 30], ['Final', content, 8 * 1440 + 90]]
      : [['Draft', draft, 0], ['AI Coach', draft, 40], ['Revision 1', content, 1440], ['AI Feedback', content, 1500], ['Submitted', content, 3 * 1440], ...(e.st === 'final' ? [['Final', content, 5 * 1440 + 120]] : [])];
    const versions = stages.map(([stage, value, offset], i) => ({ id: `${id}-v${i + 1}`, reflection_id: id, content_json: JSON.stringify(value), title: e.t, stage, created_at: stamp(t0 + offset) }));
    const latest = versions.at(-1), status = e.st === 'final*' ? 'final' : e.st;
    tables.reflections.push({ id, user_id: uid(e.s), course_id: courseId, title: e.t, week: e.w, content_json: latest.content_json, status, rev: versions.length, latest_version: latest.id, created_at: versions[0].created_at, updated_at: latest.created_at });
    tables.versions.push(...versions);
    tables.audit.push({ id: `audit-${id}`, user_id: uid(e.s), action: status === 'draft' ? 'Draft' : 'Submitted', target_id: id, detail: '{}', created_at: latest.created_at });
    built.push({ e, id, course, courseId, lecturer, content, versions, latest, status, submittedDay });
    if (!e.sc) continue;

    // AI proposals: an AI Coach reading of the first draft, and AI Feedback on the version that was submitted.
    const evidenceFor = (value, section, fallback = 'what') => firstSentence(value[section] || value[fallback]);
    const sectionOf = { reflectionDepth: 'soWhat', evidenceContext: 'what', insight: 'nowWhat', actionPlan: 'action' };
    const proposal = (value, scores, kind) => {
      const ordered = criterionKeys.map((key, i) => [key, scores[i]]).sort((a, b) => b[1] - a[1]);
      const raw = {
        strengths: [pick(strengths[ordered[0][0]], seed + kind + 's1'), pick(strengths[ordered[1][0]], seed + kind + 's2')],
        development: [pick(development[ordered[3][0]], seed + kind + 'd1'), ...(ordered[2][1] < 6 ? [pick(development[ordered[2][0]], seed + kind + 'd2')] : [])],
        questions: questionsByWeek[Math.min(5, e.w - 1)],
        suggestedActions: value.action ? [value.action] : [],
        context: kind === 'coach' ? 'Gợi ý trên bản nháp đầu tiên.' : 'Đánh giá theo rubric bốn tiêu chí của học phần.',
        level: Math.max(1, Math.min(4, kind === 'coach' ? e.k - (e.k > 1 ? 1 : 0) : e.k)),
        levelReason: reasons.reflectionDepth[criterionLevel(scores[0]) - 1],
        levelEvidence: evidenceFor(value, 'soWhat'),
        criteria: criterionKeys.map((key, i) => ({ key, score: scores[i], level: criterionLevel(scores[i]), behavior: defaultRubric[i].descriptions[criterionLevel(scores[i]) - 1], evidence: evidenceFor(value, sectionOf[key]), attachmentNames: [], improvement: improvements[key] })),
      };
      const result = normalizeFeedback(raw, value, defaultRubric, [], 'vi');
      result.levelMethod = 'demo-classification';
      return result;
    };
    const coachVersion = versions.find(v => v.stage === 'AI Coach'), feedbackVersion = versions.find(v => v.stage === 'AI Feedback');
    if (coachVersion) {
      const draftScores = e.sc.map((s, i) => round(Math.max(0.5, s - (i >= 2 ? 2.4 : 1.2))));
      tables.analyses.push({ id: `${id}-coach`, reflection_id: id, version_id: coachVersion.id, kind: 'coach', provider: 'Demo fixture', result_json: JSON.stringify(proposal(JSON.parse(coachVersion.content_json), draftScores, 'coach')), rubric_json: rubricJson, created_at: coachVersion.created_at });
    }
    const feedbackValue = JSON.parse(feedbackVersion.content_json);
    const feedbackScores = e.st === 'final*' ? e.sc.map((s, i) => round(s - (i >= 2 ? 1.2 : 0.4))) : e.sc;
    tables.analyses.push({ id: `${id}-feedback`, reflection_id: id, version_id: feedbackVersion.id, kind: 'feedback', provider: 'Demo fixture', result_json: JSON.stringify(proposal(feedbackValue, feedbackScores, 'feedback')), rubric_json: rubricJson, created_at: feedbackVersion.created_at });

    // Lecturer decisions, stored apart from the AI proposals.
    const word = honorific[lecturer];
    const returnComment = value => {
      const weakest = criterionKeys.map((key, i) => [key, e.sc[i]]).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([key]) => key);
      const vi = `Bài viết còn ngắn và chưa trả lời đủ câu hỏi của tuần (“${defaultWeeks[e.w - 1].prompt}”). ${word} mong em bổ sung trước khi nộp lại:\n1. ${nextHints[weakest[0]]}\n2. ${nextHints[weakest[1]]}${value.action ? '' : '\n3. Viết phần Hành động với một việc cụ thể em sẽ làm trong tuần tới.'}`;
      translate(vi, `${returnIntroEn(translateWeekPrompt(e.w))}\n1. ${nextHintsEn[weakest[0]]}\n2. ${nextHintsEn[weakest[1]]}${value.action ? '' : '\n3. Write the Action section with one concrete thing you will do next week.'}`);
      return vi;
    };
    if (e.st === 'returned' || e.st === 'final*') {
      const review = versions.find(v => v.stage === 'Lecturer Review'), reviewId = `${id}-return`;
      tables.reviews.push({ id: reviewId, reflection_id: id, version_id: review.id, reviewer_id: uid(lecturer), comment: returnComment(JSON.parse(review.content_json)), scores_json: '[]', total: null, level: null, decision: 'returned', rubric_json: rubricJson, created_at: review.created_at });
      record(`review:${reviewId}`, 'review-detail', uid(lecturer), { criteria: [], rubricVersion: rubricKey }, { reflection: id, course: courseId, version: review.id }, review.created_at);
    }
    if (status === 'final') {
      const scores = e.sc.map((s, i) => { const nudged = round(s + ((hash(seed + i) % 7) - 4) / 10); return Math.min(10, Math.max(0, nudged)); });
      const criteria = validateAssessment(criterionKeys.map((key, i) => ({ key, score: scores[i], level: criterionLevel(scores[i]), evidence: evidenceFor(content, sectionOf[key]), reason: reasons[key][criterionLevel(scores[i]) - 1], improvement: improvements[key], attachmentNames: [], missingReason: '' })), content, defaultRubric, []);
      const total = totalScore(scores, defaultRubric), weakest = criterionKeys[scores.indexOf(Math.min(...scores))];
      const band = openers.findIndex(([limit]) => total < limit), opener = openers[band][1];
      const comment = `${opener} ${word} đánh giá cao nhận định “${firstSentence(e.now).replace(/[.!?]$/, '')}”. ${nextHints[weakest]}`;
      translate(comment, `${openersEn[band]} I particularly value your insight “${firstSentence(course.english[`${e.s}:${e.w}`].now).replace(/[.!?]$/, '')}”. ${nextHintsEn[weakest]}`);
      const reviewId = `${id}-final`;
      tables.reviews.push({ id: reviewId, reflection_id: id, version_id: latest.id, reviewer_id: uid(lecturer), comment, scores_json: JSON.stringify(scores), total, level: e.k, decision: 'final', rubric_json: rubricJson, created_at: latest.created_at });
      record(`review:${reviewId}`, 'review-detail', uid(lecturer), { criteria, scoreScale: 10, rubricVersion: rubricKey, sourceVersion: versions.at(-2).id }, { reflection: id, course: courseId, version: latest.id }, latest.created_at);
      tables.audit.push({ id: `audit-${reviewId}`, user_id: uid(lecturer), action: 'review', target_id: id, detail: JSON.stringify({ decision: 'final', total }), created_at: latest.created_at });
    }
  }

  // Action plans from submitted and accepted reflections, followed up by the next week's reflection.
  for (const b of built) {
    if (!['final', 'submitted'].includes(b.status) || b.e.act.length < 60) continue;
    const actionId = `a-${b.id}`, due = b.submittedDay + 7 + hash(b.id) % 4, past = due < 0;
    // Stronger writers mostly follow through; weaker ones are the ones who need to adjust their plans.
    const scored = built.filter(x => x.e.s === b.e.s && x.e.sc), ability = scored.reduce((sum, x) => sum + x.e.sc.reduce((m, v) => m + v, 0) / 4, 0) / scored.length;
    const roll = hash(b.id + 'status') % 10;
    const status = !past ? (roll < 5 ? 'todo' : 'in_progress') : ability >= 6.5 ? 'done' : roll < 6 ? 'done' : roll < 8 ? 'needs_adjustment' : 'in_progress';
    const review = status === 'done' ? pick(outcomes, b.id) : status === 'needs_adjustment' ? pick(barriers, b.id) : status === 'in_progress' ? 'Đã bắt đầu thực hiện, đang theo dõi kết quả.' : '';
    const next = built.find(x => x.e.s === b.e.s && x.course === b.course && x.e.w === b.e.w + 1 && x.status !== 'draft');
    tables.actions.push({ id: actionId, user_id: uid(b.e.s), reflection_id: b.id, text: b.e.act, due: day(due), status, review, created_at: b.latest.created_at });
    record(`action:${actionId}`, 'action', uid(b.e.s), { successCriteria: pick(successCriteria, b.id), evidence: status === 'done' ? review : '', attachmentIds: [], followUpReflectionId: status === 'done' && next ? next.id : null }, { reflection: b.id, course: b.courseId, version: b.latest.id }, b.latest.created_at);
  }

  // Self-assessments written by students before submitting.
  for (const [s, course, w, delta] of [['minh-anh', 'knm1101', 4, 0.4], ['minh-anh', 'knm1101', 5, 0.3], ['thao-vy', 'knm1101', 5, -0.2], ['anh-thu', 'knm1203', 4, 0.2], ['minh-anh', 'tks2105', 4, 0.5]]) {
    const b = built.find(x => x.e.s === s && x.course.key === course && x.e.w === w);
    const scores = b.e.sc.map(x => Math.min(10, round(x + delta)));
    const section = { reflectionDepth: 'soWhat', evidenceContext: 'what', insight: 'nowWhat', actionPlan: 'action' };
    const criteria = validateAssessment(criterionKeys.map((key, i) => ({ key, score: scores[i], level: criterionLevel(scores[i]), evidence: firstSentence(b.content[section[key]]), reason: 'Mình tự đánh giá dựa trên mô tả mức độ trong rubric.', improvement: improvements[key], attachmentNames: [], missingReason: '' })), b.content, defaultRubric, []);
    const submitted = b.versions.find(v => v.stage === 'Submitted');
    record(`self:${b.id}`, 'self-assessment', uid(s), { criteria, total: totalScore(scores, defaultRubric), scoreScale: 10, rubric: defaultRubric, rubricVersion: rubricKey }, { reflection: b.id, course: b.courseId, version: submitted.id }, submitted.created_at);
  }

  // Evidence files attached by students.
  for (const [rid, name, text] of [
    ['r-thao-vy-knm1101-w4', 'phieu-khao-sat-ban-1.txt', 'PHIẾU KHẢO SÁT THÓI QUEN TỰ HỌC – BẢN 1\nSố câu hỏi: 28 · Thời gian làm trung bình (5 bạn thử): 12 phút\nCâu 1: Mã số sinh viên\nTỉ lệ hoàn thành sau 7 ngày: 37/100 phiếu\nGhi chú: 9 người dừng ở câu 1.'],
    ['r-minh-anh-tks2105-w4', 'ghi-chep-thu-ban-mau-giay.txt', 'THỬ BẢN MẪU GIẤY – 5 người tham gia\nNgười 1: hỏi "xanh là còn chỗ hay phòng mở?"\nNgười 2: không thấy giờ cập nhật\nNgười 3: hiểu đúng\nNgười 4: hỏi lại ý nghĩa màu xanh\nNgười 5: hỏi lại ý nghĩa màu xanh, không thấy giờ cập nhật\nHiểu đúng ngay lần đầu: 1/5'],
    ['r-anh-thu-cds2302-w1', 'so-muon-sach-tuan-1-3.txt', 'SỔ MƯỢN SÁCH GÓC ĐỌC – TUẦN 1–3\nTổng số sách: 60\nSố cuốn được mượn ít nhất 1 lần: 12\nTrong đó truyện tranh: 9 · Sách khoa học: 2 · Sách kỹ năng: 1\nSố lượt mượn: 27'],
  ]) {
    const r = tables.reflections.find(x => x.id === rid), id = `f-${rid}`, key = `${r.user_id}/${rid}/${id}`;
    files.push({ key, text });
    tables.attachments.push({ id, reflection_id: rid, name, type: 'text/plain', size: new TextEncoder().encode(text).length, object_key: key, created_at: r.created_at });
  }

  // Feedback templates the lecturer reuses.
  for (const [i, course, criterionKey, title, text] of [
    [1, 'knm1101', 'all', 'Bài tốt, gợi ý đi sâu hơn', 'Bài viết có tình huống cụ thể và em đã phân tích được nguyên nhân. Để tiến thêm một bước, em thử xem lại giả định ban đầu của mình: có cách giải thích nào khác cho tình huống này không?'],
    [2, 'knm1101', 'actionPlan', 'Kế hoạch chưa đo được', 'Kế hoạch của em đã có hướng đi đúng. Em bổ sung thời hạn cụ thể và một dấu hiệu để tự kiểm tra (ví dụ: số lần, số trang, phản hồi của ai) nhé.'],
    [3, 'knm1101', 'evidenceContext', 'Thiếu chi tiết minh chứng', 'Phần trải nghiệm còn chung chung. Em kể lại một khoảnh khắc cụ thể: ai nói gì, lúc nào, con số nào khiến em chú ý.'],
    [4, 'knm1203', 'all', 'Trả bài – cần bổ sung phân tích', 'Bài viết mới dừng ở mô tả. Em trả lời thêm câu hỏi của tuần và viết phần Hành động với một việc cụ thể trong tuần tới rồi nộp lại nhé.'],
  ]) record(`template:thu-ha:${i}`, 'feedback-template', uid('thu-ha'), { title, text, criterionKey }, { course: cid(course) }, at(semesterStart + 14 + i));

  // Conversations. Message ids are fixed so read markers can be set.
  let messageId = 0;
  const thread = (a, b, lines, readByLast = true) => {
    const [low, high] = [uid(a), uid(b)].sort(), convId = `chat-${a}-${b}`;
    let lowRead = 0, highRead = 0;
    for (const [from, days, minutes, body] of lines) {
      messageId += 1;
      const person = people.find(p => p[0] === from);
      tables.chat_messages.push({ id: messageId, conversation_id: convId, sender_id: uid(from), sender_name: person[2], sender_role: person[3] || 'student', client_id: `seed-${messageId}`, body, created_at: at(days, minutes) });
      if (uid(from) === low) lowRead = messageId; else highRead = messageId;
    }
    const last = lines.at(-1), lastFromLow = uid(last[0]) === low;
    if (readByLast) { lowRead = messageId; highRead = messageId; } else if (lastFromLow) highRead = messageId - 1; else lowRead = messageId - 1;
    tables.chat_conversations.push({ id: convId, low_user_id: low, high_user_id: high, last_message_id: messageId, low_read_id: lowRead, high_read_id: highRead, created_at: at(lines[0][1], lines[0][2]), updated_at: at(last[1], last[2]) });
  };
  thread('thu-ha', 'minh-anh', [
    ['minh-anh', -9, 600, 'Em chào cô ạ. Em muốn hỏi bài reflection tuần 4 môn Giao tiếp, phần phân tích của em đã đủ sâu chưa ạ?'],
    ['thu-ha', -9, 700, 'Chào Minh Anh. Phần em phân tích về cách nhóm góp ý trong buổi tập dượt khá tốt. Cô đã ghi nhận xét chi tiết trong bài, em xem nhé.'],
    ['minh-anh', -9, 720, 'Dạ em cảm ơn cô ạ!'],
    ['thu-ha', -1, 540, 'Minh Anh ơi, cô đã trả lại bài tuần 5 môn Giao tiếp. Em bổ sung phần phân tích góc nhìn của Hà rồi nộp lại trước thứ Sáu nhé.'],
  ], false);
  thread('thu-ha', 'gia-bao', [
    ['gia-bao', -20, 1260, 'Cô ơi, bài tuần 3 của em bị trả lại, em nên sửa phần nào trước ạ?'],
    ['thu-ha', -19, 480, 'Chào Bảo. Em bắt đầu từ phần Phân tích: thử hỏi lại các bạn trong nhóm xem vì sao bài bị điểm thấp, đừng vội kết luận lỗi do người khác nhé.'],
    ['gia-bao', -19, 500, 'Dạ vâng ạ, em sẽ hỏi lại trưởng nhóm.'],
  ]);
  thread('minh-duc', 'minh-anh', [
    ['minh-duc', -12, 900, 'Minh Anh, phát hiện về tấm ảnh chụp lịch phòng trong bài tuần 2 rất đáng giá. Em chia sẻ với cả lớp ở buổi tới được không?'],
    ['minh-anh', -12, 960, 'Dạ được ạ thầy. Em sẽ chuẩn bị 3 phút trình bày ạ.'],
  ]);
  thread('admin', 'thu-ha', [
    ['thu-ha', -30, 600, 'Anh Huy ơi, lớp KNM1203 có bạn Chu Nhật Minh đã làm thủ tục bảo lưu, anh khóa tài khoản giúp em nhé.'],
    ['admin', -30, 660, 'Chào chị Hà, em đã chuyển tài khoản bạn Nhật Minh sang trạng thái tạm ngừng. Bài viết cũ của bạn vẫn được giữ lại.'],
    ['thu-ha', -30, 680, 'Cảm ơn anh!'],
  ]);
  thread('hai-yen', 'anh-thu', [
    ['anh-thu', -6, 1200, 'Cô ơi, nhóm em muốn mời phụ huynh dự một buổi đọc sách, cô thấy có ổn không ạ?'],
    ['hai-yen', -5, 480, 'Ý tưởng rất tốt Thư ạ. Em nhớ báo trước với chú phụ trách nhà văn hóa và chuẩn bị số liệu mượn sách để chia sẻ nhé.'],
  ]);

  tables.invitations.push(
    { id: 'inv-thanh-tung', email: 'tung.nguyenthanh@thinkup.test', name: 'Nguyễn Thanh Tùng', role: 'student', course_id: cid('knm1203') },
    { id: 'inv-thu-hang', email: 'hang.phamthu@thinkup.test', name: 'ThS. Phạm Thu Hằng', role: 'lecturer', course_id: cid('cds2302') },
  );
  tables.audit.push({ id: 'audit-suspend-nhat-minh', user_id: uid('admin'), action: 'user-save', target_id: uid('nhat-minh'), detail: JSON.stringify({ active: 0 }), created_at: at(-30, 660) });
  // Pools and fixed phrases used above.
  for (const [vi, en] of [[requirements, requirementsEn], ['Tôi sẽ chú ý hơn trong lần sau.', draftActionEn], ['Gợi ý trên bản nháp đầu tiên.', 'Suggestions on the first draft.'], ['Đánh giá theo rubric bốn tiêu chí của học phần.', 'Assessed against the course’s four-criterion rubric.'], ['Đã bắt đầu thực hiện, đang theo dõi kết quả.', inProgressEn], ['Mình tự đánh giá dựa trên mô tả mức độ trong rubric.', 'I assessed myself using the level descriptions in the rubric.'], ...successCriteria.map((t, i) => [t, successCriteriaEn[i]]), ...outcomes.map((t, i) => [t, outcomesEn[i]]), ...barriers.map((t, i) => [t, barriersEn[i]]), ...questionsByWeek.flatMap((q, i) => q.map((t, j) => [t, questionsByWeekEn[i][j]]))]) translate(vi, en);
  for (const key of criterionKeys) {
    strengths[key].forEach((t, i) => translate(t, strengthsEn[key][i])); development[key].forEach((t, i) => translate(t, developmentEn[key][i]));
    reasons[key].forEach((t, i) => translate(t, reasonsEn[key][i])); translate(improvements[key], improvementsEn[key]); translate(nextHints[key], nextHintsEn[key]);
  }
  for (const course of courses) translate(course.name, course.nameEn);
  return { tables, files, translations: Object.fromEntries([...translations].sort(([a], [b]) => a.localeCompare(b, 'vi'))) };
}
