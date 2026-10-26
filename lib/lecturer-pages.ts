import type { Data, Reflection } from './domain.ts';
import { finalReview } from './progress.ts';

export const lecturerPages = [
  { key: 'overview', label: 'Bàn làm việc', navLabel: 'Bàn làm việc', icon: 'overview', group: 'Đánh giá', description: 'Tiếp tục công việc đang dở và những việc cần chú ý.' },
  { key: 'submissions', label: 'Bài nộp', navLabel: 'Bài nộp', icon: 'document', group: 'Đánh giá', description: 'Đọc, đánh giá và trả lời từng bài reflection.' },
  { key: 'similarity', label: 'Kiểm tra trùng lặp', navLabel: 'Trùng lặp', icon: 'similarity', group: 'Đánh giá', description: 'Đối chiếu văn bản và xem các đoạn tương đồng giữa bài nộp.' },
  { key: 'students', label: 'Sinh viên', navLabel: 'Sinh viên', icon: 'users', group: 'Theo dõi lớp', description: 'Danh sách lớp, hành trình từng tuần và hồ sơ của mỗi sinh viên.' },
  { key: 'progress', label: 'Phân tích lớp', navLabel: 'Phân tích lớp', icon: 'progress', group: 'Theo dõi lớp', description: 'Nhìn lại nhịp học, chất lượng phản tư và việc thực hiện cam kết của lớp.' },
  { key: 'courses', label: 'Học phần & rubric', navLabel: 'Học phần & rubric', icon: 'journey', group: 'Quản lý', description: 'Thiết lập nội dung chín tuần, hạn nộp và tiêu chí đánh giá.' },
  { key: 'messages', label: 'Tin nhắn', navLabel: 'Tin nhắn', icon: 'messages', group: 'Quản lý', description: 'Trao đổi trực tiếp với sinh viên và đồng nghiệp.' },
] as const;
// Lecturer-facing names for the stored reflection states (spec 2.1).
export const lecturerStatuses: Record<string, string> = { draft: 'Bản nháp', submitted: 'Chờ duyệt', returned: 'Đang chỉnh sửa', final: 'Đã hoàn tất' };
export type LecturerSection = typeof lecturerPages[number]['key'];
export type LecturerQuery = { course?: string; student?: string; status?: string; week?: string; q?: string; reflection?: string; criterion?:string; level?:string; sort?:string;cohort?:string };

export function lecturerHref(section: LecturerSection, query: LecturerQuery = {}, reflectionId?: string) {
  const path = `/lecturer/${section}${section === 'submissions' && reflectionId ? `/${encodeURIComponent(reflectionId)}` : ''}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  return path + (params.size ? `?${params}` : '');
}

/** The courses a lecturer teaches; `everything` widens it to every course for the administrator's monitoring pages. */
export function lecturerScope(data: Data, courseId = '',className='',everything=false) {
  const ids = new Set(everything?data.courses.map(c=>c.id):data.memberships.filter(m => m.userId === data.user?.id && m.role === 'lecturer').map(m => m.courseId));
  const courses = data.courses.filter(c => ids.has(c.id)&&(!className||(c.className||c.code)===className));
  const scopedIds = new Set(courses.filter(c => !courseId || c.id === courseId).map(c => c.id));
  const memberships = data.memberships.filter(m => scopedIds.has(m.courseId) && m.role === 'student');
  const studentIds = new Set(memberships.map(m => m.userId));
  return { courses, memberships, students: data.users.filter(u => studentIds.has(u.id)), actions: (data.classActions||[]).filter(a=>data.classReflections.some(r=>r.id===a.reflectionId&&scopedIds.has(r.courseId||''))), participation:(data.participation||[]).filter(p=>scopedIds.has(p.courseId)), reflections: data.classReflections.filter(r => scopedIds.has(r.courseId || '') && r.status !== 'draft') };
}

export function weeklyClassProgress(reflections: Reflection[], memberships: { courseId: string; userId: string }[]) {
  const pair = (row: { courseId: string | null; userId: string }) => `${row.courseId}:${row.userId}`;
  const roster = new Set(memberships.map(pair));
  return Array.from({ length: 9 }, (_, i) => {
    const rows = reflections.filter(r => r.week === i + 1);
    const graded = rows.filter(r => finalReview(r));
    return {
      week: i + 1, expected: roster.size,
      submitted: new Set(rows.filter(r => roster.has(pair(r))).map(pair)).size,
      completed: new Set(graded.filter(r => roster.has(pair(r))).map(pair)).size,
      pending: rows.filter(r => r.status === 'submitted').length,
      average: graded.length ? graded.reduce((n, r) => n + (finalReview(r)!.total || 0), 0) / graded.length : null,
    };
  });
}

export function safeCsv(rows: unknown[][]) {
  return rows.map(row => row.map(value => {
    const text = String(value ?? '');
    // Spreadsheet apps otherwise execute authored cells starting with formula characters.
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
