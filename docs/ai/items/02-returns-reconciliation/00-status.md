# 02-returns-reconciliation — Status

| Trường | Giá trị |
|---|---|
| Tên | Hàng hoàn và đối soát (Phase 2 theo SRS hệ thống §13.2) + Phase 1 hardening (06-business-qa L2–L9) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: station, admin) |
| Nhánh | `feat/02-returns-reconciliation` ở cả 3 repo (gốc, `ai-cam-be`, `ai-cam-fe`) |
| Last update | 2026-10-05 · Flow (bước 1–4b xong, tự duyệt theo ủy quyền user; sang bước 5) |

Phạm vi: M04, M05 (returns), M06, M08 cơ bản — đạt AC-06, AC-07 ([SRS hệ thống §13.2](../../system/SRS.md)); kèm hardening L2–L9 + §4 "Lưu ý cho Phase 2" của [06-business-qa](../01-packing-mvp/06-business-qa.md). Q13 giữ mở — **chặn go-live**, không chặn spec.
Số item: 02 (`docs/ai/items/` chỉ có 01; remote 3 repo có `main`, `feat/01-packing-mvp`, `feat/02-returns-reconciliation` — 2026-10-05).
**Dải ID của item này** (tránh trùng item 01): DEC-201+, API-82 và API-100+, T-101+ (BE), T-131+ (FE station), T-151+ (FE admin), màn R1–R5 và D14–D17. FR / BR / AC / EX nối tiếp số đã có trong SRS hệ thống và item 01.

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ✅ | 2026-10-05 | khanhtt (tự quyết theo ủy quyền user, DEC-217) | 01-srs.md v0.2 Approved: 43 FR, 8 UC, 19 AC, §10 9 màn mới + 9 mở rộng |
| Spec 02 / 02a / 02b | In review · In review · In review ×2 | 2026-10-05 | | 02b: station, admin |
| G2 Thiết kế | ⬜ | | | Chờ bước 5 (review subagent) |
| Plan | ⬜ | | | |
| G3 Build | ⬜ | | | |
| G4 Kiểm thử | ⬜ | | | |
| G5 Release | ⬜ | | | |

## Solo pipeline
| # | Bước | Trạng thái | Ngày | Ghi chú |
|:-:|---|:---:|---|---|
| 0 | Khởi tạo dự án | ⏭ | | Đã có `.ai/profile.md` (item 01) |
| 1 | Mở item | ✅ | 2026-10-05 | CP1 tự duyệt theo ủy quyền user (DEC-201): lane feature, M, be + fe (station, admin), NN = 02 |
| 2 | SRS | ✅ | 2026-10-05 | CP2 tự duyệt (DEC-217): 01-srs.md v0.1; Q6 tự quyết DEC-202; DEC-202..214 |
| 2b | Màn hình | ✅ | 2026-10-05 | **G1 ✅** tự duyệt (DEC-217): §10 R1–R5, D14–D17 mới; S1/S2/S3, D2/D3/D4/D6/D8/D13 mở rộng; DEC-215, 216 |
| 3 | Tech spec | ✅ | 2026-10-05 | CP3 tự duyệt (DEC-232): 02 In review — 25 API mới (API-82, 100..106, 110..113, 120..123, 130..138) + 18 mở rộng, WS mới 4 + 1 alert; ADR-009; DEC-218..224 |
| 4a | BE spec | ✅ | 2026-10-05 | CP4a tự duyệt (DEC-233): 02a In review — 9 bảng mới, migration 0003 + 0004 có downgrade, J-13..J-17, T-101..T-116 (≈ 26,5 ngày); DEC-225..231 |
| 4b | FE spec (station, admin) | ✅ | 2026-10-05 | CP4b tự duyệt (DEC-234): 02b-station T-131..T-137 (≈ 10 ngày), 02b-admin T-151..T-162 (≈ 17,5 ngày); DEC-235..243 |
| 5 | Review bộ spec | ▶ | | `ai-lead-review` qua subagent → G2 |
| 6 | Kế hoạch | ⬜ | | |
| 7 | Test cases | ⬜ | | |
| 8 | Implement | ⬜ | | |
| 8c | Tài liệu nghiệp vụ (mỗi lát) | ⬜ | | `docs/nghiep-vu/02-returns-reconciliation/` |
| 9 | Commit / PR | ⬜ | | |
| 10 | Review code | ⬜ | | |
| 11 | Chạy test | ⬜ | | |
| 12 | Release | ⬜ | | |

## NOW
| Owner tiếp | Việc tiếp | Skill |
|---|---|---|
| Lead review (subagent, chỉ đọc) | Soát bộ 01 §10 + 02 + 02a + 02b-station + 02b-admin → findings → G2 | ai-lead-review |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|
| BE (02a DEC-229) | Architect | Đơn nhiều kiện quét bằng mã đơn ở bàn hoàn không biết kiện nào → cần mã alert riêng | Đóng: thêm `RETURN_MULTIPLE_PACKAGES` vào 02 §6 API-11 (trước G2, không tăng phiên bản) |
| Architect | PO / UX | R4 thiếu dòng cho `RETURN_MULTIPLE_PACKAGES` | Đóng: thêm dòng "ĐƠN CÓ NHIỀU KIỆN" vào 01 §10.4 R4 |
| BE (02a §3) | Architect | Cần `package.created_at`, `status_changed_at` nội bộ cho BR-14, BR-20 (không lộ API) | Đóng: chỉ đổi 02a (DEC-225), 02 không đổi |

## Lịch sử
| Ngày | Role | Việc |
|---|---|---|
| 2026-10-05 | ai-flow-route | Mở item 02-returns-reconciliation, lane feature, quy mô M, component be + fe (station, admin); CP1 tự quyết theo ủy quyền user (DEC-201) |
| 2026-10-05 | PO | Viết 01-srs.md v0.1: 43 FR (M 38 / S 5), 8 UC, BR-07..14 + BR-19..28, EX-R1..R13 + EX-P12, P13, NFR-32..36, AC-06, 07, 22..38; hardening L2–L9; Q6 tự quyết DEC-202 (đề xuất, cần xác nhận); camera bàn hoàn DEC-203; tài khoản bàn hoàn DEC-204 (giữ tài khoản chung + tên người kiểm); DEC-205..214 — tự quyết theo ủy quyền user |
| 2026-10-05 | UX | 01 §10: kiểm kê REUSE / EXTEND / NEW, journey, 5 màn station (R1–R5) + 3 mở rộng, 4 màn dashboard (D14–D17) + 6 mở rộng, phác thảo ASCII, chữ thật, đủ trạng thái; DEC-215, 216 — tự quyết theo ủy quyền user. 01 → v0.2 |
| 2026-10-05 | PO | **G1 ✅** tự duyệt theo ủy quyền user (DEC-217); 01-srs.md Approved |
| 2026-10-05 | Architect | Viết 02-tech-spec.md (In review): reuse-first có file:line, 3 module mới, data model + enum, 25 API mới + 18 mở rộng, WS mới, luồng UC-02 / UC-05 / UC-11, rollout + rollback; ADR-009 (Proposed); architecture §4.1 thêm `returns/`, §16 thêm ADR-009; DEC-218..224; CP3 tự duyệt (DEC-232) |
| 2026-10-05 | BE | Viết 02a-be-spec.md (In review): schema 9 bảng mới, migration 0003 / 0004 + downgrade có guard, chi tiết API-11 chế độ RETURN, BR → nơi thực thi, J-13..J-17, Shopee returns (chưa test — thiếu partner T-3), T-101..T-116; DEC-225..231; CP4a tự duyệt (DEC-233) |
| 2026-10-05 | FE | Viết 02b-fe-spec-station.md (T-131..T-137) và 02b-fe-spec-admin.md (T-151..T-162) (In review); DEC-235..243; CP4b tự duyệt (DEC-234) |

## Decisions của bước điều phối
| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt | Ngày |
|---|---|---|---|---|---|
| DEC-201 | Mở item Phase 2 (CP1) | Lane feature, quy mô M, component be + fe (station, admin), NN 02, slug `returns-reconciliation`; dải ID riêng (DEC-201+, API-100+, T-101+) | Yêu cầu đã rõ ở SRS hệ thống + 06-business-qa, không cần prototype; dải ID tránh nhầm với item 01 (DEC tới 175, API tới 92) | khanhtt (tự quyết theo ủy quyền user) | 2026-10-05 |
| DEC-232 | CP3 (02) | Tự duyệt, sang 4a | Checklist §3 tự soát đạt: mọi field có tên / kiểu, mọi lỗi có mã, FR coverage đủ | khanhtt (tự quyết theo ủy quyền user) | 2026-10-05 |
| DEC-233 | CP4a (02a) | Tự duyệt, sang 4b | Mọi API-xx / BR / job BE có dòng; migration có downgrade; task ≤ 2 ngày, truy về FR / API | khanhtt (tự quyết theo ủy quyền user) | 2026-10-05 |
| DEC-234 | CP4b (02b ×2) | Tự duyệt, sang bước 5 | Mọi màn §10 và FR cột FE có dòng; mọi API-xx dùng có xử lý lỗi; task truy về màn / FR | khanhtt (tự quyết theo ủy quyền user) | 2026-10-05 |
