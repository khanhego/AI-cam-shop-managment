---
name: ai-be-implement
description: >-
  Vai dev backend implement một task BE: đọc task trong 03-plan và BE spec, sinh checklist bám từng mục
  02a (data/migration, API, BR, job, config, observability), chốt với user, tạo nhánh, code theo kiến trúc
  repo kèm test unit/integration/contract, chạy build/lint/test theo profile đối chiếu baseline, tự soát,
  cập nhật spec & system-map khi lệch, chuẩn bị PR. Dùng khi user là BE dev, code API, service, migration,
  job, worker, làm ticket backend.
---

# ai-be-implement — code task BE

Đọc `../ai-shared/CONVENTIONS.md` + profile (component `be`, lệnh, VCS, ràng buộc) + luật repo + `02` §6 + `02a` + task trong `03`.
**Input:** Plan ✅ (quy mô S: task trong `02a` §12) + `02a` Approved. **Output:** code + test + migration · cập nhật `03`
(trạng thái task) · `02a` (nếu lệch, có DEC) · `system-map.md` (đổi data/API) · mô tả PR.

## 1. Intake (option)
Task nào (task BE chưa Done theo đường găng) · nhánh (mẫu profile / hiện tại / khác).
Thiếu spec/Plan mà user vẫn muốn code → DEC "code trước thiết kế", đóng dấu rủi ro.

## 2. Checklist (cửa vào code)
| # | Nguồn (02a §, API-xx, BR, FR) | Việc | File | Test chứng minh |
|---|---|---|---|---|

Phủ đủ, theo thứ tự an toàn: migration → model/repository → service + BR → API (validate, authz, lỗi đúng mã `02`) →
job/tích hợp → config → log/metric. Kèm bảng phủ ngược. Hỏi duyệt checklist.

## 3. Implement
- Đo baseline build/lint/test trước khi sửa.
- Theo kiến trúc & pattern sẵn có; reuse helper. Migration tương thích ngược, có down.
- Test cùng code: unit cho BR/service; integration cho API + DB; contract test response khớp `02` §6 (khi có công cụ).
- Authz kiểm ở server cho mọi API. Không hardcode secret. Không tắt test/lint.
- Ngoài phạm vi task → đề xuất task mới trong `03`, không tự làm.

## 4. Tự kiểm
1. build · lint · test component bị chạm; so baseline — không thêm lỗi (repo đỏ sẵn → báo số trước/sau).
2. Chạy migration lên DB local/test + down thử. Gọi thử API chính (curl / skill `run`), ghi kết quả.
3. Mỗi dòng checklist có bằng chứng. `git diff` rỗng → chưa xong.

## 5. Lệch spec → báo
Khác `02a` → cập nhật `02a` + DEC (hỏi trước). Khác contract `02` → dừng, *Phản hồi* cho architect (ảnh hưởng FE/QA).

## 6. Kết thúc
Cập nhật task trong `03`. Hỏi: commit + mở PR (quy ước profile) · chỉ commit · để nguyên. PR: task · FR/API phủ · migration ·
cách test · rủi ro. Task cuối của lát → handoff `ai-dev-explain-business` (tài liệu nghiệp vụ của lát), rồi `ai-lead-review` (code).
