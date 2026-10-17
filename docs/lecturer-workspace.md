> Chức năng hiện hành theo Final Requirements được mô tả tại [bản cập nhật ngày 17/10/2026](final-requirements.md).

# Không gian giảng viên

Menu giảng viên mở các trang riêng, không dồn công cụ vào dashboard. `/lecturer` chuyển đến danh sách bài chờ đánh giá. Liên kết cũ `?tab=progress` và `?tab=similarity` chuyển đến trang tương ứng.

| Menu | Đường dẫn | Công việc |
| --- | --- | --- |
| Bài nộp & đánh giá | `/lecturer/submissions` | Lọc trạng thái, tuần, tên/email/tiêu đề; ưu tiên bài chờ chấm lâu nhất. |
| Sinh viên | `/lecturer/students` | Danh sách phân công, kể cả sinh viên chưa có bài; mở hồ sơ qua `?student=<id>`. |
| Tiến độ lớp | `/lecturer/progress` | Số bài cần chấm, điểm cuối, tiến độ 9 tuần và sinh viên cần hỗ trợ theo tiêu chí. |
| Kiểm tra trùng lặp | `/lecturer/similarity` | Đối chiếu bài đã nộp/hoàn thành và đọc trích đoạn. |
| Học phần | `/lecturer/courses` | Chọn học phần, chỉnh tên/mã, nội dung và hạn nộp từng tuần, mô tả rubric. |
| Tin nhắn | `/lecturer/messages` | Nhắn riêng với tài khoản đang hoạt động ở cả ba vai trò, kể cả khác học phần. Xem [chi tiết chat](messages.md). |

Bộ chọn học phần giữ phạm vi khi chuyển mục. Mỗi bài mở tại `/lecturer/submissions/<id>`, có thể tải lại và chia sẻ URL với giảng viên được phân quyền. Trở về danh sách giữ bộ lọc; bài mở từ hồ sơ sinh viên có liên kết trở về hồ sơ đó. Các lớp ngoài quyền, bài nháp và hồ sơ sinh viên ngoài phạm vi trả 404; API kiểm tra quyền độc lập.

## Đánh giá và trả bài

1. Mở bài cần đánh giá, đọc bốn phần và tải minh chứng. Xem các phiên bản, AI Coach, feedback và lịch sử nhận xét khi cần.
2. Chọn Level và điểm /10 trong khoảng tương ứng cho từng tiêu chí theo trọng số 35/25/20/20. Gắn minh chứng, lý do và hướng cải thiện; chọn mức Kember riêng cho toàn bài. Có thể lưu nháp chưa gửi hoặc dùng trình soạn nhận xét năm phần và thư viện mẫu. Điểm lịch sử /4 không tự điền thành điểm mới.
3. Xác nhận điểm cuối. Nếu cần sinh viên sửa bài, viết nhận xét và chọn **Trả bài để sinh viên chỉnh sửa**; không cần chọn điểm hoặc mức Kember. Bài được mở lại cho sinh viên và nhận xét được lưu trong lịch sử.

AI hỗ trợ là tùy chọn, phải chủ động yêu cầu và chủ động dùng đề xuất. Thiếu API key không cản việc chấm trực tiếp. Phản hồi mẫu được ghi rõ; đề xuất cũ không khớp nội dung/rubric không điền điểm. Phiên bản cũ, bài trả về chờ nộp lại và bài của chính giảng viên không được chấm.

Đánh giá cuối có thể cập nhật; điểm đã xác nhận chỉ được điền lại khi rubric hiện tại khớp rubric của đánh giá đó. Thay đổi cấu hình học phần không sửa các snapshot/điểm cũ. Biểu mẫu nhắc khi rời trang có thay đổi chưa lưu; đăng xuất yêu cầu lưu trước. Cấu hình có thay đổi cần lưu trước khi đổi ngôn ngữ.

## Thống kê và kiểm tra

Điểm trung bình chỉ lấy đánh giá cuối, không dùng đề xuất AI. Tiến độ tuần đếm mỗi sinh viên một lần trong từng học phần, kể cả khi có nhiều bài cùng tuần; cột chờ đánh giá vẫn đếm số bài. Tuần chưa chấm hiển thị `—`. CSV tách đề xuất AI và điểm cuối, dùng phạm vi học phần/hồ sơ hiện tại.

`npm test` kiểm tra phân quyền, URL, điểm ban đầu, tiến độ, CSV và bản dịch. `npm run test:v15` kiểm tra các trang server và thao tác thật bằng tài khoản TEST local, không gọi AI trả phí. `npm run test:demo` kiểm tra tài khoản demo, các vai trò và quyền tải minh chứng. `npm run typecheck` và `npm run build` kiểm tra TypeScript và bản build. Các kiểm tra này không thay thế kiểm thử tương tác/ảnh giao diện trên trình duyệt.
