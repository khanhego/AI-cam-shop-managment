# ADR-002 — Modular monolith Python (FastAPI), một image chạy nhiều tiến trình

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §2, §4](../architecture.md)) |

## Bối cảnh
Đội 2–3 dev, quy mô 1–4 station. Phần đọc mã từ camera và xử lý video cần OpenCV, zxing-cpp, FFmpeg.

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **Python FastAPI monolith (chọn)** | Một ngôn ngữ cho API, worker, vision; hệ sinh thái video tốt | Hiệu năng CPU-bound kém hơn Go |
| Node.js (NestJS) | API tốt, chung ngôn ngữ với FE | Vision phải gọi sang Python, thành 2 ngôn ngữ |
| Go | Hiệu năng cao | Thư viện vision kém, khó tuyển |
| Microservice | Tách độc lập | Quá sớm, tốn vận hành |

## Quyết định
Repo `ai-cam-be` là modular monolith Python 3.12 + FastAPI. Một Docker image chạy 4 tiến trình: `api`, `worker`, `beat`, `vision`. Module chỉ gọi nhau qua `service`.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: ít thành phần, dễ test, dễ deploy.
- Xấu: phải giữ kỷ luật ranh giới module.
- Phải làm thêm: lint import giữa module (vd import-linter).
