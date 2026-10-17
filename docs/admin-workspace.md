# Không gian quản trị

Menu admin mở từng chức năng thành trang riêng, thay cho một màn hình có các tab bên trong.

| Mục | Đường dẫn | Chức năng |
| --- | --- | --- |
| Học phần / Courses | `/admin/courses` | Tạo/sửa học phần, nội dung 9 tuần, hạn nộp và rubric; mở bài nộp của lớp. |
| Người dùng / Users | `/admin/users` | Tạo tài khoản sinh viên/giảng viên, chỉnh email đăng nhập, vai trò và trạng thái, phân công học phần. Lọc vai trò bằng `?role=student`, `lecturer` hoặc `admin`. |
| Cài đặt & quyền truy cập / Settings & permissions | `/admin/settings` | Trạng thái kết nối AI, chỉnh cấu hình mặc định và xem ma trận quyền. |
| Bài nộp toàn hệ thống | `/admin/submissions` | Xem bài đã nộp và lịch sử đánh giá; giữ các thao tác admin đã được cấp trước đây. |
| Tiến độ học tập | `/admin/progress` | Theo dõi tiến bộ và tiêu chí cần hỗ trợ theo học phần/sinh viên. |
| Kiểm tra trùng lặp | `/admin/similarity` | Đối chiếu bài nộp trên toàn hệ thống hoặc trong học phần được chọn. |
| Tin nhắn / Messages | `/admin/messages` | Chat riêng với sinh viên, giảng viên hoặc admin; chỉ xem hội thoại có bản thân tham gia. |

Ba mục quản lý đặt trước, các công cụ theo dõi nằm bên dưới. Tiêu đề, breadcrumb, trạng thái menu và hướng dẫn theo đúng trang, hỗ trợ EN/VN. Bộ lọc học phần chỉ xuất hiện ở các trang theo dõi; lựa chọn được giữ trong `?course=...` và khi chuyển giữa các trang đó.

`/admin` chuyển đến Học phần. Bookmark cũ như `/admin?tab=users&role=lecturer`, `/admin?tab=settings`, `/admin?view=lecturer&tab=progress` chuyển đến trang admin tương ứng. Mở bài từ tiến độ/trùng lặp đi đến `/admin/submissions?reflection=...`; reload vẫn đọc đúng bài từ server. Không điều hướng admin sang không gian giảng viên.

Các trang quản lý/giám sát tải dữ liệu và kiểm tra vai trò trên server qua `WorkspacePage`; Tin nhắn dùng `MessagesPageFrame`. Sinh viên/giảng viên được chuyển về trang của họ; người chưa đăng nhập về `/login`. Học phần/bài không tồn tại, bài nháp riêng và bài không thuộc bộ lọc học phần bị từ chối. API vẫn kiểm tra quyền độc lập. Xem [chi tiết chat và schema bổ sung](messages.md).

Menu dùng đường dẫn thực. Form tạo tài khoản, phân công, cấu hình học phần, chỉnh người dùng và đánh giá có bảo vệ thay đổi chưa lưu khi rời trang; đăng xuất/đổi ngôn ngữ chờ lưu. Các menu tạm khóa khi đang gửi thao tác.

Kiểm tra: `tests/admin.test.mjs` cho đường dẫn/filter/bookmark; `tests/admin-users-workflow.test.mjs` cho bảy trang EN/VN, trạng thái menu, quyền truy cập, phạm vi bài/học phần và tạo tài khoản thực trên localhost. Không gọi AI trả phí.

Bấm tên/avatar ở cuối menu để mở [hồ sơ cá nhân](profiles.md). Admin chỉnh thông tin tài khoản được bảo vệ trong Người dùng; hồ sơ cá nhân chỉ chỉnh các trường tự phục vụ.
