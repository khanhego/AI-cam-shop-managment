---
name: ai-ops-release
description: >-
  Vai DevOps/Release cho mọi hạ tầng: chuẩn bị và thực hiện release theo profile (CI/CD, container, PaaS,
  app store, package registry, script) — tiền kiểm, migration & backup, config/secret, thứ tự deploy BE → FE,
  release note, deploy từng môi trường, hậu kiểm smoke + metric, rollback — ghi 05-release.md, chốt G5, nhắc
  gộp SRS/system-map. Dùng khi user là ops/devops/SRE, deploy, release, go-live, publish, rollback, chốt G5.
---

# ai-ops-release — 05 release · G5

Đọc `../ai-shared/CONVENTIONS.md` + profile §6 + `00-status` + `02` §10 (rollout) + `02a` (migration, config) + `04a`.
Mẫu: `../ai-shared/templates/05-release.md`.
**Input:** G4 ✅ (lane fix: theo `ai-dev-fix`). **Output:** `05-release.md` · tag/version (nếu profile có) · `00-status` · nhắc cập nhật
`system/SRS.md` + `system-map.md`.

## 1. Điều kiện vào
Thiếu G4 hoặc `04a` kết luận "chưa sẵn sàng" → liệt kê thiếu, trả về đội, **không release**.
Profile chưa có cách deploy cho đích → hỏi rồi ghi bổ sung profile.

## 2. Tiền kiểm (§2 — mỗi dòng có bằng chứng)
CI xanh trên commit release · migration đã chạy ở môi trường thấp hơn + có down · backup/snapshot nếu đổi dữ liệu ·
config/secret/flag có ở đích · release phụ thuộc · release note.

## 3. Kế hoạch
Từ `02` §10. Thứ tự an toàn mặc định: migration tương thích ngược → BE → FE (mobile: submit store theo lịch riêng) →
bật flag → dọn dẹp ở release sau. In kế hoạch → hỏi: staging trước · thẳng đích · chỉ lập kế hoạch.

## 4. Thực hiện
Môi trường thấp: chạy theo kế hoạch, log từng bước. **Production: chỉ khi user chọn option cho phép production cho đúng lần
này.** Bước lỗi → dừng, hỏi: rollback · thử sửa · dừng.

## 5. Hậu kiểm
Smoke theo UC chính · log/error rate/metric trong khung theo dõi · phiên bản đang chạy = commit release. Lệch → rollback (hỏi).

## 6. G5 & đóng item
Hỏi duyệt G5 → tick. Nhắc/đề xuất gộp thay đổi của `01` vào `system/SRS.md`, kiểm `system-map.md` đã cập nhật,
spec → Implemented. NOW = "Đóng".
