# Test Report — 02 Hàng hoàn và đối soát · lần 1 (G4, toàn bộ Phase 2, M6–M10)

| | |
|---|---|
| QA (tác giả) | khanhtt |
| Reviewer | Tech lead · PO (duyệt G4) |
| Trạng thái | Draft — QA đánh giá G4 **đạt có điều kiện — G4 ✅ (DEC-367 trong `04`)** (8 case ⬜ đã có test pass, §3) |
| Build / commit | Nhánh `feat/02-returns-reconciliation`. BE `06d2ea0` (gồm sửa QA live G3 `4f7cad6`, `510c63c` và xác minh G3 V2-1, V2-2, V2-4); FE `e6d04c2` (V2-3, V2-4). 8 test bổ sung (§3) viết trên cùng build, chỉ thêm file test, **chưa commit** |
| Môi trường | (a) Stack dev `ai-cam-be/docker/compose.dev.yml` đầy đủ: api :8180, worker*, beat, vision, mediamtx, `fake-cam1`, `fake-cam2`, Postgres 16, Redis; `SHOPEE_ENABLED=true` với adapter `mock`; Chromium (Playwright). Bộ QA live và E2E BE thật chạy trên môi trường này trước khi lập báo cáo. (b) Khi lập báo cáo, stack đã tắt: chỉ chạy pytest unit / contract / integration trên Postgres + Redis dev và vitest. Máy dev macOS. Không có Shopee partner thật, camera thật, máy quét USB, server kho, điện thoại |
| Ngày chạy | 2026-10-06 |
| Test cases | [04-test-cases.md](04-test-cases.md) (188 case, cột KQ đã điền) |
| Last update | 2026-10-06 · QA |

> **TL;DR** — **Kết luận (QA):** **đạt có điều kiện — G4 ✅ (DEC-367 trong `04`)** (người điều phối chốt G4). 8 case ⬜ đã có test và pass (14 test BE + 2 test FE mới, §3). Không có test nào lộ bug sản phẩm.
> 188 case: ✅ 176 · ❌ 0 · ⛔ 12 (chưa test — thiếu tài nguyên) · ⬜ 0. P1: 90/90 ✅. AC: 16 ✅ · 3 ⚠️ (AC-22, 33 chỉ đo máy dev; AC-25 thiếu điện thoại) · 1 ⛔ (AC-38).
> Bug: G4 không thấy bug mới. QA live G3 và lượt xác minh G3 tìm ra 3 lỗi High (500 khi đóng PACK, vision thoát, J-13 nhiều shop) và 2 lỗi Medium. Cả 5 đã sửa và có test hồi quy pass. Bug Critical/High còn mở = 0.
> Hồi quy sau khi thêm test: BE `pytest` 1100 passed / 126 skipped, ruff, format, mypy mã thoát 0; FE `pnpm test` 564 passed / 58 file, tsc, eslint, prettier mã thoát 0. Điều kiện: DEC chấp nhận 12 case ⛔; go-live cần Q13 (thời hạn khiếu nại sàn), T-3 Shopee returns thật, T-4 camera / máy quét thật, đo trên server kho (§6).

<!-- Đối tượng đọc: người duyệt G4/G5. Báo cáo trung thực (CONVENTIONS §6.7): case không chạy được ghi "không chạy được" + lý do. -->

## 1. Tổng hợp

**Cách tính KQ.** Dùng quy tắc DEC-70 của [item 01](../01-packing-mvp/04-test-cases.md), đã ghi ở `04` §2:

| Ký hiệu | Khi nào |
|---|---|
| ✅ | Có test pass ở đúng mức của cột **Cách**. Case `API` được tính khi pass trên stack thật (QA live) hoặc ở `INT` (gọi HTTP vào app, Postgres / Redis thật). Case `E2E` được tính khi pass E2E BE thật, hoặc khi **ghép** đủ hai phần: phần BE pass ở `API` / `INT` **và** phần UI pass ở vitest / Playwright MSW. "máy dev" nghĩa là số đo chỉ trên máy dev |
| ⛔ | Chưa test — thiếu tài nguyên: Shopee partner (T-3), camera / máy quét thật (T-4), server kho, điện thoại. Bản giả lập pass vẫn giữ ⛔ |
| ⬜ | Chưa có bằng chứng. Hoặc chưa có test, hoặc test chỉ phủ một phần kỳ vọng |

| Module | Tổng | ✅ Pass | ❌ Fail | ⛔ Thiếu tài nguyên | ⬜ Chưa có bằng chứng |
|---|---|---|---|---|---|
| M04 Phiên mở hoàn (station) | 36 | 35 | 0 | 1 | 0 |
| M04b Ảnh, tìm thủ công, nhiều kiện | 14 | 14 | 0 | 0 | 0 |
| M05 Đồng bộ hàng hoàn (job) | 16 | 14 | 0 | 2 | 0 |
| M06 Đối soát | 19 | 19 | 0 | 0 | 0 |
| M08 Hồ sơ khiếu nại | 21 | 20 | 0 | 1 | 0 |
| M02 Bằng chứng, retention | 14 | 14 | 0 | 0 | 0 |
| M03 Đóng gói (hardening) | 8 | 8 | 0 | 0 | 0 |
| M07 / M09 / M01 Dashboard | 14 | 14 | 0 | 0 | 0 |
| ST Chuyển trạng thái | 6 | 6 | 0 | 0 | 0 |
| MG Migration, rollback | 6 | 6 | 0 | 0 | 0 |
| R Hồi quy Phase 1 | 8 | 8 | 0 | 0 | 0 |
| HW Phần cứng | 5 | 0 | 0 | 5 | 0 |
| **Chức năng** | **167** | **158** | **0** | **9** | **0** |
| Phân quyền TC-P2.01..12 | 12 | 12 | 0 | 0 | 0 |
| Phi chức năng TC-N2.01..09 | 9 | 6 (máy dev / INT) | 0 | 3 | 0 |
| **Tổng** | **188** | **176** | **0** | **12** | **0** |

Tham chiếu test của từng case nằm trong cột KQ của `04`.

**Mức bằng chứng của 176 case ✅:**
- E2E BE thật hoặc QA live trên stack: phần lớn case P1 của M04, M06, M08, D14, D15, D17 và ma trận quyền.
- `INT` (HTTP vào app, Postgres / Redis thật, đồng hồ giả): case cột `INT`, và nhiều case `API` cần tua giờ hoặc chạy song song.
- **Ghép** (BE pass ở `INT` / QA live, UI pass ở vitest / MSW): TC-04.02, 04.13, 04.24, 04.29, 04.30, 04.35, 04.43, 04.44, 04.46, 06.16, 08.06, 02.38, 03.70, 03.71, 03.72, 03.75, 07.38, 09.21. TC-N2.07 ghép unit (lịch beat) + J-13 mock (TC-05.30).

**Ghi chú với case ✅** (mẫu nhỏ hơn `04`, hoặc chạy bản mô phỏng):
- TC-04.07 (P1, NFR-01): locust `returns` 10 phút (DEC-335) đo trên build T-118 `8aec45c`, tức là trước khi sửa G3. Kết quả: mở RETURN p95 150 ms, đóng p95 43 ms. Trên build G4, QA live đo 1 lần mở bằng mã đơn: < 1 giây. Chưa đo riêng từng loại mã (3 loại × 5 lần như AC-22). Chức năng 3 loại mã đã pass ở E2E BE thật. Nên chạy lại với QA live 3 loại × 5 lần (§3).
- TC-03.77, TC-R.08: test đồng thời chạy 5 lần / 5 đơn, `04` ghi 20.
- TC-02.42: kiểm 1 phiên trên stack (`04` ghi 10 phiên).
- TC-02.38: Dialog xác nhận chạy ở E2E BE thật. Số clip bị ảnh hưởng mới được đối chiếu với điều kiện J-02 ở `INT`, chưa sinh 312 clip.
- TC-MG.06: `INT` mô phỏng image cũ: dùng thư mục Alembic chỉ có 0001 / 0002 thì `upgrade head` lỗi revision lạ. Chưa đổi `AICAM_IMAGE` trên stack thật.
- TC-R.02: E2E BE thật 56 passed, 1 skipped. TC-05.03 cần `SHOPEE_ENABLED=false`, đã pass ở Phase 1. Trên build này chỉ chạy lại phần API (`test_not_configured`, [extra-be-regression.txt](evidence/g4/extra-be-regression.txt)).
- Case Shopee (M05) pass với adapter `mock` và HTTP giả (respx). Shopee thật là TC-05.44, 05.45 ⛔.

| AC (SRS v0.6 §13) | Đạt? | TC / lý do |
|---|:---:|---|
| AC-06 phiên hoàn bắt buộc kết luận; có vấn đề → hồ sơ khiếu nại đủ clip đóng gói + mở hoàn | ✅ | TC-04.21 ✅ (E2E BE thật + QA live, loại Hộp rỗng, J-01 thật). TC-04.22 ✅ INT: 10 kiện (5 OK, 5 vấn đề đủ 5 loại) + tham số hóa 5 loại + OK; clip phiên RETURN `READY` do test chèn (giả lập J-01) |
| AC-07 hoàn quá N ngày → cảnh báo, "Hoàn quá hạn" | ✅ | TC-06.01 (QA live + INT), 06.02 (E2E BE thật), 05.39 |
| AC-22 3 loại mã mở đúng phiên, ≤ 1 giây p95; mã lạ → R4 | ⚠️ máy dev | TC-04.04..04.09 ✅. p95: xem ghi chú TC-04.07. Server kho chưa đo |
| AC-23 adapter mock: đang về / giao thất bại / chỉ hoàn tiền / sàn hủy | ✅ | TC-05.30..05.33 (mock, theo đúng điều kiện của AC). Mốc "≤ 15 phút": TC-N2.07 ✅ (unit lịch beat J-13 900 giây; chưa đo đầu-cuối trên stack) |
| AC-24 về trước khi sàn báo, BR-13, gắn tín hiệu sau, `TO_RETURN` lặp | ✅ | TC-05.37, 05.38, 06.07 (INT) |
| AC-25 gói bằng chứng: zip, SHA-256, MP4 có chữ, ≤ 3 phút máy dev, audit | ⚠️ | TC-08.16 ✅ (QA live encode thật < 3 phút, SHA-256 khớp, có video ghép). Chưa ai xem bằng mắt / trên điện thoại chữ trên MP4 có đúng không (TC-08.17 ⛔) |
| AC-26 bảo vệ bằng chứng theo hồ sơ; nâng cấp / hạ cấp cờ giữ | ✅ | TC-02.30..02.33 (INT, đồng hồ giả), MG.03, MG.04 |
| AC-27 7 quy tắc mỗi quy tắc 1 cảnh báo / kiện, tự đóng, xử lý có audit, CSKH 403 | ✅ | TC-06.03, 06.04, 06.06..06.09, 06.11, P2.08 |
| AC-28 sàn 60 ngày; giảm phải xác nhận, đếm đúng | ✅ | TC-02.37, 02.38 |
| AC-29 S3 hai tình huống; cờ khay / Cam 2 → S1 ≤ 1 giây; D2 → D3 | ✅ | TC-03.70, 03.72..03.74 (chưa lặp 5 lần mỗi cờ) |
| AC-30 `info.json` thêm trường | ✅ | TC-02.40 |
| AC-31 ảnh lúc đóng gói ≤ 90 giây; hiện ở R2, D4 | ✅ | TC-02.42 (1 phiên trên stack), 04.43 |
| AC-32 đơn hủy khi đang đóng → cảnh báo, `CANCELLED_AFTER_PACK`, BR-11 | ✅ | TC-03.75 (ghép INT + vitest) |
| AC-33 ảnh Cam 1 ≤ 2 giây p95, SHA-256, tối đa 20 | ⚠️ máy dev | TC-04.40, 04.41, N2.04 ✅ trên `fake-cam1`. Camera thật (TC-HW.01) ⛔ |
| AC-34 7 kịch bản nhiều kiện / trả một phần / kiện khác | ✅ | TC-04.11, 04.15, 04.48..04.52 |
| AC-35 ma trận §5.10 theo 4 vai; station chỉ xem clip đóng gói khi đang kiểm | ✅ | TC-01.32 ✅, ma trận 12/12 ✅. TC-P2.04 ✅ INT: STATION 403 trước mở / sau đóng / sau hủy, 200 khi `OPEN` / `WAITING_APPROVAL`. TC-P2.10 ✅ INT |
| AC-36 đóng phiên hoàn: chưa kết luận / mã khác / mã gốc | ✅ | TC-04.18..04.20 (E2E BE thật) |
| AC-37 hồ sơ khiếu nại đủ trạng thái; trùng loại; sắp hết hạn | ✅ | TC-08.01 (E2E BE thật), 08.09, 08.12 |
| AC-38 rút WAN 30 phút | ⛔ | TC-04.36, N2.09: thiếu bàn thử / server kho |
| AC-39 quá 45 phút; kiện hoàn ở bàn đóng gói; Cam 2 không đổi phiên | ✅ | TC-04.26 (QA live + INT), 04.27, 04.32, 04.53 (E2E BE thật) |

Tổng AC: **16 ✅ · 3 ⚠️ · 1 ⛔** / 20.
- AC-06 và AC-35 đã ✅ sau khi bổ sung TC-04.22, TC-P2.04 (§3).
- AC-22, AC-33 ⚠️ chỉ vì mới đo trên máy dev. AC-25 ⚠️ vì chưa có điện thoại để xem chữ trên video. Ba AC này là điều kiện go-live.

## 2. Bug

**Phát hiện ở lần chạy G4 này:** không có. 0 case ❌.

**Phát hiện ở QA live G3 và lượt xác minh G3** — sửa trước G4, chạy lại trên build `06d2ea0` / `e6d04c2` đều pass:

| ID | Mức | TC | Tái hiện | Kỳ vọng / Thực tế | Component | Trạng thái |
|---|:---:|---|---|---|:---:|---|
| BUG-G3-1 (V2-2) | High | TC-R.03, TC-02.42, mọi lần đóng PACK | 1. Station đóng gói, `vision` đang giữ khung Cam 1 trong Redis 2. Đóng phiên PACK hơn 5 lần liên tiếp (Postgres chuyển sang generic plan) | Kỳ vọng: đóng phiên 200. Thực tế: 500. `INSERT … ON CONFLICT (session_id) WHERE kind = :kind` dùng tham số bind, nên Postgres không suy ra được index unique một phần `uq_snapshot_pack_close_session` | be | Đã sửa `4f7cad6`: vị từ dùng literal. Có test hồi quy `test_pack_close_insert_survives_generic_plan` (`force_generic_plan`, `06d2ea0`), pass trong [extra-be-integration-phase2.txt](evidence/g4/extra-be-integration-phase2.txt). QA live G4 123 passed |
| BUG-G3-2 | High | TC-R.07, TC-04.32, TC-03.71 (Cam 2) | 1. Stack chạy `vision` 2. Reset schema hoặc DB chập chờn | Kỳ vọng: vision tự hồi phục. Thực tế: `watched_paths` ném lỗi, health loop chết, tiến trình vision thoát, Cam 2 ngừng đọc khay | be (vision) | Đã sửa `510c63c`: health loop bắt lỗi DB và chạy tiếp. Có test unit trong `tests/unit/test_vision.py`, pass trong [be-unit-contract.txt](evidence/g4/be-unit-contract.txt) |
| BUG-G3-3 (V2-1) | High | TC-05.30, 05.42, 05.43 | J-13 chạy với ≥ 2 shop, một bản ghi lỗi ở shop đầu | Kỳ vọng: shop sau vẫn đồng bộ. Thực tế: `rollback` làm hết hạn mọi `Shop` trong session, đọc thuộc tính sau đó → `MissingGreenlet`, chặn mọi shop sau | be | Đã sửa `06d2ea0` (lặp theo id). Có test `test_j13_multi_shop_record_error_and_crash`, pass |
| BUG-G3-4 (V2-3) | Medium | TC-08.13..08.15 (D17) | Mở D17 > 10 phút | Kỳ vọng: ảnh bằng chứng tải lại bằng URL ký mới. Thực tế: chỉ tải lại một lần mỗi lần mở trang, sau đó ảnh hỏng mãi | fe | Đã sửa `e6d04c2`. Có test `ClaimDetailPage.test.tsx`, pass |
| BUG-G3-5 (V2-4) | Medium | TC-04.26, 04.29 | Phiên RETURN có kết luận đã lưu nhưng chưa đủ dòng, tới `warn_at` | Kỳ vọng: station biết vì sao phiên không tự hoàn tất. Thực tế: `SESSION_WARN` giống cảnh báo quá giờ thường | be + fe | Đã sửa `06d2ea0` (`reason: INSPECTION_INCOMPLETE`) và `e6d04c2` (chữ ở station). Có test `test_g3_state_machine`, `Hardening.test.tsx`, pass |

Phần lớn finding review G3 và xác minh G3 (V2-1..V2-5) đã xử lý theo DEC-336..366 (`00-status`, 02a, 02b). Bug Critical/High còn mở = **0**.

**Quan sát (không phải bug sản phẩm):**
- FE vitest lần này ra 562 test / 58 file, mã thoát 0 (sau khi thêm 2 test TC-04.29: 564). Ghi chú G3 trong `00-status` ghi 563. Chưa rõ lệch 1 test do đâu. Không có test fail hay skip.
- Tiêu đề E2E `m10-permissions` ghi "TC-P2.01..P2.12", nhưng ma trận trong test không gọi API-40 (P2.04) và không kiểm 404 của API-137 (P2.10, có ghi chú trong code). 2 case này nay ✅ nhờ test `INT` mới, không tính theo tiêu đề E2E.

## 3. Case fail / blocked / chưa có bằng chứng

Không có case ❌.

**⬜ → ✅ — 8 case bổ sung test (2026-10-06).** Không còn case ⬜. Test mới chỉ thêm vào file test, không sửa code sản phẩm; không test nào lộ bug. Bằng chứng: [extra-g4-new-tests.txt](evidence/g4/extra-g4-new-tests.txt).

| TC | Ưu tiên | Test mới (mức) | Kết quả |
|---|:---:|---|---|
| TC-04.22 (AC-06) | **P1** | `INT` `test_claims_api.py::test_ten_parcels_five_ok_five_issue_types` + `test_each_conclusion_creates_matching_claim[DAMAGED, MISSING_ITEM, WRONG_ITEM, EMPTY_BOX, OTHER, OK]` | ✅ 7 passed. 10 phiên `COMPLETED`; đúng 5 hồ sơ, loại = kết luận, bên nhận Sàn, nguồn `AUTO_RETURN`; bằng chứng = phiên PACK + RETURN của chính kiện; `missing = []` sau khi clip RETURN `READY` (test chèn clip, giả lập J-01); OK → không hồ sơ. ĐVVC: `test_failed_delivery_goes_to_carrier` sẵn có |
| TC-P2.04 (AC-35) | **P1** | `INT` `test_snapshots.py::test_station_clip_access_ends_when_return_session_closed_or_cancelled` | ✅ STATION gọi API-40: 403 trước mở → 200 `OPEN` → 200 `WAITING_APPROVAL` → 403 sau đóng; phiên kiện khác đang mở → clip kiện trước 403; hủy (API-12) → 403. E2E `m10-permissions` vẫn chưa gọi API-40 (khuyến nghị thêm) |
| TC-04.28 | P2 | `INT` `test_return_hardening.py::test_j07_return_timer_restarts_after_assist_continue` | ✅ Mở 08:00, ASSIST 08:10, CONTINUE 08:50: J-07 08:49 / 09:05 → 0 / 0; 09:10 cảnh báo; 09:34 → 0; 09:35 bỏ dở. DEC-60 đúng với phiên RETURN |
| TC-04.29 | P2 | vitest `InspectingPanel.test.tsx` (fake timers) — 2 test "TC-04.29 …" | ✅ Nháp "Hư hỏng" chưa lưu, debounce chưa tới: tới `warn_at` (giờ server) gửi API-102; 30 giây trước `abandon_at` gửi lần nữa; WS `SESSION_WARN` → gửi ngay. Phần BE (tự hoàn tất bằng kết luận đã lưu): TC-04.26 → ✅ ghép |
| TC-P2.10 | P2 | `INT` `test_evidence_pack.py::test_pack_status_other_supervisor_404_station_403` | ✅ SUPERVISOR không tạo gói → 404 `NOT_FOUND`; STATION → 403; người tạo + ADMIN → 200 |
| TC-N2.02 | — (NFR-01) | `INT` `test_return_scan.py::test_tc_n2_02_slow_platform_lookup_return_mode` | ✅ máy dev. RETURN, 5 mã lạ, sàn trễ 3 giây → `RETURN_NOT_FOUND` "sàn không trả lời": min 2,026 / p95 2,060 / max 2,060 giây (cắt ở `PLATFORM_LOOKUP_TIMEOUT_S` = 2 giây) |
| TC-N2.07 | — (NFR-35) | unit `tests/unit/test_worker_tasks.py::test_tc_n2_07_j13_sync_returns_beat_within_15_minutes` | ✅ (ghép với J-13 mock TC-05.30). Beat 900 giây ≤ 900, task đăng ký, queue `sync`, `time_limit` 270 giây < chu kỳ. Chưa đo đầu-cuối trên stack |
| TC-N2.08 | — (NFR-36) | `INT` `test_snapshots.py::test_snapshot_url_expires_after_ten_minutes`, `test_evidence_pack.py::test_pack_zip_url_expires_after_ten_minutes` | ✅ 9 phút 200; tua 11 phút → 403 `SIGNATURE_INVALID` cho ảnh (API-106) và zip (API-138); API-137 cấp URL mới tải được |

Khuyến nghị thêm, không chặn: thêm dòng API-40 / 404 API-137 vào E2E `m10-permissions`; QA live TC-04.07 đo 3 loại mã × 5 lần mở + 5 lần đóng trên build G4, để AC-22 có số đo đúng kịch bản.

**⛔ Chưa test — thiếu tài nguyên:**

| TC | Thiếu | Bằng chứng giả lập đã có |
|---|---|---|
| TC-05.44, 05.45 | Shopee partner thật (T-3), `SHOPEE_RETURNS_ENABLED` | Adapter Shopee trên HTTP giả (`tests/unit/test_platform_returns.py`, `test_j13_shopee_503_twice_then_ok`) |
| TC-04.36, N2.09 (AC-38) | Bàn thử + server kho, rút WAN thật | — |
| TC-08.17 | Điện thoại thật để xem MP4 có chữ | QA live encode thật, có video ghép trong zip |
| TC-HW.01..04 | Camera thật, máy quét USB (T-4), kiện hoàn thật | `fake-cam1` (N2.04), `hidScan` (TC-04.47) |
| TC-HW.05, N2.01, N2.03 | Server kho | Số máy dev ở §4 |

## 4. Phi chức năng

| NFR | Ngưỡng | Đo được | Đạt |
|---|---|---|:---:|
| NFR-01 API-11 RETURN (TC-04.07, N2.01) | p95 ≤ 1 giây (server ≤ 200 ms); PACK không xấu hơn Phase 1 | Máy dev, locust `returns` 10 phút, 249 request, 0 lỗi (DEC-335, build T-118): RETURN mở p50 58 / p95 150 ms, đóng 29 / 43 ms; API-102 p95 36 ms; PACK mở p95 130 ms, đóng 84 ms. QA live G4: 1 lần mở bằng mã đơn < 1 giây | ✅ máy dev · ⛔ server kho chưa đo (1 giờ) |
| NFR-01 tra sàn chậm (N2.02) | ≤ 3 giây | Chế độ RETURN (INT, `MockAdapter(delay_s=3)`, 5 mã lạ): cắt ở 2 giây → `RETURN_NOT_FOUND`; min 2,026 / p95 2,060 / max 2,060 giây. Phase 1, chế độ PACK, build G4: 20 lần sàn trễ 1,5 giây → p95 1,561 giây, max 1,597 giây | ✅ máy dev |
| NFR-03 clip `READY` (N2.03) | p95 ≤ 60 giây, 30 phiên RETURN | QA live chờ clip phiên RETURN `READY` với giới hạn 120 giây. Chưa đo p95 | ⛔ server kho chưa đo |
| NFR-32 ảnh Cam 1 (N2.04, HW.01) | p95 ≤ 2 giây | `fake-cam1`: QA live G4 3 ảnh, mỗi ảnh < 2 giây; locust API-103 p95 35 ms (khung vision trong Redis, DEC-320). CPU vision +2,8 điểm / 2 camera 720p | ✅ máy dev · ⛔ camera thật (T-4) |
| NFR-33 J-14 100.000 kiện (N2.05) | ≤ 60 giây | Máy dev (DEC-334): 103.240 kiện chưa ở trạng thái cuối, lần đầu 49,7 giây, lần sau 4,4 giây. 300.000 kiện, trường hợp xấu `recon_start_at` lùi 90 ngày: lần đầu 118,1 giây, lần sau 14,5 giây | ✅ máy dev · server kho chưa đo |
| NFR-34 gói bằng chứng (N2.06, HW.05) | ≤ 3 phút | QA live G4: 1 gói (2 phiên, encode thật trong `worker-export`) < 180 giây. Chưa lặp 5 lần | ✅ máy dev · ⛔ server kho |
| NFR-35 yêu cầu trả → `RETURN_EXPECTED` (N2.07) | ≤ 15 phút | Unit: beat `platforms.sync_returns` 900 giây, task đăng ký, queue `sync`, `time_limit` 270 giây < chu kỳ. J-13 mock → `RETURN_EXPECTED` (TC-05.30). Chưa đo đầu-cuối trên stack | ✅ (cấu hình + INT) |
| NFR-36 URL ký ảnh / zip (N2.08) | Quá 10 phút → 403; audit | Chữ ký sai → 403 `SIGNATURE_INVALID` cho ảnh và zip; audit `VIEW_SNAPSHOT`, `DOWNLOAD_CLAIM_PACK` (INT). Hết hạn (INT, đồng hồ giả): 9 phút 200, 11 phút → 403 `SIGNATURE_INVALID` cho ảnh (API-106) và zip (API-138) | ✅ |
| NFR-09 WAN 30 phút (N2.09) | Bàn hoàn chạy bình thường | Chưa test — thiếu tài nguyên | ⛔ |
| Migration 0003 (RB-23, tham khảo) | Ghi cho vận hành | 1 triệu kiện: 33,9 giây, khóa bảng `package` (DEC-334, 337). Nâng cấp ngoài giờ, dừng service | — |

Số đo máy dev chỉ cho biết code không phải nút thắt. Ngưỡng NFR là ngưỡng trên phần cứng kho. Số locust và J-14 lấy từ DEC-334, 335 trong 02a (đo ở T-118, build `8aec45c`, trước khi sửa G3), không có file log riêng. Code sửa sau G3 chỉ chạm J-13 nhiều shop, INSERT ảnh `PACK_CLOSE`, `SESSION_WARN` và vision health loop. Chưa đo lại.

## 5. Bằng chứng

Thư mục [`evidence/g4/`](evidence/g4/):

| Bộ test | Lệnh | Kết quả | File |
|---|---|---|---|
| QA live API trên stack dev đầy đủ | `cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest tests/qa -m qa` (`SHOPEE_ENABLED=true`, adapter mock) | **123 passed**, 9 phút 12 giây (`test_m1..m4_live` Phase 1 + `test_m6..m9_live` Phase 2) | [g4-qa-live.txt](evidence/g4/g4-qa-live.txt) |
| E2E BE thật | `cd ai-cam-fe && pnpm e2e:real` với mọi cờ `E2E_M*_BE` + `E2E_SHOPEE_ENABLED=1` | **56 passed, 1 skipped** (TC-05.03 cần `SHOPEE_ENABLED=false`, đã pass ở Phase 1), 11,8 phút | [g4-e2e-real.txt](evidence/g4/g4-e2e-real.txt) |
| BE unit + contract | `cd ai-cam-be && uv run pytest -q tests/unit tests/contract` | **578 passed**, mã thoát 0 | [be-unit-contract.txt](evidence/g4/be-unit-contract.txt) |
| BE integration Phase 2 (chạy thêm) | `cd ai-cam-be && uv run pytest -v tests/integration/test_{claims_api,…,approvals_api}.py` (28 file, Postgres / Redis dev) | **305 passed**, 1 phút 44 giây, mã thoát 0; có danh sách từng test | [extra-be-integration-phase2.txt](evidence/g4/extra-be-integration-phase2.txt) |
| BE hồi quy chọn lọc (chạy thêm) | `uv run pytest -v -s tests/integration/test_shops_api.py test_station_scan_api.py test_media_clips.py -k "not_configured or tc_n02 or signature"` | **3 passed**, mã thoát 0. TC-N.02 Phase 1: p95 1,561 giây | [extra-be-regression.txt](evidence/g4/extra-be-regression.txt) |
| FE vitest toàn bộ | `cd ai-cam-fe && pnpm test` | **562 passed / 58 file**, mã thoát 0 | [fe-vitest.txt](evidence/g4/fe-vitest.txt) |
| 8 case bổ sung (test mới, chạy thêm) | BE `uv run pytest -v -s <14 node id>`; FE `npx vitest run InspectingPanel.test.tsx -t "TC-04.29" --reporter=verbose` | BE **14 passed** (17 giây), FE **2 passed**, mã thoát 0; số đo TC-N2.02 | [extra-g4-new-tests.txt](evidence/g4/extra-g4-new-tests.txt) |
| Hồi quy sau khi thêm test | BE `uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest -q`; FE `npx tsc -b; npx eslint src; npx prettier -c src; pnpm test` | BE **1100 passed, 126 skipped** (3 phút 30 giây); FE **564 passed / 58 file**; mọi lệnh mã thoát 0 | [extra-g4-new-tests.txt](evidence/g4/extra-g4-new-tests.txt) (cuối file) |
| FE vitest UI Phase 2 (chạy thêm, verbose) | `npx vitest run --reporter=verbose` 21 file (station returns, D4, D14..D17, D2, D8, D6, nav) | Tất cả pass, mã thoát 0; có danh sách từng test | [extra-fe-vitest-phase2.txt](evidence/g4/extra-fe-vitest-phase2.txt) |
| BE pytest đầy đủ, lint, type (từ G3, cùng build) | `uv run pytest`; ruff, mypy, lint-imports; FE tsc, eslint, prettier | 1086 passed, 126 skipped (×2); lint / type mã thoát 0 — theo người điều phối, QA chưa chạy lại | `00-status` DEC-366 |
| Tải, dữ liệu lớn | `tests/load/locustfile.py` `LOAD_PROFILE=returns`; `tests/load/perf_bigdata.py` | Số ở §4 | 02a DEC-334, 335 |
| Bằng chứng mốc trước | — | M6..M10, G3 | `m6..m10-e2e-real.txt`, `g3-qa-live.txt` (123 passed), `g3-e2e-real.txt` |

Map test → TC: cột KQ trong `04`, docstring trong `ai-cam-be/tests/qa/test_m{6..9}_live.py` và `tests/integration/*.py`, tên test trong `ai-cam-fe/e2e/real/*.spec.ts` và `src/**/*.test.ts(x)` (grep `TC-`).

Không chạy ở lượt này: docker, `qa-reset.sh`, QA live, E2E, locust (stack đã tắt; ngoài phạm vi được giao). Không có dữ liệu test cần dọn: test integration tự dọn bằng rollback hoặc `TRUNCATE`.

## 6. Rủi ro còn lại & điều kiện release

**Điều kiện để trình G4:**
1. ~~Viết và chạy 8 test ở §3~~ — xong 2026-10-06: 8 case ✅ (gồm 2 P1 TC-04.22, TC-P2.04).
2. ~~Chạy lại `pytest` và vitest~~ — xong: BE 1100 passed / 126 skipped, FE 564 passed, lint / type mã thoát 0. Không có test E2E / QA live mới (không chạy stack ở lượt này).
3. ~~Cập nhật KQ trong `04` và báo cáo này~~ — xong. Còn: commit các file test mới và hỏi duyệt G4.

QA đánh giá G4 **đạt có điều kiện — G4 ✅ (DEC-367 trong `04`)**: 12 case ⛔ chỉ do thiếu tài nguyên ngoài, cần ghi DEC chấp nhận như DEC-78 ở Phase 1.

**Điều kiện trước go-live tại kho** (SRS §13 "Go-live tại kho"):

| Điều kiện | Hạng mục chưa test / chưa quyết |
|---|---|
| Q13 — thời hạn khiếu nại của sàn | Chưa trả lời. Đang đặt tạm: sàn retention 60 ngày (DEC-210), hạn hồ sơ mặc định 7 ngày khi sàn không trả hạn (BR-27), giữ 30 ngày cho "Chỉ hoàn tiền". Cần PO chốt trước go-live |
| T-3 — Shopee partner thật (`SHOPEE_RETURNS_ENABLED`) | Mã chiều về, `needs_parcel`, hạn người bán, mapping 8 lý do / 8 trạng thái (TC-05.44, 05.45); xác minh DEC-202 (loại mã trên kiện), DEC-248 (`TO_RETURN`), DEC-258 (boom COD) |
| T-4 — camera thật, máy quét USB | Ảnh Cam 1 ≤ 2 giây với GOP thật (RB-21, TC-HW.01); nhãn kiện hoàn đọc được trên clip Cam 2 (HW.02); 20 kiện hoàn thật (HW.03, Q6); máy quét HID trong ô ghi chú (HW.04) |
| Server kho | Locust 1 giờ (N2.01); clip `READY` 30 phiên (N2.03); gói bằng chứng ≤ 3 phút 1080p (HW.05, RB-24); J-14 trên dữ liệu thật; thời gian khóa migration 0003 (~34 giây / 1 triệu kiện, chạy ngoài giờ); rút WAN 30 phút (AC-38) |
| Điện thoại | MP4 ghép có chữ phát được trên điện thoại (TC-08.17, AC-25) |
| SOP (06-business-qa L10) | Quy trình bàn hoàn, đặt GOP camera ≤ 1 giây |

**Rủi ro:**
- Số NFR máy dev đo trên build trước khi sửa G3. Các chỗ sửa sau G3 không nằm trên đường nóng của API-11 RETURN, nhưng chưa đo lại.
- Cảnh báo đối soát lần đầu có thể dồn nếu `recon_start_at` bị lùi (118 giây / 300.000 kiện). Thực tế `recon_start_at` = lúc nâng cấp (DEC-228), nên rủi ro thấp.
- Adapter Shopee returns mới kiểm bằng HTTP giả theo tài liệu công khai. Sai lệch với API thật chỉ lộ ra ở T-3.
- Kiểm quyền API-102, 105 cho 4 vai mới dựa vào dependency chung `StationOnly`, chưa có test riêng từng endpoint.

**Lệnh tái chạy:**
`ai-cam-be/scripts/qa-reset.sh && cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest tests/qa -m qa` · `cd ai-cam-be && uv run pytest` · `cd ai-cam-fe && pnpm test && pnpm e2e:real`

## Chốt G4

Checklist đầy đủ (✓ / ✗ kèm ghi chú) nằm ở [`04` mục "Chốt G4"](04-test-cases.md#chốt-g4). QA đánh giá:

| Điều kiện | QA |
|---|:---:|
| Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng | ✗ (AC-06, AC-35 thiếu TC P1) |
| Ma trận quyền đã chạy | ✗ (10/12) |
| NFR có ngưỡng đã đo | ✗ (3 ⬜) |
| Bug Critical/High = 0 | ✓ |
| Regression vùng bị chạm đã chạy | ✓ |

QA chưa tick ô nào và chưa đổi G4 trong `00-status`. Người điều phối quyết định bước tiếp.
