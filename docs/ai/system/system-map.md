# System map

> Bản đồ hệ thống đang chạy — nền cho reuse-first. Mỗi dòng có nguồn (file/lệnh).
> Ai làm thay đổi hệ thống thì cập nhật file này. Last update: 2026-10-05 · Dev (review + QA M1)

**Hiện trạng (2026-10-04):** `ai-cam-be` đã có khung + core + schema (item 01, T-1/T-2/T-6, nhánh `feat/01-packing-mvp`, chưa merge). Chưa có API nghiệp vụ. `ai-cam-fe` có khung + design tokens + UI kit + API client + MSW (M0 xong), chưa có màn nghiệp vụ.
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
| platforms | `PlatformAdapter` + model chung, `MockAdapter` (dữ liệu SPXTST…), `get_adapter()` | `ai-cam-be/src/aicam/modules/platforms/` | BE |
| sessions | State machine phiên, API-10/11, advisory lock theo station, dedup quét | `ai-cam-be/src/aicam/modules/sessions/` | BE |
| modules khác | Hiện có `models.py` (+ `approvals/queries.py`, `settings/service.py`) | `ai-cam-be/src/aicam/modules/` | BE |
| CLI | `aicam create-admin`, `aicam seed-demo` (TST…, mật khẩu matkhau123) | `ai-cam-be/src/aicam/entrypoints/cli.py` | BE |
| MediaMTX + camera giả | Relay RTSP, ghi fMP4 60 giây; `fake-cam1/2` cho dev | `ai-cam-be/docker/` | BE |

## Data
| Thực thể | Nơi lưu | Field chính | Nguồn định nghĩa |
|---|---|---|---|
| 19 bảng: user, refresh_token, station, camera, shop, order, order_item, package, status_history, session, session_event, scan_dedup, approval_request, video_segment, clip, export, csv_import, setting, audit_log | PostgreSQL | Theo 02a §3 (+ `session.mismatch`, DEC-39) | `ai-cam-be/alembic/versions/0001_initial.py`, `src/aicam/modules/*/models.py` |
| Video thô | Volume `video` → `/data/video/raw/<path>/YYYY/MM/DD/HH-MM-SS-ffffff.mp4` (UTC) | segment 60 giây | `ai-cam-be/docker/mediamtx.yml` |

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

## Màn hình / bề mặt UI
| Route / màn | Mục đích | Component chính | Nguồn |
|---|---|---|---|
| `/station/login` (S0) | Đăng nhập station | `StationLoginPage` | `ai-cam-fe/src/features/station/` |
| `/station` (S1–S6 theo `state`) | Màn đóng gói kiosk: sẵn sàng + phiên gần đây, đang đóng gói, lệch mã, cảnh báo, chờ duyệt, mất kết nối | `StationPage`, `*Panel`, `AlertOverlay`, `DisconnectedOverlay`, `CancelSessionDialog` | `ai-cam-fe/src/features/station/` |
| `/admin/login` (D1) | Đăng nhập dashboard, `?next=` | `AdminLoginPage` | `ai-cam-fe/src/features/admin/` |
| `/admin` (khung) | App bar, drawer theo vai, theme, D12 `/admin/forbidden`, 404; WS-02 `useDashboardSocket` (`camera.status` → invalidate D6) | `AppShell`, `AdminHome`, `ErrorPages`, `useDashboardSocket` | `ai-cam-fe/src/features/shell/` |
| `/admin/settings/stations`, `/new`, `/:id` (D6) | Station, tài khoản station, Cam 1 / Cam 2, kiểm tra kết nối | `StationsListPage`, `StationEditPage`, `CameraForm` | `ai-cam-fe/src/features/admin/` |
| `/_ui` (chỉ `pnpm dev`) | Xem UI kit | `UiGallery` | `ai-cam-fe/src/app/` |

## Test & QA
| Bộ | Lệnh | Nguồn |
|---|---|---|
| BE unit + integration | `cd ai-cam-be && uv run pytest` (Postgres :55432, Redis :56379 db15) | `ai-cam-be/tests/{unit,integration}` |
| QA API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa` | `ai-cam-be/tests/qa/test_m1_live.py` |
| FE unit/integration (MSW) | `cd ai-cam-fe && pnpm test` | `ai-cam-fe/src/**/*.test.ts(x)` |
| E2E mock / BE thật | `pnpm e2e` (MSW, :5180) · `pnpm e2e:real` (dev server :5181 → api :8180, reset dữ liệu mỗi test) | `ai-cam-fe/e2e/{mock,real}`, `playwright.real.config.ts` |

## Tích hợp ngoài
| Hệ thống | Mục đích | Cách gọi | Config |
|---|---|---|---|
| MediaMTX API v3 (v1.21.1) | Thêm/sửa/xóa path camera, đọc `ready` + `inboundBytes` | `HttpMediaMTX` | `MEDIAMTX_API_URL` |
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
| `ClipPlayer` | Phát clip Cam 1 / Cam 2 (API-40) | `ai-cam-fe/src/shared/media/` |
