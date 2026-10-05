# System map

> Bản đồ hệ thống đang chạy — nền cho reuse-first. Mỗi dòng có nguồn (file/lệnh).
> Ai làm thay đổi hệ thống thì cập nhật file này. Last update: 2026-10-05 · Dev (M2 Video bằng chứng xong)

**Hiện trạng (2026-10-05):** item 01 xong M0, M1, M2 trên nhánh `feat/01-packing-mvp` của `ai-cam-be`, `ai-cam-fe` (đã push, chưa merge `main`). BE: auth, station/camera, phiên quét, realtime, cắt clip, tra cứu, giữ clip, xuất MP4, báo cáo ngày, cài đặt, health. FE: station S0–S6, dashboard D1, D2, D3, D4 (+ xuất), D6, D12. Chưa có: vision đọc khay (T-12), duyệt (T-13), Shopee (T-16), nhập CSV (T-17).
Kiến trúc: [architecture.md](architecture.md).

## Module / component
| Module | Trách nhiệm | Path | Chủ |
|---|---|---|---|
| core | settings, ids (UUID v7), clock giả lập được, db (async, after_commit, rollback), redis, errors (format 02 §6), pagination, security (Argon2id, JWT, Fernet, HMAC), audit, deps (`require_roles`) | `ai-cam-be/src/aicam/core/` | BE |
| users | Auth + tài khoản + audit log API (T-7) | `ai-cam-be/src/aicam/modules/users/` | BE |
| stations | Station, camera, MediaMTX client, probe ffmpeg/ONVIF, HealthTracker (T-8) | `ai-cam-be/src/aicam/modules/stations/` | BE |
| vision | J-08 vòng theo dõi camera (đọc mã ở T-12) | `ai-cam-be/src/aicam/modules/vision/`, `entrypoints/vision.py` | BE |
| workers | Celery app, task, lịch beat | `ai-cam-be/src/aicam/workers/` | BE |
| orders | `transition()` (điểm duy nhất đổi trạng thái kho), `upsert_platform_order` (BR-17, EX-P10), kiện chưa xác minh (BR-04) | `ai-cam-be/src/aicam/modules/orders/service.py` | BE |
| orders — tra cứu | API-30 tìm kiện (q, ngày ≤ 92, station, trạng thái, phiên, nguồn), API-31 chi tiết (đơn, sản phẩm, phiên, clip, dòng thời gian) | `ai-cam-be/src/aicam/modules/orders/packages.py`, `orders/router.py` | BE |
| media | `ffmpeg.py` (lệnh cắt `-c copy` / encode xuất), `segments.py` (đọc tên file MediaMTX, khe hở, kế hoạch cắt, timeline), `signing.py` (URL ký HMAC), `jobs.py` (gửi task Celery sau commit), `service.py` (J-10 index + đối soát path MediaMTX, J-01 cắt clip + VIDEO_INCOMPLETE, play-url, giữ clip, cắt lại, J-02 retention), `exports.py` (API-43..45, J-03 overlay `drawtext` + ghép `hstack`, dọn bản xuất 24 giờ), `router.py` | `ai-cam-be/src/aicam/modules/media/` | BE |
| reports | API-32 số liệu ngày + station + mục cần xử lý (cache Redis 5 giây) | `ai-cam-be/src/aicam/modules/reports/` | BE |
| settings | API-80 cài đặt (retention, ngưỡng phiên, audit `SETTINGS_UPDATE`), API-81 sức khỏe hệ thống | `ai-cam-be/src/aicam/modules/settings/` (`router.py`, `service.py`) | BE |
| platforms | `PlatformAdapter` + model chung, `MockAdapter` (dữ liệu SPXTST…), `get_adapter()` | `ai-cam-be/src/aicam/modules/platforms/` | BE |
| sessions | State machine phiên, API-10/11, advisory lock theo station, dedup quét | `ai-cam-be/src/aicam/modules/sessions/` | BE |
| modules khác | `approvals`, `imports`: hiện có `models.py` (+ `approvals/queries.py`, hàm dọn `imports` cho J-11) | `ai-cam-be/src/aicam/modules/` | BE |
| CLI | `aicam create-admin`, `aicam seed-demo` (TST…, mật khẩu matkhau123) | `ai-cam-be/src/aicam/entrypoints/cli.py` | BE |
| MediaMTX + camera giả | Relay RTSP, ghi fMP4 60 giây, chạy uid 10001; dev chỉ giữ video thô 1 giờ (`recordDeleteAfter: 1h`, sau sự cố đầy ổ 64 GB); `fake-cam1/2` cho dev | `ai-cam-be/docker/mediamtx.yml`, `docker/compose.dev.yml` | BE |
| Compose dev | `postgres`, `redis`, `video-init` (tạo `/data/video/{raw,clips,exports}`, chown uid 10001), `mediamtx`, `api`, `vision`, `worker` (`-Q default,video,sync`), `worker-export` (`-Q export -c 1`), `beat`, camera giả | `ai-cam-be/docker/compose.dev.yml` | BE |
| Spike S3 | Đo cắt clip, encode bản xuất (T-5) | `ai-cam-be/scripts/spike_s3.py`, `spike_s3_encode.sh` | BE |

## Data
| Thực thể | Nơi lưu | Field chính | Nguồn định nghĩa |
|---|---|---|---|
| 19 bảng: user, refresh_token, station, camera, shop, order, order_item, package, status_history, session, session_event, scan_dedup, approval_request, video_segment, clip, export, csv_import, setting, audit_log | PostgreSQL | Theo 02a §3 (+ `session.mismatch`, DEC-39) | `ai-cam-be/alembic/versions/0001_initial.py`, `src/aicam/modules/*/models.py` |
| Migration 0002 | PostgreSQL | `clip.deleted_at`, `clip.timeline` (jsonb: giây trong clip → giờ thực từng đoạn, cho overlay giờ bản xuất) | `ai-cam-be/alembic/versions/0002_clip_timeline.py` (DEC-102 02a) |
| Video thô | Volume `video` → `/data/video/raw/cam-<camera_id>/YYYY/MM/DD/HH-MM-SS-ffffff.mp4` (UTC) | segment 60 giây; J-02 xóa theo `retention_raw_days` (30) | `ai-cam-be/docker/mediamtx.yml` |
| Clip gốc | `/data/video/clips/YYYY/MM/DD/<session_id>-<CAM1\|CAM2>.mp4`, chỉ đọc | stream copy, SHA-256 trong `clip.sha256`; J-02 xóa theo `retention_clip_days` (90) trừ clip giữ | `modules/media/service.py` (`clip_rel_path`) |
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
| Redis `tray:{station_id}` (vision ghi, TTL 5 giây — T-12) | Mã Cam 2 đang thấy trên khay | nội bộ | `modules/sessions/tray.py` |
| Redis `camera.health` (vision → api), `vision.config` (api → vision) | Trạng thái camera, nạp lại ROI | nội bộ | `modules/stations/listeners.py`, `modules/vision/health_loop.py` |
| Celery `stations.check_clock_drift` (J-09, 10 phút) | Đo lệch giờ ONVIF | nội bộ | `workers/tasks.py` |
| API-30, API-31 `GET /packages`, `GET /packages/{id}` | Tra cứu kiện, chi tiết kiện | ADMIN, SUPERVISOR, CSKH | `modules/orders/router.py`, `orders/packages.py` |
| API-32 `GET /reports/daily?date=` | Số liệu ngày, station, mục cần xử lý (`CLIP_FAILED`, `DISK_USAGE` ≥ 80 %…) | ADMIN, SUPERVISOR, CSKH | `modules/reports/router.py` |
| API-40, API-41 `GET /clips/{id}/play-url`, `GET /media/clips/{id}?uid=&exp=&sig=` | URL ký 10 phút; phát Range, audit `VIEW_CLIP` từ byte 0 | ADMIN, SUPERVISOR, CSKH; STATION (phiên station mình, trong ngày) / chữ ký | `modules/media/router.py` |
| API-42 `PUT /clips/{id}/hold` | Giữ / bỏ giữ clip | ADMIN, SUPERVISOR, CSKH | `modules/media/router.py` |
| API-43..45 `POST /sessions/{id}/exports`, `GET /exports/{id}`, `GET /media/exports/{id}/{video.mp4\|info.json}` | Xuất MP4 có overlay + JSON hash; tải | ADMIN, SUPERVISOR, CSKH / người tạo + ADMIN (khác → 404) / chữ ký | `modules/media/router.py`, `media/exports.py` |
| API-46 `POST /sessions/{id}/clips/rebuild` | Cắt lại clip FAILED | ADMIN, SUPERVISOR | `modules/media/router.py` |
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
| `/admin/settings/stations`, `/new`, `/:id` (D6) | Station, tài khoản station, Cam 1 / Cam 2, kiểm tra kết nối | `StationsListPage`, `StationEditPage`, `CameraForm` | `ai-cam-fe/src/features/admin/` |
| `/_ui` (chỉ `pnpm dev`) | Xem UI kit | `UiGallery` | `ai-cam-fe/src/app/` |

## Test & QA
| Bộ | Lệnh | Nguồn |
|---|---|---|
| BE unit + integration | `cd ai-cam-be && uv run pytest` (Postgres :55432, Redis :56379 db15) | `ai-cam-be/tests/{unit,integration}` |
| QA API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa` (qa-reset dọn cả volume video) | `ai-cam-be/tests/qa/test_m1_live.py`, `test_m2_live.py` |
| FE unit/integration (MSW) | `cd ai-cam-fe && pnpm test` | `ai-cam-fe/src/**/*.test.ts(x)` |
| E2E mock / BE thật | `pnpm e2e` (MSW, :5180) · `pnpm e2e:real` (dev server :5181 → api :8180, reset dữ liệu mỗi test) | `ai-cam-fe/e2e/{mock,real}`, `playwright.real.config.ts` |

## Config (BE, 02a §9)
| Biến | Mặc định | Dùng cho |
|---|---|---|
| `VIDEO_ROOT` | `/data/video` | Gốc video (`raw/`, `clips/`, `exports/`) |
| `CLIP_PADDING_S`, `CLIP_SETTLE_S`, `CLIP_GAP_TOLERANCE_S`, `CLIP_CUT_TIMEOUT_S`, `SEGMENT_CLOSED_AFTER_S` | `5`, `3`, `1.5`, `90`, `15` | J-01, J-10 |
| `MEDIA_SIGNING_KEY`, `MEDIA_URL_TTL_S` | secret, `600` | URL ký API-40/44 |
| `EXPORT_PRESET`, `EXPORT_SIDE_SCALE`, `EXPORT_TTL_HOURS`, `EXPORT_TIMEOUT_S`, `EXPORT_FONT_FILE` | `veryfast`, `1280:720`, `24`, `600`, Be Vietnam Pro SemiBold | J-03 (hạ preset / kích thước khi server chậm — RB-7) |
| `IMPORT_ROOT` | `/data/imports` | File CSV gốc (T-17), J-11 xóa sau 90 ngày |

## Tích hợp ngoài
| Hệ thống | Mục đích | Cách gọi | Config |
|---|---|---|---|
| MediaMTX API v3 (v1.21.1) | Thêm/sửa/xóa path camera, đọc `ready` + `inboundBytes`; J-10 thêm lại path bị mất, xóa path `cam-<uuid>` mồ côi | `HttpMediaMTX` | `MEDIAMTX_API_URL` |
| FFmpeg / ffprobe (trong image BE) | Cắt clip `-c copy`, đo thời lượng, encode bản xuất H.264 + `drawtext` (font Be Vietnam Pro) | subprocess, `modules/media/ffmpeg.py` | `VIDEO_ROOT`, `CLIP_*`, `EXPORT_*` (02a §9) |
| Camera ONVIF | `GetSystemDateAndTime` (J-09) | SOAP qua httpx | — |
| Shopee Open Platform | Chưa có (T-16) | | |

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
| `api.get/post/...`, `ApiError`, `onUnauthenticated` | Gọi API (token, refresh 401 một lần, lỗi 02 §6) | `ai-cam-fe/src/lib/api/client.ts`, `errors.ts` |
| `useSession`, `login/logout/fetchMe` | Phiên đăng nhập (access token trong bộ nhớ) | `ai-cam-fe/src/lib/api/session.ts`, `auth.ts` |
| `connectWs()` | WebSocket backoff + ping + 4401 | `ai-cam-fe/src/lib/ws.ts` |
| MSW handlers + dữ liệu mock (`tst_*`, mật khẩu `matkhau123`), `StationSim` (state machine phiên), mock WS | `pnpm dev:mock`, test | `ai-cam-fe/src/mocks/` |
| `RequireRole`, `useAuth` | Guard theo vai, khôi phục phiên khi tải trang | `ai-cam-fe/src/features/auth/` |
| `useScanListener` / `ScanBuffer` | Nhận máy quét HID (≤ 50 ms/phím + Enter) | `ai-cam-fe/src/shared/scan/` |
| `ClipPlayer` | Phát clip Cam 1 / Cam 2 / Ghép (API-40, lấy lại URL một lần khi lỗi), trạng thái PENDING / FAILED / DELETED | `ai-cam-fe/src/shared/media/` |
| API client M2 | `packages.ts` (API-30/31), `clips.ts` (API-40, 42..46), `reports.ts` (API-32) | `ai-cam-fe/src/lib/api/` |
| `signing.py`, `segments.py`, `ffmpeg.py` | Ký URL media; tính khe hở / kế hoạch cắt; dựng lệnh FFmpeg | `ai-cam-be/src/aicam/modules/media/` |
