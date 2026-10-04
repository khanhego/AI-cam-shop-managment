# ADR-008 — Clip gốc bất biến + SHA-256; overlay chỉ trên bản xuất; bật OSD thời gian của camera

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §6.3](../architecture.md)) |

## Bối cảnh
Video phải là bằng chứng khiếu nại (CO-02, NFR-13..16).

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **Clip gốc stream copy + hash, overlay khi xuất (chọn)** | Nhanh, giữ nguyên chất lượng, chứng minh được không sửa | Bản xem nội bộ không có chữ mã đơn |
| Encode overlay cho mọi clip | Clip nào cũng có chữ | Tốn CPU, clip gốc không còn nguyên bản |

## Quyết định
Clip gốc chỉ đọc, lưu SHA-256. Bản xuất encode H.264 có `drawtext` (mã vận đơn, thời gian, station, nhân viên), kèm file JSON hash. Camera bật OSD thời gian.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: hai lớp bằng chứng thời gian độc lập.
- Phải làm thêm: audit log mọi lần xem / xuất.
