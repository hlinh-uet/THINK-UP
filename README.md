# THINK UP

Ứng dụng song ngữ Anh/Việt phát triển năng lực phản tư, triển khai theo toàn bộ 6 nhóm chức năng trong tài liệu `THINK UP_VER 1.docx.pdf`.

## Chức năng

- **Ngôn ngữ:** chọn English / Tiếng Việt trên thanh phía trên, đổi ngay và ghi nhớ trên thiết bị bằng cookie trong một năm. Mặc định English. Menu, biểu mẫu, trợ giúp, rubric mặc định, ngày tháng và xuất báo cáo theo lựa chọn; bài viết, nhận xét và nội dung tùy chỉnh giữ nguyên. Khi đã kết nối AI, Coach/Feedback mới theo ngôn ngữ được chọn, trích dẫn minh chứng vẫn nguyên văn.
- **Reflection Editor:** bốn phần What / So what / Now what / Action, tự lưu sau khi dừng viết 1,8 giây, đếm từ, xuất văn bản, tải minh chứng PNG/JPG/WebP/PDF/TXT (tối đa 3 tệp, 5 MB/tệp).
- **AI Coach:** câu hỏi gợi mở, điểm mạnh, điểm cần phát triển, gợi ý hành động, mức độ phản tư. Đọc ảnh, sơ đồ và tài liệu để bổ sung bối cảnh. Không có thao tác viết bài thay sinh viên.
- **Feedback & Rubric:** bốn tiêu chí, bốn mức độ, trọng số tùy chỉnh, minh chứng nguyên văn được kiểm tra. Điểm tổng và mức độ do ứng dụng tính; giảng viên xác nhận điểm cuối.
- **9-Week Journey:** nội dung, câu hỏi và hạn nộp của từng tuần tùy chỉnh theo học phần; trạng thái các bước dựa trên dữ liệu bài viết thực tế.
- **Action Tracker:** người học tự chỉnh sửa, xác nhận cam kết; cập nhật tiến độ và kết quả; nhắc lại cam kết chưa hoàn thành khi viết bài tiếp theo.
- **My Progress:** số bài, số revision, tuần hoàn thành, xu hướng mức độ, điểm từng tiêu chí, điểm mạnh/điểm cần phát triển; xuất CSV. Không tạo số liệu bằng AI.
- **Lecturer Dashboard:** danh sách sinh viên, bài đã nộp, toàn bộ phiên bản và feedback AI; trả bài chỉnh sửa; điều chỉnh điểm; nhận xét; xác nhận đánh giá cuối; phân tích lớp và xuất CSV.
- **Admin:** học phần, người dùng, trạng thái tài khoản, phân công vai trò/học phần bằng email, rubric và nội dung 9 tuần mặc định.

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở địa chỉ Local được in ra (thường là http://localhost:3000). Trang chủ giới thiệu ứng dụng, có nút đăng ký/đăng nhập bằng email và mật khẩu. Để thiết lập admin local, mở `/setup`, đặt mật khẩu cho `owner@thinkup.local`. Không có mật khẩu mặc định. Danh tính owner local chỉ được dùng để kích hoạt và kiểm thử khi NODE_ENV là development và hostname là localhost/127.0.0.1; trang làm việc vẫn yêu cầu đăng nhập.

Dữ liệu local được lưu bằng D1/SQLite và R2 trong `.wrangler/state`. Không xóa thư mục này nếu muốn giữ các bài và minh chứng đã tạo. Các tệp `.env`, `.dev.vars` và `.wrangler` không được đưa vào source triển khai.

## Kết nối AI

Ứng dụng đã tích hợp OpenAI Responses API, Structured Outputs và đầu vào hình ảnh/PDF. **Chưa có khóa thì các thao tác AI không hoạt động**; không thay AI bằng phản hồi giả. Các thao tác viết/lưu/nộp bài, quản lý lớp, nhận xét giảng viên và thống kê vẫn hoạt động.

Trên máy, điền `OPENAI_API_KEY` vào `.dev.vars` (Cloudflare runtime) và giữ `.env` đồng bộ với `.env.example`; khởi động lại dev. Không đưa khóa vào giao diện hoặc mã nguồn. Giá trị `OPENAI_MODEL` mặc định là `gpt-4.1-mini`; có thể cấu hình model hỗ trợ văn bản, ảnh, PDF và Structured Outputs.

Khi triển khai Sites, thiết lập `OPENAI_API_KEY` như một secret và `OPENAI_MODEL` trong cấu hình môi trường của Sites. Nên dùng OpenAI Developers để tạo/kết nối khóa. Không gửi khóa trong chat. Việc triển khai không tự tạo hạn mức thanh toán API.

Tệp và nội dung của bài chỉ được gửi khi người học yêu cầu Coach/Feedback. API dùng `store:false`. Các bài quá ngắn (dưới 20 từ) chưa được phân tích; mỗi người học có giới hạn 5 kết quả phân tích đã lưu trong một phút. Lỗi kết nối không tạo đánh giá hoặc làm mất bài.

Tài liệu API chính thức:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/images-vision

## Đăng nhập và quyền

Ứng dụng dùng tài khoản riêng bằng email và mật khẩu. `/` là trang giới thiệu, `/register` tạo tài khoản sinh viên, `/login` đăng nhập. Đăng nhập thành công mở `/admin`, `/lecturer` hoặc `/student` theo vai trò đọc từ database. Menu, hướng dẫn, trang mặc định và đường dẫn trực tiếp đều được giới hạn theo vai trò; admin có thêm màn hình bài nộp toàn hệ thống. Các trang làm việc xác thực và tải dữ liệu trên server trước khi hiển thị, tránh hiện thoáng qua giao diện sinh viên khi admin đăng nhập.

Tài khoản mới luôn là sinh viên, kể cả khi yêu cầu đăng ký tự gửi role admin/lecturer. Admin thay đổi vai trò trong danh sách người dùng, hoặc xác nhận phân công email sau khi người dùng đăng ký. Đăng ký không tự nhận quyền cao hơn từ một email chưa được xác minh. Quyền và trạng thái tài khoản được kiểm tra từ database ở mỗi yêu cầu; hạ quyền và tạm ngừng tác động tới cả phiên đang đăng nhập.

Để giữ tài khoản và dữ liệu từ bản cũ: chủ sở hữu Site mở **Kích hoạt tài khoản hiện có** (`/setup`), đặt mật khẩu cho danh tính đã được nền tảng xác thực. Không cho phép tự gắn mật khẩu vào một tài khoản cũ chỉ bằng cách nhập email. Luồng này giữ user ID, bài viết, vai trò và phân công hiện có. Site tiếp tục riêng tư theo thiết lập chia sẻ hiện tại; quyền mở Site và quyền của ứng dụng là hai lớp riêng.

Mật khẩu được hash bằng bcrypt với cost 12; kiểm tra giới hạn 72 byte để tránh cắt mật khẩu âm thầm. Phiên đăng nhập dùng token ngẫu nhiên 256 bit, chỉ lưu SHA-256 của token trong D1, hết hạn sau 7 ngày. Cookie HttpOnly, SameSite=Lax, Secure trên HTTPS. Đăng xuất xóa phiên khỏi database và cookie. API đăng nhập/đăng ký kiểm tra Origin và có giới hạn số lần thử; không gửi mật khẩu hoặc hash ra giao diện. Chưa bổ sung email xác minh hay quên mật khẩu qua email.

Để sử dụng với lớp thực tế cần cả hai bước: chủ sở hữu cho phép người dùng truy cập Site bằng cơ chế chia sẻ của Sites, và quản trị THINK UP phân công email/vai trò/học phần trong ứng dụng. Phân công email trong THINK UP không thay đổi quyền chia sẻ Site và không gửi thư tự động.

Sinh viên chỉ đọc/sửa bài của mình. Giảng viên chỉ xem bài đã nộp thuộc học phần được phân công. Quản trị viên quản lý hệ thống và bài đã nộp; không được tự chấm bài của chính mình. Minh chứng tải xuống cũng kiểm tra quyền trên server. Hạ vai trò hoặc ngừng tài khoản có hiệu lực ở lần yêu cầu tiếp theo.

Bài đã nộp/hoàn thành bị khóa sửa. Giảng viên trả bài để mở lại. Mỗi bước tạo snapshot riêng; chỉnh sửa rubric sau này không thay đổi các kết quả cũ. Chỉnh sửa đồng thời được kiểm tra bằng số revision, tránh ghi đè âm thầm.

## Rubric mặc định và giả định từ tài liệu

Tài liệu chỉ mô tả khung, chưa cho rubric chấm chi tiết. Bản này cung cấp rubric khởi tạo có thể điều chỉnh: bốn tiêu chí, 1–4 điểm/tiêu chí, 25%/tiêu chí.

Điểm /10 = tổng (điểm tiêu chí /4 × trọng số) /10. Mức độ theo trung bình bốn điểm: dưới 1,5 (hành động theo thói quen), dưới 2,5 (hiểu biết), dưới 3,5 (phản tư), từ 3,5 (phản tư sâu). Đây là quy tắc vận hành mặc định để giảng viên hiệu chỉnh, không phải thang đo đã được kiểm định học thuật.

Tuần hoàn thành khi có ít nhất một bài tuần đó được giảng viên xác nhận. Biểu đồ tuần lấy bài có đánh giá gần nhất; số liệu trung bình cuối chỉ lấy bài đã xác nhận. Đánh giá AI của nội dung cũ không được dùng làm điểm hiện tại sau khi sinh viên sửa bài.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
THINKUP_TEST_URL=http://localhost:3000 npm run test:workflow
```

Kiểm thử workflow chỉ dùng trên local development; tạo học phần và người dùng có tiền tố TEST. Kiểm tra đăng ký/đăng nhập thật, chặn tự nhận quyền, Origin, menu và trang server cho ba vai trò, đường dẫn ngoài quyền, kích hoạt tài khoản cũ, xác nhận phân công, giới hạn số lần đăng nhập, hạ quyền/ngừng tài khoản và đăng xuất. Đồng thời kiểm tra bài nháp riêng tư, quyền minh chứng, giới hạn học phần, xung đột phiên bản, khóa bài nộp/cuối, trả bài/sửa/nộp lại, điểm giảng viên và xác nhận cam kết. Không gọi AI có trả phí trong kiểm thử.

## Lưu trữ và triển khai

`.openai/hosting.json` khai báo D1 `DB` và R2 `FILES`. Schema trong `db/schema.ts`; migration trong `drizzle/`. Worker chạy dưới Cloudflare với vinext/Sites. Runtime dùng prepared statements và các batch có kiểm tra revision. Nhật ký thay đổi quản trị/đánh giá được lưu trong bảng `audit`.

Khi sửa schema, chạy `npm run db:generate`, kiểm tra migration và build lại trước khi triển khai. Production có D1/R2 riêng; dữ liệu local và fixture kiểm thử không được chuyển lên.

Ảnh nhận diện liên kết: `public/og.png`, tạo bằng ImageGen tích hợp từ brief “thinkup; Viết tốt hơn. Nghĩ sâu hơn.; REFLECT · LEARN · ACT”, bảng màu trắng/tím và hình cầu quỹ đạo của giao diện.

Các giới hạn còn lại trước khi dùng rộng rãi: cần kết nối và xác minh AI thực tế; cần chủ sở hữu cấp quyền chia sẻ cho lớp; chưa kiểm tra tương tác/hiển thị trên trình duyệt vì Browser chưa kết nối trong phiên xây dựng này.
