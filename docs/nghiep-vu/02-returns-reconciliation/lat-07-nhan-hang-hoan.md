# Lát 7 — Nhận hàng hoàn tại bàn + hardening bàn đóng gói (M7) — Giải thích nghiệp vụ

| Trường | Giá trị |
|---|---|
| Item / lát | `02-returns-reconciliation` · lát 7 (milestone M7, [03-plan §4](../../ai/items/02-returns-reconciliation/03-plan.md)) |
| Yêu cầu | FR-04.01..05, 04.07..10, 04.12, 04.13 (mở phiên chưa xác định); FR-02.11, FR-03.13, 03.14, 03.15; BR-07, 21, 22, 23, 24, 28; EX-R1..R16 (trừ R7, R10 — lát 9); AC-22, 29, 31, 32, 33, 34, 36, 39 — [01-srs](../../ai/items/02-returns-reconciliation/01-srs.md) v0.5 |
| Task | BE: T-104, T-107, T-108, T-117, T-109 (+ T-121 ở M9: ảnh từ khung vision) · FE: T-132..T-137. "Kiện khác — vẫn ghi hình" (API-105) có FE ở M7 chạy mock, BE thật ở T-119 (M8) |
| Code | `ai-cam-be`: `d4dca36`, `8ca367b`, `1397352`, `bd0d371`, `6850d73`, `6a01c51` · `ai-cam-fe`: `c88fb6d`, `ca19eaf`, `524881c`, `0a6ffb0`, `d9d408e`, `6ffcf9d`, `f237535` |
| Người đọc | Dev mới vào dự án, reviewer, QA |
| Tác giả | khanhtt (agent soạn) |
| Reviewer | PO (đúng nghiệp vụ) · Tech lead (đúng code) |
| Trạng thái | Draft |
| Last update | 2026-10-06 · Dev |

## TL;DR

- Bàn nhận hoàn: quét mã trên kiện → hệ thống tìm đơn theo thứ tự cứng **mã chiều về → mã vận đơn gốc → mã đơn sàn**, không có thì hỏi sàn ≤ 2 giây (FR-04.01, DEC-202) → mở phiên quay Cam 1.
- Người kiểm kiểm từng dòng sản phẩm, chọn **kết luận** (6 loại), chụp ảnh F2 (≤ 20, ≤ 2 giây), rồi **quét lại mã cùng hồ sơ** để đóng. Chưa có kết luận thì không đóng (BR-07, BR-23).
- Quá 45 phút: có kết luận → tự hoàn tất; chưa có → bỏ dở. Chờ quản lý duyệt không tính giờ (EX-R15).
- Không tìm được đơn → **phiên chưa xác định** với kiện tạm mã `TAM-…`; kiện đã nhận mà thật ra là kiện khác → "Đây là kiện khác — vẫn ghi hình" (EX-R11, R12).
- Vá bàn đóng gói: chữ lệch mã mới (L3), báo cờ Cam 2 ngay sau khi đóng (L4), ảnh lúc đóng gói (L8), đơn hủy giữa phiên báo đỏ (L9).

## 0. Giải thích đơn giản

Đây là phần **"camera chứng kiến lúc mở kiện hoàn"**. Trước đây kiện hoàn về kho được mở tay, không ai quay, không ai ghi lại. Khách gửi trả hộp rỗng hay áo rách thì shop không có gì để cãi với sàn. Lát này biến việc mở kiện hoàn thành một "phiên" có video, có người kiểm, có kết luận rõ ràng, giống như đóng gói ở Phase 1 nhưng theo chiều ngược lại.

**Ý tưởng chính.** Người đứng bàn quét mã hai lần, như đóng gói: lần đầu mở, lần sau đóng. Ở giữa là kiểm hàng. Hệ thống lo 4 việc:
1. Từ mã trên kiện, tìm ra đây là đơn nào, hàng hoàn loại gì.
2. Bắt người kiểm ghi lại nhận được gì, tình trạng ra sao, và chốt một kết luận.
3. Chụp ảnh làm bằng chứng, cho xem ảnh lúc đóng gói để so.
4. Lo các trường hợp lạ: mã không tìm thấy, kiện đã nhận rồi, quên đóng phiên, kiện hoàn bị đưa nhầm sang bàn đóng gói.

### Bước 1 — Bắt đầu ca
- Bàn ở chế độ nhận hoàn mà chưa có tên người kiểm → hiện hộp "Người kiểm hàng hoàn", không đóng được tới khi gõ tên.
- Bàn "Cả hai" có nút "Chuyển sang nhận hàng hoàn" / "Chuyển sang đóng gói" khi rảnh. Màn chờ nhận hoàn có nền xanh lá, ghi "SẴN SÀNG NHẬN HÀNG HOÀN" và số kiện hoàn đã nhận hôm nay.

### Bước 2 — Quét mã trên kiện
- Kiện hoàn có thể mang 3 loại mã: mã vận đơn chiều về (khách gửi trả), mã vận đơn gốc (kiện giao thất bại quay về), hoặc mã đơn của sàn. Hệ thống thử theo đúng thứ tự đó.
- Không thấy trong máy → hỏi sàn, chờ tối đa 2 giây. Sàn biết đơn → mở phiên luôn, ghi hồ sơ là "về trước khi sàn báo".
- Các trường hợp không mở phiên, chỉ hiện cảnh báo vàng kèm 2 tiếng bíp:
  - "KHÔNG TÌM THẤY ĐƠN" → có nút "Tìm thủ công" và "Mở phiên chưa xác định".
  - "KIỆN CHƯA GỬI ĐI" → kiện còn trong kho (mới đóng gói, chưa giao), không phải hàng hoàn.
  - "KIỆN HOÀN ĐÃ NHẬN" → kiện này đã được kiểm rồi.
  - "ĐƠN CÓ NHIỀU KIỆN" → quét mã đơn mà đơn có 2 kiện, hệ thống không biết kiện nào đang cầm, mở ô tìm thủ công để chọn.
  - "ĐANG KIỂM Ở STATION KHÁC" → bàn khác đang mở kiện này.
- Vì sao chặn: mở nhầm một kiện chưa giao là tạo một "hàng hoàn" không có thật, làm sai đối soát.

### Bước 3 — Kiểm hàng
- Màn chuyển sang "ĐANG KIỂM HÀNG HOÀN": mã vừa quét, loại hoàn (khách trả hàng / giao thất bại / về trước khi sàn báo / chưa xác định), lý do khách ghi, danh sách sản phẩm với số đã gửi, số khách xin trả, ô số nhận, ô tình trạng. Cột phải có **ảnh chụp lúc đóng gói** và nút "Xem clip đóng gói".
- Người kiểm sửa số nhận, tình trạng từng dòng, rồi chọn kết luận chung: Nguyên vẹn · Hư hỏng · Thiếu hàng · Sai hàng / bị tráo · Hộp rỗng · Khác.
- "Nguyên vẹn" bị khóa khi có dòng hỏng hoặc số nhận khác số xin trả. Ví dụ khách xin trả 2 áo mà chỉ có 1 → không thể chọn "Nguyên vẹn". Vì sao: tránh lỡ tay bấm "ổn" cho kiện thiếu hàng, mất quyền khiếu nại.
- "Khác" bắt buộc ghi chú. Mọi thay đổi tự lưu sau 1 giây, hiện chip "Đã lưu".
- Giao thất bại của đơn nhiều kiện: hệ thống không biết sản phẩm nào nằm trong kiện nào, nên bảng chỉ để xem, chỉ chọn kết luận chung.
- Cam 2 (camera nhìn khay để phiếu ở bàn đóng gói) ở bàn hoàn chỉ quay nhãn, không bao giờ báo "lệch mã".

### Bước 4 — Chụp ảnh
- Bấm "Chụp ảnh (F2)" hoặc phím F2 → ảnh do máy chủ lấy từ Cam 1 (camera quay từ trên xuống bàn), không phải ảnh tải từ máy bàn, có mã kiểm tra chống sửa. Ảnh hiện trong ≤ 2 giây. Tối đa 20 ảnh.
- Bấm F2 liền 3 lần khi ảnh trước chưa xong → xếp hàng, đủ 3 ảnh.
- Lỗi camera → "Không chụp được ảnh từ Cam 1. Thử lại."

### Bước 5 — Quét lại để đóng
- Quét lại mã của **cùng hồ sơ**: mở bằng mã chiều về, đóng bằng mã gốc của đơn đó cũng được.
- Chưa có kết luận → khối kết luận viền đỏ, chữ "Chọn kết luận trước khi quét đóng.", âm lỗi một lần, phiên vẫn mở.
- Quét mã của kiện khác → cảnh báo vàng, phiên giữ nguyên.
- Đóng xong: về màn chờ với "Đã nhận … — Nguyên vẹn." hoặc "Đã nhận … — Hộp rỗng. Đã tạo hồ sơ khiếu nại KN-…" (hồ sơ khiếu nại giải thích ở lát 8).
- Hồ sơ có nhiều kiện: khách trả hàng thì một phiên cho cả hồ sơ (khách gửi một thùng). Giao thất bại / về trước khi sàn báo / chưa xác định của đơn nhiều kiện thì mỗi kiện một phiên; hồ sơ "Đã nhận một phần" tới khi đủ kiện.

### Bước 6 — Quên đóng, hủy, gọi quản lý
- 20 phút: nhắc "Phiên đã mở 20 phút. Chọn kết luận rồi quét lại mã."
- 45 phút: đã có kết luận → hệ thống tự hoàn tất phiên (cờ "Tự đóng"); chưa có → bỏ dở, kiện về trạng thái trước, trang tổng quan báo "phiên hoàn bỏ dở". Thời gian chờ quản lý duyệt không tính.
- "Hủy phiên" chọn lý do: Quét nhầm · Kiện không phải hàng hoàn · Khác. Kiện về trạng thái trước.
- "Gọi quản lý" dùng chung luồng duyệt Phase 1 (quản lý chỉ có "Cho tiếp tục" hoặc "Hủy phiên").

### Bước 7 — Kiện không rõ nguồn gốc
- Mã không tìm thấy, người kiểm bấm "Mở phiên chưa xác định" → hệ thống tạo một **kiện tạm** mã bắt đầu bằng "TAM-", vẫn quay, vẫn kết luận. Sau này đơn về máy (đồng bộ) có đúng mã đã quét thì tự gộp; không thì quản lý gắn đơn tay (lát 8).
- Quét kiện đã nhận rồi, nhưng người kiểm chắc đây là kiện khác (ví dụ khách gửi 2 thùng) → bấm "Đây là kiện khác — vẫn ghi hình", gõ ghi chú 5–200 ký tự → mở phiên chưa xác định. Hồ sơ này chỉ quản lý gắn đơn được, không tự gộp. Vì sao: không để camera "mù" chỉ vì máy tưởng kiện đã nhận.

### Bước 8 — Vá bàn đóng gói (4 điểm)
- **Chữ lệch mã mới.** Khi quét nhầm mã khác lúc đang đóng, màn đỏ giải thích hai khả năng: (1) kiện đang đóng đã xong mà quên quét → quét mã trên chính kiện đó; (2) vừa dán nhầm phiếu → gỡ phiếu sai, dán đúng, quét lại. Không còn câu nào khiến người đứng bàn dán phiếu kiện này sang kiện khác.
- **Báo cờ ngay sau khi đóng.** Kiện vừa đóng mà camera khay vẫn thấy phiếu của nó trên khay, hoặc camera khay không xác minh được phiếu → màn chờ hiện thông báo vàng trong ≤ 1 giây, ví dụ "Phiếu SPX…789 vẫn còn trên khay. Kiểm tra kiện vừa đóng đã dán phiếu chưa." Tự ẩn sau 10 giây hoặc lần quét kế.
- **Ảnh lúc đóng gói.** Đóng phiên đóng gói xong, hệ thống lưu một ảnh Cam 1 đúng lúc đóng. Sau này hàng hoàn về, bàn hoàn hiện ảnh đó để so.
- **Đơn hủy giữa phiên.** Đang đóng mà sàn báo đơn hủy → trong ≤ 5 giây sau lần đồng bộ, màn hiện băng đỏ "ĐƠN VỪA BỊ HỦY TRÊN SHOPEE — không gửi kiện này. Bấm Hủy phiên, để hàng lại kệ." kèm âm lỗi. Vẫn quét đóng được, nhưng kiện thành "Hủy sau khi đóng" và có cảnh báo cho quản lý.
- **Kiện hoàn bị mang sang bàn đóng gói** → cảnh báo "ĐƠN ĐÃ BÀN GIAO — Đây là kiện hàng hoàn — nhận ở bàn nhận hoàn.", không mở phiên.

**Ví dụ một vòng đầy đủ.** 09:00 chị Lan nhập tên "Lan" ở Station 03, bàn chuyển sang nhận hoàn. 09:12 chị đặt thùng khách trả dưới Cam 1, quét mã chiều về "SPXRTTST000041". Chưa tới 1 giây, màn hiện "ĐANG KIỂM HÀNG HOÀN", loại "Khách trả hàng", lý do "Sản phẩm bị lỗi — Áo bị rách ở tay", dòng "Áo thun Đen/L: gửi 2, xin trả 2", bên phải là ảnh lúc đóng gói ngày 02/10 14:27. Chị mở thùng: chỉ có 1 áo. Chị bấm "−" thành 1, dòng chuyển "Thiếu", nút "Nguyên vẹn" khóa. Chị chọn "Thiếu hàng", gõ ghi chú "Thùng chỉ có 1 áo", bấm F2 hai lần, hai ảnh hiện ngay. Chip "Đã lưu". 09:14 chị quét mã gốc "SPXTST0000041" in trên phiếu cũ còn dán trong thùng. Phiên đóng, màn về chờ với "Đã nhận SPXRTTST000041 — Thiếu hàng. Đã tạo hồ sơ khiếu nại KN-000124." 09:20 chị quét một kiện lạ "SPXVN0000000000": "KHÔNG TÌM THẤY ĐƠN". Chị bấm "Mở phiên chưa xác định", kiểm, chọn "Nguyên vẹn", quét lại cùng mã, phiên đóng; kiện tạm chờ quản lý gắn đơn. 09:30 chị đi họp, bỏ quên một kiện đã chọn "Hư hỏng". 10:15 hệ thống tự hoàn tất phiên đó, khi chị quay lại màn ghi "đã tự hoàn tất do quá 45 phút (kết luận: Hư hỏng)".

**Lưu ý.**
- Chưa thử với **camera thật**: thời gian chụp ảnh ≤ 2 giây, chất lượng ảnh, video Cam 1 mở hoàn đều mới đo trên camera giả (phát lại phim có sẵn).
- Chưa thử với **sàn thật**: bước "hỏi sàn 2 giây" và việc kiện khách trả có in mã chiều về hay không là giả định, chưa kiểm với kiện hoàn thật.
- Chưa thử "mất Internet 30 phút vẫn nhận hoàn" trên server kho.

## 1. Vì sao cần

P2 (không có video mở hàng hoàn) và P4 (kiểm hàng hoàn bằng tay, không lịch sử) là lý do chính của Phase 2. Đi kèm là 4 điểm vá Phase 1 từ 06-business-qa: L3 (chữ S3 có thể dẫn tới dán nhầm), L4 (cờ Cam 2 chỉ nằm trong DB, không ai thấy), L8 (không có gì để so khi hàng hoàn về), L9 (đơn hủy giữa phiên vẫn được đóng gói và gửi đi).

| Lát này làm (Goals) | Lát này không làm (Non-goals — ở lát / phase nào) |
|---|---|
| Module `returns` lõi: `attach_or_create`, `resolve_code`, `recompute` (BR-24), kiện tạm, gộp chưa xác định, API-110 / 111 (T-104) | D14 Hàng hoàn trên dashboard (lát 9, T-153) |
| Phiên RETURN mở (API-11 nhánh RETURN, API-104), đóng / hủy (API-102, 11, 12, 15), `camera_clock` (T-107, T-108) | Hồ sơ khiếu nại tự tạo khi đóng (lát 8, T-110 — ở M7 `claim_code` = null) |
| J-07 RETURN, ASSIST, bỏ qua khay cho RETURN, PACK chặn kiện `RETURN_*`, `closed_session`, BR-21 (T-117) | Gắn đơn cho kiện chưa xác định (lát 8, API-112) |
| Ảnh F2 (API-103, 106), ảnh lúc đóng gói J-17, `pack_reference`, API-40 luật STATION (T-109); ảnh từ khung vision trong Redis (T-121) | Đồng bộ yêu cầu trả từ sàn (lát 9, J-13) |
| FE station R1–R5, S1 / S2 / S3 hardening, E2E UC-02 (T-132..T-137) | Nhận diện sản phẩm bằng AI (giai đoạn 4) |

## 2. Ai dùng, ở đâu, khi nào

| Vai | Màn hình / điểm vào | Lúc nào dùng |
|---|---|---|
| Station (chế độ nhận hoàn) | `/station`: R1 Sẵn sàng nhận hoàn, R2 Đang kiểm, R3 Tìm thủ công, R4 Cảnh báo hàng hoàn, R5 Người kiểm | Mỗi kiện hoàn |
| Station (đóng gói) | S1 thông báo cờ, S2 banner đơn hủy, S3 chữ mới, S4 kiện hoàn sai bàn | Mỗi kiện đi |
| Supervisor, Admin | D13 thẻ phiên hoàn ("Gọi quản lý") | Khi bàn hoàn cần quyết |
| Job J-07 (30 giây) | Nền | Nhắc 20 phút, tự hoàn tất / bỏ dở 45 phút |
| Job J-17 / `vision` | Nền | Ảnh lúc đóng gói; giữ khung Cam 1 mới nhất cho F2 |

## 3. Tình huống thực tế

Mã theo dữ liệu mock / seed (04 §1, DEC-321).

| # | Tình huống | Hệ thống làm gì | Vì sao |
|---|---|---|---|
| 1 | Quét `SPXRTTST000041` (mã chiều về) | `resolve_code` bước 1 → hồ sơ `BUYER_RETURN` → phiên RETURN `OPEN`, kiện `RETURN_INSPECTING` | DEC-202 thứ tự cứng |
| 2 | Quét mã đơn `2410TST00043` (đơn 2 kiện, chưa có hồ sơ) | ALERT `RETURN_MULTIPLE_PACKAGES` → FE mở R3 điền sẵn mã đơn | Không đoán kiện đang cầm (DEC-229) |
| 3 | Quét `SPXTST0000053` đã nhận | ALERT `RETURN_ALREADY_RECEIVED` + nút "Đây là kiện khác" (`can_record_other`) | EX-R11 |
| 4 | Quét kiện `PACKED` | ALERT `NOT_SHIPPED`, câu nhắc báo quản lý điều chỉnh nếu đã gửi thật | EX-R6 |
| 5 | Quét kiện `NEW` của đơn sàn đã giao (đơn trước khi dùng hệ thống) | Mở phiên, cờ `NO_PACK_CLIP`, "Xem clip đóng gói" khóa | EX-R3 |
| 6 | Quét mã lạ, sàn không biết | ALERT `RETURN_NOT_FOUND`; "Mở phiên chưa xác định" → API-105 tạo kiện tạm `TAM-…` | EX-R12, FR-04.13 |
| 7 | Quét đóng khi chưa kết luận | ALERT `INSPECTION_REQUIRED`, phiên `OPEN` | BR-07 |
| 8 | Mở bằng mã chiều về, đóng bằng mã gốc cùng hồ sơ | `accepted_codes(case)` chứa cả hai → `SESSION_COMPLETED` | BR-23 |
| 9 | Đóng bằng mã kiện khác | ALERT `RETURN_CODE_DIFFERENT`, không có trạng thái lệch mã | EX-R9, DEC-203 |
| 10 | Giao thất bại đơn 2 kiện, nhận kiện 1 | `lines_mode = REFERENCE`, hồ sơ `PARTIALLY_RECEIVED` | BR-24, AC-34 |
| 11 | Khách trả 1 áo của đơn 2 kiện bằng 1 thùng | Một phiên; chỉ kiện quét được nhận, kiện kia rời hồ sơ về trạng thái trước | BR-24, DEC-271 |
| 12 | Phiên 45 phút, kết luận đã lưu | J-07 `close_return_session(code=None)` cờ `AUTO_CLOSED`, WS `SESSION_AUTO_CLOSED` | EX-R15, DEC-253 |
| 13 | Cam 2 thấy mã khác khi đang kiểm hoàn | Chỉ ghi `cam2_code` + event, phiên vẫn `OPEN` | DEC-203, AC-39 |
| 14 | Bàn đóng gói quét kiện `RETURN_*` | ALERT `ALREADY_HANDED_OVER` `is_return = true` → S4 kèm câu "nhận ở bàn nhận hoàn" | EX-R16, DEC-247 (trước đây 500) |
| 15 | J-04 thấy đơn hủy khi kiện `PACKING` | Task riêng `flag_order_cancelled` → cờ `ORDER_CANCELLED`, WS alert → S2 banner; đóng → `CANCELLED_AFTER_PACK` | BR-21, L9, AC-32 |
| 16 | Hai bàn quét cùng kiện | Partial unique phiên theo kiện → bàn sau `RETURN_IN_PROGRESS_ELSEWHERE` | 02a §6 |

## 4. Luồng ví dụ từ đầu đến cuối

```mermaid
sequenceDiagram
    participant ST as Station 03 (chị Lan)
    participant API as api
    participant RS as returns
    participant V as vision (khung Cam 1)
    ST->>API: API-101 name "Lan"
    ST->>API: API-11 quét SPXRTTST000041
    API->>RS: resolve_code (ngoài lock): mã chiều về → case BUYER_RETURN
    API->>API: lock order → station → case → kiện; check_openable
    API->>API: open_return_session: init_lines, kiện → RETURN_INSPECTING, case → INSPECTING
    API-->>ST: SESSION_OPENED + state (dòng, pack_reference)
    ST->>API: API-102 nháp (debounce 1 giây) — Thiếu hàng
    ST->>API: API-103 F2 ×2
    API->>V: frame:{cam1} ≤ 2 giây tuổi → JPEG 0444 + SHA-256
    ST->>API: API-11 quét SPXTST0000041 (flush nháp trước)
    API->>RS: accepted_codes ∋ mã gốc; close_return_session; recompute (BR-24)
    API-->>ST: SESSION_COMPLETED + closed_session → R1
```

1. **09:00** — API-101 đặt `operator_name`. `selectPanel` thấy chế độ RETURN có tên → R1.
2. **09:12** — API-11: `resolve_code` (≤ 3 truy vấn có index) chạy **trước** `lock_station` (R3-4); trong khóa kiểm lại dedup, approval chờ, `operator_name`, `check_openable`. `open_return_session` khởi tạo dòng từ `requested_items`, ghi `package_status_before`, `effective_pack_session` cho cột "Lúc đóng gói".
3. **09:13** — FE gửi API-102 sau 1 giây; `inspection.validate()` áp BR-22 (FULL) → Nguyên vẹn bị chặn khi số nhận ≠ số xin trả (`CONCLUSION_INCONSISTENT`).
4. F2: API-103 kiểm phiên + đếm dưới khóa → commit nhả khóa → lấy khung Cam 1 mới nhất mà `vision` giữ trong Redis (`frame:{camera_id}`, TTL 5 giây, tuổi ≤ 2 giây; quá cũ → `grab_frame` RTSP) → khóa lại, ghi file 0444 + SHA-256, INSERT `snapshot` (DEC-310, DEC-320).
5. **09:14** — Quét mã gốc. FE chờ nháp flush xong rồi mới gửi quét (DEC-235). `close_return_session`: khóa case → kiện (id tăng), chụp `camera_clock`, kiện → `RETURN_RECEIVED_ISSUE`, `recompute` → case `RECEIVED_ISSUE`, enqueue J-01 cắt clip; từ lát 8 thêm `claims.create_from_return`.
6. Từ lát 9 trở đi, clip phiên hoàn và clip đóng gói của kiện được giữ theo hồ sơ (lát 8, ADR-009).

## 5. Quy tắc nghiệp vụ và lý do

| Quy tắc | Con số / điều kiện | Vì sao | ID |
|---|---|---|---|
| Thứ tự tra mã | (1) `upper(return_tracking_number)` → hồ sơ (ưu tiên chưa kết thúc); (2) `upper(tracking_number)` → kiện; (3) `platform_order_sn` / `platform_return_sn`; không thấy + ≥ 8 ký tự → tra sàn ≤ 2 giây | Kiện khách trả mang mã chiều về; giao thất bại mang mã gốc (giả định Q6) | FR-04.01, DEC-202, DEC-229 |
| Phải có người kiểm | Không có `operator_name` → `OPERATOR_REQUIRED` → R5 | Biết ai mở kiện | BR-28, FR-04.10 |
| Kiện mở được | `RETURN_EXPECTED / MISSING`, `HANDED_OVER`, `DELIVERED`; `NEW` chỉ khi đơn sàn đã giao / đang hoàn hoặc có hồ sơ mở | Không tạo hàng hoàn giả từ kiện chưa rời kho | EX-R6, EX-R3 |
| Kết luận bắt buộc | 6 giá trị; "Khác" cần note; note ≤ 500 | Không có kết luận thì phiên vô nghĩa với khiếu nại | BR-07, FR-04.03 |
| Nguyên vẹn nhất quán | FULL: mọi dòng Nguyên vẹn **và** nhận = xin trả; REFERENCE: chỉ kết luận chung | Không đánh "ổn" cho kiện thiếu | BR-22, FR-04.09 |
| Đóng bằng mã cùng hồ sơ | mã gốc mọi kiện + mã chiều về + mã đơn + `open_code` (chưa xác định: chỉ `open_code`) | Thực tế quét mã nào trên thùng cũng được | BR-23, FR-04.05, AC-36 |
| Màn đang kiểm hiện đủ | Loại hoàn, lý do khách, sản phẩm + số gửi / số xin trả, ảnh lúc đóng gói, nút clip đóng gói gốc | Người kiểm so được ngay, không phải tra máy khác | FR-04.02, FR-04.12 |
| Một phiên hay nhiều phiên | Một phiên khi `BUYER_RETURN` hoặc đơn 1 kiện (`single_session` chốt lúc mở phiên đầu); còn lại mỗi kiện một phiên | Khách gửi 1 thùng; giao thất bại trả từng kiện gốc | BR-24, FR-04.08, DEC-265 |
| Trả một phần | Trọn đơn → mọi kiện nhận; một phần → chỉ kiện quét, kiện khác rời hồ sơ về trạng thái trước | Không đánh "đã nhận" cho kiện không về | BR-24, DEC-271 |
| Ảnh | ≤ 20 / phiên; máy chủ lấy từ Cam 1; JPEG 0444 + SHA-256; ≤ 2 giây p95; URL ký 10 phút; nhân viên xem → audit `VIEW_SNAPSHOT` | Bằng chứng không sửa được, không tải từ máy bàn | FR-04.04, NFR-32, NFR-36 |
| Ảnh lúc đóng gói | Đóng phiên PACK → ảnh `PACK_CLOSE` (khung vision lúc đóng; dự phòng J-17 cắt từ clip `ended_at − 0,5 giây`) | So hàng khi hoàn về | FR-02.11, FR-04.12, AC-31 |
| Xem clip đóng gói từ bàn hoàn | STATION chỉ xem khi phiên RETURN của kiện (hoặc kiện cùng hồ sơ) đang `OPEN` / `WAITING_APPROVAL` tại bàn đó | Bàn không lục video tùy ý | 01 §5.10, API-40 |
| Quá giờ phiên hoàn | Nhắc 20 phút; 45 phút: có kết luận → `COMPLETED` `AUTO_CLOSED`, không → `ABANDONED`; tính từ `timer_base` (trừ chờ duyệt) | Không treo kiện ở "đang kiểm" | EX-R15, DEC-214, DEC-253, DEC-60 |
| Hủy phiên hoàn | Lý do `WRONG_SCAN` / `NOT_A_RETURN` / `OTHER`; kiện → `package_status_before`; hồ sơ do phiên tạo và không còn phiên → `CANCELLED` | Quét nhầm không để lại rác | 02a API-12 |
| Không áp Cam 2 cho phiên hoàn | Khay chỉ ghi nhận, không `MISMATCH` | Bàn hoàn không có khay phiếu | DEC-203, AC-39 |
| Kiện hoàn ở bàn đóng gói | S4 "ĐƠN ĐÃ BÀN GIAO" + "Đây là kiện hàng hoàn — nhận ở bàn nhận hoàn." | Trước đây lỗi 500 | EX-R16, DEC-247 |
| Kiện khác — vẫn ghi hình | Chỉ khi kết quả quét là `RETURN_ALREADY_RECEIVED`; note 5–200; hồ sơ `UNIDENTIFIED` `manual_link_only`; audit `RETURN_FORCE_NEW` | Không để mất video, nhưng không mở cửa sau cho mọi mã | EX-R11, R3-1 |
| S3 chữ mới | Nguồn quét: hai tình huống; nguồn Cam 2: giữ "Bỏ phiếu … khỏi khay" | Không câu nào dẫn tới dán phiếu sang kiện khác | FR-03.13, L3, AC-29 |
| Thông báo cờ sau đóng | `LABEL_ON_TRAY` / `CAM2_UNVERIFIED` → Alert vàng S1 ≤ 1 giây (từ `closed_session`), ẩn sau 10 giây / lần quét kế | Người đứng bàn sửa ngay khi kiện còn trên bàn | FR-03.14, L4 |
| Đơn hủy giữa phiên | Banner đỏ ≤ 5 giây sau đồng bộ; đóng → `CANCELLED_AFTER_PACK` + BR-11 | Không gửi kiện của đơn đã hủy | FR-03.15, BR-21, L9 |

## 6. Điểm dễ hiểu nhầm

- **Sao quét mã đơn có lúc mở được, có lúc báo "nhiều kiện"?** Đơn có hồ sơ mở → lấy kiện chưa nhận đầu tiên của hồ sơ. Không có hồ sơ mà đơn > 1 kiện đủ điều kiện → `MULTIPLE`.
- **Kết luận lưu ở đâu khi chưa đóng?** Trong phiên (`inspection_conclusion`, `inspection_saved_at`). Đây là lý do J-07 "tự hoàn tất" được: chỉ hoàn tất khi đã có kết luận **đã lưu** trên máy chủ, nháp chưa gửi không tính.
- **Nháp "Khác" chưa có ghi chú có lưu không?** Không gửi (DEC-323): server sẽ 422 cả gói, mất luôn số dòng.
- **Kiện tạm `TAM-` có bị đối soát báo lỗi?** Không: BR-10, BR-20 loại `is_placeholder`.
- **`closed_session` để làm gì?** API-11 đóng trả kèm tóm tắt phiên vừa đóng (mã, cờ, kết luận, mã hồ sơ khiếu nại). S1 / R1 dựng thông báo từ đó, không phải gọi thêm API.
- **Ảnh F2 có "đúng lúc bấm" không?** Khung mới nhất `vision` giữ, tuổi ≤ 2 giây (`SNAPSHOT_FRAME_MAX_AGE_S`). Trước T-121 mở RTSP mỗi lần mất 3,2 giây (TC-04.40 trượt), nay 0,02 giây trên máy dev.
- **API-105 / force_new ở M7 chạy thật chưa?** M7 FE dùng mock; BE thật ở T-119 (M8). E2E BE thật M10 chạy đủ nhánh này.

## 7. Bản đồ nghiệp vụ → code

Đường dẫn BE tính từ `ai-cam-be/src/aicam/`, test BE từ `ai-cam-be/tests/`. FE tính từ `ai-cam-fe/src/`, E2E từ `ai-cam-fe/e2e/`.

| Khái niệm nghiệp vụ | Code | Test chứng minh |
|---|---|---|
| Tra mã 3 nguồn, nhiều kiện, không thấy | `modules/returns/service.py` (`resolve_code`, `accepted_codes`) | `integration/test_returns_core.py`: `test_resolve_code_three_sources`, `test_resolve_code_multiple_and_not_found`, `test_resolve_order_code_with_case_picks_unreceived` |
| Mở phiên hoàn + các cảnh báo R4 | `modules/sessions/return_scan.py` (`handle`, `check_openable`, `open_return_session`, `lookup_with_platform`), `modules/sessions/return_state.py` | `integration/test_return_scan.py`: `test_operator_required`, `test_open_by_return_tracking`, `test_open_by_original_or_order_code`, `test_platform_lookup_opens_unannounced`, `test_unknown_code_not_found`, `test_not_shipped`, `test_new_package_of_unshipped_order_not_openable`, `test_multiple_packages`, `test_in_progress_elsewhere`, `test_already_received`, `test_scan_replay_returns_same_outcome` |
| Dòng kiểm + BR-22 | `modules/sessions/inspection.py` (`init_lines`, `validate`, `replace_lines`); FE `shared/returns/inspection.ts` | `integration/test_return_close.py`: `test_save_inspection_draft`, `test_ok_inconsistent_rejected`, `test_other_requires_note_and_lines_complete`, `test_reference_mode_only_checks_conclusion`; `test_return_scan.py::test_failed_delivery_multi_package_reference_lines`; FE `shared/returns/inspection.test.ts` |
| Đóng bằng mã cùng hồ sơ, BR-07, BR-23, BR-24 | `modules/sessions/return_scan.py` (`close_return_session`), `modules/returns/service.py` (`recompute`, `apply_close_to_packages`, `is_single_session`, `covers_whole_order`) | `test_return_scan.py::test_code_different_and_inspection_required`; `test_return_close.py`: `test_close_with_other_code_of_case`, `test_close_issue`, `test_failed_delivery_two_packages`, `test_unannounced_two_packages_two_sessions`, `test_buyer_return_whole_order`, `test_buyer_return_partial_order`; `test_returns_core.py`: `test_recompute_multi_package`, `test_single_session_close_partial_return`, `test_single_session_close_whole_order` |
| Hủy phiên hoàn | `modules/sessions/return_scan.py` (`end_return_session`) | `test_return_close.py`: `test_cancel_return_session`, `test_cancel_unannounced_cancels_case`, `test_cancel_reason_by_session_type` |
| Tìm thủ công (API-104) | `modules/sessions/return_lookup.py` | `test_return_scan.py`: `test_lookup_prefix_and_can_open`, `test_lookup_validation_and_mode`, `test_lookup_platform_checked` |
| Phiên chưa xác định, kiện tạm, kiện khác | `modules/returns/service.py` (`create_unidentified`, `create_placeholder_package`), `modules/sessions/return_scan.py` (`open_unidentified`, `open_force_new`) | `integration/test_link_order.py`: `test_open_unidentified_creates_placeholder`, `test_unidentified_code_matching_existing_case`, `test_open_from_lookup_result`, `test_force_new_after_received`, `test_force_new_rejected_when_not_received`; `test_returns_core.py::test_create_unidentified_placeholder_code` |
| J-07 RETURN, ASSIST, khay, kiện hoàn ở bàn đóng gói, BR-21 | `modules/sessions/service.py` (`check_timeouts`, `flag_order_cancelled`), `workers/tasks.py` | `integration/test_return_hardening.py`: `test_j07_auto_closes_with_saved_conclusion`, `test_j07_abandons_without_conclusion`, `test_j07_return_warn_uses_return_threshold`, `test_tray_other_code_does_not_change_return_session`, `test_assist_for_return_session`, `test_assist_cancel_return_session`, `test_pack_scan_of_return_package_alerts`, `test_pack_close_returns_closed_session`, `test_order_cancelled_during_session`, `test_order_cancelled_after_session_closed` |
| Đồng thời | — | `integration/test_return_concurrency.py`: `test_two_return_desks_same_package`, `test_flag_order_cancelled_races_closing_scan`, `test_scan_j13_j06_same_order_no_deadlock` |
| Ảnh F2, ảnh lúc đóng gói, khung vision | `modules/media/snapshots.py` (`take`, `capture_pack_close_from_cache`, `capture_pack_snapshot`), `modules/media/frames.py`, `modules/vision/runner.py` | `integration/test_snapshots.py`: `test_take_snapshot_and_download`, `test_snapshot_view_by_staff_is_audited`, `test_snapshot_limit`, `test_camera_unreachable`, `test_snapshot_session_not_open`, `test_j17_pack_snapshot_after_clips`, `test_pack_reference_snapshot_and_station_clip_access`; `integration/test_snapshot_frames.py`: `test_snapshot_uses_cached_frame`, `test_snapshot_falls_back_when_frame_stale`, `test_pack_close_snapshot_from_cached_frame` |
| Toàn luồng trên stack thật (camera giả) | — | `qa/test_m7_live.py`: `test_tc_04_03_operator_required`, `test_tc_04_08_10_alerts`, `test_tc_04_45_lookup`, `test_tc_04_06_open_by_order_code`, `test_tc_04_40_snapshot_from_fake_cam`, `test_tc_04_16_19_conclude_and_close`, `test_tc_04_26_auto_close_overdue`, `test_tc_02_42_pack_snapshot`, `test_tc_04_53_return_package_at_pack_desk` |
| FE R1 / R5 / đổi chế độ | `features/station/selectPanel.ts`, `features/station/StationStatusBar.tsx`, `features/station/returns/ReturnReadyPanel.tsx`, `features/station/returns/OperatorDialog.tsx` | `features/station/returns/ReturnMode.test.tsx` (TC-04.01/02, 04.03, 04.34), `features/station/selectPanel.test.ts` |
| FE R2 kiểm + nháp + quá giờ | `features/station/returns/InspectingPanel.tsx`, `InspectionTable.tsx`, `ConclusionPicker.tsx`, `inspectionDraft.ts` | `features/station/returns/InspectingPanel.test.tsx` (TC-04.04, 04.15, 04.18..04.21, 04.24, 04.26, 04.27), `inspectionDraft.test.ts`, `components.test.tsx` |
| FE ảnh + tham chiếu đóng gói | `features/station/returns/PackReferenceCard.tsx`, `shared/media/SnapshotStrip.tsx` | `features/station/returns/Snapshots.test.tsx` (TC-04.40..04.44) |
| FE R3 / R4 / kiện khác | `features/station/returns/ReturnLookupDialog.tsx`, `ForceNewDialog.tsx`, `features/station/AlertOverlay.tsx` | `features/station/returns/ReturnLookup.test.tsx` (TC-04.08..04.13, 04.45, 04.46, 04.53) |
| FE hardening S1 / S2 / S3 | `features/station/ClosedNotice.tsx`, `features/station/MismatchPanel.tsx`, `features/station/PackingPanel.tsx`, `features/station/copy.ts` | `features/station/Hardening.test.tsx` (TC-03.70..03.73, 03.75) |
| E2E | — | mock `mock/returns.spec.ts` ("UC-02 + UC-14…", "R4 → R3…"); BE thật `real/m7-return-uc02.spec.ts`, `real/m10-station-returns.spec.ts` |

## 8. Giới hạn hiện tại và giả định

| Giới hạn / giả định | Ảnh hưởng | Khi nào xử lý |
|---|---|---|
| **Camera thật chưa test (T-4).** Ảnh ≤ 2 giây (NFR-32), chất lượng ảnh, góc Cam 1 mở thùng, GOP camera dài (RB-21) — mới đo trên `fake-cam1` | Ảnh / video ngoài đời có thể chậm hoặc mờ | T-4 |
| **Shopee thật chưa test (T-3).** Tra sàn ≤ 2 giây khi mã chưa có | Có thể phải "Mở phiên chưa xác định" nhiều hơn | T-3 |
| **Q6 chưa xác nhận** — kiện khách trả có mã chiều về in trên nhãn, kiện giao thất bại mang mã gốc (AS-09, DEC-202) | Thứ tự tra mã có thể phải đổi; tăng tìm thủ công | Kiểm với 20 kiện hoàn thật |
| AS-08 — bàn hoàn có chuột / cảm ứng + bàn phím | Không có thì phải làm kết luận bằng mã lệnh in sẵn | Khi lắp bàn |
| AC-38 / NFR-09 — mất WAN 30 phút vẫn nhận hoàn | **Chưa test trên server kho** | Trước go-live |
| `RB-25`: kiện `NEW` từ CSV không có trạng thái sàn → `NOT_SHIPPED` dù là hàng hoàn thật | Supervisor phải điều chỉnh `NEW → HANDED_OVER` hoặc mở phiên chưa xác định | Vận hành |
| Q17 — kiện hoàn nhập lại kho ở đâu | Ngoài phạm vi hệ thống | Chủ shop |

## Liên kết

- SRS: [01-srs.md](../../ai/items/02-returns-reconciliation/01-srs.md) v0.5: §4.2, §7.4, §10.4 R1–R5, S1–S3; FR-04.*, FR-02.11, FR-03.13..15; AC-22, 29, 31..34, 36, 39
- Spec: [02 §6.2](../../ai/items/02-returns-reconciliation/02-tech-spec.md) API-10, 11, 12, 15, 40, 102..106 · [02a §4.1](../../ai/items/02-returns-reconciliation/02a-be-spec.md), §5, §6, DEC-306..310, 320 · [02b-station](../../ai/items/02-returns-reconciliation/02b-fe-spec-station.md) DEC-322..327
- Test cases: [04](../../ai/items/02-returns-reconciliation/04-test-cases.md) TC-03.70..03.75, TC-04.01..04.53, TC-02.42
- Lát trước / sau: [lat-06-nen-tang.md](lat-06-nen-tang.md) · [lat-08-ho-so-khieu-nai.md](lat-08-ho-so-khieu-nai.md) · Phase 1: [lat-03-cam2-va-duyet.md](../01-packing-mvp/lat-03-cam2-va-duyet.md)
