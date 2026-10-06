# 02-returns-reconciliation — Release

| | |
|---|---|
| Owner (Ops) | khanhtt |
| Reviewer | Chủ sản phẩm (duyệt G5) |
| Trạng thái | Ready (staging local) — **G5 ✅ có điều kiện (DEC-368)**. BUG-G5-P2-2 đã sửa (BE `3bfe6ae`). Chưa deploy kho |
| Test report | [04a-test-report.md](04a-test-report.md) (G4 ✅ có điều kiện, DEC-367 trong `04`) |
| Môi trường đích | Staging local trên máy dev (`docker compose -p aicam-staging -f ai-cam-be/docker/compose.yml`). Chưa có server kho (DEC-56) |
| Last update | 2026-10-06 · Ops |

> **TL;DR** — Phase 2 (hàng hoàn, đối soát, khiếu nại) chạy được bằng compose production trên máy dev, dựng như staging local.
> Đã nâng cấp từ một stack **Phase 1 có dữ liệu thật** (code `main`) theo `docs/ops.md` §7.1, migration `0002 → 0005` mất 1 giây.
> Sau nâng cấp, dữ liệu Phase 1 còn nguyên. 2 clip đang "Giữ" thành 1 hồ sơ `LEGACY_HOLD`.
> Smoke Phase 2 qua Caddy đạt 32/32 API. FE không có lỗi console hay lỗi CSP. Beat thật sự gửi J-13 và J-14.
> Khôi phục sao lưu trên schema 0005: 29/29 bảng khớp cả số dòng lẫn md5.
> Lùi `0005 → 0002`, chạy code Phase 1 rồi nâng cấp lại đều chạy được (healthz 200).
> **BUG-G5-P2-2 (Medium) đã sửa** ở BE `3bfe6ae`: downgrade 0003 từ chối khi có phiên hoàn đã kết thúc mà chưa có dòng clip (J-01 còn trong hàng đợi); ops §7.1 thêm bước chờ hàng đợi `video` rỗng. Test hồi quy `test_downgrade_refuses_return_session_without_clip_rows` (migration thật trên Postgres) pass; BE pytest 1101 passed. **Chưa chạy lại kịch bản R2b trên staging** (chỉ kiểm bằng test INT).
> Lỗi compose BUG-G5-P2-3 (Caddy mất IP) đã sửa và kiểm lại trên staging, commit `3bfe6ae`.
> Chưa test được: Shopee returns thật (T-3), tra sàn khi quét, camera thật (T-4). Go-live chờ §7.
> Rollback: sao lưu → dừng service → `alembic downgrade 0002` bằng image mới → đổi về image Phase 1 (§5).

<!-- Đối tượng đọc: ops và chủ sản phẩm. Log thật ở evidence/g5/. -->

---

## 1. Nội dung release

| Hạng mục | Chi tiết |
|---|---|
| Version / tag | Chưa gắn tag (DEC-56). `/healthz` vẫn báo `version 0.1.0` giống Phase 1 (`pyproject.toml` chưa tăng). Đề xuất `0.2.0` và tag `v0.2.0` khi merge `main` (§4.4 OBS-2) |
| Commit | BE `ai-cam-be` **`66ac3d1`**, FE `ai-cam-fe` **`3acaad0`**, nhánh `feat/02-returns-reconciliation`. Sửa của G5 chưa commit: `docker/compose.yml`, `docker/.env.production.example`, `docs/ops.md` (§4.4) |
| Bản trước (Phase 1) | BE `0b9050b` (merge PR #1 = `4079956`), FE `fc2fa62` (`main`) |
| Migration / thay đổi dữ liệu | `0003`: bảng / cột Phase 2, chỉ thêm. `0004`: clip đang "Giữ" thành hồ sơ `LEGACY_HOLD`. `0005`: index tra cứu. Có downgrade sang `phase2_archive` (02 §10) |
| Config / secret / flag | Không có secret mới. Biến Phase 2 có mặc định: `RECON_ENABLED=true`, `SHOPEE_RETURNS_ENABLED=false` (chờ T-3), `RETENTION_CLIP_MIN_DAYS=60`, … (`.env.production.example`). G5 thêm `AICAM_IP_RANGE` (mặc định `172.30.10.128/25`) |
| Phụ thuộc release khác | BE và FE phải cùng cặp commit ở trên. FE được mount vào Caddy từ `ai-cam-fe/dist`. Hash CSP của script theme không đổi so với Phase 1 |

## 2. Tiền kiểm

| Kiểm | KQ | Bằng chứng |
|---|:-:|---|
| G4 ✅ | ✅ có điều kiện | `00-status` G4, DEC-367. 188 case: ✅ 176 · ❌ 0 · ⛔ 12 (thiếu tài nguyên) |
| Lint / test xanh trên commit release | ✅ (theo G4) | BE `66ac3d1`: pytest 1100 passed / 126 skip, ruff, format, mypy mã thoát 0. FE `3acaad0`: vitest 564, tsc, eslint, prettier mã thoát 0 (04a §5). G5 chỉ chạy `pnpm build` ✅, không chạy lại test. Chưa có CI |
| Migration chạy thử ở staging + có down | ✅ / ⚠️ | Nâng cấp từ Phase 1 ✅. `downgrade 0002` ✅, nâng cấp lại ✅. Riêng điều kiện từ chối (b) lọt: BUG-G5-P2-2 |
| Sao lưu + **thử khôi phục** | ✅ | Trên schema 0005: 29/29 bảng khớp số dòng và md5 (`04-backup-restore-p2.txt`) |
| Config / secret ở đích | ⚠️ staging | `.env` tạm, secret sinh bằng `openssl rand`, `chmod 600`, để ở scratchpad (không commit), đã xoá. Server kho chưa có |
| Hash CSP khớp FE build | ✅ | `sha256-wMAAS9…TZU=` trong `dist/index.html` (FE `3acaad0`) khớp `docker/Caddyfile` |
| Release note | ✅ | §6 |

## 3. Kế hoạch & log deploy (staging local)

Thứ tự (theo `docs/ops.md` §7.1):
1. Dựng Phase 1 rồi tạo dữ liệu.
2. Sao lưu, build image Phase 2, thử các điều kiện từ chối.
3. Nâng cấp: dừng service → migrate → `up`.
4. Smoke, rồi sao lưu / khôi phục.
5. Lùi về Phase 1, rồi nâng cấp lại.
6. Kiểm log, dọn.

Bí danh:
- `dc1 = docker compose -p aicam-staging --env-file <scratchpad>/p1.env -f <worktree Phase 1>/ai-cam-be/docker/compose.yml`, image `aicam-be:staging-p1`.
- `dc2` dùng `ai-cam-be/docker/compose.yml` của repo, image `aicam-be:staging-p2`.

Hai bí danh dùng chung project, volume và secret. Cổng 8088 / 8443 / ICE 8190, subnet `172.30.20.0/24`, Caddy `172.30.20.10`.
Nguồn RTSP: `fake-cam1` / `fake-cam2` của stack dev (`rtsp://host.docker.internal:58554`). Ops bật mediamtx + 2 fake-cam của `aicam-dev` cho lần chạy này rồi tắt lại. Không đụng volume `aicam-dev_*`.

| Bước | Lệnh / thao tác | Kết quả | Giờ (2026-10-06) |
|---|---|---|---|
| 0 | `df -h /`: còn 36 GiB. FE Phase 2 `pnpm build` (dist 144 file asset). Phase 1: `git worktree` `0b9050b` / `fc2fa62` + `pnpm build` | ✓ | 21:37 |
| 1 | `dc1 up -d --build` (lần 1, worktree ở scratchpad `/private/tmp`) | ✗ caddy / mediamtx mount lỗi "not a directory": Docker (colima) không chia sẻ `/private/tmp`. `down -v`, chuyển worktree + `BACKUP_DIR` sang `/Users/admin/KhanhCode/.aicam-g5-tmp` (ngoài repo, đã xoá). `.env` vẫn ở scratchpad | 21:38 |
| 2 | `dc1 up -d --build` | ✓ `migrate` chạy 0001 → 0002, đủ 11 service, healthz 200 | 21:40 |
| 3 | Dữ liệu Phase 1 qua API: `create-admin`, 3 user (SUPERVISOR, CSKH, STATION), station + CAM1 / CAM2, nhập CSV 5 đơn / 6 dòng, 3 phiên PACK, 6 clip READY, giữ 2 clip, 1 bản xuất | ✓ (`01-phase1-up.txt`) | 21:41 |
| 4 | Sao lưu Phase 1: `dc1 exec backup pg-backup.sh once` | ✓ `backup_ok` 52 KB | 21:42 |
| 5 | Build image Phase 2. Thử `schema_guard`: `dc2 run --no-deps api / worker / beat / vision` trên DB 0002 | ✓ cả 4 đều thoát, log `schema_version_mismatch`. worker / beat / vision thoát mã 78; **api thoát mã 3** (OBS-1) | 21:43 |
| 6 | Thử làm sai thứ tự: `dc2 run migrate alembic upgrade head` khi service Phase 1 **còn chạy** | ✓ 0004 từ chối ("còn 3 kết nối khác … clip đang giữ"), exit 1. DB vẫn ở 0002, không có bảng Phase 2 nào | 21:43 |
| 7 | §7.1 bước 3–8: `dc1 stop` 6 service → `current` 0002 → `upgrade head` → `current` 0005 → `VACUUM ANALYZE package` → `dc2 up -d` | ✓ 1 giây. Log `0004: 2 clip giữ → 1 hồ sơ LEGACY_HOLD`, `held_before=2 protected_after=2 chênh=0`. Mọi service chạy image p2, `schema_version_ok revision=0005`, healthz 200 | 21:44 |
| 8 | So dữ liệu trước / sau (§4.1) | ✓ | 21:45 |
| 9 | Image Phase 1 trên DB 0005: `dc1 run migrate` | ✓ "Can't locate revision identified by '0005'", exit 255. Đây là TC-MG.06 lần đầu chạy trên stack thật | 21:46 |
| 10 | Smoke Phase 2 (§4.2) | ✓ 32/32 API, FE 0 lỗi | 21:47 – 22:14 |
| 11 | Sao lưu + khôi phục trên 0005 (§4.3) | ✓ 29/29 | 21:52 |
| 12 | Lùi về Phase 1, rồi nâng cấp lại (§5) | ⚠️ chạy được, lộ BUG-G5-P2-2 và BUG-G5-P2-3 | 21:59 – 22:21 |
| 13 | Kiểm log lộ secret (§4.1 S-LOG) | ✓ | 22:22 |
| 14 | Dọn (§3.1) | ✓ | 22:23 |

### 3.1 Dọn

- `dc2 down -v`: chỉ project `aicam-staging`, 6 volume + network. Sau đó không còn container / volume / network nào của `aicam-staging`. Xoá thêm 1 volume ẩn danh rỗng do container `backup` của staging tạo.
- Xoá image `aicam-be:staging-p1`. Tag `staging-p2` dùng chung ID với `aicam-dev:latest` nên chỉ gỡ tag.
- `git worktree remove` 2 worktree Phase 1 rồi `prune`. Xoá `/Users/admin/KhanhCode/.aicam-g5-tmp` (gồm 4 bản sao lưu staging).
- Xoá `.env` tạm, file mật khẩu tạm và `admin.pw` khỏi scratchpad.
- Stack dev: tắt lại mediamtx, fake-cam1, fake-cam2 (Ops đã bật). api, postgres, redis vẫn chạy như lúc đầu. Dev api `:8180` healthz 200. Volume `aicam-dev_*` còn đủ 3.

Log: [`evidence/g5/07-teardown.txt`](evidence/g5/07-teardown.txt).

## 4. Hậu kiểm

### 4.1 Nâng cấp từ Phase 1: dữ liệu và bảo vệ

| # | Kiểm | Cách | KQ |
|---|---|---|:-:|
| U1 | Số dòng bảng Phase 1 trước / sau | `counts.sh` 20 bảng trước, 29 bảng sau | ✓ 18/20 bảng cùng số dòng. Hai bảng thay đổi: `audit_log` +1 (`CLIP_PROTECTION_MIGRATED`, do 0004) và `video_segment` +2 (camera vẫn đang ghi) |
| U2 | md5 nội dung theo **đúng cột Phase 1** | Khôi phục bản sao lưu trước nâng cấp vào DB tạm `aicam_p1ref`, so md5 từng bảng trên cùng danh sách cột | ✓ 15/19 bảng khớp. 4 bảng khác đều có lý do: `clip.held` (0004 đặt `false`, giữ `held_by` / `held_at` cho downgrade); `camera.last_seen_at` (heartbeat); `audit_log` (+1 dòng, 14 dòng cũ khớp); `video_segment` (đoạn mới) |
| U3 | `LEGACY_HOLD` | DB + API-130 / API-30 | ✓ `KN-000001` loại `OTHER`, nguồn `LEGACY_HOLD`, `NEW`, hạn = lúc nâng cấp + 30 ngày, 1 bằng chứng `SESSION` (phiên PACK). Clip `held=false`; `protected_by_claims=[KN-000001]`. Clip Phase 1 vẫn phát được (206) |
| U4 | `recon_start_at`, retention | `setting` | ✓ `recon_start_at` = lúc migrate. `retention_clip_days=90` ≥ sàn 60, nên không nâng |
| U5 | `schema_guard` trước migrate | `dc2 run --no-deps <svc>` trên DB 0002 | ✓ không service nào chạy được. worker / beat / vision thoát mã 78, api thoát mã 3 (OBS-1) |
| U6 | 0004 từ chối khi còn service cũ | Chạy migrate khi service Phase 1 còn chạy | ✓ exit 1, DB giữ nguyên 0002 |
| U7 | Image cũ trên DB mới | `dc1 run migrate` trên DB 0005 | ✓ exit 255 `Can't locate revision '0005'` |

Log: [`01-phase1-up.txt`](evidence/g5/01-phase1-up.txt), [`02-upgrade-p1-to-p2.txt`](evidence/g5/02-upgrade-p1-to-p2.txt).

### 4.2 Smoke Phase 2 (qua Caddy `https://localhost:8443`)

Cấu hình smoke: `PLATFORM_ADAPTER=shopee`, `SHOPEE_ENABLED=false`. Giống Phase 1: production chặn `PLATFORM_ADAPTER=mock` nên không bật được adapter mock trên staging.

| # | Kiểm | KQ |
|---|---|:-:|
| P1 | healthz qua Caddy (`{"status":"ok","version":"0.1.0"}`); HTTP → HTTPS 308 | ✓ |
| P2 | Đăng nhập 4 vai ADMIN / SUPERVISOR / CSKH / STATION bằng tài khoản tạo từ Phase 1, `/me` đúng vai | ✓ |
| P3 | Dữ liệu Phase 1 trên Phase 2: kiện, clip READY, phát clip (206), `LEGACY_HOLD` hiện cho CSKH | ✓ |
| P4 | API-80 GET: sàn 60, có ngưỡng Phase 2. PUT: 45 → 422 `RETENTION_BELOW_MINIMUM`; 70 không xác nhận → 409 `RETENTION_REDUCTION_UNCONFIRMED`; có xác nhận → 200. API-82: ADMIN 200, SUPERVISOR 403 | ✓ |
| P5 | Station → `BOTH`; SUPERVISOR chỉnh SPXSTG0000002 → `HANDED_OVER`; `work_mode=RETURN`, người kiểm | ✓ |
| P6 | **API-11 chế độ RETURN** với mã vận đơn kiện Phase 1: `SESSION_OPENED` 55 ms, hồ sơ `HH-000001` `UNANNOUNCED`, `pack_reference` có clip CAM1 + CAM2. API-103 chụp 2 ảnh (0,02 giây / ảnh, từ fake-cam). API-106 trả JPEG. API-102 kết luận "Hộp rỗng". Quét lại để đóng: `RETURN_RECEIVED_ISSUE`, tự tạo hồ sơ `KN-000002` (AC-06) | ✓ |
| P7 | API-104 tìm theo mã đơn: kiện PACKED → `can_open=false`, `NOT_SHIPPED`, `platform_checked=false`. Mã lạ → `RETURN_NOT_FOUND`. **API-105** mở phiên chưa xác định → `HH-000002` `UNIDENTIFIED`. API-12 hủy → `CANCELLED` | ✓ |
| P7′ | API-11 / 104 / 105 có **tra sàn** (Shopee / adapter) | **chưa test** — production chặn adapter mock, chưa có Shopee partner (T-3). Đã pass bằng adapter mock ở G4 (QA live, TC-04.08) |
| P8 | API-110 / 111 danh sách (tab Đã nhận) + chi tiết hồ sơ hàng hoàn (kết luận, người kiểm). CSKH 200, STATION 403 | ✓ |
| P9 | Hồ sơ khiếu nại tự tạo có bằng chứng PACK (của Phase 1) + RETURN + 2 ảnh. API-135 ghi chú; API-133 → `SUBMITTED`. API-131 tạo tay 201; tạo trùng → 409 `CLAIM_EXISTS`; STATION 403. API-134 đặt bằng chứng | ✓ |
| P10 | **Gói bằng chứng**: API-136 → API-137 `READY` sau 3 giây (48 MB). API-138 tải zip qua Caddy, SHA-256 khớp. Zip có `01-dong-goi-…` / `02-mo-hoan-…` (gốc CAM1 / CAM2, video ghép có chữ, `info.json`, `ket-luan.json`, ảnh), `ho-so.json`, `README.txt`. Thiếu chữ ký → 422; SUPERVISOR không phải người tạo → 404 | ✓ |
| P11 | **Đối soát**: API-123 SUPERVISOR 202, CSKH 403. J-14 chạy (`recon_run` 0,05 giây). API-120 trả 200, 0 cảnh báo: dữ liệu tạo sau `recon_start_at` chưa đủ ngưỡng ngày / giờ của 7 quy tắc. Nội dung cảnh báo đã kiểm ở G4 (QA live M9) | ✓ (job + API) |
| P12 | D2 / API-30: lọc `RETURN_RECEIVED_ISSUE`, tìm theo mã `HH-`, lọc `session_type=RETURN`; item có `return_case`. API-31 báo cáo ngày có số hàng hoàn / khiếu nại | ✓. Lần đầu script đánh ✗ vì kỳ vọng sai: lọc RETURN ra 2 kiện, kiện thứ hai là kiện tạm `TAM-000001` của P7. Đúng thiết kế |
| P13 | **Celery beat**: lịch J-13 (900 giây), J-14 (1800 giây), J-15 có trong image. Beat **thật sự gửi** J-13 lúc 14:59:20Z và 15:14:20Z, J-14 lúc 15:14:20Z. worker-sync / worker chạy xong | ✓ |
| P14 | **J-13 bỏ lượt**: env staging → `{'skipped': 'not_configured'}`. Đặt `SHOPEE_ENABLED=true` + partner giả + `SHOPEE_RETURNS_ENABLED=false` → `{'skipped': 'returns_disabled'}` | ✓ |
| P14′ | J-13 với Shopee returns thật (`SHOPEE_RETURNS_ENABLED=true`) | **chưa test** — T-3 |
| P15 | FE qua Caddy: `/admin/returns`, `/admin/claims`, `/admin/claims/:id`, `/admin/recon`, `/station` → 200 `index.html` `no-cache`. Asset `immutable`. `*.map` → 404. Header CSP / nosniff / DENY / no-referrer | ✓ |
| P16 | FE trên Chromium (Playwright, `ignoreHTTPSErrors`), bắt `console` error + `securitypolicyviolation`: Admin đăng nhập → `/admin` → `/admin/returns` (tab Đã nhận có SPXSTG0000002 · Hộp rỗng · KN-000002) → `/admin/claims` → chi tiết KN-000002 (2 ảnh 1280×720 tải được) → `/admin/recon` → D2 lọc hàng hoàn → `/admin/settings/storage`; station đăng nhập | ✓ 0 lỗi console, 0 lỗi CSP |
| S-LOG | Log không lộ secret: grep mọi service | ✓ Lượt 1 (sau smoke): 0 dòng `sig=` / `token=` chưa che, 281 dòng đã che. Lượt 2 (sau nâng cấp lại; huỷ tải zip / clip giữa chừng để Caddy ghi warn `aborting`): 16 dòng có `sig=` / `token=`, 0 dòng chưa che, 7 warn `aborting` đều đã che. 0 dòng chứa giá trị 4 secret hoặc mật khẩu 4 tài khoản |
| S-NET | Cổng / proxy | ✓ Chỉ publish Caddy 8088 / 8443 và ICE 8190. `FORWARDED_ALLOW_IPS=172.30.20.10` (IP Caddy). MediaMTX nội bộ `127.0.0.1/32,::1/128,172.30.20.0/24` |

Log: [`03-smoke-p2.txt`](evidence/g5/03-smoke-p2.txt), [`06-logs-secrets.txt`](evidence/g5/06-logs-secrets.txt).

### 4.3 Sao lưu và khôi phục (schema 0005)

| Bước | Cách | KQ |
|---|---|:-:|
| B1 | `dc2 exec backup /bin/sh /pg-backup.sh once` | ✓ `backup_ok`, `.dump` + `imports-….tgz`, quyền `600` |
| B2 | `createdb aicam_restore_test` + `pg_restore --no-owner` | ✓ exit 0, dưới 1 giây |
| B3–B4 | So số dòng + md5 nội dung của **29 bảng**: gốc (đọc ngay sau dump) với bản khôi phục | ✓ **29/29 khớp**. `alembic_version` = 0005. Không có `phase2_archive`. Sequence `claim_code_seq` / `return_case_code_seq` / `placeholder_code_seq` giống gốc |
| B5 | Xoá DB tạm | ✓ |

Quy trình khôi phục đầy đủ (drop → restore → up, `docs/ops.md` §6) đã chạy ở Phase 1 G5 nhưng không chạy lại ở đây, vì §6 không đổi. Thời gian khôi phục DB nhỏ không đại diện cho dữ liệu kho.
Log: [`04-backup-restore-p2.txt`](evidence/g5/04-backup-restore-p2.txt).

### 4.4 Lỗi và quan sát phát hiện ở G5

| ID | Mức | Hiện tượng | Bước tái hiện | Xử lý |
|---|:-:|---|---|---|
| **BUG-G5-P2-2** | **Medium** (code sản phẩm: migration 0003 downgrade) | Điều kiện từ chối (b) của downgrade lọt. Phiên RETURN vừa đóng mà J-01 (`media.build_session_clips`, có ETA ≈ đóng + 8 giây) chưa chạy thì **chưa có dòng clip nào**. Guard `_guard_no_active_return_session` chỉ đếm clip `PENDING` / `FAILED` nên ra 0, và downgrade chạy luôn (exit 0). Sau đó worker Phase 1 nhận J-01 của phiên đã chuyển vào `phase2_archive` → `build_clips_skipped`. Nâng cấp lại khôi phục phiên nhưng **không có clip**, và không xếp lại J-01. Bấm Thử lại (API-46) trả 409 `CLIP_NOT_FAILED`. Video thô vẫn còn trên đĩa nhưng không còn đường nào trên UI để cắt clip, và J-02 sẽ xoá video thô sau 30 ngày | 1. Phase 2 chạy; station nhận hoàn mở phiên (SPXSTG0000003). 2. `dc stop api vision worker worker-sync worker-export beat`. 3. `dc up -d api`, lưu kết luận OK rồi quét đóng → `SESSION_COMPLETED`. Clip chưa có dòng, J-01 nằm trong hàng đợi Redis `video` (`llen=1`). 4. `dc stop api` → `dc run --rm migrate alembic downgrade 0002` → exit 0 (kỳ vọng: từ chối). 5. Phase 1 `up` → worker log `build_clips_skipped session_id=…`. 6. Nâng cấp lại → phiên RETURN `COMPLETED`, `clips=[]`. Ở kho, chỉ cần đóng phiên hoàn trong khoảng 1 phút trước bước 3, hoặc worker bị dồn việc, là gặp | **DỪNG, chưa sửa** (đúng luật: lỗi code thì báo lại). Đề xuất cho BE: (a) guard 0003 từ chối thêm khi có phiên RETURN đã kết thúc mà số dòng clip < số vai camera (hoặc còn J-01 trong hàng đợi); (b) ops §7.1 bước 2 thêm "chờ hàng đợi `video` rỗng (`redis-cli llen video` = 0)"; (c) cân nhắc cho API-46 tạo lại clip khi phiên không có dòng clip. Log: `05-rollback-p2-to-p1.txt` §R2b, R6, R8 |
| **BUG-G5-P2-3** | Medium (compose) | Sau `dc2 up -d` ở bước nâng cấp lại, `caddy` đứng ở `Created`, healthz trả HTTP 000: `failed to set up container networking: Address already in use`. `vision` được tạo lại trước nên nhận IP động `172.30.20.10` = `CADDY_IP`. Ở kho, mọi lần đổi image đều tạo lại hàng loạt container, nên có thể mất HTTPS cho cả hệ thống | `dc1 up -d` (Phase 1) → `dc1 stop …` → migrate → `dc2 up -d`. Phụ thuộc thứ tự tạo container; ở bước nâng cấp đầu không gặp | **Đã sửa, chưa commit**: `docker/compose.yml` thêm `ip_range: ${AICAM_IP_RANGE:-172.30.10.128/25}` (IP động chỉ ở nửa trên dải, `.10` nằm ngoài). Thêm `AICAM_IP_RANGE` vào `.env.production.example`. `ops.md` §7.1 thêm ghi chú: mạng tạo từ bản cũ thì lần đầu phải `dc down` (không `-v`) rồi `up`; §10 thêm dòng sự cố. Kiểm lại: `down` → `up` → healthz 200. Ép tạo lại vision rồi caddy: vision nhận `.137`, caddy giữ `.10`, healthz 200, `FORWARDED_ALLOW_IPS` đúng. Gateway của mạng thành `172.30.20.128` (đầu `ip_range`); không cấu hình nào dựa vào `.1` |
| OBS-1 | Low (tài liệu) | `schema_guard`: api thoát **mã 3**, không phải 78 như ghi trong `ops.md` §7.1 và `02` §10 mục 2c. Lý do: uvicorn bọc `SchemaMismatch(78)` trong lifespan thành "Application startup failed". Hành vi vẫn đúng: api không chạy, `restart: unless-stopped` lặp lại và api không bao giờ healthy | `dc2 run --rm --no-deps api` trên DB 0002 | Đã sửa câu chữ trong `ops.md` (chưa commit). `02` §10 2c cần Architect sửa: "api mã 3 / worker, beat, vision mã 78" |
| OBS-2 | Low | `/healthz` của Phase 2 vẫn là `0.1.0`, nên lúc hậu kiểm không phân biệt được bản đang chạy là Phase 1 hay Phase 2 | — | Đề xuất tăng `version` lên `0.2.0` khi merge `main` |
| OBS-3 | Nit | 0004 ghi một ghi chú "Chuyển từ cờ giữ của Chủ shop lúc …" cho **mỗi clip**, nên một phiên giữ cả 2 camera có 2 ghi chú giống hệt | Bước 7 §3 | Đúng như 0004 đang viết. Có thể gộp ghi chú theo phiên hoặc thêm tên camera |
| OBS-4 | Nit (môi trường) | Docker (colima) không mount được thư mục trong `/private/tmp` (scratchpad) | Bước 1 §3 | Worktree + `BACKUP_DIR` để ở `/Users/admin/KhanhCode/.aicam-g5-tmp`, đã xoá. `.env` tạm vẫn ở scratchpad |

Ngoài các mục trên, smoke không lộ lỗi sản phẩm nào khác.

## 5. Rollback

**Điều kiện kích hoạt** (sau nâng cấp ở kho):
- api không healthy sau 2 phút.
- `migrate` exit ≠ 0.
- Quét ở bàn hoàn / bàn đóng gói bị lỗi, hoặc p95 API-11 > 1 giây.
- Clip `FAILED` hàng loạt.
- Station không nối WS được.
- Ưu tiên sửa tiến (02 §10).

**Các bước** (`docs/ops.md` §7.1 "Lùi về Phase 1"), kèm kết quả đã thử trên staging:

| # | Bước | Đã thử |
|---|---|---|
| 1 | Sao lưu `pg-backup.sh once` + snapshot volume video | ✓ |
| 2 | Hoàn tất / hủy mọi phiên hoàn đang mở; chờ clip phiên hoàn READY | Điều kiện (a) còn phiên mở: ✓ downgrade từ chối ("còn 1 phiên nhận hàng hoàn đang mở"), exit 1, DB vẫn ở 0005. Điều kiện (b) clip chưa cắt: **✗ BUG-G5-P2-2** (clip chưa có dòng nên lọt) |
| 3 | `dc stop api vision worker worker-sync worker-export beat` | ✓ |
| 4 | `dc run --rm migrate alembic downgrade 0002` bằng **image mới** | ✓ exit 0, `current` = 0002. `phase2_archive` có 29 bảng. `meta.counts` = return_case 3, return_session 3, return_clip 4, claim 2 + legacy 1, claim_evidence 5, snapshot 2, placeholder 1, evidence_pack 1, …; sequence được lưu |
| 5 | Kiểm kết quả | ✓ 6/6 clip PACK `held=true`, người giữ "Hệ thống (bảo vệ bằng chứng Phase 2)". Kiện hoàn về trạng thái trước đó (`RETURN_RECEIVED_*` → `HANDED_OVER`) |
| 6 | `dc1 up -d` (image + FE Phase 1) | ✓ `migrate` Phase 1 không làm gì trên 0002, mọi service chạy image p1, healthz 200, FE Phase 1 (`index-D5_8OfBe.js`). Đăng nhập Admin + station 200; 3 kiện + 6 clip giữ; phát clip 206 |
| 7 | Nâng cấp lại lên Phase 2 | ✓ Log `0003: khôi phục từ phase2_archive {…}`, số dòng từng khóa = `meta.counts` lúc downgrade. Log `0004: khôi phục 1 hồ sơ LEGACY_HOLD, trả 8 cờ giữ do downgrade đặt`. Không còn `phase2_archive`. 3 HH- + 3 KN- đủ, trạng thái hồ sơ giữ nguyên (KN-000002 `SUBMITTED`). Kiện về `RETURN_RECEIVED_*`. Clip SPXSTG0000001 trả lại `held_by` = Chủ shop, `held=false`, được bảo vệ bởi KN-000001. Healthz 200 sau khi xử lý BUG-G5-P2-3. **Ngoại lệ: phiên hoàn SPXSTG0000003 không có clip (BUG-G5-P2-2)** |
| 8 | Nặng hơn: khôi phục DB từ bản sao lưu ở bước 1 (`docs/ops.md` §6) | Khôi phục vào DB tạm ✓ (§4.3); quy trình drop / restore đầy đủ đã chạy ở Phase 1 |

Log: [`evidence/g5/05-rollback-p2-to-p1.txt`](evidence/g5/05-rollback-p2-to-p1.txt).

**Giám sát sau nâng cấp ở kho** (`docs/ops.md` §8):
- `dc ps`: mọi service healthy / Up.
- `dc logs migrate`: phải có dòng `0004: … held_before=… protected_after=… chênh=…` với `protected_after ≥ held_before`.
- `dc logs api worker beat vision | grep schema_version`: chỉ có `schema_version_ok`.
- `dc logs beat | grep -E 'j13|j14'`: beat gửi J-13 sau 15 phút, J-14 sau 30 phút.
- `dc logs worker | grep recon_run`.
- `dc logs api worker-sync caddy | grep -E 'token=|sig=' | grep -v REDACTED`: phải rỗng.
- Khung Sức khỏe hệ thống (API-81) và mục "Cần xử lý" trên `/admin`.
- Xem D15 (`/admin/recon`) vài chu kỳ trước khi tin số đếm (02 §10 mục 5).

## 6. Release note (cho người dùng)

**Hệ thống X — Phase 2 (hàng hoàn, đối soát, khiếu nại)**
- **Bàn nhận hàng hoàn**: station chuyển sang chế độ "Nhận hàng hoàn". Quét mã vận đơn hoặc mã đơn để mở phiên; camera tự ghi. Nhấn F2 để chụp ảnh. Chọn kết luận (OK / hư hỏng / thiếu / sai hàng / hộp rỗng / khác) rồi quét lại để đóng phiên. Mã lạ thì mở phiên "chưa xác định".
- **Hồ sơ hàng hoàn** (`/admin/returns`): danh sách đang về, quá hạn, đã nhận, chỉ hoàn tiền, chưa xác định. Mở từng hồ sơ để xem phiên, ảnh và kết luận.
- **Hồ sơ khiếu nại** (`/admin/claims`): tạo tự động khi kết luận có vấn đề, hoặc tạo tay. Có trạng thái, hạn và ghi chú. **Gói bằng chứng zip** gồm clip đóng gói + clip mở hoàn, video ghép có chữ và ảnh, kèm SHA-256.
- **Đối soát** (`/admin/recon`): 7 quy tắc cảnh báo kiện lệch (đã đóng gói chưa bàn giao, hoàn quá hạn, …), mỗi 30 phút.
- **Thay đổi so với Phase 1**: clip không còn được "Giữ" từng clip, mà được giữ theo **hồ sơ khiếu nại / hàng hoàn**. Clip đang giữ trước nâng cấp được chuyển thành hồ sơ "Chuyển từ cờ giữ" (hạn 30 ngày). Số ngày giữ clip có sàn 60 ngày; muốn giảm phải xác nhận.
- Đồng bộ yêu cầu trả hàng từ Shopee **chưa bật**: chờ xác nhận với tài khoản partner.

## 7. Việc còn lại trước go-live tại kho

Nguồn: 04a §6 (⛔), 02 §10, §4.4. Chưa xong thì không go-live.

| # | Việc | Phụ thuộc | Tiêu chí |
|---|---|---|---|
| 1 | ~~Sửa BUG-G5-P2-2~~ — đã sửa `3bfe6ae` + test hồi quy. Còn: chạy lại kịch bản R2b trên staging / server kho trước lần rollback thật đầu tiên | Ops | Downgrade từ chối khi còn J-01 trong hàng đợi |
| 2 | ~~Commit sửa G5~~ (`3bfe6ae`); `02` §10 2c ghi api thoát mã 3 (DEC-368) | Điều phối | Có trên `main` sau merge |
| 3 | **T-3 Shopee returns thật**: xác nhận API `returns`, mã chiều về, `needs_parcel`, hạn người bán, mapping lý do / trạng thái (TC-05.44, 05.45; DEC-202, 248, 258) → bật `SHOPEE_RETURNS_ENABLED=true`. Tra sàn khi quét ở bàn hoàn (API-11 / 104 / 105) | Shopee duyệt partner | TC pass trên tài khoản thật; J-13 chạy ra `RETURN_EXPECTED` |
| 4 | **T-4 camera thật + máy quét USB**: ảnh Cam 1 ≤ 2 giây với GOP thật (HW.01), nhãn kiện hoàn đọc được trên clip Cam 2 (HW.02), 20 kiện hoàn thật (HW.03, Q6), máy quét HID ở ô ghi chú (HW.04) | Camera, bàn thử | TC-HW.01..04 pass |
| 5 | **Server kho**: dựng theo `docs/ops.md` §1–2, checklist §11; nâng cấp theo §7.1 **ngoài giờ** (0003 khoá bảng kiện ≈ 34 giây / 1 triệu kiện); locust 1 giờ (N2.01); clip READY 30 phiên (N2.03); gói bằng chứng ≤ 3 phút 1080p (HW.05); J-14 trên dữ liệu thật; khôi phục sao lưu có đo thời gian | Mua / cấp server | 04a §4 đạt trên phần cứng kho |
| 6 | **Q13 — thời hạn khiếu nại của sàn**: PO chốt. Hiện đặt tạm: sàn retention 60 ngày, hạn hồ sơ 7 ngày, `LEGACY_HOLD` 30 ngày | PO | Q13 đóng; cài đặt `claim_deadline_days` khớp |
| 7 | **Điện thoại**: MP4 ghép có chữ phát được, chữ đọc được (TC-08.17, AC-25) | Thiết bị | Pass |
| 8 | **WAN**: rút WAN 30 phút, bàn hoàn vẫn chạy (AC-38, TC-04.36, N2.09) | Server + bàn thử | Pass |
| 9 | Phase 1 §7 còn mở (cài cert gốc trên máy trạm, ICE UDP trong LAN, sao lưu off-site) | — | Như 01 §7 |
| 10 | Tăng `version` `0.2.0`, gắn tag `v0.2.0` hai repo sau khi merge `main` | PR merge | `/healthz` báo 0.2.0 |

## 8. Chốt G5

| Mục | KQ |
|---|:-:|
| G4 ✅ (có điều kiện, DEC-367) | ✅ |
| Commit release xác định, build FE / image BE được | ✅ BE `66ac3d1`, FE `3acaad0` (lint / test theo G4) |
| Nâng cấp từ Phase 1 có dữ liệu thật, theo đúng ops §7.1 | ✅ |
| Dữ liệu Phase 1 còn nguyên, `LEGACY_HOLD` đúng 0004 | ✅ |
| `schema_guard`, 0004 từ chối khi còn service cũ, image cũ không chạy trên 0005 | ✅ (api mã 3 — OBS-1) |
| Smoke Phase 2 (API 32/32, FE 0 lỗi console / CSP, beat J-13 / J-14) | ✅ |
| Smoke phần cần Shopee / adapter (tra sàn, J-13 thật) | ⬜ chưa test — T-3 |
| Sao lưu + khôi phục trên 0005 | ✅ 29/29 |
| Downgrade 0005 → 0002, Phase 1 chạy lại, nâng cấp lại | ✅ |
| Điều kiện từ chối downgrade | ✅ (a) staging; (b) BUG-G5-P2-2 đã sửa `3bfe6ae`, kiểm bằng test INT migration thật — R2b staging chưa chạy lại |
| Lỗi compose G5 đã sửa và kiểm lại | ✅ BUG-G5-P2-3 (`3bfe6ae`) |
| Log không lộ secret / `sig` | ✅ |
| Staging đã dọn, stack dev nguyên vẹn | ✅ |
| Deploy production tại kho | ⬜ chưa (DEC-56), §7 |

**Kết luận (cập nhật sau sửa, điều phối):** **G5 ✅ có điều kiện (DEC-368)** — Phase 2 sẵn sàng release ở mức staging local; deploy kho chờ §7. Đoạn dưới là kết luận Ops lúc phát hiện lỗi (giữ để truy vết).

**Kết luận (Ops, trước khi sửa):** Phase 2 **chưa sẵn sàng chốt G5**, kể cả ở mức staging local.

Lý do là BUG-G5-P2-2 (Medium). Lỗi này nằm trong đường lùi về Phase 1 và làm mất clip bằng chứng của phiên hoàn mà không cứu lại được từ UI. Rollback là thao tác hiếm, nhưng đây là lối thoát duy nhất của bản nâng cấp có migration dữ liệu.

Đề xuất: BE sửa lỗi theo `ai-dev-fix`, có test hồi quy, rồi Ops chạy lại kịch bản R2b + R6–R8. Trong khi chờ, điều phối có thể chấp nhận lỗi bằng DEC, kèm biện pháp vận hành: trước bước 3 của "Lùi về Phase 1", chờ `redis-cli llen video` = 0 và mọi phiên hoàn có clip READY.

Ops không tick G5 trong `00-status`. Điều phối đã sửa theo đề xuất (a) + (b) — (c) API-46 tạo lại clip khi phiên không có dòng clip: backlog — và chốt G5 có điều kiện (DEC-368).
