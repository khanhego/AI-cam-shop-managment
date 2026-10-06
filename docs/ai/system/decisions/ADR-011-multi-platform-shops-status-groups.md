# ADR-011 — Nhiều sàn, nhiều shop: adapter theo sàn của shop, nhóm trạng thái chung, mã đơn duy nhất trong shop

| | |
|---|---|
| Trạng thái | Proposed (2026-10-06, item 03 bước 3 — chờ G2). Bổ sung (không thay) [ADR-007](ADR-007-platform-adapter-polling.md) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt (review bước 5) |
| Người chốt | khanhtt (tự quyết theo ủy quyền user — DEC-429..436 trong [02 item 03](../../items/03-expansion-tiktok/02-tech-spec.md)) |
| Ngày | 2026-10-06 |
| Work item / yêu cầu | [item 03](../../items/03-expansion-tiktok/01-srs.md) · FR-05.07, 05.13..22, NFR-01, NFR-28, NFR-39 · BR-29..32 · DEC-402..404 |

> **TL;DR** — Mỗi shop mang sàn của nó; job và tra mã chọn adapter theo `shop.platform`. Adapter quy trạng thái sàn về **nhóm trạng thái chung** (đơn: 8 nhóm; yêu cầu trả: 5 nhóm), lưu cạnh chữ gốc; lõi (chặn hủy, đối soát, bàn hoàn, báo cáo) chỉ đọc nhóm. Mã đơn duy nhất **trong một shop**; mã vận đơn vẫn duy nhất toàn hệ thống. Job đồng bộ tách **một task / shop** có ngân sách thời gian.
> Vì sao: thêm TikTok (và sàn sau) không sửa lõi; một shop lỗi không kéo shop khác.
> Đánh đổi lớn nhất: migration bỏ unique toàn cục của mã đơn — downgrade bị chặn khi đã có mã trùng giữa hai shop.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Một sàn, một shop | `orders/models.py:11` `PLATFORMS = ("SHOPEE",)`; `platforms/service.py:341-351` kết nối shop mới ngắt shop cũ (DEC-12 item 01); `orders/models.py:61-62` mã đơn unique toàn cục |
| Lõi dùng chữ Shopee | `platforms/base.py:9` `CANCELLED_STATUSES`; `reconciliation/rules.py:32` `SHIPPED_PLATFORM_STATUSES`; `returns/service.py:52`, `:83` `AWAITING_ACCEPT_STATUSES`; `platforms/sync.py:204` `TO_RETURN`; `sessions/service.py:156` `platform="SHOPEE"` |
| Một adapter cho cả hệ thống | `platforms/service.py:146` `get_adapter()`; J-05 / J-06 dùng token một shop (`lookup_target`, `service.py:210`) |
| TikTok: một lần ủy quyền cho nhiều shop, token theo người bán, mỗi shop có `shop_cipher` | Tài liệu công khai TikTok Shop Partner API — **chưa xác minh (Q18, Q19)** |
| Quét mã lạ ≤ 3 giây p95 khi phải tra sàn | NFR-01; BR-32 (song song, cắt 2 giây) |
| Một shop lỗi không trễ shop khác quá 1 chu kỳ | NFR-39 |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Không có chữ trạng thái riêng của sàn ngoài `platforms/<sàn>/` | Bắt buộc (NFR-28, AC-44 lệnh tìm = 0) |
| Đơn / kiện / hồ sơ cũ (Shopee) giữ nghĩa sau nâng cấp | Bắt buộc |
| Cô lập lỗi theo shop | Bắt buộc (NFR-39) |
| Rollback được | Cao |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **A. Nhóm trạng thái chung + adapter theo shop + unique (shop, mã đơn) (chọn)** | Lõi độc lập sàn; báo cáo theo sàn nhất quán | Migration + backfill nhóm; sửa mọi chỗ đọc chữ Shopee | Trung bình |
| B. Ánh xạ TikTok sang chữ Shopee | Không sửa lõi | Sai nghĩa (TikTok có trạng thái Shopee không có), khóa lõi vào Shopee | Cao về sau |
| C. Danh sách chữ của từng sàn trong lõi | Nhanh | Vi phạm NFR-28 | Trượt tiêu chí 1 |
| D. Module tích hợp TikTok riêng (đồng bộ, đối soát riêng) | Không đụng code Shopee | Nhân đôi đồng bộ, đối soát, hàng hoàn | Cao |

## Quyết định

Chọn **A**:

1. **Nhóm trạng thái đơn** (`platform_status_group`): `UNPAID` · `AWAITING_SHIPMENT` · `SHIPPED` (đã giao ĐVVC) · `DELIVERED` · `CANCEL_REQUESTED` · `CANCELLED` · `RETURNING` (hoàn về người bán) · `UNKNOWN`. Mỗi adapter có `mapping.py` riêng (bảng 01 §7.2). Chữ lạ → `UNKNOWN`, log cảnh báo, không đổi trạng thái kho (BR-30).
2. **Nhóm yêu cầu trả** (`return_case.platform_status_group`): `REQUESTED` (mở, chưa chấp nhận — đồng hồ BR-12 chưa chạy) · `ACCEPTED` · `CANCELLED` · `DONE` (đã hoàn tiền) · `CLOSED`. Thay `"OPEN"` + `AWAITING_ACCEPT_STATUSES` của Phase 2.
3. **Shop**: `shop.platform ∈ {SHOPEE, TIKTOK}`, nhiều shop `CONNECTED` cùng lúc; `shop.grant_ref` gom các shop chung một lần ủy quyền (TikTok) — làm mới token dưới khóa Redis `grant:{platform}:{grant_ref}` và ghi cho mọi shop cùng grant (refresh token có thể dùng một lần).
4. **Mã đơn**: unique `(shop_id, platform_order_sn)`; đơn từ file (không shop) unique `platform_order_sn` trong nhóm `shop_id IS NULL`; shop đầu tiên đồng bộ thấy mã của đơn file thì nhận đơn đó (BR-29, DEC-426). Khóa advisory vẫn `order:{sn}` (không kèm shop) — tuần tự hóa mọi shop cùng mã, giữ thứ tự khóa DEC-266.
5. **Mã vận đơn** vẫn unique toàn hệ thống; mã đã thuộc đơn của **shop khác** → không ghi đè, ghi `shop.sync_warnings` (EX-T2).
6. **Job**: beat chạy task "phân phối" → mỗi shop `CONNECTED` của sàn đang bật một task Celery riêng trên queue `sync` (concurrency 4), mỗi task có ngân sách thời gian (J-04 120 giây, J-06 / J-13 300 giây) và khóa theo shop như Phase 2.
7. **Tra mã khi quét**: đọc danh sách shop + token trước, rồi `asyncio.gather` mọi shop, mỗi lời gọi cắt 2 giây (BR-32); 1 shop thấy → gắn; ≥ 2 → kiện chưa xác minh + cờ `AMBIGUOUS_SHOP`.
8. **Cờ**: `SHOPEE_ENABLED` / `SHOPEE_RETURNS_ENABLED` (giữ), thêm `TIKTOK_ENABLED`, `TIKTOK_RETURNS_ENABLED`, `TIKTOK_ADAPTER = mock | tiktok` (`PLATFORM_ADAPTER` giữ nghĩa cho Shopee).

Loại B, C vì vi phạm NFR-28 / sai nghĩa; loại D vì nhân đôi lõi đã ổn định ở Phase 2.

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Thêm sàn = adapter + `mapping.py` + fixture mock; lõi không đổi; báo cáo lọc theo sàn / shop; một shop lỗi chỉ ghi lỗi của nó |
| Xấu / đánh đổi | Migration 0007 bỏ unique toàn cục: downgrade từ chối khi đã có mã đơn trùng giữa shop; mọi truy vấn "tìm đơn theo mã" phải nhận nhiều kết quả (bàn hoàn, nhập file) |
| Phải làm thêm | Backfill nhóm cho đơn / hồ sơ Shopee cũ; test tìm chuỗi trạng thái sàn ngoài adapter (NFR-28); mock TikTok nhiều shop; ADR-007 vẫn hiệu lực (polling là nền) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Tên trạng thái, loại yêu cầu trả, hạn người bán, gộp kiện của TikTok VN (Q19) | Bảng ánh xạ trong `platforms/tiktok/mapping.py` là **giả định**; xác minh ở T-3 TikTok, sửa bảng không sửa lõi |
| Token TikTok có thật theo người bán (dùng chung nhiều shop)? | Nếu theo shop → `grant_ref` = mã shop, cơ chế vẫn đúng |
| Tổng shop > 6 hoặc > 2.000 đơn / ngày / shop (AS-18) | Tăng concurrency queue `sync`, chia trang theo giờ |
| Có sàn hỗ trợ webhook + đã có tunnel | Xem lại ADR-007 |
