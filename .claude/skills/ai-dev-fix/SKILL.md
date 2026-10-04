---
name: ai-dev-fix
description: >-
  Làn sửa lỗi cho dev BE hoặc FE: tiếp nhận bug/sự cố, phân mức P0–P3, tái hiện có bằng chứng, tìm nguyên
  nhân gốc, viết test tái hiện đỏ trước rồi sửa tối thiểu cho xanh, chạy build/lint/test đối chiếu baseline,
  ghi lại vào 00-status, rồi đưa qua review, kiểm thử và release (hotfix nếu khẩn). Dùng khi user nói bug,
  lỗi, fix, hotfix, sự cố, incident, regression, "không chạy", báo lỗi từ người dùng hoặc từ QA.
---

# ai-dev-fix — sửa lỗi

Đọc `../ai-shared/CONVENTIONS.md` + profile + luật repo. Item lane `fix` (chưa có → `ai-flow-route`; bug từ QA của item feature →
sửa ngay trong item đó). **Output:** code + test hồi quy · mục *Sự cố* trong `00-status` (hoặc bug trong `04a`) · mô tả PR.

1. **Tiếp nhận** → `00-status`: triệu chứng · môi trường · từ khi nào · tác động · component nghi ngờ (be/fe) · mức
   **P0** (sập/mất dữ liệu/bảo mật) · P1 · P2 · P3 (hỏi xác nhận). P0 → đề xuất khôi phục dịch vụ trước (rollback / tắt flag), điều tra sau.
2. **Tái hiện** — bước tối thiểu + bằng chứng. Không tái hiện được → ghi đã thử gì, xin thêm thông tin; không sửa mò.
3. **Nguyên nhân gốc** — git log/blame/bisect, log, đọc code. Ghi: nguyên nhân · vì sao lọt (thiếu test / thiếu FR-AC / spec sai) ·
   chỗ khác cùng lỗi. Do SRS/spec sai → *Phản hồi* cho PO/architect.
4. **Sửa** — test tái hiện **đỏ trước** → sửa tối thiểu → xanh; không refactor kèm. BE: kiểm migration/dữ liệu đã hỏng cần vá
   (script riêng, hỏi trước). FE: kiểm mọi client dùng chung code. Build/lint/test so baseline. Nhánh `fix/<NN>-<slug>` hoặc mẫu profile.
5. **Gate rút gọn** — `ai-lead-review` (G3) → `ai-qa-run-tests` chạy tái hiện + regression (bắt buộc P0/P1; P2/P3 dev tự kiểm có bằng chứng)
   (G4) → `ai-ops-release` (G5). P0: được release trước, review hậu kiểm sau, ghi DEC.
6. **Đóng** — tóm tắt nguyên nhân · cách sửa · test thêm · phòng ngừa (đề xuất item chore). Hỏi commit/PR theo profile.
