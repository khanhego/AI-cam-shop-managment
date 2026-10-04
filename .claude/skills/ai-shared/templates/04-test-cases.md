# Test Cases — <Tên tính năng / hệ thống>

| | |
|---|---|
| QA | |
| Trạng thái | Draft · Ready · Executing · Passed (G4) |
| Nguồn | SRS <link> · Tech Spec <link> |
| Build / môi trường | <commit · env> |
| Last update | <YYYY-MM-DD> · QA |

> **TL;DR** — <N case theo module · bao nhiêu P1 · bao nhiêu tự động hoá> · Kết quả chạy & bug: <link 04a-test-report.md>

<!-- Đối tượng đọc: người chạy test (kể cả người mới) và người duyệt release. Mỗi case chạy lại được
bởi người khác mà không cần hỏi. -->

---

## 1. Phạm vi & chiến lược

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| | |

| Mức | Phạm vi | Công cụ / lệnh | Tự động |
|---|---|---|:---:|
| Unit | | | ✔ |
| API / integration | | | |
| E2E / UI | | | |
| NFR | | | |

**Dữ liệu test:** <cách tạo · tiền tố nhận diện · cách dọn>

**Vào:** <build deploy được, spec Approved, data sẵn> · **Ra:** <mọi AC pass, bug Critical/High = 0>

## 2. Test cases
<!-- Loại: Happy · Negative · Boundary · Permission · State · Regression · NFR.
Ưu tiên: P1 (chặn release) · P2 · P3. Kết quả: ⬜ chưa chạy · ✅ pass · ❌ fail · ⛔ blocked. -->

### M01 — <Module>

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|:---:|
| TC-01.01 | | FR-01.01 · AC-01 | Happy | P1 | | 1. … 2. … | | ⬜ |
| TC-01.02 | | FR-01.01 · BR-02 | Negative | P1 | | | | ⬜ |

<!-- Case phức tạp (nhiều bước / nhiều dữ liệu) — viết chi tiết bên dưới thay vì nhồi vào bảng: -->
<details><summary>TC-01.0x — chi tiết</summary>

| Bước | Thao tác | Dữ liệu | Kỳ vọng |
|---|---|---|---|
| 1 | | | |
</details>

## 3. Phân quyền
| Hành động | <Role 1> | <Role 2> | <Role 3> | TC |
|---|:---:|:---:|:---:|---|
| | ✅ được | ⛔ bị chặn (403) | | |

## 4. Phi chức năng
| ID | NFR | Kịch bản & tải | Ngưỡng đạt | Kết quả đo |
|---|---|---|---|---|

## 5. Truy vết
| FR / AC / BR | TC | Đạt |
|---|---|:---:|

## Chốt G4
- [ ] Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng
- [ ] Ma trận quyền đã chạy
- [ ] NFR có ngưỡng đã đo
- [ ] Bug Critical/High = 0 (hoặc có DEC chấp nhận)
- [ ] Regression vùng bị chạm đã chạy
