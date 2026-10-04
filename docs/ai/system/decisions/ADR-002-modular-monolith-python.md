# ADR-002 — Modular monolith Python (FastAPI), một image chạy nhiều tiến trình

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §1 P6, §2, §4](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md)) · NFR-05, NFR-28 |

> **TL;DR** — Repo `ai-cam-be` là modular monolith Python 3.12 + FastAPI; một Docker image chạy 4 tiến trình `api`, `worker`, `beat`, `vision`.
> Vì sao: một ngôn ngữ cho API, worker và vision (OpenCV, zxing-cpp, FFmpeg) với đội 2–3 dev, quy mô 1–4 station.
> Đánh đổi lớn nhất: phải giữ kỷ luật ranh giới module bằng quy ước + lint, không có ranh giới process.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Đội phát triển | 2–3 dev (SRS §13.2) |
| Quy mô | 1–4 station; MVP 2 station, ≤ 500 đơn/ngày (DEC-4 item 01); một server ≥ 4 station / 8 camera (NFR-05) |
| Thư viện bắt buộc | OpenCV, zxing-cpp (Cam 2), FFmpeg (cắt / xuất clip) |
| Thêm sàn | Bằng adapter, không sửa lõi (NFR-28) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Hệ sinh thái video / vision | Cao — bắt buộc có binding OpenCV, zxing-cpp |
| Số ngôn ngữ backend | 1 |
| Số thành phần phải vận hành | Ít nhất có thể (nguyên tắc P6: một codebase BE, một file Compose) |
| Hiệu năng API | Đủ NFR-01 (≤ 1 giây) cho ≤ 4 station |
| Tuyển dụng | Đội nhỏ, dễ tuyển |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **Python FastAPI modular monolith (chọn)** | Một ngôn ngữ cho API, worker, vision; hệ sinh thái video tốt | Hiệu năng CPU-bound kém hơn Go | Rủi ro module gọi chéo nếu không lint |
| Node.js (NestJS) | API tốt, chung ngôn ngữ với FE | Vision phải gọi sang Python → 2 ngôn ngữ | Gấp đôi toolchain, CI |
| Go | Hiệu năng cao | Thư viện vision kém, khó tuyển | Rủi ro tự viết binding |
| Microservice | Tách độc lập | Quá sớm, tốn vận hành | N service × deploy/giám sát cho đội 2–3 người |

## Quyết định

Chọn **modular monolith Python 3.12 + FastAPI** trong repo `ai-cam-be`. Một Docker image (có FFmpeg) chạy 4 tiến trình khác lệnh khởi động: `api`, `worker`, `beat`, `vision`. Mỗi module có `models.py`, `schemas.py`, `service.py`, `router.py`, `tasks.py`; module chỉ gọi nhau qua `service` (hoặc `queries.py` đọc-only — DEC-46, DEC-48 item 01), không đọc chéo bảng.

| Phương án bị loại | Lý do |
|---|---|
| Node.js | Phần vision vẫn cần Python → 2 ngôn ngữ, trượt tiêu chí "1 ngôn ngữ" |
| Go | Trượt tiêu chí hệ sinh thái vision và tuyển dụng |
| Microservice | Trượt tiêu chí "ít thành phần"; không có lợi ích đo được ở 1–4 station |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Ít thành phần, dễ test, dễ deploy (một image, một Compose) |
| Xấu / đánh đổi | Phải giữ kỷ luật ranh giới module; CPU-bound (vision) chạy trong Python |
| Phải làm thêm | Lint import giữa module (vd import-linter); item 01 thêm module `approvals`, `imports` (DEC-8) — architecture.md §4.1 đã bổ sung |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| import-linter đã cấu hình trong CI chưa | Chưa thấy ghi nhận trong item 01 (cần xác nhận) |
| Xem lại khi | Một tiến trình (vd `vision`) cần scale độc lập vượt 1 server; hoặc số station > 4 làm `api` không giữ được NFR-01 với 2 bản; hoặc đội > 2 nhóm độc lập cần deploy riêng |
