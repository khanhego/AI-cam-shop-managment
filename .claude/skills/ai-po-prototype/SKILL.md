---
name: ai-po-prototype
description: >-
  Làn nhanh khi yêu cầu chưa rõ: quét hiện trạng, viết SRS bản đầu với giả thuyết cần kiểm, dựng prototype
  chạy được bằng dữ liệu giả trên một client theo stack dự án (hoặc Figma/clickable), cho người dùng xem,
  đưa cái học được ngược về SRS rồi chuyển sang lane feature. Không đụng dữ liệu thật, không lên production.
  Dùng khi user nói MVP, prototype, mock, wireframe chạy được, dựng thử, POC, spike, làm nhanh để xem.
---

# ai-po-prototype — prototype để học

Đọc `../ai-shared/CONVENTIONS.md` + profile. Item lane `prototype` (chưa có → `ai-flow-route`).
**Output:** `01-srs.md` (Draft-prototype) · code prototype trên nhánh `proto/<NN>-<slug>` hoặc link thiết kế · learnings trong `00-status`.
Code prototype mặc định bỏ đi hoặc viết lại qua lane feature.

1. **Quét hiện trạng** như `ai-po-write-srs` §2. Có màn/tính năng gần giống → hỏi: dựng trên nền cũ · làm riêng · dừng.
2. **SRS bản đầu**: §1–§2, quy trình TO-BE chính, FR mức M, AC chính, **giả thuyết cần kiểm**. Trạng thái `Draft-prototype`.
3. **Chọn** client (một lần một client, theo component `fe` trong profile) và cách dựng: trong repo dùng seam mock sẵn có ·
   thư mục prototype riêng · Figma/clickable · dừng.
4. **Dựng**: dữ liệu giả cục bộ đi qua lớp gọi dữ liệu sẵn có. Cấm ghi DB/API thật, migration, thêm vào menu thật,
   sửa nhánh chính. Mỗi FR mức M "bấm tới được"; đánh dấu phần mới. Build/run theo profile (repo đỏ sẵn → báo không thêm lỗi).
5. **Học**: giả thuyết đúng/sai · FR/AC phải sửa · câu hỏi mới → cập nhật `01` (DEC "từ prototype").
   Hỏi: chuyển lane feature (→ `ai-po-write-srs` chốt G1) · thêm vòng · dừng. Không tick gate.
