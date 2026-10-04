# BE Spec — <Tên tính năng> · <component, vd: api / worker>

| | |
|---|---|
| Tác giả | |
| Reviewer | |
| Trạng thái | Draft · In review · Approved · Implemented |
| Tổng quan & contract | <link 02-tech-spec.md> |
| Last update | <YYYY-MM-DD> · <role> |

> **TL;DR** — <module nào, bảng nào, endpoint nào, job nào, điểm khó nhất>

<!-- Đối tượng đọc: dev BE và reviewer BE. Đọc xong code được không cần hỏi lại.
Không viết lại contract — trỏ API-xx trong 02. Áp cho mọi component phía server: API, worker, job,
CLI, data pipeline, thư viện. Mục không áp dụng: "N/A — <lý do>". -->

---

## 1. Phạm vi
| API / job / lệnh | FR | Ghi chú |
|---|---|---|
| API-01 | FR-01.01 | |

## 2. Cấu trúc code
<!-- Theo kiến trúc sẵn có của repo (layer / module). Chỉ ra file mới & file sửa. -->
| Layer / module | File | Mới / sửa | Trách nhiệm |
|---|---|:---:|---|

## 3. Data
| Bảng / collection | Field | Kiểu | Null | Default | Index / ràng buộc |
|---|---|---|:---:|---|---|

**Migration:** <tên file · bước · backfill · tương thích ngược với code cũ đang chạy · down/rollback>
**Dữ liệu nhạy cảm:** <field mã hoá / hash / che khi log>

## 4. Implement API
| API | Validate input | AuthZ (kiểm ở đâu) | Logic chính | Transaction / lock | Lỗi trả về |
|---|---|---|---|---|---|

## 5. Quy tắc nghiệp vụ → nơi thực thi
| BR | Thực thi ở (service / constraint DB / job) | Test |
|---|---|---|

## 6. Concurrency & toàn vẹn
<!-- Race condition, idempotency key, unique constraint, optimistic lock, retry an toàn. -->

## 7. Job nền · queue · tích hợp ngoài
| Tên | Trigger / lịch | Input | Làm gì | Retry / timeout | Lỗi cuối thì |
|---|---|---|---|---|---|

## 8. Cache & hiệu năng
| Chỗ | Chiến lược | Invalidate | Mục tiêu (NFR) |
|---|---|---|---|

## 9. Config · secret · flag
| Key | Mặc định | Môi trường | Ý nghĩa |
|---|---|---|---|

## 10. Observability
| Loại | Tên / nội dung | Ngưỡng cảnh báo |
|---|---|---|
| Log | | |
| Metric | | |

## 11. Test BE
| Mức | Phạm vi | Case chính (TC-xx) |
|---|---|---|
| Unit | service, BR | |
| Integration | API + DB | |
| Contract | khớp 02 §6 | |

## 12. Task
| # | Việc | FR / API | Phụ thuộc | Ước lượng |
|---|---|---|---|---|

## Decisions
| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
