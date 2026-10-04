# ADR-001 — Chạy on-premise tại kho, cloud chỉ để sao lưu và truy cập từ xa

| Trạng thái | proposed |
|---|---|
| Ngày | 2026-10-04 |
| Người chốt | chưa chốt |
| Work item | — (thiết kế tổng thể, nguồn: [architecture.md §1, §3, §12](../architecture.md)) |

## Bối cảnh
Video dung lượng lớn (≈ 18 GB/station/ngày, SRS §8.3), quét mã cần phản hồi ≤ 1 giây (NFR-01), và kho phải đóng gói được khi mất Internet (NFR-09).

## Các phương án
| Phương án | Ưu | Nhược |
|---|---|---|
| **On-premise (chọn)** | Độ trễ thấp, chạy offline, không tốn băng thông upload video | Phải vận hành server + NAS tại kho |
| Toàn bộ trên cloud | Không cần server tại kho | Upload video liên tục tốn băng thông, mất mạng là dừng đóng gói |
| Hybrid xử lý phiên trên cloud | Dữ liệu tập trung | Vẫn phụ thuộc mạng khi quét |

## Quyết định
Server tại kho chạy toàn bộ stack bằng Docker Compose. Cloud chỉ dùng cho sao lưu clip (S3-compatible) và truy cập từ xa qua Tailscale / Cloudflare Tunnel.

## Hệ quả (tốt / xấu / phải làm thêm)
- Tốt: chạy được khi mất Internet, độ trễ thấp.
- Xấu: cần UPS, NAS, quy trình cập nhật tại kho.
- Phải làm thêm: giám sát sức khỏe server, backup DB ra ngoài kho.
