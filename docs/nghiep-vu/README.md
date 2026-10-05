# Tài liệu nghiệp vụ cho dev

| Trường | Giá trị |
|---|---|
| Mục đích | Mục lục tài liệu giải thích nghiệp vụ theo từng lát (vertical slice) đã implement |
| Người đọc | Dev mới vào dự án, reviewer, QA |
| Tác giả | khanhtt (agent soạn) |
| Reviewer | PO · Tech lead |
| Last update | 2026-10-05 · Dev |

**TL;DR** — Mỗi lát (milestone trong `03-plan` §4) có một file giải thích *vì sao* có từng quy tắc, tình huống thật, luồng ví dụ, điểm dễ hiểu nhầm và bản đồ nghiệp vụ → code → test. Viết sau khi lát implement xong, bắt buộc trước G3. Skill: `ai-dev-explain-business`.

Trạng thái tài liệu: **Draft** (chờ review) → **Reviewed** → **Outdated** (code đã đổi, cần viết lại).

## Mục lục

| Item | Lát | Phạm vi | File | Trạng thái lát (code) | Trạng thái tài liệu |
|---|---|---|---|---|---|
| [01-packing-mvp](../ai/items/01-packing-mvp/00-status.md) | 0 — Nền móng (M0) | Khung repo, ghi hình 60 giây, camera giả, 19 bảng + ràng buộc, CLI, UI kit, API/WS client | [lat-00-nen-mong.md](01-packing-mvp/lat-00-nen-mong.md) | ✅ xong, đã commit | Draft |
| 01-packing-mvp | 1 — Quét đóng gói (M1) | Đăng nhập + phân quyền, station + camera, quét mở/đóng, lệch mã, cảnh báo đơn, khay Cam 2 khi quét, J-07, realtime, màn S0–S6, D1, D6, D12 | [lat-01-quet-dong-goi.md](01-packing-mvp/lat-01-quet-dong-goi.md) | ✅ xong (+ FE T-37, T-40 làm sớm), đã commit | Draft |
| 01-packing-mvp | 2 — Video bằng chứng (M2) | Ghi liên tục → cắt clip Cam 1/Cam 2 ±5 giây, SHA-256, tra cứu D3, chi tiết + phát D4, giữ clip, cắt lại, xuất MP4 overlay + JSON (giữ 24 giờ), retention 30/90 ngày, D2 Tổng quan ngày | [lat-02-video-bang-chung.md](01-packing-mvp/lat-02-video-bang-chung.md) | ✅ xong, đã commit (E2E BE thật 20/20) | Draft |
| 01-packing-mvp | 3 — Cam 2 + duyệt (M3) | Cam 2 đọc phiếu trên khay chặn dán nhầm, gửi yêu cầu duyệt (lệch mã, gọi quản lý, đóng gói lại), duyệt trên D13, đồng hồ quá giờ tính lại sau duyệt (DEC-60), vẽ vùng đọc mã D6, live view D11 | [lat-03-cam2-va-duyet.md](01-packing-mvp/lat-03-cam2-va-duyet.md) | ✅ xong trên camera giả, đã commit (QA live 88/88, E2E BE thật 25/25 + 2 live); T-4 camera thật chưa test | Draft |
| 01-packing-mvp | 4 — Nguồn đơn (M4) | Đơn tự đồng bộ từ Shopee (J-04/05/06/12), tra sàn 2 giây khi quét, đơn chưa xác minh được xác minh lại, đơn hủy chặn đóng / hủy sau khi đóng cảnh báo, nhập CSV / xlsx khi chưa có API, đơn API ghi đè CSV (BR-17), D5, D7–D10 người dùng + nhật ký | [lat-04-nguon-don.md](01-packing-mvp/lat-04-nguon-don.md) | ✅ xong trên HTTP giả + adapter mock, đã commit (QA live 94 pass + 2 skip, E2E BE thật 37/37); Shopee thật chưa test (T-3) | Draft |
| 01-packing-mvp | 5 — Hoàn thiện (M5) | Chạy tại kho (mất Internet vẫn đóng gói), compose production một lệnh (migrate trước api), HTTPS nội bộ Caddy, live view chỉ Admin / Supervisor, retention 30/90 ngày (J-02), sao lưu DB hằng ngày, nâng cấp có migration, contract test 119 bài, test tải (máy dev p95 50–80 ms), log che token | [lat-05-van-hanh.md](01-packing-mvp/lat-05-van-hanh.md) | ✅ xong T-19, đã commit (staging local 15/15 bước); chưa test trên server kho: khôi phục sao lưu, WHEP qua LAN, root cert máy trạm, NAS, nâng cấp / rollback, tải 1 giờ + camera thật | Draft |
