# ADR-004 — Logic phiên chạy đồng bộ trong api, việc nặng qua Celery

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §3.2, §7.1](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md) §8, API-11) · NFR-01, NFR-03, AC-01 |

> **TL;DR** — `POST /station/scan` mở / đóng phiên ngay trong tiến trình `api` (ghi DB + đọc khay Cam 2 từ Redis); cắt clip, đồng bộ sàn, đối soát, dọn dữ liệu chạy trên Celery worker.
> Vì sao: quét phải phản hồi ≤ 1 giây (NFR-01) trong khi cắt clip mất hàng chục giây.
> Đánh đổi lớn nhất: logic nằm ở hai nơi (api + worker), job phải idempotent.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Phản hồi quét | ≤ 1 giây với đơn đã đồng bộ, ≤ 3 giây khi phải tra API (NFR-01); nghiệm thu 50 đơn liên tiếp (AC-01) |
| Tra Shopee tức thời khi quét | Timeout cứng 2 giây, quá hạn mở phiên "chưa xác minh" (architecture.md §10.2, EX-P3) |
| Cắt clip | Hàng chục giây; phải xong ≤ 60 giây (NFR-03) |
| Ràng buộc 1 phiên mở / station | BR-02 — partial unique index ở DB |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Độ trễ API scan | ≤ 1 giây p95 (NFR-01) |
| Việc nặng không chặn quét | Bắt buộc |
| Chịu crash | Job không mất, chạy lại an toàn (architecture.md §12) |
| Độ phức tạp | Thấp |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **Phiên trong api, clip qua Celery (chọn)** | Phản hồi tức thì; việc nặng không chặn | Hai nơi xử lý | Phải viết job idempotent |
| Toàn bộ qua queue | Đồng nhất | Thêm độ trễ hàng đợi cho thao tác quét | Rủi ro trượt NFR-01 khi queue dài |

## Quyết định

Chọn **phiên trong `api`**: `POST /station/scan` (API-11) xử lý mở / đóng phiên trực tiếp — ghi DB + đọc trạng thái khay từ Redis, không gọi worker (02-tech-spec §8). Cắt clip, đồng bộ sàn, đối soát, dọn dữ liệu chạy trên Celery worker (queue `video` và `default`).

| Phương án bị loại | Lý do |
|---|---|
| Toàn bộ qua queue | Thêm một chặng hàng đợi vào đường đi quét → rủi ro trượt NFR-01; không có lợi ích ở 1–4 station |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Phản hồi nhanh; `api` crash thì phiên đang mở vẫn ở DB, khôi phục nguyên trạng |
| Xấu / đánh đổi | Hai nơi xử lý; trạng thái phiên và clip lệch nhau vài chục giây (clip `READY` sau) |
| Phải làm thêm | Job cắt clip idempotent theo `session_id`; API-11 idempotent theo `client_scan_id` giữ 10 phút (DEC-29 item 01); metric độ trễ API-11 p95 (02-tech-spec §8) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Số đo p95 thực tế của API-11 trên phần cứng kho | Chưa có (cần xác nhận khi chạy thử 1 station) |
| Xem lại khi | p95 API-11 > 1 giây với đơn đã đồng bộ; hoặc số station > 4 cần nhiều bản `api` (khi đó dựa vào Redis pub/sub và unique index, không đổi mô hình) |
