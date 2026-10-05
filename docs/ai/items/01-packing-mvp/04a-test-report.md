# Test Report — 01 MVP đóng gói · lần 2 (toàn bộ Phase 1, M0–M5)

| | |
|---|---|
| QA (tác giả) | khanhtt |
| Reviewer | Tech lead · PO (duyệt G4) |
| Trạng thái | Done — G4 đạt có điều kiện (DEC-78 trong `04`) |
| Build / commit | Nhánh `feat/01-packing-mvp`. Code sản phẩm: BE `c81a120` (gồm G3 V-1 `180ab97`, V-2 `324a45d`), FE `630ce9f` (gồm sửa G4 `9d546ce`, `27fcfc2`). Chỉ thêm test / script sau đó: BE `3787a37` (`qa-reset.sh --mute-cam2`), `3035bbc` (test bổ sung); FE `f18da22` (E2E reset tắt Cam 2), `833b1e9` (E2E bổ sung) |
| Môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml` (api :8180, Postgres 16, Redis, MediaMTX, `fake-cam1`, `fake-cam2`, vision, worker, beat), adapter sàn `mock`, `SHOPEE_ENABLED=false`. Chromium (Playwright). MacBook, Docker qua Colima, load trung bình 5–9 khi chạy. Không có camera thật, máy quét USB, Shopee thật, server kho |
| Ngày chạy | 2026-10-05 |
| Test cases | [04-test-cases.md](04-test-cases.md) (160 case) |
| Last update | 2026-10-05 · QA (bổ sung 10 case ⬜ → ✅, chốt G4) |

> **TL;DR** — **Kết luận:** ⚠️ G4 **đạt có điều kiện** (DEC-78 trong `04`). Mọi case Phase 1 chạy được trên máy dev đều ✅, 0 fail, 0 bug mở. Còn 28 case ⛔ chỉ vì thiếu tài nguyên ngoài; đó là điều kiện go-live thật.
> 160 case: ✅ 132 · ❌ 0 · ⛔ 28 (chưa test — thiếu tài nguyên) · ⬜ 0. 10 case ⬜ của lần lập báo cáo đầu đã bổ sung đủ, gồm 2 case P1 (TC-03.32, 02.13). AC: đạt 12/19; 3 AC chỉ đạt trên máy dev / bản giả lập (AC-01, 02, 10); 4 AC chưa test — thiếu tài nguyên (AC-04, 08, 09, 17).
> Bug G4: 2 bug (1 High, 1 Medium), đã sửa và chạy lại pass. Bug Critical/High còn mở = 0. Review G3 trước đó có ~70 finding, đã sửa hết.
> Điều kiện go-live: bàn thử T-4 (camera thật, máy quét USB), Shopee partner T-3, server kho, điện thoại iOS / Android (§6). AC-08 với 1080p H.265 **không đạt** trên máy dev → phải đo trên server kho, nếu cần thì hạ `EXPORT_PRESET`.

<!-- Đối tượng đọc: người duyệt G4/G5. Báo cáo trung thực (CONVENTIONS §6.7): case không chạy được ghi "không chạy được" + lý do. -->

## 1. Tổng hợp

**Cách tính KQ** (DEC-70 trong `04`):

| Ký hiệu | Khi nào |
|---|---|
| ✅ | Có test pass trong bằng chứng §5, đúng mức của cột **Cách**. Case `API` tính bằng test trên stack thật hoặc test `INT` gọi HTTP vào app với Postgres / Redis thật. Case `E2E` tính bằng E2E với BE thật, hoặc **ghép**: phần BE pass ở `API` / `INT` **và** phần UI pass ở Playwright MSW / vitest |
| ⛔ | Chưa test — thiếu tài nguyên: camera thật, máy quét USB, Shopee thật, server kho, điện thoại. Bản giả lập pass vẫn giữ ⛔ |
| ⬜ | Thuộc Phase 1 nhưng chưa có bằng chứng. Gồm cả case phụ thuộc trình duyệt thật (nhịp phím, mất mạng, phát video) mà chỉ có test component. BUG-G4-1 cho thấy test component không bắt được loại lỗi này |

| Module | Tổng | ✅ Pass | ❌ Fail | ⛔ Thiếu tài nguyên | ⬜ Chưa có bằng chứng |
|---|---|---|---|---|---|
| M10 Đăng nhập, tài khoản, nhật ký | 10 | 10 | 0 | 0 | 0 |
| M01 Station và camera | 14 | 7 | 0 | 7 | 0 |
| M03 Phiên đóng gói | 35 | 29 | 0 | 6 | 0 |
| M03b Yêu cầu duyệt | 18 | 18 | 0 | 0 | 0 |
| M02 Ghi hình, clip, retention | 19 | 17 | 0 | 2 | 0 |
| M07 Tra cứu, chi tiết, xuất | 17 | 13 | 0 | 4 | 0 |
| M05 Nguồn đơn (Shopee, CSV) | 23 | 21 | 0 | 2 | 0 |
| M09 Dashboard ngày | 5 | 5 | 0 | 0 | 0 |
| **Chức năng** | **141** | **120** | **0** | **21** | **0** |
| Phân quyền TC-P.01..P.10 | 10 | 10 | 0 | 0 | 0 |
| Phi chức năng TC-N.01..N.09 | 9 | 2 | 0 | 7 | 0 |
| **Tổng** | **160** | **132** | **0** | **28** | **0** |

**10 case bổ sung (⬜ → ✅)** — test mới ở BE `3035bbc`, FE `833b1e9`. Bằng chứng: `evidence/g4/extra-be-suite.txt`, `extra-tc-n05-perf.txt`, `extra-e2e-g4.txt`, `extra-fe-checks.txt`.

| TC | Ưu tiên | Test | Kết quả |
|---|:---:|---|---|
| TC-03.32 Mất kết nối server | **P1** | E2E BE thật `e2e/real/station-g4.spec.ts` | Mất kết nối > 5 giây → S6, không nhận quét; có lại → về "ĐANG ĐÓNG GÓI" rồi đóng được. 2 lần, cả 5 bài pass |
| TC-02.13 Audit xem clip đúng người | **P1** | E2E BE thật `e2e/real/admin-g4.spec.ts` | Mở D4 chưa phát → không có `VIEW_CLIP`; phát + tua → đúng 1 dòng `VIEW_CLIP` của Lan |
| TC-03.30 Quét khi chưa đăng nhập | P2 | E2E BE thật `station-g4.spec.ts` | Nhắc đăng nhập, 0 request API-11, ô tài khoản không bị điền mã. Ghi chú bên dưới |
| TC-03.31 Gõ tay không phải quét | P2 | E2E BE thật `station-g4.spec.ts` | Gõ 200 ms/phím + Enter → không coi là quét, màn giữ "SẴN SÀNG" |
| TC-10.05 Refresh theo client | P2 | E2E BE thật `e2e/real/session-refresh-g4.spec.ts` | Access token 1 phút hết hạn → mỗi tab refresh theo client của mình, không ghi đè cookie của nhau |
| TC-03.11 Quét kiện `CANCELLED_AFTER_PACK` | P2 | `INT` `test_station_scan_api.py::test_cancelled_after_pack_is_order_cancelled` | `ALERT ORDER_CANCELLED` |
| TC-03.53 Đóng gói lại bị bỏ dở | P2 | `INT` `test_session_lifecycle.py::test_abandon_repack_keeps_old_session` | Phiên REPACK quá 30 phút → `ABANDONED`, kiện `PACKED`, phiên cũ vẫn `COMPLETED` |
| TC-09.05 Ổ đĩa > 80% | P2 | `INT` `test_reports_settings.py::test_disk_over_80_percent` + vitest `StoragePage.test.tsx`, `DailyPage.test.tsx` | API-81 `disk.percent` > 80, API-32 có dòng `DISK_USAGE` kèm %; ổ < 80% → không có dòng. Mức sử dụng ổ giả lập bằng cách thay `shutil.disk_usage`, chưa lấp ổ thật |
| TC-N.02 Tra sàn chậm 1,5 giây, 20 lần | — | `INT` `test_tc_n02_twenty_slow_platform_lookups` | p95 1,58 giây, max 1,59 giây (ngưỡng ≤ 3 giây). 10 mã có trên sàn → xác minh, 10 mã lạ → `UNVERIFIED` |
| TC-N.05 API-30 với 1 triệu kiện | — | `RUN_PERF=1` `tests/integration/test_perf_packages.py::test_tc_n05_search_one_million_packages` | 1.000.000 kiện, p95 theo mã vận đơn 697 ms, theo mã đơn 812 ms, theo ngày 196 ms (ngưỡng ≤ 2 giây). DB test trên máy dev, server kho chưa đo |

Ghi chú TC-03.30: E2E giả lập máy quét bằng `hidScan` (Playwright), gán mốc thời gian phím cách đều 5 ms như máy quét thật. `keyboard.type` thường có khoảng ~80 ms giữa các phím, vì Playwright ghi mốc lúc giao phím. Kiểm trên máy quét thật ở bàn thử: chưa test — thiếu phần cứng (cùng nhóm với TC-03.31).

**Case ✅ ghép** (E2E chưa chạy với BE thật; DEC-70; không đổi sau bổ sung): TC-03.41, 03.42, 03.44, 03.46, 03.50, 03.54, 02.11, 02.17, 02.18 (UI kiểm ở biên 0, cùng quy tắc 1–365), 07.03, 07.05, 07.06, 07.11, 07.13, 07.14, 07.15, 07.16, 09.02, 09.04, P.10 (2 ô E2E BE thật, 2 ô test component).

**Ghi chú với case ✅:**
- TC-03.03 chạy 25 đơn / 50 lần quét; `04` ghi 50 đơn. p95 dư xa ngưỡng.
- TC-03.33 bước 2 (Dialog phát clip ở S1) chỉ có test component cho nút "Xem".
- TC-03.43 và TC-03.44 chạy trên `fake-cam2` (khay giả); hành vi phần mềm đạt. Độ chính xác đọc phiếu thật thuộc AC-04 (⛔).
- TC-03.25: dừng container `vision` trên stack thật (`test_vision_stopped_marks_unavailable`).
- TC-10.09: đủ 10 action ở nhiều mức test. 4 action M1 và `APPROVAL_DECISION` chạy trên stack thật. `VIEW_CLIP`, `EXPORT_CLIP`, `DOWNLOAD_EXPORT`, `HOLD_CLIP`, `SETTINGS_UPDATE` chạy ở `INT`.
- TC-02.01: kiểm `READY` ≤ 60 giây và độ dài clip ≥ phiên + 10 giây trên stack thật, kèm `INT` kiểm cửa sổ cắt. Chưa đọc OSD khung đầu / cuối bằng mắt.
- TC-07.01 lần chạy E2E BE thật run1 fail. Bước station quét đóng không về "SẴN SÀNG" trong 10 giây; lỗi xảy ra cùng lần chạy có host bị khựng (§3). Lần chạy trước (`e2e-real.txt`, sau sửa BUG-G4-1) và run2 đều pass.

| AC (Phase 1) | Đạt? | TC / lý do |
|---|:---:|---|
| AC-01 quét mở + đóng, p95 ≤ 1 giây, 50 đơn | ⚠️ máy dev | TC-03.01, 03.02, 03.03 ✅. p95 26–80 ms trên máy dev. Đơn Shopee thật (T-3) và server kho (TC-N.01 ⛔): chưa test — thiếu tài nguyên |
| AC-02 clip phủ [mở − 5 giây, đóng + 5 giây]; overlay bản xuất | ⚠️ giả lập | TC-02.01 ✅ (camera giả), 02.14 ✅, 07.07 phần UI và API ✅. 20 clip ngẫu nhiên ở bàn thử (TC-02.02 ⛔): chưa test — thiếu camera thật |
| AC-03 quét đóng sai mã → `MISMATCH` 100% | ✅ | TC-03.04, 03.06 (20/20) |
| AC-04 phiếu sai trên khay ≥ 95% trong ≤ 2 giây; khay sai không đóng được | ⛔ | TC-03.21, 03.22 cần Cam 2 thật + phiếu in. Logic đã pass trên `fake-cam2` (`test_cam2_cycle_mismatch_then_clear_then_close`). Tỉ lệ đọc chưa test |
| AC-05 đơn hủy bị chặn | ✅ | TC-03.08 (đơn hủy trên sàn mock) |
| AC-08 tra cứu → MP4 phát trên điện thoại ≤ 30 giây, 10 đơn | ⛔ | Luồng UI pass (TC-07.01 + 07.07 E2E BE thật). Chưa test trên điện thoại thật và server kho (TC-07.07, 07.08, N.08 ⛔). Máy dev, clip 180 giây: 720p ghép 17,8–19,3 giây (đạt). 1080p H.265 ghép 106–167 giây: **không đạt** |
| AC-09 rút WAN 30 phút | ⛔ | TC-N.06: thiếu bàn thử + server kho |
| AC-10 rút cáp camera → cảnh báo ≤ 10 giây, cờ `VIDEO_INCOMPLETE` | ⚠️ giả lập | Dừng `fake-cam2` → OFFLINE ≤ 10 giây (`test_tc_01_07_simulated_camera_loss`). `INT` `test_camera_offline_flags_open_session` gắn cờ. Rút cáp thật (TC-01.07, 02.03 ⛔): chưa test |
| AC-11 SHA-256 khớp; không API sửa / xóa clip | ✅ | TC-02.04, 02.15 (stack thật), 02.05 (`INT`, 4 vai) |
| AC-12 CSV 500 dòng ≤ 30 giây; 1 dòng lỗi → không nhập | ✅ | TC-05.11, 05.12 (E2E BE thật + API stack thật) |
| AC-13 station chưa đăng nhập không mở phiên; phiên đúng station | ✅ | TC-10.01 E2E. Không token → 401 (`test_no_token_is_401`). TC-03.15 kiểm 2 station. TC-03.30 E2E BE thật (máy quét giả) |
| AC-14 đóng gói lại cần Supervisor; phiên cũ `SUPERSEDED` sau khi xong | ✅ | TC-03.51: E2E BE thật pass 3 lần (`e2e-real`, run1, run2) + API stack thật + `INT` |
| AC-15 clip giữ không bị retention +91 ngày | ✅ | TC-02.06 `INT` |
| AC-16 bỏ dở 30 phút → `ABANDONED`, clip được tạo | ✅ | TC-03.28 `INT`. Bước clip chỉ có bằng chứng gián tiếp: dùng chung hàm kết thúc phiên với hủy (`sessions/service.py:544`), và test hủy phiên đẩy J-01 pass. Nên thêm assert J-01 cho `ABANDONED` |
| AC-17 lệch giờ camera > 1 giây → cảnh báo | ⛔ | TC-01.09, 01.13: cần camera ONVIF thật |
| AC-18 số liệu dashboard ngày đúng | ✅ | TC-09.01 `INT`, 09.02 ghép, 09.03 E2E BE thật |
| AC-19 yêu cầu duyệt ≤ 2 giây hai chiều; audit tên người duyệt | ✅ | TC-03.40 (E2E BE thật + API stack thật, mốc ≤ 2 giây), 03.41 ghép |
| AC-20 tăng retention 90 → 180 có hiệu lực | ✅ | TC-02.07 `INT` + UI E2E lưu 180 ngày |
| AC-21 hủy đóng gói lại → kiện vẫn `PACKED`; `HANDED_OVER` không đóng gói lại | ✅ | TC-03.10, 03.52, 03.55 |

AC-06, AC-07 không thuộc Phase 1.

## 2. Bug

**Phát hiện trong G4** (đều đã sửa và chạy lại pass):

| ID | Mức | TC | Tái hiện | Kỳ vọng / Thực tế | Component | Trạng thái |
|---|:---:|---|---|---|:---:|---|
| BUG-G4-1 | High | TC-03.51, TC-07.01 (E2E BE thật khi máy tải cao) | 1. Máy trạm bận (encode, live view) 2. Máy quét giả gõ mã 5 ms/phím + Enter | Kỳ vọng: mọi lần quét đều được nhận. Thực tế: bộ đệm máy quét đo khoảng cách phím bằng thời điểm JS xử lý. Khi JS xử lý trễ, khoảng cách đo được vượt ngưỡng nên cả lần quét bị bỏ, không báo gì | fe | Đã sửa `9d546ce`: dùng `KeyboardEvent.timeStamp`. Test `src/shared/scan/useScanListener.test.tsx` fail trên code cũ, pass trên code mới. E2E run2 pass |
| BUG-G4-2 | Medium | TC-09.03 | 1. D2 mở 2. Station mở phiên rồi đóng trong < 5 giây | Kỳ vọng: D2 cập nhật ≤ 5 giây. Thực tế: > 5 giây, vì throttle `report.updated` 5 giây | fe | Đã sửa `27fcfc2`: throttle 2 giây (DEC-69, 02 v0.7). E2E TC-09.03 pass |

**Quan sát môi trường** (không phải bug sản phẩm):
- API-63 chụp ảnh Cam 2 có lần mất hơn 20 giây khi máy dev tải cao (load ~9), làm E2E TC-01.05 fail ở `e2e-real.txt`. Đã xử lý: E2E ROI chờ tối đa 40 giây (`630ce9f`), và `qa-reset.sh` chờ camera seed sẵn sàng (`c81a120`). Thời gian chụp trên server kho: chưa test.
- BE pytest lần đầu có 1 error kết nối Postgres "rejected SSL upgrade" ở fixture của `test_slow_platform_times_out`. Chạy lại riêng: 3/3 pass. Chạy lại cả bộ: 523 pass. Ghi là lỗi môi trường chập chờn.
- Sau run2, run3: E2E BE thật reset bằng `qa-reset.sh --mute-cam2` (BE `3787a37`, FE `f18da22`). Lệnh đặt ROI Cam 2 vào góc khay luôn trống. Lý do: camera giả 2 phát vòng 60 giây nhiều phiếu, nên có lúc khay có phiếu khác đúng lúc quét đóng và BR-06 chặn ngẫu nhiên. Đây là thay đổi môi trường test, không đổi code sản phẩm. BR-06 vẫn được kiểm ở `fake-cam2` stack thật và `INT` (TC-03.21..03.23).
- E2E BE thật run1: 34/37, hỏng do môi trường. Một bài treo 35,6 phút ở bước dựng browser context, 2 bài timeout khi dựng context, log có `[WebServer] read ECONNRESET` (host / dev server bị khựng). Ngay sau đó TC-07.01 fail ở bước station về "SẴN SÀNG". Run2 cùng code: 37/37.

**Từ G3** (đã sửa trước G4; chi tiết ở `00-status` *Phản hồi*, 02a DEC-141..163, 02b-admin DEC-171..175, 02 v0.7 DEC-67): 2 lượt review + 1 lượt xác minh, khoảng 70 finding (F1–F37, N1–N14, P2-1..17, nit), gồm V-1 (khóa chéo API-51 → 409) và V-2 (retention video thô của clip FAILED). Hoãn có DEC: F9 / F10 (chi phí gọi Shopee) tới T-3 (DEC-158).

## 3. Case fail / blocked

Không có case ❌ ở kết quả cuối.

| TC | Lý do ⛔ (chưa test — thiếu tài nguyên) | Bằng chứng giả lập đã có |
|---|---|---|
| TC-01.07, 01.08, 02.03 | Rút cáp camera thật | Dừng / bật `fake-cam2` (stack thật); `INT` cờ `VIDEO_INCOMPLETE` |
| TC-01.09, 01.13 | Camera ONVIF thật để chỉnh giờ | — |
| TC-01.10, 01.14 | Live view 4 camera thật; ICE UDP trong LAN | E2E BE thật: WebRTC 2 camera giả qua ICE-TCP; E2E MSW: ô "Mất tín hiệu" |
| TC-01.11 | Camera thật sai mật khẩu (`AUTH`) | vitest chữ lỗi theo `reason` |
| TC-03.20..03.24, 03.35 | Cam 2 thật + phiếu in + máy quét USB (AC-04, CPU vision) | `fake-cam2` stack thật (03.20–03.23); `INT` 03.24; unit ROI 03.35 |
| TC-02.02 | 20 clip từ bàn thử | — |
| TC-07.07, 07.08 | Điện thoại iOS + Android thật; encode trên server kho | E2E BE thật: xuất Ghép, tải file |
| TC-07.12, 07.17 | Safari iOS | Chromium 360px (E2E MSW) |
| TC-05.01, 05.02 | Shopee partner thật (T-3) | `INT` adapter mock; trước đó chạy riêng 8/8 với `SHOPEE_ENABLED=true` + adapter mock |
| TC-N.01, N.03, N.04, N.06..N.09 | Server kho, camera thật, NAS, UPS | Số máy dev ở §4 |

## 4. Phi chức năng

| NFR | Ngưỡng | Đo được | Đạt |
|---|---|---|:---:|
| NFR-01 quét (TC-03.03, N.01) | p95 ≤ 1 giây | Máy dev: p95 API-11 26–80 ms (locust nhịp NFR-05: mở 80 / đóng 50 ms; stress 4 station ≈ 13.400 quét/giờ: 26 ms, max 149 ms; 0 lỗi) | ⛔ chưa đo server kho |
| NFR-01 tra sàn chậm (TC-03.13, N.02) | ≤ 3 giây | Sàn trả lời sau 3 giây → API-11 trả trong < 2,8 giây, phiên `UNVERIFIED` (`INT`). 20 lần sàn trễ 1,5 giây: p95 1,58 giây, max 1,59 giây | ✅ |
| NFR-03 clip `READY` (TC-N.03) | p95 ≤ 60 giây | 1 phiên trên stack thật: 2 clip `READY` ≤ 60 giây. Chưa chạy 50 phiên | ⛔ |
| NFR-04 tra cứu 1 triệu kiện (TC-N.05) | ≤ 2 giây | 1.000.000 kiện, 20 lần mỗi kiểu: p95 theo mã vận đơn 697 ms, theo mã đơn 812 ms, theo ngày 196 ms. Postgres test trên máy dev | ✅ máy dev (server kho chưa đo) |
| NFR-05 tải 1 giờ (TC-N.04) | NFR-01/03/04 giữ; CPU < 80% | Máy dev 10 phút, không camera, không xuất: 0 / 182 lỗi. CPU không đo | ⛔ chưa test server kho |
| AC-08 / DEC-32 xuất clip 180 giây (TC-N.08) | p95 ≤ 20 giây | Spike S3 máy dev: 720p ghép 17,8–19,3 giây (28,4 giây khi máy bận). 1080p H.265 ghép 106–167 giây — **không đạt** | ⛔ chưa test server kho |
| AC-12 CSV 500 dòng | ≤ 30 giây | Đạt: E2E BE thật + API stack thật (`test_csv_ok_500`) | ✅ |
| AC-19 duyệt | ≤ 2 giây mỗi chiều | Đạt: `test_mismatch_request_continue_within_2s` + E2E TC-03.40 | ✅ |
| FR-01.02 camera mất tín hiệu | ≤ 10 giây | Đạt khi dừng `fake-cam2`; camera thật chưa test | ⛔ |
| NFR-09 WAN, NFR-10 UPS, NFR-31 dung lượng | `04` §4 | Chưa test — thiếu tài nguyên | ⛔ |

Số đo máy dev chỉ cho biết code không phải nút thắt. Ngưỡng NFR là ngưỡng trên phần cứng kho.

## 5. Bằng chứng

Thư mục `evidence/g4/`:

| Bộ test | Lệnh | Kết quả | File |
|---|---|---|---|
| BE lint / type / import | `cd ai-cam-be && uv run ruff check . && uv run mypy && uv run lint-imports` | Sạch, exit 0 (mypy 108 file; 2 contract kept) | [be-lint.txt](evidence/g4/be-lint.txt) |
| BE unit + integration + contract | `cd ai-cam-be && uv run pytest` | 523 passed, 97 skipped (bộ `qa` khi không đặt `QA_BASE_URL`), exit 0. Lần đầu có 1 error môi trường (§2) | [be-pytest.txt](evidence/g4/be-pytest.txt) |
| BE sau bổ sung (`3035bbc`) | `uv run ruff check . && uv run mypy && uv run pytest`; rồi `uv run pytest -q -k "cancelled_after_pack or tc_n02 or abandon_repack or disk_over" -s` | Lint, mypy sạch. **528 passed, 98 skipped**, exit 0. Lọc 4 case: 6 passed, in số TC-N.02 | [extra-be-suite.txt](evidence/g4/extra-be-suite.txt) |
| TC-N.05 1 triệu kiện | `RUN_PERF=1 uv run pytest -m perf tests/integration/test_perf_packages.py -s` | 1 passed; số ở §4. Dọn sạch sau chạy (`package rows left: 0`) | [extra-tc-n05-perf.txt](evidence/g4/extra-tc-n05-perf.txt) |
| QA API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` | 94 passed, 2 skipped. 2 bài Shopee chỉ chạy khi `SHOPEE_ENABLED=true`; trước đó đã chạy riêng 8/8 với adapter mock khi bật cờ | [qa-api-live.txt](evidence/g4/qa-api-live.txt) |
| FE lint + typecheck | `cd ai-cam-fe && pnpm lint` | Không lỗi (file rỗng = không có output) | [fe-lint.txt](evidence/g4/fe-lint.txt) |
| FE component (vitest) | `cd ai-cam-fe && pnpm test` | File ghi 305 passed / 33 file (17:28, trước sửa G4). Sau sửa BUG-G4-1, G4-2: 308 passed, exit 0 — theo người điều phối, chưa lưu file | [fe-test.txt](evidence/g4/fe-test.txt) |
| FE sau bổ sung (`833b1e9`) | prettier, `tsc`, eslint, `pnpm test` | Sạch; **310 passed** / 34 file, exit 0 | [extra-fe-checks.txt](evidence/g4/extra-fe-checks.txt) |
| FE build | `cd ai-cam-fe && pnpm build` | Build thành công | [fe-build.txt](evidence/g4/fe-build.txt) |
| FE E2E MSW | `cd ai-cam-fe && pnpm e2e` | 9 passed | [fe-e2e-mock.txt](evidence/g4/fe-e2e-mock.txt) |
| E2E BE thật (37 bài) — lần đầu | `cd ai-cam-fe && pnpm e2e:real` | 36 passed, 1 failed (TC-01.05: ảnh Cam 2 > 20 giây, §2) | [e2e-real.txt](evidence/g4/e2e-real.txt) |
| E2E BE thật — run1 | như trên | 34 passed, 3 failed, 43 phút — hỏng do môi trường (§2) | [e2e-real-run1.txt](evidence/g4/e2e-real-run1.txt) |
| E2E BE thật — run2 | như trên | **37 passed**, 4 phút, exit 0 — dùng làm bằng chứng ✅ | [e2e-real-run2.txt](evidence/g4/e2e-real-run2.txt) |
| E2E BE thật — run3 | như trên | **37 passed**, 4,1 phút (log có cảnh báo `ws proxy ECONNRESET` của vite, không làm fail bài nào) | [e2e-real-run3.txt](evidence/g4/e2e-real-run3.txt) |
| E2E BE thật — bài G4 | `E2E_M3_BE=1 E2E_M4_BE=1 npx playwright test -c playwright.real.config.ts station-g4.spec.ts admin-g4.spec.ts session-refresh-g4.spec.ts` (reset `--mute-cam2`) | **5 passed** ở cả 2 lần, 2,6 phút; không còn container tạm | [extra-e2e-g4.txt](evidence/g4/extra-e2e-g4.txt) |
| Tải (locust) | `tests/load/locustfile.py` (`LOAD_PROFILE=nfr05\|stress`) | Số ở 02a mục T-19 (DEC-134) | 02a |
| Bằng chứng cũ | — | M1, M2, M4, G3 | `evidence/m1-*.txt`, `m2-*.txt`, `m4-e2e-real.txt`, `g3-e2e-real.txt` |

Map test → TC: docstring trong `ai-cam-be/tests/qa/test_m{1..4}_live.py`, `ai-cam-be/tests/integration/*.py`; tên test trong `ai-cam-fe/e2e/{real,mock}/*.spec.ts` và `ai-cam-fe/src/**/*.test.tsx` (grep `TC-`).

## 6. Rủi ro còn lại & điều kiện release

**Điều kiện trước khi chốt G4:** đã đạt. 10 case ⬜ đã bổ sung đủ, gồm 2 case P1 TC-03.32, TC-02.13 (§1). G4 đạt có điều kiện (DEC-78 trong `04`).

**Điều kiện trước go-live** (chưa test — thiếu tài nguyên):

| Tài nguyên | Hạng mục chưa test |
|---|---|
| Camera thật + bàn thử (T-4) | AC-04 tỉ lệ đọc ≥ 95% (40 lần + 10 lần khay sai); CPU vision; live view qua ICE UDP trong LAN; ONVIF lệch giờ (AC-17); rút cáp (AC-10); 20 clip (AC-02); máy quét USB thật (nhịp phím TC-03.30, 03.31 mới chạy bằng máy quét giả) |
| Shopee thật (T-3) | Kết nối OAuth, đồng bộ, tra sàn khi quét (TC-05.01, 05.02, AC-01 đơn thật); chi phí gọi F9 / F10 (DEC-158) |
| Server kho | Tải 1 giờ (NFR-05, CPU < 80%); NFR-01, 03, 04 trên phần cứng (TC-N.05 mới đo trên DB máy dev); AC-08 encode (1080p H.265 **không đạt** trên máy dev); thời gian chụp API-63; restore backup; NAS (NFR-31); UPS (NFR-10); WAN 30 phút (AC-09); cert Caddy trên máy trạm |
| Thiết bị | MP4 trên iOS + Android (AC-08); Safari / iOS (TC-07.12, 07.17) |

**Rủi ro:**
- AC-08 có khả năng không đạt với camera 1080p H.265. Hướng xử lý (03 §5, RB-7): hạ `EXPORT_PRESET` / độ phân giải bản xuất, rồi đo lại trên server kho.
- Máy trạm bận có thể làm chậm UI. BUG-G4-1 đã sửa phần mất lần quét, nhưng chưa thử trên máy trạm thật.
- Thu hồi đăng nhập station có hiệu lực sau ≤ 15 phút (DEC-55, đã chấp nhận).
- AC-16: bước "clip được tạo khi bỏ dở" chỉ có bằng chứng gián tiếp.

**Lệnh tái chạy:**
`ai-cam-be/scripts/qa-reset.sh && cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` · `cd ai-cam-be && uv run pytest` · `cd ai-cam-be && RUN_PERF=1 uv run pytest -m perf tests/integration/test_perf_packages.py -s` · `cd ai-cam-fe && pnpm lint && pnpm test && pnpm build && pnpm e2e && pnpm e2e:real`

---

# Lịch sử — lần 1 (phạm vi M1)

<details><summary>Báo cáo lần 1 (2026-10-04 .. 05, giữ nguyên)</summary>

### Test Report — 01 MVP đóng gói · lần 1 (phạm vi M1)

| | |
|---|---|
| QA (tác giả) | khanhtt |
| Reviewer | Tech lead · PO (duyệt G4) |
| Trạng thái | Draft |
| Build / commit | Nhánh `feat/01-packing-mvp` của `ai-cam-be` và `ai-cam-fe`; code M1 chưa commit, base BE `9efb3b2`, FE `73c46f8` |
| Môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml`: api :8180, Postgres 16 :55432, Redis :56379, MediaMTX v1.21.1, `fake-cam1`, `fake-cam2`. Chromium (Playwright). macOS (Darwin 25). Chưa có bàn thử phần cứng (T-4) |
| Ngày chạy | 2026-10-04 .. 2026-10-05 |
| Test cases | [04-test-cases.md](04-test-cases.md) |
| Last update | 2026-10-05 · QA |

> **TL;DR** — **Kết luận:** ❌ Chưa trình G4: mới QA phạm vi M1; M2–M4 chưa trong phạm vi. Trong phạm vi M1 không còn case fail và không còn bug mở.
> 138 case chức năng: ✅ 38 · ❌ 0 · ⛔ 13 (chờ camera và máy quét thật, T-4) · ⬜ 87 (80 ngoài phạm vi M1, 7 trong M1 chưa chạy hoặc chưa đủ bằng chứng).
> Bug: 4 bug (1 High, 3 Medium) đã sửa và chạy lại pass; bug Critical/High còn mở = 0. AC thuộc M1: AC-03 đạt; AC-01, AC-13 đạt một phần.
> NFR-01: p95 API-11 ≈ 13–17 ms trên stack dev (ngưỡng ≤ 1 giây), chưa đo trên phần cứng kho.
> Rủi ro chính: chưa kiểm phần cứng thật; `VIDEO_INCOMPLETE` chưa có (T-14).


#### 1. Tổng hợp

Cách tính: ✅ khi có test pass trong bằng chứng §5 ở đúng mức của cột **Cách** trong `04` (API trên stack thật, E2E với BE thật, hoặc pytest integration khi Cách = `INT`). Test component FE (vitest) không tính thay cho E2E.

| Module | Tổng | ✅ Pass | ❌ Fail | ⛔ Blocked | ⬜ Chưa chạy |
|---|---|---|---|---|---|
| M10 Đăng nhập, tài khoản, nhật ký | 10 | 7 | 0 | 0 | 3 |
| M01 Station và camera | 14 | 6 | 0 | 7 | 1 |
| M03 Phiên đóng gói | 35 | 23 | 0 | 6 | 6 |
| M03b Yêu cầu duyệt (M3) | 17 | 2 | 0 | 0 | 15 |
| M02 Ghi hình, clip (M2) | 19 | 0 | 0 | 0 | 19 |
| M07 Tra cứu, xuất (M2) | 17 | 0 | 0 | 0 | 17 |
| M05 Nguồn đơn (M4) | 21 | 0 | 0 | 0 | 21 |
| M09 Dashboard ngày (M2) | 5 | 0 | 0 | 0 | 5 |
| **Tổng** | **138** | **38** | **0** | **13** | **87** |
| Phân quyền TC-P.01..P.10 (`04` §3) | 10 | 3 | 0 | 0 | 7 |
| Phi chức năng TC-N.01..N.09 (`04` §4) | 9 | 0 | 0 | 0 | 9 |

- M03b có 2 case `INT` pass sớm (TC-03.52, TC-03.56) dù chức năng duyệt thuộc M3.
- Phân quyền: ✅ TC-P.01 (endpoint đã có ở M1: API-10, 11, 15), TC-P.07, TC-P.09 (`test_tc_p_matrix`, 4 vai × 11 endpoint, không token → 401). TC-P.10 chưa đủ: xem §3.

| AC nghiệm thu (thuộc M1) | Đạt? | TC |
|---|:---:|---|
| AC-01 quét liên tục, p95 ≤ 1 giây | Một phần | TC-03.01 ✅, 03.02 ✅, 03.03 ✅ (25 đơn / 50 lần quét, không phải 50 đơn), N.01 ⬜ (2 station song song chưa chạy) |
| AC-03 quét đóng sai mã không đóng phiên | ✅ | TC-03.04 ✅, 03.06 ✅ (20/20 `MISMATCH`) |
| AC-13 station đăng nhập, quét khi chưa đăng nhập | Một phần | TC-10.01 ✅; TC-03.30 ⬜ (chỉ có test component sau BUG-3, chưa có E2E) |

AC ngoài M1 đã có TC pass sớm (chưa tính đạt): AC-05 (TC-03.08), AC-16 (TC-03.28 `INT`), AC-21 một phần (TC-03.10, 03.52).

#### 2. Bug

| ID | Mức | TC | Tái hiện | Kỳ vọng / Thực tế | Component | Trạng thái |
|---|:---:|---|---|---|:---:|---|
| BUG-1 | High | Tiền điều kiện PRE-1 (mọi case) | 1. Build image `api` 2. Chạy `scripts/qa-reset.sh` | Kỳ vọng: migrate trong container chạy được. Thực tế: lỗi vì image thiếu `alembic.ini` và thư mục `alembic` | be | Đã sửa (`docker/Dockerfile` chép thêm 2 mục), chạy lại pass |
| BUG-2 | Medium | TC-01.01, TC-01.07 | 1. Tạo station 2. Gắn Cam 2 `rtsp://localhost:8554/cam-fake2` 3. Đếm thời gian tới khi `status` = `ONLINE` | Kỳ vọng: ONLINE ≤ 10 giây. Thực tế: tới 30 giây, vì vision chỉ làm mới danh sách camera mỗi 30 giây | be | Đã sửa (làm mới mỗi 2 giây), chạy lại pass |
| BUG-3 | Medium | TC-03.30 (S0, EX-P9) | 1. Mở `/station/login`, ô tài khoản đang focus 2. Máy quét giả gõ `SPXTST0000001` + Enter | Kỳ vọng: Alert "Station chưa đăng nhập. Đăng nhập rồi quét lại.", ô không bị điền. Thực tế: mã điền thẳng vào ô tài khoản, không báo gì | fe | Đã sửa (bắt quét cả trong ô nhập, bỏ chuỗi vừa quét khỏi ô, hiện Alert); test `StationLoginPage.test.tsx` pass; E2E chưa có |
| BUG-4 | Medium | TC-01.01 | 1. D6 lưu Cam 2 2. Chờ, không tải lại trang | Kỳ vọng: chip Cam 2 chuyển Online ≤ 10 giây. Thực tế: chip đứng ở Offline tới khi tải lại; dashboard chưa nối WS-02 `camera.status` (02b-admin §4). Phát hiện nhờ E2E với BE thật | fe | Đã sửa (hook `useDashboardSocket` trong AppShell invalidate `['stations']`, `['station']`), E2E TC-01.01 pass |

**Sửa theo review code M1 (DEC-53), làm trước lần chạy lại** — mỗi mục có test:

| Review | Nội dung | Test chính |
|---|---|---|
| #1 (major) | FE không xử lý 409 `STATION_INACTIVE` / 403 → station treo im lặng | `ai-cam-fe/src/features/station/StationPage.test.tsx` |
| #2 (major) | J-07 chạy đua với lần quét đóng → phiên và kiện lệch nhau | `ai-cam-be/tests/integration/test_scan_concurrency.py` |
| #3 (major) | Rate-limit đăng nhập tính sai IP khi đứng sau proxy | `ai-cam-be/tests/unit/*` |
| #4, #5 | Dedup `client_scan_id` dưới lock; hai station cùng mã → một phiên, bên kia `ALERT` (không 500) | `test_scan_concurrency.py` |
| #6, #7, #18 | #6 đọc lại phiên từ DB sau khi lấy khóa station (không dùng bản cũ trong bộ nhớ); ngày theo giờ VN; giờ trong `ALREADY_PACKED` | `test_station_scan_api.py`, `tests/unit/*` |
| #8, #9, #10 | Bộ đếm mất WS 5 giây bị reset; WS đóng 4401 mà refresh thất bại; dọn store và âm báo khi rời trang | `useStationSocket.test.tsx`, `src/lib/ws.test.ts`, `StationPage.test.tsx` |
| #11, #12 | Giữ tài khoản / mật khẩu camera khi để trống; `rtsp_url` chứa `user:pass` → 422 | `test_stations_api.py`, `StationsAdmin.test.tsx` |
| #13 (một phần) | Token station đã gỡ khỏi station → 403 ngay | `test_station_scan_api.py` |
| #14, #16, #17, #20, #21, #22 | Web Locks khi refresh; che log; `seed-demo` chặn production + secret staging; #20 đang chờ duyệt thì mọi lần quét IGNORED, xét trước định dạng mã; #21 username không tồn tại vẫn verify hash giả (không lộ username qua thời gian phản hồi); sourcemap `hidden` | `tests/unit/*`, test FE tương ứng |

Để sau (đã ghi DEC-53): #13 phần thu hồi ≤ 15 phút — user chấp nhận, không làm (DEC-55) · #15 `VIDEO_INCOMPLETE` (T-14) · #19 định dạng giờ `Z` · #23 J-09 giữ transaction.

#### 3. Case fail / blocked / chưa đủ

Không có case ❌.

| TC | Lý do | Việc cần |
|---|---|---|
| TC-01.07, 01.08 | ⛔ Cần rút cáp camera thật. Bản giả lập (dừng container `fake-cam2`) đạt: OFFLINE ≤ 10 giây, ONLINE lại sau khi bật. Cờ `VIDEO_INCOMPLETE` chưa có | Chạy lại trên bàn thử T-4; cờ theo T-14 |
| TC-01.09, 01.10, 01.11, 01.13, 01.14 | ⛔ Cần camera thật (ONVIF, live view, sai mật khẩu camera thật) | Bàn thử T-4 |
| TC-03.20..03.24, 03.35 | ⛔ Cần Cam 2 thật, phiếu in, máy quét USB | Bàn thử T-4 (M3) |
| TC-10.05 | ⬜ Trong M1, chưa chạy (cần `ACCESS_TOKEN_MINUTES=1` + 2 tab) | Viết E2E hoặc chạy tay ở lần 2 |
| TC-10.06 | ⬜ Phần BE (refresh bị thu hồi) pass ở `INT`; trễ ≤ 15 phút đã được chấp nhận (DEC-55) | Chờ màn D9 (T-59) để chạy E2E |
| TC-10.09 | ⬜ Phần M1 pass (`LOGIN`, `USER_UPDATE`, `STATION_UPDATE`, `CAMERA_UPDATE`); 6 action còn lại thuộc M2/M3 | Chạy lại đủ 10 action sau M3 |
| TC-03.13 | ⬜ `INT` chỉ kiểm cơ chế cắt với ngưỡng thu nhỏ (sàn chậm 0,5 giây, cắt 0,1 giây); mốc "sàn chậm 3 giây → phản hồi ≤ 3 giây" chưa đo | Thêm test `MockAdapter(delay_s=3)` |
| TC-03.30, 03.31, 03.32 | ⬜ Chỉ có test component (vitest), chưa có E2E với BE thật | E2E thuộc T-38 / chạy tay ở lần 2 |
| TC-P.10 | ⬜ Pass 2 ô E2E: Supervisor vào `/admin/settings/*` → `/admin/forbidden`; tài khoản dashboard mở `/station` bằng tải trang mới → `/station/login` (ma trận ghi `/admin`; chấp nhận theo DEC-54). Ô Station → `/station` và CSKH → `/admin/forbidden` mới có test component | Sửa ô ma trận `04` §3 theo DEC-54; thêm E2E 2 ô còn lại |

Ghi chú với case đã ✅:
- TC-03.03: test chạy 25 đơn / 50 lần quét, `04` ghi 50 đơn (đã ghi "cần xác nhận"). p95 dư xa ngưỡng nên chấp nhận cho M1.
- TC-01.04: bước 2 (lưu URL không tới được) chỉ kiểm gián tiếp qua audit `CAMERA_UPDATE` trong TC-10.09, chưa assert `status` = `OFFLINE`.
- TC-01.06: test chỉ assert 422; mã lỗi `VALIDATION_ERROR` hay `ROI_INVALID` vẫn chờ xác nhận như `04` đã ghi.
- TC-03.34: mã < 4 ký tự bị bộ đệm máy quét bỏ, không gọi API — đúng thiết kế 02b-station §5.
- TC-03.09, 03.10: nút "Yêu cầu đóng gói lại" và "Gọi quản lý" hiện đúng, nhưng bấm trên BE thật trả 404 (API-13 thuộc T-13) → FE hiện toast, không treo (review #1).

#### 4. Phi chức năng

| NFR | Ngưỡng | Đo được | Đạt |
|---|---|---|:---:|
| NFR-01 (API-11, đơn đã có) | p95 ≤ 1 giây | p95 ≈ 13–17 ms, 50 lần quét liên tiếp, 1 station, stack dev (`test_tc_03_03_fifty_scans_p95`) | ✅ trên stack dev |
| NFR-01 (TC-N.01: 2 station song song, 100 quét) | p95 ≤ 1 giây | Chưa chạy | ⬜ |
| FR-01.02 / AC-10 camera mất tín hiệu | ≤ 10 giây → OFFLINE | Đạt khi giả lập dừng `fake-cam2`; chưa đo với camera thật | ⛔ (HW) |
| NFR-03, 04, 05, 09, 10, 31 | `04` §4 | Chưa chạy (thuộc M2..M5 hoặc cần phần cứng) | ⬜ |

Chưa đo trên phần cứng kho; kết quả hiệu năng trên máy dev macOS chỉ là tham khảo.

#### 5. Bằng chứng

| Bộ test | Lệnh | Kết quả |
|---|---|---|
| API trên stack thật | `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` | 72 passed — [evidence/m1-api-live.txt](evidence/m1-api-live.txt) |
| E2E với BE thật | `cd ai-cam-fe && pnpm e2e:real` | 18 passed — [evidence/m1-e2e-real.txt](evidence/m1-e2e-real.txt) |
| BE unit + integration | `cd ai-cam-be && uv run pytest` | 203 passed, 72 skipped (bộ `qa` khi không đặt `QA_BASE_URL`) |
| FE component | `cd ai-cam-fe && pnpm test` | 141 passed (14 file) |
| FE E2E (MSW) | `cd ai-cam-fe && pnpm e2e` | 1 passed |
| Lint / typecheck | BE: ruff, mypy strict, import-linter (2 contract) · FE: tsc, eslint | Sạch |

Map test → TC: docstring trong `ai-cam-be/tests/qa/test_m1_live.py`, `ai-cam-be/tests/integration/*.py`; tên test trong `ai-cam-fe/e2e/real/*.spec.ts` (bảng "Test tự động đã gắn TC" ở `04` §1).

#### 6. Rủi ro còn lại & điều kiện release

- Chưa trình G4: lần 1 chỉ phủ M1; M2 (clip, tra cứu, dashboard), M3 (Cam 2, duyệt), M4 (Shopee, CSV) chưa có code.
- 13 case ⛔ chờ bàn thử phần cứng T-4 (camera thật, máy quét USB, phiếu in); AC-04, AC-10 phụ thuộc nhóm này.
- Thu hồi đăng nhập station có hiệu lực sau ≤ 15 phút (access token hết hạn) — đã chấp nhận (DEC-55).
- Cờ `VIDEO_INCOMPLETE` khi camera rớt chưa có — T-14.
- Hiệu năng mới đo 1 station trên máy dev; tải 2 station (TC-N.01) và locust (TC-N.04, T-19) chưa chạy.
- Lệch spec cần cập nhật `04` §3: ô "dashboard mở `/station`" → `/station/login` (DEC-54).
- Checklist deploy từ review (`FORWARDED_ALLOW_IPS`, không phục vụ `*.map`, secret staging) nằm ở T-19, chưa kiểm trên môi trường staging.

**Lệnh tái chạy lần 2** (sau M2–M4): `ai-cam-be/scripts/qa-reset.sh && QA_BASE_URL=http://localhost:8180 uv run pytest -m qa tests/qa -v` · `cd ai-cam-fe && pnpm e2e:real` · `cd ai-cam-be && uv run pytest` · `cd ai-cam-fe && pnpm test`.

</details>
