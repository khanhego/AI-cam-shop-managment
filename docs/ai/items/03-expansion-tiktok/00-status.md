# 03-expansion-tiktok — Status

| Trường | Giá trị |
|---|---|
| Tên | Mở rộng (Phase 3 theo SRS hệ thống §13.2) — TikTok Shop, báo cáo M09, sao lưu cloud, chia sẻ link bằng chứng, thông báo Zalo / Telegram + Phase 2 hardening (06-business-qa L11, L13, L15) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: admin; station nếu L11 cần) |
| Nhánh | `feat/03-expansion-tiktok` ở cả 3 repo, tạo từ `main` sau merge Phase 2 (PR #2) |
| Last update | 2026-10-06 · Architect + BE + FE (bước 3, 4a, 4b — bộ spec In review, chờ bước 5) |

Phạm vi: [SRS hệ thống §13.2](../../system/SRS.md) giai đoạn 3 "Mở rộng" — **chỉ TikTok Shop, không Lazada** (quyết định user 2026-10-05); báo cáo M09 (FR-09.02..04), sao lưu cloud, chia sẻ link, thông báo Zalo / Telegram (FR-06.04); kèm hardening L11, L13, L15 từ [06-business-qa Phase 2](../02-returns-reconciliation/06-business-qa.md). Phần cần tài nguyên ngoài (TikTok Shop partner thật, bucket cloud thật, bot Zalo / Telegram thật, camera thật, server kho) làm bằng adapter mock + ghi "chưa test — thiếu tài nguyên".
Số item: 03 (`docs/ai/items/` có 01, 02; remote 3 repo có `main`, `feat/01-…`, `feat/02-…` — 2026-10-06).
**Dải ID của item này** (tránh trùng item 01, 02): DEC-401+, API-150+, J-20+, T-201+ (BE), T-231+ (FE station), T-251+ (FE admin), màn D20+ (dashboard) và R10+ (station). Bước 2 dùng thêm: P7+, UC-15+, BR-29+, NFR-37+, AC-40+, Q18+, RK-16+, AS-12+, CO-05+, EX-P14, EX-R17+, EX-T/B/K/S/N, sự kiện thông báo N01..N10, trang công khai W1. FR / BR / AC / EX / NFR nối tiếp số đã có trong SRS hệ thống và item 01, 02.

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ✅ | 2026-10-06 | khanhtt (tự quyết theo ủy quyền user, DEC-427) | 01-srs.md v0.2 Approved: 46 FR, 14 UC, 23 AC, màn D20–D23 + W1; checklist Chốt G1 7/7 ✓; câu hỏi chặn G1 = 0 (Q13, Q18..Q21 chặn go-live) |
| Spec 02 / 02a / 02b | In review | 2026-10-06 | — (chờ `ai-lead-review` bước 5) | [02](02-tech-spec.md) v0.1 · [02a](02a-be-spec.md) v0.1 · [02b-admin](02b-fe-spec-admin.md) v0.1 · [02b-station](02b-fe-spec-station.md) v0.1; W1 do BE sinh — không có 02b-public (DEC-428) |
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
| 3 | Tech spec | ✅ | 2026-10-06 | [02-tech-spec.md](02-tech-spec.md) v0.1 In review: 26 API mới (API-150..156, 160..164, 170..176, 180..186) + mở rộng 25 API; ADR-010 (kho lưu cloud dùng chung), ADR-011 (đa sàn / shop, nhóm trạng thái), ADR-009 bổ sung (L15); architecture §2, §6.2, §7.3, §8.2, §10, §16 + system-map (phần lệch: Phase 2 đã merge, 28 bảng, mục Phase 3); DEC-428..462 |
| 4a | BE spec | ✅ | 2026-10-06 | [02a-be-spec.md](02a-be-spec.md) v0.1 In review: migration 0006 (25 cột + 9 bảng, chỉ thêm) + 0007 (unique theo shop), downgrade `phase3_archive`; J-04/05/06/12/13 một task / shop; J-20..J-28; module `cloud`, `backup`, `shares`, `notify`; adapter TikTok + mock; 30 task T-201..T-230 ≈ 54 ngày công; DEC-463..478 |
| 4b | FE spec | ✅ | 2026-10-06 | [02b-fe-spec-admin.md](02b-fe-spec-admin.md) v0.1 (D7 Kết nối sàn, D20–D23, ShareLinkDialog, PlatformChip, mở rộng 10 màn; 12 task T-251..T-262 ≈ 21,5 ngày) · [02b-fe-spec-station.md](02b-fe-spec-station.md) v0.1 (S1, S2, S4, R2, R5; 5 task T-231..T-235 ≈ 5 ngày); DEC-479..489 |
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
| Tech lead (review) | Bước 5: soát bộ spec 02 + 02a + 02b-admin + 02b-station (+ ADR-010, ADR-011, bổ sung ADR-009) → findings → chốt G2 | `ai-lead-review` (spec) |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|
| PO | Architect | Bước 3 cần: (1) cập nhật architecture §7 / job `media.backup_pending` — sao lưu chỉ bằng chứng cần giữ, không mọi clip (DEC-406); (2) ADR-009 thêm luật "bỏ bằng chứng giữ như đóng hồ sơ" (DEC-418); (3) cân nhắc ADR mới cho kho lưu cloud dùng chung sao lưu + link chia sẻ (DEC-407, 409, 425) và adapter theo sàn của shop + nhóm trạng thái chung (DEC-402, 403); (4) migration bỏ unique toàn cục `order.platform_order_sn` (BR-29) | **Đóng** 2026-10-06: (1) architecture §2, §6.2, §7.3, §8.2; (2) ADR-009 mục "Bổ sung 2026-10-06" (DEC-449, 458); (3) ADR-010, ADR-011; (4) migration 0007 (02a §3, DEC-431, 456) |
| Architect | PO | Đề xuất bổ sung 01 (không đổi FR, chỉ làm rõ): (a) EX-S7 "Thu hồi khi kho mất Internet → link còn mở được trên cloud tới khi có mạng lại hoặc hết hạn; D21 hiện 'Đang thu hồi — chờ Internet'" (FR-07.08 ≤ 60 giây chỉ đúng khi có mạng — DEC-442); (b) N01 "giờ làm việc" = ngoài giờ yên lặng (DEC-444) — xác nhận cùng Q22; (c) token Zalo OA xoay vòng lưu DB mã hóa — ngoại lệ DEC-408 (DEC-445); (d) Q18 thêm: TikTok có nhận redirect `https://x.local/…` không (RK-26); Q20 thêm: nhà cung cấp phải phục vụ `text/html` inline qua URL ký 7 ngày (RK-27) | Mở |
| FE | UX | 01 §10.5 chưa vẽ 2 ô cấu hình có trong SETTING (§9): "Hạn mặc định Chỉ hoàn tiền (giờ)" → đặt ở D8 nhóm ngưỡng (DEC-485); "Giới hạn tốc độ tải lên (Mbit/s)" → D23 mục "Nâng cao" (DEC-486). Xác nhận hoặc vẽ lại khi cập nhật §10 | Mở (không chặn G2) |

## Lịch sử
| Ngày | Vai | Việc |
|---|---|---|
| 2026-10-06 | Flow | Mở item 03 (Phase 3). Phase 2 đã merge `main` (PR #2 ở 3 repo). Nhánh `feat/03-expansion-tiktok` |
| 2026-10-06 | PO | Bước 2: viết 01-srs.md v0.1 — quét hiện trạng (adapter Shopee / mock, giới hạn một shop DEC-12, chữ trạng thái Shopee trong lõi đối soát, sao lưu chỉ pg_dump cùng máy, 06-business-qa L11–L15); 46 FR, 23 AC, DEC-402..421, 425, 426; không sửa code, không commit |
| 2026-10-06 | PO | G1 ✅ (DEC-427) — 01 v0.2 Approved |
| 2026-10-06 | Architect | Bước 3: 02-tech-spec.md v0.1 (đọc code thật `platforms`, `orders`, `returns`, `reconciliation`, `sessions`, `claims`, `media.protection`, `reports`, `settings`, `core`, `workers`, alembic 0001–0005, compose, ops); ADR-010, ADR-011 (Proposed), ADR-009 bổ sung, ADR-007 liên kết; architecture + system-map cập nhật; DEC-428..462 (tự quyết theo ủy quyền user) |
| 2026-10-06 | BE | Bước 4a: 02a-be-spec.md v0.1 — 30 task T-201..T-230; DEC-463..478 (tự quyết theo ủy quyền user) |
| 2026-10-06 | FE | Bước 4b: 02b-fe-spec-admin.md v0.1 (T-251..T-262) + 02b-fe-spec-station.md v0.1 (T-231..T-235); DEC-479..489; API-156 thêm vào 02 theo DEC-484 (tự quyết theo ủy quyền user). Không sửa code, không commit |
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
| DEC-428 | W1 có cần client FE riêng | Không — HTML tĩnh do BE sinh, nội dung chốt 02 §6.3; FE chỉ admin + station | Trang phải sống trên kho lưu khi server kho không ra Internet | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-429 | Lõi đọc chữ Shopee | `order.platform_status_group` 8 nhóm, lõi chỉ đọc nhóm (ADR-011) | NFR-28 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-430 | Nhóm yêu cầu trả | 5 nhóm (tách REQUESTED / ACCEPTED), `return_case.shop_id`, unique (shop, mã yêu cầu) | BR-31, mã trùng giữa sàn | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-431 | BR-29 mã đơn trùng giữa shop | Unique (shop, mã) + nhóm đơn file; shop đầu tiên nhận đơn file; giữ khóa `order:{sn}` | Giữ thứ tự khóa DEC-266 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-432 | EX-T2 báo ở đâu | `shop.sync_warnings`, không `last_error` | Một kiện lạ không làm shop "lỗi" | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-433 | TikTok grant nhiều shop | `shop.grant_ref` + khóa Redis `grant:` khi làm mới, ghi mọi shop cùng grant | Refresh token dùng một lần | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-434 | NFR-39 cô lập shop | Một task Celery / shop, ngân sách thời gian, `worker-sync -c 4` | Shop chậm không kéo cả chu kỳ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-435 | BR-32 tra song song | `asyncio.gather` + cắt 2 giây, DB đọc trước; ≥ 2 shop → `AMBIGUOUS_SHOP` | NFR-01 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-436 | Cờ TikTok | `TIKTOK_ENABLED`, `TIKTOK_RETURNS_ENABLED`, `TIKTOK_ADAPTER`; `PLATFORM_ADAPTER` giữ cho Shopee | Tương thích cấu hình cũ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-437 | Kho lưu dùng chung | Một bucket riêng tư, tiền tố `backup/` `share/`, boto3 (ADR-010) | Một cấu hình, một nhà cung cấp | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-438 | Mã hóa sao lưu | AES-256-GCM theo khối 4 MiB, `BACKUP_ENCRYPTION_KEY`, dấu vân tay | Chuẩn có xác thực, giải mã luồng | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-439 | Ai sao lưu DB lên cloud | Worker queue `backup` (`worker-backup`, pg_dump 16 trong image); giữ `pg-backup.sh` local | Có trạng thái cho D23, thử lại | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-440 | Phát hiện bằng chứng cần giữ | J-21 quét SQL bảo vệ ADR-009 mỗi 10 phút | Một nguồn sự thật với retention | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-441 | Phục vụ link | URL ký `index.html` chứa URL ký media; bucket riêng tư; thu hồi = xóa; URL lưu mã hóa | Không cần bucket công khai | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-442 | Thu hồi khi mất Internet | `REVOKED` + `revoke_pending`, xóa lại mỗi phút, D21 báo | Trung thực với giới hạn kỹ thuật | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-443 | Phát sinh thông báo | Quét điều kiện 30 giây + `notify_event` bỏ trùng | Không hook rải rác, không sót | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-444 | N01 "giờ làm việc" | = ngoài giờ yên lặng (cần xác nhận Q22) | Không đánh thức ban đêm | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-445 | Token Zalo OA xoay vòng | Lưu DB mã hóa Fernet, khởi tạo từ env (ngoại lệ DEC-408) | Như token sàn | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-446 | Báo cáo tính thế nào | SQL theo tập + index + cache 60 giây; CSV server sinh | Số đúng tức thì | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-447 | BR-37 thực thi | Server API-12 409 `CANCEL_REQUIRES_SUPERVISOR`; `self_cancel_until`; API-21 bắt lý do | Không tin đồng hồ máy trạm | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-448 | Phiên chính / phiên trước | Suy ra lúc đọc, không thêm cột | Một luật, không lệch dữ liệu | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-449 | BR-38 bỏ bằng chứng | Bỏ mềm `claim_evidence.removed_*`, bảo vệ theo `removed_at` | Một luật "rời bảo vệ" | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-450 | BR-42 hạn đã qua | `deadline_source = DEFAULT_PLATFORM_PASSED` + ghi chú | Không thêm cột | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-451 | BR-40 hạn phản hồi | Tính lúc đọc (`seller_due_at` / `reported_at + 48 giờ` cài đặt) | Đổi cài đặt áp ngay | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-452 | Mục Cần xử lý mới | `RETURN_SESSION_DROPPED` mới; dùng lại `SYNC_ERROR` (thay `SHOP_ERROR`); `SYNC_ERROR`, `BACKUP_STALE` chỉ ADMIN | Không nhân đôi nguồn | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-453 | Tên người đóng gói | Dùng chung `station.operator_name` + alert `OPERATOR_REQUIRED` ở PACK | Không thêm API / cột | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-454 | Kiện gộp | Bảng `package_order` | Giữ nghĩa `package.order_id` | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-455 | S4 yêu cầu hủy | Alert mới `ORDER_CANCEL_REQUESTED` | FE chọn tiêu đề theo mã | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-456 | Migration + rollback | 0006 thêm, 0007 unique; downgrade `phase3_archive`; nâng cấp dừng service; `SCHEMA_HEAD` 0007 | Bài học Phase 2 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-457 | Endpoint nhiều sàn | API-71 `/shops/{platform}/auth-url`; callback TikTok API-155; D7 `/admin/settings/platforms` | Callback cố định từng sàn | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-458 | ADR-009 + DEC-418 | Bổ sung tại chỗ, không ADR mới | Mở rộng, không đảo quyết định | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-459 | Gỡ API-42 | Giữ (deprecated) qua Phase 3 | Chưa đo được điều kiện gỡ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-460 | NFR-44 nhiều tiến trình tải lên | Token bucket Redis chung, link ưu tiên | Tổng ≤ giới hạn; link ≤ 3 phút | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-461 | Mốc gửi / có kết quả cho BR-41 | `claim.submitted_at`, `result_at` + backfill từ audit | Báo cáo đơn giản | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-462 | Năng suất theo tên nhập tay | Gộp `lower(trim)`; null → "(Không ghi tên)" | RK-24 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-463 | (BE) Bố cục code | 4 module mới + `platforms` registry / lookup / grants / dispatch / budget / tiktok | Theo architecture §4.1 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-464 | (BE) Thư viện S3 | boto3 qua `asyncio.to_thread`; MemoryStore; MinIO | Ổn định, tương thích rộng | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-465 | (BE) Định dạng mã hóa | `AICAMENC1`: nonce tiền tố ‖ bộ đếm, AAD cờ khối cuối, dấu vân tay trong header | Chống cắt / đảo khối, phát hiện sai khóa sớm | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-466 | (BE) Kiểm đọc lại | DB: tải lại + giải mã toàn bộ; bằng chứng: HEAD + metadata | Cân bằng băng thông | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-467 | (BE) N06 lỗi > 30 phút | Cột `shop.error_since` | `last_error.at` đổi mỗi lần | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-468 | (BE) TikTok yêu cầu hủy | Gộp `cancellations/search` vào `list_updated_orders` | Lõi chỉ thấy nhóm | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-469 | (BE) TikTok tra khi quét | Quét đơn 60 phút + cache (như Shopee) | Không dựa API chưa xác minh | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-470 | (BE) Template W1 | `string.Template` + `html.escape` + whitelist | Không thêm phụ thuộc | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-471 | (BE) Queue dựng link | `export` (worker-export -c 1), đo; chậm thì tách | Giữ CPU kho | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-472 | (BE) Thả tin HELD | Gộp một tin tóm tắt / kênh | BR-36 (3), (4) | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-473 | (BE) Dọn notify_event | Điều kiện nhìn lại ≤ 24 giờ, dọn > 30 ngày | Bỏ trùng đúng, bảng không phình | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-474 | (BE) Mock | Shopee nhiều shop, TikTok 2 shop, fixture định dạng TikTok qua mapping thật | Chạy AC-40..44 không cần tài khoản | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-475 | (BE) Downgrade 0006 / 0007 | 0007 từ chối khi trùng; 0006 archive, bằng chứng đã bỏ còn hạn → `held`, link sống → từ chối trừ env | DEC-331, 336, 338 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-476 | (BE) CSV | Sinh bộ nhớ, UTF-8 BOM, dấu phẩy, tỷ lệ "4,0%" | Excel VN | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-477 | (BE) Ngân sách thời gian | `platforms/budget.py` dùng chung, `soft_time_limit` = ngân sách + 30 giây | Task không treo | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-478 | (BE) WS chỉ ADMIN | Kênh `ws:admin` | Không lộ trạng thái sao lưu / shop | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-479 | (FE station) Chip sàn | Một `shared/ui/PlatformChip.tsx` cho station + dashboard | Một nhãn / màu | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-480 | (FE station) Đổi nút giây 61 | So `useServerNow` với `self_cancel_until` | Giờ server, không tải lại | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-481 | (FE station) Bắt buộc tên người đóng gói | Chặn lúc quét (overlay + R5), không khóa lúc tải | Đúng UX 01 §10.4 | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-482 | (FE station) Phụ thuộc T-252 | T-233 tạo `PlatformChip` trước nếu admin chậm | Không chặn đường găng | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-483 | (FE admin) Bố cục feature | `features/{reports,shares,notify,backup}`; `ShopeePage` → `PlatformsPage` | Lazy-load theo route | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-484 | (FE admin + Architect) Bộ lọc Shop cho mọi vai | API-156 `GET /shops/brief` (thêm vào 02) | API-70 chỉ ADMIN | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-485 | (FE admin) Chỗ sửa hạn Chỉ hoàn tiền | D8 nhóm ngưỡng | Cùng chỗ ngưỡng khác — Phản hồi UX | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-486 | (FE admin) Chỉnh tốc độ tải lên | D23 "Nâng cao" | NFR-44 — Phản hồi UX | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-487 | (FE admin) Tiến độ ShareLinkDialog | WS + poll 2 giây, chạy nền + Toast | Như EvidencePackDialog | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-488 | (FE admin) URL đích khi bấm số | Tham số sẵn có D3 / D14 / D16 | Không thêm màn | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
| DEC-489 | (FE admin) Hiện link ở D21 | Chỉ nút Sao chép, không in URL | URL chứa chữ ký | khanhtt (tự quyết theo ủy quyền user) | 2026-10-06 |
