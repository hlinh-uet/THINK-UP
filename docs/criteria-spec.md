# Rubric hiện hành

Chuẩn hiện hành là hai tài liệu trong `../../Final_Requirements`, áp dụng từ 17/10/2026. Xem [triển khai cuối](final-requirements.md) cho Level, điểm /10, trạng thái thiếu căn cứ, phiếu GV/SV và cách bảo toàn điểm lịch sử.

## Ghi chú lịch sử của rubric 1.5

Nội dung dưới đây mô tả bản cũ /4 theo PDF; không áp dụng cho các lượt chấm mới.

# AI Feedback & Rubric Specification

Nguồn yêu cầu: `AI Feedback & Rubric Specification Criteria.pdf`, hai trang. Cập nhật này bổ sung rubric chi tiết cho bản THINK UP 1.5.

## Tiêu chí và mức điểm

| Tiêu chí | Trọng số | Mức 1 | Mức 2 | Mức 3 | Mức 4 |
| --- | --- | --- | --- | --- | --- |
| Reflection Depth | 35% | Chỉ mô tả sự kiện | Phân tích cảm xúc/vấn đề còn bề nổi | Tìm nguyên nhân, liên hệ kinh nghiệm, nhận ra điểm mạnh/yếu | Xem xét đa chiều, chất vấn giả định, hình thành góc nhìn mới |
| Evidence & Context Quality | 25% | Chung chung, thiếu bối cảnh | Nêu sự việc nhưng ví dụ mơ hồ | Tình huống, chi tiết hoặc hội thoại cụ thể | Minh chứng rõ bằng tình huống, dữ liệu, sơ đồ/ảnh sản phẩm |
| Insight Realized | 20% | Không có bài học hoặc sáo rỗng | Bài học chưa liên kết trải nghiệm | Bài học cụ thể về tư duy/thái độ/kỹ năng | Nguyên tắc khái quát áp dụng cho tương lai |
| Action Plan | 20% | Không có kế hoạch | Chung chung hoặc thiếu khả thi | Bước cụ thể thực hiện tuần tiếp theo | SMART: rõ ràng, đo lường được, có thời hạn và khả thi |

Các tiêu chí có ID riêng `reflectionDepth`, `evidenceContext`, `insight`, `actionPlan`. Bốn ô viết `what`, `soWhat`, `nowWhat`, `action` giữ nguyên. Một minh chứng cho tiêu chí có thể nằm ở bất kỳ ô viết nào, không ràng buộc một ô với một tiêu chí. Danh tính và trọng số tiêu chí cố định theo PDF; mô tả có thể điều chỉnh trên admin/học phần.

## Phân loại Kember độc lập

AI đọc toàn bộ bài và trả kết quả có cấu trúc gồm `level`, `levelReason`, `levelEvidence`:

1. Non-Reflection: chỉ mô tả sự việc.
2. Understanding: hiểu sự việc/lý thuyết, chưa liên hệ bản thân.
3. Reflection: nhận ra bài học và ảnh hưởng với bản thân.
4. Critical Reflection: thay đổi góc nhìn/nhận thức cốt lõi.

Prompt không sử dụng ngưỡng trung bình hay trọng số để suy ra mức Kember. Server yêu cầu mức nguyên 1–4, lý do và trích đoạn nguyên văn có trong bài; kết quả thiếu căn cứ không được lưu. Việc kiểm tra trích dẫn chỉ xác nhận nguồn, không bảo đảm phân loại ngữ nghĩa đúng. Giảng viên có thể nhận đề xuất AI, sửa điểm và chọn mức Kember riêng; xác nhận cuối cần chọn mức này rõ ràng.

## Điểm và căn cứ

`Weighted Score /4 = Depth × 0.35 + Evidence × 0.25 + Insight × 0.20 + Action × 0.20`.

`Overall Score /10 = Weighted Score /4 × 10`.

Server tính điểm từ bốn điểm nguyên 1–4, không tin tổng điểm AI gửi. Ví dụ `[2, 4, 2, 4]` có điểm có trọng số 2,9/4, tổng 7,25/10; mức Kember có thể là 2 tùy ngữ nghĩa của bài.

Mỗi tiêu chí yêu cầu trích dẫn từ bài. Nếu thiếu minh chứng hợp lệ, điểm tiêu chí được đưa về 1 và hiển thị thông báo. Riêng Evidence & Context có thể dựa trên tệp đã thực sự gửi cho AI: lưu tên tệp làm căn cứ, không giả lập trích dẫn văn bản từ ảnh. Tệp được gửi khi người dùng bật tùy chọn; mặc định chỉ đọc bài viết.

## Dữ liệu hiện có và kiểm thử

Live rubric cũ có các ID ô viết được nâng cấp khi khởi tạo ứng dụng. Bản cấu hình cũ được lưu tại `rubric-archive:system:v1` và `rubric-archive:course:<id>:v1` trong settings. Không cập nhật analyses, reviews hay snapshot lịch sử; giao diện thông báo khi xem rubric cũ. Thống kê theo tiêu chí nối bằng ID, không đổi tên điểm cũ theo vị trí. Không cần thay schema database.

`npm run db:seed:criteria` thêm một bài mẫu tuần 7 riêng, không ghi đè bộ demo cũ; marker riêng giúp chạy lại mà giữ nguyên chỉnh sửa. Feedback có provider `Demo fixture` và phương thức `demo-classification` để phân biệt kết quả mẫu với `ai-classification` thật.

Unit tests kiểm tra tiêu chí/trọng số, schema, điểm, phân loại độc lập, trích dẫn xuyên ô viết, căn cứ tệp và dữ liệu cũ. D1/R2 tests kiểm tra nâng cấp, archive, bảo toàn snapshot và seed lặp. Workflow local kiểm tra giảng viên bắt buộc chọn mức Kember, điểm có trọng số và quyền theo học phần. Các kiểm thử không gọi dịch vụ AI có trả phí; độ chính xác phân loại thực tế cần đánh giá bằng bài đã được giảng viên gán nhãn.
