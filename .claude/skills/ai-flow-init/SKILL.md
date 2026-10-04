---
name: ai-flow-init
description: >-
  Khởi tạo bộ skill ai-* cho một repo bất kỳ: quét code nhận diện loại dự án, stack, component (be/fe),
  lệnh build/lint/test/run, CI, nguồn schema/API/route, đo baseline, rồi sinh .ai/profile.md và
  docs/ai/system/system-map.md. Dùng khi repo chưa có .ai/profile.md, khi user nói init, setup
  quy trình, onboard dự án, hoặc stack/hạ tầng đổi cần cập nhật profile.
---

# ai-flow-init — hồ sơ dự án + bản đồ hệ thống

Đọc `../ai-shared/CONVENTIONS.md`. Mẫu: `../ai-shared/templates/profile.md`, `system-map.md`.
**Output:** `.ai/profile.md` · `<docs_root>/system/system-map.md` · thư mục `items/`, `system/decisions/`.

## 1. Quét (chỉ đọc)
| Tìm | Dấu hiệu |
|---|---|
| Component & ngôn ngữ | `package.json`, `pyproject.toml`/`requirements*.txt`, `go.mod`, `Cargo.toml`, `pom.xml`/`build.gradle`, `pubspec.yaml`, `*.csproj`, `Gemfile`, `composer.json`, workspace config (pnpm/turbo/nx) |
| Loại `be`/`fe` | có route/page/screen/UI framework → `fe`; server, worker, CLI, pipeline, lib → `be` |
| Lệnh | scripts trong manifest, `Makefile`/`justfile`/`Taskfile`, CI workflow, README |
| Schema / interface / route | migrations, ORM models, OpenAPI/proto/GraphQL, router/controller, file route UI |
| CI / deploy | `.github/workflows`, `.gitlab-ci.yml`, `Dockerfile`, compose, k8s/helm/terraform, cấu hình PaaS |
| VCS | `git remote -v`, nhánh mặc định, mẫu tên nhánh trong lịch sử |
| Luật có sẵn | README, `docs/`, `CLAUDE.md`/`AGENTS.md`, CONTRIBUTING, skill dự án |

## 2. Đo baseline
Chạy `build`/`lint`/`test` từng component (lệnh tốn tài nguyên/cần secret → hỏi trước). Ghi thật: pass · fail (số lỗi) ·
không chạy được (lý do). Đây là mốc mà `ai-be-implement` / `ai-fe-implement` đối chiếu.

## 3. Hỏi phần không suy được (≤ 4 câu/lượt, option có khuyến nghị)
Quy mô S/M/L · tracker · môi trường & cách deploy · ai giữ vai nào · agent có được commit không.

## 4. Ghi
Profile theo template (mọi trường có nguồn hoặc "chưa rõ"). `system-map.md` mỗi dòng có nguồn; repo lớn → mức module,
đánh dấu phần chưa quét. Repo có `CLAUDE.md`/`AGENTS.md` → hỏi có thêm dòng trỏ tới `.ai/profile.md` không.

## 5. Báo & handoff
Stack · component (be/fe) · baseline · chỗ "chưa rõ" → hỏi chuyển `ai-flow-route`.
Chế độ cập nhật (profile đã có): quét lại, in diff profile vs thực tế, hỏi từng thay đổi rồi mới ghi.
