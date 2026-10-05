# System map

> Bản đồ hệ thống đang chạy — nền cho reuse-first. Mỗi dòng có nguồn (file/lệnh).
> Ai làm thay đổi hệ thống thì cập nhật file này. Last update: 2026-10-05 · Dev (M4 Nguồn đơn xong, trừ T-3 Shopee thật)

**Hiện trạng (2026-10-05):** item 01 xong M0–M4 (trừ T-4 camera thật, T-3 tài khoản Shopee partner) trên nhánh `feat/01-packing-mvp` của `ai-cam-be`, `ai-cam-fe` (đã push, chưa merge `main`). BE: auth, station/camera, phiên quét, realtime, vision đọc khay Cam 2 (chạy trên camera giả), duyệt, cắt clip, tra cứu, giữ clip, xuất MP4, báo cáo ngày, cài đặt, health, nhập đơn CSV / xlsx, adapter Shopee (chỉ chạy trên HTTP giả + adapter mock) + đồng bộ J-04/05/06/12. FE: station S0–S6, dashboard D1, D2, D3, D4 (+ xuất), D5, D6 (+ vùng đọc mã), D7–D10, D11, D12, D13. Chưa có: Shopee thật (T-3), token bucket rate limit (ADR-007), M5 (T-19).
Kiến trúc: [architecture.md](architecture.md).

## Module / component
| Module | Trách nhiệm | Path | Chủ |
|---|---|---|---|
| core | settings, ids (UUID v7), clock giả lập được, db (async, after_commit, rollback), redis, errors (format 02 §6), pagination, security (Argon2id, JWT, Fernet, HMAC), audit, deps (`require_roles`) | `ai-cam-be/src/aicam/core/` | BE |
| users | Auth + tài khoản + audit log API (T-7) | `ai-cam-be/src/aicam/modules/users/` | BE |
| stations | Station, camera, MediaMTX client, probe ffmpeg/ONVIF, HealthTracker (T-8) | `ai-cam-be/src/aicam/modules/stations/` | BE |
| vision | Tiến trình `vision`: J-08 vòng theo dõi camera (`health_loop.py`) + đọc mã khay Cam 2 (T-12, ADR-005): `capture.py` (mỗi Cam 2 một thread đọc relay RTSP, giải mã 4 khung/giây, timeout mở 5 giây / đọc 3 giây), `reader.py` (OpenCV + zxing-cpp đọc Code128 / QR trong ROI, chỉ nhận mã khớp `SCAN_CODE_REGEX`), `tray.py` (khử nhiễu tập mã, mất stream > 3 giây → `UNAVAILABLE`), `runner.py` (ghi Redis, phát `tray.changed`, nạp lại camera khi `vision.config` và mỗi 10 giây) | `ai-cam-be/src/aicam/modules/vision/`, `entrypoints/vision.py` | BE |
| workers | Celery app, task, lịch beat | `ai-cam-be/src/aicam/workers/` | BE |
| orders | `transition()` (điểm duy nhất đổi trạng thái kho), `upsert_platform_order` (BR-17, EX-P10), kiện chưa xác minh (BR-04) | `ai-cam-be/src/aicam/modules/orders/service.py` | BE |
| orders — tra cứu | API-30 tìm kiện (q, ngày ≤ 92, station, trạng thái, phiên, nguồn), API-31 chi tiết (đơn, sản phẩm, phiên, clip, dòng thời gian) | `ai-cam-be/src/aicam/modules/orders/packages.py`, `orders/router.py` | BE |
| media | `ffmpeg.py` (lệnh cắt `-c copy` / encode xuất), `segments.py` (đọc tên file MediaMTX, khe hở, kế hoạch cắt, timeline), `signing.py` (URL ký HMAC), `jobs.py` (gửi task Celery sau commit), `service.py` (J-10 index + đối soát path MediaMTX, J-01 cắt clip + VIDEO_INCOMPLETE, play-url, giữ clip, cắt lại, J-02 retention), `exports.py` (API-43..45, J-03 overlay `drawtext` + ghép `hstack`, dọn bản xuất 24 giờ), `router.py` | `ai-cam-be/src/aicam/modules/media/` | BE |
| reports | API-32 số liệu ngày + station + mục cần xử lý (cache Redis 5 giây) | `ai-cam-be/src/aicam/modules/reports/` | BE |
| settings | API-80 cài đặt (retention, ngưỡng phiên, audit `SETTINGS_UPDATE`), API-81 sức khỏe hệ thống | `ai-cam-be/src/aicam/modules/settings/` (`router.py`, `service.py`) | BE |
| platforms | `PlatformAdapter` + model chung (`base.py`: `get_shipping_statuses` theo lô, `PlatformAuthError`), `MockAdapter` (dữ liệu SPXTST…), `get_adapter()` (`PLATFORM_ADAPTER`, `SHOPEE_ENABLED`); `service.py` API-70..73, OAuth `state` một lần, lock `sync:{shop}`, tra đơn 2 giây khi quét (ngoài lock station) | `ai-cam-be/src/aicam/modules/platforms/` | BE |
| platforms/shopee | Adapter Shopee Open Platform v2 (T-16): `client.py` (ký HMAC-SHA256, thử lại giãn cách mũ / `Retry-After`, mã lỗi token / tạm), `adapter.py` (OAuth, refresh, đơn, mã vận đơn, vận chuyển theo lô 50), `mapping.py` (trạng thái sàn → kho). Chưa thử Shopee thật (DEC-123 02a) | `ai-cam-be/src/aicam/modules/platforms/shopee/` | BE |
| platforms/sync.py | Job đồng bộ (T-22): J-04 đơn mới / đổi (cursor − 10 phút), J-05 xác minh kiện chưa xác minh, J-06 trạng thái vận chuyển, J-12 làm mới token; ghi `shop.last_error` (`SYNC_FAILED` / `AUTH_EXPIRED` / `REFRESH_FAILED`) | `ai-cam-be/src/aicam/modules/platforms/sync.py` | BE |
| sessions | State machine phiên, API-10/11, advisory lock theo station, dedup quét; `on_tray_changed` (`OPEN` ↔ `MISMATCH` nguồn `CAM2`, BR-06) nghe `tray.changed` (`listeners.py`); `timer_base` = max(`started_at`, `decided_at` gần nhất) cho J-07 (DEC-60) | `ai-cam-be/src/aicam/modules/sessions/` | BE |
| approvals | API-13 gửi, API-14 rút, API-20 danh sách, API-21 duyệt (CONTINUE / CLOSE_WITH_NOTE / CANCEL_SESSION / APPROVE_REPACK / REJECT), audit `APPROVAL_DECISION`, WS `approval.*`: `service.py`, `router.py`, `views.py` (dựng item API-20 / WS), `schemas.py`, `queries.py` (đọc cho module khác), `models.py` | `ai-cam-be/src/aicam/modules/approvals/` | BE |
| imports | Nhập đơn từ file (T-17): `parser.py` (CSV `,` / `;` / tab, UTF-8 có / không BOM, xlsx sheet đầu, lỗi theo dòng), `service.py` (xem trước, commit phân loại lại + BR-17, `IMPORT_CONFLICT`, file gốc), `router.py` API-50..54, `template.csv`; dọn bản xem trước / file > 90 ngày cho J-11 | `ai-cam-be/src/aicam/modules/imports/` | BE |
| CLI | `aicam create-admin`, `aicam seed-demo` (TST…, mật khẩu matkhau123) | `ai-cam-be/src/aicam/entrypoints/cli.py` | BE |
| MediaMTX + camera giả | Relay RTSP, ghi fMP4 60 giây, chạy uid 10001; dev chỉ giữ video thô 1 giờ (`recordDeleteAfter: 1h`, sau sự cố đầy ổ 64 GB); WebRTC ICE cổng 8189 UDP + TCP (TCP cho máy dev Docker/Colima không chuyển UDP), `webrtcAdditionalHosts: [127.0.0.1]` (dev); `fake-cam1/2` cho dev (`fake-cam2` phát vòng 60 giây có phiếu SPXTST…01 / …02 / …03) | `ai-cam-be/docker/mediamtx.yml`, `docker/compose.dev.yml` | BE |
| Compose dev | `postgres`, `redis`, `video-init` (tạo `/data/video/{raw,clips,exports}`, chown uid 10001 cả `/data/imports`), volume `video`, `imports` (api, worker); `SHOPEE_ENABLED` (mặc định `false`), `PLATFORM_ADAPTER` (mặc định `mock`) đọc từ biến môi trường, `mediamtx`, `api`, `vision`, `worker` (`-Q default,video,sync`), `worker-export` (`-Q export -c 1`), `beat`, camera giả | `ai-cam-be/docker/compose.dev.yml` | BE |
| Spike S3 | Đo cắt clip, encode bản xuất (T-5) | `ai-cam-be/scripts/spike_s3.py`, `spike_s3_encode.sh` | BE |

## Data
| Thực thể | Nơi lưu | Field chính | Nguồn định nghĩa |
|---|---|---|---|
| 19 bảng: user, refresh_token, station, camera, shop, order, order_item, package, status_history, session, session_event, scan_dedup, approval_request, video_segment, clip, export, csv_import, setting, audit_log | PostgreSQL | Theo 02a §3 (+ `session.mismatch`, DEC-39) | `ai-cam-be/alembic/versions/0001_initial.py`, `src/aicam/modules/*/models.py` |
| Migration 0002 | PostgreSQL | `clip.deleted_at`, `clip.timeline` (jsonb: giây trong clip → giờ thực từng đoạn, cho overlay giờ bản xuất) | `ai-cam-be/alembic/versions/0002_clip_timeline.py` (DEC-102 02a) |
| Video thô | Volume `video` → `/data/video/raw/cam-<camera_id>/YYYY/MM/DD/HH-MM-SS-ffffff.mp4` (UTC) | segment 60 giây; J-02 xóa theo `retention_raw_days` (30) | `ai-cam-be/docker/mediamtx.yml` |
| Clip gốc | `/data/video/clips/YYYY/MM/DD/<session_id>-<CAM1\|CAM2>.mp4`, chỉ đọc | stream copy, SHA-256 trong `clip.sha256`; J-02 xóa theo `retention_clip_days` (90) trừ clip giữ | `modules/media/service.py` (`clip_rel_path`) |
| File nhập đơn | Volume `imports` → `/data/imports/{yyyy}/{mm}/{id}.{csv\|xlsx}`; DB `csv_import.file_path` lưu đường dẫn tương đối | giữ 90 ngày (J-11 xóa), API-54 trả tên file gốc | `modules/imports/service.py` (DEC-121 02a) |
| Bản xuất | `/data/video/exports/<export_id>/video.mp4`, `info.json` | giữ 24 giờ (`EXPORT_TTL_HOURS`, DEC-58 item 01), rồi xóa file + dòng `export` | `modules/media/exports.py` |

## Interface / API
| Endpoint / event / command | Mục đích | Quyền | Nguồn |
|---|---|---|---|
| `GET /healthz` | Liveness | công khai | `ai-cam-be/src/aicam/main.py` |
| `GET /api/v1/openapi.json`, `/api/docs` | OpenAPI | công khai (dev) | `main.py` |
| API-01..04 `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /me` | Đăng nhập, refresh xoay vòng (cookie `rt_station` / `rt_dashboard`), quyền | công khai / đã đăng nhập | `ai-cam-be/src/aicam/modules/users/router.py` |
| API-90..92 `/users`, `/users/{id}`, `/users/{id}/revoke-sessions`, `/audit-logs` | Quản lý tài khoản, nhật ký | ADMIN | `modules/users/router.py` |
| API-60..65 `/stations`, `/stations/{id}/cameras/{role}`, `/cameras/test`, `/cameras/{id}/snapshot`, `/cameras/{id}/roi`, `/live` | Station, camera, ROI, live view | ADMIN (snapshot, live: + SUPERVISOR) | `modules/stations/router.py` |
| API-10, API-11 `GET /station/state`, `POST /station/scan` | Trạng thái station, xử lý quét (02a §4.1) | STATION | `modules/sessions/router.py` |
| API-12, API-15 `POST /station/sessions/{id}/cancel`, `GET /station/sessions/recent` | Hủy phiên, 5 phiên gần nhất trong ngày | STATION | `modules/sessions/router.py` |
| WS-01 `/ws/station?token=`, WS-02 `/ws/dashboard?token=` | Realtime; ping/pong; 4401 token hết hạn, 4403 sai vai | STATION / ADMIN, SUPERVISOR, CSKH | `realtime/hub.py` |
| Redis `ws:station:{id}`, `ws:dashboard`, `ws:approvals` (chỉ ADMIN, SUPERVISOR), `ws:user:{id}` | Kênh sự kiện realtime | nội bộ | `realtime/publish.py` |
| Celery `sessions.check_timeouts` (J-07, 30 giây) | BR-16 cảnh báo 15 phút, bỏ dở 30 phút | nội bộ | `workers/tasks.py` |
| Redis `tray:{station_id}` `{codes, updated_at}` (vision ghi mỗi khung, TTL 5 giây; mất stream / camera gỡ / station tắt → xóa khóa = `UNAVAILABLE`) | Mã Cam 2 đang thấy trên khay | nội bộ | `modules/sessions/tray.py`, `modules/vision/runner.py` |
| Redis kênh `tray.changed` `{station_id}` (vision → api) | Tập mã trên khay đổi → `on_tray_changed` | nội bộ | `modules/sessions/listeners.py`, `modules/vision/runner.py` |
| API-13, API-14 `POST /station/approval-requests`, `POST /station/approval-requests/{id}/withdraw` | Station gửi yêu cầu duyệt (MISMATCH / ASSIST / REPACK), rút yêu cầu | STATION | `modules/approvals/router.py` |
| API-20, API-21 `GET /approval-requests`, `POST /approval-requests/{id}/decision` | Danh sách yêu cầu (mặc định PENDING), duyệt | ADMIN, SUPERVISOR | `modules/approvals/router.py` |
| WS sự kiện M3 | WS-01 `alert` `{code: SESSION_CANCELLED_BY_SUPERVISOR \| SESSION_ABANDONED, session_id, tracking_number}`; WS-02 `approval.created`, `approval.resolved` (cả WITHDRAWN), `approval.updated` (khay đổi khi yêu cầu chờ) — chỉ ADMIN, SUPERVISOR qua `ws:approvals` | — | `modules/approvals/service.py`, `realtime/publish.py` |
| Redis `camera.health` (vision → api), `vision.config` (api → vision) | Trạng thái camera, nạp lại ROI | nội bộ | `modules/stations/listeners.py`, `modules/vision/health_loop.py` |
| Celery `stations.check_clock_drift` (J-09, 10 phút) | Đo lệch giờ ONVIF | nội bộ | `workers/tasks.py` |
| API-30, API-31 `GET /packages`, `GET /packages/{id}` | Tra cứu kiện, chi tiết kiện | ADMIN, SUPERVISOR, CSKH | `modules/orders/router.py`, `orders/packages.py` |
| API-32 `GET /reports/daily?date=` | Số liệu ngày, station, mục cần xử lý (`CLIP_FAILED`, `DISK_USAGE` ≥ 80 %…) | ADMIN, SUPERVISOR, CSKH | `modules/reports/router.py` |
| API-40, API-41 `GET /clips/{id}/play-url`, `GET /media/clips/{id}?uid=&exp=&sig=` | URL ký 10 phút; phát Range, audit `VIEW_CLIP` từ byte 0 | ADMIN, SUPERVISOR, CSKH; STATION (phiên station mình, trong ngày) / chữ ký | `modules/media/router.py` |
| API-42 `PUT /clips/{id}/hold` | Giữ / bỏ giữ clip | ADMIN, SUPERVISOR, CSKH | `modules/media/router.py` |
| API-43..45 `POST /sessions/{id}/exports`, `GET /exports/{id}`, `GET /media/exports/{id}/{video.mp4\|info.json}` | Xuất MP4 có overlay + JSON hash; tải | ADMIN, SUPERVISOR, CSKH / người tạo + ADMIN (khác → 404) / chữ ký | `modules/media/router.py`, `media/exports.py` |
| API-46 `POST /sessions/{id}/clips/rebuild` | Cắt lại clip FAILED | ADMIN, SUPERVISOR | `modules/media/router.py` |
| API-50..54 `POST /imports`, `POST /imports/{id}/commit`, `GET /imports`, `GET /imports/template`, `GET /imports/{id}/file` | Nhập đơn CSV / xlsx: xem trước 30 phút, xác nhận (chỉ người tạo), lịch sử, file mẫu, file gốc 90 ngày | ADMIN, SUPERVISOR | `modules/imports/router.py` |
| API-70..73 `GET /shops`, `POST /shops/shopee/auth-url`, `GET /shops/shopee/callback`, `POST /shops/{id}/sync` | Kết nối Shopee, đồng bộ ngay (202, lock `sync:{shop}` 600 giây); 503 `PLATFORM_NOT_CONFIGURED` khi `SHOPEE_ENABLED=false` | ADMIN (callback công khai + `state`) | `modules/platforms/router.py` |
| Redis `shopee:oauth:{state}` (10 phút, `GETDEL`), `sync:{shop_id}` | `state` OAuth dùng một lần; lock đồng bộ một shop | nội bộ | `modules/platforms/service.py` |
| Celery J-04 `platforms.sync_orders` (5 phút), J-05 `platforms.verify_unverified` (10 phút), J-06 `platforms.sync_shipping_status` (15 phút), J-12 `platforms.refresh_tokens` (30 phút) — queue `sync` | Đồng bộ đơn, xác minh kiện, trạng thái vận chuyển, làm mới token; không làm gì khi `SHOPEE_ENABLED=false` | nội bộ | `workers/celery_app.py`, `workers/tasks.py`, `modules/platforms/sync.py` |
| API-80, API-81 `GET/PUT /settings`, `GET /system/health` | Cài đặt retention + ngưỡng phiên; sức khỏe DB/Redis/MediaMTX/ổ/camera/đồng bộ | GET: ADMIN, SUPERVISOR; PUT: ADMIN | `modules/settings/router.py` |
| WS sự kiện M2 | `session.clip_ready` (WS-01 + WS-02), `report.updated` (WS-02, xóa cache API-32 trước khi phát), `export.updated` (`ws:user:{người tạo}`) | — | `modules/media/service.py`, `media/exports.py` |
| Celery `media.build_session_clips` (J-01, queue `video`) | Cắt clip Cam 1/Cam 2 khi phiên kết thúc (chờ đóng + 5 + 3 giây), thử lại 3 lần | nội bộ | `workers/tasks.py`, `modules/media/service.py` |
| Celery `media.render_export` (J-03, queue `export`, `worker-export` concurrency 1) | Encode bản xuất, timeout 600 giây | nội bộ | `workers/tasks.py`, `modules/media/exports.py` |
| Celery `media.index_segments` (J-10, mỗi phút) | Index segment, đối soát path MediaMTX, dọn bản xuất > 24 giờ | nội bộ | `workers/tasks.py` |
| Celery `media.enforce_retention` (J-02, `crontab` 19:00 UTC = 02:00 giờ VN) | Xóa video thô, clip quá hạn (trừ clip giữ), audit `DELETE_CLIP` | nội bộ | `workers/tasks.py`, `modules/media/service.py` |
| Celery `maintenance.housekeeping` (J-11, 5 phút) | Dọn `scan_dedup`, bản xem trước CSV, file CSV > 90 ngày; đẩy lại J-01 cho phiên thiếu clip | nội bộ | `workers/tasks.py` |

## Màn hình / bề mặt UI
| Route / màn | Mục đích | Component chính | Nguồn |
|---|---|---|---|
| `/station/login` (S0) | Đăng nhập station | `StationLoginPage` | `ai-cam-fe/src/features/station/` |
| `/station` (S1–S6 theo `state`) | Màn đóng gói kiosk: sẵn sàng + phiên gần đây, đang đóng gói, lệch mã, cảnh báo, chờ duyệt, mất kết nối | `StationPage`, `*Panel`, `AlertOverlay`, `DisconnectedOverlay`, `CancelSessionDialog` | `ai-cam-fe/src/features/station/` |
| `/admin/login` (D1) | Đăng nhập dashboard, `?next=` | `AdminLoginPage` | `ai-cam-fe/src/features/admin/` |
| `/admin` (khung) | App bar, drawer theo vai (`nav.ts`: "Tổng quan", "Tra cứu đơn" cho ADMIN/SUPERVISOR/CSKH; "Station" chỉ ADMIN), theme, D12 `/admin/forbidden`, 404; WS-02 `useDashboardSocket`: `report.updated` → D2 (tối đa 1 lần / 5 giây), `camera.status` → D6 + D2, `session.*`/`clip.*` → D3 + D4, `export.updated` → bản xuất, `approval.*` → duyệt + D2 | `AppShell`, `ErrorPages`, `useDashboardSocket` | `ai-cam-fe/src/features/shell/` |
| `/admin` (D2 Tổng quan) | 6 thẻ số (4 theo ngày, 2 số hiện tại), station, mục cần xử lý | `DailyPage`, `KpiCard`, `StationStatusList`, `AttentionList` | `ai-cam-fe/src/features/reports/` |
| `/admin/packages` (D3 Tra cứu đơn) | Tìm theo mã / máy quét, lọc ghi vào URL, 1 kết quả mở D4 | `PackagesPage`, `PackageFilters`, `PackageTable`, `filters.ts` | `ai-cam-fe/src/features/orders/` |
| `/admin/packages/:id` (D4 Chi tiết đơn) | Đơn, sản phẩm, phiên, clip Cam 1/Cam 2/Ghép, Giữ clip, cắt lại clip lỗi, dòng thời gian; poll 10 giây khi clip đang cắt; `ExportDialog` (Cam 1/Cam 2/Ghép, poll API-44 2 giây, tải MP4 + JSON) | `PackageDetailPage`, `SessionPanel`, `HoldToggle`, `ExportDialog`, `ClipPlayer` | `ai-cam-fe/src/features/orders/`, `src/shared/media/` |
| `/admin/settings/stations`, `/new`, `/:id` (D6) | Station, tài khoản station, Cam 1 / Cam 2, kiểm tra kết nối, vùng đọc mã Cam 2 (ảnh API-63, kéo khung, lưu API-64, khóa Lưu khi < 5%) | `StationsListPage`, `StationEditPage`, `CameraForm`, `RoiEditor` (+ `roi.ts`) | `ai-cam-fe/src/features/admin/` |
| `/admin/approvals` (D13 Yêu cầu duyệt) | Thẻ yêu cầu đang chờ, quyết định theo loại, badge drawer, âm báo Web Audio khi `approval.created` (ADMIN, SUPERVISOR) | `ApprovalsPage`, `ApprovalCard`, `ApprovalBadge`, `usePendingApprovals`, `chime.ts`, `decision.ts` | `ai-cam-fe/src/features/approvals/` |
| `/admin/imports` (D5 Nhập đơn) | Tải CSV / xlsx, xem trước (bộ đếm, 20 dòng đầu, dòng lỗi), "Nhập N đơn", lịch sử + tải file gốc, file mẫu (ADMIN, SUPERVISOR) | `ImportsPage`, `ImportDropzone`, `ImportPreview`, `ImportHistoryTable`, `rules.ts` | `ai-cam-fe/src/features/imports/` |
| `/admin/settings/shopee` (D7) | Thẻ shop, kết nối / kết nối lại, `?result=`, đồng bộ ngay, lỗi đồng bộ (ADMIN) | `ShopeePage` | `ai-cam-fe/src/features/platforms/` |
| `/admin/settings/storage` (D8) | Retention + ngưỡng phiên (API-80), sức khỏe API-81 làm mới 30 giây (ADMIN) | `StoragePage`, `HealthPanel`, `rules.ts` | `ai-cam-fe/src/features/settings/` |
| `/admin/settings/users` (D9) | Người dùng: tạo, sửa vai, đặt lại mật khẩu, thu hồi phiên station, khóa / mở khóa (ADMIN) | `UsersPage`, `UserTable`, `UserDialog`, `rules.ts` | `ai-cam-fe/src/features/users/` |
| `/admin/settings/audit` (D10) | Nhật ký thao tác chỉ đọc, lọc người / hành động / ngày ở URL (ADMIN) | `AuditPage` | `ai-cam-fe/src/features/audit/` |
| `/admin/live` (D11 Live view) | Lưới camera theo station qua WHEP, `?station=` phóng to, "Mất tín hiệu" + tự thử lại 5 giây × 3 | `LivePage`, `CameraTile`, `useLiveStream` | `ai-cam-fe/src/features/liveview/` |
| `/_ui` (chỉ `pnpm dev`) | Xem UI kit | `UiGallery` | `ai-cam-fe/src/app/` |

## Test & QA
| Bộ | Lệnh | Nguồn |
|---|---|---|
| BE unit + integration | `cd ai-cam-be && uv run pytest` (Postgres :55432, Redis :56379 db15) | `ai-cam-be/tests/{unit,integration}` |
| QA API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa` (qa-reset dọn cả volume video) | `ai-cam-be/tests/qa/test_m1_live.py`, `test_m2_live.py`, `test_m3_live.py` (cần `fake-cam2` + vision), `test_m4_live.py` (CSV fixtures `tests/qa/fixtures/csv/`; phần Shopee chạy riêng với `SHOPEE_ENABLED=true`, adapter mock) |
| FE unit/integration (MSW) | `cd ai-cam-fe && pnpm test` | `ai-cam-fe/src/**/*.test.ts(x)` |
| E2E mock / BE thật | `pnpm e2e` (MSW, :5180) · `pnpm e2e:real` (dev server :5181 → api :8180, reset dữ liệu mỗi test; 37 bài sau M4) | `ai-cam-fe/e2e/{mock,real}`, `playwright.real.config.ts` |
| Helper test FE | `hidScan(code)` gõ phím như máy quét HID (sửa test chập chờn EX-P9); `withNodeFormData()` đặt `FormData` của Node chỉ trong test upload (thay toàn cục từng làm `pnpm test` thoát mã 1) | `ai-cam-fe/src/test/scan.ts`, `src/test/nodeFormData.ts` |

## Config (BE, 02a §9)
| Biến | Mặc định | Dùng cho |
|---|---|---|
| `VIDEO_ROOT` | `/data/video` | Gốc video (`raw/`, `clips/`, `exports/`) |
| `CLIP_PADDING_S`, `CLIP_SETTLE_S`, `CLIP_GAP_TOLERANCE_S`, `CLIP_CUT_TIMEOUT_S`, `SEGMENT_CLOSED_AFTER_S` | `5`, `3`, `1.5`, `90`, `15` | J-01, J-10 |
| `MEDIA_SIGNING_KEY`, `MEDIA_URL_TTL_S` | secret, `600` | URL ký API-40/44 |
| `EXPORT_PRESET`, `EXPORT_SIDE_SCALE`, `EXPORT_TTL_HOURS`, `EXPORT_TIMEOUT_S`, `EXPORT_FONT_FILE` | `veryfast`, `1280:720`, `24`, `600`, Be Vietnam Pro SemiBold | J-03 (hạ preset / kích thước khi server chậm — RB-7) |
| `IMPORT_ROOT` | `/data/imports` | File CSV / xlsx gốc (T-17), J-11 xóa sau 90 ngày |
| `PLATFORM_ADAPTER`, `SHOPEE_ENABLED` | `mock`, `false` | Chọn adapter; tắt Shopee → API-71/73 503, job sàn không chạy, quét không tra sàn |
| `SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_REDIRECT_URL`, `SHOPEE_BASE_URL` | rỗng, rỗng, rỗng, `https://partner.shopeemobile.com` | Tài khoản partner (chờ T-3) |
| `SHOPEE_TIMEOUT_S`, `SHOPEE_MAX_ATTEMPTS`, `SHOPEE_BACKOFF_S` | `10`, `5`, `0.5` | Mỗi request Shopee; thử lại giãn cách mũ hoặc theo `Retry-After` |
| `SHOPEE_LOOKUP_LOOKBACK_MIN`, `SHOPEE_INITIAL_SYNC_DAYS` | `60`, `3` | Tra mã khi quét / J-05 dò đơn cập nhật 60 phút (DEC-123 02a); lần đồng bộ đầu lùi 3 ngày |

## Tích hợp ngoài
| Hệ thống | Mục đích | Cách gọi | Config |
|---|---|---|---|
| MediaMTX API v3 (v1.21.1) | Thêm/sửa/xóa path camera, đọc `ready` + `inboundBytes`; J-10 thêm lại path bị mất, xóa path `cam-<uuid>` mồ côi | `HttpMediaMTX` | `MEDIAMTX_API_URL` |
| FFmpeg / ffprobe (trong image BE) | Cắt clip `-c copy`, đo thời lượng, encode bản xuất H.264 + `drawtext` (font Be Vietnam Pro) | subprocess, `modules/media/ffmpeg.py` | `VIDEO_ROOT`, `CLIP_*`, `EXPORT_*` (02a §9) |
| Camera ONVIF | `GetSystemDateAndTime` (J-09) | SOAP qua httpx | — |
| zxing-cpp, opencv-python-headless, numpy | Đọc khung RTSP Cam 2, giải mã Code128 / QR (tiến trình `vision`) | thư viện Python, `modules/vision/` | `ai-cam-be/pyproject.toml` |
| MediaMTX WebRTC (WHEP) | Live view D11 | trình duyệt POST SDP tới `/live/cam-<id>/whep` | ICE 8189 UDP + TCP (`docker/mediamtx.yml`) |
| Shopee Open Platform v2 | Kết nối shop (OAuth), đồng bộ đơn, mã vận đơn, trạng thái vận chuyển. **Chưa thử với Shopee thật** — chờ tài khoản partner (T-3) | httpx ký HMAC-SHA256, `modules/platforms/shopee/client.py` | `SHOPEE_*` (Config) |
| openpyxl, python-multipart | Đọc `.xlsx`, nhận multipart API-50 | thư viện Python | `ai-cam-be/pyproject.toml` |

## Thành phần dùng chung (reuse trước khi viết mới)
| Tên | Dùng cho | Path |
|---|---|---|
| `AppError` + handler | Mọi lỗi API theo 02 §6 | `core/errors.py` |
| `require_roles(...)`, `CurrentPrincipal` | Phân quyền API | `core/deps.py` |
| `audit.record()` | Ghi nhật ký thao tác | `core/audit.py` |
| `after_commit()`, `commit()`, `rollback()` | Publish sự kiện sau commit | `core/db.py` |
| `clock.now()` / `freeze` / `advance` | Giờ hệ thống, test tua giờ | `core/clock.py` |
| `enum_check()` | CHECK enum cho cột text | `core/db.py` |
| `uuid7()` tăng đơn điệu | Khóa chính; sắp theo id = thứ tự tạo | `core/ids.py` |
| `orders.transition()` | Mọi thay đổi `warehouse_status` | `modules/orders/service.py` |
| UI kit: Button, IconButton, TextField, SelectField, TextAreaField, Alert, StatusChip, LinearProgress, PageHeader, EmptyState, Tabs, SegmentedButtons, AuthCard, Dialog, Pagination, Toast/`toast()`, Skeleton, TrackingNumber, Icon, `cx` | Mọi màn FE | `ai-cam-fe/src/shared/ui/` (xem tại `/_ui` khi `pnpm dev`) |
| Token + class design system (`card`, `md-input`, `md-table`, `state-layer`, `icon`…) | Mọi màn FE | `ai-cam-fe/src/design/` (`pnpm tokens` để sinh lại) |
| `api.get/post/...`, `api.blob` (`responseType: "blob"`, ảnh API-63), `ApiError`, `onUnauthenticated` | Gọi API (token, refresh 401 một lần, lỗi 02 §6) | `ai-cam-fe/src/lib/api/client.ts`, `errors.ts` |
| `whep.ts` | WHEP tự viết: RTCPeerConnection recvonly, POST SDP kèm Bearer (401 → refresh 1 lần), ghép `Location` thiếu tiền tố `/live`, DELETE khi đóng | `ai-cam-fe/src/shared/media/whep.ts` |
| Proxy Vite `/live` | Dev: `/live/*` → MediaMTX WebRTC (bỏ tiền tố); production qua Caddy | `ai-cam-fe/vite.config.ts` |
| `useSession`, `login/logout/fetchMe` | Phiên đăng nhập (access token trong bộ nhớ) | `ai-cam-fe/src/lib/api/session.ts`, `auth.ts` |
| `connectWs()` | WebSocket backoff + ping + 4401 | `ai-cam-fe/src/lib/ws.ts` |
| MSW handlers + dữ liệu mock (`tst_*`, mật khẩu `matkhau123`), `StationSim` (state machine phiên), mock WS | `pnpm dev:mock`, test | `ai-cam-fe/src/mocks/` |
| `RequireRole`, `useAuth` | Guard theo vai, khôi phục phiên khi tải trang | `ai-cam-fe/src/features/auth/` |
| `useScanListener` / `ScanBuffer` | Nhận máy quét HID (≤ 50 ms/phím + Enter) | `ai-cam-fe/src/shared/scan/` |
| `ClipPlayer` | Phát clip Cam 1 / Cam 2 / Ghép (API-40, lấy lại URL một lần khi lỗi), trạng thái PENDING / FAILED / DELETED | `ai-cam-fe/src/shared/media/` |
| API client M2, M3, M4 | `packages.ts` (API-30/31), `clips.ts` (API-40, 42..46), `reports.ts` (API-32), `approvals.ts` (API-13/14/20/21), `live.ts` (API-65), `imports.ts` (API-50..54), `shops.ts` (API-70..73), `settings.ts` (API-80/81), `users.ts` (API-90..92) | `ai-cam-fe/src/lib/api/` |
| `saveBlob(blob, fileName)` | Lưu file tải bằng `api.blob` (file mẫu, file gốc nhập đơn) | `ai-cam-fe/src/shared/download.ts` |
| `signing.py`, `segments.py`, `ffmpeg.py` | Ký URL media; tính khe hở / kế hoạch cắt; dựng lệnh FFmpeg | `ai-cam-be/src/aicam/modules/media/` |
