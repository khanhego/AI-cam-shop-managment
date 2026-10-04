---
name: ai-po-write-srs
description: >-
  Vai Product Owner / BA: biến input thô (ý tưởng, ghi chú họp, ticket, tài liệu khách) thành SRS đầy đủ
  (01-srs.md, và system/SRS.md nếu chưa có) — bài toán & chỉ số, stakeholder, quy trình TO-BE có ngoại lệ,
  FR theo module, ma trận quyền, use case, trạng thái & business rule, NFR đo được, dữ liệu nghiệp vụ,
  màn hình, tích hợp, rủi ro, câu hỏi mở, nghiệm thu & lộ trình — có quét hiện trạng tránh làm trùng, rồi
  chốt G1. Dùng khi user là PO/BA, viết SRS, PRD, BRD, đặc tả yêu cầu, user story, chốt G1.
---

# ai-po-write-srs — SRS · G1

Đọc `../ai-shared/CONVENTIONS.md` (§3 SRS hệ thống vs item, §9 văn phong) + profile + `00-status`.
Mẫu: `../ai-shared/templates/01-srs.md`. Chưa có item → `ai-flow-route`.
**Input:** input thô. **Output:** `01-srs.md` · `system/SRS.md` (item đầu tiên) · cập nhật `00-status`.

## 1. Thu input
Option: dán text · file/đường dẫn · ticket/URL · phỏng vấn (hỏi từng ý). Ghi nguồn vào header.
Xác định SRS hệ thống hay SRS item (chỉ phần thay đổi, giữ ID cũ).

## 2. Quét hiện trạng (trước khi viết FR)
SRS hệ thống + `system-map.md` + code (route, model, API, chuỗi UI theo từ khoá nghiệp vụ). Có thứ gần giống →
hỏi: mở rộng cái cũ · làm mới song song (lý do) · dừng. → DEC.

## 3. Viết SRS — theo thứ tự
1. **§2 Bài toán trước giải pháp**: AS-IS → vấn đề P# + hệ quả → mục tiêu có chỉ số. Chưa có §2 thì chưa viết FR.
2. **§1** phạm vi trong/ngoài · thuật ngữ.
3. **§3** tác nhân → **§4** quy trình TO-BE: B1..Bn (ai làm gì → hệ thống phản hồi gì), sơ đồ, ngoại lệ EX.
   Có yêu cầu thô → bảng map bước thô → bước TO-BE.
4. **§5 FR** theo module: "Hệ thống phải…", kiểm được, MoSCoW, cột Nguồn (P#/B#) + ma trận quyền.
5. **§6** use case (liệt kê hết, chi tiết UC chính) · **§7** state diagram + BR có ví dụ số.
6. **§8 NFR** — con số + cách kiểm · **§9** dữ liệu nghiệp vụ (không thiết kế bảng) · **§10** màn (danh sách + phác thảo
   màn chính; có UX riêng → `ai-ux-design-screens`) · **§11** tích hợp.
7. **§12** giả định · ràng buộc · rủi ro · câu hỏi mở · **§13** AC nghiệm thu (có cách kiểm) + lộ trình · **Phụ lục A** truy vết.

Không viết lựa chọn kỹ thuật (framework, bảng, endpoint) — định hướng thì ghi DEC/câu hỏi cho architect.

## 4. Làm rõ
Chỗ mơ hồ / mâu thuẫn / thiếu → hỏi 2–3 option kèm hệ quả (≤ 4 câu/lượt) → DEC. Chưa trả lời được → §12
(hỏi ai · chặn G1?). Mặc định đề xuất được nhưng ghi "(đề xuất, cần xác nhận)".

## 5. Tự soát → G1
Checklist "Chốt G1" + thuật ngữ nhất quán · ID không trùng · TL;DR khớp nội dung. Có UI và §10 còn mỏng → gợi ý
`ai-ux-design-screens` trước. M/L → gợi ý `ai-lead-review` soát SRS. Hỏi duyệt G1 → tick, SRS = Approved,
NOW = `ai-architect-write-spec`.

## Sửa sau G1
DEC "Change request", tăng phiên bản, *Phản hồi* cho vai đã làm bước sau. Không âm thầm sửa FR/AC.
