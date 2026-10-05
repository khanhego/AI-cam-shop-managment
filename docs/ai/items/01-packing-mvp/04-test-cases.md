# Test Cases — 01 MVP đóng gói

| | |
|---|---|
| QA | khanhtt |
| Reviewer | Tech lead · PO |
| Trạng thái | Executing (lần 1 — M1) |
| Nguồn | SRS [01-srs.md](01-srs.md) v0.3 · Tech Spec [02](02-tech-spec.md), [02a](02a-be-spec.md), [02b-station](02b-fe-spec-station.md), [02b-admin](02b-fe-spec-admin.md) · Plan [03](03-plan.md) |
| Build / môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml` (api :8180) + FE `pnpm dev` (:5180) · bàn thử phần cứng chưa có (T-4) |
| Last update | 2026-10-05 · QA (TC-09.04 theo DEC-59) |

> **TL;DR** — 157 case: 138 chức năng (8 module), 10 phân quyền, 9 NFR; 53 case chức năng P1 + 9 case phân quyền P1 chặn release.
> 113 case chức năng chạy tự động được (API 33, INT 28, E2E 52); 25 case thủ công (HW 15, MAN 9, API + MAN 1) cần camera thật, máy quét thật hoặc Shopee thật.
> Phủ AC-01..05, AC-08..21, BR-01..06, 09, 15..18, EX-P1..P11, ma trận quyền 4 vai, NFR-01, 03, 04, 05, 09, 10, 31.
> Rủi ro: M2..M5 chưa có code (clip, tra cứu, CSV, Shopee) → kỳ vọng các module đó theo spec, chỗ chưa chắc ghi "(cần xác nhận)".
> Lần chạy 1 (phạm vi M1, 2026-10-05): ✅ 38 · ❌ 0 · ⛔ 13 (chờ phần cứng T-4) · ⬜ 87 (80 ngoài phạm vi M1, 7 chưa chạy / chưa đủ) — kết quả và bug: [04a](04a-test-report.md).

<!-- Đối tượng đọc: người chạy test (kể cả người mới) và người duyệt release. Mỗi case chạy lại được
bởi người khác mà không cần hỏi: tiền điều kiện (PRE-x ở §1), bước đánh số, dữ liệu cụ thể, kỳ vọng có giá trị. -->

---

## 1. Phạm vi & chiến lược

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Mọi FR trong phạm vi 01 §1, AC-01..05, AC-08..21 | Hàng hoàn, đối soát, khiếu nại (Phase 2) |
| API qua HTTP thật (server chặn quyền, mã lỗi) | Unit test của dev (02a §11, 02b §13) — QA chỉ kiểm có chạy trong CI |
| E2E station + dashboard trên Chromium | Safari / Firefox ngoài TC-07.12, TC-07.17 |
| NFR hiệu năng, offline, camera | Pentest đầy đủ (ngoài MVP) |

| Mức | Phạm vi | Công cụ / lệnh | Tự động |
|---|---|---|:---:|
| Unit + integration (dev) | 02a §11, 02b §13 | `cd ai-cam-be && uv run pytest` (cần postgres/redis của stack dev) · `cd ai-cam-fe && pnpm test` (vitest) | ✔ |
| API (QA, stack thật) | Case Cách `API`, ma trận §3 | `cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest tests/qa -m qa -v` (`tests/qa/test_m1_live.py`, tự chạy QA reset đầu phiên) | ✔ (M1) |
| Integration đồng hồ giả | Case Cách `INT` (tua giờ, sàn mock trễ / lỗi) | `cd ai-cam-be && uv run pytest tests/integration` — `aicam.core.clock.freeze/advance` chỉ bật khi `app_env=test` (`fake_clock_allowed`) | ✔ |
| E2E / UI | Case Cách `E2E` | `cd ai-cam-fe && pnpm e2e` (Playwright, thư mục `ai-cam-fe/e2e/`; mặc định MSW, đặt `E2E_BASE_URL=http://localhost:5180` để chạy với BE thật); máy quét giả = `keyboard.type(code, {delay: 5})` + Enter. Hiện chỉ có `smoke.spec.ts`; spec station / admin thuộc T-38, T-61 | một phần |
| Phần cứng | Case Cách `HW` | Thủ công tại bàn thử, quay màn hình làm bằng chứng | ✗ |
| NFR | §4 | locust: chưa có, task NFR T-19 · đo p95 bằng `test_tc_03_03` · đồng hồ bấm | một phần |

Cột **Cách**: `API` (HTTP trên stack dev) · `INT` (pytest integration) · `E2E` (trình duyệt) · `HW` (thủ công có phần cứng) · `MAN` (thủ công khác).

**Tiền điều kiện chuẩn** (bảng §2 tham chiếu theo mã)

| Mã | Tiền điều kiện |
|---|---|
| PRE-1 | Stack dev chạy: `docker compose -f ai-cam-be/docker/compose.dev.yml up -d` (api :8180, postgres :55432, redis :56379, mediamtx 58554 / 58889 / 59997, fake-cam1, fake-cam2, vision, worker, beat). Đã chạy `ai-cam-be/scripts/qa-reset.sh` ngay trước case |
| PRE-2 | PRE-1 + FE `cd ai-cam-fe && pnpm dev` (http://localhost:5180). Station đăng nhập tại `/station/login` bằng `tst_station01` / `matkhau123`, đang ở S1 "SẴN SÀNG" |
| PRE-3 | PRE-1 + FE chạy. Dashboard đăng nhập tại `/admin/login` bằng `tst_admin` / `matkhau123` |
| PRE-4 | PRE-2 + cửa sổ thứ hai: dashboard đăng nhập `tst_sup` / `matkhau123`, mở D13 `/admin/approvals` |
| PRE-5 | PRE-1 + access token từng vai lấy bằng API-01 `POST http://localhost:8180/api/v1/auth/login` (`client=DASHBOARD` cho `tst_admin`, `tst_sup`, `tst_cskh`; `client=STATION` cho `tst_station01`, `tst_station02`) — như fixture `tokens` trong `test_m1_live.py` |
| PRE-6 | Pytest integration (Cách `INT`): DB test trống, tự tạo dữ liệu bằng `tests/integration/factories.py`; sàn giả `MockAdapter` qua override `get_platform_adapter` |
| PRE-7 | Bàn thử phần cứng (T-4): TST Station 01 gắn camera thật Cam 1 + Cam 2, ROI Cam 2 đã lưu, máy quét USB HID, phiếu in `SPXTST…`; PRE-2 trên máy trạm |

**Dữ liệu test** — tạo bằng `aicam seed-demo` (gọi trong `qa-reset.sh`: `alembic downgrade base && alembic upgrade head && aicam seed-demo`, rồi xóa Redis `login_fail_ip:*`, `tray:*`).

| Dữ liệu | Giá trị sau reset |
|---|---|
| Tài khoản (mật khẩu chung `matkhau123`) | `tst_admin` (ADMIN, "Quản trị") · `tst_sup` (SUPERVISOR, "Nguyễn B") · `tst_cskh` (CSKH, "Lan") · `tst_station01`, `tst_station02` (STATION) |
| Station | `TST Station 01` (Cam 1 → `cam-fake1`, Cam 2 → `cam-fake2`) · `TST Station 02` (chưa gắn camera) |
| Đơn `SPXTST0000001..30` (mock adapter) | Mã đơn sàn `2410TST000nn`; 1 sản phẩm "Áo thun basic · Đen / L × 2"; ghi chú khách "Gói kỹ giúp em" khi nn chia hết cho 5 |
| `SPXTST0000009` | Đơn hủy trên sàn (`CANCELLED`) |
| `SPXTST0000010` | `PACKED` tại TST Station 02 (phiên `COMPLETED`, cờ `CAM2_UNVERIFIED`, giờ = lúc reset) |
| `SPXTST0000011` | `HANDED_OVER` |
| `SPXTST0000012` | `NEW`, 3 sản phẩm: Áo thun basic · Đen / L × 2 · Tất cổ ngắn · Trắng × 1 · Túi vải × 1; không có ghi chú khách |
| `SPXTST999xxxx`, `SPXQA…` | Không có trên sàn mock → quét mở phiên cờ `UNVERIFIED` |
| File CSV | Chưa có — tạo ở task M5 tại `ai-cam-be/tests/qa/fixtures/csv/` (`ok_500.csv`, `one_error.csv`, `missing_column.csv`, `overlap_api.csv`) (cần xác nhận đường dẫn) |
| Phiếu in (HW) | 40 phiếu Shopee test in từ mã `SPXTST…`, gồm phiếu nhăn và phiếu in trùng |

**Tua giờ** (BR-16, retention, URL hết hạn): không có biến môi trường đồng hồ giả. Chạy ở mức `INT`, hoặc trên stack thật hạ ngưỡng phút: `docker compose -f ai-cam-be/docker/compose.dev.yml exec -T postgres psql -U aicam -d aicam -c "UPDATE setting SET session_warn_minutes=1, session_abandon_minutes=2"` (job `sessions.check_timeouts` chạy mỗi 30 giây). Ngưỡng ngày (retention) chỉ chạy được ở `INT`.

**Dọn:** chạy lại `ai-cam-be/scripts/qa-reset.sh`; xóa hẳn: `docker compose -f ai-cam-be/docker/compose.dev.yml down -v` (xóa volume `pgdata`, `video`).

**Test tự động đã gắn TC** (docstring ghi ID)

| File | TC |
|---|---|
| `ai-cam-be/tests/qa/test_m1_live.py` | 10.01–10.04, 10.07–10.10, 01.01–01.08 (01.07, 01.08 giả lập bằng dừng `fake-cam2`), 01.12, 03.01–03.10, 03.12/13 (phần `UNVERIFIED`), 03.14, 03.15, 03.17–03.19, 03.33, P.01, P.07, P.09 |
| `ai-cam-be/tests/integration/test_stations_api.py` | 01.01–01.06, 01.12, P.07 |
| `ai-cam-be/tests/integration/test_station_scan_api.py` | 03.01, 03.02, 03.04, 03.05, 03.07–03.10, 03.12/13, 03.14, 03.15, 03.17, 03.26, 03.50 |
| `ai-cam-be/tests/integration/test_session_lifecycle.py` | 03.18, 03.19, 03.27–03.29, 03.33, 03.51 (phần đóng), 03.52, 03.53 |
| `ai-cam-be/tests/integration/test_scan_concurrency.py` | 03.16 |
| `ai-cam-be/tests/integration/test_auth_users_api.py` | 10.04, 10.06 (phần BE), 10.07, P.09 |
| `ai-cam-be/tests/integration/test_ws_hub.py` | 03.56 |
| `ai-cam-fe/src/features/admin/StationsAdmin.test.tsx` | 01.01–01.04, 01.11 (chữ lỗi theo `reason`) |

**Vào:** G3 ✅; PRE-1 chạy đủ service; QA reset xong; `fake-cam1`, `fake-cam2` ONLINE; bàn thử phần cứng có cho case `HW`.
**Ra:** mọi case P1 ✅; mọi AC có ≥ 1 case ✅ kèm bằng chứng; bug Critical/High = 0.

## 2. Test cases
<!-- Loại: Happy · Negative · Boundary · Permission · State · Regression · NFR · Error.
Ưu tiên: P1 (chặn release) · P2 · P3. Kết quả: ⬜ chưa chạy · ✅ pass · ❌ fail · ⛔ blocked.
Mã API viết tắt: API-xx theo 02 §6; base `http://localhost:8180/api/v1`. "API-11 quét X" = POST /station/scan {"code": "X", "client_scan_id": <UUID mới>}. -->

### M10 — Đăng nhập, tài khoản, nhật ký

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-10.01 | Station đăng nhập đúng | FR-03.01, AC-13 | Happy | P1 | E2E | PRE-1 + FE chạy | 1. Mở `/station/login` 2. Nhập "Tài khoản station" = `tst_station01`, "Mật khẩu" = `matkhau123` 3. Bấm "Đăng nhập" | URL `/station`, màn "SẴN SÀNG"; thanh trạng thái ghi "TST Station 01"; API-01 200, `user.station.name` = "TST Station 01"; `Set-Cookie: rt_station=…; HttpOnly` | ✅ |
| TC-10.02 | Sai mật khẩu | API-01 | Negative | P1 | E2E | PRE-1 + FE chạy | 1. Mở `/station/login` 2. Nhập `tst_station01` / `sai` 3. Bấm "Đăng nhập" | API-01 401 `INVALID_CREDENTIALS`; Alert "Sai tài khoản hoặc mật khẩu. Kiểm tra lại hoặc hỏi Admin."; vẫn ở `/station/login` | ✅ |
| TC-10.03 | Tài khoản dashboard vào station | API-01 WRONG_CLIENT | Negative | P2 | E2E | PRE-1 + FE chạy | 1. Mở `/station/login` 2. Nhập `tst_cskh` / `matkhau123` 3. Bấm "Đăng nhập" | API-01 403 `WRONG_CLIENT`; Alert "Tài khoản này không dùng cho station. Đăng nhập dashboard tại /admin." | ✅ |
| TC-10.04 | Khóa sau 10 lần sai | §8 AuthN, API-01 | Boundary | P2 | API | PRE-5 | 1. `tst_admin` gọi API-90 POST /users `{"username":"qa_lock","display_name":"QA","role":"CSKH","password":"12345678"}` 2. Gọi API-01 `qa_lock` / `sai` 10 lần 3. Gọi API-01 `qa_lock` / `12345678` | Bước 1: 201. Bước 2: 10 lần 401 `INVALID_CREDENTIALS`. Bước 3: 423 `ACCOUNT_LOCKED`, `details.until` ≈ giờ gọi + 15 phút | ✅ |
| TC-10.05 | Refresh theo client không ghi đè nhau | API-02, N3 | Regression | P2 | E2E | PRE-1 với biến `ACCESS_TOKEN_MINUTES=1` cho service `api` + FE chạy | 1. Tab A: đăng nhập `/station/login` bằng `tst_station01` 2. Tab B: đăng nhập `/admin/login` bằng `tst_admin` 3. Chờ 70 giây 4. Tab A quét `SPXTST0000001` 5. Tab B tải lại `/admin/settings/stations` | Bước 4: màn "ĐANG ĐÓNG GÓI" (không về `/station/login`). Bước 5: danh sách station hiện, URL không đổi. Trình duyệt giữ cả cookie `rt_station` và `rt_dashboard` | ⬜ |
| TC-10.06 | Thu hồi đăng nhập station | API-91, FR-03.01 | Happy | P2 | E2E | PRE-2 + cửa sổ dashboard PRE-3 | 1. Dashboard mở D9 `/admin/settings/users` 2. Bấm "Thu hồi phiên đăng nhập" ở dòng `tst_station01` | API-91 204; station về `/station/login` trong ≤ 15 phút (khi access token hết hạn, refresh bị từ chối). WS không cần đóng ngay (DEC-55) | ⬜ |
| TC-10.07 | Không được khóa Admin cuối | API-90 LAST_ADMIN | Negative | P2 | API | PRE-5 (chỉ có 1 Admin `tst_admin`) | 1. Lấy `id` của `tst_admin` qua API-04 GET /me 2. PATCH /users/{id} `{"is_active": false}` | 409 `LAST_ADMIN`; D9 hiện "Phải còn ít nhất một Admin."; `tst_admin` vẫn đăng nhập được | ✅ |
| TC-10.08 | Trùng username | API-90 | Negative | P3 | API | PRE-5 | 1. `tst_admin` gọi POST /users `{"username":"tst_admin","display_name":"x","role":"CSKH","password":"12345678"}` | 409 `USERNAME_TAKEN`; D9 hiện lỗi dưới ô tài khoản (chữ cần xác nhận khi có D9) | ✅ |
| TC-10.09 | Audit thao tác nhạy cảm | FR-10.03, NFR-15 | Happy | P1 | API | PRE-5 | Xem chi tiết bên dưới (10 thao tác) | API-92 có đủ 10 action, mỗi dòng đúng user và `object_id` | ⬜ |
| TC-10.10 | Audit không sửa được | 02a §3 quyền DB | Negative | P2 | MAN | PRE-1 | 1. `docker compose -f ai-cam-be/docker/compose.dev.yml exec -T postgres psql -U aicam -d aicam -c "UPDATE audit_log SET action='X'"` 2. Lặp với `DELETE FROM audit_log` | Cả hai lệnh lỗi, thông báo chứa "chỉ cho phép INSERT"; số dòng `audit_log` không đổi | ✅ |

<details><summary>TC-10.09 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | API-01 đăng nhập | `tst_admin` / `matkhau123` | Dòng `LOGIN`, user "Quản trị" |
| 2 | API-90 POST /users | `qa_audit`, role CSKH | Dòng `USER_UPDATE`, `object_id` = id `qa_audit` |
| 3 | API-60 POST /stations | `{"name":"QA Audit"}` | Dòng `STATION_UPDATE`, user "Quản trị" |
| 4 | API-61 PUT /stations/{id}/cameras/CAM1 | `{"rtsp_url":"rtsp://10.255.255.1/x"}` | Dòng `CAMERA_UPDATE` |
| 5 | (M2) `tst_cskh` bấm phát clip ở D4 | phiên `SPXTST0000001` đã đóng | Dòng `VIEW_CLIP`, user "Lan" |
| 6 | (M2) `tst_cskh` API-43 xuất clip, rồi tải `video.mp4` | `{"layout":"SIDE_BY_SIDE"}` | Dòng `EXPORT_CLIP` và `DOWNLOAD_EXPORT`, user "Lan" |
| 7 | (M2) `tst_sup` API-42 giữ clip | `{"held": true}` | Dòng `HOLD_CLIP`, user "Nguyễn B" |
| 8 | (M2) `tst_admin` API-80 PUT /settings | `retention_clip_days` 90 → 100 | Dòng `SETTINGS_UPDATE` |
| 9 | (M2) `tst_sup` API-21 duyệt yêu cầu | `{"action":"CONTINUE"}` | Dòng `APPROVAL_DECISION`, user "Nguyễn B" |
| 10 | `tst_admin` API-92 GET /audit-logs?page_size=100 | — | Có đủ 10 action trên; D10 hiện cùng các dòng |
</details>

### M01 — Station và camera

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-01.01 | Tạo station + 2 camera | FR-01.01, UC-07 | Happy | P1 | E2E | PRE-3 | Xem chi tiết bên dưới | Ảnh chụp camera hiện; station trong danh sách; chip Cam 2 ONLINE ≤ 10 giây sau khi lưu | ✅ |
| TC-01.02 | Tên station trùng | API-60 | Negative | P3 | API | PRE-5 | 1. `tst_admin` gọi POST /stations `{"name":"tst station 01"}` | 409 `NAME_TAKEN` (không phân biệt hoa thường); D6 hiện "Tên station đã tồn tại." dưới ô tên | ✅ |
| TC-01.03 | Tài khoản station đã gắn nơi khác | API-60 | Negative | P3 | API | PRE-5 | 1. Lấy id `tst_station01` qua GET /users?role=STATION 2. POST /stations `{"name":"QA S3","account_user_id":<id>}` | 409 `ACCOUNT_IN_USE`; D6: `tst_station01` không có trong danh sách chọn "Tài khoản station" | ✅ |
| TC-01.04 | Camera không tới được (IP không tồn tại) | API-62 | Error | P2 | API | PRE-5 | 1. POST /cameras/test `{"rtsp_url":"rtsp://10.255.255.1:554/x"}` 2. PUT /stations/{id TST Station 02}/cameras/CAM1 cùng URL | Bước 1: 422 `CAMERA_UNREACHABLE`, `details.reason` = `TIMEOUT` (test chấp nhận `STREAM`); D6 hiện "Không kết nối được camera (hết thời gian chờ). Kiểm tra địa chỉ camera và dây mạng." Bước 2: 200, `status` = `OFFLINE` (vẫn lưu được) | ✅ |
| TC-01.05 | Vẽ và lưu ROI Cam 2 | FR-01.04 | Happy | P1 | E2E | PRE-3 (RoiEditor thuộc T-62) | 1. D6 mở TST Station 01 2. Bước ROI: kéo khung trên ảnh Cam 2 tới x=0.2, y=0.2, w=0.6, h=0.6 3. Bấm "Lưu vùng đọc mã" | API-64 200, `roi` = `{"x":0.2,"y":0.2,"w":0.6,"h":0.6}`; Redis kênh `vision.config` nhận `{"camera_id": <id Cam 2>}`; mã ngoài khung không được đọc — kiểm ở TC-03.35 | ⬜ |
| TC-01.06 | ROI quá nhỏ | API-64 | Boundary | P3 | API | PRE-5 | 1. PUT /cameras/{id Cam 2 TST Station 01}/roi `{"x":0.2,"y":0.2,"w":0.04,"h":0.6}` | 422; code hiện trả `VALIDATION_ERROR` với `details.fields` chứa `w` (02 §6 ghi `ROI_INVALID` — cần xác nhận); ROI cũ giữ nguyên | ✅ |
| TC-01.07 | Mất tín hiệu camera ≤ 10 giây | FR-01.02, 01.03, AC-10, EX-P7 | NFR | P1 | HW | PRE-7, phiên `SPXTST0000001` đang mở | Xem chi tiết bên dưới | ≤ 10 giây: chip "Cam 2 mất tín hiệu" trên station, D2 "Cần xử lý" có dòng Cam 2 TST Station 01 mất tín hiệu; phiên gắn cờ `VIDEO_INCOMPLETE` | ⛔ |
| TC-01.08 | Camera trở lại | FR-01.02 | State | P2 | HW | Ngay sau TC-01.07 | 1. Cắm lại cáp Cam 2 2. Bấm đồng hồ | ≤ 10 giây: chip "Cam 2" xanh; API-60 GET /stations → Cam 2 `status` = `ONLINE` | ⛔ |
| TC-01.09 | Lệch giờ camera 1,5 giây → cảnh báo | FR-01.06, BR-15, AC-17 | Boundary | P1 | HW | PRE-7, camera hỗ trợ ONVIF (DEC-33) | 1. Chỉnh giờ Cam 1 nhanh hơn 1,5 giây 2. Chờ ≤ 10 phút (J-09) 3. Mở D2 | API-32 `attention` có `{"kind":"CLOCK_DRIFT","offset_ms":≈1500}`; D2 "Cần xử lý" hiện "Camera lệch giờ 1,5 giây" | ⛔ |
| TC-01.10 | Live view | FR-01.05 | Happy | P3 | HW | PRE-7; dashboard đăng nhập `tst_sup` | 1. Mở D11 `/admin/live` | 4 ô video chạy (2 station × 2 camera), mỗi ô có chip REC; API-65 trả `whep_url` cho từng camera | ⛔ |
| TC-01.11 | Camera sai mật khẩu (tách từ TC-01.04) | API-62 | Error | P2 | HW | PRE-7, PRE-3 | 1. D6 mở TST Station 01 2. Ô Cam 1 nhập `rtsp://admin:sai@<IP Cam 1>:554/stream1` 3. Bấm "Kiểm tra kết nối" | 422 `CAMERA_UNREACHABLE`, `details.reason` = `AUTH`; D6 hiện "Không kết nối được camera (sai tài khoản hoặc mật khẩu). Kiểm tra lại thông tin đăng nhập camera." | ⛔ |
| TC-01.12 | ROI cho Cam 1 bị chặn (tách từ TC-01.06) | API-64 | Negative | P3 | API | PRE-5 | 1. PUT /cameras/{id Cam 1 TST Station 01}/roi `{"x":0.2,"y":0.2,"w":0.6,"h":0.6}` | 409 `ROI_ONLY_CAM2`, message "Chỉ Cam 2 có vùng đọc mã."; D6 không hiện công cụ ROI cho Cam 1 | ✅ |
| TC-01.13 | Lệch giờ 0,8 giây → không cảnh báo (tách từ TC-01.09) | BR-15 | Boundary | P2 | HW | PRE-7, camera ONVIF | 1. Chỉnh giờ Cam 1 nhanh hơn 0,8 giây 2. Chờ 10 phút 3. Mở D2 | API-32 `attention` không có `CLOCK_DRIFT` cho Cam 1; D2 không có dòng lệch giờ | ⛔ |
| TC-01.14 | Live view khi camera mất tín hiệu (tách từ TC-01.10) | FR-01.05 | Negative | P3 | HW | Đang ở D11 (sau TC-01.10) | 1. Rút cáp Cam 1 TST Station 01 2. Chờ 10 giây | Ô Cam 1 TST Station 01 hiện "Mất tín hiệu"; 3 ô còn lại vẫn chạy | ⛔ |

<details><summary>TC-01.01 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | D6 `/admin/settings/stations` bấm "Thêm station" | — | Form trống |
| 2 | Nhập "Tên station", chọn "Tài khoản station" | `QA Station`; tài khoản: chưa gắn (tạo trước `qa_st` role STATION nếu danh sách trống) | — |
| 3 | Lưu station | — | API-60 201; về form sửa station |
| 4 | Ô Cam 2 nhập địa chỉ, bấm "Kiểm tra kết nối" | `rtsp://mediamtx:8554/cam-fake2` | API-62 200, `snapshot` bắt đầu `data:image/jpeg;base64,`; ảnh chụp hiện dưới ô |
| 5 | Lưu Cam 2 | `rtsp://localhost:8554/cam-fake2` | API-61 200, `status` = `OFFLINE` |
| 6 | Bấm đồng hồ, xem danh sách D6 | — | Chip Cam 2 chuyển ONLINE ≤ 10 giây (J-08) |
</details>

<details><summary>TC-01.07 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Station quét mở phiên | `SPXTST0000001` | Màn "ĐANG ĐÓNG GÓI" |
| 2 | Rút cáp mạng Cam 2, bấm đồng hồ | — | — |
| 3 | Xem station | — | ≤ 10 giây: chip đỏ "Cam 2 mất tín hiệu" trên thanh trạng thái; âm cảnh báo (cần xác nhận âm) |
| 4 | Xem D2 (cửa sổ `tst_sup`) | — | ≤ 10 giây: "Cần xử lý" có dòng Cam 2 TST Station 01 mất tín hiệu; API-32 `attention` có `CAMERA_OFFLINE` role `CAM2` |
| 5 | Quét đóng phiên | `SPXTST0000001` | Phiên `COMPLETED`, cờ `VIDEO_INCOMPLETE` (gắn khi cắt clip — M2, cần xác nhận) |
| 6 | Về S1 | — | Alert "Cam 2 mất tín hiệu. Vẫn đóng gói được, video sẽ thiếu. Báo quản lý." |

Bản giả lập không cần phần cứng: `docker compose -f ai-cam-be/docker/compose.dev.yml stop fake-cam2` thay cho rút cáp (đã tự động trong `test_tc_01_07_simulated_camera_loss`).
</details>

### M03 — Phiên đóng gói (station)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-03.01 | Mở phiên | FR-03.02, 03.03, AC-01, EX-P8 | Happy | P1 | E2E | PRE-2 | 1. Quét `SPXTST0000012` | ≤ 1 giây: nền xanh dương "ĐANG ĐÓNG GÓI", mã `SPXTST0000012` cỡ lớn, "[Shopee] 2410TST00012", 3 dòng: Áo thun basic · Đen / L × 2, Tất cổ ngắn · Trắng × 1, Túi vải × 1; không có dòng "Ghi chú của khách"; bíp thành công. API-11 `outcome` = `SESSION_OPENED`, `state.state` = `PACKING` | ✅ |
| TC-03.02 | Đóng phiên | FR-03.04, AC-01 | Happy | P1 | E2E | Ngay sau TC-03.01, khay trống | 1. Quét lại `SPXTST0000012` | Về "SẴN SÀNG", bíp; "Hôm nay: N kiện" tăng 1; API-11 `outcome` = `SESSION_COMPLETED`, `state.state` = `READY`; DB `package.warehouse_status` = `PACKED`, phiên `COMPLETED` | ✅ |
| TC-03.03 | Quét liên tục 50 đơn | FR-03.11, AC-01, NFR-01 | Happy | P1 | E2E | PRE-2 | Xem chi tiết bên dưới | 50 phiên `COMPLETED`; p95 thời gian phản hồi API-11 ≤ 1 giây | ✅ |
| TC-03.04 | Quét đóng bằng mã khác | FR-03.05, BR-05, AC-03 | Negative | P1 | E2E | PRE-2 | 1. Quét `SPXTST0000001` 2. Quét `SPXTST0000002` | Nền đỏ "LỆCH MÃ — KHÔNG DÁN PHIẾU NÀY"; "Đang đóng gói SPXTST0000001" / "Vừa quét SPXTST0000002"; "Gỡ phiếu sai, dán đúng phiếu SPXTST0000001 rồi quét lại mã."; âm lỗi lặp. API-11 `outcome` = `MISMATCH`, `session.mismatch` = `{"source":"SCAN","expected":"SPXTST0000001","actual":"SPXTST0000002"}`; kiện …01 vẫn `PACKING` | ✅ |
| TC-03.05 | Sửa lệch mã bằng quét đúng | FR-03.05, UC-08 | State | P1 | E2E | Ngay sau TC-03.04, khay không có phiếu | 1. Quét `SPXTST0000001` | Về "SẴN SÀNG"; API-11 `SESSION_COMPLETED`; phiên `COMPLETED`, `flags` chứa `HAD_MISMATCH` | ✅ |
| TC-03.06 | AC-03 lặp 20 lần | AC-03 | Negative | P1 | API | PRE-5 | 1. `tst_station01` quét `SPXTST0000001` 2. Quét lần lượt 20 mã `SPXTST0000013` … `SPXTST0000032` 3. Quét `SPXTST0000001` | Bước 2: 20/20 `outcome` = `MISMATCH`, không phiên nào `COMPLETED`. Bước 3: `SESSION_COMPLETED` cho …01 | ✅ |
| TC-03.07 | Không mở phiên mới khi đang lệch | FR-03.05, EX-P4 | Negative | P1 | API | PRE-5 | 1. Quét `SPXTST0000002` 2. Quét `SPXTST0000003` 3. Quét `SPXTST0000004` | Bước 3: `MISMATCH`, `state.session.package.tracking_number` = `SPXTST0000002`, `mismatch.actual` = `SPXTST0000004`; station chỉ có 1 phiên chưa đóng (BR-02); kiện …03, …04 vẫn `NEW` | ✅ |
| TC-03.08 | Đơn đã hủy | BR-01, EX-P1, AC-05 | Negative | P1 | E2E | PRE-2 | 1. Quét `SPXTST0000009` 2. Chờ 5 giây | Nền vàng "ĐƠN ĐÃ HỦY", "SPXTST0000009 đã bị hủy trên Shopee. Không đóng gói.", 2 bíp; sau 5 giây về "SẴN SÀNG". API-11 `ALERT`, `alert.code` = `ORDER_CANCELLED`, `state.session` = null | ✅ |
| TC-03.09 | Đơn đã đóng | BR-03, EX-P2 | Negative | P1 | E2E | PRE-2 | 1. Quét `SPXTST0000010` 2. Không bấm gì, chờ 5 giây | "ĐƠN ĐÃ ĐÓNG GÓI", "SPXTST0000010 đã đóng gói lúc HH:mm tại TST Station 02." (HH:mm = giờ reset), nút "Yêu cầu đóng gói lại"; `alert.code` = `ALREADY_PACKED`, `alert.data.can_request_repack` = true; sau 5 giây về "SẴN SÀNG" | ✅ |
| TC-03.10 | Đơn đã bàn giao | BR-03, AC-21 | Negative | P1 | E2E | PRE-2 | 1. Quét `SPXTST0000011` | "ĐƠN ĐÃ BÀN GIAO", "SPXTST0000011 đã bàn giao cho đơn vị vận chuyển. Không đóng gói lại."; không có nút "Yêu cầu đóng gói lại"; `alert.code` = `ALREADY_HANDED_OVER` | ✅ |
| TC-03.11 | Kiện hủy sau khi đóng | BR-01, N1, EX-P10 | Negative | P2 | API | PRE-5 + `psql -c "UPDATE package SET warehouse_status='CANCELLED_AFTER_PACK' WHERE tracking_number='SPXTST0000010'"` (cách đặt dữ liệu cần xác nhận khi có J-04) | 1. `tst_station01` quét `SPXTST0000010` | `ALERT`, `alert.code` = `ORDER_CANCELLED` (không phải `ALREADY_PACKED` hay `ALREADY_HANDED_OVER`) | ⬜ |
| TC-03.12 | Mã chưa có, sàn có | BR-04, EX-P3 | Happy | P2 | INT | PRE-6: DB chưa có kiện `SPXTST0000012`, MockAdapter có đơn | 1. API-11 quét `spxtst0000012` | `SESSION_OPENED`; `flags` không có `UNVERIFIED`; `package.items` có 3 sản phẩm; kiện được tạo `verified` = true | ✅ |
| TC-03.13 | Mã chưa có, sàn chậm 3 giây | BR-04, NFR-01 | Boundary | P1 | INT | PRE-6 với `MockAdapter(delay_s=3)` | 1. API-11 quét `SPXTST9990002` 2. Đo thời gian phản hồi | Phản hồi ≤ 3 giây (tra sàn cắt ở 2 giây); `SESSION_OPENED`, `flags` = `["UNVERIFIED"]`, `items` = []. Trên stack thật (mã `SPXQA00000001` không có trên mock): S2 có chip "Chưa xác minh với Shopee" và dòng "Chưa có danh sách sản phẩm cho đơn này." | ⬜ |
| TC-03.14 | Mã sai định dạng | API-11 INVALID_CODE | Negative | P2 | E2E | PRE-2 | 1. Quét `abc!!12345` | "MÃ KHÔNG HỢP LỆ", "Mã vừa quét không phải mã vận đơn. Quét lại mã trên phiếu.", 2 bíp, tự về "SẴN SÀNG" sau 5 giây; `alert.code` = `INVALID_CODE`, không có phiên | ✅ |
| TC-03.15 | Cùng kiện ở 2 station | BR-02 mở rộng | Negative | P2 | API | PRE-5 | 1. `tst_station01` quét `SPXTST0000005` 2. `tst_station02` quét `SPXTST0000005` | Bước 2: `ALERT`, `alert.code` = `PACKED_ELSEWHERE_IN_PROGRESS`, message "SPXTST0000005 đang được đóng gói ở station khác."; station 02 hiện "ĐANG ĐÓNG GÓI Ở STATION KHÁC" | ✅ |
| TC-03.16 | Hai request scan song song | BR-02, 02a §6 | Negative | P1 | INT | PRE-6 (`test_scan_concurrency.py`, dữ liệu commit thật) | Xem chi tiết bên dưới | Đúng 1 phiên mở trên station; 2 `outcome` là {`SESSION_OPENED`, `MISMATCH`} | ✅ |
| TC-03.17 | Retry cùng `client_scan_id` | DEC-29 | Regression | P1 | API | PRE-5 | 1. Quét `SPXTST0000006` với `client_scan_id` = U 2. Gửi lại đúng request (cùng U) | Lần 2 trả cùng `outcome` = `SESSION_OPENED`, `state.state` = `PACKING` (state mới nhất); `session_event` chỉ có 1 sự kiện SCAN cho U; không phát sinh phiên thứ hai | ✅ |
| TC-03.18 | Hủy phiên có lý do | FR-03.08, UC-01 | Happy | P2 | E2E | PRE-2 | 1. Quét `SPXTST0000007` 2. Bấm "Hủy phiên" 3. Chọn "Hết hàng" 4. Bấm "Hủy phiên" trong Dialog | Về "SẴN SÀNG"; API-12 200, `state.state` = `READY`; phiên `CANCELLED` lý do `OUT_OF_STOCK`; kiện về `NEW` (quét lại …07 → `SESSION_OPENED`); clip vẫn được cắt (M2) | ✅ |
| TC-03.19 | Hủy "Khác" thiếu ghi chú | API-12 | Negative | P3 | E2E | PRE-2, phiên `SPXTST0000007` mở | 1. Bấm "Hủy phiên" 2. Chọn "Khác", để trống "Ghi chú" 3. Bấm "Hủy phiên" | Dialog không đóng, lỗi dưới ô ghi chú "Nhập lý do khi chọn Khác"; gọi API-12 trực tiếp `{"reason":"OTHER","note":" "}` → 422 `VALIDATION_ERROR` | ✅ |
| TC-03.20 | Cam 2 khớp mã | FR-03.06 | Happy | P1 | HW | PRE-7 | 1. Đặt phiếu `SPXTST0000014` trong ROI khay 2. Quét `SPXTST0000014` | ≤ 2 giây: chip "Cam 2 khớp mã trên khay"; API-10 `tray.match` = `MATCH`, `tray.codes` = ["SPXTST0000014"] | ⛔ |
| TC-03.21 | Cam 2 thấy phiếu sai | FR-03.07, BR-06, AC-04 | Negative | P1 | HW | PRE-7, phiên `SPXTST0000014` mở | Xem chi tiết bên dưới (40 lần) | ≤ 2 giây "LỆCH MÃ", nguồn "Cam 2 thấy trên khay"; ≥ 38/40 lần đạt | ⛔ |
| TC-03.22 | Quét đúng khi khay còn phiếu sai | BR-06, AC-04, review #2 | Negative | P1 | HW | Sau TC-03.21, phiếu `SPXTST0000015` còn trên khay | 1. Quét `SPXTST0000014` 2. Quét `SPXTST0000014` lần nữa 3. Lặp bước 1–2 thêm 4 lần | Mỗi lần: `MISMATCH`, `mismatch.source` = `CAM2`; 10/10 lần phiên không đóng | ⛔ |
| TC-03.23 | Bỏ phiếu sai khỏi khay | BR-06 | State | P1 | HW | Sau TC-03.22 | 1. Lấy phiếu `SPXTST0000015` ra khỏi khay 2. Chờ 2 giây 3. Quét `SPXTST0000014` | Bước 2: phiên về `OPEN`, màn "ĐANG ĐÓNG GÓI". Bước 3: `SESSION_COMPLETED` | ⛔ |
| TC-03.24 | Cam 2 không đọc được | EX-P6, BR-18 | Negative | P1 | HW | PRE-7 | 1. Che khay bằng tấm bìa 2. Quét `SPXTST0000016` 3. Chờ 2 giây 4. Quét `SPXTST0000016` | Bước 3: chip vàng "Cam 2 chưa thấy phiếu". Bước 4: không bị chặn, `SESSION_COMPLETED`, phiên `flags` chứa `CAM2_UNVERIFIED`; D4 hiện chip "Cam 2 không xác minh" (M3) | ⛔ |
| TC-03.25 | Vision dừng | BR-18 | Negative | P2 | MAN | PRE-2 | 1. `docker compose -f ai-cam-be/docker/compose.dev.yml stop vision` 2. Quét `SPXTST0000017` 3. Quét `SPXTST0000017` 4. `… start vision` | Bước 2: API-10 `tray.match` = `UNAVAILABLE`, chip "Cam 2 không đọc được". Bước 3: `SESSION_COMPLETED`, `flags` chứa `CAM2_UNVERIFIED` | ⬜ |
| TC-03.26 | Phiếu còn trên khay khi đóng | BR-18 | Boundary | P3 | INT | PRE-6; Redis `tray:{station_id}` = mã `SPXTST0000021` (HW: 2 phiếu in trùng, dán 1, để 1 trên khay) | 1. Quét `SPXTST0000021` 2. Quét `SPXTST0000021` | `SESSION_COMPLETED`, `flags` chứa `LABEL_ON_TRAY` | ✅ |
| TC-03.27 | Cảnh báo 15 phút | BR-16, FR-03.09, EX-P5 | Boundary | P2 | INT | PRE-6, `clock.freeze` | Xem chi tiết bên dưới | 14:59 không cảnh báo; 15:00 có đúng 1 cảnh báo, S2 Alert "Phiên đã mở 15 phút. Quét lại mã để hoàn tất hoặc Hủy phiên." | ✅ |
| TC-03.28 | Bỏ dở 30 phút | BR-16, AC-16, EX-P5 | Boundary | P1 | INT | PRE-6, `clock.freeze` | Xem chi tiết bên dưới | Phiên `ABANDONED`, kiện `NEW`, station "SẴN SÀNG" + Alert "Phiên SPXTST0000008 đã tự đóng do quá 30 phút." | ✅ |
| TC-03.29 | Không bỏ dở khi đang chờ duyệt | BR-16 (02a) | State | P3 | INT | PRE-6, phiên `SPXTST0000012` ở `WAITING_APPROVAL` | 1. `clock.advance(31 phút)` 2. Chạy `sessions.check_timeouts` | Phiên vẫn `WAITING_APPROVAL`, kiện vẫn `PACKING` | ✅ |
| TC-03.30 | Station chưa đăng nhập quét | EX-P9, AC-13 | Negative | P2 | E2E | PRE-1 + FE chạy, đang ở `/station/login` | 1. Máy quét giả gõ `SPXTST0000001` (5 ms/phím) + Enter | Alert "Station chưa đăng nhập. Đăng nhập rồi quét lại."; 0 request API-11; ô tài khoản không bị điền mã | ⬜ |
| TC-03.31 | Gõ tay không bị coi là quét | 02b-station §10 | Negative | P2 | E2E | PRE-2 | 1. Gõ `SPXTST0000001` 200 ms/phím + Enter | 0 request API-11; màn giữ "SẴN SÀNG" | ⬜ |
| TC-03.32 | Mất kết nối server | NFR-09, S6 | Error | P1 | E2E | PRE-2, phiên `SPXTST0000001` mở | Xem chi tiết bên dưới | > 5 giây mất kết nối → "MẤT KẾT NỐI MÁY CHỦ", không nhận quét; nối lại → về "ĐANG ĐÓNG GÓI" …01 | ⬜ |
| TC-03.33 | Phiên gần đây + xem clip | §5.1 ma trận, API-15 | Happy | P2 | API | PRE-5; `tst_station01` đã đóng 2 phiên `SPXTST0000005`, `SPXTST0000006` hôm nay | 1. GET /station/sessions/recent 2. (M2) Ở S1 bấm "Xem" dòng …06 | Bước 1: 1–5 item, mới nhất trước (…06 trước …05); phiên ngày trước không có (kiểm ở `INT` bằng `clock.freeze`). Bước 2: Dialog phát Cam 1 / Cam 2 | ✅ |
| TC-03.34 | Mã < 4 ký tự bị bỏ qua (tách từ TC-03.14) | 02b-station §5 | Negative | P3 | E2E | PRE-2 | 1. Máy quét giả gõ `ABC` (5 ms/phím) + Enter | 0 request API-11; màn giữ "SẴN SÀNG", không âm báo | ✅ |
| TC-03.35 | Phiếu ngoài ROI không được đọc (tách từ TC-03.20) | FR-01.04, FR-03.06 | Negative | P2 | HW | PRE-7, ROI Cam 2 x=0.2, y=0.2, w=0.6, h=0.6 | 1. Đặt phiếu `SPXTST0000014` ở góc khay ngoài ROI 2. Quét `SPXTST0000014` 3. Chờ 2 giây | Chip "Cam 2 chưa thấy phiếu"; API-10 `tray.match` = `NOT_SEEN` | ⛔ |

<details><summary>TC-03.03 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Máy quét giả quét mở | `SPXTST9990001` (mã không có trên sàn mock → mở `UNVERIFIED`; seed chỉ có 20 đơn `NEW`) | "ĐANG ĐÓNG GÓI" |
| 2 | Quét đóng cùng mã | `SPXTST9990001` | "SẴN SÀNG" |
| 3 | Lặp bước 1–2, không dùng chuột | `SPXTST9990002` … `SPXTST9990050` | 50 phiên `COMPLETED`, 100 lần quét |
| 4 | Tính p95 thời gian phản hồi API-11 | Thời gian client (metric `aicam_scan_duration_seconds` chưa có — cần xác nhận) | p95 ≤ 1 giây |

`test_tc_03_03_fifty_scans_p95` hiện chạy 25 mã / 50 lần quét (cần xác nhận nâng lên 50 đơn theo AC-01).
</details>

<details><summary>TC-03.16 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Tạo station + tài khoản station, kiện `SPXTST0000001`, `SPXTST0000002` `NEW` | factories | — |
| 2 | Gửi đồng thời 2 API-11 cùng station (`asyncio.gather`) | mã …01 và …02, 2 `client_scan_id` khác nhau | Cả 2 trả 200 |
| 3 | Đọc `outcome` 2 response | — | Một `SESSION_OPENED`, một `MISMATCH` |
| 4 | Đếm phiên chưa đóng của station | `SELECT count(*) FROM session WHERE station_id=… AND status IN ('OPEN','MISMATCH')` | = 1 |
</details>

<details><summary>TC-03.21 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Quét mở phiên, đặt phiếu đúng trên khay | `SPXTST0000014` | Chip "Cam 2 khớp mã trên khay" |
| 2 | Đặt thêm phiếu khác vào ROI, bấm đồng hồ | `SPXTST0000015` | ≤ 2 giây: "LỆCH MÃ — KHÔNG DÁN PHIẾU NÀY", dòng nguồn "Cam 2 thấy trên khay"; `mismatch.source` = `CAM2` |
| 3 | Bỏ phiếu …15, quét đóng …14 | — | `SESSION_COMPLETED` |
| 4 | Lặp bước 1–3 40 lần, đổi vị trí / góc phiếu | 40 cặp phiếu, có phiếu nhăn | ≥ 38/40 lần đạt bước 2 (≥ 95%, AC-04) |
</details>

<details><summary>TC-03.27 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | `clock.freeze(T0)`, API-11 quét mở | `SPXTST0000008` | `warn_at` = T0 + 15 phút |
| 2 | `clock.advance(14 phút 59 giây)`, chạy `sessions.check_timeouts` | — | Không có sự kiện cảnh báo trên Redis / WS-01 |
| 3 | `clock.advance(1 giây)`, chạy `sessions.check_timeouts` | — | WS-01 `station.state` kèm cảnh báo 15 phút (1 lần) |
| 4 | Chạy `sessions.check_timeouts` lần nữa | — | Không phát cảnh báo lần 2 |
| 5 | (E2E) Station nhận sự kiện | — | Alert "Phiên đã mở 15 phút. Quét lại mã để hoàn tất hoặc Hủy phiên." |

Trên stack thật: đặt `session_warn_minutes=1`, `session_abandon_minutes=2` (§1 Tua giờ), mở phiên, cảnh báo xuất hiện sau 60–90 giây với chữ "Phiên đã mở 1 phút. …".
</details>

<details><summary>TC-03.28 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | `clock.freeze(T0)`, API-11 quét mở | `SPXTST0000008` | `abandon_at` = T0 + 30 phút |
| 2 | `clock.advance(30 phút)`, chạy `sessions.check_timeouts` | — | Phiên `ABANDONED`, `ended_at` = T0 + 30 phút |
| 3 | Đọc kiện | `SPXTST0000008` | `warehouse_status` = `NEW` |
| 4 | Đọc API-10 | — | `state` = `READY`; WS-01 đã gửi `station.state` |
| 5 | (E2E) Xem station | — | "SẴN SÀNG" + Alert "Phiên SPXTST0000008 đã tự đóng do quá 30 phút." |
| 6 | (M2) Đọc clip của phiên | — | Clip T0 → T0 + 30 phút được tạo |
</details>

<details><summary>TC-03.32 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Quét mở phiên | `SPXTST0000001` | "ĐANG ĐÓNG GÓI" |
| 2 | Cắt mạng tới API: `docker compose -f ai-cam-be/docker/compose.dev.yml stop api` (Playwright: `context.setOffline(true)`) | — | — |
| 3 | Chờ 6 giây | — | Nền đỏ "MẤT KẾT NỐI MÁY CHỦ", "Không quét được lúc này. Kiểm tra dây mạng của máy trạm. Hệ thống tự kết nối lại.", "Mất kết nối N giây" tăng dần; âm lỗi lặp |
| 4 | Quét | `SPXTST0000001` | Không có request API-11; màn không đổi |
| 5 | `… start api`, chờ ≤ 10 giây | — | Về "ĐANG ĐÓNG GÓI" `SPXTST0000001` (đọc lại API-10) |
| 6 | Quét đóng | `SPXTST0000001` | `SESSION_COMPLETED` |
</details>

### M03b — Yêu cầu duyệt (station ↔ dashboard)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-03.40 | Gửi duyệt lệch mã → Cho tiếp tục | FR-03.12, UC-08, AC-19 | Happy | P1 | E2E | PRE-4 | Xem chi tiết bên dưới | D13 có yêu cầu ≤ 2 giây + âm báo; station về "ĐANG ĐÓNG GÓI" ≤ 2 giây sau duyệt; audit `APPROVAL_DECISION` user "Nguyễn B" | ⬜ |
| TC-03.41 | Gọi quản lý từ S2 (ASSIST) | FR-03.12, DEC-25 | Happy | P1 | E2E | PRE-4 | 1. Station quét `SPXTST0000001` 2. Bấm "Gọi quản lý" | Station "ĐANG CHỜ QUẢN LÝ DUYỆT", lý do "Gọi quản lý", "Quản lý duyệt trên dashboard, mục Yêu cầu duyệt."; D13 ≤ 2 giây có dòng loại "Gọi quản lý" với 3 nút "Cho tiếp tục", "Đóng phiên có ghi chú", "Hủy phiên" | ⬜ |
| TC-03.42 | Đóng phiên có ghi chú | API-21 | Happy | P2 | E2E | PRE-4; phiên …01 `MISMATCH` (quét …02), đã "Gọi quản lý"; khay không có phiếu sai | 1. D13 bấm "Đóng phiên có ghi chú" 2. Nhập ghi chú `QA đóng tay` 3. Xác nhận | API-21 200, `decision` = `CLOSE_WITH_NOTE`; phiên `COMPLETED`, `flags` chứa `CLOSED_BY_SUPERVISOR`; kiện …01 `PACKED`; station về "SẴN SÀNG" | ⬜ |
| TC-03.43 | Đóng có ghi chú khi khay còn sai | API-21 TRAY_STILL_DIFFERENT | Negative | P1 | API | PRE-5 + PRE-7; yêu cầu MISMATCH `source` = `CAM2`, `tray.match` = `DIFFERENT` (phiếu …15 trên khay phiên …14) | 1. `tst_sup` gọi API-21 `{"action":"CLOSE_WITH_NOTE","note":"QA"}` 2. Xem D13 | Bước 1: 409 `TRAY_STILL_DIFFERENT`, phiên vẫn `WAITING_APPROVAL`. Bước 2: nút "Đóng phiên có ghi chú" bị khóa, Alert "Cam 2 vẫn thấy phiếu sai trên khay. Yêu cầu bỏ phiếu sai trước." | ⬜ |
| TC-03.44 | Cho tiếp tục khi khay còn sai | N7 | State | P2 | E2E | Như TC-03.43 | 1. D13 xem dòng yêu cầu 2. Bấm "Cho tiếp tục" | Bước 1: D13 cảnh báo "Cam 2 vẫn thấy phiếu sai" (nút không khóa). Bước 2: phiên về `OPEN` rồi `MISMATCH` ngay; station "LỆCH MÃ", nguồn "Cam 2 thấy trên khay" | ⬜ |
| TC-03.45 | Hủy phiên từ dashboard | API-21 | Happy | P2 | API | PRE-5 + PRE-2; phiên …01 mở, station đã gửi ASSIST | 1. `tst_sup` gọi API-21 `{"action":"CANCEL_SESSION"}` | 200; phiên `CANCELLED` lý do `SUPERVISOR`; kiện …01 `NEW`; station "SẴN SÀNG" + Alert "Quản lý đã hủy phiên." | ⬜ |
| TC-03.46 | Rút yêu cầu | API-14 | State | P2 | E2E | PRE-4; station ở "ĐANG CHỜ QUẢN LÝ DUYỆT" từ "LỆCH MÃ" (…01 / …02) | 1. Station bấm "Rút yêu cầu" | Station về "LỆCH MÃ" …01 / …02; API-14 200; yêu cầu `WITHDRAWN`; D13 dòng biến mất ≤ 2 giây | ⬜ |
| TC-03.47 | Hai người duyệt cùng lúc | API-21 ALREADY_RESOLVED | Negative | P2 | API | PRE-5; 1 yêu cầu ASSIST `PENDING` | Xem chi tiết bên dưới | 1 request 200; request kia 409 `ALREADY_RESOLVED` kèm `decided_by` | ⬜ |
| TC-03.48 | Duyệt khi station đã rút | API-21 | Negative | P3 | API | PRE-5; yêu cầu ASSIST đã rút (API-14) | 1. `tst_sup` gọi API-21 `{"action":"CONTINUE"}` | 409 `ALREADY_RESOLVED`, `details.status` = `WITHDRAWN`, `details.decided_by` = null; D13 "Station đã rút yêu cầu." | ⬜ |
| TC-03.49 | Gửi 2 yêu cầu | API-13 APPROVAL_ALREADY_PENDING | Negative | P3 | API | PRE-5; station có yêu cầu ASSIST `PENDING` cho phiên …01 | 1. `tst_station01` gọi API-13 `{"type":"ASSIST","session_id":<id>}` lần nữa | 409 `APPROVAL_ALREADY_PENDING`; vẫn chỉ 1 yêu cầu `PENDING` | ⬜ |
| TC-03.50 | Quét khi đang chờ duyệt | API-11 IGNORED | Negative | P2 | E2E | PRE-2; station ở "ĐANG CHỜ QUẢN LÝ DUYỆT" | 1. Quét `SPXTST0000003` | API-11 `outcome` = `IGNORED`; toast "Đang chờ duyệt."; `state.state` vẫn `WAITING_APPROVAL` | ⬜ |
| TC-03.51 | Đóng gói lại: duyệt → hoàn tất | BR-03, FR-03.10, AC-14, EX-P2 | Happy | P1 | E2E | PRE-4 | Xem chi tiết bên dưới | Phiên cũ `SUPERSEDED` chỉ sau khi phiên mới `COMPLETED` (cờ `REPACK`); cả hai clip còn | ⬜ |
| TC-03.52 | Đóng gói lại: duyệt → hủy | BR-03, AC-21 | State | P1 | INT | PRE-6; kiện `SPXTST0000010` `PACKED`, phiên cũ `COMPLETED`, đã duyệt REPACK, phiên mới mở | 1. API-12 hủy phiên mới `{"reason":"WRONG_SCAN"}` | Kiện về `PACKED`; phiên cũ vẫn `COMPLETED`; phiên mới `CANCELLED` | ✅ |
| TC-03.53 | Đóng gói lại: bỏ dở | BR-03, BR-16 | State | P2 | INT | Như TC-03.52, `clock.freeze` | 1. `clock.advance(30 phút)` 2. Chạy `sessions.check_timeouts` | Phiên mới `ABANDONED`; kiện `PACKED`; phiên cũ vẫn `COMPLETED` | ⬜ |
| TC-03.54 | Từ chối đóng gói lại | API-21 REJECT | Negative | P2 | E2E | PRE-4; station đã gửi REPACK cho `SPXTST0000010` | 1. D13 bấm "Từ chối" | API-21 200, `decision` = `REJECT`; station về "SẴN SÀNG"; kiện …10 vẫn `PACKED` | ⬜ |
| TC-03.55 | REPACK kiện đã bàn giao qua API | API-13 NOT_ELIGIBLE | Negative | P2 | API | PRE-5 | 1. `tst_station01` gọi API-13 `{"type":"REPACK","tracking_number":"SPXTST0000011"}` | 409 `NOT_ELIGIBLE`; không tạo yêu cầu | ⬜ |
| TC-03.56 | CSKH không nhận sự kiện duyệt | 02 WS-02 | Permission | P3 | INT | PRE-6; WS-02 `/ws/dashboard?token=<token tst_cskh>` | 1. Phát `approval.created` 2. Phát `report.updated` | Không nhận `approval.created` trong 5 giây; nhận `report.updated` | ✅ |

<details><summary>TC-03.40 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Station quét mở | `SPXTST0000001` | "ĐANG ĐÓNG GÓI" |
| 2 | Station quét mã khác | `SPXTST0000002` | "LỆCH MÃ — KHÔNG DÁN PHIẾU NÀY" |
| 3 | Station bấm "Gọi quản lý", bấm đồng hồ | — | Station "ĐANG CHỜ QUẢN LÝ DUYỆT", lý do "Lệch mã"; API-13 201 `type` = `MISMATCH` |
| 4 | Xem D13 (`tst_sup`) | — | ≤ 2 giây: dòng TST Station 01, loại "Lệch mã", mã `SPXTST0000001`, vừa quét `SPXTST0000002`; âm báo; badge drawer = 1 |
| 5 | D13 bấm "Cho tiếp tục", bấm đồng hồ | — | API-21 200 `decision` = `CONTINUE`; station về "ĐANG ĐÓNG GÓI" …01 ≤ 2 giây |
| 6 | `tst_admin` gọi API-92 `?action=APPROVAL_DECISION` | — | 1 dòng, `user.display_name` = "Nguyễn B" |
| 7 | Lặp bước 1–6 5 lần (AC-19) | mã …01..…05 / …02..…06 | 5/5 đạt mốc ≤ 2 giây |
</details>

<details><summary>TC-03.47 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Station tạo yêu cầu ASSIST | phiên `SPXTST0000001` | `PENDING` |
| 2 | Gửi đồng thời 2 API-21 | token `tst_sup` `{"action":"CONTINUE"}` và token `tst_admin` `{"action":"CANCEL_SESSION"}` | Một 200, một 409 `ALREADY_RESOLVED` |
| 3 | Đọc `details` response 409 | — | `status` = `RESOLVED`, `decided_by.display_name` = người thắng ("Nguyễn B" hoặc "Quản trị"), `decided_at` có giá trị |
| 4 | Xem D13 của người thua | — | "Yêu cầu này đã được {Nguyễn B / Quản trị} xử lý lúc HH:mm." |
| 5 | Đọc phiên | — | Trạng thái đúng theo quyết định của người thắng |
</details>

<details><summary>TC-03.51 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Station quét | `SPXTST0000010` | "ĐƠN ĐÃ ĐÓNG GÓI" + nút "Yêu cầu đóng gói lại" |
| 2 | Bấm "Yêu cầu đóng gói lại" | — | API-13 201 `type` = `REPACK`; station "ĐANG CHỜ QUẢN LÝ DUYỆT", lý do "Đóng gói lại" |
| 3 | D13 `tst_sup` bấm "Duyệt đóng gói lại" | — | Station "ĐANG ĐÓNG GÓI" …10 + chip "Đóng gói lại"; kiện `PACKING` |
| 4 | Đọc phiên cũ (giờ reset, TST Station 02) | — | Vẫn `COMPLETED` |
| 5 | Station quét đóng | `SPXTST0000010` | `SESSION_COMPLETED`; phiên mới `COMPLETED`, `flags` chứa `REPACK`; kiện `PACKED` |
| 6 | Đọc phiên cũ | — | `SUPERSEDED` |
| 7 | (M3) D4 kiện …10 | — | 2 phiên, mới nhất trước, phiên cũ chip "Bị thay thế"; clip của cả hai phiên còn |
| 8 | Lặp 5 lần (AC-14) | Reset giữa các lần | 5/5 đạt |
</details>

### M02 — Ghi hình, clip, retention

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-02.01 | Clip phủ đủ khoảng | FR-02.02, AC-02 | Happy | P1 | API + MAN | PRE-2; camera giả có OSD giờ (cần xác nhận `fake-cam*` có OSD) | Xem chi tiết bên dưới | Clip Cam 1, Cam 2 `READY` ≤ 60 giây; phủ ≥ [T0 − 5 giây, T1 + 5 giây] | ⬜ |
| TC-02.02 | 20 clip ngẫu nhiên | AC-02 | Happy | P1 | HW | PRE-7; 20 phiên đã đóng ở bàn thử | 1. Chọn ngẫu nhiên 20 phiên 2. Mở clip Cam 1 và Cam 2 ở D4 3. So OSD khung đầu / cuối với `started_at − 5 giây` / `ended_at + 5 giây` | 20/20 clip phủ đủ khoảng (sai số ≤ 1 keyframe) | ⬜ |
| TC-02.03 | Clip khi camera rớt giữa phiên | FR-02.02, EX-P7, AC-10 | Negative | P1 | HW | PRE-7 | 1. Quét mở `SPXTST0000018` 2. Rút cáp Cam 1 30 giây rồi cắm lại 3. Quét đóng …18 4. Mở D4 | Clip `READY`, cờ `VIDEO_INCOMPLETE`; D4 chip "Thiếu video" | ⬜ |
| TC-02.04 | SHA-256 clip khớp | FR-02.04, AC-11 | Happy | P1 | API | PRE-5; phiên …01 đã đóng, clip `READY` | 1. Lấy `clips[].sha256` qua API-31 2. `docker compose -f ai-cam-be/docker/compose.dev.yml exec api sha256sum <đường dẫn file clip>` (đường dẫn cần xác nhận) | Hai giá trị bằng nhau (64 ký tự hex) | ⬜ |
| TC-02.05 | Không có API xóa / sửa clip | FR-02.05, AC-11, DEC-27 | Negative | P1 | API | PRE-5; clip `READY` id C | 1. Với token 4 vai, gọi `DELETE /clips/C`, `PUT /clips/C`, `PATCH /clips/C` | 12/12 response 404 hoặc 405, không 2xx; clip C vẫn `READY`, file còn | ⬜ |
| TC-02.06 | Giữ clip qua retention | FR-02.09, BR-09, AC-15 | Happy | P1 | INT | PRE-6, `clock.freeze` | Xem chi tiết bên dưới | Clip giữ còn `READY`; clip không giữ `DELETED`, file bị xóa | ⬜ |
| TC-02.07 | Tăng retention có hiệu lực ngay | FR-02.06, AC-20 | Regression | P1 | INT | PRE-6; clip tạo lúc T0 − 100 ngày, `retention_clip_days` = 90, J-02 chưa chạy | 1. API-80 PUT `retention_clip_days` = 180 2. Chạy J-02 | Clip vẫn `READY`, file còn; `retention_until` = tạo + 180 ngày | ⬜ |
| TC-02.08 | Retention video thô | FR-02.06 | Happy | P2 | INT | PRE-6; segment A tạo T0 − 31 ngày, segment B tạo T0 − 1 ngày, `retention_raw_days` = 30 | 1. Chạy J-02 | Segment A bị xóa (bản ghi + file); segment B còn | ⬜ |
| TC-02.09 | Ràng buộc: clip < video thô | API-80 | Boundary | P2 | E2E | PRE-3 | 1. D8 nhập "video thô" = 30, "clip" = 20 2. Bấm Lưu | Lỗi dưới ô clip "Số ngày giữ clip phải lớn hơn hoặc bằng video thô."; API-80 trực tiếp → 422 `VALIDATION_ERROR` | ⬜ |
| TC-02.10 | Cắt lại clip lỗi | API-46 | Error | P2 | API | PRE-5; clip `FAILED` (xóa segment trong khoảng phiên) | 1. Khôi phục segment 2. `tst_sup` gọi API-46 POST /sessions/{id}/clips/rebuild | 202 `{"queued": true}`; clip `READY` ≤ 60 giây; gọi lại khi không còn clip `FAILED` → 409 `CLIP_NOT_FAILED` | ⬜ |
| TC-02.11 | Clip đang cắt | API-40 CLIP_NOT_READY | State | P2 | E2E | PRE-2 + cửa sổ `tst_cskh` | 1. Station đóng phiên …19 2. Trong ≤ 5 giây mở D4 kiện …19 3. Chờ clip `READY` | Bước 2: EmptyState "Clip đang được cắt, sẵn sàng trong khoảng 1 phút."; API-40 409 `CLIP_NOT_READY`. Bước 3: player tự hiện, không cần tải lại | ⬜ |
| TC-02.12 | URL clip hết hạn | API-41 SIGNATURE_INVALID | Negative | P2 | INT | PRE-6; URL lấy từ API-40 (hạn 10 phút) | 1. `clock.advance(11 phút)` 2. GET URL | 403 `SIGNATURE_INVALID` | ⬜ |
| TC-02.13 | Audit xem clip đúng người | NFR-15, DEC-13 | Happy | P1 | E2E | PRE-1 + FE; dashboard đăng nhập `tst_cskh`; clip `READY` | 1. Mở D4 kiện có clip, chưa bấm phát 2. Bấm phát 3. Tua tới giữa clip | Bước 1: 0 dòng `VIEW_CLIP` mới. Sau bước 2–3: đúng 1 dòng `VIEW_CLIP`, user "Lan" | ⬜ |
| TC-02.14 | SHA-256 trong `info.json` bản xuất (tách từ TC-02.04) | FR-02.04, FR-07.04 | Happy | P2 | API | PRE-5; bản xuất `READY` của phiên …01 | 1. Tải `info.json` qua API-45 2. So `source_clip_sha256.CAM1`, `.CAM2` với `clips[].sha256` của API-31 | Khớp cả 2 camera | ⬜ |
| TC-02.15 | File clip chỉ đọc (tách từ TC-02.05) | FR-02.05, AC-11 | Negative | P1 | MAN | PRE-1; clip `READY` | 1. `docker compose … exec api stat -c %a <file clip>` | `444` | ⬜ |
| TC-02.16 | Ràng buộc: bỏ dở ≤ cảnh báo (tách từ TC-02.09) | API-80, BR-16 | Boundary | P2 | API | PRE-5 | 1. `tst_admin` PUT /settings `session_warn_minutes` = 30, `session_abandon_minutes` = 30 | 422 `VALIDATION_ERROR`, `details.fields` chứa `session_abandon_minutes`; setting không đổi (chữ trên UI cần xác nhận) | ⬜ |
| TC-02.17 | Ràng buộc: số ngày = 0 (tách từ TC-02.09) | API-80 | Boundary | P2 | E2E | PRE-3 | 1. D8 nhập "video thô" = 0 2. Bấm Lưu | Lỗi dưới ô (khoảng 1–365, chữ cần xác nhận); API-80 → 422 `VALIDATION_ERROR` | ⬜ |
| TC-02.18 | Ràng buộc: số ngày = 366 (tách từ TC-02.09) | API-80 | Boundary | P2 | E2E | PRE-3 | 1. D8 nhập "clip" = 366 2. Bấm Lưu | Lỗi dưới ô (chữ cần xác nhận); API-80 → 422 `VALIDATION_ERROR` | ⬜ |
| TC-02.19 | URL clip bị sửa `uid` (tách từ TC-02.12) | API-41 SIGNATURE_INVALID | Negative | P2 | API | PRE-5; URL từ API-40 của `tst_cskh` | 1. Đổi `uid` trong URL thành id `tst_sup` 2. GET URL | 403 `SIGNATURE_INVALID` | ⬜ |

<details><summary>TC-02.01 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Station quét mở, ghi giờ T0 | `SPXTST0000001` | `started_at` = T0 |
| 2 | Chờ 2 phút, quét đóng, ghi giờ T1 | `SPXTST0000001` | `ended_at` = T1 |
| 3 | Poll API-31 mỗi 5 giây | — | Clip `CAM1`, `CAM2` `READY` ≤ 60 giây sau T1 |
| 4 | Mở clip Cam 1, đọc OSD khung đầu và khung cuối | — | Khung đầu ≤ T0 − 5 giây, khung cuối ≥ T1 + 5 giây (sai số ≤ 1 keyframe) |
| 5 | Lặp bước 4 với Cam 2 | — | Như bước 4 |
</details>

<details><summary>TC-02.06 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | `clock.freeze(T0)`, tạo 2 phiên có clip `READY` | clip A, clip B | `retention_until` = T0 + 90 ngày |
| 2 | API-42 giữ clip A | `{"held": true}` | A `held` = true, `retention_until` = null |
| 3 | `clock.advance(91 ngày)`, chạy J-02 | — | — |
| 4 | Đọc clip A | — | `READY`, file còn |
| 5 | Đọc clip B | — | `DELETED`, file không còn trên đĩa |
| 6 | API-40 clip B | — | 410 `CLIP_DELETED` |
| 7 | (E2E) D4 kiện của clip B | — | "Clip đã bị xóa ngày dd/MM/yyyy theo chính sách lưu trữ 90 ngày." |
</details>

### M07 — Tra cứu, chi tiết, xuất

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-07.01 | Quét mã vào ô tìm → mở chi tiết | FR-07.01, 07.03, UC-03 | Happy | P1 | E2E | PRE-1 + FE; dashboard `tst_cskh` | 1. Mở D3 `/admin/packages` 2. Máy quét giả gõ `SPXTST0000010` (5 ms/phím) + Enter | Ô tìm tự focus; mở thẳng D4 `/admin/packages/<id …10>` | ⬜ |
| TC-07.02 | Tìm theo mã đơn sàn | FR-07.01 | Happy | P2 | API | PRE-5 | 1. `tst_cskh` GET /packages?q=2410TST00010 | 200, `total` = 1, `items[0].tracking_number` = `SPXTST0000010` | ⬜ |
| TC-07.03 | Lọc theo ngày | FR-07.01 | Happy | P2 | E2E | PRE-3; đã đóng phiên `SPXTST0000001`, `…02` ở TST Station 01 hôm nay | 1. D3 chọn ngày từ = đến = hôm nay 2. Chọn từ = đến = hôm qua | Bước 1: có …01, …02, …10 (cần xác nhận API-30 lọc theo ngày phiên hay ngày cập nhật). Bước 2: "Không tìm thấy …" / 0 dòng | ⬜ |
| TC-07.04 | Khoảng ngày > 92 | API-30 | Boundary | P3 | API | PRE-5 | 1. GET /packages?date_from=2026-07-01&date_to=2026-10-02 (93 ngày) | 422 `VALIDATION_ERROR` | ⬜ |
| TC-07.05 | Không tìm thấy | D3 empty | Negative | P2 | E2E | PRE-3 | 1. D3 nhập `SPXTST000XXXX` + Enter | EmptyState "Không tìm thấy mã SPXTST000XXXX." + nút "Xóa bộ lọc" | ⬜ |
| TC-07.06 | Chi tiết đủ thông tin | FR-07.02 | Happy | P1 | E2E | PRE-3; kiện …10 có 2 phiên sau TC-03.51 | 1. Mở D4 kiện …10 | Sản phẩm "Áo thun basic · Đen / L × 2"; 2 phiên, mới nhất trước, phiên cũ chip "Bị thay thế"; dòng thời gian có Kho + Sàn; SHA-256 rút gọn + nút Copy | ⬜ |
| TC-07.07 | Xuất clip ≤ 30 giây | FR-07.04, AC-08 | NFR | P1 | E2E | PRE-1 + FE; `tst_cskh`; phiên …01 clip 2 phút `READY` | Xem chi tiết bên dưới | Tổng thời gian ≤ 30 giây; MP4 phát được trên iOS + Android; overlay đúng | ⬜ |
| TC-07.08 | Xuất 10 đơn | AC-08 | NFR | P1 | MAN | Như TC-07.07, 10 phiên `READY` (…01..…08, …13, …14) | 1. Lặp TC-07.07 với 10 đơn | 10/10 ≤ 30 giây | ⬜ |
| TC-07.09 | Xuất khi clip đã xóa | API-43 CLIP_DELETED | Negative | P3 | INT | PRE-6; clip của phiên đã `DELETED` (như TC-02.06 clip B) | 1. API-43 POST /sessions/{id}/exports `{"layout":"CAM1"}` | 410 `CLIP_DELETED`; không tạo bản xuất | ⬜ |
| TC-07.10 | Encode lỗi | J-03 FAILED | Error | P3 | INT | PRE-6; giả lập ffmpeg lỗi (cách cần xác nhận) | 1. API-43 `{"layout":"SIDE_BY_SIDE"}` 2. Poll API-44 | `status` = `FAILED`; D4 Dialog "Không tạo được file xuất. Bấm Thử lại; nếu vẫn lỗi, báo Admin kèm mã đơn." | ⬜ |
| TC-07.11 | Tab Ghép đồng bộ | DEC-21 | Happy | P3 | E2E | PRE-3; phiên …01 có 2 clip `READY` | 1. D4 chọn tab "Ghép" 2. Tua tới 00:30 3. Đọc OSD hai video | Hai OSD lệch ≤ 0,5 giây | ⬜ |
| TC-07.12 | D3 trên điện thoại | 02b-admin §9 | Regression | P3 | MAN | Safari iOS, màn rộng 360px; `tst_cskh` | 1. Mở D3 2. Tìm `SPXTST0000010` | Không cuộn ngang; kết quả hiện dạng card | ⬜ |
| TC-07.13 | Lọc theo station (tách từ TC-07.03) | FR-07.01 | Happy | P2 | E2E | Như TC-07.03 | 1. D3 chọn Station = TST Station 01 | Chỉ …01, …02; không có …10 (đóng ở TST Station 02) | ⬜ |
| TC-07.14 | Lọc theo trạng thái kho (tách từ TC-07.03) | FR-07.01 | Happy | P2 | E2E | Như TC-07.03 | 1. D3 chọn Trạng thái kho = Đã đóng gói | Có …01, …02, …10; không có …11 (`HANDED_OVER`) | ⬜ |
| TC-07.15 | Lọc theo nguồn (tách từ TC-07.03) | FR-07.01 | Happy | P2 | E2E | Như TC-07.03 (seed toàn nguồn `API`) | 1. D3 chọn Nguồn = File 2. Chọn Nguồn = Shopee | Bước 1: 0 dòng, "Xóa bộ lọc". Bước 2: cùng kết quả như không lọc nguồn | ⬜ |
| TC-07.16 | URL giữ bộ lọc khi tải lại (tách từ TC-07.03) | FR-07.01 | Regression | P2 | E2E | Sau TC-07.14 | 1. Tải lại trang (F5) | URL còn tham số trạng thái `PACKED`; bộ lọc và kết quả như trước khi tải lại | ⬜ |
| TC-07.17 | D4 trên điện thoại (tách từ TC-07.12) | 02b-admin §9 | Regression | P3 | MAN | Safari iOS, 360px; `tst_cskh` | 1. Mở D4 kiện …10 | Không cuộn ngang; player rộng bằng màn hình (cần xác nhận bố cục) | ⬜ |

<details><summary>TC-07.07 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Bấm đồng hồ; D3 máy quét giả nhập mã | `SPXTST0000001` | Mở D4 |
| 2 | Bấm "Xuất clip", chọn "Ghép" | layout `SIDE_BY_SIDE` | Dialog + LinearProgress; API-43 202 |
| 3 | Chờ, bấm "Tải file MP4" | — | API-44 `READY`; tải `video.mp4` |
| 4 | Dừng đồng hồ | — | Tổng ≤ 30 giây |
| 5 | Mở MP4 trên iPhone (Safari) và Android (Chrome) | — | Phát được cả hai |
| 6 | Đọc overlay | — | Mã vận đơn `SPXTST0000001`, mã đơn `2410TST00001`, giờ phiên, "TST Station 01" |
| 7 | Bấm "Tải thông tin (JSON)" | — | `info.json` có `sha256`, `source_clip_sha256` |
</details>

### M05 — Nguồn đơn (Shopee, CSV)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-05.01 | Kết nối Shopee | FR-05.01, UC-10 | Happy | P1 | MAN | PRE-3; partner key (Q11), `PLATFORM_ADAPTER=shopee`, shop test Shopee | 1. D7 `/admin/settings/shopee` bấm "Kết nối Shopee" 2. Đăng nhập shop test, bấm đồng ý ủy quyền 3. Chờ 5 phút | Bước 2: về `/admin/settings/shopee?result=connected`, Alert thành công, trạng thái "Đã kết nối" + tên shop. Bước 3: API-70 `today_synced_orders` > 0, `last_synced_at` ≤ 5 phút | ⬜ |
| TC-05.02 | Từ chối ủy quyền | UC-10 EX | Negative | P2 | MAN | Như TC-05.01 | 1. D7 bấm "Kết nối Shopee" 2. Trên Shopee bấm từ chối | Về `?result=denied`; Alert "Shopee từ chối ủy quyền. Bấm Kết nối lại để thử lần nữa." | ⬜ |
| TC-05.03 | Chưa cấu hình partner | API-71 PLATFORM_NOT_CONFIGURED | Negative | P2 | E2E | PRE-3; `SHOPEE_ENABLED=false` | 1. Mở D7 2. Bấm "Kết nối Shopee" | API-71 503 `PLATFORM_NOT_CONFIGURED`; Alert "Chưa cấu hình Shopee Open Platform. Dùng Nhập đơn từ file." | ⬜ |
| TC-05.04 | Đồng bộ đơn mới | FR-05.02, 05.03, EX-P8 | Happy | P1 | INT | PRE-6; MockAdapter `put` 5 đơn `2410TST00031..35`, đơn 35 có 2 mã vận đơn `SPXTST0000035`, `SPXTST0000036` | 1. Chạy J-04 | 5 đơn, 6 kiện, sản phẩm đủ; `order.source` = `API`; quét …35 và …36 mở 2 phiên riêng | ⬜ |
| TC-05.05 | Đơn hủy sau khi đóng | EX-P10 | State | P1 | INT | PRE-6; kiện `SPXTST0000010` `PACKED` | 1. `MockAdapter.set_status("2410TST00010", "CANCELLED", now)` 2. Chạy J-04 | Kiện `CANCELLED_AFTER_PACK`; API-32 `counts.cancelled_after_pack` = 1, `attention` có `CANCELLED_AFTER_PACK` count 1; D2 "⚠ 1 đơn bị hủy sau khi đóng" | ⬜ |
| TC-05.06 | Vận chuyển: đã lấy hàng | FR-05.04 | State | P2 | INT | PRE-6; kiện …10 `PACKED` | 1. `MockAdapter.shipping["SPXTST0000010"] = "PICKED_UP"` 2. Chạy J-06 | Kiện `HANDED_OVER`; `status_history` thêm dòng nguồn `PLATFORM`; D4 dòng thời gian có mốc mới | ⬜ |
| TC-05.07 | Xác minh kiện chưa xác minh | J-05, BR-04 | State | P2 | INT | PRE-6; kiện `SPXTST9990001` `verified` = false (mở + đóng khi sàn không có) | 1. MockAdapter `put` đơn có mã `SPXTST9990001` 2. Chạy J-05 | Kiện `verified` = true, gắn đơn mới; D4 bỏ chip "Chưa xác minh với Shopee" | ⬜ |
| TC-05.08 | Lỗi tạm Shopee | 02a §7 J-04 | Error | P2 | INT | PRE-6; adapter trả 503 hai lần rồi OK | 1. Chạy J-04 | Thành công sau retry; không đơn nào trùng (`SELECT platform_order_sn FROM "order" GROUP BY 1 HAVING count(*)>1` = 0 dòng) | ⬜ |
| TC-05.09 | Lỗi cuối Shopee | J-04 | Error | P2 | INT | PRE-6; adapter trả 503 liên tục | 1. Chạy J-04 tới hết số lần retry | `shop.last_error` có giá trị; API-32 `attention` có `SYNC_ERROR`; D2 "Cần xử lý" có dòng lỗi đồng bộ (chữ cần xác nhận) | ⬜ |
| TC-05.10 | Token hết hạn, refresh hỏng | J-12 | Error | P2 | INT | PRE-6; refresh token trả 401 | 1. Chạy J-12 | `shop.auth_status` = `EXPIRED`; D7 chip "Hết hạn" + nút "Kết nối lại" | ⬜ |
| TC-05.11 | Nhập CSV 500 dòng | FR-05.09, AC-12 | Happy | P1 | E2E | PRE-1 + FE; `tst_sup`; `ok_500.csv` | Xem chi tiết bên dưới | Xem trước + nhập ≤ 30 giây; "Đã nhập 500 đơn."; Lịch sử có dòng mới | ⬜ |
| TC-05.12 | CSV 1 dòng lỗi | FR-05.09, EX-P11, AC-12 | Negative | P1 | E2E | Như TC-05.11; `one_error.csv` (dòng 12 bỏ trống `tracking_number`) | 1. D5 chọn file 2. Xem kết quả kiểm tra | Alert "File có 1 dòng lỗi. Sửa file rồi tải lại; chưa có đơn nào được nhập."; bảng lỗi: dòng 12, cột `tracking_number`, "Bỏ trống"; nút Nhập bị khóa; API-51 → 409 `IMPORT_HAS_ERRORS`; 0 đơn được tạo | ⬜ |
| TC-05.13 | CSV thiếu cột | API-50 FILE_INVALID | Negative | P2 | E2E | Như TC-05.11; `missing_column.csv` (không có cột `tracking_number`) | 1. D5 chọn file | API-50 422 `FILE_INVALID`, `details.missing_columns` = ["tracking_number"]; D5 "File thiếu cột bắt buộc: Mã vận đơn. Dùng file mẫu." | ⬜ |
| TC-05.14 | CSV > 5 MB | API-50 | Boundary | P3 | API | PRE-5; file CSV 5,1 MB | 1. `tst_sup` POST /imports multipart `file` | 422 `FILE_INVALID` | ⬜ |
| TC-05.15 | CSV trùng đơn từ API | BR-17 | Negative | P1 | API | PRE-5; `overlap_api.csv` có 5 dòng `SPXTST0000001..05` (đã có từ API) | 1. POST /imports 2. POST /imports/{id}/commit | Bước 1: `counts.skipped` = 5; 5 dòng "Bỏ qua (đã có từ Shopee)". Bước 2: đơn …01..05 giữ `source` = `API`, sản phẩm không đổi | ⬜ |
| TC-05.16 | API ghi đè đơn CSV | BR-17, FR-05.10 | State | P1 | INT | PRE-6; đơn `2410TST00040` nguồn CSV (nhập qua API-50/51) | 1. MockAdapter `put` cùng đơn `2410TST00040` 2. Chạy J-04 | `order.source` = `API`; audit `ORDER_OVERWRITTEN_BY_API` chứa bản CSV cũ | ⬜ |
| TC-05.17 | Xem trước hết hạn | API-51 IMPORT_EXPIRED | Boundary | P3 | INT | PRE-6, `clock.freeze`; bản xem trước `PREVIEW` | 1. `clock.advance(31 phút)` 2. API-51 commit | 409 `IMPORT_EXPIRED`; D5 "Bản xem trước đã hết hạn. Tải file lại." | ⬜ |
| TC-05.18 | Tải file gốc | API-54 | Happy | P3 | API | PRE-5; lần nhập đã `COMMITTED` | 1. `tst_sup` GET /imports/{id}/file 2. So SHA-256 với file đã tải lên | 200; SHA-256 bằng nhau | ⬜ |
| TC-05.19 | Vận chuyển: giao thành công (tách từ TC-05.06) | FR-05.04 | State | P2 | INT | Sau TC-05.06, kiện …10 `HANDED_OVER` | 1. `MockAdapter.shipping["SPXTST0000010"] = "DELIVERED"` 2. Chạy J-06 | Kiện `DELIVERED`; dòng thời gian có mốc mới | ⬜ |
| TC-05.20 | CSV > 5.000 dòng (tách từ TC-05.14) | API-50 | Boundary | P3 | API | PRE-5; file CSV 5.001 dòng dữ liệu, < 5 MB | 1. `tst_sup` POST /imports | 422 `FILE_INVALID` | ⬜ |
| TC-05.21 | File gốc hết hạn 90 ngày (tách từ TC-05.18) | API-54 | Boundary | P3 | INT | PRE-6, `clock.freeze`; lần nhập `COMMITTED` | 1. `clock.advance(91 ngày)` 2. GET /imports/{id}/file | 410 `FILE_EXPIRED` | ⬜ |

<details><summary>TC-05.11 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | Bấm đồng hồ; D5 `/admin/imports` chọn file | `ok_500.csv` (500 đơn mới, mã `SPXCSV0000001..500`) | API-50 201 `status` = `PREVIEW` |
| 2 | Đọc bộ đếm | — | "Mới 500 · Cập nhật 0 · Bỏ qua 0 (đã có từ Shopee) · Lỗi 0"; bảng 20 dòng đầu |
| 3 | Bấm "Nhập 500 đơn" | — | API-51 200 `status` = `COMMITTED` |
| 4 | Dừng đồng hồ | — | Bước 1–3 ≤ 30 giây |
| 5 | Đọc kết quả | — | Alert "Đã nhập 500 đơn."; Lịch sử nhập có dòng: người nhập "Nguyễn B", mới 500 |
| 6 | API-30 `q=SPXCSV0000250` | — | 1 kiện, `source` = `CSV` |
</details>

### M09 — Dashboard ngày

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-09.01 | Số liệu đúng | FR-09.01, AC-18 | Happy | P1 | INT | PRE-6 | Xem chi tiết bên dưới | `counts` = `packed 12, had_mismatch 3, abandoned 1, cancelled 2, packed_not_handed_over 4, cancelled_after_pack 1` | ⬜ |
| TC-09.02 | Thẻ dẫn đúng bộ lọc | N2, 02b-admin KpiCard | Regression | P2 | E2E | Dữ liệu như TC-09.01 trên stack (cách nạp cần xác nhận); `tst_sup` ở D2 | 1. Bấm thẻ "Đã đóng gói" 2. Đếm dòng D3 3. Lặp với 5 thẻ còn lại | Mỗi thẻ: D3 mở với bộ lọc tương ứng + ngày; số dòng = số trên thẻ | ⬜ |
| TC-09.03 | Tự cập nhật | WS-02 | Happy | P2 | E2E | PRE-4 (cửa sổ dashboard mở D2 `/admin`) | 1. Ghi số thẻ "Đã đóng gói" = N 2. Station quét mở + đóng `SPXTST0000001` 3. Bấm đồng hồ, không tải lại D2 | Thẻ "Đã đóng gói" = N + 1 trong ≤ 5 giây | ⬜ |
| TC-09.04 | Ngày trống | D2 empty | Negative | P3 | E2E | PRE-3 | 1. D2 đổi ngày sang 01/01/2026 | 4 thẻ theo ngày ("Đã đóng gói", "Từng lệch mã", "Bỏ dở", "Hủy phiên") = 0; 2 thẻ "Chưa bàn giao", "Hủy sau khi đóng" giữ số hiện tại (không theo ngày, = `packed_not_handed_over`, `cancelled_after_pack` của API-32); hiện "Chưa có phiên đóng gói nào trong ngày." (DEC-59) | ⬜ |
| TC-09.05 | Ổ đĩa > 80% | NFR-30 | Boundary | P2 | MAN | PRE-3; volume `video` gắn đĩa nhỏ lấp > 80% (cách giả lập cần xác nhận) | 1. Gọi API-81 2. Mở D2 3. Mở D8 | API-81 `disk.percent` > 80; D2 "Cần xử lý" có dòng ổ đĩa kèm % (chữ cần xác nhận); D8 LinearProgress màu cảnh báo | ⬜ |

<details><summary>TC-09.01 — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | `clock.freeze(hôm nay 08:00)`, tạo 12 phiên `COMPLETED` | 3 phiên có cờ `HAD_MISMATCH`, 1 phiên cờ `REPACK` | — |
| 2 | Tạo 1 phiên `ABANDONED`, 2 phiên `CANCELLED` kết thúc hôm nay | — | — |
| 3 | Đặt 4 kiện `PACKED` chưa bàn giao, 1 kiện `CANCELLED_AFTER_PACK` | trong 12 kiện ở bước 1 | — |
| 4 | API-32 `GET /reports/daily?date=<hôm nay>` | token `tst_cskh` | `packed` = 12, `had_mismatch` = 3, `abandoned` = 1, `cancelled` = 2, `packed_not_handed_over` = 4, `cancelled_after_pack` = 1 |
| 5 | (E2E) D2 cùng ngày | — | 6 thẻ hiện đúng 6 số trên |
</details>

## 3. Phân quyền

Gọi API trực tiếp bằng token từng vai (PRE-5) để chắc server chặn, sau đó kiểm UI ẩn. ✅ được (status ≠ 403) · ⛔ 403 `FORBIDDEN` · → chuyển hướng. Không có token → 401 `UNAUTHENTICATED`.

| Hành động (API) | Admin | Supervisor | Station | CSKH | TC |
|---|:---:|:---:|:---:|:---:|---|
| Quét / phiên (API-10..15) | ⛔ | ⛔ | ✅ | ⛔ | TC-P.01 |
| Duyệt (API-20, 21) | ✅ | ✅ | ⛔ | ⛔ | TC-P.02 |
| Tra cứu, chi tiết (API-30, 31), dashboard (API-32) | ✅ | ✅ | ⛔ | ✅ | TC-P.03 |
| URL clip (API-40) phiên station khác / ngày trước | ✅ | ✅ | ⛔ | ✅ | TC-P.04 |
| URL clip phiên station mình trong ngày | ✅ | ✅ | ✅ | ✅ | TC-P.04 |
| Giữ clip, xuất (API-42, 43) | ✅ | ✅ | ⛔ | ✅ | TC-P.05 |
| Cắt lại clip (API-46) | ✅ | ✅ | ⛔ | ⛔ | TC-P.05 |
| Nhập CSV (API-50..54) | ✅ | ✅ | ⛔ | ⛔ | TC-P.06 |
| Station, camera, ROI (API-60..64) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.07 |
| Live view (API-65), snapshot (API-63) | ✅ | ✅ | ⛔ | ⛔ | TC-P.07 |
| Shopee (API-70..73), cài đặt PUT (API-80) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.08 |
| Sức khỏe (API-81), cài đặt GET | ✅ | ✅ | ⛔ | ⛔ | TC-P.08 |
| Người dùng, thu hồi, audit (API-90..92) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.09 |
| Truy cập `/station` bằng tài khoản dashboard | → `/admin` (trong app) · → `/station/login` (tải trang mới, DEC-54) | như Admin | ✅ | như Admin | TC-P.10 |
| Truy cập `/admin/settings/*` | ✅ | → `/admin/forbidden` | → `/station` | → `/admin/forbidden` | TC-P.10 |

TC-P.01..P.09: `API`, P1, mọi ô của bảng (đã tự động cho P.01, P.07, P.09 trong `test_tc_p_matrix`). TC-P.10: `E2E`, P2; trang forbidden hiện "Tài khoản của bạn không có quyền xem trang này." + "Về Tổng quan".

## 4. Phi chức năng

| ID | NFR | Kịch bản & tải | Ngưỡng đạt | Kết quả đo |
|---|---|---|---|---|
| TC-N.01 | NFR-01 | PRE-1; 100 lần quét đơn đã có, 2 station (`tst_station01`, `tst_station02`) song song | p95 ≤ 1 giây (thời gian client; metric server cần xác nhận) | |
| TC-N.02 | NFR-01 | `INT`: 20 lần quét mã phải tra sàn, `MockAdapter(delay_s=1.5)` | p95 ≤ 3 giây | |
| TC-N.03 | NFR-03 | PRE-2; 50 phiên dài 1–5 phút | Clip `READY` p95 ≤ 60 giây sau đóng | |
| TC-N.04 | NFR-05 | locust (chưa có, task NFR T-19) 1 giờ: 2 station × 120 quét/giờ + 1 CSKH tra cứu 1 lần/10 giây + 2 xuất clip/giờ | NFR-01, 03, 04 vẫn đạt; CPU server < 80% | |
| TC-N.05 | NFR-04 | 1.000.000 kiện giả lập trong DB (script nạp chưa có — T-19) | API-30 theo mã ≤ 2 giây | |
| TC-N.06 | NFR-09, AC-09 | PRE-7; rút WAN 30 phút khi đang đóng gói; cắm lại | Quét, phiên, ghi hình chạy bình thường suốt 30 phút; đồng bộ lại ≤ 10 phút sau khi có mạng | |
| TC-N.07 | NFR-31 | PRE-7; đo bitrate thực 4 camera trong 1 giờ | Dung lượng dự báo 30 ngày thô + 90 ngày clip < 80% NAS | |
| TC-N.08 | AC-08 / DEC-32 | Encode export clip 3 phút `SIDE_BY_SIDE`, 20 lần | p95 ≤ 20 giây | |
| TC-N.09 | NFR-10 | Rút điện server (có UPS) | UPS giữ ≥ 15 phút, tắt an toàn; segment đang ghi đọc được sau khi bật | |

## 5. Truy vết

| FR / AC / BR / EX | TC | Đạt |
|---|---|:---:|
| AC-01 | TC-03.01, 03.02, 03.03, N.01 | ⬜ |
| AC-02 | TC-02.01, 02.02 | ⬜ |
| AC-03 | TC-03.04, 03.06 | ⬜ |
| AC-04 | TC-03.21, 03.22 | ⬜ |
| AC-05 | TC-03.08 | ⬜ |
| AC-08 | TC-07.07, 07.08, N.08 | ⬜ |
| AC-09 | TC-N.06 | ⬜ |
| AC-10 | TC-01.07, 02.03 | ⬜ |
| AC-11 | TC-02.04, 02.05, 02.15 | ⬜ |
| AC-12 | TC-05.11, 05.12 | ⬜ |
| AC-13 | TC-10.01, 03.30 | ⬜ |
| AC-14 | TC-03.51 | ⬜ |
| AC-15 | TC-02.06 | ⬜ |
| AC-16 | TC-03.28 | ⬜ |
| AC-17 | TC-01.09, 01.13 | ⬜ |
| AC-18 | TC-09.01, 09.02 | ⬜ |
| AC-19 | TC-03.40, 03.41 | ⬜ |
| AC-20 | TC-02.07 | ⬜ |
| AC-21 | TC-03.10, 03.52 | ⬜ |
| FR-01.01..01.06 | TC-01.01..01.14 | ⬜ |
| FR-02.01..02.07, 02.09 | TC-02.01..02.19, 07.07, 07.11 | ⬜ |
| FR-03.01 | TC-10.01, 10.06, 03.30 | ⬜ |
| FR-03.02..03.07 | TC-03.01..03.17, 03.20..03.26, 03.34, 03.35 | ⬜ |
| FR-03.08, 03.09 | TC-03.18, 03.19, 03.27..03.29 | ⬜ |
| FR-03.10, 03.12 | TC-03.40..03.56 | ⬜ |
| FR-03.11 | TC-03.03, 03.31, 03.34 | ⬜ |
| FR-05.01..05.04, 05.06..05.08 | TC-05.01..05.10, 05.19, 03.12, 03.13 | ⬜ |
| FR-05.09, 05.10 | TC-05.11..05.18, 05.20, 05.21 | ⬜ |
| FR-07.01..07.04 | TC-07.01..07.17 | ⬜ |
| FR-09.01 | TC-09.01..09.05 | ⬜ |
| FR-10.01..10.03 | TC-10.01..10.10, TC-P.01..P.10 | ⬜ |
| BR-01 | TC-03.08, 03.11 | ⬜ |
| BR-02 | TC-03.07, 03.15, 03.16 | ⬜ |
| BR-03 | TC-03.09, 03.10, 03.51..03.55 | ⬜ |
| BR-04 | TC-03.12, 03.13, 05.07 | ⬜ |
| BR-05 | TC-03.04, 03.06 | ⬜ |
| BR-06 | TC-03.21..03.23 | ⬜ |
| BR-09 | TC-02.06 | ⬜ |
| BR-15 | TC-01.09, 01.13 | ⬜ |
| BR-16 | TC-03.27..03.29, 03.53, 02.16 | ⬜ |
| BR-17 | TC-05.15, 05.16 | ⬜ |
| BR-18 | TC-03.24..03.26 | ⬜ |
| EX-P1 | TC-03.08 | ⬜ |
| EX-P2 | TC-03.09, 03.51 | ⬜ |
| EX-P3 | TC-03.12, 03.13 | ⬜ |
| EX-P4 | TC-03.07 | ⬜ |
| EX-P5 | TC-03.27, 03.28 | ⬜ |
| EX-P6 | TC-03.24 | ⬜ |
| EX-P7 | TC-01.07, 02.03 | ⬜ |
| EX-P8 | TC-03.01 (đơn …12 có 3 sản phẩm); đơn nhiều kiện: TC-05.04 (1 đơn 2 mã vận đơn → 2 kiện, 2 phiên) | ⬜ |
| EX-P9 | TC-03.30 | ⬜ |
| EX-P10 | TC-05.05, 03.11 | ⬜ |
| EX-P11 | TC-05.12, 05.13 | ⬜ |
| State kiện (01 §7) | NEW→PACKING (03.01) · PACKING→PACKED (03.02) · PACKING→NEW (03.18, 03.28) · PACKED→PACKING (03.51) · PACKING→PACKED hủy repack (03.52) · PACKED→HANDED_OVER (05.06) · HANDED_OVER→DELIVERED (05.19) · PACKED→CANCELLED_AFTER_PACK (05.05) · NEW→CANCELLED (03.08 dữ liệu). Chuyển cấm: HANDED_OVER→PACKING (03.10, 03.55) | ⬜ |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-38 | Tự động hóa case P1 | Viết test API (`tests/qa/`) và E2E (`tests/e2e/`) trong T-19, T-38, T-61; case HW thủ công có quay màn hình | Repo chưa có code; gắn vào task đã có trong 03 | khanhtt (tự quyết) |
| DEC-52 | Chuẩn hoá theo CONVENTIONS §9 bản 2026-10-05 | Mỗi kịch bản một case (tách 20 case mới, 118 → 138 case chức năng, giữ ID cũ cho kịch bản test code đang tham chiếu); bước đánh số; tiền điều kiện chuẩn PRE-1..7; case phức tạp viết trong `<details>`; sửa thông tin lỗi thời theo code (seed `aicam seed-demo`, `qa-reset.sh`, `compose.dev.yml`, đồng hồ giả chỉ ở pytest, E2E ở `ai-cam-fe/e2e/`). TC-01.04 giữ nghĩa "IP không tồn tại" vì `test_m1_live.py` và `test_stations_api.py` dùng nghĩa đó; "sai mật khẩu" sang TC-01.11 | Giữ khớp docstring test hiện có; loại phương án đánh lại toàn bộ ID (làm gãy tham chiếu trong test) | khanhtt (tự quyết) |
| DEC-59 | TC-09.04 kỳ vọng "6 thẻ = 0" ở ngày trống, nhưng 02 §6 API-32 định nghĩa `packed_not_handed_over`, `cancelled_after_pack` là số kiện hiện tại (mọi ngày); FE theo contract (FE DEC-73) | Sửa kỳ vọng TC-09.04: 4 thẻ theo ngày = 0, 2 thẻ "Chưa bàn giao", "Hủy sau khi đóng" là số hiện tại; câu trống hiện khi 4 thẻ theo ngày = 0. Cột KQ giữ ⬜ (chạy ở G4) | Contract là nguồn sự thật (DEC-10); kiện đã đóng chưa bàn giao vẫn cần xử lý bất kể chọn ngày nào. Loại: đổi API-32 thành đếm theo ngày (mất mục đích "việc còn tồn") | khanhtt (tự quyết) |

## Chốt G4
- [ ] Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng
- [ ] Ma trận quyền đã chạy
- [ ] NFR có ngưỡng đã đo
- [ ] Bug Critical/High = 0 (hoặc có DEC chấp nhận)
- [ ] Regression vùng bị chạm đã chạy
