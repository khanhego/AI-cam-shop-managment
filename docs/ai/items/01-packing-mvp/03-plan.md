# 01-packing-mvp — Plan

| | |
|---|---|
| Owner (PM) | khanhtt |
| Reviewer | PO · Tech lead (khanhtt) |
| Trạng thái | Approved (Plan 2026-10-04, tự quyết DEC-15) |
| Spec | [02-tech-spec.md](02-tech-spec.md) · [02a §12](02a-be-spec.md#12-task) · [02b-station §14](02b-fe-spec-station.md#14-task) · [02b-admin §14](02b-fe-spec-admin.md#14-task) |
| Last update | 2026-10-05 · PM (G3 đạt có điều kiện — DEC-68; sửa số contract test) |

> **TL;DR** — 46 task (22 BE, 24 FE), ≈ 70 ngày công cho một dev, 6 milestone M0–M5; mỗi milestone demo được end-to-end.
> Đường găng BE: T-1 → T-6 → T-7 → T-10 → T-14 → T-15 (≈ 11 ngày); nhánh Cam 2 T-10 → T-11 → T-12 chờ thêm camera thật (T-4).
> Xong dự kiến 2027-01-14 (M5), tính từ 2026-10-05, 1 dev, 5 ngày/tuần (DEC-34). **Thực tế: M0–M5 xong 2026-10-05** trừ T-3, T-4 (chờ tài nguyên ngoài).
> Rủi ro tiến độ lớn nhất: Shopee duyệt partner chậm (T-3, Q11) và chưa có camera thật (T-4) — khởi động cả hai ngày đầu.

<!-- Đối tượng đọc: cả đội và người duyệt Plan. Task lấy từ 02a §12 / 02b §14; không tự đặt thêm phạm vi. -->

---

## 1. Chiến lược chia

**Vertical slice theo milestone.** Mỗi milestone gồm cả BE và FE của một nhóm UC, demo được trên camera giả (`fake-cams`) + MSW, sau đó trên BE thật. Lý do: một dev làm cả hai đầu, cần thấy luồng chạy sớm để phát hiện lệch contract; spike phần cứng / Shopee chạy song song vì có thời gian chờ bên ngoài.

Task > 2 ngày trong spec được tách (cột Nguồn ghi "tách từ"). ID cũ giữ nguyên, phần tách ra mang ID mới.

## 2. Task

Owner tất cả: khanhtt (profile §7). Ticket: chưa tạo (§7). Trạng thái: ⬜ chưa · ▶ đang làm · ✅ xong.

| T | Tên | Comp | Phủ (FR / API / màn) | Nguồn | Phụ thuộc | Ước lượng | Ticket | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| T-1 | Khung repo BE: uv, ruff, mypy, pytest, import-linter, Dockerfile (Python + FFmpeg + font), compose.dev, CI | be | — | 02a §12 | — | 1 | | ✅ |
| T-2 | MediaMTX + `fake-cams` (RTSP từ file mẫu có barcode), record fMP4 60 giây | be | FR-02.01 | 02a §12 | T-1 | 1 | | ✅ |
| T-3 | Spike S1 Shopee (đăng ký partner, endpoint, ký, trạng thái, rate limit) | be | FR-05.* | 02a §12 | — (bắt đầu ngày 1) | 2 + chờ duyệt | | ⬜ chờ Shopee duyệt partner — chưa test (OAuth thật, `state` trong redirect, mã lỗi thật, bảng trạng thái vận chuyển, hạn mức rate limit, tra đơn theo mã vận đơn — DEC-123 02a) |
| T-4 | Spike S2 vision với camera thật (vị trí, ROI, tỉ lệ đọc, CPU, ONVIF — DEC-33) | be | FR-03.06, AC-04, AC-17 | 02a §12 | T-2, có camera | 2 | | ⬜ chờ phần cứng — chưa test: tỉ lệ đọc ≥ 95% (AC-04, TC-03.21), trễ thật ≤ 2 giây, CPU camera 4MP, vị trí / ánh sáng, phiếu nhăn / in trùng; đo lại AC-08 (RB-7) |
| T-5 | Spike S3 cắt clip + đo encode export (AC-08) | be | FR-02.02, AC-08 | 02a §12 | T-2 | 1 | be `4caa414` | ✅ (AC-08 với 1080p H.265 chưa đạt trên nguồn giả — RB-7, đo lại ở T-4) |
| T-6 | core + migration `0001_initial` + CLI `create-admin` (`seed-demo` dời T-10, DEC-39) | be | — | 02a §12 | T-1 | 2 | | ✅ |
| T-7 | users + auth: API-01..04, 90..92 | be | FR-10.*, FR-03.01 | 02a §12 | T-6 | 2 | | ✅ |
| T-8 | stations + camera: API-60..65, path MediaMTX, J-08 (trong vision), J-09 | be | FR-01.01..06 | 02a §12 | T-6, T-2 | 2 | | ✅ |
| T-9 | orders + `transition()` + adapter interface + mock adapter | be | FR-05.07 | 02a §12 | T-6 | 1 | | ✅ |
| T-10 | sessions: state machine, API-10, API-11 (mở / đóng / MISMATCH / ALERT, nhánh tray) + CLI `seed-demo` | be | FR-03.02..07, 03.11, BR-01..06, 18 | 02a §12 (tách) | T-7, T-8, T-9 | 2 | | ✅ |
| T-20 | sessions: API-12, 15, `scan_dedup`, J-07 quá giờ, REPACK superseding | be | FR-03.08, 03.09, BR-03, 16 | tách từ T-10 | T-10 | 1 | | ✅ |
| T-11 | realtime hub: WS-01, WS-02, `ws:approvals`, after_commit | be | FR-03.06, 09.01 | 02a §12 | T-10 | 1 | | ✅ |
| T-12 | vision process + `on_tray_changed` + `camera.health` subscriber | be | FR-03.06, 03.07, 01.04, BR-06, 18 | 02a §12 | T-4, T-11 | 2 | be `771f61d` | ✅ trên camera giả (`fake-cam2`); phần camera thật thuộc T-4 (DEC-111 02a) |
| T-13 | approvals: API-13, 14, 20, 21 | be | FR-03.10, 03.12 | 02a §12 | T-11, T-20 | 1,5 | be `9b7c26e`, `97abd2e` (DEC-60) | ✅ (DEC-112 02a) |
| T-14 | media: J-10 index segment, J-01 cắt clip, API-40, 41 | be | FR-02.01..05, 07.02 | 02a §12 (tách) | T-5, T-10 | 2 | be `74a3aea` | ✅ (làm thêm API-30/31 — 03 không có task nào giữ; DEC-102 02a) |
| T-21 | media: API-42 giữ clip, API-46 cắt lại, J-02 retention | be | FR-02.06, 02.09, BR-09, AC-15, AC-20 | tách từ T-14 | T-14 | 1 | be `ebcc635` | ✅ |
| T-15 | export: API-43..45, J-03 (overlay, side-by-side, queue `export`) | be | FR-07.04, 02.07 | 02a §12 | T-14 | 2 | be `dadf93c` | ✅ |
| T-16 | Shopee adapter + API-70..73 + tra 2 giây trong scan | be | FR-05.01, 05.06, 05.08, BR-04 | 02a §12 (tách) | T-3, T-9, T-10 | 2 | be `d5f7e05` | ✅ trên HTTP giả (respx) + adapter mock; Shopee thật chờ T-3. Token bucket ADR-007 chưa làm (DEC-122 02a) |
| T-22 | Shopee jobs J-04, J-05, J-06, J-12 | be | FR-05.02..04 | tách từ T-16 | T-16 | 1 | be `2375a2e` | ✅ trên adapter mock / HTTP giả; queue `sync`, beat 5 / 10 / 15 / 30 phút; không chạy khi `SHOPEE_ENABLED=false` (DEC-124 02a) |
| T-17 | imports: API-50..54, BR-17 | be | FR-05.09, 05.10 | 02a §12 | T-9 | 1,5 | be `90a16c6` | ✅ 500 đơn nhập 1,1 giây (AC-12 ≤ 30 giây; DEC-121 02a) |
| T-18 | reports API-32, settings API-80, health API-81, J-11 | be | FR-09.01, 02.06 | 02a §12 | T-14 | 1 | be `e9ef363`, fix `1926eb6` | ✅ |
| T-19 | Contract test, locust, compose.yml prod, Caddyfile, README vận hành. Checklist từ review M1 (DEC-53): đặt `FORWARDED_ALLOW_IPS` = IP Caddy; không phục vụ `*.map`; secret thật cho staging/prod | be | NFR-01, 05, 09 | 02a §12 | T-10..T-22 | 2 | be `e2a88a5`, `5d83c09`, `f1cf83a`, `cd5183a` | ✅ Contract test 119 test so 48 mục / 42 mã API-xx của 02 §6 với OpenAPI + snapshot `openapi.json`, giờ `Z` (đóng RB-11), API-51 song song (DEC-131..133 02a). Locust trên máy dev (không phải server kho): NFR-05 10 phút → API-11 p95 mở 80 ms / đóng 50 ms, 0 lỗi; stress 4 station ≈ 13.400 quét/giờ 5 phút → p95 26 ms, max 149 ms, 0 lỗi (DEC-134). `docker/compose.yml` production + Caddyfile + `docs/ops.md`; staging local 15/15 bước (DEC-135..137). BE 466 pass / 97 skip |
| T-30 | Khung repo FE: Vite, React, TS, pnpm, ESLint, Prettier, Vitest, Playwright, CI | fe | — | 02b-st §14 | — | 1 | | ✅ |
| T-31 | Design tokens → `tokens.css`, Tailwind theo vai trò màu, font, `system.css` | fe | — | 02b-st §14 | T-30 | 1 | | ✅ |
| T-32 | `shared/ui` phần 1: Icon, Button, IconButton, TextField, SelectField, TextAreaField, Alert, StatusChip, AuthCard, TrackingNumber | fe | — | 02b-st §14 (tách) | T-31 | 2 | | ✅ |
| T-39 | `shared/ui` phần 2: LinearProgress (EXTEND), PageHeader, EmptyState, Tabs, SegmentedButtons, Dialog, Pagination, Toast, Skeleton | fe | — | tách từ T-32 | T-32 | 1,5 | | ✅ |
| T-33 | API client (tạm viết tay theo 02 §6), interceptor auth/refresh, map lỗi, MSW nền, WS client | fe | API-01..04 | 02b-st §14 | T-30 | 2 | | ✅ |
| T-34 | Auth + router + guard; S0 | fe | S0, FR-03.01 | 02b-st §14 | T-32, T-33 | 1 | | ✅ |
| T-35 | `useScanListener`, `stationStore`, hàng đợi quét, âm thanh | fe | FR-03.11 | 02b-st §14 | T-33 | 1,5 | | ✅ |
| T-36 | StationPage, StatusBar, S2, S3 | fe | S2, S3, FR-03.03..07 | 02b-st §14 (tách) | T-34, T-35; API-10, 11, WS-01 | 2 | | ✅ |
| T-40 | S1 + phiên gần đây + ClipPreviewDialog (`ClipPlayer` dùng chung) | fe | S1, FR-03.02 | tách từ T-36 | T-36, T-39; API-15, 40 | 1 | | ✅ |
| T-37 | S4, S5 (MISMATCH / ASSIST / REPACK), S6, CancelSessionDialog | fe | S4–S6, FR-03.08, 03.10, 03.12 | 02b-st §14 | T-36; API-12..14 | 2 | | ✅ (API-13/14 thật ở T-13, kiểm qua T-38) |
| T-38 | Test integration + E2E station; chạy với BE thật | fe | UC-01, UC-08 | 02b-st §14 | T-37, T-13 | 1,5 | fe `e2e/real/station.spec.ts`, `e2e/real/admin-d13.spec.ts` | ✅ (chạy BE thật pass) |
| T-50 | AppShell, drawer theo role, theme, D1, D12, guard | fe | D1, D12, FR-10.02 | 02b-ad §14 | T-34, T-39 | 1,5 | | ✅ |
| T-51 | D2 Tổng quan + WS-02 invalidate | fe | D2, FR-09.01 | 02b-ad §14 | T-50; API-32 | 1,5 | fe `83b459e` | ✅ |
| T-52 | D3 Tra cứu | fe | D3, FR-07.01, 07.03 | 02b-ad §14 | T-50; API-30 | 1,5 | fe `3323be6` | ✅ |
| T-53 | D4 Chi tiết + ClipPlayer + Giữ clip + cắt lại | fe | D4, FR-07.02, 02.09 | 02b-ad §14 | T-52, T-40; API-31, 40, 42, 46 | 2 | fe `4befee3` | ✅ |
| T-54 | ExportDialog | fe | D4, FR-07.04, 02.07 | 02b-ad §14 | T-53; API-43..45 | 1 | fe `555d891` (+ E2E BE thật `272c9dc`) | ✅ |
| T-55 | D13 Yêu cầu duyệt + badge + âm báo | fe | D13, FR-03.12 | 02b-ad §14 | T-50; API-20, 21 | 1,5 | fe `aeca76e` | ✅ (âm báo chưa nghe thử trên máy thật; DEC-81 02b-admin) |
| T-56 | D5 Nhập đơn | fe | D5, FR-05.09 | 02b-ad §14 | T-50; API-50..54 | 1,5 | fe `b09e0f3` | ✅ (DEC-91 02b-admin; `.xlsx` thật chưa thử trên trình duyệt) |
| T-57 | D6 Station, camera, kiểm tra kết nối | fe | D6, FR-01.01 | 02b-ad §14 (tách) | T-50; API-60..63 | 1,5 | | ✅ |
| T-62 | `RoiEditor` + lưu ROI | fe | D6, FR-01.04 | tách từ T-57 | T-57; API-63, 64 | 1 | fe `5e25242` | ✅ (DEC-82 02b-admin) |
| T-58 | D7 Shopee, D8 Lưu trữ + sức khỏe | fe | D7, D8, FR-05.01, 02.06 | 02b-ad §14 | T-50; API-70..73, 80, 81 | 1,5 | fe `83cc236` | ✅ (DEC-92 02b-admin; không có nút ngắt kết nối, không hiện số clip đang giữ — DEC-63 02) |
| T-59 | D9 Người dùng, D10 Nhật ký | fe | D9, D10, FR-10.01, 10.03 | 02b-ad §14 | T-50; API-90..92 | 1,5 | fe `c1cb076` | ✅ (DEC-93 02b-admin; station về đăng nhập ≤ 15 phút sau thu hồi mới kiểm tới API 204 — TC-10.06) |
| T-60 | D11 Live view (WHEP) | fe | D11, FR-01.05 | 02b-ad §14 | T-50; API-65 | 1,5 | fe `310de20`, E2E `fafd6b7` | ✅ (khung hình thật Cam 1 + Cam 2 qua ICE-TCP máy dev; LAN kho / UDP chưa test; DEC-83 02b-admin) |
| T-61 | Test integration + E2E admin; chạy với BE thật | fe | UC-03, 07, 08, 09 | 02b-ad §14 | T-51..T-60 | 2 | fe `ac017c0`, `3533ff3` | ✅ làm cùng M4: bộ `ai-cam-fe/e2e/real` 37 bài chạy BE thật 37/37 (`evidence/m4-e2e-real.txt`); E2E mock 9 |

Task nền theo spec đã có: migration (T-6), mock contract cho FE (T-33 MSW), flag `SHOPEE_ENABLED` (T-16), seed dữ liệu test (T-6 `seed-demo`), tài liệu vận hành (T-19). Done của mọi task: theo profile §8 (build / lint / test không thêm lỗi, test hành vi mới, system-map cập nhật).

## 3. Thứ tự & song song

```mermaid
flowchart LR
    T1[T-1] --> T2[T-2] & T6[T-6]
    T6 --> T7[T-7] & T9[T-9]
    T2 & T6 --> T8[T-8]
    T7 & T8 & T9 --> T10[T-10] --> T20[T-20] & T11[T-11] & T14[T-14]
    T11 --> T12[T-12]
    T4[T-4 camera thật] --> T12
    T11 & T20 --> T13[T-13]
    T5[T-5] --> T14 --> T21[T-21] & T15[T-15] & T18[T-18]
    T3[T-3 Shopee] --> T16[T-16] --> T22[T-22]
    T9 --> T17[T-17]
    T30[T-30] --> T31[T-31] --> T32[T-32] --> T39[T-39]
    T30 --> T33[T-33] --> T34[T-34] & T35[T-35]
    T34 & T35 --> T36[T-36] --> T40[T-40] & T37[T-37]
    T10 -. API thật .-> T36
```

- **Đường găng (BE):** T-1 → T-6 → T-7 → T-10 → T-14 → T-15 ≈ 11 ngày; nhánh Cam 2 T-10 → T-11 → T-12 phụ thuộc thêm T-4 (camera thật).
- **Song song cho một dev:** FE station (T-30..T-37) chạy trên MSW trong lúc chờ BE; spike T-3, T-4 chạy nền (chờ bên ngoài).
- **Ngày đầu:** gửi đăng ký Shopee Open Platform (T-3), đặt mua 1 bộ camera + máy quét (T-4) — thời gian chờ không nằm trên đường găng nếu làm ngay.

## 4. Milestone

Ngày mục tiêu tính từ thứ Hai 2026-10-05, 1 dev, 5 ngày/tuần, chưa trừ nghỉ lễ (DEC-34).

| Milestone | Gồm task | Công | Ngày mục tiêu | Demo được gì |
|---|---|---|---|---|
| M0 Nền móng | T-1, T-2, T-6, T-30, T-31, T-32, T-39, T-33 | 11,5 | 2026-10-20 | Hai repo chạy `compose.dev` + `pnpm dev`, CI xanh, camera giả phát RTSP, UI kit xem được |
| M1 Quét đóng gói | T-7, T-8, T-9, T-10, T-20, T-11, T-34, T-35, T-36, T-50, T-57 | 17 | 2026-11-11 | Đăng nhập station, quét mở / đóng phiên với đơn seed, lệch mã do quét, Admin tạo station + camera (AC-01, 03, 13) |
| M2 Video bằng chứng | T-5, T-14, T-21, T-15, T-18, T-40, T-51, T-52, T-53, T-54 | 14 | 2026-12-01 · **xong 2026-10-05** (code + E2E BE thật) | Clip Cam 1 + Cam 2 sau khi đóng, tra cứu, xem, giữ, xuất MP4 có overlay, dashboard ngày (AC-02, 08, 11, 15, 16, 18, 20) |
| M3 Cam 2 + duyệt | T-4, T-12, T-13, T-37, T-55, T-62, T-60 (+ T-38 làm sớm) | 13 | 2026-12-18 · **xong 2026-10-05** trừ T-4 (chờ phần cứng) | Phiếu sai trên khay bị bắt, gửi duyệt → Supervisor duyệt trên dashboard, đóng gói lại, live view (AC-04, 10, 14, 17, 19, 21) |
| M4 Nguồn đơn | T-3, T-16, T-22, T-17, T-56, T-58, T-59 (+ T-61 làm sớm) | 11 | 2027-01-06 · **xong 2026-10-05** trừ T-3 (chờ Shopee duyệt partner) | Kết nối Shopee (hoặc CSV khi chưa có quyền), đơn hủy bị chặn, người dùng + nhật ký (AC-05, 12) |
| M5 Hoàn thiện | T-19 (T-38 xong ở M3, T-61 xong ở M4) | 5,5 | 2027-01-14 · **xong 2026-10-05** (staging local, chưa lên server kho) | Contract test, test tải, E2E, compose production; sẵn sàng G3 (AC-09, NFR-01, 05) |

## 5. Rủi ro tiến độ

| Rủi ro | Giảm thiểu |
|---|---|
| Shopee duyệt partner chậm / từ chối (Q11) | Gửi đăng ký ngày 1; M4 làm CSV (T-17, T-56) trước; `SHOPEE_ENABLED=false`; T-16/T-22 có thể dời sang item sau mà MVP vẫn dùng được |
| Adapter Shopee (T-16, T-22) chỉ chạy trên HTTP giả: chưa kiểm OAuth thật, mã lỗi thật, bảng trạng thái vận chuyển, hạn mức rate limit; tra đơn theo mã vận đơn dò đơn cập nhật 60 phút gần nhất (DEC-123 02a, cần xác nhận) | Khi có tài khoản partner (T-3): chạy lại TC-05.01, 05.02 thủ công, sửa `shopee/mapping.py` + `client.py`; làm token bucket theo hạn mức thật (ADR-007). Trước đó dùng nhập CSV |
| Backlog sau MVP (DEC-63 02) | API ngắt kết nối shop (MVP: chủ shop thu hồi ở Shopee Seller Center, J-12 báo lỗi → D7 "Cần kết nối lại"); `held_clips` trong API-81 (MVP: xem số clip đang giữ ở D3 bằng lọc) |
| Chưa có camera thật khi tới M3 | Đặt mua ngày 1; T-12 phát triển trên `fake-cams` (file có barcode), chỉ T-4 cần phần cứng |
| Cam 2 đọc < 95% (AC-04) | T-4 trước T-12; nếu không đạt → change request (đổi camera / ánh sáng / vị trí) trước khi làm tiếp M3 |
| Một dev, 70 ngày công, ước lượng chưa có dữ liệu | Theo dõi sau M0, M1; cắt phạm vi theo thứ tự: D11 live view, D10, SIDE_BY_SIDE export (đều không phải AC chặn) |
| Contract lệch khi code | T-33 MSW theo 02 §6; T-19 contract test so `/openapi.json` với 02 — đã làm (DEC-131 02a); FE sinh client từ `ai-cam-be/openapi.json` |
| **Khôi phục sao lưu chưa thử**: mới chạy `pg-backup` một lần (staging local), chưa `pg_restore` ra DB trống, chưa chạy lịch 01:00 qua đêm | Trước G5 production: khôi phục bản sao lưu vào DB trống theo `ai-cam-be/docs/ops.md` §6, đếm dòng bảng chính, đăng nhập + tra 1 kiện; ghi thời gian khôi phục. Chưa đạt thì không go-live |
| Triển khai tại kho chưa test: WHEP qua LAN thật (ICE UDP 8189), cài root cert Caddy (`tls internal`) trên máy station / dashboard, volume video trên NAS (`compose.override.yml`), nâng cấp / rollback trên dữ liệu thật | Chạy ở G5 trên server kho theo `docs/ops.md` §3, §7: mở D11 từ máy dashboard trong LAN, kiểm cookie `Secure` sau khi cài cert, ghi thử segment lên NAS, nâng cấp bản kế tiếp có migration rồi rollback image (DB khôi phục từ sao lưu) |
| Số tải mới đo trên máy dev (Colima, adapter mock, NFR-05 chỉ 10 phút thay 1 giờ) | Đo lại TC-N.01, N.04 trên server kho với camera thật ghi + cắt clip + xuất cùng lúc, đủ 1 giờ, trước G4 / G5 |
| AC-08 (bản xuất ≤ 20 giây p95; tới điện thoại ≤ 30 giây) chưa test trên phần cứng thật. Spike S3 nguồn giả 720p sát ngưỡng (1 camera ≤ 16,4 giây; ghép 17,8–19,3 giây khi máy rảnh, 28,4 giây khi bận); nguồn giả 1080p H.265 ghép 106–167 giây — **không đạt** (RB-7 trong 02a) | Đo lại trên server kho + camera thật ở T-4 (M3), trước G4; hạ `EXPORT_PRESET` / `EXPORT_SIDE_SCALE` (DEC-101); vẫn vượt → camera ghi thêm sub-stream 720p cho xuất hoặc server có tăng tốc phần cứng (change request) |

## 6. Bảng phủ FR → task

| FR | Task BE | Task FE |
|---|---|---|
| FR-01.01 | T-8 | T-57 |
| FR-01.02, 01.03 | T-8, T-12 | T-36, T-51 |
| FR-01.04 | T-8, T-12 | T-62 |
| FR-01.05 | T-8 | T-60 |
| FR-01.06 | T-8, T-18 | T-51 |
| FR-02.01..05 | T-2, T-14 | T-53 |
| FR-02.06 | T-21, T-18 | T-58 |
| FR-02.07 | T-15 | T-54 |
| FR-02.09 | T-21 | T-53 |
| FR-03.01 | T-7 | T-34, T-59 |
| FR-03.02..07, 03.11 | T-10, T-12 | T-35, T-36, T-40 |
| FR-03.08, 03.09 | T-20 | T-37 |
| FR-03.10, 03.12 | T-13, T-20 | T-37, T-55 |
| FR-05.01 | T-16 | T-58 |
| FR-05.02..04, 05.06, 05.08 | T-16, T-22 | — (không có UI riêng) |
| FR-05.07 | T-9 | — |
| FR-05.09, 05.10 | T-17 | T-56 |
| FR-07.01, 07.03 | T-10 (dữ liệu), T-14 | T-52 |
| FR-07.02 | T-14 | T-53 |
| FR-07.04 | T-15 | T-54 |
| FR-09.01 | T-18, T-11 | T-51 |
| FR-10.01..10.03 | T-7 | T-50, T-59 |

Mọi FR mức M trong phạm vi 01 có ít nhất một task. Không có task ngoài FR trừ task nền (T-1, T-6, T-30..T-33, T-39, T-19) — kỹ thuật cần thiết.

## 7. Tracker

Profile: GitHub Issues (`khanhego/ai-cam-be`, `khanhego/ai-cam-fe`). **Chưa tạo ticket** — tạo issue là thao tác ra bên ngoài, chờ user cho phép (DEC-35). Khi được phép: một issue / task, tiêu đề `[T-n] <Tên>`, nhãn `be`/`fe` + `M0`..`M5`, mô tả trỏ FR / API / màn và file spec; key ghi ngược cột Ticket.

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-34 | Ngày mục tiêu | Tính từ 2026-10-05, 1 dev, 5 ngày/tuần, không trừ lễ | Chưa có lịch thực; cập nhật sau M0 | khanhtt (tự quyết) |
| DEC-35 | Tạo ticket GitHub | Hoãn, chờ user cho phép | Thao tác ra bên ngoài (memory: vẫn hỏi trước) | khanhtt (tự quyết) |
| DEC-36 | Tách task > 2 ngày | T-10→T-20, T-14→T-21, T-16→T-22, T-32→T-39, T-36→T-40, T-57→T-62 | Quy ước ≤ 2 ngày / task | khanhtt (tự quyết) |
| DEC-37 | Duyệt Plan | Duyệt (ủy quyền DEC-15) | Phủ đủ FR, phụ thuộc rõ | khanhtt (tự quyết) |
| DEC-53 | Review code M1 (subagent): Đạt có điều kiện, 3 major + 20 minor/nit | Sửa ngay 3 major và #4–#12, #14, #16–#18, #20–#22, một phần #13 (token station đã gỡ → 403 ngay), mỗi sửa có test. Để sau: #13 thu hồi + đóng WS ngay → T-13/T-59; #15 `VIDEO_INCOMPLETE` → T-14; #19 định dạng giờ `Z`; #23 J-09 giữ transaction. Checklist deploy (`FORWARDED_ALLOW_IPS`, không phục vụ `*.map`, secret staging) → T-19 | Major chặn G3; phần để sau phụ thuộc task chưa làm | khanhtt (tự quyết, ủy quyền DEC-15) |
| DEC-54 | QA M1: tài khoản dashboard mở `/station` bằng tải trang mới | Chấp nhận hành vi thực tế: về `/station/login` (cookie refresh tách `rt_station` / `rt_dashboard`), thay vì `/admin` như ma trận 04 §3. Điều hướng trong app vẫn theo guard | An toàn hơn, không lộ phiên chéo client; đổi lại cần sửa ô ma trận trong 04 | khanhtt (tự quyết) |
| DEC-55 | Thu hồi đăng nhập station trễ tối đa 15 phút (review M1 #13, TC-10.06) | Chấp nhận: station về màn đăng nhập khi access token hết hạn (≤ 15 phút); không làm "đóng WS ngay". Phiên station giữ như hiện tại (refresh 30 ngày trượt — máy dùng hằng ngày không phải đăng nhập lại) | Thu hồi chỉ dùng khi sự cố hiếm (đổi/mất máy trạm, khai báo lại station, nghi lộ phiên), Admin chủ động; bỏ việc khỏi T-13 | User (2026-10-05) |
| DEC-56 | User giao hoàn thành Phase 1–3 (2026-10-05) | Phase 1 tiếp item 01 từ bước 8; mỗi milestone chạy 2 agent song song (BE ở `ai-cam-be`, FE ở `ai-cam-fe`, FE mock theo contract 02 tới khi BE xong), tuần tự trong mỗi repo; commit + push mỗi task; người điều phối giữ 03/00-status/system-map và chạy E2E với BE thật sau mỗi milestone | Hai repo độc lập nên song song không xung đột; giữ thứ tự task trong từng repo (CONVENTIONS §4: 8a ∥ 8b) | User (phạm vi) · khanhtt tự quyết (cách làm) |
| DEC-60 | RB-14 (02a): phiên chờ duyệt lâu rồi được "Cho tiếp tục" bị J-07 cảnh báo / bỏ dở ngay vì đồng hồ tính từ `started_at` | Đồng hồ quá giờ tính lại từ lúc yêu cầu duyệt kết thúc: `timer_base` = max(`started_at`, `decided_at` gần nhất); station rút yêu cầu cũng ghi `decided_at`; cảnh báo 15 phút bật lại. Change request nhỏ BR-16 (01 v0.4). Code be `97abd2e` | Người đứng bàn không phải quét mở lại vì quản lý duyệt chậm; không mất bằng chứng (clip vẫn từ lúc mở phiên). Loại: giữ nguyên (bỏ dở oan); cột mới cộng dồn thời gian chờ (thừa) | khanhtt (vai PO, theo ủy quyền DEC-15) |
| DEC-68 | Chốt G3 sau 2 lượt review code toàn Phase 1 (subagent `ai-lead-review`) + 1 lượt xác minh; ~70 finding, đã sửa hết (02a DEC-141..163, 02b-admin DEC-171..175); F9 / F10 (chi phí gọi Shopee) hoãn tới T-3 (DEC-158, RB-15) | **G3 đạt có điều kiện.** Điều kiện: (1) V-1 sửa — deadlock J-04 ↔ nhập file → `409 IMPORT_CONFLICT` (02a DEC-162); (2) V-2 sửa — J-02 chỉ giữ video thô của phiên clip lỗi trong hạn giữ clip (02a DEC-163); (3) contract 02 v0.7 (DEC-67). Đủ khi agent BE xong V-1, V-2 kèm test xanh; sau đó sang bước 11 QA G4 | Mọi blocker / major đã sửa có test; V-1, V-2 là phát hiện của lượt xác minh, phạm vi hẹp, không cần review lại toàn bộ. Phương án loại: review vòng 3 toàn bộ (tốn thời gian, không thêm giá trị so với kiểm riêng V-1, V-2); chờ T-3 rồi mới chốt (T-3 phụ thuộc Shopee duyệt partner, không có hạn) | khanhtt (tự quyết theo ủy quyền DEC-15) |
