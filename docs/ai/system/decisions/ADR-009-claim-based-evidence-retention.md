# ADR-009 — Bằng chứng được giữ theo hồ sơ khiếu nại chưa đóng (thay cờ "giữ clip")

| | |
|---|---|
| Trạng thái | Accepted (2026-10-05, item 02 v0.2 sau review G2 lượt 1 — DEC-263) |
| Tác giả | khanhtt (Architect, agent soạn) |
| Reviewer | khanhtt (review subagent bước 5) |
| Người chốt | khanhtt (tự quyết theo ủy quyền user) |
| Ngày | 2026-10-05 (v0.3 sau review G2 lượt 2: giữ thêm 7 ngày sau khi nhận, rollback lặp lại được — DEC-268, DEC-270) |
| Work item / yêu cầu | [item 02](../../items/02-returns-reconciliation/02-tech-spec.md) §8, API-42, API-131..134, migration 0004 · FR-02.06, FR-02.09, BR-09 · [06-business-qa](../../items/01-packing-mvp/06-business-qa.md) L7 |

> **TL;DR** — Clip và ảnh gắn với một hồ sơ khiếu nại chưa `CLOSED` — và clip / ảnh của phiên đóng gói hiệu lực + phiên mở hoàn của kiện thuộc hồ sơ hàng hoàn chưa kết thúc — không bị retention xóa; khi hồ sơ đóng, hạn xóa = max(lúc tạo clip, lúc đóng hồ sơ) + số ngày giữ clip. Cờ `clip.held` thôi là cơ chế chính: dữ liệu cũ được chuyển thành hồ sơ "Chuyển từ cờ giữ", API giữ chỉ còn cho Admin.
> Vì sao: một đối tượng có người phụ trách, hạn và trạng thái quyết định việc giữ bằng chứng; không ai bỏ giữ lén (L7).
> Đánh đổi lớn nhất: cần migration dữ liệu và downgrade có điều kiện; giữ bằng chứng giờ phụ thuộc người dùng đóng hồ sơ đúng lúc.

## Bối cảnh

| Ràng buộc | Con số / nguồn |
|---|---|
| SRS gốc FR-02.06, BR-09: clip gắn hồ sơ khiếu nại chưa đóng không bị xóa | SRS hệ thống §5.2, §7.3 |
| Phase 1 thay tạm bằng cờ giữ từng clip, Supervisor / CSKH bật tắt tự do | item 01 FR-02.09, DEC-3; `media/service.py:514`, `:641` |
| L7 (06-business-qa): CSKH bỏ giữ được, không biết vì sao giữ, giữ tới bao giờ | Minor, đưa vào item 02 |
| Clip gốc bất biến, SHA-256, chỉ retention được xóa | ADR-008 |
| Phase 2 có M08 hồ sơ khiếu nại thật | item 02 FR-08.* |

## Tiêu chí quyết định
| Tiêu chí | Trọng số / ngưỡng |
|---|---|
| Không mất bằng chứng đang tranh chấp | Bắt buộc — 0 clip gắn hồ sơ mở bị xóa (AC-26) |
| Một nguồn sự thật cho "vì sao giữ" | Cao |
| Không mất clip đang giữ khi nâng cấp | Bắt buộc — đếm trước = sau |
| Rollback được | Cao |

## Các phương án
| Phương án | Ưu | Nhược | Chi phí / rủi ro |
|---|---|---|---|
| A. Giữ theo hồ sơ khiếu nại, chuyển cờ cũ thành hồ sơ | Có chủ, có hạn, có trạng thái; khớp SRS gốc | Migration dữ liệu | Thấp — số clip giữ nhỏ |
| B. Giữ cả cờ và hồ sơ ngang nhau | Không migration | Hai nguồn sự thật; L7 còn nguyên | Thấp, nhưng không giải quyết vấn đề |
| C. Xóa hẳn cờ giữ và API-42 | Gọn | Mất đường khẩn cấp; phá client cũ | Trung bình |

## Quyết định
Chọn **A**, mở rộng sau review G2 (R-1, DEC-245). J-02 bỏ qua clip / ảnh của: (a) phiên là bằng chứng (`claim_evidence`) của hồ sơ có `status ≠ CLOSED`; (b) phiên PACK hiệu lực và mọi phiên RETURN của kiện thuộc `return_case` `EXPECTED` / `INSPECTING` / `PARTIALLY_RECEIVED` / `MISSING`, và thêm 7 ngày sau `received_at` khi đã nhận (khớp hạn sửa kết luận — item 02 DEC-268); (c) như (b) với `NO_PARCEL` trong 30 ngày từ `reported_at` — vì hàng hoàn cần clip đóng gói **trước** khi biết có khiếu nại (kiện quá hạn về sau 62 ngày với retention 60 ngày vẫn còn clip). Ảnh `PACK_CLOSE` theo phiên PACK. J-02 khóa từng clip `FOR UPDATE` và kiểm lại bảo vệ dưới khóa; tạo hồ sơ / thêm bằng chứng khóa clip của phiên (theo id) và kiểm lại `status` (DEC-251). J-02 dùng max(`retention_clip_days`, `RETENTION_CLIP_MIN_DAYS`); migration nâng setting thấp hơn sàn (DEC-257). Với (a): hồ sơ `CLOSED` → hạn = max(`clip.end_at`, `claim.closed_at`) + `retention_clip_days`. Clip `held = true` vẫn được bỏ qua (đường khẩn cấp, chỉ ADMIN qua API-42, deprecated). Migration 0004 chuyển mọi clip đang giữ thành hồ sơ `source = LEGACY_HOLD` theo kiện (hạn nhắc 30 ngày, không tính BR-27), đặt `held = false`; kiểm **tập con**: mọi clip `held` trước ∈ tập được bảo vệ sau (tập sau lớn hơn vì bảo vệ theo phiên) — sai thì raise, cả migration một transaction (DEC-250). Downgrade đặt `held = true` cho mọi clip đang được bảo vệ (hồ sơ chưa đóng + hồ sơ hàng hoàn chưa kết thúc) để code cũ vẫn giữ, rồi xóa hồ sơ `LEGACY_HOLD` (DEC-252). Loại B vì không sửa L7; loại C vì cần đường khẩn cấp tới khi hồ sơ chạy ổn (gỡ ở Phase 3).

## Hệ quả
| Loại | Nội dung |
|---|---|
| Tốt | Lý do giữ nằm trong hồ sơ (loại, người phụ trách, hạn, ghi chú); D4 hiện "Đang được bảo vệ bởi KN-…"; không còn nút bỏ giữ ở UI |
| Xấu / đánh đổi | Hồ sơ bị bỏ quên ở trạng thái mở → clip giữ vô hạn (tốn ổ); đóng hồ sơ sớm → bằng chứng theo retention thường |
| Phải làm thêm | J-02 join `claim_evidence` + `return_case_package`; API-31 `protection` `{reasons, claims, return_cases, until}`; D2 / D16 nhắc hồ sơ quá hạn; migration 0004 + downgrade; contract test API-42 403 cho SUPERVISOR / CSKH |

## Câu hỏi mở & điều kiện xem lại
- Q13 (hạn khiếu nại thật): nếu sàn cho khiếu nại > 90 ngày sau giao → xem lại mặc định `retention_clip_days` và sàn tối thiểu 60 ngày (DEC-210 item 02).
- Dung lượng: nếu clip được hồ sơ giữ > 10 % ổ video → thêm cảnh báo hồ sơ mở quá lâu.
- Phase 3: gỡ API-42 khi 3 tháng không có lần dùng (audit `HOLD_CLIP`).
