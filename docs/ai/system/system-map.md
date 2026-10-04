# System map

> Bản đồ hệ thống đang chạy — nền cho reuse-first. Mỗi dòng có nguồn (file/lệnh).
> Ai làm thay đổi hệ thống thì cập nhật file này. Last update: 2026-10-04 · Dev BE (T-6)

**Hiện trạng (2026-10-04):** `ai-cam-be` đã có khung + core + schema (item 01, T-1/T-2/T-6, nhánh `feat/01-packing-mvp`, chưa merge). Chưa có API nghiệp vụ. `ai-cam-fe` có khung + design tokens + UI kit + API client + MSW (M0 xong), chưa có màn nghiệp vụ.
Kiến trúc: [architecture.md](architecture.md).

## Module / component
| Module | Trách nhiệm | Path | Chủ |
|---|---|---|---|
| core | settings, ids (UUID v7), clock giả lập được, db (async, after_commit, rollback), redis, errors (format 02 §6), pagination, security (Argon2id, JWT, Fernet, HMAC), audit, deps (`require_roles`) | `ai-cam-be/src/aicam/core/` | BE |
| modules/* | Hiện chỉ có `models.py` (users, stations, orders, sessions, approvals, media, imports, settings) | `ai-cam-be/src/aicam/modules/` | BE |
| CLI | `aicam create-admin` | `ai-cam-be/src/aicam/entrypoints/cli.py` | BE |
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

## Màn hình / bề mặt UI
| Route / màn | Mục đích | Component chính | Nguồn |
|---|---|---|---|
| — | Chưa có. Dự kiến: SRS §11 | | |

## Tích hợp ngoài
| Hệ thống | Mục đích | Cách gọi | Config |
|---|---|---|---|
| — | Chưa có. Dự kiến: Shopee Open Platform (architecture.md §10) | | |

## Thành phần dùng chung (reuse trước khi viết mới)
| Tên | Dùng cho | Path |
|---|---|---|
| `AppError` + handler | Mọi lỗi API theo 02 §6 | `core/errors.py` |
| `require_roles(...)`, `CurrentPrincipal` | Phân quyền API | `core/deps.py` |
| `audit.record()` | Ghi nhật ký thao tác | `core/audit.py` |
| `after_commit()`, `commit()`, `rollback()` | Publish sự kiện sau commit | `core/db.py` |
| `clock.now()` / `freeze` / `advance` | Giờ hệ thống, test tua giờ | `core/clock.py` |
| `enum_check()` | CHECK enum cho cột text | `core/db.py` |
| UI kit: Button, IconButton, TextField, SelectField, TextAreaField, Alert, StatusChip, LinearProgress, PageHeader, EmptyState, Tabs, SegmentedButtons, AuthCard, Dialog, Pagination, Toast/`toast()`, Skeleton, TrackingNumber, Icon, `cx` | Mọi màn FE | `ai-cam-fe/src/shared/ui/` (xem tại `/_ui` khi `pnpm dev`) |
| Token + class design system (`card`, `md-input`, `md-table`, `state-layer`, `icon`…) | Mọi màn FE | `ai-cam-fe/src/design/` (`pnpm tokens` để sinh lại) |
| `api.get/post/...`, `ApiError`, `onUnauthenticated` | Gọi API (token, refresh 401 một lần, lỗi 02 §6) | `ai-cam-fe/src/lib/api/client.ts`, `errors.ts` |
| `useSession`, `login/logout/fetchMe` | Phiên đăng nhập (access token trong bộ nhớ) | `ai-cam-fe/src/lib/api/session.ts`, `auth.ts` |
| `connectWs()` | WebSocket backoff + ping + 4401 | `ai-cam-fe/src/lib/ws.ts` |
| MSW handlers + dữ liệu mock (`tst_*`, mật khẩu `matkhau123`) | `pnpm dev:mock`, test | `ai-cam-fe/src/mocks/` |
