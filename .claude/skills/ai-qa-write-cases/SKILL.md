---
name: ai-qa-write-cases
description: >-
  Vai QA: từ SRS (FR, BR, EX, AC, NFR, ma trận quyền, state) và bộ tech spec (API contract & mã lỗi, trạng thái
  UI FE, job BE) viết 04-test-cases.md theo module — happy, negative, boundary, permission, state, API error,
  regression, NFR — kèm chiến lược, dữ liệu test, tiêu chí vào/ra, bảng truy vết; viết/đề xuất test tự động.
  Dùng khi user là QA/tester, viết test case, test plan, test scenario, chuẩn bị kiểm thử.
---

# ai-qa-write-cases — 04 test cases

Đọc `../ai-shared/CONVENTIONS.md` + profile (lệnh test, môi trường) + `01` + `02` + `02a` + `02b-*`. Mẫu: `../ai-shared/templates/04-test-cases.md`.
**Input:** G2 ✅ (viết song song với dev, không chờ build). **Output:** `04-test-cases.md` · (tuỳ chọn) file test tự động e2e/API · `00-status`.

## 1. Chiến lược (§1)
Mức test theo công cụ của dự án và §11 của 02a / §13 của 02b (unit/integration do dev viết; QA tập trung API, e2e, quyền, NFR).
Dữ liệu test: cách tạo, tiền tố nhận diện, cách dọn. Tiêu chí vào/ra.

## 2. Sinh case — nhóm theo module M01..
| Nguồn | Case |
|---|---|
| FR mức M | ≥ 1 Happy + 1 Negative |
| AC nghiệm thu | đúng kịch bản "cách kiểm" của AC |
| BR | bảng quyết định / giá trị biên, dùng ví dụ số trong BR |
| EX | 1 case / EX |
| State diagram | mỗi chuyển hợp lệ + chuyển cấm |
| API lỗi (`02` §6) | mỗi mã lỗi quan trọng — kiểm cả BE trả đúng và FE hiển thị đúng (`02b` §8) |
| Trạng thái UI (`02b` §6) | empty / error / forbidden cho màn chính |
| Ma trận quyền | §3: mỗi role × hành động chính — gọi API trực tiếp để chắc server chặn, không chỉ UI ẩn |
| Job / tích hợp (`02a` §7) | thành công, lỗi tạm (retry), lỗi cuối |
| NFR | §4: kịch bản + ngưỡng |
| Vùng code bị chạm | Regression |

Mỗi case chạy lại được bởi người khác: tiền điều kiện, bước, dữ liệu, kỳ vọng cụ thể (giá trị, chữ hiển thị, mã lỗi).
Ưu tiên P1 = chặn release. Đề xuất tự động hoá case P1; user đồng ý → viết test bằng công cụ của dự án.

## 3. Tự soát → handoff
§5 truy vết: mọi FR mức M, AC, BR, EX có TC. Trạng thái Ready → NOW chờ G3 → `ai-qa-run-tests`.
