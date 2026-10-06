# 03-expansion-tiktok — Status

| Trường | Giá trị |
|---|---|
| Tên | Mở rộng (Phase 3 theo SRS hệ thống §13.2) — TikTok Shop, báo cáo M09, sao lưu cloud, chia sẻ link bằng chứng, thông báo Zalo / Telegram + Phase 2 hardening (06-business-qa L11, L13, L15) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: admin; station nếu L11 cần) |
| Nhánh | `feat/03-expansion-tiktok` ở cả 3 repo, tạo từ `main` sau merge Phase 2 (PR #2) |
| Last update | 2026-10-06 · PO + UX (bước 2 SRS v0.1, bước 2b màn hình v0.2 — chờ G1) |

Phạm vi: [SRS hệ thống §13.2](../../system/SRS.md) giai đoạn 3 "Mở rộng" — **chỉ TikTok Shop, không Lazada** (quyết định user 2026-10-05); báo cáo M09 (FR-09.02..04), sao lưu cloud, chia sẻ link, thông báo Zalo / Telegram (FR-06.04); kèm hardening L11, L13, L15 từ [06-business-qa Phase 2](../02-returns-reconciliation/06-business-qa.md). Phần cần tài nguyên ngoài (TikTok Shop partner thật, bucket cloud thật, bot Zalo / Telegram thật, camera thật, server kho) làm bằng adapter mock + ghi "chưa test — thiếu tài nguyên".
Số item: 03 (`docs/ai/items/` có 01, 02; remote 3 repo có `main`, `feat/01-…`, `feat/02-…` — 2026-10-06).
**Dải ID của item này** (tránh trùng item 01, 02): DEC-401+, API-150+, J-20+, T-201+ (BE), T-231+ (FE station), T-251+ (FE admin), màn D20+ (dashboard) và R10+ (station). Bước 2 dùng thêm: P7+, UC-15+, BR-29+, NFR-37+, AC-40+, Q18+, RK-16+, AS-12+, CO-05+, EX-P14, EX-R17+, EX-T/B/K/S/N, sự kiện thông báo N01..N10, trang công khai W1. FR / BR / AC / EX / NFR nối tiếp số đã có trong SRS hệ thống và item 01, 02.

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ✅ | 2026-10-06 | khanhtt (tự quyết theo ủy quyền user, DEC-427) | 01-srs.md v0.2 Approved: 46 FR, 14 UC, 23 AC, màn D20–D23 + W1; checklist Chốt G1 7/7 ✓; câu hỏi chặn G1 = 0 (Q13, Q18..Q21 chặn go-live) |
| Spec 02 / 02a / 02b | ⬜ | | | |
| G2 Thiết kế | ⬜ | | | |
| Plan | ⬜ | | | |
| G3 Build | ⬜ | | | |
| G4 Kiểm thử | ⬜ | | | |
| G5 Release | ⬜ | | | |

## Solo pipeline
| # | Bước | Trạng thái | Ngày | Ghi chú |
|:-:|---|:---:|---|---|
| 0 | Khởi tạo dự án | ⏭ | | Đã có `.ai/profile.md` (item 01) |
| 1 | Mở item | ✅ | 2026-10-06 | CP1 tự duyệt theo ủy quyền user (DEC-401): lane feature, M, be + fe, NN = 03 |
| 2 | SRS | ✅ | 2026-10-06 | [01-srs.md](01-srs.md) v0.1: 6 vấn đề P7..P12, 46 FR (M 39 · S 5 · C 2), 14 UC (9 mới UC-15..23), BR-29..42, NFR-37..46, AC-40..62 (23), Q18..Q25 (+ Q13 mở rộng), DEC-402..421, 425, 426 |
| 2b | Màn hình | ✅ | 2026-10-06 | 01 §10 (v0.2): mới D20 Báo cáo, D21 Link chia sẻ, D22 Thông báo, D23 Sao lưu, W1 trang người nhận, `ShareLinkDialog`, `PlatformChip`; mở rộng D2, D3, D4, D7 (→ "Kết nối sàn"), D8, D10, D13, D14, D15, D16, D17, S1, S2, S4, R2; R5 dùng lại; journey 5 UC; kiểm phủ FR → màn đủ; DEC-422..424 |
| 3 | Tech spec | ⬜ | | |
| 4a | BE spec | ⬜ | | |
| 4b | FE spec | ⬜ | | |
| 5 | Review bộ spec | ⬜ | | |
| 6 | Kế hoạch | ⬜ | | |
| 7 | Test cases | ⬜ | | |
| 8 | Implement | ⬜ | | |
| 8c | Tài liệu nghiệp vụ (mỗi lát) | ⬜ | | |
| 9 | Commit / PR | ⬜ | | |
| 10 | Review code | ⬜ | | |
| 11 | Chạy test | ⬜ | | |
| 12 | Release | ⬜ | | |

## NOW
| Owner tiếp | Việc tiếp | Skill |
|---|---|---|
| PO (điều phối) | Duyệt G1 cho 01-srs.md v0.2 (checklist cuối 01) → tick G1, 01 = Approved | `ai-po-write-srs` (chốt G1) → kế tiếp `ai-architect-write-spec` |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|
| PO | Architect | Bước 3 cần: (1) cập nhật architecture §7 / job `media.backup_pending` — sao lưu chỉ bằng chứng cần giữ, không mọi clip (DEC-406); (2) ADR-009 thêm luật "bỏ bằng chứng giữ như đóng hồ sơ" (DEC-418); (3) cân nhắc ADR mới cho kho lưu cloud dùng chung sao lưu + link chia sẻ (DEC-407, 409, 425) và adapter theo sàn của shop + nhóm trạng thái chung (DEC-402, 403); (4) migration bỏ unique toàn cục `order.platform_order_sn` (BR-29) | Mở |

## Lịch sử
| Ngày | Vai | Việc |
|---|---|---|
| 2026-10-06 | Flow | Mở item 03 (Phase 3). Phase 2 đã merge `main` (PR #2 ở 3 repo). Nhánh `feat/03-expansion-tiktok` |
| 2026-10-06 | PO | Bước 2: viết 01-srs.md v0.1 — quét hiện trạng (adapter Shopee / mock, giới hạn một shop DEC-12, chữ trạng thái Shopee trong lõi đối soát, sao lưu chỉ pg_dump cùng máy, 06-business-qa L11–L15); 46 FR, 23 AC, DEC-402..421, 425, 426; không sửa code, không commit |
| 2026-10-06 | UX | Bước 2b: 01 §10 (v0.2) — kiểm kê REUSE / EXTEND / NEW, journey UC-10, 15, 16/17, 18, 20, 22, 23, đặc tả D7, D20, D21, D22, D23, W1, ShareLinkDialog + mở rộng station / dashboard đủ trạng thái và chữ thật; DEC-422..424 |

## Quyết định (DEC)
| ID | Vấn đề | Quyết định | Lý do | Người | Ngày |
|---|---|---|---|---|---|
| DEC-401 | CP1 mở item Phase 3 | Lane feature, quy mô M, be + fe, NN = 03, slug `expansion-tiktok`; phạm vi theo SRS §13.2 giai đoạn 3 chỉ TikTok Shop + L11, L13, L15 | Quyết định user 2026-10-05 (chỉ TikTok); Q&A Phase 2 đề xuất sửa L11, L13, L15 đầu Phase 3 | khanhtt (Flow, tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-402 | Quét hiện trạng TikTok / nhiều shop | Mở rộng: TikTok là adapter thứ hai cùng `PlatformAdapter`; bỏ giới hạn một shop (DEC-12) cho mọi sàn | NFR-28, ADR-007; shop thật nhiều gian hàng | khanhtt (PO, tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-403 | Lõi dùng chữ trạng thái Shopee | Trạng thái nguyên văn + nhóm trạng thái chung; lõi chỉ đọc nhóm | Thêm sàn không sửa lõi | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-404 | Quét mã lạ khi nhiều shop | Tra song song mọi shop, tổng ≤ 2 giây | Giữ NFR-01 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-405 | Loại yêu cầu trả TikTok | Chỉ hoàn tiền → "Chỉ hoàn tiền"; trả hàng / đổi hàng → "Khách trả hàng"; chờ duyệt chưa chạy đồng hồ BR-12 (cần xác minh Q19) | Dùng lại máy trạng thái Phase 2 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-406 | Sao lưu cloud gồm gì | DB mỗi 6 giờ + chỉ bằng chứng cần giữ (BR-33); mọi clip đóng gói là tùy chọn C; không video thô | ≈ 4,6 GB / ngày, ≈ 70–170 nghìn đ / tháng thay vì ≈ 30 GB / ngày | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-407 | Bảo mật bản sao lưu | Mã hóa tại kho, khóa riêng ngoài DB, Admin xác nhận cất khóa theo dấu vân tay | Nhà cung cấp không đọc được | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-408 | Bí mật mới để ở đâu | Cấu hình máy chủ; UI chỉ chỉnh lựa chọn không bí mật | Nhất quán `SHOPEE_*`, khóa không nằm trong DB được sao lưu | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-409 | Link chia sẻ khi server chỉ trong LAN | Tải bản dựng lên kho lưu cloud, link ký ≤ 7 ngày, thu hồi = xóa file | Không mở cổng vào kho (ADR-001); loại tunnel, gửi zip, dịch vụ trung gian | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-410 | Audit link | Tạo / thu hồi / hết hạn + "gửi cho" bắt buộc; không đếm lượt xem | Hệ quả DEC-409 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-411 | Nội dung người nhận thấy | Video có chữ + ảnh + thông tin phiên + SHA-256; không dữ liệu nội bộ; cảnh báo nhãn người mua | Tối thiểu dữ liệu (NĐ 13) | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-412 | Kênh thông báo | Telegram + Zalo OA qua lớp kênh chung; email ngoài phạm vi | Hai kênh phòng bị chặn / phí (RK-22) | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-413 | Sự kiện, người nhận, chống spam | N01..N10; bỏ trùng, gom 2 phút, trần 30 tin / giờ / kênh, giờ yên lặng 22:00–07:00 (cần xác nhận Q22) | Ít tin mà đủ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-414 | Năng suất "theo nhân viên" với tài khoản station chung | Theo station + tên người đứng bàn (tên người đóng gói tùy chọn FR-03.16); tab Năng suất chỉ Admin / Supervisor | Giữ DEC-1 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-415 | Công thức báo cáo | BR-41 (tỷ lệ hoàn theo kỳ, tỷ lệ thắng trên hồ sơ có kết quả) | Kiểm được bằng dữ liệu đang có | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-416 | L11 | Phiên mở hoàn trước vào bằng chứng (sớm nhất là chính); station tự hủy ≤ 60 giây và chưa kết luận / ảnh; D2 đếm 7 ngày | Video mở hộp đầu là bằng chứng mạnh nhất | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-417 | L13 | D2 Cần xử lý + D14 cột hạn + N04 khi mới / còn ≤ 12 giờ; hạn mặc định 48 giờ (cần xác nhận Q13) | Ca dễ mất tiền nhất | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-418 | L15 | Bỏ bằng chứng cần lý do + xác nhận; giữ tới max(kết thúc, lúc bỏ) + số ngày giữ (như đóng hồ sơ) | Một luật "rời bảo vệ"; cần cập nhật ADR-009 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-419 | L14 | Làm phần rẻ (hạn đã qua → mặc định + ghi chú; D2 đếm quá hạn; N05); nghĩa trường hạn chờ T-3 / Q19 | Giảm rủi ro ngay | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-420 | L12, L16..L23, Lazada | Ngoài phạm vi (backlog); Lazada theo user | Giữ quy mô M | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-421 | Ưu tiên FR gốc S / C | Nâng M trong Phase 3, giữ S / C cho phần phụ | User đưa vào phạm vi Phase 3 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-422 | (UX) Màn mới | D20 Báo cáo, D21 Link chia sẻ, D22 Thông báo, D23 Sao lưu, W1; D7 → "Kết nối sàn"; một ShareLinkDialog cho D4 + D17 | Mỗi màn một việc | khanhtt (UX, tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-423 | (UX) Hình thức báo cáo | Thẻ số + bảng + chú thích công thức; biểu đồ là C | Hành động được, kiểm được số | khanhtt (UX, tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-424 | (UX) Hủy phiên hoàn cần quản lý | Dùng lại "Gọi quản lý" + "Hủy phiên" ở D13 | Không thêm loại yêu cầu duyệt | khanhtt (UX, tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-425 | Nơi đặt kho lưu (NĐ 13) | Ưu tiên nhà cung cấp S3-compatible tại VN (cần xác nhận Q20) | Tránh nghĩa vụ chuyển dữ liệu ra nước ngoài | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-426 | Đơn từ file khi nhiều shop | Giữ nguyên mẫu file; shop đầu tiên đồng bộ thấy cùng mã đơn nhận đơn | Không phá file cũ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-427 | Chốt G1 item 03 | **G1 ✅**: 01 v0.2 Approved; sang bước 3 (`ai-architect-write-spec`) | Checklist 7/7 ✓, không câu hỏi chặn G1 | khanhtt (điều phối, tự quyết theo ủy quyền user) | 2026-10-06 |
