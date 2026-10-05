# FE Spec — 01 MVP đóng gói · client: station (kiosk web)

| | |
|---|---|
| Tác giả | khanhtt (FE) |
| Reviewer | khanhtt (tech lead, review qua subagent ở bước 5) |
| Trạng thái | Approved (G2 2026-10-04, có điều kiện DEC-33) |
| Tổng quan & contract | [02-tech-spec.md](02-tech-spec.md) · Màn: [01-srs.md §10.4](01-srs.md) (S0–S6) · [Design system](../../../design-system/README.md) mục Station kiosk |
| Last update | 2026-10-05 · FE (chuẩn hoá template 2026-10-05: Goals/Non-goals, Phương án, Rủi ro) |

> **TL;DR** — Route `/station` trong app `ai-cam-fe`: 7 màn S0–S6 render từ **một** state server (`station.state`, API-10 / WS-01). FE không tự suy luận phiên.
> Mọi thao tác bằng máy quét: `ScanListener` gom phím HID → API-11 (kèm `client_scan_id`) → `outcome` quyết định màn + âm thanh.
> File này cũng chứa **nền FE dùng chung** cho cả hai client (khung repo, token, `shared/ui`, API client, auth) — DEC-16.
> Điểm khó: phân biệt quét với gõ tay, giữ phản hồi ≤ 1 giây, xử lý mất WS (S6) không mất lần quét.

Không viết lại API — trỏ API-xx trong [02 §6](02-tech-spec.md#6-api-contract).

---

## 1. Phạm vi

| Goals (lát/spec này làm) | Non-goals (cố ý không làm — để đâu) |
|---|---|
| 7 màn S0–S6 trên `/station`, render từ **một** state server (API-10 / WS-01) | FE tự suy luận trạng thái phiên — server quyết (DEC-18) |
| Quét → đổi màn + âm thanh ≤ 1 giây p95 (NFR-01) | Duyệt yêu cầu trên station — duyệt ở dashboard D13 (DEC-5, [02b-admin](02b-fe-spec-admin.md)) |
| Không mất lần quét khi mạng chập chờn: retry cùng `client_scan_id`, S6 khi mất WS > 5 giây (NFR-09) | Mobile, Safari, Firefox cho station — chỉ Chromium ≥ 120 kiosk, 1920×1080 / 1366×768 |
| Nền FE dùng chung cho cả hai client: khung repo, tokens, `shared/ui`, API client, auth, WS client (T-30..T-33, DEC-16) | Đa ngôn ngữ / thư viện i18n (DEC-17) |
| Bundle `/station` ≤ 250 KB gzip, chạy offline trong LAN | Gửi lỗi JS về BE (DEC-23 → Phase 3); màn mở hàng hoàn (M04 → Phase 2) |

| Màn / luồng | Route | FR / UC | REUSE / EXTEND / NEW |
|---|---|---|:---:|
| S0 Đăng nhập station | `/station/login` | FR-03.01 | NEW (dùng `AuthCard`, `TextField`, `Button`) |
| S1 Sẵn sàng (+ phiên gần đây, xem clip) | `/station` (state `READY`) | FR-03.02, 03.11, FR-01.02 | NEW |
| S2 Đang đóng gói | `/station` (`PACKING`) | FR-03.03, 03.06, 03.08, BR-16 | NEW |
| S3 Lệch mã | `/station` (`MISMATCH`) | FR-03.05, 03.07 | NEW |
| S4 Cảnh báo | `/station` (overlay sau `outcome=ALERT`) | BR-01, 03, 04, FR-01.03 | NEW |
| S5 Chờ quản lý duyệt | `/station` (`WAITING_APPROVAL`) | FR-03.10, 03.12 | NEW |
| S6 Mất kết nối server | overlay toàn màn | NFR-09 | NEW |
| Nền dùng chung (cả admin dùng) | — | — | NEW: khung Vite, Tailwind + tokens, `shared/ui` theo design system, API client sinh từ OpenAPI, auth, WS client |

Không có REUSE từ code (repo trống, 2026-10-04). Component UI REUSE theo API `docs/design-system/components/index.d.ts`.

## 2. Điều hướng

```mermaid
flowchart LR
    L["/station/login (S0)"] -->|API-01 client=STATION ok| M["/station"]
    M -->|state READY| S1
    M -->|PACKING| S2
    M -->|MISMATCH| S3
    M -->|WAITING_APPROVAL| S5
    M -.->|outcome ALERT, 5 giây| S4 -.-> M
    M -.->|WS mất > 5 giây| S6 -.->|nối lại| M
    M -->|401 sau refresh / Đăng xuất| L
```

Guard: `/station/*` yêu cầu `role = STATION` (từ API-04). Tài khoản khác vào `/station` → chuyển `/admin`. Chưa đăng nhập → `/station/login`. Màn S1..S5 **không phải route riêng**: một trang `StationPage` chọn panel theo `state` (tránh lệch giữa URL và trạng thái server).

## 3. Cây component

| Component | Mới / reuse (path) | Props / input chính | Ghi chú |
|---|---|---|---|
| `Button`, `IconButton`, `TextField`, `StatusChip`, `Alert`, `Dialog`, `AuthCard`, `Icon`, `EmptyState`, `Tabs` | NEW theo design system → `src/shared/ui/*` | như `index.d.ts` | Dùng chung với admin |
| `StationPage` | NEW `src/features/station/StationPage.tsx` | — | Mount `ScanListener`, `useStationSocket`; chọn panel |
| `StationStatusBar` | NEW `features/station/StationStatusBar.tsx` | `station`, `cameras`, `wsStatus`, `serverTime` | Đồng hồ chạy theo `server_time` + offset |
| `StationStatePanel` | NEW `features/station/StationStatePanel.tsx` | `tone` (`success`/`primary`/`warning`/`error`), `icon`, `title`, children | Nền `-container` theo tone, chữ `on-…-container` |
| `ReadyPanel` (S1) | NEW | `todayCount`, `recent` | Bảng phiên gần đây + nút Xem |
| `PackingPanel` (S2) | NEW | `session`, `tray` | `TrackingNumber`, `ItemList`, `TrayChip`, `SessionTimer` |
| `MismatchPanel` (S3) | NEW | `session.mismatch` | `CodeDiff` in đậm ký tự khác |
| `AlertOverlay` (S4) | NEW | `alert` (02 API-11) | Tự đóng 5 giây; `ALREADY_PACKED` có nút "Yêu cầu đóng gói lại" |
| `WaitingApprovalPanel` (S5) | NEW | `state.approval_request` (cấp gốc API-10, có cả khi `session = null`) | Đồng hồ chờ, lý do theo `type` (MISMATCH / ASSIST / REPACK), nút "Rút yêu cầu" → API-14 |
| `DisconnectedOverlay` (S6) | NEW | `since` | |
| `CancelSessionDialog` | NEW | `onConfirm(reason, note)` | Lý do: Hết hàng / Quét nhầm / Khác |
| `ClipPreviewDialog` | NEW `shared/media/ClipPlayer.tsx` (dùng chung admin) | `clipIds` | `Tabs` Cam 1 / Cam 2 + `<video preload="none">` |
| `ScanListener` | NEW `shared/scan/useScanListener.ts` | `onScan(code)`, `enabled` | Dùng chung ô tìm kiếm D3 |
| `SoundPlayer` | NEW `features/station/sound.ts` | `play('ok' \| 'warn' \| 'error', {loop})` | Web Audio, preload 3 file |
| `TrackingNumber` | NEW `shared/ui/TrackingNumber.tsx` | `value`, `size`, `copy?` | Mono; station không có nút Copy |

## 4. State & data fetching

| Dữ liệu | Nguồn | Nơi giữ state | Cache & làm mới | Optimistic? |
|---|---|---|---|:---:|
| Phiên đăng nhập | API-01, 02 (`client: STATION`), 04 | `authStore` (Zustand): access token trong bộ nhớ; refresh cookie | Refresh khi 401 (một lần, khóa đơn luồng); khởi động gọi API-02 | ✗ |
| Trạng thái station | API-10, WS-01 `station.state`, response API-11/12/13/14 | `stationStore` (Zustand) — **một nguồn duy nhất**: thay toàn bộ object mỗi khi nhận | Gọi API-10 khi mount, khi WS nối lại, khi nhận 409 | ✗ (chờ server, ≤ 1 giây) |
| Cảnh báo S4 | `alert` trong response API-11 | `stationStore.alert` + timer 5 giây | Xóa khi hết giờ / lần quét kế | ✗ |
| Phiên gần đây | API-15 | TanStack Query `['station','recent']` | Invalidate khi `SESSION_COMPLETED`, `session.clip_ready` | ✗ |
| URL clip | API-40 | Query `['clip-url', id]` `staleTime` 8 phút | Lỗi `SIGNATURE_INVALID` → refetch 1 lần | ✗ |
| Đồng hồ | `server_time` | `clockOffset` trong store | Cập nhật mỗi lần nhận state | — |
| Trạng thái WS | WebSocket | `wsStatus`: `connecting`/`open`/`lost` | Backoff 1, 2, 4, 8 giây (tối đa 8) | — |

**Hàng đợi quét:** khi một API-11 đang chờ, lần quét tiếp theo được xếp hàng (tối đa 1) và gửi sau khi có response — giữ đúng thứ tự mở → đóng. Lỗi mạng: retry 2 lần với **cùng** `client_scan_id` (BE dedup), sau đó S6.

## 5. Form & validate

| Form | Field | Rule client | Lỗi server map vào field |
|---|---|---|---|
| S0 đăng nhập | `username` | bắt buộc, trim | `INVALID_CREDENTIALS` → Alert form; `WRONG_CLIENT` → Alert câu hướng dẫn; `ACCOUNT_DISABLED`, `ACCOUNT_LOCKED` (giờ mở khóa từ `details.until`), `STATION_INACTIVE`, `RATE_LIMITED` → Alert |
| | `password` | bắt buộc | |
| Hủy phiên (Dialog) | `reason` | bắt buộc | `VALIDATION_ERROR.details.fields.note` → lỗi dưới ô ghi chú |
| | `note` | bắt buộc khi `OTHER`, ≤ 200 | |
| Quét | `code` | trim, upper; bỏ qua < 4 ký tự (nhiễu); không kiểm regex (server làm — `INVALID_CODE`) | — |

## 6. Trạng thái UI

| Màn | Loading | Empty | Error | Forbidden | Success |
|---|---|---|---|---|---|
| S0 | Nút xoay, khóa ô | — | Alert lỗi dưới form | — | Vào `/station` |
| `/station` khởi động | Toàn màn `surface`, icon `qr_code_scanner` mờ, "Đang tải trạng thái station…" | — | API-10 lỗi → S6 | role ≠ STATION → `/admin` | Panel theo state |
| S1 phiên gần đây | 5 dòng skeleton | "Chưa có phiên nào hôm nay." | Ẩn khối, giữ S1 | — | Bảng |
| S1/S2 khi chờ API-11 | Thanh mảnh `LinearProgress` không giá trị trên đỉnh panel (không đổi nền) | — | Retry → S6 | 403 → S0 | Đổi panel + âm |
| ClipPreviewDialog | Spinner trong khung 16:9 | — | `CLIP_NOT_READY` → "Clip đang được cắt…"; `CLIP_DELETED` → thông báo đã xóa | — | Phát video |
| Camera offline | Chip đỏ + Alert trong S1 / chip đỏ trên S2 (không chặn); phát âm `warn` một lần khi `cameras[].status` đổi sang OFFLINE (FR-01.03) | | | | |

## 7. Phân quyền trên UI

| Hành động / màn | Role thấy | Cách xử lý khi không quyền |
|---|---|---|
| `/station/*` | STATION | Chuyển `/admin` (server vẫn trả 403 cho API station) |
| Xem clip phiên gần đây | STATION, chỉ phiên station mình trong ngày | Danh sách đã lọc ở API-15; API-40 403 → ẩn nút |
| Đăng xuất station | STATION (giữ nút 3 giây) | — |
| Duyệt | Không có ở station (DEC-5) | — |

## 8. Xử lý lỗi API

| Mã lỗi (từ 02) | Hiển thị | Hành động |
|---|---|---|
| `outcome = ALERT` + `ORDER_CANCELLED`, `ALREADY_PACKED`, `ALREADY_HANDED_OVER`, `INVALID_CODE`, `PACKED_ELSEWHERE_IN_PROGRESS` | S4 với tiêu đề + `alert.message` | 2 bíp; tự về sau 5 giây; `ALREADY_PACKED` + `can_request_repack` → nút "Yêu cầu đóng gói lại" (API-13 REPACK) |
| `outcome = IGNORED` | Toast "Đang chờ duyệt." (S5) | — |
| Retry cùng `client_scan_id` | BE trả nguyên outcome lần đầu (DEC-29) → xử lý như response thường | — |
| 401 UNAUTHENTICATED | — | Refresh 1 lần → thất bại → S0 |
| 403 FORBIDDEN | — | S0 |
| 409 STATION_INACTIVE | S6 với chữ "Station này đang tắt. Liên hệ Admin." | Không retry |
| 409 SESSION_NOT_OPEN, APPROVAL_ALREADY_PENDING, NOT_ELIGIBLE, ALREADY_RESOLVED | Không hiện lỗi | Gọi lại API-10 |
| 422 VALIDATION_ERROR | Lỗi dưới field | — |
| Mạng / 5xx trên API-11 | — | Retry 2 lần cùng `client_scan_id` → S6 |
| WS đóng 4401 | — | Refresh token → nối lại |

## 9. Nội dung chữ · i18n · a11y · responsive

- Chữ tiếng Việt cố định trong `src/features/station/copy.ts` (không dùng thư viện i18n — MVP một ngôn ngữ, DEC-17). Toàn bộ chữ lấy từ [01 §10.4](01-srs.md).
- Nhãn trạng thái từ enum (02 §5) đặt ở `src/shared/labels.ts`, dùng chung với admin.
- Cỡ chữ theo design system mục Station kiosk: mã vận đơn `display-md` mono, tiêu đề `headline-lg`, sản phẩm `title-lg`, tối thiểu `body-lg`.
- Màn thiết kế cho 1920×1080 và 1366×768 (không hỗ trợ mobile). Panel co theo `vh`; danh sách sản phẩm > 6 dòng → cuộn trong panel.
- a11y: panel có `role="status" aria-live="assertive"` để đọc trạng thái mới; màu luôn kèm icon + chữ; nút ≥ 56px.
- Không dùng animation khi đổi panel.

## 10. Riêng nền tảng

- Chạy Chromium kiosk (`--kiosk --autoplay-policy=no-user-gesture-required` để âm thanh phát không cần chạm). Hỗ trợ Chromium ≥ 120; không cần Safari / Firefox.
- Máy quét: USB HID, hậu tố Enter. `useScanListener`: gom ký tự khi khoảng cách giữa 2 phím ≤ 50 ms; kết thúc bằng Enter; chuỗi ≥ 4 ký tự → scan. Phím gõ tay (> 50 ms) bị bỏ qua khi không có ô nhập đang focus. Bố cục bàn phím máy quét: US.
- Màn không được ngủ: dùng Screen Wake Lock API khi có, kèm hướng dẫn tắt sleep trong README triển khai.
- Bundle: route `/station` tách chunk riêng (lazy) không kéo theo trang admin; mục tiêu ≤ 250 KB gzip.
- Âm thanh: tổng hợp bằng Web Audio trong `features/station/sound.ts` (ok / warn / error), không dùng file mp3 — DEC-50.

## 11. Analytics & theo dõi lỗi

| Event | Khi nào | Thuộc tính |
|---|---|---|
| Log client `scan_roundtrip_ms` (gửi kèm header `X-Client-Timing` lần quét kế) | Mỗi response API-11 | outcome, ms |
| Lỗi JS | `window.onerror`, React ErrorBoundary | MVP: `console.error` + ErrorBoundary hiện S6 với "Lỗi giao diện. Tải lại trang." Không gửi về BE (DEC-23 trong 02) |

## 12. Mock khi BE chưa xong

- MSW (Mock Service Worker) chặn `fetch` ở lớp API client; handler theo đúng 02 §6 trong `src/mocks/handlers/station.ts`.
- Mock WS: `src/mocks/ws.ts` giả lập `station.state` (có nút dev "Giả lập Cam 2 thấy mã khác", "Giả lập duyệt").
- Bật bằng `VITE_MOCK=1` (`pnpm dev:mock`); build production không chứa MSW.
- Kịch bản mock: đơn thường, đơn hủy, đơn đã đóng (REPACK → duyệt / từ chối), đơn đã bàn giao (`ALREADY_HANDED_OVER`), mã lạ (UNVERIFIED), lệch mã do quét, lệch mã do Cam 2, Gọi quản lý (ASSIST), camera offline.

## 13. Test FE

| Mức | Phạm vi | Case chính |
|---|---|---|
| Unit | `useScanListener` (nhịp phím, Enter, gõ tay), `stationStore` (thay state, hàng đợi quét), `CodeDiff`, `SessionTimer` | Quét 15 ký tự ở 10 ms/phím → 1 scan; gõ tay 200 ms/phím → 0 scan |
| Component | Mỗi panel S1..S6 với state mẫu; `AlertOverlay` tự đóng 5 giây | Render đúng chữ, tone, icon |
| Integration (MSW) | `StationPage` + mock API | Mở → đóng; ALERT; MISMATCH → gửi duyệt → WS duyệt → PACKING; mất mạng → S6 → nối lại |
| E2E (Playwright, MSW) | UC-01, UC-08 | Bàn phím giả lập máy quét (`keyboard.type` delay 5 ms + Enter) |

## 14. Task

| # | Việc | Màn / FR | Phụ thuộc (API-xx) | Ước lượng |
|---|---|---|---|---|
| T-30 | Khung `ai-cam-fe`: Vite + React + TS, pnpm, ESLint, Prettier, Vitest, Playwright, CI GitHub Actions | — | — | 1 |
| T-31 | Design tokens: sinh `tokens.css` từ `docs/design-system/tokens.json` (script), Tailwind config theo vai trò màu, font, `system.css` | — | — | 1 |
| T-32 | `shared/ui`: Icon, Button, IconButton, TextField, SelectField, TextAreaField, Alert, StatusChip, LinearProgress (**EXTEND**: thêm chế độ không giá trị), PageHeader, EmptyState, Tabs, SegmentedButtons, AuthCard, Dialog, Pagination, TrackingNumber; **NEW** ngoài design system: `Toast` (snackbar `inverse-surface`, 4 giây), `Skeleton` (`surface-container-high`, không animation khi `prefers-reduced-motion`) | — | — | 3,5 |
| T-33 | API client: sinh từ OpenAPI bằng orval (tạm thời viết tay theo 02 §6), interceptor auth + refresh, map lỗi; MSW nền; WS client có backoff | — | API-01..04 | 2 |
| T-34 | Auth + router + guard theo role; S0 | S0, FR-03.01 | API-01, 02, 04 | 1 |
| T-35 | `useScanListener` + `stationStore` + hàng đợi quét + âm thanh | FR-03.11 | API-11 | 1,5 |
| T-36 | StationPage, StatusBar, S1 (+ phiên gần đây, ClipPreviewDialog), S2, S3 | S1–S3, FR-03.02..07 | API-10, 11, 15, 40, WS-01 | 3 |
| T-37 | S4, S5 (yêu cầu MISMATCH / ASSIST / REPACK, rút), S6, CancelSessionDialog, nút "Gọi quản lý" ở S2/S3 | S4–S6, FR-03.08, 03.10, 03.12 | API-12, 13, 14 | 2 |
| T-38 | Test integration + E2E station với MSW; chạy thử với BE thật | UC-01, UC-08 | toàn bộ API station | 1,5 |

Tổng ≈ 16 ngày công (T-30..T-33 là nền dùng chung cho admin).

## Phương án đã cân nhắc

Chỉ lựa chọn riêng phía FE station (+ nền dùng chung). Scan trả 200 + `outcome` và WebSocket thay poll ở [02 §9](02-tech-spec.md#9-phương-án-đã-cân-nhắc); một app React cho cả station và dashboard, Chromium kiosk ở [ADR-006](../../system/decisions/ADR-006-single-react-app-kiosk.md).

| Phương án | Ưu | Nhược | Chọn? (lý do) |
|---|---|---|---|
| **Zustand `stationStore` (một nguồn state station, thay cả object) + TanStack Query cho dữ liệu phụ (API-15, API-40)** | Một chỗ nhận state từ API-10, WS-01 và response API-11..14; giữ được hàng đợi quét, timer cảnh báo 5 giây, `wsStatus` — những thứ không phải server cache | Hai cơ chế state trong cùng màn | ✔ ([architecture.md](../../system/architecture.md) chọn Zustand cho state station; `features/station/stationStore.ts`) |
| Chỉ TanStack Query (`setQueryData` từ WS và response scan) | Một thư viện | Hàng đợi quét, alert, trạng thái WS không phải dữ liệu server — phải nhét vào cache hoặc `useState` rời rạc; dễ lệch thứ tự mở → đóng | ✗ |
| **Một trang, chọn panel S1–S5 theo `state` server** | Reload luôn đúng; URL không lệch trạng thái thật | Không deep link từng màn | ✔ DEC-18 |
| Mỗi màn một route | Deep link, test theo URL | URL có thể khác trạng thái server sau WS / reload | ✗ |
| **Phân biệt máy quét theo nhịp phím (≤ 50 ms giữa 2 phím) + Enter, ≥ 4 ký tự** | Không cần ô nhập có focus; gõ tay tự bị bỏ qua | Ngưỡng phụ thuộc máy quét thật; máy chậm có thể bị bỏ qua | ✔ (`shared/scan/scanBuffer.ts`, `MAX_GAP_MS = 50`) |
| Luôn focus một ô nhập ẩn | Đơn giản | Mất focus khi mở Dialog / bấm nút → mất lần quét; gõ tay lẫn vào | ✗ |
| Cấu hình prefix / suffix riêng trên máy quét | Phân biệt chắc chắn | Phải cấu hình từng máy; thay máy là hỏng | ✗ |
| **Hàng đợi quét tối đa 1 + retry 2 lần cùng `client_scan_id`** | Giữ thứ tự mở → đóng; BE dedup (DEC-29) | Lần quét thứ 3 khi đang chờ bị bỏ | ✔ (§4) |
| **MSW ở lớp fetch, WS mock bằng `ws.link` của MSW** | Mock đúng contract 02 §6, không đổi code gọi API; build production không chứa mock | Phải giữ handler khớp contract khi 02 đổi | ✔ DEC-19, DEC-50 |
| json-server / mock trong code | Dễ dựng | Thêm tiến trình hoặc nhánh code riêng; không mock WS | ✗ |
| **Type sinh bằng `openapi-typescript` + client fetch tự viết mỏng** | Tự kiểm refresh 401 một lần cho nhiều request, retry cùng `client_scan_id` | Tự viết interceptor | ✔ DEC-41 |
| `orval` / `openapi-fetch` | Sinh sẵn hook / client | Khó gắn refresh đơn luồng và retry quét | ✗ |
| **Âm thanh tổng hợp bằng Web Audio** | Không cần asset, chạy offline | Âm đơn giản | ✔ DEC-50 (thay file mp3 trong §10) |
| **Font đóng gói `@fontsource/*` + `material-symbols`** | Chạy khi mất Internet (NFR-09) | Material Symbols 5,4 MB | ✔ DEC-42 |
| Google Fonts | Nhẹ repo | Mất WAN → icon hiện chữ | ✗ |
| **Chữ gom ở `copy.ts` / `labels.ts`** | Không thêm thư viện | Chuyển i18n sau phải tách lại | ✔ DEC-17 |

## Rủi ro & câu hỏi mở

Nguồn: [02 §11](02-tech-spec.md#11-rủi-ro--câu-hỏi-mở), [03 §5](03-plan.md#5-rủi-ro-tiến-độ), review code M1 (2026-10-05). Ai trả lời: khanhtt nếu không ghi khác.

| ID | Rủi ro / câu hỏi | Ảnh hưởng | Giảm thiểu / ai trả lời | Hạn |
|---|---|---|---|---|
| RS-1 | Nút "Gọi quản lý" (S2, S3) và "Yêu cầu đóng gói lại" (S4) gọi API-13 / API-14, BE chưa có tới T-13 — với BE thật hiện toast lỗi (MSW chạy đủ) (review code M1) | Trung bình — chưa demo được luồng duyệt với BE thật | Giữ toast lỗi, không giấu nút; kiểm lại khi T-13 xong | T-13, kiểm ở T-38 |
| RS-2 | Ngưỡng 50 ms / phím chưa thử với máy quét thật (spike S5, ADR-006); bố cục bàn phím máy quét phải là US | Trung bình — quét bị bỏ qua hoặc gõ tay lọt vào | Thử với máy quét mua ở T-4; `MAX_GAP_MS` là hằng số chỉnh được | T-4, T-38 |
| RS-3 | Phản hồi ≤ 1 giây p95 (NFR-01) chưa đo trên mạng LAN kho | Trung bình | Log `scan_roundtrip_ms`; locust phía BE | T-19, T-38 |
| RS-4 | Thu hồi đăng nhập station: station vẫn quét được ≤ 15 phút sau API-91 (access JWT), WS chưa đóng ngay (review code M1) | Trung bình | BE đóng WS ngay (RB-9 trong 02a); FE: WS 4401 → refresh thất bại → S0 | T-13 / T-59 |
| RS-5 | Âm thanh tự phát và màn không ngủ phụ thuộc cờ Chromium `--autoplay-policy` và Wake Lock API | Thấp — không có âm báo / màn tắt | Ghi cờ kiosk + hướng dẫn tắt sleep trong README vận hành | T-19 |
| RS-6 | Material Symbols 5,4 MB tải lần đầu (DEC-42) | Thấp — lần mở đầu chậm | Cache trong LAN; subset nếu cần | T-38 |
| RS-7 | Định dạng giờ API chưa thống nhất hậu tố `Z` (RB-11 trong 02a) → đồng hồ / giờ phiên lệch nếu parse sai | Thấp | Parse ISO 8601 có múi; chờ BE chuẩn hoá | T-19 |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-16 | Làm client nào trước; nền FE dùng chung đặt ở đâu | Station trước; nền dùng chung (T-30..T-33) trong spec này, admin tham chiếu | Station nằm trên đường găng UC-01; tránh lặp task | khanhtt (tự quyết, ủy quyền DEC-15) |
| DEC-17 | i18n | Không dùng thư viện i18n trong MVP; chữ gom ở `copy.ts` / `labels.ts` | Một ngôn ngữ; dễ chuyển sang i18n sau | khanhtt (tự quyết) |
| DEC-18 | Panel S1–S5 theo route hay theo state | Một trang, chọn panel theo `state` server | Tránh URL lệch trạng thái thật; reload luôn đúng | khanhtt (tự quyết) |
| DEC-41 | Sinh API client (T-30, sửa ở T-33) | Type sinh bằng `openapi-typescript` (`pnpm gen:api`) thay `orval`; client fetch tự viết mỏng `src/lib/api/client.ts` (không dùng `openapi-fetch`). Tới khi BE có OpenAPI đầy đủ, type viết tay theo 02 §6 | Cần refresh 401 một lần cho nhiều request và retry quét với cùng `client_scan_id` — khó gắn vào openapi-fetch | khanhtt (tự quyết) |
| DEC-42 | Font khi mất Internet (T-30) | Đóng gói font qua `@fontsource/*` + `material-symbols`, bỏ Google Fonts | Station phải chạy offline (NFR-09); icon font tải hỏng sẽ hiện chữ thay icon. Material Symbols đủ bộ 5,4 MB — chấp nhận trong LAN (cache); subset nếu cần | khanhtt (tự quyết) |
| DEC-43 | Nguồn token (T-31) | Sinh `tokens.css` từ seed bằng script của livesstream-ai-fe (`pnpm tokens`, material-color-utilities); test `src/design/tokens.test.ts` kiểm khớp `docs/design-system/tokens.json` (49 vai trò × light/dark) | Cùng engine sinh ra tài liệu; tránh viết parser riêng | khanhtt (tự quyết) |
| DEC-44 | UI kit (T-32, T-39) | Sao `ui.tsx`, `Dialog`, `Pagination` từ livesstream-ai-fe vào `src/shared/ui/`; NEW: `Toast` (store zustand, 4 giây), `Skeleton`, `TrackingNumber`; EXTEND: `LinearProgress` không giá trị. Trang `/_ui` chỉ có khi `pnpm dev` để xem UI kit (không vào build production) | Reuse design system gốc; trang xem nhanh thay Storybook | khanhtt (tự quyết) |
| DEC-50 | Lệch spec khi code T-35..T-40 | (1) Âm thanh tổng hợp bằng Web Audio, không dùng file mp3 (không cần asset, chạy offline). (2) Nút trên nền màu trạng thái dùng biến thể `elevated` (outlined chữ primary trên primary-container không đủ tương phản — thấy khi chụp màn thật). (3) Mock WS bằng `ws.link` của MSW; video mẫu `public/mock/` bị loại khỏi build production. (4) Làm T-36, T-37, T-40 cùng lúc (chung trang và store) | Phát hiện khi chạy app thật | khanhtt (tự quyết) |
| DEC-19 | Mock | MSW ở lớp fetch | Mock đúng contract, không đổi code gọi API | khanhtt (tự quyết) |
