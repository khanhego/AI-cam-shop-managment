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
| 01-packing-mvp | 1 — Quét đóng gói (M1) | Đăng nhập + phân quyền, station + camera, quét mở/đóng, lệch mã, cảnh báo đơn, khay Cam 2 khi quét, J-07, realtime, màn S0–S6, D1, D6, D12 | [lat-01-quet-dong-goi.md](01-packing-mvp/lat-01-quet-dong-goi.md) | ✅ xong (+ FE T-37, T-40 làm sớm), đang sửa theo review, chưa commit | Draft |
| 01-packing-mvp | 2 — Video bằng chứng (M2) | Cắt clip, tra cứu, xuất MP4, dashboard ngày | — | ⬜ chưa làm | — |
| 01-packing-mvp | 3 — Cam 2 + duyệt (M3) | Vision đọc khay, duyệt trên D13, đóng gói lại, ROI, live view | — | ⬜ chưa làm | — |
| 01-packing-mvp | 4 — Nguồn đơn (M4) | Shopee, nhập CSV, người dùng, nhật ký | — | ⬜ chưa làm | — |
| 01-packing-mvp | 5 — Hoàn thiện (M5) | Contract test, test tải, E2E, compose production | — | ⬜ chưa làm | — |
