# Test Report — 03 Mở rộng: TikTok Shop, báo cáo, sao lưu cloud, link chia sẻ, thông báo · lần 1 (G4, Phase 3)

| | |
|---|---|
| QA (tác giả) | khanhtt |
| Reviewer | Tech lead · PO (duyệt G4) |
| Trạng thái | Draft — sau lượt sửa G4 (DEC-970..979): mọi bug G4 đã sửa, QA đánh giá **đạt có điều kiện** (DEC-979). G4 **chưa tick** trong `00-status` — người điều phối quyết |
| Build / commit | Nhánh `feat/03-expansion-tiktok`. BE `fe9bfe5`, FE `e3fa8ce` (gồm sửa G3 DEC-850..877, 900..910 và G3V-1..3 DEC-932..935). Test mới G4 (chỉ file test) ở BE `b8ea2be` — §3. **Lượt sửa G4:** BE `077e0ca`..`cc5dddf` (CSV `;`, API-21 ghi chú, W1, cô lập test + khóa một-pytest, 12 hàm test mới), FE `e893a36` (MSW CSV `;`) — §7 |
| Môi trường | (a) Stack QA riêng `aicam-qa` (`docker compose -p aicam-qa -f docker/compose.dev.yml -f docker/compose.qa.yml`, API :8280, FE :5281, MinIO, `worker-sync`, `worker-sync-long`, `worker-backup`, `worker-notify`, `worker-export`, camera giả, adapter mock Shopee 2 shop + TikTok 2 shop, `NOTIFY_TRANSPORT=mock`): QA live 182/182 và E2E BE thật 75 + 1 skip, chạy 2026-10-08 sau sửa G3 (DEC-941). (b) Lượt G4 này: không docker, không gọi :8180 — pytest unit / contract / integration trên Postgres `aicam_test` (:55432) + Redis db 15 (:56379), vitest, Playwright + MSW (dev:mock :5180), Chrome và Microsoft Excel trên máy dev. Máy dev MacBook (Apple Silicon, macOS, vùng en_VN). Không có: TikTok partner thật, Shopee partner thật, nhà cung cấp S3 thật, bot Telegram / Zalo thật, camera / máy quét thật, server kho, điện thoại, mạng kho |
| Ngày chạy | 2026-10-08 |
| Test cases | [04-test-cases.md](04-test-cases.md) (378 case, cột KQ đã điền) |
| Last update | 2026-10-08 · QA (lượt sửa G4 — §7) · 2026-10-08 · QA |

> **TL;DR (sau lượt sửa G4, DEC-979)** — **Kết luận (QA): ⚠️ đạt có điều kiện.** Bug mở = 0: BUG-G4-1 (CSV `;` — Excel thật tách cột), BUG-G4-2 (cô lập test + khóa một-pytest) và 1 lỗi Low do test mới lộ (API-21 ghi chú 501 ký tự trả lời nhắn tiếng Anh) đã sửa, có test đỏ trước.
> 378 case: ✅ 359 · ❌ 0 · ⛔ 16 (chưa test — thiếu tài nguyên) · ⬜ 3 (N3.02, N3.11, N3.14). **P1: 209 ✅ · 0 ❌ · 1 ⛔ (TC-MG3.19) · 0 ⬜** / 210.
> AC-40..62: 17 ✅ · 6 ⚠️ (AC-43, 47, 48, 50 chỉ máy dev; AC-51 N3.11 ⬜; AC-52 điện thoại ⛔) · 0 ❌.
> Lượt G4 đầu (giữ để đối chiếu): ✅ 346 · ❌ 1 · ⛔ 15 · ⬜ 16; P1 208 ✅ · 1 ❌; AC 16 ✅ · 6 ⚠️ · 1 ❌ (AC-47).
> 14 hàm test mới (BE, chỉ thêm test; 22 kết quả pass) đóng 20 case ⬜, không lộ bug sản phẩm. Hồi quy: BE unit + contract 883 pass; BE full 1748 pass / 1 fail (BUG-G4-2, lỗi cô lập test có sẵn, không phải sản phẩm); FE vitest 787 pass; E2E mock 44 pass.
> Go-live còn chặn bởi: Q13 + L14, Q18 / Q19 (TikTok partner), Q20 (S3 + NĐ 13), Q21 (kênh chat), T-3, T-4, server kho, điện thoại, mạng kho (§6).

<!-- Đối tượng đọc: người duyệt G4/G5. Báo cáo trung thực (CONVENTIONS §6.7). -->

## 1. Tổng hợp

**Cách tính KQ** — như Phase 2 (DEC-70 item 01, `04` §2; áp cho item 03 ở DEC-951):

| Ký hiệu | Khi nào |
|---|---|
| ✅ | Có test pass ở đúng mức cột **Cách**. `API` tính khi pass QA live trên stack hoặc `INT` (HTTP vào app, Postgres / Redis thật). `E2E` tính khi pass E2E BE thật, hoặc **ghép**: phần BE pass ở `API` / `INT` **và** phần UI pass ở vitest / Playwright MSW. `MAN` tính khi QA làm thủ công hoặc dùng công cụ thật tự động thay mắt người (trình duyệt Chrome, Microsoft Excel — DEC-952). "máy dev" = số đo chỉ trên máy dev |
| ❌ | Test chạy và sai kỳ vọng |
| ⛔ | Chưa test — thiếu tài nguyên (TikTok / Shopee partner thật, S3 thật, bot thật, camera / máy quét, server kho, điện thoại, mạng kho). Bản mock pass vẫn giữ ⛔ |
| ⬜ | Chưa có bằng chứng (chưa có test, hoặc test chỉ phủ một phần kỳ vọng) |

Viết tắt tham chiếu trong cột KQ của `04`: **QA** = QA live G3 (`g3-qa-live.txt`) · **E2E thật** = `g3-e2e-real.txt` · **E2E mock** = `evidence/g4/fe-e2e-mock.txt` · **INT** = `evidence/g4/be-integration.txt` · **UNIT** = `evidence/g4/be-unit-contract.txt` · **vt** = vitest (`evidence/g4/fe-vitest.txt`) · **G4** = test mới lượt này (`evidence/g4/extra-g4-new-tests.txt`).

| Module | Tổng | ✅ Pass | ❌ Fail | ⛔ Thiếu tài nguyên | ⬜ Chưa có bằng chứng |
|---|---|---|---|---|---|
| M05 Sàn: nhiều shop, TikTok | 47 | 47 | 0 | 0 | 0 |
| M03 Station đóng gói | 17 | 17 | 0 | 0 | 0 |
| M04 Phiên mở hoàn (BR-37, D13, mã trùng) | 22 | 22 | 0 | 0 | 0 |
| M08 Hồ sơ khiếu nại (L11, L13, L14, L15) | 38 | 38 | 0 | 0 | 0 |
| M02 Sao lưu cloud | 47 | 47 | 0 | 0 | 0 |
| KR Khôi phục từ cloud | 14 | 14 | 0 | 0 | 0 |
| MS Clip / ảnh "Thiếu tệp" | 10 | 10 | 0 | 0 | 0 |
| M07 Lọc sàn / shop, link chia sẻ, W1 | 34 | 34 | 0 | 0 | 0 |
| M06 Thông báo | 35 | 34 | 0 | 1 | 0 |
| M09 Báo cáo, D2 | 18 | 18 | 0 | 0 | 0 |
| M10 Nhật ký, `/me` | 5 | 5 | 0 | 0 | 0 |
| ST3 Chuyển trạng thái | 9 | 9 | 0 | 0 | 0 |
| MG3 Migration, nâng cấp / lùi | 20 | 19 | 0 | 1 | 0 |
| R3 Hồi quy Phase 1 / 2 | 12 | 12 | 0 | 0 | 0 |
| X3 Tài nguyên ngoài | 14 | 0 | 0 | 14 | 0 |
| **Chức năng** | **342** | **326** | **0** | **16** | **0** |
| Phân quyền TC-P3.01..22 | 22 | 22 | 0 | 0 | 0 |
| Phi chức năng TC-N3.01..14 | 14 | 11 (5 chỉ máy dev) | 0 | 0 | 3 |
| **Tổng** | **378** | **359** | **0** | **16** | **3** |
| **Trong đó P1** | **210** | **209** | **0** | **1** | **0** |

Bảng trên là số **sau lượt sửa G4** (§7). **Mức bằng chứng của 346 case ✅ lượt G4 đầu** (13 case ✅ thêm ở lượt sửa — §7):
- QA live / E2E BE thật trên stack `aicam-qa` (build G3): phần lớn case `API` / `E2E` P1 có dữ liệu seed (TC-05.51, 05.55, 05.73, 03.86, 03.92, 07.40, 07.41, 07.46, 07.48, 07.51, 07.62, 08.53, 08.59, 08.64, 08.72, 02.50, 02.53..02.57, 02.65, 02.70..02.72, 02.78, 02.80, KR.11, MS.01, 03, 07, 08, 06.41, 06.43, 06.44, 09.30..09.37, 09.45, 10.44, R3.01..R3.03, R3.08, R3.11; E2E thật AC-40, EX-T7, D13, D17 L15, D2, D14 L13, báo cáo, sao lưu, link, thông báo, station Phase 3).
- `INT` trên build G4 (đồng hồ giả, mock nhiều shop, `MemoryStore`): job theo shop, BR-29 §5.1, BR-37..42, sao lưu J-20..J-23, khôi phục, link J-24 / J-25, thông báo J-26..J-28, migration.
- **Ghép** (BE `INT` / QA + UI vitest / MSW): 47 case, ghi "ghép" trong cột KQ.
- Test MinIO tạm (`test_backup_security_nfr41` 1 test, `test_share_security_nfr42` 2, `test_cloud_minio` 4, `test_perf_backup_throttle` 2) **skip** trên build G4 vì không có MinIO tạm (lượt này không chạy docker). Kết quả pass của chúng lấy từ T-218 / T-221 / T-280 (build cũ hơn) — DEC-954. **Lượt sửa G4: chạy lại cả 11 test trên MinIO tạm riêng → 11 passed** ([be-minio-tests](evidence/g4/be-minio-tests.txt), DEC-976). Ảnh hưởng: TC-02.82, 02.84, 07.73, N3.08, N3.09, P3.20 (các case này còn bằng chứng khác trên build G4: QA live MinIO, `INT` `MemoryStore`, E2E thật).

**Ghi chú với case ✅** (mẫu nhỏ hơn `04` hoặc chỉ cấu hình):
- TC-05.76: song song 10 lượt (`04` ghi 20). TC-R3.09 (test mới): 20 lượt, 4 đường đồng thời.
- TC-05.67, 05.87 (NFR-38): lịch beat 300 / 900 giây + `INT` job; chưa đo đầu-cuối trên stack.
- TC-07.64: URL ký kiểm ở hạn 3 ngày; chưa kiểm riêng 7 ngày = 604.800 giây.
- TC-KR.01, N3.07: diễn tập trên 2.000 kiện máy dev (DB khôi phục 1,0 giây). Máy kho TC-X3.12 ⛔.
- TC-MG3.17, 18: thời gian migration 1 triệu đơn đo ở T-201 / T-289 (máy dev); image cũ → mô phỏng bằng thư mục Alembic (như Phase 2 MG.06).
- TC-06.47: tin chờ của kênh bị xóa cùng kênh (audit `dropped_messages`), không còn dòng `DROPPED` để xem — đúng ý "tin bị bỏ".

| AC (SRS v0.5 §13) | Đạt? | TC / lý do |
|---|:---:|---|
| AC-40 adapter mock 2 TikTok + 2 Shopee, không ngắt nhau, ngắt 1 shop | ✅ | TC-05.50, 05.51, 05.55, 05.62, 05.73, 05.77; E2E thật `phase3-m13` |
| AC-41 trạng thái TikTok → nhóm + kho; lạ → "Không rõ"; yêu cầu hủy / đã hủy chặn quét; hủy khi đóng → S2 đỏ | ✅ | TC-05.69, 05.70, 05.90, 03.85..03.91 (03.91 ghép) |
| AC-42 yêu cầu trả TikTok 6 kịch bản; bàn hoàn quét mã chiều về mở đúng phiên | ✅ | TC-05.85; TC-05.88 (test mới G4) |
| AC-43 quét mã lạ 3 shop ≤ 3 giây p95; 2 shop → chưa xác minh; thử lại có log; 1 shop lỗi không kéo | ⚠️ máy dev | TC-05.92, 05.93, 05.63, 05.64, N3.06 ✅; p95 2,103 giây / 100 lần (N3.01, máy dev). Server kho chưa đo |
| AC-44 tắt cờ TikTok / cờ trả hàng; chuỗi trạng thái ngoài adapter = 0 | ✅ | TC-05.57, 05.58, 05.91 |
| AC-45 Năng suất đúng ví dụ BR-41; CSKH 403 | ✅ | TC-09.35, 09.36 |
| AC-46 Hàng hoàn 4,0 / 0,6 / 20,0 %; lọc sàn / shop | ✅ | TC-09.30..09.33 |
| AC-47 Khiếu nại 75 %, 2.350.000 đ; bấm số → D16; **CSV mở bằng Excel đúng tiếng Việt, số khớp màn**; audit | ⚠️ máy dev | TC-09.34, 09.39 ✅; TC-09.40 ✅ sau sửa BUG-G4-1 (dấu `;`): Excel for Mac vùng en_VN tách cột, tiếng Việt đúng, "3,7%" là số, khớp API-150 ([tc-09-40-excel-after](evidence/g4/tc-09-40-excel-after.txt)). Excel Windows vi-VN ở kho chưa kiểm (DEC-978) |
| AC-48 báo cáo 92 ngày ≤ 3 giây, 366 ngày ≤ 10 giây | ⚠️ máy dev | TC-N3.04 (0,50 / 1,41 giây, DEC-574). Server kho TC-X3.13 ⛔ |
| AC-49 sao lưu MinIO: lịch 6 giờ, bằng chứng ≤ 1 giờ, không thô / ngoài BR-33, không mở được khi thiếu khóa | ✅ | TC-02.60, 02.61, 02.67, 02.51; N3.08 (MinIO tạm T-280 — DEC-954) |
| AC-50 diễn tập khôi phục: DB + bằng chứng, SHA-256, ≤ 60 phút, KN trước, khóa sai, 2 khóa | ⚠️ máy dev | TC-KR.01..KR.11 ✅ (máy dev). Máy kho TC-X3.12 ⛔ |
| AC-51 rút mạng 2 giờ, quét / live view bình thường, > 26 giờ → D2 + N08, retention → cloud ≤ 24 giờ, chính sách DB | ⚠️ | TC-02.63, 02.64, 02.73, 02.74, 02.84, 02.86 ✅. "Quét / live view bình thường khi đang tải" chưa đo (TC-N3.11 ⬜; mạng kho TC-X3.11 ⛔) |
| AC-52 link từ D17 ≤ 3 phút; **mở trên điện thoại ngoài mạng kho**; thu hồi ≤ 60 giây; hết hạn ≤ 1 giờ | ⚠️ | TC-07.45, 07.59, 07.60, 07.62, 07.63 ✅ (W1 mở bằng Chrome desktop). Điện thoại TC-X3.10 ⛔ |
| AC-53 link không lộ | ✅ | TC-07.48, 07.57, 07.58, N3.09, P3.20 |
| AC-54 thông báo N01..N09, bỏ trùng, gom, trần 30 / giờ, giờ yên lặng, mất mạng | ✅ | TC-06.50..06.69, N3.10 |
| AC-55 gửi thử ≤ 10 giây, nhật ký 30 ngày, "Bị bỏ", tóm tắt 18:00 | ✅ | TC-06.44, 06.45, 06.49, 06.59, 06.65 (bot thật: theo AC, chờ Q21) |
| AC-56 (L11) phiên trước, luật 60 giây, Supervisor hủy có lý do, quét nhầm | ✅ | TC-04.60..04.71, 08.40..08.58 (04.70, 08.58 ✅ ở lượt sửa G4) |
| AC-57 (L13) Chỉ hoàn tiền hạn 36 giờ, nhắc 12 giờ, mặc định 48 giờ | ✅ | TC-08.69..08.72 |
| AC-58 (L15) bỏ bằng chứng cần lý do, giữ tới đúng ngày | ✅ | TC-08.59..08.64 |
| AC-59 (L14) hạn sàn đã qua, quá hạn chưa gửi + N05 | ✅ | TC-08.66..08.68 |
| AC-60 ma trận quyền 4 vai; người không đăng nhập chỉ xem link | ✅ | 22/22 ✅ (6 case nhờ test mới G4; TC-P3.19 WS `share.updated` nhờ test lượt sửa G4) |
| AC-61 audit mọi hành động FR-10.03; D10 lọc nhãn tiếng Việt | ✅ | TC-10.40..10.42 (ghép nhiều test module) |
| AC-62 tên người đóng gói; chip sàn / shop; lọc sàn / shop | ✅ | TC-03.80, 03.92..03.96, 07.40, 07.41 |

Tổng AC: **17 ✅ · 6 ⚠️ · 0 ❌** / 23 (lượt G4 đầu: 16 ✅ · 6 ⚠️ · 1 ❌).

## 2. Bug

**Phát hiện ở lần chạy G4 này:**

| ID | Mức | TC | Tóm tắt | Tái hiện | Kỳ vọng / Thực tế | Môi trường | Trạng thái | Owner |
|---|:---:|---|---|---|---|---|---|---|
| BUG-G4-1 | Medium | TC-09.40 (AC-47, FR-09.06) | CSV báo cáo (API-153) mở bằng Excel vùng Việt Nam không tách cột | 1. Xuất CSV tab Hàng hoàn (API-153 `report=returns`) 2. Bấm đúp mở bằng Microsoft Excel trên máy vùng en_VN / vi-VN | Kỳ vọng: mỗi giá trị một ô, số khớp màn. Thực tế: tiếng Việt đúng (BOM nhận) nhưng mỗi dòng nằm trọn ở cột A (`Tỷ lệ hoàn,"3,7%",26,700`). Nghi do vùng VN dùng `,` làm dấu thập phân nên Excel lấy `;` làm dấu tách — DEC-476 (dấu phẩy) giả định "Excel VN mở đúng". Chưa kiểm Excel Windows vi-VN. Bằng chứng: [tc-09-40-excel.txt](evidence/g4/tc-09-40-excel.txt) | BE `fe9bfe5`; Excel for Mac 15.34, macOS vùng en_VN | **Fixed** — be `077e0ca` (dấu `;`, 02a DEC-970), MSW fe `e893a36`; kiểm lại Excel thật: đạt | be — PO xác nhận Excel Windows ở kho |
| BUG-G4-2 | Low | (hồi quy BE) | Test `test_share_review_affected::test_mark_wrong_scan_reports_affected_shares` fail khi chạy sau `test_share_mark_race` (G3V-1) | `uv run pytest tests/integration/test_share_mark_race.py tests/integration/test_share_review_affected.py` | Kỳ vọng: pass. Thực tế: 1 failed — test đọc dòng audit `SESSION_WRONG_SCAN_MARK` đầu tiên, gặp dòng do `test_share_mark_race` commit thật để lại (`audit_log` không bị TRUNCATE). Chạy riêng: pass. Lỗi cô lập test, không phải lỗi sản phẩm; làm bộ `uv run pytest` đỏ (trái với ghi chú "1724 passed" sau G3). Ngoài ra thấy 1 lần mỗi test (không tái hiện khi chạy riêng): `test_session_lifecycle::test_timeouts_warn_once_then_abandon`, `test_migration_0006_0007::test_0007_downgrade_refused_with_duplicate_codes` — nghi cùng loại dữ liệu commit còn sót. [be-full-after-g4.txt](evidence/g4/be-full-after-g4.txt) | BE `fe9bfe5`, Postgres `aicam_test` | **Fixed** — be `6b65384`, `cc5dddf` (lọc audit theo đối tượng); 2 test chập chờn không tái hiện được tuần tự → khóa một-pytest `16945db` / `ac0a321` / `769ac81` (02a DEC-971) | be |

| BUG-G4-3 | Low | TC-04.70 (FR-04.14) | API-21 `CANCEL_SESSION` phiên RETURN: ghi chú 501 ký tự trả 422 lời nhắn pydantic tiếng Anh; ghi chú 500 ký tự có khoảng trắng hai đầu bị từ chối trước trim | Lộ ở lượt sửa G4 bằng `test_g4_fix_cases::test_tc_04_70…` | Kỳ vọng `fields.note = "Nhập ghi chú (5–500 ký tự)."` / Thực tế "String should have at most 500 characters" | BE `5c213ee` trước sửa | **Fixed** — be `cbdc176` (kiểm sau trim ở service; DEC-974) | be |

Phản hồi cho `ai-be-implement` (QA → BE): BUG-G4-1, BUG-G4-2, BUG-G4-3 — **đã sửa ở lượt sửa G4** (§7). Không có bug Critical / High.

**Quan sát (không phải bug, không chặn):**
- W1: câu "Trình duyệt không phát được video. Bấm Tải video…" luôn hiện dưới video kể cả khi phát được (**đã sửa** be `d947159` — chỉ còn là nội dung dự phòng trong `<video>`, 02a DEC-972); tệp 39 KB hiện "1 MB" (làm tròn lên). Ảnh chụp: [tc-07-57-w1-chrome.png](evidence/g4/tc-07-57-w1-chrome.png). Đề xuất PO / UX xem lại chữ.
- FE vitest lần 1 chạy song song với BE pytest trên cùng máy: 3 test fail vì `findByRole` quá thời gian chờ (thấy ở `ShareLinkDialog.test.tsx:39`); chạy lại riêng 787/787 pass (DEC-958). Test UI nhạy với máy bận — nên tránh chạy song song trên CI yếu.
- TC-05.82: kỳ vọng trong `04` ("thử lại trong client") lệch thiết kế đã chốt (làm mới token không thử lại — G3-N8). **Đã sửa kỳ vọng và chạy ở lượt sửa G4 → ✅** (DEC-973).

**Bug Phase 3 tìm thấy trước G4 (T-229 QA live / E2E thật, review G3, xác minh G3) — đã sửa, có test hồi quy, pass trên build G4:**

| Nguồn | Mức | Tóm tắt | Sửa (commit) | DEC |
|---|:---:|---|---|---|
| T-229 QA live M1 / M18 | High | `seed-demo` Phase 3 không nhận đơn Phase 1 / chạy lại tạo 34 đơn trùng | be `1b00833` | DEC-821 |
| T-229 QA live M15 | High | `aicam backup-verify` văng `AttributeError` → "Chờ kiểm khôi phục" không gỡ được, sao lưu dừng vĩnh viễn | be `0877d84` | DEC-824 |
| T-229 E2E thật | Low | Chữ cảnh báo `ORDER_CANCEL_REQUESTED` lệch 01 §10.4 | be `4be467e` | DEC-825 |
| G3-MS-1 (blocker kỹ thuật) | High | Làm mới token theo grant mất `shop_cipher` → shop TikTok EXPIRED mỗi chu kỳ | be `db65062` | DEC-850 |
| G3-MS-2 | Medium | J-06 hạ nhầm đơn khỏi `CANCEL_REQUESTED` | be `5073f39` | DEC-851 |
| G3-MS-3 | Medium | J-06 nhóm shop lỗi → nhóm sau `MissingGreenlet` | be `ec4f93a` | DEC-852 |
| G3-MS-4 | Medium | TikTok `_search` chạm trần trang trả nửa danh sách, mất đơn âm thầm | be `abb7d7a` | DEC-853 |
| G3-MS-6 | Medium | J-06 cùng shop chạy chồng | be `7ab34f2` | DEC-874 |
| G3-RP-1 | Medium | CSV / formula injection API-153 | be `b7349ff` | DEC-854 |
| G3-BK-1 | High | Tải lại đối tượng đã `cloud_present` ghi đè bản cloud trước khi kiểm SHA | be `82268ba` | DEC-855 |
| G3-BK-2, BK-3 | Medium | `backup-restore` văng traceback / chọn bản lượt hỏng | be `315c24c` | DEC-856, 857 |
| G3-BK-4 | Medium | Hủy task không dừng luồng tải | be `b37d5cc` | DEC-873 |
| G3-BK-5 | Medium | J-23 đặt `cloud_deleted_at` dù bỏ sót đối tượng bị khóa | be `a7c6fa1` | DEC-870 |
| G3-BK-7 | Medium | Khóa sao lưu nằm trong env chung mọi service | be `da4e400` | DEC-871 |
| G3-BK-8 | Low | Tin lịch J-22 dồn hàng chờ | be `6cd610e` / `ae5bebc` | DEC-872 |
| G3-BK-9 | Low | Biên bản diễn tập lệch | be `5371a15` | DEC-877 |
| G3-NT-1 | High (major) | Refresh token Zalo dùng một lần có thể mất khi lời gọi bị hủy | be `dcb8d6a` | DEC-858 |
| G3-NT-2 | Medium | J-27 giữ khóa dòng tin + kênh suốt lời gọi mạng | be `c004ae8` | DEC-866 |
| G3-NT-3 | Medium | Nhà cung cấp ném lỗi lạ → API-174 500, J-27 kẹt | be `06241cd` | DEC-859 |
| G3-EV-1 | Medium | Lùi 0006 để lại `deadline_source` Phase 2 không đọc được | be `6620b71` | DEC-860 |
| G3-EV-2 | High | MARK quét nhầm đọc hồ sơ trước khi khóa → link còn giữ video quét nhầm | be `047dc3a` | DEC-863 |
| G3-EV-3 | Medium | Kiện hủy oan chỉ ghi log lúc migrate | be `ce01750`, fe `47aa03e` | DEC-861, 909 |
| G3-EV-4 | Medium | Phiên chính thiếu tệp Cam 1 không được báo | be `64a8f28`, fe `8501a9e` | DEC-862, 907 |
| G3-EV-5 | Medium | API-106 ảnh `MISSING` trả 404 / phục vụ tệp chưa kiểm | be `f519e05` | DEC-865 |
| G3-FE-1 (BE) | High | API-160 nguồn phiên cho phép link chứa phiên quét nhầm | be `b06a9f8`, fe `690b4fd` | DEC-864, 908 |
| G3-SH-1..4 | Medium | J-24 lỗi dựng giữ khóa / `TIMEOUT` đặt `cloud_deleted_at` sớm; `delete_prefix` bỏ qua `Errors[]`; thiếu `Cache-Control` | be `27cf28f`, `9a20b08`, `dc7b989` | DEC-867..869 |
| G3-FE-1..9 | Low–Medium | ShareProgress trạng thái cuối, sao chép, watcher, chip bị loại, menu ⋮, icon, nút D4 | fe `d0e7613`, `e53b32f`, `ff8fcd6`, `599c6ed`, `e9e89a7`, `83b24ea`, `f908fd3` | DEC-900..906, 910 |
| M18 / T-262 | Low | D7 với adapter mock BE: URL API-71 phải rời trang | fe (T-262) | DEC-803 |
| G3V-1 | High | API-160 ∥ API-189 MARK đua → link chứa video quét nhầm mà `affected_shares` không liệt kê | be `2937d59` | DEC-932 |
| G3V-2 | Medium | API-164 nguồn phiên chọn sẵn phiên bị loại | be `fe9bfe5`, fe `bba52de` | DEC-933, 934 |
| G3V-3 | Low | API-164 thiếu `evidence_exclusion` ở FE | fe `e3fa8ce` | DEC-935 |

Bug Critical / High còn mở = **0**. Mức trong bảng: QA xếp theo mô tả của review G3 / T-229 (G3 không có CRITICAL nghiệp vụ — DEC-950).

## 3. Case fail / blocked / chưa có bằng chứng

**❌ (0 sau lượt sửa G4):** TC-09.40 (P1) ❌ ở lượt đầu (BUG-G4-1) → ✅ sau sửa.

**⬜ → ✅ — 20 case đóng bằng test mới (2026-10-08).** Chỉ thêm file test (`ai-cam-be/tests/integration/test_g4_phase3_gaps.py` 12 hàm, `tests/unit/test_g4_phase3_gaps.py` 2 hàm), 22 kết quả pass ([extra-g4-new-tests.txt](evidence/g4/extra-g4-new-tests.txt)), không lộ bug:

| TC | Ưu tiên | Test (mức) | Nội dung kiểm |
|---|:---:|---|---|
| TC-05.88 | P1 | `INT` `test_tc_05_88_tiktok_return_tracking_opens_tiktok_session` | seed Phase 3 (J-13 TikTok) → quét `TTRTTST000062` → phiên RETURN kiện `TTTST0000000062`, đơn TikTok, shop "TST TikTok A (mock)", hồ sơ `INSPECTING` |
| TC-05.77 (#13, #14) · TC-04.81 · TC-07.44 | P1 · P3 · P2 | `INT` `test_tc_04_81_close_with_dup_order_sn_closes_open_session`, `test_tc_07_44_q_dup_order_sn_returns_and_claims` | 2 dòng §5.1 còn thiếu: đóng phiên bằng mã đơn trùng shop khác → đóng đúng phiên; API-110 / API-130 `q` mã trùng → 2 dòng có shop |
| TC-R3.09 | P1 | `INT` `test_tc_r3_09_scan_j04_two_shops_j13_twenty_rounds` | 20 lượt × (quét bàn hoàn ∥ J-04 shop A ∥ J-04 shop B cùng mã ∥ J-13), connection thật: không deadlock, 2 đơn, 1 hồ sơ mở |
| TC-ST3.03 | P1 | `UNIT` `test_tc_st3_03_backup_state_priority` (9 tổ hợp) | NOT_CONFIGURED > RESTORE_PENDING > KEY_UNCONFIRMED > KEY_CHANGED > DISABLED > ON |
| TC-P3.10, 11, 12, 13, 16, 17 | P1 / P2 | `INT` `test_tc_p3_matrix_endpoints_outside_t228` | API-81, 80, 12, 21, 134, 101 × 4 vai + không token |
| TC-05.52 | P2 | `INT` `test_tc_05_52_reconnect_tiktok_updates_token_no_duplicate` | kết nối lại → 2 shop, token mới, audit +2 |
| TC-05.67 | P2 | `UNIT` `test_tc_05_67_j04_beat_within_5_minutes` | beat J-04 300 giây, `sync_fast`, `time_limit` < chu kỳ |
| TC-05.79 | P2 | `INT` `test_tc_05_79_j06_tiktok_temporary_error_retried` | 429 một lần → thử lại, `HANDED_OVER` |
| TC-05.86 | P2 | `INT` `test_tc_05_86_j13_tiktok_temporary_then_final_error_per_shop` | lỗi tạm → OK; lỗi cuối → `SYNC_FAILED` `job=returns`, cursor đứng; B, Shopee chạy |
| TC-05.94 | P2 | `INT` `test_tc_05_94_no_shop_answers_in_time_opens_unverified` | 3 shop chậm 5 giây → `UNVERIFIED` ở 1,9–3,0 giây |
| TC-03.94 | P3 | `INT` `test_tc_03_94_packer_name_length` | "M", 41 ký tự → 422; 2, 40 → 200 |
| TC-06.71 | P2 | `INT` `test_tc_06_71_notify_jobs_overlap_skip` | khóa `notify:scan` / `notify:dispatch` → bỏ lượt, không trùng |
| TC-07.42 | P2 | `INT` `test_tc_07_42_shop_not_of_platform_returns_empty` | sàn ≠ shop → 200 rỗng |

**⬜ → ✅ bằng công cụ thật thay MAN (DEC-952):** TC-07.57, 07.59 (W1 dựng bằng hàm thật, mở bằng Google Chrome: đủ trường, không lộ, 2 video H.264 phát được — [tc-07-57-w1-browser.txt](evidence/g4/tc-07-57-w1-browser.txt)); TC-N3.13 (Chrome giả lập Fast 4G); TC-KR.13 (QA đọc ops §6); TC-09.40 bước 2 (Microsoft Excel thật → ❌).

**⬜ còn lại ở lượt G4 đầu (16, không có P1)** — lượt sửa G4: 12 → ✅, TC-06.70 → ⛔, còn ⬜ **N3.02, N3.11, N3.14** (DEC-974, DEC-977):

| TC | Ưu tiên | Lý do chưa có bằng chứng |
|---|:---:|---|
| TC-05.82 | P2 | Kỳ vọng `04` lệch thiết kế (refresh không thử lại — G3-N8); cần QA sửa case rồi chạy (DEC-955) |
| TC-04.70 | P2 | Thiếu biên 501 / 500 / đúng 5 ký tự ghi chú API-21 (có 4 ký tự, khoảng trắng, trim) |
| TC-08.58 | P2 | Chưa có test đồng thời API-189 ∥ API-134 (2 connection) |
| TC-08.65 | P2 | Chưa có test clip bị bỏ ở KN-1 nhưng thuộc KN-2 đang mở |
| TC-02.68 | P3 | Thứ tự "bằng chứng KN chưa đóng tải trước" chưa có test riêng |
| TC-02.96 | P2 | Chưa giả lập kho từ chối khi PUT (`AccessDenied` / đầy) ở J-22 |
| TC-MS.10 | P3 | Chưa có test API-32 `CLIP_FAILED` không đếm `MISSING` |
| TC-07.55 | P2 | Chưa có test 22 ảnh + 1 `MISSING` → `snapshot_count` 22, link 20 ảnh |
| TC-07.67 | P2 | Chưa có test đóng KN → link vẫn `ACTIVE` (EX-S5 chỉ có case này) |
| TC-07.68 | P2 | Chưa có test J-02 xóa clip gốc → video link vẫn phát (EX-S6 chỉ có case này) |
| TC-06.70 | P3 | MAN trong mạng kho chưa làm |
| TC-MG3.16 | P2 | Chưa có test lùi → lên hai vòng cho 0006 |
| TC-P3.19 | P2 | Chưa có test WS `share.updated` tới Supervisor / CSKH |
| TC-N3.02 | — | Chưa chạy locust PACK + RETURN sau nâng cấp (cần stack) |
| TC-N3.11 | — | Chưa đo quét p95 / live view khi đang tải 5 GB |
| TC-N3.14 | — | Chưa đo API-32 / API-161 p95 và J-21 50.000 clip |

Các case này viết được ở mức `INT` / locust trong ≤ 30 phút mỗi case (trừ N3.02, N3.11 cần stack). Không viết ở lượt này vì đều P2 / P3 / NFR không chặn release; đề xuất đưa vào lượt QA trước G5 hoặc backlog Phase 3.1.

**⛔ Chưa test — thiếu tài nguyên (15 + TC-06.70 từ lượt sửa G4 = 16):**

| TC | Thiếu | Bằng chứng giả lập đã có (02a §11 R1..R16) |
|---|---|---|
| TC-X3.01..X3.03 | TikTok Shop partner thật (Q18, Q19) | Mock 2 shop, adapter thật trên HTTP giả, vector ký (R1..R3) |
| TC-X3.04 | Shopee partner thật (T-3) | Mock Shopee nhiều shop (R4) |
| TC-X3.05..X3.07 | Nhà cung cấp S3 thật (Q20, NĐ 13) | MinIO tạm + chính sách quyền, token bucket (R5..R7, R15) |
| TC-X3.08, X3.09 | Bot Telegram / Zalo OA thật, mạng kho (Q21) | Server giả respx (R8, R9) |
| TC-X3.10 | Điện thoại + kho lưu công khai | W1 trên Chrome desktop + Fast 4G (R10) |
| TC-X3.11 | Server + mạng kho | Token bucket MinIO (R11) |
| TC-X3.12 | Máy kho | Diễn tập máy dev (R12) |
| TC-X3.13 | Server kho | `perf_reports.py` máy dev (R13) |
| TC-X3.14 | Camera thật (T-4) + server kho | Clip camera giả (R14) |
| TC-06.70 (P3) | Bot Telegram / Zalo thật + mạng kho (Q21) — DEC-977 | Link dựng ở UNIT `test_notify_render` |
| TC-MG3.19 (P1) | Server kho + image Phase 3 + bản sao DB production thật (R16) | Diễn tập lệnh trên bản sao DB Phase 2 máy dev ĐẠT ([m18](evidence/m18-upgrade-rollback.txt)) — DEC-957 |

## 4. Phi chức năng

| NFR | Ngưỡng | Đo được | Đạt |
|---|---|---|:---:|
| NFR-01 tra sàn nhiều shop (N3.01, AC-43) | p95 ≤ 3 giây | `INT` 100 lần quét mã lạ, 3 shop mock (1 chậm 5 giây, 1 có đơn): p50 2,054 / p95 2,103 / max 2,305 giây ([extra-checks](evidence/g4/extra-checks.txt)) | ✅ máy dev · server kho chưa đo |
| NFR-01 mã đã có (N3.02) | p95 ≤ 1 giây, không xấu hơn Phase 2 quá 20 % | Chưa chạy locust Phase 3. QA live Phase 1 50 lần quét p95 ≤ 1 giây trên build G3 | ⬜ |
| NFR-28 (N3.03) | 0 chữ trạng thái sàn ngoài adapter | Test AST pass; grep 0 dòng logic | ✅ |
| NFR-37 báo cáo (N3.04, AC-48) | 92 ngày ≤ 3 giây, 366 ngày ≤ 10 giây | 183.000 kiện: 0,50 / 1,41 giây p95 (T-217, DEC-574) | ✅ máy dev · ⛔ server kho |
| NFR-38 (N3.05) | đơn ≤ 5 phút, yêu cầu trả ≤ 15 phút | Beat J-04 300 giây, J-13 900 giây + `INT` job | ✅ (cấu hình + INT) |
| NFR-39 (N3.06) | shop khác đồng bộ mỗi chu kỳ | `INT` 1 giờ đồng hồ giả, 6 shop, 1 luôn timeout | ✅ |
| NFR-40 RPO / RTO (N3.07) | DB ≤ 6 giờ, bằng chứng ≤ 1 giờ, khôi phục ≤ 60 phút | Lịch + `INT`; diễn tập 2.000 kiện: DB 1,0 giây | ✅ máy dev · ⛔ máy kho |
| NFR-41 (N3.08, AC-49) | 5/5 không mở được, 0 lần thấy khóa, 2 lệnh `AccessDenied` | MinIO tạm T-280 (`d29fb52`); lượt sửa G4 chạy lại trên MinIO tạm riêng: pass (DEC-976) | ✅ |
| NFR-42 (N3.09, AC-53) | ≥ 256 bit, 403 / 404, không liệt kê, `https`, `NoSuchKey` ≤ 60 giây | MinIO tạm T-280; E2E thật thu hồi ≤ 60 giây (build G3) | ✅ |
| NFR-43 (N3.10, AC-54) | sự kiện → tin ≤ 3 phút; 0 tin mất sau 2 giờ | `INT` đồng hồ giả: ≤ 3 phút, 0 tin mất. Chưa chạy 100 sự kiện | ✅ |
| NFR-44 (N3.11, AC-51) | quét p95 không đổi ± 10 % khi tải; ≤ 11 Mbit/s | Tốc độ 43,7 Mbit/s ở giới hạn 40 (DEC-656, MinIO tạm). Quét p95 / live view khi tải chưa đo | ⬜ · ⛔ mạng kho |
| NFR-45 (N3.12) | 0 trường người mua | TC-06.69, 07.57, 07.72 | ✅ |
| NFR-46 W1 (N3.13) | chữ ≤ 3 giây, video H.264 phát được | Chrome Fast 4G (CDP), 5 lần: chữ ≤ 235 ms, video phát ≤ 1,03 giây (localhost) | ✅ máy dev · ⛔ điện thoại |
| 02a §8 (N3.14) | API-32, API-161 p95 ≤ 300 ms; J-21 ≤ 5 giây / 50.000 clip | Chưa đo | ⬜ |

Số máy dev chỉ cho biết code không phải nút thắt. Ngưỡng NFR là ngưỡng trên phần cứng kho — **máy kho chưa đo**.

## 5. Bằng chứng

Thư mục [`evidence/g4/`](evidence/g4/) (lượt G4) + bằng chứng có sẵn trong [`evidence/`](evidence/):

| Bộ test | Lệnh | Kết quả | File |
|---|---|---|---|
| QA live Phase 1–3 (stack `aicam-qa`, build G3) | `QA_BASE_URL=http://localhost:8280 … uv run pytest tests/qa -m qa -v` | **182 passed**, 22 phút, mã thoát 0 | [g3-qa-live.txt](evidence/g3-qa-live.txt) |
| E2E BE thật (stack `aicam-qa`) | `pnpm exec playwright test -c playwright.real.config.ts` | **75 passed, 1 skipped** (TC-05.03 theo thiết kế), 21,8 phút, mã thoát 0 | [g3-e2e-real.txt](evidence/g3-e2e-real.txt) |
| BE unit + contract | `cd ai-cam-be && uv run pytest -q tests/unit tests/contract` | **883 passed**, mã thoát 0 | [be-unit-contract.txt](evidence/g4/be-unit-contract.txt) |
| BE integration (chạy thêm, verbose) | `uv run pytest -v -rs tests/integration` | **844 passed, 13 skipped** (9 cần MinIO tạm, 3 cần `RUN_PERF`, 1 ffmpeg không có `drawtext`), 7 phút 41 giây, mã thoát 0 | [be-integration.txt](evidence/g4/be-integration.txt) |
| FE vitest | `cd ai-cam-fe && pnpm test` | Lần 1 (song song BE pytest): 3 fail (quá thời gian chờ), mã thoát 1. Lần 2 (riêng): **787 passed / 85 file**, mã thoát 0 | [fe-vitest.txt](evidence/g4/fe-vitest.txt) |
| FE E2E mock (Playwright + MSW) | `cd ai-cam-fe && pnpm e2e` (dev:mock :5180) | **44 passed**, 1,5 phút, mã thoát 0 | [fe-e2e-mock.txt](evidence/g4/fe-e2e-mock.txt) |
| Test mới G4 | `uv run pytest -v tests/integration/test_g4_phase3_gaps.py tests/unit/test_g4_phase3_gaps.py` | **22 passed** (14 hàm), mã thoát 0 | [extra-g4-new-tests.txt](evidence/g4/extra-g4-new-tests.txt) |
| Hồi quy BE sau khi thêm test (chạy riêng) | `uv run ruff check . && uv run ruff format --check . && uv run pytest -q -rfE` | ruff / format mã thoát 0; pytest **1748 passed, 1 failed, 195 skipped** (skip: QA live cần stack, MinIO tạm, RUN_PERF), mã thoát 1 — fail duy nhất là BUG-G4-2 (cô lập test). Lần chạy đầu chồng pytest khác trên cùng DB → bỏ, ghi trong file | [be-full-after-g4.txt](evidence/g4/be-full-after-g4.txt) |
| `lint-imports`, grep NFR-28, AC-43 perf | `uv run lint-imports`; grep; `RUN_PERF=1 … test_perf_ac43_100_scans` | 3 contract kept; 0 dòng logic; p95 2,103 giây | [extra-checks.txt](evidence/g4/extra-checks.txt) |
| W1 trên Chrome + Fast 4G | render W1 thật → Chrome (Playwright `channel=chrome`) | đủ trường, không lộ, 2 video phát; chữ ≤ 235 ms | [tc-07-57-w1-browser.txt](evidence/g4/tc-07-57-w1-browser.txt), [ảnh](evidence/g4/tc-07-57-w1-chrome.png) |
| CSV trong Excel | API-153 thật → Microsoft Excel for Mac 15.34 | tiếng Việt đúng, **không tách cột** | [tc-09-40-excel.txt](evidence/g4/tc-09-40-excel.txt) |
| Diễn tập khôi phục (AC-50) | `scripts/backup_drill.py` | ĐẠT (máy dev) | [m15-restore-drill.txt](evidence/m15-restore-drill.txt) |
| Diễn tập nâng cấp / lùi | `scripts/upgrade_drill.py` | ĐẠT (máy dev, bản sao DB Phase 2) | [m18-upgrade-rollback.txt](evidence/m18-upgrade-rollback.txt) |
| Lượt T-229 trước sửa G3 | — | tham khảo | `t229-qa-live.txt`, `t229-e2e-real.txt` |

Map test → TC: cột KQ trong `04`; tên test có `tc_xx_yy` trong `tests/qa`, docstring `tests/integration`, tiêu đề `e2e/**/*.spec.ts`, `src/**/*.test.ts(x)`.

Không chạy ở lượt này: docker, stack dev :8180, QA live, E2E BE thật (đã chạy ở G3 trên build G4), locust. Không có dữ liệu test cần dọn: test integration tự rollback hoặc `TRUNCATE`; tệp tạm (CSV, W1) ở scratchpad và `~/Documents/aicam-g4-tmp` đã xóa.

## 6. Rủi ro còn lại & điều kiện release

**Điều kiện để chốt G4 (QA đề xuất — DEC-959):**
1. DEC chấp nhận 15 case ⛔ (14 X3 + TC-MG3.19) như DEC-78 / DEC-367 các phase trước.
2. ~~BUG-G4-1~~ — **đã sửa** (DEC-970); còn: PO kiểm CSV bằng Excel Windows ở máy kho (AC-47 ⚠️ máy dev — DEC-978).
3. ~~BUG-G4-2 + chạy lại test MinIO tạm~~ — **đã làm** (DEC-971, DEC-976); `uv run pytest` BE đầy đủ xanh (§7).
4. 3 case ⬜ NFR (N3.02, N3.11, N3.14 — DEC-977) + 16 ⛔ — người duyệt chấp nhận / lên kế hoạch trước G5.

**Rủi ro còn lại:**
- **Backlog G3:** BK-6 — không cảnh báo khi bucket sao lưu tắt versioning (DEC-875, cần quyền `s3:GetBucketVersioning`); MS-5 — đơn file trùng mã với đơn sàn có thể tạo đơn thừa / hồ sơ sai shop (DEC-876). Cả hai không mất bằng chứng; Phase 3.1.
- Adapter TikTok, Shopee returns chỉ kiểm bằng HTTP giả theo tài liệu công khai; sai lệch với API thật chỉ lộ ra khi có partner (RK-16).
- ~~Test MinIO chạy trên build cũ~~ — lượt sửa G4 chạy lại 11 test MinIO tạm trên build mới: pass (DEC-976).
- Số NFR chỉ máy dev; NFR-44 (quét khi đang tải lên) và 02a §8 chưa đo.
- Nhiều chữ UI mới "chờ PO" (DEC-900..909, 934, 935) — chưa duyệt chữ.

**Điều kiện go-live tại kho** (SRS §13 "Go-live tại kho", 01 TL;DR):

| Điều kiện | Hạng mục chưa test / chưa quyết |
|---|---|
| Q13 + L14 — hạn khiếu nại thật từng sàn / loại | Đang dùng mặc định (BR-27, BR-40 48 giờ, BR-42); PO chốt trước go-live |
| Q18 / Q19 — tài khoản đối tác TikTok Shop | TC-X3.01..X3.03: ủy quyền nhiều shop, redirect `x.local`, chữ ký, giới hạn tần suất, chữ trạng thái / hủy / trả, hạn người bán, kiện gộp, đơn kho TikTok |
| Q20 — nhà cung cấp S3 + nơi đặt dữ liệu (NĐ 13) | TC-X3.05..X3.07: URL ký 7 ngày, `index.html` inline, versioning + lifecycle + quyền, tốc độ tải thật; NFR-41 trên nhà cung cấp thật (R15) |
| Q21 — kênh chat dùng được tại kho | TC-X3.08, X3.09: bot Telegram từ mạng kho, Zalo OA xác thực |
| T-3 — Shopee partner thật | TC-X3.04 (nhiều shop, mã đơn lạ); Shopee returns (item 02) |
| T-4 — camera thật, máy quét | TC-X3.14: dựng link từ clip 1080p; nhãn Cam 2 (NFR-45) |
| Server kho | TC-X3.11..X3.13, MG3.19: báo cáo, RTO, quét khi tải lên, diễn tập nâng cấp bằng image + bản sao DB thật (R16) |
| Điện thoại | TC-X3.10: W1 + video ngoài mạng kho (AC-52, NFR-46) |
| Mạng kho / WAN | TC-X3.11, X3.08; NFR-44 |
| BUG-G4-1 (đã sửa) | CSV mở bằng Excel Windows ở máy kho (AC-47 ⚠️) |

**Lệnh tái chạy:**
`cd ai-cam-be && uv run pytest` · `uv run pytest -v tests/integration/test_g4_phase3_gaps.py tests/unit/test_g4_phase3_gaps.py` · `cd ai-cam-fe && pnpm test && pnpm e2e` · QA live / E2E thật: theo `docker/qa.env` (stack `aicam-qa`).

## 7. Lượt sửa G4 (2026-10-08, DEC-970..979)

Sửa theo `ai-dev-fix` (test tái hiện đỏ trước), commit + push từng phần trên `feat/03-expansion-tiktok` (không merge / PR).

| Mục | Sửa / test | Commit | Kết quả |
|---|---|---|---|
| BUG-G4-1 (Medium, TC-09.40, AC-47) | CSV API-153 dấu tách `;` (`core.csv_safe.EXCEL_VN_DELIMITER`), giữ BOM + chống formula injection; CSV kỹ thuật `backup-restore` / `backup-verify` giữ `,`; MSW `;` (02a DEC-970, 02b DEC-975, 02 §6.2 API-153) | be `077e0ca`, fe `e893a36` | Unit đỏ trước (3 fail) → xanh; Excel for Mac vùng en_VN thật: tách cột, "3,7%" là số, khớp API-150 — [tc-09-40-excel-after](evidence/g4/tc-09-40-excel-after.txt) |
| BUG-G4-2 (Low, test) | `test_share_review_affected`, `test_return_session_review`, `test_evidence_remove_br38` lọc audit theo đối tượng (`audit_log` chỉ thêm); 2 test chập chờn không tái hiện tuần tự (DB chỉ còn `audit_log` + `setting` gốc) → khóa một-pytest theo DB test (`single_pytest_run`, PID) (02a DEC-971) | be `6b65384`, `16945db`, `ac0a321`, `769ac81`, `cc5dddf` | Cặp file đỏ → 4 passed; bộ đầy đủ xanh |
| W1 (quan sát TC-07.57) | Câu "không phát được video" chỉ còn là nội dung dự phòng trong `<video>`, không script (02a DEC-972) | be `d947159` | Test render đỏ trước → xanh |
| BUG-G4-3 (Low, lộ ở TC-04.70) | API-21 ghi chú kiểm độ dài ở service sau trim, lời nhắn tiếng Việt (04 DEC-974) | be `cbdc176` | Test đỏ → xanh |
| 12 case ⬜ | `tests/integration/test_g4_fix_cases.py` 12 hàm / 14 kết quả (TC-05.82 kỳ vọng sửa — DEC-973) | be `5c213ee` | 14 passed — [g4-fix-new-tests](evidence/g4/g4-fix-new-tests.txt) |
| ⬜ còn lại | TC-06.70 → ⛔; N3.02, N3.11, N3.14 giữ ⬜ (DEC-977) | — | — |
| Test MinIO (DEC-954) | 11 test trên MinIO tạm riêng (cổng 59290, đã xóa) | — | **11 passed** — [be-minio-tests](evidence/g4/be-minio-tests.txt) (DEC-976) |
| BE đầy đủ | `ruff check` · `ruff format --check` · `mypy` · `lint-imports` · `pytest -q` (be `cc5dddf`) | — | mã thoát 0 cả 5; **1767 passed, 195 skipped**, 9 phút 11 giây — [be-full-final](evidence/g4/be-full-final.txt) (ghi cả 3 lượt đỏ trước đó và nguyên nhân) |
| FE | `tsc -b` · `eslint src` · `prettier -c src` · `pnpm test` · `pnpm build` (fe `e893a36`) | — | mã thoát 0 cả 5; vitest **787 passed / 85 file** — [fe-final](evidence/g4/fe-final.txt) |

Ghi nhận trung thực: một lượt BE đầy đủ (be `769ac81`) có 1 error ở `test_auth_users_api::test_station_account_on_dashboard_is_wrong_client` (không lưu traceback); chạy riêng pass, 2 lượt đầy đủ sau không lặp lại — chưa xác định nguyên nhân. Không chạy lại QA live / E2E BE thật / E2E mock ở lượt này (không dùng stack); thay đổi sản phẩm ở lượt sửa: CSV API-153, API-21 ghi chú, W1 — có test INT / unit / Excel thật.

## Chốt G4

Checklist đầy đủ (✓ / ✗ kèm ghi chú) ở [`04` mục "Chốt G4"](04-test-cases.md#chốt-g4). QA đánh giá:

| Điều kiện | QA |
|---|:---:|
| Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng | ✓ (sau lượt sửa: 17 ✅ · 6 ⚠️ · 0 ❌; mọi FR mức M có ≥ 1 TC ✅) |
| Ma trận quyền đã chạy | ✓ (22/22 ✅) |
| NFR có ngưỡng đã đo | ✗ (3 ⬜; 5 chỉ máy dev) |
| Bug Critical/High = 0 | ✓ (mọi bug G4 đã sửa) |
| Regression vùng bị chạm đã chạy | ✓ |
| Migration lên / xuống / lên + nâng cấp lại | ✓ (19 ✅; MG3.19 ⛔ server kho) |

QA chưa tick G4 trong `00-status`. Người điều phối quyết định bước tiếp.
