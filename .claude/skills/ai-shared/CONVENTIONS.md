# Bộ skill `ai-*` — Quy ước chung (SSOT)

> Mọi skill `ai-[role]-[action]` **đọc file này trước**. Skill chỉ chứa *quy trình*. Mọi thứ *riêng của dự án*
> (stack, lệnh, tracker, nhánh, môi trường, deploy) nằm trong **hồ sơ dự án** `.ai/profile.md`.
> Nhờ vậy một bộ skill chạy được cho mọi loại dự án. Template: `templates/` (cùng thư mục này).

---

## 1. Ba lớp tách bạch

| Lớp | Ở đâu | Thay đổi khi |
|---|---|---|
| **Quy trình** (role, gate, artifact, luật) | `~/.claude/skills/ai-*` | Cải tiến cách làm |
| **Hồ sơ dự án** (adapter) | `<repo>/.ai/profile.md` | Stack / hạ tầng / đội đổi |
| **Tri thức sản phẩm** | `<docs_root>/` (mặc định `docs/ai/`) | Mỗi work item |

🚫 Skill không hardcode tên repo, framework, lệnh, tool. Cần → đọc profile. Thiếu → hỏi (option), **ghi bổ sung vào profile**.

## 2. Component: BE hay FE

Mỗi component trong profile có **loại** quyết định spec, skill dev và checklist review:

| Loại | Gồm | Spec | Skill |
|---|---|---|---|
| `be` | API, service, worker/job, CLI, data pipeline, thư viện, hạ tầng-as-code | `02a-be-spec.md` | `ai-be-write-spec` · `ai-be-implement` |
| `fe` | web, mobile, desktop, kiosk — bất kỳ client có UI | `02b-fe-spec-<client>.md` (1 file / client) | `ai-fe-write-spec` · `ai-fe-implement` |

Item chỉ chạm BE → không có 02b; chỉ chạm FE → không có 02a (ghi lý do trong `00-status`).

## 3. Artifact của một work item

Thư mục `<docs_root>/items/<NN>-<slug>/`. `NN` = max hiện có + 1 (đội nhiều người → kiểm cả nhánh remote/PR mở).

| File | Skill tạo | Người đọc chính | Gate |
|---|---|---|:---:|
| `00-status.md` | `ai-flow-route` (mọi skill cập nhật) | cả đội | — |
| `01-srs.md` — SRS | `ai-po-write-srs` (+ §10 bởi `ai-ux-design-screens`) | cả đội, nghiệp vụ, khách | **G1** |
| `02-tech-spec.md` — tổng quan + API contract | `ai-architect-write-spec` | BE, FE, QA | |
| `02a-be-spec.md` | `ai-be-write-spec` | dev BE, reviewer | |
| `02b-fe-spec-<client>.md` | `ai-fe-write-spec` | dev FE, reviewer | **G2** (cả bộ 02) |
| `03-plan.md` | `ai-pm-plan-tasks` | đội, PM | Plan |
| *code + test + PR* | `ai-be-implement` / `ai-fe-implement` | reviewer | **G3** |
| `04-test-cases.md` | `ai-qa-write-cases` | người chạy test | |
| `04a-test-report.md` (1 file / lần chạy, hoặc cập nhật theo lần) | `ai-qa-run-tests` | người duyệt release | **G4** |
| `05-release.md` | `ai-ops-release` | ops, chủ sản phẩm | **G5** |

Viết tắt trong skill: `01` SRS · `02` tổng quan · `02a` BE spec · `02b` FE spec · `03` plan · `04` cases · `04a` report · `05` release.

**Tri thức hệ thống** `<docs_root>/system/`: `SRS.md` (SRS cả hệ thống) · `system-map.md` (module, data, API, màn,
tích hợp — nền cho reuse-first) · `decisions/ADR-NNN-*.md`.
**SRS hệ thống vs SRS item:** chưa có `system/SRS.md` → item đầu viết SRS cả hệ thống ở đó, `01-srs.md` trỏ tới.
Item sau: `01-srs.md` chỉ viết phần thay đổi, giữ ID cũ, mục không đổi ghi "Không đổi — xem SRS hệ thống §x".
Sau G5, `ai-ops-release` nhắc gộp thay đổi vào `system/SRS.md` + `system-map.md`.

## 4. Luồng chuẩn — ma trận input → output

Skill **kiểm input bắt buộc trước khi làm**. Thiếu → báo thiếu gì + hỏi: quay về skill tạo input (khuyến nghị) ·
làm trên bản nháp có đóng dấu `Draft` + DEC rủi ro · dừng.

| # | Skill | Input bắt buộc | Output | Kế tiếp |
|:-:|---|---|---|---|
| 0 | `ai-flow-init` | repo | `.ai/profile.md`, `system/system-map.md` | `ai-flow-route` |
| 1 | `ai-flow-route` | profile | item + `00-status` (lane) | theo lane |
| 2 | `ai-po-write-srs` | input thô | `01` (+ `system/SRS.md`) | G1 → 3 |
| 2b | `ai-ux-design-screens` *(có UI)* | `01` §4–§6 | `01` §10 | quay về PO chốt G1 |
| 3 | `ai-architect-write-spec` | `01` G1 ✅ | `02` (contract, data chung, kiến trúc) | 4a ∥ 4b |
| 4a | `ai-be-write-spec` | `02` contract | `02a` | 5 |
| 4b | `ai-fe-write-spec` | `02` contract + `01` §10 | `02b-<client>` | 5 |
| 5 | `ai-lead-review` (spec) | `02` + `02a` + `02b` | findings → **G2** | 6 ∥ 7 |
| 6 | `ai-pm-plan-tasks` | G2 ✅ (§12/§14 task của spec con) | `03` (+ ticket) | Plan → 8 |
| 7 | `ai-qa-write-cases` | G2 ✅ | `04` | chờ G3 |
| 8a | `ai-be-implement` | Plan ✅, task BE, `02a` | code + test + PR | 9 |
| 8b | `ai-fe-implement` | Plan ✅, task FE, `02b` (BE chưa xong → mock theo `02` §6) | code + test + PR | 9 |
| 9 | `ai-lead-review` (code) | PR / diff + spec | findings → **G3** | 10 |
| 10 | `ai-qa-run-tests` | G3 ✅, `04`, build trên môi trường test | `04a` + bug → **G4** | 11 |
| 11 | `ai-ops-release` | G4 ✅ | `05` → **G5** | đóng item |

**Solo dev:** `ai-solo-build-feature` chạy tuần tự các bước 0 → 11 (không song song), checkpoint sau mỗi bước, gate tại G1–G5.

**Lane khác:** prototype `ai-po-prototype` → về bước 2 · fix `ai-dev-fix` → 9 → 10 (P0/P1) → 11 ·
chore `ai-architect-write-spec` (gọn) → 4a/4b nếu cần → 8 → 9 → 11.

**Vòng phản hồi:** bước sau phát hiện lỗi ở artifact bước trước → ghi *Phản hồi* trong `00-status`
(từ · tới · nội dung) → owner artifact đó sửa, tăng phiên bản, báo lại. Không tự sửa file của vai khác.
Đổi contract `02` sau G2 → architect cập nhật + báo BE, FE, QA (ghi DEC).

## 5. Gate

| Gate | Chốt | Duyệt bởi | Điều kiện thoát |
|:---:|---|---|---|
| **G1** | Yêu cầu | PO | Mọi vấn đề có FR; FR mức M có AC kiểm được; phạm vi rõ; câu hỏi chặn = 0 |
| **G2** | Thiết kế | Tech lead (`ai-lead-review`) | Mọi FR/BR/NFR có chỗ trong spec; contract đủ để BE ∥ FE ∥ QA; 02a/02b khớp 02 |
| **Plan** | Kế hoạch | PM (+ PO, tech lead ở M/L) | Mọi FR mức M có task; thứ tự & phụ thuộc rõ |
| **G3** | Build | Tech lead (`ai-lead-review`) | Task Done theo DoD; review đạt; build/lint/test không thêm lỗi |
| **G4** | Kiểm thử | QA | Mọi AC + FR mức M có TC pass có bằng chứng; bug Critical/High = 0 |
| **G5** | Release | Ops + chủ sản phẩm | Lên đích, hậu kiểm xong, có rollback |

1. **Agent không tự Pass gate.** In checklist → hỏi duyệt bằng option → chỉ tick khi user chọn Duyệt.
2. Quy mô `S`: một người nhiều vai; vẫn hỏi duyệt, được gộp G1+G2 hoặc G3+G4 trong một lần hỏi.

## 6. Luật cứng

1. **Hỏi bằng lựa chọn.** `AskUserQuestion`, 2–4 option, khuyến nghị đứng đầu kèm hệ quả; ≤ 4 câu/lượt; text tự do → option "Khác".
2. **Không bịa.** Khẳng định về hệ thống hiện tại phải có nguồn (file:line, lệnh, tài liệu). Không rõ → *Câu hỏi mở*.
3. **Truy vết.** ID ổn định, không đánh lại: `P<n>` vấn đề · `M<nn>` module · `FR-<nn>.<nn>` · `UC-<nn>` · `BR-<nn>` ·
   `NFR-<nn>` · `EX-<n>` · `AC-<nn>` nghiệm thu · `API-<nn>` · `RK-<nn>` · `Q<n>` · `DEC-<n>` · `T-<n>` · `TC-<nn>.<nn>` · `BUG-<n>`.
   Chuỗi: P → FR/UC/BR → API / mục spec → T → TC; AC → TC. Mỗi artifact có **bảng phủ**.
4. **Reuse-first.** Trước khi tạo mới (bảng, API, màn, component, module) → quét `system-map.md` + code. Phân loại
   `REUSE | EXTEND | NEW` có bằng chứng. NEW khi đã có thứ gần giống → hỏi.
5. **Quyết định ghi lại** — `DEC-n` (bối cảnh · lựa chọn · lý do · người chốt). Quyết định kiến trúc lớn → ADR.
6. **Đúng vai, đúng file.** Chỉ sửa artifact mình tạo (bảng §3).
7. **Báo cáo trung thực.** Fail → nói fail kèm output. Repo đỏ sẵn → đo baseline trước/sau, báo "không thêm lỗi",
   không báo "xanh". Không chạy được → nói "không chạy được".
8. **Stamp.** Sửa artifact → `Last update: <ngày> · <role>` + 1 dòng *Lịch sử* trong `00-status` + cập nhật *NOW*.
9. **An toàn.** Không commit/push/merge, tạo ticket, deploy, chạy migration, xoá dữ liệu khi user chưa chọn option cho phép.
   Production chỉ qua `ai-ops-release` sau G4 và khi user cho phép đúng lần đó.
10. **Một skill — một hành động — xong trọn.** Không làm việc của skill khác trong cùng lượt; xong thì handoff.

## 7. Quy mô

| | `S` (solo / nội bộ) | `M` (đội nhỏ) | `L` (nhiều đội / compliance) |
|---|---|---|---|
| Tài liệu | `01` + `02` gộp contract & spec con ngắn; mục thừa "N/A" | đủ bộ | đủ bộ + ADR |
| Review | tự soát checklist | `ai-lead-review` cho bộ 02 và code | mọi artifact, 2 người |
| Plan | task list cuối spec con | `03` + tracker | `03` + tracker + milestone |

## 8. Khuôn hỏi chuẩn

**Duyệt gate:** 1 Duyệt ✅ — tick `00-status` · 2 Chưa — sửa tiếp · 3 Duyệt có điều kiện (ghi DEC) · 4 Dừng.

**Kết thúc lượt:** in *đã làm gì · file nào · còn gì mở* → hỏi bước tiếp (option 1 = skill kế tiếp theo ma trận §4).

## 9. Văn phong tài liệu *(ngắn gọn, đủ để người khác đọc hiểu)*

Theo lối design doc của các đội kỹ thuật lớn (Airbnb, Google, Uber): người đọc bận, đọc lướt, phải ra quyết định.

1. **TL;DR đầu tài liệu** — ≤ 5 dòng; chỉ đọc TL;DR vẫn biết làm gì, vì sao, rủi ro gì.
2. **Header metadata** — owner, reviewer, trạng thái (Draft → In review → Approved → Implemented), link nguồn, last update.
3. **Mỗi mục trả lời một câu hỏi.** Mục rỗng → "N/A — lý do", không xoá.
4. **Bảng hơn đoạn văn; một dòng một ý; câu chủ động có chủ ngữ.**
5. **Con số thay tính từ** — "≤ 1 giây", không "nhanh".
6. **Link, không chép** — spec trỏ ID SRS; spec con trỏ API-xx của `02`; test trỏ cả hai.
7. **Goals cạnh Non-goals** — chặn scope creep.
8. **Quyết định kèm phương án bị loại** và lý do.
9. **Sơ đồ khi chữ dài hơn 5 dòng** — mermaid (flowchart, sequence, state, ER); màn hình phác ASCII.
10. **Hướng dẫn viết trong template nằm trong `<!-- -->`** — không hiện khi render.
11. **Độ dài theo quy mô** — S ~1–3 trang/file · M ~3–8 · L tuỳ, TL;DR vẫn ≤ 5 dòng.
