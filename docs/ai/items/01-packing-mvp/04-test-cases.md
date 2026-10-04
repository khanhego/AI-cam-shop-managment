# Test Cases — 01 MVP đóng gói

| | |
|---|---|
| QA | khanhtt |
| Trạng thái | Ready (chờ G3) |
| Nguồn | SRS [01-srs.md](01-srs.md) v0.3 · Tech Spec [02](02-tech-spec.md), [02a](02a-be-spec.md), [02b-station](02b-fe-spec-station.md), [02b-admin](02b-fe-spec-admin.md) · Plan [03](03-plan.md) |
| Build / môi trường | chưa có — staging tại kho (profile §6), `fake-cams` cho case không cần phần cứng |
| Last update | 2026-10-04 · QA |

> **TL;DR** — Tổng 137 case: 118 case chức năng chia 8 module, 10 case phân quyền, 9 case NFR. Trong 118 case chức năng có 52 case P1 (chặn release) cộng thêm 9 case phân quyền P1.
> 98 case chức năng tự động hóa được (API bằng pytest + httpx, E2E bằng Playwright). 20 case thủ công, cần camera thật, máy quét thật hoặc Shopee thật.
> Phủ đủ AC-01..05, AC-08..21, BR-01..06, BR-09, BR-15..18, EX-P1..P11, ma trận quyền 4 vai và NFR-01, 03, 04, 05, 09, 10, 31.
> Kết quả chạy và bug sẽ ghi ở `04a-test-report.md` (bước 11).

---

## 1. Phạm vi & chiến lược

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| Mọi FR trong phạm vi 01 §1, AC-01..05, AC-08..21 | Hàng hoàn, đối soát, khiếu nại (Phase 2) |
| API qua HTTP thật (kiểm server chặn quyền, mã lỗi) | Unit test của dev (02a §11, 02b §13) — chỉ kiểm có chạy trong CI |
| E2E station + dashboard trên Chromium | Safari / Firefox ngoài smoke D3, D4 |
| NFR hiệu năng, offline, camera | Pentest đầy đủ (ngoài MVP) |

| Mức | Phạm vi | Công cụ / lệnh | Tự động |
|---|---|---|:---:|
| Unit / integration (dev) | 02a §11, 02b §13 | `cd ai-cam-be && uv run pytest` · `cd ai-cam-fe && pnpm test` | ✔ |
| API (QA) | Case `API` trong §2, ma trận §3 | `ai-cam-be/tests/qa/` pytest + httpx trên compose staging | ✔ |
| E2E / UI | Case `E2E` | `ai-cam-fe/tests/e2e/` Playwright; máy quét giả = `keyboard.type(code, {delay: 5})` + Enter | ✔ |
| Phần cứng | Case `HW` (camera thật, máy quét thật, rút cáp) | Thủ công tại bàn thử, quay màn hình làm bằng chứng | ✗ |
| NFR | §4 | locust (`ai-cam-be/tests/load/`), đồng hồ bấm, đo metric Prometheus | một phần |

Cột **Cách** trong bảng: `API` · `E2E` · `HW` (thủ công có phần cứng) · `MAN` (thủ công khác).

**Dữ liệu test**
- Tạo: `aicam seed-demo --prefix TST` (T-6). Lệnh này tạo 2 station (`TST Station 01`, `TST Station 02`), 4 tài khoản (`tst_admin`, `tst_sup`, `tst_cskh`, `tst_station01`/`02`) và 30 đơn có mã vận đơn `SPXTST0000001..30`. Trong đó `…09` hủy trên sàn, `…10` đã `PACKED`, `…11` đã `HANDED_OVER`, `…12` là đơn 3 sản phẩm.
- File CSV mẫu: `tests/qa/fixtures/csv/{ok_500.csv, one_error.csv, missing_column.csv, overlap_api.csv}`.
- Phiếu in thật (cho HW): 40 phiếu Shopee test in từ mã `SPXTST…`, gồm cả phiếu bị nhăn và phiếu in trùng.
- Đồng hồ giả lập (BR-16, retention): biến `AICAM_FAKE_NOW` chỉ bật ở môi trường test (02a `core/clock.py`).
- Dọn: `docker compose -f docker/compose.yml down -v` trên staging, sau đó xóa `/data/video-test`.

**Vào:** G3 ✅; staging chạy đủ service; seed xong; `fake-cams` và bộ camera thật có ở bàn thử.
**Ra:** mọi case P1 ✅; mọi AC có ≥ 1 case ✅ kèm bằng chứng; bug Critical/High = 0.

## 2. Test cases

Loại: Happy · Negative · Boundary · Permission · State · Regression · NFR · Error. Ưu tiên P1 / P2 / P3. KQ: ⬜ ✅ ❌ ⛔.

### M10 — Đăng nhập, tài khoản, nhật ký

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-10.01 | Station đăng nhập đúng | FR-03.01, AC-13 | Happy | P1 | E2E | seed | Mở `/station/login`, nhập `tst_station01` + mật khẩu, bấm "Đăng nhập" | Vào S1, thanh trạng thái ghi "TST Station 01"; cookie `rt_station` có | ⬜ |
| TC-10.02 | Sai mật khẩu | API-01 | Negative | P1 | E2E | | Nhập sai mật khẩu | Alert "Sai tài khoản hoặc mật khẩu. Kiểm tra lại hoặc hỏi Admin."; 401 `INVALID_CREDENTIALS` | ⬜ |
| TC-10.03 | Tài khoản dashboard vào station | API-01 WRONG_CLIENT | Negative | P2 | E2E | | Đăng nhập `tst_cskh` tại S0 | Alert "Tài khoản này không dùng cho station. Đăng nhập dashboard tại /admin."; 403 `WRONG_CLIENT` | ⬜ |
| TC-10.04 | Khóa sau 10 lần sai | §8 AuthN, API-01 | Boundary | P2 | API | | Gửi sai 10 lần rồi gửi đúng lần 11 | Lần 1–9: 401; lần 10 hoặc 11: 423 `ACCOUNT_LOCKED` với `details.until` ≈ now + 15 phút | ⬜ |
| TC-10.05 | Refresh theo client | API-02, N3 | Regression | P2 | E2E | Cùng trình duyệt đăng nhập station và admin | Chờ access hết hạn (đặt JWT 1 phút ở test) rồi thao tác ở cả hai tab | Hai phiên đều sống, station không bị đẩy sang `/admin` | ⬜ |
| TC-10.06 | Thu hồi đăng nhập station | API-91, FR-03.01 | Happy | P2 | E2E | Station đang ở S1 | Admin vào D9, bấm "Thu hồi phiên đăng nhập" của `tst_station01` | Trong ≤ 15 phút (hết access) station về S0; WS đóng ngay | ⬜ |
| TC-10.07 | Không được khóa Admin cuối | API-90 LAST_ADMIN | Negative | P2 | API | 1 Admin | PATCH `is_active=false` cho Admin duy nhất | 409 `LAST_ADMIN`; D9 Alert "Phải còn ít nhất một Admin." | ⬜ |
| TC-10.08 | Trùng username | API-90 | Negative | P3 | API | | POST user `tst_admin` | 409 `USERNAME_TAKEN` | ⬜ |
| TC-10.09 | Audit thao tác nhạy cảm | FR-10.03, NFR-15 | Happy | P1 | API | | Xem clip, xuất clip, giữ clip, đổi setting, duyệt yêu cầu | D10 / API-92 có đủ `VIEW_CLIP`, `EXPORT_CLIP`, `DOWNLOAD_EXPORT`, `HOLD_CLIP`, `SETTINGS_UPDATE`, `APPROVAL_DECISION`, mỗi dòng đúng user | ⬜ |
| TC-10.10 | Audit không sửa được | 02a §3 quyền DB | Negative | P2 | MAN | Kết nối DB bằng user `aicam_app` | `UPDATE audit_log SET action='X'` | Lỗi permission denied | ⬜ |

### M01 — Station và camera

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-01.01 | Tạo station + 2 camera | FR-01.01, UC-07 | Happy | P1 | E2E | Admin, `fake-cams` | D6 "Thêm station" → tên, tài khoản → Cam 1, Cam 2 → "Kiểm tra kết nối" → Lưu | Ảnh chụp hiện; station trong danh sách, chip Cam 1 / Cam 2 online ≤ 10 giây | ⬜ |
| TC-01.02 | Tên station trùng | API-60 | Negative | P3 | API | | POST `TST Station 01` lần 2 | 409 `NAME_TAKEN`; D6 "Tên station đã tồn tại." | ⬜ |
| TC-01.03 | Tài khoản station đã gắn nơi khác | API-60 | Negative | P3 | API | | Gắn `tst_station01` cho station thứ 3 | 409 `ACCOUNT_IN_USE` | ⬜ |
| TC-01.04 | Camera sai mật khẩu / không tới được | API-62 | Error | P2 | API | | Test với RTSP sai pass; IP không tồn tại | 422 `CAMERA_UNREACHABLE` `reason` = `AUTH` / `TIMEOUT`; vẫn lưu được | ⬜ |
| TC-01.05 | Vẽ và lưu ROI Cam 2 | FR-01.04 | Happy | P1 | E2E | | D6 → ROI → kéo khung → "Lưu vùng đọc mã" | 200; vision nạp ROI mới (mã ngoài khung không còn được đọc — kiểm ở TC-03.20) | ⬜ |
| TC-01.06 | ROI quá nhỏ / cho Cam 1 | API-64 | Boundary | P3 | API | | `w=0.04`; ROI cho CAM1 | 422 `ROI_INVALID`; 409 `ROI_ONLY_CAM2` | ⬜ |
| TC-01.07 | Mất tín hiệu camera ≤ 10 giây | FR-01.02, 01.03, AC-10 | NFR | P1 | HW | Phiên đang mở ở station | Rút cáp Cam 2, bấm đồng hồ | ≤ 10 giây: chip đỏ "Cam 2 mất tín hiệu" trên station + âm `warn` + D2 "Cần xử lý"; phiên gắn cờ `VIDEO_INCOMPLETE` | ⬜ |
| TC-01.08 | Camera trở lại | FR-01.02 | State | P2 | HW | sau TC-01.07 | Cắm lại cáp | ≤ 10 giây chip xanh | ⬜ |
| TC-01.09 | Lệch giờ camera > 1 giây | FR-01.06, BR-15, AC-17 | Boundary | P1 | HW | Camera hỗ trợ ONVIF (DEC-33) | Chỉnh giờ camera +1,5 giây; chờ ≤ 10 phút | D2 "Camera lệch giờ 1,5 giây"; với +0,8 giây: không cảnh báo | ⬜ |
| TC-01.10 | Live view | FR-01.05 | Happy | P3 | HW | Supervisor | Mở D11 | 4 ô video chạy, chip REC; rút cáp 1 camera → ô "Mất tín hiệu" | ⬜ |

### M03 — Phiên đóng gói (station)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-03.01 | Mở phiên | FR-03.02, 03.03, AC-01 | Happy | P1 | E2E | S1, `SPXTST0000012` NEW | Quét `SPXTST0000012` | ≤ 1 giây: nền xanh dương "ĐANG ĐÓNG GÓI", mã cỡ lớn, 3 sản phẩm + số lượng, ghi chú khách; bíp thành công | ⬜ |
| TC-03.02 | Đóng phiên | FR-03.04, AC-01 | Happy | P1 | E2E | sau TC-03.01, khay trống / khớp | Quét lại mã | Về S1, bíp; "Hôm nay" +1; API-31 kiện `PACKED`, phiên `COMPLETED` | ⬜ |
| TC-03.03 | Quét liên tục 50 đơn | FR-03.11, AC-01 | Happy | P1 | E2E | 50 đơn NEW | Lặp mở/đóng 50 đơn không dùng chuột | 50 phiên `COMPLETED`; p95 ≤ 1 giây (đo `aicam_scan_duration_seconds`) | ⬜ |
| TC-03.04 | Quét đóng bằng mã khác | FR-03.05, BR-05, AC-03 | Negative | P1 | E2E | Phiên `…01` mở | Quét `…02` | S3 nền đỏ "LỆCH MÃ — KHÔNG DÁN PHIẾU NÀY", "Đang đóng gói SPXTST0000001 / Vừa quét SPXTST0000002", âm lỗi lặp; phiên `MISMATCH`, kiện vẫn `PACKING` | ⬜ |
| TC-03.05 | Sửa lệch mã bằng quét đúng | FR-03.05, UC-08 | State | P1 | E2E | sau TC-03.04, khay không có phiếu sai | Quét `…01` | Về S1, phiên `COMPLETED` có flag `HAD_MISMATCH` | ⬜ |
| TC-03.06 | AC-03 lặp 20 lần | AC-03 | Negative | P1 | E2E | | 20 lần cố ý quét đóng sai mã | 20/20 `MISMATCH`, 0 phiên `COMPLETED` sai | ⬜ |
| TC-03.07 | Không mở phiên mới khi đang lệch | FR-03.05 | Negative | P1 | API | Phiên `MISMATCH` | Quét `…03` | `outcome=MISMATCH` (cập nhật mã vừa quét), không có phiên mới; BR-02 giữ 1 phiên | ⬜ |
| TC-03.08 | Đơn đã hủy | BR-01, EX-P1, AC-05 | Negative | P1 | E2E | `…09` hủy trên sàn | Quét `…09` | S4 vàng "ĐƠN ĐÃ HỦY", 2 bíp, tự về S1 sau 5 giây; không có phiên | ⬜ |
| TC-03.09 | Đơn đã đóng | BR-03, EX-P2 | Negative | P1 | E2E | `…10` `PACKED` | Quét `…10` | S4 "ĐƠN ĐÃ ĐÓNG GÓI", nút "Yêu cầu đóng gói lại"; không bấm → về S1 | ⬜ |
| TC-03.10 | Đơn đã bàn giao | BR-03, AC-21 | Negative | P1 | E2E | `…11` `HANDED_OVER` | Quét `…11` | S4 "ĐƠN ĐÃ BÀN GIAO", không có nút đóng gói lại; `alert.code=ALREADY_HANDED_OVER` | ⬜ |
| TC-03.11 | Kiện hủy sau khi đóng | BR-01, N1, EX-P10 | Negative | P2 | API | kiện `CANCELLED_AFTER_PACK` | Quét | `ORDER_CANCELLED` (không phải `ALREADY_HANDED_OVER`) | ⬜ |
| TC-03.12 | Mã chưa có, Shopee có | BR-04, EX-P3 | Happy | P2 | API | Adapter mock trả đơn | Quét `SPXTST9990001` | `SESSION_OPENED`, kiện `verified=true`, có sản phẩm | ⬜ |
| TC-03.13 | Mã chưa có, Shopee chậm 3 giây | BR-04 | Boundary | P1 | API | Adapter mock trễ 3 giây | Quét `SPXTST9990002` | Phản hồi ≤ 3 giây; `SESSION_OPENED` flag `UNVERIFIED`; S2 chip "Chưa xác minh với Shopee", "Chưa có danh sách sản phẩm cho đơn này." | ⬜ |
| TC-03.14 | Mã sai định dạng | API-11 INVALID_CODE | Negative | P2 | E2E | | Quét `ABC` (dưới 4 ký tự: bị bỏ qua) và `abc!!12345` | `ABC`: không phản hồi; `abc!!12345`: S4 "MÃ KHÔNG HỢP LỆ" | ⬜ |
| TC-03.15 | Cùng kiện ở 2 station | BR-02 mở rộng | Negative | P2 | API | `…13` đang mở ở Station 01 | Station 02 quét `…13` | `ALERT` `PACKED_ELSEWHERE_IN_PROGRESS` | ⬜ |
| TC-03.16 | Hai request scan song song | BR-02, 02a §6 | Negative | P1 | API | | Gửi đồng thời 2 API-11 khác `client_scan_id`, 2 mã khác nhau, cùng station | Đúng 1 phiên OPEN; request còn lại `MISMATCH` hoặc `SESSION_OPENED` tuần tự, không có 2 phiên mở | ⬜ |
| TC-03.17 | Retry cùng `client_scan_id` | DEC-29 | Regression | P1 | API | | Gửi API-11 2 lần cùng `client_scan_id` | Lần 2 trả cùng `outcome` lần 1, `state` mới; chỉ 1 sự kiện SCAN trong `session_event` | ⬜ |
| TC-03.18 | Hủy phiên có lý do | FR-03.08, EX (UC-01) | Happy | P2 | E2E | Phiên mở | "Hủy phiên" → "Hết hàng" → "Hủy phiên" | Về S1; phiên `CANCELLED` `OUT_OF_STOCK`; kiện `NEW`; clip vẫn được cắt | ⬜ |
| TC-03.19 | Hủy "Khác" thiếu ghi chú | API-12 | Negative | P3 | E2E | | Chọn "Khác", bỏ trống | Lỗi dưới ô ghi chú; 422 nếu gọi API trực tiếp | ⬜ |
| TC-03.20 | Cam 2 khớp mã | FR-03.06 | Happy | P1 | HW | ROI đã đặt | Đặt phiếu `…14` lên khay, quét `…14` | ≤ 2 giây chip "Cam 2 khớp mã trên khay"; đặt phiếu ngoài ROI → không đọc | ⬜ |
| TC-03.21 | Cam 2 thấy phiếu sai | FR-03.07, BR-06, AC-04 | Negative | P1 | HW | Phiên `…14` mở | Đặt thêm phiếu `…15` lên khay | ≤ 2 giây S3, nguồn "Cam 2 thấy trên khay"; 40 lần thử ≥ 38 lần đạt | ⬜ |
| TC-03.22 | Quét đúng khi khay còn phiếu sai | BR-06, AC-04, review #2 | Negative | P1 | HW + API | Sau TC-03.21, phiếu `…15` còn trên khay | Quét `…14` hai lần | Cả hai lần `MISMATCH` source `CAM2`; 10/10 lần không đóng được | ⬜ |
| TC-03.23 | Bỏ phiếu sai khỏi khay | BR-06 | State | P1 | HW | sau TC-03.22 | Lấy phiếu `…15` ra | Phiên về `OPEN` (S2); quét `…14` → `COMPLETED` | ⬜ |
| TC-03.24 | Cam 2 không đọc được | EX-P6, BR-18 | Negative | P1 | HW | | Che khay cả phiên, mở và đóng phiên | Không chặn; S2 chip vàng "Cam 2 chưa thấy phiếu"; phiên flag `CAM2_UNVERIFIED`; D4 hiện cờ | ⬜ |
| TC-03.25 | Vision dừng | BR-18 | Negative | P2 | MAN | `docker stop vision` | Mở và đóng phiên | `tray.match=UNAVAILABLE`; phiên flag `CAM2_UNVERIFIED` | ⬜ |
| TC-03.26 | Phiếu còn trên khay khi đóng | BR-18 | Boundary | P3 | HW | 2 phiếu in trùng `…16` | Dán 1, để 1 trên khay, quét đóng | `COMPLETED` + flag `LABEL_ON_TRAY` | ⬜ |
| TC-03.27 | Cảnh báo 15 phút | BR-16, FR-03.09 | Boundary | P2 | API | `AICAM_FAKE_NOW` | Mở phiên, tua +14:59 rồi +15:00 | 14:59: không; 15:00: WS cảnh báo, S2 Alert "Phiên đã mở 15 phút…" (1 lần) | ⬜ |
| TC-03.28 | Bỏ dở 30 phút | BR-16, AC-16 | Boundary | P1 | API | | Tua +30:00 | Phiên `ABANDONED`, kiện `NEW`, clip được tạo; station về S1 với Alert "…đã tự đóng do quá 30 phút." | ⬜ |
| TC-03.29 | Không bỏ dở khi đang chờ duyệt | BR-16 (02a) | State | P3 | API | Phiên `WAITING_APPROVAL` | Tua +31 phút | Vẫn `WAITING_APPROVAL` | ⬜ |
| TC-03.30 | Station chưa đăng nhập quét | EX-P9 | Negative | P2 | E2E | S0 | Quét mã | Alert "Station chưa đăng nhập. Đăng nhập rồi quét lại."; không có request API-11 | ⬜ |
| TC-03.31 | Gõ tay không bị coi là quét | 02b-station §10 | Negative | P2 | E2E | S1 | Gõ `SPXTST0000001` + Enter, 200 ms/phím | Không có request API-11 | ⬜ |
| TC-03.32 | Mất kết nối server | NFR-09, S6 | Error | P1 | E2E | | Chặn mạng tới API > 5 giây | S6 "MẤT KẾT NỐI MÁY CHỦ", không nhận quét; nối lại → về màn đúng state | ⬜ |
| TC-03.33 | Phiên gần đây + xem clip | §5.1 ma trận, API-15 | Happy | P2 | E2E | 2 phiên xong hôm nay | S1 bấm "Xem" | Dialog phát Cam 1 / Cam 2; phiên hôm qua không có trong danh sách | ⬜ |

### M03b — Yêu cầu duyệt (station ↔ dashboard)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-03.40 | Gửi duyệt lệch mã → Cho tiếp tục | FR-03.12, UC-08, AC-19 | Happy | P1 | E2E | Phiên `MISMATCH` (quét), dashboard D13 mở | Station "Gọi quản lý"; Supervisor "Cho tiếp tục" | ≤ 2 giây D13 có yêu cầu + âm báo; ≤ 2 giây sau duyệt station về S2; audit `APPROVAL_DECISION` tên Supervisor | ⬜ |
| TC-03.41 | Gọi quản lý từ S2 (ASSIST) | FR-03.12, DEC-25 | Happy | P1 | E2E | Phiên `OPEN` | S2 "Gọi quản lý" | S5 "Gọi quản lý"; D13 loại "Gọi quản lý" với 3 nút | ⬜ |
| TC-03.42 | Đóng phiên có ghi chú | API-21 | Happy | P2 | E2E | Yêu cầu MISMATCH, khay khớp | "Đóng phiên có ghi chú" + ghi chú | Phiên `COMPLETED` flag `CLOSED_BY_SUPERVISOR`, kiện `PACKED`; station S1 | ⬜ |
| TC-03.43 | Đóng có ghi chú khi khay còn sai | API-21 TRAY_STILL_DIFFERENT | Negative | P1 | API | Yêu cầu MISMATCH source CAM2, tray DIFFERENT | Gọi API-21 CLOSE_WITH_NOTE | 409 `TRAY_STILL_DIFFERENT`; D13 nút bị khóa + Alert | ⬜ |
| TC-03.44 | Cho tiếp tục khi khay còn sai | N7 | State | P2 | E2E | như trên | "Cho tiếp tục" | Phiên về `OPEN` rồi `MISMATCH` ngay; station S3; D13 đã cảnh báo trước | ⬜ |
| TC-03.45 | Hủy phiên từ dashboard | API-21 | Happy | P2 | API | | CANCEL_SESSION | Phiên `CANCELLED` `SUPERVISOR`; station S1 + Alert "Quản lý đã hủy phiên." | ⬜ |
| TC-03.46 | Rút yêu cầu | API-14 | State | P2 | E2E | S5 | "Rút yêu cầu" | Station về màn trước (S3 hoặc S2); D13 yêu cầu biến mất | ⬜ |
| TC-03.47 | Hai Supervisor duyệt cùng lúc | API-21 ALREADY_RESOLVED | Negative | P2 | API | 2 Supervisor | Gửi 2 API-21 đồng thời | 1 thành công; 1 nhận 409 `ALREADY_RESOLVED` với `decided_by`; D13 hiện "Yêu cầu này đã được … xử lý lúc …" | ⬜ |
| TC-03.48 | Duyệt khi station đã rút | API-21 | Negative | P3 | API | Station rút | Supervisor gửi quyết định | 409, `details.status=WITHDRAWN`; D13 "Station đã rút yêu cầu." | ⬜ |
| TC-03.49 | Gửi 2 yêu cầu | API-13 APPROVAL_ALREADY_PENDING | Negative | P3 | API | Có PENDING | Gửi thêm | 409 `APPROVAL_ALREADY_PENDING` | ⬜ |
| TC-03.50 | Quét khi đang chờ duyệt | API-11 IGNORED | Negative | P2 | E2E | S5 | Quét mã bất kỳ | Toast "Đang chờ duyệt."; không đổi state | ⬜ |
| TC-03.51 | Đóng gói lại: duyệt → hoàn tất | BR-03, FR-03.10, AC-14 | Happy | P1 | E2E | `…10` `PACKED` | Quét → "Yêu cầu đóng gói lại" → Supervisor "Duyệt đóng gói lại" → đóng gói → quét đóng | Trong lúc làm: phiên cũ vẫn `COMPLETED`; sau khi đóng: phiên cũ `SUPERSEDED`, phiên mới `COMPLETED` flag `REPACK`, cả hai clip còn | ⬜ |
| TC-03.52 | Đóng gói lại: duyệt → hủy | BR-03, AC-21 | State | P1 | API | | Duyệt rồi station hủy phiên | Kiện về `PACKED`; phiên cũ vẫn `COMPLETED` (hiệu lực) | ⬜ |
| TC-03.53 | Đóng gói lại: bỏ dở | BR-03, BR-16 | State | P2 | API | | Duyệt rồi tua +30 phút | Kiện `PACKED`; phiên cũ không đổi | ⬜ |
| TC-03.54 | Từ chối đóng gói lại | API-21 REJECT | Negative | P2 | E2E | | Supervisor "Từ chối" | Station về S1 | ⬜ |
| TC-03.55 | REPACK kiện đã bàn giao qua API | API-13 NOT_ELIGIBLE | Negative | P2 | API | `…11` | POST API-13 REPACK | 409 `NOT_ELIGIBLE` | ⬜ |
| TC-03.56 | CSKH không nhận sự kiện duyệt | 02 WS-02 | Permission | P3 | API | WS-02 bằng `tst_cskh` | Tạo yêu cầu | Không nhận `approval.created` | ⬜ |

### M02 — Ghi hình, clip, retention

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-02.01 | Clip phủ đủ khoảng | FR-02.02, AC-02 | Happy | P1 | API + MAN | Camera giả có OSD giờ | Mở 10:00:00, đóng 10:02:00 | Clip Cam 1, Cam 2 READY ≤ 60 giây; phủ ≥ [09:59:55, 10:02:05] (xem OSD đầu/cuối, sai số ≤ 1 keyframe) | ⬜ |
| TC-02.02 | 20 clip ngẫu nhiên | AC-02 | Happy | P1 | HW | 20 phiên ở bàn thử | Mở clip, so OSD camera với mốc phiên | 20/20 đạt | ⬜ |
| TC-02.03 | Clip khi camera rớt giữa phiên | FR-02.02, EX-P7 | Negative | P1 | HW | | Rút Cam 1 30 giây giữa phiên | Clip READY flag `VIDEO_INCOMPLETE`; D4 chip "Thiếu video" | ⬜ |
| TC-02.04 | SHA-256 khớp | FR-02.04, AC-11 | Happy | P1 | API | | `sha256sum` file clip so `clip.sha256`; so `info.json` bản xuất | Khớp | ⬜ |
| TC-02.05 | Không có đường xóa / sửa clip | FR-02.05, AC-11, DEC-27 | Negative | P1 | API | | Thử `DELETE /clips/{id}`, `PUT`, `PATCH` với mọi vai; kiểm quyền file (`0444`) | 404/405 mọi vai; file chỉ đọc | ⬜ |
| TC-02.06 | Giữ clip qua retention | FR-02.09, BR-09, AC-15 | Happy | P1 | API | 2 clip, 1 giữ | Tua +91 ngày, chạy J-02 | Clip giữ còn; clip không giữ `DELETED`, file xóa; D4 "Clip đã bị xóa ngày … theo chính sách lưu trữ 90 ngày." | ⬜ |
| TC-02.07 | Tăng retention có hiệu lực ngay | FR-02.06, AC-20 | Regression | P1 | API | Clip 100 ngày tuổi (fake now) | Đổi clip 90 → 180, chạy J-02 | Clip không bị xóa | ⬜ |
| TC-02.08 | Retention video thô | FR-02.06 | Happy | P2 | API | | Tua +31 ngày, J-02 | Segment > 30 ngày bị xóa, segment mới còn | ⬜ |
| TC-02.09 | Ràng buộc setting | API-80 | Boundary | P2 | E2E | | Clip 20 < thô 30; warn 30 ≥ abandon 30; ngày 0 và 366 | Lỗi dưới ô tương ứng; 422 | ⬜ |
| TC-02.10 | Cắt lại clip lỗi | API-46 | Error | P2 | API | Clip `FAILED` (xóa segment giả lập) | Khôi phục segment, gọi API-46 | 202; clip READY | ⬜ |
| TC-02.11 | Clip đang cắt | API-40 CLIP_NOT_READY | State | P2 | E2E | Vừa đóng phiên | Mở D4 ngay | "Clip đang được cắt, sẵn sàng trong khoảng 1 phút."; tự cập nhật khi READY | ⬜ |
| TC-02.12 | URL clip hết hạn | API-41 SIGNATURE_INVALID | Negative | P2 | API | | Gọi URL sau 11 phút; sửa `uid` trong URL | 403 `SIGNATURE_INVALID` cả hai | ⬜ |
| TC-02.13 | Audit xem clip đúng người | NFR-15, DEC-13 | Happy | P1 | E2E | `tst_cskh` | Mở D4 (chưa bấm phát) → bấm phát → tua | Chỉ 1 dòng `VIEW_CLIP` của `tst_cskh` sau khi bấm phát | ⬜ |

### M07 — Tra cứu, chi tiết, xuất

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-07.01 | Quét mã vào ô tìm → mở chi tiết | FR-07.01, 07.03, UC-03 | Happy | P1 | E2E | Kiện `PACKED` | D3, máy quét giả nhập mã | Mở thẳng D4 | ⬜ |
| TC-07.02 | Tìm theo mã đơn sàn | FR-07.01 | Happy | P2 | API | | `q=<platform_order_sn>` | Đúng kiện | ⬜ |
| TC-07.03 | Lọc ngày, station, trạng thái, nguồn | FR-07.01 | Happy | P2 | E2E | seed 7 ngày | Áp từng bộ lọc | Kết quả đúng; URL giữ filter khi reload | ⬜ |
| TC-07.04 | Khoảng ngày > 92 | API-30 | Boundary | P3 | API | | from–to 93 ngày | 422 | ⬜ |
| TC-07.05 | Không tìm thấy | D3 empty | Negative | P2 | E2E | | Tìm `SPXTST000XXXX` | "Không tìm thấy mã SPXTST000XXXX." + "Xóa bộ lọc" | ⬜ |
| TC-07.06 | Chi tiết đủ thông tin | FR-07.02 | Happy | P1 | E2E | Kiện có 2 phiên (REPACK) | Mở D4 | Sản phẩm, phiên (mới nhất trước, "Bị thay thế"), dòng thời gian sàn + kho, SHA-256 + Copy | ⬜ |
| TC-07.07 | Xuất clip ≤ 30 giây | FR-07.04, AC-08 | NFR | P1 | E2E | Clip 2 phút | D3 quét mã → D4 → "Xuất clip" (Ghép) → tải MP4 | Tổng ≤ 30 giây; MP4 phát được trên điện thoại (iOS + Android); overlay đúng mã vận đơn, mã đơn, giờ, tên station | ⬜ |
| TC-07.08 | Xuất 10 đơn | AC-08 | NFR | P1 | MAN | | Lặp TC-07.07 với 10 đơn | 10/10 ≤ 30 giây | ⬜ |
| TC-07.09 | Xuất khi clip đã xóa | API-43 CLIP_DELETED | Negative | P3 | API | | | 410 | ⬜ |
| TC-07.10 | Encode lỗi | J-03 FAILED | Error | P3 | API | Giả lập ffmpeg lỗi | Xuất | `FAILED`; Dialog "Không tạo được file xuất. Bấm Thử lại…" | ⬜ |
| TC-07.11 | Tab Ghép đồng bộ | DEC-21 | Happy | P3 | E2E | | Tab Ghép, tua | 2 video cùng thời điểm (lệch ≤ 0,5 giây) | ⬜ |
| TC-07.12 | Dashboard hiển thị trên điện thoại | 02b-admin §9 | Regression | P3 | MAN | 360px, Safari iOS | D3, D4 | Không cuộn ngang; bảng thành card | ⬜ |

### M05 — Nguồn đơn (Shopee, CSV)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-05.01 | Kết nối Shopee | FR-05.01, UC-10 | Happy | P1 | MAN | Partner key (Q11) | D7 "Kết nối Shopee" → ủy quyền | Về D7 Alert thành công, "Đã kết nối"; đồng bộ đầu ≤ 5 phút | ⬜ |
| TC-05.02 | Từ chối ủy quyền | UC-10 EX | Negative | P2 | MAN | | Bấm từ chối trên Shopee | D7 "Shopee từ chối ủy quyền. Bấm Kết nối lại để thử lần nữa." | ⬜ |
| TC-05.03 | Chưa cấu hình partner | API-71 PLATFORM_NOT_CONFIGURED | Negative | P2 | E2E | `SHOPEE_ENABLED=false` | Mở D7 | Alert hướng dẫn dùng "Nhập đơn từ file" | ⬜ |
| TC-05.04 | Đồng bộ đơn mới | FR-05.02, 05.03 | Happy | P1 | API | Adapter mock có 5 đơn mới | Chạy J-04 | 5 đơn + kiện + sản phẩm; `source=API` | ⬜ |
| TC-05.05 | Đơn hủy sau khi đóng | EX-P10 | State | P1 | API | Kiện `PACKED` | Mock đổi đơn → CANCELLED, J-04 | Kiện `CANCELLED_AFTER_PACK`; D2 "đơn bị hủy sau khi đóng" | ⬜ |
| TC-05.06 | Trạng thái vận chuyển | FR-05.04 | State | P2 | API | Kiện `PACKED` | Mock → đã lấy hàng, rồi giao thành công; J-06 | `HANDED_OVER` rồi `DELIVERED`; dòng thời gian có | ⬜ |
| TC-05.07 | Xác minh kiện chưa xác minh | J-05, BR-04 | State | P2 | API | Kiện `verified=false` | Mock trả đơn; J-05 | `verified=true`, gắn đơn | ⬜ |
| TC-05.08 | Lỗi tạm Shopee | 02a §7 J-04 | Error | P2 | API | Mock 503 hai lần rồi OK | J-04 | Thành công sau retry; không trùng đơn | ⬜ |
| TC-05.09 | Lỗi cuối Shopee | J-04 | Error | P2 | API | Mock 503 liên tục | J-04 | `shop.last_error`; D2 "Cần xử lý" lỗi đồng bộ | ⬜ |
| TC-05.10 | Token hết hạn, refresh hỏng | J-12 | Error | P2 | API | Mock refresh 401 | J-12 | `auth_status=EXPIRED`; D7 chip "Hết hạn" + "Kết nối lại" | ⬜ |
| TC-05.11 | Nhập CSV 500 dòng | FR-05.09, AC-12 | Happy | P1 | E2E | `ok_500.csv` | D5 tải → xem trước → "Nhập 500 đơn" | Xem trước + nhập ≤ 30 giây; Alert "Đã nhập 500 đơn."; lịch sử có dòng | ⬜ |
| TC-05.12 | CSV 1 dòng lỗi | FR-05.09, EX-P11, AC-12 | Negative | P1 | E2E | `one_error.csv` | Tải | Alert "File có 1 dòng lỗi…", bảng lỗi đúng dòng/cột, nút Nhập khóa; 0 đơn được tạo | ⬜ |
| TC-05.13 | CSV thiếu cột | API-50 FILE_INVALID | Negative | P2 | E2E | `missing_column.csv` | Tải | "File thiếu cột bắt buộc: Mã vận đơn. Dùng file mẫu." | ⬜ |
| TC-05.14 | CSV > 5 MB / > 5.000 dòng | API-50 | Boundary | P3 | API | | | 422 `FILE_INVALID` | ⬜ |
| TC-05.15 | CSV trùng đơn từ API | BR-17 | Negative | P1 | API | `overlap_api.csv` có 5 đơn đã có từ API | Tải → commit | 5 dòng "Bỏ qua (đã có từ Shopee)"; đơn API không đổi | ⬜ |
| TC-05.16 | API ghi đè đơn CSV | BR-17, FR-05.10 | State | P1 | API | Đơn nguồn CSV | J-04 trả cùng đơn | `source=API`; audit `ORDER_OVERWRITTEN_BY_API` có bản CSV cũ | ⬜ |
| TC-05.17 | Xem trước hết hạn | API-51 IMPORT_EXPIRED | Boundary | P3 | API | | Commit sau 31 phút (fake now) | 409 `IMPORT_EXPIRED` | ⬜ |
| TC-05.18 | Tải file gốc / hết hạn | API-54 | Happy | P3 | API | | Tải file vừa nhập; tua +91 ngày | 200; sau 90 ngày 410 `FILE_EXPIRED` | ⬜ |

### M09 — Dashboard ngày

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|:---:|---|---|---|:---:|
| TC-09.01 | Số liệu đúng | FR-09.01, AC-18 | Happy | P1 | API | Kịch bản: 12 phiên COMPLETED (3 từng lệch mã, 1 REPACK), 1 ABANDONED, 2 CANCELLED, 4 kiện `PACKED` chưa bàn giao, 1 `CANCELLED_AFTER_PACK` | API-32 hôm nay | `packed=12, had_mismatch=3, abandoned=1, cancelled=2, packed_not_handed_over=4, cancelled_after_pack=1` | ⬜ |
| TC-09.02 | Thẻ dẫn đúng bộ lọc | N2, 02b-admin KpiCard | Regression | P2 | E2E | như trên | Bấm từng thẻ | D3 hiện đúng số dòng bằng số trên thẻ | ⬜ |
| TC-09.03 | Tự cập nhật | WS-02 | Happy | P2 | E2E | D2 mở | Station đóng 1 phiên | "Đã đóng gói" +1 trong ≤ 5 giây không reload | ⬜ |
| TC-09.04 | Ngày trống | D2 empty | Negative | P3 | E2E | | Chọn ngày chưa có dữ liệu | Thẻ 0, "Chưa có phiên đóng gói nào trong ngày." | ⬜ |
| TC-09.05 | Ổ đĩa > 80% | NFR-30 | Boundary | P2 | MAN | Giả lập đĩa đầy (volume nhỏ) | Mở D2, D8 | "Cần xử lý" ổ đĩa 8x%; D8 thanh cảnh báo | ⬜ |

## 3. Phân quyền

Gọi API trực tiếp bằng token từng vai (server phải chặn), sau đó kiểm UI ẩn. ✅ được · ⛔ 403 · — không áp dụng.

| Hành động (API) | Admin | Supervisor | Station | CSKH | TC |
|---|:---:|:---:|:---:|:---:|---|
| Quét / phiên (API-10..15) | ⛔ | ⛔ | ✅ | ⛔ | TC-P.01 |
| Duyệt (API-20, 21) | ✅ | ✅ | ⛔ | ⛔ | TC-P.02 |
| Tra cứu, chi tiết (API-30, 31), dashboard (API-32) | ✅ | ✅ | ⛔ | ✅ | TC-P.03 |
| URL clip (API-40) phiên station khác / ngày trước | ✅ | ✅ | ⛔ | ✅ | TC-P.04 |
| URL clip phiên station mình trong ngày | ✅ | ✅ | ✅ | ✅ | TC-P.04 |
| Giữ clip, xuất (API-42, 43) | ✅ | ✅ | ⛔ | ✅ | TC-P.05 |
| Cắt lại clip (API-46) | ✅ | ✅ | ⛔ | ⛔ | TC-P.05 |
| Nhập CSV (API-50..54) | ✅ | ✅ | ⛔ | ⛔ | TC-P.06 |
| Station, camera, ROI (API-60..64) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.07 |
| Live view (API-65) | ✅ | ✅ | ⛔ | ⛔ | TC-P.07 |
| Shopee (API-70..73), cài đặt PUT (API-80) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.08 |
| Sức khỏe (API-81), cài đặt GET | ✅ | ✅ | ⛔ | ⛔ | TC-P.08 |
| Người dùng, thu hồi, audit (API-90..92) | ✅ | ⛔ | ⛔ | ⛔ | TC-P.09 |
| Truy cập `/station` bằng tài khoản dashboard | → `/admin` | → `/admin` | ✅ | → `/admin` | TC-P.10 |
| Truy cập `/admin/settings/*` | ✅ | → forbidden | → `/station` | → forbidden | TC-P.10 |

TC-P.01..P.09: tự động (API, mọi ô của bảng, P1). TC-P.10: E2E (P2).

## 4. Phi chức năng

| ID | NFR | Kịch bản & tải | Ngưỡng đạt | Kết quả đo |
|---|---|---|---|---|
| TC-N.01 | NFR-01 | 100 lần quét đơn có sẵn, 2 station song song | p95 ≤ 1 giây (đo client + `aicam_scan_duration_seconds`) | |
| TC-N.02 | NFR-01 | 20 lần quét mã phải tra Shopee (mock trễ 1,5 giây) | p95 ≤ 3 giây | |
| TC-N.03 | NFR-03 | 50 phiên dài 1–5 phút | Clip READY p95 ≤ 60 giây | |
| TC-N.04 | NFR-05 | locust 1 giờ: 2 station × 120 quét/giờ + 1 CSKH tra cứu 1 lần/10 giây + 2 xuất clip/giờ | NFR-01, 03, 04 vẫn đạt; CPU server < 80% | |
| TC-N.05 | NFR-04 | 1 triệu kiện giả lập trong DB | API-30 theo mã ≤ 2 giây | |
| TC-N.06 | NFR-09, AC-09 | Rút WAN 30 phút khi đang đóng gói; cắm lại | Đóng gói + ghi hình bình thường; đồng bộ lại ≤ 10 phút | |
| TC-N.07 | NFR-31 | Đo bitrate thực 4 camera 1 giờ | Dung lượng dự báo 30 ngày thô + 90 ngày clip vừa NAS, < 80% | |
| TC-N.08 | AC-08 / DEC-32 | Encode export clip 3 phút SIDE_BY_SIDE | p95 ≤ 20 giây | |
| TC-N.09 | NFR-10 | Rút điện server (có UPS) | UPS giữ ≥ 15 phút, tắt an toàn, segment đang ghi đọc được sau khi bật | |

## 5. Truy vết

| FR / AC / BR / EX | TC | Đạt |
|---|---|:---:|
| AC-01 | TC-03.01, 03.02, 03.03, N.01 | ⬜ |
| AC-02 | TC-02.01, 02.02 | ⬜ |
| AC-03 | TC-03.04, 03.06 | ⬜ |
| AC-04 | TC-03.21, 03.22 | ⬜ |
| AC-05 | TC-03.08 | ⬜ |
| AC-08 | TC-07.07, 07.08, N.08 | ⬜ |
| AC-09 | TC-N.06 | ⬜ |
| AC-10 | TC-01.07, 02.03 | ⬜ |
| AC-11 | TC-02.04, 02.05 | ⬜ |
| AC-12 | TC-05.11, 05.12 | ⬜ |
| AC-13 | TC-10.01, 03.30 | ⬜ |
| AC-14 | TC-03.51 | ⬜ |
| AC-15 | TC-02.06 | ⬜ |
| AC-16 | TC-03.28 | ⬜ |
| AC-17 | TC-01.09 | ⬜ |
| AC-18 | TC-09.01, 09.02 | ⬜ |
| AC-19 | TC-03.40, 03.41 | ⬜ |
| AC-20 | TC-02.07 | ⬜ |
| AC-21 | TC-03.10, 03.52 | ⬜ |
| FR-01.01..01.06 | TC-01.01..01.10 | ⬜ |
| FR-02.01..02.07, 02.09 | TC-02.01..02.13, 07.07, 07.11 | ⬜ |
| FR-03.01 | TC-10.01, 10.06, 03.30 | ⬜ |
| FR-03.02..03.07 | TC-03.01..03.17, 03.20..03.26 | ⬜ |
| FR-03.08, 03.09 | TC-03.18, 03.19, 03.27..03.29 | ⬜ |
| FR-03.10, 03.12 | TC-03.40..03.56 | ⬜ |
| FR-03.11 | TC-03.03, 03.31 | ⬜ |
| FR-05.01..05.04, 05.06..05.08 | TC-05.01..05.10, 03.12, 03.13 | ⬜ |
| FR-05.09, 05.10 | TC-05.11..05.18 | ⬜ |
| FR-07.01..07.04 | TC-07.01..07.12 | ⬜ |
| FR-09.01 | TC-09.01..09.05 | ⬜ |
| FR-10.01..10.03 | TC-10.01..10.10, TC-P.01..P.10 | ⬜ |
| BR-01 | TC-03.08, 03.11 | ⬜ |
| BR-02 | TC-03.07, 03.15, 03.16 | ⬜ |
| BR-03 | TC-03.09, 03.10, 03.51..03.55 | ⬜ |
| BR-04 | TC-03.12, 03.13, 05.07 | ⬜ |
| BR-05 | TC-03.04, 03.06 | ⬜ |
| BR-06 | TC-03.21..03.23 | ⬜ |
| BR-09 | TC-02.06 | ⬜ |
| BR-15 | TC-01.09 | ⬜ |
| BR-16 | TC-03.27..03.29, 03.53 | ⬜ |
| BR-17 | TC-05.15, 05.16 | ⬜ |
| BR-18 | TC-03.24..03.26 | ⬜ |
| EX-P1 | TC-03.08 | ⬜ |
| EX-P2 | TC-03.09, 03.51 | ⬜ |
| EX-P3 | TC-03.12, 03.13 | ⬜ |
| EX-P4 | TC-03.07 | ⬜ |
| EX-P5 | TC-03.27, 03.28 | ⬜ |
| EX-P6 | TC-03.24 | ⬜ |
| EX-P7 | TC-01.07, 02.03 | ⬜ |
| EX-P8 | TC-03.01 (đơn `…12` có 3 sản phẩm); đơn nhiều kiện: TC-05.04 (mock 1 đơn 2 mã vận đơn → 2 kiện, 2 phiên) | ⬜ |
| EX-P9 | TC-03.30 | ⬜ |
| EX-P10 | TC-05.05, 03.11 | ⬜ |
| EX-P11 | TC-05.12 | ⬜ |
| State kiện (01 §7) | NEW→PACKING (03.01), PACKING→PACKED (03.02), PACKING→NEW (03.18, 03.28), PACKED→PACKING (03.51), PACKING→PACKED hủy repack (03.52), PACKED→HANDED_OVER→DELIVERED (05.06), PACKED→CANCELLED_AFTER_PACK (05.05), NEW→CANCELLED (03.08 dữ liệu). Chuyển cấm: HANDED_OVER→PACKING (03.10, 03.55) | ⬜ |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-38 | Tự động hóa case P1 | Viết test API (`tests/qa/`) và E2E (`tests/e2e/`) trong T-19, T-38, T-61; case HW thủ công có quay màn hình | Repo chưa có code; gắn vào task đã có trong 03 | khanhtt (tự quyết) |

## Chốt G4
- [ ] Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng
- [ ] Ma trận quyền đã chạy
- [ ] NFR có ngưỡng đã đo
- [ ] Bug Critical/High = 0 (hoặc có DEC chấp nhận)
- [ ] Regression vùng bị chạm đã chạy
