# ADR-005 — Cam 2 đọc mã bằng OpenCV + zxing-cpp, không chặn quy trình khi đọc thất bại

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §6.4](../architecture.md)) |

## Bối cảnh
Cam 2 phải biết đơn nào đang được dán và đảm bảo thông tin trùng khớp (yêu cầu gốc, FR-03.06, FR-03.07).

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **OpenCV + zxing-cpp (chọn)** | Nhẹ, chạy CPU, đọc 1D + QR | Phụ thuộc ánh sáng, góc đặt |
| pyzbar | Đơn giản | Đọc kém mã xoay |
| Mô hình AI phát hiện phiếu | Linh hoạt | Tốn công huấn luyện, để giai đoạn sau |
| Cam 2 chỉ quay làm bằng chứng | Rẻ | Không tự phát hiện dán nhầm |

## Quyết định
Tiến trình `vision` lấy 2–5 khung/giây trong ROI, giải mã bằng zxing-cpp, khử nhiễu ≥ 2 khung liên tiếp, đẩy trạng thái khay lên Redis. Khi Cam 2 không đọc được, phiên vẫn chạy, gắn cờ `cam2_unverified`.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: phát hiện dán nhầm ngay.
- Xấu: độ tin cậy phụ thuộc lắp đặt.
- Phải làm thêm: spike S2 với camera thật.
