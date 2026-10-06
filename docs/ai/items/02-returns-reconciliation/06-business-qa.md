# Q&A nghiệp vụ sau Phase 2 — 02 Hàng hoàn và đối soát

| | |
|---|---|
| Tác giả | khanhtt (agent độc lập vai PO + chủ shop Shopee / TikTok, chỉ đọc code và tài liệu) |
| Reviewer | khanhtt (PO) |
| Trạng thái | Final — PO duyệt 2026-10-06 (tự quyết theo ủy quyền user): không CRITICAL → sang Phase 3; L11, L13, L15 đưa vào đầu Phase 3; L14 chặn go-live cùng Q13 |
| Nguồn | Code nhánh `feat/02-returns-reconciliation`: BE `66ac3d1`, FE `3acaad0`, gốc `f10d7dc`. Tài liệu: [01-srs](01-srs.md) v0.6, [02-tech-spec](02-tech-spec.md) v0.5, [04a-test-report](04a-test-report.md), [ADR-009](../../system/decisions/ADR-009-claim-based-evidence-retention.md), [tài liệu nghiệp vụ lát 6–10](../../../nghiep-vu/02-returns-reconciliation/), [06-business-qa Phase 1](../01-packing-mvp/06-business-qa.md) |
| Last update | 2026-10-06 · PO |

> **TL;DR** — 44 câu hỏi tình huống thật, trả lời bằng code (file:line). Chủ đề: khiếu nại hàng hoàn, nhận kiện lạ / về sớm / nhiều kiện, đồng bộ Shopee, đối soát BR-12, retention, gói zip, quyền, sửa kết luận, migration / rollback.
> **Không có CRITICAL** theo định nghĩa của user. Không tìm thấy đường nào làm mất hoặc sai bằng chứng mà hệ thống vừa không chặn, vừa không báo, vừa không có cách xử lý. J-02 không bao giờ xóa clip của hồ sơ khiếu nại chưa đóng: lọc trong truy vấn, rồi kiểm lại dưới khóa dòng.
> **5 Major** (L11–L15):
> - video mở hộp lần đầu nằm ở phiên hủy / bỏ dở không tự vào hồ sơ;
> - trả một phần đơn nhiều kiện chọn kiện gốc tùy ý;
> - "Chỉ hoàn tiền" không có cảnh báo và hạn;
> - hạn khiếu nại lấy `seller_due_at` chưa xác minh, D2 không đếm hồ sơ quá hạn;
> - bỏ bằng chứng khỏi hồ sơ làm clip quá hạn bị xóa ngay đêm đó, không cảnh báo (L7 của Phase 1 còn đường khác).
>
> Còn 8 Minor (L16–L23). L2–L9 của Phase 1 đã xử lý trong code. L1 (Q13) vẫn chặn go-live.

## 1. Kết luận

- **Không CRITICAL → không dừng.** Theo quy tắc user (2026-10-05), Phase 3 được bắt đầu.
- Mỗi Major đều có đường xử lý tay: thêm "phiên khác" vào hồ sơ, tạo hồ sơ thủ công, tab D14, sửa hạn hồ sơ, audit. Vì vậy không có Major nào là CRITICAL. Nhưng cả 5 đều chạm trực tiếp tới tiền khiếu nại.
- Đề xuất:
  - Trước go-live: ban hành SOP cho L11, L12, L13, L15.
  - Đưa L11, L13, L14, L15 vào đầu Phase 3 (hardening). L12 vào Phase 3, nếu shop có đơn nhiều kiện.
  - L14 gộp với Q13 + T-3 làm điều kiện **chặn go-live**.
- Điều kiện go-live không đổi so với [04a](04a-test-report.md):
  - Q13: hạn khiếu nại thật của sàn so với số ngày giữ clip.
  - T-3: Shopee returns thật, cần xác minh `tracking_number`, `needs_logistics`, `return_seller_due_date`, `item[]`.
  - T-4: camera / máy quét thật.
  - Đo trên server kho.

## 2. Kết quả theo nhóm câu hỏi

| Nhóm | Đánh giá | Ghi chú |
|---|---|---|
| A. Khiếu nại từ hàng hoàn (rỗng / thiếu / sai / hỏng): loại, bên nhận, bằng chứng, hạn | Đúng phần lõi, lệch ở hạn và phiên trước | BR-08 đúng loại và bên nhận. Bằng chứng tự chọn đủ PACK + RETURN + ảnh. Lệch: hạn (L14), video mở hộp lần đầu (L11), bên nhận không sửa được (L16) |
| B. Nhận hàng hoàn: mã lạ, về sớm, nhiều kiện, hai bàn, quét nhầm bàn | Đúng, trừ đơn nhiều kiện | Chặn trùng bằng partial unique. Kiện lạ → hồ sơ chưa xác định → gộp sau. Lệch: trả một phần đơn nhiều kiện (L12), hồ sơ về sớm nhiều kiện kẹt (L19) |
| C. Đồng bộ yêu cầu trả (J-13): hủy, chỉ hoàn tiền, CLOSED | Đúng theo spec, thiếu giám sát | Sàn hủy → hồ sơ hủy, kiện về `DELIVERED`, kiện vẫn về thì như hàng về sớm. Thiếu: không cảnh báo "Chỉ hoàn tiền" (L13); CLOSED không tự hủy hồ sơ (L17) |
| D. Đối soát BR-10..20, BR-12 | Đúng | Có mốc `recon_start_at` chống báo sai hàng loạt (trừ BR-11 — L18). BR-12 chờ sàn chấp nhận: hợp lý, cuối cùng vẫn báo (BR-12 hoặc BR-19). Không có quy tắc cho kiện mất chiều đi (L23) |
| E. Retention, bảo vệ bằng chứng (ADR-009) | Đúng, có một kẽ hở | Hồ sơ khiếu nại chưa đóng, hồ sơ hàng hoàn chưa kết thúc, +7 ngày, NO_PARCEL 30 ngày. Kẽ hở: bỏ bằng chứng → xóa ngay đêm đó (L15) |
| F. Gói zip gửi sàn | Đúng | Chép clip gốc → kiểm SHA-256 → lệch thì ghi rõ; `ho-so.json` có SHA từng tệp; zip có SHA riêng. D17 chưa báo clip `FAILED` (L21) |
| G. Quyền, sửa kết luận | Đúng, thiếu một ghi chú | Station chỉ xem clip đóng gói khi đang kiểm kiện đó. Giữ clip chỉ Admin. Sửa kết luận chỉ Supervisor / Admin trong 7 ngày. Thiếu ghi chú khi sửa ISSUE → OK cho hồ sơ đã gửi (L20) |
| H. Migration, rollback | Đúng | Downgrade đặt `held` cho mọi clip đang được bảo vệ. Chặn khi còn phiên hoàn mở / clip chưa cắt. Archive để nâng cấp lại. Hồ sơ đã đóng thì code cũ có thể xóa sớm hơn (L22) |
| Q13 hạn khiếu nại so với retention | Thiếu | Chưa đóng — chặn go-live (L1) |

## 3. Bảng Q&A

Đường dẫn BE tính từ `ai-cam-be/src/aicam/modules/`, FE từ `ai-cam-fe/src/features/`, migration từ `ai-cam-be/alembic/versions/`.

### A. Khiếu nại từ hàng hoàn

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| A1 | Khách trả hàng về hộp rỗng: hồ sơ khiếu nại có tự tạo không, có đúng loại, đúng bên nhận, đủ video đóng gói + video mở hoàn không? | Có. Đóng phiên RETURN với kết luận ≠ OK → `create_from_return`, loại = kết luận (`EMPTY_BOX`), bên nhận = Sàn (khác `FAILED_DELIVERY`). Bằng chứng tự chọn: phiên PACK hiệu lực (`COMPLETED` mới nhất) + phiên RETURN + ảnh lúc đóng gói + ảnh chụp tay | `claims/service.py:322-388`, `:361`, `:258-274`, `:174-189`; `sessions/return_scan.py:540` | Đúng |
| A2 | Giao thất bại, kiện về bị móp / thiếu: bên nhận có phải ĐVVC? | Có, khi hồ sơ hàng hoàn `kind = FAILED_DELIVERY` lúc đóng phiên | `claims/service.py:361` | Đúng |
| A3 | Kho nhận trước khi sàn báo (hồ sơ "Về trước khi sàn báo"), có vấn đề → hồ sơ khiếu nại bên Sàn. Sau đó sàn báo là giao thất bại → bên nhận có đổi sang ĐVVC? | Không. `_upgrade_kind` đổi loại hồ sơ hàng hoàn, còn `counterparty` của hồ sơ khiếu nại chỉ đặt lúc tạo. API-133 không có trường `counterparty`. Muốn sửa: đóng hồ sơ cũ rồi tạo hồ sơ thủ công | `returns/service.py:346-348`, `:480-490`; `claims/schemas.py:170-179` | Lệch — Minor (L16) |
| A4 | Cùng kiện có hai lần mở hoàn cùng kết luận: có sinh hai hồ sơ trùng? | Không. Advisory lock + `find_open` (BR-27) → thêm phiên + ảnh vào hồ sơ đang mở, ghi chú hệ thống. Partial unique index là lưới an toàn | `claims/service.py:337-351`; `claims/models.py:48-54` | Đúng |
| A5 | Người kiểm quét đóng khi chưa chọn kết luận? | Chặn: `INSPECTION_REQUIRED` "Chọn kết luận trước khi quét đóng.", phiên giữ nguyên | `sessions/return_scan.py:437-438` | Đúng |
| A6 | Đơn bán trước khi có hệ thống (không có clip đóng gói) trả về? | Vẫn mở phiên, cờ `NO_PACK_CLIP`. D17 `missing` = `NO_PACK_CLIP`. Zip vẫn tạo | `sessions/return_scan.py:326-327`; `claims/views.py:166-179` | Đúng |
| A7 | Hạn khiếu nại của hồ sơ tự tạo có đáng tin để nộp sàn kịp không? | Hạn = `return_case.seller_due_at` (Shopee `return_seller_due_date`, **chưa xác minh T-3**). Không có thì = ngày tạo + 7 ngày. Hạn chép một lần lúc tạo. Nếu đó là hạn phản hồi yêu cầu trả (thường trước khi kiện về), hồ sơ sinh ra **đã quá hạn**. D2 chỉ đếm "sắp hết hạn" với `deadline_at >= now`, không đếm hồ sơ đã quá hạn; J-15 chỉ ghi chú một lần. Hồ sơ quá hạn chỉ thấy khi lọc D16 `due=overdue`. CSKH sửa hạn được (API-133) | `claims/service.py:280-284`, `:835-863`; `platforms/shopee/returns_mapping.py:108`; `reports/service.py:136-146`; `claims/views.py:43-49`, `:93-103` | Lệch — **Major (L14)** |
| A8 | Gói zip gửi sàn có đủ và toàn vẹn không? | Chép clip gốc `READY` → tính lại SHA-256 → so với DB, lệch thì ghi `CLIP_CHECKSUM_MISMATCH` (không che). Ảnh cũng vậy. `ho-so.json` liệt kê mọi tệp kèm SHA-256 và phần thiếu. Zip có SHA riêng lưu DB. Phiên chính có MP4 ghép có chữ. `ket-luan.json` có kết luận theo dòng và lịch sử sửa | `claims/pack.py:276-305`, `:307-323`, `:392-417`, `:424-433`, `:495`, `:508-513` | Đúng |
| A9 | Clip mở hoàn chưa cắt xong hoặc cắt hỏng lúc xuất zip? | Zip vẫn tạo, `missing` ghi `CLIP_NOT_READY` / `CLIP_FAILED`. Nhưng D17 (`_missing`) chỉ báo `RETURN_CLIP_PENDING` (phiên chưa có clip / clip PENDING), không báo clip `FAILED` của RETURN hoặc PACK | `claims/pack.py:288-293`; `claims/views.py:166-179` | Lệch nhẹ — Minor (L21) |
| A10 | Đang mở hộp thì mất điện / người kiểm bỏ đi, phiên bị J-07 bỏ dở. Lần quét sau hộp đã bị rạch. Hồ sơ khiếu nại có video mở hộp lần đầu không? | Không tự có. Phiên đầu `ABANDONED`, kiện về trạng thái trước, clip vẫn cắt. Phiên sau `COMPLETED` tạo hồ sơ với `auto_evidence(..., [pack])`, chỉ phiên hiện tại. Phiên đầu chỉ nằm ở "phiên khác" của D17 để thêm tay. D2 "phiên hoàn bỏ dở" **tự hết đếm** khi kiện có phiên `COMPLETED` sau đó (`~later_done`) — đúng lúc cần chú ý nhất. Zip mặc định sẽ gửi video hộp đã mở sẵn | `sessions/service.py:1016-1031`; `sessions/return_scan.py:562-604`; `claims/service.py:258-274`, `:370`; `claims/views.py:276-290`; `reports/service.py:286-311` | Lệch — **Major (L11)** |
| A11 | Người đứng bàn tự "Hủy phiên" hoàn sau khi đã mở hộp (ví dụ thấy hộp rỗng, ngại xử lý)? | Được, không cần quản lý duyệt: lý do `WRONG_SCAN` / `NOT_A_RETURN` / `OTHER` (Khác phải có ghi chú). Kiện về trạng thái trước, không tạo hồ sơ khiếu nại. Phiên `CANCELLED` không vào D2 "Cần xử lý". Clip vẫn được giữ khi hồ sơ hàng hoàn còn mở | `sessions/service.py:66-69`, `:761-793`; `sessions/return_scan.py:562-604`; `reports/service.py:296-303` | Lệch — **Major (L11)** |
| A12 | Phiên hoàn quá 45 phút? | Kết luận đã lưu và hợp lệ → tự hoàn tất (`AUTO_CLOSED`), tạo hồ sơ nếu có vấn đề. Kết luận lưu dở → giữ phiên, cờ `AUTO_CLOSE_BLOCKED`, báo station, D2 đếm. Chưa có kết luận → `ABANDONED` | `sessions/service.py:960-1031`; `reports/service.py:296-311` | Đúng |

### B. Nhận hàng hoàn

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| B1 | Mã lạ, hoặc mất WAN không tra được sàn? | Tra 3 nguồn (mã chiều về → mã gốc → mã đơn / mã yêu cầu), không thấy thì tra sàn ≤ 2 giây (timeout / lỗi → None). Station được "Mở phiên chưa xác định" (kiện tạm `TAM-…`). Khi đơn xuất hiện (J-04 / J-13 / tra sàn) → tự gộp theo mã. Mã chiều về của J-13 cũng gộp được | `sessions/return_scan.py:67-114`, `:360-366`, `:610-617`; `returns/service.py:671-750`, `:942-965` | Đúng |
| B2 | Kiện về trước khi sàn báo? | Hồ sơ `UNANNOUNCED` (nguồn kho). Sau 24 giờ sàn chưa báo → BR-13 thấp. Tín hiệu sàn tới sau → gắn vào hồ sơ đã nhận trong 30 ngày | `returns/service.py:395-411`, `:480-490`, `:494-520`; `reconciliation/rules.py:163-195` | Đúng |
| B3 | Hai bàn quét cùng một kiện hoàn? | Chặn: `check_openable` → `RETURN_IN_PROGRESS_ELSEWHERE`. Partial unique `uq_session_active_package`. Hai request cùng lúc → `IntegrityError` → cảnh báo, không 500 | `sessions/return_scan.py:193-215`, `:407-413`; `sessions/models.py:54` | Đúng |
| B4 | Quét kiện hoàn ở bàn đóng gói? | Chặn (EX-R16), không mở phiên | `sessions/service.py:327` | Đúng |
| B5 | Quét kiện hệ thống ghi "chưa rời kho" (`PACKED`, `CANCELLED_AFTER_PACK`) nhưng thực tế đã gửi đi và bị hoàn? | Cảnh báo `NOT_SHIPPED` kèm câu "báo quản lý điều chỉnh". Supervisor chỉnh tay `PACKED/CANCELLED_AFTER_PACK/NEW → HANDED_OVER` (audit) rồi quét lại | `sessions/return_scan.py:240-255`; `orders/service.py:55-62`; `orders/adjust.py:92-112` | Đúng |
| B6 | Quét lại kiện đã nhận? | `RETURN_ALREADY_RECEIVED` (giờ, bàn, kết luận). Lối thoát "Đây là kiện khác — vẫn ghi hình" chỉ cho đúng trường hợp này, ghi chú bắt buộc, audit | `sessions/return_scan.py:216-239`, `:620-658` | Đúng |
| B7 | Đơn 2 kiện, khách trả một phần bằng 1 kiện chiều về (hoặc trả cả đơn nhưng dòng sản phẩm sàn không ghép được SKU): kiện gốc nào được nhận, clip đóng gói nào thành bằng chứng? | Quét mã chiều về → `_first_unreceived` lấy kiện đầu tiên **theo thứ tự mã vận đơn**, không theo kiện chứa sản phẩm bị trả. Đóng phiên: `covers_whole_order` = False (trả một phần, **hoặc** `requested_items` không ghép được) → kiện còn lại bị **tách khỏi hồ sơ** và về `DELIVERED`. Hệ quả: hồ sơ khiếu nại tự chọn PACK của kiện bị chọn tùy ý. PACK của kiện kia **không có trong `allowed_sessions`** nên không thêm vào cùng hồ sơ được, và mất bảo vệ (b). Cách vòng: tạo hồ sơ thủ công cho kiện kia (được 2 zip rời) hoặc xuất clip kiểu Phase 1 | `returns/service.py:638-654`, `:262-275`, `:281-312`, `:873-910`; `claims/service.py:662-679`, `:219-220` | Lệch — **Major (L12)** |
| B8 | Giao thất bại đơn 2 kiện, mới về 1? | Mỗi kiện một phiên. Hồ sơ `PARTIALLY_RECEIVED`. Kiện còn lại tiếp tục đồng hồ BR-12 | `returns/service.py:809-852` | Đúng |
| B9 | Về trước khi sàn báo, đơn 2 kiện, khách chỉ gửi 1 kiện và sàn không bao giờ báo? | Lúc tạo hồ sơ, mọi kiện đã rời kho (kể cả `DELIVERED`) bị gắn vào hồ sơ. Hồ sơ `PARTIALLY_RECEIVED` mãi: không có chuyển tay nào từ `DELIVERED`, BR-13 chỉ cảnh báo thấp. Clip của cả hai kiện bị giữ vô hạn | `returns/service.py:512-517`, `:841-842`; `orders/service.py:55-62`; `media/protection.py:64-66` | Lệch nhẹ — Minor (L19) |

### C. Đồng bộ yêu cầu trả Shopee (J-13)

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| C1 | Sàn hủy yêu cầu trả khi kiện chưa về? | Hồ sơ `EXPECTED/MISSING/NO_PARCEL` → `CANCELLED`, kiện → `DELIVERED`. Hồ sơ có tín hiệu giao thất bại thì giữ. Kiện vẫn về → mã chiều về trỏ hồ sơ hủy → mở như hàng về sớm | `returns/service.py:585-606`; `:698-712` | Đúng |
| C2 | Sàn hủy khi kiện đang kiểm hoặc đã nhận, đã có hồ sơ khiếu nại? | Không đụng hồ sơ / kiện, chỉ lưu trạng thái sàn. Hồ sơ khiếu nại giữ nguyên để CSKH quyết | `returns/service.py:592-599` | Đúng |
| C3 | Yêu cầu "chỉ hoàn tiền" (khách báo thiếu / không nhận được, không gửi hàng về): ai biết để phản đối trước khi sàn tự hoàn tiền? | Hồ sơ `NO_PARCEL`, không đổi kho, clip đóng gói được giữ 30 ngày. Chỉ hiện ở tab D14 "Chỉ hoàn tiền" (có số đếm, nút tạo hồ sơ). **Không** có mục trong D2 "Cần xử lý", không đếm ở D2, không nhắc theo `seller_due_at`. Hạn chỉ hiện ở chi tiết | `returns/service.py:463-464`, `:494-506`; `media/protection.py:72-76`; `reports/service.py:125-131`, `:326-333`; `returns/ReturnsPage.tsx:258-262`; `returns/ReturnCaseSection.tsx:75-78` | Thiếu — **Major (L13)** |
| C4 | Sàn đóng yêu cầu (`CLOSED` — khách không gửi hàng) khi kiện chưa về? | Chỉ `CANCELLED` mới hủy hồ sơ. `CLOSED` thì hồ sơ vẫn `EXPECTED`, đồng hồ BR-12 chạy (`CLOSED` không phải trạng thái chờ duyệt) → 7 ngày sau `RETURN_MISSING` + cảnh báo Cao **giả**. Supervisor chỉnh `RETURN_MISSING → DELIVERED` được | `returns/service.py:567-574`, `:85-94`; `platforms/shopee/returns_mapping.py:15-24` | Lệch nhẹ — Minor (L17) |
| C5 | Payload Shopee thiếu trường "có cần gửi hàng về"? | Coi như có kiện về (an toàn cho bằng chứng: hồ sơ chờ kiện, clip được giữ) | `platforms/shopee/returns_mapping.py:101-103` | Đúng (chờ T-3) |

### D. Đối soát

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| D1 | BR-12 chỉ chạy đồng hồ khi sàn đã chấp nhận trả: có hợp lý với chủ shop? Có trường hợp kiện mất mà **không bao giờ** cảnh báo? | Hợp lý: khi khách còn yêu cầu / tranh chấp thì chưa có hàng đi. Đồng hồ chỉ dừng khi **đồng thời**: `BUYER_RETURN`, chưa có mã chiều về, trạng thái sàn ∈ {REQUESTED, JUDGING, SELLER_DISPUTE}, không có tín hiệu giao thất bại. Khi sàn đi tiếp: hoàn tiền → BR-19 Cao; đóng / chấp nhận → đồng hồ chạy. Chỉ im lặng mãi nếu sàn kẹt ở 3 trạng thái trên mãi. Hồ sơ trước `recon_start_at` không chuyển quá hạn, nhưng `return_case` là bảng mới nên thực tế không có. Lưu ý: N = 7 ngày tính từ lúc sàn chấp nhận có thể ngắn (khách còn thời gian gửi + vận chuyển) → cảnh báo sớm, chỉnh được bằng cấu hình | `returns/service.py:81-94`, `:97-113`, `:315-324`; `reconciliation/service.py:347-404`; `reconciliation/rules.py:228-261` | Đúng |
| D2 | Kiện quá hạn rồi về muộn (62 ngày, retention 60)? | Mở phiên được (`RETURN_MISSING` ∈ OPENABLE). Clip đóng gói còn vì hồ sơ `MISSING` vẫn trong nhóm được bảo vệ | `returns/service.py:51`; `media/protection.py:64-66`, `:104-117` | Đúng |
| D3 | Sau nâng cấp, đối soát có báo sai hàng loạt? | Có chặn: BR-10, 14, 20 lọc theo `recon_start_at`. BR-19 lọc hồ sơ sau nâng cấp. J-13 bỏ yêu cầu đã hoàn tiền trước nâng cấp. Hồ sơ trước nâng cấp không vào BR-12. **BR-11 không có mốc**: mọi kiện `CANCELLED_AFTER_PACK` / `PACKED` của đơn hủy từ Phase 1 bật cảnh báo Trung bình ngay ngày go-live | `reconciliation/rules.py:63-118`, `:198-287`; `returns/service.py:558-562`, `:577-582`; `0003_returns_recon_claims.py:721` | Đúng, lưu ý BR-11 — Minor (L18) |
| D4 | Supervisor chỉnh `RETURN_MISSING → DELIVERED` (khách không trả) thì bằng chứng ra sao? | Kiện rời hồ sơ; hồ sơ hết kiện → `CANCELLED`. Clip đóng gói về retention thường (không xóa ngay). Có audit `WAREHOUSE_STATUS_ADJUST`. Thất lạc thật → tạo hồ sơ `LOST_IN_TRANSIT` từ cảnh báo (tự kèm PACK) | `orders/adjust.py:112-140`; `returns/service.py:221-238`; `claims/service.py:462-548` | Đúng |
| D5 | Kiện mất trên đường **đi** (HANDED_OVER mãi không DELIVERED) có cảnh báo? | Không có quy tắc. Ngoài phạm vi Phase 2 (BR-10..20 không có) | `reconciliation/rules.py:290-298` | Thiếu — Minor (L23, backlog) |

### E. Retention, bảo vệ bằng chứng

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| E1 | Retention có thể xóa clip đang là bằng chứng của hồ sơ mở / sắp nộp? | Không. Ứng viên J-02 lọc `NOT EXISTS` theo phiên được bảo vệ: (a) hồ sơ khiếu nại ≠ CLOSED, (b) hồ sơ hàng hoàn mở + 7 ngày sau khi nhận, (c) NO_PARCEL 30 ngày. Sau đó khóa từng clip `FOR UPDATE` và **kiểm lại** dưới khóa. Thêm bằng chứng cũng khóa clip / ảnh trước (DEC-251). Có `schema_guard` (image lệch schema thì không xóa) | `media/service.py:696-703`, `:740-800`; `media/protection.py:64-129`, `:156-171`; `claims/service.py:192-255` | Đúng |
| E2 | Đóng hồ sơ khiếu nại thì clip bị xóa ngay? | Không: hạn = max(`end_at`, `closed_at`) + số ngày giữ (≥ 60). UI báo trước khi đóng | `media/protection.py:80-101`, `:276-306`; `claims/copy.ts:102` | Đúng |
| E3 | CSKH bỏ một bằng chứng khỏi hồ sơ (ví dụ clip giữ từ Phase 1 đã 120 ngày, hoặc PACK của kiện cũ)? | Được. Bằng chứng **thêm tay** (kể cả bằng chứng của hồ sơ `LEGACY_HOLD` — migration ghi `auto=false`) bỏ **không cần lý do, không hộp xác nhận**. Bằng chứng tự chọn cần lý do ≥ 5 ký tự. Bỏ xong, clip quá `end_at + số ngày giữ` mất bảo vệ → **J-02 02:00 xóa vĩnh viễn**, không cảnh báo. Đóng hồ sơ thì có tính lại từ hôm nay; bỏ bằng chứng thì không. Có audit `CLAIM_EVIDENCE_UPDATE` + ghi chú. L7 Phase 1 vẫn còn qua đường này | `claims/service.py:682-712`; `0004_hold_to_claims.py:240-243`, `:276-279`; `claims/EvidenceList.tsx:183`; `media/service.py:696-703` | Lệch — **Major (L15)** |
| E4 | Admin hạ số ngày giữ clip? | Không dưới sàn `RETENTION_CLIP_MIN_DAYS` (mặc định 60). Hạ thì phải xác nhận kèm số clip / giờ video sẽ xóa, có audit `RETENTION_REDUCED`. J-02 luôn dùng max(setting, sàn) | `settings/service.py:78-123`; `media/protection.py:38-40`; `media/service.py:757` | Đúng (L2 đã xử lý) |
| E5 | Q13: hạn khiếu nại thật của Shopee / TikTok so với 60 / 90 ngày giữ clip? | Code giữ vô hạn khi có hồ sơ. Nhưng khiếu nại phát sinh **sau** khi clip đã quá hạn (không có hồ sơ hàng hoàn / khiếu nại nào giữ trước) thì clip đã mất. Mặc định `claim_deadline_days = 7` vẫn là đề xuất | `media/protection.py:38-40`; `claims/service.py:280-284`; [lat-08](../../../nghiep-vu/02-returns-reconciliation/lat-08-ho-so-khieu-nai.md) "Lưu ý" | Thiếu — chặn go-live (L1) |
| E6 | Clip cắt hỏng (FAILED) của phiên đang có hồ sơ: video thô có bị dọn trước khi cắt lại? | Video thô của phiên có clip FAILED / PENDING được giữ trong số ngày giữ clip; quá hạn đó mới theo retention thường | `media/service.py:671-693`, `:760` | Đúng |

### F–G. Quyền, sửa kết luận

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| G1 | Tài khoản bàn hoàn (Station) xem clip đóng gói gốc của bất kỳ đơn nào? | Không. Chỉ khi station có phiên RETURN `OPEN/WAITING_APPROVAL` của chính kiện đó (hoặc kiện cùng hồ sơ hàng hoàn). Station không gọi được API hồ sơ khiếu nại | `media/service.py:488-514`; `claims/router.py:35` | Đúng |
| G2 | CSKH giữ / bỏ giữ clip, xử lý cảnh báo, sửa kết luận? | Giữ / bỏ giữ chỉ ADMIN. Xử lý cảnh báo, gắn đơn, sửa kết luận chỉ ADMIN / SUPERVISOR. CSKH tạo / sửa / đóng hồ sơ, xuất zip, sửa bằng chứng (xem E3) | `media/router.py:58-61`; `reconciliation/router.py:53-55`; `returns/router.py:62-64`; `orders/router.py:74-76`; `claims/router.py:35` | Đúng |
| G3 | Sửa kết luận sau khi hồ sơ khiếu nại đã tạo? | ≤ 7 ngày, lý do 5–500, lưu `before` + cờ `INSPECTION_CORRECTED`, audit. OK → vấn đề: tạo hồ sơ. Vấn đề → vấn đề khác: hồ sơ `NEW` đổi loại; hồ sơ đã gửi giữ + ghi chú + tạo hồ sơ loại mới. Vấn đề → OK: chỉ đóng hồ sơ `NEW`. Hồ sơ **đã gửi sàn** không có ghi chú nào, trong khi zip xuất sau đó có `ket-luan.json` "Nguyên vẹn" | `sessions/correction.py:45-52`, `:104-151`; `claims/service.py:391-459` | Lệch nhẹ — Minor (L20) |
| G4 | Sửa kết luận sau 7 ngày, clip còn không? | Bị chặn `CORRECTION_WINDOW_EXPIRED`. Bảo vệ clip +7 ngày sau khi nhận khớp đúng cửa sổ này | `sessions/correction.py:50-51`; `media/protection.py:34` | Đúng |
| G5 | Ai biết người nào đã kiểm kiện hoàn? | Tên người kiểm bắt buộc trước khi mở phiên. Tên ghi vào phiên, `info.json`, `ket-luan.json` | `sessions/return_scan.py:467-468`, `:337`; `media/exports.py:425-442`; `claims/pack.py:400` | Đúng |

### H. Migration, rollback

| # | Câu hỏi | Trả lời theo code | Nguồn file:line | Đánh giá |
|---|---|---|---|---|
| H1 | Nâng cấp: clip đang "giữ" ở Phase 1 có mất? | Chuyển thành hồ sơ `LEGACY_HOLD` theo kiện, `held = false`. Kiểm tập con (clip giữ trước ⊆ được bảo vệ sau), sai thì raise, một transaction | `0004_hold_to_claims.py:1-20`, `:203-279` | Đúng |
| H2 | Rollback về Phase 1 có mất bằng chứng? | Chặn nếu còn phiên hoàn mở, hoặc clip phiên hoàn chưa cắt (trừ khi ops đặt cờ chấp nhận). Mọi clip đang được bảo vệ → `held = true` để code cũ giữ. Dữ liệu Phase 2 chép sang `phase2_archive`, nâng cấp lại khôi phục. Hạn chế: dòng clip phiên RETURN và ảnh rời khỏi bảng chính (code cũ không thấy; migration không xóa file). Clip của hồ sơ **đã đóng** không được `held` → code cũ tính `end_at + ngày giữ`, có thể xóa sớm hơn Phase 2 | `0003_returns_recon_claims.py:758-783`, `:786-853`, `:1038-1041`; `0004_hold_to_claims.py:416-454` | Đúng, lưu ý — Minor (L22) |

Tổng: 44 câu (A 12, B 9, C 5, D 5, E 6, F–G 5, H 2): Đúng 29 · Major 6 (A7, A10, A11, B7, C3, E3 → L11–L15) · Minor 8 (A3, A9, B9, C4, D3, D5, G3, H2 → L16–L23) · Thiếu, chặn go-live 1 (E5 → L1).

## 4. Log mâu thuẫn / thiếu và nơi xử lý (Phase 2)

| # | Vấn đề | Mức | Đề xuất xử lý | Nơi |
|---|---|---|---|---|
| L11 | Video mở hộp **lần đầu** nằm ở phiên RETURN `ABANDONED` / `CANCELLED`. Phiên sau `COMPLETED` tạo hồ sơ chỉ kèm phiên hiện tại → zip mặc định gửi video hộp đã bị rạch. Station tự hủy phiên hoàn không cần duyệt. D2 thôi đếm phiên bỏ dở khi có phiên sau `COMPLETED`; phiên hủy không bao giờ được đếm (A10, A11) | Major | (1) `auto_evidence` thêm mọi phiên RETURN trước đó của kiện / hồ sơ có clip (`auto`, nhãn "phiên trước"), hoặc D17 báo "Kiện có N phiên mở hoàn trước". (2) Hủy phiên RETURN sau khi đã lưu kết luận / chụp ảnh → cần Gọi quản lý. (3) D2 đếm phiên RETURN `CANCELLED` / `ABANDONED` trong 7 ngày. **SOP ngay**: không hủy phiên hoàn sau khi đã rạch băng keo; khi tạo zip, kiểm "phiên khác" | Phase 3 (đầu) + SOP trước go-live |
| L12 | Đơn nhiều kiện, khách trả hàng: kiện gốc được nhận chọn theo thứ tự mã vận đơn, không phải kiện chứa hàng. Trả một phần, hoặc dòng sàn không ghép được SKU → kiện kia tách khỏi hồ sơ. PACK của kiện kia không thêm được vào hồ sơ khiếu nại và mất bảo vệ (b) (B7) | Major | (1) Hồ sơ một phiên có > 1 kiện → R2 cho chọn kiện gốc (hoặc nhận mọi kiện "chờ xác định"). (2) `allowed_sessions` gồm phiên PACK của mọi kiện thuộc `claim.order_id`. (3) `requested_items` có dòng "Không ghép được" → không tách kiện, để Supervisor quyết. **SOP**: đơn nhiều kiện trả hàng → CSKH xem D4 đủ clip các kiện trước khi gửi sàn | Phase 3; chặn go-live nếu shop có nhiều đơn nhiều kiện |
| L13 | "Chỉ hoàn tiền" (khách báo thiếu / không nhận) — loại dễ mất tiền nhất nếu không phản đối kịp — không có cảnh báo D2, không nhắc theo hạn phản hồi người bán, hạn chỉ hiện ở chi tiết (C3) | Major | D2 "Cần xử lý" thêm `NO_PARCEL` chưa có hồ sơ khiếu nại. D14 hiện cột hạn phản hồi người bán; J-15 nhắc trước hạn ≤ 48 giờ. **SOP**: CSKH mở tab "Chỉ hoàn tiền" mỗi sáng | Phase 3 (đầu) + SOP |
| L14 | Hạn khiếu nại = `seller_due_at` (Shopee `return_seller_due_date`, chưa xác minh nghĩa T-3), chép một lần. Hồ sơ có thể sinh ra đã quá hạn. D2 không đếm hồ sơ quá hạn; J-15 chỉ ghi chú một lần (A7) | Major | T-3 xác minh trường hạn. Hồ sơ tạo ra đã quá hạn → dùng mặc định + ghi chú "hạn sàn đã qua". D2 thêm "Hồ sơ quá hạn chưa gửi". Gộp với Q13 | **Chặn go-live** (cùng Q13, T-3) |
| L15 | Bỏ bằng chứng khỏi hồ sơ: bằng chứng thêm tay / `LEGACY_HOLD` bỏ không lý do, không xác nhận. Clip đã quá hạn giữ bị J-02 xóa vĩnh viễn ngay 02:00 đêm đó, không cảnh báo. L7 Phase 1 vẫn còn qua đường này (E3) | Major | (1) Bỏ bằng chứng → hạn = max(`end_at`, lúc bỏ) + ngày giữ (như đóng hồ sơ), hoặc hộp xác nhận "Clip này sẽ bị xóa lúc 02:00 ngày …". (2) Bắt lý do cho mọi lần bỏ. **SOP**: không bỏ bằng chứng hồ sơ "Chuyển từ cờ giữ" — đóng hồ sơ có lý do | Phase 3 (đầu) + SOP |
| L16 | Bên nhận (`counterparty`) chỉ đặt lúc tạo, không sửa được, không đổi khi hồ sơ hàng hoàn đổi loại (về sớm → giao thất bại) (A3) | Minor | API-133 cho sửa `counterparty` (audit); hoặc ghi chú hệ thống khi loại hồ sơ hàng hoàn đổi | Backlog / Phase 3 |
| L17 | Sàn `CLOSED` (khách không gửi) không hủy hồ sơ → BR-12 cảnh báo Cao giả sau 7 ngày. N = 7 ngày từ lúc chấp nhận có thể ngắn (C4, D1) | Minor | `CLOSED` khi chưa kiện nào về → xử lý như `CANCELLED` (sau T-3). Đo thời gian về thực tế để đặt N | Phase 3 (sau T-3) |
| L18 | BR-11 không lọc theo `recon_start_at` → loạt cảnh báo Trung bình cho kiện hủy-sau-đóng cũ ngày go-live (D3) | Minor | Ops đếm trước go-live; thêm mốc hoặc nút xử lý hàng loạt | SOP go-live / backlog |
| L19 | Về trước khi sàn báo, đơn > 1 kiện, khách chỉ gửi 1 kiện → hồ sơ `PARTIALLY_RECEIVED` mãi (không có chuyển tay từ `DELIVERED`), clip giữ vô hạn (B9) | Minor | Cho Supervisor "tách kiện khỏi hồ sơ" / đóng hồ sơ | Backlog |
| L20 | Sửa kết luận vấn đề → OK: hồ sơ khiếu nại **đã gửi sàn** không có ghi chú, nhưng zip sau đó có `ket-luan.json` "Nguyên vẹn" (G3) | Minor | Ghi chú hệ thống như nhánh đổi loại | Phase 3 |
| L21 | D17 `missing` không báo clip `FAILED` (PACK / RETURN); chỉ zip ghi. Cờ `NO_PACK_CLIP` lúc mở hoàn xét theo phiên, không xét clip còn hay đã xóa (A9) | Minor | Thêm `PACK_CLIP_FAILED`, `RETURN_CLIP_FAILED` | Backlog |
| L22 | Rollback: clip của hồ sơ khiếu nại đã đóng không được `held` → code cũ có thể xóa sớm hơn Phase 2. Clip / ảnh phiên hoàn ẩn khỏi Phase 1 tới khi nâng cấp lại (H2) | Minor | Ghi vào runbook rollback (docs/ops.md): rollback ngắn ngày, nâng cấp lại sớm | SOP / 05-release |
| L23 | Không có quy tắc cho kiện mất chiều đi (HANDED_OVER lâu không DELIVERED) (D5) | Minor | Quy tắc mới (BR-mới) | Backlog |

## 5. Trạng thái L1–L10 của Phase 1 (xác nhận bằng code)

| # | Vấn đề Phase 1 | Trạng thái | Bằng chứng |
|---|---|---|---|
| L1 | Q13 chưa đóng | **Mở — chặn go-live** | `claim_deadline_days = 7`, retention 60 / 90 vẫn là đề xuất ([lat-08](../../../nghiep-vu/02-returns-reconciliation/lat-08-ho-so-khieu-nai.md) "Lưu ý"; [04a](04a-test-report.md) TL;DR); nay gộp với L14 |
| L2 | Hạ retention không có sàn / xác nhận | Đã xử lý | `settings/service.py:86-123` (sàn 60, `RETENTION_REDUCTION_UNCONFIRMED`, audit `RETENTION_REDUCED`); `media/service.py:757` |
| L3 | Chữ S3 khiến dán nhầm phiếu | Đã xử lý | `ai-cam-fe/src/features/station/copy.ts:216-223` (hai tình huống "quên quét" / "dán nhầm", "để riêng, chưa dán") |
| L4 | Cờ khay / Cam 2 không lên D2, không báo station | Đã xử lý | `reports/service.py:175-176`; `ai-cam-fe/src/features/station/ClosedNotice.tsx:12-13` |
| L5 | `info.json` thiếu trạng thái, cờ, lệch giờ | Đã xử lý | `media/exports.py:425-442`; giờ camera chụp lúc đóng `sessions/return_scan.py:478-485`, `sessions/service.py:390` |
| L6 | ABANDONED → NEW nhưng đã gửi | Đã xử lý | BR-10 `reconciliation/rules.py:63-90`; chỉnh tay `NEW → HANDED_OVER` `orders/service.py:56` |
| L7 | CSKH bỏ giữ clip | Xử lý một phần | Giữ / bỏ giữ chỉ ADMIN (`media/router.py:58-59`), bảo vệ theo hồ sơ (ADR-009). **Còn đường khác**: CSKH bỏ bằng chứng khỏi hồ sơ → L15 |
| L8 | Không có ảnh lúc đóng | Đã xử lý | J-17 `media/jobs.py:70-76`; ảnh `PACK_CLOSE` vào bằng chứng `claims/service.py:174-189` |
| L9 | Đơn hủy khi đang đóng không báo; UNVERIFIED tồn lâu | Đã xử lý | `sessions/service.py:1057-1064` (cờ `ORDER_CANCELLED` + WS), `:392` (`CANCELLED_AFTER_PACK`); BR-20 `reconciliation/rules.py:264-287` |
| L10 | SOP (quét mở trước, NTP camera, sổ ca) | Chưa xác nhận — SOP go-live | Không phải code. Phase 2 thêm SOP cho L11, L12, L13, L15, L18, L22 |

## 6. Lưu ý cho Phase 3

1. Đầu Phase 3 sửa L11, L13, L15 (nhỏ, chạm trực tiếp tiền khiếu nại), rồi L12 nếu shop có đơn nhiều kiện.
2. T-3 (Shopee thật) quyết L14 và L17: nghĩa của `return_seller_due_date` theo từng giai đoạn, `CLOSED`, `needs_logistics`, `tracking_number`.
3. Q13 + L14 là một quyết định của chủ shop: hạn khiếu nại từng sàn (Shopee, TikTok) cho từng loại (hàng hoàn hỏng, chỉ hoàn tiền, thất lạc) → đặt `claim_deadline_days`, `RETENTION_CLIP_MIN_DAYS`.
4. TikTok Shop: adapter mới phải ánh xạ đủ trạng thái chờ duyệt (BR-12), "chỉ hoàn tiền", hạn người bán.
5. Theo dõi dung lượng ổ do hồ sơ mở lâu giữ clip (ADR-009 "điều kiện xem lại" > 10 %) — L19 làm tăng thêm.
