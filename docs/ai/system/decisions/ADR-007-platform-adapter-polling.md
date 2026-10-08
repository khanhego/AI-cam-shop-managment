# ADR-007 — Tích hợp sàn qua adapter, polling là nền, webhook là bổ sung

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §1 P7, §7.3, §10](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md)) · FR-05.07, NFR-09, NFR-28, CO-03, RK-01, RK-07 |

> **TL;DR** — Interface `PlatformAdapter` trong module `platforms`; Celery Beat polling 5–15 phút là nền, webhook chỉ bật khi có tunnel.
> Vì sao: server kho không mở port inbound và phải chạy khi mất Internet; thêm sàn = thêm adapter (NFR-28).
> Đánh đổi lớn nhất: trạng thái sàn trễ 5–15 phút so với realtime.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Sàn | Phase 1 chỉ Shopee; sau thêm TikTok Shop, Lazada (FR-05.07, SRS §13.2) |
| Mạng | Server kho chỉ outbound, không mở port inbound (architecture.md §3.3) |
| Offline | Mất Internet vẫn đóng gói; đồng bộ lại khi có mạng (NFR-09, AC-09) |
| Thêm sàn | Không sửa lõi (NFR-28) |
| API sàn thay đổi | CO-03, RK-07 (Trung bình) |
| Chưa chắc có quyền Shopee | RK-01 (Cao) → dự phòng nhập CSV (DEC-2 item 01) |
| Tra cứu khi quét | Timeout 2 giây, quá hạn mở phiên "chưa xác minh" (EX-P3) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Không cần endpoint public | Bắt buộc |
| Không mất sự kiện khi offline | Bắt buộc — đồng bộ bù theo `update_time` |
| Thêm sàn không sửa lõi | Bắt buộc (NFR-28) |
| Độ trễ trạng thái sàn | Chấp nhận ≤ 15 phút (đơn 5 phút, vận chuyển / hoàn 15 phút) |
| Phụ thuộc bên thứ ba | Thấp |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **Adapter + polling, webhook tùy chọn (chọn)** | Chạy không cần inbound; dễ thêm sàn | Trễ vài phút | Tốn quota API theo chu kỳ — cần token bucket theo shop |
| Chỉ webhook | Gần realtime | Cần public endpoint; mất sự kiện khi offline | Trượt 2 tiêu chí bắt buộc |
| Qua phần mềm bán hàng trung gian (KiotViet, Sapo, Pancake…) | Một API cho nhiều sàn | Phụ thuộc bên thứ ba | Tùy câu trả lời SRS Q4 |

## Quyết định

Chọn **adapter + polling**: interface `PlatformAdapter` (auth, refresh, `list_updated_orders`, `find_by_tracking`, `get_shipping_status`, `list_returns`, `map_status`) trong module `platforms`; lõi chỉ dùng model chung `PlatformOrder`, `PlatformReturn`. Celery Beat polling: `sync_orders` 5 phút / shop, `sync_shipping_status` 15 phút, `sync_returns` 15 phút, `refresh_tokens` 1 giờ. Webhook `POST /api/v1/webhooks/{platform}` chỉ bật khi đã có tunnel. Lỗi: tenacity retry tối đa 5 lần, token bucket theo shop trong Redis.

| Phương án bị loại | Lý do |
|---|---|
| Chỉ webhook | Cần public endpoint và mất sự kiện khi offline |
| Phần mềm trung gian | Phụ thuộc bên thứ ba; chưa biết shop có dùng (Q4) — có thể thành một adapter sau này mà không đổi lõi |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Lõi không biết sàn cụ thể; payload gốc lưu `raw_payload jsonb` để soát khi API đổi |
| Xấu / đánh đổi | Trạng thái sàn trễ 5–15 phút; tốn quota API kể cả khi không có thay đổi |
| Phải làm thêm | Spike S1 xác minh endpoint Shopee, quyền, push, rate limit. Item 01: `SHOPEE_ENABLED=false` + nhập CSV + adapter mock khi chưa có quyền (02-tech-spec §11) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Shopee có push / webhook không, rate limit bao nhiêu | Chờ spike S1 và kết quả đăng ký (T-3) (cần xác nhận) |
| Shop có dùng phần mềm bán hàng trung gian không (Q4) | Cần xác nhận với chủ shop |
| Xem lại khi | Nghiệp vụ cần trạng thái sàn trễ < 5 phút; hoặc polling chạm rate limit của sàn; hoặc đã có tunnel ổn định → bật webhook làm đường chính, polling làm bù |

## Liên quan

- 2026-10-06 (item 03): [ADR-011](ADR-011-multi-platform-shops-status-groups.md) bổ sung — nhiều sàn / nhiều shop, nhóm trạng thái chung, job một task / shop. Polling vẫn là nền.
