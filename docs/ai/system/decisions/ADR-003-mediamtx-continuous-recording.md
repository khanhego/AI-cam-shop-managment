# ADR-003 — Ghi liên tục bằng MediaMTX, cắt clip theo mốc thời gian bằng FFmpeg stream copy

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §1 P2, §6.1, §6.2](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md), T-2 trong [03-plan](../../items/01-packing-mvp/03-plan.md)) · CO-02, NFR-03, NFR-11, NFR-16, AC-02 |

> **TL;DR** — MediaMTX kéo RTSP và ghi fMP4 segment 60 giây liên tục; đóng phiên thì worker cắt clip `[start − 5s, end + 5s]` bằng FFmpeg concat `-c copy`.
> Vì sao: không bao giờ mất đầu phiên (CO-02) và clip sẵn sàng ≤ 60 giây (NFR-03) mà không encode lại.
> Đánh đổi lớn nhất: tốn ổ cho video thô (≈ 18 GB/station/ngày) và clip lệch 1–2 giây theo keyframe.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Toàn bộ quá trình đóng gói phải có video | CO-02; nghiệm thu: clip đủ từ 5 giây trước mở phiên tới 5 giây sau đóng phiên (AC-02) |
| Clip sẵn sàng | ≤ 60 giây sau khi đóng phiên (NFR-03) |
| Không mất video khi crash | Ghi theo segment, tự khởi động lại (NFR-11) |
| Video liền mạch trong phiên | NFR-16 |
| Dung lượng | ≈ 18 GB/station/ngày video thô (SRS §8.3); thô giữ 30 ngày (DEC-3 item 01) |
| Live view | Dashboard xem trực tiếp (FR-01.05) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Không mất đầu phiên | Bắt buộc (CO-02, AC-02: đệm 5 giây) |
| Thời gian có clip | ≤ 60 giây (NFR-03) |
| Giữ nguyên chất lượng / giá trị bằng chứng | Không encode lại clip gốc (P4, ADR-008) |
| Lượng code tự viết | Thấp — đội 2–3 dev |
| Khóa hãng | Không (NFR-27: RTSP / ONVIF nhiều hãng) |
| Dung lượng ổ | Chấp nhận ≈ 18 GB/station/ngày trong 30 ngày |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **MediaMTX ghi liên tục + cắt theo mốc (chọn)** | Không lỡ đầu phiên; relay RTSP (camera chỉ bị kết nối 1 lần) + live view WebRTC sẵn; ít code | Tốn ổ hơn | NAS 2 × 8 TB RAID 1 cho 2 station; clip lệch 1–2 giây |
| Tự chạy FFmpeg từng camera | Kiểm soát hoàn toàn | Tự viết giám sát, live view | Nhiều code vận hành |
| Bật / tắt ghi theo phiên | Tiết kiệm ổ | Mất vài giây đầu phiên, rủi ro khi lỗi | Trượt CO-02 / AC-02 |
| NVR thương mại | Có sẵn | Phụ thuộc hãng, API đóng | Trượt NFR-27 |
| Frigate | Có sẵn ghi + live | Thiên về phát hiện chuyển động, không hợp nghiệp vụ | Phải lách cho cắt theo phiên |

## Quyết định

Chọn **MediaMTX ghi liên tục**: kéo RTSP từ camera một lần, ghi **fMP4 segment 60 giây**, không encode lại. Worker `media.index_segments` (mỗi phút) lập chỉ mục `video_segment`. Đóng phiên → `api` đẩy job `media.build_session_clips(session_id)`: tìm segment giao `[started_at − 5s, ended_at + 5s]`, ghép + cắt bằng FFmpeg concat `-c copy`, đặt chỉ đọc, tính SHA-256; thiếu segment → cờ `video_incomplete`. Segment chưa ghi xong → job hẹn lại (tối đa 60 giây).

| Phương án bị loại | Lý do |
|---|---|
| Bật / tắt ghi theo phiên | Trượt tiêu chí bắt buộc "không mất đầu phiên" |
| Tự chạy FFmpeg | Trượt tiêu chí "ít code"; phải tự làm relay + live view |
| NVR thương mại | Khóa hãng, API đóng |
| Frigate | Mô hình sự kiện chuyển động không khớp nghiệp vụ phiên |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Chịu lỗi tốt (segment dở vẫn đọc được); xem lại được video ngoài phiên |
| Xấu / đánh đổi | Cắt theo keyframe nên clip dài hơn 1–2 giây so với khoảng yêu cầu; tốn ổ cho video thô |
| Phải làm thêm | Spike S3 đo độ trễ đóng phiên → có clip và độ chính xác mốc. Đã chạy theo code: MediaMTX **v1.21.1** (system-map), `recordFormat: fmp4`, `recordSegmentDuration: 60s` (T-2 ✅). Lệch nhỏ cần đồng bộ tài liệu: `recordPath` thực tế là `/data/video/raw/%path/%Y/%m/%d/%H-%M-%S-%f` (thêm `-%f`) so với `HH-MM-SS.mp4` ở architecture.md §6.1 — không đổi quyết định |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Kết quả spike S3 (độ trễ tới clip, sai lệch mốc, hành vi khi camera rớt) | Chưa có số đo (cần xác nhận) |
| Xem lại khi | Thời gian có clip p95 > 60 giây (NFR-03); hoặc lệch keyframe > 2 giây làm hụt đệm 5 giây (AC-02); hoặc dung lượng video thô vượt NAS (ổ > 80% dù đã retention) |
