# Project profile

> Adapter giữa bộ skill `ai-*` và dự án này. Skill đọc file này thay vì đoán.
> Last update: 2026-10-04 · ai-flow-init

## 1. Tổng quan
| Trường | Giá trị |
|---|---|
| Tên dự án | Hệ thống X (AI-cam-shop-management) |
| Loại | monorepo (nhiều loại): repo gốc chứa tài liệu + 2 repo con độc lập `ai-cam-be`, `ai-cam-fe` |
| Mô tả 1 câu | Ghi hình 2 camera và đối soát quy trình đóng gói / nhận hàng hoàn cho shop bán trên Shopee, TikTok Shop |
| Có UI người dùng | yes (station kiosk + web dashboard) |
| Quy mô | M, solo dev giữ mọi vai qua `ai-solo-build-feature` (user chốt 2026-10-04) |
| Ngôn ngữ tài liệu | vi |
| `docs_root` | docs/ai |

## 2. Thành phần (component)

Cả hai repo con **chưa có code** (đã quét 2026-10-04: chỉ có `.git`). Lệnh dưới đây là **dự kiến** theo [architecture.md §2, §14, §15](../docs/ai/system/architecture.md); cập nhật khi dựng khung repo.

| Component | Loại `be`/`fe` | Path | Ngôn ngữ / framework | build | lint | test | run (local) |
|---|:---:|---|---|---|---|---|---|
| ai-cam-be | be | `ai-cam-be/` (git riêng, remote github.com/khanhego/ai-cam-be) | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Celery, Redis, PostgreSQL 16, MediaMTX, FFmpeg, OpenCV, zxing-cpp | `cd ai-cam-be && docker build -f docker/Dockerfile -t aicam .` | `cd ai-cam-be && uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run lint-imports` | `cd ai-cam-be && uv run pytest` | `cd ai-cam-be && docker compose -f docker/compose.dev.yml up --build` (api :8180, postgres :55432, redis :56379) |
| ai-cam-fe | fe | `ai-cam-fe/` (git riêng, remote github.com/khanhego/ai-cam-fe) | TypeScript, React 19, Vite 8, Tailwind 4 + design system MD3 (`docs/design-system/`), TanStack Query, Zustand, React Router 7, openapi-fetch, MSW | `cd ai-cam-fe && pnpm build` | `cd ai-cam-fe && pnpm lint && pnpm format:check && pnpm typecheck` | `cd ai-cam-fe && pnpm test` · e2e: `pnpm e2e` | `cd ai-cam-fe && pnpm dev` (:5180, proxy API :8180) · `pnpm dev:mock` |

Client FE: một app, hai bề mặt → spec FE đặt tên `02b-fe-spec-station.md` và `02b-fe-spec-admin.md` khi item chạm cả hai.

## 3. Nguồn sự thật của hệ thống hiện tại
| Loại | Ở đâu (file / lệnh / URL) |
|---|---|
| Yêu cầu hệ thống | `docs/ai/system/SRS.md` |
| Kiến trúc tổng thể | `docs/ai/system/architecture.md` |
| Design system (UI) | `docs/design-system/README.md`, `tokens.json`; component tham chiếu `components/` |
| Quyết định kiến trúc | `docs/ai/system/decisions/ADR-*.md` |
| Schema dữ liệu | `ai-cam-be/alembic/versions/`, `ai-cam-be/src/aicam/modules/*/models.py`, `core/audit.py` |
| Interface / API | (dự kiến) OpenAPI sinh từ FastAPI tại `/openapi.json` — chưa tồn tại |
| Màn hình / route UI | (dự kiến) `ai-cam-fe/src/app/` router — chưa tồn tại |
| Cấu hình / env | (dự kiến) `.env.example` trong mỗi repo con — chưa tồn tại |

## 4. Quy trình mã nguồn
| Trường | Giá trị |
|---|---|
| VCS host | github (`git remote -v`: github.com/khanhego/AI-cam-shop-managment, ai-cam-be, ai-cam-fe) |
| Nhánh gốc | main |
| Mẫu nhánh | feat/<NN>-<slug> · fix/<NN>-<slug> · proto/<NN>-<slug> · chore/<NN>-<slug> (tạo trong repo con bị chạm) |
| Đích PR | main |
| Quy ước commit | Conventional Commits (architecture.md §15) |
| CI | (dự kiến) GitHub Actions trong từng repo con — chưa có |
| Agent được commit? | chỉ khi user yêu cầu (user chốt 2026-10-04) |

## 5. Tracker
| Trường | Giá trị |
|---|---|
| Loại | github (user chốt 2026-10-04) |
| Project / board | Issue trong repo con bị chạm (`khanhego/ai-cam-be`, `khanhego/ai-cam-fe`); board chưa rõ |
| Cách tạo ticket | `gh issue create` — chỉ khi user cho phép từng lần |

## 6. Môi trường & release
| Môi trường | URL / đích | Cách deploy | Ai được deploy | Rollback |
|---|---|---|---|---|
| local | máy dev, `compose.dev.yml`, camera giả qua MediaMTX | `docker compose up` | dev | — |
| staging | mini PC thử tại kho hoặc VPS — chưa rõ | (dự kiến) `docker compose pull && up -d` | chưa rõ | ghim tag image trước |
| production | server tại kho (`https://x.local`) — chưa có | (dự kiến) `docker compose pull && up -d`, Alembic migrate trước `api` | chưa rõ | ghim tag image trước + restore `pg_dump` |

## 7. Vai trò
| Vai | Người |
|---|---|
| PO | khanhtt (solo, chạy `ai-solo-build-feature`) — nghiệp vụ do chủ shop xác nhận |
| UX | khanhtt (solo, chạy `ai-solo-build-feature`) |
| Architect | khanhtt (solo, chạy `ai-solo-build-feature`) |
| Tech lead (review, G2/G3) | khanhtt (solo, chạy `ai-solo-build-feature`) |
| PM | khanhtt (solo, chạy `ai-solo-build-feature`) |
| Dev BE | khanhtt (solo, chạy `ai-solo-build-feature`) |
| Dev FE | khanhtt (solo, chạy `ai-solo-build-feature`) |
| QA | khanhtt (solo, chạy `ai-solo-build-feature`) |
| Ops | khanhtt (solo, chạy `ai-solo-build-feature`) |

Git user hiện tại: `khanhtt`.

## 8. Definition of Done (bổ sung cho dự án)
- [ ] build + lint + test pass (hoặc không thêm lỗi so với baseline)
- [ ] test mới cho hành vi mới
- [ ] `system-map.md` cập nhật nếu đổi data/API/màn
- [ ] State machine phiên, rule BR-xx bị chạm có test (architecture.md §15)
- [ ] Đổi API → OpenAPI cập nhật, FE sinh lại client
- [ ] Thời gian lưu UTC, lấy qua `core.clock`

**Baseline (2026-10-04):** không chạy được — cả hai repo con chưa có code.
**ai-cam-be sau T-1 (2026-10-04):** ruff ✅ · mypy strict ✅ (22 file) · lint-imports 2/2 ✅ · pytest 2 passed · docker build ✅ · compose dev healthz 200. FFmpeg trong image: 5.1 (Debian bookworm).
**ai-cam-be sau T-6 (2026-10-04):** ruff ✅ · format ✅ · mypy strict ✅ (40 file) · lint-imports 2/2 ✅ · pytest 36 passed (26 unit + 10 integration, cần Postgres dev :55432) · `alembic check` khớp model.
**ai-cam-fe sau M0 (2026-10-04):** lint ✅ · prettier ✅ · tsc ✅ · vitest 86 passed · build ✅ (không chứa MSW) · playwright e2e 1 passed.

## 9. Ràng buộc & lưu ý riêng
- Repo gốc chỉ chứa tài liệu; `ai-cam-be/`, `ai-cam-fe/` bị `.gitignore` ở repo gốc, commit trong repo con.
- Tài liệu viết Markdown trong `docs/ai/`, không dùng Claude Docs / cloud.
- Clip gốc bất biến, không encode lại (ADR-008).
- Station phải chạy được khi mất Internet (ADR-001, NFR-09).
- Mọi thao tác xem / xuất / xóa clip phải ghi audit log (NFR-15).
