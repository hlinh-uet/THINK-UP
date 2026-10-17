# Triển khai theo Final Requirements ngày 17 tháng 10 năm 2026

Bản này sử dụng hai tài liệu sinh viên và giảng viên trong `../../Final_Requirements` làm chuẩn. Tài liệu PDF rubric cũ và ghi chú phiên bản 1.5 chỉ mô tả lịch sử. Không dùng mô hình điểm /4 của bản cũ cho các lượt đánh giá mới.

## Sinh viên

Editor giữ cách viết tự do, có gợi ý What / So what / Now what / Action và yêu cầu từng tuần. Có lưu nháp, revision, minh chứng, AI Coach, Feedback, phiếu tự đánh giá, lịch sử và so sánh hai phiên bản. So sánh hiển thị phần thêm/xóa và điểm của từng phiên bản khi có đánh giá; không tự tạo điểm cho bản chưa được đánh giá. Bài dài dùng so sánh theo khối có giới hạn bộ nhớ.

Phiếu tự đánh giá lưu riêng với version bài và rubric; không thay điểm cuối. Feedback của nội dung cũ được đánh dấu khi sinh viên thay bản viết. Thống kê bốn tiêu chí theo từng bài, giai đoạn và học phần; điểm mạnh thường xuyên chỉ hiển thị khi có ít nhất ba bài cuối có điểm của tiêu chí.

Cam kết có nguồn reflection, hạn, tiêu chí hoàn thành, trạng thái chưa bắt đầu/đang làm/hoàn thành/cần điều chỉnh, kết quả/rào cản, minh chứng và bài tiếp nối cùng học phần. Có lịch sử thay đổi và kiểm tra revision khi hai phiên cùng sửa. Kết thúc cam kết phải ghi lại kết quả. Tệp minh chứng hành động có thể thêm sau khi bài nguồn đã chấm, tối đa ba tệp × 5 MB; tách khỏi minh chứng dùng chấm bài gốc để không thay dữ liệu căn cứ của bài đã nộp.

Khi viết bài tiếp theo, nhắc cả cam kết chưa hoàn thành và đã hoàn thành; có câu hỏi về rào cản, minh chứng tiến bộ và điều chỉnh. Journey và Progress cho phép đọc lại chuỗi bài–cam kết–kết quả. Bản nháp chưa nộp có thể lưu trữ và khôi phục; việc lưu trữ bài đã nộp do admin xử lý.

## Giảng viên

Mỗi bản ghi học phần là một **lớp học phần/đợt mở** có roster và phân công riêng. Trường `className` hỗ trợ lọc lớp độc lập với mã học phần. Có thể tạo nhiều lớp cùng mã học phần bằng các bản ghi khác nhau; quyền vẫn kiểm tra theo ID lớp học phần, không suy từ tên lớp hoặc mã. Không thay ID/membership cũ khi thêm tên lớp.

Dashboard có tìm tên/email/bài, lọc lớp, học phần, tuần, trạng thái, tiêu chí/Level và sắp xếp. Bảng chín tuần phân biệt chưa bắt đầu, nháp, đang sửa, đã nộp/chờ duyệt, hoàn tất. Với bản nháp chưa nộp, giảng viên chỉ nhận metadata số lượng/trạng thái; không nhận ID, tiêu đề, nội dung hoặc phiên bản riêng tư qua bảng này.

Trợ lý đọc có bốn nhóm nhận định: trải nghiệm, suy nghĩ/cảm xúc/nguyên nhân, bài học/hành động, điểm cần xem xét. Mỗi nhận định phải có trích dẫn thực sự trong bài; nút Xem đoạn gốc đánh dấu đoạn tương ứng. Kết quả gắn phiên bản; server kiểm tra lại quyền và revision sau khi AI trả về. AI Reading có schema riêng cho cả OpenAI API và Codex local.

Màn hình bài nộp đọc được snapshot, Coach/Feedback, các lượt Tư duy cùng AI đã hoàn tất của bài được chia sẻ, tự đánh giá và nhận xét đã phát hành. Sau khi nộp, sinh viên được thông báo phạm vi chia sẻ này. Nhận xét nháp của GV nằm riêng, chỉ chính GV đó truy cập được khi còn quyền học phần; sinh viên và admin khác không tự đọc được bản nháp chỉ vì có quyền quản trị.

Giảng viên có trình soạn nhận xét năm phần, thư viện mẫu riêng theo học phần/tiêu chí, lưu nháp chưa gửi, duyệt gửi cuối hoặc trả bài kèm nhận xét. Lưu nháp kiểm tra revision; gửi cuối kiểm tra cả version bài và version rubric. Bài cũ, bài đang trả về và bài của chính người chấm bị chặn xác nhận.

Trang tiến độ có trung bình/phân bố bốn Level từng tiêu chí, số bài/sinh viên, mẫu số, trường thiếu dữ liệu, chuỗi điểm qua bài, so sánh giai đoạn, tỷ lệ hành động và nội dung phát triển được đếm từ feedback hiện hành. Không dùng AI tạo số liệu. Có đối chiếu AI–GV theo cặp điểm khi cùng bài/nội dung/rubric; đây chưa phải nghiên cứu hiệu chuẩn độc lập. CSV xuất đủ điểm, Level, căn cứ và cải thiện từng tiêu chí; xử lý ô bắt đầu bằng ký tự công thức.

Cam kết chỉ chia sẻ qua bài nguồn đã nộp thuộc phạm vi được phân công. Bài cá nhân, cam kết chưa gắn bài và minh chứng ngoài quyền không được cung cấp cho GV. Liên kết bài tiếp nối còn nháp không lộ ID qua dữ liệu cam kết lớp. Việc chưa hoàn thành hành động không tự trừ điểm reflection.

## Điểm và dữ liệu lịch sử

Mỗi tiêu chí có hai trường độc lập: `level` và `score`, thang điểm 10 với tối đa một chữ số thập phân:

| Level | Khoảng điểm |
|---|---|
| 1 | 0–2,5 |
| 2 | 2,6–5,0 |
| 3 | 5,1–7,5 |
| 4 | 7,6–10 |

Điểm tổng = Depth × 0,35 + Evidence × 0,25 + Insight × 0,20 + Action × 0,20, làm tròn hai chữ số. Server tính tổng, kiểm tra Level và điểm khớp khoảng, trích dẫn tồn tại trong bài, tên tệp hợp lệ, lý do và cải thiện. Khi xác nhận thành phần không xuất hiện, GV có thể ghi rõ lý do thiếu (tối thiểu 10 ký tự) ở Level 1; không dùng trường này để xác nhận điểm cao thiếu căn cứ.

AI không có minh chứng hợp lệ nhận `score:null`, `level:null`, `reviewRequired:true` và tổng `null`. Không tự quy thành điểm 1 hoặc 0. Không thể lấy toàn bộ đề xuất thiếu căn cứ để xác nhận cuối. Mức Kember 1–4 của toàn bài được chọn riêng và không suy từ điểm trọng số.

Lượt mới có `scoreScale:10` và rubric `thinkup-final-v3`; review criteria lưu riêng cạnh review gốc. Dữ liệu cũ thiếu marker tiếp tục được đọc là /4. Không ghi lại analyses, reviews, snapshots hoặc tổng điểm lịch sử. Biểu đồ /10 chỉ quy đổi điểm cũ để so sánh và ghi rõ điều này; lịch sử và diff hiển thị thang gốc. Thống kê nối theo ID tiêu chí, không đổi nhãn What/So what cũ thành tiêu chí mới.

Migration `0005_final_requirements.sql` chỉ thêm bảng/index `learning_records`, không ALTER/DROP bảng bài viết hay điểm cũ. Initialization chạy CREATE IF NOT EXISTS; seed local cũng áp dụng migration. Snapshot Drizzle được cập nhật; `db:generate` không phát sinh schema diff. Cấu hình mặc định cũ được archive khi nâng cấp mô tả; cấu hình đã tùy chỉnh được giữ lại. Mỗi lần đổi học phần lưu baseline và snapshot cấu hình; lịch sử hiển thị trên trang học phần/admin.

## Admin và vận hành

Admin quản lý người dùng, lớp học phần, phân công, cấu hình và bài nộp toàn hệ thống bằng cùng màn hình chấm của GV. Không tự chấm bài của mình. API viết/AI Coach/Feedback/nộp bài/cam kết chỉ dành Student; hạ role hoặc gỡ phân công được kiểm tra lại ở mỗi yêu cầu. Riêng review draft/template còn phải nằm trong phạm vi học phần hiện tại, không dựa vào quyền cũ hoặc chỉ quyền sở hữu bản nháp.

Cài đặt có chính sách thời gian lưu hồ sơ (30–3650 ngày), nội dung lưu trữ/xóa, nhật ký gần nhất, ghi nhận và cập nhật xử lý sự cố. Lưu trữ bài là thao tác khôi phục được, không xóa R2 hay lịch sử điểm. Chính sách hiện phục vụ rà soát thủ công: **không có job tự xóa dữ liệu**.

Quy trình vận hành:

1. Admin chốt thời hạn lưu, người phụ trách và phạm vi hồ sơ học phần trước khi đưa lớp thật vào hệ thống.
2. Khi có sự cố, ghi phạm vi và biện pháp xử lý trong Cài đặt, tạm ngừng tài khoản/phân công liên quan nếu cần, kiểm tra audit và quyền minh chứng; ghi kết quả rồi đánh dấu đã xử lý.
3. Yêu cầu xóa dữ liệu: xác minh chủ dữ liệu và nghĩa vụ giữ hồ sơ của học phần, lưu trữ trước trong ứng dụng để ngừng đưa vào danh sách; quyết định xóa vĩnh viễn phải được người phụ trách phê duyệt riêng. Không có endpoint xóa vĩnh viễn được bật tự động.
4. Sao lưu/khôi phục và xóa vĩnh viễn ở hạ tầng cần runbook riêng của môi trường hosting, gồm D1 và R2 nhất quán, kiểm tra phục hồi trước khi thay dữ liệu thật. Đợt cập nhật này không thao tác backup, secret hoặc production của hosting.

## Kiểm tra và phạm vi chưa xác minh

`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` và `npm run db:generate` kiểm tra logic, type, lint, build và schema. Store tests gồm seed preservation, D1/R2 và bridge schemas; không gọi mô hình thật.

`npm run test:integration` tạo thư mục tạm, sao chép source, symlink dependencies, bỏ secrets và dùng D1/R2 riêng; chạy nối tiếp tám workflow cho ba role, grading, cam kết/minh chứng, lịch sử, nhắn tin, hồ sơ và quản trị. Giới hạn đăng nhập chỉ được dọn trong database tạm giữa các suite; giới hạn ứng dụng giữ nguyên. Script in đường dẫn để tra log và dừng dev server sau khi chạy.

Chưa xác minh chất lượng nội dung của AI thực tế, chưa nghiệm thu tương tác/screenshot desktop-mobile. Công cụ Computer Use không được cấp quyền trong lần kiểm tra trước; đợt này kiểm tra UI bằng SSR và kiểm tra logic bằng tests. Các tích hợp LMS, kho tương đồng bên ngoài và nghiên cứu hiệu chuẩn bằng tập bài GV chấm độc lập vẫn thuộc phần mở rộng/giai đoạn 3, không được giả lập thành đã có kết quả. Quy trình backup/khôi phục hạ tầng chưa được triển khai hoặc thử trên môi trường người dùng.
