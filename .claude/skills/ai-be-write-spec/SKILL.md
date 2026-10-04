---
name: ai-be-write-spec
description: >-
  Vai BE lead / dev backend: từ API contract và data model chung (02-tech-spec.md) viết BE Spec
  (02a-be-spec.md) cho component phía server (API, service, worker/job, CLI, data pipeline, thư viện) —
  cấu trúc code theo kiến trúc repo, schema chi tiết & migration, implement từng API (validate, authz,
  transaction, lỗi), BR → nơi thực thi, concurrency, job/queue/tích hợp, cache, config, observability,
  test BE, task. Dùng khi user là BE/backend, viết BE spec, thiết kế schema/migration, thiết kế service.
---

# ai-be-write-spec — 02a BE spec

Đọc `../ai-shared/CONVENTIONS.md` + profile (component `be`, ràng buộc §9) + luật repo (`CLAUDE.md`, skill dự án) + `01` + `02`.
Mẫu: `../ai-shared/templates/02a-be-spec.md`. Nhiều component BE → hỏi gộp một file hay `02a-be-spec-<component>.md`.
**Input:** `02` có §5–§6. **Output:** `02a-be-spec*.md` · `00-status`.

## 1. Đọc code BE thật
Kiến trúc layer/module, pattern đang dùng (repository, service, DTO, error handling), ORM & cách viết migration,
job framework, test setup. Tìm helper/module tái dùng được.

## 2. Viết theo template
1. **§1 Phạm vi** — mọi API-xx/job/lệnh BE phải phủ (lấy từ FR coverage cột BE trong `02`).
2. **§2 Cấu trúc code** — file mới/sửa theo đúng layer của repo.
3. **§3 Data** — field, kiểu, null, default, index, ràng buộc; migration (tương thích ngược với code đang chạy, backfill,
   down); dữ liệu nhạy cảm.
4. **§4 Implement API** — validate · authz ở đâu · logic · transaction/lock · lỗi (đúng mã trong `02` §6).
5. **§5 BR → nơi thực thi** — server/constraint/job, không dựa vào FE. **§6** concurrency & idempotency.
6. **§7** job/queue/tích hợp (retry, timeout, lỗi cuối) · **§8** cache · **§9** config/secret/flag · **§10** observability.
7. **§11 Test BE** (unit/integration/contract) · **§12 Task** (≤ 1–2 ngày, có phụ thuộc).

Không đổi contract trong file này. Contract thiếu/sai → *Phản hồi* cho architect, ghi Q mở.

## 3. Tự soát → handoff
Mọi API-xx/BR/NFR của BE có dòng; migration có rollback; mọi task truy về FR/API.
Trạng thái In review → hỏi: `ai-lead-review` (spec) · chờ FE spec rồi review cả bộ · dừng.
