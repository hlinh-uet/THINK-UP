# Không gian quản trị

Menu admin có **Người dùng, Học phần, Cài đặt và Tin nhắn**. `/admin` và logo mở `/admin/users`. Không có Tổng quan, nhóm Giám sát, bộ chọn phạm vi giảng dạy, số bài chờ chấm hoặc lối vào bài nộp/phân tích/trùng lặp trong menu quản trị.

| Mục | Đường dẫn | Công việc |
| --- | --- | --- |
| Người dùng | `/admin/users` | Tạo/sửa/tạm ngừng tài khoản, chỉnh vai trò và phân công học phần. `?role=student`, `lecturer` hoặc `admin` mở đúng nhóm. |
| Học phần | `/admin/courses` | Tạo học phần; chỉnh lớp, nội dung/hạn nộp chín tuần và rubric; quản lý giảng viên/sinh viên được phân công. `?course=<id>` mở cấu hình và lịch sử của học phần. |
| Cài đặt | `/admin/settings` | Cấu hình mặc định, quyền theo vai trò và nhật ký. |
| Tin nhắn | `/admin/messages` | Chat riêng với sinh viên/giảng viên/admin khác, có số tin chưa đọc và đánh dấu menu đang mở. Chỉ đọc hội thoại có bản thân tham gia. |

`AdminWorkspace` dùng các thành phần giao diện chung nhưng có luồng dữ liệu và thao tác riêng, không khởi tạo bộ lọc bài nộp, điểm, phân tích hoặc công cụ giảng viên. Trong bảng Học phần, nút **Cấu hình** mở nội dung, rubric và danh sách thành viên.

Các đường dẫn cũ được chuyển về chức năng quản trị tương ứng: `/admin/overview` → `/admin/users`; `/admin/submissions`, `/admin/progress`, `/admin/similarity` → `/admin/courses`, giữ `course` nếu có. Bookmark cũ `?view=lecturer` cũng chuyển về cấu hình học phần. Sinh viên/giảng viên mở trang quản trị được chuyển về role của họ; người chưa đăng nhập về `/login`. Hồ sơ cá nhân giữ đường dẫn riêng; `?view=messages` và `?tab=messages` mở `/admin/messages`. Trang chat chỉ tải phiên đăng nhập và hội thoại, không tải dữ liệu bài viết/học phần. Quyền `messages.use` áp dụng ở trang và API; menu ngừng lấy số tin chưa đọc khi quyền bị tắt.

## Cài đặt có thao tác

Tham số `settingsTab=defaults|permissions|audit` mở trực tiếp từng mục và giữ mục đó khi tải lại.

- **Cấu hình mặc định:** chọn từng tuần để sửa nội dung trong khung rộng; chọn từng tiêu chí để sửa bốn mức điểm theo chiều dọc. Lưu cấu hình áp dụng cho học phần mới; học phần đã có và đánh giá cũ giữ cấu hình riêng.
- **Phân quyền:** chọn Sinh viên/Giảng viên/Quản trị viên và bật/tắt từng chức năng. Có Lưu, Hủy thay đổi, Làm mới và Khôi phục quyền mặc định cho vai trò đang chọn. Chính sách lưu trong `settings.role-permissions`, áp dụng vào API và tải dữ liệu từ yêu cầu tiếp theo, kể cả phiên đã đăng nhập. Revision ngăn ghi đè cấu hình mới từ phiên khác; nhật ký ghi trước/sau thay đổi. Quyền không thể mở rộng khỏi vai trò gốc hay bỏ qua phạm vi bài cá nhân/học phần được phân công. Giữ quyền cấu hình phân quyền luôn bật cho admin để có thể phục hồi truy cập.

Kết nối AI do dev cấu hình qua môi trường máy chủ, không có giao diện hoặc chính sách bật/tắt kết nối trong Cài đặt. Quyền **Sử dụng trợ lý AI** chỉ điều khiển vai trò nào được gửi yêu cầu. Chế độ host vẫn chỉ dùng Codex và không chuyển sang API tính phí. Mục **Lưu trữ & sự cố** đã ẩn theo yêu cầu; dữ liệu cũ được giữ nguyên. Các URL `settingsTab=ai|data` mở lại cấu hình mặc định.

- **Nhật ký:** tìm theo người/thao tác/đối tượng, lọc loại thao tác, phân trang, làm mới và xuất CSV của kết quả đang lọc. CSV xử lý an toàn các giá trị có thể bị bảng tính hiểu thành công thức. Hiển thị tối đa 200 thao tác gần nhất.

Chính sách phân quyền tải cùng truy vấn cấu hình nhỏ; nhật ký chỉ được tải khi mở mục Nhật ký, không tải kèm sự cố hoặc bài lưu trữ. Lỗi tải được hiển thị kèm thao tác thử lại.

## Dữ liệu và kiểm tra

Ba trang chỉ tải tài khoản, học phần, phân công và cấu hình cần cho trang hiện tại qua `/api/thinkup?adminSection=users|courses|settings`. Không tải bài viết, lịch sử, kết quả AI, thống kê nộp bài hoặc số bài chờ chấm. Lịch sử cấu hình chỉ tải cho học phần đang mở. Sau khi lưu, client tải lại đúng dữ liệu của trang hiện tại.

`npm test` kiểm tra menu bốn mục, trang mặc định, đường dẫn cũ, phân quyền điều hướng và giao diện Việt/Anh. `node scripts/test-integration.mjs permissions-workflow admin-users-workflow messages-workflow` kiểm tra chuyển hướng, tài khoản/phân công, cấu hình, thu hồi/khôi phục quyền, phạm vi đọc và phiên đang đăng nhập trên D1/R2 tạm riêng. Chạy thêm `npm run typecheck` và `npm run build`. Không gọi AI trả phí.
