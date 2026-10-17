# Hồ sơ cá nhân

Bấm tên/avatar ở cuối menu để mở hồ sơ của chính tài khoản đăng nhập:
`/student/profile`, `/lecturer/profile`, `/admin/profile`.
Cả ba vai trò dùng cùng cách chỉnh sửa; đường dẫn của vai trò khác chuyển về không gian phù hợp.
Người chưa đăng nhập được chuyển về trang đăng nhập.

| Thông tin | Người dùng tự sửa | Admin quản lý |
| --- | --- | --- |
| Tên hiển thị, số điện thoại, giới thiệu | Có, trong hồ sơ của mình | Tên cũng có thể chỉnh trong Người dùng |
| Avatar | Chọn, xem trước, thay hoặc xóa ảnh của mình | Không sửa hộ trong bản này |
| Email đăng nhập | Không | Người dùng → Chỉnh sửa → Email |
| Vai trò và trạng thái | Không | Người dùng → Chỉnh sửa |
| Phân công học phần | Không | Thêm/gỡ phân công trong Người dùng |
| Ngày tạo tài khoản | Không | Chỉ đọc |

Form lưu tên, điện thoại, giới thiệu và thay đổi avatar cùng lúc.
Nút **Bỏ thay đổi** khôi phục thông tin đã lưu; rời trang khi đang soạn có cảnh báo.
Lỗi mạng giữ bản đang soạn. Hồ sơ có revision để hai tab không ghi đè nhau;
nếu có xung đột, **Tải lại thông tin** yêu cầu xác nhận bỏ thay đổi chưa lưu.
Tên và avatar hiện ở menu, danh sách admin/giảng viên và danh bạ/hội thoại chat.
Tên/vai trò trong tin nhắn cũ giữ snapshot tại thời điểm gửi.
Điện thoại/giới thiệu chỉ có trong endpoint hồ sơ của mình, không đưa vào danh bạ chat.

Ảnh PNG/JPG/WebP tối đa 2 MB; kiểm tra dung lượng, MIME và chữ ký định dạng trên server.
Không nhận SVG/HTML hoặc URL ảnh bên ngoài. Multipart được cấu hình 3 MB để có chỗ
cho ảnh 2 MB và các trường form; cần khởi động lại dev sau khi đổi cấu hình này. Ảnh xem trước là blob tạm trên thiết bị,
ảnh đã lưu dùng R2 và được phục vụ qua `/api/avatars/<userId>` cho tài khoản đã đăng nhập.
Không công khai bucket hoặc object key; ảnh có `private, no-store` và `nosniff`.
Không còn tham chiếu tới ảnh cũ sau khi thay/xóa; lưu metadata thất bại sẽ xóa ảnh mới đã tải.

Migration `0003_whole_psylocke.sql` chỉ thêm `user_profiles` với khóa chính/FK `user_id`;
không thay đổi bảng người dùng, lịch sử bài viết hoặc điểm cũ. Tên giữ ở `users`;
điện thoại, giới thiệu, avatar metadata và revision nằm ở `user_profiles`.
POST `/api/profile` yêu cầu same Origin và phiên còn hoạt động, chỉ nhận danh sách
trường tự sửa. ID lấy từ phiên; gửi email/role/active/phân công qua endpoint này bị từ chối,
kể cả người gọi là admin (admin dùng công cụ quản trị riêng).
Đổi email qua admin kiểm tra hợp lệ/trùng, cập nhật cùng audit trong transaction;
ID, mật khẩu, bài viết, phân công và phiên đăng nhập vẫn gắn với tài khoản hiện tại.
Email mới là địa chỉ đăng nhập mới. Không gửi email thông báo tự động.

## Kiểm thử

- `npm test`: validator, file signature/giới hạn, phân quyền trường, URL, form SSR VN/EN của cả ba vai trò và hồi quy render chat.
- `npm run test:profile`: D1/R2 tạm riêng và HTTP localhost với tài khoản TEST; kiểm tra cập nhật, upload/thay/xóa, race revision, quyền riêng tư, Origin/session, avatar trong chat/menu và đổi email qua admin.
- `npm run test:admin` / `npm run test:messages`: hồi quy quản lý tài khoản và chat sau khi thêm avatar.
- `npm run typecheck` / `npm run build`: TypeScript và bản build.

HTTP test giữ tài khoản TEST trong database local, ngừng hoạt động khi kết thúc;
không sửa hồ sơ demo hoặc hồ sơ thật, không ghi production. Kiểm thử Miniflare/HTTP cần truy cập localhost.
