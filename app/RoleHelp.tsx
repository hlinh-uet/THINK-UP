import { translate, type Language } from '../lib/i18n';
import type { Role } from '../lib/access';

export default function RoleHelp({role,language}:{role:Role;language:Language}) {
  const tr=(text:string)=>translate(text,language);
  const steps=role==='admin'?[
    ['Tạo và cấu hình học phần','Thiết lập học phần, nội dung 9 tuần, hạn nộp và rubric phù hợp.'],
    ['Quản lý tài khoản và phân quyền','Tài khoản đăng ký mới là sinh viên. Kiểm tra danh sách người dùng rồi cấp quyền và phân công học phần.'],
    ['Theo dõi bài nộp toàn hệ thống','Mở khu vực bài nộp để xem quá trình học tập và các đánh giá cuối cùng.'],
  ]:[
    ['Chọn học phần được phân công','Danh sách sinh viên và bài nộp chỉ hiển thị trong học phần bạn phụ trách.'],
    ['Nhận xét và đối chiếu rubric','Xem bài viết, minh chứng, từng phiên bản và đề xuất AI trước khi đánh giá.'],
    ['Trả bài hoặc xác nhận điểm','Gửi hướng dẫn chỉnh sửa, hoặc chấm bốn tiêu chí và xác nhận đánh giá cuối cùng.'],
  ];
  return <><div className="help-intro"><span>✧</span><h3>{tr(role==='admin'?'Không gian quản trị của bạn':'Không gian giảng dạy của bạn')}</h3><p>{tr('Các màn hình và thao tác được giới hạn theo vai trò tài khoản.')}</p></div><ol className="help-steps">{steps.map(([title,description])=><li key={title}><b>{tr(title)}</b><p>{tr(description)}</p></li>)}</ol></>;
}
