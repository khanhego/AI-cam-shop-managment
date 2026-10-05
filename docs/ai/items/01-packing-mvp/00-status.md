# 01-packing-mvp — Status

| Trường | Giá trị |
|---|---|
| Tên | MVP đóng gói (Phase 1 theo SRS hệ thống §13.2) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: station, admin) |
| Last update | 2026-10-05 · Flow (M4 xong, trừ T-3) |

Phạm vi dự kiến: M01, M02, M03, M05 (Shopee: đơn + trạng thái), M07 cơ bản, M10 của [SRS hệ thống](../../system/SRS.md).
Spike S1–S5 và dựng khung repo ([architecture.md §17](../../system/architecture.md)) sẽ thành task đầu trong `03-plan`.
Số item: 01 (chưa có item nào; `git ls-remote --heads` của 3 repo không có nhánh nào, 2026-10-04).

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ✅ | 2026-10-04 | khanhtt | 01-srs.md v0.2 Approved |
| Spec 02 / 02a / 02b | ✅ ✅ ✅ | | | 02b: station, admin |
| G2 Thiết kế | ✅ | 2026-10-04 | khanhtt (tự quyết, DEC-15) | Có điều kiện DEC-33; 2 vòng review subagent |
| Plan | ✅ | 2026-10-04 | khanhtt (tự quyết, DEC-37) | 46 task, 6 milestone; ticket chưa tạo (DEC-35) |
| G3 Build | ⬜ | | | |
| G4 Kiểm thử | ⬜ | | | |
| G5 Release | ⬜ | | | |

## Solo pipeline
| # | Bước | Trạng thái | Ngày | Ghi chú |
|:-:|---|:---:|---|---|
| 0 | Khởi tạo dự án | ✅ | 2026-10-04 | CP0 duyệt, còn 2 mục ✗: baseline chưa đo (repo trống), môi trường staging/prod chưa rõ |
| 1 | Mở item | ✅ | 2026-10-04 | CP1 duyệt |
| 2 | SRS | ✅ | 2026-10-04 | CP2 duyệt; 01-srs.md v0.1, DEC-1..4 |
| 2b | Màn hình | ✅ | 2026-10-04 | §10: 20 màn (S0–S6, D1–D13), DEC-5, DEC-6 |
| 3 | Tech spec | ✅ | 2026-10-04 | 02 In review, API-01..92, WS-01/02, DEC-7..10 |
| 4a | BE spec | ✅ | 2026-10-04 | CP4a tự duyệt (DEC-15); 02a In review, T-1..T-19, DEC-11..14 |
| 4b | FE spec (station, admin) | ✅ | 2026-10-04 | CP4b tự duyệt; 02b-station (T-30..38), 02b-admin (T-50..61), DEC-16..22 |
| 5 | Review bộ spec | ✅ | 2026-10-04 | Vòng 1 Chưa đạt (28), vòng 2 Đạt có điều kiện (12 minor/nit, đã sửa) |
| 6 | Kế hoạch | ✅ | 2026-10-04 | 03-plan.md |
| 7 | Test cases | ✅ | 2026-10-04 | CP7 tự duyệt; 04 Ready: 137 case, DEC-38 |
| 8 | Implement | ▶ đang làm | 2026-10-05 | M0–M4 xong (trừ T-3, T-4 chờ tài nguyên ngoài); M5: T-19. M4: BE 345 pass / 97 skip, QA live 94 pass + 2 skip (Shopee chạy riêng với cờ bật + adapter mock); FE 274 unit, E2E mock 9, E2E BE thật 37/37; contract chốt 02 v0.5 (DEC-62, DEC-63) |
| 8c | Tài liệu nghiệp vụ (mỗi lát) | ▶ đang làm | 2026-10-05 | Bắt buộc trước G3. Lát 0–4 đã viết ở `docs/nghiep-vu/01-packing-mvp/` (Draft, có §0 Giải thích đơn giản); lát 5 sau M5; chờ CP8c |
| 9 | Commit / PR | ⬜ | | |
| 10 | Review code | ⬜ | | |
| 11 | Chạy test | ⬜ | | |
| 12 | Release | ⬜ | | |

## NOW
| Owner tiếp | Việc tiếp | Skill |
|---|---|---|
| Dev BE → Lead review → QA → Ops | M5: T-19 (contract test, locust, compose production, Caddyfile, README vận hành, checklist DEC-53) → bước 10 review code toàn Phase 1 (G3) → bước 11 QA (G4) → bước 12 release staging local (G5) → PR + merge `main`. T-3 chờ Shopee duyệt partner, T-4 chờ camera thật | ai-be-implement → ai-lead-review → ai-qa-run-tests → ai-ops-release |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|
| Lead review | Architect, BE, FE, PO | Review G2 lần 1: Chưa đạt (2 blocker, 11 major, 11 minor, 4 nit) | Đã sửa: 01 v0.3 (DEC-24..27), 02 v0.2 (DEC-28, 29), 02a v0.2 (DEC-30..32), 02b v0.2. Vòng 2: Đạt có điều kiện, N1–N12 đã sửa. Đóng |
| FE | Architect | Chưa có API nhận lỗi JS client (02b-station §11) | Đóng: tự quyết DEC-23 — MVP không thêm API, lỗi xem qua ErrorBoundary + log trình duyệt; xem lại Phase 3 |
| Lead review (code M1, subagent) | BE, FE | Review code M1: Đạt có điều kiện — 3 major (FE treo khi 409 STATION_INACTIVE/403; J-07 race với quét đóng; rate-limit IP sau proxy), 20 minor/nit | Đã sửa 3 major + #4–#12, #14, #16–#18, #20–#22, một phần #13, kèm test (BE 203, FE 141 pass). Để sau (DEC-53): #13 phần còn lại → T-13/T-59, #15 → T-14, #19, #23. Đóng |
| QA (M1) | BE, FE | BUG-1 image thiếu alembic · BUG-2 camera mới ONLINE chậm 30 giây · BUG-3 quét ở S0 không phản hồi · BUG-4 D6 không nhận WS `camera.status` | Đã sửa, chạy lại: QA API thật 72/72, E2E BE thật 18/18. Báo cáo: 04a-test-report.md. Đóng |
| FE, BE (M2) | Architect, QA | FE DEC-71 (WS-02 `session.clip_ready`), DEC-72 (trường API-32), DEC-76 (`retention_until` clip đã xóa), DEC-73 (TC-09.04); BE DEC-102..105 (lệch contract khi code), DEC-104 (bản xuất 24 giờ vs 30 ngày) | Đóng: 02 v0.3 DEC-57, DEC-58 (architecture §8.2, ADR-008 sửa theo); 04 DEC-59 |
| BE (T-13) | PO | RB-14 (02a): phiên chờ duyệt lâu rồi được "Cho tiếp tục" bị cảnh báo / bỏ dở ngay vì J-07 tính từ `started_at` | Đóng bằng DEC-60: đồng hồ tính lại từ lúc yêu cầu kết thúc (be `97abd2e`); change request nhỏ BR-16 → 01 v0.4; TC-03.57 |
| BE, FE (M3) | Architect | BE DEC-111, DEC-112 (outcome MISMATCH khi mở với khay sai, `approval.updated`, `alert` SESSION_CANCELLED_BY_SUPERVISOR, trường API-20); FE DEC-82 (ROI 422 VALIDATION_ERROR), DEC-83 (WHEP `Location` thiếu `/live`) | Đóng: 02 v0.4 DEC-61; TC-01.06 sửa kỳ vọng |
| BE, FE (M4) | Architect, QA | BE DEC-121, 122, 124 (mã mới `IMPORT_CONFLICT`, `SHOP_NOT_CONNECTED`, 403 commit bởi người khác, `get_shipping_statuses` theo lô, dạng `last_error`); DEC-123 điểm Shopee chưa chắc; FE DEC-92 hỏi API ngắt kết nối + `held_clips` | Đóng: 02 v0.5 DEC-62 (contract), DEC-63 (không thêm 2 API trong MVP → backlog 03 §5); 04 DEC-64 (TC-05.09, 05.10, 05.15). DEC-123 chờ T-3 |
| UX | PO | Supervisor duyệt từ dashboard (DEC-5) cần FR mới FR-03.12, sửa FR-03.10, UC-08, ma trận quyền, thêm AC-19 | Đã xử lý trong 01 v0.2 (solo) |

## Lịch sử
| Ngày | Role | Việc |
|---|---|---|
| 2026-10-05 | BE, FE, QA, Architect, PO | **M4 Nguồn đơn xong (trừ T-3)**: BE T-17 `90a16c6` (API-50..54 nhập CSV / xlsx, BR-17, fixtures `tests/qa/fixtures/csv/`, volume `imports`), T-16 `d5f7e05` (adapter Shopee v2 HMAC, OAuth, refresh, thử lại theo `Retry-After`, API-70..73, tra 2 giây khi quét ngoài lock), T-22 `2375a2e` (J-04/05/06/12, queue `sync`, beat 5/10/15/30 phút; tắt khi `SHOPEE_ENABLED=false`); FE T-56 `b09e0f3` D5, T-58 `83cc236` D7 + D8, T-59 `c1cb076` D9 + D10, T-61 bộ `e2e/real` 37 bài. Kết quả: BE 345 pass / 97 skip, QA live 94 pass + 2 skip (+ adapter mock 8/8), TC-05.11 nhập 500 đơn 1,1 giây (AC-12 ≤ 30 giây); FE 274 unit, E2E mock 9, E2E BE thật 37/37 (`evidence/m4-e2e-real.txt`). Sửa 2 lỗi test FE `ac017c0`: EX-P9 chập chờn (helper `src/test/scan.ts` `hidScan`), `pnpm test` thoát mã 1 do thay `FormData` toàn cục (nay `src/test/nodeFormData.ts` chỉ trong test upload). Sửa lỗi D11 màn đen `3533ff3` (track WebRTC tới muộn của kết nối đã đóng). Architect 02 v0.5 (DEC-62, DEC-63); 04 DEC-64; system-map; tài liệu nghiệp vụ lát 4. Chưa test (thiếu tài khoản partner, T-3): OAuth thật, `state` trong redirect, mã lỗi thật, bảng trạng thái vận chuyển, rate limit (token bucket ADR-007 chưa làm), tra đơn theo mã vận đơn (DEC-123, tạm dò 60 phút); TC-10.06 mới kiểm tới API 204; `.xlsx` thật ở FE |
| 2026-10-05 | BE, FE, QA, Architect, PO | **M3 Cam 2 + duyệt xong (trừ T-4)**: BE T-12 `771f61d` (vision OpenCV + zxing-cpp đọc mã trong ROI Cam 2, 4 khung/giây, `tray:{station_id}` TTL 5 giây, `tray.changed` → `on_tray_changed`), T-13 `9b7c26e` (API-13/14/20/21, WS `approval.*`), `97abd2e` (DEC-60 đồng hồ quá giờ sau duyệt; MediaMTX dev ICE 8189 UDP+TCP); FE T-55 `aeca76e` D13, T-62 `5e25242` RoiEditor, T-60 `310de20` D11 WHEP + `fafd6b7` E2E khung hình thật; T-38 E2E station + D13 BE thật. Kết quả: BE 294 pass / 89 skip, QA live 88/88, FE 224 unit, E2E mock 6, E2E BE thật 25/25 (+2 live). Architect chốt 02 v0.4 (DEC-61); PO SRS v0.4 (DEC-60, đóng RB-14); 04 TC-01.06 + TC-03.57; tài liệu nghiệp vụ lát 3. Chưa test (thiếu camera thật, T-4): tỉ lệ đọc ≥ 95%, trễ thật, CPU 4MP, ánh sáng, phiếu nhăn; âm báo D13 chưa nghe thật; live view LAN kho (UDP) |
| 2026-10-05 | BE, FE, QA, Architect | **M2 Video bằng chứng xong**: BE T-5 `4caa414`, T-14 `74a3aea` (+ API-30/31), T-21 `ebcc635`, T-15 `dadf93c`, T-18 `e9ef363`; FE T-51 `83b459e`, T-52 `3323be6`, T-53 `4befee3`, T-54 `555d891`, E2E UC-03 BE thật `272c9dc`. Kết quả: BE 257 pass / 79 skip, FE 185 unit, E2E BE thật 20/20, QA API live 78/78. Sự cố: ổ dev đầy 64 GB (MediaMTX giữ path camera mồ côi + video thô) → `7adb72f` dev giữ video 1 giờ, qa-reset dọn volume, J-10 xóa path mồ côi (DEC-102). Lỗi E2E thật bắt: D2 không tăng sau đóng phiên do cache API-32 → `1926eb6` xóa cache trước khi phát `report.updated` (TC-09.03). Architect chốt 02 v0.3 (DEC-57 contract, DEC-58 bản xuất 24 giờ; sửa architecture §8.2, ADR-008); 04 DEC-59 (TC-09.04); tài liệu nghiệp vụ lát 2. Rủi ro mở: AC-08 với 1080p H.265 thật (RB-7) |
| 2026-10-05 | Flow | User giao hoàn thành Phase 1–3 tự động (DEC-56): Phase 1 tiếp item 01 từ bước 8 (M2–M5); commit + push mỗi task; cuối phase G3/G4/G5 (staging local) + PR + merge main; phần thiếu tài nguyên ghi "chưa test"; Q&A nghiệp vụ sau phase, critical → dừng hẳn |
| 2026-10-05 | BE, FE, QA | Sửa finding review code M1 (DEC-53); thêm `useDashboardSocket` (WS-02 → invalidate D6); E2E với BE thật `ai-cam-fe/e2e/real` (`pnpm e2e:real`); QA M1 lần 1: API 72/72, E2E 18/18 → 04a. Tài liệu nghiệp vụ lát 0, lát 1 (`docs/nghiep-vu/`, thêm §0 theo template cập nhật) |
| 2026-10-05 | Flow | Đồng bộ bộ skill `ai-*` theo bản mới (CONVENTIONS §9 header + TL;DR cho mọi artifact; 02a/02b thêm Goals/Non-goals, Phương án, Rủi ro; 03/04a/05/ADR header bảng; bước 8c `ai-dev-explain-business`). Chuẩn hoá lại 02a, 02b×2, 03, 04, ADR-001..008, SRS/architecture hệ thống; profile thêm `business_docs_root` |
| 2026-10-04 | ai-flow-init | Tạo profile, system-map, chuyển SRS + architecture vào system/, tách ADR-001..008 |
| 2026-10-04 | ai-flow-route | Mở item 01-packing-mvp, lane feature, component be + fe |
| 2026-10-04 | PO | Viết 01-srs.md v0.1 (Draft): phạm vi Phase 1, DEC-1 tài khoản station, DEC-2 CSV dự phòng, DEC-3 retention 30/90, DEC-4 2 station / 500 đơn |
| 2026-10-04 | UX | Sao design system LiveAI → docs/design-system, chỉnh cho Hệ thống X (DEC-6, cập nhật architecture.md, ADR-006). Viết 01 §10: kiểm kê, journey, 20 màn, kiểm phủ FR. 01 → v0.2 |
| 2026-10-04 | PO | G1 duyệt, 01-srs.md v0.2 Approved |
| 2026-10-04 | Architect | Viết 02-tech-spec.md (In review): data model chung, 40 API + 2 kênh WS, DEC-7..10; bổ sung module approvals, imports vào architecture.md |
| 2026-10-04 | BE | Viết 02a-be-spec.md (In review): 19 bảng, API-01..92, J-01..J-11, vision, T-1..T-19 |
| 2026-10-04 | user | Ủy quyền agent tự chọn phương án tốt nhất ở CP/gate/lựa chọn trong skill, ghi DEC (DEC-15). Vẫn hỏi trước commit/push/ticket/deploy |
| 2026-10-04 | FE | Viết 02b-fe-spec-station.md, 02b-fe-spec-admin.md (In review) |
| 2026-10-04 | Lead review | Review G2 lần 1 (subagent): Chưa đạt, 28 findings |
| 2026-10-04 | PO, Architect, BE, FE | Sửa theo review: change request 01 v0.3; 02, 02a, 02b v0.2 |
| 2026-10-04 | Lead review | Vòng 2: Đạt có điều kiện; sửa N1–N12; G2 ✅ có điều kiện (DEC-33) |
| 2026-10-04 | PM | Viết 03-plan.md: 46 task, M0–M5, đường găng; Plan ✅ (DEC-37); ticket GitHub hoãn chờ user (DEC-35) |
| 2026-10-04 | QA | Viết 04-test-cases.md (Ready): 118 case chức năng + 10 phân quyền + 9 NFR |
| 2026-10-04 | Dev BE | T-1 khung repo BE, T-2 MediaMTX + camera giả, T-6 core + migration 0001 (19 bảng) + CLI create-admin; 36 test pass; DEC-39, DEC-40. Nhánh `feat/01-packing-mvp` trong ai-cam-be, chưa commit |
| 2026-10-04 | Dev FE | T-30 khung FE, T-31 tokens, T-32 + T-39 UI kit, T-33 API client + MSW + WS client; 86 test pass; DEC-41 (sửa), 42, 43, 44. Nhánh `feat/01-packing-mvp` trong ai-cam-fe, chưa commit. M0 xong |
| 2026-10-04 | Dev | Commit + push M0 (be 9efb3b2, fe 73c46f8, docs 4663d1c) theo yêu cầu user. T-7 auth + users: API-01..04, 90..92, 29 test API; DEC-45 |
| 2026-10-04 | Dev BE | T-8 station + camera: API-60..65, MediaMTX, J-08 (OFFLINE phát hiện 2 giây trên stack thật), J-09, Celery + compose vision/worker/beat; 96 test; DEC-46 |
| 2026-10-04 | Dev BE | T-9 orders: `transition()` theo 01 §7 v0.3 (56 cặp kiểm), upsert đơn sàn + BR-17 + EX-P10, MockAdapter. Sửa `uuid7` tăng đơn điệu (test bắt thứ tự sản phẩm sai). 148 test |
| 2026-10-04 | Dev BE | T-10 sessions: API-10/11 theo 02a §4.1 (tray xét trước, BR-18), seed-demo; test song song thật 8 quét (đối chứng: tắt lock → IntegrityError); sửa lỗi nạp model ở entrypoint; 173 test; chạy thật trên stack Docker; DEC-47 |
| 2026-10-04 | Dev BE | T-20: API-12 hủy (về `package_status_before`), API-15, J-07 (beat 30 giây, chạy thật); sửa kiểm `iat` của PyJWT; 183 test; DEC-48 |
| 2026-10-04 | Dev BE | T-11 hub WS-01/WS-02 + đẩy station.state / report.updated / camera.status; sửa accept-trước-đóng (đối chứng: 3 test đỏ khi hoàn tác); 190 test. M1 phần BE xong |
| 2026-10-04 | Dev FE | T-34 auth + guard theo vai + S0; chạy thật với BE (cookie rt_station httpOnly, reload giữ phiên); 94 test FE |
| 2026-10-04 | Dev FE | Màn station S1–S6 (T-35, 36, 37, 40): ScanBuffer, store một nguồn state, retry cùng client_scan_id, WS, âm thanh, hủy phiên, yêu cầu duyệt (mock). Chạy thật với BE + hub WS; sửa 2 lỗi tương phản thấy qua ảnh chụp; 115 test FE; DEC-50 |
| 2026-10-04 | Dev FE | T-50 khung dashboard (drawer theo vai, theme, D1, D12, 404) + T-57 D6 station/camera; chạy thật với BE (ảnh chụp camera giả qua ffmpeg); 131 test FE + e2e; DEC-51. M1 xong |
