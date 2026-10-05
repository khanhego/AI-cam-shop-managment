# Lát 2 — Video bằng chứng (M2) — Giải thích nghiệp vụ

| Trường | Giá trị |
|---|---|
| Item / lát | `01-packing-mvp` · lát 2 (milestone M2 Video bằng chứng, [03-plan §4](../../ai/items/01-packing-mvp/03-plan.md)) |
| Yêu cầu | FR-02.01..07, 02.09; FR-07.01..04; FR-09.01; BR-09, BR-16 (clip cho phiên bỏ dở); NFR-03; AC-02, 08, 11, 15, 16, 18, 20 — [01-srs](../../ai/items/01-packing-mvp/01-srs.md) |
| Task | BE: T-5, T-14, T-21, T-15, T-18 · FE: T-51, T-52, T-53, T-54 (T-40 đã làm ở M1) |
| Code | `ai-cam-be`: `4caa414`, `74a3aea`, `ebcc635`, `dadf93c`, `e9ef363`, `1926eb6` · `ai-cam-fe`: `83b459e`, `3323be6`, `4befee3`, `555d891`, `272c9dc`; sửa review G3: be `80f872d` (F1, F7), `57f378e` (F2) (nhánh `feat/01-packing-mvp`) |
| Người đọc | Dev mới vào dự án, reviewer, QA |
| Tác giả | khanhtt (agent soạn) |
| Reviewer | PO (đúng nghiệp vụ) · Tech lead (đúng code) |
| Trạng thái | Draft |
| Last update | 2026-10-05 · Dev (đối chiếu code sau G3: J-01 tạo đủ dòng clip, J-02 giữ video thô phiên clip lỗi, bản ghép căn giờ thực, D8 đã có) |

## TL;DR

- Camera ghi **liên tục**. Khi phiên đóng gói kết thúc, hệ thống cắt một clip cho Cam 1 và một clip cho Cam 2, phủ từ 5 giây trước lúc mở phiên tới 5 giây sau lúc đóng phiên. Clip cắt bằng stream copy, không encode lại, có SHA-256, chỉ đọc.
- CSKH tra mã vận đơn ở D3 → xem clip ở D4 → bấm "Giữ clip" khi có khiếu nại → xuất MP4 có chữ (mã vận đơn, mã đơn, giờ, station) kèm file JSON hash để gửi sàn.
- Video thô xóa sau 30 ngày, clip sau 90 ngày, trừ clip đang giữ. Bản xuất chỉ giữ 24 giờ vì tạo lại được bất cứ lúc nào (DEC-58).
- D2 cho quản lý xem số liệu đóng gói trong ngày, tự cập nhật ≤ 5 giây.
- Chưa kiểm trên phần cứng thật: xuất bản 1080p H.265 có thể vượt AC-08 (§8).

## 0. Giải thích đơn giản

Đây là phần **"hộp đen" của bàn đóng gói**: camera quay suốt cả ngày như camera an ninh. Khi một kiện đóng xong, hệ thống tự cắt đúng đoạn phim của kiện đó ra và cất vào kho bằng chứng. Khi khách khiếu nại "hộp rỗng", "thiếu hàng", CSKH chỉ cần gõ mã vận đơn là có ngay đoạn phim để gửi sàn.

**Ý tưởng chính.** Lát trước đã có hai mốc giờ cho mỗi kiện: lúc quét mở và lúc quét đóng. Lát này dùng hai mốc đó để làm 5 việc:
1. Cắt đoạn phim của từng kiện từ cả hai camera.
2. Cho tra cứu và xem lại theo mã vận đơn.
3. Cho "giữ" đoạn phim khi có khiếu nại, để nó không bị tự xóa.
4. Xuất ra một file video có chữ in trên hình để gửi sàn.
5. Tự dọn phim cũ để ổ cứng không đầy.

### Bước 1 — Quay liên tục, không bật tắt theo kiện
- Làm gì: mỗi camera ghi thành từng đoạn 1 phút, nối tiếp nhau, cả ngày.
- Vì sao: nếu chỉ bật quay lúc quét mở, vài giây đầu (lúc người đóng gói cầm hàng) sẽ bị mất. Quay liên tục thì muốn lấy từ lúc nào cũng có.
- Sự cố thì sao: camera mất tín hiệu giữa chừng thì phim có lỗ hổng. Kiện bị ảnh hưởng được đánh dấu "Thiếu video" để CSKH biết trước.

### Bước 2 — Đóng phiên xong, tự cắt phim của kiện
- Làm gì: khoảng 10 giây sau khi quét đóng, hệ thống cắt hai đoạn phim: một của camera nhìn từ trên (Cam 1), một của camera nhìn khay (Cam 2). Mỗi đoạn lấy dư 5 giây ở đầu và 5 giây ở cuối.
- Vì sao dư 5 giây: đồng hồ camera và máy chủ có thể lệch nhau chút ít. Lấy dư thì không bao giờ hụt mất khoảnh khắc bỏ hàng vào hộp.
- Vì sao "cắt chứ không làm lại phim": cắt nguyên si thì nhanh (dưới 1 giây) và đoạn phim giống hệt bản camera quay. Hệ thống ghi lại "dấu vân tay" của file (một chuỗi ký tự tính từ nội dung file). Ai sửa dù một khung hình thì dấu vân tay đổi ngay.
- Sự cố thì sao: chưa đủ phim thì hệ thống chờ rồi thử lại, tối đa 3 lần. Vẫn hỏng thì đoạn phim mang trạng thái "lỗi", quản lý bấm "Thử lại" ở trang chi tiết. Phiên bị hủy hay bỏ dở cũng được cắt phim, vì đó cũng là bằng chứng.
- Không bỏ sót camera nào: trước khi cắt, hệ thống ghi sẵn một dòng "đang cắt" cho **mỗi** camera của phiên. Máy chủ chết giữa chừng thì việc dọn dẹp 5 phút một lần thấy phiên còn thiếu và cắt lại. Phim quay liên tục quanh phiên có đoạn cắt lỗi được giữ lại (không bị dọn sau 30 ngày) trong suốt hạn giữ clip, để "Thử lại" vẫn còn phim mà cắt.

### Bước 3 — Tra cứu và xem
- Làm gì: CSKH gõ hoặc quét mã vận đơn (hoặc mã đơn sàn) ở trang "Tra cứu đơn". Nếu ra đúng một kiện thì mở thẳng trang chi tiết. Trang chi tiết có danh sách sản phẩm, các lần đóng gói, ba tab xem phim "Cam 1", "Cam 2", "Ghép" (hai camera cạnh nhau).
- Vì sao: khi khách khiếu nại, thời gian là tiền. CSKH cần thấy phim trong vài giây chứ không phải tua 8 tiếng phim.
- Đường xem phim có hạn 10 phút và gắn với người xem, để link lỡ lộ ra ngoài cũng hết tác dụng. Mỗi lần bấm phát được ghi vào nhật ký.

### Bước 4 — "Giữ clip" khi có khiếu nại
- Làm gì: CSKH bấm "Giữ clip". Đoạn phim đó không bị tự xóa nữa, kể cả sau 90 ngày, tới khi có người bấm "Bỏ giữ".
- Vì sao: khiếu nại trên sàn có thể kéo dài. Mất phim giữa chừng là thua khiếu nại.

### Bước 5 — Xuất file gửi sàn
- Làm gì: bấm "Xuất clip", chọn Cam 1, Cam 2 hoặc Ghép. Hệ thống làm ra một file MP4 có chữ in trên hình: dòng trên là mã vận đơn, mã đơn và tên bàn; dòng dưới là giờ thực chạy từng giây. Kèm theo là một file thông tin có dấu vân tay của phim gốc và của file xuất.
- Vì sao có chữ: nhân viên sàn xem phim cần biết ngay đây là kiện nào, lúc nào. Chữ in thẳng vào hình nên không tách ra được.
- Vì sao phim gốc không có chữ: in chữ là phải làm lại phim, phim gốc mất tính "nguyên bản". Vì vậy chỉ bản xuất mới có chữ.
- Bản "Ghép" khi một camera bị mất hình giữa chừng: hai nửa vẫn khớp đúng từng giây theo giờ thực; đoạn thiếu là khung đen chữ "Không có video". Trên hình có thêm dòng "Có đoạn không có video", file thông tin liệt kê từng đoạn thiếu. Bản ghép kiểu này không có tiếng.
- File xuất chỉ để 24 giờ: người dùng tải về máy ngay. Cần lại thì bấm xuất lần nữa, miễn phim gốc còn.

### Bước 6 — Tự dọn phim cũ
- Làm gì: 2 giờ sáng mỗi ngày, hệ thống xóa phim quay liên tục cũ hơn 30 ngày và đoạn phim kiện cũ hơn 90 ngày, trừ đoạn đang "giữ". Admin đổi được số ngày; lần dọn sau dùng số mới.
- Vì sao: 2 bàn quay cả ngày tốn khoảng 36 GB mỗi ngày. Không dọn thì vài tuần là đầy ổ và camera ngừng ghi.

### Bước 7 — Trang tổng quan trong ngày
- Làm gì: quản lý mở trang "Tổng quan", thấy số kiện đã đóng, số lần từng lệch mã, số phiên bỏ dở, số phiên hủy trong ngày. Thêm hai số "việc còn tồn": kiện đã đóng mà chưa bàn giao, đơn bị hủy sau khi đã đóng. Bên dưới là tình trạng từng bàn và mục "Cần xử lý" (camera mất tín hiệu, camera lệch giờ, clip cắt lỗi, ổ gần đầy).
- Vì sao hai số "còn tồn" không theo ngày: kiện đóng hôm qua chưa giao thì hôm nay vẫn phải xử lý.
- Số liệu tự cập nhật trong vòng 5 giây sau khi một bàn đóng xong một kiện, không cần tải lại trang.

**Ví dụ một vòng đầy đủ.** Ngày 05/10, 9 giờ 05 phút 10 giây, chị Lan ở bàn số 1 quét phiếu "SPXTST0000012", bỏ 3 sản phẩm vào hộp, 9 giờ 07 phút 20 giây quét đóng. Khoảng 9 giờ 07 phút 29 giây, hai đoạn phim dài 2 phút 20 giây (từ 9:05:05 tới 9:07:25) đã sẵn sàng. Trang tổng quan của anh Minh (quản lý) tăng "Đã đóng gói" lên 1. Ba ngày sau, khách báo trên Shopee: "nhận hộp thiếu 1 món". Chị Hoa (CSKH) quét mã vận đơn trên phiếu khách gửi ảnh, trang chi tiết mở ra. Chị xem tab "Ghép": rõ ràng 3 món được bỏ vào hộp. Chị bấm "Giữ clip" để đoạn phim không bị xóa trong lúc khiếu nại kéo dài. Chị bấm "Xuất clip", chọn "Ghép". Khoảng 20 giây sau có file MP4 với dòng chữ "SPXTST0000012 · Đơn 2410ABCDEF · Station 01" và giờ chạy "05/10/2026 09:05:05". Chị tải file MP4 và file thông tin về máy, gửi lên Shopee. Ngày hôm sau, file xuất trên máy chủ tự xóa. Phim gốc vẫn còn vì đang giữ.

**Lưu ý.**
- Chưa thử với camera thật. Toàn bộ chạy với camera giả phát phim mẫu 720p. Với phim 1080p chuẩn nén H.265 (loại camera kho có thể dùng), thời gian xuất đo trên máy dev là 2–3 phút, quá xa mức yêu cầu. Phải đo lại khi có camera và máy chủ kho.
- Chưa thử trên Safari và iPhone; mới chạy trên Chromium.
- Màn cài đặt lưu trữ (D8) đã có ở lát 4: Admin đổi số ngày trên giao diện.

## 1. Vì sao cần

Vấn đề gốc là P1 (không có video đóng gói để chứng minh khi khiếu nại). Lát 1 mới có mốc giờ; không có lát này thì vẫn phải tua video thô 24/7 bằng tay, thường quá hạn khiếu nại của sàn.

| Lát này làm (Goals) | Lát này không làm (Non-goals — ở lát / phase nào) |
|---|---|
| Index video thô, cắt clip Cam 1/Cam 2 khi phiên kết thúc, SHA-256, chỉ đọc, `VIDEO_INCOMPLETE` (T-14) | Vision đọc mã trên khay Cam 2 (T-12, M3) |
| Tra cứu D3, chi tiết D4, phát clip URL ký (T-14, T-52, T-53) | Link chia sẻ ra ngoài, xem video thô (FR-07.05, 07.06 — Phase 3) |
| Giữ clip, cắt lại clip lỗi, retention 30/90 ngày (T-21, T-53) | Màn D8 Lưu trữ + sức khỏe (T-58, M4) — API-80, 81 đã có |
| Xuất MP4 overlay + `info.json`, ghép 2 camera (T-15, T-54) | Sao lưu clip lên lưu trữ thứ hai (FR-02.08 — Phase 3) |
| D2 Tổng quan ngày + WS-02 (T-18, T-51) | Báo cáo năng suất / hoàn / khiếu nại (FR-09.02..04 — Phase 3); hồ sơ khiếu nại (Phase 2, MVP dùng cờ "giữ") |

## 2. Ai dùng, ở đâu, khi nào

| Vai | Màn hình / điểm vào | Lúc nào dùng |
|---|---|---|
| CSKH | `/admin` (D2) → "Tra cứu đơn" `/admin/packages` (D3) → `/admin/packages/:id` (D4) | Khi có khiếu nại: xem clip, giữ clip, xuất MP4 |
| Supervisor | D2, D3, D4 | Theo dõi trong ca; bấm "Thử lại" cho clip cắt lỗi |
| Admin | Như Supervisor + API-80 cài đặt retention | Đổi số ngày giữ video |
| Station (tài khoản bàn) | S1 "phiên gần đây" (lát 1) | Xem nhanh clip phiên của bàn mình trong ngày |
| Job J-10 (mỗi phút), J-01, J-03, J-02 (02:00 VN), J-11 (5 phút) | Nền | Index segment; cắt clip; encode bản xuất; retention; đẩy lại clip còn thiếu |

## 3. Tình huống thực tế

| # | Tình huống | Hệ thống làm gì | Vì sao |
|---|---|---|---|
| 1 | Chị Lan đóng phiên `SPXTST0000012` lúc 9:07:20 | J-01 chạy lúc ≈ 9:07:28 (đóng + 5 + 3 giây), cắt `[9:05:05, 9:07:25]` cho Cam 1, Cam 2; clip READY sau ≈ 7–9 giây; WS `session.clip_ready` | FR-02.02, AC-02, NFR-03 (≤ 60 giây) |
| 2 | Cam 2 mất tín hiệu 20 giây giữa phiên | Phiên + clip Cam 2 mang cờ `VIDEO_INCOMPLETE`; D4 hiện chip "Thiếu video" | Khe hở > 1,5 giây; CSKH biết trước clip không trọn vẹn |
| 3 | Bàn số 2 chưa khai báo Cam 2 | Clip Cam 2 FAILED ngay, không thử lại; D2 "Cần xử lý" có mục clip lỗi | Thử lại không giúp được gì; báo để Admin sửa cấu hình |
| 4 | MediaMTX khởi động lại, ngừng ghi một camera | J-10 phát hiện path bị mất, thêm lại | Không để camera ngừng ghi âm thầm (DEC-102) |
| 5 | Chị Hoa (CSKH) giữ clip ngày 01/10; 90 ngày sau | J-02 bỏ qua clip đang giữ; clip khác cùng ngày bị xóa, audit `DELETE_CLIP` | BR-09, AC-15 |
| 6 | Admin tăng retention clip 90 → 180 ngày | Clip 100 ngày tuổi không bị xóa ở lần chạy sau | AC-20: số ngày đọc từ setting lúc chạy, không lưu sẵn trong clip |
| 7 | CSKH mở D4 của clip đã bị xóa | "Clip đã bị xóa ngày … theo chính sách lưu trữ 90 ngày" | 410 `CLIP_DELETED`; `retention_until` = ngày đã xóa (DEC-57) |
| 8 | Anh Minh (Supervisor) mở bản xuất do chị Hoa tạo | 404 | Bản xuất là của người tạo (+ ADMIN); không lộ sự tồn tại (DEC-57) |
| 9 | Chị Hoa quay lại tải bản xuất hôm qua | Bản xuất đã bị xóa sau 24 giờ; bấm xuất lại | DEC-58: tạo lại được khi clip gốc còn |
| 10 | Phiên mở rồi bỏ quên 30 phút (`ABANDONED`) | Vẫn cắt clip | AC-16: phiên bỏ dở cũng cần bằng chứng |
| 11 | Chị Hoa quét mã vận đơn (hoặc gõ mã đơn sàn) ở D3 | Tìm theo mã, lọc theo ngày / trạng thái / cờ; đúng một kết quả → mở thẳng D4 | FR-07.01, FR-07.03 |
| 12 | Chị Hoa mở D4 | Thấy sản phẩm, các lần đóng gói, timeline trạng thái, clip từng camera; phát clip | FR-07.02 |
| 13 | Chị Hoa chọn tab "Ghép" / xuất "Ghép" | Cam 1 và Cam 2 cạnh nhau, cùng giờ thực | FR-02.07 |
| 14 | Worker chết sau khi cắt xong Cam 1, chưa kịp cắt Cam 2 | Dòng clip Cam 2 đã có sẵn (`PENDING`); J-11 (5 phút) thấy phiên còn clip `PENDING` / thiếu vai → chạy lại J-01 | G3-F1: không có phiên "chỉ một camera" mà không ai biết |
| 15 | Clip Cam 2 của phiên ngày 01/10 FAILED; 30 ngày sau J-02 dọn video thô | Giữ lại video thô `[mở − đệm, đóng + đệm]` của camera đó, tới khi hết hạn giữ clip (90 ngày) | G3-F7: "Thử lại" (API-46) còn phim để cắt |
| 16 | Cam 2 mất 3 giây giữa phiên, chị Hoa xuất "Ghép" | Hai nửa căn theo giờ thực; 3 giây thiếu là khung đen "Không có video"; overlay "Có đoạn không có video"; `info.json.video_gaps` có 1 mục; bản xuất không có tiếng | G3-F2 (DEC-142 02a, 02 v0.7): bằng chứng ghép phải cùng giờ từng khung |

## 4. Luồng ví dụ từ đầu đến cuối

```mermaid
sequenceDiagram
    participant ST as Station 01 (chị Lan)
    participant API as api
    participant W as worker (video)
    participant WE as worker-export
    participant D as Dashboard (chị Hoa, CSKH)
    Note over W: J-10 mỗi phút index segment 60 giây
    ST->>API: quét đóng SPXTST0000012 (9:07:20)
    API-->>D: WS report.updated → D2 +1 (≤ 5 giây)
    API->>W: J-01 hẹn chạy sau đóng + 5 + 3 giây
    W->>W: concat -c copy [9:05:05, 9:07:25], SHA-256, chmod chỉ đọc
    W-->>ST: WS-01 session.clip_ready
    W-->>D: WS-02 session.clip_ready
    D->>API: 3 ngày sau: D3 tìm mã → D4 (API-30, 31)
    D->>API: phát clip (API-40 → API-41 Range, audit VIEW_CLIP)
    D->>API: Giữ clip (API-42)
    D->>API: Xuất Ghép (API-43 → 202)
    API->>WE: J-03 encode H.264 + drawtext + hstack
    WE-->>D: WS export.updated (mỗi 5 %); D poll API-44 mỗi 2 giây
    D->>API: tải video.mp4 + info.json (API-45, audit DOWNLOAD_EXPORT)
    Note over WE: 24 giờ sau J-10 xóa bản xuất
```

1. 9:07:20 chị Lan đóng phiên (lát 1). `api` hẹn J-01 sau commit và phát `report.updated`; D2 của anh Minh tăng "Đã đóng gói" sau ≤ 5 giây (TC-09.03).
2. J-01 cắt thẳng từ file trên đĩa, gồm cả segment MediaMTX đang ghi, không chờ segment đóng (DEC-101). Clip lưu ở `clips/2026/10/05/<session_id>-CAM1.mp4`, kèm `timeline` (giây trong clip → giờ thực).
3. Ngày 08/10 chị Hoa quét mã ở D3, ra một kiện nên mở thẳng D4. Chị xem tab Ghép, bấm "Giữ clip" (gọi API-42 cho mọi clip READY của phiên).
4. Chị bấm "Xuất clip" → Ghép. J-03 chạy trên `worker-export` (concurrency 1, không chen với cắt clip). Bản xuất READY, chị tải `video.mp4` + `info.json` (SHA-256 bản xuất + SHA-256 clip nguồn).
5. 09/10 J-10 xóa thư mục `exports/<id>/` và dòng `export`. Clip gốc còn vì đang giữ.

## 5. Quy tắc nghiệp vụ và lý do

| Quy tắc | Con số / điều kiện | Vì sao | ID |
|---|---|---|---|
| Ghi liên tục, cắt theo mốc | Segment fMP4 60 giây; clip `[mở − 5 s, đóng + 5 s]` | Không mất đầu phiên; bù lệch giờ nhỏ | FR-02.01, 02.02, AC-02, ADR-003 |
| Clip sẵn sàng nhanh | ≤ 60 giây p95 (đo được 6,7–9,2 giây) | CSKH / station xem ngay | NFR-03 |
| Clip gốc bất biến | Stream copy, SHA-256, file chỉ đọc, không có API sửa / xóa | Chứng minh không chỉnh sửa | FR-02.04, 02.05, AC-11, ADR-008, DEC-27 |
| Đánh dấu thiếu video | Khe hở > 1,5 giây hoặc camera OFFLINE giữa phiên → `VIDEO_INCOMPLETE` | Không đưa bằng chứng thiếu mà không báo | FR-02.02, DEC-102 |
| Cắt cả phiên hủy / bỏ dở | Mọi phiên kết thúc | Phiên bỏ dở cũng có thể bị hỏi lại | AC-16, BR-16 |
| Đủ dòng clip cho mọi camera | J-01 tạo dòng `PENDING` cho mọi vai (kể cả vai chưa cấu hình → FAILED) trong một transaction **trước** khi cắt; J-11 chạy lại J-01 cho phiên thiếu vai / còn `PENDING` | Worker chết giữa chừng không để lại phiên thiếu clip âm thầm | FR-02.02, G3-F1 |
| Giữ video thô cho clip lỗi | J-02 không xóa segment chồng `[mở − đệm, đóng + đệm]` của phiên có clip FAILED / PENDING, trong hạn giữ clip | Còn phim để cắt lại | FR-02.06, G3-F7 |
| Tra cứu theo mã | Mã vận đơn hoặc mã đơn sàn; lọc ngày (≤ 92 ngày), trạng thái, cờ; 1 kết quả → D4 | CSKH tìm trong vài giây | FR-07.01, FR-07.03 |
| Chi tiết kiện | Sản phẩm, phiên, clip, timeline trạng thái | Đủ ngữ cảnh khi trả lời khiếu nại | FR-07.02 |
| Xem / xuất ghép | Cam 1 + Cam 2 cạnh nhau, căn giờ thực; khe hở > 0,5 giây → khung đen "Không có video" + `video_gaps` | Một file cho thấy cả tay người đóng gói và phiếu trên khay | FR-02.07, DEC-142 (02a) |
| Thử lại có giới hạn | 3 lần (chưa đủ video: 10 giây; lỗi FFmpeg: 30 giây) rồi FAILED; ADMIN/SUPERVISOR cắt lại | Không lặp vô hạn; người có trách nhiệm quyết định | FR-02.02, API-46 |
| Retention | Thô 30 ngày, clip 90 ngày, chạy 02:00 VN; đọc setting lúc chạy | Cân bằng ổ đĩa và hạn khiếu nại | FR-02.06, DEC-3, AC-20 |
| Clip giữ không bị xóa | `held = true` → bỏ qua | Khiếu nại kéo dài | FR-02.09, BR-09, AC-15 |
| Bản xuất có overlay | Mã vận đơn, mã đơn sàn, tên station, giờ VN từng giây; không có mã nhân viên | Sàn đọc được ngay; tài khoản station dùng chung | FR-02.03, FR-07.04, DEC-1 |
| Bản xuất giữ 24 giờ | `EXPORT_TTL_HOURS` = 24 | Tạo lại được; tránh đầy ổ | DEC-58 |
| URL video có hạn | 10 phút, ký theo người xin URL; audit xem / xuất / tải | Link lộ không dùng lại được; truy vết | 02 §8, NFR-15 |
| Station chỉ xem clip của mình | Phiên của station đó, bắt đầu trong ngày | Bàn đóng gói không xem kho bằng chứng | 01 §5.1 |
| D2 đếm theo phiên | 4 thẻ theo ngày (giờ VN); 2 thẻ là số hiện tại; phiên `SUPERSEDED` không đếm | Không đếm một kiện hai lần khi đóng gói lại | FR-09.01, AC-18, DEC-59 |

## 6. Điểm dễ hiểu nhầm

- **"Clip sẵn sàng sau ~9 giây" có phải chờ segment 60 giây đóng?** Không. J-01 đọc cả file MediaMTX đang ghi (fMP4 ghi từng phần 1 giây), chỉ chờ thêm 3 giây sau `đóng + 5` (DEC-101).
- **`clip.start_at` có đúng bằng `mở − 5 s`?** Không hẳn: lưu giờ thực clip phủ, đã lùi về keyframe gần nhất, nên có thể sớm hơn 1–2 giây.
- **Giờ trên bản xuất lấy từ đâu?** Từ `clip.timeline`, không cộng dồn từ `start_at`. Bản ghép khi một clip có khe hở được **căn theo giờ thực**: mỗi nửa dựng thành chuỗi đoạn video + khoảng trống, khoảng trống là khung đen chữ "Không có video", một đồng hồ chung chạy từ đầu cửa sổ `[max(start), min(end)]`. Mọi layout có khe > 0,5 giây đều có dòng "Có đoạn không có video" và `info.json.video_gaps[] {camera_role, from, to, seconds}`. Bản căn giờ không có âm thanh (DEC-142 02a; 02 v0.7).
- **J-01 tạo dòng clip trước hay sau khi cắt?** Trước: dòng `PENDING` cho mọi camera ghi trong một transaction rồi mới cắt từng camera. Nhờ vậy J-11 phát hiện được phiên còn thiếu (G3-F1).
- **Vì sao clip FAILED trả `409 CLIP_NOT_READY` chứ không có mã riêng?** Giữ tương thích contract; FE phân biệt bằng `details.status` (DEC-57).
- **Vì sao 2 thẻ D2 không về 0 khi chọn ngày trống?** "Chưa bàn giao" và "Hủy sau khi đóng" là việc tồn hiện tại, không theo ngày (DEC-59).
- **D2 có thể trễ?** API-32 cache 5 giây; khi có `report.updated`, BE xóa cache trước khi phát (lỗi E2E thật bắt được, sửa ở `1926eb6`).
- **Retention xóa video thô theo DB hay theo đĩa?** Theo đĩa (giờ trong tên file), nên dọn cả video của camera đã xóa khỏi DB (DEC-103).

## 7. Bản đồ nghiệp vụ → code

Đường dẫn BE tính từ `ai-cam-be/src/aicam/`, test BE từ `ai-cam-be/tests/`. FE tính từ `ai-cam-fe/src/`, E2E từ `ai-cam-fe/e2e/`.

| Khái niệm nghiệp vụ | Code | Test chứng minh |
|---|---|---|
| Index segment, đối soát path MediaMTX (J-10) | `modules/media/segments.py`, `media/service.py` (`index_segments`, `index_camera`), `modules/stations/service.py` (`reconcile_mediamtx`), `workers/tasks.py` | `unit/test_media_logic.py`: `test_parse_start_from_mediamtx_path`, `test_is_closed_last_segment_by_mtime`; `integration/test_media_clips.py`: `test_index_segments_adds_closed_and_prunes_vanished`, `test_reconcile_mediamtx_readds_missing_and_drops_orphans` |
| Cắt clip ±5 giây, stream copy, hash, chỉ đọc (J-01) | `media/service.py` (`build_session_clips`, `_ensure_clip_rows`, `sessions_missing_clips`, `clip_rel_path`), `media/ffmpeg.py`, `media/segments.py` (`plan_cut`), `media/jobs.py` | `test_build_clips_cover_window_hash_and_readonly`, `test_waits_until_padding_after_close`, `test_closing_or_cancelling_enqueues_clip_job`, `test_rerun_keeps_ready_clip`, `test_rows_for_all_roles_created_before_cutting`, `test_j11_rebuilds_session_missing_one_role`; `test_cut_command_is_stream_copy`, `test_plan_cut_across_boundary`; `qa/test_m2_live.py`: `test_clips_ready_within_60s`, `test_clip_hash_and_readonly_on_disk` |
| Thiếu video, thử lại, FAILED | `media/segments.py` (`gaps`, `is_incomplete`), `media/service.py` | `test_missing_segment_flags_video_incomplete`, `test_camera_offline_flags_open_session`, `test_retry_while_recording_then_fail_without_camera`, `test_station_without_camera_fails_immediately`; `test_gaps_detect_missing_video`, `test_tiny_boundary_gap_is_tolerated` |
| Phát clip URL ký, audit xem | `media/signing.py`, `media/service.py` (`play_url`, `open_clip_media`), `media/router.py` | `test_play_url_roles_and_states`, `test_media_signature_range_and_view_audit`, `test_no_api_to_modify_or_delete_clip`; `test_signed_clip_url_roundtrip_and_expiry`, `test_view_audit_only_from_first_byte`; `qa/test_m2_live.py::test_play_url_and_range` |
| Giữ clip, cắt lại, retention (J-02) | `media/service.py` (`set_hold`, `rebuild`, `enforce_retention`, `protected_raw_ranges`, `sweep_raw_files`), `workers/celery_app.py` | `integration/test_media_retention.py`: `test_hold_and_unhold`, `test_hold_permissions_and_deleted`, `test_retention_keeps_held_clip_deletes_others`, `test_retention_uses_current_setting`, `test_retention_raw_video`, `test_rebuild_failed_clip`, `test_retention_keeps_raw_video_of_failed_clip`, `test_retention_commits_before_unlink_and_retries_file`; `qa/test_m2_live.py::test_hold_and_rebuild_permissions` |
| Xuất MP4 overlay + JSON (J-03), giữ 24 giờ; ghép căn giờ thực, `video_gaps` | `media/exports.py` (`create_export`, `render_export`, `clock_pieces`, `align_parts`, `wall_gaps`, `cleanup_expired`), `media/ffmpeg.py` (`aligned_export_command`) | `integration/test_media_exports.py`: `test_create_export_validates_clips`, `test_pending_clip_blocks_export`, `test_get_export_owner_admin_and_download`, `test_clock_pieces_skip_and_gap`, `test_render_export_side_by_side`, `test_render_export_fails_cleanly`, `test_align_parts_lines_up_wall_clock`, `test_aligned_export_command_runs`, `test_render_side_by_side_with_gap_aligns_and_reports`; `qa/test_m2_live.py::test_export_side_by_side` |
| Tra cứu, chi tiết kiện (API-30/31) | `modules/orders/packages.py`, `orders/router.py` | `integration/test_packages_api.py`: `test_search_by_tracking_or_order_sn`, `test_search_filters_by_session_date_status_and_flag`, `test_search_rejects_range_over_92_days`, `test_detail_sessions_clips_and_timeline`, `test_station_cannot_search` |
| Số liệu ngày, cài đặt, sức khỏe, J-11 | `modules/reports/service.py`, `modules/settings/service.py`, `workers/tasks.py` (`housekeeping`) | `integration/test_reports_settings.py`: `test_daily_counts`, `test_daily_cache_dropped_on_report_updated`, `test_settings_get_put_and_audit`, `test_health`, `test_housekeeping_pieces`; `qa/test_m2_live.py::test_daily_settings_health` |
| D2 Tổng quan + WS-02 | FE `features/reports/DailyPage.tsx`, `features/shell/useDashboardSocket.ts` | `features/reports/DailyPage.test.tsx` ("TC-09.01…", "TC-09.04…"), `features/shell/useDashboardSocket.test.tsx`; E2E `real/admin-uc03.spec.ts` ("TC-09.03: D2 tự cập nhật…") |
| D3 Tra cứu | FE `features/orders/PackagesPage.tsx`, `PackageFilters.tsx`, `filters.ts` | `features/orders/PackagesPage.test.tsx` (TC-07.01, 07.02, 07.03, 07.05, 07.13..07.16), `filters.test.ts` |
| D4 Chi tiết + phát + giữ + cắt lại | FE `features/orders/PackageDetailPage.tsx`, `SessionPanel.tsx`, `HoldToggle.tsx`, `shared/media/ClipPlayer.tsx` | `features/orders/PackageDetailPage.test.tsx` (TC-07.06, 07.11, 02.06, 02.10, 02.11, FR-02.09, SIGNATURE_INVALID) |
| Xuất ở D4 | FE `features/orders/ExportDialog.tsx`, `exportLayouts.ts`, `lib/api/clips.ts` | `features/orders/ExportDialog.test.tsx` (TC-07.07, 07.10); E2E `real/admin-uc03.spec.ts` ("TC-07.01 + TC-07.07 (UI)…"), `mock/admin-uc03.spec.ts` |
| Đo hiệu năng cắt / xuất (spike S3) | `ai-cam-be/scripts/spike_s3.py`, `spike_s3_encode.sh` | Kết quả ở [02a mục "Spike S3"](../../ai/items/01-packing-mvp/02a-be-spec.md) |

## 8. Giới hạn hiện tại và giả định

| Giới hạn / giả định | Ảnh hưởng | Khi nào xử lý |
|---|---|---|
| **AC-08 với camera 1080p H.265 thật chưa test.** Nguồn giả 1080p H.265: ghép 106–167 giây; 720p: 1 camera ≤ 16,4 giây, ghép 17,8–28,4 giây (RB-7) | Có thể không đạt "xuất ≤ 30 giây tới điện thoại" | Đo lại ở T-4 (M3) trên server kho; hạ `EXPORT_PRESET` / `EXPORT_SIDE_SCALE`, sub-stream 720p hoặc tăng tốc phần cứng |
| Chỉ chạy với camera giả (`fake-cams`, phim mẫu 720p) | Clip, overlay giờ, lệch giờ chưa kiểm với OSD camera thật | T-4 |
| Safari / iOS chưa test (mới Chromium qua Playwright) | Phát clip / tải file trên iPhone chưa chắc | Trước G4 |
| ~~Chưa có màn D8~~ — đã có ở lát 4 (T-58, `83cc236`) | Admin đổi retention trên D8 | Đóng |
| Chưa có metric Prometheus; chỉ log `clip_built` (`build_s`, `after_close_s`) | Không có biểu đồ thời gian cắt clip | Sau MVP |
| Retention 30/90 ngày là đề xuất, chủ shop chưa xác nhận | Có thể phải đổi số ngày | Q13 (01-srs) |
| Sàn có chấp nhận định dạng / độ dài file xuất không | Chưa thử với khiếu nại thật | RK-06 |
| Dev giữ video thô 1 giờ (sau sự cố đầy ổ 64 GB) | Không thử được retention thô 30 ngày trên stack dev; test dùng đồng hồ giả | — |

## Liên kết

- SRS: [01-srs.md](../../ai/items/01-packing-mvp/01-srs.md) FR-02.*, FR-07.*, FR-09.01, BR-09, AC-02, 08, 11, 15, 16, 18, 20
- Spec: [02 §6](../../ai/items/01-packing-mvp/02-tech-spec.md) API-30..32, 40..46, 80, 81, WS-02 (v0.3, DEC-57, DEC-58) · [02a](../../ai/items/01-packing-mvp/02a-be-spec.md) J-01..J-03, J-10, J-11, DEC-101..105 · [02b-admin](../../ai/items/01-packing-mvp/02b-fe-spec-admin.md) D2, D3, D4, DEC-71..77
- Kiến trúc: [architecture.md §6, §8.2](../../ai/system/architecture.md) · [ADR-008](../../ai/system/decisions/ADR-008-immutable-evidence-clips.md)
- Test cases: [04](../../ai/items/01-packing-mvp/04-test-cases.md) TC-02.*, TC-07.*, TC-09.* · bằng chứng: `evidence/m2-api-live.txt`, `evidence/m2-e2e-real.txt`
