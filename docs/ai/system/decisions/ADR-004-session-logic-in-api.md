# ADR-004 — Logic phiên chạy đồng bộ trong api, việc nặng qua Celery

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §3.2, §7.1](../architecture.md)) |

## Bối cảnh
Quét mã phải phản hồi ≤ 1 giây (NFR-01), cắt clip có thể mất hàng chục giây.

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **Phiên trong api, clip qua Celery (chọn)** | Phản hồi tức thì, việc nặng không chặn | Hai nơi xử lý |
| Toàn bộ qua queue | Đồng nhất | Thêm độ trễ cho thao tác quét |

## Quyết định
`POST /station/scan` xử lý mở/đóng phiên trực tiếp trong `api` (ghi DB + đọc trạng thái khay từ Redis). Cắt clip, đồng bộ sàn, đối soát, dọn dữ liệu chạy trên Celery worker.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: phản hồi nhanh.
- Phải làm thêm: job cắt clip idempotent theo `session_id`.
