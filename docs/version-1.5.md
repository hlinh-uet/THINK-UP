> Tài liệu lịch sử. Bản hiện hành theo Final Requirements ngày 17/10/2026 nằm tại [final-requirements.md](final-requirements.md).

# THINK UP - cập nhật yêu cầu 1.5

Đối chiếu ngày 03/10/2026 với `../THINK UP_VER 1.5.pdf` và bản 1.0. Các phần mới trong tài liệu nằm ở trang 1, 6 và 8. Các luồng sinh viên đã có tiếp tục được sử dụng; phần cập nhật tập trung vào công cụ giảng viên ở giai đoạn 1.

| Nội dung mới | Cách triển khai |
| --- | --- |
| Ưu tiên giảng viên đánh giá và quản lý | Menu giảng viên có năm trang riêng: Bài nộp & đánh giá, Sinh viên, Tiến độ lớp, Kiểm tra trùng lặp, Học phần; bài viết có trang đọc/chấm riêng. Admin tiếp tục sử dụng công cụ trong khu vực bài nộp toàn hệ thống. |
| Nhận xét cuối dựa trên AI và đánh giá giảng viên | Giảng viên có thể yêu cầu AI đối chiếu rubric trên bài đã nộp, xem đề xuất hiện tại, chủ động lấy điểm đề xuất, sửa từng điểm và nhập nhận xét trước khi xác nhận. AI không thay đổi trạng thái hay điểm cuối. Đề xuất của nội dung/rubric cũ không được dùng để điền điểm mới. |
| Theo dõi tiến bộ từng sinh viên | Hồ sơ theo phạm vi học phần, số bài, revision, tuần học phần hoàn thành, điểm cuối trung bình, biểu đồ mức độ 9 tuần và điểm từng tiêu chí. Tuần chưa có đánh giá để trống. Khi có nhiều bài một tuần, biểu đồ sử dụng trung bình điểm cuối. |
| Nhận diện tiêu chí nhiều sinh viên còn yếu | Đếm sinh viên có điểm cuối trung bình một tiêu chí dưới 3/4, mỗi sinh viên tính một lần cho tiêu chí đó. Có thể mở hồ sơ từng sinh viên cần hỗ trợ. |
| Phát hiện trùng lặp giữa các sinh viên | So sánh văn bản bài đã nộp/hoàn thành trong học phần được phân công, hiển thị tỷ lệ từ trùng của từng bài và tối đa ba cặp đoạn nguyên văn. Có kiểm tra toàn phạm vi hoặc riêng bài đang đánh giá. |
| Cân nhắc chi phí đọc ảnh | Mặc định AI chỉ nhận bài viết. Sinh viên/giảng viên chủ động chọn gửi kèm minh chứng cho lần phân tích. R2 không được đọc và tệp không được gửi đến AI khi tùy chọn tắt. |
| Khảo sát sản phẩm tương tự và điểm khác biệt | Bảng so sánh theo nguồn chính thức bên dưới. |

## Phạm vi kiểm tra trùng lặp trong giai đoạn 1

- Lecturer: các học phần có phân công `lecturer`; có thể đối chiếu giữa các học phần này khi chọn tất cả. Admin: các học phần của THINK UP hiện tại. Sinh viên không gọi được API so sánh và không đọc được bài người khác.
- Chỉ trạng thái `submitted` và `final`; bỏ qua bài nháp, bài đang được trả về chỉnh sửa, bài không gắn học phần và các bài của cùng một tác giả. Chỉ so sánh bản hiện tại, không trộn revision của cùng bài.
- Chuẩn hóa Unicode, hoa/thường và dấu câu; đối chiếu cụm 5 từ liên tiếp trong từng phần bài viết. Bỏ qua cụm từ của câu hướng dẫn tuần. Mỗi từ chỉ tính một lần khi nhiều cụm chồng lên nhau.
- Bài cần tối thiểu 40 từ. Cặp được hiển thị nếu có ít nhất 8 cụm chung và ít nhất 10% từ của một bài trùng. Đây là ngưỡng vận hành ban đầu để lọc kết quả, chưa phải ngưỡng đã kiểm định để kết luận đạo văn.
- Hai tỷ lệ được tính riêng: từ trùng / tổng từ bài A, từ trùng / tổng từ bài B. Trích đoạn là nguyên văn bài gốc, giữ cả khi giao diện EN và dữ liệu demo gốc VN.
- Báo cáo kiểm tra theo yêu cầu, không gửi dữ liệu ra ngoài và không gọi AI. Kết quả nằm trong phiên giao diện, có thời điểm và phiên bản nguồn; thay đổi bài được đánh dấu cần kiểm tra lại. Nhật ký lưu người kiểm tra, phạm vi và số cặp, không lưu lại nội dung bài trong audit.
- Giới hạn 500 bài, 200.000 từ mỗi lần và hiển thị tối đa 200 cặp có tỷ lệ cao nhất; khi vượt giới hạn phải chọn phạm vi nhỏ hơn.
- Chưa có nguồn Internet, kho bài của trường khác, mô hình diễn đạt lại hoặc OCR để so sánh tệp ảnh/PDF. Trường/khoa/khóa chưa có trong mô hình dữ liệu, nên không mở rộng quyền bằng suy đoán các đơn vị này. Tích hợp kho ngoài cần nhà cung cấp và thỏa thuận sử dụng dữ liệu riêng.
- Tỷ lệ trùng là tín hiệu kiểm tra, không tự xác định đạo văn, không tự giảm điểm. Các trích dẫn đúng, bài nhóm hoặc hướng dẫn chung vẫn cần giảng viên xem xét bối cảnh.

## Khảo sát sản phẩm tương tự

Thông tin theo nguồn chính thức được kiểm tra ngày 03/10/2026; không khảo sát giá hay đưa kết luận độc quyền tính năng.

| Sản phẩm | Chức năng có liên quan | Hàm ý cho THINK UP |
| --- | --- | --- |
| [Turnitin Feedback Studio / Clarity](https://guides.turnitin.com/hc/en-us/articles/39931746071821-Understanding-your-Turnitin-license) | Feedback Studio có báo cáo similarity, công cụ chấm và phản hồi. Clarity là phần bổ sung cho phép theo dõi quá trình viết, phù hợp cả bài reflection. Các kho so sánh phụ thuộc loại giấy phép. | THINK UP hiện có kiểm tra nội bộ nhỏ hơn đáng kể về nguồn đối chiếu. Nếu cần kho Internet/liên trường, nên tích hợp dịch vụ chuyên dụng; không quảng bá bộ kiểm tra nội bộ như tương đương Turnitin. |
| [FeedbackFruits Assignment Review](https://help.feedbackfruits.com/hc/en-us/articles/23527086670226-Assignment-Review-Overview) | Giảng viên nhận bài, dùng tiêu chí/rubric để phản hồi, xem analytics hoặc xuất CSV. Có self-reflection sau feedback và có tích hợp Turnitin nếu cơ sở có giấy phép. | Quản lý bài và rubric đã là chức năng có trên thị trường. THINK UP cần thể hiện rõ vòng phản tư liên tục, thay đổi giữa các phiên bản và việc thực hiện cam kết. |
| [PebblePad](https://pebblepad.com/) | Nền tảng học tập, đánh giá và tương tác, với các hướng ứng dụng authentic assessment và portfolio. | Nên định vị THINK UP vào hoạt động reflection cụ thể và hành trình người học, thay vì gọi mọi chức năng theo dõi học tập là điểm khác biệt độc quyền. |

Điểm định vị đề xuất cho THINK UP là sự kết hợp: khung What / So what / Now what / Action, Coach chỉ gợi mở, snapshot của quá trình chỉnh sửa, rubric và điểm tính bằng quy tắc, giảng viên xác nhận cuối, hành trình 9 tuần và vòng Action → Review → Reflect again. Đây là diễn giải từ sản phẩm hiện tại và tài liệu yêu cầu; cần thử với giảng viên thực tế để xác minh giá trị, chưa phải bằng chứng duy nhất trên thị trường.

## Kiểm chứng

`npm test`: thuật toán đối chiếu, Unicode tiếng Việt, trích đoạn nguyên văn, bài ngắn, cùng tác giả, bỏ câu hướng dẫn, giới hạn báo cáo; thống kê điểm cuối; đề xuất AI cũ; không đọc/gửi tệp khi tắt minh chứng; bản dịch cho giao diện và lỗi mới.

`npm run test:v15`: dùng tài khoản thật và dữ liệu TEST local để kiểm tra hai lớp, năm trang menu Việt/Anh, URL chi tiết khi tải lại, chặn bài nháp/lớp ngoài quyền, hồ sơ sinh viên, trùng lặp, Origin, quyền yêu cầu AI, điểm ban đầu để trống, trả bài chỉ với nhận xét, xác nhận điểm/mức Kember và chỉnh cấu hình học phần không sửa lịch sử đánh giá. Không gọi AI có trả phí. Tài khoản, học phần và bài TEST được giữ lại để kiểm tra giao diện.

`npm run test:demo` và `npm run test:admin`: kiểm tra hồi quy các dữ liệu và chức năng từ phiên bản trước. `npm run typecheck`, lint các tệp mới và `npm run build` kiểm tra khả năng chạy.

Không thay schema, không xóa dữ liệu hiện có, không cần nạp lại seed. Kiểm thử API và HTML server không thay cho kiểm thử tương tác trình duyệt; kết quả từ dịch vụ AI thực tế chưa được kiểm chứng trong lần cập nhật này.
