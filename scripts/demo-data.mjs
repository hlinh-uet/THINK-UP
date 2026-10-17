import { defaultRubric, defaultWeeks, sectionKeys, criterionKeys, totalScore } from '../lib/domain.ts';

export const demoMarker = 'demo-seed-v1';
export const demoPassword = 'ThinkUpDemo2026!';
export const demoUsers = [
  { id: 'demo-admin', email: 'admin@thinkup.local', name: 'Quản trị Demo', role: 'admin', active: 1 },
  { id: 'demo-lecturer', email: 'lecturer@thinkup.local', name: 'TS. Nguyễn Thu Hà', role: 'lecturer', active: 1 },
  { id: 'demo-lecturer-2', email: 'lecturer2@thinkup.local', name: 'ThS. Trần Minh Đức', role: 'lecturer', active: 1 },
  { id: 'demo-student', email: 'student@thinkup.local', name: 'Nguyễn Minh Anh', role: 'student', active: 1 },
  { id: 'demo-student-2', email: 'student2@thinkup.local', name: 'Trần Gia Bảo', role: 'student', active: 1 },
  { id: 'demo-student-3', email: 'student3@thinkup.local', name: 'Lê Thảo Vy', role: 'student', active: 1 },
  { id: 'demo-student-4', email: 'student4@thinkup.local', name: 'Phạm Hoàng Nam', role: 'student', active: 1 },
  { id: 'demo-inactive', email: 'inactive@thinkup.local', name: 'Tài khoản tạm ngừng Demo', role: 'student', active: 0 },
];

const experiences = [
  ['Lần đầu làm việc nhóm', 'Trong buổi học đầu tiên, nhóm tôi có bốn người cùng chuẩn bị bài thuyết trình. Tôi phụ trách tổng hợp nội dung nhưng gửi tài liệu sát giờ, khiến hai bạn không kịp góp ý.', 'Tôi lo lắng khi nhóm im lặng và nghĩ rằng các bạn thiếu quan tâm. Sau khi hỏi lại, tôi biết họ chưa có thời gian đọc tài liệu. Nguyên nhân một phần đến từ cách tôi trao đổi và phân công chưa rõ.', 'Tôi học được rằng sự im lặng không đồng nghĩa với thiếu trách nhiệm. Việc hỏi trước khi kết luận giúp tôi kiểm tra giả định và hiểu nhu cầu của từng thành viên.', 'Trước buổi học tiếp theo, tôi sẽ gửi bản nháp sớm hai ngày và hỏi mỗi thành viên một ý kiến. Tôi ghi lại số phản hồi để kiểm tra cách trao đổi mới có hiệu quả không.'],
  ['Lắng nghe phản hồi sau thuyết trình', 'Sau phần thuyết trình, giảng viên nhận xét rằng ví dụ của nhóm chưa gắn với nội dung lý thuyết. Tôi đã ghi ba góp ý vào sổ và trao đổi lại cùng nhóm ngay cuối buổi.', 'Ban đầu tôi thấy thất vọng vì đã dành nhiều thời gian chuẩn bị. Khi đối chiếu nhận xét với slide, tôi thấy mình ưu tiên hình thức hơn lập luận. Người nghe cần thấy mối liên hệ, không chỉ các hình ảnh đẹp.', 'Tôi nhận ra chất lượng bài trình bày không thể đo bằng thời gian chuẩn bị. Phản hồi là dữ liệu giúp điều chỉnh cách học và tôi cần chủ động tìm minh chứng cho từng luận điểm.', 'Trong bài tiếp theo, tôi sẽ kiểm tra từng slide bằng câu hỏi: ví dụ này chứng minh điều gì? Nhóm sẽ thử trình bày cho một bạn khác và ghi lại hai điểm còn khó hiểu trước ngày nộp.'],
  ['Nhận diện cảm xúc khi có bất đồng', 'Khi nhóm chọn hướng nghiên cứu, tôi muốn khảo sát sinh viên nhưng một bạn đề xuất phỏng vấn giảng viên. Tôi ngắt lời bạn hai lần và cuộc thảo luận kéo dài mà chưa có kết luận.', 'Tôi thấy khó chịu vì sợ phương án của mình bị bỏ qua. Cảm xúc đó gắn với nhu cầu được ghi nhận, chứ không chỉ với chất lượng phương án. Bạn còn lại lo rằng khảo sát sẽ thiếu chiều sâu, một mối lo có cơ sở.', 'Tôi từng mặc định bảo vệ ý kiến thật mạnh là đóng góp tốt cho nhóm. Trải nghiệm này khiến tôi xem lại giả định đó: lắng nghe và so sánh tiêu chí có thể tạo quyết định tốt hơn việc cố thắng tranh luận.', 'Ở cuộc họp tuần tới, tôi sẽ tóm tắt ý kiến của bạn trước khi phản hồi. Nhóm sẽ thống nhất ba tiêu chí chọn phương án và sau cuộc họp tôi nhờ một thành viên góp ý về cách tôi lắng nghe.'],
  ['Tìm nguyên nhân khi trễ kế hoạch', 'Nhóm dự kiến hoàn thành khảo sát vào thứ Sáu nhưng mới nhận được một nửa số câu trả lời. Tôi phụ trách theo dõi tiến độ và chỉ kiểm tra vào ngày cuối, nên không phát hiện sớm việc thiếu người tham gia.', 'Tôi cảm thấy áp lực và ban đầu đổ lỗi cho người được khảo sát. Khi nhìn lại lịch gửi lời mời, tôi thấy nhóm chưa dành thời gian nhắc lại và chưa chia rõ người phụ trách. Việc theo dõi muộn cũng là phần trách nhiệm của tôi.', 'Tôi hiểu rằng một kế hoạch cần có điểm kiểm tra giữa chặng, không chỉ hạn cuối. Điều này liên hệ với cách tôi tự học: nếu chỉ xem kết quả vào cuối tuần thì khó sửa sai kịp thời.', 'Tuần tới tôi sẽ tạo hai mốc kiểm tra vào thứ Ba và thứ Năm, ghi số câu trả lời và báo cho nhóm nếu thấp hơn mục tiêu. Sau một tuần, nhóm so sánh tiến độ để điều chỉnh cách nhắc người tham gia.'],
  ['Nhìn tình huống từ góc độ khác', 'Một thành viên thường vắng cuộc họp tối khiến phần việc của nhóm bị chậm. Tôi đã nhắn hỏi lý do thay vì tiếp tục phàn nàn trong nhóm. Bạn cho biết phải làm thêm vào khung giờ đó.', 'Tôi thấy ngại vì từng cho rằng bạn không coi trọng dự án. Từ góc nhìn của bạn, lịch họp do số đông chọn lại tạo ra rào cản. Tôi cần phân biệt việc chưa tham gia với việc không muốn tham gia.', 'Tôi học được rằng công bằng không nhất thiết là yêu cầu mọi người làm việc trong cùng một khung giờ. Tuy nhiên, tôi chưa biết cách cân bằng hoàn cảnh riêng với yêu cầu tiến độ chung của nhóm.', 'Tôi sẽ trao đổi thêm với nhóm về lịch họp và thử một khung giờ mới. Sau đó tôi muốn xem các thành viên có tham gia tốt hơn không.'],
  ['Điều tôi muốn thay đổi trong cách học', 'Tuần này tôi thử viết nhật ký sau mỗi buổi học. Tôi đã ghi lại hai tình huống liên quan đến việc đặt câu hỏi và chuẩn bị trước khi đến lớp.', 'Tôi thấy thoải mái hơn khi ghi suy nghĩ thành câu chữ. Tôi còn ngại hỏi giảng viên vì sợ câu hỏi quá đơn giản và chưa hiểu vì sao cảm giác đó xuất hiện.', 'Tôi muốn chủ động hơn trong việc học, nhưng còn cần xác định một thay đổi nhỏ có thể thực hiện ngay.', 'Tôi dự định chuẩn bị câu hỏi trước buổi học tới.'],
];

/** All dates are relative to the seeding day; rerunning preserves the original journey. */
export function createDemoData(passwordHash, referenceDate = new Date()) {
  const base = new Date(referenceDate);
  base.setUTCHours(0, 0, 0, 0);
  const stamp = (offset, minute = 0) => new Date(base.getTime() + offset * 86400000 + minute * 60000).toISOString();
  const date = offset => stamp(offset).slice(0, 10);
  const createdAt = stamp(-28);
  const rubricJson = JSON.stringify(defaultRubric);
  const tables = { settings: [], users: [], credentials: [], courses: [], memberships: [], reflections: [], versions: [], analyses: [], reviews: [], actions: [], invitations: [], attachments: [], audit: [] };
  const files = [];
  tables.settings.push({ key: 'rubric', value: rubricJson }, { key: 'weeks', value: JSON.stringify(defaultWeeks) });
  for (const user of demoUsers) {
    tables.users.push({ ...user, created_at: createdAt });
    tables.credentials.push({ user_id: user.id, password_hash: passwordHash, created_at: createdAt });
  }
  for (const [id, name, code] of [
    ['demo-course-reflection', 'DEMO · Kỹ năng học tập và phản tư', 'DEMO-REF101'],
    ['demo-course-project', 'DEMO · Dự án cộng đồng', 'DEMO-PRJ201'],
  ]) {
    tables.courses.push({ id, name, code, weeks_json: JSON.stringify(defaultWeeks.map(w => ({ ...w, due: date((w.week - 4) * 7 + 3) }))), rubric_json: rubricJson, created_at: createdAt });
  }
  for (const [courseId, userId, role] of [
    ['demo-course-reflection', 'demo-lecturer', 'lecturer'],
    ...['demo-student', 'demo-student-2', 'demo-student-3', 'demo-inactive'].map(u => ['demo-course-reflection', u, 'student']),
    ['demo-course-project', 'demo-lecturer-2', 'lecturer'],
    ['demo-course-project', 'demo-student-4', 'student'],
  ]) tables.memberships.push({ id: `${courseId}-${userId}`, course_id: courseId, user_id: userId, role });

  const plans = [
    ['demo-student', 1, 'final', [2, 2, 2, 2]],
    ['demo-student', 2, 'final', [3, 2, 3, 3]],
    ['demo-student', 3, 'final', [3, 4, 4, 3]],
    ['demo-student', 4, 'submitted', [3, 3, 3, 3]],
    ['demo-student', 5, 'returned', [3, 3, 2, 2]],
    ['demo-student', 6, 'draft', null],
    ['demo-student-2', 1, 'final', [3, 2, 2, 3]],
    ['demo-student-2', 2, 'submitted', [3, 2, 3, 2]],
    ['demo-student-2', 3, 'draft', null],
    ['demo-student-3', 1, 'returned', [2, 2, 2, 1]],
    ['demo-student-3', 2, 'submitted', [3, 3, 2, 3]],
    ['demo-student-4', 1, 'final', [3, 3, 3, 2]],
    ['demo-student-4', 2, 'submitted', [3, 2, 3, 3]],
    ['demo-student-4', 3, 'draft', null],
  ];
  for (const [userId, week, status, scores] of plans) {
    const id = `${userId}-week-${week}`;
    const courseId = userId === 'demo-student-4' ? 'demo-course-project' : 'demo-course-reflection';
    const reviewerId = courseId === 'demo-course-project' ? 'demo-lecturer-2' : 'demo-lecturer';
    const [title, ...paragraphs] = experiences[week - 1];
    const content = Object.fromEntries(sectionKeys.map((key, i) => [key, paragraphs[i]]));
    const draft = { ...content, nowWhat: 'Tôi học được rằng mình cần chuẩn bị và trao đổi tốt hơn với nhóm.', action: 'Tôi sẽ cố gắng làm tốt hơn ở buổi học tiếp theo.' };
    const offset = Math.min(-1, (week - 4) * 7 - 2);
    const stages = status === 'draft' ? ['Draft'] : ['Draft', 'AI Coach', 'Revision 1', 'AI Feedback', 'Submitted', ...(status === 'returned' ? ['Lecturer Review'] : status === 'final' ? ['Final'] : [])];
    const versions = stages.map((stage, i) => ({ id: `${id}-v${i + 1}`, reflection_id: id, content_json: JSON.stringify(i < 2 && status !== 'draft' ? draft : content), title: `DEMO · ${title}`, stage, created_at: stamp(offset, i * 10) }));
    const latest = versions.at(-1);
    tables.reflections.push({ id, user_id: userId, course_id: courseId, title: latest.title, week, content_json: latest.content_json, status, rev: versions.length, latest_version: latest.id, created_at: versions[0].created_at, updated_at: latest.created_at });
    tables.versions.push(...versions);
    const demoLevel=week>=3?3:2;
    if (scores) {
      for (const [kind, version, value] of [['coach', versions[1], draft], ['feedback', versions[3], content]]) {
        const result = {
          language: 'vi',
          strengths: ['[DEMO] Bài viết nêu rõ vai trò cá nhân và kết nối trải nghiệm với cảm xúc.'],
          development: ['[DEMO] Cần kiểm tra giả định ban đầu và làm rõ cách đánh giá kết quả hành động.'],
          questions: ['Nếu là một thành viên khác trong nhóm, bạn sẽ nhìn tình huống này thế nào?', 'Chi tiết nào khiến bạn muốn xem lại cách hiểu ban đầu của mình?'],
          suggestedActions: [content.action],
          criteria: criterionKeys.map((key, i) => ({ key, score: scores[i], behavior: defaultRubric[i].descriptions[scores[i] - 1], evidence: value[['soWhat','what','nowWhat','action'][i]].split('. ')[0].replace(/\.$/, '') + '.', evidenceSection: ['soWhat','what','nowWhat','action'][i], attachmentNames: [], improvement: 'Bổ sung một chi tiết cụ thể và cách kiểm tra lại nhận định của bạn.' })),
          total: totalScore(scores, defaultRubric, 4), level: demoLevel, rubricSpecification: 'thinkup-criteria-v2', scoreScale: 4, levelMethod: 'demo-classification', levelReason: 'Phân loại Kember mẫu dựa trên nhận thức và liên hệ bản thân trong bài; không suy ra từ điểm tiêu chí.', levelEvidence: value.nowWhat.split('. ')[0].replace(/\.$/, '') + '.',
          context: 'Dữ liệu demo được soạn sẵn để kiểm thử giao diện; không phải kết quả gọi AI thực tế.',
        };
        tables.analyses.push({ id: `${id}-${kind}`, reflection_id: id, version_id: version.id, kind, provider: 'Demo fixture', result_json: JSON.stringify(result), rubric_json: rubricJson, created_at: version.created_at });
      }
    }
    if (['final', 'returned'].includes(status)) tables.reviews.push({ id: `${id}-review`, reflection_id: id, version_id: latest.id, reviewer_id: reviewerId, comment: status === 'final' ? 'Nhận xét demo: Bạn đã tiến bộ trong việc liên hệ cảm xúc với nguyên nhân. Tiếp tục ghi lại kết quả hành động để kiểm tra bài học của mình.' : 'Nhận xét demo: Bổ sung góc nhìn của một thành viên khác và nêu thời hạn, tiêu chí kiểm tra hành động. Sau khi chỉnh sửa, em hãy nộp lại bài.', scores_json: JSON.stringify(status === 'final' ? scores : []), total: status === 'final' ? totalScore(scores, defaultRubric, 4) : null, level: status === 'final' ? demoLevel : null, decision: status, rubric_json: rubricJson, created_at: latest.created_at });
    tables.audit.push({ id: `${id}-audit`, user_id: userId, action: 'Demo seed', target_id: id, detail: JSON.stringify({ demo: true, status }), created_at: latest.created_at });
  }
  for (const [userId, week, status, dueOffset, text, review] of [
    ['demo-student', 1, 'done', -14, 'Gửi bản nháp cho nhóm trước buổi học hai ngày.', 'Đã gửi sớm và nhận được góp ý từ cả ba thành viên. Tôi sẽ giữ cách trao đổi này.'],
    ['demo-student', 2, 'done', -7, 'Nhờ một bạn kiểm tra mối liên hệ giữa ví dụ và lý thuyết.', 'Bạn góp ý hai slide chưa rõ. Nhóm đã bổ sung ví dụ và giải thích trước khi nộp.'],
    ['demo-student', 3, 'in_progress', 3, 'Tóm tắt ý kiến của bạn trước khi đưa ra phản hồi trong nhóm.', 'Đã thử trong một cuộc họp; cần tiếp tục quan sát ở buổi tiếp theo.'],
    ['demo-student', 4, 'todo', -2, 'Thiết lập hai mốc kiểm tra tiến độ khảo sát mỗi tuần.', ''],
    ['demo-student', 5, 'todo', 7, 'Thử một lịch họp mới phù hợp với các thành viên.', ''],
    ['demo-student-2', 2, 'in_progress', 5, 'Kiểm tra ví dụ minh họa trước bài thuyết trình tiếp theo.', 'Đã rà soát ba slide đầu tiên.'],
    ['demo-student-4', 1, 'todo', 4, 'Thống nhất lại vai trò của từng thành viên dự án.', ''],
  ]) tables.actions.push({ id: `${userId}-action-${week}`, user_id: userId, reflection_id: `${userId}-week-${week}`, text, due: date(dueOffset), status, review, created_at: stamp(-7) });
  tables.invitations.push(
    { id: 'demo-invite-student', email: 'newstudent@thinkup.local', name: 'Sinh viên chờ phân công Demo', role: 'student', course_id: 'demo-course-reflection' },
    { id: 'demo-invite-lecturer', email: 'newlecturer@thinkup.local', name: 'Giảng viên chờ phân công Demo', role: 'lecturer', course_id: 'demo-course-project' },
  );
  for (const [reflectionId, name, text] of [
    ['demo-student-week-4', 'DEMO-bien-ban-nhom.txt', 'MINH CHỨNG DEMO\nNhóm có 4 thành viên. Mục tiêu: 20 câu trả lời khảo sát. Thực tế: 10 câu trả lời.\nĐề xuất: kiểm tra tiến độ vào thứ Ba và thứ Năm.'],
    ['demo-student-week-6', 'DEMO-nhat-ky-hoc-tap.txt', 'NHẬT KÝ DEMO\nBuổi 1: Tôi chưa hỏi vì ngại.\nBuổi 2: Tôi chuẩn bị một câu hỏi nhưng chưa phát biểu.\nĐiều muốn thử: hỏi giảng viên sau giờ học.'],
  ]) {
    const reflection = tables.reflections.find(r => r.id === reflectionId);
    const id = `${reflectionId}-attachment`;
    const key = `${reflection.user_id}/${reflectionId}/${id}`;
    files.push({ key, text });
    tables.attachments.push({ id, reflection_id: reflectionId, name, type: 'text/plain', size: new TextEncoder().encode(text).length, object_key: key, created_at: reflection.created_at });
  }
  return { tables, files };
}
