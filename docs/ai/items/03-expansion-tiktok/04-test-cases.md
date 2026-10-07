# Test Cases — 03 Mở rộng: TikTok Shop, báo cáo, sao lưu cloud, link chia sẻ, thông báo

| | |
|---|---|
| QA | khanhtt |
| Reviewer | Tech lead · PO |
| Trạng thái | Ready (CP7 tự duyệt theo ủy quyền user — DEC-535) |
| Nguồn | SRS [01-srs.md](01-srs.md) v0.5 · Tech Spec [02](02-tech-spec.md) v0.4, [02a](02a-be-spec.md) v0.4, [02b-station](02b-fe-spec-station.md) v0.3, [02b-admin](02b-fe-spec-admin.md) v0.4 · Plan [03](03-plan.md) |
| Build / môi trường | Stack dev `ai-cam-be/docker/compose.dev.yml` (api :8180, MinIO :59000 / console :59001, `worker-sync`, `worker-sync-long`, `worker-backup`, `worker-notify`) + FE `pnpm dev` (:5180); adapter `mock` Shopee 2 shop + TikTok 2 shop, `NOTIFY_TRANSPORT=mock`, camera giả. Build chạy G4: chưa có (viết song song dev) |
| Last update | 2026-10-07 · QA |

> **TL;DR** — 378 case: 328 chức năng (14 nhóm), 14 tài nguyên ngoài (X3), 22 phân quyền, 14 NFR; **210 case P1** chặn release (194 chức năng + 16 phân quyền).
> Phủ mọi FR mức M (39), AC-40..62, BR-01 / 10 / 11 / 21 (làm rõ) + BR-29..42, EX-T1..T7, EX-P14, EX-B1..B2, EX-K1..K9, EX-S1..S7, EX-N1..N4, EX-R17..R21, 9 nhóm chuyển trạng thái, mọi mã lỗi API mới, ma trận quyền 4 vai (gọi API trực tiếp), J-04 / 05 / 06 / 12 / 13 tách theo shop (thành công / lỗi tạm / lỗi cuối), J-20..J-28, NFR-01, 28, 37..46, migration 0006 / 0007 lên / xuống / lên + nâng cấp lại (G2R3-1), hồi quy Phase 1 / 2.
> Dự kiến **"chưa test — thiếu tài nguyên"**: 14 case nhóm X3 (TikTok Shop partner thật, nhà cung cấp S3 thật, bot Telegram / Zalo thật, camera thật, server kho, điện thoại, mạng kho) + phần "máy kho" của 4 NFR. Phần còn lại chạy trên stack dev với mock / MinIO. Kết quả chạy & bug: `04a-test-report.md` (bước 11).

<!-- Đối tượng đọc: người chạy test (kể cả người mới) và người duyệt release. Mỗi case chạy lại được
bởi người khác mà không cần hỏi: tiền điều kiện (PRE-x ở §1), bước đánh số, dữ liệu cụ thể, kỳ vọng có giá trị. -->

---

## 1. Phạm vi & chiến lược

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| 46 FR trong phạm vi 01 §5 (39 M · 5 S · 2 C), AC-40..62 | Lazada; gửi khiếu nại lên sàn (02 Non-goals) |
| API qua HTTP thật (quyền, mã lỗi), job với adapter mock + đồng hồ giả, MinIO 2 bucket, server Telegram giả | Unit test của dev (02a §11, 02b §13) — QA chỉ kiểm có chạy, đếm vào bằng chứng khi đúng mức cột **Cách** |
| E2E station (S1, S2, S4, R2, R3, R5) + dashboard (D2, D3, D4, D7, D8, D10, D13, D14–D17, D20–D23) trên Chromium | Đo băng thông Internet thật của kho, pentest |
| W1 (trang người nhận) mở bằng trình duyệt ngoài dashboard | Khôi phục qua UI (chỉ dòng lệnh — FR-02.16) |
| Migration 0006 / 0007 lên / xuống / lên trên bản sao DB Phase 2; lệnh `fix-cancel-requests`, `backup-*` | Case Phase 1 / 2 không bị chạm (giữ ở item 01, 02 `04`) |
| Hồi quy Phase 1 / 2: quét, retention J-02, đối soát, gói bằng chứng, nhập file, đồng bộ Shopee | |

| Mức | Phạm vi | Công cụ / lệnh | Tự động |
|---|---|---|:---:|
| Unit (dev) | Cách `UNIT`: mapping nhóm, ký TikTok, `crypto`, `ratelimit`, `w1.render`, BR-41, BR-37 biên, `excluded_return_sql` ↔ bản Python, NFR-28 | `cd ai-cam-be && uv run pytest tests/unit` · `cd ai-cam-fe && pnpm test` | ✔ |
| API (QA, stack thật) | Cách `API`, ma trận §3 | `cd ai-cam-be && QA_BASE_URL=http://localhost:8180 uv run pytest tests/qa -m qa -k "m11 or m12 or … or m18"` (`tests/qa/test_m11..m18_live.py`, T-229) | ✔ |
| Integration đồng hồ giả | Cách `INT`: job, đa shop, sao lưu, link, thông báo | `cd ai-cam-be && uv run pytest tests/integration` (Postgres + Redis thật, `clock.freeze/advance`, mock Shopee / TikTok `delay_s_by_shop`, `fail_shop`, `fail_times`, `fail_auth`, `calls[]`, MinIO, respx Telegram) | ✔ |
| Migration | Cách `MIG` | `uv run pytest tests/integration/test_migration_0006_0007.py tests/integration/test_downgrade_phase2_jobs.py` (T-202, 275, 282, 289) | ✔ |
| Dòng lệnh ops | Cách `CLI`: `aicam backup-keygen / backup-restore / backup-verify / fix-cancel-requests` | `docker compose -f ai-cam-be/docker/compose.dev.yml exec -T api aicam …` (+ `tests/integration/test_backup_restore.py`) | một phần |
| E2E / UI | Cách `E2E` | `cd ai-cam-fe && pnpm e2e` (mock: `e2e/mock/{platforms,reports,shares,notify,backup,station-phase3}.spec.ts`) · `pnpm e2e:real` (`e2e/real/phase3.spec.ts`, `station-phase3.spec.ts`) | ✔ |
| NFR | §4 | `tests/load/perf_reports.py`, locust quét mã lạ 4 shop, `tests/integration/test_{backup_security_nfr41,share_security_nfr42}.py` | một phần |
| Thủ công | Cách `MAN` | Trình duyệt / Excel / đọc runbook, quay màn hình | ✗ |
| Phần cứng / tài nguyên ngoài | Cách `HW` (camera, server kho, điện thoại, mạng kho) · `EXT` (TikTok partner, S3 thật, bot thật) | Thủ công khi có tài nguyên | ✗ |

Cột **Cách**: `UNIT` · `API` · `INT` · `MIG` · `CLI` · `E2E` · `MAN` · `HW` · `EXT`. Hai mức ghi "API + E2E" = cần cả hai để ✅ (như quy tắc "ghép" DEC-70 item 01).

**Tiền điều kiện chuẩn** — PRE-1..PRE-7 không đổi ([item 01 04 §1](../01-packing-mvp/04-test-cases.md#1-phạm-vi--chiến-lược)), PRE-8..PRE-12 không đổi ([item 02 04 §1](../02-returns-reconciliation/04-test-cases.md#1-phạm-vi--chiến-lược)). Thêm:

| Mã | Tiền điều kiện |
|---|---|
| PRE-13 | PRE-1 với stack Phase 3: `minio` + `minio-init` (bucket `aicam-dev-backup` bật versioning + lifecycle 7 ngày, `aicam-dev-share` không versioning, user ứng dụng gắn `docs/s3-policy.example.json`), `worker-sync -Q sync_fast`, `worker-sync-long -Q sync`, `worker-backup`, `worker-notify`; `.env`: `SHOPEE_ENABLED=true`, `PLATFORM_ADAPTER=mock`, `MOCK_SHOPEE_SHOP_IDS=990001,990002`, `TIKTOK_ENABLED=true`, `TIKTOK_RETURNS_ENABLED=true`, `TIKTOK_ADAPTER=mock`, `NOTIFY_TRANSPORT=mock`, `S3_*` trỏ MinIO, `S3_PUBLIC_ENDPOINT=http://<LAN_IP>:59000`; đã chạy `qa-reset.sh` + `aicam seed-demo` (Phase 3) |
| PRE-14 | PRE-13 + 4 shop `CONNECTED` (bảng Dữ liệu test) — kết nối qua D7 / API-71 → API-72 / API-155 mock; đã chạy J-04 + J-13 một lượt: `docker compose -f ai-cam-be/docker/compose.dev.yml exec -T worker-sync celery -A aicam.workers.celery_app call platforms.sync_orders` (và `platforms.sync_returns`) — **cần xác nhận tên task khi T-205 xong** |
| PRE-15 | PRE-13 + sao lưu `ON`: `aicam backup-keygen` → chép vào `BACKUP_ENCRYPTION_KEY` (khóa **K1**, ghi dấu vân tay in ra), khởi động lại `api worker-backup`; Admin xác nhận dấu vân tay ở D23 (API-182) |
| PRE-16 | PRE-13 + 4 kênh thông báo (bảng Dữ liệu test) tạo bằng API-171; đọc tin gửi bằng `docker compose … exec -T redis redis-cli LRANGE notify:mock:TELEGRAM 0 -1`; giờ yên lặng mặc định 22:00–07:00 |
| PRE-17 | Pytest integration (Cách `INT`): DB test trống, `factories.py` + `seed_phase3` fixture; `clock.freeze`; mock Shopee nhiều shop + mock TikTok (`delay_s_by_shop`, `fail_shop`, `fail_times`, `fail_auth`, `calls[]`); `MemoryStore` hoặc MinIO test; Telegram server giả (respx) qua `TELEGRAM_API_BASE` |
| PRE-18 | Bản sao DB Phase 2 ở revision **0005** (`qa-reset.sh` Phase 2 + `seed-demo` Phase 2) bổ sung: (a) hồ sơ KN mở KN-000101 của kiện `SPXTST0000041` có phiên RETURN `ABANDONED` (có clip) chưa trong bằng chứng; (b) phiên RETURN `CANCELLED` `cancel_reason = WRONG_SCAN` có clip cùng kiện; (c) phiên RETURN `CANCELLED` `cancel_reason = SUPERVISOR` có clip; (d) kiện `SPXTST0000010` `CANCELLED_AFTER_PACK` do `IN_CANCEL` mà đơn nay `READY_TO_SHIP`, BR-11 `OPEN`; (e) kiện `SPXTST0000012` `CANCELLED` do `IN_CANCEL`, đơn `READY_TO_SHIP`; (f) kiện `SPXTST0000013` `CANCELLED_AFTER_PACK`, BR-11 `RESOLVED` bởi `tst_sup`; (g) kiện `SPXTST0000014` `CANCELLED` lần vào hủy `source = MANUAL` |
| PRE-19 | PRE-3 / PRE-5 với vai `tst_sup` (SUPERVISOR), `tst_cskh` (CSKH), `tst_cskh2` (CSKH thứ hai — tạo bằng API-90 trước case) khi case ghi rõ |
| PRE-20 | Bộ dữ liệu báo cáo cố định `report_fixture` (T-216): kỳ 01/09/2026–30/09/2026; 1.000 kiện chuyển "Đã bàn giao"; 25 hồ sơ Khách trả hàng + 15 Giao thất bại + 6 Chỉ hoàn tiền tạo trong kỳ; 30 hồ sơ đã nhận (6 có vấn đề); hồ sơ KN: 12 Thắng (tổng thu hồi 2.350.000 đ), 4 Thua, 5 đang chờ; 3 phiên PACK 60, 90, 150 giây (phiên 150 giây có 30 giây chờ duyệt), 1 phiên không tên, tên " minh qa " và "Minh QA" |

**Dữ liệu test** — `aicam seed-demo` Phase 3 (T-211 `seed_phase3.py`; dự kiến, **cần xác nhận khi T-211 / T-229 xong** — mã cụ thể của fixture có thể đổi, cập nhật bảng này trước khi chạy). Dữ liệu Phase 1 (`SPXTST0000001..30`) và Phase 2 (`SPXTST00000[2-5]x`, `SPXRTTST…`) giữ nguyên, thuộc shop `990001`.

| Dữ liệu | Giá trị sau reset |
|---|---|
| Shop Shopee `990001` | "TST Shop (mock)" (tên adapter mock giữ từ Phase 1 — T-211, DEC-566; FE mock dùng "TST Shop A") — mọi dữ liệu Phase 1 / 2 |
| Shop Shopee `990002` | "TST B" — kiện `SPXTSTB000000001..20`, đơn `2410TSTB0001..20`; đơn **`2410DUP00001`** (kiện `SPXTSTB000000021`); `SPXTSTB000000015` lần đồng bộ 1 `IN_CANCEL`, lần 2 `READY_TO_SHIP` (từ chối hủy) |
| Shop TikTok `TTMOCKA` | "TST TikTok A (mock)" — cùng grant với B (một lần ủy quyền `MOCK-TT-CODE`); đơn **`2410DUP00001`** (kiện `TTTST0000000021`) |
| Shop TikTok `TTMOCKB` | "TST TikTok B (mock)" |
| TikTok 9 trạng thái + 1 lạ | Đơn `5761TT0000000011..19` (shop `TTMOCKA`), kiện `TTTST0000000011..19` lần lượt `UNPAID`, `ON_HOLD`, `AWAITING_SHIPMENT`, `PARTIALLY_SHIPPING`, `AWAITING_COLLECTION`, `IN_TRANSIT`, `DELIVERED`, `COMPLETED`, `CANCELLED`; `TTTST0000000099` trạng thái `XYZ` |
| TikTok kiện gộp | `TTTST0000000077` thuộc 2 đơn `5761TT0000000771`, `5761TT0000000772` (mỗi đơn 1 sản phẩm) |
| TikTok kho TikTok xử lý | `TTTST0000000098` (`fulfillment_type` kho sàn) — phải bị bỏ qua |
| TikTok yêu cầu hủy | `TTTST0000000050` `PENDING` · `…051` lần 1 `AWAITING_SHIPMENT`, lần 2 `PENDING`, lần 3 `REJECTED` · `…052` `PENDING` rồi người mua rút · `…053` `APPROVED` (đơn `CANCELLED`) |
| TikTok yêu cầu trả (6 kịch bản AC-42) | Mã yêu cầu `RTTT00000000(61..66)`, đơn `5761TT00000000(61..66)`; đổi trạng thái theo đồng hồ từ lúc nạp mock (`_status_after`: 064 +72 giờ chấp nhận, 065 +24 giờ người mua hủy, 066 +48 giờ hoàn tiền xong). `TTTST0000000061` `REFUND_ONLY` · `…062` `RETURN_AND_REFUND` mã chiều về `TTRTTST000062` · `…063` `REPLACEMENT` · `…064` `RETURN_OR_REFUND_REQUEST_PENDING` 3 ngày rồi chấp nhận · `…065` người mua hủy · `…066` hoàn tiền xong khi kiện chưa về |
| Mã chiều về trùng | `RTTST-DUP-1` ở 2 hồ sơ hàng hoàn mở của 2 đơn khác shop: yêu cầu `RSDUP0000001` (mã yêu cầu trả cũng trùng) của đơn `2410TSTB0020` (990002) và `5761TT0000000067` (`TTMOCKA`) |
| EX-T2 | Mock `TTMOCKB` trả một kiện mang mã vận đơn `SPXTST0000010` (đã thuộc đơn shop `990001`) |
| Mã lạ | `SPXVN0000000000` (không shop nào có) · `SPXTSTX0000001` (có ở `990002` **và** `TTMOCKB` — EX-P14, fixture tra) |
| Người dùng | `tst_admin`, `tst_sup`, `tst_cskh`, `tst_cskh2`, `tst_station01` (Station 01 "Cả hai"), `tst_station02` (Station 02 "Nhận hoàn") — mật khẩu `matkhau123` |
| Kênh thông báo (PRE-16) | "Kho" Telegram `-1001234567890` N01, N02, N03, N09 · "CSKH" Telegram `-1002222222222` N04, N05 · "Quản trị" Telegram `-1003333333333` N06, N07, N08 · "Chủ shop" Telegram `-1004444444444` N10 |
| Khóa sao lưu | **K1** (PRE-15), **K2** (tạo ở TC-02.90 bằng `aicam backup-keygen`); dấu vân tay đọc từ lệnh, dạng `XXXX-XXXX-XXXX-XXXX` |

**Tua giờ:** chạy ở `INT` (`clock.advance`), hoặc trên stack thật sửa cột thời gian bằng psql như item 01 04 §1 (ghi rõ trong bằng chứng).
**Dọn:** `ai-cam-be/scripts/qa-reset.sh` (Phase 3 thêm: `mc rm --recursive --force --versions` hai bucket MinIO, xóa `notify:mock:*`, `BACKUP_TMP_DIR`) — **cần xác nhận khi T-229 xong**.
**Vào:** G2 ✅ (DEC-533), build milestone tương ứng deploy được trên stack dev, `seed-demo` Phase 3 có dữ liệu trên. **Ra (G4):** mọi AC + FR mức M có TC ✅ có bằng chứng hoặc ⛔ "chưa test — thiếu tài nguyên" có DEC; bug Critical / High = 0; hồi quy Phase 1 / 2 ✅; ma trận quyền 4 vai ✅.

## 2. Test cases

Loại: Happy · Negative · Boundary · Permission · State · Regression · NFR. Ưu tiên: P1 (chặn release) · P2 · P3.
Cột **KQ** để trống tới lần chạy (bước 11 điền ✅ / ❌ / ⛔ / ⬜ theo quy tắc DEC-70 item 01; bằng chứng ở `04a`).

### M05 — Sàn: nhiều shop, TikTok Shop (đồng bộ, kết nối, tra cứu)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-05.50 | Kết nối TikTok → 2 shop trong một lần | FR-05.13, UC-10, AC-40 | Happy | P1 | E2E | PRE-13 + PRE-3, chưa có shop TikTok | 1. D7 `/admin/settings/platforms` bấm "Kết nối TikTok Shop" 2. Mock ủy quyền trả `MOCK-TT-CODE` | Quay về `/admin/settings/platforms?platform=tiktok&result=connected&count=2`; Toast "Đã kết nối 2 shop TikTok Shop. Lần đồng bộ đầu chạy trong vài phút."; 2 thẻ "TST TikTok A (mock)", "TST TikTok B (mock)" trạng thái "Đã kết nối"; query bị xóa khỏi URL; API-70 2 shop `TIKTOK` `CONNECTED`; audit 2 dòng `SHOP_CONNECT` `data.platform = TIKTOK`; J-04 + J-13 xếp 1 task / shop | |
| TC-05.51 | Kết nối shop Shopee thứ hai không ngắt shop đầu | FR-05.14, AC-40, UC-10 | Happy | P1 | API | PRE-13, chỉ `990001` `CONNECTED` | 1. API-71 `POST /shops/shopee/auth-url` 2. Theo URL mock → API-72 callback (shop `990002`) 3. API-70 | 3. `990001` **và** `990002` đều `CONNECTED`, `disconnected_at = null`; redirect `result=connected&platform=shopee&count=1` | |
| TC-05.52 | Kết nối lại shop đã có → cập nhật token, không tạo trùng | UC-10 ngoại lệ | Negative | P2 | API | PRE-14 | 1. Lặp TC-05.50 bước 1–2 2. `SELECT count(*) FROM shop WHERE platform='TIKTOK'` | 2 dòng (không 4); `auth_expires_at` mới hơn trước; audit `SHOP_CONNECT` thêm 2 dòng | |
| TC-05.53 | Callback quá 10 phút | UC-10 ngoại lệ, API-72 | Negative | P2 | INT | PRE-17 | 1. API-71 tiktok lấy `state` 2. `advance(11 phút)` 3. API-155 với `state` đó | Redirect `…?platform=tiktok&result=expired`; không shop mới; D7 Alert "Phiên kết nối đã hết hạn. Bấm Kết nối TikTok Shop để làm lại." | |
| TC-05.54 | Người bán từ chối ủy quyền | UC-10 ngoại lệ | Negative | P2 | E2E | PRE-13, MSW `shops.ts` trả `result=denied` | 1. D7 "Kết nối TikTok Shop" → từ chối | D7 Alert "TikTok Shop từ chối ủy quyền. Bấm Kết nối lại để thử lần nữa."; không đổi shop | |
| TC-05.55 | Ngắt kết nối một shop | FR-05.13, EX-T7, AC-40, API-154 | Happy | P1 | API + E2E | PRE-14 | 1. D7 thẻ "TST TikTok B (mock)" → "Ngắt kết nối" → xác nhận 2. Chạy J-04 3. `SELECT count(*) FROM "order" WHERE shop_id = <B>` trước / sau 4. Station quét một kiện mới của B chưa đồng bộ | 1. API-154 200; B `DISCONNECTED`, token null, `disconnected_at/by` có; audit `SHOP_DISCONNECT`; WS `shop.updated`; thẻ chuyển vào "Shop đã ngắt (1)" 2. `calls[]` mock không có `TTMOCKB`; A, Shopee vẫn có task 3. Số đơn không đổi 4. Phiên mở "chưa xác minh" | |
| TC-05.56 | Ngắt shop đã ngắt / shop không có | API-154 | Negative | P3 | API | Sau TC-05.55 | 1. API-154 B lần 2 2. API-154 uuid ngẫu nhiên | 1. 200, không audit thêm 2. 404 `NOT_FOUND` | |
| TC-05.57 | Cờ TikTok tắt | FR-05.20, EX-T1, AC-44 | Negative | P1 | INT + E2E | PRE-13 với `TIKTOK_ENABLED=false` | 1. API-70 2. D7 3. API-71 `tiktok` 4. Chạy J-04, J-13 5. Station quét `SPXVN0000000000` 6. Đơn Shopee mới trên mock → J-04 | 1. `platforms[TIKTOK].configured = false` 2. Alert "Chưa cấu hình TikTok Shop. Liên hệ IT để bật (cần tài khoản đối tác TikTok Shop).", nút khóa 3. 503 `PLATFORM_NOT_CONFIGURED` 4. `calls[]` TikTok = 0 5. Lookup không gọi TikTok 6. Đơn Shopee có trong hệ thống | |
| TC-05.58 | Chỉ tắt cờ trả hàng TikTok | FR-05.20, AC-44 | Negative | P1 | INT | PRE-17, `TIKTOK_RETURNS_ENABLED=false` | 1. J-04 2. J-13 | 1. Đơn TikTok đồng bộ 2. Không gọi `returns/search` của TikTok; Shopee J-13 vẫn chạy | |
| TC-05.59 | Đồng bộ ngay một shop TikTok | API-73 | Happy | P2 | API | PRE-14 | 1. API-73 shop A 2. Gọi lại ngay 3. Tắt cờ TikTok, gọi lại | 1. 202 2. 409 `SYNC_IN_PROGRESS` 3. 503 `PLATFORM_NOT_CONFIGURED` | |
| TC-05.60 | API-71 sàn lạ | API-71 | Negative | P3 | API | PRE-5 | 1. `POST /shops/lazada/auth-url` | 404 `NOT_FOUND` | |
| TC-05.61 | Production cấm adapter mock | 02a §9 validator | Negative | P2 | UNIT | — | 1. Khởi tạo settings `APP_ENV=production`, `TIKTOK_ENABLED=true`, `TIKTOK_ADAPTER=mock` | Lỗi cấu hình, app không khởi động | |
| TC-05.62 | J-04 thành công — 4 shop, mỗi shop một task | FR-05.14, 05.15, AC-40 | Happy | P1 | INT | PRE-17, 4 shop `CONNECTED` | 1. Chạy `platforms.sync_orders` 2. Đếm task gửi queue `sync_fast` 3. Kiểm đơn | 2. 4 task (1 / shop) 3. Mỗi đơn có `shop_id` đúng shop của fixture; API-30 item `platform`, `shop {id, name}` đúng; đơn TikTok có sản phẩm (tên, phân loại, SKU, số lượng, ảnh), ghi chú người mua, mã vận đơn từng kiện | |
| TC-05.63 | J-04 lỗi tạm (429) → thử lại giãn cách | FR-05.08, AC-43 | Negative | P1 | INT | PRE-17, mock TikTok A `fail_times=2` trả 429 `Retry-After: 1` | 1. J-04 shop A 2. Đọc log | 1. Lần 3 thành công, đơn được ghi 2. 3 dòng `tiktok_call` `attempt` 1, 2, 3, có `http_status`, `request_id`, `duration_ms`; không có `access_token`, `sign` trong log | |
| TC-05.64 | J-04 lỗi cuối một shop không kéo shop khác | FR-05.14, NFR-39, AC-40 | Negative | P1 | INT | PRE-17, `fail_shop = TTMOCKB` | 1. J-04 2. API-70 3. Lặp 2 chu kỳ | 1. 3 shop còn lại đồng bộ xong trong chu kỳ 2. B `last_error.code = SYNC_FAILED`, `error_since` đặt ở lần đầu, cursor B không tiến 3. `error_since` giữ nguyên (không đổi mỗi lần) | |
| TC-05.65 | J-04 hết ngân sách 120 giây | DEC-477 | Boundary | P2 | INT | PRE-17, `delay_s_by_shop = {TTMOCKA: 200}` | 1. J-04 shop A | Dừng ở ~120 giây, cursor không tiến, task không quá `soft_time_limit` 150 giây; lượt sau chạy lại | |
| TC-05.66 | J-04 trùng lượt → `SKIPPED locked` | 02a §6 | Negative | P3 | INT | PRE-17, giữ khóa `sync:{A}` | 1. J-04 shop A | Log `SKIPPED locked`, không gọi adapter | |
| TC-05.67 | Đơn TikTok mới ≤ 5 phút | NFR-38 | NFR | P2 | INT | PRE-17 | 1. `t0`: mock thêm đơn có mã vận đơn 2. Chạy beat 300 giây | Đơn có trong DB ≤ `t0 + 5 phút` | |
| TC-05.68 | Đơn kho TikTok bị bỏ qua | EX-T5, AS-13 | Negative | P2 | INT | PRE-17 | 1. J-04 shop A | Không có kiện `TTTST0000000098`; log `platform_sync` đếm `fulfilled_by_platform = 1` | |
| TC-05.69 | 9 trạng thái TikTok → nhóm + trạng thái kho | BR-30, FR-05.16, 05.21, AC-41 | Happy | P1 | INT | PRE-17, kiện `TTTST0000000011..19` đã `PACKED` (trừ 11, 12) | 1. J-04 + J-06 | `platform_status_group`: 011, 012 `UNPAID` (không vào danh sách đóng gói); 013–015 `AWAITING_SHIPMENT` (kiện giữ); 016 `SHIPPED` → `HANDED_OVER`; 017, 018 `DELIVERED` → `DELIVERED`; 019 `CANCELLED` → `CANCELLED_AFTER_PACK` + BR-11. `platform_status` giữ chữ nguyên văn | |
| TC-05.70 | Trạng thái lạ → "Không rõ" | BR-30, AC-41 | Negative | P1 | INT | PRE-17 | 1. J-04 + J-06 với `TTTST0000000099` (`XYZ`) | Nhóm `UNKNOWN`; trạng thái kho không đổi; log `platform_status_unknown {platform: TIKTOK, status: XYZ}`; không gọi `transition` | |
| TC-05.71 | Kiện gộp 2 đơn | FR-05.22, EX-T3 | Happy | P2 | INT | PRE-17 | 1. J-04 shop A 2. API-31 kiện `TTTST0000000077` | 2 dòng `package_order`; API-31 `order.merged_orders` có `5761TT0000000772`; `items[]` có `platform_order_sn` từng dòng | |
| TC-05.72 | Mã vận đơn đã thuộc shop khác | EX-T2, BR-29 | Negative | P1 | INT | PRE-17, fixture EX-T2 | 1. J-04 shop B 2. API-70 | Kiện `SPXTST0000010` vẫn thuộc đơn shop `990001`; B `sync_warnings[0] = {code: TRACKING_OWNED_BY_OTHER_SHOP, message: "Mã vận đơn SPXTST0000010 đã thuộc đơn của shop TST Shop A (Shopee)", tracking_number}`; log `tracking_owned_by_other_shop`; các kiện khác của B vẫn ghi | |
| TC-05.73 | Hai shop cùng mã đơn → hai đơn | BR-29, EX-T6, AC-40 | Happy | P1 | API | PRE-14 | 1. API-30 `q=2410DUP00001` | 2 dòng: chip "Shopee · TST B" / "TikTok · TST TikTok A (mock)", `shop.id` khác nhau | |
| TC-05.74 | Đơn file được shop đầu tiên nhận | BR-29, BR-17 | State | P1 | INT | PRE-17, đơn file `2410FILE001` (`shop_id IS NULL`) | 1. Mock A trả đơn `2410FILE001` → J-04 A 2. Mock B cũng trả `2410FILE001` → J-04 B | 1. Đơn file thành đơn A (`shop_id = A`, `source = API`), audit `ORDER_OVERWRITTEN_BY_API` 2. B tạo đơn mới; tổng 2 đơn mã `2410FILE001` | |
| TC-05.75 | Nhập file khi có đơn API cùng mã | BR-29, 02a §5.1 #3, #4 | Negative | P1 | API | PRE-14 | 1. Nhập file dòng `2410DUP00001` + mã vận đơn `SPXTSTB000000021` 2. Dòng `2410DUP00001` + mã vận đơn mới `SPXFILE000001` 3. Dòng mã mới + mã vận đơn `TTTST0000000021` | 1. `SKIP` (đơn API giữ nguyên) 2. `NEW` đơn file (`shop_id IS NULL`) 3. Lỗi dòng "Mã vận đơn đã thuộc đơn 2410DUP00001 (TST TikTok A (mock))" | |
| TC-05.76 | Song song 2 shop cùng mã | 02a §5.1 #1, DEC-493 | NFR | P2 | INT | PRE-17 | 1. 2 transaction ghi `2410DUP00002` cho A và B cùng lúc × 20 | 2 đơn mỗi lượt; không deadlock, không `IntegrityError` | |
| TC-05.77 | Mọi điểm tra theo mã (21 dòng §5.1) | BR-29, 02a §5.1 | Regression | P1 | INT | PRE-17 | 1. `uv run pytest tests/integration/test_code_lookup_two_shops.py` | Mỗi dòng §5.1 #1–#21 một case pass | |
| TC-05.78 | J-06 theo shop — thành công | FR-05.16, AC-41 | Happy | P1 | INT | PRE-17, kiện TikTok `PACKED` / `HANDED_OVER` | 1. Mock: `IN_TRANSIT`, `DELIVERED`, giao thất bại 2. J-06 | Lần lượt `HANDED_OVER`, `DELIVERED`, `RETURN_EXPECTED` + hồ sơ "Giao thất bại"; J-06 chỉ gọi token shop của đơn (`calls[]` theo shop) | |
| TC-05.79 | J-06 lỗi tạm | 02a §7 J-06 | Negative | P2 | INT | PRE-17, mock A `fail_times=1` (5xx) | 1. J-06 | Client thử lại, lô thành công; log `attempt` 2 | |
| TC-05.80 | J-06 lỗi cuối lô shop A | 02a §7 J-06, NFR-39 | Negative | P2 | INT | PRE-17, `fail_shop = TTMOCKA` | 1. J-06 | Shop A dừng, kiện A giữ trạng thái; shop B, Shopee cập nhật bình thường | |
| TC-05.81 | J-12 thành công — làm mới theo grant | FR-05.13, DEC-433, 507 | Happy | P1 | INT | PRE-17, A và B cùng grant, token còn 50 phút | 1. J-12 | Đúng **1** lần gọi `token/refresh`; token mới ghi cho cả A và B; không lấy khóa `sync:` | |
| TC-05.82 | J-12 lỗi tạm | 02a §6 | Negative | P2 | INT | PRE-17, mock refresh 5xx 1 lần | 1. J-12 | Thử lại trong client, thành công; shop vẫn `CONNECTED` | |
| TC-05.83 | J-12 lỗi cuối → hết hạn | FR-05.14, T6, N06 | Negative | P1 | INT | PRE-17, `fail_auth` grant A / B | 1. J-12 2. API-32 bằng `tst_admin` và `tst_cskh` 3. J-26 | 1. A, B `EXPIRED`, `last_error.code = AUTH_EXPIRED` 2. ADMIN có `SYNC_ERROR` "⚠ Shop TST TikTok A (mock) (TikTok) hết hạn ủy quyền"; CSKH không có 3. Sự kiện N06 `shop:{id}:expired:{at}` | |
| TC-05.84 | J-12 bỏ qua shop đã ngắt | DEC-507 | Negative | P2 | INT | PRE-17, B `DISCONNECTED`, A `CONNECTED` cùng grant | 1. J-12 | Token mới chỉ ghi cho A; B giữ `DISCONNECTED`, token null | |
| TC-05.85 | J-13 TikTok 6 kịch bản trả hàng | FR-05.18, BR-31, AC-42 | Happy | P1 | INT | PRE-17, kiện `…061..066` `DELIVERED` | 1. J-13 2. `advance` theo kịch bản 064 (3 ngày chờ duyệt rồi chấp nhận, thêm 8 ngày) 3. J-14 | 061 → hồ sơ "Chỉ hoàn tiền", kho không đổi; 062 → "Khách trả hàng", kiện `RETURN_EXPECTED` ("Hoàn đang về"); 063 → "Khách trả hàng" lý do "Đổi hàng"; 064 → không "Hoàn quá hạn" trong 3 ngày chờ duyệt, quá hạn tính từ lúc chấp nhận (BR-12); 065 → hồ sơ Đã hủy; 066 → cảnh báo BR-19. Mọi hồ sơ có `shop_id`, `platform_status_group` đúng §5.3 02 | |
| TC-05.86 | J-13 lỗi tạm / lỗi cuối theo shop | 02a §7 J-13 | Negative | P2 | INT | PRE-17 | 1. Mock A `fail_times=1` → J-13 2. `fail_shop=TTMOCKA` → J-13 | 1. Thành công sau thử lại 2. A ghi lỗi, cursor không tiến; B, Shopee chạy | |
| TC-05.87 | Yêu cầu trả mới → hồ sơ ≤ 15 phút | NFR-38 | NFR | P2 | INT | PRE-17 | 1. `t0` mock thêm yêu cầu 2. Beat 900 giây | Hồ sơ hàng hoàn có ≤ `t0 + 15 phút` | |
| TC-05.88 | Bàn hoàn mã chiều về TikTok mở đúng phiên | AC-42, FR-05.18 | Happy | P1 | E2E | PRE-14 + PRE-8, sau TC-05.85 trên stack | 1. Station 01 quét `TTRTTST000062` | R2 mở hồ sơ của `TTTST0000000062`, chip "TikTok · TST TikTok A (mock)" | |
| TC-05.89 | Ký request TikTok | FR-05.08, 02a §7.1 | Happy | P1 | UNIT | — | 1. `test_tiktok_sign` vector cố định | `sign` = HMAC-SHA256 hex đúng vector; tham số `sign`, `access_token` không vào chuỗi gốc | |
| TC-05.90 | Yêu cầu hủy TikTok 4 kịch bản | FR-05.17, DEC-502, AC-41 | State | P1 | INT | PRE-17 | 1. J-04 nhiều lượt với `…050..053` | 050 → `CANCEL_REQUESTED`; 051 lượt 2 `CANCEL_REQUESTED`, lượt 3 (`REJECTED`) về `AWAITING_SHIPMENT`; 052 rút → về nhóm theo trạng thái đơn; 053 → `CANCELLED`. Mọi đơn trong `cancellations/search` được lấy chi tiết `orders?ids=` (kiểm `calls[]`) | |
| TC-05.91 | Lõi không chứa chữ trạng thái sàn | NFR-28, FR-05.07, AC-44 | Regression | P1 | UNIT | — | 1. `uv run pytest tests/unit/test_no_platform_status_in_core.py` 2. `grep -rnE` chữ trạng thái TikTok + Shopee (`AWAITING_SHIPMENT`, `IN_TRANSIT`, `ON_HOLD`, `IN_CANCEL`, `READY_TO_SHIP`) trong `ai-cam-be/src/aicam/**/*.py` loại trừ `platforms/shopee`, `platforms/tiktok`, `platforms/mock` | 1. Pass (gồm test AST: gán `.platform_status =` ngoài 2 helper = 0) 2. 0 dòng | |
| TC-05.92 | Quét mã lạ tra song song — một shop có đơn | FR-05.19, BR-32, AC-43 | Happy | P1 | INT | PRE-17, 3 shop: A trả 0,8 giây có đơn, Shopee `990001` 1,1 giây không có, `990002` chậm 5 giây | 1. API-11 PACK mã của A (chưa đồng bộ) | Phiên mở lúc ~2 giây (≤ 2,2 giây), đơn upsert gắn shop A; log `platform_lookup {shops: 3, found: 1}` | |
| TC-05.93 | Mã có ở 2 shop | EX-P14, BR-32, AC-43 | Negative | P1 | API + E2E | PRE-14 | 1. Station 01 quét `SPXTSTX0000001` 2. D4 kiện đó | 1. Phiên mở "chưa xác minh", cờ `AMBIGUOUS_SHOP` 2. Dòng thời gian "Mã có ở 2 shop: TST B (Shopee), TST TikTok B (mock) (TikTok)" | |
| TC-05.94 | Không shop nào trả lời kịp | FR-05.19 | Negative | P2 | INT | PRE-17, mọi shop chậm 5 giây | 1. API-11 PACK `SPXVN0000000000` | Phiên "chưa xác minh" ở ~2 giây như Phase 1 | |
| TC-05.95 | J-05 xác minh kiện chưa xác minh qua mọi shop | 02a §7 J-05 | Happy | P2 | INT | PRE-17, kiện chưa xác minh 2 ngày, nay có ở shop B | 1. J-05 | Kiện gắn đơn shop B; mỗi kiện ≤ 2 giây; lượt ≤ 120 giây | |
| TC-05.96 | Danh sách shop rút gọn | API-156, DEC-484 | Happy | P2 | API | PRE-14 | 1. `GET /shops/brief` bằng ADMIN, SUPERVISOR, CSKH | 200, 4 shop `{id, platform, name, auth_status}` sắp theo sàn, tên; không có token / `shop_cipher` | |

### M03 — Station đóng gói: chip sàn, người đóng gói, yêu cầu hủy, kiện gộp

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-03.80 | S2 chip sàn · shop | FR-03.03, AC-62 | Happy | P1 | E2E | PRE-14 + PRE-2, Station 01 chế độ đóng gói | 1. Quét `TTTST0000000013` 2. Đóng 3. Quét `SPXTSTB000000001` | 1. S2 chip "TikTok · TST TikTok A (mock)" chữ ≥ 24 px, `aria-label` "Sàn: TikTok Shop, shop TST TikTok A (mock)"; không còn chữ cứng "Shopee" 3. Chip "Shopee · TST B" | |
| TC-03.81 | Kiện chưa xác minh → "Chưa rõ sàn" | FR-03.03 | Negative | P2 | E2E | PRE-14 + PRE-2 | 1. Quét `SPXVN0000000000` | S2 chip "Chưa rõ sàn" | |
| TC-03.82 | Tên shop dài cắt "…" | RF-31 | Boundary | P3 | UNIT | — | 1. `PlatformChip` tên shop 40 ký tự | Hiện 28 ký tự + "…", `title` đầy đủ | |
| TC-03.83 | Kiện gộp 2 đơn ở S2 | FR-05.22, EX-T3 | Happy | P2 | E2E | PRE-14 + PRE-2 | 1. Quét `TTTST0000000077` | Banner vàng `role="alert"` "Kiện gộp 2 đơn: …0771, …0772 — kiểm đủ hàng của cả hai"; mỗi dòng sản phẩm có "(đơn …0771)" / "(đơn …0772)"; đủ sản phẩm của 2 đơn | |
| TC-03.84 | Kiện gộp > 3 đơn | RF-32 | Boundary | P3 | UNIT | — | 1. `MergedOrdersBanner` 5 đơn | Hiện 3 mã + "và 2 đơn khác"; chữ "của tất cả" | |
| TC-03.85 | Quét đơn TikTok đang yêu cầu hủy | BR-01, FR-05.17, EX-T4, AC-41 | Negative | P1 | E2E | PRE-14 + PRE-2 | 1. Quét `TTTST0000000050` | S4 nền vàng "ĐƠN ĐANG YÊU CẦU HỦY" + "Người mua đang xin hủy đơn này. Chờ xử lý trên sàn, chưa đóng gói."; 2 bíp; tự đóng về S1; API-11 `ALERT ORDER_CANCEL_REQUESTED`; không có phiên | |
| TC-03.86 | Shopee `IN_CANCEL` cùng luật | BR-01, FR-05.17 | Negative | P1 | API | PRE-14 + PRE-5, `SPXTSTB000000015` lượt 1 (`IN_CANCEL`) | 1. API-11 PACK `SPXTSTB000000015` | `ALERT ORDER_CANCEL_REQUESTED`; kiện vẫn `NEW` (không `CANCELLED`) | |
| TC-03.87 | Quét đơn đã hủy — chữ không còn "Shopee" | BR-01, API-11 | Negative | P2 | API | PRE-14, `TTTST0000000053` sau J-04 | 1. API-11 PACK `TTTST0000000053` | `ALERT ORDER_CANCELLED`, `message` không chứa "Shopee" | |
| TC-03.88 | Yêu cầu hủy đến khi đang đóng | BR-21 (làm rõ), AC-41, EX-T4 | State | P1 | INT + E2E | PRE-17; E2E: PRE-2 + MSW `TTTST0000000051` | 1. Mở phiên `TTTST0000000051` (lượt 1 `AWAITING_SHIPMENT`) 2. J-04 lượt 2 (`PENDING`) 3. "Đóng gói xong" | 2. Cờ phiên `ORDER_CANCEL_REQUESTED`, WS state; S2 banner vàng "⚠ Người mua đang xin hủy đơn này. Đóng gói xong để riêng, chưa bàn giao.", 2 bíp lần đầu; kiện vẫn `PACKING`; không gọi `apply_platform_cancel` 3. Nút "Đóng gói xong" bật; kiện `PACKED` | |
| TC-03.89 | Yêu cầu hủy bị từ chối → bàn giao bình thường | BR-21, AC-41 | State | P1 | INT | Sau TC-03.88 | 1. J-04 lượt 3 (`REJECTED`, đơn `AWAITING_SHIPMENT`) 2. Mock vận chuyển `IN_TRANSIT` → J-06 | 1. Nhóm `AWAITING_SHIPMENT`; kiện `PACKED` 2. `HANDED_OVER`; không có `CANCELLED*`, không BR-11 | |
| TC-03.90 | Yêu cầu hủy được chấp nhận khi đã đóng | BR-21, BR-11, AC-41 | State | P1 | INT | PRE-17, kiện `PACKED` đơn `CANCEL_REQUESTED` 2 ngày | 1. J-14 2. Mock đơn → `CANCELLED` → J-04 3. J-14 | 1. Không cảnh báo BR-10, BR-11 2. Kiện `CANCELLED_AFTER_PACK` 3. Cảnh báo BR-11 mở | |
| TC-03.91 | Đơn bị hủy khi đang đóng → S2 đỏ | BR-21, AC-41 | State | P1 | E2E | PRE-14 + PRE-2, phiên `TTTST0000000013` đang mở | 1. Mock đơn → `CANCELLED` 2. API-73 shop A | ≤ 5 giây sau đồng bộ: S2 cảnh báo đỏ như Phase 1 (`ORDER_CANCELLED`) | |
| TC-03.92 | Người đóng gói không bắt buộc | FR-03.16, AC-62 | Happy | P1 | API | PRE-14 + PRE-5, `packer_name_required = false` | 1. API-11 PACK `SPXTSTB000000002` | `SESSION_OPENED`; `session.operator_name = null`; S1 thanh trạng thái "Chưa ghi tên người đóng gói · Nhập tên" | |
| TC-03.93 | Bắt buộc tên người đóng gói | FR-03.16, AC-62, DEC-481 | Happy | P1 | E2E | PRE-2 + PRE-3, Station 01 chưa có tên | 1. D8 bật "Bắt buộc tên người đóng gói" 2. Station quét `SPXTSTB000000003` 3. R5 nhập "Minh QA" → "Bắt đầu ca" 4. Quét lại | 1. Station S1 cập nhật không tải lại 2. Overlay vàng "Nhập tên người đóng gói trước khi đóng gói." + 2 bíp → R5 tiêu đề "Người đóng gói"; API-11 `OPERATOR_REQUIRED {mode: PACK}` trả **trước** tra cứu (không gọi adapter) 3. Thanh trạng thái "Người đóng gói: Minh QA" + "Đổi" 4. S2; `session.operator_name = "Minh QA"` | |
| TC-03.94 | Tên người đóng gói sai độ dài | FR-03.16 | Boundary | P3 | API | PRE-5 | 1. API-101 `name: "M"` 2. 41 ký tự 3. 2 ký tự, 40 ký tự | 1–2. 422 `fields.name` 3. 200 | |
| TC-03.95 | Tên người đóng gói ở D4 | FR-03.16, AC-62 | Happy | P2 | E2E | Sau TC-03.93 | 1. D4 kiện `SPXTSTB000000003` | `SessionPanel` "Người đóng gói: Minh QA" | |
| TC-03.96 | Đăng xuất xóa tên người đóng gói | FR-03.16, BR-28 | Regression | P3 | E2E | Sau TC-03.93 | 1. Đăng xuất station 2. Đăng nhập lại | Thanh trạng thái "Chưa ghi tên người đóng gói · Nhập tên" | |

### M04 — Phiên mở hoàn: luật hủy 60 giây, D13 lý do hủy, mã trùng nhiều shop (L11, BR-29)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-04.60 | Station tự hủy trong 45 giây | BR-37, FR-04.14, AC-56 | Happy | P1 | INT | PRE-17, phiên RETURN mở lúc `t0`, chưa kết luận / ảnh | 1. `advance(45 giây)` 2. API-12 `reason: WRONG_SCAN` | 200; phiên `CANCELLED` `cancel_reason = WRONG_SCAN`; kiện / hồ sơ về trạng thái trước như Phase 2 | |
| TC-04.61 | Biên 60 giây (server) | BR-37, AC-56 | Boundary | P1 | INT | Như TC-04.60 | 1. API-10 đọc `self_cancel_until` 2. Hủy ở `t0 + 60 giây` (phiên khác) 3. Hủy ở `t0 + 61 giây` | 1. `self_cancel_until = started_at + 60 giây` 2. 200 3. 409 `CANCEL_REQUIRES_SUPERVISOR`, `message` "Phiên đã quá 60 giây. Bấm Gọi quản lý để hủy." | |
| TC-04.62 | Đã lưu kết luận → không tự hủy | BR-37, AC-56 | Negative | P1 | INT | Phiên mở 20 giây, API-102 kết luận "Hộp rỗng" | 1. API-10 2. API-12 | 1. `self_cancel_until = null` 2. 409 `CANCEL_REQUIRES_SUPERVISOR` | |
| TC-04.63 | Đã chụp ảnh → không tự hủy | BR-37, AC-56 | Negative | P1 | INT | Phiên mở 10 giây, API-103 1 ảnh `MANUAL` | 1. API-12 | 409 `CANCEL_REQUIRES_SUPERVISOR` | |
| TC-04.64 | R2 đổi nút đúng giây 61 theo giờ server | FR-04.14, DEC-480 | Happy | P1 | E2E | PRE-8 + PRE-2; đồng hồ máy trạm lệch +5 phút so với server | 1. Mở R2 2. Chờ tới giây 61 (không tải lại) | Tới giây 60 (giờ server): [Hủy phiên] [Gọi quản lý]; từ giây 60,0: dòng "Muốn hủy phiên? Bấm Gọi quản lý." + [Gọi quản lý]; `aria-live` đọc "Đã quá 60 giây — hủy phiên cần quản lý"; không phụ thuộc giờ máy trạm | |
| TC-04.65 | Bấm hủy sát giờ → Toast | FR-04.14 | Negative | P2 | E2E | `pnpm dev:mock`, MSW API-12 trả 409 | 1. R2 bấm "Hủy phiên" → chọn lý do → xác nhận | Dialog đóng; Toast "Phiên đã quá 60 giây. Bấm Gọi quản lý để hủy."; gọi lại API-10 | |
| TC-04.66 | Lưu kết luận / chụp ảnh → nút ẩn ngay | DEC-480 | State | P2 | E2E | PRE-8 + PRE-2, R2 giây 15 | 1. Chọn "Nguyên vẹn" (lưu) 2. Phiên khác: F2 chụp ảnh | Nút "Hủy phiên" ẩn ngay khi WS state có `self_cancel_until = null` | |
| TC-04.67 | D13 thẻ phiên hoàn có tóm tắt | FR-04.14, UC-22, API-20 | Happy | P1 | E2E | PRE-4 + PRE-8, R2 > 60 giây, kết luận "Hộp rỗng", 3 ảnh | 1. Station "Gọi quản lý" 2. D13 | S5; thẻ "Gọi quản lý · Mở hoàn · Đã có kết luận: Hộp rỗng · 3 ảnh · mở 4 phút"; API-20 `return_summary {conclusion: EMPTY_BOX, snapshot_count: 3, opened_at}` | |
| TC-04.68 | D13 hủy phiên hoàn bắt lý do + ghi chú | FR-04.14, EX-R17, AC-56 | Happy | P1 | E2E | Tiếp TC-04.67, `tst_sup` | 1. "Hủy phiên" 2. Chưa chọn gì 3. Chọn "Quét nhầm kiện khác", ghi chú "Kiện của đơn khác" 4. "Hủy phiên" | 2. Radio 3 lựa chọn không chọn sẵn; nút [Hủy phiên] khóa 3. Chữ dưới đổi theo lựa chọn (01 §10.5 D13); nút bật 4. API-21 `{action: CANCEL_SESSION, reason_code: WRONG_SCAN, note}` 200; station về R1 "Quản lý đã hủy phiên." | |
| TC-04.69 | API-21 thiếu lý do | FR-04.14, API-21 | Negative | P1 | API | PRE-5, yêu cầu duyệt từ phiên RETURN | 1. API-21 `CANCEL_SESSION` không `reason_code`, `note` "Kiện của đơn khác" 2. `reason_code: "ABC"` | 422 `VALIDATION_ERROR`, `details.fields.reason_code = "Chọn lý do hủy."`; phiên vẫn chờ duyệt | |
| TC-04.70 | API-21 ghi chú biên | FR-04.14 | Boundary | P2 | API | Như TC-04.69 | 1. `note` 4 ký tự 2. 501 ký tự 3. 5 ký tự (sau trim "  abcde  ") 4. 500 ký tự | 1–2. 422 `fields.note = "Nhập ghi chú (5–500 ký tự)."` 3–4. 200 | |
| TC-04.71 | Lý do Supervisor được lưu đúng | BR-39 v0.4, DEC-521 | Happy | P1 | API | Sau TC-04.68 | 1. Đọc phiên (DB / API-132 nếu có hồ sơ) 2. API-92 | `cancel_reason = SUPERVISOR`, `cancel_cause = WRONG_SCAN`; audit `APPROVAL_DECISION` `data.reason_code = WRONG_SCAN`, `note` | |
| TC-04.72 | Hủy phiên PACK qua D13 không cần lý do | API-21, hồi quy | Regression | P2 | API | PRE-5, yêu cầu duyệt từ phiên PACK | 1. API-21 `CANCEL_SESSION` `note` "Khách đổi ý" không `reason_code` | 200 như Phase 1 | |
| TC-04.73 | Supervisor "Cho tiếp tục" | UC-22 ngoại lệ | Happy | P3 | E2E | Như TC-04.67 | 1. D13 "Cho tiếp tục" | Station về R2 ≤ 2 giây | |
| TC-04.74 | Bàn hoàn quét mã đơn trùng 2 shop | BR-29, EX-R20, EX-T6, AC-40 | Negative | P1 | E2E | PRE-14 + PRE-8 | 1. Station quét `2410DUP00001` 2. Chờ 1,5 giây | 1. R4 vàng "MÃ CÓ Ở NHIỀU ĐƠN" + "Mã 2410DUP00001 có ở 2 đơn của các shop khác nhau. Chọn đúng đơn." + 2 bíp; API-11 `ALERT RETURN_MULTIPLE_ORDERS` `data.orders` 2 phần tử `{platform, shop_name, platform_order_sn}` sắp theo sàn; không mở phiên 2. R3 mở với ô = `2410DUP00001`, 2 dòng chip "Shopee · TST B" / "TikTok · TST TikTok A (mock)" | |
| TC-04.75 | Chọn đơn trong R3 → mở đúng phiên | EX-R20, AC-40 | Happy | P1 | E2E | Tiếp TC-04.74, đơn TikTok có yêu cầu trả | 1. "Mở phiên" dòng TikTok | R2 của kiện `TTTST0000000021`, chip TikTok | |
| TC-04.76 | Mã yêu cầu trả trùng 2 shop | BR-29, 02a §5.1 #10 | Negative | P2 | API | PRE-14, fixture mã yêu cầu trả trùng | 1. API-11 RETURN mã yêu cầu trả đó | `ALERT RETURN_MULTIPLE_ORDERS` | |
| TC-04.77 | Mã chiều về trùng ở 2 hồ sơ mở | 02a §5.1 #15, DEC-523 | Negative | P2 | INT | PRE-17, `RTTST-DUP-1` ở 2 hồ sơ mở đơn khác | 1. API-11 RETURN `RTTST-DUP-1` 2. Một hồ sơ chuyển đã nhận → quét lại | 1. `ALERT RETURN_MULTIPLE_ORDERS` 2. Mở phiên hồ sơ còn mở | |
| TC-04.78 | Không tự gộp hồ sơ chưa xác định khi mã mơ hồ | 02a §5.1 #15 | Negative | P2 | INT | PRE-17, hồ sơ `UNIDENTIFIED` `open_code = RTTST-DUP-1` | 1. J-13 / `merge_unidentified_by_code` | Hồ sơ giữ `UNIDENTIFIED`; log `unidentified_merge_ambiguous {code, case_ids}` | |
| TC-04.79 | Mã chỉ ở một shop → mở phiên bình thường | BR-29 | Happy | P2 | API | PRE-14 + PRE-8 | 1. API-11 RETURN `2410TSTB0005` (có yêu cầu trả) | `SESSION_OPENED` hồ sơ shop `990002` | |
| TC-04.80 | R2 chip sàn cạnh mã kiện | FR-03.03 | Happy | P2 | E2E | Như TC-05.88 | 1. Xem R2 | Chip "TikTok · TST TikTok A (mock)" cạnh mã kiện | |
| TC-04.81 | Đóng phiên bằng mã đơn trùng shop khác | 02a §5.1 #13 | Regression | P3 | INT | PRE-17, phiên mở hồ sơ đơn `2410DUP00001` shop A | 1. Kết luận → quét `2410DUP00001` | Đóng đúng phiên đang mở (không alert nhiều đơn) | |

### M08 — Hồ sơ khiếu nại: phiên mở hoàn trước, quét nhầm, bỏ bằng chứng, hạn (L11, L13, L14, L15)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-08.40 | Phiên bỏ dở trước là phiên chính | BR-39, FR-08.07, EX-R18, AC-56 | Happy | P1 | INT + E2E | PRE-17 / PRE-8: kiện `SPXTST0000041`; 08:51 phiên A `ABANDONED` (có clip); 10:15 phiên B kết luận "Hộp rỗng" | 1. Đóng phiên B 2. API-132 hồ sơ tự tạo 3. D17 | 2. `evidence` = PACK hiệu lực + A (`prior_return = true`, `primary = true`) + B + ảnh 3. Alert "Kiện có 1 phiên mở hoàn trước (bỏ dở 05/10 08:51) — đã đưa vào bằng chứng."; nhãn "Phiên chính" trên A | |
| TC-08.41 | Gói bằng chứng thư mục phiên trước | FR-08.07, J-16 | Happy | P1 | API | Sau TC-08.40 | 1. API-136 tạo gói → API-138 tải zip | Thư mục phiên chính là A; có thư mục `NN-mo-hoan-phien-truoc-…`; `info.json` khớp | |
| TC-08.42 | Phiên hủy quét nhầm (station) bị loại | BR-39 (a), FR-08.07, AC-56 | Negative | P1 | INT + E2E | 09:00:10 phiên C hủy `WRONG_SCAN` sau 25 giây (có clip); 09:01 phiên D "Hộp rỗng" | 1. Đóng D 2. API-132 3. D17 | 2. `evidence` không có C; `primary` = D; `excluded_return_sessions = [C]` (`in_evidence = false`, `evidence_exclusion = STATION_CANCEL`) 3. Alert "1 phiên mở hoàn bị hủy vì quét nhầm (06/10 09:00) — không đưa vào bằng chứng. …" + link "Thêm vào bằng chứng" | |
| TC-08.43 | "Không phải hàng hoàn" bị loại như quét nhầm | BR-39 (a) | Negative | P2 | INT | Như TC-08.42, C `NOT_A_RETURN` | 1. Đóng D 2. API-132 | Như TC-08.42; chip "Hủy: không phải hàng hoàn" | |
| TC-08.44 | Thêm tay phiên bị loại — vẫn không phải phiên chính | BR-39, AC-56 | Negative | P1 | INT | Sau TC-08.42 | 1. API-134 thêm C 2. API-132 3. API-136 gói | C trong `evidence`, `primary` vẫn D; zip thư mục chính là D | |
| TC-08.45 | Supervisor hủy "Lý do khác" → vào bằng chứng | BR-39, EX-R17 | Happy | P1 | INT | Phiên E hủy qua API-21 `reason_code = OTHER` (có clip), phiên sau "Hư hỏng" | 1. Đóng phiên sau 2. API-132 | E trong `evidence`, có thể `primary` (sớm nhất) | |
| TC-08.46 | Supervisor hủy "Quét nhầm kiện khác" → bị loại | BR-39 v0.4, AC-56 | Negative | P1 | INT | Phiên > 60 giây có clip, API-21 `WRONG_SCAN`; phiên sau "Hộp rỗng" | 1. API-132 | Như TC-08.42, `evidence_exclusion = SUPERVISOR_CANCEL`; `cancel_reason` vẫn `SUPERVISOR` | |
| TC-08.47 | Clip phiên bị loại vẫn được giữ | BR-09 b, BR-39, AC-56 | Regression | P1 | INT | Sau TC-08.42, clip C quá hạn retention, hồ sơ hàng hoàn còn mở | 1. J-02 | Clip C không bị xóa | |
| TC-08.48 | Phiên bị loại không tính D2 / D3 / N03 | BR-39, FR-09.01, AC-56 | Negative | P1 | INT | Sau TC-08.42 + TC-08.46 | 1. API-32 2. API-30 `session_type=RETURN&return_dropped=true` 3. J-26 | 1. `returns_dropped_7d` không đếm C, phiên TC-08.46 2. Không liệt kê 3. Không sự kiện N03 cho chúng | |
| TC-08.49 | D2 đếm phiên bỏ dở kể cả khi kiện có phiên sau | FR-09.01, AC-56 | Happy | P1 | API + E2E | Sau TC-08.40 | 1. API-32 2. D2 thẻ "Phiên hoàn hủy / bỏ dở (7 ngày)" → bấm | 1. `returns_dropped_7d` ≥ 1 (A); attention `RETURN_SESSION_DROPPED` "⚠ 1 phiên mở hoàn bị hủy / bỏ dở trong 7 ngày" 2. Mở D3 `session_type=RETURN&return_dropped=true&date_from=…` có A | |
| TC-08.50 | Đánh dấu quét nhầm phiên chính của 2 hồ sơ mở | BR-39 (b), EX-R21, FR-08.07, AC-56 | State | P1 | INT | A là phiên chính của KN-1, KN-2 (mở) và có trong KN-3 (đóng); B "Hộp rỗng" | 1. API-189 KN-1 phiên A `{action: MARK_WRONG_SCAN, reason_code: WRONG_SCAN, note: "Video là kiện khác", version}` 2. API-132 KN-1, KN-2, KN-3 3. J-02 trước `keep_until` 4. API-32, J-26 | 1. 200 2. KN-1, KN-2: A trong `removed_evidence` (`removed_reason = "Đánh dấu quét nhầm: Video là kiện khác"`), `primary` = B, `version + 1` mỗi hồ sơ; KN-3 giữ nguyên; audit `SESSION_WRONG_SCAN_MARK` + 2 `CLAIM_EVIDENCE_REMOVE`; WS `claim.updated` cho 2 hồ sơ chạm (KN-3 không) 3. Clip A còn 4. N03 / D2 không đếm A | |
| TC-08.51 | Bỏ đánh dấu không tự thêm lại | BR-39, EX-R21 | State | P1 | INT | Sau TC-08.50 | 1. API-189 `UNMARK_WRONG_SCAN` 2. API-132 3. API-134 thêm lại A | 2. A không tự vào `evidence` 3. A vào, có thể là phiên chính | |
| TC-08.52 | Phiên Supervisor hủy trước Phase 3 → "Cần soát" | BR-39, DEC-516 | State | P1 | INT + E2E | Phiên `cancel_reason = SUPERVISOR`, `cancel_cause = null`, có clip, sớm nhất | 1. Tạo hồ sơ 2. API-132 3. D17 4. "Là phiên hoàn thật" + ghi chú "Đã xem video, đúng kiện" | 2. Phiên trong `evidence`, `review_needed = true`, không `primary`; `review_sessions` 1 phần tử 3. Chip vàng "Cần soát: quản lý hủy, chưa rõ lý do" + Alert vàng [Là phiên hoàn thật] [Quét nhầm] 4. API-189 `CONFIRM_RETURN` 200 → phiên thành `primary`; audit `SESSION_RETURN_CONFIRM` | |
| TC-08.53 | API-189 lỗi | API-189 | Negative | P1 | API | PRE-5 + PRE-19, hồ sơ có phiên `COMPLETED`, phiên bị loại, phiên chưa đánh dấu | 1. `MARK` phiên `COMPLETED` 2. `UNMARK` phiên chưa đánh dấu 3. `version` cũ 4. Hồ sơ `CLOSED` 5. Phiên của kiện khác 6. `MARK` thiếu `reason_code` 7. `note` "abc" | 1. 409 `SESSION_NOT_ELIGIBLE` "Phiên đã có kết luận — sửa ở chi tiết đơn." 2. 409 `SESSION_NOT_ELIGIBLE` 3. 409 `VERSION_CONFLICT` 4. 409 `CLAIM_CLOSED` 5. 404 `NOT_FOUND` 6. 422 `fields.reason_code = "Chọn lý do."` 7. 422 `fields.note = "Nhập ghi chú (5–500 ký tự)."` | |
| TC-08.54 | Admin gỡ lý do hủy chọn nhầm | BR-39 v0.5, DEC-529 | State | P1 | INT + E2E | Phiên G station hủy `WRONG_SCAN` (sớm nhất, video là kiện hoàn thật); hồ sơ KN mở | 1. `tst_admin` D17 dòng G → [Là phiên hoàn thật] → dialog "Gỡ lý do hủy, xác nhận là phiên hoàn thật?" → ghi chú "Video đúng kiện, chọn nhầm lý do" 2. API-132 3. API-32 | 1. API-189 `CONFIRM_RETURN` 200; Toast "Đã xác nhận phiên hoàn thật." 2. G trong `evidence` (`auto = false`), `primary = true`, rời `excluded_return_sessions`, `session.return_confirmed` có; chip "Đã xác nhận phiên hoàn thật" 3. N03 / D2 đếm G như phiên hủy thường; audit `SESSION_RETURN_CONFIRM` `overridden_cause = WRONG_SCAN` | |
| TC-08.55 | CSKH không gỡ được lý do hủy | BR-39 v0.5, §5.10 | Permission | P1 | API + E2E | Như TC-08.54, `tst_cskh` | 1. D17 dòng G 2. API-189 `CONFIRM_RETURN` trực tiếp | 1. Không có nút [Là phiên hoàn thật] 2. 403 `FORBIDDEN` "Chỉ Admin / Supervisor gỡ lý do hủy của phiên." | |
| TC-08.56 | Đánh dấu thắng xác nhận | BR-39 v0.5 (15) | State | P2 | INT | Sau TC-08.54 | 1. `MARK_WRONG_SCAN` G 2. `UNMARK` | 1. G bị loại lại 2. Về trạng thái đã xác nhận (`review_confirmed_at` giữ) | |
| TC-08.57 | Đánh dấu quét nhầm phiên đang có trong link | DEC-531, BR-39 (16) | Happy | P1 | INT + E2E | Phiên A trong 2 link `ACTIVE` (1 do `tst_cskh`, 1 do `tst_sup`) + 1 link `REVOKED` | 1. `tst_cskh` API-189 `MARK_WRONG_SCAN` A 2. D17 | 1. `affected_shares` 2 phần tử; 3 link không đổi trạng thái; audit `active_shares` 2 id 2. `AffectedSharesDialog` "Phiên này đang có trong 2 link chia sẻ còn hiệu lực": dòng link của `tst_cskh` có [Thu hồi link]; dòng link `tst_sup` chữ "Nhờ Admin / Supervisor thu hồi"; thu hồi → Toast "Đã thu hồi link.", dòng gạch | |
| TC-08.58 | API-189 song song API-134 | 02a §6 | NFR | P2 | INT | PRE-17, cùng hồ sơ, cùng `version` | 1. Gửi đồng thời API-189 `MARK` và API-134 bỏ ảnh | Một 200, một 409 `VERSION_CONFLICT`; không mất dòng | |
| TC-08.59 | Bỏ bằng chứng tự chọn không lý do | BR-38, FR-08.09, AC-58 | Negative | P1 | API | PRE-5, KN-000101 | 1. API-134 bỏ phiên PACK, `note` rỗng | 422 `fields.note = "Nhập lý do bỏ bằng chứng (5–500 ký tự)."`; không đổi | |
| TC-08.60 | Bỏ bằng chứng thêm tay / "Chuyển từ cờ giữ" không lý do | BR-38, AC-58 | Negative | P1 | API | Hồ sơ `LEGACY_HOLD` + hồ sơ có bằng chứng thêm tay | 1. API-134 bỏ mỗi loại không `note` | 422 như TC-08.59 cả hai (ngoại lệ có chủ đích so Phase 2) | |
| TC-08.61 | Bỏ có lý do → giữ tới ngày nêu trong dialog | BR-38, FR-08.09, AC-58 | Happy | P1 | INT + E2E | Clip kết thúc 01/05/2026, số ngày giữ 90, `now` = 06/10/2026 | 1. D17 "Bỏ" → `RemoveEvidenceDialog` 2. Lý do "Không liên quan khiếu nại" → xác nhận 3. API-132 | 1. Chữ "Clip và ảnh của phiên này được giữ tới 04/01/2027 rồi tự xóa (trừ khi thuộc hồ sơ khác)." 3. Dòng trong `removed_evidence {at, by, reason, keep_until: 2027-01-04}`; không `DELETE` dòng; "Bằng chứng đã bỏ (1)" | |
| TC-08.62 | Clip bị bỏ không bị J-02 xóa sớm | BR-38, AC-58 | Boundary | P1 | INT | Sau TC-08.61, clip không thuộc hồ sơ khác | 1. J-02 đêm 07/10 02:00 2. `advance` tới 04/01/2027 01:59 → J-02 3. 05/01/2027 02:00 → J-02 | 1–2. Clip còn `READY` 3. Clip `DELETED` | |
| TC-08.63 | Thêm lại bằng chứng đã bỏ = khôi phục | FR-08.09, API-134 | Happy | P2 | API | Sau TC-08.61 | 1. D17 "Thêm lại" | `removed_*` xóa, dòng về `evidence`, không tạo dòng mới | |
| TC-08.64 | Audit bỏ bằng chứng có lý do | FR-10.03, AC-58, AC-61 | Happy | P1 | API | Sau TC-08.61 | 1. API-92 lọc `CLAIM_EVIDENCE_REMOVE` | 1 dòng / mục bỏ, `data.reason`, người, đối tượng đúng | |
| TC-08.65 | Clip bị bỏ nhưng thuộc hồ sơ khác đang mở | BR-38 | Negative | P2 | INT | Clip ở KN-1 (bỏ) và KN-2 (mở) | 1. `advance` qua `keep_until` → J-02 | Clip còn (KN-2 bảo vệ) | |
| TC-08.66 | Hạn sàn đã qua khi tạo hồ sơ | BR-42, FR-08.10, AC-59 | Happy | P1 | INT + E2E | `now` = 06/10/2026 09:00; `seller_due_at` = 05/10/2026 17:00 | 1. Tạo hồ sơ (tự hoặc tay) 2. API-132 3. D17 | `deadline_at` = 13/10/2026 09:00; `deadline_source = DEFAULT_PLATFORM_PASSED`; ghi chú hệ thống "Hạn sàn (05/10 17:00) đã qua khi tạo hồ sơ — dùng hạn mặc định. Kiểm hạn thật trên sàn."; chip "Hạn sàn đã qua" | |
| TC-08.67 | Hạn sàn chưa qua → dùng hạn sàn | BR-42 | Negative | P2 | INT | `seller_due_at` = 07/10 17:00 | 1. Tạo hồ sơ 06/10 09:00 | `deadline_at` = 07/10 17:00, `deadline_source = PLATFORM`, không ghi chú | |
| TC-08.68 | Hồ sơ quá hạn chưa gửi | BR-42, FR-08.10, AC-59 | State | P1 | INT | Sau TC-08.66 | 1. `advance` tới 13/10 09:01 2. API-32 3. J-26 4. Chuyển `SUBMITTED` → API-32 | 2. `claims_overdue_unsent = 1`; attention `CLAIM_OVERDUE` "⚠ 1 hồ sơ quá hạn chưa gửi" → D16 `due=overdue&status=NEW` 3. N05 `claim:{id}:overdue:{deadline}` 4. Hết đếm; `submitted_at` ghi | |
| TC-08.69 | Chỉ hoàn tiền hạn 36 giờ | BR-40, FR-08.08, AC-57, UC-23 | Happy | P1 | INT + E2E | Yêu cầu Chỉ hoàn tiền `2410TSTB0007` báo lúc `t0`, hạn người bán `t0 + 36 giờ` | 1. J-13 2. API-32 3. D14 tab "Chỉ hoàn tiền" 4. J-26 | 2. `refund_only_pending = 1`; attention "⏱ 1 yêu cầu Chỉ hoàn tiền chưa xử lý · hạn gần nhất {dd/mm HH:mm}" 3. Dòng đầu bảng (sắp `due_asc`), cột "Hạn phản hồi" đỏ "còn 1 ngày 12 giờ", cột "Hồ sơ khiếu nại" nút "Tạo" 4. N04 `refund:{id}:new` | |
| TC-08.70 | Nhắc N04 khi còn 12 giờ — một lần | BR-40, AC-57 | Boundary | P1 | INT | Tiếp TC-08.69 | 1. `advance(23 giờ 59 phút)` → J-26 2. `advance(1 phút)` → J-26 3. J-26 lần nữa | 1. Không N04 nhắc 2. N04 `refund:{id}:12h` 3. Không thêm | |
| TC-08.71 | Tạo hồ sơ khiếu nại → rời "Cần xử lý" | BR-40, AC-57 | State | P1 | API | Tiếp TC-08.69 | 1. Tạo KN cho đơn đó 2. API-32 3. API-110 `pending_only=true` | 2. `refund_only_pending = 0` 3. Không có dòng; API-110 thường: `claim {id, code}` | |
| TC-08.72 | Sàn không trả hạn → mặc định 48 giờ | BR-40, AC-57, DEC-451 | Happy | P1 | API | Yêu cầu Chỉ hoàn tiền không `seller_due_at`, báo 06/10 09:00 | 1. API-110 2. D14 | `response_due_at` = 08/10 09:00, `response_due_source = DEFAULT`; D14 có ⓘ | |
| TC-08.73 | Đổi hạn mặc định Chỉ hoàn tiền | API-80, FR-08.08 | Boundary | P2 | API + E2E | PRE-5 | 1. API-80 `refund_only_default_hours` 0, 169 2. 24 3. D8 ô "Hạn mặc định Chỉ hoàn tiền (giờ)" | 1. 422 `fields.refund_only_default_hours` 2. 200; hồ sơ TC-08.72 hạn = 07/10 09:00 3. Ô hiện 24, lưu được | |
| TC-08.74 | Yêu cầu sàn đã đóng không tính | BR-40 | Negative | P2 | INT | Chỉ hoàn tiền nhóm `CANCELLED` / `DONE` | 1. API-32 | Không đếm `refund_only_pending` | |
| TC-08.75 | Đếm ngược biên 48 giờ | FR-08.08 | Boundary | P3 | UNIT | — | 1. `DueCountdown` còn 48:00:00, 48:00:01, −00:00:01 | Đỏ; không đỏ; chip "Quá hạn" | |
| TC-08.76 | `submitted_at` / `result_at` | FR-09.04, BR-41 | Happy | P2 | INT | Hồ sơ `NEW` | 1. → `SUBMITTED` 2. → `WON` | `submitted_at`, `result_at` đặt đúng lúc chuyển; không đổi khi sửa ghi chú | |
| TC-08.77 | D2 "Quá hạn phản hồi" Chỉ hoàn tiền | EX-R19 | Negative | P2 | E2E | Yêu cầu Chỉ hoàn tiền quá hạn chưa xử lý | 1. D2 2. D14 | Mục đỏ quá hạn; D14 chip "Quá hạn"; vẫn tạo KN được | |

### M02 — Sao lưu cloud (cấu hình, J-20..J-23, đổi khóa, lệch mã băm, không thấy tệp)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-02.50 | Chưa cấu hình kho lưu | EX-K1, FR-02.15 | Negative | P1 | API + E2E | PRE-13 với `S3_ENDPOINT` rỗng | 1. API-180 2. D23 3. D8 4. API-181 `{enabled: true}`, API-183, API-184 5. Chạy J-20, J-21 | 1. `configured = false`, `state = NOT_CONFIGURED`, `storage = null` 2. EmptyState "Chưa cấu hình kho lưu cloud" + hướng dẫn IT 3. "Sao lưu cloud: Chưa cấu hình" 4. 503 `BACKUP_NOT_CONFIGURED` 5. Không chạy (log), không đối tượng | |
| TC-02.51 | Chưa xác nhận khóa → không tải gì | EX-K2, FR-02.17, AC-49 | Negative | P1 | INT + E2E | PRE-13 có `S3_*` + K1, chưa API-182; có hồ sơ hàng hoàn mở | 1. API-180 2. D23 3. Chạy J-20, J-21, J-22 4. `mc ls --recursive` bucket sao lưu | 1. `state = KEY_UNCONFIRMED` 2. Banner vàng "Sao lưu chưa bật: xác nhận đã cất khóa giải mã." 4. Bucket rỗng | |
| TC-02.52 | Sinh khóa | FR-02.13, API-186 | Happy | P2 | CLI | PRE-13 | 1. `aicam backup-keygen` | In khóa base64 (giải mã ra 32 byte) + dấu vân tay `XXXX-XXXX-XXXX-XXXX`; không ghi khóa vào DB / log | |
| TC-02.53 | Kiểm tra kết nối thành công | FR-02.17, API-183 | Happy | P1 | API | PRE-13 + K1 | 1. API-183 2. `mc ls` `backup/_probe/` | 1. 200 `{ok: true, elapsed_ms}` ≤ 10.000; audit `BACKUP_TEST {ok: true}` 2. Không còn đối tượng probe | |
| TC-02.54 | Kiểm tra kết nối lỗi | FR-02.17, EX-K4, API-183 | Negative | P1 | API | PRE-13 | 1. `S3_SECRET_ACCESS_KEY` sai → API-183 2. Dừng `minio` → API-183 3. Bucket không tồn tại → API-183 | 1. 502 `CLOUD_AUTH_FAILED`; D23 Alert "Kho lưu từ chối: sai khóa truy cập." 2. 504 `CLOUD_UNREACHABLE` trong ≤ 11 giây, "Không kết nối được kho lưu. Kiểm tra Internet." 3. 502 `CLOUD_ERROR` + `message` | |
| TC-02.55 | Xác nhận đã cất khóa | FR-02.17, EX-K2 | Happy | P1 | E2E | PRE-13 + PRE-3, `KEY_UNCONFIRMED` | 1. D23 "Xác nhận" → `ConfirmKeyDialog` 2. Chưa tick 3. Tick "Tôi đã cất bản sao khóa…" → xác nhận | 1. Hiện dấu vân tay K1, không hiện khóa 2. Nút khóa 3. API-182 200, `state = ON`, chip "Đang bật"; audit `BACKUP_KEY_CONFIRM {fingerprint, previous_fingerprint: null}` | |
| TC-02.56 | Xác nhận sai dấu vân tay | API-182 | Negative | P2 | API | PRE-13 | 1. API-182 `fingerprint: "0000-0000-0000-0000"` | 409 `BACKUP_KEY_MISMATCH`; `state` không đổi | |
| TC-02.57 | Bật sao lưu khi chưa xác nhận | API-181 | Negative | P2 | API | `KEY_UNCONFIRMED` | 1. API-181 `{enabled: true}` | 409 `BACKUP_KEY_UNCONFIRMED` | |
| TC-02.58 | Tốc độ tải lên biên | API-181, NFR-44 | Boundary | P3 | API | PRE-15 | 1. `upload_mbps` 0, 1001 2. 1, 1000 | 1. 422 `fields.upload_mbps` 2. 200; audit `BACKUP_SETTINGS_UPDATE` | |
| TC-02.59 | Sao lưu đang tắt | API-184, 187, DEC-522 | Negative | P2 | API + E2E | PRE-15 → API-181 `{enabled: false}` | 1. API-180 2. API-184 3. API-187 4. D23 | 1. `state = DISABLED` 2–3. 409 `BACKUP_DISABLED` "Sao lưu đang tắt. Bật sao lưu rồi thử lại." 4. Nút "Sao lưu ngay", "Tải lại…" khóa, tooltip "Sao lưu đang tắt. Bật sao lưu trước." | |
| TC-02.60 | J-20 sao lưu DB thành công | FR-02.08 a, FR-02.13, AC-49 | Happy | P1 | INT | PRE-15 / PRE-17 MinIO | 1. J-20 2. `mc ls` 3. Tải đối tượng, giải mã bằng K1 | 2. `backup/db/YYYY/MM/DD/aicam-{stamp}.dump.enc` + `backup/imports/{stamp}.tgz.enc` 3. `pg_restore --list` đọc được; `backup_run` `SUCCESS`, `size_bytes`, `key_fingerprint` = K1; `BACKUP_TMP_DIR` rỗng | |
| TC-02.61 | Lịch J-20 6 giờ | FR-02.08 a, NFR-40 | Happy | P2 | UNIT | — | 1. Đọc beat schedule | crontab UTC giờ 18, 0, 6, 12 (= 01:00, 07:00, 13:00, 19:00 VN) | |
| TC-02.62 | J-20 lỗi tạm | 02a §7 J-20 | Negative | P1 | INT | PRE-17, MinIO lỗi lần PUT đầu | 1. J-20 | Celery thử lại (≤ 2 lần, 10 phút) → `SUCCESS`; `consecutive_failures = 0` | |
| TC-02.63 | J-20 lỗi cuối 2 lượt liền | FR-02.15, AC-51, DEC-500 | Negative | P1 | INT | PRE-17, MinIO dừng | 1. J-20 lượt 1 → `FAILED` 2. Lượt 2 → `FAILED` 3. API-180, API-32 (ADMIN) 4. J-26 | 3. `db.consecutive_failures = 2`; `BACKUP_STALE reason = DB_FAILED_TWICE` "⚠ 2 lần sao lưu DB gần nhất không thành công" (dù < 26 giờ) 4. N08 `backup:db2:{run_id lượt 2}` | |
| TC-02.64 | DB > 26 giờ không thành công | FR-02.15, AC-51 | Boundary | P1 | INT | PRE-17, lần thành công cuối `t0` | 1. `advance(25 giờ 59 phút)` → API-180 2. `advance(2 phút)` → API-180, API-32 | 1. `late = false` 2. `late = true`; `BACKUP_STALE reason = DB_LATE`, `hours = 26` | |
| TC-02.65 | Sao lưu ngay + đang chạy | FR-02.15, API-184 | Happy | P1 | API | PRE-15 | 1. API-184 2. Gọi lại ngay | 1. 202 `{run_id}`; audit `BACKUP_RUN_NOW` 2. 409 `BACKUP_RUNNING`; D23 Toast "Đang sao lưu, thử lại sau." | |
| TC-02.66 | Lượt DB treo > 2 giờ | DEC-500 | State | P2 | INT | PRE-17, `backup_run RUNNING` `started_at = now − 3 giờ` | 1. API-184 | Lượt cũ `FAILED` `error = STALE_RUNNING`; lượt mới tạo, 202 | |
| TC-02.67 | Chỉ bằng chứng cần giữ lên cloud ≤ 1 giờ | FR-02.08 b, BR-33, AC-49 | Happy | P1 | INT | PRE-17, 10:00 tạo hồ sơ hàng hoàn cho kiện có 2 clip PACK + 1 ảnh; có thêm clip PACK kiện khác không thuộc BR-33 + video thô | 1. Chạy J-21 → J-22 theo lịch tới 11:00 2. `mc ls backup/evidence/` | 2 clip + 1 ảnh có `backup/evidence/{clips,snapshots}/{id}.enc` trước 11:00, metadata `sha256`, `relpath`, `kind`, `id`, `key-fp`; clip ngoài BR-33 và video thô **không** có | |
| TC-02.68 | Hồ sơ khiếu nại chưa đóng tải trước | 02a §7 J-21 | Happy | P3 | INT | PRE-17, 20 đối tượng chờ, 5 thuộc KN mở | 1. J-22 lô 20 | 5 đối tượng KN `UPLOADED` trước | |
| TC-02.69 | Lệch mã băm | EX-K6, FR-02.15 | Negative | P1 | INT | PRE-17, sửa 1 byte tệp clip trước J-22 | 1. J-22 2. API-185 `kind=HASH_MISMATCH` 3. API-32, J-26 | 1. `HASH_MISMATCH`, `sha256_actual` ≠ `clip.sha256`; không tải 2. 1 item `sha256_expected`, `sha256_actual` 3. `BACKUP_STALE reason = HASH_MISMATCH` "1 tệp lệch mã băm"; N08 `backup:hash:{object}` | |
| TC-02.70 | "Vẫn sao lưu bản hiện có" | EX-K6, DEC-496 | Happy | P1 | API | Sau TC-02.69 | 1. API-188 `{action: UPLOAD_ANYWAY, note: "Tệp do IT sửa, giữ bản hiện có"}` 2. J-22 3. HEAD đối tượng | 1. 200, `PENDING` `hash_override = true`; audit `BACKUP_ISSUE_RESOLVE` 2. `UPLOADED` 3. Metadata `sha256` = băm thực tế, `sha256-expected`, `integrity=MISMATCH_ACCEPTED`; rời D2 | |
| TC-02.71 | "Bỏ qua" tệp lệch mã băm | EX-K6 | Happy | P1 | API | Đối tượng `HASH_MISMATCH` khác | 1. API-188 `IGNORE` + ghi chú | `IGNORED` (cuối); không tính `pending`; rời D2; API-185 mặc định không còn, `include_resolved=true` có kèm `resolution` | |
| TC-02.72 | API-188 lỗi | API-188 | Negative | P1 | API | PRE-15 | 1. `RETRY` cho `HASH_MISMATCH` 2. Xử lý lại đối tượng đã `IGNORED` 3. `note` "abc" 4. `object_id` không có | 1. 409 `BACKUP_ISSUE_ACTION_INVALID` 2. 409 `BACKUP_ISSUE_RESOLVED` 3. 422 `fields.note = "Nhập lý do (5–500 ký tự)."` 4. 404 | |
| TC-02.73 | Mất mạng → hàng chờ → tự tải | EX-K3, AC-51, NFR-09 | State | P1 | INT | PRE-17, 3 đối tượng `PENDING`; chặn MinIO 2 giờ (đồng hồ giả) | 1. J-22 mỗi 5 phút 2. API-180 3. Mở lại MinIO → J-22 | 1. `FAILED`, `next_attempt_at` +5, +15, +60, rồi mỗi 60 phút 2. `pending` / `failed` đếm đúng; D23 "đang chờ" 3. Cả 3 `UPLOADED`; API-11 quét trong lúc chặn vẫn ≤ 1 giây | |
| TC-02.74 | Bằng chứng chờ > 24 giờ | FR-02.15, AC-51 | Negative | P1 | INT | PRE-17, đối tượng chờ từ `t0` | 1. `advance(24 giờ 1 phút)` 2. API-32, J-26 | `evidence.late_count = 1`; `BACKUP_STALE reason = EVIDENCE_LATE` "1 tệp chờ quá 24 giờ"; N08 `backup:ev:{date}` | |
| TC-02.75 | Lease khi worker chết giữa lúc tải | 02a §6, G2-5 | State | P1 | INT | PRE-17, J-22 đang `UPLOADING` | 1. Giết worker 2. `advance(BACKUP_UPLOAD_BUDGET_S + 61 giây)` → J-22 | Dòng `FAILED` `last_error = LEASE_EXPIRED`, `attempts + 1`; lượt sau `UPLOADED`; log `backup_lease_expired` | |
| TC-02.76 | Nguồn bị retention xóa trước khi tải | 02a §6, EX-K9 phân biệt | State | P1 | INT | PRE-17, đối tượng `PENDING`, clip bị J-02 xóa (`DELETED`) | 1. J-22 2. API-180 | `SOURCE_DELETED` (cuối, không thử lại); không tính `pending`; `evidence.source_deleted = 1` | |
| TC-02.77 | Không thấy tệp tại kho (nguồn còn hạn) | EX-K9, FR-02.15, DEC-517 | Negative | P1 | INT + E2E | PRE-17, clip `READY`, xóa tay tệp trên đĩa | 1. J-22 2. API-185 `kind=SOURCE_MISSING` 3. API-32, J-26 4. D23 | 1. `FAILED`, `last_error = SOURCE_MISSING` (không `SOURCE_DELETED`) 2. Có ngay từ lần đầu 3. `BACKUP_STALE reason = SOURCE_MISSING` "1 tệp bằng chứng không thấy tại kho"; N08 `backup:srcmiss:{object}` một lần 4. `SourceMissingAlert` + [Thử lại ngay] [Bỏ qua] | |
| TC-02.78 | Thử lại ngay sau khi chép lại tệp | EX-K9 | Happy | P1 | API | Sau TC-02.77, IT chép lại đúng tệp | 1. API-188 `{action: RETRY, note: "IT đã chép lại tệp"}` 2. J-22 | 1. `attempts = 0`, `next_attempt_at = now` 2. `UPLOADED` | |
| TC-02.79 | 4 lần liền không thấy tệp → "Thiếu tệp"; có lại → bình thường | EX-K9 v0.5, DEC-530 | State | P1 | INT | PRE-17, clip `READY` mất tệp tại `t0` | 1. J-22 ở `t0`, +5, +20 phút 2. +80 phút 3. Chép lại tệp đúng băm → J-22 lượt sau | 1. Clip vẫn `READY` 2. Clip `MISSING`, audit `MEDIA_MARK_MISSING {cause: SOURCE_MISSING}`; vẫn thử mỗi giờ 3. Clip `READY`, audit `MEDIA_MISSING_RECOVERED`; đối tượng `UPLOADED` | |
| TC-02.80 | Bỏ qua tệp không thấy tại kho | EX-K9 v0.5 | State | P1 | API | Đối tượng `FAILED SOURCE_MISSING` | 1. API-188 `UPLOAD_ANYWAY` 2. Chép lại tệp → API-188 `IGNORE` 3. Xóa tệp → API-188 `IGNORE` + ghi chú | 1. 409 `BACKUP_ISSUE_ACTION_INVALID` 2. 409 `BACKUP_ISSUE_ACTION_INVALID` "Tệp đã có lại tại kho — bấm Thử lại ngay." 3. `IGNORED`; clip `MISSING` ngay; audit `BACKUP_ISSUE_RESOLVE` + `MEDIA_MARK_MISSING {cause: BACKUP_IGNORE}` | |
| TC-02.81 | Tệp có lại nhưng lệch băm | DEC-530 | State | P2 | INT | Clip `MISSING`, đặt lại tệp khác băm | 1. J-22 2. API-188 `UPLOAD_ANYWAY` → J-22 | 1. `HASH_MISMATCH`, clip giữ `MISSING` 2. Clip `READY`, `clip.sha256` giữ giá trị gốc | |
| TC-02.82 | Giới hạn tốc độ tải lên | NFR-44, 02a §7.3 | NFR | P2 | INT | PRE-17 MinIO, `upload_mbps = 10`, tệp 200 MB | 1. J-22 tải, đo thời gian | Tốc độ trung bình ≤ 11 Mbit/s (10 + 10 %); job link `priority` bỏ chờ khi bucket còn ≥ 50 % | |
| TC-02.83 | Sao lưu mọi clip đóng gói (tùy chọn) | FR-02.18 | Happy | P3 | INT + E2E | PRE-15 | 1. D23 bật công tắc 2. J-21 | 1. Hiện ước tính "{x} GB / ngày" (`all_pack_clips_estimate_gb_per_day`) 2. Clip PACK `COMPLETED` vào hàng chờ `reason = ALL_PACK` | |
| TC-02.84 | Retention xóa tại kho → xóa trên cloud ≤ 24 giờ | FR-02.14, BR-33, AC-51 | State | P1 | INT | PRE-17, clip `UPLOADED` hết hạn giữ | 1. J-02 02:00 (audit `DELETE_CLIP RETENTION`) 2. J-23 03:00 3. `mc ls --versions` | 2. `CLOUD_DELETED`, `cloud_present = false`, `cloud_key_fingerprint = null` 3. Delete marker (bản cũ còn tới lifecycle 7 ngày) | |
| TC-02.85 | Clip `MISSING` không bị xóa trên cloud | DEC-499, FR-02.14 | Negative | P1 | INT | Clip `MISSING`, đối tượng `cloud_present` | 1. J-23 | Không xóa đối tượng | |
| TC-02.86 | Chính sách giữ bản DB + luôn ≥ 3 bản | FR-02.14, AC-51, DEC-505 | Boundary | P1 | INT | PRE-17: (a) 60 bản DB 2 tháng; (b) 3 bản `SUCCESS` đều > 40 ngày, sau đó toàn `FAILED` | 1. J-23 (a) 2. J-23 (b) | 1. Giữ bản < 30 ngày + bản sớm nhất ngày 1 mỗi tháng; còn lại `cloud_deleted_at` 2. 3 bản `SUCCESS` mới nhất vẫn còn | |
| TC-02.87 | J-23 dừng khi schema lệch | 02a §7 J-23 | Negative | P2 | INT | PRE-17, `schema_guard.matches()` = false | 1. J-23 | Log `backup_prune_skipped_schema_mismatch`; không xóa gì | |
| TC-02.88 | J-23 không chạy khi chờ kiểm khôi phục | DEC-499 | Negative | P2 | INT | `backup_restore_pending = true` | 1. J-23 | Không xóa gì | |
| TC-02.89 | J-23 bỏ qua dòng đang tải | 02a §6 | Negative | P3 | INT | Dòng `UPLOADING` có nguồn bị retention xóa | 1. J-23 | Bỏ qua lượt này; lượt sau xử lý | |
| TC-02.90 | Đổi khóa K1 → K2 | EX-K7, FR-02.17, AC-49 | State | P1 | INT + E2E | PRE-15, đã có 5 clip + 2 bản DB bằng K1 | 1. `aicam backup-keygen` → K2 vào `BACKUP_ENCRYPTION_KEY`, K1 vào `BACKUP_OLD_KEYS`, khởi động lại 2. API-180, D23 3. J-22 4. API-182 K2 5. API-180, D23 | 2. `state = KEY_CHANGED`, banner đỏ 3. Không tải 4. `state = ON`, audit `previous_fingerprint` = K1 5. `old_keys = [{fingerprint: K1, evidence_objects: 5, db_runs: 2, reuploadable: 5}]`; Alert "5 tệp bằng chứng và 2 bản DB mã hóa bằng khóa {K1} — giữ khóa cũ để khôi phục được các bản này." + nút "Tải lại bằng chứng bằng khóa mới" | |
| TC-02.91 | Tải lại bằng chứng bằng khóa mới | EX-K7, AC-49, DEC-522 | Happy | P1 | INT | Sau TC-02.90 | 1. API-187 2. API-180 ngay 3. J-22 4. API-180 5. API-187 lần 2 | 1. 202 `{queued: 5, bytes}`; audit `BACKUP_REUPLOAD_OLD_KEY` 2. `old_keys[0].evidence_objects` vẫn 5 3. Đè cùng `object_key`; `cloud_key_fingerprint` = K2 4. `old_keys` còn `db_runs: 2`, `evidence_objects: 0` 5. 202 `{queued: 0}` | |
| TC-02.92 | Tải lại khi khóa chưa xác nhận / chờ kiểm khôi phục | API-187 | Negative | P2 | API | (a) `KEY_UNCONFIRMED` (b) `RESTORE_PENDING` | 1. API-187 | (a) 409 `BACKUP_KEY_UNCONFIRMED` (b) 409 `BACKUP_RESTORE_UNVERIFIED` | |
| TC-02.93 | Nguồn bị retention xóa khi đang chờ tải lại | DEC-522 | State | P2 | INT | Sau API-187, dòng `PENDING` `cloud_present = true` | 1. J-02 xóa clip 2. J-23 | Bản cloud bị xóa, `cloud_present = false`, `CLOUD_DELETED` | |
| TC-02.94 | Sức khỏe D8 dòng "Sao lưu cloud" | FR-02.15, API-81 | Happy | P2 | API + E2E | PRE-15 | 1. API-81 bằng ADMIN, SUPERVISOR 2. D8 cả hai vai 3. TC-02.64 bước 2 → D8 | 1. `backup {state, last_db_success_at, pending, late}` 2. ADMIN "OK" + link D23; SUPERVISOR "OK" không link 3. "Trễ" | |
| TC-02.95 | D23 thông tin + lịch sử 14 ngày | FR-02.15 | Happy | P2 | E2E | PRE-15, 16 ngày dữ liệu `backup_run` | 1. D23 | Lần thành công gần nhất + kích thước, số đã sao lưu / đang chờ, dung lượng cloud, lỗi gần nhất, lịch sử 14 ngày mới nhất trước, cột dấu vân tay rút gọn | |
| TC-02.96 | Kho lưu từ chối khi tải (sai khóa / đầy) | EX-K4 | Negative | P2 | INT | PRE-17, MinIO trả `AccessDenied` khi PUT | 1. J-22 2. API-180 | `FAILED`, thử lại theo giãn cách; `last_error {code, message, at}` hiện ở D23 | |

### KR — Khôi phục từ cloud (dòng lệnh, diễn tập AC-50)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-KR.01 | Diễn tập khôi phục đầy đủ trên máy trống | FR-02.16, UC-21, NFR-40, AC-50 | Happy | P1 | CLI | VM / máy dev trống cài sẵn hệ thống (DB trống), MinIO có bản từ PRE-15 (2 KN mở, 1 KN đóng), K1 | 1. Bấm giờ `aicam backup-restore --db latest --evidence --claims-first` 2. `aicam backup-verify` 3. API-180 4. D23 bật lại | 1. DB sẵn sàng ≤ 60 phút (máy dev); bằng chứng KN mở tải trước; mã 0; in `tải N / thiếu 0 / ngoài DB 0 / giải mã lỗi 0 / thiếu khóa 0` 2. `khớp N / lệch đã chấp nhận 0 / lệch 0 / thiếu đã ghi nhận 0 / thiếu 0` → mã 0; audit `BACKUP_RESTORE_VERIFIED` 3. Trước bước 2: `state = RESTORE_PENDING`; sau: hết 4. `state = ON` | |
| TC-KR.02 | Khóa sai | EX-K5, AC-50 | Negative | P1 | CLI | Như TC-KR.01 nhưng chỉ đưa K2 cho dump K1 | 1. `backup-restore --db latest` | "Khóa giải mã không khớp (dấu vân tay {K1})"; mã 2; DB đích không đổi | |
| TC-KR.03 | Bản mã hóa bằng 2 khóa | EX-K7, AC-50, DEC-495 | Happy | P1 | CLI | Bản cloud trộn K1 / K2 (sau TC-02.90, trước TC-02.91) | 1. Restore với `BACKUP_ENCRYPTION_KEY=K2`, `BACKUP_OLD_KEYS=K1` | Mọi đối tượng giải mã đúng khóa theo header; verify đạt | |
| TC-KR.04 | Một clip bị xóa trên cloud trước khi khôi phục | EX-K8, AC-50 | Negative | P1 | CLI | Xóa 1 đối tượng clip trên MinIO | 1. Restore `--evidence` 2. API-31 kiện đó 3. J-23 | 1. Clip đó `MISSING`; các đối tượng khác còn nguyên trên cloud 2. Clip `MISSING`, `MissingMediaBlock` 3. Không chạy (`RESTORE_PENDING`) | |
| TC-KR.05 | Đối tượng hỏng giữa chừng | EX-K8, DEC-518, AC-50 | Negative | P1 | CLI | Sửa 1 byte 1 đối tượng clip trên MinIO | 1. Restore `--evidence` 2. Kiểm đĩa | 1. Chạy hết đối tượng còn lại; `restore-failures-{stamp}.csv` 1 dòng `reason = DECRYPT_FAILED`; clip `MISSING`; mã 3 2. Không có tệp dở ở `relpath` | |
| TC-KR.06 | Thiếu khóa cũ rồi bổ sung | EX-K8, AC-50 | State | P1 | CLI | Bản cloud có đối tượng K1; restore chỉ với K2 | 1. Restore `--evidence` 2. `backup-restore --evidence-only --key-file k1.txt` | 1. Đối tượng K1 → `UNKNOWN_KEY` trong CSV, clip `MISSING`, mã 3 2. Clip về `READY`, SHA-256 khớp | |
| TC-KR.07 | Tệp "lệch đã chấp nhận" không làm trượt | EX-K8, AC-50 | Happy | P1 | CLI | Trước sao lưu: 1 tệp `UPLOAD_ANYWAY` (TC-02.70) | 1. Restore 2. `backup-verify` | `backup_object.hash_override = true` từ metadata; verify "lệch đã chấp nhận 1", đạt, mã 0 | |
| TC-KR.08 | Chấp nhận lệch / thiếu có lý do | EX-K8, DEC-518, AC-50 | State | P1 | CLI | Sau TC-KR.01, sửa 1 tệp trên đĩa | 1. `backup-verify` 2. `backup-verify --accept <clip_id> --reason "Tệp sửa khi kiểm, chấp nhận"` | 1. Mã 1, "lệch 1", `verify-{stamp}.csv` 2. Audit `BACKUP_VERIFY_ACCEPT`; kiểm lại đạt, mã 0; `RESTORE_PENDING` hết | |
| TC-KR.09 | `--accept` thiếu lý do | DEC-518 | Negative | P2 | CLI | Như TC-KR.08 | 1. `--accept <id>` không `--reason` 2. `--reason "abc"` | Từ chối, không ghi gì | |
| TC-KR.10 | DB đích không trống | API-186 | Negative | P2 | CLI | DB có dữ liệu | 1. `backup-restore --db latest` 2. thêm `--force` | 1. Từ chối 2. Chạy | |
| TC-KR.11 | Chờ kiểm khôi phục khóa bật sao lưu | DEC-499, EX-K8 | Negative | P1 | API + E2E | Sau restore, trước verify | 1. API-181 `{enabled: true}` 2. API-184 3. D23 | 1–2. 409 `BACKUP_RESTORE_UNVERIFIED` 3. Banner "Hệ thống vừa được khôi phục. Sao lưu tạm dừng tới khi IT chạy lệnh kiểm khôi phục đạt."; nút bật / Sao lưu ngay / Tải lại khóa | |
| TC-KR.12 | Đối tượng cloud không có trong DB | API-186 | Happy | P3 | CLI | Bằng chứng tải lên sau bản dump | 1. Restore `--evidence` | Vẫn tải về `relpath`; in "không có trong DB" | |
| TC-KR.13 | Runbook liệt kê đủ bí mật | FR-02.16, AC-50 | Happy | P2 | MAN | `ai-cam-be/docs/ops.md` §6.2 | 1. Đối chiếu danh sách 02 API-186 | Có đủ: khóa sao lưu hiện tại + cũ, `FERNET_KEY`, `S3_*` 5 biến, `JWT_SECRET`, `MEDIA_SIGNING_KEY`, `POSTGRES_PASSWORD`, khóa Shopee, TikTok, Telegram, Zalo, `SITE_ADDRESS`, `LAN_IP` | |
| TC-KR.14 | Kiểm từ cloud | API-186 | Happy | P3 | CLI | PRE-15 | 1. `backup-verify --from-cloud` | Kiểm bản cloud, in số khớp | |

### MS — Clip / ảnh "Thiếu tệp" (`MISSING`) ở mọi điểm đọc

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-MS.01 | Phát clip `MISSING` | EX-K8, DEC-520, API-40 / 41 | Negative | P1 | API + E2E | Clip Cam 1 kiện `SPXTST0000041` `MISSING` (đặt bằng TC-02.80) | 1. API-40, API-41 2. D4, D17 | 1. 409 `CLIP_NOT_READY`, `details.status = "MISSING"`, `message` "Thiếu tệp clip trên máy chủ — không phát được." 2. `MissingMediaBlock` xám thay player, chip "Thiếu tệp" (không "(khôi phục)") | |
| TC-MS.02 | Giữ / xuất clip `MISSING` | API-42, 43 | Negative | P2 | API | Như TC-MS.01 | 1. API-42 2. API-43 | 409 `CLIP_NOT_READY` `details.status = MISSING` cả hai; D4 ẩn "Xuất" | |
| TC-MS.03 | Cắt lại clip `MISSING` | API-46 | Negative | P1 | API + E2E | Như TC-MS.01 | 1. API-46 2. D4 | 1. 409 `CLIP_NOT_FAILED` `details.status = MISSING` "Clip thiếu tệp trên máy chủ — không cắt lại được." 2. Không có nút "Cắt lại" | |
| TC-MS.04 | J-01 không cắt lại đè | DEC-520, 02a §5.2 #3 | Negative | P1 | INT | Clip `MISSING` | 1. J-01 phiên đó | Clip giữ `MISSING`, không tạo tệp mới | |
| TC-MS.05 | J-11 không đẩy phiên chỉ có `MISSING` | 02a §5.2 #4 | Negative | P2 | INT | Như TC-MS.04 | 1. J-11 | Không xếp J-01 | |
| TC-MS.06 | Gói bằng chứng với clip / ảnh `MISSING` | 02a §5.2 #9, J-16 | Negative | P1 | API | KN có 1 clip + 1 ảnh `MISSING` | 1. API-136 → tải zip | `info.json` thiếu `CLIP_MISSING`; README ghi "Thiếu tệp"; ảnh `MISSING` bỏ + ghi thiếu; gói vẫn tạo | |
| TC-MS.07 | Link chia sẻ với Cam 1 `MISSING` | 02a §5.2 #10 | Negative | P1 | API + E2E | Như TC-MS.01 | 1. API-164 hồ sơ đó 2. API-160 chọn phiên đó 3. ShareLinkDialog | 1. Phiên `selectable = false`, `unavailable_reason = CLIP_MISSING` 2. 409 `SESSION_CLIP_UNAVAILABLE` `reason = CLIP_MISSING` 3. Hàng xám "Clip thiếu tệp" | |
| TC-MS.08 | API trả `MISSING` không lỗi 500 | 02a §5.2 #2 | Regression | P1 | API | Clip + ảnh `MISSING` | 1. API-31 2. API-132 | 200; `snapshots[].status = MISSING`, `url = null`, `protection = null` | |
| TC-MS.09 | J-02 / J-23 bỏ qua `MISSING` | 02a §5.2 #12 | Negative | P2 | INT | Clip `MISSING` quá hạn giữ | 1. J-02 2. J-23 | Dòng giữ `MISSING`; bản cloud không bị xóa | |
| TC-MS.10 | D2 `CLIP_FAILED` không đếm `MISSING` | 02a §5.2 #13 | Negative | P3 | API | 1 clip `MISSING`, 0 `FAILED` | 1. API-32 | Không có mục `CLIP_FAILED` | |

### M07 — Tra cứu theo sàn / shop, link chia sẻ, W1

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-07.40 | D3 lọc sàn + shop | FR-07.01, AC-62, AC-40 | Happy | P1 | API + E2E | PRE-14 + PRE-3 | 1. D3 Sàn "TikTok Shop", Shop "TST TikTok A (mock)" 2. API-30 `platform=TIKTOK&shop_id=<A>` | Chỉ kiện shop A; cột / chip sàn; URL giữ `platform`, `shop` | |
| TC-07.41 | D14 / D15 / D16 lọc sàn + shop | FR-07.01, AC-62 | Happy | P1 | API | PRE-14 | 1. API-110, API-120, API-130 `platform=SHOPEE&shop_id=<990002>` | Chỉ mục shop `990002`; item có `platform`, `shop {id, name}` | |
| TC-07.42 | Shop không thuộc sàn | 02 §6 quy ước | Negative | P2 | API | PRE-14 | 1. API-30 `platform=SHOPEE&shop_id=<A TikTok>` | 200 danh sách rỗng (không lỗi) | |
| TC-07.43 | Nhiều trạng thái phiên | API-30, DEC-488 | Boundary | P3 | API | PRE-14 | 1. `session_status=CANCELLED,ABANDONED` 2. 5 giá trị | 1. 200 đúng 2. 422 | |
| TC-07.44 | Ô tìm mã trùng | 02a §5.1 #14 | Happy | P2 | API | PRE-14 | 1. API-30, API-110, API-130 `q=2410DUP00001` | Mỗi API trả mọi kết quả khớp, item có `shop` để phân biệt | |
| TC-07.45 | Tạo link từ hồ sơ khiếu nại | FR-07.05, UC-16, AC-52 | Happy | P1 | E2E | PRE-15 + PRE-3 (`tst_cskh`), KN có 3 phiên có clip + 5 ảnh | 1. D17 "Tạo link chia sẻ" 2. Chọn 3 phiên, "Ghép Cam 1 + Cam 2", "Kèm ảnh (5)", "Gửi cho" = "CSKH Shopee - ticket 8812", hạn 3 ngày → "Tạo link" 3. Bấm giờ tới "Link đã sẵn sàng" 4. "Sao chép" | 1. Mặc định chọn = bằng chứng chính; hạn mặc định 7 2. API-160 202 `CREATING`; tiến độ `role="progressbar"` qua WS + poll 3. ≤ 3 phút; ô link `readonly`, hạn, gửi cho 4. Clipboard có URL; `aria-live` báo; audit `SHARE_CREATE {recipient, source, session_count: 3, expires_days: 3}` không có URL | |
| TC-07.46 | Tạo link từ một phiên (D4) | FR-07.05 | Happy | P1 | API | PRE-15, phiên PACK có clip | 1. API-164 `session_id` 2. API-160 nguồn `SESSION` 3. Poll API-162 | `ACTIVE`, `source.type = SESSION`, `session_count = 1` | |
| TC-07.47 | Phiên chưa có clip không chọn được | EX-S3 | Negative | P1 | API + E2E | KN có phiên clip `PENDING`, `FAILED`, `DELETED` | 1. API-164 2. Dialog | `selectable = false` + chú thích "Chưa có clip" / "Clip lỗi" / "Clip đã bị xóa ngày dd/mm/yyyy" | |
| TC-07.48 | Validate tạo link | BR-35, FR-07.05, AC-53 | Negative | P1 | API | PRE-15 | 1. 0 phiên 2. 5 phiên 3. 4 phiên tổng 31 phút 4. Phiên của hồ sơ khác 5. `recipient` "AB" 6. `expires_days` 5 | 422: 1. `fields.session_ids` "Chọn ít nhất 1 phiên." 2. "Chọn tối đa 4 phiên." 3. "Tổng thời lượng tối đa 30 phút." 4. "Phiên không thuộc hồ sơ này." 5. `fields.recipient` "Ghi rõ gửi cho ai (3–100 ký tự)." 6. `fields.expires_days` | |
| TC-07.49 | Biên tạo link | BR-35 | Boundary | P2 | API | PRE-15 | 1. 4 phiên tổng 30:00 2. `recipient` 3 ký tự, 100 ký tự 3. 101 ký tự 4. 21 ảnh chọn | 1–2. 202 3. 422 4. Link có ≤ 20 ảnh | |
| TC-07.50 | Phiên vừa mất clip khi tạo | API-160 | Negative | P2 | API + E2E | Mở dialog rồi đặt Cam 1 phiên đó `DELETED` | 1. "Tạo link" | 409 `SESSION_CLIP_UNAVAILABLE` `details {session_id, reason}`; Toast `message`; refetch API-164, hàng xám | |
| TC-07.51 | Chưa cấu hình kho lưu → khóa tạo link | EX-S1 | Negative | P1 | API + E2E | PRE-13 `S3_ENDPOINT` rỗng | 1. API-160 2. D17 | 1. 503 `CLOUD_NOT_CONFIGURED` 2. Nút "Tạo link chia sẻ" khóa, chú thích "Chưa cấu hình kho lưu cloud. Admin: Cài đặt → Sao lưu." | |
| TC-07.52 | Mất mạng khi tạo link | EX-S2, J-24 | Negative | P1 | INT + E2E | PRE-17, bucket link không tới được | 1. API-160 → J-24 2. Dialog | `FAILED` `error = UPLOAD_FAILED`; đối tượng đã tải bị xóa; Alert "Không tải được lên kho lưu cloud. Kiểm tra Internet rồi bấm Thử lại." + Thử lại | |
| TC-07.53 | Dựng video lỗi / quá giờ | J-24 | Negative | P2 | INT | PRE-17, FFmpeg lỗi; lần 2 ngân sách 600 giây vượt | 1. J-24 | `FAILED` `RENDER_FAILED` ("Không dựng được video. Bấm Thử lại; nếu vẫn lỗi, báo Admin kèm mã hồ sơ.") / `TIMEOUT` | |
| TC-07.54 | Link treo `CREATING` > 15 phút | J-25 | State | P3 | INT | `CREATING` `job_started_at = now − 16 phút` | 1. J-25 | `FAILED` | |
| TC-07.55 | Ảnh `MISSING` / quá 20 ảnh | BR-35, 02a §5.2 #10 | Negative | P2 | INT | Phiên có 22 ảnh `READY` + 1 `MISSING` | 1. API-164 2. J-24 | `snapshot_count` = 22 (không đếm `MISSING`); link có 20 ảnh | |
| TC-07.56 | Đóng dialog khi đang tạo | DEC-487 | Happy | P2 | E2E | `pnpm dev:mock` | 1. "Tạo link" → đóng dialog | Tiếp tục nền; Toast khi `ACTIVE` | |
| TC-07.57 | W1 đúng nội dung (whitelist) | FR-07.07, AC-53, NFR-45 | Happy | P1 | INT + MAN | Sau TC-07.45 | 1. Tải `index.html` 2. Mở bằng trình duyệt | Có: video + "Tải video" từng phiên, ảnh đã chọn, mã vận đơn, mã đơn sàn, sàn, loại phiên, thời gian, station, tên người kiểm + kết luận (phiên hoàn), SHA-256 clip gốc + video chia sẻ, hạn link. Không có: "CSKH Shopee - ticket 8812", tên người tạo, ghi chú nội bộ, người phụ trách, số tiền, tên shop, dữ liệu kiện khác | |
| TC-07.58 | W1 an toàn | NFR-42, DEC-506 | Happy | P1 | UNIT + INT | — | 1. `test_w1_render` 2. HEAD `index.html` | 1. Có `<meta http-equiv="Content-Security-Policy" …>` + `<meta name="referrer" content="no-referrer">`; không `<script`; mọi `src` / `href` cùng origin; giá trị đã `html.escape` (thử ghi chú `<script>`) 2. `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store` | |
| TC-07.59 | Mở link ngoài dashboard, phát / tải video | FR-07.07, UC-17, AC-52 | Happy | P1 | MAN | Sau TC-07.45, máy khác cùng LAN không đăng nhập, `S3_PUBLIC_ENDPOINT` = LAN IP | 1. Mở URL 2. Phát video 3. "Tải video" | 2. Phát được 3. Tải `phien-1.mp4` (`Content-Disposition: attachment`) — điện thoại thật: TC-X3.10 | |
| TC-07.60 | Thu hồi → link chết ≤ 60 giây | FR-07.08, AC-52, UC-16 | Happy | P1 | INT + E2E | Sau TC-07.45 | 1. D21 "Thu hồi" → xác nhận, bấm giờ 2. GET URL lặp mỗi 5 giây | 1. API-163 200 `REVOKED`; audit `SHARE_REVOKE` 2. ≤ 60 giây: 403 / 404 `NoSuchKey`; `share/{token}/` rỗng (không phiên bản) | |
| TC-07.61 | Thu hồi link không còn hoạt động | API-163 | Negative | P2 | API | Link `REVOKED`, `EXPIRED`, `FAILED` | 1. API-163 mỗi link | 409 `SHARE_NOT_ACTIVE` | |
| TC-07.62 | CSKH chỉ thu hồi link mình tạo | FR-07.08, §5.10, AC-52 | Permission | P1 | API + E2E | PRE-19: link L1 của `tst_cskh`, L2 của `tst_cskh2` | 1. `tst_cskh` API-163 L2 2. API-163 L1 3. D21 | 1. 403 `FORBIDDEN` 2. 200 3. L2 `can_revoke = false`, không có nút | |
| TC-07.63 | Hết hạn → file xóa ≤ 1 giờ | BR-34, FR-07.08, AC-52 | State | P1 | INT | Link tạo 06/10 10:00 hạn 3 ngày | 1. `advance` tới 09/10 10:00 → J-25 2. GET URL 3. `mc ls` | 1. `EXPIRED`; audit `SHARE_EXPIRE` (người dùng null) 2. Không mở được (URL ký hết hạn) 3. Đối tượng mất trước 09/10 11:00 | |
| TC-07.64 | Hạn URL ký | BR-34 | Boundary | P2 | UNIT | — | 1. `expires_days = 7` | `ExpiresIn` = giây tới `expires_at` ≤ 604.800 | |
| TC-07.65 | Thu hồi khi kho mất Internet | EX-S7, DEC-442 | State | P1 | INT + E2E | PRE-17, chặn MinIO | 1. Thu hồi 2. D21, D17 3. Mở lại MinIO, J-25 mỗi 60 giây | 1. `REVOKED` ngay, `revoke_pending = true` 2. "Đang thu hồi — chờ Internet" 3. Xóa xong, `cloud_deleted_at`, chip mất | |
| TC-07.66 | Thu hồi khi đang dựng | 02a §6 | State | P2 | INT | J-24 đang chạy | 1. API-163 | J-24 không công bố; đối tượng đã tải bị xóa; trạng thái `REVOKED` | |
| TC-07.67 | Hồ sơ đóng khi link còn hạn | EX-S5 | State | P2 | API | Link `ACTIVE` của KN | 1. Đóng KN 2. API-132 3. API-163 | Link vẫn `ACTIVE`, có trong `shares[]`; thu hồi được | |
| TC-07.68 | Retention xóa clip gốc khi link còn hạn | EX-S6 | State | P2 | INT | Link `ACTIVE` | 1. J-02 xóa clip gốc 2. GET URL video | Video link vẫn phát (bản dựng riêng) | |
| TC-07.69 | D21 danh sách link | FR-07.09 | Happy | P1 | E2E | PRE-15, 4 link các trạng thái | 1. D21 2. Tab "Đang hoạt động" 3. Tìm mã hồ sơ 4. "Của tôi" | Tab có số đếm; cột tạo lúc, người tạo, gửi cho, kiện / hồ sơ, số phiên, hạn, trạng thái; **không** hiện chuỗi URL (chỉ "Sao chép") | |
| TC-07.70 | Khối link ở D4 / D17 | FR-07.09 | Happy | P2 | API + E2E | 4 link của 1 hồ sơ (1 `FAILED`) | 1. API-132 `shares[]` 2. D17 `SharesBlock` → "Xem tất cả" | 1. ≤ 3 dòng, không có `FAILED`, `url` chỉ khi `ACTIVE`, `shares_active_count` 2. D21 lọc `claim_id` | |
| TC-07.71 | ShareLinkDialog cảnh báo phiên "Cần soát" / chưa chọn video mở hộp | DEC-531 | Happy | P2 | E2E | KN có phiên `review_needed` + phiên RETURN chọn được | 1. Mở dialog 2. Bỏ chọn mọi phiên RETURN | 1. Phiên "Cần soát" có chip, không chọn sẵn; `ReviewPendingAlert` (`review_pending_count = 1`) 2. `NoOpeningVideoAlert`; nút "Tạo link" vẫn bật | |
| TC-07.72 | Cảnh báo nhãn người mua trong video | NFR-45, RK-20 | Happy | P2 | E2E | ShareLinkDialog | 1. Đọc dialog | Có chữ cảnh báo nhãn vận đơn trên Cam 2 (01 §10.5 ShareLinkDialog) | |
| TC-07.73 | Bucket link không giữ phiên bản | G2-15, DEC-501 | Negative | P2 | INT | MinIO, bucket link | 1. Thu hồi 2. `mc ls --versions share/{token}/` | Không còn phiên bản nào | |

### M06 — Thông báo Telegram / Zalo (cấu hình, J-26, J-27, J-28)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-06.40 | Thêm kênh Telegram | FR-06.04, 06.07, UC-18 | Happy | P1 | E2E | PRE-13 + PRE-3 | 1. D22 "Thêm kênh": tên "Kho", Telegram, Chat ID `-1001234567890`, sự kiện N01, N02, N03, N09 → Lưu | API-171 201; dòng "Kho" `last_status = NEVER`; audit `NOTIFY_CHANNEL_CREATE` | |
| TC-06.41 | Validate kênh | FR-06.04 | Negative | P1 | API | PRE-5 | 1. `name` "K" 2. 41 ký tự 3. Telegram `target` "abc" 4. Zalo `target` "12a" 5. `events: []` 6. `events: ["N11"]` | 422: `fields.name`; `fields.target` "Chat ID là một số (nhóm thường bắt đầu bằng -100)."; Zalo `fields.target`; `fields.events` "Chọn ít nhất 1 sự kiện."; `fields.events` | |
| TC-06.42 | Trùng tên kênh | API-171 | Negative | P2 | API + E2E | Sau TC-06.40 | 1. Thêm "kho" (chữ thường) | 409 `CHANNEL_NAME_EXISTS`; lỗi dưới ô "Đã có kênh tên này." | |
| TC-06.43 | Loại kênh chưa cấu hình | EX-N1 | Negative | P1 | API + E2E | `ZALO_*` rỗng | 1. API-170 2. API-171 `type: ZALO_OA` 3. D22 | 1. `providers` Zalo chưa cấu hình 2. 409 `PROVIDER_NOT_CONFIGURED` 3. Alert "Chưa cấu hình … trên máy chủ. Liên hệ IT."; lựa chọn Zalo khóa | |
| TC-06.44 | Gửi thử thành công ≤ 10 giây | FR-06.10, AC-55 | Happy | P1 | API | PRE-16 | 1. API-174 kênh "Kho" 2. `LRANGE notify:mock:TELEGRAM` | 1. 200 ≤ 10 giây; `last_status = OK`; audit `NOTIFY_TEST` 2. Tin tới `-1001234567890`: "Tin thử từ Hệ thống X — kênh Kho. Bạn sẽ nhận: Camera mất tín hiệu, Lệch trạng thái mức Cao, …" | |
| TC-06.45 | Gửi thử lỗi | EX-N2, API-174 | Negative | P1 | INT + E2E | PRE-17, Telegram giả: (a) 400 "chat not found" (b) treo 15 giây | 1. API-174 (a) 2. (b) 3. D22 | 1. 502 `NOTIFY_SEND_FAILED` "Telegram không nhận Chat ID này. Kiểm tra bot đã vào nhóm.", `details.provider_code` 2. 504 `NOTIFY_TIMEOUT` ≤ 10 giây "Không kết nối được Telegram từ máy chủ (mạng chặn?)." 3. Alert dưới dòng kênh, bấm lại được | |
| TC-06.46 | Sửa / tắt kênh | FR-06.04, 06.07 | Happy | P2 | API | PRE-16 | 1. API-172 "Kho" bỏ N09 2. Sự kiện N09 3. `enabled: false` → sự kiện N01 | 2. Không tin cho "Kho" 3. Không tin; audit `NOTIFY_CHANNEL_UPDATE` | |
| TC-06.47 | Xóa kênh có tin chờ | API-173 | State | P2 | INT | Kênh có 2 tin `QUEUED` | 1. API-173 | Tin `DROPPED`; audit `NOTIFY_CHANNEL_DELETE` | |
| TC-06.48 | Giờ yên lặng | FR-06.08, API-176 | Boundary | P2 | API | PRE-5 | 1. `start = end = 22:00` 2. `start: "25:00"` 3. `22:30–06:30` | 1–2. 422 `fields.start` / `fields.end` 3. 200; audit `NOTIFY_SETTINGS_UPDATE` | |
| TC-06.49 | Nhật ký gửi 30 ngày | FR-06.10, AC-55 | Happy | P2 | API + INT | Tin `SENT`, `RETRYING`, `DROPPED`, 1 tin 31 ngày tuổi | 1. API-175 lọc kênh / kết quả 2. J-11 | 1. Có thời điểm, kênh, sự kiện, số mục gom, kết quả, lỗi 2. Tin 31 ngày bị xóa | |
| TC-06.50 | N01 camera mất tín hiệu | FR-06.07, AC-54 | Boundary | P1 | INT | PRE-17, 14:00 Cam 2 Station 01 `OFFLINE` | 1. J-26 lúc 14:00:50 2. 14:01:01 3. J-27 sau 2 phút | 1. Không sự kiện 2. Sự kiện N01 `cam:{id}:{last_seen_at}` 3. Kênh "Kho" nhận "Station 01 · Cam 2 · từ 14:00", mức Cao | |
| TC-06.51 | N01 trong giờ yên lặng | DEC-444, Q22 | Negative | P2 | INT | Camera `OFFLINE` lúc 23:00 | 1. J-26 2. Tắt giờ yên lặng → J-26 | 1. Không sự kiện N01 2. Có sự kiện | |
| TC-06.52 | N02 lệch Cao — bỏ trùng | FR-06.07, BR-36 (1), AC-54 | Happy | P1 | INT | Cảnh báo BR-10 `HIGH` `OPEN` | 1. J-26 ba lần 2. J-27 | 1 tin: mã kiện · sàn · shop · từ ngày | |
| TC-06.53 | N03 phiên hoàn hủy / bỏ dở | FR-06.07, BR-39 | Happy | P1 | INT | Phiên RETURN `ABANDONED`; phiên `CANCELLED WRONG_SCAN`; hồ sơ `UNIDENTIFIED` mới | 1. J-26 | N03 cho phiên bỏ dở + hồ sơ chưa xác định; **không** cho phiên quét nhầm | |
| TC-06.54 | N05 hồ sơ sắp hạn / quá hạn | FR-06.07, BR-42 | Boundary | P1 | INT | KN `NEW` hạn `t0` | 1. `t0 − 48 giờ − 1 phút` 2. `t0 − 48 giờ` 3. `t0 + 1 phút` (mỗi mốc J-26) | 1. Không 2. N05 `claim:{id}:soon:{deadline}` 3. N05 `…:overdue:…` | |
| TC-06.55 | N06 shop hết hạn / lỗi > 30 phút | FR-06.07, DEC-467 | Boundary | P1 | INT | Shop A `error_since` = `t0` | 1. J-26 `t0 + 29 phút` 2. `t0 + 31 phút` 3. Shop B `EXPIRED` | 1. Không 2. N06 `shop:{id}:err:{error_since}` 3. N06 `shop:{id}:expired:{at}`; tin "tên shop · sàn · lỗi rút gọn" tới "Quản trị" | |
| TC-06.56 | N07 ổ đầy | FR-06.07 | Boundary | P2 | INT | Ổ giả 79 %, 80 %, 90 % | 1. J-26 mỗi mức 2. J-26 lại cùng ngày | 79 %: không; 80 %: N07 `MEDIUM`; 90 %: N07 `HIGH` "90 %"; cùng ngày không lặp | |
| TC-06.57 | N08 năm lý do | FR-06.07, FR-02.15, §7.5 | Happy | P1 | INT | Đồng thời `DB_LATE`, `DB_FAILED_TWICE`, `EVIDENCE_LATE`, `HASH_MISMATCH`, `SOURCE_MISSING` | 1. J-26 → J-27 | Kênh "Quản trị": mỗi lý do một dòng; 5 `dedupe_key` khác nhau | |
| TC-06.58 | N09 yêu cầu duyệt chờ > 3 phút | FR-06.07 | Boundary | P2 | INT | Yêu cầu `PENDING` từ `t0` | 1. J-26 `t0 + 2 phút 59 giây` 2. `t0 + 3 phút 1 giây` | 1. Không 2. N09 "station · loại · từ" | |
| TC-06.59 | Tóm tắt ngày 18:00 | FR-06.11, AC-55 | Happy | P2 | INT | Dữ liệu ngày: 120 kiện đóng gói, 2 lệch, 5 hoàn nhận (1 có vấn đề), 3 KN mở (1 sắp hạn, 1 quá hạn), 1 Chỉ hoàn tiền chưa xử lý | 1. J-28 lúc 11:00 UTC | Kênh "Chủ shop" 1 tin N10 `summary:{yyyy-mm-dd}` số khớp API-32 cùng giờ | |
| TC-06.60 | Gom 2 phút — bão sự kiện | BR-36 (2), EX-N3, AC-54 | Happy | P1 | INT | 8 camera rớt 14:00:05–14:00:40 | 1. J-26 → J-27 tới 14:03 | 1 tin "8 camera mất tín hiệu: …" ≤ 10 dòng | |
| TC-06.61 | Tin gom > 10 mục | BR-36 (2) | Boundary | P2 | UNIT | 12 mục cùng sự kiện | 1. `notify.render` | 10 dòng + "và 2 mục khác" | |
| TC-06.62 | Trần 30 tin / giờ / kênh | BR-36 (3), AC-54 | Boundary | P1 | INT | 40 sự kiện khác loại / đối tượng trong 1 giờ cho kênh "Kho" | 1. J-26 / J-27 suốt 1 giờ + 1 giờ sau | ≤ 30 tin `SENT` trong 60 phút; phần còn lại `HELD` → **1** tin "Tóm tắt {n} thông báo …" khi có slot; tin gốc `SKIPPED` | |
| TC-06.63 | Giờ yên lặng | BR-36 (4), AC-54 | State | P1 | INT | 23:10 N03 (TB) + N02 (Cao) | 1. J-27 23:12 2. J-27 07:00 | 1. N02 gửi ngay; N03 `HELD` `send_after = 07:00` 2. 1 tin tóm tắt chứa N03 | |
| TC-06.64 | Gửi lỗi tạm → thử lại | FR-06.10, J-27 | Negative | P1 | INT | Telegram giả 500 hai lần rồi 200 | 1. J-27 theo thời gian | `RETRYING` → thử sau 1, 2 phút → `SENT`; `attempts = 3` | |
| TC-06.65 | Lỗi 24 giờ → bị bỏ | FR-06.10, EX-N2, AC-55 | Negative | P1 | INT + E2E | Telegram giả luôn 500 | 1. `advance(24 giờ 1 phút)` với J-27 2. D22 | 1. `DROPPED`; kênh `last_status = ERROR`, `last_error` 2. Dòng kênh "Lỗi gửi lúc HH:MM: …"; nhật ký "Bị bỏ" | |
| TC-06.66 | Mất mạng 2 giờ → không mất tin | NFR-43, AC-54 | State | P1 | INT | 5 sự kiện trong lúc Telegram giả không tới được 2 giờ | 1. Mở lại | Cả 5 sự kiện có trong tin `SENT` sau khi có mạng (gom); không `DROPPED` | |
| TC-06.67 | Telegram 429 `retry_after` | 02a §7.5 | Negative | P2 | INT | Telegram giả 429 `retry_after: 30` | 1. J-27 | Lần sau không sớm hơn 30 giây | |
| TC-06.68 | Sự kiện đã hết trước khi gửi | EX-N4 | Happy | P2 | INT | Camera rớt 10:00, có lại 10:01:30, gửi 10:02 | 1. J-27 | Dòng "Station 01 · Cam 2 · từ 10:00 (đã có lại 10:01)"; không tin "hết" riêng | |
| TC-06.69 | Tin không chứa dữ liệu người mua | FR-06.09, NFR-45, AC-54 | Negative | P1 | INT | 10 sự kiện N01..N10 có đơn với tên / SĐT / địa chỉ người mua, ghi chú người mua, lý do khách viết tay, số tiền | 1. J-26 → J-27 2. Đọc 10 tin | Không tin nào chứa các giá trị đó; chỉ mã kiện / hồ sơ, sàn, shop, giờ, link dashboard | |
| TC-06.70 | Link trong tin mở đúng màn | FR-06.09, AS-16 | Happy | P3 | MAN | Tin N04 | 1. Bấm link trong mạng kho | Mở D14 tab Chỉ hoàn tiền đúng hồ sơ | |
| TC-06.71 | J-26 / J-27 chạy chồng | 02a §6 | NFR | P2 | INT | Giữ khóa `notify:scan` | 1. J-26 lượt 2 | Bỏ lượt; không sự kiện / tin trùng | |
| TC-06.72 | Zalo OA (mock): gửi + làm mới token | FR-06.04, DEC-445 | Happy | P2 | INT | `ZALO_*` có, server Zalo giả | 1. Gửi thử Zalo 2. Token hết hạn → gửi | 1. 200 2. Làm mới dưới khóa `zalo:token`, token mới lưu `notify_provider_token` mã hóa; "người nhận chưa quan tâm OA" → 502 "Người nhận chưa quan tâm OA của shop." | |
| TC-06.73 | Hàng `notify` tuần tự, không chờ sao lưu | NFR-43, DEC-504 | NFR | P2 | INT | J-20 đang chạy 50 phút trên `worker-backup` | 1. Sự kiện N02 | Tin gửi ≤ 3 phút (không chờ J-20) | |
| TC-06.74 | Production cấm `NOTIFY_TRANSPORT=mock` | 02a §9 | Negative | P3 | UNIT | — | 1. Settings production + mock | Lỗi cấu hình | |

### M09 — Báo cáo (D20) và Tổng quan (D2)

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-09.30 | Báo cáo hàng hoàn đúng công thức | FR-09.03, BR-41, AC-46 | Happy | P1 | API | PRE-20 | 1. API-150 `from=2026-09-01&to=2026-09-30` | Tỷ lệ hoàn 4,0 % (40 / 1.000); Chỉ hoàn tiền 0,6 % (6 / 1.000) hiện riêng; tỷ lệ có vấn đề 20,0 % (6 / 30) | |
| TC-09.31 | Bảng lý do × kết luận, top sản phẩm, theo loại / sàn / shop | FR-09.03, AC-46 | Happy | P1 | API | PRE-20 | 1. API-150 | Bảng lý do khách × kết luận kho, top 20 sản phẩm bị trả, theo loại hồ sơ, theo sàn / shop khớp dữ liệu fixture (đếm tay SQL) | |
| TC-09.32 | Lọc sàn / shop báo cáo | FR-09.05, AC-46 | Happy | P1 | API | PRE-20 + dữ liệu TikTok | 1. `platform=TIKTOK` 2. `shop_id=<990002>` | Số chỉ gồm sàn / shop chọn | |
| TC-09.33 | Kỳ không có dữ liệu | EX-B2, AC-46 | Negative | P1 | API + E2E | PRE-20 | 1. API-150 kỳ 01/01/2026–31/01/2026 2. D20 | 1. Tỷ lệ `null` 2. Thẻ tỷ lệ "—" + chú thích; bảng "Không có dữ liệu trong kỳ này." | |
| TC-09.34 | Báo cáo khiếu nại | FR-09.04, BR-41, AC-47 | Happy | P1 | API | PRE-20 | 1. API-151 | Tỷ lệ thắng 75 % (12 / 16); thu hồi 2.350.000 đ; theo trạng thái, loại, bên nhận, sàn; "gửi trước hạn" = hồ sơ `submitted_at ≤ deadline_at` / hồ sơ đã gửi; số quá hạn chưa gửi đúng | |
| TC-09.35 | Báo cáo năng suất | FR-09.02, FR-03.16, BR-41, AC-45 | Happy | P1 | API | PRE-20 | 1. API-152 | TB 90 giây (60, 90, 150 − 30); theo station + theo người: lệch mã, bỏ dở, hủy, đóng gói lại; " minh qa " và "Minh QA" gộp một dòng "minh qa" (tên đầu tiên gặp); phiên không tên → "(Không ghi tên)"; bàn hoàn: số kiện kiểm, TB, tỷ lệ có vấn đề | |
| TC-09.36 | CSKH không xem năng suất | FR-09.02, AC-45, UC-15 | Permission | P1 | API + E2E | PRE-19 `tst_cskh` | 1. API-152 2. API-153 `report=productivity` 3. D20 4. URL `?tab=productivity` | 1–2. 403 `FORBIDDEN` 3. Không có tab Năng suất 4. Về `tab=returns` + Alert "Bạn không có quyền xem báo cáo năng suất." | |
| TC-09.37 | Kỳ báo cáo sai | EX-B1, FR-09.05 | Negative | P1 | API + E2E | PRE-5 | 1. `from=2026-09-30&to=2026-09-01` 2. 367 ngày 3. 366 ngày 4. `to` = ngày mai (giờ VN) | 1. 422 `fields.to = "Ngày đến phải sau ngày từ."` 2. `fields.from = "Chọn tối đa 366 ngày."` 3. 200 4. `fields.to = "Không chọn ngày trong tương lai."`; FE khóa "Xem", lỗi dưới ô | |
| TC-09.38 | Kỳ nhanh theo giờ VN | FR-09.05 | Boundary | P2 | INT + E2E | Phiên đóng 30/09 23:30 VN (16:30 UTC) và 01/10 00:10 VN (30/09 17:10 UTC) | 1. "Tháng trước" khi hôm nay 07/10 2. "Hôm nay" 01/10 | Phiên 23:30 VN thuộc tháng 9; phiên 00:10 VN thuộc 01/10; các nút Hôm nay / 7 ngày / 30 ngày / Tháng này / Tháng trước ghi đúng `from` / `to` | |
| TC-09.39 | Bấm số → danh sách đã lọc | FR-09.05, AC-47, UC-15 | Happy | P1 | E2E | PRE-20 + PRE-3 | 1. Tab Hàng hoàn bấm "Có vấn đề 6" 2. Tab Khiếu nại bấm "Quá hạn chưa gửi" | 1. D14 tab Đã nhận, lọc kết luận có vấn đề + kỳ, 6 dòng 2. D16 `due=overdue&status=NEW` đúng số | |
| TC-09.40 | Xuất CSV | FR-09.06, AC-47 | Happy | P1 | API + MAN | PRE-20 | 1. API-153 `report=returns` 2. Mở bằng Excel | 1. `text/csv; charset=utf-8` có BOM; tên `bao-cao-hang-hoan-2026-09-01_2026-09-30.csv`; dấu phẩy; mỗi bảng có dòng tiêu đề tiếng Việt; tỷ lệ "4,0%"; audit `REPORT_EXPORT {report, from, to, …}` 2. Tiếng Việt đúng, số khớp màn | |
| TC-09.41 | CSV báo cáo lạ | API-153 | Negative | P2 | API | PRE-5 | 1. `report=abc` | 404 `NOT_FOUND` | |
| TC-09.42 | Báo cáo quá 15 giây | API-150, 02a §4 | Negative | P2 | INT + E2E | PRE-17, truy vấn giả chậm 16 giây | 1. API-150 2. D20 | 1. 503 `REPORT_TIMEOUT` 2. Alert "Không tải được báo cáo." + "Thử lại" | |
| TC-09.43 | Cache 60 giây | 02a §8 | Happy | P3 | INT | PRE-20 | 1. API-150 2. Thêm 1 hồ sơ 3. Gọi lại < 60 giây 4. Sau 61 giây | 3. Số cũ 4. Số mới | |
| TC-09.44 | Biểu đồ cột (C) | FR-09.07 | Happy | P3 | E2E | PRE-20, nếu T-255 làm phần C | 1. D20 biểu đồ ngày / tuần / tháng | Cột khớp `series`; không làm → ghi "không làm (C)" | |
| TC-09.45 | D2 số mới + lọc vai | FR-09.01, API-32 | Happy | P1 | API | PRE-14 + PRE-15 + PRE-19, có shop lỗi, sao lưu trễ | 1. API-32 bằng ADMIN, SUPERVISOR, CSKH | `counts.returns_dropped_7d`, `refund_only_pending`, `claims_overdue_unsent`; ADMIN có `SYNC_ERROR` (có `shop_name`, `platform`, `code`), `BACKUP_STALE`; SUPERVISOR / CSKH không có hai mục đó | |
| TC-09.46 | D2 mục mới dẫn đúng màn | FR-09.01, DEC-488 | Happy | P2 | E2E | Như TC-09.45, `tst_admin` | 1. Bấm `REFUND_ONLY_PENDING` 2. `CLAIM_OVERDUE` 3. `BACKUP_STALE` 4. `SYNC_ERROR` | 1. D14 `tab=NO_PARCEL&pending_only=true` 2. D16 `due=overdue&status=NEW` 3. D23 4. D7 | |
| TC-09.47 | `RETURN_SESSION_ABANDONED` đổi nghĩa | API-32 | Regression | P3 | API | Phiên RETURN mở có cờ `AUTO_CLOSE_BLOCKED` + phiên `ABANDONED` | 1. API-32 | `RETURN_SESSION_ABANDONED.count` chỉ đếm phiên có cờ; phiên `ABANDONED` ở `RETURN_SESSION_DROPPED` | |

### M10 — Nhật ký thao tác, quyền trên `/me`

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-10.40 | Audit mọi hành động FR-10.03 | FR-10.03, AC-61 | Happy | P1 | API | Sau khi chạy M02, M05, M06, M07, M08, M09 | 1. API-92 lọc từng action | Đúng 1 dòng / hành động, đúng người, đối tượng, dữ liệu: `SHOP_CONNECT` (`platform`), `SHOP_DISCONNECT`, `SHARE_CREATE`, `SHARE_REVOKE`, `SHARE_EXPIRE` (người dùng null), `NOTIFY_CHANNEL_CREATE / UPDATE / DELETE`, `NOTIFY_TEST`, `NOTIFY_SETTINGS_UPDATE`, `BACKUP_SETTINGS_UPDATE`, `BACKUP_KEY_CONFIRM`, `BACKUP_TEST`, `BACKUP_RUN_NOW`, `REPORT_EXPORT`, `CLAIM_EVIDENCE_REMOVE` (lý do), `APPROVAL_DECISION` (`reason_code`) | |
| TC-10.41 | Audit hành động v0.3 / v0.4 | FR-10.03, 02 API-92 | Happy | P1 | API + CLI | Sau TC-08.50, 08.54, 02.70, 02.79, 02.80, 02.91, KR.01, KR.08, MG3.04 | 1. API-92 | `SESSION_WRONG_SCAN_MARK` (`active_shares[]`), `SESSION_WRONG_SCAN_UNMARK`, `SESSION_RETURN_CONFIRM` (`overridden_cause`), `PACKAGE_CANCEL_REVERT` (`trigger`), `BACKUP_REUPLOAD_OLD_KEY`, `BACKUP_ISSUE_RESOLVE`, `BACKUP_RESTORE_VERIFIED`, `BACKUP_VERIFY_ACCEPT` (`os_user`), `MEDIA_MARK_MISSING` (`cause`), `MEDIA_MISSING_RECOVERED` | |
| TC-10.42 | D10 lọc bằng nhãn tiếng Việt | AC-61 | Happy | P2 | E2E | Sau TC-10.40 | 1. D10 chọn "Thu hồi link", "Đánh dấu phiên quét nhầm", "Đánh dấu thiếu tệp" | Lọc đúng; nhãn theo 02b-admin §9 | |
| TC-10.43 | Log / audit không lộ bí mật | NFR-42, 02a §2 `core/logging.py` | Negative | P1 | INT | Sau TC-07.45, 05.63, 06.44 | 1. Tìm trong log + `audit_log` | Không có URL link đầy đủ, token `share/`, `X-Amz-Signature`, `X-Amz-Credential`, `access_token`, `sign`, `app_secret`, `refresh_token`, bot token (`api.telegram.org/bot…`) | |
| TC-10.44 | `/me` quyền mới theo vai | FR-10.02, API-04 | Happy | P1 | API | PRE-5 + PRE-19 | 1. API-04 bằng 4 vai | ADMIN: `reports.returns`, `reports.claims`, `reports.productivity`, `shares.create`, `shares.read`, `shares.revoke_any`, `notify.manage`, `backup.manage`, `backup.read`; SUPERVISOR: không `notify.manage`, `backup.manage`; CSKH: không `reports.productivity`, `shares.revoke_any`, `notify.*`, `backup.*`; STATION: không quyền nào trên | |

### ST3 — Chuyển trạng thái

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-ST3.01 | Link chia sẻ — chuyển hợp lệ / cấm | 01 §7.1 | State | P1 | INT | PRE-17 | 1. `CREATING → ACTIVE`, `CREATING → FAILED`, `ACTIVE → REVOKED`, `ACTIVE → EXPIRED` 2. Thu hồi `REVOKED` / `EXPIRED` / `FAILED`; J-25 với `REVOKED` | 1. Đúng sơ đồ 2. 409 `SHARE_NOT_ACTIVE`; trạng thái cuối không đổi | |
| TC-ST3.02 | Tin thông báo | 01 §7.4 | State | P1 | INT | PRE-17 | 1. Mỗi cạnh: `QUEUED → SKIPPED / HELD / SENT / RETRYING`, `HELD → QUEUED`, `RETRYING → SENT / DROPPED` | Đúng sơ đồ; `SENT`, `DROPPED`, `SKIPPED` không đổi nữa | |
| TC-ST3.03 | Trạng thái sao lưu ưu tiên | 02 API-180 `state` | State | P1 | UNIT | — | 1. Tổ hợp: thiếu `S3_*` + `RESTORE_PENDING`; `RESTORE_PENDING` + chưa xác nhận; khóa đổi + tắt | `NOT_CONFIGURED` > `RESTORE_PENDING` > `KEY_UNCONFIRMED` > `KEY_CHANGED` > `DISABLED` > `ON`; chỉ `ON` chạy J-20..J-23 | |
| TC-ST3.04 | Đối tượng sao lưu | 02 §5.2 `backup_object.status` | State | P1 | INT | PRE-17 | 1. `PENDING → UPLOADING → UPLOADED`; `→ FAILED → UPLOADING`; `HASH_MISMATCH → PENDING` (override) / `IGNORED`; `FAILED SOURCE_MISSING → IGNORED`; `UPLOADED → CLOUD_DELETED`; `→ SOURCE_DELETED` 2. J-22 với `SOURCE_DELETED`, `IGNORED`, `CLOUD_DELETED` | 1. Đúng 2. Không xử lý lại trạng thái cuối; CHECK `(cloud_present) = (cloud_key_fingerprint IS NOT NULL)` luôn đúng | |
| TC-ST3.05 | Clip / ảnh `READY ⇄ MISSING` | 02 §5.1 CLIP | State | P1 | INT | PRE-17 | 1. `READY → MISSING` (J-22 lần 4, `IGNORE`, restore, `--accept`) 2. `MISSING → READY` (J-22 băm khớp, `--evidence-only`, `UPLOAD_ANYWAY`) 3. J-02 với `MISSING` | 1–2. Đúng, có audit 3. Không thành `DELETED` | |
| TC-ST3.06 | Phiên RETURN hủy | 01 §7.3 | State | P1 | INT | PRE-17 | 1. `OPEN → CANCELLED` bởi station trong BR-37 2. Ngoài BR-37 3. `OPEN → WAITING_APPROVAL → CANCELLED` (API-21) | 1. Được 2. 409 3. Được, `cancel_reason = SUPERVISOR` + `cancel_cause` | |
| TC-ST3.07 | Kết nối shop | 01 §7 | State | P2 | INT | PRE-17 | 1. `CONNECTED → EXPIRED` (J-12 lỗi) → kết nối lại → `CONNECTED` 2. `CONNECTED → DISCONNECTED` (API-154) → kết nối lại | Đúng; shop `DISCONNECTED` không được J-04 / J-12 chạm | |
| TC-ST3.08 | Nhóm trạng thái đơn → kiện (BR-21) | BR-21, 02a §5 | State | P1 | INT | PRE-17 | 1. Đơn `AWAITING_SHIPMENT → CANCEL_REQUESTED → AWAITING_SHIPMENT` (kiện `NEW`, `PACKED`) 2. `→ CANCELLED` 3. Gọi `transition(CANCELLED → NEW)` trực tiếp (không qua `revert_cancel`) | 1. Kiện giữ trạng thái 2. `NEW → CANCELLED`, `PACKED → CANCELLED_AFTER_PACK` 3. `InvalidTransition` (guard) | |
| TC-ST3.09 | Lượt sao lưu DB | 02 §5.1 BACKUP_RUN | State | P2 | INT | PRE-17 | 1. Tạo 2 lượt `RUNNING` cùng lúc | Partial unique chặn lượt 2 (`IntegrityError` → 409 `BACKUP_RUNNING`); `RUNNING → SUCCESS / FAILED` | |

### MG3 — Migration 0006 / 0007, nâng cấp, lùi, nâng cấp lại

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-MG3.01 | Nâng cấp 0005 → 0007 trên dữ liệu Phase 2 | 02a §3, 02 §10 | Happy | P1 | MIG | PRE-18 | 1. `alembic upgrade head` 2. `alembic current` 3. `alembic check` | 1. Không lỗi, `lock_timeout` 5 giây 2. `0007` 3. Sạch; `order.platform_status_group` backfill (`IN_CANCEL` → `CANCEL_REQUESTED`), `return_case.shop_id`, `shop.grant_ref = platform_shop_id`, `claim.submitted_at / result_at` từ audit; log số dòng + số `UNKNOWN` | |
| TC-MG3.02 | Backfill 4b phiên mở hoàn trước | BR-39, DEC-498, 516 | Happy | P1 | MIG | PRE-18 (a), (b), (c) | 1. Upgrade 2. API-132 KN-000101 3. Log | 2. Phiên (a) `ABANDONED` thêm `auto = true`, `backfilled = true`; phiên (b) `WRONG_SCAN` không thêm; phiên (c) `SUPERVISOR` thêm, `review_needed = true`, không `primary`; audit `CLAIM_EVIDENCE_UPDATE` `data.reason = BACKFILL_BR39` (người dùng null) 3. `backfill_review_needed {claim_code, session_id, started_at}`; hồ sơ `CLOSED` / `LEGACY_HOLD` không bị chạm | |
| TC-MG3.03 | (4c) đếm kiện hủy oan | DEC-519 | Happy | P2 | MIG | PRE-18 (d)–(g) | 1. Upgrade, đọc log | Log đếm 4 kiện ứng viên; migration không đổi trạng thái kiện | |
| TC-MG3.04 | `fix-cancel-requests` | BR-21 v0.4, AC-41, DEC-519 | State | P1 | CLI | Sau TC-MG3.01 | 1. `aicam fix-cancel-requests` (dry-run) 2. `--apply` 3. `--apply` lần 2 | 1. In danh sách mã kiện / đơn / shop / lý do bỏ qua; không ghi 2. (e) `SPXTST0000012` `CANCELLED → NEW`; (d) `SPXTST0000010` `CANCELLED_AFTER_PACK → PACKED`, lượt đối soát sau cảnh báo BR-11 `AUTO_RESOLVED`; (f) `SPXTST0000013` giữ, in "kiểm tay"; (g) `SPXTST0000014` giữ (lần vào hủy `MANUAL`); mỗi kiện đổi có `PACKAGE_CANCEL_REVERT` (`trigger = COMMAND`) + `status_history` `source = PLATFORM` 3. Không đổi gì (idempotent) | |
| TC-MG3.05 | Lưới an toàn khi chưa chạy lệnh | BR-21 v0.4 (h) | State | P1 | INT | Kiện `CANCELLED` do `IN_CANCEL`, chưa chạy lệnh | 1. Mock đơn `IN_CANCEL → READY_TO_SHIP` → J-04 | Kiện về `NEW`; audit `PACKAGE_CANCEL_REVERT` `trigger = SYNC` | |
| TC-MG3.06 | Unique theo shop sau 0007 | BR-29 | Happy | P1 | MIG | Sau upgrade | 1. Chèn đơn `2410DUP00009` cho shop A và B 2. Chèn lần 2 cho A 3. Đơn file trùng mã đơn file | 1. Được 2–3. Vi phạm unique (`uq_order_shop_sn` / `uq_order_noshop_sn`) | |
| TC-MG3.07 | Lùi 0007 khi đã có mã trùng | RB-36, 02 §10 | Negative | P1 | MIG | Sau TC-MG3.06 bước 1 | 1. `alembic downgrade 0006` | `raise` "Có mã đơn trùng giữa shop — không lùi được về Phase 2, sửa tiến" kèm ≤ 20 mã; DB nguyên vẹn (`alembic current` 0007) | |
| TC-MG3.08 | Lùi 0006 khi còn link sống | DEC-475 | Negative | P1 | MIG | Head, 1 link `ACTIVE` | 1. `downgrade 0005` 2. Với `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES=1` | 1. Từ chối, in danh sách link 2. Chạy tiếp | |
| TC-MG3.09 | Lùi 0006 khi còn kiện của đơn ngoài | DEC-509 | Negative | P1 | MIG | Head, kiện TikTok `PACKED` + shop Shopee thứ hai `CONNECTED` | 1. `downgrade 0005` 2. Với `AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS=1` | 1. Từ chối, in số kiện theo trạng thái 2. Kiện đơn ngoài `order_id = NULL`, ghi `detached_packages`; đơn giữ dòng `shop_id = NULL` | |
| TC-MG3.10 | Lùi giữ bằng chứng đã bỏ còn hạn | DEC-497, BR-38 | Happy | P1 | MIG | Head: KN có clip **và** ảnh đã bỏ (còn hạn), 1 clip đã bỏ hết hạn | 1. `downgrade 0005` (cờ đủ) 2. Kiểm hồ sơ hệ thống 3. Chạy J-02 **code Phase 2** (tag `main`) trước hạn / sau hạn | 2. Mỗi kiện một hồ sơ `LEGACY_HOLD` `CLOSED`, `closed_at` = mốc bỏ muộn nhất, ghi chú "Bằng chứng đã bỏ khỏi KN-xxxxxx lúc … — giữ tới dd/mm/yyyy"; kiểm tập con không `raise` 3. Trước hạn: clip + ảnh còn; sau hạn: bị xóa | |
| TC-MG3.11 | Lùi 0006 — dữ liệu Phase 3 vào archive | 02a §3, DEC-509 | Happy | P1 | MIG | Head đủ dữ liệu (2 Shopee + 2 TikTok, link, kênh, clip + ảnh `MISSING`) | 1. `downgrade 0005` 2. Kiểm DB 3. Chạy J-06 **code Phase 2** với adapter mock ghi `calls[]` | 2. `phase3_archive` có 9 bảng mới + `*_cols` + `backfill_prior_pairs`, `missing_clips`, `missing_snapshots`; shop TikTok bị xóa; Shopee `CONNECTED` thừa → `DISCONNECTED`; clip `MISSING → FAILED`, ảnh `MISSING → DELETED`; CHECK về cũ 3. `calls[]` không có mã đơn TikTok | |
| TC-MG3.12 | Nâng cấp lại khôi phục đúng | DEC-331, 02a §3 | State | P1 | MIG | Sau TC-MG3.11 | 1. `upgrade head` 2. So dữ liệu với trước khi lùi | Shop, link, kênh, cột như trước; `detached_packages` gắn lại (`order_id` còn `NULL`); clip / ảnh về `MISSING`; hồ sơ `LEGACY_HOLD` chưa bị đổi → xóa; `phase3_archive` bị drop | |
| TC-MG3.13 | Khứ hồi lùi → lên không đổi bằng chứng (G2R3-1) | DEC-528, BR-38, BR-39 | State | P1 | MIG | Head: KN mở có phiên C (Supervisor hủy `cancel_cause = WRONG_SCAN`), A (`ABANDONED`, đánh dấu quét nhầm qua API-189 → đã bỏ mềm), E (Phase 3 tự thêm rồi bỏ qua API-134), F (đã `CONFIRM_RETURN` gỡ lý do hủy) | 1. `downgrade 0005` 2. `upgrade head` 3. API-132 4. Log | 3. C, A, E **không** có trong `evidence[]`; `removed_evidence` của A, E giữ nguyên lý do, người, giờ, `keep_until`; C, A trong `excluded_return_sessions`; F vẫn là phiên chính; cột `session.cancel_cause`, `wrong_scan_*`, `review_confirmed_*` khôi phục trước 4b 4. Không có `restore_removed_conflict` | |
| TC-MG3.14 | Lên lại không thêm cặp người dùng đã bỏ ở Phase 2 | DEC-498 | State | P1 | MIG | Lùi về Phase 2; ở Phase 2 bỏ một dòng `backfilled` | 1. `upgrade head` 2. API-132 | Cặp (hồ sơ, phiên) đó không được 4b thêm lại (`backfill_prior_pairs`) | |
| TC-MG3.15 | Lên lại khi Phase 2 đã thêm lại cặp đã bỏ | DEC-497, 528 | State | P2 | MIG | Lùi; ở Phase 2 thêm lại tay phiên đã bỏ; sửa ghi chú một hồ sơ `LEGACY_HOLD` | 1. `upgrade head` | Giữ dòng hiện có, bỏ dòng archive, log `restore_removed_conflict`; hồ sơ `LEGACY_HOLD` đã đổi → giữ + log | |
| TC-MG3.16 | 0006 idempotent | DEC-498 | Regression | P2 | MIG | Head | 1. `downgrade 0005` → `upgrade` → `downgrade` → `upgrade` | Không nhân đôi `claim_evidence` (`ON CONFLICT DO NOTHING`); số dòng như lần đầu | |
| TC-MG3.17 | Thời gian 0006 trên 1 triệu đơn | 02a §3, RB-37 | NFR | P2 | MIG | Bản sao sinh 1.000.000 đơn (máy dev) | 1. Bấm giờ `upgrade head` | Ghi số phút vào ops §7.2; không vượt `lock_timeout` khi không có kết nối khác | |
| TC-MG3.18 | Image Phase 2 trên DB 0007 | 02a §2 `schema_guard` | Negative | P2 | MIG | Head | 1. Chạy migrate của image Phase 2 | Lỗi revision lạ; `api` không khởi động; Phase 3 `SCHEMA_HEAD = "0007"` | |
| TC-MG3.19 | Diễn tập nâng cấp theo runbook | 02 §10, T-230 | Happy | P1 | MAN | Bản sao DB Phase 2 (PRE-18) trên stack production-like | 1. Theo ops §7.2: dừng `api vision worker worker-sync worker-export beat` → `pg-backup.sh once` → `alembic current` (0005) → `upgrade head` → `current` (0007) → `aicam fix-cancel-requests` dry-run → `--apply` → `VACUUM ANALYZE "order", return_case` → `up -d` (gồm `worker-sync-long`, `worker-backup`, `worker-notify`) 2. Lùi theo runbook bằng image mới | 1. Mọi bước chạy đúng thứ tự; healthz 200 2. Lùi thành công với cờ; ghi biên bản | |
| TC-MG3.20 | `ON CONFLICT` với generic plan | DEC-362 | Regression | P3 | INT | `plan_cache_mode = force_generic_plan` | 1. J-21 hai lần | Không lỗi; không trùng `backup_object` | |

### R3 — Hồi quy Phase 1 / 2

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-R3.01 | Bộ QA live Phase 1 + 2 | item 01, 02 `04` | Regression | P1 | API | PRE-13 | 1. `uv run pytest tests/qa -m qa -k "m1 or m2 or m3 or m4 or m6 or m7 or m8 or m9 or m10"` | Pass như trước Phase 3 (cập nhật có ghi chú kỳ vọng đổi có chủ đích: API-12 RETURN, API-21, API-134, API-32 `SYNC_ERROR`) | |
| TC-R3.02 | E2E BE thật Phase 1 + 2 | item 01, 02 | Regression | P1 | E2E | PRE-13 + FE | 1. `pnpm e2e:real` bộ Phase 1–2 | Pass (trừ case đổi có chủ đích — ghi lý do) | |
| TC-R3.03 | Shopee một shop sau nâng cấp | FR-05.14, DEC-436 | Regression | P1 | API + E2E | PRE-13 chỉ `990001` | 1. J-04, J-06, J-13 2. `POST /shops/shopee/auth-url` (đường cũ) 3. `/admin/settings/shopee?result=connected` | 1. Như Phase 2 2. Như cũ 3. Chuyển hướng `/admin/settings/platforms?result=connected` giữ query | |
| TC-R3.04 | Đối soát Shopee giữ hành vi | BR-10, 11, 14, 19 | Regression | P1 | INT | PRE-17 | 1. Bộ test đối soát Phase 2 (`test_recon_*`) | Pass; kiện `PACKED` đơn `IN_CANCEL` không bắn BR-10, BR-11 | |
| TC-R3.05 | Retention J-02 với cột `removed_at` | FR-02.06, BR-09 | Regression | P1 | INT | Clip không thuộc hồ sơ / hàng hoàn, quá 90 ngày | 1. J-02 | `DELETED` đúng hạn như Phase 2 | |
| TC-R3.06 | Gói bằng chứng hồ sơ không có phiên trước | FR-08.05 | Regression | P2 | INT | KN chỉ PACK + 1 RETURN | 1. API-136 | Cấu trúc zip như Phase 2 | |
| TC-R3.07 | Contract test + OpenAPI | 02 §6 | Regression | P1 | API | — | 1. `uv run pytest tests/contract` | Xanh; 28 API mới + 31 mở rộng có mục; API cũ chỉ thêm trường trừ 4 ngoại lệ có chủ đích (02 §6) | |
| TC-R3.08 | Hủy phiên PACK tại station không bị BR-37 | API-12 | Regression | P1 | API | Phiên PACK mở 5 phút | 1. API-12 | 200 như Phase 1 | |
| TC-R3.09 | Đồng thời quét ∥ J-04 hai shop ∥ J-13 | DEC-266, 493 | Regression | P1 | INT | Cùng mã đơn `2410DUP00001` | 1. 3 luồng × 20 | Không deadlock; đúng 2 đơn; không hồ sơ trùng | |
| TC-R3.10 | Nhập đơn file một shop | FR-01.x import | Regression | P2 | API | PRE-13 | 1. Nhập file Phase 1 mẫu | Kết quả `NEW` / `UPDATE` / `SKIP` như Phase 1 | |
| TC-R3.11 | Bàn hoàn Phase 2 không đổi ngoài BR-37 | FR-04.* | Regression | P1 | E2E | PRE-8 | 1. TC-04.04, 04.19, 04.21 của item 02 | Pass | |
| TC-R3.12 | Ranh giới module | 02a §2 import-linter | Regression | P3 | UNIT | — | 1. `uv run lint-imports` | `cloud` không import module nghiệp vụ; mọi contract pass | |

### X3 — Tài nguyên ngoài / phần cứng (dự kiến "chưa test — thiếu tài nguyên")

Dùng bảng [02a §11 "Chưa test — thiếu tài nguyên"](02a-be-spec.md#11-test-be). Phần mock / MinIO tương ứng vẫn chạy ở các nhóm trên; khi có tài nguyên, chạy case này rồi điền KQ.

| ID | Tiêu đề | Phủ | Loại | Ưu tiên | Cách | Tiền điều kiện | Bước | Kỳ vọng | KQ |
|---|---|---|---|:---:|---|---|---|---|:---:|
| TC-X3.01 | Ủy quyền TikTok thật nhiều shop + redirect `x.local` | FR-05.13, Q18, RK-26 | Happy | P2 | EXT | Tài khoản đối tác TikTok Shop (T-3 TikTok), `TIKTOK_ADAPTER=tiktok` | 1. D7 kết nối 2. Callback về `https://x.local/api/v1/shops/tiktok/callback` | Mọi shop của tài khoản `CONNECTED`; TikTok nhận redirect — **chưa test — thiếu tài khoản đối tác TikTok Shop** | |
| TC-X3.02 | Ký request + mã lỗi + giới hạn tần suất thật | FR-05.08, RB-31 | Happy | P2 | EXT | Như TC-X3.01 | 1. J-04 1 giờ 2. Gây 429 | Chữ ký đúng; mã lỗi token / tần suất khớp 02a §7.1 — **chưa test — thiếu tài khoản đối tác** | |
| TC-X3.03 | Trạng thái đơn / hủy / trả hàng thật khớp §5.3 | FR-05.15..18, Q19, AS-12..14 | Happy | P2 | EXT | Như TC-X3.01, đơn thật các trạng thái | 1. So `raw_payload` với bảng 02 §5.3 | Đủ chữ trạng thái, trường hạn người bán, mã chiều về, kiện gộp TikTok VN, đơn kho TikTok — **chưa test — thiếu tài khoản đối tác** | |
| TC-X3.04 | Shopee thật nhiều shop + mã đơn lạ | FR-05.14, DEC-509 | Happy | P2 | EXT | T-3 Shopee 2 shop thật | 1. Kết nối 2 shop 2. `get_order_detail` với mã đơn của shop khác | Đồng bộ độc lập; phản hồi mã lạ không làm hỏng lô — **chưa test — thiếu Shopee partner (T-3)** | |
| TC-X3.05 | Kho lưu thật: URL ký 7 ngày + `index.html` mở thẳng | FR-07.07, BR-34, Q20, RK-27 | Happy | P2 | EXT | Nhà cung cấp S3 chốt ở Q20 | 1. Tạo link hạn 7 ngày 2. Mở URL | Trang hiển thị `text/html` trong trình duyệt (không tải xuống); ký được 604.800 giây — **chưa test — thiếu nhà cung cấp S3 thật** | |
| TC-X3.06 | Versioning + lifecycle + khóa ứng dụng không xóa phiên bản; object lock | FR-02.14, RK-28, DEC-501 | Negative | P2 | EXT | Như TC-X3.05 | 1. Khóa ứng dụng thử `DeleteObjectVersion`, `PutBucketVersioning` 2. Xóa đối tượng → đợi 8 ngày | 1. `AccessDenied` 2. Phiên bản cũ tự xóa ≤ 7 ngày — **chưa test — thiếu nhà cung cấp S3 thật** | |
| TC-X3.07 | Tốc độ tải lên + nơi đặt dữ liệu thật | AS-17, CO-06 | NFR | P3 | EXT | Như TC-X3.05 | 1. Tải 5 GB | Đo Mbit/s; vùng dữ liệu đúng hồ sơ NĐ 13 — **chưa test — thiếu nhà cung cấp S3 thật** | |
| TC-X3.08 | Bot Telegram thật từ mạng kho | FR-06.04, Q21, RK-22 | Happy | P2 | EXT | Bot thật + nhóm thật, máy chủ ở mạng kho | 1. Gửi thử 2. Sự kiện N02 | Tin tới ≤ 3 phút; không bị chặn mạng — **chưa test — thiếu bot thật / mạng kho** | |
| TC-X3.09 | Zalo OA thật | FR-06.04, Q21, DEC-445 | Happy | P2 | EXT | OA xác thực + ứng dụng | 1. Gửi thử 2. Làm mới token xoay vòng 3. Người chưa quan tâm OA | 1. Tới 2. Token mới lưu mã hóa 3. Chữ lỗi đúng — **chưa test — thiếu Zalo OA thật** | |
| TC-X3.10 | W1 trên điện thoại thật ngoài mạng kho | NFR-46, AC-52, UC-17 | NFR | P2 | HW | Chrome Android + Safari iOS (2 năm gần nhất), 4G, kho lưu công khai | 1. Mở link 2. Phát / tải video | Chữ ≤ 3 giây; video H.264 phát được cả hai — **chưa test — thiếu điện thoại / kho lưu công khai** | |
| TC-X3.11 | Sao lưu qua Internet kho không làm chậm quét / live view | NFR-44, RK-23 | NFR | P2 | HW | Server kho + mạng kho thật | 1. Tải 5 GB trong giờ làm 2. Đo quét p95, live view | Quét p95 không đổi so khi không tải — **chưa test — thiếu server / mạng kho** | |
| TC-X3.12 | RTO khôi phục trên máy kho | NFR-40, AC-50 | NFR | P2 | HW | Máy kho mới | 1. TC-KR.01 trên máy kho | DB ≤ 60 phút — **chưa test — thiếu máy kho** | |
| TC-X3.13 | Báo cáo trên server kho | NFR-37, AC-48 | NFR | P2 | HW | Server kho + 180.000 kiện | 1. TC-N3.04 trên server kho | 92 ngày ≤ 3 giây p95, 366 ngày ≤ 10 giây — **chưa test — thiếu server kho** | |
| TC-X3.14 | Dựng link từ clip camera thật trên server kho | FR-07.05, RB-35, T-4 | NFR | P2 | HW | Camera thật Cam 1 + Cam 2 (T-4), server kho, 4 phiên 3 phút 1080p | 1. Tạo link 4 phiên ghép 2. Kiểm chữ chip / banner station ở kiosk 1920×1080 | 1. ≤ 3 phút; nhãn Cam 2 rõ (cảnh báo NFR-45 đúng) 2. Chip / banner đọc được ở 1 m — **chưa test — thiếu camera thật / server kho** | |

## 3. Phân quyền

Gọi API trực tiếp bằng token từng vai (PRE-5 + PRE-19); UI chỉ là bổ sung (ẩn nút / D12). Ma trận theo 01 §5.10 + 02 §6.1 cột Quyền. ✅ = được (2xx) · ⛔ = bị chặn (mã ghi trong ô).

| ID | Hành động (API) | Admin | Supervisor | Station | CSKH | Ưu tiên | KQ |
|---|---|:---:|:---:|:---:|:---:|:---:|---|
| TC-P3.01 | Kết nối / ngắt / đồng bộ shop (API-70, 71, 73, 154) | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.02 | Danh sách shop rút gọn (API-156) | ✅ | ✅ | ⛔ 403 | ✅ | P2 | |
| TC-P3.03 | Báo cáo Hàng hoàn, Khiếu nại + CSV (API-150, 151, 153 `returns` / `claims`) | ✅ | ✅ | ⛔ 403 | ✅ | P1 | |
| TC-P3.04 | Báo cáo Năng suất + CSV (API-152, 153 `productivity`) | ✅ | ✅ | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.05 | Tạo link, lựa chọn phiên (API-160, 164) | ✅ | ✅ | ⛔ 403 | ✅ | P1 | |
| TC-P3.06 | Danh sách / chi tiết link (API-161, 162) | ✅ | ✅ | ⛔ 403 | ✅ | P1 | |
| TC-P3.07 | Thu hồi link (API-163) — link của người khác | ✅ | ✅ | ⛔ 403 | ⛔ 403 (link mình: ✅) | P1 | |
| TC-P3.08 | Kênh thông báo, gửi thử, nhật ký, giờ yên lặng (API-170..176) | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.09 | Sao lưu (API-180..185, 187, 188) | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.10 | Sức khỏe có dòng "Sao lưu cloud" (API-81) | ✅ | ✅ (xem, D8 không link D23) | ⛔ 403 | ⛔ 403 | P2 | |
| TC-P3.11 | Cài đặt `packer_name_required`, `refund_only_default_hours` (API-80 PUT) | ✅ | ⛔ 403 (GET ✅) | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.12 | Tự hủy phiên mở hoàn ≤ 60 giây (API-12) | ⛔ 403 | ⛔ 403 | ✅ (station mình) | ⛔ 403 | P1 | |
| TC-P3.13 | Quyết định hủy phiên hoàn có lý do (API-21) | ✅ | ✅ | ⛔ 403 | ⛔ 403 | P1 | |
| TC-P3.14 | Đánh dấu / bỏ đánh dấu quét nhầm, xác nhận "Cần soát" (API-189 `MARK_WRONG_SCAN`, `UNMARK_WRONG_SCAN`, `CONFIRM_RETURN` phiên `review_needed`) | ✅ | ✅ | ⛔ 403 | ✅ | P1 | |
| TC-P3.15 | Gỡ lý do hủy "Là phiên hoàn thật" (API-189 `CONFIRM_RETURN` phiên bị loại theo lý do hủy) | ✅ | ✅ | ⛔ 403 | ⛔ 403 `FORBIDDEN` "Chỉ Admin / Supervisor gỡ lý do hủy của phiên." | P1 | |
| TC-P3.16 | Bỏ bằng chứng khỏi hồ sơ (API-134) | ✅ | ✅ | ⛔ 403 | ✅ | P1 | |
| TC-P3.17 | Nhập / đổi tên người đóng gói (API-101 chế độ PACK) | ⛔ 403 | ⛔ 403 | ✅ (station mình) | ⛔ 403 | P2 | |
| TC-P3.18 | Mục D2 `SYNC_ERROR`, `BACKUP_STALE` (API-32 — server lọc) | ✅ có | ✅ 200, không có 2 mục | ⛔ 403 | ✅ 200, không có 2 mục | P1 | |
| TC-P3.19 | WS `backup.updated`, `shop.updated` (kênh `ws:admin`); `share.updated` | ✅ nhận cả 3 | chỉ `share.updated` | — | chỉ `share.updated` | P2 | |
| TC-P3.20 | Người nhận link không đăng nhập (W1) | Mở được đúng nội dung link còn hạn; `ListObjects` bucket bằng địa chỉ link → từ chối; đổi token sang thư mục link khác → 403 / 404 | | | | P1 | |
| TC-P3.21 | `/me` quyền mới (API-04) | Như TC-10.44 | | | | P2 | |
| TC-P3.22 | Không đăng nhập gọi API mới (API-150, 156, 160, 170, 180, 189) | 401 `UNAUTHORIZED` mọi API; API-155 callback chỉ nhận `state` hợp lệ (sai → `result=expired`, không tạo shop) | | | | P2 | |

## 4. Phi chức năng

| ID | NFR | Kịch bản & tải | Ngưỡng đạt | Kết quả đo |
|---|---|---|---|---|
| TC-N3.01 | NFR-01 (tra sàn nhiều shop), AC-43 | locust 100 lần quét mã lạ, 4 shop mock (1 chậm 5 giây, 1 có đơn) — máy dev | API-11 p95 ≤ 3 giây (kỳ vọng ~2 giây) | |
| TC-N3.02 | NFR-01 (mã đã có) | locust PACK + RETURN như Phase 2 (`LOAD_PROFILE=returns`) sau nâng cấp | p95 ≤ 1 giây; không xấu hơn số Phase 2 (DEC-335) quá 20 % | |
| TC-N3.03 | NFR-28 | TC-05.91 | 0 kết quả ngoài adapter | |
| TC-N3.04 | NFR-37, AC-48 | `tests/load/perf_reports.py` 180.000 kiện, 9.000 hồ sơ hàng hoàn; 20 lần mỗi tab, kỳ 92 và 366 ngày — máy dev (server kho: TC-X3.13) | 92 ngày p95 ≤ 3 giây; 366 ngày ≤ 10 giây | |
| TC-N3.05 | NFR-38 | TC-05.67, TC-05.87 | Đơn ≤ 5 phút; yêu cầu trả ≤ 15 phút | |
| TC-N3.06 | NFR-39, AC-43 | INT đồng hồ giả 1 giờ: (a) 3 shop, 1 shop luôn lỗi (01); (b) 6 shop, 1 shop luôn timeout (02a, T-276) | Mỗi shop còn lại đồng bộ mỗi chu kỳ ≤ 5 phút; không task chờ slot quá 1 chu kỳ | |
| TC-N3.07 | NFR-40 | RPO: lịch J-20 (TC-02.61) + bằng chứng ≤ 1 giờ (TC-02.67); RTO: TC-KR.01 máy dev / VM (máy kho: TC-X3.12) | DB ≤ 6 giờ; bằng chứng ≤ 1 giờ; khôi phục DB ≤ 60 phút | |
| TC-N3.08 | NFR-41, AC-49 | `test_backup_security_nfr41` trên MinIO: tải 5 đối tượng bất kỳ → `ffprobe`, `pg_restore --list` không mở được; tìm khóa (base64 + hex) trong dump DB đã giải mã, log test, metadata đối tượng; khóa ứng dụng thử `DeleteObjectVersion`, `PutBucketVersioning` | 5 / 5 không mở được; 0 lần thấy khóa; 2 lệnh `AccessDenied` | |
| TC-N3.09 | NFR-42, AC-53 | `test_share_security_nfr42`: 1.000 token (base64url 43 ký tự); đổi 1 ký tự token / chữ ký; `ListObjects` bằng URL không ký / có ký; validator production `S3_PUBLIC_ENDPOINT` `http://`; thu hồi rồi GET mỗi 5 giây | ≥ 256 bit, 0 trùng; 403 / 404; từ chối liệt kê; validator lỗi với `http`; `NoSuchKey` ≤ 60 giây | |
| TC-N3.10 | NFR-43, AC-54 | Telegram giả, 100 sự kiện Cao / TB ngoài giờ yên lặng; rút mạng 2 giờ (TC-06.66) | Sự kiện → tin p95 ≤ 3 phút; 0 tin mất sau 2 giờ | |
| TC-N3.11 | NFR-44, AC-51 | MinIO local, `upload_mbps = 10`, J-22 tải 5 GB; đồng thời locust quét + mở live view (máy dev; mạng kho: TC-X3.11) | Quét p95 không đổi so với khi không tải (± 10 %); live view không giật; tốc độ tải ≤ 11 Mbit/s | |
| TC-N3.12 | NFR-45 | TC-06.69 (10 mẫu tin), TC-07.57 (W1), TC-07.72 (chữ cảnh báo) | 0 trường người mua dạng chữ; có cảnh báo trong dialog | |
| TC-N3.13 | NFR-46 | W1 trên Chrome DevTools giả lập "Fast 4G" (máy dev); điện thoại thật: TC-X3.10 | Phần chữ ≤ 3 giây; video H.264 phát được | |
| TC-N3.14 | 02a §8 (API-32, API-161, J-21) | API-32 và API-161 100 lần; J-21 với 50.000 clip | API-32, API-161 p95 ≤ 300 ms; J-21 ≤ 5 giây | |

## 5. Truy vết

**FR mức M → TC**

| FR | TC | Đạt |
|---|---|:---:|
| FR-02.08 | TC-02.60, 02.61, 02.67, 02.73 | |
| FR-02.13 | TC-02.52, 02.60, N3.08 | |
| FR-02.14 | TC-02.84..02.86, 02.93, X3.06 | |
| FR-02.15 | TC-02.50, 02.63, 02.64, 02.74, 02.77, 02.94, 02.95 | |
| FR-02.16 | TC-KR.01..KR.14, MS.01..MS.10 | |
| FR-02.17 | TC-02.53..02.57, 02.90, 02.91 | |
| FR-04.14 | TC-04.60..04.73, P3.12, P3.13 | |
| FR-05.07 | TC-05.62, 05.91 | |
| FR-05.08 | TC-05.63, 05.89, X3.02 | |
| FR-05.13 | TC-05.50..05.56, 05.81, X3.01 | |
| FR-05.14 | TC-05.51, 05.62, 05.64, 05.83, N3.06 | |
| FR-05.15 | TC-05.62, 05.67 | |
| FR-05.16 | TC-05.69, 05.78 | |
| FR-05.17 | TC-03.85..03.91, 05.90 | |
| FR-05.18 | TC-05.85, 05.88 | |
| FR-05.19 | TC-05.92..05.95 | |
| FR-05.20 | TC-05.57, 05.58 | |
| FR-05.21 | TC-05.69, 05.70, 05.91 | |
| FR-06.04 | TC-06.40..06.47, 06.72 | |
| FR-06.07 | TC-06.50..06.58 | |
| FR-06.08 | TC-06.48, 06.60..06.63 | |
| FR-06.09 | TC-06.69, 06.70 | |
| FR-06.10 | TC-06.44, 06.45, 06.49, 06.64, 06.65 | |
| FR-07.01 | TC-07.40..07.44 | |
| FR-07.05 | TC-07.45..07.56, 07.71 | |
| FR-07.07 | TC-07.57..07.59 | |
| FR-07.08 | TC-07.60..07.66 | |
| FR-07.09 | TC-07.69, 07.70 | |
| FR-08.07 | TC-08.40..08.58 | |
| FR-08.08 | TC-08.69..08.75, 08.77 | |
| FR-08.09 | TC-08.59..08.65 | |
| FR-08.10 | TC-08.66..08.68 | |
| FR-09.01 | TC-08.49, 09.45..09.47 | |
| FR-09.02 | TC-09.35, 09.36 | |
| FR-09.03 | TC-09.30..09.33 | |
| FR-09.04 | TC-09.34, 08.76 | |
| FR-09.05 | TC-09.32, 09.37..09.39 | |
| FR-10.02 | §3 TC-P3.01..P3.22, TC-10.44 | |
| FR-10.03 | TC-10.40..10.43 | |
| FR mức S / C | FR-03.03: TC-03.80..03.82, 04.80 · FR-03.16: TC-03.92..03.96 · FR-05.22: TC-05.71, 03.83, 03.84 · FR-06.11: TC-06.59 · FR-09.06: TC-09.40, 09.41 · FR-02.18 (C): TC-02.83 · FR-09.07 (C): TC-09.44 | |

**AC → TC**

| AC | TC | Đạt |
|---|---|:---:|
| AC-40 | TC-05.50, 05.51, 05.55, 05.62, 05.64, 05.73, 05.77, 04.74, 04.75, 07.40 | |
| AC-41 | TC-05.69, 05.70, 05.90, 03.85..03.91, MG3.04, R3.04 | |
| AC-42 | TC-05.85, 05.88 | |
| AC-43 | TC-05.63, 05.92, 05.93, N3.01, N3.06 | |
| AC-44 | TC-05.57, 05.58, 05.91 | |
| AC-45 | TC-09.35, 09.36 | |
| AC-46 | TC-09.30..09.33 | |
| AC-47 | TC-09.34, 09.39, 09.40 | |
| AC-48 | TC-N3.04, X3.13 | |
| AC-49 | TC-02.51, 02.60, 02.67, 02.90, 02.91, N3.08 | |
| AC-50 | TC-KR.01..KR.11, X3.12 | |
| AC-51 | TC-02.63, 02.64, 02.73, 02.74, 02.84, 02.86, N3.11 | |
| AC-52 | TC-07.45, 07.59, 07.60, 07.62, 07.63, X3.10 | |
| AC-53 | TC-07.48, 07.57, 07.58, N3.09 | |
| AC-54 | TC-06.50, 06.52, 06.53, 06.57, 06.60, 06.62, 06.63, 06.66, 06.69 | |
| AC-55 | TC-06.44, 06.49, 06.59, 06.65, X3.08, X3.09 | |
| AC-56 | TC-04.60..04.71, 08.40..08.57 | |
| AC-57 | TC-08.69..08.72 | |
| AC-58 | TC-08.59..08.64 | |
| AC-59 | TC-08.66..08.68 | |
| AC-60 | §3 TC-P3.01..P3.22 | |
| AC-61 | TC-10.40..10.42 | |
| AC-62 | TC-03.80, 03.92, 03.93, 03.95, 07.40, 07.41 | |

**BR / EX → TC**

| BR / EX | TC | Đạt |
|---|---|:---:|
| BR-01 (theo nhóm) | TC-03.85..03.87 | |
| BR-10, BR-11 (làm rõ) | TC-03.90, R3.04, MG3.04 | |
| BR-21 (làm rõ + kiện hủy oan) | TC-03.88..03.91, MG3.04, MG3.05, ST3.08 | |
| BR-29 | TC-05.72..05.77, 04.74..04.79, 04.81, 07.44, MG3.06 | |
| BR-30 | TC-05.69, 05.70, 05.91 | |
| BR-31 | TC-05.85 | |
| BR-32 | TC-05.92..05.94 | |
| BR-33 | TC-02.67, 02.83 | |
| BR-34 | TC-07.63, 07.64, X3.05 | |
| BR-35 | TC-07.48, 07.49, 07.55 | |
| BR-36 | TC-06.52, 06.60..06.63 | |
| BR-37 | TC-04.60..04.66, ST3.06 | |
| BR-38 | TC-08.59..08.65, MG3.10 | |
| BR-39 | TC-08.40..08.58, 06.53, MG3.02, MG3.13 | |
| BR-40 | TC-08.69..08.75 | |
| BR-41 | TC-09.30, 09.34, 09.35 | |
| BR-42 | TC-08.66..08.68, 06.54 | |
| EX-T1..T7, EX-P14 | T1: 05.57 · T2: 05.72 · T3: 05.71, 03.83 · T4: 03.85, 03.88..03.90 · T5: 05.68 · T6: 05.73, 04.74 · T7: 05.55 · P14: 05.93 | |
| EX-B1, B2 | 09.37 · 09.33 | |
| EX-K1..K9 | K1: 02.50 · K2: 02.51, 02.55 · K3: 02.73 · K4: 02.54, 02.96 · K5: KR.02 · K6: 02.69..02.72 · K7: 02.90..02.92, KR.03 · K8: KR.04..KR.08, MS.01..MS.10 · K9: 02.77..02.81 | |
| EX-S1..S7 | S1: 07.51 · S2: 07.52 · S3: 07.47 · S4: 07.60, 07.63 · S5: 07.67 · S6: 07.68 · S7: 07.65 | |
| EX-N1..N4 | N1: 06.43 · N2: 06.45, 06.65 · N3: 06.60 · N4: 06.68 | |
| EX-R17..R21 | R17: 04.67..04.71 · R18: 08.40 · R19: 08.77 · R20: 04.74..04.78 · R21: 08.50..08.53 | |

**Job → TC** (thành công / lỗi tạm / lỗi cuối)

| Job | Thành công | Lỗi tạm | Lỗi cuối | Khác |
|---|---|---|---|---|
| J-04 (theo shop) | TC-05.62 | TC-05.63 | TC-05.64 | 05.65 ngân sách, 05.66 khóa, N3.06 |
| J-05 | TC-05.95 | — | TC-05.94 (không shop trả lời) | |
| J-06 (theo shop) | TC-05.78 | TC-05.79 | TC-05.80 | |
| J-12 (theo grant) | TC-05.81 | TC-05.82 | TC-05.83 | 05.84 shop đã ngắt |
| J-13 (theo shop) | TC-05.85 | TC-05.86 (1) | TC-05.86 (2) | 05.87 |
| J-20 | TC-02.60 | TC-02.62 | TC-02.63, 02.64 | 02.66 lượt treo, ST3.09 |
| J-21 | TC-02.67 | — | — | 02.68, 02.83, MG3.20 |
| J-22 | TC-02.67 | TC-02.73, 02.96 | TC-02.74 | 02.69..02.72, 02.75..02.81 |
| J-23 | TC-02.84 | — | — | 02.85..02.89, 02.93 |
| J-24 | TC-07.45 | — | TC-07.52, 07.53 | 07.55, 07.66 |
| J-25 | TC-07.60, 07.63 | TC-07.65 (chờ mạng) | — | 07.54 |
| J-26 | TC-06.50..06.58 | — | — | 06.71 |
| J-27 | TC-06.60..06.63 | TC-06.64, 06.67 | TC-06.65 | 06.66 |
| J-28 | TC-06.59 | — | — | |
| J-01, J-02, J-11, J-16 (mở rộng) | MS.04, 08.62, MS.05, 08.41 | — | — | MS.06, MS.09, 08.47, R3.05 |

**Mã lỗi API mới → TC:** `PLATFORM_NOT_CONFIGURED` 05.57, 05.59 · `SYNC_IN_PROGRESS` 05.59 · `CANCEL_REQUIRES_SUPERVISOR` 04.61..04.63, 04.65 · `VALIDATION_ERROR` (`reason_code`, `note`) 04.69, 04.70, 08.53 · ALERT `ORDER_CANCEL_REQUESTED` 03.85, 03.86 · `OPERATOR_REQUIRED` (PACK) 03.93 · `RETURN_MULTIPLE_ORDERS` 04.74, 04.76, 04.77 · `SESSION_NOT_ELIGIBLE`, `CLAIM_CLOSED`, `VERSION_CONFLICT` 08.53, 08.58 · `FORBIDDEN` (gỡ lý do hủy) 08.55 · `REPORT_TIMEOUT` 09.42 · kỳ báo cáo 09.37 · `SESSION_CLIP_UNAVAILABLE` 07.50, MS.07 · `CLOUD_NOT_CONFIGURED` 07.51 · `SHARE_NOT_ACTIVE` 07.61 · `CHANNEL_NAME_EXISTS` 06.42 · `PROVIDER_NOT_CONFIGURED` 06.43 · `NOTIFY_SEND_FAILED`, `NOTIFY_TIMEOUT` 06.45 · `BACKUP_NOT_CONFIGURED` 02.50 · `BACKUP_KEY_UNCONFIRMED` 02.57, 02.92 · `BACKUP_KEY_MISMATCH` 02.56 · `BACKUP_RUNNING` 02.65 · `BACKUP_RESTORE_UNVERIFIED` KR.11, 02.92 · `BACKUP_ISSUE_RESOLVED`, `BACKUP_ISSUE_ACTION_INVALID` 02.72, 02.80 · `BACKUP_DISABLED` 02.59 · `CLOUD_AUTH_FAILED`, `CLOUD_ERROR`, `CLOUD_UNREACHABLE` 02.54 · `CLIP_NOT_READY` / `CLIP_NOT_FAILED` (`MISSING`) MS.01..MS.03.

**Trạng thái → TC:** link ST3.01 · tin thông báo ST3.02 · `backup.state` ST3.03 · `backup_object` ST3.04 · clip / ảnh `MISSING` ST3.05 · phiên RETURN ST3.06 · kết nối shop ST3.07 · nhóm trạng thái đơn → kiện ST3.08 · `backup_run` ST3.09.

**NFR → TC:** NFR-01 N3.01, N3.02 · NFR-28 N3.03 · NFR-37 N3.04 · NFR-38 N3.05 · NFR-39 N3.06 · NFR-40 N3.07 · NFR-41 N3.08 · NFR-42 N3.09 · NFR-43 N3.10 · NFR-44 N3.11 · NFR-45 N3.12 · NFR-46 N3.13.

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt | Ngày |
|---|---|---|---|---|---|
| DEC-535 | CP7 — duyệt bộ test case item 03 | **Ready**: 378 case (328 chức năng, 14 tài nguyên ngoài X3, 22 phân quyền, 14 NFR), 210 P1; 14 case X3 dự kiến "chưa test — thiếu tài nguyên"; dữ liệu `seed-demo` Phase 3 cần xác nhận khi T-211 / T-229 xong | Phủ đủ FR mức M, AC-40..62, BR, EX, trạng thái, mã lỗi, ma trận quyền 4 vai, job tách theo shop, NFR, migration (gồm G2R3-1), hồi quy | khanhtt (QA, tự quyết theo ủy quyền user) | 2026-10-07 |
| DEC-538 | Đánh số + chiến lược QA item 03 | ID nối tiếp không trùng item 01 / 02: M05 `.50+`, M03 `.80+`, M04 `.60+`, M08 `.40+`, M02 `.50+`, M06 `.40+`, M07 `.40+`, M09 `.30+`, M10 `.40+`; nhóm mới `KR` (khôi phục), `MS` (thiếu tệp), `ST3`, `MG3`, `R3`, `X3`, `P3`, `N3`; cột **Cách** thêm `UNIT`, `CLI`, `EXT`; KQ để trống tới bước 11. Biên BR-37: kiểm theo SRS "≤ 60 giây" ở server (60,0 giây được — TC-04.61), FE ẩn nút từ 60,0 giây (02b-station `cancelRule`) — chấp nhận lệch 1 nhịp phía an toàn, ghi *Phản hồi* | Mỗi case chạy lại được; tách rõ phần cần tài nguyên ngoài; không nhầm ID với item trước | khanhtt (QA, tự quyết theo ủy quyền user) | 2026-10-07 |

## Chốt G4

Điền ở bước 11 (`ai-qa-run-tests`).

- [ ] Mọi AC và FR mức M có ≥ 1 TC pass, có bằng chứng
- [ ] Ma trận quyền đã chạy (TC-P3.01..P3.22, 4 vai, gọi API trực tiếp)
- [ ] NFR có ngưỡng đã đo (TC-N3.01..N3.14; phần máy kho ở X3 có DEC chấp nhận)
- [ ] Bug Critical/High = 0 (hoặc có DEC chấp nhận)
- [ ] Regression vùng bị chạm đã chạy (TC-R3.01..R3.12)
- [ ] Migration lên / xuống / lên + nâng cấp lại (TC-MG3.01..MG3.20) đã chạy trên bản sao DB Phase 2
