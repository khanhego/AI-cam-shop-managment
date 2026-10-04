---
name: ai-pm-plan-tasks
description: >-
  Vai Project Manager: gom task từ BE spec (02a §12) và FE spec (02b §14) thành 03-plan.md — vertical slice
  theo FR, phụ thuộc BE → FE, đường găng, song song, ước lượng, owner, milestone, rủi ro tiến độ, bảng phủ
  FR → task — rồi (tuỳ profile) tạo ticket trên GitHub/GitLab/Jira/Linear khi user cho phép; theo dõi tiến độ.
  Dùng khi user là PM/scrum master, lập kế hoạch, chia task, backlog, WBS, tạo ticket, sprint, tiến độ.
---

# ai-pm-plan-tasks — 03 plan · Plan

Đọc `../ai-shared/CONVENTIONS.md` + profile (§5 tracker, §7 vai) + `01` + `02` + `02a` + `02b-*`. Mẫu: `../ai-shared/templates/03-plan.md`.
**Input:** G2 ✅. **Output:** `03-plan.md` · ticket trên tracker (nếu được phép, key ghi ngược vào `03`) · `00-status`.
**Chỉ gom từ spec — cấm bịa việc.** Thiếu task cho FR → *Phản hồi* cho owner spec.

## 1. Gom & chuẩn hoá task
Lấy task từ `02a` §12 và `02b` §14 → đánh `T-n`, cột component (be/fe), FR/API/màn, nguồn. Task > 2 ngày → đề nghị tách.
Thêm task nền khi spec có: migration, contract mock cho FE, feature flag, cập nhật tài liệu, chuẩn bị dữ liệu test.

## 2. Sắp xếp theo vertical slice
Nhóm theo FR/UC để mỗi milestone demo được end-to-end. Phụ thuộc: API BE → task FE dùng thật (FE chạy trước với mock nếu có
task mock). Đường găng · task song song · owner theo profile §7 · milestone (demo được gì).

## 3. Phủ & rủi ro
§6: mọi FR mức M có task BE và/hoặc FE. Task không phủ FR → hỏi (kỹ thuật cần thiết / bỏ). Rủi ro tiến độ + giảm thiểu.

## 4. Tracker
`none` → `03` là backlog. Có tracker → in danh sách ticket (tiêu đề · mô tả trỏ `01`/`02`/`02a`/`02b` + FR/AC · nhãn be/fe) →
hỏi: tạo tất cả · chỉ Must · chưa tạo. Tạo bằng CLI/MCP theo profile, ghi key vào `03`. Không có cách tự động → xuất danh sách.

## 5. Duyệt Plan
Hỏi duyệt (đồng ký PO + tech lead ở M/L) → tick Plan, NOW = `ai-be-implement` / `ai-fe-implement` (task đầu đường găng).

## Theo dõi (gọi lại giữa chừng)
Cập nhật trạng thái task từ git/PR/tracker, chỉ ra task trễ/chặn, đề xuất cắt phạm vi bằng option.
