---
name: ai-flow-route
description: >-
  Điều phối bộ skill ai-*: mở work item mới (chọn lane feature/prototype/fix/chore, cấp số, tạo 00-status),
  hoặc đọc 00-status của item đang chạy để biết đang ở bước nào và trỏ đúng skill ai-[role]-[action] tiếp
  theo; chế độ status liệt kê mọi item. Dùng khi user bắt đầu tính năng/việc mới, hỏi "việc tiếp theo là gì",
  trạng thái item, hoặc chưa biết gọi skill nào.
---

# ai-flow-route — điều phối

Đọc `../ai-shared/CONVENTIONS.md` (§4 ma trận luồng). Không có `.ai/profile.md` → handoff `ai-flow-init`.
**Output:** thư mục item + `00-status.md` (item mới). Không tự làm việc của role, không tick gate.

## 1. Chọn item
Liệt kê `<docs_root>/items/*/` → option: tiếp tục item (≤ 3 item gần nhất chưa G5) · item mới · dừng.

## 2. Item mới
1. Hỏi lane: **feature** · **prototype** (yêu cầu chưa rõ) · **fix** (bug/sự cố) · **chore** (kỹ thuật, không đổi hành vi).
2. Hỏi component bị chạm (từ profile, multi-select) → biết có BE/FE nào.
3. Cấp `NN` (max + 1; quy mô M/L kiểm thêm nhánh remote + PR mở). Slug ≤ 4 từ, kebab-case.
4. Tạo folder + `00-status.md` (lane, quy mô, component). Các file khác do skill tạo ra khi tới bước.
5. Handoff skill đầu lane: feature → `ai-po-write-srs` · prototype → `ai-po-prototype` · fix → `ai-dev-fix` · chore → `ai-architect-write-spec`.

## 3. Item đang chạy — tìm bước
Đọc `00-status` (gate, trạng thái từng spec, NOW, *Phản hồi* đang mở) + kiểm file thật tồn tại. Đối chiếu ma trận §4:
bước đầu tiên có input đủ mà output chưa xong = bước hiện tại. Có *Phản hồi* mở → ưu tiên owner artifact bị phản hồi.
Song song được (4a ∥ 4b, 6 ∥ 7, 8a ∥ 8b) → nêu cả hai.

In: item · lane · gate đã qua · bước hiện tại · input thiếu (nếu có) · phản hồi mở → hỏi chuyển skill (option 1 = gợi ý).

## 4. Chế độ status
Bảng mọi item: `NN-slug · lane · gate cao nhất ✅ · bước hiện tại · owner tiếp · phản hồi mở`. Không sửa file.
