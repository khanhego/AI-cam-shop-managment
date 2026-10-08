# 03-expansion-tiktok — Release

| | |
|---|---|
| Owner (Ops) | khanhtt |
| Reviewer | Chủ sản phẩm (duyệt G5) |
| Trạng thái | Ready (staging local) — **chờ duyệt G5** (Ops đề xuất ✅ có điều kiện — DEC-997). Chưa deploy kho |
| Test report | [04a-test-report.md](04a-test-report.md) (G4 ✅ có điều kiện — DEC-990) |
| Môi trường đích | Staging local trên máy dev: `docker compose -p aicam-staging -f ai-cam-be/docker/compose.yml -f <tmp>/staging-extra.yml`. Chưa có server kho (DEC-56) |
| Last update | 2026-10-08 · Ops |

> **TL;DR** — Phase 3 (TikTok Shop, báo cáo, sao lưu cloud, link chia sẻ, thông báo) chạy được trên compose production ở staging local.
> Đã nâng cấp từ stack Phase 2 có dữ liệu (code `main`) theo `docs/ops.md` §7.2: migration 0005 → 0007 mất khoảng 3 giây (tính cả khởi động container), `fix-cancel-requests` trả lại 2 kiện hủy oan.
> Dữ liệu và tệp bằng chứng Phase 2 còn nguyên; mọi bảng lệch đều có lý do. Smoke qua Caddy: API 47/47 ✓; 14 lượt mở trang FE (Admin, CSKH) + station + W1 không lỗi console, không lỗi CSP.
> Đã kiểm: sao lưu cloud J-20 / J-21 / J-22 lên MinIO (bản mã), khôi phục vào DB tạm rồi `backup-verify` ĐẠT, link chia sẻ J-24 → W1 → thu hồi J-25 trong 3 giây.
> Khôi phục `pg_restore` trên 0007: 38/38 bảng khớp. Lùi 0007 → 0005 (2 điều kiện từ chối + cờ tách), chạy Phase 2, rồi nâng cấp lại: bằng chứng y hệt.
> Lỗi mới: **BUG-G5-P3-1 (Low, FE)** — báo cáo hiện "undefined · null" ở khối "Theo sàn / shop". Chưa sửa vì là code sản phẩm. Một chỗ thiếu trong runbook đã sửa ở `ops.md` (BE `170b4f3`).
> Chưa test (thiếu tài nguyên): TikTok / Shopee thật, gửi thông báo thật, nhà cung cấp S3 thật, camera thật, server kho. Go-live chờ §7.
> Rollback: sao lưu → thu hồi link → dừng 9 service → `alembic downgrade 0005` bằng image Phase 3 → chạy image Phase 2 (§5).

<!-- Đối tượng đọc: ops và chủ sản phẩm. Log thật ở evidence/g5/. Ops không tick G5. -->

---

## 1. Nội dung release

| Hạng mục | Chi tiết |
|---|---|
| Version / tag | Chưa gắn tag (DEC-56). `/healthz` vẫn trả `version 0.1.0`, như Phase 1 và Phase 2 (OBS-G5-P3-3) |
| Commit | BE `ai-cam-be` **`cc5dddf`**, FE `ai-cam-fe` **`e893a36`**, cùng nhánh `feat/03-expansion-tiktok`. Sửa trong G5: BE `170b4f3` (chỉ đổi `docs/ops.md`) |
| Bản trước (Phase 2) | BE `f7010d3` (merge PR #2), FE `1f214a1` (`main`) |
| Migration / thay đổi dữ liệu | `0006`: thêm 9 bảng và cột mới, backfill nhóm trạng thái / `submitted_at` / phiên hoàn trước. `0007`: unique theo shop. Cả hai chạy trong một transaction. Downgrade đẩy dữ liệu sang `phase3_archive` (02 §10). Sau migrate chạy `aicam fix-cancel-requests` (BR-21) |
| Config / secret / flag | Khối Phase 3 trong `.env.production.example`, để trống thì tính năng đó ở trạng thái "chưa cấu hình". Biến mới: `S3_*`, `BACKUP_ENCRYPTION_KEY` (+ `BACKUP_OLD_KEYS`), `TIKTOK_*`, `TELEGRAM_BOT_TOKEN`, `ZALO_*`, `NOTIFY_*`. Production chặn mock: `TIKTOK_ADAPTER`, `NOTIFY_TRANSPORT`, `PLATFORM_ADAPTER`; `S3_PUBLIC_ENDPOINT` phải `https://` và không trỏ localhost |
| Service mới | `worker-sync-long` (queue `sync`), `worker-backup` (`backup`), `worker-notify` (`notify`). `worker-sync` chuyển sang nghe `sync_fast` |
| Phụ thuộc release khác | BE và FE phải đi cùng cặp commit trên. Hash CSP của script theme trong `dist/index.html` vẫn là `sha256-wMAAS9…TZU=`, khớp `docker/Caddyfile` |

## 2. Tiền kiểm

| Kiểm | KQ | Bằng chứng |
|---|:-:|---|
| G4 ✅ | ✅ có điều kiện | `00-status` G4, DEC-990. 378 case: ✅ 359 · ❌ 0 · ⛔ 16 · ⬜ 3. Bug mở 0 |
| Lint / test xanh trên commit release | ✅ (theo G4) | 04a §5, §7: BE `uv run pytest` đầy đủ xanh, FE vitest / tsc / eslint xanh. G5 chỉ chạy `pnpm build` (✅) và build image, không chạy lại test. Chưa có CI |
| Migration chạy thử ở staging + có down | ✅ | §4.1 nâng cấp, §5 lùi và nâng cấp lại, trên stack thật có tệp video |
| Sao lưu + **thử khôi phục** | ✅ | `pg_restore` 38/38 bảng khớp (§4.3). Cloud: `backup-restore` vào DB tạm + `backup-verify` ĐẠT (§4.2 P6) |
| Config / secret ở đích | ⚠️ staging | `.env` tạm, secret sinh bằng `openssl rand`, khóa sao lưu sinh bằng `aicam backup-keygen`. File `chmod 600`, nằm ở `/Users/admin/KhanhCode/.aicam-g5-tmp`, không commit, đã xoá. Server kho chưa có |
| Hash CSP khớp FE build | ✅ | Giống Phase 2 (`csphash` trên `dist/index.html` của cả hai bản FE) |
| Release note | ✅ | §6 |

## 3. Kế hoạch & log deploy (staging local)

Thứ tự theo `docs/ops.md` §7.2: dựng Phase 2 → tạo dữ liệu → nâng cấp → bật dần → smoke → sao lưu / khôi phục → lùi → chạy Phase 2 → nâng cấp lại → kiểm log → dọn.

**Bí danh lệnh** (cùng project, cùng volume, cùng secret):

| Bí danh | Compose | Image | FE |
|---|---|---|---|
| `dc2` | worktree `main` | `aicam-be:staging-p2` | `1f214a1` |
| `dc3` | repo, nhánh `feat/03` | `aicam-be:staging-p3` | `e893a36` |
| `dc3b` | compose Phase 3 | image Phase 2 | FE Phase 2 (đúng ops §7.2 bước 6 khi lùi) |

**Cổng, mạng:** Caddy 8088 / 8443, ICE 8190, s3proxy 8944; subnet `172.30.20.0/24`, Caddy ở `.10`, `ip_range .128/25`. Không trùng cổng với `aicam-dev` (8180 / 8189 / 59000).

**Giả lập** — file `staging-extra.yml`, không phải compose sản phẩm (DEC-991, DEC-992):

| Service | Giả lập cho |
|---|---|
| `minio` + `minio-init` | Nhà cung cấp S3 (Q20). Tạo 2 bucket, bật versioning, cấp khóa ứng dụng theo `s3-policy.example.json` |
| `s3proxy` | HTTPS công khai của nhà cung cấp: Caddy `tls internal` cho `s3.aicam-staging.test:8944` |
| `camsrc` + `fake-cam1/2` | Camera IP (T-4) |

Khác Phase 2: lần này **không** đọc RTSP từ stack dev.

| Bước | Lệnh / thao tác | KQ | Giờ (2026-10-08) |
|---|---|---|---|
| 0 | `df -h /` còn 24 GiB, đang cắm sạc, nắp mở. Worktree `main` BE + FE. `pnpm build` cho FE Phase 2 và Phase 3 | ✓ | 13:17 |
| 1 | `dc2 up -d --build`: build 10,5 phút, `migrate` 0001 → 0005, đủ 19 service, healthz 200 | ✓ | 13:20–13:31 |
| 2 | Tạo dữ liệu Phase 2 qua API (§4.1 U0) | ✓ | 13:31–13:44 |
| 3 | Sao lưu (`pg-backup.sh once`). Build image Phase 3. Thử `schema_guard` của 9 service trên DB 0005 | ✓ api thoát mã 3; 8 service còn lại thoát mã 78 | 13:46 |
| 4 | §7.2 bước 3–8: dừng 6 service → đếm kết nối = 0 → `current` 0005 → `upgrade head` → 0007 → VACUUM → `fix-cancel-requests` chạy thử / `--apply` / chạy lại → `dc3 up -d` | ✓ migrate khoảng 3 giây (tính cả khởi động container); backfill 0,2 giây | 13:47 |
| 5 | Bật dần sao lưu cloud + link: `S3_*`, `BACKUP_ENCRYPTION_KEY` → `dc3 up -d` | ✓ | 13:49 |
| 6 | Smoke Phase 3 (§4.2) | ✓ 47/47 API; FE 0 lỗi; xem BUG-G5-P3-1 | 13:51–14:00 |
| 7 | Sao lưu + khôi phục `pg` trên 0007 (§4.3) | ✓ 38/38 | 14:00 |
| 8 | Lùi về Phase 2 → chạy Phase 2 → nâng cấp lại (§5) | ✓, lộ OBS-G5-P3-1 (runbook) | 14:02–14:08 |
| 9 | Kiểm log lộ secret (§4.2 S-LOG) | ✓ | 14:09–14:11 |
| 10 | Dọn (§3.1) | ✓ | 14:12–14:15 |

### 3.1 Dọn

- `dc3 down -v --remove-orphans` xoá 22 container, 8 volume `aicam-staging_*` và network. Sau đó không còn gì của `aicam-staging`. Volume `aicam-staging_vrestore` (thư mục khôi phục tạm) đã xoá ngay sau P6. Có 1 volume ẩn danh rỗng sinh ra lúc 13:29:59 (container `backup` dùng image postgres); đã xoá. Số volume ẩn danh về lại 10 như trước G5.
- Xoá image `aicam-be:staging-p2`, `aicam-be:staging-p3`, `aicam-fakecam:staging`. Prune có lọc theo nhãn project `aicam-staging`; không prune toàn máy.
- `git worktree remove` 2 worktree `main`, rồi `prune`. Worktree `.aicam-m14-build` có từ trước, không phải của G5 này.
- Xoá thư mục `/Users/admin/KhanhCode/.aicam-g5-tmp`: các file `.env` (p2 / p3 / p3b), khóa sao lưu, `pw.json`, 5 bản sao lưu staging, URL W1.
- `aicam-dev`: không đụng. 13 container vẫn Up 19 giờ, 4 volume `aicam-dev_*` còn đủ. Không gọi `:8180`. FE dev 5190 → 200, 5191 → 200.
- Máy chuyển từ sạc sang pin trong lúc chạy; nắp mở suốt nên lượt chạy hợp lệ.

Log: [`evidence/g5/07-teardown.txt`](evidence/g5/07-teardown.txt).

## 4. Hậu kiểm

### 4.1 Nâng cấp từ Phase 2 có dữ liệu

| # | Kiểm | Cách | KQ |
|---|---|---|:-:|
| U0 | Dữ liệu Phase 2, tạo bằng code `main` | Qua API: 4 tài khoản, station `BOTH` + 2 camera, nhập CSV 6 đơn, **6 phiên PACK** (12 clip READY từ fake-cam). Hàng hoàn: `HH-000001` "Hộp rỗng" có 2 ảnh, tự tạo `KN-000001`; `HH-000002` OK; `HH-000003` bị hủy "Quét nhầm". `KN-000002` tạo tay, đã `SUBMITTED`. 1 gói bằng chứng zip 41 MB, 1 bản xuất. Đơn sàn giả lập (DEC-993): 1 shop Shopee + 3 đơn ghi qua `upsert_platform_order` của Phase 2 → `IN_CANCEL` biến 2 kiện thành `CANCELLED` / `CANCELLED_AFTER_PACK` | ✓ |
| U1 | `schema_guard` trước migrate | `dc3 run --no-deps <svc>` trên DB 0005 | ✓ cả 9 service thoát và log `schema_version_mismatch db_revision=0005 image_head=0007`. api mã 3, còn lại mã 78 |
| U2 | Thứ tự §7.2 | Đếm kết nối trước migrate | ✓ 0 kết nối |
| U3 | Migration | `upgrade head` | ✓ Log `0006: backfill {order_group 3, shop_grant_ref 1, claim_submitted_audit 1, cancel_revert_candidates 2, …}`, cảnh báo 2 kiện hủy oan. `current` = 0007 |
| U4 | `fix-cancel-requests` | Chạy thử → `--apply` → chạy lại | ✓ Chạy thử in "SẼ TRẢ LẠI" SPXSTG0000011 (`CANCELLED → NEW`) và SPXSTG0000012 (`CANCELLED_AFTER_PACK → PACKED`). `--apply` ghi 2 dòng audit `PACKAGE_CANCEL_REVERT`. Chạy lại in "sẽ trả lại 0". Đơn hủy thật (SPXSTG0000013) không bị đụng. Mã thoát 0 |
| U5 | Số dòng + md5 của **29 bảng Phase 2** theo đúng cột Phase 2, trước / sau | `digest.py`, rồi khôi phục bản sao lưu trước nâng cấp vào DB tạm để so từng dòng | ✓ 23/29 bảng y hệt. 6 bảng lệch, đều có lý do: `alembic_version`; `audit_log` +2 (26 dòng cũ khớp); `package` chỉ đổi 2 kiện của U4 (7 kiện còn lại khớp); `status_history` +2 (30 dòng cũ khớp); `camera` chỉ đổi `last_seen_at` / `status`; `video_segment` có đoạn mới (26 dòng cũ khớp) |
| U6 | Tệp bằng chứng | sha256 từng tệp `clips/`, `snapshots/` | ✓ 18 clip + 8 ảnh, khớp trước / sau |
| U7 | Service mới | `dc3 ps` | ✓ api healthy; `worker-sync-long`, `worker-backup`, `worker-notify` Up; mọi service chạy image p3 |

Log: [`01-phase2-up.txt`](evidence/g5/01-phase2-up.txt), [`02-upgrade-p2-to-p3.txt`](evidence/g5/02-upgrade-p2-to-p3.txt).

### 4.2 Smoke Phase 3 (qua Caddy `https://localhost:8443`)

Cấu hình: `APP_ENV=production`, `PLATFORM_ADAPTER=shopee`, `SHOPEE_ENABLED=false`, `TIKTOK_ENABLED=false`, `NOTIFY_TRANSPORT=real` (không có token), S3 = MinIO giả lập.

| # | Kiểm | KQ |
|---|---|:-:|
| P1 | healthz qua Caddy; HTTP → HTTPS 308; `/admin/reports` trả `index.html` với `no-cache`, CSP, DENY; asset `immutable`; `*.map` → 404 | ✓ |
| P2 | Đăng nhập 4 vai bằng tài khoản tạo ở Phase 2; `/me` đúng vai | ✓ |
| P3 | Dữ liệu Phase 2 trên Phase 3: kiện PACK + RETURN, clip phát được (206), hồ sơ + bằng chứng (BR-39: đúng 1 phiên chính), 3 hồ sơ hàng hoàn. `submitted_at` backfill cho KN-000002 (kiểm ở DB vì cột chỉ đọc) | ✓ |
| P4 | **D7 Kết nối sàn**: API-70 trả `platforms[]` Shopee + TikTok `configured=false`. API-71 auth-url → 503 `PLATFORM_NOT_CONFIGURED` cho cả hai sàn. API-156 CSKH 200; `/shops` với SUPERVISOR → 403. API-155 callback `state` sai → 302 trang lỗi | ✓ |
| P4′ | Kết nối Shopee / TikTok thật: ủy quyền, đồng bộ, nhiều shop, tra sàn khi quét | **chưa test** — production chặn adapter mock, chưa có partner (Q18 / Q19 / T-3). Đã pass bằng mock ở G4 |
| P5 | **Báo cáo API-150..153**: quyền đúng ma trận (CSKH không xem được năng suất, STATION 403); kỳ > 366 ngày → 422. Xuất 3 CSV: có BOM UTF-8, phân cách `;`, đọc được bằng `csv`, dưới 0,02 giây | ✓ |
| P5′ | CSV mở bằng Excel Windows vi-VN | **chưa test** — máy dev là macOS (AC-47 ⚠️) |
| P6 | **Sao lưu cloud**. Bật khi chưa xác nhận khóa → 409; dấu vân tay sai → 409; SUPERVISOR → 403; vân tay đúng (`A230-947D-47BC-2A4D`, khớp dòng in của `backup-keygen`) → bật `ON`. API-183 kiểm kết nối 34 ms. **J-20** trên `worker-backup`: `SUCCESS` 266 KB, gọi lại khi đang chạy → 409. **J-21 / J-22**: 10 clip + 5 ảnh của hồ sơ lên `backup/evidence/`, cùng `db/…dump.enc` và `imports/…tgz.enc`; đầu tệp `AICAMENC` + byte phiên bản `0x01`. Khóa ứng dụng thử `DeleteObjectVersion` và `PutBucketVersioning` → cả hai `AccessDenied` (RK-28). `backup-restore --list` liệt kê bản hoàn tất. **Khôi phục vào DB tạm + volume video tạm**: tải 15 / thiếu 11 (clip không phải bằng chứng, không có bản cloud) / lỗi 0, trong 1 giây. **`backup-verify`**: khớp 15 / thiếu đã ghi nhận 11 / lệch 0 → ĐẠT | ✓ |
| P6′ | Nhà cung cấp S3 thật (URL ký 7 ngày, `text/html` inline, lifecycle, tốc độ, nơi đặt dữ liệu theo NĐ 13) | **chưa test** — Q20; MinIO là giả lập |
| P7 | **Link chia sẻ từ hồ sơ có video thật** (KN-000001, nguồn `CLAIM`, 2 phiên). **J-24** (ffmpeg trên `worker-export`) → `ACTIVE` sau 6 giây, URL `https://s3.aicam-staging.test:8944/aicam-stg-share/share/[token]/index.html`. **W1** mở thẳng từ MinIO, không cookie: 200 `text/html`, có CSP. Video tải được, SHA-256 khớp, H.264 2560×720 dài 16 giây. Ảnh JPEG tải được. Bỏ chữ ký → 403. API-161 có số theo trạng thái. **Thu hồi** (API-163 → J-25): W1 404 sau 3 giây | ✓ |
| P8 | **Quét nhầm + API-160 409**: phiên mở hoàn bị hủy "Quét nhầm" ở Phase 2. API-164 trả `evidence_exclusion=STATION_CANCEL`; API-160 → 409 `SESSION_EXCLUDED`, không tạo link. Phiên PACK cùng kiện → 202 | ✓ |
| P9 | **Thông báo D22**: API-170 `providers` Telegram / Zalo `configured=false`, 10 sự kiện. API-171 → 409 `PROVIDER_NOT_CONFIGURED`; SUPERVISOR → 403. API-176 giờ yên lặng 200; API-175 200 | ✓ |
| P9′ | Gửi thật qua Telegram / Zalo OA | **chưa test** — Q21; production cấm `NOTIFY_TRANSPORT=mock` |
| P10 | **FE** (Chromium qua Caddy). Admin: `/admin`, `/admin/reports`, `/admin/shares`, `/admin/settings/platforms` (và `/settings/shopee` chuyển hướng), `/notifications`, `/backup` (hiện đúng vân tay), chi tiết hồ sơ, chi tiết kiện, `/returns`, `/recon`, `/storage`. CSKH: `/reports`; `/settings/backup` → `/forbidden`. Station đăng nhập được. **W1** trên Chromium không đăng nhập: video `readyState 4`, ảnh 1280 px | ✓ 0 lỗi console, 0 lỗi CSP |
| P11 | Validator production | ✓ api không khởi động khi đặt mock (TikTok / thông báo / Shopee), `S3_PUBLIC_ENDPOINT` dạng `http://` hoặc trỏ localhost, hai bucket trùng tên |
| P12 | Beat: lịch J-20 (0, 6, 12, 18 UTC = 7, 13, 19, 1 giờ VN), J-21..J-28 có trong image. Beat đã thật sự gửi J-21, J-22, J-25, J-26, J-27 | ✓ |
| S-LOG | Log 15 service (893 dòng, sau khi sinh lại lưu lượng có link / sao lưu / huỷ tải): giá trị 7 secret, mật khẩu 4 tài khoản, token 2 link đều xuất hiện **0 lần**. Không có `sig=` / `token=` chưa che, không có `X-Amz-Signature` / `Credential`, không có `share/<token>`, không có `Bearer`. Caddy ghi `sig=REDACTED`. Lệnh kiểm nhanh trong ops §8 → 0 dòng | ✓ (log của các container trước khi tạo lại thì Docker đã xoá, không quét được) |
| S-NET | Chỉ publish Caddy 8088 / 8443, ICE 8190 và s3proxy 8944 (s3proxy là giả lập). api / postgres / redis / minio không publish | ✓ |

Log: [`03-smoke-p3.txt`](evidence/g5/03-smoke-p3.txt), [`06-logs-secrets.txt`](evidence/g5/06-logs-secrets.txt). Lượt đầu, script có 5 ✗ (P3c, P3d, P5b ×3) và P6e / P6f bị đánh sai. Tất cả do kỳ vọng sai trong script, đã ghi lý do trong log; sản phẩm không sửa gì.

### 4.3 Sao lưu và khôi phục `pg` (schema 0007)

| Bước | Cách | KQ |
|---|---|:-:|
| B1 | `dc3 exec backup /bin/sh /pg-backup.sh once` | ✓ `backup_ok`, ra `.dump` + `imports-….tgz`, quyền `600` |
| B2 | Đọc số dòng + md5 nội dung mọi bảng ngay sau khi dump | ✓ |
| B3 | `createdb aicam_restore_test` + `pg_restore --no-owner` | ✓ mã thoát 0, 1 giây |
| B4 | So **38 bảng**: gốc với bản khôi phục | ✓ **38/38 khớp** số dòng và md5. `alembic_version` = 0007. Không có `phase3_archive`. 3 sequence mã hồ sơ giống gốc |
| B5 | Xoá DB tạm | ✓ |

Log: [`04-backup-restore-p3.txt`](evidence/g5/04-backup-restore-p3.txt). Khôi phục từ cloud: xem P6.

### 4.4 Lỗi và quan sát phát hiện ở G5

| ID | Mức | Hiện tượng | Tái hiện | Xử lý |
|---|:-:|---|---|---|
| **BUG-G5-P3-1** | Low (FE, code sản phẩm) | D20, tab Hàng hoàn và tab Khiếu nại, khối "Theo sàn / shop" hiện **"undefined · null"** với kiện không có shop, tức đơn nhập CSV — cách nhập chính khi chưa có partner. File CSV xuất ra thì ghi đúng `(Không có shop)`. Số liệu đúng, chỉ sai chữ hiển thị | Nhập đơn CSV → đóng gói → bàn giao → nhận hoàn → mở `/admin/reports`. Code: `ReturnsReportView.tsx:132`, `ClaimsReportView.tsx:121` ghép `${PLATFORM_SHORT[r.platform]} · ${r.shop_name}`, không xử lý `platform` / `shop_name` null | **DỪNG, chưa sửa** (luật: lỗi code sản phẩm thì báo lại). Đề xuất FE: dùng chữ giống CSV ("Không có shop"), thêm test. Nên sửa trước go-live (DEC-995) |
| **OBS-G5-P3-1** | Medium (runbook) | Bước 6 của phần lùi chạy compose Phase 3 với image Phase 2. Khi đó `worker-sync-long`, `worker-backup`, `worker-notify` vẫn chạy image Phase 2; `worker-sync-long` nhận queue `sync` (J-04 / J-06 / J-13 của Phase 2). Nhưng bước 3 của "Nâng cấp" chỉ dừng 6 service. Ở kho có Shopee thật, J-06 Phase 2 có thể ghi DB trong lúc migrate, mà phép đếm kết nối chỉ chụp một thời điểm | Lùi theo ops → dừng đúng 6 service như ops ghi → 3 container p2 vẫn Up | **Đã sửa** `ops.md` §7.2 (BE `170b4f3`): bước 3 dừng đủ 9 service; ghi chú thêm ở mục "Nâng cấp lại". Đã thử: `docker compose stop` một service chưa tạo trả mã 0, nên lần nâng cấp đầu không lỗi (DEC-994) |
| OBS-G5-P3-2 | Low (tài liệu) | §7.2 ghi image Phase 3 "thoát mã 78"; thực tế api thoát mã 3, giống OBS-1 của Phase 2 | U1 | Đã sửa câu chữ trong `170b4f3` |
| OBS-G5-P3-3 | Low | `/healthz` vẫn `0.1.0`, nên lúc hậu kiểm không phân biệt được Phase 2 với Phase 3. OBS-2 của Phase 2 vẫn mở | — | Đề xuất tăng `version` lên `0.3.0` và gắn tag `v0.3.0` khi merge `main` |
| OBS-G5-P3-4 | Low (BE, backlog) | Khác 0004, migration 0006 không tự từ chối khi còn kết nối của service cũ; an toàn chỉ dựa vào bước 3 + phép đếm kết nối của runbook. G5 **không** thử chạy sai thứ tự vì nếu thử, DB sẽ bị nâng cấp thật | — | Đề xuất BE thêm kiểm `pg_stat_activity` giống 0004 (Phase 3.1) |
| OBS-G5-P3-5 | Nit (vận hành) | `backup-restore` vào DB tạm vẫn giải nén file nhập vào `IMPORT_ROOT` của container (ở staging là volume thật). Lần này 0 file được ghi vì lệnh không ghi đè | P6 | Khi diễn tập trên máy đang chạy, đặt thêm `-e IMPORT_ROOT=<thư mục tạm>` |
| OBS-G5-P3-6 | Nit | Lần nâng cấp tạo lại container `mediamtx` (cấu hình compose đổi), nên camera ngừng ghi vài giây | Bước 4 | Đúng thiết kế, vì nâng cấp làm ngoài giờ |

## 5. Rollback

**Điều kiện kích hoạt** (sau nâng cấp ở kho):
- api không healthy sau 2 phút.
- `migrate` thoát mã khác 0.
- Quét ở bàn đóng gói / bàn hoàn bị lỗi, hoặc p95 API-11 > 1 giây.
- Clip `FAILED` hàng loạt.
- Ưu tiên sửa tiến (02 §10).

**Điều kiện từ chối downgrade:** mã đơn trùng giữa các shop (không lùi được, phải sửa tiến), link đang hoạt động, đơn ngoài, kiểm tập con bằng chứng thiếu.

**Các bước** (`docs/ops.md` §7.2 "Lùi về Phase 2"), kèm kết quả đã chạy trên staging. Dữ liệu chuẩn bị trước: 1 đơn TikTok giả lập đã PACKED (clip thật), 1 link ACTIVE, KN-000003 với `deadline_source=DEFAULT_PLATFORM_PASSED` (đặt bằng SQL — EV-1, DEC-993), 1 ảnh đã bỏ mềm khỏi KN-000001 (BR-38).

| # | Bước | Đã thử |
|---|---|---|
| 1 | `pg-backup.sh once` | ✓ |
| 2 | Thu hồi link | Cố ý chưa thu hồi để thử điều kiện từ chối: downgrade **từ chối** ("còn 1 link chia sẻ đang tạo / đang hoạt động … Không có gì bị thay đổi"), mã 1, DB vẫn 0007. Sau đó thu hồi qua API-163 → W1 404 sau 3 giây ✓ |
| 3 | Dừng 9 service | ✓ 9 Stopped, 0 kết nối |
| 4 | `alembic current` bằng image Phase 3 | ✓ 0007 |
| 5 | `downgrade 0005` | **Từ chối** ("còn kiện của đơn TikTok / shop Shopee sẽ bị ngắt (PACKED: 1)"), mã 1, DB vẫn 0007 ✓ |
| 5b | `-e AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS=1 … downgrade 0005` | ✓ trong 2 giây. Log: `phase3_archive {share_link 2, backup_object 17, tiktok_shops 1, claim_deadline_cols 1, …}`; `1 dòng bằng chứng đã bỏ … → 1 hồ sơ LEGACY_HOLD đã đóng`; `\|B\| = 1, được bảo vệ sau = 12 clip + 6 ảnh, thiếu = 0`; `tách 1 kiện của đơn ngoài`; `1 hồ sơ … DEFAULT_PLATFORM_PASSED → DEFAULT (G3-EV-1)`; `xóa 1 shop TikTok`. `current` = 0005; `phase3_archive` có 26 bảng |
| 6 | `AICAM_IMAGE=<Phase 2> dc up -d` + FE Phase 2 | ✓ `migrate` Phase 2 không làm gì, healthz 200, FE Phase 2 (`index-phMxIoGg.js`). Đăng nhập 4 vai; mở được **cả 4 hồ sơ** bằng API-132 Phase 2, kể cả KN-000003 (EV-1: `deadline_source=DEFAULT`, không lỗi serialize) và KN-000004 "Bằng chứng đã bỏ" (CLOSED). Kiện TikTok giữ PACKED nhưng `order=None`; clip phát 206. FE Phase 2 qua Chromium mở KN-000003 / KN-000004, 0 lỗi console. Worker p2 không nhận task lạ |
| 7 | Nâng cấp lại lên Phase 3 | ✓ sau khi dừng thêm 3 worker (OBS-G5-P3-1). Log `0006: khôi phục từ phase3_archive {tiktok_shops 1, detached_reattached 1, removed_evidence_reinserted 1, legacy_hold_claims_dropped 1, claim_deadline_cols 1, share_link 2, backup_object 17, …}`. Có cảnh báo `UNKNOWN AWAITING_SHIPMENT`, đúng như ops đã ghi. `phase3_archive` bị xoá. So với mốc trước khi lùi: **34/38 bảng y hệt**. 4 bảng lệch đều có lý do: `audit_log` / `refresh_token` có dòng mới do đăng nhập và thu hồi (dòng cũ khớp); `share_link` là link được thu hồi ở bước 2; `video_segment` có đoạn mới. **Tệp bằng chứng khớp** (20 clip + 9 ảnh). Shop TikTok, đơn gắn lại kiện, `DEFAULT_PLATFORM_PASSED`, ảnh đã bỏ đều trở về như trước. Smoke chỉ đọc chạy lại ✓ |
| 8 | Nặng hơn: khôi phục DB từ bản sao lưu ở bước 1 (ops §6) | Khôi phục vào DB tạm ✓ (§4.3, P6) |

Log: [`evidence/g5/05-rollback-p3-to-p2.txt`](evidence/g5/05-rollback-p3-to-p2.txt).

## 6. Giám sát sau nâng cấp ở kho

Theo `docs/ops.md` §8. Đã kiểm trên staging:
- `dc ps`: api healthy; 9 service ứng dụng Up, đều chạy image mới.
- `dc logs migrate`: có `0006: backfill {…}`; nếu có cảnh báo hủy oan thì chạy `fix-cancel-requests`.
- `dc logs api worker … | grep schema_version`: chỉ có `schema_version_ok revision=0007`.
- `dc logs beat`: J-21 mỗi 10 phút, J-22 mỗi 5 phút, J-25 mỗi phút, J-26 / J-27; J-20 chạy lúc 7, 13, 19, 1 giờ VN.
- D23: `ON`, lịch sử "Thành công"; `dc logs worker-backup | grep -E 'backup_db|backup_object'`.
- `dc logs api worker-sync worker-backup worker-notify caddy | grep -E 'token=|sig=|access_token=' | grep -v REDACTED` phải rỗng.
- `dc logs | grep -F "$BACKUP_ENCRYPTION_KEY"` phải rỗng.
- D20 mở được; theo dõi `report_built` > 3 giây.
- D21: không có link treo "Đang tạo" quá 10 phút.

## 7. Release note (cho người dùng)

**Hệ thống X — Phase 3 (mở rộng)**
- **TikTok Shop và nhiều shop** (Cài đặt → Kết nối sàn): kết nối nhiều shop Shopee và TikTok; đơn, kiện, hàng hoàn có nhãn sàn / shop. *TikTok chưa bật vì đang chờ tài khoản đối tác.*
- **Báo cáo** (`/admin/reports`): 3 tab Hàng hoàn, Khiếu nại, Năng suất; lọc theo kỳ, sàn, shop; xuất CSV mở được bằng Excel (dấu `;`).
- **Link chia sẻ bằng chứng** (`/admin/shares`, nút trên hồ sơ / kiện): tạo link video ghép 2 camera + ảnh để gửi sàn hoặc đơn vị vận chuyển. Người nhận mở bằng trình duyệt, không cần đăng nhập. Link có hạn 1 / 3 / 7 ngày và thu hồi được. Phiên bị hủy "Quét nhầm" không chia sẻ được.
- **Sao lưu cloud** (Cài đặt → Sao lưu): sao lưu DB mỗi 6 giờ, bằng chứng của hồ sơ trong ≤ 1 giờ, mã hóa trước khi gửi đi. Phải cất khóa giải mã ngoài máy kho.
- **Thông báo** (Cài đặt → Thông báo): gửi qua Telegram / Zalo OA cho các sự kiện cần xử lý, có giờ yên lặng. *Chờ IT cấu hình bot.*
- **Thay đổi:** kiện bị hủy oan khi người mua mới "yêu cầu hủy" được trả lại; từ nay kiện chỉ bị hủy khi sàn hủy thật. Station hủy phiên trong 60 giây đầu phải ghi lý do. Hồ sơ khiếu nại cho bỏ bằng chứng có lý do; bằng chứng đã bỏ vẫn được giữ tới hạn.

## 8. Việc còn lại trước go-live tại kho

Nguồn: 04a §6, 02 §10, §4.4. Chưa xong thì không go-live.

| # | Việc | Phụ thuộc | Tiêu chí |
|---|---|---|---|
| 1 | **Q13 + L14**: hạn khiếu nại thật từng sàn / loại (BR-27, BR-40, BR-42) | PO | Q13 đóng; cài đặt khớp |
| 2 | **Q18 / Q19 — TikTok Shop partner** (TC-X3.01..03, RK-16, RK-26 redirect `x.local`) → bật `TIKTOK_ENABLED` | TikTok duyệt app | TC pass trên tài khoản thật |
| 3 | **Q20 — nhà cung cấp S3 thật + NĐ 13** (nơi đặt dữ liệu): URL ký 7 ngày, `text/html` inline (RK-27), versioning + lifecycle + quyền (`DeleteObjectVersion` → AccessDenied), tốc độ tải; NFR-41 (TC-X3.05..07) | Chọn nhà cung cấp | Lặp lại P6 / P7 trên nhà cung cấp thật |
| 4 | **Q21 — kênh chat**: bot Telegram từ mạng kho, Zalo OA (TC-X3.08, 09) | IT | "Gửi thử" 200 |
| 5 | **T-3 Shopee partner thật** (nhiều shop, Shopee returns từ item 02) | Shopee | TC-X3.04 |
| 6 | **T-4 camera thật + máy quét** (TC-X3.14, NFR-45) | Thiết bị | Pass |
| 7 | **Server kho**: dựng theo ops §1–2; chạy §7.2 trên bản sao `pg_dump` DB production (TC-MG3.19); báo cáo / RTO / quét khi đang tải lên (TC-X3.11..13, NFR-44); locust N3.02 | Server | 04a §4 đạt trên phần cứng kho |
| 8 | **Điện thoại**: W1 + video ngoài mạng kho (TC-X3.10, AC-52) | Thiết bị | Pass |
| 9 | **WAN / mạng kho** (TC-X3.11, NFR-44) | Server + mạng | Pass |
| 10 | **Excel Windows vi-VN** mở CSV báo cáo (AC-47) | PO, máy kho | Mở đúng cột |
| 11 | **BK-6** (cảnh báo khi bucket sao lưu tắt versioning — DEC-875) và **MS-5** (đơn file trùng mã đơn sàn — DEC-876) | BE Phase 3.1 | Sửa, hoặc chấp nhận bằng DEC trước go-live |
| 12 | **BUG-G5-P3-1** (D20 "undefined · null") | FE `ai-dev-fix` | Hiện "Không có shop"; có test |
| 13 | Tăng `version` lên `0.3.0`, gắn tag `v0.3.0` hai repo sau khi merge `main` (OBS-G5-P3-3) | PR merge | `/healthz` = 0.3.0 |
| 14 | Chữ UI mới "chờ PO" (DEC-900..909, 934, 935) | PO | Duyệt |

## 9. Quyết định (DEC-991..997)

| ID | Vấn đề | Quyết định | Lý do · phương án bị loại | Người |
|---|---|---|---|---|
| DEC-991 | Dựng staging G5 khi `aicam-dev` đang được dùng | Project `aicam-staging`, compose production, cổng 8088 / 8443 / 8190 / 8944, subnet 172.30.20.0/24. Camera giả và MinIO chạy **trong** project qua `staging-extra.yml`; không đọc RTSP từ stack dev như Phase 2 | Không đụng stack đang test, dọn sạch bằng một lệnh `down -v`. Loại: dùng fake-cam / MinIO của `aicam-dev` | khanhtt (Ops, tự quyết theo ủy quyền user) |
| DEC-992 | Validator production đòi `S3_PUBLIC_ENDPOINT` là `https://` và không trỏ localhost | s3proxy (Caddy `tls internal`) với tên miền giả `s3.aicam-staging.test:8944`. Phân giải qua `curl --resolve` và `--host-resolver-rules` của Chromium | Giữ `APP_ENV=production` và validator nguyên vẹn. Loại: `APP_ENV=staging` hoặc tắt validator (không còn là cấu hình production). Đánh dấu giả lập Q20 |
| DEC-993 | Không có partner nên không sinh được đơn Shopee `IN_CANCEL`, đơn TikTok hay hạn sàn đã qua | Giả lập: chèn shop bằng SQL, rồi ghi đơn qua `orders.upsert_platform_order` **của chính code phase đó**, chạy trong container. `deadline_source=DEFAULT_PLATFORM_PASSED` đặt bằng SQL. Phiên, clip, ảnh, hồ sơ, link vẫn tạo bằng API thật | Phủ được `fix-cancel-requests`, điều kiện "đơn ngoài", cờ tách và EV-1 trên stack thật. Phần adapter sàn: chưa test |
| DEC-994 | Lỗ hổng runbook khi nâng cấp lại sau lùi (OBS-G5-P3-1) | Sửa `ops.md` §7.2 (chore(G5) BE `170b4f3`): bước 3 dừng đủ 9 service, kèm ghi chú ở mục "Nâng cấp lại"; sửa luôn câu "mã 78" → "api mã 3" | Sửa nhỏ, rõ, đúng phạm vi Ops. Đã thử `stop` service chưa tạo → mã 0 |
| DEC-995 | BUG-G5-P3-1 là code FE sản phẩm | Không sửa ở G5, báo lại; mức Low (chỉ sai chữ, CSV đúng). Không chặn G5 staging; chặn go-live (§8 #12) | Luật "lỗi code sản phẩm → DỪNG mục đó" |
| DEC-996 | Khôi phục cloud khi stack đang chạy | Chạy `backup-restore` / `backup-verify` với `-e DATABASE_URL` trỏ DB tạm, `VIDEO_ROOT` là volume tạm, `-u 0`; xoá DB và volume tạm ngay sau đó | Không ghi vào DB / video đang chạy. Lộ OBS-G5-P3-5 (`IMPORT_ROOT`) |
| DEC-997 | Đề xuất G5 | **Đề xuất G5 ✅ có điều kiện**: staging local đạt §10. Deploy kho chờ §8. Ops **không tick** `00-status`; chủ sản phẩm duyệt | Rollback / khôi phục đã chạy thật; lỗi mới chỉ ở mức Low |

## 10. Chốt G5

| Mục | KQ |
|---|:-:|
| G4 ✅ (có điều kiện, DEC-990) | ✅ |
| Commit release xác định, build FE / image BE được | ✅ BE `cc5dddf`, FE `e893a36` (+ `170b4f3` chỉ đổi ops.md) |
| Nâng cấp từ Phase 2 có dữ liệu, đúng ops §7.2 (dừng → 0006 / 0007 → `fix-cancel-requests` chạy thử / `--apply` → bật dần) | ✅ |
| `schema_guard`: 9 service image mới không chạy được trên DB 0005 | ✅ (api mã 3) |
| Dữ liệu + tệp bằng chứng Phase 2 còn nguyên (đếm dòng / md5) | ✅ |
| Smoke Phase 3: API 47/47, FE 14 lượt mở trang + station + W1 không lỗi console / CSP | ✅ |
| Báo cáo API-150..153 + CSV | ✅ (Excel Windows: chưa test) |
| Sao lưu cloud J-20 / J-21 / J-22, `--list`, khôi phục DB tạm + `backup-verify` | ✅ (MinIO giả lập) |
| Link chia sẻ J-24 → W1 → thu hồi J-25 | ✅ (MinIO giả lập) |
| Quét nhầm → API-160 409 | ✅ |
| Thông báo D22 (API) | ✅ · gửi thật ⬜ chưa test (Q21) |
| D7 TikTok / Shopee thật | ⬜ chưa test (Q18 / T-3) |
| Sao lưu + khôi phục `pg` trên 0007 (38/38) | ✅ |
| Lùi 0007 → 0005: điều kiện từ chối (link, đơn ngoài), cờ tách, Phase 2 chạy + mở hồ sơ (EV-1), nâng cấp lại bằng chứng y nguyên | ✅ |
| Lỗi runbook G5 đã sửa | ✅ OBS-G5-P3-1 / 2 (`170b4f3`) |
| Lỗi sản phẩm mới | ⚠️ BUG-G5-P3-1 Low, chưa sửa (DEC-995) |
| Log không lộ secret / token link / URL ký | ✅ |
| Staging đã dọn, `aicam-dev` nguyên, 5190 / 5191 → 200 | ✅ |
| Deploy production tại kho | ⬜ chưa (DEC-56), §8 |

**Kết luận (Ops):** Phase 3 **sẵn sàng ở mức staging local**. Ops đề xuất **G5 ✅ có điều kiện** (DEC-997), với các điều kiện:
1. FE sửa BUG-G5-P3-1 theo `ai-dev-fix` trước go-live.
2. Hoàn tất §8 trước khi deploy kho.
3. Diễn tập §7.2 trên server kho với bản sao DB production (TC-MG3.19).

Chưa tick G5 trong `00-status`; chờ chủ sản phẩm duyệt. Sau G5: gộp thay đổi của `01` vào `system/SRS.md`, kiểm `system-map.md`, chuyển spec sang Implemented, merge `main` + tag `v0.3.0`.
