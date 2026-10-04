# ADR-003 — Ghi liên tục bằng MediaMTX, cắt clip theo mốc thời gian bằng FFmpeg stream copy

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §6.1, §6.2](../architecture.md)) |

## Bối cảnh
Mọi phiên đóng gói phải có video đầy đủ (CO-02), không được mất đầu phiên, và clip phải có giá trị bằng chứng.

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **MediaMTX ghi liên tục + cắt theo mốc (chọn)** | Không lỡ đầu phiên, relay RTSP + live view sẵn, ít code | Tốn ổ hơn |
| Tự chạy FFmpeg từng camera | Kiểm soát hoàn toàn | Tự viết giám sát, live view |
| Bật/tắt ghi theo phiên | Tiết kiệm ổ | Mất vài giây đầu, rủi ro khi lỗi |
| NVR thương mại | Có sẵn | Phụ thuộc hãng, API đóng |

## Quyết định
MediaMTX kéo RTSP, ghi fMP4 segment 60 giây. Đóng phiên → worker cắt clip `[start−5s, end+5s]` bằng FFmpeg concat `-c copy`, không encode lại.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: chịu lỗi tốt, xem lại được ngoài phiên.
- Xấu: cắt theo keyframe nên clip lệch 1–2 giây.
- Phải làm thêm: spike S3 đo độ trễ và độ chính xác mốc.
