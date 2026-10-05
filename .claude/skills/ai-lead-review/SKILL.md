---
name: ai-lead-review
description: >-
  Vai Tech Lead / Reviewer: soát SRS, bộ tech spec (02 + 02a BE + 02b FE), plan, hoặc code (diff/nhánh/PR)
  theo checklist riêng từng loại — với code phân biệt checklist BE và FE — trả về findings có bằng chứng xếp
  theo mức độ và verdict; chốt G2 cho bộ spec và G3 cho code. Dùng khi user nói review, soát, code review,
  PR review, kiểm tra spec, chốt G2, chốt G3.
---

# ai-lead-review — review · G2 · G3

Đọc `../ai-shared/CONVENTIONS.md` + profile + đối tượng soát + input của nó (soát spec → `01`; soát code → `01`, `02`, `02a`/`02b`, task).
Hỏi đối tượng nếu chưa rõ: `01` · bộ spec `02/02a/02b` · `03` · code BE · code FE (diff hiện tại / nhánh / PR số).
**Output:** findings (in ra + tóm tắt vào *Phản hồi* của `00-status`) · tick G2/G3 khi user duyệt.

## Checklist

**01 SRS:** bài toán & chỉ số rõ · FR kiểm được, có nguồn · AC có cách kiểm · BR có ví dụ · EX đủ cho quy trình chính ·
NFR có con số · ma trận quyền đủ · không lẫn thiết kế kỹ thuật · truy vết P → FR → AC đủ.

**Bộ spec (G2):**
- `02`: FR coverage đủ · REUSE/EXTEND/NEW có bằng chứng · contract đủ field/kiểu/bắt buộc/lỗi/quyền · quyết định xuyên suốt · rollout/rollback.
- `02a`: phủ mọi API-xx BE · migration tương thích ngược + down · authz ở server · BR thực thi ở server/DB · concurrency/idempotency · job retry/timeout · observability · task truy về FR.
- `02b`: phủ mọi màn §10 của client · dùng đúng API-xx · đủ 5 trạng thái UI · xử lý mọi mã lỗi · phân quyền UI khớp ma trận · reuse component · mock đúng contract · task truy về màn/FR.
- **Nhất quán chéo:** 02a và 02b không lệch contract `02`; tên field/mã lỗi giống nhau; không có API FE dùng mà BE không làm.

**03 Plan:** mọi FR mức M có task BE/FE tương ứng · phụ thuộc BE → FE đúng · task nền (migration, contract mock, flag) có.

**Code BE (G3):** đúng spec & contract (shape, mã lỗi) · authz mọi endpoint · validate input · injection/secret/log dữ liệu nhạy cảm ·
transaction/race/idempotency · migration an toàn · test BR + integration thật sự kiểm hành vi · không thêm lỗi build/lint/test (tự chạy lại) ·
không ngoài phạm vi · theo pattern repo · system-map cập nhật.

**Code FE (G3):** đúng màn & luồng spec · đủ trạng thái loading/empty/error/forbidden · xử lý lỗi API · không tin dữ liệu client cho quyền ·
reuse component/design system · không route tạm trong nav thật · mock không lọt production · a11y cơ bản · i18n · test hiển thị/form ·
không thêm lỗi build/lint/type/test · ảnh chụp/chạy app khớp spec.
**Tài liệu nghiệp vụ (G3, mỗi lát):** có file theo `ai-dev-explain-business` · phủ mọi FR/BR của lát · bản đồ code ở §7 trỏ file có thật ·
mô tả khớp hành vi code (không mô tả tính năng chưa làm).

## Cách làm
- Mỗi finding phải **kiểm chứng**: file:line hoặc mục tài liệu + kịch bản cụ thể gây sai. Chưa kiểm được → "cần xác minh", tách riêng.
- Mức: **blocker** (sai yêu cầu, mất dữ liệu, lỗ hổng, build vỡ, lệch contract) · **major** · **minor** · **nit**.
- Không sửa thay tác giả, trừ khi user chọn "sửa luôn".

## Verdict & gate
Bảng findings (mức · vị trí · vấn đề · kịch bản · đề xuất) → **Đạt** · **Đạt có điều kiện** · **Chưa đạt**.
- Bộ spec Đạt → hỏi duyệt **G2** → tick, các spec = Approved, NOW = `ai-pm-plan-tasks` ∥ `ai-qa-write-cases`.
- Code Đạt (mọi task của item hoặc milestone) → hỏi duyệt **G3** → tick, NOW = `ai-qa-run-tests`.
- `01` / `03` → báo owner để họ trình gate.
