# 01-packing-mvp — Release

| | |
|---|---|
| Owner (Ops) | khanhtt |
| Reviewer | Chủ sản phẩm (duyệt G5) |
| Trạng thái | Ready (staging local) — chưa deploy kho |
| Test report | [04a-test-report.md](04a-test-report.md) (G4 ✅ có điều kiện, DEC-78 trong `04`) |
| Môi trường đích | Staging local trên máy dev (`docker compose -p aicam-staging -f ai-cam-be/docker/compose.yml`). Chưa có server kho (DEC-56) |
| Last update | 2026-10-05 · Ops |

> **TL;DR** — Phase 1 (MVP đóng gói) chạy được bằng compose production trên máy dev, dựng như staging local: 22/22 bước smoke ✓, kể cả **khôi phục sao lưu lần đầu** (20/20 bảng khớp số dòng và md5).
> Smoke lộ 1 lỗi Medium: log lỗi của Caddy ghi nguyên `sig` của URL video. Đã sửa ở BE `4079956` (thêm test, lint/test xanh) và kiểm lại trên staging.
> Migration `0001 → 0002`; `downgrade -1` rồi `upgrade head` đã chạy thử trên staging.
> Chưa deploy kho. Go-live còn chờ camera thật (T-4), Shopee (T-3), server kho, cài cert trên máy trạm, ICE UDP trong LAN, tải 1 giờ, máy quét thật (§7).
> Rollback: sao lưu → `alembic downgrade` → về image / commit trước; nặng hơn thì khôi phục DB từ bản sao lưu (§5).

<!-- Đối tượng đọc: ops và chủ sản phẩm. Log thật ở evidence/g5/. -->

---

## 1. Nội dung release

| Hạng mục | Chi tiết |
|---|---|
| Version / tag | Chưa gắn tag (DEC-56: chưa deploy thật). API báo `version 0.1.0` (`/healthz`). Đề xuất tag `v0.1.0` khi merge `main` |
| Commit | BE `ai-cam-be` **`4079956`** (= `3035bbc` + sửa G5). FE `ai-cam-fe` **`833b1e9`**. Docs (repo gốc) `9bdcdd3` + thay đổi G4/G5 chưa commit. Nhánh `feat/01-packing-mvp` |
| Migration / thay đổi dữ liệu | Alembic `0001_initial`, `0002` (clip: `deleted_at`, timeline). Hệ thống mới nên không có dữ liệu cũ cần chuyển |
| Config / secret / flag | `docker/.env` có 4 secret: `POSTGRES_PASSWORD`, `JWT_SECRET`, `FERNET_KEY`, `MEDIA_SIGNING_KEY`. Cần thêm `SITE_ADDRESS`, `LAN_IP`. `SHOPEE_ENABLED=false` cho tới khi có T-3. `APP_ENV=production` là mặc định. Khi `APP_ENV=production`, api chặn `PLATFORM_ADAPTER=mock` |
| Phụ thuộc release khác | Không có. Cặp BE / FE phải cùng commit ở trên. FE được mount vào Caddy từ `ai-cam-fe/dist`, không đóng thành image riêng |

## 2. Tiền kiểm

| Kiểm | KQ | Bằng chứng |
|---|:-:|---|
| G4 ✅ | ✅ có điều kiện | `00-status` G4, DEC-78. 160 case: ✅ 132 · ❌ 0 · ⛔ 28 (thiếu tài nguyên) |
| Lint / test xanh trên commit release | ✅ | BE `4079956`: ruff, format, mypy, lint-imports (2/2) đều ✅; pytest 529 pass / 98 skip. FE `833b1e9`: `pnpm build` ✅ (lint/test xanh ở G4). Chưa có CI (profile) |
| Migration chạy thử ở staging + có down | ✅ | `migrate` Exited (0) trước `api`. `downgrade -1` (0002 → 0001) rồi `upgrade head` → 0002 ✅, healthz 200 (`evidence/g5/05-rollback-migration.txt`) |
| Sao lưu + **thử khôi phục** | ✅ | `pg-backup.sh once` → `backup_ok`. `pg_restore` vào DB tạm khớp 20/20 bảng. Chạy đủ quy trình `docs/ops.md` §6 trên DB staging → app chạy lại bình thường (§4.3) |
| Config / secret ở đích | ⚠️ staging | Staging dùng `.env` tạm, secret `openssl rand`, `chmod 600`, để ở scratchpad (không commit) và đã xoá. Server kho chưa có |
| Hash CSP khớp FE build | ✅ | `sha256-wMAAS9…TZU=` của script theme inline trong `dist/index.html` khớp `docker/Caddyfile` |
| Release note | ✅ | §6 |

## 3. Kế hoạch & log deploy (staging local)

Thứ tự: build FE → sinh `.env` tạm → `up -d --build` (migrate xong mới tới api) → smoke → sao lưu / khôi phục → thử rollback migration → `down -v`.
Bí danh: `dc = docker compose -p aicam-staging --env-file <scratchpad>/staging.env -f docker/compose.yml`.
Cổng: 8088 / 8443 / ICE 8190; subnet `172.30.20.0/24`; Caddy `172.30.20.10`; image `aicam-be:staging-g5`.
Stack dev `aicam-dev` (:8180) và volume `aicam-dev_*` không bị đụng tới.

| Bước | Lệnh / thao tác | Kết quả | Thời gian (19:xx, 2026-10-05) |
|---|---|---|---|
| 1 | `cd ai-cam-fe && pnpm install --frozen-lockfile && pnpm build` | ✓ build 358 ms; `dist/` có 35 file `*.map` (hidden) | 19:20 |
| 2 | `.env` tạm: 4 secret ngẫu nhiên, `SITE_ADDRESS=localhost`, `LAN_IP=127.0.0.1`, `SHOPEE_ENABLED=false`, `BACKUP_DIR=./backups/staging-g5` | ✓ `chmod 600`; `dc config -q` OK | 19:21 |
| 3 | `dc up -d --build` (lần 1, `PLATFORM_ADAPTER=mock`) | ✗ `migrate` exit 1: "Production không được dùng PLATFORM_ADAPTER=mock". Đây là guard G3 chạy đúng; lỗi do `.env` tạm (T-19 dùng `mock` trước khi có guard) | 19:22 – 19:24 (build 2 phút 33 giây) |
| 4 | Sửa `.env`: `PLATFORM_ADAPTER=shopee` (mặc định) → `dc up -d` | ✓ `volume-init` (0), `migrate` (0) chạy 0001 → 0002, api healthy, đủ 11 service chạy | 19:24 (8,5 giây) |
| 5 | Smoke §4.1–4.2 | 21/22 ✓, S17 ✗ (log Caddy lộ `sig` — §4.4) | 19:25 – 19:31 |
| 6 | Sửa lỗi log Caddy (§4.4) → `dc up -d --force-recreate --no-deps caddy` | ✓ kiểm lại: 0 dòng lộ `sig` | 19:31 – 19:33 |
| 7 | Sao lưu + khôi phục (§4.3) | ✓ | 19:33 – 19:34 |
| 8 | `dc run --rm migrate alembic downgrade -1` → `dc up -d` | ✓ 0002 → 0001 → 0002 | 19:34 |
| 9 | `dc down -v` + `docker rmi aicam-be:staging-g5` + xoá `docker/backups/staging-g5` | ✓ 0 container / volume / network `aicam-staging`. Volume `aicam-dev_*` còn đủ 3; dev api :8180 healthz 200 | 19:35 |

Log: [`evidence/g5/01-up.txt`](evidence/g5/01-up.txt), [`06-teardown.txt`](evidence/g5/06-teardown.txt).

## 4. Hậu kiểm (smoke trên code cuối)

### 4.1 Hạ tầng, bảo mật

| # | Kiểm | Cách | KQ |
|---|---|---|:-:|
| S1 | Migrate trước api | Log `migrate`; `alembic current` | ✓ `0002 (head)` |
| S2 | healthz qua Caddy | `curl -k https://localhost:8443/healthz` | ✓ 200 `{"status":"ok","version":"0.1.0"}` |
| S3 | HTTP → HTTPS | `curl http://localhost:8088/admin` | ✓ 308 → `https://localhost/admin`. URL chuyển hướng bỏ mất cổng 8443 vì staging chạy cổng lạ; ở kho dùng 80/443 nên không bị |
| S4 | `create-admin` | `dc exec -T api aicam create-admin` (mật khẩu qua stdin) | ✓ "Đã tạo Admin admin." |
| S5 | `seed-demo` bị chặn | `dc exec api aicam seed-demo` | ✓ exit 2 "seed-demo không chạy trên production." |
| S6 | Đăng nhập, cookie | API-01 qua Caddy | ✓ 200; `rt_dashboard`: `HttpOnly; Path=/api/v1/auth; SameSite=strict; Secure` |
| S13 | `/live` WHEP | POST `/live/cam-<id>/whep` | ✓ không token 401 · STATION 403 · CSKH 403 · ADMIN qua `forward_auth` tới MediaMTX (400 vì SDP giả) · `/live/` khác 404 |
| S14 | Giới hạn body | `/api/v1/imports` 7 MB; JSON 1,2 MB vào `/api/v1/users` | ✓ 413 `PAYLOAD_TOO_LARGE` "tối đa 6 MB"; 413. File nhỏ không bị chặn ở proxy (422 do sai định dạng) |
| S15 | SPA fallback, cache | `/`, `/admin/packages`, `/station`, `/admin/khong-co` | ✓ 200 `index.html`, `no-cache`; asset `public, max-age=31536000, immutable` |
| S15b | `*.map` | `GET /assets/index-….js.map` | ✓ 404 |
| S16 | Header | `curl -I` | ✓ CSP đúng chuỗi Caddyfile; nosniff; `X-Frame-Options DENY`; `Referrer-Policy no-referrer`; Permissions-Policy; COOP; không có `Server` |
| S16b | FE tải không lỗi CSP (Chromium 153, Playwright, `ignoreHTTPSErrors`) | Bắt `console` error + `securitypolicyviolation`: `/admin/login` → đăng nhập → `/admin/packages` → chi tiết kiện (phát clip) → `/admin/live` → `/admin/settings/storage` → `/station/login` | ✓ 0 lỗi console, 0 lỗi CSP. Script theme inline chạy (`data-theme=light`). Video phát được: `readyState 4`, 1280×720, 21,04 giây |
| S17 | Log không lộ bí mật | `dc logs \| grep -E 'token=\|sig=\|access_token='` | ✗ → ✓ Lần đầu có 2 dòng warn Caddy lộ `sig` (§4.4). Sau khi sửa: 0 dòng chưa che, 25 dòng đã che |
| S18 | `volume-init` không `chown -R` | `dc config`; `stat` trong api | ✓ `find … -maxdepth 2 ! -user 10001 -exec chown`; exit 0, không có cảnh báo; `/data/video`, `raw`, `clips`, `/data/imports` = `10001:10001` |
| S19 | `FORWARDED_ALLOW_IPS`, cổng | `dc exec api env`; `dc ps` | ✓ = `172.30.20.10` (IP Caddy). Chỉ publish Caddy 80/443 và MediaMTX ICE 8190 UDP + TCP |
| S20 | Quyền nội bộ MediaMTX | env `MTX_AUTHINTERNALUSERS_0_IPS` | ✓ `127.0.0.1/32,::1/128,172.30.20.0/24` (không mở cả `172.16.0.0/12`) |

### 4.2 Nghiệp vụ chính (UC đóng gói)

| # | Kiểm | KQ |
|---|---|:-:|
| S7 | Admin tạo user STATION + station (API-70, API-60) | ✓ 201 / 201 |
| S8 | Camera thử `rtsp://host.docker.internal:58554/cam-fake1` (fake-cam của stack dev, chỉ đọc) — API-63 rồi gắn CAM1 | ✓ 200 trong 3,6 giây; CAM1 `ONLINE`, MediaMTX staging ghi video |
| S9–S10 | Đăng nhập STATION; WS `wss://…/ws/station` qua Caddy | ✓ `pong`, `at` có hậu tố `Z`; nhận `station.state` PACKING khi quét; token sai → đóng 4401 |
| S11 | Quét mở / đóng qua HTTP (API-11) | ✓ `SESSION_OPENED` 35 ms → `SESSION_COMPLETED` 100 ms; kiện `PACKED` (API-30) |
| S12 | Cắt clip (J-01) và phát | ✓ CAM1 `READY` sau 8,4 giây kể từ lúc đóng (cắt mất 0,24 giây), dài 21,04 giây = 11 giây phiên + đệm 5 giây mỗi đầu. play-url → media 206 `video/mp4`; thiếu chữ ký → 422. CAM2 `FAILED` vì station chỉ gắn CAM1: J-01 luôn tạo đủ dòng clip cho mọi vai camera (`media/service.py:386`), đúng thiết kế |

Log: [`evidence/g5/02-smoke.txt`](evidence/g5/02-smoke.txt), [`03-logs-volume.txt`](evidence/g5/03-logs-volume.txt).

### 4.3 Sao lưu và khôi phục (lần đầu thử — 03 §5)

| Bước | Cách | KQ |
|---|---|:-:|
| B1 | `dc exec backup /bin/sh /pg-backup.sh once` | ✓ `backup_ok aicam-20261005-193331.dump` (51 KB) + `imports-….tgz`, quyền `600` |
| B2–B4 | `createdb aicam_restore_test` + `pg_restore --no-owner` → so sánh số dòng và md5 nội dung 20 bảng với DB gốc | ✓ exit 0; **20/20 bảng khớp**; `alembic_version` = 0002 |
| B5 | Chạy đủ quy trình `docs/ops.md` §6 trên DB staging: `stop` 7 service → `dropdb` / `createdb` (0 bảng) → `pg_restore` → giải nén file nhập vào volume → `up -d` | ✓ mọi service healthy / running sau khoảng 15 giây. Dữ liệu khớp, chỉ `video_segment` +1 vì camera vẫn ghi đoạn mới sau `up` |
| B6 | Sau khôi phục: đăng nhập Admin bằng mật khẩu cũ; tra kiện; phát clip cũ; camera | ✓ 200; kiện `PACKED`; media 206; CAM1 `ONLINE` |

Thời gian khôi phục DB nhỏ (dưới 1 giây cho 51 KB) **chưa đại diện cho dữ liệu kho**. Phải đo lại trên server kho với dữ liệu thật.
Log: [`evidence/g5/04-backup-restore.txt`](evidence/g5/04-backup-restore.txt).

### 4.4 Lỗi phát hiện ở G5

| ID | Mức | Hiện tượng | Sửa | Kiểm lại |
|---|---|---|---|---|
| BUG-G5-1 | Medium | Trình duyệt huỷ tải video giữa chừng (Range) thì Caddy ghi warn `reverse_proxy` "aborting with incomplete response" kèm nguyên `request.uri` có `sig=<hex>`. Khối `log` của site chỉ che access log, còn log lỗi đi qua logger `default` nên không được che. `sig` sống khoảng 10 phút và log chỉ nằm trên server, nhưng vẫn trái G3-F3 / G3-N1. Token WS cũng có thể lộ theo cùng đường này | BE `4079956` `fix(G5)`: thêm `log default { format filter { request>uri query { replace sig/token REDACTED } } }` vào global options của `docker/Caddyfile`; test tĩnh `test_caddy_default_logger_redacts_query`; cập nhật lệnh kiểm ở `docs/ops.md` §8 | `caddy validate` ✓. Huỷ tải 3 lần → 3 dòng warn đều `sig=REDACTED`. BE lint ✓, pytest 529 pass. Đã push |

Ngoài lỗi trên, smoke không lộ lỗi sản phẩm nào.

## 5. Rollback

**Điều kiện kích hoạt** (sau nâng cấp ở kho): api không healthy sau 2 phút; `migrate` exit ≠ 0; quét lỗi hoặc p95 API-11 > 1 giây; clip `FAILED` hàng loạt; station không nối WS được.

**Các bước** (theo `docs/ops.md` §7):

| # | Bước | Đã thử |
|---|---|---|
| 0 | Trước khi nâng cấp: `dc exec backup /bin/sh /pg-backup.sh once` và gắn tag image đang chạy, vd `docker tag aicam-be:local aicam-be:<commit-cũ>`; giữ bản `ai-cam-fe/dist` cũ | Sao lưu ✓ (B1). Chưa có registry / CI, nên phải tự tag |
| 1 | Migration mới có `downgrade`: `dc run --rm migrate alembic downgrade -1`, chạy **trước** khi về image cũ | ✓ staging 0002 → 0001 (`05-rollback-migration.txt`). Dev đã chạy `downgrade base` nhiều lần qua `qa-reset.sh` |
| 2 | Về bản trước: `AICAM_IMAGE=aicam-be:<commit-cũ>` trong `.env` (hoặc `git checkout <commit-cũ>` cả hai repo + `pnpm build`) → `dc up -d` | Chưa thử vì chưa có bản phát hành trước. Phase 1 là bản đầu tiên |
| 3 | Nặng hơn (dữ liệu hỏng): khôi phục DB từ bản sao lưu ở bước 0 theo `docs/ops.md` §6 | ✓ (B5) |
| 4 | Không cứu được bản mới: ngừng dùng station, quay lại đóng gói thủ công (02 §10) | — |

## 6. Release note (cho người dùng)

**Hệ thống X — Phase 1 (MVP đóng gói)**
- Bàn đóng gói: quét mã vận đơn để mở phiên, quét lần nữa để đóng. Camera tự ghi hình, hệ thống tự cắt clip từ 5 giây trước khi mở đến 5 giây sau khi đóng.
- Cam 2 đọc phiếu trên khay: phiếu sai thì không đóng được và phải chờ quản lý duyệt.
- Dashboard: tra cứu kiện, xem và giữ clip, xuất clip MP4 để gửi khách khi có khiếu nại; báo cáo ngày; live view camera.
- Nguồn đơn: nhập CSV / xlsx. Kết nối Shopee bật khi có partner key.
- Quản trị: người dùng và vai trò, station và camera, lưu trữ / retention, nhật ký thao tác, sao lưu hằng ngày.

## 7. Việc còn lại trước go-live tại kho

Nguồn: 04a §6 (⛔) và 03 §5. Chưa xong thì không go-live.

| # | Việc | Phụ thuộc | Tiêu chí |
|---|---|---|---|
| 1 | Server kho: dựng theo `docs/ops.md` §1–2, checklist §11 (bind `LAN_IP` / `DOCKER-USER`, NTP, UPS, video lên NAS qua `compose.override.yml`) | Mua / cấp server | §11 tick đủ |
| 2 | Camera thật + bàn thử (T-4): AC-02 (20 clip), AC-04 (đọc phiếu ≥ 95%), AC-10 (rút cáp), AC-17 (ONVIF lệch giờ), CPU vision | Camera, phiếu in | 04 TC ⛔ nhóm T-4 pass |
| 3 | Máy quét USB thật: nhịp phím (TC-03.30, 03.31 mới chạy bằng máy quét giả) | Máy quét | Pass trên máy trạm thật |
| 4 | Shopee thật (T-3): OAuth, đồng bộ, tra sàn khi quét (TC-05.01, 05.02), chi phí F9 / F10 | Shopee duyệt partner | TC pass; `SHOPEE_ENABLED=true` |
| 5 | Cài cert gốc Caddy (`root.crt`) trên máy station / dashboard Windows; cookie `Secure` chạy khi có cert | Máy trạm | Đăng nhập không cảnh báo chứng chỉ |
| 6 | Live view qua ICE UDP 8189 trong LAN (WHEP có hình) | Server + camera | D11 có hình từ máy dashboard |
| 7 | Tải 1 giờ (NFR-05, CPU < 80%), NFR-01 / 03 / 04 trên phần cứng; AC-08 encode (1080p H.265 **không đạt** trên máy dev → hạ `EXPORT_PRESET`) | Server + camera | 04a §3 đạt |
| 8 | Khôi phục sao lưu trên server kho với dữ liệu thật; ghi thời gian khôi phục; `BACKUP_DIR` ở ổ khác; `.env` có bản off-site; lịch 01:00 chạy qua đêm (`backup_ok`) | Server | Khôi phục được, đăng nhập và tra 1 kiện |
| 9 | Điện thoại iOS / Android phát MP4 (AC-08), Safari | Thiết bị | TC-07.12, 07.17 pass |
| 10 | Gắn tag `v0.1.0` cả hai repo sau khi merge `main`; nếu có CI thì đẩy image lên registry (`AICAM_IMAGE`) | PR merge | Tag có trên remote |

## 8. Chốt G5

| Mục | KQ |
|---|:-:|
| G4 ✅ (có điều kiện, DEC-78) | ✅ |
| Commit release xác định, lint / test xanh | ✅ BE `4079956`, FE `833b1e9` |
| Compose production chạy được, migrate trước api | ✅ |
| Smoke 22/22 trên code cuối (gồm CSP trên Chromium, WS, clip) | ✅ |
| Lỗi G5 đã sửa và kiểm lại | ✅ BUG-G5-1 |
| Sao lưu + khôi phục đã thử | ✅ (staging, dữ liệu nhỏ) |
| Migration downgrade đã thử | ✅ |
| Rollback plan | ✅ §5 |
| Staging đã dọn, stack dev nguyên vẹn | ✅ |
| Deploy production tại kho | ⬜ chưa (DEC-56) — §7 |

**Kết luận:** Phase 1 **sẵn sàng release** ở mức staging local. Go-live tại kho chờ đủ §7.
G5 do khanhtt tự quyết theo ủy quyền DEC-56, có điều kiện là §7.
