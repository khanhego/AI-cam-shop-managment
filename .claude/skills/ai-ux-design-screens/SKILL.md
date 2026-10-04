---
name: ai-ux-design-screens
description: >-
  Vai UX/Product Designer cho dự án có giao diện (web, mobile, desktop, kiosk): từ quy trình, FR, use case
  trong SRS thiết kế user journey, danh sách màn, trạng thái từng màn (trống, đang tải, lỗi, không quyền,
  thành công), nội dung chữ, phác thảo ASCII hoặc link Figma, ghi vào SRS §10. Reuse màn và component có
  sẵn trước. Dùng khi user là designer/UX, thiết kế màn hình, flow người dùng, wireframe.
---

# ai-ux-design-screens — SRS §10

Đọc `../ai-shared/CONVENTIONS.md` + profile + `01` (§4, §5, §6, ma trận quyền). Không có component `fe` → báo không áp dụng.
**Input:** `01` có §4–§6. **Output:** `01` §10 (+ link Figma nếu có). Không tick gate.

1. **Kiểm kê UI hiện có**: màn, layout, component dùng chung, design system (profile §3 + `system-map.md` + code).
   Mỗi màn cần → REUSE · EXTEND · NEW.
2. **User journey** mỗi UC chính: bước → màn → hành động → phản hồi → kết thúc, gồm nhánh EX và không quyền (mermaid).
3. **Đặc tả màn** (bảng theo client, cột FR) + mỗi màn chính: mục đích · vào/ra · vai trò thấy · thông tin hiển thị
   (tên nghiệp vụ, không tên cột) · hành động · validate · chữ thật (tiêu đề, nút, lỗi) · **đủ trạng thái** loading /
   empty / error / forbidden / success · phác thảo ASCII hoặc Figma (dùng Figma MCP nếu có và user cho phép).
4. **Kiểm phủ**: mỗi FR có UI → màn nào; FR không bấm tới được → thiếu màn. Quyết định → DEC. Cần đổi FR → *Phản hồi* cho PO.
5. Handoff: về `ai-po-write-srs` chốt G1 (hoặc `ai-lead-review` soát).
