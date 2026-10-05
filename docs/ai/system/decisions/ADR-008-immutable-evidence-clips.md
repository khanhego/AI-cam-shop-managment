# ADR-008 — Clip gốc bất biến + SHA-256; overlay chỉ trên bản xuất; bật OSD thời gian của camera

| | |
|---|---|
| Trạng thái | Accepted (2026-10-04, qua G2 item 01 — tự quyết theo ủy quyền của user) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt |
| Người chốt | khanhtt (tự quyết theo ủy quyền, DEC-15 trong [00-status item 01](../../items/01-packing-mvp/00-status.md)) |
| Ngày | 2026-10-04 (cấu trúc lại 2026-10-05; thời hạn bản xuất 24 giờ 2026-10-05 — DEC-58 item 01) |
| Work item / yêu cầu | Thiết kế tổng thể ([architecture.md §1 P3–P4, §6.3, §11](../architecture.md)); áp dụng ở item 01 ([02-tech-spec item 01](../../items/01-packing-mvp/02-tech-spec.md) §8, API-43..45) · CO-02, NFR-08, NFR-13..16, AC-02, AC-08, AC-11, RK-06 |

> **TL;DR** — Clip gốc cắt bằng stream copy, chỉ đọc, lưu SHA-256; bản xuất encode H.264 có overlay `drawtext` kèm file JSON hash; camera bật OSD thời gian.
> Vì sao: chứng minh được clip không bị sửa (NFR-14) mà vẫn có bản xuất đủ chữ mã vận đơn / thời gian cho sàn (NFR-13).
> Đánh đổi lớn nhất: bản xem nội bộ không có chữ mã đơn; xuất phải encode lại (tốn CPU, chạy bất đồng bộ).

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Video là bằng chứng khiếu nại | CO-02, NFR-13..16 |
| Overlay thời gian + mã vận đơn không tách rời hình | NFR-13 |
| SHA-256 khi tạo, kiểm lại bất kỳ lúc nào | NFR-14; nghiệm thu AC-11 |
| Audit mọi xem / xuất / xóa | NFR-15 |
| Định dạng chia sẻ | Lưu H.265, xuất H.264 (NFR-08); MP4 xem được trên điện thoại ≤ 30 giây (AC-08) |
| Clip sẵn sàng | ≤ 60 giây sau đóng phiên (NFR-03) |
| Rủi ro sàn từ chối video | RK-06 (Thấp) |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Chứng minh clip gốc không bị sửa | Bắt buộc (NFR-14, AC-11) |
| Thời gian tạo clip gốc | ≤ 60 giây (NFR-03) — không encode |
| Bản xuất có overlay, tương thích điện thoại | Bắt buộc (NFR-08, NFR-13, AC-08) |
| CPU server | Encode chỉ khi cần, không cho mọi phiên |
| Lớp bằng chứng thời gian độc lập phần mềm | Mong muốn |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **Clip gốc stream copy + hash, overlay khi xuất (chọn)** | Nhanh; giữ nguyên chất lượng; chứng minh được không sửa | Bản xem nội bộ không có chữ mã đơn | Encode H.264 cho mỗi lần xuất (bất đồng bộ, 202 + poll/WS) |
| Encode overlay cho mọi clip | Clip nào cũng có chữ | Tốn CPU; clip gốc không còn nguyên bản | Rủi ro trượt NFR-03 khi nhiều phiên; mất giá trị "nguyên bản" |

## Quyết định

Chọn **clip gốc bất biến**: clip gốc chỉ đọc trên đĩa, lưu SHA-256 trong bảng `clip`. Bản xuất (`media.export_clip`) encode lại H.264 có `drawtext` (mã vận đơn, mã đơn sàn, thời gian, station), tùy chọn ghép Cam 1 + Cam 2 (`hstack`, `SIDE_BY_SIDE`), kèm file `.json` (hash clip gốc, hash bản xuất, thời gian, người xuất). Camera bật OSD thời gian.

| Phương án bị loại | Lý do |
|---|---|
| Encode overlay cho mọi clip | Trượt tiêu chí bắt buộc "clip gốc nguyên bản" và tốn CPU cho mọi phiên |

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Hai lớp bằng chứng thời gian độc lập (OSD camera + overlay phần mềm); hash kiểm được bất kỳ lúc nào |
| Xấu / đánh đổi | Bản xem nội bộ không có chữ mã đơn; mỗi lần xuất tốn CPU encode |
| Phải làm thêm | Audit log mọi lần xem / xuất (`VIEW_CLIP`, `EXPORT_CLIP` theo `uid`); URL ký HMAC hạn 10 phút (02-tech-spec §8); `audit_log` chặn sửa bằng trigger DB (DEC-40 item 01); bản xuất giữ **24 giờ** (architecture.md §8.2) — đổi từ 30 ngày ngày 2026-10-05 (DEC-58 item 01): bản xuất là bản dẫn xuất, tạo lại được khi clip gốc còn, người dùng tải về ngay; tránh đầy ổ. Quyết định chính không đổi |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Sàn có chấp nhận định dạng / độ dài clip xuất không (RK-06) | Chưa kiểm với khiếu nại thật (cần xác nhận) |
| Camera thực tế có OSD và ONVIF để đo lệch giờ không | Điều kiện G2 DEC-33 item 01: nếu không có ONVIF → đổi cách đo lệch giờ bằng change request |
| Xem lại khi | Sàn yêu cầu mọi clip có overlay; hoặc thời gian xuất > 30 giây làm trượt AC-08; hoặc yêu cầu pháp lý cần ký số / timestamp bên thứ ba thay vì chỉ SHA-256 |
