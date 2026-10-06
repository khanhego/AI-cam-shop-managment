# Lát 6 — Nền tảng Phase 2 (M6) — Giải thích nghiệp vụ

| Trường | Giá trị |
|---|---|
| Item / lát | `02-returns-reconciliation` · lát 6 (milestone M6 Nền tảng, [03-plan §4](../../ai/items/02-returns-reconciliation/03-plan.md)) |
| Yêu cầu | FR-01.01, FR-01.07, FR-04.10 (phần dữ liệu), FR-05.07, FR-06.05 (API), FR-10.02, FR-10.03; BR-25 (phần migration), BR-28; EX-P13 (L6) — [01-srs](../../ai/items/02-returns-reconciliation/01-srs.md) v0.5 |
| Task | BE: T-101, T-102, T-103, T-106 · FE: T-131, T-151, T-152 |
| Code | `ai-cam-be`: `101477c`, `9abc83c`, `a0f4fa1`, `1746cee` · `ai-cam-fe`: `580bcde`, `3c8c7e0`, `dbb6497` (nhánh `feat/02-returns-reconciliation`) |
| Người đọc | Dev mới vào dự án, reviewer, QA |
| Tác giả | khanhtt (agent soạn) |
| Reviewer | PO (đúng nghiệp vụ) · Tech lead (đúng code) |
| Trạng thái | Draft |
| Last update | 2026-10-06 · Dev |

## TL;DR

- Lát này không có màn hình mới cho người dùng cuối. Nó chuẩn bị "móng" cho hàng hoàn: bảng dữ liệu mới, trạng thái kiện mới, loại station, tên người kiểm, nguồn yêu cầu trả từ sàn (giả lập).
- Nâng cấp từ Phase 1 không mất dữ liệu: chỉ thêm bảng / cột; số ngày giữ clip thấp hơn **sàn 60 ngày** thì tự nâng lên sàn và ghi nhật ký (BR-25, L2).
- Station có **loại**: Đóng gói / Nhận hoàn / Cả hai. Chỉ "Cả hai" mới đổi chế độ tại bàn, và chỉ khi bàn đang rảnh (FR-01.01, 01.07).
- Bàn nhận hoàn phải có **tên người kiểm**; đăng xuất là mất tên (BR-28).
- Supervisor / Admin **điều chỉnh tay** trạng thái kiện trong một danh sách chuyển cho phép, bắt buộc lý do (FR-06.05, L6). UI cho việc này có ở lát 8 (D4) và lát 9 (D15).

## 0. Giải thích đơn giản

Đây là phần **"đổ móng trước khi xây tầng mới"**. Phase 1 chỉ lo chiều đi: đóng gói có video. Phase 2 lo chiều về: kiện hoàn, đối soát với sàn, hồ sơ khiếu nại. Trước khi xây các màn đó, hệ thống cần chỗ chứa dữ liệu mới, cần biết bàn nào nhận hàng hoàn, ai đang đứng bàn, và cần một nguồn "sàn báo khách trả hàng" để thử.

**Ý tưởng chính.** Lát này làm 5 việc:
1. Nâng cấp cơ sở dữ liệu lên Phase 2 mà dữ liệu Phase 1 vẫn nguyên.
2. Cho Admin đặt loại cho từng bàn: chỉ đóng gói, chỉ nhận hoàn, hoặc cả hai.
3. Cho bàn nhận hoàn ghi tên người kiểm trong ca.
4. Cho quản lý sửa tay trạng thái của một kiện khi hệ thống ghi sai so với thực tế.
5. Dựng nguồn dữ liệu "yêu cầu trả hàng" của sàn, hiện là bản giả lập.

### Bước 1 — Nâng cấp không mất gì
- Làm gì: lúc nâng cấp, hệ thống thêm bảng và cột mới, không xóa và không sửa nghĩa dữ liệu cũ. Mỗi kiện được ghi thêm "tạo lúc nào" và "đổi trạng thái lần cuối lúc nào", lấy từ lịch sử có sẵn.
- Vì sao: các quy tắc đối soát sau này cần đếm giờ, ví dụ "đã đóng gói 24 giờ mà sàn chưa lấy". Không có mốc giờ thì không đếm được.
- Có một mốc "bắt đầu đối soát" bằng đúng giờ nâng cấp. Đơn cũ trước mốc này không bị bắt lỗi "giao đi không có video", vì lúc đó kho chưa dùng hệ thống.
- Sàn giữ clip: shop đang để giữ clip 45 ngày thì khi nâng cấp tự thành 60 ngày, kèm một dòng nhật ký "nâng lên mức tối thiểu". Lý do: hàng hoàn có thể về sau 1–2 tháng, nếu clip đóng gói đã bị xóa thì không còn gì để khiếu nại.
- Sự cố thì sao: bước nâng cấp chạy trọn một lần. Lỗi giữa chừng thì không đổi gì, máy chủ không khởi động bản mới, kho vẫn chạy được bản cũ sau khi đổi lại.

### Bước 2 — Loại bàn và chế độ bàn
- Làm gì: Admin chọn loại cho từng bàn. Bàn "Đóng gói" chỉ đóng gói. Bàn "Nhận hoàn" chỉ nhận hoàn. Bàn "Cả hai" có nút chuyển qua lại.
- Vì sao: kho nhỏ thường dùng chung một bàn, sáng đóng gói, chiều mở hàng hoàn. Kho lớn có bàn riêng. Hệ thống hỗ trợ cả hai cách mà không bắt chọn.
- Chỉ đổi được khi bàn rảnh: đang có kiện mở dở hoặc đang chờ quản lý duyệt thì không đổi chế độ, cũng không đổi loại bàn. Màn hình nhận câu "Đóng phiên trước…" thay vì bị chuyển ngang giữa chừng.
- Đổi xong, màn hình bàn tự chuyển sang màn tương ứng ngay, không cần tải lại.

### Bước 3 — Tên người kiểm
- Làm gì: mỗi bàn dùng chung một tài khoản. Ở chế độ nhận hoàn, đầu ca người đứng bàn gõ tên mình (2–40 ký tự). Tên hiện trên thanh trạng thái, đi theo từng phiên mở hoàn, lên hồ sơ khiếu nại và chữ chạy trên video xuất.
- Vì sao: khi khiếu nại, sàn hỏi "ai mở kiện". Shop không muốn cấp tài khoản riêng cho từng người, nên chọn cách nhẹ: gõ tên.
- Đổi người giữa ca: chỉ khi không có phiên mở. Đăng xuất bàn, hoặc Admin thu hồi phiên đăng nhập của bàn → tên bị xóa, người sau phải nhập lại. Nhờ vậy không ai "mượn tên" của ca trước.

### Bước 4 — Điều chỉnh tay trạng thái kiện
- Làm gì: Supervisor / Admin chọn trạng thái mới cho một kiện, ghi lý do (5–500 ký tự). Hệ thống chỉ cho chọn trong vài hướng hợp lý, ví dụ "Mới → Đã bàn giao" hoặc "Hoàn quá hạn → Đang về".
- Vì sao: thực tế có lúc lệch. Ví dụ chị Lan bỏ dở phiên đóng gói, kiện vẫn ghi "Mới", nhưng thật ra đã gửi đi. Không có đường sửa thì kiện này bị báo lỗi mãi.
- Không cho sửa tay thành "Đã nhận hoàn": muốn có trạng thái đó phải có phiên mở hoàn có video.
- Kiện đang có người đóng gói / mở hoàn thì không sửa được, tránh hai người ghi đè nhau.
- Mỗi lần sửa ghi lịch sử nguồn "Tay", tên người sửa, và nhật ký kèm lý do.

### Bước 5 — Nguồn "khách trả hàng" từ sàn (giả lập)
- Làm gì: thêm phần đọc danh sách yêu cầu trả hàng và chi tiết một yêu cầu. Hệ thống tự gom trạng thái sàn thành 4 nhóm: đang mở, đã hủy, đã hoàn tiền, đã đóng. Lý do khách trả được dịch sang tiếng Việt ("Hàng bị hư", "Sai sản phẩm"…).
- Hiện chưa nối được sàn thật. Bản giả lập có sẵn 4 loại: khách trả có kiện gửi về, chỉ hoàn tiền, yêu cầu bị hủy, đơn giao thất bại.
- Thứ tự tin cậy trạng thái vận chuyển được mở rộng: "đang hoàn về" đứng sau "đã giao". Nhờ vậy một tin cũ "đã giao" tới muộn không đè lên tin mới "đang hoàn".

**Ví dụ một vòng đầy đủ.** Tối thứ Hai 21:00, anh Minh (Admin) nâng cấp hệ thống. Cài đặt cũ giữ clip 45 ngày. Sau 30 giây, nâng cấp xong, cài đặt thành 60 ngày, nhật ký có dòng "Tự nâng số ngày giữ clip lên mức tối thiểu 60". Mọi kiện cũ vẫn đúng trạng thái. Sáng thứ Ba 07:50, anh Minh mở trang cấu hình, đặt Station 03 là "Cả hai". 08:00 chị Lan đăng nhập Station 03, bấm chuyển sang nhận hàng hoàn, gõ tên "Lan", thanh trạng thái hiện "Nhận hàng hoàn · Người kiểm: Lan". 10:15 chị Hoa (Supervisor) phát hiện kiện SPXTST0000052 ghi "Mới" nhưng ĐVVC đã lấy hàng hôm qua (phiên đóng gói bị bỏ dở). Chị chọn "Đã bàn giao", gõ lý do "Đã gửi thật, phiên đóng gói bị bỏ dở", lưu. Lịch sử kiện có dòng "Tay — Hoa — 10:15". 12:00 chị Lan đăng xuất đi ăn trưa; 13:00 anh Tú đăng nhập lại bàn, hệ thống đòi tên mới vì tên "Lan" đã bị xóa.

**Lưu ý.**
- Màn nhập tên người kiểm, nút chuyển chế độ và bảng điều chỉnh trạng thái chưa có ở lát này. Lát này chỉ có phần máy chủ và dữ liệu giả cho màn hình. Màn thật có ở lát 7 (bàn), lát 8 (chi tiết kiện), lát 9 (bảng lệch trạng thái).
- Nguồn yêu cầu trả hàng của sàn thật **chưa thử** vì chưa có tài khoản đối tác. Tên trường, tên trạng thái của sàn thật có thể khác.
- Thời gian nâng cấp trên kho lớn chưa đo ở lát này (đo ở lát 10: khoảng 34 giây cho 1 triệu kiện, bảng kiện bị khóa suốt lúc đó).

## 1. Vì sao cần

Phase 2 thêm 3 module (`returns`, `claims`, `reconciliation`) và 5 trạng thái kiện `RETURN_*`. Không làm nền trước thì mọi task M7–M9 đụng nhau ở migration, enum và API client. Ngoài ra có 2 lỗ hổng Phase 1 phải vá ngay lúc nâng cấp: số ngày giữ clip có thể bị hạ quá thấp (L2) và không có đường sửa kiện "bỏ dở nhưng đã gửi thật" (L6, EX-P13).

| Lát này làm (Goals) | Lát này không làm (Non-goals — ở lát / phase nào) |
|---|---|
| Migration 0003: 9 bảng mới, cột mới, CHECK mở rộng `NOT VALID` → `VALIDATE`, sequence `HH-` / `KN-` / `TAM-`, backfill `created_at` / `status_changed_at`, `recon_start_at`, nâng retention lên sàn (T-101) | Downgrade sang `phase2_archive` (T-101 chỉ có guard từ chối khi có dữ liệu Phase 2 — DEC-301; archive thật ở lát 10, T-120) |
| `orders.transition` thêm cặp Phase 2, `status_changed_at`, `MANUAL_TRANSITIONS`, API-122, audit mới, `/me` `permissions` (T-102) | UI điều chỉnh tay: D4 (lát 8, T-155), D15 (lát 9, T-156) |
| Adapter `PlatformReturn`, mapping trạng thái / lý do, mock 4 fixture, hint `RETURN_EXPECTED`, `_RANK` (T-103) | Job J-13 đồng bộ hoàn thật sự (lát 9, T-105) |
| Station `kind` / `work_mode` / `operator_name`: API-60, 100, 101; xóa tên ở API-03 / 91 (T-106) | Màn R1, R5, đổi chế độ S1 ⇄ R1 (lát 7, T-132) |
| FE: API client station + admin, `shared/returns/*`, MSW `StationSim` RETURN + `returnsDb`, drawer + `NavBadge` + 4 sự kiện WS (T-131, 151, 152) | Màn D14–D17 (lát 8, 9) |

## 2. Ai dùng, ở đâu, khi nào

| Vai | Màn hình / điểm vào | Lúc nào dùng |
|---|---|---|
| Admin (ops) | `docker compose` bước `migrate` | Nâng cấp Phase 1 → 2 |
| Admin | API-60 (UI D6 "Loại station" ở lát 9, T-160) | Lắp bàn mới / đổi công năng bàn |
| Station | API-100 đổi chế độ, API-101 tên người kiểm (UI R1 / R5 ở lát 7) | Đầu ca, đổi người, đổi việc |
| Supervisor, Admin | API-122 (UI D4 / D15 ở lát 8, 9) | Kiện ghi sai trạng thái so với thực tế |
| Mọi vai dashboard | `/me` → `permissions` | FE ẩn / hiện nút theo quyền Phase 2 |
| Dev / QA | `pnpm dev:mock` (MSW) | Làm FE trước khi BE xong |

## 3. Tình huống thực tế

| # | Tình huống | Hệ thống làm gì | Vì sao |
|---|---|---|---|
| 1 | DB Phase 1 có `retention_clip_days = 45` | 0003 nâng lên 60 (`RETENTION_CLIP_MIN_DAYS`), audit `RETENTION_RAISED_TO_MINIMUM` | BR-25, L2: không để clip đóng gói bị xóa trước khi hàng hoàn kịp về |
| 2 | Station "Cả hai" đang có phiên mở, gọi API-100 | `409 SESSION_ACTIVE` | Không đổi chế độ giữa phiên (FR-01.07) |
| 3 | Station loại "Đóng gói" gọi API-100 sang RETURN | `409 MODE_NOT_ALLOWED` | Chỉ `BOTH` đổi được |
| 4 | Admin đổi `kind` khi bàn đang chờ duyệt | `409 STATION_BUSY` | DEC-305: bận = phiên hoạt động hoặc yêu cầu duyệt `PENDING` |
| 5 | Tên "  Lan   Anh " | Gộp khoảng trắng → "Lan Anh"; 1 ký tự hoặc > 40 → `422 VALIDATION_ERROR` `fields.name` | BR-28 |
| 6 | Station đăng xuất / Admin thu hồi phiên đăng nhập | `operator_name = NULL`; tài khoản dashboard đăng xuất không đụng station | BR-28, DEC-305 (d) |
| 7 | Kiện `NEW` do phiên bỏ dở, thực tế đã giao | API-122 `NEW → HANDED_OVER` + lý do; cảnh báo kèm theo (nếu có) → `RESOLVED` `ADJUST_STATUS` | L6, EX-P13, FR-06.05 |
| 8 | Chỉnh `PACKED → DELIVERED` | `409 TRANSITION_NOT_ALLOWED` kèm danh sách đích cho phép | Chỉ các chuyển trong 01 §7.1 |
| 9 | Chỉnh `RETURN_EXPECTED → DELIVERED` (khách không trả) | Kiện đổi; hồ sơ hàng hoàn mở → `CANCELLED` chỉ khi không còn kiện nào của hồ sơ đang hoàn | DEC-303 (b): không hủy hồ sơ nhiều kiện đã nhận một phần |
| 10 | Tin vận chuyển cũ "đã giao" tới sau tin "đang hoàn" | `_RANK` (`RETURN_EXPECTED` = 3 > `DELIVERED` = 2) → bỏ qua tin cũ | DEC-259 |

## 4. Luồng ví dụ từ đầu đến cuối

1. **21:00** — `dc up -d --build`. Bước `migrate` chạy 0003 (rồi 0004, 0005 ở các lát sau) trong một transaction. Log `RETENTION_RAISED_TO_MINIMUM` 45 → 60. `api` chỉ lên khi `migrate` thoát 0.
2. **07:50** — Admin `PATCH /stations/{id}` `kind = BOTH` (API-60). Khóa advisory station, kiểm bận, `default_work_mode` giữ chế độ đang chạy. Sau commit đẩy WS-01 `station.state`.
3. **08:00** — Station 03 gọi API-100 `work_mode = RETURN` rồi API-101 `name = "Lan"`. Cả hai chạy dưới `lock_station`, trả `{state}` như API-10, audit đổi chế độ / tên (FR-10.03).
4. **10:15** — Chị Hoa gọi API-122 cho `SPXTST0000052` `to_status = HANDED_OVER`, `reason = "Đã gửi thật…"`. `orders.adjust_status`: khóa `order:{sn}` → hồ sơ → kiện, kiểm phiên hoạt động và `MANUAL_TRANSITIONS`, `transition(source=MANUAL)` ghi `status_history` + `status_changed_at`, audit `WAREHOUSE_STATUS_ADJUST` (lý do nằm trong audit — `status_history` không có cột ghi chú).
5. **12:00** — Station đăng xuất (API-03) → `operator_name = NULL`. Lát 7: lần quét kế ở chế độ RETURN trả `OPERATOR_REQUIRED`.

## 5. Quy tắc nghiệp vụ và lý do

| Quy tắc | Con số / điều kiện | Vì sao | ID |
|---|---|---|---|
| Nâng cấp chỉ thêm | Cột mới nullable / có default; CHECK mở rộng (tập cũ ⊂ tập mới) | Code Phase 1 vẫn chạy trên schema mới; không lỗi dữ liệu cũ | 02a §3, RB-23 |
| Mốc bắt đầu đối soát | `setting.recon_start_at = now()` lúc migrate | Đơn trước khi dùng hệ thống không bị BR-10 / 14 / 20 báo oan | DEC-228, DEC-254 |
| Sàn giữ clip | ≥ `RETENTION_CLIP_MIN_DAYS` (env, mặc định 60); migrate nâng giá trị thấp hơn | Hàng hoàn về muộn vẫn còn clip đóng gói | BR-25, FR-02.10, DEC-257 |
| Loại station | `PACK` / `RETURN` / `BOTH`; CHECK `kind = 'BOTH' OR work_mode = kind` | Bàn chỉ đóng gói không vô tình mở phiên hoàn và ngược lại | FR-01.01, DEC-205 |
| Đổi chế độ | Chỉ `BOTH`, không phiên hoạt động, không yêu cầu chờ | Không mất ngữ cảnh phiên đang mở | FR-01.07 |
| Tên người kiểm | 2–40 ký tự; đổi khi rảnh; xóa khi station đăng xuất / bị thu hồi | Truy được người mở kiện mà không cần tài khoản riêng | BR-28, FR-04.10, DEC-204 |
| Điều chỉnh tay | `NEW / PACKED / CANCELLED_AFTER_PACK → HANDED_OVER`; `HANDED_OVER → DELIVERED`; `RETURN_MISSING → RETURN_EXPECTED / DELIVERED`; `RETURN_EXPECTED → DELIVERED`; lý do 5–500; không khi có phiên hoạt động | Sửa lệch thực tế nhưng không tạo "đã nhận hoàn" không có video | FR-06.05, 01 §7.1, L6 |
| Mốc đổi trạng thái | `transition()` luôn ghi `status_changed_at` | BR-12 (7 ngày), BR-14 (24 giờ) đếm từ lúc vào trạng thái, không từ `updated_at` | DEC-225 |
| Quyền mới | `/me` trả `permissions` theo vai (ma trận 01 §5.10) | FE ẩn nút đúng vai, không tự suy từ tên vai | FR-10.02 |
| Nhật ký mới | Đổi chế độ, đổi tên người kiểm, điều chỉnh trạng thái, nâng retention | Truy trách nhiệm | FR-10.03, NFR-15 |
| Nhóm trạng thái yêu cầu trả | OPEN / CANCELLED / DONE (`REFUND_PAID`) / CLOSED; trạng thái lạ → OPEN; lý do lạ → `OTHER` | Không tự hủy / đóng hồ sơ vì một giá trị chưa biết | FR-05.07, DEC-262, DEC-304 |

## 6. Điểm dễ hiểu nhầm

- **`kind` và `work_mode` khác nhau thế nào?** `kind` là công năng lắp đặt (Admin đặt). `work_mode` là việc bàn đang làm lúc này. Chỉ `BOTH` có `work_mode` thay đổi được; `PACK` / `RETURN` luôn `work_mode = kind`.
- **Đặt tên khi bàn đang ở chế độ đóng gói được không?** Được (DEC-305 c): bàn "Cả hai" nhập tên trước rồi mới chuyển chế độ.
- **Downgrade ở lát này làm gì?** Nếu DB đã có dữ liệu Phase 2 thì từ chối (guard DEC-301), không xóa gì. Lùi về Phase 1 có giữ dữ liệu chỉ có từ lát 10.
- **Sao lý do điều chỉnh không thấy trong lịch sử kiện?** `status_history` không có cột ghi chú; lý do nằm trong audit `WAREHOUSE_STATUS_ADJUST`, tên người chỉnh nằm ở `actor` của dòng lịch sử (DEC-303 c).
- **Drawer có mục "Hàng hoàn" chưa?** Đã khai báo trong `nav.ts` nhưng chỉ hiện khi màn có trong `READY_SCREENS` (rỗng ở M6 — DEC-342).

## 7. Bản đồ nghiệp vụ → code

Đường dẫn BE tính từ `ai-cam-be/src/aicam/` (migration từ `ai-cam-be/`), test BE từ `ai-cam-be/tests/`. FE tính từ `ai-cam-fe/src/`, E2E từ `ai-cam-fe/e2e/`.

| Khái niệm nghiệp vụ | Code | Test chứng minh |
|---|---|---|
| Migration 0003, backfill, `recon_start_at`, nâng retention lên sàn | `alembic/versions/0003_returns_recon_claims.py`; model `modules/returns/models.py`, `modules/claims/models.py`, `modules/reconciliation/models.py` | `integration/test_migration_0003.py`: `test_upgrade_0003_on_phase1_data`, `test_upgrade_keeps_retention_above_minimum`, `test_new_checks_accept_phase2_values_and_reject_bad_ones`, `test_alembic_check_detects_drift`; `qa/test_m6_live.py::test_mg_migration_head_and_retention_floor` |
| Chuyển trạng thái Phase 2 + `status_changed_at` + `MANUAL_TRANSITIONS` | `modules/orders/service.py` (`transition`, `MANUAL_TRANSITIONS`) | `unit/test_order_transitions.py`: `test_phase2_transition_allowed`, `test_phase2_transition_forbidden`, `test_manual_transitions_match_srs`, `test_transition_sets_status_changed_at` |
| Điều chỉnh tay (API-122) | `modules/orders/adjust.py` (`adjust_status`) | `integration/test_warehouse_adjust_api.py`: `test_adjust_new_to_handed_over_with_alert`, `test_transition_not_allowed_lists_targets`, `test_cancelled_after_pack_to_handed_over`, `test_missing_to_expected_extends`, `test_session_active_blocks`, `test_return_to_delivered_cancels_case_without_active_packages`, `test_permission`, `test_me_permissions_phase2`; `qa/test_m6_live.py`: `test_tc_06_13_adjust_status`, `test_tc_06_14_transition_not_allowed`, `test_tc_p2_me_permissions` |
| Loại station, chế độ, người kiểm | `modules/stations/service.py` (`default_work_mode`, xóa tên khi thu hồi), `modules/sessions/station_config.py` (`set_work_mode`, `set_operator`), `modules/users/permissions.py` | `integration/test_station_mode_api.py`: `test_patch_kind_rules`, `test_patch_kind_busy`, `test_patch_kind_busy_with_pending_approval`, `test_kind_admin_only`, `test_work_mode_switch`, `test_work_mode_not_allowed`, `test_work_mode_session_active`, `test_operator_set_and_validate`, `test_operator_session_active`, `test_logout_clears_operator`, `test_dashboard_logout_does_not_touch_station`, `test_revoke_sessions_clears_operator`; `qa/test_m6_live.py`: `test_tc_p2_01_kind_admin_only`, `test_tc_04_34_mode_not_allowed`, `test_tc_04_01_both_mode_operator_and_logout` |
| Adapter yêu cầu trả + mock 4 loại + `_RANK` | `modules/platforms/base.py` (`PlatformReturn`), `modules/platforms/shopee/returns_mapping.py`, `modules/platforms/shopee/mapping.py` (`_RANK`), `modules/platforms/mock/adapter.py`, `modules/platforms/mock/fixtures/returns/` (`buyer_return.json`, `refund_only.json`, `cancelled.json`, `failed_delivery_order.json`) | `unit/test_platform_returns.py`: `test_status_group`, `test_reason_normalized_and_labelled`, `test_missing_needs_logistics_means_parcel`, `test_warehouse_hint_rank`, `test_list_returns_pages_and_windows`, `test_shopee_returns_without_creds`, `test_mock_has_four_fixture_kinds`, `test_mock_failed_delivery_order_and_hint` |
| FE nền station (client, luật kiểm dòng, mock) | `lib/api/station.ts`, `shared/returns/inspection.ts`, `shared/returns/types.ts`, `mocks/stationSim.ts`, `mocks/returnsDb.ts` | `shared/returns/inspection.test.ts`, `mocks/stationSim.returns.test.ts` |
| FE nền admin (client, nhãn, drawer, badge, WS) | `lib/api/returns.ts`, `lib/api/recon.ts`, `lib/api/claims.ts`, `shared/returns/labels.ts`, `features/shell/nav.ts`, `features/shell/NavBadge.tsx`, `features/shell/useDashboardSocket.ts` | `shared/returns/labels.test.ts`, `mocks/adminReturns.test.ts`, `features/shell/useDashboardSocket.test.tsx` ("item 02: return.updated…", "item 02: claim.updated…") |
| Contract với BE thật | — | E2E `real/m6-station-contract.spec.ts` ("TC-01.30 (API) / TC-04.34 / TC-04.02…") |

## 8. Giới hạn hiện tại và giả định

| Giới hạn / giả định | Ảnh hưởng | Khi nào xử lý |
|---|---|---|
| **Shopee returns thật chưa test (T-3).** Tên hàm, tên trạng thái, trường mã vận đơn chiều về, cờ "chỉ hoàn tiền" đều theo tài liệu công khai | Mapping có thể sai khi nối thật | T-3 khi có tài khoản partner; RK-11, RB-22 |
| Q16 — sàn có tách "chỉ hoàn tiền" và có mã vận đơn chiều về trong API không | FR-05.12, DEC-202 dựa trên giả định này | T-3 |
| Q14 — bàn hoàn riêng hay dùng chung | Đã hỗ trợ cả hai bằng `kind` | Không chặn |
| Q13 — hạn khiếu nại thật; sàn 60 ngày đủ chưa | Nếu sàn cho khiếu nại muộn hơn, phải tăng sàn / mặc định | **Chặn go-live** |
| Thời gian migration 0003 trên kho lớn: lát này chỉ đo 30 kiện | Xem lát 10 (34 giây / 1 triệu kiện, khóa bảng kiện) | Lát 10 — đo trên server kho **chưa làm** |
| Màn hình người dùng (R1, R5, D4, D6, D15) chưa có ở lát này | Chỉ thử bằng API / MSW | Lát 7–9 |
| RK-12 — tên người kiểm tự gõ, có thể sai / dùng chung | Truy trách nhiệm yếu | Chấp nhận (DEC-204); có video Cam 1 + audit |

## Liên kết

- SRS: [01-srs.md](../../ai/items/02-returns-reconciliation/01-srs.md) v0.5: FR-01.01, 01.07, 04.10, 05.07, 06.05, 10.02, 10.03, BR-25, BR-28, EX-P13, §5.10, §7.1
- Spec: [02 §5](../../ai/items/02-returns-reconciliation/02-tech-spec.md), §6.2 API-60, 100, 101, 122, 92 · [02a §3](../../ai/items/02-returns-reconciliation/02a-be-spec.md), §4, DEC-301..305 · [02b-station](../../ai/items/02-returns-reconciliation/02b-fe-spec-station.md) T-131 · [02b-admin](../../ai/items/02-returns-reconciliation/02b-fe-spec-admin.md) T-151, T-152, DEC-341, 342
- Test cases: [04](../../ai/items/02-returns-reconciliation/04-test-cases.md) TC-01.30, TC-04.01, 04.02, 04.34, TC-06.13, 06.14, TC-P2.01
- Lát sau: [lat-07-nhan-hang-hoan.md](lat-07-nhan-hang-hoan.md)
