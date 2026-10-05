# <Tên lát / tính năng> — Giải thích nghiệp vụ

| Trường | Giá trị |
|---|---|
| Item / lát | `<NN>-<slug>` · lát <n> |
| Yêu cầu | FR-…, BR-…, NFR-… (link `01-srs` / tài liệu phase) |
| Code | PR BE #…, PR FE #… (hoặc commit) |
| Người đọc | Dev mới vào dự án, reviewer, QA |
| Tác giả | |
| Reviewer | PO (đúng nghiệp vụ) · Tech lead (đúng code) |
| Trạng thái | Draft · Reviewed · Outdated (code đã đổi — cần viết lại) |
| Last update | <YYYY-MM-DD> · <role> |

<!-- Mục đích: dev đọc xong hiểu code này phục vụ NGHIỆP VỤ gì, vì sao có từng quy tắc, và tìm được chỗ code tương ứng.
     Không chép lại SRS: giải thích bằng tình huống thật, link về ID. Văn phong CONVENTIONS §9. -->

## TL;DR
<!-- ≤ 5 dòng: tính năng giải quyết vấn đề gì, cho ai; ý tưởng chính; điều quan trọng nhất cần nhớ. -->

## 0. Giải thích đơn giản
<!-- PHẦN QUAN TRỌNG NHẤT — đọc riêng phần này vẫn hiểu tính năng. Viết như đang giải thích bằng lời cho một người mới
     (dev mới, QA, người bán), KHÔNG phải tài liệu kỹ thuật:
     - Câu mở đầu: "Đây là phần …" + ví von đời thường (vd "bộ não của buổi live").
     - "Ý tưởng chính": người dùng đã có gì trước, hệ thống làm mấy việc gì, theo thứ tự nào.
     - Mỗi bước / mỗi tình huống một mục "### Bước n — <tên>" hoặc "**<tình huống>.** …": làm gì → vì sao → khi có sự cố thì sao.
       Gạch đầu dòng ngắn, mỗi dòng một ý, có ví dụ trong ngoặc kép ("sp này giá bao nhiu v shop").
     - Bảng nhỏ chỉ khi liệt kê loại (vd các loại bình luận bị bỏ qua + ví dụ).
     - "Ví dụ một vòng đầy đủ": câu chuyện có tên người, câu chữ, số giây/phút, kết quả cuối.
     - "Lưu ý": giới hạn hiện tại nói thẳng (đang giả lập, chưa nối…).
     Cấm ở phần này: tên file, tên class, mã lỗi, tên bảng/endpoint, ID FR/BR (để ở §5, §7). Thuật ngữ không tránh được
     ("phiên", "playlist", "OBS") thì giải thích ngay lần đầu bằng một mệnh đề. -->

## 1. Vì sao cần
<!-- Vấn đề nghiệp vụ. Nếu không có tính năng / quy tắc này thì chuyện gì xảy ra (hậu quả cụ thể). -->

| Lát này làm (Goals) | Lát này không làm (Non-goals — ở lát/phase nào) |
|---|---|
| | |

## 2. Ai dùng, ở đâu, khi nào
| Vai | Màn hình / điểm vào | Lúc nào dùng |
|---|---|---|

## 3. Tình huống thực tế
<!-- 3–6 tình huống người dùng thật gặp; mỗi tình huống: bối cảnh → hệ thống làm gì → vì sao. -->
| # | Tình huống | Hệ thống làm gì | Vì sao |
|---|---|---|---|

## 4. Luồng ví dụ từ đầu đến cuối
<!-- Một câu chuyện cụ thể có tên, số, thời gian. Sơ đồ mermaid nếu luồng > 5 bước. -->

## 5. Quy tắc nghiệp vụ và lý do
| Quy tắc | Con số / điều kiện | Vì sao | ID |
|---|---|---|---|

## 6. Điểm dễ hiểu nhầm
<!-- Câu hỏi dev/QA hay hỏi + trả lời ngắn. -->

## 7. Bản đồ nghiệp vụ → code
| Khái niệm nghiệp vụ | Code (file / module) | Test chứng minh |
|---|---|---|

## 8. Giới hạn hiện tại và giả định
<!-- Giả định GA-xx, phần dùng fake/mock, phần để lát sau, câu hỏi mở. -->

## Liên kết
- SRS / tài liệu phase: …
- Spec: `02` §…, `02a` §…, `02b` §…
- Test cases: `04` TC-…
