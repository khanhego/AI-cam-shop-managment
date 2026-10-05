# Q&A nghiệp vụ sau Phase 1 — 01 MVP đóng gói

| | |
|---|---|
| Tác giả | khanhtt (agent độc lập vai PO + chủ shop, chỉ đọc) |
| Reviewer | khanhtt (PO) |
| Trạng thái | Final |
| Nguồn | Code nhánh `feat/01-packing-mvp` HEAD `985e632` (= main sau merge PR #1), [01-srs](01-srs.md), [SRS hệ thống](../../system/SRS.md) |
| Last update | 2026-10-05 · PO |

> **TL;DR** — 32 câu hỏi tình huống thật (khiếu nại, quên quét, dán nhầm, mất điện, hủy đơn, quyền, giờ camera). **Không có CRITICAL** theo định nghĩa của user (mất / sai bằng chứng mà không chặn, không báo, không có cách xử lý). 10 điểm cần ghi log (L1–L10): 4 Major đưa vào item 02 (Phase 2) phần "Phase 1 hardening" (L2, L3, L4, L5), Q13 chặn go-live (L1), còn lại vào backlog / SOP. Chi tiết bảng Q&A: báo cáo agent ngày 2026-10-05 (tóm tắt dưới).

## 1. Kết luận
- Không CRITICAL → không dừng (quy tắc user 2026-10-05). Phase 2 được bắt đầu.
- Hai việc phải chốt trước go-live tại kho: **Q13** (thời hạn khiếu nại thật của sàn so với clip 90 ngày) và **T-4** (Cam 2 với camera thật, AC-04 ≥ 95%).

## 2. Kết quả theo nhóm câu hỏi
| Nhóm | Đánh giá | Ghi chú |
|---|---|---|
| Tìm bằng chứng khi khiếu nại (Cam 1 + Cam 2, nhiều kiện, nhiều phiên) | Đúng | Tra theo mã vận đơn / mã đơn; giữ clip có audit |
| Thời hạn giữ bằng chứng | Thiếu | Q13 chưa đóng (L1); hạ retention không có sàn / xác nhận (L2) |
| Chặn dán nhầm phiếu | Đúng | Quét sai mã → chặn 100%; khay còn phiếu khác → chặn (BR-06) |
| Quên quét đóng rồi gói kiện khác | Lệch nhẹ | Không gắn nhầm video, nhưng chữ hướng dẫn S3 dễ khiến dán nhầm phiếu (L3) |
| Cam 2 không đọc được / phiếu còn trên khay | Đúng theo SRS/DEC-26, thiếu giám sát | Cờ `CAM2_UNVERIFIED`, `LABEL_ON_TRAY` không lên D2, không báo station (L4) |
| Mất điện, mất mạng, rút cáp camera | Đúng | Phiên giữ trong DB; `VIDEO_INCOMPLETE`; J-11 cắt lại; AC-10 chờ phần cứng |
| Đơn hủy / chưa xác minh | Đúng theo DEC | Trễ ≤ 15 phút; không báo station khi hủy lúc đang đóng (L9) |
| Bản xuất gửi sàn | Đúng | Thiếu trạng thái phiên, cờ, lệch giờ camera trong `info.json` (L5) |
| Quyền, sửa / xóa bằng chứng | Đúng | Không có API xóa; clip 0444 + SHA-256; audit đủ; CSKH bỏ giữ được (L7) |
| Truy trách nhiệm cá nhân | Thiếu (đã chấp nhận DEC-1/2) | Chỉ nhận người qua video Cam 1; sổ ca giấy (L10) |

## 3. Log mâu thuẫn / thiếu và nơi xử lý
| # | Vấn đề | Mức | Xử lý |
|---|---|---|---|
| L1 | Q13 chưa đóng: 90 ngày chưa đối chiếu thời hạn khiếu nại thật | Major | 01-srs §12 Q13 → **chặn go-live**; hỏi chủ shop |
| L2 | Hạ số ngày giữ clip không có sàn tối thiểu và không xác nhận → xóa hàng loạt bằng chứng gián tiếp | Major | Change request → item 02 "Phase 1 hardening" |
| L3 | Chữ hướng dẫn S3 sai cho tình huống "quên quét đóng kiện trước" | Major | Change request → item 02 |
| L4 | `CAM2_UNVERIFIED`, `LABEL_ON_TRAY` không lên D2, không báo station ngay | Major | Change request → item 02 (đo được chỉ số P5 "0 giao sai") |
| L5 | `info.json` thiếu `session_status`, `flags`, `clock_offset_ms` | Minor | Item 02 (hồ sơ khiếu nại M08 dùng trực tiếp) |
| L6 | Kiện ABANDONED về NEW nhưng thực tế có thể đã gửi | Minor | Item 02 (đối soát M06) |
| L7 | Giữ clip theo từng phiên; CSKH bỏ giữ được | Minor | Item 02 (hồ sơ khiếu nại thay cờ giữ, BR-09 gốc) |
| L8 | Không có ảnh chụp sản phẩm lúc đóng; FR-05.10 "giữ lịch sử" chỉ đúng cho CSV | Minor | Item 02 (đối chiếu hàng hoàn cần) |
| L9 | Đơn hủy khi đang đóng không báo station; UNVERIFIED tồn lâu không có danh sách | Minor | Item 02 (đối soát) |
| L10 | SOP: quét mở trước khi lấy hàng; chỉ quét đóng mã trên kiện; tắt OSD hoặc bật NTP camera; sổ ca | Minor | [05-release](05-release.md) §7 điều kiện go-live / đào tạo |

## 4. Lưu ý cho Phase 2
1. Liên kết hàng hoàn: chưa có mã vận đơn hoàn / liên kết kiện gốc; trạng thái `RETURN_*` chưa có trong máy trạng thái — Q6 phải trả lời (hoặc DEC) trước spec.
2. Hồ sơ khiếu nại thay cờ "giữ": migration clip đang giữ sang hồ sơ; tạo hồ sơ tự giữ clip đóng gói gốc; đơn trước khi có hệ thống không có clip (EX-R3).
3. Lưu ảnh chụp sản phẩm khi PACKED để so hàng hoàn (L8).
4. Hồ sơ / bản xuất ghi trạng thái phiên + cờ; tự chọn phiên COMPLETED mới nhất, đính kèm phiên khác.
5. Đối soát dựa J-06 + `CANCELLED_AFTER_PACK`; thêm xử lý vật lý kiện hủy sau đóng và kiện ABANDONED đã gửi.
6. Nghiệm thu Phase 2 phụ thuộc T-3 (Shopee) và T-4 (camera thật) như Phase 1.
7. Bàn kiểm hàng hoàn có dùng tài khoản chung không (DEC-1) — quyết sớm.
