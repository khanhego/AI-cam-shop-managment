# Test Report — 01 MVP đóng gói · lần 1 (phạm vi M1)

| | |
|---|---|
| QA (tác giả) | khanhtt |
| Reviewer | Tech lead · PO (duyệt G4) |
| Trạng thái | Draft |
| Build / commit | Nhánh `feat/01-packing-mvp` của `ai-cam-be` và `ai-cam-fe`; code M1 chưa commit, base BE `9efb3b2`, FE `73c46f8` |
| Môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml`: api :8180, Postgres 16 :55432, Redis :56379, MediaMTX v1.21.1, `fake-cam1`, `fake-cam2`. Chromium (Playwright). macOS (Darwin 25). Chưa có bàn thử phần cứng (T-4) |
| Ngày chạy | 2026-10-04 .. 2026-10-05 |
| Test cases | [04-test-cases.md](04-test-cases.md) |
| Last update | 2026-10-05 · QA |

> **TL;DR** — **Kết luận:** ❌ Chưa trình G4: mới QA phạm vi M1; M2–M4 chưa trong phạm vi. Trong phạm vi M1 không còn case fail và không còn bug mở.
> 138 case chức năng: ✅ 38 · ❌ 0 · ⛔ 13 (chờ camera và máy quét thật, T-4) · ⬜ 87 (80 ngoài phạm vi M1, 7 trong M1 chưa chạy hoặc chưa đủ bằng chứng).
> Bug: 4 bug (1 High, 3 Medium) đã sửa và chạy lại pass; bug Critical/High còn mở = 0. AC thuộc M1: AC-03 đạt; AC-01, AC-13 đạt một phần.
> NFR-01: p95 API-11 ≈ 13–17 ms trên stack dev (ngưỡng ≤ 1 giây), chưa đo trên phần cứng kho.
> Rủi ro chính: chưa kiểm phần cứng thật; thu hồi đăng nhập station chưa đóng WS ngay (T-13/T-59); `VIDEO_INCOMPLETE` chưa có (T-14).

<!-- Đối tượng đọc: người duyệt G4/G5. Báo cáo trung thực (CONVENTIONS §6.7): case không chạy được ghi "không chạy được" + lý do. -->

## 1. Tổng hợp

Cách tính: ✅ khi có test pass trong bằng chứng §5 ở đúng mức của cột **Cách** trong `04` (API trên stack thật, E2E với BE thật, hoặc pytest integration khi Cách = `INT`). Test component FE (vitest) không tính thay cho E2E.

| Module | Tổng | ✅ Pass | ❌ Fail | ⛔ Blocked | ⬜ Chưa chạy |
|---|---|---|---|---|---|
| M10 Đăng nhập, tài khoản, nhật ký | 10 | 7 | 0 | 0 | 3 |
| M01 Station và camera | 14 | 6 | 0 | 7 | 1 |
| M03 Phiên đóng gói | 35 | 23 | 0 | 6 | 6 |
| M03b Yêu cầu duyệt (M3) | 17 | 2 | 0 | 0 | 15 |
| M02 Ghi hình, clip (M2) | 19 | 0 | 0 | 0 | 19 |
| M07 Tra cứu, xuất (M2) | 17 | 0 | 0 | 0 | 17 |
| M05 Nguồn đơn (M4) | 21 | 0 | 0 | 0 | 21 |
| M09 Dashboard ngày (M2) | 5 | 0 | 0 | 0 | 5 |
| **Tổng** | **138** | **38** | **0** | **13** | **87** |
| Phân quyền TC-P.01..P.10 (`04` §3) | 10 | 3 | 0 | 0 | 7 |
| Phi chức năng TC-N.01..N.09 (`04` §4) | 9 | 0 | 0 | 0 | 9 |

- M03b có 2 case `INT` pass sớm (TC-03.52, TC-03.56) dù chức năng duyệt thuộc M3.
- Phân quyền: ✅ TC-P.01 (endpoint đã có ở M1: API-10, 11, 15), TC-P.07, TC-P.09 (`test_tc_p_matrix`, 4 vai × 11 endpoint, không token → 401). TC-P.10 chưa đủ: xem §3.

| AC nghiệm thu (thuộc M1) | Đạt? | TC |
|---|:---:|---|
| AC-01 quét liên tục, p95 ≤ 1 giây | Một phần | TC-03.01 ✅, 03.02 ✅, 03.03 ✅ (25 đơn / 50 lần quét, không phải 50 đơn), N.01 ⬜ (2 station song song chưa chạy) |
| AC-03 quét đóng sai mã không đóng phiên | ✅ | TC-03.04 ✅, 03.06 ✅ (20/20 `MISMATCH`) |
| AC-13 station đăng nhập, quét khi chưa đăng nhập | Một phần | TC-10.01 ✅; TC-03.30 ⬜ (chỉ có test component sau BUG-3, chưa có E2E) |

AC ngoài M1 đã có TC pass sớm (chưa tính đạt): AC-05 (TC-03.08), AC-16 (TC-03.28 `INT`), AC-21 một phần (TC-03.10, 03.52).

## 2. Bug

| ID | Mức | TC | Tái hiện | Kỳ vọng / Thực tế | Component | Trạng thái |
|---|:---:|---|---|---|:---:|---|
| BUG-1 | High | Tiền điều kiện PRE-1 (mọi case) | 1. Build image `api` 2. Chạy `scripts/qa-reset.sh` | Kỳ vọng: migrate trong container chạy được. Thực tế: lỗi vì image thiếu `alembic.ini` và thư mục `alembic` | be | Đã sửa (`docker/Dockerfile` chép thêm 2 mục), chạy lại pass |
| BUG-2 | Medium | TC-01.01, TC-01.07 | 1. Tạo station 2. Gắn Cam 2 `rtsp://localhost:8554/cam-fake2` 3. Đếm thời gian tới khi `status` = `ONLINE` | Kỳ vọng: ONLINE ≤ 10 giây. Thực tế: tới 30 giây, vì vision chỉ làm mới danh sách camera mỗi 30 giây | be | Đã sửa (làm mới mỗi 2 giây), chạy lại pass |
| BUG-3 | Medium | TC-03.30 (S0, EX-P9) | 1. Mở `/station/login`, ô tài khoản đang focus 2. Máy quét giả gõ `SPXTST0000001` + Enter | Kỳ vọng: Alert "Station chưa đăng nhập. Đăng nhập rồi quét lại.", ô không bị điền. Thực tế: mã điền thẳng vào ô tài khoản, không báo gì | fe | Đã sửa (bắt quét cả trong ô nhập, bỏ chuỗi vừa quét khỏi ô, hiện Alert); test `StationLoginPage.test.tsx` pass; E2E chưa có |
| BUG-4 | Medium | TC-01.01 | 1. D6 lưu Cam 2 2. Chờ, không tải lại trang | Kỳ vọng: chip Cam 2 chuyển Online ≤ 10 giây. Thực tế: chip đứng ở Offline tới khi tải lại; dashboard chưa nối WS-02 `camera.status` (02b-admin §4). Phát hiện nhờ E2E với BE thật | fe | Đã sửa (hook `useDashboardSocket` trong AppShell invalidate `['stations']`, `['station']`), E2E TC-01.01 pass |

**Sửa theo review code M1 (DEC-53), làm trước lần chạy lại** — mỗi mục có test:

| Review | Nội dung | Test chính |
|---|---|---|
| #1 (major) | FE không xử lý 409 `STATION_INACTIVE` / 403 → station treo im lặng | `ai-cam-fe/src/features/station/StationPage.test.tsx` |
| #2 (major) | J-07 chạy đua với lần quét đóng → phiên và kiện lệch nhau | `ai-cam-be/tests/integration/test_scan_concurrency.py` |
| #3 (major) | Rate-limit đăng nhập tính sai IP khi đứng sau proxy | `ai-cam-be/tests/unit/*` |
| #4, #5 | Dedup `client_scan_id` dưới lock; hai station cùng mã → một phiên, bên kia `ALERT` (không 500) | `test_scan_concurrency.py` |
| #6, #7, #18 | #6 đọc lại phiên từ DB sau khi lấy khóa station (không dùng bản cũ trong bộ nhớ); ngày theo giờ VN; giờ trong `ALREADY_PACKED` | `test_station_scan_api.py`, `tests/unit/*` |
| #8, #9, #10 | Bộ đếm mất WS 5 giây bị reset; WS đóng 4401 mà refresh thất bại; dọn store và âm báo khi rời trang | `useStationSocket.test.tsx`, `src/lib/ws.test.ts`, `StationPage.test.tsx` |
| #11, #12 | Giữ tài khoản / mật khẩu camera khi để trống; `rtsp_url` chứa `user:pass` → 422 | `test_stations_api.py`, `StationsAdmin.test.tsx` |
| #13 (một phần) | Token station đã gỡ khỏi station → 403 ngay | `test_station_scan_api.py` |
| #14, #16, #17, #20, #21, #22 | Web Locks khi refresh; che log; `seed-demo` chặn production + secret staging; #20 đang chờ duyệt thì mọi lần quét IGNORED, xét trước định dạng mã; #21 username không tồn tại vẫn verify hash giả (không lộ username qua thời gian phản hồi); sourcemap `hidden` | `tests/unit/*`, test FE tương ứng |

Để sau (đã ghi DEC-53): #13 phần thu hồi ≤ 15 phút + đóng WS ngay (T-13/T-59) · #15 `VIDEO_INCOMPLETE` (T-14) · #19 định dạng giờ `Z` · #23 J-09 giữ transaction.

## 3. Case fail / blocked / chưa đủ

Không có case ❌.

| TC | Lý do | Việc cần |
|---|---|---|
| TC-01.07, 01.08 | ⛔ Cần rút cáp camera thật. Bản giả lập (dừng container `fake-cam2`) đạt: OFFLINE ≤ 10 giây, ONLINE lại sau khi bật. Cờ `VIDEO_INCOMPLETE` chưa có | Chạy lại trên bàn thử T-4; cờ theo T-14 |
| TC-01.09, 01.10, 01.11, 01.13, 01.14 | ⛔ Cần camera thật (ONVIF, live view, sai mật khẩu camera thật) | Bàn thử T-4 |
| TC-03.20..03.24, 03.35 | ⛔ Cần Cam 2 thật, phiếu in, máy quét USB | Bàn thử T-4 (M3) |
| TC-10.05 | ⬜ Trong M1, chưa chạy (cần `ACCESS_TOKEN_MINUTES=1` + 2 tab) | Viết E2E hoặc chạy tay ở lần 2 |
| TC-10.06 | ⬜ Phần BE (refresh bị thu hồi) pass ở `INT`; WS chưa đóng ngay | T-13/T-59 (review #13) |
| TC-10.09 | ⬜ Phần M1 pass (`LOGIN`, `USER_UPDATE`, `STATION_UPDATE`, `CAMERA_UPDATE`); 6 action còn lại thuộc M2/M3 | Chạy lại đủ 10 action sau M3 |
| TC-03.13 | ⬜ `INT` chỉ kiểm cơ chế cắt với ngưỡng thu nhỏ (sàn chậm 0,5 giây, cắt 0,1 giây); mốc "sàn chậm 3 giây → phản hồi ≤ 3 giây" chưa đo | Thêm test `MockAdapter(delay_s=3)` |
| TC-03.30, 03.31, 03.32 | ⬜ Chỉ có test component (vitest), chưa có E2E với BE thật | E2E thuộc T-38 / chạy tay ở lần 2 |
| TC-P.10 | ⬜ Pass 2 ô E2E: Supervisor vào `/admin/settings/*` → `/admin/forbidden`; tài khoản dashboard mở `/station` bằng tải trang mới → `/station/login` (ma trận ghi `/admin`; chấp nhận theo DEC-54). Ô Station → `/station` và CSKH → `/admin/forbidden` mới có test component | Sửa ô ma trận `04` §3 theo DEC-54; thêm E2E 2 ô còn lại |

Ghi chú với case đã ✅:
- TC-03.03: test chạy 25 đơn / 50 lần quét, `04` ghi 50 đơn (đã ghi "cần xác nhận"). p95 dư xa ngưỡng nên chấp nhận cho M1.
- TC-01.04: bước 2 (lưu URL không tới được) chỉ kiểm gián tiếp qua audit `CAMERA_UPDATE` trong TC-10.09, chưa assert `status` = `OFFLINE`.
- TC-01.06: test chỉ assert 422; mã lỗi `VALIDATION_ERROR` hay `ROI_INVALID` vẫn chờ xác nhận như `04` đã ghi.
- TC-03.34: mã < 4 ký tự bị bộ đệm máy quét bỏ, không gọi API — đúng thiết kế 02b-station §5.
- TC-03.09, 03.10: nút "Yêu cầu đóng gói lại" và "Gọi quản lý" hiện đúng, nhưng bấm trên BE thật trả 404 (API-13 thuộc T-13) → FE hiện toast, không treo (review #1).

## 4. Phi chức năng

| NFR | Ngưỡng | Đo được | Đạt |
|---|---|---|:---:|
| NFR-01 (API-11, đơn đã có) | p95 ≤ 1 giây | p95 ≈ 13–17 ms, 50 lần quét liên tiếp, 1 station, stack dev (`test_tc_03_03_fifty_scans_p95`) | ✅ trên stack dev |
| NFR-01 (TC-N.01: 2 station song song, 100 quét) | p95 ≤ 1 giây | Chưa chạy | ⬜ |
| FR-01.02 / AC-10 camera mất tín hiệu | ≤ 10 giây → OFFLINE | Đạt khi giả lập dừng `fake-cam2`; chưa đo với camera thật | ⛔ (HW) |
| NFR-03, 04, 05, 09, 10, 31 | `04` §4 | Chưa chạy (thuộc M2..M5 hoặc cần phần cứng) | ⬜ |

Chưa đo trên phần cứng kho; kết quả hiệu năng trên máy dev macOS chỉ là tham khảo.

## 5. Bằng chứng

| Bộ test | Lệnh | Kết quả |
|---|---|---|
| API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` | 72 passed — [evidence/m1-api-live.txt](evidence/m1-api-live.txt) |
| E2E với BE thật | `cd ai-cam-fe && pnpm e2e:real` | 18 passed — [evidence/m1-e2e-real.txt](evidence/m1-e2e-real.txt) |
| BE unit + integration | `cd ai-cam-be && uv run pytest` | 203 passed, 72 skipped (bộ `qa` khi không đặt `QA_BASE_URL`) |
| FE component | `cd ai-cam-fe && pnpm test` | 141 passed (14 file) |
| FE E2E (MSW) | `cd ai-cam-fe && pnpm e2e` | 1 passed |
| Lint / typecheck | BE: ruff, mypy strict, import-linter (2 contract) · FE: tsc, eslint | Sạch |

Map test → TC: docstring trong `ai-cam-be/tests/qa/test_m1_live.py`, `ai-cam-be/tests/integration/*.py`; tên test trong `ai-cam-fe/e2e/real/*.spec.ts` (bảng "Test tự động đã gắn TC" ở `04` §1).

## 6. Rủi ro còn lại & điều kiện release

- Chưa trình G4: lần 1 chỉ phủ M1; M2 (clip, tra cứu, dashboard), M3 (Cam 2, duyệt), M4 (Shopee, CSV) chưa có code.
- 13 case ⛔ chờ bàn thử phần cứng T-4 (camera thật, máy quét USB, phiếu in); AC-04, AC-10 phụ thuộc nhóm này.
- Thu hồi đăng nhập station chưa đóng WS ngay; station còn dùng được tới khi access token hết hạn (≤ 15 phút) — T-13/T-59.
- Cờ `VIDEO_INCOMPLETE` khi camera rớt chưa có — T-14.
- Hiệu năng mới đo 1 station trên máy dev; tải 2 station (TC-N.01) và locust (TC-N.04, T-19) chưa chạy.
- Lệch spec cần cập nhật `04` §3: ô "dashboard mở `/station`" → `/station/login` (DEC-54).
- Checklist deploy từ review (`FORWARDED_ALLOW_IPS`, không phục vụ `*.map`, secret staging) nằm ở T-19, chưa kiểm trên môi trường staging.

**Lệnh tái chạy lần 2** (sau M2–M4): `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` · `cd ai-cam-fe && pnpm e2e:real` · `cd ai-cam-be && uv run pytest` · `cd ai-cam-fe && pnpm test`.
