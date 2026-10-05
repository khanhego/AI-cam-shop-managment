# <NN>-<slug> — Release

| | |
|---|---|
| Owner (Ops) | |
| Reviewer | Chủ sản phẩm (duyệt G5) |
| Trạng thái | Planned · In progress · Released (G5) · Rolled back |
| Test report | <link 04a-test-report.md> (G4) |
| Môi trường đích | |
| Last update | <YYYY-MM-DD> · Ops |

> **TL;DR** — <phát hành gì · lên môi trường nào · có migration/đổi dữ liệu không · rủi ro chính · cách rollback 1 câu>

<!-- Đối tượng đọc: ops và chủ sản phẩm. Ghi log thật từng bước; không có bước nào → "N/A — lý do". -->

---

## 1. Nội dung release
| Hạng mục | Chi tiết |
|---|---|
| Version / tag | |
| Commit / PR | |
| Migration / thay đổi dữ liệu | |
| Config / secret / feature flag | |
| Phụ thuộc release khác | |

## 2. Tiền kiểm
- [ ] G4 ✅
- [ ] CI xanh trên commit release
- [ ] Migration đã chạy thử ở staging, có script rollback
- [ ] Backup / snapshot dữ liệu (nếu đổi dữ liệu)
- [ ] Config/secret đã có ở môi trường đích
- [ ] Release note

## 3. Kế hoạch & log deploy
| Bước | Lệnh / thao tác | Kết quả | Thời gian |
|---|---|---|---|

## 4. Hậu kiểm
| Kiểm | Cách | Kết quả |
|---|---|---|
| Smoke theo UC chính | | |
| Log / error rate / metric | | |

## 5. Rollback
- Điều kiện kích hoạt:
- Các bước:

## 6. Release note (cho người dùng)
