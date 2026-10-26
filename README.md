> Cập nhật ngày 25/10/2026 theo `Final_Requirements`: xem [chức năng, role, migration và giới hạn kiểm chứng](docs/final-requirements.md). Lượt đánh giá mới dùng điểm từng tiêu chí /10; các ghi chú 1.5/PDF cũ chỉ dùng để tra lịch sử. Chạy `npm run test:integration` để kiểm tra trên database tạm, không ghi dữ liệu TEST vào workspace đang dùng.

# THINK UP

Ứng dụng song ngữ Anh/Việt phát triển năng lực phản tư, cập nhật theo hai bản yêu cầu sinh viên và giảng viên đã chốt trong `../Final_Requirements`. Xem [chức năng và phân quyền hiện hành](docs/final-requirements.md); [ghi chú 1.5](docs/version-1.5.md) được giữ để tra lịch sử.

## Chức năng

- **Hồ sơ cá nhân:** bấm tên/avatar ở menu để đổi tên hiển thị, điện thoại, giới thiệu và ảnh. Email, quyền, trạng thái và phân công do admin quản lý. Xem [docs/profiles.md](docs/profiles.md).
- **Tin nhắn:** chat riêng 1–1 giữa sinh viên, giảng viên và admin, hiện tên/vai trò, lịch sử D1 và số tin chưa đọc. Mở mục **Tin nhắn** → **Mọi người** để bắt đầu. Xem [docs/messages.md](docs/messages.md).
- **Menu admin:** Học phần, Người dùng, Cài đặt & quyền truy cập và các công cụ giám sát mở thành trang riêng. Xem [docs/admin-workspace.md](docs/admin-workspace.md).

- **Ngôn ngữ:** chọn English / Tiếng Việt trên thanh phía trên, đổi ngay và ghi nhớ trên thiết bị bằng cookie trong một năm. Mặc định Tiếng Việt. Menu, biểu mẫu, trợ giúp, rubric mặc định, ngày tháng, tên bước và xuất báo cáo theo lựa chọn. Nội dung demo có bản Việt/Anh cho tên học phần, bài viết, Coach/Feedback, nhận xét và cam kết; chuyển ngôn ngữ chỉ thay cách hiển thị. Nội dung người dùng tự viết hoặc sửa giữ nguyên. Khi đã kết nối AI, Coach/Feedback mới theo ngôn ngữ được chọn, trích dẫn minh chứng vẫn nguyên văn.
- **Reflection Editor:** một vùng viết tự do, tiêu đề tùy chọn, thêm ảnh/sơ đồ/tài liệu làm bối cảnh và khung Trợ lý phản tư bên cạnh. Tự lưu sau 1,8 giây, lịch sử phiên bản và xuất văn bản. Không bắt buộc viết bốn phần; nộp bài cần nội dung và học phần. Minh chứng PNG/JPG/WebP/PDF/TXT tối đa 3 tệp, 5 MB/tệp. Chi tiết ở [docs/student-editor.md](docs/student-editor.md).
- **Tư duy cùng AI:** bấm nút để AI đọc bản viết hiện tại (kể cả chưa tự lưu) và ảnh/tài liệu đã upload, rồi gợi ý hướng phát triển và câu hỏi để viết tiếp. Không cần nhập prompt, không tự gọi AI khi gõ bài, không viết hộ/chấm điểm. Gợi ý riêng theo bài, vẫn viết được trong lúc chờ. Khung “Trợ lý phản tư của bạn” giữ ba tab Tư duy cùng AI / AI Coach / Feedback & rubric.
- **AI Coach:** chức năng riêng đọc bài đã viết và trả năm nhóm: điểm mạnh, điểm cần phát triển, câu hỏi gợi mở, gợi ý hành động, mức độ phản tư. Có nút yêu cầu Coach, kết quả/lịch sử riêng và cảnh báo phản hồi cũ. Không thay thế Tư duy cùng AI hoặc Feedback & rubric. Cả ba dùng được với Codex local hoặc OpenAI API.
- **Feedback & Rubric:** Reflection Depth 35%, Evidence & Context Quality 25%, Insight Realized 20%, Action Plan 20%; mỗi tiêu chí có Level 1–4 và điểm độc lập 0–10 trong khoảng tương ứng, minh chứng nguyên văn được kiểm tra. Thiếu căn cứ được đánh dấu cần xem xét, chưa tính tổng. Ứng dụng tính tổng theo trọng số 35/25/20/20. AI phân loại Kember độc lập từ toàn bài, kèm lý do và trích dẫn; giảng viên xác nhận điểm và mức Kember cuối.
- **9-Week Journey:** nội dung, câu hỏi và hạn nộp của từng tuần tùy chỉnh theo học phần; trạng thái các bước dựa trên dữ liệu bài viết thực tế.
- **9-Week Journey & Action Tracker:** một mục “Hành trình & hành động”, hiển thị reflection, cam kết và kết quả thực hiện ngay trong từng tuần. Cam kết gắn với bài reflection gốc; người học tự chỉnh sửa và xác nhận trước khi lưu. Khi viết reflection tiếp theo trong cùng học phần, editor nhắc các cam kết từ bài trước, gồm cả cam kết đã hoàn thành để nhìn lại kết quả. Bộ lọc học phần áp dụng cho cam kết qua bài gốc; cam kết cá nhân chưa gắn bài vẫn được giữ trong phần riêng của hành trình khi xem tất cả học phần. Đường dẫn cũ `?view=actions` mở hành trình hợp nhất.
- **My Progress:** số bài, số revision, tuần hoàn thành, xu hướng mức độ, điểm từng tiêu chí, điểm mạnh/điểm cần phát triển; xuất CSV. Không tạo số liệu bằng AI.
- **Không gian giảng viên:** menu gồm Tổng quan, Bài nộp, Sinh viên, Phân tích lớp, Kiểm tra trùng lặp, Học phần và Tin nhắn. Có bộ chọn lớp/học phần, đủ năm nhóm Coach cho giảng viên và AI Reading kèm căn cứ từng tiêu chí rubric. Mỗi bài có trang đọc/chấm riêng và URL mở lại được. Điểm không tự điền; giảng viên chọn đủ bốn tiêu chí và mức Kember trước khi xác nhận. Trả bài chỉ cần nhận xét. Có hồ sơ sinh viên, tiến độ 9 tuần, hỗ trợ theo tiêu chí, xuất CSV và cấu hình học phần được phân công. Xem luồng sử dụng tại `docs/lecturer-workspace.md`.
- **Kiểm tra trùng lặp:** đối chiếu bài đã nộp/hoàn thành của những sinh viên khác nhau trong phạm vi học phần được cấp quyền. Hiển thị tỷ lệ từ trùng của từng bài và các đoạn nguyên văn để giảng viên xem xét. Không dùng AI, không gửi bài ra ngoài, không tự giảm điểm; chưa đối chiếu Internet hoặc kho bài liên trường.
- **Admin:** học phần; quản lý sinh viên và giảng viên với bộ lọc vai trò, trạng thái, tìm theo tên/email; tạo tài khoản trực tiếp với mật khẩu và phân công nhiều học phần; chỉnh sửa tài khoản, phân công bằng email, rubric và nội dung 9 tuần mặc định.

## Chạy trên máy

```bash
npm install
npm run dev
```

Mở địa chỉ Local được in ra (thường là http://localhost:3000). Trang chủ giới thiệu ứng dụng, có nút đăng ký/đăng nhập bằng email và mật khẩu. Để thiết lập admin local, mở `/setup`, đặt mật khẩu cho `owner@thinkup.local`. Không có mật khẩu mặc định. Danh tính owner local chỉ được dùng để kích hoạt và kiểm thử khi NODE_ENV là development và hostname là localhost/127.0.0.1; trang làm việc vẫn yêu cầu đăng nhập.

Dữ liệu local được lưu bằng D1/SQLite và R2 trong `.wrangler/state`. Không xóa thư mục này nếu muốn giữ các bài và minh chứng đã tạo. Các tệp `.env`, `.dev.vars` và `.wrangler` không được đưa vào source triển khai.

## Mở HTTPS từng đợt trên máy Mac (cả backend)

Cần Codex CLI đã đăng nhập ChatGPT (`codex login`). Máy này đã có Codex và `cloudflared`. Để mở đợt test, chạy:

```bash
npm run host
```

Lệnh dùng database và tệp hiện có trong `.wrangler/state`, build bản production và in link HTTPS. Lệnh thử Cloudflare trước (`https://….trycloudflare.com`), tự chuyển sang localhost.run (`https://….lhr.life`) nếu đường đó không truy cập được. Chỉ in sẵn sàng sau khi kiểm tra được backend qua HTTPS thật. Mọi tài khoản và mật khẩu hiện tại được giữ nguyên, gồm cả admin demo.

Host kiểm tra link qua DNS công cộng (chờ tối đa 90 giây cho link Cloudflare mới) và kiểm tra lại mỗi phút; nếu link không truy cập được 3 lần liên tiếp hoặc tunnel/backend dừng, host tự mở lại và in link mới. Link hiện tại luôn nằm trong `.wrangler/host-url.txt`. Không chạy `npm run dev`/`dev:codex` cùng lúc với host vì cả hai dùng chung database.

Giữ Terminal mở, máy có mạng và nắp máy mở trong suốt đợt sử dụng. Lệnh tự giữ macOS không idle sleep bằng `caffeinate`. Bấm **Ctrl+C** để dừng backend, AI bridge và tunnel. Đợt sau chạy lại cùng lệnh; link thay đổi, dữ liệu giữ nguyên. Không chạy đồng thời các bản host cùng database. Hai tunnel có chế độ miễn phí, không bảo đảm uptime; xem [Cloudflare](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) và [localhost.run](https://localhost.run/docs/forever-free/).

Tunnel miễn phí phù hợp để test, chưa bảo đảm giữ nguyên link và kết nối liên tục 2–3 ngày. localhost.run cho biết tên miền miễn phí thay đổi sau vài giờ; nếu tunnel ngắt, chạy lại `npm run host` và gửi link mới. Xem [FAQ của localhost.run](https://localhost.run/docs/faq/).

Giao diện, API, D1/SQLite và R2 đều chạy trên máy; không deploy hoặc chuyển dữ liệu lên Cloudflare Workers. Chế độ này chặn trang debug, trang `/setup` và header danh tính nền tảng từ Internet. Người test đăng nhập bằng đúng tài khoản và mật khẩu đang dùng trên local.

AI mặc định dùng phiên Codex đăng nhập ChatGPT của người host. Người test chỉ đăng nhập THINK UP, không cần tài khoản ChatGPT hay API key. Các lượt AI dùng chung hạn mức Codex của gói ChatGPT trên máy host; hết hạn mức sẽ báo lỗi, không tự chuyển sang API tính tiền. Chế độ host không dùng API key kể cả khi `.dev.vars` có cấu hình. Bridge chỉ nhận kết nối nội bộ với token trong bộ nhớ; xử lý một lượt AI tại một thời điểm, cho tối đa bốn lượt đợi. Kiểm tra bằng `npm run test:host` và `npm run test:codex`.

## Dữ liệu dùng thử (cho người test)

Dừng dev server, rồi dựng lại toàn bộ database local bằng bộ dữ liệu giống thật:

```bash
npm run db:seed:showcase -- --replace
npm run dev:codex   # hoặc npm run host khi chia sẻ cho người dùng thử
```

Lệnh chuyển dữ liệu hiện có sang `.wrangler/backups/<thời điểm>/` (không xóa), rồi tạo database mới. Mật khẩu chung: **`ThinkUp@2026`**.

| Email | Vai trò |
| --- | --- |
| `sinhvien@thinkup.test` | Sinh viên Nguyễn Minh Anh: 3 học phần, 15 bài ở đủ trạng thái (nháp, chờ chấm, cần sửa, hoàn thành), cam kết, tự đánh giá, tin nhắn chưa đọc |
| `giangvien@thinkup.test` | Giảng viên TS. Nguyễn Thu Hà: 2 lớp, 19 sinh viên, 11 bài chờ chấm, 1 cặp bài trùng lặp để thử kiểm tra |
| `admin@thinkup.test` | Quản trị Phạm Quốc Huy: 4 học phần, 26 tài khoản (1 tạm ngừng), 2 phân công chờ |

Bộ dữ liệu có 3 giảng viên, 22 sinh viên, 4 học phần đang ở tuần 6, 87 bài reflection viết riêng theo trình độ từng sinh viên, lịch sử phiên bản (có bài bị trả rồi nộp lại), 72 lượt đánh giá kèm minh chứng, 63 cam kết, 3 tệp minh chứng, mẫu nhận xét và 5 cuộc trò chuyện. Mọi người và sự kiện đều hư cấu; ngày tháng tính theo ngày chạy lệnh. Đề xuất AI có sẵn được đánh dấu "Phản hồi mẫu" trên giao diện; bấm phân tích lại để AI thật đọc bài. Các workflow test (`test:v15`, `test:demo`…) dùng bộ demo cũ bên dưới và ghi vào database, không chạy chúng trên dữ liệu dùng thử.

## Dữ liệu demo để kiểm thử local

```bash
npm run db:seed
npm run dev
```

Đăng nhập tại `/login`. Mật khẩu chung của các tài khoản demo: **`ThinkUpDemo2026!`**.

| Email | Vai trò / tình huống |
| --- | --- |
| `admin@thinkup.local` | Quản trị: người dùng, học phần, phân công, rubric, bài nộp toàn hệ thống |
| `lecturer@thinkup.local` | Giảng viên lớp DEMO-REF101; xem, trả bài và chấm bài |
| `lecturer2@thinkup.local` | Giảng viên lớp DEMO-PRJ201; kiểm thử giới hạn quyền giữa hai lớp |
| `student@thinkup.local` | Sinh viên chính: 6 bài, có đủ nháp / chờ chấm / cần sửa / hoàn thành |
| `student2@thinkup.local`, `student3@thinkup.local` | Sinh viên cùng lớp; kiểm thử danh sách, lọc và quyền riêng tư |
| `student4@thinkup.local` | Sinh viên lớp dự án cộng đồng |
| `inactive@thinkup.local` | Tài khoản tạm ngừng; đăng nhập bị chặn |

Bộ demo gồm 2 học phần có rubric và lịch 9 tuần, 14 bài reflection với lịch sử phiên bản, 5 đánh giá cuối và 2 bài trả về, 7 cam kết (chưa bắt đầu / đang làm / hoàn thành, có cam kết quá hạn), 2 phân công email chờ và 2 tệp TXT minh chứng thực sự lưu ở R2. Ngày hạn được tính theo ngày chạy seed lần đầu. Phản hồi Coach/Feedback được soạn sẵn, có provider `Demo fixture` và thông báo trên giao diện; không phải kết quả AI thực tế. Các nút gọi AI cần kết nối Codex local hoặc OpenAI API.

Lệnh chỉ dùng Miniflare local, chung binding D1/R2 và `.wrangler/state` với Vite; không gọi database production và không tự chạy khi build, khởi động hoặc triển khai. Tài khoản demo không thay thế owner hiện có. Seed thêm dữ liệu trong một transaction D1, giữ cấu hình và dữ liệu cũ; chạy lại sẽ bỏ qua toàn bộ bộ demo đã nạp, giữ cả những chỉnh sửa và bản ghi demo bạn đã xóa. Nếu có email/ID trùng trước lần nạp đầu, transaction thất bại và không ghi đè tài khoản cũ.

Để xem menu Course và các trang student với nhiều dữ liệu hơn, sau bộ demo cơ bản chạy:

```bash
npm run db:seed:student
```

Lệnh thêm 8 học phần cho `student@thinkup.local`: Tư duy thiết kế, Nghiên cứu trải nghiệm người dùng, Giao tiếp và làm việc nhóm, Tư duy phản biện, Kỹ năng thuyết trình, Quản lý dự án, Học tập qua phục vụ cộng đồng, Phát triển bền vững. Mỗi học phần có lịch 9 tuần và 3 bài viết; cả bộ có 24 bài, 84 phiên bản, 16 cam kết, 18 góp ý giảng viên và 21 phản hồi rubric mẫu theo thang /10. Có tên học phần dài để thử menu cuộn, dữ liệu Việt/Anh, trạng thái nháp/chờ chấm/cần sửa/hoàn thành và cam kết quá hạn/đang làm/đã xong. Marker riêng giúp chạy lại không thêm trùng hay ghi đè bài, học phần và cấu hình đã có; lệnh không tạo tài khoản mới hoặc gọi AI. Tải lại trang student sau khi nạp.

Các luồng thử nhanh:

- Dùng `student@thinkup.local`: mở bài nháp tuần 6, sửa/lưu và tải minh chứng; xem tuần 5 cần sửa rồi nộp lại; xem Journey, Progress và cập nhật cam kết.
- Dùng `lecturer@thinkup.local`: mở `/lecturer/submissions`, chọn bài tuần 4 chờ chấm, tải minh chứng, xem lịch sử/feedback, trả bài hoặc xác nhận điểm. Chuyển mục trên menu để xem sinh viên, tiến độ lớp, trùng lặp và cấu hình học phần; chỉ thấy lớp được phân công.
- Dùng `admin@thinkup.local`: mở `/admin?tab=users`, chọn Sinh viên hoặc Giảng viên và **Tạo tài khoản**. Nhập thông tin, đặt/tạo mật khẩu, chọn học phần; tài khoản mới đăng nhập được ngay. Sao chép thông tin đăng nhập ở bước hoàn tất để cung cấp cho người dùng. Để thử phân công chờ, đăng ký `newstudent@thinkup.local` hoặc `newlecturer@thinkup.local`, sau đó admin xác nhận trong ứng dụng.

Kiểm tra seed bằng `npm run test:seed` (D1/R2 tạm riêng, không sửa database local của bạn). Sau khi nạp demo và chạy dev, dùng `npm run test:demo` để kiểm tra đăng nhập, trang của ba vai trò, phân quyền lớp và tải minh chứng; lệnh này cần dữ liệu demo chưa bị chỉnh sửa. `npm run test:admin` tạo hai tài khoản TEST sinh viên/giảng viên để kiểm tra mật khẩu, email trùng, đăng nhập, phân công học phần, giới hạn quyền và danh sách song ngữ. Các tài khoản TEST được giữ lại trong database local để kiểm tra giao diện.

## Kết nối AI

### Codex local bằng tài khoản ChatGPT

Để kiểm thử trên máy bằng phiên Codex đã đăng nhập ChatGPT, không cần OpenAI API key:

```bash
codex login
npm run dev:codex
```

Mở `http://127.0.0.1:3000` (hoặc cổng được in ra). Bộ chọn **Codex local · ChatGPT** nằm trên thanh phía trên; dùng cho AI Coach, Feedback và phân tích bài của giảng viên. Nếu đã cấu hình API key, có thể đổi sang **OpenAI API**. Kết quả lưu đúng tên nhà cung cấp; các lượt Codex dùng hạn mức gói ChatGPT của tài khoản đang đăng nhập. Đăng nhập THINK UP vẫn dùng email/mật khẩu riêng.

Mặc định thử `gpt-5.6-luna`. Nếu tài khoản không hỗ trợ model này, chọn model mà bạn dùng được trong Codex:

```bash
CODEX_MODEL=gpt-5.6-luna npm run dev:codex
```

`CODEX_MODEL` và `CODEX_BIN` (đường dẫn CLI nếu không có trong PATH) là biến môi trường của lệnh khởi động, không phải secret của Sites. Cần Codex CLI có các cờ `--ignore-user-config`, `--ignore-rules`, `--ephemeral` và `--output-schema`; cập nhật CLI nếu phiên bản cũ không nhận cờ.

Ảnh PNG/JPG/WebP và TXT được hỗ trợ. PDF được chuyển từng trang thành ảnh, tối đa tổng cộng 12 trang/ảnh một lượt; cần `pdfinfo` và `pdftoppm` của Poppler (`brew install poppler` trên macOS). Không gửi minh chứng nếu chưa bật tùy chọn gửi kèm.

Lệnh chạy một cầu nối Node chỉ lắng nghe `127.0.0.1`, dùng token ngẫu nhiên trong bộ nhớ, rồi khởi động web trên loopback. Cầu nối chỉ chấp nhận phiên đăng nhập ChatGPT, xử lý một lượt một lúc, tắt công cụ shell/web/plugin và xóa các tệp tạm khi hoàn tất. Phản hồi được kiểm tra theo cùng rubric, trích dẫn và cách tính điểm của kết nối API. Không tự chuyển sang API khi Codex lỗi hoặc hết hạn mức.

`npm run dev:codex` dùng qua localhost/127.0.0.1. Để cho nhóm dùng qua HTTPS trên máy này, dùng `npm run host` như hướng dẫn phía trên. Thông tin xác thực cầu nối không được thêm vào bản build; bản deploy Sites không tự nhận phiên ChatGPT trên máy. `npm run dev` tiếp tục dùng kết nối API như trước. Kiểm tra cầu nối bằng `npm run test:codex`.

Kiểm thử thực tế bằng `npm run test:codex:live` khi bản local chạy ở cổng 3011 (hoặc đặt `THINKUP_TEST_URL`). Lệnh này dùng hạn mức ChatGPT cho ba lượt phân tích, tạo tài khoản/bài/học phần có nhãn TEST và cần admin demo đã nạp. Không chạy cùng kiểm thử đơn vị thông thường.

### OpenAI API

Ứng dụng đã tích hợp OpenAI Responses API, Structured Outputs và đầu vào hình ảnh/PDF. **Chưa có khóa thì các thao tác AI không hoạt động**; không thay AI bằng phản hồi giả. Các thao tác viết/lưu/nộp bài, quản lý lớp, nhận xét giảng viên và thống kê vẫn hoạt động.

Trên máy, điền `OPENAI_API_KEY` vào `.dev.vars` (Cloudflare runtime) và giữ `.env` đồng bộ với `.env.example`; khởi động lại dev. Không đưa khóa vào giao diện hoặc mã nguồn. Giá trị `OPENAI_MODEL` mặc định là `gpt-4.1-mini`; có thể cấu hình model hỗ trợ văn bản, ảnh, PDF và Structured Outputs.

Khi triển khai Sites, thiết lập `OPENAI_API_KEY` như một secret và `OPENAI_MODEL` trong cấu hình môi trường của Sites. Nên dùng OpenAI Developers để tạo/kết nối khóa. Không gửi khóa trong chat. Việc triển khai không tự tạo hạn mức thanh toán API.

Nội dung bài chỉ được gửi khi sinh viên yêu cầu Coach/Feedback hoặc giảng viên yêu cầu phân tích bài đã nộp. Mặc định chỉ gửi văn bản; minh chứng được gửi nếu người dùng chủ động bật tùy chọn cho lần phân tích đó. API dùng `store:false`. Bài dưới 20 từ chưa được phân tích; mỗi người dùng có giới hạn 5 yêu cầu AI trong một phút, bao gồm lượt thất bại, được giữ chỗ trước khi gọi dịch vụ. Lỗi kết nối không tạo đánh giá hoặc làm mất bài. Đề xuất AI của giảng viên được gắn với phiên bản bài hiện tại, không tự đổi trạng thái hoặc điểm cuối.

Tài liệu API chính thức:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/images-vision

## Đăng nhập và quyền

Ứng dụng dùng tài khoản riêng bằng email và mật khẩu. `/` là trang giới thiệu, `/register` tạo tài khoản sinh viên, `/login` đăng nhập. Đăng nhập thành công mở `/admin`, `/lecturer` hoặc `/student` theo vai trò đọc từ database. Menu, hướng dẫn, trang mặc định và đường dẫn trực tiếp đều được giới hạn theo vai trò; admin có thêm màn hình bài nộp toàn hệ thống. Các trang làm việc xác thực và tải dữ liệu trên server trước khi hiển thị, tránh hiện thoáng qua giao diện sinh viên khi admin đăng nhập.

Người dùng tự đăng ký luôn nhận vai trò sinh viên, kể cả khi yêu cầu đăng ký tự gửi role admin/lecturer. Admin có thể tạo trực tiếp tài khoản sinh viên/giảng viên, thay đổi vai trò trong danh sách người dùng hoặc xác nhận phân công email sau khi người dùng đăng ký. Tạo trực tiếp lưu tài khoản, mật khẩu đã hash, phân công và nhật ký trong cùng một transaction; email trùng bị từ chối. Mật khẩu chỉ hiển thị trong bước hoàn tất form tạo, không lưu trong browser storage. Đăng ký không tự nhận quyền cao hơn từ một email chưa được xác minh. Quyền và trạng thái tài khoản được kiểm tra từ database ở mỗi yêu cầu; hạ quyền và tạm ngừng tác động tới cả phiên đang đăng nhập.

Để giữ tài khoản và dữ liệu từ bản cũ: chủ sở hữu Site mở **Kích hoạt tài khoản hiện có** (`/setup`), đặt mật khẩu cho danh tính đã được nền tảng xác thực. Không cho phép tự gắn mật khẩu vào một tài khoản cũ chỉ bằng cách nhập email. Luồng này giữ user ID, bài viết, vai trò và phân công hiện có. Site tiếp tục riêng tư theo thiết lập chia sẻ hiện tại; quyền mở Site và quyền của ứng dụng là hai lớp riêng.

Mật khẩu được hash bằng bcrypt với cost 12; kiểm tra giới hạn 72 byte để tránh cắt mật khẩu âm thầm. Phiên đăng nhập dùng token ngẫu nhiên 256 bit, chỉ lưu SHA-256 của token trong D1, hết hạn sau 7 ngày. Cookie HttpOnly, SameSite=Lax, Secure trên HTTPS. Đăng xuất xóa phiên khỏi database và cookie. API đăng nhập/đăng ký kiểm tra Origin và có giới hạn số lần thử; không gửi mật khẩu hoặc hash ra giao diện. Chưa bổ sung email xác minh hay quên mật khẩu qua email.

Để sử dụng với lớp thực tế cần cả hai bước: chủ sở hữu cho phép người dùng truy cập Site bằng cơ chế chia sẻ của Sites, và quản trị THINK UP phân công email/vai trò/học phần trong ứng dụng. Phân công email trong THINK UP không thay đổi quyền chia sẻ Site và không gửi thư tự động.

Sinh viên chỉ đọc/sửa bài của mình. Giảng viên chỉ xem bài đã nộp thuộc học phần được phân công. Quản trị viên quản lý hệ thống và bài đã nộp; không được tự chấm bài của chính mình. Minh chứng tải xuống cũng kiểm tra quyền trên server. Hạ vai trò hoặc ngừng tài khoản có hiệu lực ở lần yêu cầu tiếp theo.

Bài đã nộp/hoàn thành bị khóa sửa. Giảng viên trả bài để mở lại. Mỗi bước tạo snapshot riêng; chỉnh sửa rubric sau này không thay đổi các kết quả cũ. Chỉnh sửa đồng thời được kiểm tra bằng số revision, tránh ghi đè âm thầm.

## Rubric và phân loại Kember

Rubric hiện tuân theo hai tài liệu đã chốt trong `../Final_Requirements`: Độ sâu phản tư 35%, Chất lượng bằng chứng & bối cảnh 25%, Bài học rút ra 20%, Kế hoạch ứng dụng 20%. Bốn ô viết What / So what / Now what / Action là cấu trúc soạn bài riêng; AI đánh giá mỗi tiêu chí trên toàn bộ bài. Danh tính và trọng số tiêu chí cố định theo đặc tả; quản trị viên có thể điều chỉnh mô tả mức điểm.

Điểm tổng /10 = Depth × 0,35 + Evidence × 0,25 + Insight × 0,20 + Action × 0,20, làm tròn hai chữ số. Mỗi tiêu chí dùng thang 10 với một chữ số thập phân: Level 1 là 0–2,5; Level 2 là 2,6–5,0; Level 3 là 5,1–7,5; Level 4 là 7,6–10. Điểm lịch sử /4 và tổng điểm đã lưu giữ nguyên. Mức Kember gồm Chưa phản tư / Thấu hiểu / Phản tư / Phản tư phản biện; AI đọc toàn bài và phân loại bằng prompt + Structured Outputs, không suy ra mức từ điểm trung bình hay trọng số. Giảng viên chọn mức Kember riêng khi xác nhận đánh giá cuối.

Cấu hình rubric cũ được lưu trong `settings` trước khi nâng cấp; kết quả và bản rubric của các lần phân tích/chấm trước giữ nguyên. Các điểm tiêu chí cũ không được gán lại thành tiêu chí mới trong thống kê. Chi tiết ở [docs/criteria-spec.md](docs/criteria-spec.md).

Sau khi đã nạp demo cơ bản, chạy `npm run db:seed:criteria` để thêm một bài mẫu riêng ở **tuần 7** của `student@thinkup.local`. Bài hiển thị bốn tiêu chí mới, điểm mẫu 8,63/10 và mức Kember 3; đây là fixture để thử giao diện. Lệnh chạy lại giữ nguyên chỉnh sửa của bạn và không thay dữ liệu lịch sử.

Tuần hoàn thành khi có ít nhất một bài tuần đó được giảng viên xác nhận. Biểu đồ tuần lấy bài có đánh giá gần nhất; số liệu trung bình cuối chỉ lấy bài đã xác nhận. Đánh giá AI của nội dung cũ không được dùng làm điểm hiện tại sau khi sinh viên sửa bài.

## Kiểm tra

```bash
npm run typecheck
npm test
npm run build
npm run test:admin
npm run test:v15
THINKUP_TEST_URL=http://localhost:3000 npm run test:workflow
```

Kiểm thử workflow chỉ dùng trên local development; tạo học phần và người dùng có tiền tố TEST. Kiểm tra đăng ký/đăng nhập thật, chặn tự nhận quyền, Origin, menu và trang server cho ba vai trò, đường dẫn ngoài quyền, kích hoạt tài khoản cũ, xác nhận phân công, giới hạn số lần đăng nhập, hạ quyền/ngừng tài khoản và đăng xuất. Đồng thời kiểm tra bài nháp riêng tư, quyền minh chứng, giới hạn học phần, xung đột phiên bản, khóa bài nộp/cuối, trả bài/sửa/nộp lại, điểm giảng viên và xác nhận cam kết. Không gọi AI có trả phí trong kiểm thử.

## Lưu trữ và triển khai

`.openai/hosting.json` khai báo D1 `DB` và R2 `FILES`. Schema trong `db/schema.ts`; migration trong `drizzle/`. Worker chạy dưới Cloudflare với vinext/Sites. Runtime dùng prepared statements và các batch có kiểm tra revision. Nhật ký thay đổi quản trị/đánh giá được lưu trong bảng `audit`.

Khi sửa schema, chạy `npm run db:generate`, kiểm tra migration và build lại trước khi triển khai. Production có D1/R2 riêng; dữ liệu local và fixture kiểm thử không được chuyển lên.

Giao diện tham khảo Reflection.app: nền ngà nhẹ, màu tím trầm, font Manrope lưu tại dự án, menu nổi có nền mờ khi cuộn và footer nhiều cột. Trang giới thiệu có minh họa bốn phần reflection có thể bấm thử, hiệu ứng xuất hiện khi cuộn và FAQ thu gọn. Sinh viên, giảng viên và admin dùng chung màu sắc, nút, biểu mẫu và khoảng cách; menu mobile giữ nhãn, nút đăng xuất và liên kết thật. Hiệu ứng tắt khi người dùng chọn giảm chuyển động. Ảnh nhận diện liên kết hiện tại: `public/og-v2.png`, tạo bằng ImageGen tích hợp với motif nhật ký phản tư, đồng bộ bảng màu mới; ảnh cũ `public/og.png` được giữ lại. Chi tiết thiết kế và prompt trong `docs/design.md`.

Reflection Editor đã được kiểm tra trên Chrome headless ở desktop/mobile; Tư duy cùng AI qua Codex local đã được xác minh với ảnh được gửi tự động và bản viết chưa lưu. Để dùng cho lớp, cần chủ sở hữu phân công tài khoản/học phần và cấu hình nhà cung cấp AI phù hợp với môi trường triển khai.

Đã sửa F1–F6 của audit ngày 25/10; xem [kết quả và kiểm thử](docs/requirements-audit-2026-10-25.md). `npm run test:reading:live` là kiểm tra tùy chọn bằng tài khoản Codex/ChatGPT đang đăng nhập và sử dụng hạn mức gói.
