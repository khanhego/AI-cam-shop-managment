---
name: ai-fe-write-spec
description: >-
  Vai FE lead / dev frontend (web, mobile, desktop): từ màn trong SRS §10 và API contract trong
  02-tech-spec.md viết FE Spec (02b-fe-spec-<client>.md) — phạm vi màn & route, điều hướng, cây component
  (reuse), state & data fetching, form & validate, trạng thái UI, phân quyền UI, xử lý lỗi API, i18n/a11y/
  responsive, riêng nền tảng, analytics, mock khi BE chưa xong, test FE, task. Dùng khi user là FE/frontend/
  mobile dev, viết FE spec, thiết kế màn hình phía code, state management.
---

# ai-fe-write-spec — 02b FE spec (một file mỗi client)

Đọc `../ai-shared/CONVENTIONS.md` + profile (component `fe`) + luật repo + `01` (§10 màn, ma trận quyền) + `02` (§6 contract).
Mẫu: `../ai-shared/templates/02b-fe-spec.md`. Nhiều client bị chạm → hỏi làm client nào trước; mỗi client một file.
**Input:** `02` §6 + `01` §10. **Output:** `02b-fe-spec-<client>.md` · `00-status`.

## 1. Đọc code FE thật
Router/navigation, layout, design system & component dùng chung, cách gọi API (client, interceptor, codegen),
state management, form lib, i18n, test setup, cơ chế mock sẵn có.

## 2. Viết theo template
1. **§1 Phạm vi** — mọi màn trong SRS §10 thuộc client này + FR coverage cột FE trong `02`. Mỗi màn REUSE/EXTEND/NEW.
2. **§2 Điều hướng** (guard theo quyền) · **§3 Cây component** (reuse trước, ghi path).
3. **§4 State & data fetching** — mỗi dữ liệu: API-xx · nơi giữ state · cache/làm mới · optimistic.
4. **§5 Form & validate** — rule client + map lỗi server vào field.
5. **§6 Trạng thái UI** đủ loading/empty/error/forbidden/success cho từng màn.
6. **§7 Phân quyền UI** (UI chỉ ẩn/disable; server là nơi chặn) · **§8 Xử lý lỗi API** theo bảng lỗi `02`.
7. **§9** chữ/i18n/a11y/responsive · **§10** riêng nền tảng (web: SEO/browser/bundle; mobile: quyền thiết bị/offline/push/OS/store).
8. **§11** analytics · **§12 Mock** đúng contract qua lớp gọi API sẵn có · **§13 Test FE** · **§14 Task**.

Không đổi contract; thiếu field/API → *Phản hồi* cho architect. Thiếu màn/chữ → *Phản hồi* cho PO/UX.

## 3. Tự soát → handoff
Mọi màn §10 và FR cột FE có dòng; mọi API-xx dùng có xử lý lỗi; mọi task truy về màn/FR.
Trạng thái In review → hỏi: `ai-lead-review` (spec) · client tiếp theo · dừng.
