# Tin nhắn

Mục **Tin nhắn** trong menu của student, lecturer và admin mở trang riêng:
`/student/messages`, `/lecturer/messages`, `/admin/messages`.
Chọn **Mọi người**, tìm theo tên hoặc lọc vai trò, rồi chọn người để bắt đầu.
**Hội thoại** hiển thị các cuộc trò chuyện đã có, tin gần nhất và số tin chưa đọc.
Trên điện thoại, nút quay lại đưa về danh sách; **Tin nhắn mới** mở danh sách liên hệ.

Mọi tài khoản đang hoạt động có thể liên hệ nhau, kể cả khác học phần.
Danh bạ chỉ cung cấp ID, tên, vai trò, trạng thái; không chứa email, mật khẩu hoặc dữ liệu học tập.
Chỉ hai người tham gia đọc được lịch sử. Admin không có quyền xem chat của người khác.
Tên và vai trò ở đầu hội thoại là thông tin hiện tại; trên từng tin là thông tin tại thời điểm gửi.
Người gửi được xác định từ phiên đăng nhập và database, không từ dữ liệu client gửi lên.

Tin nhắn văn bản tối đa 4.000 ký tự; Enter để gửi, Shift + Enter để xuống dòng.
Nội dung được hiển thị dưới dạng văn bản, giữ xuống dòng và ngôn ngữ gốc.
Giờ tin nhắn và ngày phân nhóm dùng múi giờ Việt Nam (`Asia/Ho_Chi_Minh`) ở cả server
và browser, tránh lỗi hydration khi môi trường render dùng múi giờ khác nhau.
Giao diện hỗ trợ VN/EN. Tin lỗi giữ bản đang soạn và UUID để gửi lại không tạo trùng.
Chuyển hội thoại khi có bản đang soạn cần xác nhận bỏ bản; rời trang có cảnh báo chưa gửi.
Không gửi được tới tài khoản tạm ngừng, nhưng lịch sử hiện có vẫn đọc được.

Trang chat lấy tin mới mỗi 4 giây khi đang hiển thị, và cập nhật khi quay lại tab.
Badge trên các trang khác lấy số chưa đọc mỗi 30 giây và khi quay lại trang.
Đây là polling HTTP, chưa dùng WebSocket. Tin được đánh dấu đọc khi hội thoại có focus
và người đọc ở gần cuối lịch sử; người gửi nhìn thấy **Đã gửi / Đã đọc**.
Ban đầu tải 50 tin gần nhất; **Xem tin nhắn trước** tải thêm 50 tin.
Giới hạn 60 tin mới/phút/người gửi; gửi lại UUID đã thành công không tính thêm.
Chưa có nhóm chat, đính kèm, sửa/xóa tin hoặc thông báo email.

## Database và kiểm thử

Drizzle migration `0002_unusual_ben_parker.sql` bổ sung `chat_conversations` và
`chat_messages`. Migration không thay đổi dữ liệu học tập hoặc tài khoản hiện có.
Cặp người tham gia có unique index, gửi lại có unique index theo người gửi + UUID,
lịch sử có index theo hội thoại + ID; read marker chỉ cập nhật tăng trong hội thoại của mình.
Các truy vấn dùng tham số; batch tạo hội thoại, tin và cập nhật tin cuối là transaction D1.
API `/api/messages` yêu cầu phiên đang hoạt động; POST kiểm tra cùng Origin.

Chạy `npm test` cho validator, URL/menu, merge lịch sử và bản dịch;
Regression render kiểm tra inbox và hội thoại ở cả ba vai trò, VN/EN,
giữa UTC, Việt Nam, Los Angeles và Auckland, gồm tin nhắn qua nửa đêm.
`npm run typecheck` và `npm run build` kiểm tra TypeScript/build.
Khi dev chạy localhost và đã nạp demo: `npm run test:messages` chạy hai nhóm:

- D1 tạm riêng: quyền riêng tư, snapshots tên/vai trò, unread/read, gửi lại đồng thời,
  phân trang, ngừng tài khoản, giới hạn gửi, migration idempotent và query plan.
- HTTP local: tạo ba tài khoản TEST, gửi giữa mọi vai trò, chặn giả người gửi,
  chặn đọc hộ, Origin/session, SSR VN/EN, escape văn bản và đường dẫn ngoài quyền.

HTTP test giữ tài khoản và lịch sử TEST trong D1 local để kiểm tra; tài khoản TEST được
ngừng hoạt động khi kết thúc. Không gửi tin đến tài khoản người dùng thực, không gọi AI,
không ghi production. Miniflare và HTTP test cần quyền truy cập localhost.
