> Chức năng hiện hành theo Final Requirements được mô tả tại [bản cập nhật ngày 17/10/2026](final-requirements.md).

# Không gian giảng viên

Menu giảng viên mở các trang riêng, không dồn công cụ vào dashboard. `/lecturer` chuyển đến **Bàn làm việc**. Liên kết cũ `?tab=progress` và `?tab=similarity` chuyển đến trang tương ứng. Giao diện dùng chung bảng màu với student trong `app/workspace-ui.css`; `app/lecturer.css` (class tiền tố `lx-`) chỉ định bố cục và thành phần giảng viên. Nội dung trình bày bằng danh sách, bảng và đường phân cách; Bàn làm việc có các sticky note công việc; màn hình đối chiếu và không gian đánh giá dùng nền giấy riêng. Menu chia ba nhóm: **Đánh giá** (Bàn làm việc, Bài nộp, Trùng lặp), **Theo dõi lớp** (Sinh viên, Phân tích lớp), **Quản lý** (Học phần & rubric, Tin nhắn).

| Menu | Đường dẫn | Công việc |
| --- | --- | --- |
| Bàn làm việc | `/lecturer/overview` | Bốn sticky note từ dữ liệu thật: chấm bài, góp ý đang lưu nháp, sinh viên cần theo dõi và bài đang chỉnh sửa. Mỗi note mở công việc tương ứng; bên dưới là sáu lối tắt đến các trang làm việc, giữ học phần/lớp đang chọn. |
| Bài nộp | `/lecturer/submissions` | Bảng bài nộp với tab trạng thái, lọc tuần, tiêu chí + Level, tìm tên/email/tiêu đề, sắp xếp; cột AI đề xuất và điểm cuối tách riêng. |
| Kiểm tra trùng lặp | `/lecturer/similarity` | Chọn học phần, một hoặc tất cả sinh viên, và tuần. Kiểm tra bài đã nộp/hoàn thành; một sinh viên được chọn sẽ được đối chiếu với bài của các sinh viên khác trong cùng phạm vi. Kết quả có dải tổng kết, tỷ lệ riêng cho từng bài và trích đoạn song song được tô sáng. |
| Sinh viên | `/lecturer/students` | Hai tab: Danh sách lớp (kể cả chưa nộp) và Hành trình chín tuần (ma trận theo sinh viên/học phần, có tìm kiếm chung); hồ sơ qua `?student=<id>`: tiêu chí, bài viết, kế hoạch hành động. |
| Phân tích lớp | `/lecturer/progress` | Ba tab: Nhịp nộp bài (bảng chín tuần với thanh tiến độ), Chất lượng phản tư (bốn tiêu chí; so sánh giai đoạn và gợi ý giảng dạy mở khi cần), Cam kết & hành động (tình trạng và từng cam kết). Ma trận từng sinh viên nằm ở trang Sinh viên. |
| Học phần & rubric | `/lecturer/courses` | Chỉnh tên/mã, nội dung và hạn nộp từng tuần, mô tả 4 Level của rubric, xem lịch sử thay đổi. |
| Tin nhắn | `/lecturer/messages` | Nhắn riêng với tài khoản đang hoạt động ở cả ba vai trò, kể cả khác học phần. Xem [chi tiết chat](messages.md). |

Trang chấm `/lecturer/submissions/<id>` theo cách trình bày của student editor: bên trái là bài viết liền mạch trên nền giấy; bên phải là phiếu đánh giá với hai bước **Chấm điểm → Nhận xét**. Mỗi lần mở một tiêu chí; các tiêu chí đã đủ mức độ, điểm, minh chứng, giải thích và hướng cải thiện được đánh dấu hoàn tất. Nút tiếp theo chỉ rõ phần còn thiếu trước khi chuyển. Bôi đen một đoạn trong bài rồi bấm **Lấy đoạn bôi đen** để lấy minh chứng nguyên văn. **Trợ lý AI** mở riêng Trợ lý đọc hoặc AI đề xuất; đề xuất chỉ điền vào phiếu khi chủ động bấm dùng. **Công cụ bài viết** chứa Phiên bản, AI Coach, Tự đánh giá, Hành động và Nhận xét cũ; thông tin phiên bản và tệp nằm trong **Thông tin & minh chứng**. Trên màn hình rộng, bài viết và phiếu cuộn riêng, giữ nút thao tác luôn trong tầm nhìn. Nút trước/sau đi theo danh sách đang lọc; duyệt xong chuyển sang bài chờ duyệt kế tiếp.

Bộ chọn lớp và học phần dùng chung thành phần popover `ScopePicker`, cùng kiểu nút, trạng thái chọn và thao tác bàn phím (mũi tên, Home/End, Escape). Cả hai giữ phạm vi khi chuyển giữa các trang giảng dạy; liên kết vào/ra cấu hình học phần cũng giữ lớp đang chọn. Bộ chọn lớp luôn có toàn bộ lớp được phân công và lựa chọn Tất cả lớp; mỗi học phần hiện thêm tên lớp để phân biệt các đợt mở cùng mã. Đổi lớp sẽ bỏ học phần đang chọn nếu không thuộc lớp mới. Mỗi bài mở tại `/lecturer/submissions/<id>`, có thể tải lại và chia sẻ URL với giảng viên được phân quyền. Trở về danh sách giữ bộ lọc; bài mở từ hồ sơ sinh viên có liên kết trở về hồ sơ đó. Các lớp ngoài quyền, bài nháp và hồ sơ sinh viên ngoài phạm vi trả 404; API kiểm tra quyền độc lập.

## Đánh giá và trả bài

1. Mở bài cần đánh giá, đọc bài viết và mở **Thông tin & minh chứng** để tải tệp khi cần. Xem các phiên bản, AI Coach, feedback và lịch sử nhận xét khi cần.
2. Chọn Level và điểm /10 trong khoảng tương ứng cho từng tiêu chí theo trọng số 35/25/20/20. Gắn minh chứng, lý do và hướng cải thiện; chọn mức Kember riêng cho toàn bài. Có thể lưu nháp chưa gửi hoặc dùng trình soạn nhận xét năm phần và thư viện mẫu. Điểm lịch sử /4 không tự điền thành điểm mới.
3. Sang **Nhận xét**, chọn mức Kember và viết nhận xét rồi bấm **Duyệt và gửi**. Nếu cần sinh viên sửa bài, chọn **Yêu cầu chỉnh sửa**, viết nhận xét rồi bấm **Gửi yêu cầu chỉnh sửa**; không cần chọn điểm hoặc mức Kember. Bài được mở lại cho sinh viên và nhận xét được lưu trong lịch sử.

Tab AI Coach cho giảng viên hiển thị đủ điểm mạnh, điểm cần phát triển, câu hỏi gợi mở, gợi ý hành động và mức phản tư, cùng phiên bản nguồn. Trợ lý đọc có nhận định/trích dẫn theo đủ bốn tiêu chí, hoặc ghi rõ thiếu căn cứ. Bản Reading chưa duyệt chỉ tác giả còn quyền truy cập; không trả qua API/SSR cho sinh viên. Xóa mẫu riêng cũng phải còn role và phân công học phần hiện tại.

AI hỗ trợ là tùy chọn, phải chủ động yêu cầu và chủ động dùng đề xuất. Thiếu API key không cản việc chấm trực tiếp. Phản hồi mẫu được ghi rõ; đề xuất cũ không khớp nội dung/rubric không điền điểm. Phiên bản cũ, bài trả về chờ nộp lại và bài của chính giảng viên không được chấm.

Đánh giá cuối có thể cập nhật; điểm đã xác nhận chỉ được điền lại khi rubric hiện tại khớp rubric của đánh giá đó. Thay đổi cấu hình học phần không sửa các snapshot/điểm cũ. Biểu mẫu nhắc khi rời trang có thay đổi chưa lưu; đăng xuất yêu cầu lưu trước. Cấu hình có thay đổi cần lưu trước khi đổi ngôn ngữ.

## Thống kê và kiểm tra

Điểm trung bình chỉ lấy đánh giá cuối, không dùng đề xuất AI. Tiến độ tuần đếm mỗi sinh viên một lần trong từng học phần, kể cả khi có nhiều bài cùng tuần; cột chờ đánh giá vẫn đếm số bài. Tuần chưa chấm hiển thị `—`. So sánh giai đoạn hiện hai trung bình, số bài/SV có điểm và số bài/SV chưa có điểm trong từng giai đoạn cạnh chênh lệch; không suy tiến bộ chỉ từ chênh lệch giữa hai nhóm mẫu khác nhau. CSV tách đề xuất AI và điểm cuối, dùng phạm vi học phần/hồ sơ hiện tại.

`npm test` kiểm tra phân quyền, URL, điểm ban đầu, tiến độ, CSV và bản dịch. `npm run test:v15` kiểm tra các trang server và thao tác thật bằng tài khoản TEST local, không gọi AI trả phí. `npm run test:demo` kiểm tra tài khoản demo, các vai trò và quyền tải minh chứng. `npm run typecheck` và `npm run build` kiểm tra TypeScript và bản build. Các kiểm tra này không thay thế kiểm thử tương tác/ảnh giao diện trên trình duyệt.

API kiểm tra trùng lặp nhận danh sách học phần trong phạm vi, sinh viên nguồn và tuần; kiểm tra phân quyền tại server cho từng bộ lọc. Không truyền học phần vẫn hỗ trợ URL/API cũ, nhưng danh sách học phần rỗng không tự mở rộng phạm vi. Bộ kiểm tra tích hợp dùng database tạm riêng, xác nhận lọc tuần, sinh viên, học phần và chặn phạm vi ngoài phân công.
