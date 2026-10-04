---
name: ai-solo-build-feature
description: >-
  Pipeline trọn gói cho solo dev (một người giữ mọi vai): build một tính năng từ ý tưởng tới production bằng
  cách chạy tuần tự từng skill ai-* — init → SRS → UX → tech spec → BE spec → FE spec → review → plan →
  test cases → implement từng task → code review → chạy test → release. Sau mỗi bước có checkpoint, tại
  G1–G5 có gate; chưa duyệt thì không sang bước tiếp. Tiếp tục được từ chỗ dừng. Dùng khi user nói build
  feature, làm tính năng từ đầu đến cuối, solo, chạy hết quy trình, /ai-solo-build-feature.
---

# ai-solo-build-feature — pipeline tuần tự cho solo dev

Đọc `../ai-shared/CONVENTIONS.md`. Skill này **không có nội dung nghiệp vụ riêng**: mỗi bước gọi đúng skill `ai-*`
tương ứng (Skill tool) và làm theo skill đó. Khác biệt duy nhất: **khi skill con kết thúc, không handoff theo nó —
quay về pipeline này, chạy checkpoint/gate, rồi mới sang bước kế.**

## Luật pipeline (cứng)

1. **Tuần tự.** Một lần một bước, đúng thứ tự bảng dưới. Không chạy song song, không gộp hai bước trong một lượt hỏi.
2. **Không duyệt = không đi tiếp.** Mỗi bước kết thúc bằng checkpoint (CP) hoặc gate (G). Chỉ khi user chọn
   **Duyệt** mới đánh ✅ và sang bước kế. Agent không bao giờ tự duyệt, không suy diễn "chắc là ok".
3. **Bỏ bước chỉ khi không áp dụng** (vd item không chạm FE → bỏ 4b, 2b). Phải hỏi xác nhận và ghi lý do vào
   `00-status`. Không có option "bỏ qua cho nhanh" cho bước áp dụng được.
4. **Quay lui có hệ quả.** Phát hiện lỗi ở artifact bước trước → quay về bước đó, sửa, qua lại CP/G của nó;
   mọi gate phía sau đã ✅ mà bị ảnh hưởng → chuyển về ⬜ và chạy lại (hỏi user xác nhận phạm vi).
5. **Lưu trạng thái sau mỗi bước** vào `00-status` (bảng *Solo pipeline* bên dưới) để dừng giữa chừng và tiếp tục được.
6. **Review khách quan.** Bước review (5, 10) chạy `ai-lead-review` qua **subagent riêng** (Agent tool, chỉ đọc) để
   không tự xác nhận công việc của chính mình; pipeline nhận findings rồi trình user.
7. Commit/push/deploy/migration vẫn theo luật an toàn §6.9 — hỏi đúng lúc, không tự làm.

## Các bước

| # | Bước | Skill | Output | Kết thúc bằng |
|:-:|---|---|---|---|
| 0 | Khởi tạo dự án *(chỉ khi chưa có `.ai/profile.md`)* | `ai-flow-init` | profile, system-map, baseline | CP0 |
| 1 | Mở item (lane feature) | `ai-flow-route` | item + `00-status` | CP1 |
| 2 | Viết SRS | `ai-po-write-srs` | `01` | CP2 |
| 2b | Màn hình *(có component fe)* | `ai-ux-design-screens` | `01` §10 | **G1** |
| 3 | Tech spec tổng quan + contract | `ai-architect-write-spec` | `02` | CP3 |
| 4a | BE spec *(có component be)* | `ai-be-write-spec` | `02a` | CP4a |
| 4b | FE spec — mỗi client một lượt *(có fe)* | `ai-fe-write-spec` | `02b-<client>` | CP4b |
| 5 | Review bộ spec | `ai-lead-review` (subagent) | findings | **G2** |
| 6 | Kế hoạch | `ai-pm-plan-tasks` | `03` | **Plan** |
| 7 | Test cases | `ai-qa-write-cases` | `04` | CP7 |
| 8 | Implement — **lặp từng task** theo thứ tự `03` (BE trước FE dùng nó) | `ai-be-implement` / `ai-fe-implement` | code + test | CP8 / task |
| 9 | Commit / PR *(hỏi)* | — | commit, PR | CP9 |
| 10 | Review code | `ai-lead-review` (subagent) | findings | **G3** |
| 11 | Chạy test | `ai-qa-run-tests` | `04a` | **G4** |
| 12 | Release | `ai-ops-release` | `05` | **G5** |

Không có component fe → bỏ 2b, 4b và G1 đặt ở cuối bước 2. Không có be → bỏ 4a.

### Vòng lặp bước 8
Với mỗi task `T-n` chưa Done: gọi skill implement theo component của task → CP8 cho task đó (checklist đã phủ, build/lint/test
không thêm lỗi, bằng chứng chạy) → Duyệt → task kế. Hết task → bước 9.

### Vòng lặp G3 / G4
- Review code có blocker/major → quay về bước 8 cho đúng task, sửa, rồi chạy lại bước 10.
- Chạy test có bug Critical/High → `ai-dev-fix` cho từng bug (trong item này) → bước 10 cho phần sửa → chạy lại bước 11
  (TC fail + regression). Lặp tới khi G4 đạt hoặc user chọn Dừng.

## Checkpoint & gate — cách hỏi

Trước khi hỏi, in **tóm tắt bước** (≤ 10 dòng): đã làm gì · file tạo/sửa · checklist của bước (✓/✗) · câu hỏi mở · rủi ro.

**Checkpoint (CP):**

| # | Option |
|---|---|
| 1 | Duyệt — sang bước <kế> (`<skill>`) |
| 2 | Sửa tiếp — nêu chỗ cần sửa |
| 3 | Quay lại bước trước — chọn bước |
| 4 | Dừng — lưu trạng thái |

**Gate (G1–G5):** in thêm checklist "Chốt Gx" trong artifact, từng dòng ✓/✗.

| # | Option |
|---|---|
| 1 | Duyệt Gx ✅ — sang bước <kế> |
| 2 | Chưa đạt — sửa tiếp |
| 3 | Duyệt có điều kiện — ghi DEC, sang bước kế |
| 4 | Dừng — lưu trạng thái |

Checklist còn ✗ → option 1 vẫn hiện nhưng phải ghi rõ "còn N mục ✗" trong label; chọn duyệt khi còn ✗ = ghi DEC chấp nhận.

## Trạng thái — thêm vào `00-status.md`

```markdown
## Solo pipeline
| # | Bước | Trạng thái | Ngày | Ghi chú |
|:-:|---|:---:|---|---|
| 2 | SRS | ✅ | | |
| 2b | Màn hình | ⏭ N/A | | không có fe |
| 3 | Tech spec | ▶ đang làm | | |
```
Ký hiệu: ⬜ chưa · ▶ đang làm · ✅ duyệt · ⏭ không áp dụng · ↩ phải làm lại.

## Bắt đầu / tiếp tục

1. Không có `.ai/profile.md` → bước 0.
2. Hỏi: item mới · tiếp tục item đang chạy (liệt kê item có bảng *Solo pipeline* chưa xong).
3. Tiếp tục → đọc bảng: bước đầu tiên không phải ✅/⏭ là bước hiện tại; có ↩ → làm bước ↩ sớm nhất trước.
   Kiểm file output của các bước ✅ còn tồn tại và khớp; lệch → báo và hỏi.
4. In lộ trình: các bước còn lại + bước sắp chạy → hỏi bắt đầu.

## Kết thúc
G5 ✅ → in tổng kết item: file tạo ra, commit/PR, phiên bản release, việc còn treo (DEC có điều kiện, câu hỏi mở,
chore đề xuất). Đánh dấu pipeline xong trong `00-status`.
