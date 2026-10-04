# ADR-007 — Tích hợp sàn qua adapter, polling là nền, webhook là bổ sung

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §10](../architecture.md)) |

## Bối cảnh
Giai đoạn đầu chỉ Shopee, sau thêm TikTok Shop, Lazada (FR-05.07). Server tại kho không mở port inbound.

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **Adapter + polling, webhook tùy chọn (chọn)** | Chạy được không cần inbound, dễ thêm sàn | Trễ vài phút |
| Chỉ webhook | Gần realtime | Cần public endpoint, mất sự kiện khi offline |
| Qua phần mềm bán hàng trung gian | Một API cho nhiều sàn | Phụ thuộc bên thứ ba (tùy Q4) |

## Quyết định
Interface `PlatformAdapter` trong module `platforms`. Celery Beat polling 5–15 phút. Webhook chỉ bật khi có tunnel.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: lõi không biết sàn cụ thể.
- Phải làm thêm: spike S1 xác minh endpoint Shopee.
