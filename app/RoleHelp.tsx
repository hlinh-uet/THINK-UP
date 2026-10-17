import { translate, type Language } from '../lib/i18n';
import type { Role } from '../lib/access';

export default function RoleHelp({audience:role,language}:{audience:Role;language:Language}) {
  const tr=(text:string)=>translate(text,language);
  const steps=role==='admin'?[
    ['Học phần','Mở Học phần để tạo lớp, thiết lập hành trình 9 tuần, hạn nộp và rubric.'],
    ['Người dùng','Mở Người dùng để tạo tài khoản sinh viên hoặc giảng viên, chỉnh vai trò, trạng thái và phân công.'],
    ['Cài đặt & quyền truy cập','Mở Cài đặt & quyền truy cập để xem kết nối AI, sửa cấu hình mặc định và kiểm tra ma trận quyền.'],
    ['Theo dõi bài nộp toàn hệ thống','Mở Bài nộp toàn hệ thống, Tiến độ học tập hoặc Kiểm tra trùng lặp để theo dõi các học phần.'],
  ]:[
    ['Chọn học phần được phân công','Danh sách sinh viên và bài nộp chỉ hiển thị trong học phần bạn phụ trách.'],
    ['Nhận xét và đối chiếu rubric','Xem bài viết, minh chứng, từng phiên bản và đề xuất AI trước khi đánh giá.'],
    ['Kiểm tra trùng lặp','Đối chiếu bài đã nộp trong học phần được phân công, đọc các đoạn trùng và tự xem xét bối cảnh.'],
    ['Theo dõi tiến bộ và nhu cầu hỗ trợ','Mở Sinh viên để xem hồ sơ từng người; mở Tiến độ lớp để xem tiến độ theo tuần và tiêu chí cần hỗ trợ.'],
    ['Trả bài hoặc xác nhận điểm','Mở bài trong Bài nộp & đánh giá. Trả bài cần nhận xét; xác nhận cần đủ bốn điểm, mức Kember và nhận xét. AI chỉ là hỗ trợ tùy chọn.'],
    ['Cấu hình học phần','Mở Học phần để chỉnh nội dung từng tuần, hạn nộp và mô tả rubric. Thay đổi cấu hình không sửa các đánh giá trước đây.'],
  ];
  steps.push(['Hồ sơ cá nhân','Bấm tên/avatar ở cuối menu để đổi thông tin cá nhân. Email, vai trò, trạng thái và học phần được quản lý trong Người dùng của admin.']);
  steps.push(['Tin nhắn','Mở Tin nhắn, chọn Mọi người để liên hệ sinh viên, giảng viên hoặc admin. Chỉ người tham gia xem được hội thoại.']);
  return <><div className="help-intro"><span>✧</span><h3>{tr(role==='admin'?'Không gian quản trị của bạn':'Không gian giảng dạy của bạn')}</h3><p>{tr('Các màn hình và thao tác được giới hạn theo vai trò tài khoản.')}</p></div><ol className="help-steps">{steps.map(([title,description])=><li key={title}><b>{tr(title)}</b><p>{tr(description)}</p></li>)}</ol></>;
}
