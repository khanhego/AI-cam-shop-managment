# ADR-001 — Chạy on-premise tại kho, cloud chỉ để sao lưu và truy cập từ xa

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §1 P1, §3, §12](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md)) · NFR-01, NFR-09, NFR-10, NFR-12, CO-04 |

> **TL;DR** — Toàn bộ stack (ghi hình, phiên, DB) chạy trên server tại kho bằng Docker Compose; cloud chỉ sao lưu clip (S3-compatible) và truy cập từ xa qua Tailscale / Cloudflare Tunnel.
> Vì sao: video ≈ 18 GB/station/ngày không thể upload liên tục, và kho phải đóng gói được khi mất Internet (NFR-09).
> Đánh đổi lớn nhất: phải vận hành phần cứng tại kho (server, NAS, UPS) và tự lo backup.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Dung lượng video thô | ≈ 0,9 GB/camera/giờ; ≈ 18 GB/station/ngày; ≈ 540 GB/station/tháng (SRS §8.3) |
| Băng thông upload tương đương | ≈ 2 Mbps/camera liên tục × 2 camera/station (SRS §8.3) |
| Phản hồi quét | ≤ 1 giây với đơn đã đồng bộ, ≤ 3 giây khi phải tra API (NFR-01) |
| Mất Internet | Vẫn quét, mở/đóng phiên, ghi hình (NFR-09); nghiệm thu: rút mạng 30 phút (AC-09) |
| Mất điện | UPS ≥ 15 phút, tắt an toàn (NFR-10) |
| Quy mô | 2 station, ≤ 500 đơn/ngày (DEC-4 item 01); tối thiểu 4 station / 8 camera mỗi server (NFR-05) |
| Lưu trữ | 2 station: thô 30 ngày + clip 180 ngày ≈ 4–6 TB, NAS 2 × 8 TB RAID 1 (architecture.md §8.3) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Chạy khi mất Internet | Bắt buộc (NFR-09, AC-09: 30 phút) |
| Độ trễ quét | ≤ 1 giây (NFR-01) |
| Băng thông upload | Không phụ thuộc upload liên tục ≈ 4 Mbps/station |
| Chi phí lưu trữ | Tăng tuyến tính theo station (CO-04) — ưu tiên ổ cục bộ |
| Công vận hành | Cao — đội 2–3 dev, không có ops riêng |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **On-premise, cloud chỉ sao lưu / truy cập từ xa (chọn)** | Độ trễ LAN; chạy offline; không upload video liên tục | Phải vận hành server + NAS tại kho | Phần cứng server + NAS 2 × 8 TB + UPS; rủi ro hỏng phần cứng tại chỗ |
| Toàn bộ trên cloud | Không cần server tại kho | Upload video liên tục; mất mạng là dừng đóng gói | Băng thông + lưu trữ cloud ≈ 540 GB/station/tháng; vi phạm NFR-09 |
| Hybrid: xử lý phiên trên cloud, video tại kho | Dữ liệu nghiệp vụ tập trung | Vẫn phụ thuộc mạng khi quét | Vi phạm NFR-01/NFR-09 khi mạng chập chờn |

## Quyết định

Chọn **on-premise**: server tại kho chạy toàn bộ stack bằng Docker Compose. Cloud chỉ dùng cho sao lưu clip (S3-compatible) và truy cập từ xa qua Tailscale / Cloudflare Tunnel (không mở port inbound).

| Phương án bị loại | Lý do |
|---|---|
| Toàn bộ trên cloud | Trượt tiêu chí bắt buộc NFR-09; chi phí băng thông và lưu trữ tăng tuyến tính |
| Hybrid | Đường đi quét vẫn qua Internet → trượt NFR-01, NFR-09 |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Chạy được khi mất Internet; độ trễ thấp (LAN) |
| Xấu / đánh đổi | Cần UPS, NAS, quy trình cập nhật tại kho (`docker compose pull && up -d`); hỏng phần cứng tại kho = dừng toàn bộ |
| Phải làm thêm | Giám sát sức khỏe server (trang Sức khỏe hệ thống, NFR-29); backup DB ra ngoài kho (`pg_dump` hằng ngày lên NAS + S3, giữ 30 bản — architecture.md §8.2); cảnh báo ổ 80% / 90% (NFR-30) |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Cần xem video từ xa trên điện thoại không (SRS Q7)? | Ảnh hưởng chi phí băng thông truy cập từ xa (cần xác nhận với chủ shop) |
| Chọn Tailscale hay Cloudflare Tunnel; nhà cung cấp S3 nào | Chưa chốt (cần xác nhận); sao lưu cloud thuộc Phase 3 (SRS §13.2) |
| Xem lại khi | Số station > 4 (vượt NFR-05 cho một server); hoặc shop mở nhiều kho cần dữ liệu tập trung; hoặc chi phí NAS/ops tại kho > chi phí cloud tương đương |
