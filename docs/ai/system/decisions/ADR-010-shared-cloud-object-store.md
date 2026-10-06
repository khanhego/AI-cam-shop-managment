# ADR-010 — Một kho lưu cloud S3-compatible dùng chung cho sao lưu mã hóa và link chia sẻ, chỉ gọi ra ngoài

| | |
|---|---|
| Trạng thái | Proposed (2026-10-06, item 03 bước 3 — chờ G2) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt (review bước 5) |
| Người chốt | khanhtt (tự quyết theo ủy quyền user — DEC-437, DEC-438, DEC-441 trong [02 item 03](../../items/03-expansion-tiktok/02-tech-spec.md)) |
| Ngày | 2026-10-06 |
| Work item / yêu cầu | [item 03](../../items/03-expansion-tiktok/01-srs.md) · FR-02.08, 02.13..18, FR-07.05, 07.07..09 · NFR-40..42, 44, 46 · DEC-406, 407, 409, 425 · CO-05, CO-06 |

> **TL;DR** — Server kho chỉ gọi ra ngoài tới **một** kho lưu S3-compatible (bucket riêng tư, tiền tố `backup/` và `share/`). Sao lưu được **mã hóa tại kho** (AES-256-GCM theo khối, khóa ngoài DB) trước khi tải lên. Link chia sẻ là **URL ký có hạn ≤ 7 ngày** của một trang HTML tĩnh dựng sẵn (chứa URL ký của từng video); thu hồi = xóa đối tượng.
> Vì sao: không mở cổng vào máy giữ toàn bộ dữ liệu (ADR-001), một nhà cung cấp / một bộ khóa cho cả hai nhu cầu.
> Đánh đổi lớn nhất: không đếm được lượt xem, trang lỗi khi hết hạn là của nhà cung cấp, thu hồi cần kho có Internet.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| Server kho chỉ outbound, không mở cổng vào | ADR-001, CO-05 |
| Bằng chứng + DB chỉ có một bản tại kho | P9; `ai-cam-be/docker/backup/pg-backup.sh` ghi `BACKUP_DIR` cùng máy |
| Sao lưu chỉ bằng chứng cần giữ, ≈ 4,6 GB / ngày | DEC-406, 01 §8.2 |
| Nhà cung cấp không được đọc bản sao (video có nhãn người mua) | DEC-407, NFR-41 |
| Người ngoài (sàn, ĐVVC) xem bằng chứng không đăng nhập, hạn ≤ 7 ngày, thu hồi ≤ 60 giây | FR-07.05..08, NFR-42 |
| Nơi đặt dữ liệu theo NĐ 13 | DEC-425, Q20 (chặn go-live) |
| Chưa có bucket thật | CO-07 → dev / test dùng MinIO trong compose dev |

## Tiêu chí quyết định

| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Không mở đường vào server kho | Bắt buộc |
| Bản sao cloud vô dụng khi không có khóa | Bắt buộc (NFR-41) |
| Link: ≥ 128 bit ngẫu nhiên, không liệt kê được, thu hồi được | Bắt buộc (NFR-42) |
| Số thành phần phải vận hành thêm | Càng ít càng tốt (architecture §1 P6) |
| Đổi nhà cung cấp không sửa code | Cao (Q20 chưa chốt) |

## Các phương án

| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| **A. Một kho S3-compatible, mã hóa phía kho, link = URL ký trang HTML tĩnh (chọn)** | Chỉ outbound; nhà cung cấp chỉ thấy bản mã (sao lưu); bucket riêng tư; một bộ khóa truy cập | Không đếm lượt xem; trang lỗi của nhà cung cấp; hạn ký ≤ 7 ngày (SigV4) | Thấp; phụ thuộc nhà cung cấp phục vụ `text/html` (RK-27) |
| B. Tunnel (Cloudflare Tunnel…) + trang chia sẻ chạy trên server kho | Đếm lượt xem, trang lỗi tùy biến | Mở đường vào máy giữ toàn bộ dữ liệu; phụ thuộc dịch vụ tunnel | Trượt tiêu chí bắt buộc 1 |
| C. Bucket công khai theo tiền tố ngẫu nhiên | URL ngắn, trang tham chiếu tương đối | Lộ cả tiền tố nếu bucket policy cấu hình sai; không có hạn ở phía nhà cung cấp | Trung bình |
| D. Mã hóa phía nhà cung cấp (SSE) | Không tự viết mã hóa | Nhà cung cấp đọc được | Trượt tiêu chí bắt buộc 2 |
| E. Dịch vụ trung gian riêng trên cloud (VPS phục vụ link) | Toàn quyền trang | Thêm một hệ thống phải vá, giám sát | Cao |

## Quyết định

Chọn **A**.

1. **Một client đối tượng** (`modules/cloud`): boto3 S3 với `endpoint_url` (MinIO, nhà cung cấp VN, AWS…), cấu hình bằng biến môi trường `S3_*` (DEC-408). Một bucket riêng tư, không bật public, không bật liệt kê cho khóa đọc. Tiền tố: `backup/db/…`, `backup/imports/…`, `backup/evidence/clips/{clip_id}.enc`, `backup/evidence/snapshots/{snapshot_id}.enc`, `share/{token}/…`.
2. **Sao lưu**: mã hóa tại kho trước khi rời máy — định dạng `AICAMENC1`: header (magic, phiên bản, dấu vân tay khóa 64 bit, kích thước khối), dữ liệu chia khối 4 MiB, mỗi khối AES-256-GCM với nonce = tiền tố ngẫu nhiên 64 bit ‖ số thứ tự khối, AAD = (số thứ tự, cờ khối cuối) — chống cắt / đảo khối. Khóa 256 bit `BACKUP_ENCRYPTION_KEY` chỉ ở cấu hình máy chủ, không vào DB, log, bản sao. Admin xác nhận đã cất khóa theo dấu vân tay trước khi job chạy (FR-02.17).
3. **Link chia sẻ**: job dựng video có chữ (dùng lại `render_side_by_side_to`), ảnh, và trang `index.html` tĩnh (không JS ngoài, tiếng Việt) chứa **URL ký** của từng file; tải lên `share/{token}/` (token 256 bit). Link trả người dùng = URL ký của `index.html`, hạn = hạn link (≤ 7 ngày). Thu hồi / hết hạn = xóa mọi đối tượng của token (URL ký còn hạn trả lỗi `NoSuchKey`). Link lưu trong DB đã mã hóa (Fernet), không ghi log.
4. **Băng thông**: một token bucket chung trong Redis cho mọi lần tải lên (mặc định 10 Mbit/s — NFR-44); link chia sẻ được ưu tiên (sao lưu bằng chứng nhường lượt khi có job link đang chạy).
5. **Dev / test**: MinIO trong `compose.dev.yml` (+ tạo bucket lúc khởi động); unit test dùng kho giả trong bộ nhớ cùng interface.

Loại B vì mở đường vào server kho (ADR-001). Loại C vì một lỗi cấu hình bucket policy là lộ mọi link, không có hạn phía nhà cung cấp. Loại D vì nhà cung cấp đọc được video có nhãn người mua. Loại E vì thêm hệ thống phải vận hành cho một tính năng.

## Hệ quả

| Loại | Nội dung |
|---|---|
| Tốt | Không cổng vào; mất bucket không lộ bản sao lưu; một cấu hình kho cho hai tính năng; đổi nhà cung cấp = đổi `S3_ENDPOINT` |
| Xấu / đánh đổi | Không đếm lượt xem (DEC-410); hạn link tối đa 7 ngày; trang lỗi khi hết hạn / thu hồi là XML của nhà cung cấp (EX-S4); kho mất Internet thì thu hồi chưa có hiệu lực tới khi có mạng (link vẫn mở được trên cloud) |
| Phải làm thêm | Module `cloud` (client, mã hóa, giới hạn tốc độ); `backup`, `shares`; MinIO dev; lệnh khôi phục + kiểm SHA-256 (FR-02.16); runbook giữ khóa (RK-19); kiểm nhà cung cấp phục vụ `text/html` inline + URL ký 7 ngày khi chốt Q20 |

## Câu hỏi mở & điều kiện xem lại

| Câu hỏi / điều kiện | Xử lý |
|---|---|
| Nhà cung cấp VN nào (Q20), có hỗ trợ SigV4 presign 7 ngày, `Content-Type: text/html` inline, xóa đối tượng tức thì? | Kiểm khi chốt Q20; không đạt → đổi cách phục vụ trang (phương án C với bucket riêng cho `share/`) bằng ADR mới |
| Cần đếm lượt xem link | Xem lại khi nhà cung cấp có nhật ký truy cập dùng được (DEC-410 backlog) |
| Đổi khóa sao lưu | Backlog (01 §1 Non-goals): cần mã hóa lại hoặc giữ nhiều khóa theo dấu vân tay trong header |
| Dung lượng thực > 2 lần ước tính 01 §8.2 sau 1 tháng | Xem lại phạm vi BR-33 / giá |
