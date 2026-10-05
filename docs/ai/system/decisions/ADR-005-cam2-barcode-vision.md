# ADR-005 — Cam 2 đọc mã bằng OpenCV + zxing-cpp, không chặn quy trình khi đọc thất bại

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §6.4, §12](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md), T-5) · FR-03.06, FR-03.07, BR-06, NFR-02, NFR-07, AC-04, EX-P6, RK-02 |

> **TL;DR** — Tiến trình `vision` lấy 2–5 khung/giây trong ROI khay, giải mã bằng zxing-cpp, khử nhiễu ≥ 2 khung, đẩy trạng thái khay lên Redis; lệch mã → phiên `MISMATCH`.
> Vì sao: phát hiện dán nhầm phiếu ngay tại bàn (P5) mà chạy được trên CPU, không cần huấn luyện mô hình.
> Đánh đổi lớn nhất: độ tin cậy phụ thuộc ánh sáng / góc lắp; khi Cam 2 hỏng phiên vẫn chạy với cờ `cam2_unverified`.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Cam 2 phải biết đơn nào đang được dán, đảm bảo khớp | Yêu cầu gốc, FR-03.06, FR-03.07, BR-06 |
| Thời gian nhận diện | ≤ 2 giây sau khi phiếu vào ROI (NFR-02) |
| Tỷ lệ cảnh báo đúng | ≥ 95% trong 40 tình huống, ánh sáng chuẩn (AC-04) |
| Camera | Đề xuất 4MP trở lên, nét cố định (NFR-07) |
| Quy mô | ≥ 4 station → ≥ 4 luồng Cam 2 trên một server (NFR-05) |
| Rủi ro | RK-02: ánh sáng, phiếu cong, che tay (mức Trung bình) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Đọc cả 1D và QR, kể cả mã xoay | Bắt buộc |
| Độ trễ nhận diện | ≤ 2 giây (NFR-02) |
| Chạy trên CPU server kho | Bắt buộc — không có GPU |
| Không chặn quy trình khi đọc thất bại | Bắt buộc (EX-P6) |
| Công phát triển | Thấp — không huấn luyện mô hình ở Phase 1 |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **OpenCV + zxing-cpp (chọn)** | Nhẹ, chạy CPU, đọc 1D + QR, binding Python chính thức | Phụ thuộc ánh sáng, góc đặt | Cần đèn cố định, ROI hẹp |
| pyzbar | Đơn giản | Đọc kém mã xoay | Rủi ro trượt AC-04 |
| Mô hình AI phát hiện phiếu | Linh hoạt | Tốn công huấn luyện | Để giai đoạn sau (SRS §13.2 giai đoạn 4) |
| Cam 2 chỉ quay làm bằng chứng | Rẻ | Không tự phát hiện dán nhầm | Trượt FR-03.06, FR-03.07 |

## Quyết định

Chọn **OpenCV + zxing-cpp** trong tiến trình `vision` (1 tiến trình, mỗi Cam 2 một luồng): lấy 2–5 khung/giây từ MediaMTX (sub-stream, hoặc main stream nếu spike S2 cho thấy sub-stream không đủ nét), cắt ROI khay, giải mã, khử nhiễu ≥ 2 khung liên tiếp, ghi `tray:{station_id}` (TTL ngắn) và publish `TRAY_CODE_SEEN` / `TRAY_EMPTY` / `TRAY_MULTIPLE_CODES` / `CAMERA_DOWN`. `api` đối chiếu với mã phiên → `MISMATCH` (BR-06). Cam 2 không đọc được → phiên vẫn chạy, gắn cờ `cam2_unverified`.

| Phương án bị loại | Lý do |
|---|---|
| pyzbar | Trượt tiêu chí đọc mã xoay |
| Mô hình AI | Trượt tiêu chí công phát triển Phase 1; giữ cho giai đoạn 4 |
| Chỉ quay làm bằng chứng | Không đáp ứng FR-03.06, FR-03.07 |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Phát hiện dán nhầm ngay tại bàn |
| Xấu / đánh đổi | Độ tin cậy phụ thuộc lắp đặt (đèn, độ cao, tiêu cự); CPU tăng theo số Cam 2 |
| Phải làm thêm | Spike S2 với camera thật (tỷ lệ đọc ≥ 95%, sub-stream có đủ không, CPU cho N camera). Item 01: đọc khay ngay lúc mở phiên để đặt `cam2_seen_match` (DEC-47); `tray.match = UNAVAILABLE` không chặn phiên (02-tech-spec §11) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Kết quả spike S2 (tỷ lệ đọc, CPU / camera) | Chưa có; T-4 (mua camera), T-5 thuộc M2 (cần xác nhận) |
| Xem lại khi | Tỷ lệ cảnh báo đúng < 95% (AC-04) sau khi tối ưu ánh sáng / ROI; hoặc độ trễ > 2 giây (NFR-02); hoặc CPU `vision` không đủ cho ≥ 4 Cam 2 trên một server |
