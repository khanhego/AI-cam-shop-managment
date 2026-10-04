# ADR-006 — Một app React cho cả station và dashboard, station chạy Chromium kiosk

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §2.2, §5](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md), [02b-station](../../items/01-packing-mvp/02b-fe-spec-station.md), [02b-admin](../../items/01-packing-mvp/02b-fe-spec-admin.md)) · NFR-09, NFR-22..26, DEC-6 |

> **TL;DR** — Repo `ai-cam-fe`: một app React + TypeScript + Vite + Tailwind theo design system MD3, hai khu vực `/station` (kiosk) và `/admin`; station chạy Chromium `--kiosk`, máy quét HID như bàn phím.
> Vì sao: chung auth, API client, component cho đội nhỏ; deploy FE một lần là mọi station cập nhật.
> Đánh đổi lớn nhất: tự viết bảng / form (không dùng Ant Design) và phải phân biệt quét với gõ tay trong trình duyệt.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Hai client | Màn hình tại bàn (station) và dashboard quản lý; item 01: 20 màn (S0–S6, D1–D13) |
| Đội | 2–3 dev |
| Thao tác station | Chỉ bằng máy quét (NFR-22); chữ đọc được từ 1,5 m, màu nền theo trạng thái (NFR-24); âm thanh 3 loại (NFR-23) |
| Offline | Station chạy trong LAN khi mất Internet (NFR-09) |
| Phong cách | Dùng design system MD3 của đội, bỏ Ant Design (DEC-6, user chốt 2026-10-04) |
| Số station | 2 (MVP) – 4 |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Dùng lại code giữa station và dashboard | Cao |
| Cập nhật station | Không cài đặt từng máy — deploy 1 lần |
| Thống nhất design system MD3 | Bắt buộc (DEC-6) |
| Chạy offline trong LAN | Bắt buộc — build file tĩnh, không phụ thuộc CDN |
| Thành phần runtime thêm | 0 (không thêm tiến trình Node) |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **Một app React + Vite + Tailwind theo MD3, 2 khu vực (chọn)** | Chung auth, API client, component; dùng lại design system | Tự viết bảng / form | Công viết UI kit (sao từ dự án khác — DEC-44) |
| Ant Design | Có sẵn bảng, form | Lệch phong cách MD3 | Loại 2026-10-04 (DEC-6) |
| Hai app riêng | Tách biệt | Trùng code | 2 × build, auth, client |
| Next.js | SSR | Không cần khi chạy LAN; thêm tiến trình Node | Thêm thành phần vận hành |
| Vue | Nhẹ | Nguồn tuyển ít hơn React | — |
| Electron cho station | Điều khiển thiết bị sâu (máy in, COM) | Phải cài, cập nhật từng máy | Chi phí vận hành × số station |

## Quyết định

Chọn **một app React** trong repo `ai-cam-fe`: React + TypeScript + Vite + Tailwind, component theo [design system](../../../design-system/README.md), route `/station` (kiosk) và `/admin`. Station chạy Chromium `--kiosk`, máy quét HID cấu hình hậu tố Enter, listener toàn cục phân biệt quét (< 50 ms/ký tự) với gõ tay.

| Phương án bị loại | Lý do |
|---|---|
| Ant Design | Trượt tiêu chí bắt buộc MD3 (DEC-6) |
| Hai app riêng | Trượt tiêu chí dùng lại code |
| Next.js | SSR không cần trong LAN; thêm tiến trình Node |
| Electron | Trượt tiêu chí "không cài từng máy"; chỉ cần khi điều khiển thiết bị sâu |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Deploy một lần cho mọi station; một phong cách với dự án khác của đội |
| Xấu / đánh đổi | Tự viết bảng / form; listener HID trong trình duyệt phải tự xử lý bố cục bàn phím, ký tự đặc biệt |
| Phải làm thêm | Listener phân biệt quét và gõ tay (spike S5). Code thực tế lệch phiên bản mục tiêu ở architecture.md §2.1: **React 19, Vite 8, Tailwind 4, React Router 7** (profile) — không đổi quyết định, cần cập nhật bảng stack. API client sinh type bằng `openapi-typescript` + fetch mỏng tự viết thay `orval` (DEC-41); font đóng gói `@fontsource` thay Google Fonts để chạy offline (DEC-42) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Kết quả spike S5 (máy quét HID trong kiosk) | Chưa ghi nhận (cần xác nhận) |
| Xem lại khi | Station cần điều khiển thiết bị trình duyệt không làm được (máy in nhiệt, cổng COM) → cân nhắc Electron cho `/station`; hoặc bundle `/admin` làm station tải chậm > 3 giây trong LAN → tách bundle / app |
