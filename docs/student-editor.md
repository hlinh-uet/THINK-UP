# Student Reflection Editor

Phần 1 của `THINK UP_VER 1.5.pdf` yêu cầu trình soạn thảo reflection, bối cảnh/minh chứng và AI gợi mở tư duy. Đặc tả không yêu cầu sinh viên nhập bốn phần bắt buộc. Bốn tiêu chí chấm rubric thuộc chức năng đánh giá riêng.

## Viết và đưa bối cảnh

Một vùng viết tự do, tiêu đề tùy chọn. Có thể viết trước, hỏi AI trước hoặc thêm ảnh, sơ đồ, sản phẩm, PDF/TXT làm bối cảnh. Học phần/tuần/chủ đề được thu gọn; reflection cá nhân không cần học phần. Nộp bài cho giảng viên cần học phần được phân công và nội dung không trống, không bắt buộc dùng AI.

Tự lưu sau 1,8 giây, giữ kiểm tra revision, lịch sử và bảo vệ thay đổi chưa lưu khi rời trang/đăng xuất. Bản đã nộp hoặc final chỉ đọc; bản được trả lại chỉnh sửa được. Giới hạn toàn bài 80.000 ký tự, minh chứng 3 tệp và 5 MB/tệp. Gửi minh chứng cho AI cần bật rõ ràng “Cho AI đọc minh chứng”.

Bài cũ vẫn giữ dữ liệu bốn trường và các phiên bản cũ. Editor hiển thị nội dung liền nhau, chuyển thành văn bản tự do khi người dùng sửa. Không tự ghi lại bài chỉ vì mở xem. Trang đọc của giảng viên và lịch sử vẫn nhận diện cấu trúc cũ; bài mới chỉ có một nội dung reflection. Xuất văn bản lấy toàn bài.

## Tư duy cùng AI

Khung bên phải có tiêu đề “Trợ lý phản tư của bạn” và ba tab: Tư duy cùng AI, AI Coach, Feedback & rubric. Tư duy mở sẵn trên desktop, xếp dưới editor trên mobile. Không có ô nhập prompt/chat. Sinh viên viết hoặc đưa minh chứng vào Editor rồi bấm “Tư duy cùng AI”; mở tab hoặc sửa bài không tự gọi model.

Mỗi lần bấm gửi bản viết tại thời điểm đó, kể cả ý mới chưa tự lưu, cùng toàn bộ ảnh/tài liệu đã upload cho bài. Nếu cả nội dung và tệp đều trống, nút yêu cầu thêm bối cảnh. Không yêu cầu tiêu đề hoặc 20 từ. Nút có trạng thái chờ riêng; vẫn viết và tự lưu trong lúc AI xử lý. Sửa tiếp không bị phản hồi ghi đè, và có nhắc gợi ý thuộc bối cảnh trước khi nội dung thay đổi trong cùng phiên.

System prompt `reflectionThinkingInstructions` tại `lib/reflection-chat-prompt.ts` chỉ định AI đọc snapshot hiện tại, nêu chi tiết đáng khám phá, đặt 1–3 câu hỏi gợi mở và một hướng phát triển tiếp. Nếu chỉ có ảnh/tài liệu, AI dùng những gì quan sát được để gợi ý điểm bắt đầu. Không viết đoạn reflection để chép, không bịa trải nghiệm, không chấm điểm/Kember, không trả báo cáo năm nhóm của Coach và không ép cấu trúc bốn phần. Không có nút chèn gợi ý vào bài.

API `/api/reflection-chat` với `mode=thinking` dùng yêu cầu cố định trên server, bỏ qua prompt do client gửi và không đưa lịch sử chat/gợi ý vào model. Các lần gợi ý lưu riêng trong `reflection_coach_turns`, chỉ chủ bài truy cập; không tạo analyses, điểm hoặc phiên bản bài viết. Hiện gợi ý gần nhất cùng lịch sử gợi ý trước đây. Các lượt chat cũ được giữ trong database để tương thích, không dùng làm bối cảnh cho tư duy mới.

Dùng chung giới hạn 5 yêu cầu AI/phút/người với AI Coach/Feedback. Mỗi bài chỉ có một lượt chờ, mã yêu cầu chống gọi lại khi retry đã hoàn tất; lượt chờ hết hạn sau 5 phút. Codex local và OpenAI Responses vẫn được hỗ trợ. Tư duy luôn đọc tệp của bài; checkbox minh chứng trong Editor chỉ điều khiển việc gửi tệp cho Coach/Feedback.

## AI Coach

AI Coach là chức năng riêng với Tư duy cùng AI. Thẻ AI Coach ở tổng quan mở trực tiếp tab Coach. Chuyển tab giữ nội dung đang viết và gợi ý đã nhận.

Coach đọc bản bài viết đã lưu, trả năm nhóm theo phần 2 của đặc tả: điểm mạnh, điểm cần phát triển, câu hỏi gợi mở, gợi ý hành động và mức độ phản tư. Nút “Nhận phản hồi từ AI Coach” gọi riêng `action=coach`; đọc riêng `analyses.kind=coach`, không dùng kết quả Feedback thay thế. Hiện mức phản tư, không hiện điểm rubric trong tab Coach. Cần ít nhất 20 từ, không cần tiêu đề hoặc bốn phần bắt buộc. Giữ cảnh báo kết quả cũ, kết quả demo và xác nhận hành động trước khi lưu cam kết.

## Feedback & rubric

Tab riêng đối chiếu toàn bài với Reflection Depth 35%, Evidence & Context Quality 25%, Insight Realized 20%, Action Plan 20%; Kember phân loại độc lập. Feedback cần ít nhất 20 từ, không cần tiêu đề. Giảng viên xác nhận đánh giá cuối. Tư duy cùng AI không tạo analyses, điểm, phiên bản bài viết hay cam kết; hành động vẫn cần người học tự xác nhận.

## Kiểm tra

- `npm test`: điều kiện viết/nộp, bản cũ, trạng thái khóa, render editor/tư duy, dịch thuật và các nghiệp vụ hiện có.
- `npm run test:codex`: schema tư duy/feedback độc lập, prompt không viết hộ, xác thực cầu nối, giới hạn file và xử lý lỗi.
- `npm run test:chat:live`: hai lần tư duy AI thật, tốn usage Codex đã đăng nhập; kiểm tra ảnh được đọc tự động khi bài trống, không cần prompt, bản viết chưa lưu, lưu đồng thời, retry, lịch sử riêng và nộp bài tự do. Chỉ chạy trên localhost.
- Kiểm thử Chrome headless riêng đã xác nhận bố cục desktop/mobile, không tràn ngang, bấm nút mới gọi AI, gửi đúng snapshot Editor, tiếp tục nhập bài khi chờ và giữ nội dung sau khi AI trả lời.
