# Test Cases — 02 Hàng hoàn và đối soát

| | |
|---|---|
| QA | khanhtt |
| Reviewer | Tech lead · PO |
| Trạng thái | Ready (CP7 tự duyệt theo ủy quyền user — DEC-277) |
| Nguồn | SRS [01-srs.md](01-srs.md) v0.5 · Tech Spec [02](02-tech-spec.md) v0.4, [02a](02a-be-spec.md) v0.4, [02b-station](02b-fe-spec-station.md), [02b-admin](02b-fe-spec-admin.md) v0.4 · Plan [03](03-plan.md) |
| Build / môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml` (api :8180) + FE `pnpm dev` (:5180), adapter `mock`, camera giả — chưa có build Phase 2 (viết song song dev) |
| Last update | 2026-10-05 · QA |

> **TL;DR** — 188 case: 167 chức năng (11 nhóm), 12 phân quyền, 9 NFR; **90 case P1** chặn release (80 chức năng + 10 phân quyền).
> Phủ mọi FR mức M, AC-06, 07, 22..39, BR-07..14, 19..28 (+ BR-03, 06, 09, 16, 18, 21 Phase 1 bị chạm), EX-R1..R16, EX-P12, P13, chuyển trạng thái kiện / hồ sơ / phiên, mã lỗi API mới, ma trận quyền 4 vai, NFR-01, 03, 09, 32..36, migration up / down / up, hồi quy Phase 1.
> Dự kiến **"chưa test — thiếu tài nguyên"**: 7 case — 2 cần Shopee returns thật (TC-05.44, 05.45 — T-3), 4 cần camera / kiện / máy quét thật (TC-HW.01..04 — T-4), 1 cần server kho (TC-HW.05). Phần còn lại chạy trên stack dev với adapter mock + camera giả. Kết quả chạy & bug: `04a-test-report.md` (chưa có).

<!-- Đối tượng đọc: người chạy test (kể cả người mới) và người duyệt release. Mỗi case chạy lại được
bởi người khác mà không cần hỏi: tiền điều kiện (PRE-x ở §1), bước đánh số, dữ liệu cụ thể, kỳ vọng có giá trị. -->

---

## 1. Phạm vi & chiến lược

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Mọi FR trong phạm vi 01 §1 (43 FR), AC-06, 07, 22..39 | Gửi khiếu nại lên Shopee qua API (Non-goal) |
| API qua HTTP thật (quyền, mã lỗi), job với adapter mock + đồng hồ giả | Unit test của dev (02a §11, 02b §13) — QA chỉ kiểm có chạy |
| E2E station R1–R5 + dashboard D14–D17 trên Chromium | Báo cáo FR-09.02..04, thông báo FR-06.04 (Phase 3) |
| Migration 0003 / 0004 up / down / up trên dữ liệu thử | Pentest |
| Hồi quy Phase 1: quét đóng gói, retention, xuất, giữ clip | Case Phase 1 không bị chạm (giữ ở item 01 04) |

| Mức | Phạm vi | Công cụ / lệnh | Tự động |
|---|---|---|:---:|
| Unit + integration (dev) | 02a §11, 02b §13 | `cd ai-cam-be && uv run pytest` · `cd ai-cam-fe && pnpm test` | ✔ |
| API (QA, stack thật) | Cách `API`, ma trận §3 | `cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest tests/qa -m qa -k m6` (`tests/qa/test_m6_live.py`, T-118) | ✔ |
| Integration đồng hồ giả | Cách `INT` | `cd ai-cam-be && uv run pytest tests/integration` (`clock.freeze/advance`, `MockAdapter` returns) | ✔ |
| Migration | Cách `MIG` | `uv run pytest tests/integration/test_migration_0004.py tests/integration/test_rollback_phase2.py` (T-111, T-120) | ✔ |
| E2E / UI | Cách `E2E` | `cd ai-cam-fe && pnpm e2e` (mock) · `pnpm e2e:real` (BE thật; `e2e/real/returns.spec.ts`, `claims.spec.ts`, `recon.spec.ts`) | ✔ |
| Phần cứng | Cách `HW` | Thủ công tại bàn thử (T-4), quay màn hình | ✗ |
| Shopee thật | Cách `SHP` | Thủ công với tài khoản partner (T-3) | ✗ |
| NFR | §4 | locust `LOAD_PROFILE=returns` (T-118), đồng hồ bấm, `EXPLAIN ANALYZE` | một phần |

Cột **Cách**: `API` · `INT` · `MIG` · `E2E` · `HW` · `SHP` · `MAN`.

**Tiền điều kiện chuẩn** — PRE-1..PRE-7 **không đổi**, xem [item 01 04 §1](../01-packing-mvp/04-test-cases.md#1-phạm-vi--chiến-lược). Thêm:

| Mã | Tiền điều kiện |
|---|---|
| PRE-8 | PRE-2; `TST Station 01` loại "Cả hai" đã chuyển chế độ nhận hoàn (API-100 `RETURN`), người kiểm "Lan QA" (API-101); station ở R1 "SẴN SÀNG NHẬN HÀNG HOÀN" |
| PRE-9 | PRE-1 với `SHOPEE_ENABLED=true`, `PLATFORM_ADAPTER=mock`; shop mock `CONNECTED`; chạy J-13 ngay: `docker compose -f ai-cam-be/docker/compose.dev.yml exec -T worker celery -A aicam.workers.celery_app call platforms.sync_returns` (cần xác nhận lệnh — T-116) |
| PRE-10 | Pytest integration (Cách `INT`): DB test trống, factory + `MockAdapter` returns, `clock.freeze` |
| PRE-11 | Bản sao DB Phase 1 (`qa-reset.sh` + 3 clip `held = true` của 2 kiện `SPXTST0000010`, `SPXTST0000012` + 1 clip `READY` không giữ) ở revision 0002 |
| PRE-12 | PRE-3 với vai `tst_cskh` (CSKH) hoặc `tst_sup` (SUPERVISOR) khi case ghi rõ |

**Dữ liệu test** — mở rộng `aicam seed-demo` (T-116; dự kiến, **cần xác nhận khi T-116 xong**). Dữ liệu Phase 1 giữ nguyên (`SPXTST0000001..30`); mã hàng hoàn dùng dải `SPXTST00000[2-4]x` và mã chiều về `SPXRTTST…`.

| Dữ liệu | Giá trị sau reset |
|---|---|
| Station | `TST Station 01` loại **Cả hai** (Cam 1 / Cam 2 giả) · `TST Station 02` loại **Nhận hoàn** (không camera) |
| `SPXTST0000041` (đơn `2410TST00041`) | `DELIVERED`; phiên PACK `COMPLETED` có clip + ảnh lúc đóng gói; mock có yêu cầu trả `2410RTTST041` **Khách trả hàng**, mã chiều về `SPXRTTST000041`, yêu cầu 2 × "Áo thun basic · Đen / L" (đơn gửi 2), lý do "Hàng bị hư" — "Áo bị rách ở tay", hạn người bán = reset + 3 ngày |
| `SPXTST0000042` | `HANDED_OVER`; mock J-06 trả `LOGISTICS_DELIVERY_FAILED` (giao thất bại) |
| `SPXTST0000043-1`, `-2` (đơn `2410TST00043`, 2 kiện) | `HANDED_OVER`; mock đơn `TO_RETURN` (giao thất bại 2 kiện) |
| `SPXTST0000044` | `DELIVERED`; mock yêu cầu **chỉ hoàn tiền** `2410RTTST044` lý do "Thiếu hàng" |
| `SPXTST0000045` | `DELIVERED`; mock yêu cầu `2410RTTST045` lần đồng bộ 1 `ACCEPTED`, lần 2 `CANCELLED` |
| `SPXTST0000046` | `HANDED_OVER`; mock không có tín hiệu hoàn (dùng cho "về trước khi sàn báo") |
| `SPXTST0000047-1`, `-2` (đơn `2410TST00047`) | `DELIVERED`; yêu cầu trả **trọn đơn**, mã chiều về `SPXRTTST000047` |
| `SPXTST0000048-1`, `-2` (đơn `2410TST00048`) | `DELIVERED`; yêu cầu trả **một phần** (1 áo), mã chiều về `SPXRTTST000048` |
| `SPXTST0000049` | `RETURN_EXPECTED`, `status_changed_at` = reset − 8 ngày (BR-12) |
| `SPXTST0000050` | `NEW` (đơn trước khi dùng hệ thống), sàn `COMPLETED`, mock có yêu cầu trả `2410RTTST050` |
| `SPXTST0000051` | `DELIVERED`; mock yêu cầu `REFUND_PAID` khi kiện chưa về (BR-19) |
| `SPXTST0000052` | `PACKED` 25 giờ trước reset, sàn chưa lấy (BR-14) |
| `SPXVN0000000000` | Không có trên sàn mock (mã lạ) |
| Phase 1 giữ nguyên | `SPXTST0000009` hủy · `…010` `PACKED` · `…011` `HANDED_OVER` · `…012` `NEW` 3 sản phẩm |

**Tua giờ:** chạy ở `INT`, hoặc trên stack thật hạ ngưỡng: `UPDATE setting SET return_warn_minutes=1, return_abandon_minutes=2, return_missing_days=1, handover_warn_hours=1` (psql như item 01 04 §1).
**Dọn:** `ai-cam-be/scripts/qa-reset.sh` (dọn cả `snapshots/`, `exports/pack-*`).
**Vào:** spec G2 ✅ (DEC-274), build M-n tương ứng deploy được trên stack dev, `seed-demo` có dữ liệu trên. **Ra (G4):** mọi AC + FR mức M có TC ✅ có bằng chứng hoặc ⛔ "chưa test — thiếu tài nguyên" có DEC; bug Critical / High = 0; hồi quy Phase 1 ✅.

## 2. Test cases

Loại: Happy · Negative · Boundary · Permission · State · Regression · NFR. Ưu tiên: P1 (chặn release) · P2 · P3. KQ: ⬜ chưa chạy.

### M04 — Phiên mở hoàn (station)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-04.01 | Bắt đầu ca: R5 bắt buộc | FR-04.10, BR-28, UC-14 | Happy | P1 | E2E | PRE-2, Station 01 chưa có người kiểm | 1. Bấm "Chuyển sang nhận hàng hoàn" ở S1 | Dialog "Người kiểm hàng hoàn" hiện, Esc không đóng; nhập "Lan QA" → "Bắt đầu ca" → R1, thanh trạng thái "Người kiểm: Lan QA", chip "Nhận hàng hoàn"; audit `STATION_WORK_MODE`, `STATION_OPERATOR` | ⬜ |
| TC-04.02 | Tên người kiểm sai độ dài | FR-04.10 | Boundary | P3 | E2E | Như TC-04.01 | 1. Nhập "L" → "Bắt đầu ca" 2. Nhập 41 ký tự | 1. "Nhập tên người kiểm." / lỗi dưới ô (2–40) 2. Lỗi dưới ô; không lưu | ⬜ |
| TC-04.03 | Quét khi chưa có người kiểm | BR-28 | Negative | P1 | API | PRE-5, Station 01 `work_mode = RETURN`, `operator_name = NULL` | 1. API-11 `SPXRTTST000041` | `outcome = ALERT`, `alert.code = OPERATOR_REQUIRED`; không có phiên; FE mở R5 | ⬜ |
| TC-04.04 | Mở phiên bằng mã chiều về | FR-04.01, 04.02, AC-22, UC-02 | Happy | P1 | E2E | PRE-8, PRE-9 (yêu cầu 41 đã đồng bộ) | 1. Quét `SPXRTTST000041` | ≤ 1 giây: nền tím "ĐANG KIỂM HÀNG HOÀN", mã `SPXRTTST000041`, chip "Khách trả hàng", "Đơn 2410TST00041", "Mã gốc SPXTST0000041", "Lý do của khách: Hàng bị hư · Áo bị rách ở tay"; dòng Áo thun: gửi 2, yêu cầu trả 2, nhận 2, "Nguyên vẹn"; cột "Lúc đóng gói" có ảnh + "Xem clip đóng gói"; bíp; kiện `RETURN_INSPECTING`, hồ sơ `INSPECTING` | ⬜ |
| TC-04.05 | Mở phiên bằng mã vận đơn gốc | FR-04.01, AC-22 | Happy | P1 | API | PRE-5, PRE-8, PRE-9 | 1. API-11 `SPXTST0000041` | `SESSION_OPENED`; `state.session.return_case.code` = `HH-…` của yêu cầu 41 (không tạo hồ sơ mới) | ⬜ |
| TC-04.06 | Mở phiên bằng mã đơn sàn | FR-04.01, AC-22 | Happy | P1 | API | Như TC-04.05 | 1. API-11 `2410TST00041` | `SESSION_OPENED`, cùng hồ sơ | ⬜ |
| TC-04.07 | Đo phản hồi mở / đóng 3 loại mã | AC-22, NFR-01 | NFR | P1 | API | PRE-8, 5 kiện mỗi loại | 1. 15 lần mở + 15 lần đóng (ghi thời gian API-11) | p95 ≤ 1 giây (máy dev) | ⬜ |
| TC-04.08 | Mã lạ → R4 KHÔNG TÌM THẤY ĐƠN | FR-04.13, EX-R12, AC-22 | Negative | P1 | E2E | PRE-8 | 1. Quét `SPXVN0000000000` | ≤ 3 giây: R4 "KHÔNG TÌM THẤY ĐƠN", nút "Tìm thủ công", "Mở phiên chưa xác định"; 2 bíp; API-11 `RETURN_NOT_FOUND`, `can_open_unidentified = true` | ⬜ |
| TC-04.09 | Mở phiên chưa xác định | FR-04.13, UC-13 | Happy | P1 | E2E | Tiếp TC-04.08 | 1. Bấm "Mở phiên chưa xác định" | R2 chip "Chưa xác định", bảng thay bằng "Chưa có danh sách sản phẩm. Chọn kết luận chung."; DB: hồ sơ `UNIDENTIFIED`, kiện tạm `is_placeholder`, mã `TAM-` + 6 số, `session.open_code = SPXVN0000000000` | ⬜ |
| TC-04.10 | Kiện chưa gửi đi | EX-R6 | Negative | P1 | E2E | PRE-8 | 1. Quét `SPXTST0000010` (`PACKED`) | R4 "KIỆN CHƯA GỬI ĐI" + "SPX…010 đang ở trạng thái Đã đóng gói trong kho. Đây không phải hàng hoàn." + câu báo quản lý; không phiên | ⬜ |
| TC-04.11 | Kiện đã nhận + lối thoát "kiện khác" | EX-R11, DEC-265, AC-34 | Negative | P1 | E2E | Kiện `SPXTST0000041` đã `RETURN_RECEIVED_OK` | 1. Quét `SPXTST0000041` 2. Bấm "Đây là kiện khác — vẫn ghi hình" 3. Nhập ghi chú "Kiện thứ hai cùng mã" → xác nhận | 1. R4 "KIỆN HOÀN ĐÃ NHẬN", "…đã nhận lúc … tại TST Station 01 — Nguyên vẹn." 3. R2 chip "Chưa xác định"; hồ sơ mới `UNIDENTIFIED` `manual_link_only`, `force_note` đúng chữ; audit `RETURN_FORCE_NEW` | ⬜ |
| TC-04.12 | `force_new` khi kiện chưa nhận bị từ chối | 02 §6.5 #1 | Negative | P2 | API | PRE-5, PRE-8 | 1. API-105 `{unidentified_code: "SPXTST0000042", force_new: true, note: "thử"}` | `409 FORCE_NEW_NOT_ALLOWED`, `details.reason` ≠ `RETURN_ALREADY_RECEIVED`; không tạo hồ sơ | ⬜ |
| TC-04.13 | Đơn nhiều kiện quét bằng mã đơn | EX-R4, DEC-229 | Negative | P2 | E2E | PRE-8; đơn 47 khi chưa chạy J-13 (chưa có hồ sơ hàng hoàn) | 1. Quét `2410TST00047` | R4 "ĐƠN CÓ NHIỀU KIỆN" 1,5 giây → R3 mở với ô = `2410TST00047`, 2 dòng `SPXTST0000047-1`, `-2` | ⬜ |
| TC-04.14 | Kiện đang kiểm ở station khác | BR-02, 02 API-11 | Negative | P2 | API | PRE-5; Station 02 (Nhận hoàn, người kiểm "B") đang mở phiên `SPXTST0000042` | 1. Station 01 API-11 `SPXTST0000042` | `ALERT RETURN_IN_PROGRESS_ELSEWHERE`, `data.station_name = "TST Station 02"` | ⬜ |
| TC-04.15 | Chọn kết luận theo dòng — khóa "Nguyên vẹn" | FR-04.03, 04.09, BR-22, AC-34 | Boundary | P1 | E2E | Trong R2 của TC-04.04 | 1. Giảm "Nhận" Áo thun 2 → 1 | Nút "Nguyên vẹn" khóa, tooltip "Có dòng thiếu / hỏng — chọn vấn đề."; chọn "Thiếu hàng" được; "Đã lưu" sau ≤ 2 giây (API-102) | ⬜ |
| TC-04.16 | API-102 chặn kết luận mâu thuẫn | BR-22 | Negative | P1 | API | Phiên R2 `OPEN`, `lines_mode = FULL` | 1. API-102 `conclusion: OK`, dòng `quantity_received: 1`, yêu cầu 2 | `422 CONCLUSION_INCONSISTENT`; kết luận không lưu | ⬜ |
| TC-04.17 | "Khác" bắt buộc ghi chú | FR-04.03 | Negative | P2 | API | Như TC-04.16 | 1. API-102 `conclusion: OTHER`, `note: ""` | `422 VALIDATION_ERROR` `fields.note` | ⬜ |
| TC-04.18 | Quét đóng khi chưa kết luận | BR-07, EX-R8, AC-36 | Negative | P1 | E2E | R2 vừa mở, chưa chọn kết luận (đặt `conclusion = null` bằng cách mở phiên mới) | 1. Quét lại `SPXRTTST000041` | Phiên vẫn mở; khối Kết luận viền đỏ "Chọn kết luận trước khi quét đóng."; âm lỗi 1 lần; API-11 `INSPECTION_REQUIRED` | ⬜ |
| TC-04.19 | Đóng bằng mã khác loại cùng hồ sơ | BR-23, AC-36 | Happy | P1 | E2E | R2 mở bằng `SPXRTTST000041`, kết luận "Nguyên vẹn" | 1. Quét `SPXTST0000041` | Về R1, bíp, "Đã nhận SPXRTTST000041 — Nguyên vẹn."; kiện `RETURN_RECEIVED_OK`, hồ sơ `RECEIVED_OK`; không có hồ sơ khiếu nại | ⬜ |
| TC-04.20 | Quét mã không thuộc hồ sơ khi đang kiểm | BR-23, EX-R9, AC-36 | Negative | P1 | E2E | R2 mở hồ sơ 41 | 1. Quét `SPXTST0000042` | Alert vàng "Mã SPXTST0000042 không thuộc kiện đang kiểm. Quét lại mã trên kiện này để hoàn tất." 5 giây; phiên vẫn `OPEN`; API-11 `RETURN_CODE_DIFFERENT` | ⬜ |
| TC-04.21 | Kết luận có vấn đề → hồ sơ khiếu nại | FR-04.06, BR-08, AC-06 | Happy | P1 | E2E | R2 hồ sơ 41, kết luận "Hộp rỗng", dòng nhận 0 "Thiếu hàng" | 1. Quét lại mã | R1 Alert "Đã nhận SPXRTTST000041 — Hộp rỗng. Đã tạo hồ sơ khiếu nại KN-000001."; kiện `RETURN_RECEIVED_ISSUE`; API-132: loại `EMPTY_BOX`, bên nhận Sàn, bằng chứng tự chọn = phiên PACK hiệu lực + phiên RETURN + ảnh, hạn = hạn người bán của yêu cầu | ⬜ |
| TC-04.22 | AC-06 10 kiện | AC-06 | Happy | P1 | API | PRE-8, 10 hồ sơ (5 OK, 5 có vấn đề — 5 loại) | 1. Mở / kết luận / đóng 10 kiện | 10 phiên `COMPLETED` có kết luận; 5 hồ sơ khiếu nại đúng loại, mỗi hồ sơ có clip đóng gói + clip mở hoàn (sau J-01 READY) | ⬜ |
| TC-04.23 | Giao thất bại hư hỏng → bên nhận ĐVVC | BR-08 | Happy | P2 | API | Hồ sơ `FAILED_DELIVERY` kiện 42 | 1. Mở, kết luận "Hư hỏng", đóng | Hồ sơ khiếu nại `counterparty = CARRIER` | ⬜ |
| TC-04.24 | Hủy phiên hoàn | API-12, FR-04.* | Happy | P2 | E2E | R2 hồ sơ 41 (kiện trước đó `RETURN_EXPECTED`) | 1. "Hủy phiên" → "Không phải hàng hoàn" → Hủy | Về R1; kiện về `RETURN_EXPECTED`; hồ sơ về `EXPECTED`; clip phiên vẫn cắt | ⬜ |
| TC-04.25 | Hủy phiên chưa xác định | API-12 | State | P3 | API | Phiên từ TC-04.09 | 1. API-12 `WRONG_SCAN` | Hồ sơ `UNIDENTIFIED` → `CANCELLED`; kiện tạm còn (có phiên) | ⬜ |
| TC-04.26 | Quá giờ có kết luận → tự hoàn tất | EX-R15, DEC-253, AC-39 | State | P1 | INT | PRE-10, phiên RETURN đã lưu kết luận "Hộp rỗng" | 1. `advance(46 phút)` 2. Chạy J-07 | Phiên `COMPLETED` + cờ `AUTO_CLOSED`; kiện `RETURN_RECEIVED_ISSUE`; hồ sơ khiếu nại tạo; WS-01 `alert SESSION_AUTO_CLOSED` có `closed_session.claim_code` | ⬜ |
| TC-04.27 | Quá giờ chưa kết luận → bỏ dở | EX-R15, AC-39 | State | P1 | INT | PRE-10, phiên RETURN `conclusion = null` | 1. `advance(46 phút)` 2. J-07 | Phiên `ABANDONED`; kiện về trạng thái trước; WS `SESSION_ABANDONED`; API-32 attention `RETURN_SESSION_ABANDONED` | ⬜ |
| TC-04.28 | Thời gian chờ duyệt không tính | R-24, DEC-60 | Boundary | P2 | INT | Phiên RETURN mở 08:00, ASSIST 08:10, duyệt CONTINUE 08:50 | 1. J-07 lúc 09:05, 09:31 | 09:05 chưa bỏ dở; cảnh báo 20 phút lúc 09:10; bỏ dở / tự hoàn tất 09:35 | ⬜ |
| TC-04.29 | Nháp chưa lưu được flush trước quá giờ | DEC-272 | Happy | P2 | E2E | Hạ ngưỡng: cảnh báo 1 phút, tự đóng 2 phút; R2 chọn "Hư hỏng" | 1. Chờ 2 phút không thao tác | API-102 gửi khi tới `warn_at`; phiên tự hoàn tất kết luận "Hư hỏng"; R1 "…đã tự hoàn tất do quá 45 phút" (chữ theo ngưỡng thật) | ⬜ |
| TC-04.30 | Gọi quản lý từ phiên hoàn | API-13, 21, D13 | Happy | P2 | E2E | PRE-4 + PRE-8, R2 mở | 1. "Gọi quản lý" 2. D13 "Cho tiếp tục" | S5 "Gọi quản lý"; D13 thẻ có chip "Mở hoàn", người kiểm; không có nút "Đóng phiên có ghi chú"; sau duyệt về R2 ≤ 2 giây | ⬜ |
| TC-04.31 | CLOSE_WITH_NOTE với phiên hoàn bị từ chối | API-21 | Negative | P3 | API | Yêu cầu ASSIST từ phiên RETURN | 1. API-21 `CLOSE_WITH_NOTE` | `422 INVALID_ACTION` | ⬜ |
| TC-04.32 | Cam 2 thấy mã khác khi đang kiểm hoàn | DEC-203, DEC-246, AC-39 | State | P1 | API | PRE-8 + `fake-cam2` phát phiếu `SPXTST0000003`; phiên RETURN `OPEN` | 1. Chờ khay đổi (≤ 5 giây) 2. API-10 | Phiên vẫn `OPEN`, `state = INSPECTING` (không `MISMATCH`); `session_event` `CAM2_DETECT` ghi mã | ⬜ |
| TC-04.33 | Đổi chế độ khi có phiên | API-100 | Negative | P2 | API | Phiên RETURN `OPEN` | 1. API-100 `PACK` | `409 SESSION_ACTIVE` | ⬜ |
| TC-04.34 | Đổi chế độ station không phải "Cả hai" | API-100, FR-01.07 | Negative | P2 | API | Station 02 (Nhận hoàn) | 1. API-100 `PACK` | `409 MODE_NOT_ALLOWED`; FE không có nút đổi | ⬜ |
| TC-04.35 | Đăng xuất xóa người kiểm | BR-28, R-24 | State | P2 | E2E | PRE-8 | 1. Đăng xuất station (giữ 3 giây) 2. Đăng nhập lại | R5 hiện lại (tên đã xóa) | ⬜ |
| TC-04.36 | Mất WAN khi kiểm hoàn | NFR-09, AC-38 | NFR | P2 | MAN | PRE-8, rút WAN (giữ LAN) 30 phút | 1. Mở / đóng 3 kiện đã đồng bộ 2. Quét mã lạ | Mọi thao tác chạy; mã lạ → R4 sau ≤ 3 giây (tra sàn hết giờ), mở được phiên chưa xác định | ⬜ |

### M04b — Ảnh, tìm thủ công, nhiều kiện

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-04.40 | Chụp ảnh F2 | FR-04.04, AC-33 | Happy | P2 | E2E | R2 mở, Station 01 có `fake-cam1` | 1. Nhấn F2 3 lần | 3 ảnh trong dải ≤ 2 giây mỗi ảnh; API-103 201, `sha256` 64 ký tự; file `snapshots/…` quyền 0444 | ⬜ |
| TC-04.41 | Giới hạn 20 ảnh | FR-04.04 | Boundary | P3 | API | Phiên có 20 ảnh | 1. API-103 | `409 SNAPSHOT_LIMIT`, `details.max = 20`; FE nút "Đã đủ 20 ảnh" | ⬜ |
| TC-04.42 | Cam 1 không kết nối khi chụp | FR-04.04 | Negative | P2 | API | Dừng `fake-cam1` | 1. API-103 | `422 CAMERA_UNREACHABLE` ≤ 3 giây; toast "Không chụp được ảnh từ Cam 1. Thử lại." | ⬜ |
| TC-04.43 | Ảnh lúc đóng gói hiện ở R2 | FR-02.11, 04.12, AC-31 | Happy | P2 | E2E | Kiện 41 có phiên PACK (seed) | 1. Mở R2 hồ sơ 41 | Cột "Lúc đóng gói" có ảnh + giờ đóng gói; "Xem clip đóng gói" mở Dialog Cam 1 / Cam 2 / Ghép phát được | ⬜ |
| TC-04.44 | Không có clip đóng gói | EX-R3 | Negative | P2 | E2E | Hồ sơ đơn 50 (NEW trước hệ thống) | 1. Quét `SPXTST0000050` | R2 mở; "Không có clip đóng gói (đơn trước khi dùng hệ thống)."; cờ phiên `NO_PACK_CLIP` | ⬜ |
| TC-04.45 | Tìm thủ công | FR-04.07, EX-R2 | Happy | P1 | E2E | PRE-8 | 1. "Không quét được mã? Tìm thủ công" 2. Nhập `2410TST0004` → Tìm 3. "Mở phiên" dòng `SPXTST0000041` | 2. Danh sách có `SPXTST0000041` (tiền tố ≥ 6 ký tự) 3. R2 hồ sơ 41 | ⬜ |
| TC-04.46 | Tìm thủ công < 4 ký tự | FR-04.07 | Boundary | P3 | E2E | R3 mở | 1. Nhập `241` → Tìm | "Nhập ít nhất 4 ký tự." | ⬜ |
| TC-04.47 | Quét HID trong ô ghi chú không lọt chữ | DEC-237, RF-11 | Regression | P2 | E2E | R2, focus ô ghi chú | 1. `hidScan("SPXRTTST000041")` | Ô ghi chú không đổi; lần quét xử lý như quét đóng | ⬜ |
| TC-04.48 | Giao thất bại 2 kiện — từng kiện | FR-04.08, BR-24, AC-34 | State | P1 | API | PRE-9 đơn 43 → hồ sơ `FAILED_DELIVERY` 2 kiện | 1. Mở + kết luận chung "Nguyên vẹn" + đóng `SPXTST0000043-1` 2. Lặp với `-2` | Phiên 1: `lines_mode = REFERENCE`, "Nguyên vẹn" không khóa; sau 1: hồ sơ `PARTIALLY_RECEIVED`; sau 2: `RECEIVED_OK` | ⬜ |
| TC-04.49 | Nhiều kiện hỗn hợp (1 nhận, 1 quá hạn) | R-18, BR-12, AC-34 | State | P2 | INT | Hồ sơ đơn 43, kiện 1 đã nhận | 1. `advance(8 ngày)` 2. J-14 | Kiện 2 `RETURN_MISSING` + cảnh báo BR-12; hồ sơ vẫn `PARTIALLY_RECEIVED` | ⬜ |
| TC-04.50 | Đơn 2 kiện về trước khi sàn báo → 2 phiên | DEC-265, AC-34 | State | P1 | API | Đơn 43 **chưa** có tín hiệu sàn (tắt J-06) | 1. Quét + đóng `SPXTST0000043-1` 2. Quét `SPXTST0000043-2` | 1. Hồ sơ `UNANNOUNCED` `PARTIALLY_RECEIVED` 2. `SESSION_OPENED` (không `RETURN_ALREADY_RECEIVED`) | ⬜ |
| TC-04.51 | Khách trả trọn đơn 2 kiện bằng 1 kiện chiều về | DEC-249, 271, AC-34 | State | P1 | API | PRE-9 đơn 47 | 1. Quét `SPXRTTST000047` → kết luận OK → quét lại | Một phiên; cả `-1`, `-2` `RETURN_RECEIVED_OK`; hồ sơ `RECEIVED_OK` | ⬜ |
| TC-04.52 | Khách trả một phần đơn 2 kiện | DEC-271, R3-3, AC-34 | State | P1 | API | PRE-9 đơn 48 | 1. Quét `SPXRTTST000048` (mở trên kiện `-1`) → OK → đóng | Kiện `-1` `RETURN_RECEIVED_OK`; kiện `-2` rời hồ sơ, về `DELIVERED` (status_history nguồn WAREHOUSE "Khách trả một phần") | ⬜ |
| TC-04.53 | Kiện hoàn quét ở bàn đóng gói | EX-R16, DEC-247, AC-39 | Negative | P1 | E2E | PRE-2 (chế độ đóng gói), kiện 49 `RETURN_EXPECTED` | 1. Quét `SPXTST0000049` | S4 "ĐƠN ĐÃ BÀN GIAO" + "Đây là kiện hàng hoàn — nhận ở bàn nhận hoàn."; API-11 200 `ALREADY_HANDED_OVER` `is_return = true` (không 500) | ⬜ |

### M05 — Đồng bộ hàng hoàn (job)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-05.30 | Yêu cầu trả có kiện về | FR-05.05, AC-23, NFR-35 | Happy | P1 | API | PRE-9 | 1. Chạy J-13 2. API-110 `tab=EXPECTED` | Hồ sơ đơn 41 `BUYER_RETURN` `EXPECTED`, mã chiều về, lý do "Hàng bị hư", `seller_due_at`; kiện 41 `RETURN_EXPECTED`; WS `return.updated` | ⬜ |
| TC-05.31 | Chỉ hoàn tiền | FR-05.12, AC-23, EX-R10 | Happy | P1 | API | PRE-9 | 1. J-13 2. API-110 `tab=NO_PARCEL` | Hồ sơ đơn 44 `REFUND_ONLY` / `NO_PARCEL`; kiện 44 vẫn `DELIVERED` | ⬜ |
| TC-05.32 | Sàn hủy yêu cầu trước khi về | EX-R7, AC-23 | State | P1 | INT | Hồ sơ đơn 45 `EXPECTED` | 1. Mock đổi `CANCELLED` 2. J-13 | Hồ sơ `CANCELLED`; kiện `RETURN_EXPECTED → DELIVERED` | ⬜ |
| TC-05.33 | Giao thất bại (J-06) | FR-05.11, AC-23 | Happy | P1 | INT | Kiện 42 `HANDED_OVER` | 1. J-06 | Hồ sơ `FAILED_DELIVERY`; kiện `RETURN_EXPECTED` | ⬜ |
| TC-05.34 | `PACKED` giao thất bại nhanh | DEC-259 | State | P2 | INT | Kiện `PACKED`, mock trả `LOGISTICS_DELIVERY_FAILED` | 1. J-06 | Lịch sử 2 dòng `PACKED → HANDED_OVER → RETURN_EXPECTED`; không lỗi | ⬜ |
| TC-05.35 | Boom COD / hủy sau khi lấy hàng | EX-R14, DEC-258 | Happy | P2 | INT | Kiện `HANDED_OVER`; mock đơn `CANCELLED` hoặc `LOGISTICS_COD_REJECTED` | 1. J-04 / J-06 | Hồ sơ `FAILED_DELIVERY`, kiện `RETURN_EXPECTED` | ⬜ |
| TC-05.36 | Yêu cầu trả + `TO_RETURN` cùng đơn → 1 hồ sơ | DEC-248 | Negative | P1 | INT | Đơn có yêu cầu trả + `TO_RETURN` | 1. J-06 rồi J-13 (và ngược lại) | Đúng 1 hồ sơ mở, `kind = BUYER_RETURN` | ⬜ |
| TC-05.37 | `TO_RETURN` kéo dài nhiều lần đồng bộ | DEC-267, AC-24 | Negative | P2 | INT | Đơn 43 hồ sơ đã `RECEIVED_OK` | 1. J-04 / J-06 chạy 3 lần cùng tín hiệu | Không tạo hồ sơ mới (`signal_keys`) | ⬜ |
| TC-05.38 | Sàn báo sau khi đã nhận (về trước) | EX-R1, BR-13, AC-24 | State | P1 | INT | Kiện 46 nhận ở bàn hoàn (hồ sơ `UNANNOUNCED` `RECEIVED_OK`) | 1. `advance(25 giờ)`, J-14 2. Mock thêm yêu cầu trả cho đơn 46, J-13 3. J-14 | 1. Cảnh báo BR-13 thấp 2. Yêu cầu gắn vào **chính** hồ sơ đó (`kind = BUYER_RETURN`, `platform_return_sn`), không hồ sơ mới 3. Cảnh báo `AUTO_RESOLVED` | ⬜ |
| TC-05.39 | Đơn trước khi dùng hệ thống có hoàn | DEC-254, AC-07 | State | P2 | INT | Kiện 50 `NEW` | 1. J-13 | Kiện `NEW → RETURN_EXPECTED` (PLATFORM) | ⬜ |
| TC-05.40 | Gộp kiện tạm sau khi đơn đồng bộ | DEC-269, R3-2 | State | P2 | INT | Hồ sơ `UNIDENTIFIED` `open_code = SPXTST0000099`, phiên đã đóng; mock thêm đơn có kiện `SPXTST0000099` | 1. J-04 | Hồ sơ gộp vào hồ sơ đơn mới; phiên chuyển sang kiện thật; kiện tạm `TAM-…` xóa | ⬜ |
| TC-05.41 | Gộp chờ khi phiên còn mở | R3-2 | State | P3 | INT | Như TC-05.40 nhưng phiên `OPEN` | 1. J-04 2. Đóng phiên | 1. Chưa gộp, `pending_merge_order_id` đặt 2. Gộp lúc đóng | ⬜ |
| TC-05.42 | Lỗi tạm J-13 | FR-05.08 | Negative | P3 | INT | Mock lỗi 2 lần rồi OK | 1. J-13 | Thành công sau thử lại; không `last_error` | ⬜ |
| TC-05.43 | Lỗi cuối J-13 | FR-05.08 | Negative | P3 | INT | Mock lỗi 5 lần | 1. J-13 | `shop.last_error.code = SYNC_FAILED`; attention `SYNC_ERROR` | ⬜ |
| TC-05.44 | Shopee returns thật | FR-05.05, RK-11 | Happy | P2 | SHP | Tài khoản partner (T-3) | 1. Tạo yêu cầu trả thật 2. J-13 | Đúng mã chiều về, `needs_parcel`, hạn người bán — **chưa test — thiếu partner T-3** | ⬜ |
| TC-05.45 | Mapping trạng thái / lý do thật | 02a §7 | Happy | P3 | SHP | T-3 | 1. Đối chiếu 8 mã lý do, 8 trạng thái | Nhãn đúng — **chưa test — thiếu partner T-3** | ⬜ |

### M06 — Đối soát

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-06.01 | BR-12 quá 7 ngày | AC-07, BR-12, FR-06.02 | State | P1 | INT | Kiện 49 `RETURN_EXPECTED` 8 ngày | 1. J-14 2. API-120 | Kiện `RETURN_MISSING`, hồ sơ `MISSING`; cảnh báo `RETURN_OVERDUE` mức Cao; D14 tab "Quá hạn" có dòng | ⬜ |
| TC-06.02 | AC-07 trên UI | AC-07 | Happy | P1 | E2E | Như TC-06.01, PRE-3 | 1. D15 lọc mức Cao | Dòng "Hàng hoàn quá 7 ngày chưa về" `SPXTST0000049`; D2 "Quá hạn chưa về 1" | ⬜ |
| TC-06.03 | Không trùng khi chạy 2 lần | BR-26, AC-27 | Negative | P1 | INT | Như TC-06.01 | 1. J-14 hai lần | Đúng 1 cảnh báo `OPEN` | ⬜ |
| TC-06.04 | BR-10 giao đi không clip | BR-10, AC-27 | Happy | P1 | INT | Kiện `NEW`, đơn tạo sau `recon_start_at`, sàn `SHIPPED` | 1. J-14 | Cảnh báo `SHIPPED_NOT_PACKED` Cao | ⬜ |
| TC-06.05 | BR-10 bỏ qua đơn cũ | DEC-254 | Negative | P2 | INT | Như trên nhưng `created_at_platform` < `recon_start_at` | 1. J-14 | Không cảnh báo | ⬜ |
| TC-06.06 | BR-11 hủy sau khi đóng | BR-11, AC-27 | Happy | P1 | INT | Kiện `CANCELLED_AFTER_PACK` | 1. J-14 2. API-121 "Đã tháo kiện" 3. J-14 | Cảnh báo TB; sau xử lý không tạo lại (cùng `context_key`) | ⬜ |
| TC-06.07 | BR-13 nhận khi sàn chưa báo | BR-13, AC-27 | Happy | P2 | INT | Hồ sơ `UNANNOUNCED` 25 giờ | 1. J-14 | Cảnh báo Thấp `RETURN_UNANNOUNCED` | ⬜ |
| TC-06.08 | BR-14 đóng xong chưa bàn giao | BR-14, AC-27 | Happy | P1 | INT | Kiện 52 | 1. J-14 2. Mock sàn lấy hàng, J-06, J-14 | Cảnh báo TB; sau khi `HANDED_OVER` → `AUTO_RESOLVED` | ⬜ |
| TC-06.09 | BR-19 sàn đã hoàn tiền, kho chưa nhận | BR-19, AC-27 | Happy | P1 | INT | Kiện 51 | 1. J-13, J-14 | Cảnh báo Cao `RETURN_DONE_NOT_RECEIVED` | ⬜ |
| TC-06.10 | BR-19 không cảnh báo với `CLOSED` | DEC-262 | Negative | P3 | INT | Yêu cầu `CLOSED` không hoàn tiền | 1. J-14 | Không cảnh báo | ⬜ |
| TC-06.11 | BR-20 kiện chưa xác minh 24 giờ | BR-20, AC-27 | Happy | P2 | INT | Kiện `verified = false` tạo 25 giờ trước; kiện tạm `TAM-` cùng tuổi | 1. J-14 | Cảnh báo Thấp cho kiện chưa xác minh; **không** cho kiện tạm | ⬜ |
| TC-06.12 | Xử lý — đánh dấu đã xử lý | FR-06.03, UC-06 | Happy | P1 | E2E | PRE-3 (Supervisor), cảnh báo BR-14 | 1. D15 "Xử lý" → "Đánh dấu đã xử lý" → ghi chú "Đã kiểm kệ" → Xác nhận | Toast "Đã xử lý cảnh báo."; dòng sang tab "Đã xử lý"; audit `RECON_RESOLVE` | ⬜ |
| TC-06.13 | Xử lý — điều chỉnh trạng thái (L6) | FR-06.05, EX-P13 | Happy | P1 | E2E | Cảnh báo BR-10 kiện `NEW` | 1. "Điều chỉnh trạng thái kho" → "Đã bàn giao" + lý do | Kiện `HANDED_OVER` (nguồn Tay); cảnh báo `RESOLVED` `ADJUST_STATUS`; audit `WAREHOUSE_STATUS_ADJUST` | ⬜ |
| TC-06.14 | Điều chỉnh không cho phép | FR-06.05 | Negative | P2 | API | Kiện `RETURN_EXPECTED` | 1. API-122 `to_status: RETURN_RECEIVED_OK` | `409 TRANSITION_NOT_ALLOWED`, `details.allowed` = [`DELIVERED`] | ⬜ |
| TC-06.15 | Gia hạn MISSING → EXPECTED | DEC-255 | State | P2 | INT | Kiện 49 `RETURN_MISSING` | 1. API-122 → `RETURN_EXPECTED` 2. J-14 ngay 3. `advance(8 ngày)` J-14 | 2. Không `MISSING` lại 3. `MISSING` + cảnh báo mới | ⬜ |
| TC-06.16 | Xử lý — tạo hồ sơ thất lạc | FR-08.01, UC-06 | Happy | P2 | E2E | Cảnh báo BR-12 | 1. "Tạo hồ sơ khiếu nại" → Xác nhận | D17 hồ sơ loại "Thất lạc", bên nhận ĐVVC; cảnh báo `RESOLVED` `OPEN_CLAIM` | ⬜ |
| TC-06.17 | Xung đột xử lý | API-121 | Negative | P2 | API | 2 Supervisor | 1. Cùng gửi API-121 | Người sau `409 ALREADY_RESOLVED` kèm `resolved_by`, FE "Cảnh báo này đã được … xử lý lúc …" | ⬜ |
| TC-06.18 | Chạy đối soát ngay | API-123 | Happy | P3 | API | PRE-5 Supervisor | 1. API-123 2. API-123 khi J-14 đang giữ khóa | 1. 202 2. `409 RECON_IN_PROGRESS` | ⬜ |
| TC-06.19 | Chỉnh tay kiện hủy sau đóng đã gửi | DEC-258 | Happy | P3 | API | Kiện `CANCELLED_AFTER_PACK` | 1. API-122 → `HANDED_OVER` 2. Quét ở bàn hoàn | 2. Mở được phiên hoàn | ⬜ |

### M08 — Hồ sơ khiếu nại

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-08.01 | Đi đủ trạng thái | FR-08.03, AC-37 | State | P1 | E2E | PRE-12 (CSKH), hồ sơ KN-000001 `NEW` | 1. "Nhận phụ trách" 2. "Đã gửi" + mã "SPE-998877" 3. "Đang chờ phản hồi" 4. "Thắng" + 150000 đ 5. "Đóng" | Mỗi bước: stepper đổi, ghi chú STATUS_CHANGE; bước 5 Dialog "Sau khi đóng, clip và ảnh…"; `closed_at` đặt; audit `CLAIM_UPDATE` | ⬜ |
| TC-08.02 | "Đã gửi" thiếu mã sàn | FR-08.03 | Negative | P2 | API | Hồ sơ `NEW` | 1. API-133 `status: SUBMITTED`, không ref / reason | `422 VALIDATION_ERROR` | ⬜ |
| TC-08.03 | "Thắng" thiếu số tiền | FR-08.03 | Negative | P2 | API | Hồ sơ `WAITING` | 1. API-133 `WON` không `recovered_amount` | `422` | ⬜ |
| TC-08.04 | Chuyển trạng thái cấm | FR-08.03 | State | P2 | API | Hồ sơ `NEW` | 1. API-133 `WON` | `409 INVALID_TRANSITION`, `details.allowed` = [`SUBMITTED`, `CLOSED`] | ⬜ |
| TC-08.05 | Đóng sớm cần lý do | FR-08.03 | Negative | P2 | API | Hồ sơ `NEW` | 1. API-133 `CLOSED` không `reason` | `422` | ⬜ |
| TC-08.06 | Hồ sơ đã đóng chỉ xem | FR-08.03 | State | P2 | E2E | Hồ sơ `CLOSED` | 1. Mở D17 | Mọi nút khóa trừ "Xuất gói bằng chứng" và thêm ghi chú; API-134 → `409 CLAIM_CLOSED` | ⬜ |
| TC-08.07 | Hai người sửa cùng lúc | DEC-241 | Negative | P2 | API | 2 phiên CSKH, cùng `version` 3 | 1. Người A PATCH 2. Người B PATCH `version` 3 | B `409 VERSION_CONFLICT`, `details.current.version = 4`; FE toast "Hồ sơ vừa được … cập nhật." | ⬜ |
| TC-08.08 | Tạo tay từ D4 | FR-08.01 | Happy | P1 | E2E | PRE-12, kiện `SPXTST0000011` | 1. D4 "Tạo hồ sơ khiếu nại" → "Khách báo thiếu / sai", Sàn, ghi chú | D17 mở; bằng chứng tự chọn = phiên PACK hiệu lực | ⬜ |
| TC-08.09 | Tạo trùng loại | BR-27, AC-37 | Negative | P1 | API | Kiện có hồ sơ `EMPTY_BOX` mở | 1. API-131 cùng kiện + loại | `409 CLAIM_EXISTS` + `details.code`; FE "Mở hồ sơ" | ⬜ |
| TC-08.10 | Hai POST song song | BR-27 | Negative | P2 | INT | Kiện chưa có hồ sơ | 1. 2 request song song | 1 × 201, 1 × `CLAIM_EXISTS` | ⬜ |
| TC-08.11 | Hạn theo hạn người bán | BR-27 | Boundary | P2 | API | Yêu cầu 41 có hạn | 1. Tạo tự động (TC-04.21) | `deadline_at` = `seller_due_at`, `deadline_source = PLATFORM`; không có hạn → tạo + 7 ngày, `DEFAULT` | ⬜ |
| TC-08.12 | Sắp hết hạn | FR-08.04, AC-37 | Happy | P2 | INT | Hồ sơ `NEW` hạn còn 47 giờ | 1. J-15 2. API-32 3. API-130 `due=soon` | Ghi chú "Sắp hết hạn khiếu nại" (1 lần); `claims_due_soon = 1`; D16 hạn đỏ | ⬜ |
| TC-08.13 | Bằng chứng tự chọn — có phiên bị thay thế | FR-08.06 | Happy | P1 | API | Kiện có phiên PACK `SUPERSEDED` + `COMPLETED` | 1. API-131 2. API-132 | `evidence` có phiên `COMPLETED` (auto); `other_sessions` có phiên `SUPERSEDED` | ⬜ |
| TC-08.14 | Không có clip đóng gói | FR-08.06, EX-R3 | Negative | P2 | API | Hồ sơ đơn 50 | 1. API-132 | `missing` có `NO_PACK_CLIP`; D17 "Không có clip đóng gói" | ⬜ |
| TC-08.15 | Bỏ bằng chứng tự chọn cần lý do | R-19 | Negative | P2 | API | Hồ sơ có evidence `auto` | 1. API-134 bỏ phiên auto, không `note` 2. Có `note` | 1. `422` `fields.note` 2. 200 + ghi chú lý do | ⬜ |
| TC-08.16 | Gói bằng chứng | FR-08.05, AC-25, UC-12 | Happy | P1 | API | Hồ sơ KN-000001 (2 phiên chính, 3 ảnh) | 1. API-136 2. Poll API-137 tới READY 3. API-138 tải zip | ≤ 3 phút; zip có `ho-so.json`, `README.txt`, `01-dong-goi-…/` (`video-ghep-co-chu.mp4`, `goc-CAM1.mp4`, `goc-CAM2.mp4`, `anh-luc-dong-goi.jpg`, `info.json`), `02-mo-hoan-…/` (+ `anh-01..03.jpg`, `ket-luan.json`); SHA-256 clip gốc = DB; audit `EXPORT_CLAIM_PACK`, `DOWNLOAD_CLAIM_PACK` | ⬜ |
| TC-08.17 | Overlay MP4 ghép phiên hoàn | AC-25 | Happy | P2 | MAN | Zip TC-08.16 | 1. Mở `02-mo-hoan-…/video-ghep-co-chu.mp4` trên điện thoại | Có chữ mã vận đơn, giờ, station, "Người kiểm: Lan QA"; phát được | ⬜ |
| TC-08.18 | Gói khi clip đã xóa | FR-08.05 | Negative | P2 | INT | Hồ sơ đóng, clip PACK đã `DELETED` | 1. API-136 | READY; `missing` có `CLIP_DELETED`; `ho-so.json` ghi thiếu | ⬜ |
| TC-08.19 | Gói đang chạy | FR-08.05 | Negative | P3 | API | Gói `RUNNING` | 1. API-136 | `409 PACK_IN_PROGRESS` + `details.pack_id` | ⬜ |
| TC-08.20 | `ket-luan.json` có lịch sử sửa | R-17, DEC-261 | Happy | P2 | API | Phiên đã sửa kết luận 1 lần (TC-07.34) | 1. Xuất gói | `ket-luan.json.corrections[0]` có người sửa, lý do, kết luận trước | ⬜ |
| TC-08.21 | Zip quá 24 giờ | FR-08.05 | State | P3 | INT | Gói READY | 1. `advance(25 giờ)`, J-10 2. API-137 | File + dòng xóa; `404` | ⬜ |

### M02 — Bằng chứng & retention (hardening)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-02.30 | Hồ sơ khiếu nại mở giữ clip | FR-02.06, BR-09 a, AC-26 | State | P1 | INT | Clip PACK + RETURN gắn KN `NEW` | 1. `advance(200 ngày)` 2. J-02 | Clip + ảnh còn; API-31 `protection.reasons` có `CLAIM`, `retention_until = null` | ⬜ |
| TC-02.31 | Đóng hồ sơ → xóa đúng ngày | BR-09, AC-26 | State | P1 | INT | Clip ngày 01/01, hồ sơ đóng 15/05, giữ 90 ngày | 1. J-02 ngày 12/08 2. J-02 ngày 14/08 | 1. Còn 2. `DELETED`; `retention_until` trước đó = 13/08 | ⬜ |
| TC-02.32 | Hồ sơ hàng hoàn mở giữ clip đóng gói | BR-09 b, R-1, AC-26 | State | P1 | INT | Retention 60 ngày; clip PACK 61 ngày tuổi; kiện `RETURN_MISSING` | 1. J-02 2. Kiện về, kết luận "Hộp rỗng" | 1. Clip còn (`protection.reasons = [RETURN_CASE]`) 2. Hồ sơ khiếu nại có clip READY | ⬜ |
| TC-02.33 | Giữ thêm 7 ngày sau khi nhận | BR-09 b, DEC-268, AC-26 | State | P1 | INT | Clip PACK quá tuổi; nhận "Nguyên vẹn" | 1. `advance(5 ngày)`, sửa kết luận "Hộp rỗng" (API-113) 2. Hồ sơ không có vấn đề: `advance(8 ngày)` J-02 | 1. Hồ sơ khiếu nại có clip 2. Clip bị xóa sau ngày thứ 7 | ⬜ |
| TC-02.34 | Chỉ hoàn tiền giữ 30 ngày | BR-09 c | State | P2 | INT | Hồ sơ `NO_PARCEL`, clip PACK quá tuổi | 1. J-02 ngày 29 2. Ngày 31 | 1. Còn, `protection.until` 2. Xóa | ⬜ |
| TC-02.35 | API-42 chỉ Admin | FR-02.09, DEC-209 | Permission | P1 | API | PRE-5 | 1. API-42 bằng SUPERVISOR, CSKH 2. Bằng ADMIN | 1. `403` 2. 200 | ⬜ |
| TC-02.36 | D4 không còn "Giữ clip" | FR-02.09 | Regression | P2 | E2E | PRE-12 | 1. Mở D4 kiện có clip | Không nút "Giữ clip"; chip "Đang được giữ: …" hoặc gợi ý "Muốn giữ clip? Tạo hồ sơ khiếu nại." | ⬜ |
| TC-02.37 | Sàn retention | FR-02.10, BR-25, AC-28 | Boundary | P1 | E2E | PRE-3 (Admin), D8 | 1. Số ngày giữ clip = 45 → Lưu | "Số ngày giữ clip không được thấp hơn 60."; API `422 RETENTION_BELOW_MINIMUM` | ⬜ |
| TC-02.38 | Hạ retention cần xác nhận | FR-02.10, AC-28 | Happy | P1 | E2E | Có 312 clip tuổi 70–90 ngày (dữ liệu sinh) | 1. 90 → 70 → Lưu 2. "Giảm và lưu" 3. J-02 | 1. Dialog "Lần dọn tự động lúc 02:00 sẽ xóa 312 clip…" 2. Lưu; audit `RETENTION_REDUCED` có impact 3. Đúng 312 clip `DELETED` (trừ clip được bảo vệ) | ⬜ |
| TC-02.39 | PUT giảm không xác nhận | BR-25 | Negative | P2 | API | | 1. API-80 giảm, `confirm_reduction` thiếu | `409 RETENTION_REDUCTION_UNCONFIRMED` + `details.impact` | ⬜ |
| TC-02.40 | `info.json` thêm trường | FR-02.12, AC-30 | Happy | P1 | API | Phiên PACK có `CAM2_UNVERIFIED` | 1. API-43 → API-45 `info.json` | Có `session_status: COMPLETED`, `flags: ["CAM2_UNVERIFIED"]`, `cameras[]` có `clock_offset_ms` (giá trị lúc đóng phiên) | ⬜ |
| TC-02.41 | `clock_offset_ms` lấy lúc đóng, không lúc xuất | DEC-261 | Negative | P3 | INT | Đóng phiên khi offset 120 ms; sau đó đổi camera 900 ms | 1. Xuất | `info.json` ghi 120 | ⬜ |
| TC-02.42 | Ảnh lúc đóng gói | FR-02.11, AC-31 | Happy | P2 | API | PRE-2, đóng 10 phiên PACK | 1. Chờ, API-31 | Mỗi phiên `pack_snapshot` READY ≤ 90 giây sau đóng | ⬜ |
| TC-02.43 | Race tạo hồ sơ vs J-02 | DEC-251 | Negative | P2 | INT | Clip vừa quá hạn | 1. Song song: tạo hồ sơ + J-02 | Hoặc clip còn và thuộc hồ sơ, hoặc hồ sơ ghi `missing`; không có clip bị xóa sau khi đã là bằng chứng | ⬜ |

### M03 — Đóng gói (hardening Phase 1)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-03.70 | S3 chữ hai tình huống | FR-03.13, AC-29 | Happy | P1 | E2E | PRE-2, phiên `SPXTST0000012` mở | 1. Quét `SPXTST0000013` | S3 "LỆCH MÃ — DỪNG LẠI, CHƯA DÁN PHIẾU", hai khối "1. Kiện SPX…012 đã đóng xong mà quên quét?…" / "2. Vừa dán nhầm phiếu SPX…013…"; **không** có câu "dán đúng phiếu SPX…012" ở khối 1 | ⬜ |
| TC-03.71 | S3 nguồn Cam 2 | FR-03.13 | Happy | P2 | E2E | `fake-cam2` phiếu khác khi phiên mở | 1. Chờ S3 | "Bỏ phiếu … khỏi khay. Phiếu này không thuộc kiện đang đóng." | ⬜ |
| TC-03.72 | Thông báo "Phiếu còn trên khay" | FR-03.14, AC-29 | Happy | P1 | E2E | PRE-2, khay vẫn thấy chính mã phiên khi quét đóng | 1. Quét đóng | S1 Alert vàng "Phiếu SPX… vẫn còn trên khay. Kiểm tra kiện vừa đóng đã dán phiếu chưa." ≤ 1 giây; `closed_session.flags` có `LABEL_ON_TRAY` | ⬜ |
| TC-03.73 | Thông báo "Cam 2 không xác minh" | FR-03.14, AC-29 | Happy | P1 | E2E | Dừng vision trong phiên | 1. Quét đóng | Alert "Cam 2 không xác minh được phiếu của SPX…. Kiểm tra phiếu trên kiện trước khi giao." | ⬜ |
| TC-03.74 | D2 đếm 2 cờ, mở D3 lọc | FR-03.14, AC-29 | Happy | P1 | E2E | Sau TC-03.72, 03.73 | 1. D2 2. Bấm thẻ | Thẻ "Phiếu còn trên khay 1", "Cam 2 không xác minh 1"; D3 lọc cờ + ngày đúng 1 dòng | ⬜ |
| TC-03.75 | Đơn hủy khi đang đóng | FR-03.15, BR-21, AC-32 | State | P1 | API | PRE-9; phiên mở `SPXTST0000012`; mock đơn đổi `CANCELLED` | 1. Chạy J-04 2. API-10 3. Quét đóng | 2. ≤ 5 giây sau job: `flags` có `ORDER_CANCELLED`, WS-01 `alert ORDER_CANCELLED_DURING_SESSION`; S2 banner "ĐƠN VỪA BỊ HỦY TRÊN SHOPEE…" 3. Kiện `CANCELLED_AFTER_PACK`; J-14 → BR-11 | ⬜ |
| TC-03.76 | Hủy tới sau khi phiên đã đóng | R3-8 | State | P2 | INT | Phiên đóng trước khi `flag_order_cancelled` chạy | 1. Chạy task | Kiện `PACKED → CANCELLED_AFTER_PACK` | ⬜ |
| TC-03.77 | Đồng thời J-04 hủy ∥ quét đóng | DEC-266 | Negative | P2 | INT | Phiên mở; luồng song song | 1. J-04 + API-11 đóng cùng lúc ×20 | Không deadlock (≤ 5 giây), kết quả cuối luôn `CANCELLED_AFTER_PACK` | ⬜ |

### M07 / M09 / M01 — Dashboard (D2, D3, D4, D6, D14)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-07.30 | Tra mã chiều về | FR-07.01 | Happy | P1 | E2E | PRE-12, hồ sơ 41 | 1. D3 nhập `SPXRTTST000041` | Mở thẳng D4 kiện 41 | ⬜ |
| TC-07.31 | Lọc trạng thái hoàn / loại phiên | FR-07.01 | Happy | P2 | API | | 1. API-30 `warehouse_status=RETURN_MISSING` 2. `session_type=RETURN` | Đúng kiện; item có `return_case` brief | ⬜ |
| TC-07.32 | D4 khối Hàng hoàn | FR-07.02 | Happy | P1 | E2E | Kiện 41 đã nhận có vấn đề | 1. Mở D4 | Khối "Hàng hoàn": loại, mã yêu cầu, mã chiều về, lý do, kết quả kiểm theo dòng, người kiểm, ảnh, KN; dòng thời gian có `RETURN_*`; chip phiên "Mở hoàn" | ⬜ |
| TC-07.33 | Gắn đơn kiện chưa xác định | FR-04.13, UC-13 | Happy | P1 | E2E | PRE-3 Supervisor, hồ sơ TC-04.09 | 1. D14 tab "Chưa xác định" → dòng 2. "Gắn đơn" → `SPXTST0000046` → "Gắn đơn này" | Hồ sơ gắn đơn 46, `kind = UNANNOUNCED`; phiên sang kiện 46 → `RETURN_RECEIVED_*` theo kết luận; kiện tạm xóa; audit `RETURN_LINK_ORDER` | ⬜ |
| TC-07.34 | Sửa kết luận ≤ 7 ngày | FR-04.11 | Happy | P2 | E2E | Phiên RETURN "Nguyên vẹn" hôm qua | 1. D4 "Sửa kết luận" → "Hư hỏng" + lý do | Kiện `RETURN_RECEIVED_ISSUE`; hồ sơ khiếu nại tạo; "Đã sửa 1 lần"; audit `INSPECTION_CORRECT` | ⬜ |
| TC-07.35 | Sửa kết luận quá 7 ngày | FR-04.11 | Boundary | P3 | API | Phiên đóng 8 ngày | 1. API-113 | `409 CORRECTION_WINDOW_EXPIRED`; D4 "Đã quá 7 ngày, không sửa được." | ⬜ |
| TC-07.36 | Gắn đơn gộp vào hồ sơ mở | R2-9, DEC-248 | State | P2 | API | Hồ sơ chưa xác định đã đóng phiên; đơn 41 có hồ sơ `EXPECTED` | 1. API-112 `package_id` kiện 41 | Hồ sơ chưa xác định `CANCELLED` `merged_into` = hồ sơ 41; kiện 41 `RETURN_RECEIVED_*` (nguồn Tay) | ⬜ |
| TC-07.37 | D14 các tab | FR-05.05, 05.11, 05.12 | Happy | P1 | E2E | PRE-9 sau J-13, J-06 | 1. Lần lượt các tab | "Đang về" (gồm hồ sơ "Đang kiểm"), "Quá hạn", "Đã nhận", "Chỉ hoàn tiền" (nút "Tạo hồ sơ khiếu nại"), "Chưa xác định"; số trên tab = `tab_counts` | ⬜ |
| TC-07.38 | D14 trống | 02b-ad §6 | Negative | P3 | E2E | Sau `qa-reset`, tab "Quá hạn" | 1. Mở | "Không có kiện hoàn quá hạn." | ⬜ |
| TC-09.20 | D2 số liệu mới | FR-09.01 | Happy | P1 | API | Dữ liệu biết trước (3 nhận OK, 1 có vấn đề, 41 đang về, 1 quá hạn, cảnh báo 1 Cao, 2 hồ sơ mở, 1 sắp hạn) | 1. API-32 | `returns_received = 4`, `returns_received_issue = 1`, `returns_expected`, `returns_missing = 1`, `recon_open.HIGH = 1`, `claims_open = 2`, `claims_due_soon = 1`; kiện tạm không vào `returns_received` | ⬜ |
| TC-09.21 | D2 attention mới + badge | FR-09.01, 08.04 | Happy | P2 | E2E | Như trên | 1. Mở D2 | "Cần xử lý": kiện hoàn quá 7 ngày, lệch mức Cao, hồ sơ sắp hết hạn, kiện hoàn chưa xác định; badge drawer "Lệch trạng thái 1", "Hồ sơ khiếu nại 1" | ⬜ |
| TC-01.30 | Đặt loại station | FR-01.01 | Happy | P1 | E2E | PRE-3 Admin, D6 | 1. Station 02 → "Nhận hoàn" → Lưu | Bảng cột Loại "Nhận hoàn"; station 02 đăng nhập → R1/R5 (không S1) | ⬜ |
| TC-01.31 | Đổi loại khi station bận | FR-01.01 | Negative | P2 | API | Station có phiên mở | 1. API-60 PATCH `kind` | `409 STATION_BUSY` | ⬜ |
| TC-01.32 | Station "Đóng gói" không mở phiên hoàn | FR-01.01, AC-35 | Negative | P1 | API | Station loại PACK | 1. API-100 `RETURN` 2. API-104 | 1. `409 MODE_NOT_ALLOWED` 2. `409 WRONG_WORK_MODE` | ⬜ |

### ST — Chuyển trạng thái

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-ST.01 | Mọi chuyển kiện hợp lệ | 01 §7.1, 02 §5.3 | State | P1 | INT | PRE-10 | 1. Chạy bảng cặp (unit `transition`) | Mọi cặp trong 02 §5.3 v0.4 đi được, ghi `status_history` đúng nguồn | ⬜ |
| TC-ST.02 | Chuyển kiện cấm | 01 §7.1 | State | P1 | INT | PRE-10 | 1. `RETURN_RECEIVED_OK → RETURN_EXPECTED`, `RETURN_INSPECTING → PACKED`, `CANCELLED → RETURN_INSPECTING` | `InvalidTransition`; API trả 409 / ALERT, không 500 | ⬜ |
| TC-ST.03 | Chuyển tay đúng danh sách | FR-06.05 | State | P2 | API | Mỗi trạng thái nguồn | 1. API-31 `allowed_status_targets` | Khớp 01 §7.1 "Điều chỉnh tay" | ⬜ |
| TC-ST.04 | Trạng thái hồ sơ hàng hoàn | 01 §7.2 | State | P2 | INT | | 1. Chạy kịch bản EXPECTED → INSPECTING → PARTIALLY → RECEIVED; EXPECTED → MISSING → INSPECTING; EXPECTED → CANCELLED | Đúng sơ đồ; sửa kết luận RECEIVED_OK ⇄ ISSUE | ⬜ |
| TC-ST.05 | Trạng thái phiên hoàn | 01 §7.3 | State | P2 | INT | | 1. OPEN → WAITING_APPROVAL → OPEN → COMPLETED / CANCELLED / ABANDONED | Đúng; không bao giờ `MISMATCH` | ⬜ |
| TC-ST.06 | Trạng thái hồ sơ khiếu nại | 01 §7.3 | State | P2 | INT | | 1. Mọi cặp | Như 02a §5 `claims.transition` | ⬜ |

### MG — Migration & rollback

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-MG.01 | Upgrade 0003 trên dữ liệu Phase 1 | 02a §3 | Happy | P1 | MIG | PRE-11 | 1. `alembic upgrade 0003` | Không lỗi; `package.created_at`, `status_changed_at` đầy đủ; `recon_start_at` = lúc chạy; `alembic check` sạch | ⬜ |
| TC-MG.02 | Nâng retention lên sàn | DEC-257 | Boundary | P1 | MIG | PRE-11 với `retention_clip_days = 45` | 1. Upgrade | Setting = 60; audit `RETENTION_RAISED_TO_MINIMUM` | ⬜ |
| TC-MG.03 | 0004 chuyển cờ giữ → hồ sơ | FR-02.09, AC-26, DEC-250 | Happy | P1 | MIG | PRE-11 (3 clip giữ, 2 kiện) | 1. `alembic upgrade head` | 2 hồ sơ `LEGACY_HOLD` (hạn = lúc nâng cấp + 30 ngày, ghi chú "Chuyển từ cờ giữ của …"); mọi clip giữ trước ∈ tập được bảo vệ; `held = false`; log chênh lệch | ⬜ |
| TC-MG.04 | 0004 downgrade trả cờ giữ | AC-26 | Happy | P1 | MIG | Sau TC-MG.03 + 1 hồ sơ mới mở | 1. `alembic downgrade 0003` | Mọi clip đang được bảo vệ `held = true`; `downgrade_held_clips` ghi; `LEGACY_HOLD` + ghi chú có trong `phase2_archive` | ⬜ |
| TC-MG.05 | Down → up khi đã có dữ liệu Phase 2 | DEC-252, 270 | State | P1 | MIG | Head + dữ liệu: 3 hồ sơ hàng hoàn, 2 phiên RETURN (1 có approval, 1 có export), 2 KN, 4 ảnh, 3 cảnh báo | 1. `downgrade 0002` 2. Kiểm DB + đĩa 3. `upgrade head` 4. Tạo hồ sơ mới | 2. Bảng chính không còn dữ liệu Phase 2, `phase2_archive` đủ dòng; file video / ảnh còn; kiện `RETURN_*` về trạng thái không hoàn 3. Khôi phục đủ, `held = false` cho clip của downgrade, không `LEGACY_HOLD` giả, schema archive bị drop 4. Mã `HH-` / `KN-` không trùng | ⬜ |
| TC-MG.06 | Image cũ không chạy trên DB mới | DEC-252 | Negative | P2 | MAN | Stack dev ở head | 1. Đổi `AICAM_IMAGE` về tag Phase 1, `up` | `migrate` lỗi revision lạ, `api` không khởi động | ⬜ |

### R — Hồi quy Phase 1

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-R.01 | Bộ QA Phase 1 | item 01 04 | Regression | P1 | API | PRE-1 | 1. `uv run pytest tests/qa -m qa -k "m1 or m2 or m3 or m4"` | Pass như trước Phase 2 (trừ case API-42 đổi quyền — cập nhật kỳ vọng) | ⬜ |
| TC-R.02 | E2E BE thật Phase 1 | item 01 | Regression | P1 | E2E | PRE-2 | 1. `pnpm e2e:real` bộ Phase 1 | 37/37 pass (trừ bài "Giữ clip" — thay bằng TC-02.36) | ⬜ |
| TC-R.03 | Quét đóng gói không đổi ở station loại PACK | FR-03.* | Regression | P1 | E2E | Station 01 chế độ đóng gói | 1. TC-03.01, 03.02, 03.05 item 01 | Như Phase 1 | ⬜ |
| TC-R.04 | Retention clip không giữ vẫn xóa | FR-02.06 | Regression | P1 | INT | Clip không thuộc hồ sơ / hàng hoàn, quá 90 ngày | 1. J-02 | `DELETED` | ⬜ |
| TC-R.05 | Xuất clip Phase 1 | FR-07.04 | Regression | P1 | API | | 1. TC-07.0x item 01 (API-43..45) | Như Phase 1 + trường `info.json` mới | ⬜ |
| TC-R.06 | Contract test | 02 §6 | Regression | P1 | API | | 1. `uv run pytest tests/contract` | Xanh; mọi API mới có mục | ⬜ |
| TC-R.07 | Cam 2 lệch mã ở PACK vẫn chạy | BR-06 | Regression | P1 | API | PRE-1 `fake-cam2` | 1. TC-03.2x item 01 (khay sai) | Vẫn `MISMATCH` nguồn CAM2 | ⬜ |
| TC-R.08 | Đồng thời API-11 RETURN ∥ J-13 ∥ J-06 | DEC-266, R3-4 | Regression | P2 | INT | Cùng đơn | 1. 3 luồng ×20 | Không deadlock, một hồ sơ | ⬜ |

### HW — Phần cứng (dự kiến chưa test)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-HW.01 | Ảnh Cam 1 thật ≤ 2 giây | NFR-32, RB-21 | NFR | P2 | HW | PRE-7 + bàn hoàn | 1. Chụp 30 ảnh | p95 ≤ 2 giây — **chưa test — thiếu camera thật T-4** | ⬜ |
| TC-HW.02 | Nhãn kiện hoàn đọc được trên clip Cam 2 | DEC-203 | Happy | P2 | HW | PRE-7 | 1. Đặt 10 kiện hoàn thật | Mã chiều về đọc được trên clip — **chưa test — T-4** | ⬜ |
| TC-HW.03 | 20 kiện hoàn thật: loại mã trên nhãn | Q6, AS-09 | Happy | P2 | HW | Kho thật | 1. Ghi mã từng kiện | Xác nhận DEC-202 — **chưa test — thiếu kiện thật** | ⬜ |
| TC-HW.04 | Máy quét HID với F2 / ô nhập | DEC-237 | Regression | P3 | HW | Máy quét thật | 1. Quét trong ô ghi chú | Không lọt chữ — **chưa test — T-4** | ⬜ |
| TC-HW.05 | Gói bằng chứng trên server kho | NFR-34, RB-24 | NFR | P2 | HW | Server kho | 1. 5 gói 2 phiên 3 phút 1080p | ≤ 3 phút — **chưa test — thiếu server kho** | ⬜ |

## 3. Phân quyền

Gọi API trực tiếp bằng token từng vai (PRE-5); UI chỉ là bổ sung.

| ID | Hành động (API) | Admin | Supervisor | Station | CSKH | Ưu tiên |
|---|---|:---:|:---:|:---:|:---:|:---:|
| TC-P2.01 | Đặt loại station (API-60 `kind`) | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | P1 |
| TC-P2.02 | Đổi chế độ / người kiểm (API-100, 101) | ⛔ 403 | ⛔ 403 | ✅ (station mình) | ⛔ 403 | P1 |
| TC-P2.03 | Mở phiên hoàn, API-102, 103, 104, 105 | ⛔ 403 | ⛔ 403 | ✅ (chế độ nhận hoàn) | ⛔ 403 | P1 |
| TC-P2.04 | Xem clip PACK của kiện đang kiểm (API-40) | ✅ | ✅ | ✅ khi phiên RETURN `OPEN` / `WAITING_APPROVAL`; ⛔ 403 sau khi đóng | ✅ | P1 |
| TC-P2.05 | D14 / API-110, 111 | ✅ | ✅ | ⛔ 403 | ✅ | P1 |
| TC-P2.06 | Gắn đơn API-112, sửa kết luận API-113 | ✅ | ✅ | ⛔ 403 | ⛔ 403 | P1 |
| TC-P2.07 | Xem cảnh báo API-120 | ✅ | ✅ | ⛔ 403 | ✅ | P2 |
| TC-P2.08 | Xử lý cảnh báo API-121, 122, 123 | ✅ | ✅ | ⛔ 403 | ⛔ 403 | P1 |
| TC-P2.09 | Hồ sơ khiếu nại API-130..136 | ✅ | ✅ | ⛔ 403 | ✅ | P1 |
| TC-P2.10 | Trạng thái gói API-137 của người khác | ✅ | ⛔ 404 | ⛔ 403 | ⛔ 404 | P2 |
| TC-P2.11 | Giữ clip API-42 | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | P1 |
| TC-P2.12 | Cài đặt API-80 PUT, API-82 | ✅ | ⛔ 403 (GET API-80 ✅) | ⛔ 403 | ⛔ 403 | P1 |

## 4. Phi chức năng

| ID | NFR | Kịch bản & tải | Ngưỡng đạt | Kết quả đo |
|---|---|---|---|---|
| TC-N2.01 | NFR-01 | locust `returns`: 1 bàn hoàn 60 kiện / giờ + 2 bàn đóng gói 120 / giờ, 1 giờ | API-11 RETURN p95 ≤ 1 giây (server ≤ 200 ms); PACK không xấu hơn Phase 1 | |
| TC-N2.02 | NFR-01 (tra sàn) | Mã lạ, adapter mock trễ 3 giây | Phản hồi ≤ 3 giây | |
| TC-N2.03 | NFR-03 | 30 phiên RETURN | Clip READY ≤ 60 giây p95 | |
| TC-N2.04 | NFR-32 | 30 lần API-103 với `fake-cam1` (máy dev) | p95 ≤ 2 giây (camera thật: TC-HW.01) | |
| TC-N2.05 | NFR-33 | 100.000 kiện chưa ở trạng thái cuối (sinh dữ liệu), J-14 | ≤ 60 giây | |
| TC-N2.06 | NFR-34 | Gói 2 phiên 3 phút 720p máy dev ×5 | ≤ 3 phút mỗi gói | |
| TC-N2.07 | NFR-35 | Yêu cầu trả mới trên mock → beat 15 phút | Kiện `RETURN_EXPECTED` ≤ 15 phút | |
| TC-N2.08 | NFR-36 | URL ảnh / zip quá 10 phút; xem ảnh bằng CSKH | `403 SIGNATURE_INVALID`; audit `VIEW_SNAPSHOT`, `DOWNLOAD_CLAIM_PACK` | |
| TC-N2.09 | NFR-09 (AC-38) | Rút WAN 30 phút (TC-04.36) | Bàn hoàn chạy bình thường | |

## 5. Truy vết

| FR / AC / BR / EX | TC | Đạt |
|---|---|:---:|
| FR-01.01, 01.07 | TC-01.30..32, 04.01, 04.33, 04.34 | ⬜ |
| FR-02.06, 02.09 | TC-02.30..36, MG.03, MG.04 | ⬜ |
| FR-02.10 | TC-02.37..39, MG.02 | ⬜ |
| FR-02.11, 04.12 | TC-02.42, 04.43 | ⬜ |
| FR-02.12 | TC-02.40, 02.41 | ⬜ |
| FR-03.13 | TC-03.70, 03.71 | ⬜ |
| FR-03.14 | TC-03.72..74 | ⬜ |
| FR-03.15 | TC-03.75..77 | ⬜ |
| FR-04.01, 04.02 | TC-04.04..08, 04.10, 04.14 | ⬜ |
| FR-04.03, 04.09 | TC-04.15..17 | ⬜ |
| FR-04.04 | TC-04.40..42 | ⬜ |
| FR-04.05 | TC-04.18..20 | ⬜ |
| FR-04.06 | TC-04.21..23 | ⬜ |
| FR-04.07 | TC-04.45, 04.46 | ⬜ |
| FR-04.08 | TC-04.48..52 | ⬜ |
| FR-04.10 | TC-04.01..03, 04.35 | ⬜ |
| FR-04.11 | TC-07.34, 07.35 | ⬜ |
| FR-04.13 | TC-04.08, 04.09, 04.11, 07.33, 07.36 | ⬜ |
| FR-05.05 | TC-05.30, 05.32, 05.38, 05.42..44 | ⬜ |
| FR-05.07 | TC-05.30..36 (gián tiếp), 05.45 | ⬜ |
| FR-05.11 | TC-05.33..36 | ⬜ |
| FR-05.12 | TC-05.31, 07.37 | ⬜ |
| FR-06.01 | TC-07.32, ST.01 | ⬜ |
| FR-06.02, 06.06 | TC-06.01..11 | ⬜ |
| FR-06.03 | TC-06.12, 06.17 | ⬜ |
| FR-06.05 | TC-06.13..15, 06.19, ST.03 | ⬜ |
| FR-07.01 | TC-07.30, 07.31 | ⬜ |
| FR-07.02 | TC-07.32 | ⬜ |
| FR-08.01 | TC-04.21, 06.16, 08.08 | ⬜ |
| FR-08.02, 08.03 | TC-08.01..07 | ⬜ |
| FR-08.04 | TC-08.12, 09.21 | ⬜ |
| FR-08.05 | TC-08.16..21 | ⬜ |
| FR-08.06 | TC-08.13..15 | ⬜ |
| FR-09.01 | TC-09.20, 09.21 | ⬜ |
| FR-10.02 | §3 TC-P2.01..12 | ⬜ |
| FR-10.03 | audit trong TC-04.01, 04.11, 06.12, 06.13, 07.33, 07.34, 08.01, 08.16, 02.38 | ⬜ |
| AC-06 | TC-04.21, 04.22 | ⬜ |
| AC-07 | TC-06.01, 06.02, 05.39 | ⬜ |
| AC-22 | TC-04.04..09 | ⬜ |
| AC-23 | TC-05.30..33 | ⬜ |
| AC-24 | TC-05.37, 05.38, 06.07 | ⬜ |
| AC-25 | TC-08.16, 08.17 | ⬜ |
| AC-26 | TC-02.30..33, MG.03, MG.04 | ⬜ |
| AC-27 | TC-06.03, 06.04, 06.06..09, 06.11, P2.08 | ⬜ |
| AC-28 | TC-02.37, 02.38 | ⬜ |
| AC-29 | TC-03.70, 03.72..74 | ⬜ |
| AC-30 | TC-02.40 | ⬜ |
| AC-31 | TC-02.42, 04.43 | ⬜ |
| AC-32 | TC-03.75 | ⬜ |
| AC-33 | TC-04.40, N2.04 | ⬜ |
| AC-34 | TC-04.11, 04.15, 04.48..52 | ⬜ |
| AC-35 | TC-01.32, §3 | ⬜ |
| AC-36 | TC-04.18..20 | ⬜ |
| AC-37 | TC-08.01, 08.09, 08.12 | ⬜ |
| AC-38 | TC-04.36, N2.09 | ⬜ |
| AC-39 | TC-04.26, 04.27, 04.32, 04.53 | ⬜ |
| BR-07 | TC-04.18 | ⬜ |
| BR-08 | TC-04.21..23 | ⬜ |
| BR-09 | TC-02.30..34, 02.43 | ⬜ |
| BR-10 | TC-06.04, 06.05 | ⬜ |
| BR-11 | TC-06.06 | ⬜ |
| BR-12 | TC-06.01, 06.15, 04.49 | ⬜ |
| BR-13 | TC-06.07, 05.38 | ⬜ |
| BR-14 | TC-06.08 | ⬜ |
| BR-19 | TC-06.09, 06.10 | ⬜ |
| BR-20 | TC-06.11 | ⬜ |
| BR-21 | TC-03.75..77 | ⬜ |
| BR-22 | TC-04.15, 04.16, 04.48 | ⬜ |
| BR-23 | TC-04.19, 04.20 | ⬜ |
| BR-24 | TC-04.48..52 | ⬜ |
| BR-25 | TC-02.37..39 | ⬜ |
| BR-26 | TC-06.03, 06.06 | ⬜ |
| BR-27 | TC-08.09..11 | ⬜ |
| BR-28 | TC-04.01..03, 04.35 | ⬜ |
| BR-03, 06, 16, 18 (Phase 1 bị chạm) | TC-R.03, R.07, 04.28, 03.72, 03.73 | ⬜ |
| EX-R1..R16 | R1: 05.38 · R2: 04.45 · R3: 04.44, 08.14 · R4: 04.48, 04.50 · R5: 04.15, 04.52 · R6: 04.10 · R7: 05.32 · R8: 04.18 · R9: 04.20 · R10: 05.31 · R11: 04.11 · R12: 04.08 · R13: (TC-01.x item 01 + cờ `VIDEO_INCOMPLETE` trên phiên RETURN — gộp TC-04.36 bước rút cáp Cam 1, MAN) · R14: 05.35 · R15: 04.26, 04.27 · R16: 04.53 | ⬜ |
| EX-P12, P13 | TC-03.75; TC-06.13 | ⬜ |
| NFR-01, 03, 09, 32..36 | §4 | ⬜ |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt | Ngày |
|---|---|---|---|---|---|
| DEC-277 | CP7 — duyệt bộ test case | Ready: 188 case (167 chức năng, 12 phân quyền, 9 NFR), 90 P1; 7 case dự kiến "chưa test — thiếu tài nguyên" (TC-05.44, 05.45, HW.01..05); dữ liệu test cần xác nhận khi T-116 xong | Phủ đủ FR mức M, AC, BR, EX; tự động hóa được ≈ 85 % qua API / INT / E2E | khanhtt (QA, tự quyết theo ủy quyền user) | 2026-10-05 |

## Chốt G4
- [ ] Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng
- [ ] Ma trận quyền đã chạy
- [ ] NFR có ngưỡng đã đo
- [ ] Bug Critical/High = 0 (hoặc có DEC chấp nhận)
- [ ] Regression vùng bị chạm đã chạy
