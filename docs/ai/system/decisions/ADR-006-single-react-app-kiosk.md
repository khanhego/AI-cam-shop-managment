# ADR-006 — Một app React cho cả station và dashboard, station chạy Chromium kiosk

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §5](../architecture.md)) |

## Bối cảnh
Cần màn hình tại bàn (station) và dashboard quản lý; đội nhỏ.

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **Một app React + Vite + Tailwind theo design system MD3, 2 khu vực (chọn)** | Chung auth, API client, component; dùng lại design system của đội | Tự viết bảng/form |
| Ant Design | Có sẵn bảng, form | Lệch phong cách MD3 của design system (loại 2026-10-04) |
| Hai app riêng | Tách biệt | Trùng code |
| Next.js | SSR | Không cần khi chạy LAN, thêm tiến trình Node |
| Electron cho station | Điều khiển thiết bị sâu | Phải cài đặt, cập nhật từng máy |

## Quyết định
Repo `ai-cam-fe`: React + TypeScript + Vite + Tailwind, component theo [design system](../../../design-system/README.md), route `/station` (kiosk) và `/admin`. Station chạy Chromium `--kiosk`, máy quét HID như bàn phím.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: deploy một lần cho mọi station.
- Phải làm thêm: listener phân biệt quét và gõ tay (spike S5).
