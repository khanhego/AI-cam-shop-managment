---
name: ai-fe-implement
description: >-
  Vai dev frontend (web, mobile, desktop) implement một task FE: đọc task trong 03-plan và FE spec của client,
  sinh checklist bám từng mục 02b (route, component, state, form, trạng thái UI, quyền, lỗi API, i18n/a11y),
  chốt với user, tạo nhánh, code theo kiến trúc repo — mock theo contract nếu BE chưa xong — kèm test,
  chạy build/lint/test theo profile đối chiếu baseline, chạy app kiểm tay, cập nhật spec khi lệch, chuẩn bị
  PR. Dùng khi user là FE/mobile dev, code màn hình, UI, component, làm ticket frontend.
---

# ai-fe-implement — code task FE

Đọc `../ai-shared/CONVENTIONS.md` + profile (component `fe`, lệnh, VCS) + luật repo + `01` §10 + `02` §6 + `02b-<client>` + task trong `03`.
**Input:** Plan ✅ (quy mô S: task trong `02b` §14) + `02b` Approved. **Output:** code + test · `03` (trạng thái task) ·
`02b` (nếu lệch, có DEC) · `system-map.md` (màn/route mới) · mô tả PR.

## 1. Intake (option)
Task nào (task FE chưa Done) · **API phụ thuộc**: BE đã xong → gọi thật · chưa → mock theo `02` §6 qua cơ chế ở `02b` §12 ·
nhánh (mẫu profile / hiện tại / khác).

## 2. Checklist (cửa vào code)
| # | Nguồn (02b §, màn, API-xx, FR) | Việc | File | Kiểm bằng |
|---|---|---|---|---|

Phủ: route & guard → component (reuse trước) → data fetching & state → form & validate → **đủ trạng thái** loading/empty/
error/forbidden/success → xử lý từng mã lỗi API → chữ/i18n → a11y/responsive → analytics. Bảng phủ ngược. Hỏi duyệt.

## 3. Implement
- Đo baseline build/lint/test trước khi sửa.
- Theo cấu trúc, design system, pattern sẵn có; không tạo component trùng cái đã có.
- Mock (nếu dùng) đúng shape contract, bật/tắt được, không lọt vào build production.
- Không thêm route tạm vào menu/nav thật; không hardcode luật nghiệp vụ mà server đã thực thi.
- Test: component/unit cho logic hiển thị & form; integration với mock API; e2e cho UC chính khi dự án có công cụ.

## 4. Tự kiểm
1. build · lint · test (+ type check) so baseline — không thêm lỗi.
2. **Chạy app** (lệnh run / skill `run`), đi qua từng màn & trạng thái trong checklist; chụp/ghi lại bằng chứng.
3. Mỗi FR của task "bấm tới được". `git diff` rỗng → chưa xong.

## 5. Lệch spec → báo
Khác `02b` → cập nhật `02b` + DEC (hỏi trước). Contract thiếu/sai → *Phản hồi* cho architect. Màn/chữ sai → *Phản hồi* cho PO/UX.

## 6. Kết thúc
Cập nhật task trong `03`. Hỏi commit/PR theo profile. PR: task · màn/FR phủ · ảnh chụp trước/sau · mock còn dùng không ·
cách test. Task cuối của lát → handoff `ai-dev-explain-business` (tài liệu nghiệp vụ của lát), rồi `ai-lead-review` (code).
