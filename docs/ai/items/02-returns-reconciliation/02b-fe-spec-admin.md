# FE Spec — 02 Hàng hoàn và đối soát · client: dashboard (web `/admin`)

| | |
|---|---|
| Tác giả | khanhtt (FE) |
| Reviewer | khanhtt (tech lead, review subagent ở bước 5) |
| Trạng thái | **Approved (G2 2026-10-05 có điều kiện, DEC-274)** · **v0.4** (lượt 3: R3-1, R3-9) · v0.2 (sửa review G2 lượt 1 — R-1, R-5, R-9, R-16, R-17, R-19, R-28, R-30; DEC-282) · **v0.3** (review G2 lượt 2: R2-4, R2-11 — DEC-264..273) |
| Tổng quan & contract | [02-tech-spec.md](02-tech-spec.md) · Màn: [01-srs.md §10.5](01-srs.md) (D14–D17 mới; D2, D3, D4, D6, D8, D13 mở rộng) · nền Phase 1 [item 01 02b-admin](../01-packing-mvp/02b-fe-spec-admin.md) · [Design system](../../../design-system/README.md) |
| Last update | 2026-10-05 · FE |

> **TL;DR** — 4 màn mới dưới `/admin`: D14 Hàng hoàn (`/admin/returns`), D15 Lệch trạng thái (`/admin/recon`), D16 / D17 Hồ sơ khiếu nại (`/admin/claims`, `/admin/claims/:id`); mở rộng D2, D3, D4 (khối Hàng hoàn, sửa kết luận, gắn đơn, điều chỉnh trạng thái, tạo hồ sơ, bỏ "Giữ clip"), D6 (loại station), D8 (sàn retention + xác nhận hạ + ngưỡng), D13 (Gọi quản lý từ phiên hoàn).
> Dữ liệu qua TanStack Query; WS-02 (`return.updated`, `recon.updated`, `claim.updated`, `evidence_pack.updated`) chỉ invalidate (DEC-20 item 01). Hồ sơ khiếu nại sửa bằng `version` (khóa lạc quan).
> Điểm khó: D17 (bằng chứng + trạng thái + gói zip bất đồng bộ + xung đột hai người sửa) và Dialog xác nhận hạ retention dùng số liệu server.
> 12 task T-151..T-162 (≈ 17,5 ngày công).

Không viết lại API — trỏ API-xx trong [02 §6](02-tech-spec.md#6-api-contract).

---

## 1. Phạm vi

| Goals (lát/spec này làm) | Non-goals (cố ý không làm — để đâu) |
|---|---|
| D14–D17 + mở rộng 6 màn theo 01 §10.5, guard theo ma trận 01 §5.10 | Gửi khiếu nại lên Shopee từ dashboard (02 Non-goals) |
| Không còn nút "Giữ clip" (FR-02.09); hiện "Đang được bảo vệ bởi KN-…" | Màn chi tiết hàng hoàn riêng — gộp vào D4 (DEC-216) |
| CSKH xem D15 chỉ đọc; xử lý chỉ ADMIN, SUPERVISOR | Báo cáo hàng hoàn / khiếu nại FR-09.02..04 → Phase 3 |
| Mọi danh sách có loading / empty / error / forbidden; dùng được từ 360px (bảng → card) | Thông báo ngoài dashboard (FR-06.04) |
| Badge drawer: Lệch (số HIGH đang mở), Hồ sơ (số sắp hết hạn) | Sửa kết luận phiên hoàn tại station (chỉ D4) |

| Màn / luồng | Route | FR / UC | REUSE / EXTEND / NEW |
|---|---|---|:---:|
| D14 Hàng hoàn | `/admin/returns?tab=&kind=&q=&from=&to=&page=` | FR-05.05, 05.11, 05.12, 04.13 / UC-05, UC-13 | NEW (`features/returns/ReturnsPage.tsx`) |
| D15 Lệch trạng thái | `/admin/recon?status=&severity=&rule=&from=&to=&page=` | FR-06.01..03, 05, 06 / UC-06 | NEW (`features/reconciliation/ReconPage.tsx`) |
| D16 Hồ sơ khiếu nại | `/admin/claims?status=&type=&counterparty=&owner=&due=&q=&page=` | FR-08.01, 08.03, 08.04 / UC-04 | NEW (`features/claims/ClaimsPage.tsx`) |
| D17 Chi tiết hồ sơ | `/admin/claims/:id` | FR-08.02..06 / UC-04, UC-12 | NEW (`features/claims/ClaimDetailPage.tsx`) |
| D2 Tổng quan | `/admin` | FR-09.01, 03.14, 08.04 | EXTEND `features/reports/DailyPage.tsx`, `KpiCard`, `AttentionList`, `StationStatusList` |
| D3 Tra cứu | `/admin/packages` | FR-07.01, 03.14 | EXTEND `PackagesPage.tsx`, `PackageFilters.tsx`, `filters.ts`, `PackageTable.tsx` |
| D4 Chi tiết đơn | `/admin/packages/:id` | FR-07.02, 04.11, 04.13, 06.05, 08.01, 02.09, 02.11 | EXTEND `PackageDetailPage.tsx`, `SessionPanel.tsx`; bỏ `HoldToggle.tsx` |
| D6 Station | `/admin/settings/stations/:id` | FR-01.01 | EXTEND `StationEditPage.tsx`, `StationsListPage.tsx` |
| D8 Lưu trữ và ngưỡng | `/admin/settings/storage` | FR-02.10, BR-12, 14, 27, DEC-214 | EXTEND `StoragePage.tsx`, `rules.ts` |
| D13 Yêu cầu duyệt | `/admin/approvals` | FR-03.12 | EXTEND `ApprovalCard.tsx`, `decision.ts` |

## 2. Điều hướng

```mermaid
flowchart LR
    D2[D2 Tổng quan] -->|thẻ Hoàn / Quá hạn| D14
    D2 -->|thẻ Lệch| D15
    D2 -->|thẻ Hồ sơ| D16
    D2 -->|thẻ Phiếu còn trên khay / Cam 2 không xác minh| D3
    D14 -->|dòng| D4
    D14 -->|Chỉ hoàn tiền: Tạo hồ sơ| D17
    D15 -->|link kiện| D4
    D15 -->|Xử lý: Tạo hồ sơ| D17
    D4 -->|Tạo hồ sơ / chip KN| D17
    D16 -->|dòng| D17
    D17 -->|link kiện| D4
```

Drawer (`features/shell/nav.ts`) thêm sau "Tra cứu đơn": "Hàng hoàn" (`assignment_return`, ADMIN/SUPERVISOR/CSKH), "Lệch trạng thái" (`rule`, ADMIN/SUPERVISOR/CSKH, `badge: "recon"`), "Hồ sơ khiếu nại" (`gavel`, ADMIN/SUPERVISOR/CSKH, `badge: "claims"`). Guard `RequireRole` như Phase 1; vai khác → D12.

## 3. Cây component

| Component | Mới / reuse (path) | Props / input chính | Ghi chú |
|---|---|---|---|
| `ReturnsPage` (D14) | NEW `features/returns/ReturnsPage.tsx` | URL params | `Tabs` có số (`tab_counts`), `ReturnFilters`, `ReturnTable` / card |
| `ReturnTable` | NEW | `items` | Cột 01 §10.5 D14; tab Chỉ hoàn tiền: nút "Tạo hồ sơ khiếu nại"; tab Chưa xác định: "Gắn đơn" (mở D4 + Dialog) |
| `ReturnCaseSection` | NEW `features/returns/ReturnCaseSection.tsx` | `returnCase`, `sessions`, `canLink`, `canCorrect` | Khối "Hàng hoàn" ở D4 |
| `InspectionView` | NEW `features/returns/InspectionView.tsx` | `inspection` | Bảng dòng chỉ đọc (`REFERENCE` → nhãn "Chỉ tham khảo") + kết luận + người kiểm + cờ "Tự đóng" + "Đã sửa {n} lần" mở lịch sử `corrections[]` (người, giờ, lý do, kết luận trước) |
| `CorrectInspectionDialog` | NEW `features/returns/CorrectInspectionDialog.tsx` | `session` | Dùng `src/shared/returns/inspection.ts` (BR-22 theo `lines_mode`) + `reason`; case một phiên: chữ "Áp cho cả {n} kiện của hồ sơ HH-…" |
| `LinkOrderDialog` | NEW `features/returns/LinkOrderDialog.tsx` | `returnCase` | Ô mã → API-30 xem trước (đơn > 1 kiện: chọn kiện bằng radio; đơn đã có hồ sơ hàng hoàn mở: chữ "Sẽ gộp vào HH-…") → API-112; `merged_claims` → toast "Đã gộp KN-… vào KN-…" |
| `ReconPage` (D15) | NEW `features/reconciliation/ReconPage.tsx` | URL params | `Tabs` trạng thái, lọc mức / quy tắc / ngày, bảng |
| `ResolveAlertDialog` | NEW `features/reconciliation/ResolveAlertDialog.tsx` | `alert` | `SegmentedButtons` 3 hành động; dùng `AdjustStatusForm`, `CreateClaimForm` |
| `AdjustStatusForm` | NEW `features/reconciliation/AdjustStatusForm.tsx` (dùng ở D4) | `packageId`, `allowedTargets`, `alertId?` | API-122 |
| `ClaimsPage` (D16) | NEW `features/claims/ClaimsPage.tsx` | URL params | Tab trạng thái (`status_counts`), lọc, bảng / card; "Tạo hồ sơ" |
| `CreateClaimDialog` | NEW `features/claims/CreateClaimDialog.tsx` | `packageId?`, `returnCaseId?`, `reconAlertId?`, `defaultType?` | API-131; `CLAIM_EXISTS` → nút "Mở hồ sơ" |
| `ClaimDetailPage` (D17) | NEW `features/claims/ClaimDetailPage.tsx` | `:id` | Header + `ClaimStatusStepper` + `ClaimInfoForm` + `EvidenceList` + `ClaimNotes` |
| `ClaimStatusStepper` | NEW | `status`, `allowedTransitions`, `onTransition` | Menu "Đổi trạng thái" + Dialog theo trạng thái đích (mã sàn / số tiền / lý do) |
| `EvidenceList` | NEW `features/claims/EvidenceList.tsx` | `evidence`, `otherSessions`, `missing`, `editable` | Bỏ / Thêm → API-134 (bỏ bằng chứng tự chọn → Dialog "Lý do bỏ" 5–500 bắt buộc — R-19); chọn phiên → `ClipPlayer` (REUSE `shared/media/ClipPlayer.tsx`) |
| `EvidencePackDialog` | NEW `features/claims/EvidencePackDialog.tsx` | `claimId` | API-136 → theo dõi API-137 / WS → tải API-138 (mẫu `ExportDialog` Phase 1) |
| `ClaimNotes` | NEW | `notes` | Dòng thời gian + ô thêm (API-135) |
| `SnapshotStrip` | REUSE `shared/media/SnapshotStrip.tsx` (từ 02b-station T-134) | `snapshots` | D4, D17 |
| `ProtectedChip` | NEW `features/orders/ProtectedChip.tsx` | `protection` (API-31) | Thay `HoldToggle` (xóa file). "Đang được giữ: hồ sơ khiếu nại KN-…" / "…: hàng hoàn HH-…" (link) / "…tới {until}" khi có hạn (hồ sơ "Chỉ hoàn tiền" 30 ngày; hồ sơ hàng hoàn đã nhận: 7 ngày sau khi nhận — DEC-268); không giữ → gợi ý "Muốn giữ clip? Tạo hồ sơ khiếu nại." (R-1) |
| `RetentionConfirmDialog` | NEW `features/settings/RetentionConfirmDialog.tsx` | `impact` (API-82 / `details.impact`) | 01 §10.5 D8 chữ |
| `KpiCard`, `AttentionList` | EXTEND | kind mới (gồm `RETURN_SESSION_ABANDONED`, `RETURN_FORCE_NEW` → D14 tab Chưa xác định) | D2; thẻ "Hoàn đã nhận" không đếm kiện tạm, thêm số `returns_unidentified` (v0.4) |
| `PackageTable` | EXTEND | `is_placeholder` | Chip "Kiện tạm" cho kiện của hàng hoàn chưa xác định |
| `NavBadge` | EXTEND `ApprovalBadge` → `NavBadge` | `kind: approvals \| recon \| claims` | Số từ API-32 (`recon_open.HIGH`, `claims_due_soon`) |

## 4. State & data fetching

| Dữ liệu | Nguồn (API-xx) | Nơi giữ state | Cache & làm mới | Optimistic? |
|---|---|---|---|:---:|
| Danh sách hàng hoàn | API-110 | Query `['returns', params]` | `keepPreviousData`; WS `return.updated` → invalidate `['returns']` (≤ 1 lần / 2 giây) | ✗ |
| Chi tiết kiện (gồm hàng hoàn, cảnh báo, hồ sơ) | API-31 | Query `['package', id]` (Phase 1) | WS `return.updated`, `recon.updated`, `claim.updated` → invalidate khi liên quan; sau API-112/113/122/131 | ✗ |
| Cảnh báo lệch | API-120 | Query `['recon', params]` | WS `recon.updated` → invalidate; poll 60 giây dự phòng (như approvals Phase 1) | ✗ |
| Danh sách hồ sơ | API-130 | Query `['claims', params]` | WS `claim.updated` → invalidate | ✗ |
| Chi tiết hồ sơ | API-132 | Query `['claim', id]` | WS `claim.updated` cùng id + `version` khác → invalidate + toast "Hồ sơ vừa được cập nhật." (nếu không phải do chính mình) | ✗ — PATCH chờ server (cần `version`) |
| Gói bằng chứng | API-136 → API-137 | `useEvidencePack(packId)` (Query poll 2 giây khi `QUEUED`/`RUNNING`) | WS `evidence_pack.updated` → `setQueryData` | — |
| Badge drawer | API-32 (`counts.recon_open.HIGH`, `claims_due_soon`) | Query `['daily', today]` (Phase 1) | WS `report.updated` (đã có, throttle 2 giây) | — |
| Cài đặt + tác động hạ | API-80, API-82 | Query `['settings']`; mutation PUT; API-82 gọi khi mở Dialog (không cache) | — | ✗ |
| Ảnh | URL ký trong API-31 / 132 | trong dữ liệu query | `<img onError>` (403) → invalidate query nguồn một lần | — |

`useDashboardSocket` (Phase 1, `features/shell/`) thêm 4 loại sự kiện; lần `open` thứ 2 trở đi invalidate thêm `['returns']`, `['recon']`, `['claims']` (như DEC-174 item 01).

## 5. Form & validate

| Form | Field | Rule client | Lỗi server map vào field |
|---|---|---|---|
| D4 Gắn đơn | `code` | trim, upper, ≥ 6; xem trước bằng API-30 (`q`) — 0 kết quả → "Không tìm thấy đơn." | `PACKAGE_ALREADY_RETURNED`, `NOT_ELIGIBLE`, `NOT_UNIDENTIFIED` → Alert `message` |
| D4 Sửa kết luận | dòng, `conclusion`, `note`, `reason` | BR-22 (`canBeOk`); `reason` 5–500 bắt buộc | `VALIDATION_ERROR.fields.*`, `CONCLUSION_INCONSISTENT`, `CORRECTION_WINDOW_EXPIRED` |
| D4 / D15 Điều chỉnh trạng thái | `to_status` (chỉ `allowed_status_targets`), `reason` 5–500 | bắt buộc | `TRANSITION_NOT_ALLOWED` → tải lại, cập nhật danh sách; `SESSION_ACTIVE` → Alert |
| D15 Đánh dấu đã xử lý | `note` 1–500 | bắt buộc | `ALREADY_RESOLVED` → Alert theo `details` |
| Tạo hồ sơ | `type`, `counterparty`, `note` ≤ 1000 | type mặc định theo ngữ cảnh (kết luận / "Khách báo thiếu / sai" ở D4 / "Thất lạc" + ĐVVC ở D15 BR-12, 19) | `CLAIM_EXISTS` → Alert + "Mở hồ sơ" |
| D17 Đổi trạng thái | `platform_claim_ref` 1–64 (SUBMITTED, hoặc `reason`), `recovered_amount` số nguyên ≥ 0 đ (WON), `reason` 5–500 (CLOSED sớm) | theo trạng thái đích | `VALIDATION_ERROR.fields`, `INVALID_TRANSITION`, `VERSION_CONFLICT` |
| D17 Phụ trách / hạn | `owner_user_id` (danh sách từ API-90 lọc vai, chỉ ADMIN đọc được → CSKH / SUPERVISOR chỉ "Nhận phụ trách" = chính mình), `deadline_at` (ngày giờ VN → `Z`) | — | như trên |
| D17 Ghi chú | `text` 1–1000 | bắt buộc | `fields.text` |
| D8 Ngưỡng | 6 trường số theo 02 API-80; `retention_clip_days ≥ retention_clip_min_days` | khoảng 1–60 / 1–168 / 1–90 / 1–168 / 1–1440; `return_abandon > return_warn` | `RETENTION_BELOW_MINIMUM` → lỗi dưới ô; `RETENTION_REDUCTION_UNCONFIRMED` → mở `RetentionConfirmDialog` với `details.impact` → "Giảm và lưu" gửi lại `confirm_reduction: true` |
| D6 Loại station | `kind` | bắt buộc | `STATION_BUSY` → "Station đang có phiên mở. Thử lại khi station rảnh." |

## 6. Trạng thái UI

| Màn | Loading | Empty | Error | Forbidden | Success |
|---|---|---|---|---|---|
| D14 | Skeleton 8 dòng; tab giữ số cũ | Theo tab (01 §10.5 D14) + "Xóa bộ lọc" khi đang lọc | Alert + "Thử lại" | D12 (STATION) | Bảng / card |
| D15 | Skeleton | "Không có lệch trạng thái nào đang mở." | Alert + "Thử lại" | D12 | Bảng; CSKH không có nút Xử lý |
| D15 Dialog | Nút xoay | — | Alert trong Dialog (`ALREADY_RESOLVED` khóa nút) | — | Toast "Đã xử lý cảnh báo." + dòng chuyển tab |
| D16 | Skeleton | "Chưa có hồ sơ khiếu nại." + "Tạo hồ sơ" | Alert + "Thử lại" | D12 | Bảng; hạn đỏ ≤ 48 giờ, "Quá hạn" |
| D17 | Skeleton header + 3 khối | Bằng chứng rỗng: "Hồ sơ chưa có bằng chứng." + "Thêm phiên" | 404 → EmptyState "Không tìm thấy hồ sơ." + về D16; lỗi khác Alert | D12 | Hồ sơ `CLOSED` → chỉ xem (trừ ghi chú, xuất gói) |
| D17 gói zip | `LinearProgress` % | — | `FAILED` → Alert + "Thử lại"; `PACK_IN_PROGRESS` → theo dõi gói đang chạy | — | "Tải gói bằng chứng (.zip)" + hạn 24 giờ |
| D4 khối Hàng hoàn | Trong skeleton D4 | Không có hồ sơ hàng hoàn → không hiện khối | — | — | Khối + nút theo quyền |
| D8 Dialog xác nhận | LinearProgress khi gọi API-82 | — | API-82 lỗi → "Không tính được số clip bị ảnh hưởng. Thử lại." (khóa "Giảm và lưu") | — | Toast "Đã lưu cài đặt." |
| D2 thẻ mới | Như Phase 1 | 0 | Như Phase 1 | — | Bấm → màn lọc sẵn |

## 7. Phân quyền trên UI

| Hành động / màn | Role thấy | Cách xử lý khi không quyền |
|---|---|---|
| D14, D16, D17, D4 khối Hàng hoàn | ADMIN, SUPERVISOR, CSKH | Ẩn drawer; route → D12 |
| D15 xem | ADMIN, SUPERVISOR, CSKH | — |
| D15 "Xử lý", D4 "Điều chỉnh trạng thái", "Gắn đơn", "Sửa kết luận" | ADMIN, SUPERVISOR (`permissions`: `recon.resolve`, `warehouse_status.adjust`, `returns.link`, `inspection.correct`) | Ẩn nút; server 403 → toast "Tài khoản không có quyền…" |
| Tạo / sửa hồ sơ, xuất gói | ADMIN, SUPERVISOR, CSKH (`claims.manage`) | — |
| Chọn người phụ trách khác | ADMIN (đọc được API-90) | SUPERVISOR / CSKH chỉ "Nhận phụ trách" |
| D8 sửa | ADMIN | SUPERVISOR xem, form khóa (như Phase 1) |
| "Giữ clip" | Không còn trên UI (API-42 chỉ ADMIN, dùng khẩn cấp qua API) | — |

## 8. Xử lý lỗi API

| Mã lỗi (từ 02) | Hiển thị | Hành động (retry / về trang / đăng nhập lại) |
|---|---|---|
| `CLAIM_EXISTS` | Alert "Kiện này đã có hồ sơ … đang mở: KN-…" | Nút "Mở hồ sơ" → D17 `details.claim_id` |
| `VERSION_CONFLICT` | Toast "Hồ sơ vừa được {người} cập nhật. Đã tải lại." | `setQueryData(details.current)`; giữ form mở với giá trị người dùng nhập |
| `INVALID_TRANSITION`, `CLAIM_CLOSED` | Alert `message` | Invalidate `['claim', id]` |
| `PACK_IN_PROGRESS` | — | Theo dõi `details.pack_id` |
| `NO_EVIDENCE` | Alert "Hồ sơ chưa có bằng chứng." | — |
| `ALREADY_RESOLVED` | "Cảnh báo này đã được {resolved_by} xử lý lúc {giờ}." / "…đã tự hết lúc {giờ}." | Invalidate `['recon']` |
| `TRANSITION_NOT_ALLOWED` | Alert + danh sách mới từ `details.allowed` | Invalidate `['package', id]` |
| `RECON_IN_PROGRESS` | Toast "Đối soát đang chạy." | — |
| `NOT_UNIDENTIFIED`, `PACKAGE_ALREADY_RETURNED`, `NOT_ELIGIBLE` | Alert `message` | Invalidate |
| `CORRECTION_WINDOW_EXPIRED` | "Đã quá 7 ngày, không sửa được." | Ẩn nút |
| `RETENTION_BELOW_MINIMUM` | Lỗi dưới ô "Số ngày giữ clip không được thấp hơn {min}." | — |
| `RETENTION_REDUCTION_UNCONFIRMED` | `RetentionConfirmDialog` | Gửi lại có `confirm_reduction` |
| `STATION_BUSY` | Alert dưới form D6 | — |
| `SNAPSHOT_DELETED` (410 ở `<img>`) | Ô "Ảnh đã bị xóa" | — |
| 403 FORBIDDEN (API-42 với SUPERVISOR/CSKH nếu client cũ còn gọi) | Toast | Bỏ nút (đã gỡ) |
| Lỗi chung | Như Phase 1 | Như Phase 1 |

## 9. Nội dung chữ · i18n · a11y · responsive

- Chữ trong `copy.ts` từng feature (`returns/copy.ts`, `reconciliation/copy.ts`, `claims/copy.ts`) — nguyên văn 01 §10.5; nhãn enum (loại hoàn, trạng thái hồ sơ hàng hoàn, kết luận, quy tắc, mức, loại / trạng thái / bên nhận hồ sơ, `warehouse_status` mới) trong `src/shared/returns/labels.ts` + `src/lib/labels.ts` (Phase 1). Quy tắc hiện chữ có số cấu hình ("quá {N} ngày") lấy N từ API-80.
- Tiền VND: `Intl.NumberFormat('vi-VN')` + "đ"; giờ: `dd/MM/yyyy HH:mm` giờ Việt Nam; hạn "còn 2 ngày" / "Quá hạn 5 giờ".
- a11y: `ClaimStatusStepper` dùng `ol` có `aria-current="step"`; Dialog bẫy focus (component Phase 1); badge drawer như DEC-174 item 01 (`sr-only`); bảng có `caption` ẩn.
- Responsive: < 840px bảng D14 / D15 / D16 thành card; D17 bố cục 1 cột (bằng chứng trước, ghi chú sau); không cuộn ngang ở 360px.

## 10. Riêng nền tảng

Web: Chromium ≥ 120, Safari ≥ 17, Firefox ≥ 120 (như Phase 1). Tải zip bằng link ký (`<a download>`), không qua `api.blob` (file có thể > 100 MB). Mỗi feature mới lazy-load theo route; D2 bundle vẫn ≤ 300 KB gzip.

## 11. Analytics & theo dõi lỗi

N/A — như Phase 1 (DEC-23 item 01).

## 12. Mock khi BE chưa xong

- Handler MSW mới: `src/mocks/handlers/{returns,recon,claims}.ts`; mở rộng `packages.ts` (API-30/31 mở rộng, API-122), `reports.ts` (API-32 counts / attention), `settings.ts` (API-80 409 / 422, API-82), `stations.ts` (`kind`, `STATION_BUSY`), `approvals.ts` (`session_type`), `clips.ts` (API-42 403 khi không phải ADMIN).
- Dữ liệu: `src/mocks/returnsDb.ts` (dùng chung station) — 6 hồ sơ hàng hoàn mỗi loại / trạng thái, 7 cảnh báo (mỗi quy tắc), 5 hồ sơ khiếu nại (đủ trạng thái, 1 `LEGACY_HOLD`, 1 sắp hết hạn); gói zip mock chạy tiến độ 0 → 100 trong 4 giây rồi trả file nhỏ `public/mock/KN-000124.zip`. WS mock (`src/mocks/ws.ts`) phát 4 sự kiện mới.

## 13. Test FE

| Mức | Phạm vi | Case chính (TC-xx) |
|---|---|---|
| Unit | `filters` URL D14 / D15 / D16 (parse / serialize), `labels`, tính hạn ("còn / quá"), `allowedTransitions` hiển thị, BR-22 dùng chung | AC-27, AC-37 |
| Component | `ResolveAlertDialog` (3 hành động, xung đột), `ClaimStatusStepper` (Dialog theo đích, bắt buộc trường), `EvidenceList` (bỏ / thêm, phiên thiếu clip), `RetentionConfirmDialog`, `ProtectedChip`, `CorrectInspectionDialog` | AC-26, AC-28 |
| Integration (MSW) | D14 tab + lọc → D4 khối hàng hoàn → Gắn đơn; D15 xử lý + `ALREADY_RESOLVED`; D17 đi đủ trạng thái + `VERSION_CONFLICT` + gói zip; D8 hạ retention → 409 → xác nhận; quyền 3 vai (CSKH không thấy nút Xử lý) | AC-25, 27, 28, 35, 37 |
| E2E mock | `e2e/mock/claims.spec.ts`, `recon.spec.ts`, `returns.spec.ts` | UC-04, UC-06, UC-13 |
| E2E BE thật | `e2e/real/claims.spec.ts`: sau E2E station UC-02 → D16 có hồ sơ → D17 xuất gói → tải zip, kiểm có `ho-so.json`; `recon.spec.ts` với `POST /recon/run` + dữ liệu `seed-demo` | AC-06, 07, 25, 27 |

## 14. Task

| # | Việc | Màn / FR | Phụ thuộc (API-xx) | Ước lượng |
|---|---|---|---|---|
| T-151 | API client `lib/api/{returns,recon,claims}.ts` + mở rộng `packages.ts`, `reports.ts`, `settings.ts`, `stations.ts`, `approvals.ts`, `clips.ts`; `src/shared/returns/labels.ts`; MSW handlers + `returnsDb.ts` | nền | 02 §6 (mock) | 2 |
| T-152 | Route + drawer + `NavBadge` (recon, claims) + `useDashboardSocket` 4 sự kiện mới | nav / FR-10.02 | API-32, WS-02 | 1 |
| T-153 | D14 Hàng hoàn: tab (số), lọc URL, bảng / card, hành động theo tab | D14 / FR-05.05, 05.11, 05.12 | API-110 | 1,5 |
| T-154 | D4 mở rộng hiển thị: `ReturnCaseSection`, `InspectionView` (lịch sử sửa), ảnh + ảnh lúc đóng gói (`SnapshotStrip`), cảnh báo của kiện, chip hồ sơ, `ProtectedChip` (`protection`) thay `HoldToggle`, phiên có chip "Mở hoàn"; `CreateClaimDialog` | D4 / FR-07.02, 02.06, 02.09, 02.11, 08.01 | API-31, 131; **T-134** (`SnapshotStrip` của 02b-station) | 2 |
| T-155 | D4 hành động: `LinkOrderDialog` (API-30 xem trước + API-112), `CorrectInspectionDialog` (API-113), `AdjustStatusForm` (API-122) | D4 / FR-04.11, 04.13, 06.05 | API-30, 112, 113, 122 | 1,5 |
| T-156 | D15 Lệch trạng thái + `ResolveAlertDialog` (resolve / điều chỉnh / tạo hồ sơ) | D15 / FR-06.01..03, 05 | API-120, 121, 122, 131 | 1,5 |
| T-157 | D16 danh sách hồ sơ (tab số, lọc, "Của tôi", sắp hết hạn) + "Tạo hồ sơ" | D16 / FR-08.01, 08.03, 08.04 | API-130, 131 | 1 |
| T-158 | D17 chi tiết: header, `ClaimStatusStepper` + Dialog, phụ trách / hạn / mã sàn, `EvidenceList` (API-134, `ClipPlayer`), `ClaimNotes`, `VERSION_CONFLICT` | D17 / FR-08.02, 08.03, 08.06 | API-132..135 | 2 |
| T-159 | `EvidencePackDialog`: tạo, tiến độ (poll + WS), tải, lỗi | D17 / FR-08.05 | API-136..138 | 1 |
| T-160 | D2 thẻ + attention mới; D3 lọc hoàn / loại phiên / cờ + chip; D6 loại station; D13 thẻ phiên hoàn (action CONTINUE / CANCEL_SESSION) | D2, D3, D6, D13 / FR-09.01, 07.01, 01.01, 03.14 | API-32, 30, 60, 20, 21 | 1,5 |
| T-161 | D8: 6 ngưỡng, chữ sàn tối thiểu, `RetentionConfirmDialog` (API-82 + 409) | D8 / FR-02.10 | API-80, 82 | 1 |
| T-162 | Test component / integration, E2E mock 3 bộ, E2E BE thật hồ sơ + đối soát | — | BE T-110..T-115 cho E2E thật | 1,5 |

Tổng ≈ 17,5 ngày công.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Chọn? (lý do) |
|---|---|---|---|
| Feature mới `features/returns/`, `reconciliation/`, `claims/` (architecture §5.1) | Đúng bố cục đã chốt; lazy-load riêng | Thêm thư mục | ✔ (DEC-240) |
| Gộp vào `features/orders/` | Ít thư mục | `orders` phình, khó lazy-load | ✗ |
| PATCH hồ sơ chờ server (không optimistic) + `version` | Không hiện trạng thái sai khi hai người sửa | Chậm hơn ~200 ms | ✔ (DEC-241) |
| Optimistic update hồ sơ | Nhanh | Rollback phức tạp với `VERSION_CONFLICT` | ✗ |
| Badge drawer lấy từ API-32 đã có | Không thêm request; realtime qua `report.updated` | Badge chỉ cập nhật theo nhịp D2 (≤ 2 giây) | ✔ (DEC-243) |
| Query riêng API-120 / 130 cho badge | Số chính xác tức thì | Thêm 2 request mỗi trang | ✗ |
| Xóa `HoldToggle`, thay `ProtectedChip` | Đúng FR-02.09, ADR-009 | CSKH mất nút quen thuộc → hướng dẫn "Tạo hồ sơ khiếu nại" | ✔ (DEC-242) |

## Rủi ro & câu hỏi mở

| ID | Rủi ro / câu hỏi | Ảnh hưởng | Giảm thiểu / ai trả lời | Hạn |
|---|---|---|---|---|
| RF-21 | D17 nhiều khối, dễ rối với CSKH | Dùng sai trạng thái | Chỉ hiện bước hợp lệ (`allowed_transitions`); chữ hướng dẫn trong Dialog | T-158 |
| RF-22 | Zip lớn (2 phiên × 3 phút × 2 camera + MP4 ghép ≈ 150 MB) tải chậm qua LAN yếu | Tải lâu | Hiện dung lượng trước khi tải; link 10 phút gọi lại API-137 khi hết hạn | T-159 |
| RF-23 | CSKH quen nút "Giữ clip" | Không biết cách bảo vệ clip | D4 chữ gợi ý cạnh danh sách phiên: "Muốn giữ clip? Tạo hồ sơ khiếu nại."; tài liệu nghiệp vụ lát | T-154 |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-240 | Vị trí code màn mới | `features/returns/`, `features/reconciliation/`, `features/claims/`; logic dùng chung `src/shared/returns/` | Theo architecture §5.1; lazy-load theo route | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-241 | Cập nhật hồ sơ khiếu nại | Chờ server + `version`; `VERSION_CONFLICT` → thay dữ liệu, giữ giá trị đang nhập | Hai CSKH có thể cùng mở hồ sơ | khanhtt (tự quyết) |
| DEC-242 | Nút "Giữ clip" ở D4 | Gỡ; thay `ProtectedChip` + gợi ý "Tạo hồ sơ khiếu nại" | FR-02.09, ADR-009; API-42 chỉ ADMIN | khanhtt (tự quyết) |
| DEC-282 | Review G2 lượt 1 phần dashboard (đổi số từ DEC-244 — trùng 01, R2-11) | `ProtectedChip` theo `protection` (hồ sơ khiếu nại + hàng hoàn), chọn kiện + gộp khi gắn đơn, lý do khi bỏ bằng chứng tự chọn, lịch sử sửa kết luận, `lines_mode`, chip kiện tạm, attention phiên hoàn bỏ dở; T-154 phụ thuộc T-134 | Theo 02 §6.3 | khanhtt (FE, tự quyết theo ủy quyền user) |
| DEC-243 | Nguồn số cho badge drawer | API-32 (`recon_open.HIGH`, `claims_due_soon`) qua query `['daily', today]` sẵn có | Không thêm request; đã realtime | khanhtt (tự quyết) |
