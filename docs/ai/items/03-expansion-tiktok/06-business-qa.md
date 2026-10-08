# Q&A nghiệp vụ sau Phase 3 — 03 Mở rộng: TikTok Shop, nhiều shop, báo cáo, sao lưu cloud, link chia sẻ, thông báo

| | |
|---|---|
| Tác giả | khanhtt (agent độc lập vai PO + chủ shop Shopee / TikTok, chỉ đọc code và tài liệu) |
| Reviewer | khanhtt (PO) |
| Trạng thái | Final — PO duyệt 2026-10-08 (tự quyết theo ủy quyền user): không CRITICAL → Phase 1–3 hoàn tất; L26 đã sửa (BE `107d9a5`, DEC-1001), L27 đã thêm chữ D23 (FE `f52792f`, DEC-1002) — quyết định bật FR-02.18 chờ chủ shop trước go-live; L24/L25 Phase 3.1 sau Q19 |
| Nguồn | Code nhánh `feat/03-expansion-tiktok`: BE `cc5dddf`, FE `e893a36`, gốc `c48e2cd`. Tài liệu: [01-srs](01-srs.md) v0.5, [02-tech-spec](02-tech-spec.md) v0.4, [02a-be-spec](02a-be-spec.md) v0.4, [04a-test-report](04a-test-report.md), [ADR-009](../../system/decisions/ADR-009-claim-based-evidence-retention.md), [ADR-010](../../system/decisions/ADR-010-shared-cloud-object-store.md), [ADR-011](../../system/decisions/ADR-011-multi-platform-shops-status-groups.md), [tài liệu nghiệp vụ lát 11–18](../../../nghiep-vu/03-expansion-tiktok/), [06-business-qa Phase 2](../02-returns-reconciliation/06-business-qa.md) (L11–L23), `ai-cam-be/docs/ops.md` |
| Last update | 2026-10-08 · PO |

> **TL;DR** — 57 câu hỏi tình huống thật, trả lời bằng code (file:line). Chủ đề:
> - nhiều shop / trùng mã đơn;
> - TikTok: yêu cầu hủy, kiện gộp, yêu cầu trả;
> - L11: phiên mở hộp đầu tiên, hủy 60 giây, quét nhầm, "Cần soát", "Là phiên hoàn thật";
> - L13 (Chỉ hoàn tiền), L14 (hạn sàn đã qua), L15 (bỏ bằng chứng);
> - sao lưu cloud: mất máy, mất / đổi khóa, ransomware;
> - link W1, thông báo, báo cáo M09, migration 0006 / 0007 và lùi, Q13.
>
> **Không có CRITICAL** theo định nghĩa của user. Không tìm thấy đường nào làm mất hoặc sai bằng chứng mà hệ thống vừa không chặn, vừa không báo, vừa không có cách xử lý:
> - Retention (J-02) vẫn chỉ xóa clip không còn được bảo vệ, và kiểm lại dưới khóa dòng.
> - Bỏ bằng chứng (BR-38) và đánh dấu quét nhầm đều chỉ bỏ mềm, clip giữ ≥ 60 ngày từ lúc bỏ.
> - Sao lưu không bao giờ đánh `DELETED` cho bản trên cloud; khôi phục cũng vậy.
> - Lùi 0006 giữ lại cả bằng chứng đã bỏ.
>
> **4 Major mới** (L24–L27):
> - TikTok kiện gộp: yêu cầu trả / Chỉ hoàn tiền của **đơn phụ** tạo hồ sơ hàng hoàn **không có kiện**;
> - TikTok "người bán từ chối" (`REQUEST_REJECTED`) bị coi là hủy vĩnh viễn: sàn mở lại / phân xử thì hồ sơ không mở lại, không N04 / D2;
> - BR-40 ẩn yêu cầu "Chỉ hoàn tiền" mới khi **đơn** đã có một hồ sơ khiếu nại chưa đóng bất kỳ (kể cả `LEGACY_HOLD`);
> - sao lưu mặc định không gồm clip đóng gói của đơn chưa có hồ sơ, và D23 không nói rõ điều này → mất máy kho thì mất video đóng gói của mọi đơn đang đi đường.
>
> Còn 10 Minor (L28–L37). Phase 2: L11, L13, L15 đã xử lý; L14 xử lý một phần (phần rẻ BR-42); L12, L16–L23 còn mở (backlog DEC-420). Q13 + L14 vẫn chặn go-live.

## 1. Kết luận

- **Không CRITICAL → không dừng.** Theo quy tắc user, dự án Phase 1–3 được kết thúc (đóng item 03 sau G5). Các điều kiện go-live vẫn giữ.
- Vì sao 4 Major không phải CRITICAL. Mỗi cái đều có đường xử lý tay, và clip vẫn nằm trong hạn giữ thường (≥ 60 ngày):
  - L24, L25: tạo hồ sơ khiếu nại thủ công từ D4 của kiện. Cả hai chỉ xảy ra với TikTok thật, mà TikTok thật đang **chặn go-live** bởi Q19.
  - L26: tab D14 khi tắt chip "Chỉ chưa xử lý".
  - L27: bật FR-02.18 "Sao lưu thêm mọi clip đóng gói".
- Cả 4 Major chạm trực tiếp tới tiền khiếu nại hoặc tới khả năng sống sót của bằng chứng.
- Đề xuất:
  - **Trước go-live**:
    - ban hành SOP cho L26, L27, L30, L31, L36, L37;
    - chủ shop quyết định bật FR-02.18 (L27);
    - sửa chữ D23 (L27, nhỏ).
  - **Phase 3.1** (sau Q19, khi có TikTok thật): L24, L25. Gộp vào điều kiện **chặn go-live TikTok** nếu Q19 xác nhận TikTok VN có gộp kiện, hoặc có bước "người bán từ chối → khiếu nại lên sàn".
  - **Phase 3.1** (nhỏ, không cần tài nguyên ngoài): L26.
  - Minor còn lại: backlog / SOP.
- Điều kiện go-live không đổi so với [04a](04a-test-report.md) §6:
  - Q13 + L14: hạn khiếu nại thật từng sàn so với số ngày giữ clip;
  - Q18 / Q19: TikTok partner, tên trạng thái, trường hạn người bán;
  - Q20: nhà cung cấp S3 + NĐ 13;
  - Q21: kênh chat;
  - T-3 (Shopee thật), T-4 (camera / máy quét);
  - server kho, điện thoại, mạng kho.

## 2. Kết quả theo nhóm câu hỏi

| Nhóm | Đánh giá | Ghi chú |
|---|---|---|
| A. Nhiều shop, trùng mã đơn (BR-29, BR-32) | Đúng phần lõi | Bàn đóng gói quét **mã vận đơn**, mà mã này unique toàn hệ thống. Bàn hoàn quét mã đơn trùng → cho chọn đơn, có chip sàn / shop. Hồ sơ gắn theo id kiện / đơn. Lệch nhỏ: zip không ghi sàn / shop (L28); mã vận đơn bị shop khác giữ chỉ báo ở D7 (L29) |
| B. TikTok: hủy, kiện gộp, yêu cầu trả | Đúng ở yêu cầu hủy; lệch ở kiện gộp và "người bán từ chối" | BR-21: đang yêu cầu hủy → chặn quét mới, chỉ banner vàng khi đang đóng; kiện hủy oan của Phase 2 được trả lại. Lệch: L24, L25 (chờ Q19) |
| C. L11: phiên mở hộp đầu tiên, quét nhầm | Đúng | Phiên bỏ dở / hủy có clip tự vào bằng chứng, và là phiên chính nếu sớm nhất. Station tự hủy chỉ trong ≤ 60 giây và khi chưa có kết luận / ảnh. Phiên quét nhầm bị loại, có Alert D17, sửa được ("Là phiên hoàn thật", "Bỏ đánh dấu"). Còn kẽ: video mở hộp lần đầu nằm ở phiên của kiện khác (L30); lạm dụng lý do "Quét nhầm" khó thấy (L31) |
| D. L15: bỏ bằng chứng | Đúng | Bắt lý do 5–500 ký tự, giữ tới max(kết thúc, lúc bỏ) + số ngày giữ, "Thêm lại" được |
| E. L13 Chỉ hoàn tiền, L14 hạn | Đúng phần lõi, một kẽ hở | D2 + N04 (mức Cao, không bị giờ yên lặng giữ) + nhắc 12 giờ. BR-42 đổi hạn khi hạn sàn đã qua. Kẽ hở: lọc theo **đơn** đã có hồ sơ khiếu nại (L26). Nghĩa trường hạn TikTok / Shopee chưa xác minh (L14, chặn go-live) |
| F. Sao lưu cloud | Đúng phần đã làm; phạm vi mặc định dễ hiểu nhầm | Mã hóa tại kho, dấu vân tay khóa theo từng bản, nhiều khóa khi khôi phục, versioning 7 ngày, khôi phục ưu tiên hồ sơ mở, không bao giờ `DELETED`. Lệch: phạm vi mặc định (L27), dữ liệu sau bản DB cuối (L32), ransomware không có phát hiện (L33), sao lưu tắt không ai báo (L34) |
| G. Link chia sẻ W1 | Đúng | Chỉ phiên trong bằng chứng; phiên bị loại / cần soát không gửi được từ nguồn PHIÊN; thu hồi khi mất mạng có chip "chờ Internet"; trang W1 chỉ hiện trường trong whitelist. Lưu ý: video có phiếu người mua, hạn tối đa 7 ngày (L37) |
| H. Thông báo | Đúng | N04, N05 mức Cao gửi ngay cả trong giờ yên lặng; tin chỉ gồm trường trong whitelist (không có dữ liệu người mua). Lưu ý: trần 30 tin / giờ áp cả tin mức Cao (L35) |
| I. Báo cáo M09 | Đúng công thức, rủi ro dùng sai | Năng suất gộp theo tên gõ tay (L36) |
| J. Migration 0006 / 0007, lùi | Đúng | Backfill phiên trước (4b), "Cần soát". Lùi chặn khi còn link sống / đơn TikTok / mã trùng (trừ khi ops đặt cờ). Bằng chứng đã bỏ → hồ sơ `LEGACY_HOLD` `CLOSED` giữ đúng hạn, có kiểm tập con |
| Q13 hạn khiếu nại so với retention | Thiếu | Vẫn chặn go-live (L1 / L14) |

## 3. Bảng Q&A

Đường dẫn BE tính từ `ai-cam-be/src/aicam/modules/`, FE từ `ai-cam-fe/src/features/`, migration từ `ai-cam-be/alembic/versions/`, worker từ `ai-cam-be/src/aicam/workers/`.

### A. Nhiều shop, trùng mã đơn

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| A1 | Shop Shopee A và shop TikTok B cùng có đơn "2410ABCDEF". Bàn đóng gói quét phiếu: có mở nhầm đơn của shop kia không? | Không. Bàn đóng gói tra **mã vận đơn** (`find_package` theo `tracking_number`), không tra mã đơn. Mã vận đơn unique toàn hệ thống (BR-29). Hai shop trùng mã đơn nhưng khác mã vận đơn → ra đúng kiện | `orders/service.py:124-129`; `sessions/service.py:343-345` | Đúng |
| A2 | Mã vận đơn chưa có trong hệ thống, tra sàn thấy ở ≥ 2 shop? | Tra mọi shop song song, mỗi shop ≤ 2 giây. ≥ 2 shop → **không đoán**: không ghi đơn, phiên mở chưa xác minh, cờ `AMBIGUOUS_SHOP` + sự kiện liệt kê các shop. 1 shop → ghi đơn vào đúng shop đó. Shop lỗi / quá hạn thì tính là "không thấy" | `sessions/service.py:286-313`, `:405-410`; `platforms/lookup.py:142-188` | Đúng |
| A3 | Bàn hoàn quét mã đơn "2410ABCDEF" (trùng ở 2 shop): ra kiện nào? | `resolve_code` bước 3 lấy mọi đơn mang mã (mọi shop + đơn file). ≥ 2 đơn → `MULTIPLE_ORDERS`, R3 cho chọn, có chip sàn / shop. Tra sàn (≥ 2 shop trùng **mã đơn**) → ghi cả hai đơn, mỗi đơn vào shop của nó, để màn chọn. ≥ 2 shop cùng trả **một mã vận đơn** → không ghi | `returns/service.py:773-786`; `sessions/return_scan.py:64-99`; `sessions/return_lookup.py:78-129` | Đúng |
| A4 | Mã vận đơn chiều về trùng giữa hai hồ sơ đang mở của hai đơn khác nhau? | ≥ 2 hồ sơ chưa kết thúc thuộc ≥ 2 đơn → `MULTIPLE_ORDERS` (cho chọn). Hồ sơ "chưa xác định" mang mã đó → **không** tự gộp, để gộp tay | `returns/service.py:731-744`, `:1030-1039` | Đúng |
| A5 | Hồ sơ khiếu nại / zip / link có gắn nhầm sang đơn cùng mã của shop kia? | Không. Hồ sơ lưu `package_id` + `order_id` (id, không phải mã), BR-27 khóa theo kiện. Nhưng `ho-so.json` / `thong-tin` trong zip chỉ ghi `platform_order_sn`, **không** ghi sàn / shop. CSKH quản lý hai shop trùng mã có thể nộp nhầm seller center. D17 có chip shop; W1 có tên sàn | `claims/service.py:115-128`, `:404-417`; `claims/pack.py:446-456`, `:632`; `shares/build.py:370-375` | Lệch nhẹ — Minor (L28) |
| A6 | Shop B đồng bộ đơn có mã vận đơn đã thuộc kiện của shop A? | Không ghi đè: bỏ qua kiện, thêm `TRACKING_OWNED_BY_OTHER_SHOP` vào `shop.sync_warnings` (chỉ hiện ở D7 Kết nối sàn). Không có mục D2, không N06. Đơn của shop B không có kiện → quét phiếu ra kiện của shop A (thường là cảnh báo "đã bàn giao") | `orders/service.py:359-389`, `:448-457`; `platforms/connect.py` (chỗ duy nhất đọc `sync_warnings`) | Lệch nhẹ — Minor (L29) |
| A7 | File nhập đơn có mã đơn trùng với đơn đã có của một shop? | File chỉ ghi vào đơn **chưa gắn shop**. Đơn của shop đã đồng bộ (đủ mã vận đơn) → bỏ qua (SKIP), kiểm lại dưới khóa. Đơn file sau đó được shop đầu tiên đồng bộ thấy cùng mã "nhận", bản CSV cũ được ghi vào audit | `orders/service.py:570-606`, `:404-421` | Đúng |
| A8 | Hai shop cùng mã yêu cầu trả? | Mã yêu cầu trả unique **theo shop** (0007). J-13 tra (shop của đơn, mã) `FOR UPDATE` → shop B không đụng hồ sơ shop A | `returns/service.py:574-582`; `0007_order_unique_per_shop.py:1-20` | Đúng |

### B. TikTok: yêu cầu hủy, kiện gộp, yêu cầu trả

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| B1 | Khách TikTok xin hủy, người bán từ chối: kiện có bị hủy oan, có đóng gói được không? | Yêu cầu hủy mới nhất `PENDING` + đơn chưa giao → nhóm `CANCEL_REQUESTED`. Kiện `NEW` / `PACKED` giữ nguyên. Quét mới bị chặn bằng câu "người mua đang xin hủy… chưa đóng gói". Người bán từ chối → nhóm về theo `status` → quét được. Đơn rời `CANCEL_REQUESTED` → lưới an toàn trả lại kiện hủy oan | `platforms/tiktok/mapping.py:63-87`; `orders/service.py:195-246`; `sessions/service.py:348-367` | Đúng |
| B2 | Đang đóng gói thì khách xin hủy; 1 giờ sau sàn chấp nhận hủy? | Đang đóng: chỉ cờ phiên `ORDER_CANCEL_REQUESTED` (banner vàng), đóng xong → `PACKED`. Sàn chấp nhận → nhóm `CANCELLED` → `PACKED → CANCELLED_AFTER_PACK` + BR-11 | `orders/service.py:228-246`, `:249-260`; `sessions/service.py:1220-1245` | Đúng |
| B3 | Kiện bị Phase 2 hủy oan do `IN_CANCEL`, nay nâng cấp? | Lệnh `aicam fix-cancel-requests` + lưới an toàn khi đồng bộ: trả `CANCELLED → NEW`, `CANCELLED_AFTER_PACK → PACKED`, audit `PACKAGE_CANCEL_REVERT`. Bỏ qua (in "kiểm tay") khi kiện vào trạng thái hủy do người sửa tay, hoặc BR-11 đã được người xử lý (có thể đã dỡ hàng). D2 có mục `CANCEL_REVERT_PENDING` (chỉ Admin). Video đóng gói không bị đụng | `orders/cancel_revert.py:1-11`, `:24-26`; `reports/service.py:368` | Đúng |
| B4 | TikTok gộp 2 đơn của cùng người mua vào 1 kiện (EX-T3). Khách trả hàng / xin "Chỉ hoàn tiền" cho **đơn phụ**: hồ sơ có gắn kiện, bảo vệ video đóng gói, cho tạo hồ sơ khiếu nại có video? | Kiện gộp vẫn thuộc đơn chính (`package.order_id`), đơn phụ chỉ có dòng `package_order`. Mọi chỗ của hàng hoàn lấy kiện qua `packages_of_order` = `Package.order_id`, nên hồ sơ của đơn phụ **không có kiện**. Hệ quả: không chuyển kiện `RETURN_EXPECTED`; BR-12 không chạy; bảo vệ (b) / (c) không áp lên video đóng gói; hồ sơ `EXPECTED` mãi (giống L19). Quét mã chiều về → `_first_unreceived` = None → dự kiến thành "chưa xác định" không có video đóng gói tự chọn. Zip / W1 chỉ ghi mã đơn chính. Cách vòng: tạo hồ sơ thủ công từ D4 của kiện (có video đóng gói, còn trong hạn 60 ngày). Chưa biết TikTok VN có gộp kiện không (Q19) | `orders/service.py:386-389`, `:442-457`; `returns/service.py:173-177`, `:424-445`, `:670-674`; `platforms/tiktok/adapter.py:239-265`; 01 FR-05.22, Q19 | Lệch — **Major (L24)** |
| B5 | Khách TikTok yêu cầu trả / Chỉ hoàn tiền, người bán **từ chối**, khách khiếu nại lên sàn, sàn mở lại hoặc phân xử: hệ thống có biết để CSKH nộp bằng chứng? | `REQUEST_REJECTED` → nhóm `CANCELLED` → `_cancel_platform_return` (hồ sơ `CANCELLED`, kiện về `DELIVERED`). Lần đồng bộ sau, dù trạng thái quay về chờ duyệt / chấp nhận / hoàn tiền, cũng chỉ cập nhật trường sàn; **không có nhánh mở lại hồ sơ đã hủy**. Hồ sơ `CANCELLED` → rời bộ lọc BR-40 (D2, N04), rời tab D14 "Chỉ hoàn tiền" (tab lọc theo `status = NO_PARCEL`), mất bảo vệ (b) / (c). Kiện về sau đó vẫn mở được như hàng về sớm. Tên trạng thái TikTok là giả định (Q19) | `platforms/tiktok/returns_mapping.py:19-31`; `returns/service.py:564-603`, `:338-354`; `returns/queries.py:30-39`; `returns/views.py:37-42` | Lệch — **Major (L25)** |
| B6 | TikTok "Chỉ hoàn tiền", "Trả hàng + hoàn tiền", "Đổi hàng" vào hồ sơ nào? | `REFUND_ONLY` → không cần kiện về (`NO_PARCEL`). `REPLACEMENT` → khách trả hàng, lý do "Đổi hàng". Loại lạ → coi như có kiện về (an toàn). Hạn người bán thử `seller_response_deadline` / `seller_deadline`, không có thì None (chưa xác minh) | `platforms/tiktok/returns_mapping.py:1-13`, `:108-122`; `returns/service.py:476-477` | Đúng (chờ Q19) |
| B7 | TikTok trả về trạng thái lạ? | Nhóm `UNKNOWN`, không đổi trạng thái kho. Không trả lại kiện hủy oan khi đơn rời yêu cầu hủy sang `UNKNOWN` | `platforms/tiktok/mapping.py:14-24`, `:74-87`; `orders/service.py:220-226`; `orders/cancel_revert.py:26` | Đúng |
| B8 | Token TikTok hết hạn, J-13 không lấy được yêu cầu "Chỉ hoàn tiền" mới? | N06 "Shop hết hạn ủy quyền / đồng bộ lỗi", mức Cao (`EXPIRED`, hoặc lỗi liên tục > 30 phút); D2 có `SYNC_ERROR` (chỉ Admin). Mỗi shop chạy một task riêng → shop khác không bị kẹt | `notify/catalog.py:37`; `notify/conditions.py:234-257`; `reports/service.py:368` | Đúng |

### C. L11: phiên mở hộp đầu tiên, hủy 60 giây, quét nhầm

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| C1 | Đang rạch hộp thì mất điện (phiên bị bỏ dở), 1 giờ sau mở lại thấy hộp rỗng. Hồ sơ khiếu nại có video lần mở đầu tiên, và đó có là phiên chính? | Có. `create_from_return` gọi `auto_evidence(..., prior=True)` → thêm **mọi** phiên RETURN `CANCELLED` / `ABANDONED` có clip của kiện / hồ sơ hàng hoàn (trừ phiên bị loại). Phiên chính = phiên RETURN có clip **sớm nhất**. Phạm vi theo `package_id`, nên kể cả khi hồ sơ "về sớm" của phiên đầu đã bị hủy thì vẫn lấy được. Zip đặt thư mục `mo-hoan-phien-truoc` | `claims/service.py:263-297`, `:415`; `claims/evidence_rules.py:82-98`, `:137-159`, `:204-225`; `sessions/return_scan.py:627-636`; `claims/pack.py:355-377` | Đúng |
| C2 | Người kiểm muốn tự hủy phiên hoàn sau khi đã rạch hộp? | Chỉ được khi đã mở ≤ 60 giây (giờ server, dưới khóa station) **và** chưa lưu kết luận **và** chưa có ảnh chụp tay. Ngược lại → `CANCEL_REQUIRES_SUPERVISOR` | `sessions/service.py:838-870`; `sessions/return_state.py:98-105` | Đúng |
| C3 | Supervisor hủy phiên của một **kiện hoàn thật** nhưng chọn lý do "Quét nhầm" (chọn nhầm, hoặc che giấu hộp rỗng)? | Bắt chọn mã lý do + ghi chú 5–500 ký tự, audit. Phiên bị loại: không tự vào bằng chứng, không là phiên chính, **không** tính N03, thẻ D2 "Phiên hoàn hủy / bỏ dở", lọc D3. Nếu có hồ sơ khiếu nại thì D17 có Alert "N phiên bị hủy vì quét nhầm…". Admin / Supervisor bấm "Là phiên hoàn thật" để gỡ. Không có hồ sơ (ví dụ hai người thông đồng giấu hộp rỗng) → chỉ thấy trong nhật ký | `approvals/service.py:298-340`; `sessions/queries.py:22-40`, `:56-57`; `claims/review.py:1-12`, `:279-290`; `claims/PriorReturnAlert.tsx` | Đúng, lưu ý — Minor (L31) |
| C4 | Người kiểm quét nhầm phiếu kiện X nhưng mở hộp Y. Supervisor hủy sau 60 giây, chọn lý do "Khác". Video hộp Y có thành bằng chứng của X? | Có thể. Phiên thuộc kiện X, lý do `OTHER` không bị loại → nếu sau này X có hồ sơ khiếu nại, phiên này vào bằng chứng tự chọn, và có thể là **phiên chính** (sớm nhất) → zip, W1 của X chứa video hộp Y. Đỡ một phần: D17 có Alert "Phiên mở hoàn trước · Đã hủy". CSKH / Supervisor "Đánh dấu quét nhầm" → bỏ mềm khỏi mọi hồ sơ mở, trả `affected_shares` để thu hồi link. Chọn đúng lý do "Quét nhầm" ngay từ đầu thì không xảy ra | `sessions/queries.py:19`; `claims/evidence_rules.py:128-134`, `:204-225`; `claims/review.py:1-12`, `:166`; `approvals/service.py:308-311` | Lệch nhẹ — Minor (L30) |
| C5 | Cùng tình huống C4: video đó thật ra là lần mở hộp **đầu tiên** của kiện Y. Hồ sơ của Y có lấy được không? | Không. `allowed_sessions` chỉ gồm phiên của kiện / các kiện của hồ sơ hàng hoàn của Y → API-134 từ chối phiên của X ("Phiên không thuộc kiện…"). Cách vòng: xuất clip của phiên X (kiểu Phase 1) gửi kèm tay. Clip của X chỉ được bảo vệ khi X còn trong hồ sơ hàng hoàn | `claims/service.py:712-729`, `:745-748`; `sessions/return_scan.py:627-636`; `media/protection.py:63-76` | Lệch nhẹ — Minor (L30) |
| C6 | Đã gửi link cho sàn rồi mới phát hiện phiên trong link là quét nhầm? | API-189 `MARK_WRONG_SCAN`: phiên bị loại, mọi hồ sơ **chưa đóng** đang dùng phiên đó → bỏ mềm (giữ tới `keep_until`), trả `affected_shares` để người dùng thu hồi. Link **không** tự thu hồi (người dùng quyết) | `claims/review.py:1-12`, `:108`, `:166-183` | Đúng |
| C7 | Phiên hoàn do quản lý hủy từ trước Phase 3 (không có mã lý do)? | "Cần soát": vào bằng chứng nhưng không là phiên chính, tới khi xác nhận "Là phiên hoàn thật" hoặc "Đánh dấu quét nhầm". Link nguồn PHIÊN (D4) chặn gửi phiên bị loại / cần soát (`SESSION_EXCLUDED`) | `sessions/queries.py:43-52`; `claims/evidence_rules.py:77-79`; `shares/service.py:138-140`, `:376-389` | Đúng |
| C8 | CSKH tự thêm tay phiên quét nhầm vào hồ sơ: có thành phiên chính, có lên zip như video chính? | Không. `primary_session` luôn trừ phiên bị loại / cần soát, kể cả khi người gọi quên truyền. J-16 xếp vào `phien-khac` (chỉ clip gốc) | `claims/evidence_rules.py:204-225`; `claims/pack.py:364-366` | Đúng |

### D. L15: bỏ bằng chứng

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| D1 | CSKH bỏ nhầm video đóng gói (clip đã 120 ngày) khỏi hồ sơ: đêm đó J-02 có xóa không, lấy lại kịp không? | Không xóa. Bỏ **bất kỳ** bằng chứng nào cũng phải ghi lý do 5–500 ký tự. Dòng không bị xóa mà ghi `removed_at`. Bảo vệ (a) thêm điều kiện `removed_at ≥ mốc cắt` → giữ tới max(kết thúc clip, lúc bỏ) + số ngày giữ (≥ 60). D17 có khu "Bằng chứng đã bỏ" với "Giữ tới …" và nút "Thêm lại" (gỡ `removed_*`, khóa clip trước). Audit `CLAIM_EVIDENCE_REMOVE` kèm `keep_until` | `claims/service.py:738-863`; `claims/evidence_rules.py:228-265`; `media/protection.py:79-85`; `claims/copy.ts:149-154` | Đúng (L15 đã xử lý) |
| D2 | Bỏ nhầm rồi hồ sơ đã đóng? | Hồ sơ `CLOSED` không sửa bằng chứng được (`CLAIM_CLOSED`), và không mở lại được (`CLOSED: ()`). Clip vẫn giữ theo `removed_at`. Muốn gửi lại → tạo hồ sơ mới cùng loại (BR-27 chỉ chặn hồ sơ chưa đóng) rồi thêm phiên | `claims/service.py:47-54`, `:744-745`, `:115-128` | Đúng |
| D3 | CSKH "Đánh dấu quét nhầm" nhầm phiên mở hộp thật? | Mọi hồ sơ mở bỏ mềm phiên đó (giữ ≥ 60 ngày). "Bỏ đánh dấu" rồi "Thêm lại". CSKH có quyền đánh dấu; "Là phiên hoàn thật" chỉ Admin / Supervisor | `claims/review.py:1-12`, `:279-290`; `claims/router.py:38`, `:124-139` | Đúng |

### E. L13 Chỉ hoàn tiền, L14 hạn khiếu nại

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| E1 | Khách TikTok báo "không nhận được hàng", xin Chỉ hoàn tiền lúc 23:00: ai biết, có kịp phản đối? | Hồ sơ `NO_PARCEL`. Hạn phản hồi = hạn người bán của sàn; không có thì = lúc sàn báo + `refund_only_default_hours` (48 giờ). D2 có `REFUND_ONLY_PENDING`. N04 mức **Cao** lúc mới và lúc còn ≤ 12 giờ. Mức Cao không bị giờ yên lặng giữ | `returns/queries.py:30-50`; `notify/conditions.py:186-204`; `notify/dispatch.py:178-188`; `reports/service.py:348-359` | Đúng (L13 đã xử lý) |
| E2 | Đơn đã có một hồ sơ khiếu nại đang mở (hồ sơ `LEGACY_HOLD` chuyển từ cờ giữ Phase 1, hoặc hồ sơ "Hư hỏng" của lần trả trước đang chờ sàn). Nay khách xin Chỉ hoàn tiền cho chính đơn đó? | BR-40 chỉ tính hồ sơ khi đơn **chưa có hồ sơ khiếu nại chưa đóng nào** (`open_claim_of_order_exists`). Điều kiện xét theo đơn, không theo yêu cầu, và không loại `LEGACY_HOLD`. Kết quả: yêu cầu mới **không** lên D2, **không** N04, bị ẩn khỏi tab D14 khi bật "Chỉ chưa xử lý" (link từ D2). Chỉ thấy khi mở D14 không lọc. Video đóng gói vẫn được bảo vệ 30 ngày theo (c) | `returns/queries.py:15-39`; `claims/service.py:115-128` (BR-27 mới loại `LEGACY_HOLD`); `returns/filters.ts:52` | Lệch — **Major (L26)** |
| E3 | Hồ sơ tạo ra khi hạn sàn đã qua (L14)? | BR-42: hạn = lúc tạo + `claim_deadline_days`, `deadline_source = DEFAULT_PLATFORM_PASSED`, ghi chú hệ thống "Hạn sàn (…) đã qua khi tạo hồ sơ — dùng hạn mặc định. Kiểm hạn thật trên sàn." D2 `CLAIM_OVERDUE` = trạng thái Mới và hạn < bây giờ. N05 "sắp hạn" (≤ 48 giờ) và "quá hạn", mức Cao | `claims/service.py:300-320`, `:404-418`; `reports/service.py:348`; `notify/conditions.py:210-231` | Đúng (phần rẻ L14) |
| E4 | Hạn người bán của TikTok / Shopee có đúng nghĩa "hạn khiếu nại"? | Chưa xác minh: TikTok thử 2 tên trường; Shopee `return_seller_due_date` (T-3). Mặc định 7 ngày vẫn là đề xuất (Q13) | `platforms/tiktok/returns_mapping.py:9-11`, `:119`; [04a](04a-test-report.md) TL;DR | Thiếu — **chặn go-live** (L14 / L1) |
| E5 | Hồ sơ đã gửi sàn (`SUBMITTED` / `WAITING`) sắp tới hạn sàn trả lời: có nhắc? | N05 chỉ cho hồ sơ `NEW`, và chỉ hạn trong cửa sổ 24 giờ trước – 48 giờ tới. Hồ sơ đã gửi coi như CSKH đã nộp kịp (đúng BR-42 "quá hạn **chưa gửi**") | `notify/conditions.py:41`, `:210-219`; `claims/service.py:55` | Đúng |

### F. Sao lưu cloud

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| F1 | Máy kho cháy. Bằng chứng của hồ sơ khiếu nại đang mở có khôi phục được? | Có, nếu sao lưu `ON`. DB mỗi 6 giờ (J-20). Bằng chứng cần giữ (BR-33: bảo vệ a–d + hồ sơ đã đóng còn hạn + đã bỏ còn hạn) lên cloud ≤ 1 giờ (J-21 10 phút, J-22 5 phút). `backup-restore` tải phiên của hồ sơ chưa đóng **trước**, kiểm SHA-256, giải mã vào tệp tạm rồi mới đổi tên. Lỗi → `MISSING`, không bao giờ `DELETED`. Sao lưu tắt (`RESTORE_PENDING`) tới khi `backup-verify` đạt | `media/protection.py:165-205`; `workers/celery_app.py:62-73`; `backup/restore.py:1-5`, `:519-583` | Đúng |
| F2 | Máy kho mất. Hôm sau khách báo "hộp rỗng" cho đơn đã giao 3 ngày trước (chưa có hồ sơ nào). Có video đóng gói? | **Không**, trừ khi Admin đã bật FR-02.18 "Sao lưu thêm mọi clip đóng gói" (mặc định tắt). Theo BR-33, chỉ clip đã được bảo vệ mới lên cloud; clip đóng gói của đơn đang đi đường / đã giao chưa có hồ sơ thì không (DEC-406). D23 chỉ có công tắc + "Ước tính thêm ≈ X GB / ngày". **Không** có câu nào nói rằng không bật thì mất máy là mất video đóng gói của mọi đơn chưa có hồ sơ | `media/protection.py:165-191`; `backup/copy.ts:165-170`; `backup/BackupOptions.tsx:35-51`; 01 FR-02.08, FR-02.18 | Lệch — **Major (L27)** |
| F3 | Mất máy lúc 12:00, bản DB cuối lúc 07:00, phiên mở hoàn "Hộp rỗng" lúc 10:00? | Clip của phiên 10:00 (được bảo vệ (b), nên đã lên cloud ≤ 1 giờ) được tải về đĩa, nhưng báo cáo ghi "ngoài DB". Dòng phiên / hồ sơ khiếu nại sau 07:00 mất khỏi DB → app không thấy video đó; kiện về `RETURN_EXPECTED` mà hộp đã rạch. Ops phải lấy tệp tay | `backup/restore.py:519-523`, `:569-572`; `workers/celery_app.py:62-63` | Lệch nhẹ — Minor (L32) |
| F4 | Quên / mất khóa sao lưu? | Máy còn: tạo khóa mới. D23 đếm bản còn dùng khóa cũ và cho "Tải lại bằng chứng bằng khóa mới" (chỉ tệp còn ở kho; bản DB cũ hết hạn tự nhiên). Mất **cả** khóa lẫn máy → bản sao vô dụng (đúng thiết kế NFR-41). Job không chạy tới khi Admin xác nhận đã cất khóa theo dấu vân tay (FR-02.17) | `cloud/crypto.py:1-11`; `backup/copy.ts:150-161`; ADR-010 §Quyết định 2 | Đúng — SOP cất khóa ngoài máy |
| F5 | Đổi khóa vì nghi lộ? | Mỗi `backup_run` / `backup_object` ghi dấu vân tay. Khôi phục nhận nhiều khóa (`BACKUP_OLD_KEYS`, `--key-file`), chọn theo dấu vân tay trong header. Sai khóa → `WrongKeyError` trước khi ghi byte nào | `cloud/crypto.py:46-53`; `backup/restore.py:60-62`, `:556-563` | Đúng |
| F6 | Ransomware chiếm máy kho, dùng khóa ứng dụng xóa hết bản trên cloud? | Bucket versioning: khóa ứng dụng chỉ tạo delete marker, không xóa được phiên bản (đã kiểm trên MinIO). Phiên bản cũ còn 7 ngày. Nhưng: (1) không job nào định kỳ kiểm bản cloud còn tồn tại (DB vẫn `cloud_present`); (2) `backup-restore` chỉ duyệt đối tượng **hiện hành** (`list` bỏ delete marker); runbook chỉ nhắc khôi phục phiên bản cũ cho đối tượng **hỏng**. Quá 7 ngày chưa khôi phục → mất thật. Nhà cung cấp thật chưa test (Q20) | `cloud/store.py:78-80`, `:340-350`; ADR-010 V1; `ai-cam-be/docs/ops.md:140-143`, `:218` | Lệch nhẹ — Minor (L33) |
| F7 | Chủ shop chưa bao giờ bật sao lưu (hoặc sau khôi phục chưa chạy `backup-verify`)? | N08 và mục D2 `BACKUP_STALE` chỉ xét khi trạng thái `ON` / `KEY_CHANGED`. Sao lưu tắt / chờ kiểm thì không ai được báo | `notify/conditions.py:297-303`; `reports/service.py:300-302` | Lệch nhẹ — Minor (L34) |
| F8 | Retention xóa clip tại kho thì bản cloud ra sao? | J-23 (03:00, sau J-02) chỉ xóa bản cloud khi nguồn bị retention xóa (audit `DELETE_CLIP` `RETENTION`) và `state = ON`. "Không thấy tệp tại kho" = `SOURCE_MISSING` (thử lại, N08), không phải xóa | `workers/celery_app.py:72-73`; `backup/jobs.py:758-836`; ADR-010 "Ghi chú implement M15" | Đúng |

### G. Link chia sẻ W1

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| G1 | Link gửi sàn bị chuyển tiếp ra ngoài (lộ)? | Token 256 bit, URL ký, hạn 1 / 3 / 7 ngày. Trang W1 chỉ có trường trong whitelist (không "gửi cho", người tạo, số tiền, tên shop, dữ liệu người mua), CSP `default-src 'none'`, `no-referrer`. Người tạo / Admin / Supervisor thu hồi → link chết ≤ 60 giây. Nhưng chính video có quay **phiếu vận đơn** (tên, SĐT, địa chỉ người mua) — không làm mờ (NĐ 13) | `shares/w1.py:1-6`; `shares/service.py:57`, `:660-693`; `shares/cleanup.py:1-10` | Đúng, lưu ý — Minor (L37) |
| G2 | Thu hồi lúc kho mất Internet? | DB `REVOKED` ngay. J-25 thử xóa mỗi phút; D21 / D4 / D17 hiện "Đang thu hồi — chờ Internet" (`revoke_pending`). Link vẫn mở được trên cloud tới khi có mạng hoặc hết hạn (EX-S7, đã ghi trong SRS) | `shares/cleanup.py:1-10`; `shares/service.py:551`; `workers/celery_app.py:74-75` | Đúng |
| G3 | Link hết hạn khi sàn chưa xem? | Hết hạn → `EXPIRED`, xóa tệp ≤ 1 giờ. Tối đa 7 ngày (giới hạn ký SigV4). Muốn gửi lại thì tạo link mới (bản dựng mới); zip J-16 vẫn có | `shares/service.py:57-58`; `shares/cleanup.py:1-10`; ADR-010 "Xấu / đánh đổi" | Đúng, lưu ý — Minor (L37) |
| G4 | Link có thể chứa video không liên quan? | Nguồn HỒ SƠ: chỉ phiên đang là bằng chứng (`removed_at IS NULL`); ảnh đi theo phiên của nó; phiên loại / cần soát chỉ có nếu CSKH đã thêm tay, và không chọn sẵn. Nguồn PHIÊN: chặn phiên loại / cần soát. Phiên chưa có Cam 1 `READY` → `SESSION_CLIP_UNAVAILABLE` | `shares/service.py:193-264`, `:363-398` | Đúng |
| G5 | Hồ sơ đóng (thua) mà link còn sống? | Không tự thu hồi (BR-34, có chủ đích). D21 lọc / thu hồi tay | 01 BR-34; `shares/service.py:572-645` | Đúng |
| G6 | Clip trong link bị mất tệp sau khôi phục (`MISSING`)? | Không chọn được (`CLIP_MISSING`); link đã dựng là bản sao riêng (BR-35), không phụ thuộc clip gốc | `claims/evidence_rules.py:48-55`; `shares/service.py:117-123` | Đúng |

### H. Thông báo Zalo / Telegram

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| H1 | Sự kiện nào được báo, ai nhận? | N01–N10: camera; lệch mức Cao; phiên hoàn hủy / bỏ dở; Chỉ hoàn tiền; hồ sơ sắp / quá hạn; shop hết hạn ủy quyền; ổ đầy; sao lưu; duyệt chờ lâu; tóm tắt ngày. Người nhận = kênh (nhóm Telegram / Zalo OA) mà Admin đăng ký mã sự kiện; mỗi kênh ≥ 1 sự kiện. Không kênh nào đăng ký N04 / N05 → không ai nhận | `notify/catalog.py:30-41`; `notify/models.py:24`, `:32` | Đúng — SOP cấu hình kênh CSKH |
| H2 | Giờ yên lặng 22:00–07:00 có làm lỡ hạn khiếu nại? | Chỉ tin **không phải** mức Cao bị giữ tới 07:00. N04, N05, N02, N06, N08 là mức Cao → gửi ngay. Nhưng trần 30 tin / 60 phút / kênh áp cho mọi mức → tin Cao có thể bị giữ tới khi có slot (≤ 60 phút) khi kênh đang bị dồn tin (ví dụ camera chập chờn) | `notify/dispatch.py:1-16`, `:178-188`, `:326-330` | Đúng, lưu ý — Minor (L35) |
| H3 | Tin có lộ dữ liệu người mua (NĐ 13)? | Whitelist trường theo từng mã: mã vận đơn, mã hồ sơ, sàn / shop, bàn, giờ. Tên, SĐT, địa chỉ, ghi chú, lý do viết tay, số tiền, token, URL ký không bao giờ vào tin. Log được lọc | `notify/render.py:1-9`, `:80-95`; `workers/celery_app.py` `_redact_logs` | Đúng |
| H4 | Bot lỗi cả ngày? | Thử lại 1, 2, 4… 60 phút; quá 24 giờ → `DROPPED`, kênh `last_status = ERROR` (D22). Kênh tắt → `DROPPED` | `notify/dispatch.py:1-16`, `:318-330` | Đúng |

### I. Báo cáo M09

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| I1 | Dùng báo cáo năng suất "Theo người đứng bàn" để thưởng / phạt có công bằng? | Gộp theo `operator_name` gõ tay ở station (trim, không phân biệt hoa thường). Tên giữ nguyên tới khi có người đổi. Không gắn tài khoản, không có ca làm. Đổi ca quên đổi tên → kiện tính cho người trước. D20 không có lưu ý nào | `reports/analytics.py:678-684`, `:799-812`; `reports/reportCopy.ts:154`, `:159` | Lệch nhẹ — Minor (L36) |
| I2 | Tỷ lệ hoàn / thắng / gửi trước hạn có tính đúng BR-41? | Theo kỳ, giờ VN; mẫu số 0 → "—"; Chỉ hoàn tiền hiện riêng. CSV dấu tách `;` (Excel VN) | 01 BR-41; `reports/analytics.py`; `reports/csv_export.py`; [04a](04a-test-report.md) §7 | Đúng |

### J. Migration 0006 / 0007, nâng cấp và lùi

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| J1 | Nâng cấp từ Phase 2: hồ sơ cũ có được bổ sung phiên mở hộp đầu tiên? | 0006 bước 4b backfill phiên trước (`backfilled`); phiên quản lý hủy trước Phase 3 thành "Cần soát". Một transaction | `0006_phase3_schema.py:1-20`, `:1020-1066` | Đúng |
| J2 | Lùi 0006 về Phase 2: bằng chứng đã bỏ (BR-38) có bị code cũ xóa ngay? | Không. Mỗi kiện có bằng chứng đã bỏ còn hạn → một hồ sơ `LEGACY_HOLD` `CLOSED` (`closed_at` = lúc bỏ muộn nhất) → luật Phase 2 giữ đúng hạn. Kiểm tập con, sai thì raise. Chặn khi còn link sống (`AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES`) hoặc đơn TikTok / shop thêm (`AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS`). Dữ liệu chép vào `phase3_archive`, nâng cấp lại khôi phục | `0006_phase3_schema.py:1147-1155`, `:1210-1215`, `:1300-1394`, `:1397-1432`, `:1500-1512` | Đúng |
| J3 | Lùi 0007 khi đã có hai shop trùng mã đơn? | Raise kèm 20 mã đầu, không đổi gì ("sửa tiến") | `0007_order_unique_per_shop.py:94-111` | Đúng |
| J4 | Clip / ảnh `MISSING` khi lùi? | Clip → `FAILED` (J-11 Phase 2 chỉ đẩy lại cắt, vô hại), ảnh → `DELETED`; archive giữ danh sách, nâng cấp lại trả `MISSING`. Không xóa tệp | `0006_phase3_schema.py:1104-1127`, `:1435-1440` | Đúng |

### K. Q13

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| K1 | Hạn khiếu nại thật của Shopee / TikTok so với 60 / 90 ngày giữ clip? | Có hồ sơ → giữ vô hạn tới khi đóng + số ngày giữ. Khiếu nại phát sinh **sau** khi clip quá hạn (không hồ sơ nào giữ trước) → clip đã mất; trên cloud cũng không có (L27). `claim_deadline_days = 7`, `refund_only_default_hours = 48` vẫn là đề xuất | `media/protection.py:38-40`; `claims/service.py:300-308`; `returns/queries.py:42-50` | Thiếu — **chặn go-live** (L1 / L14) |

Tổng: 57 câu (A 8, B 8, C 8, D 3, E 5, F 8, G 6, H 4, I 2, J 4, K 1):
- Đúng 39 (trong đó F4, H1 cần SOP);
- Major 4 (B4, B5, E2, F2 → L24–L27);
- Minor 12 (A5, A6, C3, C4, C5, F3, F6, F7, G1, G3, H2, I1 → L28–L37);
- Thiếu, chặn go-live 2 (E4, K1 → L1 / L14).

## 4. Log mâu thuẫn / thiếu và nơi xử lý (Phase 3)

| # | Vấn đề | Mức | Đề xuất xử lý | Nơi |
|---|---|---|---|---|
| L24 | **TikTok kiện gộp:** kiện thuộc đơn chính, đơn phụ chỉ có `package_order`. Hàng hoàn lấy kiện qua `Package.order_id` → yêu cầu trả / Chỉ hoàn tiền của **đơn phụ** tạo hồ sơ **không có kiện**: không `RETURN_EXPECTED`, không BR-12, không bảo vệ (b) / (c) video đóng gói, hồ sơ `EXPECTED` mãi; quét mã chiều về không ra kiện gốc. Zip / W1 chỉ ghi mã đơn chính (B4) | Major | (1) `packages_of_order` (hoặc lớp hàng hoàn) gồm cả kiện qua `package_order`. (2) Zip `ho-so.json` + W1 liệt kê mọi đơn của kiện gộp. (3) Hồ sơ hàng hoàn không có kiện → mục D2. **SOP**: đơn TikTok gộp kiện bị trả → CSKH tạo hồ sơ khiếu nại từ D4 của kiện (theo mã vận đơn) | Phase 3.1 sau Q19; **chặn go-live TikTok** nếu Q19 xác nhận TikTok VN gộp kiện |
| L25 | **TikTok "người bán từ chối"** (`REQUEST_REJECTED`) bị gộp vào nhóm `CANCELLED` → hồ sơ hủy, kiện về `DELIVERED`. Khách khiếu nại / sàn phân xử làm trạng thái đi tiếp → hồ sơ **không mở lại**, rời D2 / N04 / tab D14, mất bảo vệ (b) / (c). Đúng lúc người bán cần nộp bằng chứng (B5) | Major | (1) `REQUEST_REJECTED` → nhóm chưa kết thúc (như Shopee `SELLER_DISPUTE` → `REQUESTED`), đồng hồ BR-12 không chạy. (2) Hồ sơ `CANCELLED` mà nhóm sàn quay lại `REQUESTED` / `ACCEPTED` / `DONE` → mở lại (hoặc mục D2 "Yêu cầu đã hủy nhưng sàn còn xử lý"). **SOP**: sau khi từ chối trên TikTok, CSKH tạo hồ sơ khiếu nại ngay từ D4 để video được giữ | Phase 3.1 sau Q19 (tên trạng thái thật) + SOP |
| L26 | **BR-40 lọc theo đơn:** "Chỉ hoàn tiền chưa xử lý" loại mọi đơn đã có hồ sơ khiếu nại chưa đóng **bất kỳ**, gồm `LEGACY_HOLD` và hồ sơ của lần trả trước. Yêu cầu Chỉ hoàn tiền mới của đơn đó không lên D2, không N04, bị ẩn khi bật "Chỉ chưa xử lý" (E2) | Major | Chỉ tính hồ sơ khiếu nại gắn `return_case_id` của chính hồ sơ (hoặc tạo sau `reported_at`), loại `source = LEGACY_HOLD`. Nhỏ (một vị từ `returns/queries.py:15-27`, kèm test). **SOP**: CSKH mở tab "Chỉ hoàn tiền" **không lọc** mỗi sáng | **Đã sửa** BE `107d9a5` (DEC-1001) + SOP vẫn khuyến nghị |
| L27 | **Phạm vi sao lưu mặc định:** chỉ bằng chứng đã được bảo vệ (BR-33). Clip đóng gói của đơn chưa có hồ sơ không lên cloud trừ khi bật FR-02.18 (mặc định tắt). D23 không giải thích hệ quả → mất máy kho = mất video đóng gói của mọi đơn đang đi đường / mới giao; khách khiếu nại sau đó thì không còn bằng chứng (F2, K1) | Major | (1) D23 thêm câu: "Chỉ video đã thuộc hồ sơ hàng hoàn / khiếu nại được sao lưu. Máy kho hỏng thì video đóng gói của đơn chưa có hồ sơ sẽ mất — bật 'Sao lưu thêm mọi clip đóng gói' nếu cần." (2) Checklist go-live: chủ shop chọn bật / tắt FR-02.18 theo chi phí (01 §8.2 ≈ 30 GB / ngày). Cân nhắc giữ clip đóng gói N ngày gần nhất (≈ hạn khiếu nại sàn) thay vì tất cả | **Chữ D23 đã thêm** FE `f52792f` (DEC-1002); quyết định bật / tắt FR-02.18 chờ chủ shop trước go-live |
| L28 | Zip (`ho-so.json`, thông tin phiên) chỉ ghi mã đơn, không ghi sàn / shop; hai shop trùng mã thì CSKH dễ nộp nhầm seller center (A5) | Minor | Thêm `platform`, `shop_name` vào `ho-so.json` (nội bộ, không phải W1) | Backlog |
| L29 | EX-T2: mã vận đơn đã thuộc shop khác chỉ ghi `shop.sync_warnings` (D7); không D2, không N06. Đơn của shop kia không có kiện để đóng gói (A6) | Minor | Mục D2 (chỉ Admin) khi `sync_warnings` có `TRACKING_OWNED_BY_OTHER_SHOP` mới | Backlog |
| L30 | Quét nhầm phiếu kiện X khi mở hộp Y: (a) Supervisor chọn lý do "Khác" → video hộp Y thành phiên trước / phiên chính của X nếu X có hồ sơ (có Alert D17, sửa được bằng "Đánh dấu quét nhầm"); (b) video lần mở **đầu tiên** của Y không thêm được vào hồ sơ Y (`allowed_sessions`) (C4, C5) | Minor | **SOP**: quét nhầm thì Supervisor chọn đúng lý do "Quét nhầm"; ghi mã kiện thật vào ghi chú. Backlog: Admin thêm phiên của kiện khác vào hồ sơ, bắt ghi chú, có audit | SOP trước go-live + backlog |
| L31 | Phiên hủy với lý do "Quét nhầm / Không phải hàng hoàn" bị loại khỏi N03, D2, D3. Bị lạm dụng (giấu hộp rỗng khi chưa có hồ sơ) thì chỉ thấy trong nhật ký (C3) | Minor | **SOP**: Admin soát nhật ký hủy phiên hoàn mỗi tuần. Backlog: báo cáo số phiên hủy theo lý do / người hủy ở D20 | SOP + backlog |
| L32 | Khôi phục sau mất máy: dữ liệu sau bản DB cuối (≤ 6 giờ) — phiên / hồ sơ mất dòng DB; tệp bằng chứng tải về "ngoài DB" không xem được trong app (F3) | Minor | Runbook `ops.md` §6.2: cách tra danh sách "ngoài DB" và giao tệp cho CSKH; cân nhắc J-20 dày hơn trong giờ làm | SOP (05-release / ops) |
| L33 | Ransomware dùng khóa ứng dụng tạo delete marker: không có phát hiện; `backup-restore` chỉ thấy đối tượng hiện hành; runbook chỉ nhắc khôi phục phiên bản cũ cho đối tượng hỏng. Quá 7 ngày là mất thật (F6) | Minor | Runbook: bị chiếm quyền → **trong 7 ngày** dùng tài khoản quản trị nhà cung cấp gỡ delete marker `backup/` rồi mới khôi phục. Backlog: job kiểm mẫu `HEAD` định kỳ → N08. Bật object lock nếu nhà cung cấp có (Q20) | SOP + backlog |
| L34 | Sao lưu `OFF` / `RESTORE_PENDING` thì không có N08, không có D2 (F7) | Minor | Checklist go-live; backlog: D2 (Admin) "Sao lưu chưa bật / đang chờ kiểm khôi phục" | SOP go-live + backlog |
| L35 | Trần 30 tin / giờ / kênh áp cả tin mức Cao → N04 / N05 có thể chậm ≤ 60 phút khi kênh bị dồn tin (H2) | Minor | **SOP**: kênh CSKH riêng chỉ đăng ký N04, N05. Backlog: tin mức Cao vượt trần | SOP + backlog |
| L36 | Báo cáo năng suất theo tên gõ tay, giữ tới khi đổi; không gắn tài khoản / ca; D20 không có lưu ý (I1) | Minor | D20 ghi chú "Tên do station tự khai — không dùng làm căn cứ kỷ luật". **SOP**: đổi tên khi đổi ca; bật `packer_name_required` | SOP + sửa chữ (backlog) |
| L37 | W1: video có phiếu vận đơn (tên / SĐT / địa chỉ người mua); hạn tối đa 7 ngày có thể ngắn hơn thời gian sàn xem xét (G1, G3) | Minor | **SOP**: chọn hạn ngắn nhất đủ dùng, thu hồi khi xong; sàn cần lâu → nộp tệp zip trực tiếp. Gộp vào kết luận Q20 / NĐ 13 | SOP + Q20 |

## 5. Trạng thái L11–L23 của Phase 2 (xác nhận bằng code)

| # | Vấn đề Phase 2 | Trạng thái | Bằng chứng |
|---|---|---|---|
| L11 | Video mở hộp lần đầu ở phiên hủy / bỏ dở; station tự hủy; D2 thôi đếm | **Đã xử lý** | BR-39 `claims/service.py:263-297`, `claims/evidence_rules.py:137-225`; BR-37 `sessions/service.py:858-870`, `sessions/return_state.py:98-105`; N03 / D2 dùng `dropped_return_filter` `sessions/queries.py:55-57`, `notify/conditions.py:137-157`; Alert D17 `claims/PriorReturnAlert.tsx`. Kẽ còn lại: L30, L31 |
| L12 | Trả một phần đơn nhiều kiện | **Mở** — backlog (DEC-420) | `allowed_sessions` vẫn theo kiện / hồ sơ hàng hoàn `claims/service.py:712-729`; `_first_unreceived` theo thứ tự `returns/service.py:670-686` |
| L13 | Chỉ hoàn tiền không cảnh báo / hạn | **Đã xử lý** | BR-40 `returns/queries.py:30-50`; N04 `notify/conditions.py:186-204`; D2 `reports/service.py:348-359`; tab D14 sắp theo hạn `returns/views.py:260`. Kẽ hở mới: L26 |
| L14 | Hạn khiếu nại lấy `seller_due_at` chưa xác minh; D2 không đếm quá hạn | **Một phần** | BR-42 `claims/service.py:300-320`; D2 `CLAIM_OVERDUE`; N05. Nghĩa trường hạn (Shopee T-3, TikTok Q19) chưa xác minh → **chặn go-live** cùng Q13 |
| L15 | Bỏ bằng chứng → xóa ngay đêm đó | **Đã xử lý** | BR-38 `claims/service.py:738-863`; `media/protection.py:79-85`; lùi 0006 giữ đúng hạn `0006_phase3_schema.py:1300-1394` |
| L16 | Bên nhận không sửa được | **Mở** — backlog (DEC-420) | Không có nhánh đổi `counterparty` trong `claims/service.py:623-695` |
| L17 | Sàn `CLOSED` không hủy hồ sơ → BR-12 cảnh báo giả | **Mở** — backlog (DEC-420), sau T-3 / Q19 | Chỉ `CANCELLED` gọi `_cancel_platform_return` `returns/service.py:598-599`. TikTok có thêm `RETURN_OR_REFUND_REQUEST_CLOSED → CLOSED` `platforms/tiktok/returns_mapping.py:31` |
| L18 | BR-11 không lọc `recon_start_at` | **Mở** (SOP go-live) | `reconciliation/rules.py:92-118` không có `recon_start_at` (BR-10 / 14 / 19 / 20 có) |
| L19 | Hồ sơ "về trước khi sàn báo" nhiều kiện kẹt `PARTIALLY_RECEIVED` | **Mở** — backlog; L24 thêm một đường kẹt tương tự | `returns/service.py:528-533` |
| L20 | Sửa kết luận vấn đề → OK: hồ sơ đã gửi không có ghi chú | **Mở** — backlog | `close_auto_on_correct_ok` chỉ xử lý hồ sơ `NEW` `claims/service.py:479-503` |
| L21 | D17 không báo clip `FAILED` | **Mở** — backlog | `_missing` chỉ có `NO_PACK_CLIP`, `PACK_CLIP_DELETED`, `RETURN_CLIP_PENDING` `claims/views.py:225-238` (API-164 đã có `unavailable_reason` cho link) |
| L22 | Rollback 0003: hồ sơ đã đóng không `held` | **Mở** (SOP runbook). Phase 3 không làm nặng thêm: lùi 0006 giữ cả bằng chứng đã bỏ | `0006_phase3_schema.py:1300-1394` |
| L23 | Không có quy tắc kiện mất chiều đi | **Mở** — backlog | `reconciliation/rules.py` không có quy tắc `HANDED_OVER` lâu |
| L1 (Phase 1) | Q13 | **Mở — chặn go-live** | Gộp với L14 |

## 6. Lưu ý cho go-live / Phase 3.1

1. Q13 + L14 vẫn là một quyết định của chủ shop: hạn khiếu nại từng sàn × từng loại → đặt `claim_deadline_days`, `refund_only_default_hours`, `RETENTION_CLIP_MIN_DAYS`. Nay thêm một quyết định: **bật FR-02.18 hay không** (L27).
2. Q19 (TikTok thật) phải trả lời đủ 3 việc:
   - TikTok VN có gộp kiện không (L24);
   - luồng "người bán từ chối → người mua khiếu nại → sàn phân xử" có những trạng thái nào (L25);
   - tên trường hạn người bán (L14).
3. L26 nhỏ, sửa được mà không cần tài nguyên ngoài, nên làm trước go-live.
4. SOP trước go-live, bổ sung so với Phase 2:
   - chọn đúng lý do khi hủy phiên hoàn (L30);
   - soát nhật ký hủy hàng tuần (L31);
   - CSKH xem tab "Chỉ hoàn tiền" không lọc (L26);
   - kênh thông báo CSKH riêng (L35);
   - đổi tên người đứng bàn khi đổi ca (L36);
   - hạn link ngắn (L37);
   - runbook ransomware 7 ngày (L33);
   - giao tệp "ngoài DB" khi khôi phục (L32).
