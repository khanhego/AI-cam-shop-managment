---
name: ai-qa-run-tests
description: >-
  Vai QA: chạy bộ 04-test-cases trên build đã qua review — tự động bằng lệnh test của dự án, thủ công qua
  API/trình duyệt/app — ghi kết quả có bằng chứng, báo bug tái hiện được, kiểm lại sau khi sửa, lập
  04a-test-report.md với kết luận sẵn sàng release, rồi chốt G4. Dùng khi user là QA, chạy test, verify,
  nghiệm thu, UAT, regression, test report, chốt G4.
---

# ai-qa-run-tests — chạy test · 04a report · G4

Đọc `../ai-shared/CONVENTIONS.md` + profile (lệnh test, môi trường) + `04-test-cases.md`. Mẫu: `../ai-shared/templates/04a-test-report.md`.
**Input:** G3 ✅ + `04` Ready + build trên môi trường test. **Output:** cột KQ trong `04` · `04a-test-report.md` · bug (report + tracker nếu
được phép) · *Phản hồi* cho dev trong `00-status`.

## 1. Chuẩn bị
Xác nhận build/commit và môi trường (option). Không bao giờ chạy trên production. Tạo dữ liệu test theo `04` §1.

## 2. Chạy
- Tự động: lệnh test của profile — ghi lệnh + kết quả.
- Thủ công / API / UI: curl, trình duyệt, app (skill `run`); quyền → gọi API trực tiếp bằng token từng role.
- Mỗi case: ✅ / ❌ / ⛔ + **bằng chứng** (output, ảnh, response). Không có bằng chứng → không đánh ✅.

## 3. Bug
Mỗi bug: mức · TC · bước tái hiện tối thiểu · kỳ vọng vs thực tế · build/env · bằng chứng · component nghi ngờ (be/fe).
Ghi vào `04a` §2 + *Phản hồi* cho `ai-be-implement` / `ai-fe-implement` (+ tracker nếu user cho phép).
Dev sửa → chạy lại TC fail + regression liên quan → cập nhật report (lần mới hoặc dòng mới trong §1).

## 4. Report & G4
Điền `04a`: tổng hợp theo module, AC đạt/không, NFR đo được, rủi ro còn lại, **kết luận** sẵn sàng / có điều kiện / chưa.
Dọn dữ liệu test. Checklist "Chốt G4" trong `04` → hỏi duyệt G4 → tick, NOW = `ai-ops-release`.
