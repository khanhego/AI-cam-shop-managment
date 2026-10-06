# 03-expansion-tiktok — Status

| Trường | Giá trị |
|---|---|
| Tên | Mở rộng (Phase 3 theo SRS hệ thống §13.2) — TikTok Shop, báo cáo M09, sao lưu cloud, chia sẻ link bằng chứng, thông báo Zalo / Telegram + Phase 2 hardening (06-business-qa L11, L13, L15) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: admin; station nếu L11 cần) |
| Nhánh | `feat/03-expansion-tiktok` ở cả 3 repo, tạo từ `main` sau merge Phase 2 (PR #2) |
| Last update | 2026-10-06 · Flow (mở item, CP1) |

Phạm vi: [SRS hệ thống §13.2](../../system/SRS.md) giai đoạn 3 "Mở rộng" — **chỉ TikTok Shop, không Lazada** (quyết định user 2026-10-05); báo cáo M09 (FR-09.02..04), sao lưu cloud, chia sẻ link, thông báo Zalo / Telegram (FR-06.04); kèm hardening L11, L13, L15 từ [06-business-qa Phase 2](../02-returns-reconciliation/06-business-qa.md). Phần cần tài nguyên ngoài (TikTok Shop partner thật, bucket cloud thật, bot Zalo / Telegram thật, camera thật, server kho) làm bằng adapter mock + ghi "chưa test — thiếu tài nguyên".
Số item: 03 (`docs/ai/items/` có 01, 02; remote 3 repo có `main`, `feat/01-…`, `feat/02-…` — 2026-10-06).
**Dải ID của item này** (tránh trùng item 01, 02): DEC-401+, API-150+, J-20+, T-201+ (BE), T-231+ (FE station), T-251+ (FE admin), màn D20+ (dashboard) và R10+ (station). FR / BR / AC / EX / NFR nối tiếp số đã có trong SRS hệ thống và item 01, 02.

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ⬜ | | | |
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
| 2 | SRS | ▶ | | |
| 2b | Màn hình | ⬜ | | |
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
| PO | Bước 2: viết 01-srs.md (Phase 3) | `ai-po-write-srs` |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|

## Lịch sử
| Ngày | Vai | Việc |
|---|---|---|
| 2026-10-06 | Flow | Mở item 03 (Phase 3). Phase 2 đã merge `main` (PR #2 ở 3 repo). Nhánh `feat/03-expansion-tiktok` |

## Quyết định (DEC)
| ID | Vấn đề | Quyết định | Lý do | Người | Ngày |
|---|---|---|---|---|---|
| DEC-401 | CP1 mở item Phase 3 | Lane feature, quy mô M, be + fe, NN = 03, slug `expansion-tiktok`; phạm vi theo SRS §13.2 giai đoạn 3 chỉ TikTok Shop + L11, L13, L15 | Quyết định user 2026-10-05 (chỉ TikTok); Q&A Phase 2 đề xuất sửa L11, L13, L15 đầu Phase 3 | khanhtt (Flow, tự quyết theo ủy quyền user) | 2026-10-06 |
