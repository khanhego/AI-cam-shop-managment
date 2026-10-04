---
name: ai-architect-write-spec
description: >-
  Vai Architect: từ SRS viết Tech Spec tổng quan & hợp đồng chung (02-tech-spec.md) — TL;DR, goals/non-goals,
  hiện trạng & tác động (REUSE/EXTEND/NEW có bằng chứng), kiến trúc, data model chung, API contract đầy đủ
  request/response/lỗi/quyền, luồng end-to-end, quyết định xuyên suốt (auth, bảo mật, NFR, observability),
  phương án, rollout/rollback — để BE, FE, QA làm song song; cập nhật ADR. Dùng khi user là architect /
  tech lead, viết tech spec, design doc, API contract, kiến trúc, chore kỹ thuật lớn.
---

# ai-architect-write-spec — 02 tổng quan + contract

Đọc `../ai-shared/CONVENTIONS.md` (§2, §4, §9) + profile + `01` (+ `system/SRS.md`, ADR liên quan).
Mẫu: `../ai-shared/templates/02-tech-spec.md`.
**Input:** `01` G1 ✅ (lane chore: không cần — §1–§2 nêu mục tiêu kỹ thuật + tiêu chí xong đo được).
**Output:** `02-tech-spec.md` · file OpenAPI/proto/GraphQL của dự án (nếu có) · `system/decisions/ADR-*.md` (quyết định lớn)
· `system-map.md` (phần lệch code) · `00-status`.

## 1. Đọc hệ thống thật
Profile §3 + `system-map.md` + code. `system-map.md` lệch code → cập nhật phần liên quan trước.

## 2. Viết `02` — chỉ phần CHUNG
1. TL;DR · bối cảnh (link P#/FR) · Goals/Non-goals.
2. **§3 Tác động** — mỗi thành phần: component (be/fe) · hiện có (file:line) · REUSE/EXTEND/NEW. NEW khi có thứ gần giống → hỏi.
3. **§4 Kiến trúc** — sơ đồ + bảng thành phần → spec con nào (02a / 02b-<client>).
4. **§5 Data model chung** — thực thể, quan hệ, field chính (kiểu chi tiết, index, migration để `02a`).
5. **§6 API contract** — mọi API-xx: method/path hoặc event, quyền, FR, client dùng; API chính có request/response mẫu +
   bảng lỗi kèm cột "FE xử lý". Quy ước chung (auth, phân trang, format lỗi, thời gian, version).
6. **§7 Luồng end-to-end** (sequence UC chính) · **§8 Quyết định xuyên suốt** · **§9 Phương án** (≥ 2 cho quyết định
   không hiển nhiên; lớn → ADR) · **§10 Rollout** thứ tự giữa component · **§11 Rủi ro**.
7. Phụ lục FR coverage (cột BE/FE để biết spec con nào phải phủ).

**Không** viết chi tiết implement (cấu trúc code, component tree, state, job internals) — đó là `02a`/`02b`.
Mỗi lựa chọn có hệ quả → hỏi 2–3 option → DEC. Theo kiến trúc sẵn có; phá quy ước phải có DEC.

## 3. Tự soát
"Dev BE và dev FE chỉ đọc §6 có làm song song được không?" — mọi field có tên, kiểu, bắt buộc/không; mọi lỗi có mã.
FR không phủ được → *Phản hồi* cho PO.

## 4. Handoff
`02` trạng thái In review. Hỏi: `ai-be-write-spec` và `ai-fe-write-spec` (song song, theo component bị chạm) · soát trước
bằng `ai-lead-review` · dừng. Quy mô S: được viết luôn 02a/02b ngắn trong lượt này nếu user chọn.

## Đổi contract sau G2
Cập nhật `02` (tăng phiên bản, DEC) + *Phản hồi* cho BE, FE, QA.
