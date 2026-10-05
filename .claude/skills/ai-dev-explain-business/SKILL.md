---
name: ai-dev-explain-business
description: >-
  Viết tài liệu giải thích nghiệp vụ cho dev sau khi một lát/tính năng implement xong: tính năng phục vụ
  nghiệp vụ gì, vì sao có từng quy tắc, tình huống thực tế, luồng ví dụ, điểm dễ hiểu nhầm và bản đồ
  nghiệp vụ → code → test. Lưu ở <business_docs_root>/ (mặc định docs/nghiep-vu/). Dùng sau CP8 của mỗi
  lát, khi user hỏi "giải thích nghiệp vụ", "code này để làm gì", hoặc cần tài liệu onboard dev.
---

# ai-dev-explain-business — tài liệu nghiệp vụ cho dev

Đọc `../ai-shared/CONVENTIONS.md` + `.ai/profile.md`. Mẫu: `../ai-shared/templates/nghiep-vu.md`.
**Input bắt buộc:** `01` (FR/BR/AC của lát) + code đã implement (CP8 ✅ hoặc đã merge). Thiếu → báo và hỏi (CONVENTIONS §4).
**Output:** `<business_docs_root>/<item-NN>-<slug>/<lat-NN>-<slug>.md` (1 file / lát) + cập nhật `README.md` mục lục của thư mục.

## 1. Thu thập (chỉ đọc)
| Đọc | Để lấy |
|---|---|
| `01` mục FR/BR/AC của lát, giả định GA/Q | quy tắc + con số + lý do |
| `02`/`02a`/`02b` mục liên quan | luồng, trạng thái, API |
| Code + test của lát (diff PR, module chính) | bản đồ nghiệp vụ → code → test (đường dẫn thật) |
| `04` / `04a` | TC chứng minh hành vi |

## 2. Viết (theo template, tiếng của profile)
0. **§0 "Giải thích đơn giản" viết trước tiên và là phần bắt buộc kỹ nhất**: lời thường, như đang giải thích miệng cho người
   mới — "Đây là phần…", ý tưởng chính, từng bước (làm gì · vì sao · sự cố thì sao), ví dụ một vòng đầy đủ có tên/câu chữ/số,
   lưu ý giới hạn. Không tên file, class, mã lỗi, ID ở §0. Phần kỹ thuật (§1–§8) là để tra cứu sau.
1. **Viết cho dev mới**, không cho PO: giải thích *vì sao* trước *cái gì*. Dùng tình huống thật, tên người, con số.
2. Mỗi quy tắc có **lý do nghiệp vụ** (hậu quả nếu không có) và **ID** (FR/BR/GA) để truy vết.
3. §4 luồng ví dụ: một câu chuyện end-to-end; > 5 bước → thêm sơ đồ mermaid.
4. §7 bản đồ code: chỉ ghi đường dẫn **có thật** (kiểm bằng ls/grep); không đoán. Ghi test tên thật.
5. §8 nêu thật phần còn giả lập/mock, phần để lát sau, giả định chưa xác nhận.
6. Không chép nguyên SRS — link ID. Độ dài: lát nhỏ ~1–2 trang, lát lớn ~3–5 trang.

## 3. Soát
- [ ] §0 đọc riêng vẫn hiểu; không có tên file/class/mã lỗi/ID; có ví dụ một vòng đầy đủ
- [ ] Mọi FR/BR của lát xuất hiện ít nhất một lần (§3, §5 hoặc §6)
- [ ] Mọi đường dẫn code ở §7 tồn tại
- [ ] Có ít nhất một luồng ví dụ cụ thể
- [ ] Không lộ dữ liệu thật (token, PII, khoá)

## 4. Handoff
In: file đã viết · FR/BR đã phủ · chỗ chưa rõ (câu hỏi mở). Cập nhật *Lịch sử* trong `00-status`.
Trong `ai-solo-build-feature`: quay về pipeline (CP8b) → bước kế. Đứng riêng: hỏi bước tiếp (option 1 = skill kế theo ma trận).
