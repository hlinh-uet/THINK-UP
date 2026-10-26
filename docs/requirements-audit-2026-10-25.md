# Đối chiếu và khắc phục THINK UP theo Final Requirements

Cập nhật ngày **25/10/2026** (Việt Nam), trên working tree hiện tại.

**Đã sửa cả sáu phát hiện F1–F6 của đợt audit và cập nhật bộ kiểm thử chính thức.** Các luồng cốt lõi giai đoạn 1–2 đã qua kiểm tra tự động. Không gọi đây là nghiệm thu đầy đủ tương tác desktop/mobile hoặc chất lượng sư phạm trên tập bài chấm độc lập.

## Nguồn và phạm vi

Nguồn chuẩn là hai DOCX sinh viên/giảng viên trong `../../Final_Requirements`. Đã đọc văn bản, bảng và tám comment (các comment là tài liệu tham khảo). Các đề xuất giai đoạn 3 được tách khỏi chức năng cốt lõi. Người dùng xác nhận **chưa dùng LMS**, nên không triển khai tích hợp với một hệ thống chưa được lựa chọn.

Kiểm tra trên mã frontend/backend, component React thật, HTTP với phiên đăng nhập thật, D1/R2 tạm, production build và một lượt AI Reading thật qua tài khoản ChatGPT/Codex sẵn có. Tài khoản, mật khẩu và bài viết đang dùng được giữ nguyên; mọi bản ghi TEST thuộc database riêng. Không gọi OpenAI API trả phí trong các lần kiểm tra này.

## Kết quả khắc phục

| Mã | Đã thay đổi | Bằng chứng hồi quy |
|---|---|---|
| F1 – AI Reading nội bộ lộ cho Student | Lọc tại truy vấn server theo người xem. Chỉ tác giả Lecturer còn phân công hoặc tác giả Admin nhận báo cáo; mặc định không trả Reading. Student và Admin khác không nhận phản hồi nháp. | `reading-privacy-workflow`: fixture chưa duyệt hiện cho tác giả; không xuất hiện trong API/SSR của Student, API của Admin khác; thu hồi phân công có tác dụng với phiên cũ. |
| F2 – Xóa mẫu sau hạ quyền | Kiểm tra role hiện tại, bản ghi thuộc người gọi và quyền giảng dạy học phần trước khi xóa. | `final-workflow`: Student 403; sau gỡ phân công 403; mẫu người khác 404; cấp lại phân công thì tác giả xóa thành công. |
| F3 – Chọn lớp và phân biệt học phần | Thêm bộ chọn lớp độc lập từ toàn bộ lớp được phân công; bỏ bộ lọc, xử lý lớp không còn phù hợp. CoursePicker hiện mã và tên lớp, kể cả khi hai lớp trùng tên/mã học phần. | `lecturer.test`: hai lớp cùng mã/tên, phạm vi phân công, hai ngôn ngữ, URL có lớp không hợp lệ vẫn có thao tác bỏ/chọn lớp. HTTP kiểm tra lọc cohort. |
| F4 – Coach thiếu nhóm khi GV đọc | Component lịch sử hiển thị strengths, development, questions, suggestedActions và mức phản tư; lý do/minh chứng khi có; phiên bản nguồn, cảnh báo nội dung đã thay đổi và các lượt thinking. | Render component thật với marker riêng của từng nhóm trong VN/EN; không có thao tác xác nhận cam kết thay sinh viên. |
| F5 – Reading thiếu căn cứ từng tiêu chí | Thêm đủ bốn rubric keys vào schema cố định dùng chung OpenAI/Codex. Mỗi tiêu chí có nhận định, trạng thái đủ/thiếu căn cứ, trích dẫn và section. Không cho dùng trích dẫn giả. Báo cáo lịch sử thiếu phần mới vẫn đọc được, nhắc phân tích lại. | Unit từ chối thiếu/trùng tiêu chí, trích dẫn giả, trạng thái supported không có minh chứng. AI thật qua bridge: đủ bốn tiêu chí, trích dẫn đúng, thiếu action plan được xác nhận insufficient. |
| F6 – So sánh giai đoạn thiếu mẫu số | Hiện hai trung bình gốc, số bài/SV có điểm và số bài/SV chưa có điểm cho từng giai đoạn cạnh delta. Đếm SV phân biệt, không đếm số bài thành số người. | Unit/SSR với hai bài của cùng SV, hai giai đoạn khác nhóm SV, một bài chưa chấm và một giai đoạn trống; không xuất NaN/Infinity. |

Mã chính: `lib/learning-store.ts`, `lib/server.ts`, `lib/workspace.ts`, `lib/learning-actions.ts`, `lib/reading.ts`, `lib/reading-ai.ts`, `lib/learning-analytics.ts`; `app/LecturerWorkspace.tsx`, `app/CoursePicker.tsx`, `app/LecturerCoachHistory.tsx`, `app/ReadingCriteria.tsx`, `app/LecturerReview.tsx`, `app/LecturerAnalytics.tsx`. Không đổi schema database hoặc viết lại điểm/snapshot lịch sử.

## Ma trận đối chiếu chức năng

“Đã có” dưới đây xác nhận chức năng và bằng chứng kỹ thuật trong phạm vi đã kiểm tra; không thay cho nghiệm thu chất lượng sư phạm của mô hình hoặc kiểm thử tương tác trình duyệt.

| Mã | Yêu cầu gốc | Kết quả | Bằng chứng chính |
|---|---|---|---|
| SV 2.1a | Tạo bài, cấu trúc gợi ý What / So what / Now what / Action | Đã có | `StudentReflectionEditor.tsx`; một vùng viết tự do và phần gợi ý. Tài liệu gọi đây là cấu trúc gợi ý, không bắt buộc bốn ô. |
| SV 2.1b | Minh chứng hình ảnh/sản phẩm/sơ đồ/dữ liệu | Đã có | Upload PNG/JPG/WebP/PDF/TXT, D1/R2, quyền tải tệp; `workflow`, `demo-workflow`, `final-workflow` phần minh chứng hành động. |
| SV 2.1c | Lưu nháp, sửa nhiều lần, mở phiên bản | Đã có | Autosave/lưu tay, revision chống ghi đè, bảng versions; unit editor và workflow. |
| SV 2.1d | Yêu cầu Coach/Feedback và nộp cho giảng viên | Đã có | Các action riêng trong `/api/thinkup`; bài đã nộp bị khóa, trả bài để sửa. |
| SV 2.2a | Năm nhóm AI Coach, mức phản tư và gợi mở phù hợp | Đã có ở sinh viên | `AICoachPanel.tsx`, `ReflectionGuidance.tsx`, prompt/schema; smoke test AI thật đã qua ở lượt trước trong cùng phiên làm việc. |
| SV 2.2b | AI không viết hộ, không tự thêm trải nghiệm/cảm xúc | Có hướng dẫn và kiểm tra cấu trúc; cần đánh giá nội dung | `coach-prompt.ts`, `reflection-chat-prompt.ts`; chưa có tập nghiệm thu sư phạm/adversarial đủ rộng để bảo đảm hành vi mô hình. |
| SV 2.3a | Bốn tiêu chí, trọng số 35/25/20/20 | Đã có và kiểm chứng | `domain.ts`, `criteria.test.mjs`, `domain.test.mjs`. |
| SV 2.3b | Level, điểm, minh chứng, lý do và cải thiện từng tiêu chí | Đã có và kiểm chứng | `feedback-schema.ts`, `AssessmentFields.tsx`, `FeedbackResults.tsx`; từ chối trích dẫn giả và điểm/Level không khớp. |
| SV 2.3c | So sánh kết quả các phiên bản | Đã có | `RevisionComparison.tsx`, `revision-diff.ts`, tests diff và final workflow về snapshot. |
| SV 2.3d | Phiếu tự đánh giá trước khi nộp | Đã có và kiểm chứng API | `SelfAssessment.tsx`; lưu riêng theo version/rubric, không thay điểm giảng viên. |
| SV 2.4a | Đúng chín trọng tâm tuần; giảng viên chỉnh chủ đề/câu hỏi/yêu cầu | Đã có | `domain.ts`, `LecturerCourses.tsx`, course-save và version15 workflow. |
| SV 2.4b | Xác nhận/điều chỉnh cam kết trước khi lưu | Đã có | `ActionEditor.tsx`, `CommitmentSheet.tsx`; không tự biến gợi ý AI thành cam kết. |
| SV 2.4c | Nhắc cam kết và kết quả ở bài tiếp theo | Đã có và kiểm chứng logic | `journey.ts`, `ReflectionActionReminder.tsx`, `CommitmentSheet.tsx`; cùng học phần, có cả cam kết đã hoàn thành. |
| SV 2.4d | Chu trình bài viết → bài học → hành động → nhìn lại → bài tiếp nối | Đã có | Cam kết có nguồn, hạn, kết quả, minh chứng, trạng thái và liên kết reflection tiếp nối; final workflow chính thức đã qua với kiểm tra API và nhãn giao diện hiện tại. |
| SV 2.5a | Số bài, revision, hành trình, điểm tiêu chí và mức phản tư qua thời gian | Đã có | `StudentProgress.tsx`, `progress.ts`, `LearningAnalytics.tsx`; thống kê từ dữ liệu đã lưu. |
| SV 2.5b | Điểm mạnh thường xuyên, điểm cần cải thiện, tình trạng hành động | Đã có | Điểm mạnh cần ít nhất ba bài có điểm tương ứng; hành động có trạng thái/kết quả. |
| SV 2.5c | So sánh nháp/sửa/cuối và hồ sơ minh chứng phát triển | Đã có | Portfolio, lịch sử, diff, điểm giữ thang/rubric gốc. |
| GV 2.1a | Danh sách lớp/học phần/sinh viên/bài; ưu tiên xử lý | Đã có | Overview, submissions, students, course roster, pending/returned và thứ tự chờ lâu. |
| GV 2.1b | Chưa bắt đầu/nháp/đang sửa/đã nộp/chờ duyệt/hoàn tất | Đã có | Ma trận chín tuần dùng metadata participation; submitted thể hiện là chờ duyệt. Không cung cấp nội dung nháp riêng tư. |
| GV 2.1c | Tìm/lọc/sắp xếp theo SV, lớp, học phần, tuần, trạng thái, tiêu chí | Đã sửa F3 | Bộ chọn lớp độc lập, xóa bộ lọc và nhãn tên lớp trong từng học phần; có kiểm thử hai lớp cùng tên/mã. |
| GV 2.1d | Xem Coach và quá trình AI hỗ trợ | Đã sửa F4 | Hiển thị đủ bốn nhóm gợi mở và mức phản tư, lý do/minh chứng khi có; giữ phiên bản nguồn và lịch sử Tư duy cùng AI. |
| GV 2.2a | Tóm tắt, suy nghĩ/nguyên nhân, bài học/hành động, thiếu sót, mở đoạn gốc | Đã có | Schema Reading riêng, kiểm tra trích dẫn, highlight; kiểm tra AI thật ngày 25/10 đã qua với schema mới. |
| GV 2.2b | Trích dẫn liên quan đến từng tiêu chí rubric | Đã sửa F5 | Schema và UI có đủ bốn tiêu chí; trích dẫn nguyên văn hoặc ghi rõ thiếu căn cứ. Báo cáo cũ vẫn đọc được và nhắc phân tích lại. |
| GV 2.3a | AI đề xuất Level/điểm/căn cứ/giải thích/cải thiện; GV xác nhận | Đã có và kiểm chứng | Phiếu bốn tiêu chí, điểm thập phân, không điền mặc định, validate server và final workflow. |
| GV 2.3b | Tính trọng số cố định; AI và GV lưu riêng, không ghi đè | Đã có và kiểm chứng | `analyses`, `reviews`, `review-detail`, rubric snapshots; từ chối sourceVersion/rubricVersion cũ. |
| GV 2.4a | Soạn nhận xét năm phần, dùng gợi ý và mẫu theo tiêu chí/học phần | Đã có | Composer, AI Reading feedback và thư viện mẫu. Quyền xóa mẫu kiểm tra lại role, chủ sở hữu và phân công hiện tại (F2). |
| GV 2.4b | Lưu nháp và chủ động quyết định thời điểm gửi | Đã sửa F1 | `review-draft` và AI Reading chưa duyệt chỉ trả cho chính người tạo còn quyền; Student chỉ nhận nhận xét GV đã phát hành. |
| GV 2.5 | Mở từng phiên bản, diff thêm/xóa, điểm từng bản và theo dõi sửa bài | Đã có | `LecturerReview.tsx` và `revision-diff.ts`; không suy điểm cho bản chưa được chấm. Chưa nghiệm thu thao tác click trên browser; kiểm tra UI bằng render component thật và HTTP. |
| GV 2.6a | Nộp theo tuần, chờ duyệt, trung bình tiêu chí, Level, mức thấp, hành động, khó khăn | Đã có phần chính | `LecturerAnalytics.tsx`, `learning-analytics.ts`; số liệu tính xác định, không nhờ AI dựng thống kê. |
| GV 2.6b | So sánh giai đoạn và hiển thị căn cứ/missing data | Đã sửa F6 | Hiện trung bình, số bài/SV có điểm, số bài/SV chưa có điểm của từng giai đoạn, cạnh delta; thiếu dữ liệu hiện —. |
| GV 2.7 | Hành động, nguồn, hạn, tiêu chí hoàn thành, bốn trạng thái, minh chứng/tiếp nối | Đã có và kiểm chứng | `LecturerActions.tsx`, teachingExtras, action-evidence; không tự hạ điểm reflection khi hành động chưa xong. |
| GV 2.8 | So khớp nội bộ, đoạn trùng và nguồn để GV xem xét | Đã có ở phạm vi nội bộ | `similarity.ts`, `SimilarityPanel.tsx`, version15 workflow; không kết luận tự động đạo văn. |
| GV 2.9a | Student chỉ bài mình; Lecturer đúng phân công; Admin quản trị | Đã sửa F1/F2 và kiểm chứng | HTTP/SSR chặn phản hồi Reading chưa duyệt; 403 khi xóa mẫu sau hạ role hoặc gỡ phân công; xóa mẫu của người khác bị 404. |
| GV 2.9b | Audit, chính sách lưu/xóa và xử lý sự cố | Đã có ở mức phần mềm/chính sách | Governance, retention-save, incident-save, archive/restore và audit; thao tác hạ tầng/xóa thật chưa nghiệm thu. |
| Chung | Hai giao diện dùng chung bài, rubric, dữ liệu và quyền GV quyết định cuối | Đã có | Cùng D1/R2, schema và endpoint, proposal/review tách riêng. |
| Rubric | Thang /10; khoảng 0–2,5 / 2,6–5 / 5,1–7,5 / 7,6–10; không ép điểm cố định theo Level | Đã có và kiểm chứng | `assessment.ts`, `domain.ts`, tests boundary và final assessment 7,93/10. |
| Rubric | Thiếu căn cứ phải yêu cầu xem xét; không suy đoán | Đã có kiểm tra kỹ thuật | AI score/level null, tổng null; giảng viên cần căn cứ hoặc ghi rõ thành phần thiếu ở Level 1. |

## Kiểm thử sau sửa

| Kiểm tra | Kết quả |
|---|---|
| `npm test` | 76/76 qua; có kiểm tra mới cho Coach, Reading, lớp cùng mã/tên, và căn cứ giai đoạn. |
| `npm run test:integration` | 9/9 workflow qua nguyên trạng trong repository, gồm privacy Reading và các workflow quản trị, auth, grading, cam kết, messaging, profile. |
| `npm run test:codex` | 10/10 qua; giữ schema Reading cố định, không nhận schema tùy ý của client. |
| `npm run test:host` | 5/5 qua. |
| `npm run test:reading:live` | 1/1 qua bằng Codex/ChatGPT sẵn đăng nhập (`gpt-5.6-luna`), không API key; fixture tổng hợp không chứa dữ liệu người dùng. |
| `npm run typecheck`, `npm run lint`, `npm run build` | Qua. |

Các assertion branding/h1/nhãn cũ đã cập nhật theo giao diện hiện tại, giữ kiểm tra hành vi và quyền. Kiểm tra demo song ngữ chuyển tới thư viện bài và hành trình, nơi nội dung đó thực sự được hiển thị. Không bỏ kiểm tra quyền/điểm để làm suite xanh.

## Phần mở rộng và giới hạn nghiệm thu

- **LMS:** chưa dùng theo xác nhận của người dùng; để giai đoạn mở rộng.
- **Tương đồng bên ngoài:** chưa kết nối dịch vụ ngoài; so khớp nội bộ đã có, phù hợp phạm vi dữ liệu được phép truy cập.
- **Nhiều lớp/học phần:** bộ lọc lớp đã hoàn thiện, báo cáo/CSV dùng phạm vi phân công hiện tại.
- **Chất lượng AI:** lượt Reading thật xác nhận đường kết nối và cấu trúc/căn cứ của một mẫu. Coach/Feedback/Thinking đã có smoke test thật ở lượt trước. Chưa thay thế nghiên cứu hiệu chuẩn trên tập bài GV chấm độc lập theo khuyến nghị GV 3.2.
- **Giao diện tương tác:** hai lần thử Chrome trong đợt sửa vẫn báo Computer Use đang chờ Accessibility/Screen Recording. Chưa có nghiệm thu click/screenshot desktop-mobile; SSR và HTTP đã qua.
- **Vận hành:** retention, archive/restore, audit, incidents đã qua HTTP. Không tự xóa dữ liệu và không thao tác backup/khôi phục/xóa vĩnh viễn trên dữ liệu thật. Đây là giới hạn xác minh vận hành, không phải tuyên bố đã thực hiện các thao tác đó.

Bản audit trước sửa được giữ ở `work/requirements-audit/audit-before-fixes.md` (nội bộ, ignored). Database tích hợp gần nhất: thư mục tạm `thinkup-integration-BohzBg`; server tạm được dừng sau suite. Database đang dùng không bị thay bằng fixture.
