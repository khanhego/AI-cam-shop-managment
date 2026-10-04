# 01-packing-mvp — Status

| Trường | Giá trị |
|---|---|
| Tên | MVP đóng gói (Phase 1 theo SRS hệ thống §13.2) |
| Loại | feature |
| Lane | feature (chạy bằng `ai-solo-build-feature`) |
| Quy mô | M |
| Component bị chạm | ai-cam-be (be), ai-cam-fe (fe: station, admin) |
| Last update | 2026-10-04 · Architect |

Phạm vi dự kiến: M01, M02, M03, M05 (Shopee: đơn + trạng thái), M07 cơ bản, M10 của [SRS hệ thống](../../system/SRS.md).
Spike S1–S5 và dựng khung repo ([architecture.md §17](../../system/architecture.md)) sẽ thành task đầu trong `03-plan`.
Số item: 01 (chưa có item nào; `git ls-remote --heads` của 3 repo không có nhánh nào, 2026-10-04).

## Tiến độ
| Gate | Trạng thái | Ngày | Người duyệt | Ghi chú |
|:---:|:---:|---|---|---|
| G1 Yêu cầu | ✅ | 2026-10-04 | khanhtt | 01-srs.md v0.2 Approved |
| Spec 02 / 02a / 02b | ✅ ✅ ✅ | | | 02b: station, admin |
| G2 Thiết kế | ✅ | 2026-10-04 | khanhtt (tự quyết, DEC-15) | Có điều kiện DEC-33; 2 vòng review subagent |
| Plan | ✅ | 2026-10-04 | khanhtt (tự quyết, DEC-37) | 46 task, 6 milestone; ticket chưa tạo (DEC-35) |
| G3 Build | ⬜ | | | |
| G4 Kiểm thử | ⬜ | | | |
| G5 Release | ⬜ | | | |

## Solo pipeline
| # | Bước | Trạng thái | Ngày | Ghi chú |
|:-:|---|:---:|---|---|
| 0 | Khởi tạo dự án | ✅ | 2026-10-04 | CP0 duyệt, còn 2 mục ✗: baseline chưa đo (repo trống), môi trường staging/prod chưa rõ |
| 1 | Mở item | ✅ | 2026-10-04 | CP1 duyệt |
| 2 | SRS | ✅ | 2026-10-04 | CP2 duyệt; 01-srs.md v0.1, DEC-1..4 |
| 2b | Màn hình | ✅ | 2026-10-04 | §10: 20 màn (S0–S6, D1–D13), DEC-5, DEC-6 |
| 3 | Tech spec | ✅ | 2026-10-04 | 02 In review, API-01..92, WS-01/02, DEC-7..10 |
| 4a | BE spec | ✅ | 2026-10-04 | CP4a tự duyệt (DEC-15); 02a In review, T-1..T-19, DEC-11..14 |
| 4b | FE spec (station, admin) | ✅ | 2026-10-04 | CP4b tự duyệt; 02b-station (T-30..38), 02b-admin (T-50..61), DEC-16..22 |
| 5 | Review bộ spec | ✅ | 2026-10-04 | Vòng 1 Chưa đạt (28), vòng 2 Đạt có điều kiện (12 minor/nit, đã sửa) |
| 6 | Kế hoạch | ✅ | 2026-10-04 | 03-plan.md |
| 7 | Test cases | ✅ | 2026-10-04 | CP7 tự duyệt; 04 Ready: 137 case, DEC-38 |
| 8 | Implement | ▶ đang làm | 2026-10-04 | M0 xong (T-1, 2, 6, 30, 31, 32, 39, 33); tiếp M1: T-7 |
| 9 | Commit / PR | ⬜ | | |
| 10 | Review code | ⬜ | | |
| 11 | Chạy test | ⬜ | | |
| 12 | Release | ⬜ | | |

## NOW
| Owner tiếp | Việc tiếp | Skill |
|---|---|---|
| Dev BE (khanhtt) | M1: T-7 users + auth; song song FE T-34. Việc ngoài: gửi đăng ký Shopee (T-3), mua camera (T-4) | ai-be-implement |

## Phản hồi giữa các vai
| Từ | Tới | Nội dung | Trạng thái |
|---|---|---|---|
| Lead review | Architect, BE, FE, PO | Review G2 lần 1: Chưa đạt (2 blocker, 11 major, 11 minor, 4 nit) | Đã sửa: 01 v0.3 (DEC-24..27), 02 v0.2 (DEC-28, 29), 02a v0.2 (DEC-30..32), 02b v0.2. Vòng 2: Đạt có điều kiện, N1–N12 đã sửa. Đóng |
| FE | Architect | Chưa có API nhận lỗi JS client (02b-station §11) | Đóng: tự quyết DEC-23 — MVP không thêm API, lỗi xem qua ErrorBoundary + log trình duyệt; xem lại Phase 3 |
| UX | PO | Supervisor duyệt từ dashboard (DEC-5) cần FR mới FR-03.12, sửa FR-03.10, UC-08, ma trận quyền, thêm AC-19 | Đã xử lý trong 01 v0.2 (solo) |

## Lịch sử
| Ngày | Role | Việc |
|---|---|---|
| 2026-10-04 | ai-flow-init | Tạo profile, system-map, chuyển SRS + architecture vào system/, tách ADR-001..008 |
| 2026-10-04 | ai-flow-route | Mở item 01-packing-mvp, lane feature, component be + fe |
| 2026-10-04 | PO | Viết 01-srs.md v0.1 (Draft): phạm vi Phase 1, DEC-1 tài khoản station, DEC-2 CSV dự phòng, DEC-3 retention 30/90, DEC-4 2 station / 500 đơn |
| 2026-10-04 | UX | Sao design system LiveAI → docs/design-system, chỉnh cho Hệ thống X (DEC-6, cập nhật architecture.md, ADR-006). Viết 01 §10: kiểm kê, journey, 20 màn, kiểm phủ FR. 01 → v0.2 |
| 2026-10-04 | PO | G1 duyệt, 01-srs.md v0.2 Approved |
| 2026-10-04 | Architect | Viết 02-tech-spec.md (In review): data model chung, 40 API + 2 kênh WS, DEC-7..10; bổ sung module approvals, imports vào architecture.md |
| 2026-10-04 | BE | Viết 02a-be-spec.md (In review): 19 bảng, API-01..92, J-01..J-11, vision, T-1..T-19 |
| 2026-10-04 | user | Ủy quyền agent tự chọn phương án tốt nhất ở CP/gate/lựa chọn trong skill, ghi DEC (DEC-15). Vẫn hỏi trước commit/push/ticket/deploy |
| 2026-10-04 | FE | Viết 02b-fe-spec-station.md, 02b-fe-spec-admin.md (In review) |
| 2026-10-04 | Lead review | Review G2 lần 1 (subagent): Chưa đạt, 28 findings |
| 2026-10-04 | PO, Architect, BE, FE | Sửa theo review: change request 01 v0.3; 02, 02a, 02b v0.2 |
| 2026-10-04 | Lead review | Vòng 2: Đạt có điều kiện; sửa N1–N12; G2 ✅ có điều kiện (DEC-33) |
| 2026-10-04 | PM | Viết 03-plan.md: 46 task, M0–M5, đường găng; Plan ✅ (DEC-37); ticket GitHub hoãn chờ user (DEC-35) |
| 2026-10-04 | QA | Viết 04-test-cases.md (Ready): 118 case chức năng + 10 phân quyền + 9 NFR |
| 2026-10-04 | Dev BE | T-1 khung repo BE, T-2 MediaMTX + camera giả, T-6 core + migration 0001 (19 bảng) + CLI create-admin; 36 test pass; DEC-39, DEC-40. Nhánh `feat/01-packing-mvp` trong ai-cam-be, chưa commit |
| 2026-10-04 | Dev FE | T-30 khung FE, T-31 tokens, T-32 + T-39 UI kit, T-33 API client + MSW + WS client; 86 test pass; DEC-41 (sửa), 42, 43, 44. Nhánh `feat/01-packing-mvp` trong ai-cam-fe, chưa commit. M0 xong |
