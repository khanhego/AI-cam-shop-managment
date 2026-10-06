# FE Spec — 02 Hàng hoàn và đối soát · client: station (kiosk web)

| | |
|---|---|
| Tác giả | khanhtt (FE) |
| Reviewer | khanhtt (tech lead, review subagent ở bước 5) |
| Trạng thái | **Approved (G2 2026-10-05 có điều kiện, DEC-274)** · **v0.4** (lượt 3: R3-1 `FORCE_NEW_NOT_ALLOWED`) · v0.2 (sửa review G2 lượt 1 — R-5, R-9, R-24, R-27, R-30; DEC-239, 281) · **v0.3** (review G2 lượt 2: R2-3, R2-8, R2-11 — DEC-264..273) |
| Tổng quan & contract | [02-tech-spec.md](02-tech-spec.md) · Màn: [01-srs.md §10.4](01-srs.md) (R1–R5, S1/S2/S3 mở rộng) · nền Phase 1 [item 01 02b-station](../01-packing-mvp/02b-fe-spec-station.md) · [Design system](../../../design-system/README.md) mục Station kiosk |
| Last update | 2026-10-05 · FE (T-131: DEC-321) |

> **TL;DR** — Không thêm route: `StationPage` chọn panel theo `station.work_mode` + `state` (một nguồn state server, DEC-18 item 01). Thêm 5 màn bàn hoàn R1–R5 (R2 nền `secondary-container`), sửa chữ S3, thông báo cờ sau đóng ở S1, banner đơn vừa hủy ở S2.
> Quét vẫn qua `ScanListener` → API-11 (hoặc API-105 khi mở từ tìm thủ công); kết luận lưu tự động API-102 (chờ 1 giây) và **luôn lưu xong trước khi gửi lần quét đóng**.
> Điểm khó: R2 là màn duy nhất ở station có nhập liệu (số lượng, tình trạng, ghi chú, F2 chụp ảnh) mà không được nuốt mất lần quét HID; giữ phản hồi ≤ 1 giây.
> 7 task T-131..T-137 (≈ 10 ngày công).

Không viết lại API — trỏ API-xx trong [02 §6](02-tech-spec.md#6-api-contract).

---

## 1. Phạm vi

| Goals (lát/spec này làm) | Non-goals (cố ý không làm — để đâu) |
|---|---|
| R1–R5 trên `/station` theo `work_mode = RETURN` (01 §10.4) | Sửa kết luận sau khi đóng — dashboard D4 (02b-admin) |
| Đổi chế độ bàn (station `BOTH`), nhập tên người kiểm (BR-28) | Duyệt "Gọi quản lý" — vẫn ở D13 |
| Kết luận theo dòng + chung (BR-22 chặn trước ở client), lưu tự động, chụp ảnh F2, xem ảnh + clip đóng gói gốc | Chụp ảnh bằng webcam máy trạm (ảnh do server lấy — DEC-220) |
| Hardening Phase 1: S3 chữ hai tình huống (FR-03.13), S1 thông báo cờ (FR-03.14), S2 banner đơn hủy (FR-03.15) | Thay đổi luồng đóng gói Phase 1 (ngoài 3 điểm trên) |
| Chạy offline trong LAN; không mất lần quét khi đang lưu kết luận | Mobile / Safari / Firefox — như Phase 1, chỉ Chromium kiosk |

| Màn / luồng | Route | FR / UC | REUSE / EXTEND / NEW |
|---|---|---|:---:|
| R1 Sẵn sàng nhận hoàn | `/station` (`work_mode = RETURN`, `state = READY`) | FR-04.01, 04.10, 01.07 / UC-02, UC-14 | NEW (`ReturnReadyPanel`, dùng `StationStatePanel`) |
| R2 Đang kiểm hàng hoàn | `/station` (`state = INSPECTING`) | FR-04.02..06, 04.08, 04.09, 04.12 / UC-02 | NEW (`InspectingPanel`) |
| R3 Tìm thủ công | Dialog trên R1 / R4 | FR-04.07, 04.13 | NEW (`ReturnLookupDialog`) |
| R4 Cảnh báo hàng hoàn | Overlay sau `outcome = ALERT` ở RETURN | FR-04.01, 04.13, EX-R6, R11, R12 | EXTEND `AlertOverlay` |
| R5 Người kiểm | Dialog (bắt buộc khi `operator_name = null`) | FR-04.10, BR-28 / UC-14 | NEW (`OperatorDialog`) |
| S1 + đổi chế độ + thông báo cờ | `/station` (`PACK`, `READY`) | FR-01.07, 03.14 | EXTEND `ReadyPanel` |
| S2 + banner đơn hủy | `PACKING` | FR-03.15 | EXTEND `PackingPanel` |
| S3 chữ mới | `MISMATCH` | FR-03.13 | EXTEND `MismatchPanel`, `copy.ts` |
| S0, S5, S6 | như Phase 1 | — | REUSE (S5 hiện thêm "Mở hoàn" khi `session.type = RETURN`) |

## 2. Điều hướng

```mermaid
flowchart LR
    L["/station/login (S0)"] --> M["/station"]
    M -->|work_mode PACK| P{state}
    P -->|READY| S1
    P -->|PACKING| S2
    P -->|MISMATCH| S3
    M -->|work_mode RETURN| Q{operator_name?}
    Q -->|null| R5[R5 Dialog bắt buộc]
    Q -->|có| R{state}
    R -->|READY| R1
    R -->|INSPECTING| R2
    M -->|WAITING_APPROVAL (cả hai)| S5
    S1 -.->|kind BOTH: API-100 RETURN| R1
    R1 -.->|kind BOTH: API-100 PACK| S1
    R1 -.->|Tìm thủ công| R3 -.->|API-105| R2
    M -.->|outcome ALERT| A{work_mode}
    A -->|PACK| S4
    A -->|RETURN| R4
    M -.->|WS mất > 5 giây| S6
```

Guard không đổi (`role = STATION`). Không có route mới; panel chọn trong `StationPage` bằng hàm thuần `selectPanel(state)` (test được) theo bảng trên.

## 3. Cây component

| Component | Mới / reuse (path) | Props / input chính | Ghi chú |
|---|---|---|---|
| `StationPage` | EXTEND `src/features/station/StationPage.tsx` | — | Dùng `selectPanel()`; mount `OperatorDialog` khi cần; đăng ký phím F2 chỉ khi R2 |
| `selectPanel` | NEW `features/station/selectPanel.ts` | `StationState` | Trả `'S1' \| 'S2' \| 'S3' \| 'S5' \| 'R1' \| 'R2'` |
| `StationStatusBar` | EXTEND | + `workMode`, `operatorName`, `onChangeOperator` | Chip `secondary` "Nhận hàng hoàn" + "Người kiểm: Lan [Đổi]" khi RETURN |
| `StationStatePanel` | EXTEND | `tone` thêm `secondary` | Nền `secondary-container` / chữ `on-secondary-container` |
| `ReadyPanel` (S1) | EXTEND | + `canSwitchMode`, `notice` | Nút "Chuyển sang nhận hàng hoàn"; `ClosedNotice` |
| `ClosedNotice` | NEW `features/station/ClosedNotice.tsx` | `closedSession` (API-11) | S1: cờ `LABEL_ON_TRAY` / `CAM2_UNVERIFIED`; R1: kết luận + mã KN; tự ẩn 10 giây hoặc lần quét kế |
| `PackingPanel` (S2) | EXTEND | `session.flags` | `OrderCancelledBanner` khi có `ORDER_CANCELLED` |
| `MismatchPanel` (S3) | EXTEND | `session.mismatch` | Hai khối hướng dẫn khi `source = SCAN`; chữ Cam 2 khi `source = CAM2` (01 §10.4) |
| `ReturnReadyPanel` (R1) | NEW `features/station/returns/ReturnReadyPanel.tsx` | `todayReturnCount`, `todayReturnIssueCount`, `recent`, `canSwitchMode` | Nút "Không quét được mã? Tìm thủ công", "Chuyển sang đóng gói" |
| `InspectingPanel` (R2) | NEW `features/station/returns/InspectingPanel.tsx` | `session` (RETURN) | Bố cục 2 cột 01 §10.4 R2 |
| `ReturnHeader` | NEW | `session.return_case`, `package` | Mã đã quét (display-md mono), chip loại, mã đơn, mã gốc, lý do |
| `InspectionTable` | NEW `features/station/returns/InspectionTable.tsx` | `lines`, `onChange`, `mode` (`FULL` \| `REFERENCE`) | `REFERENCE` (giao thất bại đơn > 1 kiện — 02 §6.3 #7): bảng chỉ xem + chữ "Đơn có {n} kiện — chỉ chọn kết luận chung cho kiện này."; không gửi `lines` thay đổi | Mỗi dòng: ảnh 64px, tên, gửi, yêu cầu trả, `QuantityStepper` (− / +, 56px), `SelectField` tình trạng (6 giá trị) |
| `ConclusionPicker` | NEW `features/station/returns/ConclusionPicker.tsx` | `value`, `disabledOk`, `onChange`, `error` | 6 nút `SegmentedButtons` cao 56px; "Nguyên vẹn" khóa theo BR-22 + tooltip |
| `InspectionNote` | NEW | `value`, `required` | `TextAreaField` ≤ 500; bắt buộc khi `OTHER` |
| `SnapshotStrip` | NEW `shared/media/SnapshotStrip.tsx` (dùng chung admin) | `snapshots`, `onCapture?`, `max` | Ô 96px; bấm → `Dialog` ảnh lớn; nút "+ Chụp ảnh (F2)" |
| `PackReferenceCard` | NEW `features/station/returns/PackReferenceCard.tsx` | `pack_reference` | Ảnh lúc đóng gói + "Xem clip đóng gói" → `ClipPreviewDialog` (REUSE `shared/media/ClipPlayer`) |
| `SaveIndicator` | NEW | `status: idle \| saving \| saved \| error` | Chip "Đã lưu" / "Đang lưu…" / "Chưa lưu được — thử lại" |
| `ReturnLookupDialog` (R3) | NEW `features/station/returns/ReturnLookupDialog.tsx` | `initialQuery?` | `TextField` + danh sách kết quả + "Mở phiên" / "Mở phiên chưa xác định" |
| `AlertOverlay` (S4/R4) | EXTEND | `alert`, `workMode` | Bảng chữ R4; `RETURN_NOT_FOUND` 2 nút; `RETURN_MULTIPLE_PACKAGES` → mở R3; tự đóng 8 giây ở RETURN (5 giây ở PACK) |
| `OperatorDialog` (R5) | NEW `features/station/returns/OperatorDialog.tsx` | `required`, `current` | Không đóng bằng Esc khi `required` |
| `ReturnCancelDialog` | EXTEND `CancelSessionDialog` | `sessionType` | Lý do theo loại phiên (02 §5.2) |
| `inspectionRules` | NEW `src/shared/returns/inspection.ts` (dùng chung admin) | — | `canBeOk(lines)` (BR-22), nhãn kết luận / tình trạng / loại hoàn, `initialLines` (không cần — server khởi tạo) |

## 4. State & data fetching

| Dữ liệu | Nguồn (API-xx) | Nơi giữ state | Cache & làm mới | Optimistic? |
|---|---|---|---|:---:|
| Trạng thái station (gồm `work_mode`, `operator_name`, phiên RETURN, `inspection`, `snapshots`, `pack_reference`) | API-10, WS-01 `station.state`, response API-11/12/13/14/100/101/102/103/105 | `stationStore` — một nguồn, thay toàn bộ object | Như Phase 1 | ✗ |
| Bản nháp kết luận R2 | Người dùng sửa → API-102 | `inspectionDraft` trong `stationStore` (lines, conclusion, note, `dirty`, `saveStatus`) | Debounce 1 giây → API-102; response ghi đè `state.session.inspection`; khi `state` mới tới mà `dirty = false` → nháp lấy theo server; `dirty = true` → giữ nháp (không ghi đè chữ đang gõ) | ✔ (hiện ngay trên UI, server xác nhận) |
| Ảnh | API-103 → `snapshot` | `state.session.snapshots` (server) | Thêm khi response 201; URL ký hết hạn (403 ở `<img>`) → gọi API-10 một lần | ✗ |
| Phiên gần đây R1 | API-15 (có `type`, `conclusion`, `claim_code`) | Query `['station','recent']` | Invalidate khi `SESSION_COMPLETED`, `session.clip_ready` | ✗ |
| Kết quả tìm R3 | API-104 | Query `['return-lookup', q]` `staleTime` 0 | Chỉ khi bấm "Tìm" / Enter | ✗ |
| Thông báo sau đóng | `closed_session` trong response API-11 | `stationStore.closedNotice` | Xóa sau 10 giây / lần quét kế | — |

**Flush trước quá giờ (DEC-272):** khi tới `warn_at` và 30 giây trước `abandon_at` (theo đồng hồ server) → nếu nháp `dirty` thì gửi API-102 ngay (server chỉ tự hoàn tất bằng kết luận **đã lưu**).

**Quét khi R2 có nháp chưa lưu (DEC-235):** `scan()` ở R2 → nếu `inspectionDraft.dirty` hoặc API-102 đang chạy → chờ API-102 xong (tối đa 3 giây; quá → vẫn gửi API-11, server trả `INSPECTION_REQUIRED` nếu chưa có kết luận) → gửi API-11. Hàng đợi quét Phase 1 (tối đa 1 lần chờ) giữ nguyên.

**F2 và máy quét (DEC-237):** máy quét HID gửi ký tự + Enter ≤ 50 ms/phím (`ScanBuffer`); F2 là phím chức năng không sinh ký tự → `StationPage` nghe `keydown` `F2` riêng (chỉ R2, `preventDefault`). Khi focus đang ở ô nhập (ghi chú, tên người kiểm, tìm thủ công): `ScanBuffer` vẫn nhận chuỗi nhanh kết thúc Enter và **không** gõ vào ô (Phase 1 đã chặn ở ô tìm D3 — áp lại cho R2 / R3 / R5 qua `useScanListener({ captureInInputs: true })`); gõ tay chậm vào ô bình thường.

## 5. Form & validate

| Form | Field | Rule client | Lỗi server map vào field |
|---|---|---|---|
| R5 người kiểm | `name` (sau đăng xuất / thu hồi station, server xóa tên → R5 hiện lại — BR-28) | trim, 2–40 | `VALIDATION_ERROR.fields.name`; `SESSION_ACTIVE` → Alert "Đóng phiên trước khi đổi người kiểm." |
| R2 dòng | `quantity_received` | 0–999 (stepper không cho ra ngoài) | `VALIDATION_ERROR.fields["lines.N.quantity_received"]` → viền đỏ dòng N |
| | `condition` | bắt buộc (mặc định OK) | |
| R2 kết luận | `conclusion` | `lines_mode = REFERENCE` → không khóa "Nguyên vẹn". `FULL`: "Nguyên vẹn" khóa khi `!canBeOk(lines)` (BR-22); đang chọn OK mà dòng đổi sang vấn đề → bỏ chọn + chữ "Có dòng thiếu / hỏng — chọn vấn đề." | `CONCLUSION_INCONSISTENT` → cùng chữ |
| | `note` | ≤ 500; bắt buộc khi `OTHER` | `fields.note` |
| R3 tìm | `q` | trim, upper, ≥ 4 ký tự | `VALIDATION_ERROR` → "Nhập ít nhất 4 ký tự." |
| Hủy phiên hoàn | `reason` | Quét nhầm / Không phải hàng hoàn / Khác (note bắt buộc ≤ 200) | `fields.note` |

## 6. Trạng thái UI

| Màn | Loading | Empty | Error | Forbidden | Success |
|---|---|---|---|---|---|
| R1 | Khi chờ API-11: `LinearProgress` mảnh trên đỉnh panel | Phiên gần đây: "Chưa có kiện hoàn nào hôm nay." | API-15 lỗi → ẩn khối; API-11 retry → S6 | 403 → S0 | Đổi panel + bíp; `ClosedNotice` |
| R2 | Mở từ state có sẵn — không skeleton; ảnh: ô xám + spinner tới khi tải | Không có dòng: "Chưa có danh sách sản phẩm. Chọn kết luận chung." · Không có `pack_reference`: "Không có clip đóng gói (đơn trước khi dùng hệ thống)." | API-102 lỗi: `SaveIndicator` "Chưa lưu được — thử lại" + tự thử lại 2 lần; API-103 lỗi: toast; `INSPECTION_REQUIRED`: viền đỏ khối Kết luận + chữ + âm lỗi 1 lần; `RETURN_CODE_DIFFERENT`: Alert vàng 5 giây | 403 → S0 | Đóng → R1 + `ClosedNotice` |
| R3 | `LinearProgress` trong Dialog | "Không tìm thấy. Kiểm tra lại mã hoặc Mở phiên chưa xác định." | "Không tìm được lúc này. Thử lại." | — | Mở R2 |
| R4 | — | — | — | — | Overlay `warning-container`, 2 bíp, tự đóng 8 giây (trừ khi có nút) |
| R5 | Nút "Bắt đầu ca" xoay | — | Alert dưới ô | — | Đóng Dialog, chip tên trên thanh |
| S1 thông báo cờ | — | — | — | — | Alert `warning` 10 giây |
| S2 đơn hủy | — | — | — | — | Banner `error` + âm lỗi 1 lần (WS-01 `alert ORDER_CANCELLED_DURING_SESSION`), nút "Hủy phiên" dạng tonal |
| Quá giờ RETURN | Alert 20 phút (từ `warn_at`, server đã trừ thời gian chờ duyệt). 45 phút: phiên có kết luận được server tự hoàn tất → state về R1 + `ClosedNotice` ("…đã tự hoàn tất do quá 45 phút", cờ `AUTO_CLOSED`); không có → WS `alert SESSION_ABANDONED` → R1 + thông báo | | | | |

## 7. Phân quyền trên UI

| Hành động / màn | Role thấy | Cách xử lý khi không quyền |
|---|---|---|
| R1–R5 | STATION, `work_mode = RETURN` | Panel theo state server; API-100..105 trả 409 `WRONG_WORK_MODE` / `MODE_NOT_ALLOWED` → tải lại API-10 |
| Nút đổi chế độ | Chỉ `station.kind = BOTH` và rảnh | Ẩn |
| "Xem clip đóng gói" | STATION khi đang có phiên RETURN của kiện | API-40 403 → nút khóa + "Không xem được clip lúc này." |
| Sửa kết luận sau đóng | Không có ở station | — |

## 8. Xử lý lỗi API

| Mã lỗi (từ 02) | Hiển thị | Hành động |
|---|---|---|
| ALERT `OPERATOR_REQUIRED` | Mở R5 (không overlay) | — |
| ALERT `RETURN_NOT_FOUND` | R4 "KHÔNG TÌM THẤY ĐƠN" | "Tìm thủ công" → R3 (`q` = mã); "Mở phiên chưa xác định" → API-105 `unidentified_code` |
| ALERT `RETURN_MULTIPLE_PACKAGES` | R4 "ĐƠN CÓ NHIỀU KIỆN" 1,5 giây | Tự mở R3 với `q = data.platform_order_sn` |
| ALERT `RETURN_ALREADY_RECEIVED` | R4 "KIỆN HOÀN ĐÃ NHẬN" + nút "Đây là kiện khác — vẫn ghi hình" (khi `data.can_record_other`) → Dialog ghi chú 5–200 → API-105 `{unidentified_code, force_new: true, note}` → R2 | Không bấm → tự đóng 8 giây (DEC-265) |
| API-105 `409 FORCE_NEW_NOT_ALLOWED` (v0.4) | Toast "Mã này không thuộc kiện đã nhận — quét lại." | Đóng Dialog, giữ R1 |
| ALERT `NOT_SHIPPED`, `RETURN_IN_PROGRESS_ELSEWHERE`, `INVALID_CODE` | R4 theo bảng 01 §10.4 + `alert.message` | Tự đóng 8 giây |
| WS-01 `alert SESSION_AUTO_CLOSED` | R1 + `ClosedNotice` từ `data.closed_session` ("…đã tự hoàn tất do quá 45 phút", mã KN nếu có) + bíp | Invalidate phiên gần đây (DEC-272) |
| ALERT `INSPECTION_REQUIRED` | Tại chỗ R2 (không overlay) | Cuộn tới khối Kết luận, focus nút đầu |
| ALERT `RETURN_CODE_DIFFERENT` | Alert vàng R2 "Mã {code} không thuộc kiện đang kiểm…" | 5 giây |
| API-102 `SESSION_NOT_OPEN` / `NOT_RETURN_SESSION` | — | Gọi lại API-10, bỏ nháp |
| API-102 `VALIDATION_ERROR` / `CONCLUSION_INCONSISTENT` | Theo §5 | Giữ nháp, `SaveIndicator` lỗi |
| API-103 `SNAPSHOT_LIMIT` | Nút "Đã đủ 20 ảnh" | — |
| API-103 `SESSION_NOT_OPEN` | — | Xóa ảnh đang chờ, gọi lại API-10 |
| API-105 `SESSION_ACTIVE` | Toast "Station đang có phiên. Đóng phiên trước." | Đóng R3, gọi lại API-10 |
| API-105 `200 outcome = ALERT` | Đóng R3 → R4 theo `alert.code` (như API-11) | — |
| API-11 PACK `ALERT ALREADY_HANDED_OVER` có `data.is_return` | S4 "ĐƠN ĐÃ BÀN GIAO" + dòng "Đây là kiện hàng hoàn — nhận ở bàn nhận hoàn." | Tự đóng 5 giây |
| API-103 `CAMERA_UNREACHABLE` | Toast "Không chụp được ảnh từ Cam 1. Thử lại." | — |
| API-100/101 `SESSION_ACTIVE` | Alert trong Dialog / toast | — |
| API-100 `MODE_NOT_ALLOWED`, API-104/105 `WRONG_WORK_MODE` | — | Tải lại API-10 |
| API-105 `NOT_FOUND` | Toast "Không tìm thấy kiện này nữa. Tìm lại." | Giữ R3 |
| WS-01 `alert ORDER_CANCELLED_DURING_SESSION` | Âm lỗi 1 lần (banner theo `flags` từ `station.state`) | — |
| Lỗi chung (401, 403, 409 `STATION_INACTIVE`, mạng) | Như Phase 1 | Như Phase 1 |

## 9. Nội dung chữ · i18n · a11y · responsive

- Chữ trong `src/features/station/copy.ts` (mở rộng nhóm `returns`, `operator`, `lookup`, `closedNotice`, `orderCancelled`, `mismatch.scanCases`) — nguyên văn 01 §10.4. Nhãn enum (kết luận, tình trạng, loại hoàn) trong `src/shared/returns/inspection.ts` dùng chung admin. Không đặt mã kỹ thuật lên màn hình.
- Cỡ chữ kiosk như Phase 1; bảng dòng sản phẩm `title-lg`, số `tabular-nums`; nút ≥ 56px, cách ≥ 24px (R2 có nút thật vì bàn hoàn có chuột / cảm ứng — AS-08).
- a11y: `ConclusionPicker` là `radiogroup` với nhãn; `QuantityStepper` có `aria-label` "Số nhận {tên}"; phím Tab đi theo thứ tự dòng → kết luận → ghi chú → ảnh; F2 có nhãn trên nút.
- Kích thước: 1920×1080 và 1366×768; R2 ở 1366: cột phải "Lúc đóng gói" thu còn ảnh 160px; bảng > 6 dòng cuộn trong khung, khối Kết luận luôn hiện (sticky đáy).

## 10. Riêng nền tảng

Chromium kiosk như Phase 1. Ảnh qua `<img>` URL ký (không cần header). Bundle `/station` tăng ≤ 40 KB gzip (giới hạn tổng 250 KB). Không dùng camera trình duyệt.

## 11. Analytics & theo dõi lỗi

N/A — như Phase 1 (DEC-23 item 01: không gửi lỗi JS về BE). Log trình duyệt có `session_id` khi API-102 lỗi.

## 12. Mock khi BE chưa xong

- `src/mocks/handlers/station.ts` + `stationSim.ts` (`StationSim`): thêm `workMode`, `operatorName`, nhánh RETURN của API-11 theo bảng 02 §6.2 (mã `SPXTST-RT…` mở BUYER_RETURN, `SPXTST…` đã giao mở FAILED_DELIVERY, `SPXVN0000000000` → `RETURN_NOT_FOUND`, `2410MULTI` → `RETURN_MULTIPLE_PACKAGES`), API-100..105, API-102 (BR-22 như server), API-103 trả ảnh mẫu `public/mock/snapshot.jpg`, API-106 (MSW trả file tĩnh). Bật bằng `pnpm dev:mock` như Phase 1.
- Fixture dùng chung `src/mocks/returnsDb.ts` (cùng dữ liệu D14/D17 admin).

## 13. Test FE

| Mức | Phạm vi | Case chính (TC-xx) |
|---|---|---|
| Unit | `selectPanel` (mọi tổ hợp `work_mode` × `state`), `inspection.canBeOk` (BR-22, 8 trường hợp), reducer nháp (dirty / server ghi đè), hàng đợi quét chờ flush API-102 | AC-34, AC-36 |
| Component | `InspectionTable` (stepper biên 0 / 999), `ConclusionPicker` (khóa OK), `ClosedNotice` (2 cờ PACK, kết luận + KN), `MismatchPanel` (SCAN vs CAM2 — không có câu "dán phiếu {mã kiện này}" cho tình huống quên quét), `OperatorDialog` (Esc khi required), `AlertOverlay` mọi mã RETURN | AC-29 |
| Integration (MSW) | R5 → R1 → quét → R2 → sửa dòng → quét đóng khi chưa kết luận → chọn → quét mã gốc → R1 + KN; R3 → API-105 chưa xác định; F2 3 lần → 3 ảnh; quét trong ô ghi chú không lọt chữ vào ô | AC-22, 33, 36 |
| E2E mock | `e2e/mock/returns.spec.ts`: UC-02 + UC-14 (đổi chế độ BOTH) | AC-06 |
| E2E BE thật | `e2e/real/m7-return-uc02.spec.ts` + `m8-claims.spec.ts` (fake-cam1 cho ảnh): UC-02 đủ vòng, hồ sơ KN tự tạo; `m10-station-returns.spec.ts` (`seed-demo` hàng hoàn, 02b-admin DEC-352): R4 kiện hoàn ở bàn đóng gói / chưa gửi đi / đã nhận → "Đây là kiện khác" (API-105 `force_new`), R3 tìm thủ công, phiên chưa xác định | AC-06, 22, 33, 34, 39 |

## 14. Task

| # | Việc | Màn / FR | Phụ thuộc (API-xx) | Ước lượng |
|---|---|---|---|---|
| T-131 | API client `lib/api/station.ts` mở rộng (kiểu API-10/11 RETURN, `closed_session`, API-100..105), `src/shared/returns/inspection.ts`, copy; MSW `StationSim` RETURN + `returnsDb.ts` | nền R1–R5 | 02 §6 (mock) | 1,5 |
| T-132 | `selectPanel`, `StationStatusBar` chip chế độ / người kiểm, R1 `ReturnReadyPanel`, R5 `OperatorDialog`, đổi chế độ ở S1 / R1 | R1, R5, S1 / FR-01.07, 04.10 | API-10, 100, 101, 15 | 1 |
| T-133 | R2 `InspectingPanel`: `ReturnHeader`, `InspectionTable`, `ConclusionPicker`, ghi chú, `SaveIndicator`, nháp + debounce API-102, chờ flush trước quét đóng, flush tại `warn_at` / trước `abandon_at`, WS `SESSION_AUTO_CLOSED`, `ReturnCancelDialog`, quá giờ | R2 / FR-04.02, 04.03, 04.05, 04.09 | API-11, 12, 102 | 2 |
| T-134 | R2 ảnh + tham chiếu: `SnapshotStrip` (shared), F2, API-103, `PackReferenceCard` + `ClipPreviewDialog` | R2 / FR-04.04, 04.12 | API-103, 106, 40 | 1,5 |
| T-135 | R3 `ReturnLookupDialog` + R4 mã RETURN trong `AlertOverlay` + `RETURN_MULTIPLE_PACKAGES` → R3 + API-105 (kèm `unidentified_code`, `force_new` từ "Đây là kiện khác"); `useScanListener({ captureInInputs })` | R3, R4 / FR-04.07, 04.13 | API-104, 105 | 1,5 |
| T-136 | Hardening Phase 1: S3 chữ hai tình huống, `ClosedNotice` cho PACK (S1), `OrderCancelledBanner` S2 + WS-01 `alert` | S1, S2, S3 / FR-03.13..15 | API-11 `closed_session`, WS-01 | 1 |
| T-137 | Test unit / component / integration, E2E mock + E2E BE thật UC-02 | — | BE T-101..T-110 cho E2E thật | 1,5 |

Tổng ≈ 10 ngày công.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Chọn? (lý do) |
|---|---|---|---|
| Lưu kết luận tự động (debounce 1 giây) + flush trước quét đóng | Không có nút "Lưu" (kiosk), không mất dữ liệu khi mất mạng ngắn | Thêm logic chờ | ✔ (DEC-235) |
| Gửi kết luận kèm lần quét đóng (mở rộng body API-11) | Một request | Đổi contract API-11; kết luận chỉ lưu khi đóng → mất khi bỏ dở / quá giờ | ✗ |
| Logic BR-22 + nhãn dùng chung `src/shared/returns/` | Station và D4 sửa kết luận cùng luật | Thêm thư mục shared | ✔ (DEC-236) |
| Phím tắt chụp ảnh F2 nghe riêng | Không đụng `ScanBuffer` | Phải chặn F2 mặc định của trình duyệt (không có ở kiosk) | ✔ (DEC-237) |
| R4 tự đóng 8 giây (S4 Phase 1: 5 giây) | Bàn hoàn đọc chữ dài hơn, có nút hành động | Khác S4 | ✔ (DEC-238) |

## Rủi ro & câu hỏi mở

| ID | Rủi ro / câu hỏi | Ảnh hưởng | Giảm thiểu / ai trả lời | Hạn |
|---|---|---|---|---|
| RF-11 | Người kiểm quét khi đang gõ ghi chú → mã lọt vào ô | Ghi chú sai, lần quét mất | `captureInInputs` + test tích hợp; E2E BE thật | T-135 |
| RF-12 | Màn 1366×768 không đủ chỗ cho bảng nhiều dòng + kết luận | Phải cuộn, che nút | Khối Kết luận sticky; kiểm ảnh chụp 2 độ phân giải | T-133 |
| RF-13 | Ảnh lớn (4MP) tải chậm trên máy trạm yếu | R2 chậm | Server trả JPEG chất lượng 85; `<img loading="lazy">` cho dải ảnh | T-134 |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-235 | Lưu kết luận phiên hoàn | Nháp client + debounce 1 giây API-102; quét đóng chờ flush tối đa 3 giây | Không mất kết luận khi bỏ dở / quá giờ; server luôn có bản mới nhất trước khi đóng | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-236 | Luật BR-22 phía client | `src/shared/returns/inspection.ts` dùng chung station + admin | Một chỗ sửa khi luật đổi | khanhtt (tự quyết) |
| DEC-237 | Phím chụp ảnh | F2 (nghe `keydown` riêng ở R2) | Không xung đột máy quét HID (không gửi phím chức năng) | khanhtt (tự quyết) |
| DEC-238 | Thời gian tự đóng R4 | 8 giây | Chữ R4 dài hơn S4, có 2 nút ở `RETURN_NOT_FOUND` | khanhtt (tự quyết) |
| DEC-239 | Bố cục R2 ở 1366×768 (RF-12) | Khối Kết luận + hướng dẫn quét dính đáy (sticky), bảng dòng cuộn trong khung | Luôn thấy kết luận và hướng dẫn quét đóng; không phải cuộn trang | khanhtt (tự quyết) |
| DEC-281 | Review G2 lượt 1 phần station (đổi số từ DEC-244 — trùng 01, R2-11) | `lines_mode`, tự hoàn tất quá giờ, lỗi API-103 / 105, kiện hoàn ở bàn đóng gói, R5 sau đăng xuất | Theo 02 §6.3 | khanhtt (tự quyết) |
| DEC-321 | T-131 mock RETURN (§12) | Mã mock theo dữ liệu 04 §1 (`SPXRTTST000041` Khách trả hàng, `SPXTST0000042` giao thất bại, `2410TST00043` → `RETURN_MULTIPLE_PACKAGES`, `SPXTST0000053` đã nhận, `SPXTST0000055` đang kiểm ở station khác, `SPXTST0000050` không có clip, `SPXVN0000000000` không tìm thấy) thay tên minh họa `SPXTST-RT…` / `2410MULTI`; trạng thái là **sau khi** J-13 / J-06 đã đồng bộ (mock không chạy job). Kiện ở `packagesDb` (D3 / D4 thấy), hồ sơ + hồ sơ khiếu nại ở `returnsDb.ts`. API-106 mock trả 302 tới `public/mock/snapshot.jpg` (bị xóa khỏi `dist` như video mẫu). J-07 / J-04 giả lập bằng `stationJobs.expireReturnSession()` / `orderCancelled()` (phát WS-01). Kiểu `StationState` mở rộng là **bắt buộc** theo contract (BE deploy trước FE — 02 §10); nhãn loại hoàn / trạng thái hồ sơ cũng nằm ở `src/shared/returns/inspection.ts` | Một bộ dữ liệu chung với seed BE (QA chạy cùng mã trên mock và BE thật); không thêm cờ / route dev | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-322 | T-132: R1 / R5 / đổi chế độ | (1) "Phiên gần đây" (API-15) lọc theo `type` của panel: S1 chỉ PACK, R1 chỉ RETURN (station "Cả hai" có cả hai loại); (2) R5 bắt buộc ở station "Cả hai" có nút text "Chuyển sang đóng gói" (không thì kẹt ở R5 khi không định nhận hoàn); (3) nút "Đổi" người kiểm khóa khi `state ≠ READY` (tooltip "Đóng phiên trước khi đổi người kiểm."); (4) R1 / S1 dùng nút `elevated` thay `outlined` (tương phản trên nền màu — như S2 Phase 1); (5) `captureInInputs` (§4) bật ngay T-132 cho cả trang khi `work_mode = RETURN` (R5 có ô nhập); ký tự đầu của chuỗi nhanh đã vào ô được gỡ khi Enter kết thúc lần quét, chuỗi nhanh không có Enter được chèn trả | Không đổi contract; tránh kẹt / lọt mã | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-323 | T-133: R2 nháp + đối chiếu BE thật (T-107/108/117) | (1) Nháp chọn "Khác" chưa có ghi chú → **không gửi** API-102 (server 422 sẽ không lưu gì cả, kể cả dòng) — báo "Nhập ghi chú khi chọn Khác." tại ô; (2) `REFERENCE` gửi `lines: []`; (3) mã lớn ở R2 = `return_case.return_tracking_number` nếu có, ngược lại mã kiện, kèm "Mã gốc …" khi khác; (4) `closed_session.tracking_number`, API-15, WS `SESSION_AUTO_CLOSED` / `SESSION_ABANDONED` mang **mã đã quét để mở** (`open_code` của BE) — FE hiện nguyên giá trị đó; (5) WS-01 `alert SESSION_WARN` (BE gửi, chưa có trong 02) → FE flush nháp (cảnh báo 20 phút vẫn tính theo `warn_at`); (6) API-102 lỗi sau 2 lần thử lại → nút "Chưa lưu được — thử lại" (bấm = gửi lại); `CONCLUSION_INCONSISTENT` → chữ khóa Nguyên vẹn tại khối Kết luận; (7) mock khớp BE: thứ tự API-11 RETURN (yêu cầu chờ → IGNORED; đang kiểm → mọi mã ngoài hồ sơ là `RETURN_CODE_DIFFERENT`, không `INVALID_CODE`; rảnh → `INVALID_CODE` nhận cả mã đơn sàn), mã đóng được = mã mở + mọi kiện (không phải kiện tạm) của hồ sơ + mã chiều về + mã đơn (`UNIDENTIFIED`: chỉ mã mở), API-102 `fields.lines` khi thiếu dòng, `lines.{i}.*` cho dòng lặp / `OTHER` thiếu ghi chú, `REFERENCE` vẫn ghi dòng gửi lên, chữ `NOT_SHIPPED` / `INVALID_CODE` / API-101 như BE | Khớp BE M7; không mất kết luận | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-324 | T-134: ảnh + tham chiếu đóng gói | (1) `SnapshotStrip` (shared) nhận chữ qua props (station / admin dùng chữ riêng); ảnh lỗi tải (URL ký hết hạn) → gọi lại API-10 **một lần mỗi phiên**; `url = ""` (BE khi station không có `account_user_id`) → ô "không có ảnh"; (2) ảnh mới từ API-103 thêm ngay vào `state.session.snapshots` (bỏ trùng theo `id` khi `station.state` WS tới sau); (3) `PackReferenceCard`: `pack_reference.snapshot = null` (J-17 chưa chụp xong / không có ảnh) → ô xám, vẫn xem clip; API-40 403 hiện "Không xem được clip lúc này." trong Dialog (`ClipPlayer.forbiddenText`) thay vì khóa nút trước (chỉ biết 403 khi gọi); (4) lỗi mạng API-103 → cùng toast Cam 1; (5) mock khớp BE: API-103 phiên PACK → `409 SESSION_NOT_OPEN`, `CAMERA_UNREACHABLE` có `details.reason`, response không có `status`; API-40 STATION xem mọi clip PACK của kiện / kiện cùng hồ sơ đang kiểm | Khớp BE T-109 | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-325 | T-135: R3 / R4 / API-105 | (1) R3 chỉ ở R1: state rời `READY` (quét HID mở phiên khi R3 đang mở — `captureInInputs` đưa mã vào API-11, không vào ô tìm) → R3 tự đóng; (2) R4 `RETURN_NOT_FOUND` có 2 nút → **không tự đóng**, thêm nút "Đóng" (lần quét kế cũng thay); các R4 khác tự đóng 8 giây; `RETURN_ALREADY_RECEIVED` bấm "Đây là kiện khác" → Dialog ghi chú tách khỏi overlay (không bị đóng theo 8 giây); (3) R3 hiện chip lý do khi `can_open = false` (`blocked_reason` → tiêu đề R4), không có ngày gửi (API-104 không trả); (4) **API-105 chưa có ở BE M7** (BE T-119, M8): "Mở phiên" từ R3, "Mở phiên chưa xác định", "Đây là kiện khác" chỉ chạy trên mock; BE thật trả 404/405 → toast `message` server; (5) S4 `ALREADY_HANDED_OVER` `is_return`: dòng "Đây là kiện hàng hoàn — nhận ở bàn nhận hoàn." chỉ thêm khi `message` server chưa nói; (6) mock API-104 khớp BE: kiểm `q` trước chế độ, không tìm theo mã `HH-`, mã yêu cầu sàn khớp chính xác, bỏ kiện tạm, `return_case` = hồ sơ mở hoặc gần nhất, `platform_checked` khi rỗng và `q` ≥ 8; kiện `NEW` có hồ sơ mở mở được | Theo BE M7; phần API-105 chờ M8 | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-326 | T-136: hardening S1 / S2 / S3 | (1) S3 nguồn `CAM2` giữ tiêu đề cũ "LỆCH MÃ — KHÔNG DÁN PHIẾU NÀY" + chữ "Bỏ phiếu … khỏi khay…"; nguồn `SCAN` dùng tiêu đề + hai khối mới (01 §10.4), mã in đủ (không rút gọn "SPX…789"); (2) S1 phiên có cả `LABEL_ON_TRAY` và `CAM2_UNVERIFIED` → một Alert ghép hai câu; (3) S2 banner dùng `Alert` `error` cỡ `headline-sm`, nút "Hủy phiên" chuyển `tonal`; âm lỗi 1 lần theo WS `ORDER_CANCELLED_DURING_SESSION` (không lặp); (4) mock PACK đóng phiên gắn cờ như BE `complete_session` (BR-18: Cam 2 chưa khớp / không đọc được → `CAM2_UNVERIFIED`, khay `MATCH` → `LABEL_ON_TRAY`) — mock mặc định không có khay nên mọi phiên đóng có thông báo "Cam 2 không xác minh" (đúng hành vi BE khi Cam 2 tắt) | Theo 01 §10.4; khớp BE T-117 | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-327 | T-137: test + lỗi E2E tìm ra | (1) R2 bố cục (sửa DEC-239): bỏ `sticky` (che bảng dòng ở 1366×768 — E2E mock không bấm được nút −), thay bằng vùng bảng dòng + "Lúc đóng gói" `flex-1` cuộn trong khung và khối Kết luận `shrink-0` luôn hiện dưới; (2) F2 bấm khi ảnh trước chưa xong → xếp hàng chụp lần lượt (trước: lần bấm bị bỏ — TC-04.40 bấm 3 lần chỉ ra 1 ảnh); (3) E2E: mock `e2e/mock/returns.spec.ts` (UC-02 + UC-14, R4 → R3, viewport 1366×768); BE thật `e2e/real/m7-return-uc02.spec.ts` (tên theo milestone thay `returns.spec.ts`, gate `E2E_M7_BE`) dùng kiện `SPXTST0000012` đã giao (seed hàng hoàn T-116 chưa có), không kiểm `claim_code` / API-105 (M8) | Lỗi thật thấy khi chạy E2E | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-328 | G3-F1 quét đóng R2 khi kết luận chưa lưu | Trước API-11 ở `INSPECTING` có nháp: flush và **chờ** kết quả (tối đa `FLUSH_WAIT_MS` 3 giây). Nếu nháp còn `dirty`, đang lưu, `saveStatus = error` (422 / 409 / lỗi mạng sau thử lại) hoặc "Khác" thiếu ghi chú → **không gửi API-11**: `inline = INSPECTION_UNSAVED` (khối Kết luận viền đỏ + "Kết luận chưa lưu được — sửa lỗi rồi quét lại mã để hoàn tất.", focus nút kết luận đầu; lỗi theo field của server ưu tiên) + âm lỗi 1 lần; sửa nháp hoặc lưu thành công thì xóa chữ. Áp cho **mọi** mã quét lúc đang kiểm (không chỉ mã đóng) — mã khác chỉ cho `RETURN_CODE_DIFFERENT` nên chặn không mất gì. Thay hành vi cũ "chờ 3 giây rồi vẫn gửi" (DEC-235): server đóng phiên bằng kết luận cũ = sai bằng chứng. Phía BE J-07 tự hoàn tất bằng kết luận đã lưu — người điều phối xử lý riêng | Không đóng phiên bằng kết luận cũ | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-329 | G3-F17 thử lại API-102 | Lỗi mạng / 5xx: thử lại sau 500 ms rồi 1500 ms (`SAVE_BACKOFF_MS`), hết lượt → "Chưa lưu được — thử lại" | Không dồn 3 request liền khi server quá tải | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-330 | G3-F18 / C-03 R3 `WRONG_WORK_MODE` | API-104 trả `409 WRONG_WORK_MODE` (quản lý vừa đổi chế độ station) → `load()` (API-10) + đóng R3, không hiện Alert lỗi. API-105 409 đã tải lại state (DEC-325) | State về đúng chế độ | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-331 | G3-F19 F2 | Bỏ qua `KeyboardEvent.repeat` (giữ phím không chụp hàng loạt); không chụp khi có `<dialog open>` bất kỳ (Hủy phiên, R3, R5, kiện khác, ảnh lớn, clip) — kiểm DOM thay vì liệt kê state từng Dialog | Tránh ảnh thừa / chụp sau lưng Dialog | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-332 | G3-F16 R5 bắt buộc + Chrome CloseWatcher | `Dialog` (shared) nghe sự kiện `close` của `<dialog>`: `dismissible = false` → `showModal()` lại ngay (Esc lần 2 của Chrome bỏ qua `cancel`); `dismissible = true` → `onClose()` để state khớp DOM. Test jsdom bắn `close`; E2E mock nhấn Esc 3 lần ở R5 | R5 không mất | khanhtt (FE, tự quyết theo ủy quyền user) |
