# BE Spec — 03 Mở rộng: TikTok Shop, báo cáo, sao lưu, link chia sẻ, thông báo · ai-cam-be (api, worker, beat)

| | |
|---|---|
| Tác giả | khanhtt (BE, agent soạn, tự quyết theo ủy quyền user) |
| Reviewer | khanhtt (tech lead, review ở bước 5) |
| Trạng thái | **In review** · v0.1 |
| Tổng quan & contract | [02-tech-spec.md](02-tech-spec.md) v0.1 · SRS [01-srs.md](01-srs.md) v0.2 · nền [item 02 02a](../02-returns-reconciliation/02a-be-spec.md) (bài học G3: DEC-266, 336, 338, 342, 361, 362) · ADR-009 (bổ sung), [ADR-010](../../system/decisions/ADR-010-shared-cloud-object-store.md), [ADR-011](../../system/decisions/ADR-011-multi-platform-shops-status-groups.md) |
| Last update | 2026-10-06 · BE |

> **TL;DR** — `platforms` thành đa sàn đa shop (registry, tra song song, fan-out một task / shop, khóa grant, nhóm trạng thái) + adapter TikTok (client ký HMAC, OAuth nhiều shop, đơn / kiện / hủy / trả hàng) + mock TikTok 2 shop. 4 module mới: `cloud` (boto3 S3, mã hóa `AICAMENC1`, giới hạn tốc độ Redis), `backup` (J-20..23, API-180..185, CLI khôi phục), `shares` (API-160..164, J-24/25, template W1), `notify` (API-170..176, J-26..28, Telegram / Zalo / mock). `reports` thêm API-150..153. Hardening L11 / L13 / L14 / L15 trong `sessions`, `approvals`, `claims`, `media.protection`, `reports`.
> 2 migration: **0006** (25 cột + 9 bảng + backfill nhóm trạng thái + index báo cáo, chỉ thêm), **0007** (unique theo shop); downgrade sang `phase3_archive`; `SCHEMA_HEAD = "0007"`.
> Điểm khó nhất: (1) bỏ giả định "một shop" ở ~15 chỗ đọc đơn theo mã mà không phá thứ tự khóa DEC-266; (2) mã hóa luồng + tải lên có giới hạn tốc độ, khôi phục kiểm được; (3) chống spam thông báo đúng BR-36 mà không mất tin.
> 30 task T-201..T-230 (≈ 54 ngày công), mỗi task ≤ 2 ngày. Mọi tích hợp ngoài chạy được bằng mock / MinIO; với tài nguyên thật: "chưa test — thiếu tài nguyên" (CO-07).

Không viết lại contract: request / response / mã lỗi theo [02 §6](02-tech-spec.md#6-api-contract).

---

## 1. Phạm vi

| Goals (spec này làm) | Non-goals (cố ý không làm — để đâu) |
|---|---|
| API-150..156, 160..164, 170..176, 180..185, CLI API-186 + mở rộng API-04, 10, 11, 12, 20, 21, 30, 31, 32, 70..73, 80, 81, 92, 110, 120, 130..132, 134, 136..138, WS-02 | Gửi khiếu nại lên sàn; Lazada (02 Non-goals) |
| Adapter TikTok + mock; đa shop Shopee; job một task / shop | Token bucket gọi sàn theo shop (ADR-007 backlog) — chỉ thử lại + `Retry-After` như Shopee |
| J-20..J-28; mở rộng J-02 (bảo vệ theo `removed_at`), J-04, J-05, J-06, J-11, J-12, J-13, J-16 | Đổi khóa sao lưu (backlog) |
| Migration 0006 + 0007 có downgrade + test; `alembic check` khớp model | Kiểm với TikTok / bucket / bot thật — "chưa test, thiếu tài nguyên" |
| W1 template HTML (BE sinh — DEC-428) | Đếm lượt xem link |
| MinIO + `minio-init` ở `compose.dev.yml`; `worker-backup` ở cả hai compose | |

| API / job / lệnh | FR | Module |
|---|---|---|
| API-70..73, 154..156; J-04/05/06/12/13 fan-out; `platforms.lookup` | FR-05.13, 05.14, 05.19, 05.20 | `platforms` |
| Adapter TikTok (đơn, kiện, hủy, trả) + mapping | FR-05.07, 05.08, 05.15..05.18, 05.21, 05.22 | `platforms/tiktok` |
| Unique theo shop, nhóm trạng thái, `package_order`, EX-T2 | FR-05.14, 05.21, 05.22, BR-29, BR-30 | `orders`, `returns`, `reconciliation`, `sessions` |
| API-10, 11, 12, 101 (PACK), 20, 21 | FR-03.03, 03.16, 04.14, 05.17 | `sessions`, `approvals` |
| API-131, 132, 134, J-16, `media.protection` | FR-08.07, 08.09, 08.10 | `claims`, `media` |
| API-110, 32 | FR-08.08, 09.01 | `returns`, `reports` |
| API-150..153 | FR-09.02..09.07 | `reports` |
| API-180..186, J-20..23, API-81 `backup` | FR-02.08, 02.13..02.18 | `cloud`, `backup` |
| API-160..164, J-24, J-25, W1 | FR-07.05, 07.07..07.09 | `shares` |
| API-170..176, J-26..28 | FR-06.04, 06.07..06.11 | `notify` |
| API-30, 110, 120, 130 lọc sàn / shop; API-04, 92 | FR-07.01, FR-10.02, 10.03 | `orders`, `returns`, `reconciliation`, `claims`, `users`, `core` |
| CLI `seed-demo` | — | Thêm 2 shop Shopee mock + 2 shop TikTok mock, đơn mọi nhóm trạng thái, 1 link, 1 kênh mock |

## 2. Cấu trúc code

Theo bố cục module hiện có (`models.py` · `schemas.py` · `service.py` · `router.py`; module gọi nhau qua `service` / `queries`). import-linter: thêm `cloud`, `backup`, `shares`, `notify` vào lớp `modules`; `cloud` không import module nghiệp vụ nào (contract mới).

| Layer / module | File | Mới / sửa | Trách nhiệm |
|---|---|:---:|---|
| alembic | `alembic/versions/0006_phase3_schema.py` | Mới | §3 bước 0006: cột, bảng, CHECK, backfill, index; downgrade → `phase3_archive` |
| alembic | `alembic/versions/0007_order_unique_per_shop.py` | Mới | Unique theo shop; downgrade có kiểm trùng |
| core | `core/schema_guard.py` | Sửa | `SCHEMA_HEAD = "0007"` |
| core | `core/settings.py` | Sửa | Biến §9 + validator production (khóa đủ khi cờ bật; `TIKTOK_ADAPTER=mock` cấm ở production) |
| core | `core/audit.py` | Sửa | 15 action (02 API-92) |
| core | `core/logging.py` | Sửa | Che `X-Amz-Signature`, `X-Amz-Credential`, `access_token`, `sign`, `app_secret`, `refresh_token`, bot token trong URL `api.telegram.org/bot…` |
| users | `modules/users/permissions.py` | Sửa | Quyền mới (02 §8 AuthZ) |
| realtime | `realtime/publish.py`, `realtime/hub.py` | Sửa | Kênh `ws:admin` (chỉ ADMIN), `share.updated`, `backup.updated`, `shop.updated` |
| platforms | `base.py` | Sửa | `ORDER_STATUS_GROUPS`, `RETURN_STATUS_GROUPS` (5); `PlatformOrder.status_group`, `fulfilled_by_platform`, `merged_order_sns`; `PlatformReturn.status_group`, `is_exchange`; `ShopCredentials.shop_cipher`, `grant_ref`, `shop_name`, `region`; `exchange_code(...) -> list[ShopCredentials]`; bỏ `CANCELLED_STATUSES`, `PlatformOrder.is_cancelled` đọc nhóm |
| platforms | `registry.py` | Mới | `adapter_for(platform, settings)`, `enabled_platforms(settings)`, `is_configured(platform, settings)`, `returns_enabled(platform, settings)`; thay `service.get_adapter` / `is_configured` (giữ tên cũ làm alias Shopee) |
| platforms | `budget.py` | Mới | `time_budget(seconds)` / `deadline()` — chuyển từ `shopee/client.py:58`, dùng chung |
| platforms | `grants.py` | Mới | `ensure_fresh(shop)` dưới khóa Redis `grant:{platform}:{ref}` (DEC-433) — thay `sync.ensure_fresh` |
| platforms | `lookup.py` | Mới | `find_everywhere(session, code, settings) -> LookupResult` (BR-32) |
| platforms | `dispatch.py` | Mới | Task phân phối: shop `CONNECTED` của sàn bật → `send_task` một task / shop |
| platforms | `service.py`, `router.py`, `schemas.py` | Sửa | API-70 (`platforms[]`, cảnh báo), API-71 theo sàn, API-72 không ngắt shop khác + `expired`, API-154, API-155, `RESULT_PATH = /admin/settings/platforms` |
| platforms | `sync.py` | Sửa | Hàm theo **một shop** (`sync_shop_orders`, `verify_shop_unverified`, `sync_shop_shipping`, `sync_shop_returns`, `refresh_shop_token`); `_order_return_signal` đọc nhóm `RETURNING`; tra đơn theo (shop, mã) |
| platforms/shopee | `mapping.py`, `returns_mapping.py`, `adapter.py` | Sửa | Trả nhóm chung; `exchange_code` trả list một phần tử |
| platforms/tiktok | `client.py`, `adapter.py`, `mapping.py`, `returns_mapping.py` | Mới | §7.1 |
| platforms/mock | `adapter.py` (Shopee nhiều shop), `tiktok.py`, `fixtures/tiktok/{orders,returns,cancellations}/*.json` | Sửa / mới | §7.2 |
| orders | `models.py`, `service.py`, `packages.py`, `router.py` | Sửa | `PLATFORMS`, unique theo shop, `PackageOrder`, `upsert_platform_order(…, shop)` nhận đơn file + EX-T2 + kiện gộp; `is_cancelled` theo nhóm; API-30/31 trường + lọc |
| returns | `models.py`, `service.py`, `views.py`, `router.py`, `schemas.py` | Sửa | `shop_id`, nhóm; bỏ `SHIPPED_PLATFORM_STATUSES`, `AWAITING_ACCEPT_STATUSES` (đọc nhóm); API-110 |
| reconciliation | `rules.py`, `service.py`, `router.py` | Sửa | BR-10/11/14/19 theo nhóm; API-120 lọc |
| sessions | `service.py`, `return_scan.py`, `return_state.py`, `schemas.py` | Sửa | Tra song song; `OPERATOR_REQUIRED` ở PACK; `ORDER_CANCEL_REQUESTED`; chép `operator_name` vào phiên PACK; BR-37; `self_cancel_until`; trường sàn / shop / kiện gộp |
| approvals | `service.py`, `views.py`, `schemas.py` | Sửa | `return_summary`; `note` bắt buộc khi hủy phiên RETURN |
| claims | `models.py`, `service.py`, `views.py`, `pack.py`, `schemas.py`, `router.py` | Sửa | BR-39 `auto_evidence`; BR-38 bỏ mềm; BR-42; API-130 lọc; API-132 trường; J-16 phiên chính; `submitted_at` / `result_at` |
| media | `protection.py` | Sửa | (a) tính `removed_at`; `evidence_targets_sql()` cho J-21 |
| reports | `service.py` | Sửa | API-32 counts / attention mới, lọc vai sau cache |
| reports | `analytics.py`, `csv_export.py`, `schemas.py`, `router.py` | Mới / sửa | API-150..153 |
| settings | `models.py`, `schemas.py`, `service.py` | Sửa | Trường mới; API-81 `backup`, `sync[].platform` |
| cloud | `config.py`, `store.py`, `crypto.py`, `ratelimit.py` | Mới | `ObjectStore` (Protocol) + `S3Store` (boto3) + `MemoryStore` (test); `encrypt_stream` / `decrypt_stream`; token bucket Redis |
| backup | `models.py`, `schemas.py`, `service.py`, `jobs.py`, `restore.py`, `router.py` | Mới | §4, §7.3 |
| shares | `models.py`, `schemas.py`, `service.py`, `build.py`, `cleanup.py`, `w1.py`, `templates/w1.html`, `router.py` | Mới | §4, §7.4 |
| notify | `models.py`, `schemas.py`, `catalog.py`, `service.py`, `conditions.py`, `dispatch.py`, `render.py`, `summary.py`, `providers/{base,telegram,zalo,mock}.py`, `router.py` | Mới | §4, §7.5 |
| workers | `tasks.py`, `celery_app.py` | Sửa | Task + route + beat §7 |
| entrypoints | `cli.py`, `seed_returns.py` → `seed_phase3.py` (mới) | Sửa / mới | `backup-keygen`, `backup-restore`, `backup-verify`; seed |
| docker | `Dockerfile` (`postgresql-client-16`), `compose.dev.yml` (`minio`, `minio-init`, `worker-backup`, `worker-sync -c 4`, biến mới), `compose.yml` (`worker-backup`, `worker-sync -c 4`), `.env.production.example` | Sửa | §9 |
| docs | `docs/ops.md` §6.2 "Sao lưu cloud", §7.2 "Phase 3", §10 sự cố mới | Sửa | Runbook giữ khóa, khôi phục, nâng cấp / lùi |
| tests | `tests/unit/test_{status_groups,lookup,grants,crypto,ratelimit,notify_rules,report_formulas,w1_render,tiktok_sign,tiktok_mapping}.py`, `tests/integration/test_{multishop_sync,fanout_isolation,order_unique_shop,cancel_rule_br37,evidence_prior_br39,evidence_remove_br38,deadline_br42,refund_pending_br40,reports_api,backup_jobs,shares_api,notify_dispatch,migration_0006_0007}.py`, `tests/contract/spec.py` (+ API Phase 3), `tests/qa/test_m11..m16_live.py`, `tests/load/perf_reports.py`, `tests/unit/test_no_platform_status_in_core.py` | Mới / sửa | §11 |

## 3. Data

Enum lưu `text` + CHECK (`enum_check`). Khóa uuid v7; thời gian `timestamptz` UTC.

**Bảng sửa (0006 — chỉ thêm)**

| Bảng | Field | Kiểu | Null | Default | Index / ràng buộc |
|---|---|---|:---:|---|---|
| shop | `platform` (CHECK mở rộng) | text | | | CHECK `IN ('SHOPEE','TIKTOK')` (drop + create) |
| shop | `grant_ref` | text | ✔ | | index `(platform, grant_ref)`; Shopee = `platform_shop_id` (backfill) |
| shop | `shop_cipher`, `region` | text | ✔ | | TikTok |
| shop | `sync_warnings` | jsonb | | `'[]'` | ≤ 20 phần tử (service cắt) |
| shop | `error_since` | timestamptz | ✔ | | đặt khi `last_error` null → có; xóa khi thành công (N06 — DEC-467) |
| shop | `disconnected_at`, `disconnected_by` | timestamptz, uuid | ✔ | | |
| order | `platform_status_group` | text | | `'UNKNOWN'` | CHECK 8 nhóm; index `(platform_status_group)`; backfill theo bảng Shopee 02 §5.3 |
| order | index `ix_order_platform_order_sn` | | | | btree `(platform_order_sn)` — tra theo mã khi unique không còn toàn cục; index `(shop_id)` |
| return_case | `shop_id` | uuid FK shop SET NULL | ✔ | | index; backfill từ `order.shop_id` |
| return_case | `platform_status_group` | text | ✔ | | CHECK 5 nhóm; backfill từ `platform_status` (Shopee) |
| return_case | index `(created_at)`, `(received_at)` | | | | báo cáo |
| claim | `submitted_at`, `result_at` | timestamptz | ✔ | | index mỗi cột; backfill từ `audit_log` `CLAIM_UPDATE` (`data.after.status`) — DEC-461 |
| claim | index `(created_at)` | | | | báo cáo |
| claim_evidence | `removed_at`, `removed_by`, `removed_reason` | timestamptz, uuid, text | ✔ | | CHECK `(removed_at IS NULL) = (removed_reason IS NULL)`; index một phần `(removed_at) WHERE removed_at IS NOT NULL` |
| setting | `packer_name_required` | bool | | false | |
| setting | `refund_only_default_hours` | int | | 48 | CHECK 1..168 |
| setting | `quiet_hours_enabled`, `quiet_start`, `quiet_end` | bool, time, time | | true, `22:00`, `07:00` | CHECK `quiet_start <> quiet_end` |
| setting | `backup_enabled` | bool | | false | |
| setting | `backup_confirmed_fingerprint`, `backup_confirmed_at`, `backup_confirmed_by` | text, timestamptz, uuid | ✔ | | |
| setting | `backup_upload_mbps` | int | | 10 | CHECK 1..1000 |
| setting | `backup_all_pack_clips` | bool | | false | |
| status_history | index `ix_status_history_to_status_at` | | | | `(to_status, at)` — "kiện chuyển Đã bàn giao trong kỳ" |
| session | index `ix_session_type_status_ended` | | | | `(type, status, ended_at)` — báo cáo |

**Bảng mới (0006)**

| Bảng | Field | Kiểu | Null | Default | Index / ràng buộc |
|---|---|---|:---:|---|---|
| package_order | `package_id` FK package CASCADE, `order_id` FK order CASCADE, `created_at` | uuid, uuid, timestamptz | | now() | PK (package_id, order_id); index `(order_id)` |
| share_link | `id`, `status`, `source_type`, `claim_id` (FK claim SET NULL), `package_id` (FK RESTRICT), `layout`, `include_snapshots`, `recipient`, `expires_at`, `object_prefix` (`share/{token}/`), `url_enc` (bytea, Fernet), `object_keys` (jsonb), `progress`, `step`, `step_index`, `step_total`, `error_code`, `error_message`, `created_by` (FK user), `created_at`, `revoked_at`, `revoked_by`, `cloud_deleted_at`, `job_started_at` | … | theo nghĩa | `status='CREATING'`, `progress=0` | CHECK status, source_type (`CLAIM`/`SESSION`), layout; unique `object_prefix`; index `(status, expires_at)`, `(created_by, created_at)`, `(claim_id)`, `(package_id)`, `(created_at)` |
| share_item | `share_id` FK CASCADE, `ord` (1..4), `session_id` FK session RESTRICT, `video_key`, `video_sha256`, `size_bytes`, `source_sha256` jsonb, `snapshot_ids` uuid[] | | | | PK (share_id, ord); index `(session_id)` |
| backup_run | `id`, `kind` (`DB`), `trigger` (`SCHEDULE`/`MANUAL`), `status`, `started_at`, `finished_at`, `size_bytes`, `object_key`, `imports_object_key`, `error`, `created_by` | | | | index `(started_at)`; partial unique `(kind) WHERE status = 'RUNNING'` (một lượt chạy) |
| backup_object | `id`, `kind` (`DB_DUMP`/`IMPORTS`/`CLIP`/`SNAPSHOT`), `clip_id` FK RESTRICT, `snapshot_id` FK RESTRICT, `run_id` FK backup_run CASCADE, `object_key`, `status`, `sha256`, `size_bytes`, `encrypted_size`, `attempts`, `next_attempt_at`, `uploaded_at`, `cloud_deleted_at`, `last_error`, `reason` (`EVIDENCE`/`ALL_PACK`), `created_at` | | | `status='PENDING'`, `attempts=0` | CHECK; unique `object_key`; partial unique `(clip_id) WHERE clip_id IS NOT NULL`, `(snapshot_id) WHERE snapshot_id IS NOT NULL`; index `(status, next_attempt_at)` |
| notify_channel | `id`, `name`, `type`, `target`, `events` text[], `enabled`, `last_status`, `last_sent_at`, `last_error` jsonb, `created_by`, `created_at`, `updated_at` | | | `enabled=true`, `last_status='NEVER'` | unique index `lower(name)`; CHECK type, `cardinality(events) >= 1` |
| notify_event | `id`, `code`, `severity`, `dedupe_key`, `occurred_at`, `data` jsonb, `processed_at` | | | | unique `(code, dedupe_key)`; index `(occurred_at) WHERE processed_at IS NULL` |
| notify_message | `id`, `channel_id` FK CASCADE, `event_code`, `severity`, `status`, `items` jsonb, `item_count`, `text`, `created_at`, `send_after`, `sent_at`, `attempts`, `next_attempt_at`, `last_error` | | | `status='QUEUED'` | CHECK status; index `(status, send_after)`, `(channel_id, created_at)`, `(channel_id, sent_at)` |
| notify_provider_token | `provider` (PK, `ZALO_OA`), `access_token_enc`, `refresh_token_enc`, `expires_at`, `updated_at` | bytea… | | | DEC-445 |

**0007** — đổi unique:
1. `SET LOCAL lock_timeout = '5s'`. Kiểm không có (`shop_id`, `platform_order_sn`) trùng / (`platform_order_sn` trùng trong `shop_id IS NULL`) — dữ liệu Phase 2 luôn đạt vì đang unique toàn cục.
2. Drop unique `order_platform_order_sn_key` (tên tạo ở 0001 — lấy từ `pg_constraint` lúc chạy, không đoán tên).
3. `CREATE UNIQUE INDEX uq_order_shop_sn ON "order" (shop_id, platform_order_sn) WHERE shop_id IS NOT NULL`; `uq_order_noshop_sn ON "order" (platform_order_sn) WHERE shop_id IS NULL`.
4. Drop `uq_return_case_platform_return_sn` → `uq_return_case_shop_return_sn ON return_case (shop_id, platform_return_sn) WHERE platform_return_sn IS NOT NULL`.
5. Model khai báo bằng `postgresql_where=text("shop_id IS NOT NULL")` — **literal**; code không dùng `ON CONFLICT` trên các index này (upsert dưới khóa `order:{sn}`).

**Migration 0006 — bước:** (1) `SET LOCAL lock_timeout = '5s'`; (2) bảng mới; (3) cột mới nullable / có default; (4) backfill: `order.platform_status_group` bằng `CASE` theo bảng Shopee (hằng trong migration — không import code), `return_case.platform_status_group`, `return_case.shop_id`, `shop.grant_ref = platform_shop_id`, `claim.submitted_at` / `result_at` từ `audit_log` (lần đầu `after.status = 'SUBMITTED'`; lần cuối `WON`/`LOST`), hồ sơ không có audit → `updated_at` nếu trạng thái hiện tại tương ứng; (5) index báo cáo **sau** backfill; (6) khôi phục từ `phase3_archive` nếu có (nâng cấp lại sau downgrade — như DEC-331) rồi drop schema; (7) log số dòng backfill, số `UNKNOWN`. Ước lượng: 0006 cập nhật mọi dòng `order` (1 cột) — đo ở T-201 trên 1 triệu đơn (máy dev), ghi vào ops §7.2.

**Downgrade (DEC-475):**
- 0007: đếm (`platform_order_sn`) trùng toàn bảng và (`platform_return_sn`) trùng → > 0 → `raise` kèm 20 mã đầu ("Có mã đơn trùng giữa shop — không lùi được về Phase 2, sửa tiến"). Không có → tạo lại unique toàn cục cũ.
- 0006: (a) link `CREATING`/`ACTIVE` → từ chối trừ `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES=1` (in danh sách). (b) `CREATE SCHEMA phase3_archive`; chép **trước**, xóa **sau**, một transaction: 9 bảng mới (`CREATE TABLE … AS SELECT *`); `shop_cols` (cột mới của shop); shop TikTok (`tiktok_shops`) + `order_shop` (đơn của shop TikTok → `shop_id`); shop Shopee `CONNECTED` trừ shop mới nhất → `DISCONNECTED` (danh sách vào `reconnected_shops` để khôi phục); `claim_evidence` đã bỏ (`removed_evidence`) — clip / ảnh của chúng còn trong hạn giữ (`removed_at ≥ now − số ngày giữ`) → `held = true`, `held_by` = người dùng hệ thống DEC-338 (tạo nếu chưa có), ghi `downgrade_held_clips_p3`; rồi xóa dòng đã bỏ; cột `claim.submitted_at`/`result_at`, `order.platform_status_group`, `return_case.{shop_id, platform_status_group}`, setting mới vào `*_cols`. (c) `order.shop_id = NULL` cho đơn TikTok, xóa shop TikTok, CHECK `platform` về `('SHOPEE')`, drop cột / bảng. (d) Log số dòng từng phần. Nâng cấp lại (0006 bước 6) khôi phục từ archive; cờ `held` do downgrade đặt → bỏ nếu chưa bị đổi (như DEC-332).
- Test: `tests/integration/test_migration_0006_0007.py` — lên → dữ liệu mẫu (2 shop, TikTok, link, kênh, bằng chứng đã bỏ) → xuống → kiểm `held` + archive → lên lại → dữ liệu như trước; trùng mã đơn → downgrade 0007 lỗi, DB nguyên vẹn.

**Dữ liệu nhạy cảm:** `shop.access_token_enc`, `refresh_token_enc`, `share_link.url_enc`, `notify_provider_token.*_enc` mã hóa Fernet (`FERNET_KEY`); `shop_cipher`, `object_prefix` không trả API; `notify_event.data` / `notify_message.text` chỉ có mã kiện / hồ sơ, sàn, shop, giờ (FR-06.09) — `render.py` có whitelist trường; `reason_text`, `buyer_note` không bao giờ vào thông báo / W1.

## 4. Implement API

| API | Validate input | AuthZ (kiểm ở đâu) | Logic chính | Transaction / lock | Lỗi trả về |
|---|---|---|---|---|---|
| API-70 | — | `require_roles("ADMIN")` | `registry` cho `platforms[]`; shop mọi trạng thái; `sync_in_progress` = Redis `sync:{shop}` tồn tại | Đọc | — |
| API-71 | `platform` ∈ `shopee`/`tiktok` | ADMIN | `registry.is_configured`; `state` Redis `oauth:{platform}:{state}` 10 phút + cookie băm (G3-N7) | — | 404, 503 `PLATFORM_NOT_CONFIGURED` |
| API-72 / API-155 | `state`, cookie | công khai + `state` | `GETDEL` state (không có → `expired`); `adapter.exchange_code` → list creds; mỗi cred upsert shop (`platform`, `platform_shop_id`) `FOR UPDATE` theo id tăng; `grant_ref`; **không** ngắt shop khác; audit `SHOP_CONNECT`; after_commit J-04 + J-13 mỗi shop; WS `shop.updated` | Một transaction | Redirect `result` (không ném lỗi ra trình duyệt) |
| API-73 | — | ADMIN | Như cũ, `registry.is_configured(shop.platform)`; lock `sync:{shop}` → `send_task` per shop | — | 404, 409, 503 |
| API-156 | — | ADMIN, SUPERVISOR, CSKH | `SELECT id, platform, name, auth_status FROM shop ORDER BY platform, name` | Đọc | — |
| API-154 | — | ADMIN | `SELECT … FOR UPDATE` shop; đã `DISCONNECTED` → trả luôn; còn lại: `DISCONNECTED`, xóa token, `disconnected_*`; audit `SHOP_DISCONNECT`; WS | Một transaction | 404 |
| API-10 | — | STATION | `build_state`: `order.platform` từ shop (đơn file → `null` sàn, chip "Chưa rõ sàn" chỉ khi `order = null`); `shop_name`; `merged_orders` từ `package_order`; `items[].platform_order_sn`; `operator_required` = setting ∧ `work_mode = PACK`; `self_cancel_until` (BR-37) | Đọc | — |
| API-11 | Như cũ | STATION | PACK: (1) `operator_required` ∧ chưa có tên → ALERT `OPERATOR_REQUIRED {mode: PACK}` (trước mọi tra cứu); (2) mã lạ → `lookup.find_everywhere` ngoài khóa station; (3) mở phiên: `is_cancelled` → nhóm `CANCEL_REQUESTED` → `ORDER_CANCEL_REQUESTED`, `CANCELLED` → `ORDER_CANCELLED`; chép `operator_name`; cờ `AMBIGUOUS_SHOP` khi lookup trả ≥ 2 | Như Phase 2 (DEC-266) | Như cũ |
| API-12 | Như cũ | STATION | Phiên RETURN: dưới khóa station, `now − started_at ≤ 60 giây` ∧ `inspection_saved_at IS NULL` ∧ không có `snapshot.kind = MANUAL` của phiên → hủy như Phase 2; ngược lại 409 | Khóa station | 409 `CANCEL_REQUIRES_SUPERVISOR` |
| API-20 | — | ADMIN, SUPERVISOR | `return_summary` cho item `session_type = RETURN` (một truy vấn gộp đếm ảnh) | Đọc | — |
| API-21 | `note` 5–500 khi `CANCEL_SESSION` ∧ phiên RETURN (service, `details.fields` tiếng Việt — C-05) | ADMIN, SUPERVISOR | Như Phase 2 | Như Phase 2 | 422 |
| API-30 / 110 / 120 / 130 | `platform` enum, `shop_id` uuid; API-30 `session_status` danh sách (≤ 4 giá trị); API-110 `sort`, `pending_only` | 3 vai | Join `shop` theo `order.shop_id` (API-110 `return_case.shop_id`); API-110 `response_due_at` = `COALESCE(seller_due_at, reported_at + make_interval(hours => :h))` (SQL, dùng cho cả sắp xếp); `claim` = subquery hồ sơ chưa đóng mới nhất của đơn; `pending_only` = BR-40 | Đọc | 422 |
| API-31 | — | 3 vai | Thêm trường đơn; `shares` (≤ 3, mọi trạng thái trừ `FAILED`, theo `share_item.session_id ∈` phiên của kiện); `url` giải mã chỉ khi `ACTIVE` | Đọc | — |
| API-32 | `date` như cũ | 3 vai | Counts / attention mới (§5); cache 5 giây giữ nguyên; lọc `SYNC_ERROR`, `BACKUP_STALE` theo vai **sau** cache | Đọc | — |
| API-80 | `packer_name_required` bool, `refund_only_default_hours` 1–168 | GET ADMIN, SUPERVISOR; PUT ADMIN | Như cũ + trường mới; đổi `packer_name_required` → after_commit publish state mọi station | Như cũ | 422 |
| API-81 | — | ADMIN, SUPERVISOR | `backup` = `backup.service.health_summary()`; `sync[]` + `platform`, `shop_name` | Đọc | — |
| API-131 / tự tạo | Như cũ | Như cũ | `claims._deadline`: `seller_due_at < now` → mặc định + `DEFAULT_PLATFORM_PASSED` + ghi chú hệ thống (BR-42); `auto_evidence` thêm phiên RETURN trước có clip (BR-39) | Như Phase 2 (khóa clip / ảnh — DEC-251, B-1) | Như cũ |
| API-132 | — | 3 vai | `evidence` = `removed_at IS NULL`; `removed_evidence`; `primary` / `prior_return` (DEC-448); `removal_keep_until`; `prior_return_sessions`; `shares` | Đọc | — |
| API-134 | `note` 5–500 khi bỏ ≥ 1 bằng chứng bất kỳ | 3 vai | Khóa hồ sơ + `version`; bằng chứng bị bỏ → `removed_at/by/reason` (không `DELETE`); thêm phiên / ảnh có dòng đã bỏ → xóa `removed_*`; ghi chú; audit `CLAIM_EVIDENCE_REMOVE` mỗi mục + `CLAIM_EVIDENCE_UPDATE` | Khóa claim → clip → snapshot (DEC-251) | 422, 409 |
| API-136..138 / J-16 | Như cũ | Như cũ | `_session_rows`: chỉ `removed_at IS NULL`; phiên chính theo DEC-448; thư mục `NN-mo-hoan-phien-truoc-…` cho `prior_return` | Như cũ | Như cũ |
| API-150 / 151 / 152 | `from` ≤ `to` ≤ hôm nay (VN), ≤ 366 ngày; `platform`, `shop_id`, `station_id` (152) | 150/151: 3 vai; 152: ADMIN, SUPERVISOR | `analytics.returns_report()` / `claims_report()` / `productivity_report()` — SQL theo tập §8; cache Redis 60 giây khóa `report:{name}:{sha1(filters)}` | `SET LOCAL statement_timeout = '15s'` | 422, 503 `REPORT_TIMEOUT`, 403 |
| API-153 | Như 150..152; `report` enum | Theo report | Gọi hàm báo cáo → `csv_export.render(report, data)` (BOM, `;`? **không** — dấu phẩy, số kiểu VN trong chuỗi) → `StreamingResponse`; audit `REPORT_EXPORT` | Như trên | 404, 422, 403 |
| API-160 | §6 02: số phiên 1..4, tổng `duration_s` ≤ 1.800, `recipient` 3–100 sau trim, `expires_days ∈ {1,3,7}`, phiên thuộc nguồn | 3 vai | `cloud.is_configured` (else 503); với mỗi phiên: Cam 1 `READY` (else 409 `SESSION_CLIP_UNAVAILABLE`); tạo `share_link` (`object_prefix` = `share/{token_urlsafe(32)}/`), `share_item` ord; audit `SHARE_CREATE` (`recipient`, nguồn, số phiên, hạn — **không** URL); after_commit J-24 | Một transaction, khóa claim `FOR SHARE` (đọc `evidence` nhất quán) | 422, 409, 503, 404, 403 |
| API-161 / 162 | `status`, `q` ≤ 64, `mine`, `created_by`, `claim_id`, `package_id` | 3 vai | Liệt kê + `counts` (một truy vấn `FILTER`); `url` giải mã Fernet khi `ACTIVE`; `can_revoke` | Đọc | 404 |
| API-163 | — | ADMIN, SUPERVISOR; CSKH chỉ `created_by = p.user_id` (service) | `FOR UPDATE`; `CREATING`/`ACTIVE` → `REVOKED`, `revoked_*`, `revoke_pending = true` (= `cloud_deleted_at IS NULL`); audit `SHARE_REVOKE`; after_commit J-25 `delete_share(id)` ngay | Một transaction | 403, 409 `SHARE_NOT_ACTIVE`, 404 |
| API-164 | đúng một nguồn | 3 vai | §6 02; `duration_s` từ clip Cam 1 | Đọc | 422, 404 |
| API-170..173 | `name` 2–40 (trim), `target` (Telegram: `^-?\d{1,20}$`; Zalo: `^\d{1,64}$`), `events` ⊆ N01..N10 ≥ 1, `start`/`end` `HH:MM` | ADMIN | CRUD; `type` chưa cấu hình → 409 `PROVIDER_NOT_CONFIGURED`; trùng tên (unique `lower(name)` — bắt `IntegrityError` trong savepoint) → 409 `CHANNEL_NAME_EXISTS`; xóa → tin chờ `DROPPED`; audit `NOTIFY_CHANNEL_*` | Một transaction | 422, 409, 404 |
| API-174 | — | ADMIN | `providers[type].send(target, text)` với `asyncio.timeout(10)`; cập nhật `last_status`, `last_error`; audit `NOTIFY_TEST` | Gửi ngoài transaction, ghi kết quả sau | 502 `NOTIFY_SEND_FAILED`, 504 `NOTIFY_TIMEOUT` |
| API-175 | `status`, `channel_id`, trang | ADMIN | 30 ngày | Đọc | — |
| API-176 | `HH:MM`, khác nhau | ADMIN | Ghi setting; audit `NOTIFY_SETTINGS_UPDATE` | — | 422 |
| API-180 | — | ADMIN | `backup.service.status()` (đếm `backup_object` theo trạng thái — một truy vấn `FILTER`; `cloud_bytes` = tổng `encrypted_size` `UPLOADED` + DB còn giữ) | Đọc | — |
| API-181 | `upload_mbps` 1..1000 | ADMIN | `enabled: true` cần `state ∈ {ON, DISABLED}` với khóa đã xác nhận đúng dấu vân tay; audit | — | 409 `BACKUP_KEY_UNCONFIRMED`, 503, 422 |
| API-182 | `fingerprint` | ADMIN | So `crypto.fingerprint(BACKUP_ENCRYPTION_KEY)`; khớp → lưu, `backup_enabled = true`; audit `BACKUP_KEY_CONFIRM` | — | 409 `BACKUP_KEY_MISMATCH`, 503 |
| API-183 | — | ADMIN | `store.probe()` (PUT / GET / DELETE `backup/_probe/{uuid}`) trong `asyncio.timeout(10)`; phân loại lỗi boto3: `InvalidAccessKeyId`/`SignatureDoesNotMatch`/`AccessDenied` → 502 `CLOUD_AUTH_FAILED`; `EndpointConnectionError`/timeout → 504; khác → 502 `CLOUD_ERROR`; audit `BACKUP_TEST` | — | 502, 504, 503 |
| API-184 | — | ADMIN | `state = ON` (else 409); INSERT `backup_run RUNNING` (partial unique → `IntegrityError` → 409 `BACKUP_RUNNING`); after_commit J-20 `run_db(run_id)`; audit `BACKUP_RUN_NOW` | — | 409, 503 |
| API-185 | `kind`, trang | ADMIN | `backup_object` `HASH_MISMATCH` / `FAILED` (attempts ≥ 3) join clip → session → package | Đọc | — |

## 5. Quy tắc nghiệp vụ → nơi thực thi

| BR | Thực thi ở | Test |
|---|---|---|
| BR-01 (theo nhóm) | `orders.is_cancelled()` đọc `order.platform_status_group ∈ {CANCEL_REQUESTED, CANCELLED}`; `sessions._open_session_unsafe` chọn alert theo nhóm | `test_status_groups` (TikTok yêu cầu hủy → `ORDER_CANCEL_REQUESTED`) |
| BR-21 | `orders.apply_platform_cancel` gọi khi nhóm đổi sang `CANCEL_REQUESTED` / `CANCELLED` (không còn so chữ) | AC-41 kịch bản hủy khi đang đóng |
| BR-29 | Index 0007; `orders.upsert_platform_order(session, data, shop)`: dưới `order:{sn}` tìm (shop, mã) → không có → tìm đơn file (`shop_id IS NULL`, mã) → nhận (đặt `shop_id`, `source = API`, audit `ORDER_OVERWRITTEN_BY_API` như BR-17) → không có → tạo. Mã vận đơn của kiện thuộc đơn **shop khác** → bỏ qua kiện đó, `platforms.warn(shop, TRACKING_OWNED_BY_OTHER_SHOP)`; cùng shop → như Phase 1 | `test_order_unique_shop` (2 shop cùng mã → 2 đơn; EX-T2; nhận đơn file) |
| BR-30 | `platforms/<sàn>/mapping.order_group(raw)`; `UNKNOWN` → `sync` không gọi `transition`, log `platform_status_unknown`; `test_no_platform_status_in_core` (tìm chuỗi trạng thái TikTok + Shopee trong `src/aicam` ngoài `platforms/{shopee,tiktok,mock}` = 0) | AC-41, AC-44 |
| BR-31 | `tiktok/returns_mapping.py` (loại → `needs_parcel`, `is_exchange`; trạng thái → nhóm); `returns.clock_started()` đọc nhóm `REQUESTED` thay danh sách chữ | AC-42 (6 kịch bản fixture) |
| BR-32 | `platforms.lookup.find_everywhere`: đọc shop + creds (DB) → `asyncio.gather(*(asyncio.wait_for(adapter.find_by_tracking(c, code), 2.0)))` với `return_exceptions=True`; tổng bọc `asyncio.timeout(settings.platform_lookup_timeout_s + 0.2)`; kết quả: 1 → upsert (savepoint), ≥ 2 → `AMBIGUOUS_SHOP` | `test_lookup` (1 shop chậm 5 giây, 1 có đơn → ~2 giây), AC-43 |
| BR-33 | `media.protection.evidence_targets_sql(now, cutoff)` = (a)–(d) clip `READY` + ảnh `READY`; + `backup_all_pack_clips` → clip phiên PACK `COMPLETED`; J-21 INSERT `ON CONFLICT (clip_id) WHERE clip_id IS NOT NULL DO NOTHING` (vị từ literal — DEC-362) | `test_backup_jobs` (video thô / clip không thuộc BR-33 không có trên bucket) |
| BR-34 | `shares`: `expires_at = now + expires_days`; URL ký `ExpiresIn = expires_at − now` (≤ 604.800); J-25: `ACTIVE ∧ expires_at ≤ now` → `EXPIRED` + xóa; thu hồi → J-25 ngay | AC-52 đồng hồ giả |
| BR-35 | API-160 validate; J-24 ảnh ≤ 20 | `test_shares_api` |
| BR-36 | `notify.dispatch` (§7.5) | `test_notify_dispatch` (AC-54 đủ 5 luật) |
| BR-37 | `sessions.cancel` (API-12) + `return_state.self_cancel_until` | `test_cancel_rule_br37` (45 giây được; 61 giây 409; có ảnh 409; có kết luận 409) |
| BR-38 | `claims.set_evidence` bỏ mềm; `protection.claim_session_ids` / `claim_snapshot_ids`: `(removed_at IS NULL AND (status <> 'CLOSED' OR closed_at >= cutoff)) OR removed_at >= cutoff`; `removal_keep_until` | `test_evidence_remove_br38` (clip quá hạn bị bỏ không bị J-02 xóa đêm đó; xóa đúng sau hạn) — AC-58 |
| BR-39 | `claims.auto_evidence(…, prior=True)`: phiên RETURN của kiện / hồ sơ hàng hoàn với `status ∈ (CANCELLED, ABANDONED)` có ≥ 1 clip `≠ DELETED`; `views.primary_session()`; `pack._session_rows` sắp theo cùng hàm | `test_evidence_prior_br39` — AC-56 |
| BR-40 | SQL dùng chung `returns.queries.refund_pending_filter(now, hours)` cho API-110 `pending_only`, API-32, J-26 N04 | `test_refund_pending_br40` — AC-57 |
| BR-41 | `reports.analytics` (công thức §8) | `test_report_formulas` (bộ dữ liệu cố định = ví dụ BR-41) — AC-45..47 |
| BR-42 | `claims._deadline` | `test_deadline_br42` — AC-59 |

## 6. Concurrency & toàn vẹn

**Thứ tự khóa (DEC-266 mở rộng):** Redis `grant:{platform}:{ref}` (chỉ `grants.ensure_fresh`) → Redis `sync:{shop}` / `sync_returns:{shop}` → advisory `order:{sn}` → advisory station → `return_case` → `package` (id tăng) → `clip` → `snapshot` / `claim_evidence`. Bảng mới (`share_link`, `backup_*`, `notify_*`) khóa độc lập (`FOR UPDATE SKIP LOCKED`), không giữ khóa nghiệp vụ khi gọi mạng.

| Chỗ | Rủi ro | Cách giữ đúng |
|---|---|---|
| Hai shop cùng grant làm mới token | Refresh token dùng một lần bị dùng hai lần → một shop `EXPIRED` oan | `grants.ensure_fresh`: `SET NX grant:{p}:{ref}` TTL 60 giây, chờ tối đa 10 giây (poll 200 ms); sau khi có khóa **đọc lại** shop (`populate_existing`), còn hạn > 1 giờ → dùng luôn; làm mới → ghi token cho **mọi** shop cùng grant (`FOR UPDATE` theo id tăng), commit, nhả khóa compare-and-delete (G3-N4) |
| Ngắt shop khi job đang chạy | Job ghi tiếp bằng token cũ | Job kiểm `auth_status` sau khi lấy khóa `sync:{shop}` và **giữa mỗi trang** (đọc một cột, không khóa); đơn đã ghi trước khi dừng hợp lệ (EX-T7 "dữ liệu giữ nguyên") |
| Fan-out task trùng | Beat phát khi lượt trước chưa xong | Khóa Redis `sync:{shop}` như Phase 2 → `SKIPPED locked` |
| Tra song song khi quét + J-04 cùng đơn | Hai đường tạo cùng đơn | `upsert_platform_order` dưới `order:{sn}` + savepoint ở đường quét (Phase 1 review #5); unique theo shop |
| EX-T2 kiện của shop khác | Ghi đè `package.order_id` | Kiểm dưới `order:{sn}` của đơn **mới**; kiện được khóa `FOR UPDATE` trước khi quyết; khác shop → không đổi |
| BR-37 hủy đúng giây 60 | FE thấy còn nút, server hết hạn | Server quyết dưới khóa station theo `clock.now()`; FE hiện Toast từ 409 |
| Bỏ bằng chứng vs J-02 | Bỏ xong J-02 xóa ngay | Dòng không xóa; J-02 kiểm lại bảo vệ dưới khóa clip (DEC-251) đã tính `removed_at` |
| J-21 vs J-02 | Clip vào hàng chờ rồi bị xóa | J-22 khóa `backup_object` (`SKIP LOCKED`), mở file không thấy → `FAILED` lý do `SOURCE_DELETED`, J-23 đánh `CLOUD_DELETED` (không có gì để xóa) |
| J-22 vs J-23 | Xóa bản cloud trong lúc tải | J-23 chỉ xét `UPLOADED` + clip `DELETED`; J-22 chỉ `PENDING`/`FAILED` |
| Hai lượt J-20 | Hai dump song song | Partial unique `backup_run(kind) WHERE status = 'RUNNING'`; lượt treo > 2 giờ → J-23 đánh `FAILED` |
| Thu hồi khi J-24 đang dựng | Link thành `ACTIVE` sau khi thu hồi | J-24 trước khi công bố: `SELECT … FOR UPDATE` share → không còn `CREATING` → xóa đối tượng đã tải, dừng |
| J-26 / J-27 chạy chồng | Gửi trùng | Khóa Redis `notify:scan`, `notify:dispatch` (TTL 60 giây, không được → bỏ lượt); `notify_event` unique (code, dedupe_key); gửi: `FOR UPDATE SKIP LOCKED` từng tin, đánh `SENT` **sau** khi nhà cung cấp trả OK (gửi trùng tối đa một lần khi crash giữa chừng — chấp nhận, ghi rủi ro) |
| API-171 trùng tên | Hai Admin cùng thêm | Unique `lower(name)` + bắt `IntegrityError` trong savepoint → 409 |
| `ON CONFLICT` index một phần | Generic plan (DEC-362) | Mọi `ON CONFLICT … WHERE` viết vị từ literal: `backup_object(clip_id) WHERE clip_id IS NOT NULL`, `(snapshot_id) WHERE snapshot_id IS NOT NULL`; test chạy với `plan_cache_mode = force_generic_plan` |

## 7. Job nền · queue · tích hợp ngoài

| Tên | Trigger / lịch | Input | Làm gì | Retry / timeout | Lỗi cuối thì |
|---|---|---|---|---|---|
| J-04 `platforms.sync_orders` (phân phối) → `platforms.sync_shop_orders` | 5 phút; sau callback; API-73 | — / shop_id | Mỗi shop `CONNECTED` của sàn bật → 1 task (queue `sync`); task: lock `sync:{shop}` → `grants.ensure_fresh` → `list_updated_orders(since = cursor − 10 phút)` trong `time_budget(120)` → upsert từng đơn (commit mỗi đơn — DEC-162); `fulfilled_by_platform` → bỏ qua + đếm | HTTP thử lại trong client (5 lần, `Retry-After`); hết ngân sách → dừng, cursor không tiến; Celery `soft_time_limit = 150` | `last_error SYNC_FAILED` + `error_since`; shop khác không ảnh hưởng (NFR-39) |
| J-05 `platforms.verify_unverified` | 10 phút | — | Kiện chưa xác minh 7 ngày → `lookup.find_everywhere` (mỗi kiện ≤ 2 giây, ngân sách lượt 120 giây) | — | Giữ chưa xác minh |
| J-06 `platforms.sync_shipping_status` (phân phối) → `sync_shop_shipping` | 15 phút | shop_id | Kiện `PACKED`/`HANDED_OVER`/hoàn giao thất bại của **đơn thuộc shop** → `get_shipping_statuses` theo lô 50 (token của shop) → `_apply_shipping` đọc `order_status_group` | Ngân sách 300 giây | Lô lỗi → dừng shop, lượt sau |
| J-12 `platforms.refresh_tokens` | 30 phút | — | Theo **grant** (một lần / grant): `grants.ensure_fresh(force)` | — | `EXPIRED` + `AUTH_EXPIRED` (mọi shop của grant) |
| J-13 `platforms.sync_returns` (phân phối) → `sync_shop_returns` | 15 phút; sau callback | shop_id | Như Phase 2 (DEC-342, 361) + `returns_enabled(platform)`; đơn tìm theo (shop, mã); TikTok qua `tiktok/returns_mapping` | Ngân sách 300 giây | Như Phase 2 |
| J-16 (mở rộng) | API-136 | pack_id | Bỏ dòng đã bỏ; phiên chính DEC-448 | Như cũ | Như cũ |
| J-02 (mở rộng) | 02:00 VN | — | Bảo vệ tính `removed_at` (qua `protection`) | Như cũ | Như cũ |
| J-11 (mở rộng) | 5 phút | — | Xóa `notify_message` > 30 ngày, `notify_event` > 30 ngày (đã xử lý), `backup_run` > 400 ngày | — | log |
| J-20 `backup.run_db` | crontab UTC 18, 0, 6, 12 (= 01, 07, 13, 19 VN); API-184 | run_id? | `state = ON`? → tạo / nhận `backup_run`; `pg_dump -Fc --no-owner` (env từ `DATABASE_URL`) → `BACKUP_TMP_DIR`; `tar czf` `IMPORT_ROOT`; mã hóa luồng + tải `backup/db/YYYY/MM/DD/aicam-{stamp}.dump.enc`, `backup/imports/{stamp}.tgz.enc`; **kiểm**: tải lại, giải mã luồng, so SHA-256 bản rõ (DEC-466); `SUCCESS` + `size_bytes`; xóa file tạm | Celery 2 lần thử (10 phút); ngân sách 3.600 giây | `FAILED` + `error`; > 26 giờ → `BACKUP_STALE`, N08 |
| J-21 `backup.enqueue_evidence` | 10 phút | — | `state = ON`; INSERT `backup_object PENDING` cho `evidence_targets_sql` chưa có (`ON CONFLICT … DO NOTHING`); ưu tiên: hồ sơ khiếu nại chưa đóng trước (cột `reason` + sắp ở J-22) | Ngân sách 60 giây | log |
| J-22 `backup.upload_evidence` | 5 phút | — | `state = ON`; lấy `PENDING`/`FAILED` đến hạn (`FOR UPDATE SKIP LOCKED`, lô 20) → `UPLOADING` → commit → SHA-256 file == `clip.sha256` / `snapshot.sha256`? lệch → `HASH_MISMATCH` (N08, không tải); khớp → mã hóa + tải `backup/evidence/{clips\|snapshots}/{id}.enc` (metadata `sha256`, `relpath`, `kind`) qua token bucket → HEAD kiểm `ContentLength` → `UPLOADED` | Ngân sách 240 giây / lượt; nhường khi có job link (Redis `share:active`); lỗi → `FAILED`, `next_attempt_at` 5, 15, 60 phút rồi mỗi 60 phút | > 24 giờ chờ → `BACKUP_STALE`, N08 |
| J-23 `backup.prune` | 03:00 VN (crontab UTC 20) | — | (1) `backup_object` `UPLOADED` có clip / ảnh `DELETED` → xóa đối tượng → `CLOUD_DELETED` (FR-02.14 ≤ 24 giờ); (2) DB: giữ lượt `SUCCESS` < 30 ngày + lượt sớm nhất ngày 1 mỗi tháng trong 12 tháng, còn lại xóa đối tượng; (3) `RUNNING` > 2 giờ → `FAILED`; (4) đối tượng `backup/_probe/` > 1 ngày | Ngân sách 1.800 giây | Lượt sau |
| J-24 `shares.build` | API-160 (queue `export`) | share_id | `share:active` = 1 (TTL); mỗi phiên: `render_side_by_side_to` (CAM1 hoặc ghép), `+faststart`, SHA-256 → tải `v{n}.mp4`; ảnh `p{n}-{k}.jpg`; `w1.render()` → `index.html`; URL ký; `FOR UPDATE` share còn `CREATING` → `ACTIVE`, `url_enc`; WS `share.updated` từng bước | Ngân sách 600 giây (`soft_time_limit` 630) | `FAILED` (`RENDER_FAILED` / `UPLOAD_FAILED` / `TIMEOUT`), xóa đối tượng đã tải |
| J-25 `shares.cleanup` | 5 phút; ngay sau API-163 | share_id? | `ACTIVE ∧ expires_at ≤ now` → `EXPIRED` + audit `SHARE_EXPIRE` (user null); mọi share `REVOKED`/`EXPIRED`/`FAILED` có `cloud_deleted_at IS NULL` → `delete_prefix(object_prefix)` → `cloud_deleted_at`; `CREATING` > 15 phút → `FAILED` | Thử lại mỗi lượt (mỗi phút khi `revoke_pending` — beat 60 giây cho nhánh này) | `revoke_pending` còn `true` (D21 "Đang thu hồi — chờ Internet") |
| J-26 `notify.scan` | 30 giây | — | Điều kiện N01..N09 (§7.5) → `notify_event` | Khóa `notify:scan`; ngân sách 20 giây | Lượt sau |
| J-27 `notify.dispatch` | 15 giây | — | Gom / giữ / gửi (§7.5) | Khóa `notify:dispatch`; ngân sách 10 giây; HTTP timeout 8 giây | `RETRYING` → `DROPPED` sau 24 giờ |
| J-28 `notify.daily_summary` | crontab UTC 11:00 (18:00 VN) | — | N10 `summary:{yyyy-mm-dd}` (số đóng gói / lệch / hoàn nhận / có vấn đề hôm nay, hồ sơ mở / sắp hạn / quá hạn, Chỉ hoàn tiền chưa xử lý — dùng `reports.service._counts`) | — | log |

Route Celery thêm: `backup.*` → `backup`; `shares.build` → `export`; `shares.cleanup`, `notify.*` → `default`; `platforms.*` → `sync` (giữ). Beat thêm J-20..J-28.

### 7.1 TikTok Shop Partner API (giả định theo tài liệu công khai — **chưa test, thiếu tài khoản đối tác: Q18, Q19**)

| Nhóm | Gọi (giả định, version `202309`) | Điểm cần xác minh (T-3 TikTok) |
|---|---|---|
| Ký request | Tham số chung `app_key`, `timestamp` (giây), `shop_cipher` (API cấp shop), `sign`; header `x-tts-access-token`. `sign` = HMAC-SHA256(`app_secret`, `app_secret + path + Σ(k+v theo k tăng, trừ sign, access_token) + body JSON + app_secret`) hex | Công thức chuỗi gốc, mã lỗi chữ ký |
| Ủy quyền | Trang `https://services.tiktokshop.com/open/authorize?service_id={TIKTOK_SERVICE_ID}&state=…`; `GET {TIKTOK_AUTH_BASE}/api/v2/token/get?app_key&app_secret&auth_code&grant_type=authorized_code`; làm mới `…/api/v2/token/refresh?…&refresh_token&grant_type=refresh_token` → `access_token`, `access_token_expire_in`, `refresh_token`, `open_id` (→ `grant_ref`) | Redirect URI có nhận `https://x.local/…` không (RK-26); refresh token có dùng một lần không |
| Shop được ủy quyền | `GET /authorization/202309/shops` → `[{id, name, region, cipher}]` | |
| Đơn đổi | `POST /order/202309/orders/search?page_size=50&page_token=` body `{update_time_ge, update_time_lt}`; chi tiết `GET /order/202309/orders?ids=` (≤ 50) → `status`, `line_items[] {product_name, sku_name, seller_sku, sku_image, package_id, tracking_number}`, `buyer_message`, `fulfillment_type`, `create_time`, `update_time` | `fulfillment_type` nhận biết đơn kho TikTok (AS-13); mỗi kiện một `tracking_number` |
| Yêu cầu hủy | `POST /return_refund/202309/cancellations/search` body `{update_time_ge}` → đơn có yêu cầu hủy `PENDING` → `status_group = CANCEL_REQUESTED` khi `list_updated_orders` trả đơn đó (DEC-468) | Tên trạng thái yêu cầu hủy |
| Vận chuyển (J-06) | Đọc lại chi tiết đơn theo lô (`orders?ids=`) → nhóm + `package_status` → `warehouse_hint` | Trạng thái giao thất bại / trả về người bán |
| Tra khi quét | Không tra được theo mã vận đơn (giả định AS-12) → quét đơn cập nhật `TIKTOK_LOOKUP_LOOKBACK_MIN` (60) phút gần nhất, 1 trang, cache mã vận đơn → đơn (5.000 mục) như Shopee (DEC-469) | API tra theo tracking (nếu có → dùng) |
| Yêu cầu trả | `POST /return_refund/202309/returns/search` body `{update_time_ge, update_time_lt}` → `return_id`, `order_id`, `return_type` (`REFUND_ONLY`/`RETURN_AND_REFUND`/`REPLACEMENT`), `return_status`, `return_reason`, `return_reason_text`, `return_line_items[]`, `return_tracking_number`, hạn người bán (tên trường chưa rõ → `seller_due_at = None` nếu không có), `create_time`, `update_time`; `get_return` = search theo `return_ids` | Bảng 02 §5.3; hạn người bán (L14) |
| Lỗi | `code ≠ 0` → `TikTokRequestError`; mã token (giả định `105002`, `105003`, `36004004`) → `PlatformAuthError`; HTTP 429 / 5xx / mã giới hạn tần suất → thử lại giãn cách (`TIKTOK_MAX_ATTEMPTS`, `Retry-After`), trong `time_budget` | Danh sách mã lỗi thật |

Client log mỗi lần gọi: path, HTTP, `code`, `request_id`, thời gian — không log query / header (token, sign). Lưu payload gốc vào `order.raw_payload`, `return_case.raw_payload`.

### 7.2 Adapter mock (dev / test — DEC-474)

| Mock | Hành vi |
|---|---|
| Shopee nhiều shop | `MOCK_SHOPEE_SHOP_IDS` (mặc định `990001,990002`): `build_auth_url` lần lượt trả shop chưa kết nối; dữ liệu theo shop — `990001` giữ fixture Phase 1–2 (`SPXTST…`), `990002` sinh `SPXTSTB000000001..20`, mã đơn `2410TSTB…`; **một mã đơn trùng** giữa 2 shop (`2410DUP00001`) cho BR-29 |
| TikTok | `platforms/mock/tiktok.py`, `code = "TIKTOK"`; auth → callback `code = MOCK-TT-CODE` → 2 shop `TTMOCKA` "TST TikTok A (mock)", `TTMOCKB`; fixture JSON **định dạng TikTok** qua `tiktok/mapping.py` thật (như mock Shopee đi qua `returns_mapping`): 9 trạng thái đơn §5.3 + 1 lạ (`XYZ`), kiện gộp (`TTTST0000000077` cho 2 đơn), đơn kho TikTok (bỏ qua), 6 kịch bản trả (AC-42); mã `TTTST…` |
| Điều khiển test | `delay_s_by_shop`, `fail_shop` (luôn `PlatformError`), `fail_times`, `fail_auth`, `calls[]` — NFR-39, AC-43 |
| S3 | `MemoryStore` (unit); MinIO (`minio/minio`, cổng 59000 / console 59001, `minio-init` tạo bucket `aicam-dev`) ở compose dev; production cấm endpoint `localhost` |
| Thông báo | `NOTIFY_TRANSPORT=mock`: `RPUSH notify:mock:{TELEGRAM\|ZALO_OA}` JSON `{target, text, at}` (`LTRIM` 1.000) + log `notify_mock_sent`; `NOTIFY_MOCK_FAIL=TELEGRAM` → luôn lỗi (thử lại / bỏ); Telegram thật trỏ server giả được qua `TELEGRAM_API_BASE` (respx trong test) |

### 7.3 Kho lưu + mã hóa (ADR-010)

- `cloud/store.py`: `ObjectStore` Protocol — `put_stream(key, stream, *, content_type, metadata, throttle)`, `get_stream(key)`, `head(key)`, `delete(key)`, `delete_prefix(prefix)`, `list(prefix)`, `presign_get(key, expires_s, *, filename=None, content_type=None)`, `probe()`. `S3Store` dùng boto3 (`signature_version="s3v4"`, `addressing_style` cấu hình, `connect_timeout` 5, `read_timeout` 30, retry botocore `standard` 3) chạy qua `asyncio.to_thread`; `upload_fileobj` multipart 8 MiB với stream không seek được.
- `cloud/crypto.py` — định dạng `AICAMENC1`: header 32 byte = `b"AICAMENC"` ‖ `0x01` (phiên bản) ‖ `0x16` (log2 khối = 22 → 4 MiB) ‖ `0x0000` ‖ dấu vân tay 8 byte ‖ tiền tố nonce 8 byte ngẫu nhiên ‖ 4 byte dự phòng; mỗi khối: `len u32` ‖ AES-256-GCM(nonce = tiền tố ‖ `counter u32`, AAD = header ‖ `counter` ‖ `final u8`). Khối cuối `final = 1` (kể cả rỗng) — cắt cụt / đảo khối → lỗi giải mã. Dấu vân tay = 8 byte đầu SHA-256(`"aicam-backup-key-fp:" ‖ key`), hiển thị `XXXX-XXXX-XXXX-XXXX`. Giải mã kiểm dấu vân tay trước (sai khóa → `WrongKeyError`, không ghi gì).
- `cloud/ratelimit.py`: token bucket Redis (Lua) `upload:bucket`, dung lượng 1 giây × `upload_mbps`; `throttle(n_bytes)` chờ đủ token; job link gọi `priority=True` (bỏ qua chờ khi bucket còn ≥ 50 %, đặt `share:active`).

### 7.4 Link chia sẻ + W1

- Khóa đối tượng: `share/{token}/index.html`, `v{n}.mp4`, `p{n}-{k}.jpg` (`token = secrets.token_urlsafe(32)` — 256 bit).
- `index.html`: `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`; video `video/mp4`; link "Tải video" = URL ký có `ResponseContentDisposition=attachment; filename="phien-{n}.mp4"`.
- `w1.render(ctx)`: `string.Template` + `html.escape` cho mọi giá trị (DEC-470); nội dung đúng 02 §6.3 (whitelist trường — test kiểm không có `recipient`, tên người tạo, ghi chú, số tiền, tên shop).
- URL ký: `ExpiresIn = int((expires_at − now).total_seconds())` (≤ 604.800); toàn bộ ký trong một lần dựng.

### 7.5 Thông báo (BR-36, DEC-443)

**J-26 điều kiện** (mọi điều kiện có cửa sổ nhìn lại ≤ 24 giờ → dọn `notify_event` sau 30 ngày an toàn — DEC-473):

| Mã | Điều kiện | `dedupe_key` | Mục trong tin |
|---|---|---|---|
| N01 | Camera `OFFLINE`, `last_seen_at < now − 60 giây` và > now − 24 giờ, **ngoài giờ yên lặng** (DEC-444) | `cam:{id}:{last_seen_at}` | "Station 01 · Cam 2 · từ 14:00" |
| N02 | `recon_alert` `HIGH` `OPEN`, `detected_at > now − 24 giờ` | `alert:{id}` | mã kiện · sàn · shop · từ ngày |
| N03 | Phiên RETURN `CANCELLED`/`ABANDONED` `ended_at > now − 24 giờ`; hồ sơ `UNIDENTIFIED` mới | `sess:{id}` / `case:{id}` | mã kiện · station · giờ |
| N04 | BR-40 mới (`reported_at > now − 24 giờ`) / còn ≤ 12 giờ tới hạn (chưa quá 24 giờ sau hạn) | `refund:{id}:new` / `refund:{id}:12h` | mã hồ sơ HH · sàn · shop · hạn |
| N05 | Claim `NEW`, hạn trong 48 giờ / đã quá (BR-42) | `claim:{id}:soon:{deadline}` / `claim:{id}:overdue:{deadline}` | mã KN · loại · hạn |
| N06 | Shop `EXPIRED` / `error_since < now − 30 phút` | `shop:{id}:expired:{at}` / `shop:{id}:err:{error_since}` | tên shop · sàn · lỗi rút gọn |
| N07 | Ổ ≥ 80 % (`MEDIUM`) / ≥ 90 % (`HIGH`) | `disk:{80\|90}:{yyyy-mm-dd}` | "{n} %" |
| N08 | DB > 26 giờ / tệp chờ > 24 giờ / lệch mã băm mới | `backup:db:{last_success}` / `backup:ev:{date}` / `backup:hash:{object}` | lý do |
| N09 | Yêu cầu duyệt `PENDING`, `created_at < now − 3 phút` | `appr:{id}` | station · loại · từ |

**J-27 gom / gửi:**
1. Sự kiện chưa xử lý × kênh `enabled` có đăng ký mã → trong giờ yên lặng và mức ≠ `HIGH` → thêm vào tin `HELD` (kênh, mã) `send_after = cuối giờ yên lặng`; ngược lại thêm vào tin `QUEUED` (kênh, mã) tạo trong 2 phút gần nhất chưa gửi, không có thì tạo (`send_after = occurred_at + 2 phút`). Đánh `processed_at`.
2. Tin đến hạn: đếm `SENT` của kênh trong 60 phút; ≥ 30 → `HELD` `send_after` = lúc slot đầu tiên rảnh.
3. Lúc thả `HELD` (hết giờ yên lặng / có slot): gộp mọi `HELD` của kênh thành **một** tin "Tóm tắt {n} thông báo …" (≤ 10 dòng + "và {n} mục khác"), tin gốc `SKIPPED` (DEC-472).
4. Gửi: OK → `SENT`, kênh `last_status = OK`; lỗi → `RETRYING`, `next_attempt_at` 1, 2, 4, 8, 16, 32, 60, 60 … phút; `created_at + 24 giờ` qua → `DROPPED`, kênh `last_status = ERROR`, `last_error`.
5. N01 lúc gửi: camera đã `ONLINE` → dòng thêm "(đã có lại HH:MM)" (EX-N4).

**Nhà cung cấp:** Telegram `POST {TELEGRAM_API_BASE}/bot{token}/sendMessage {chat_id, text, disable_web_page_preview: true}` (`429 retry_after` tôn trọng). Zalo OA `POST https://openapi.zalo.me/v3.0/oa/message/cs` header `access_token`, body `{recipient: {user_id}, message: {text}}`; làm mới `POST https://oauth.zaloapp.com/v4/oa/access_token` (header `secret_key`, form `app_id`, `refresh_token`, `grant_type=refresh_token`) dưới khóa Redis `zalo:token`, lưu `notify_provider_token` — **giả định, chưa test (Q21)**; mã lỗi "người nhận chưa quan tâm OA" → `message` "Người nhận chưa quan tâm OA của shop."

## 8. Cache & hiệu năng

| Chỗ | Chiến lược | Invalidate | Mục tiêu (NFR) |
|---|---|---|---|
| API-150..152 | Redis `report:{name}:{sha1(params)}` TTL 60 giây; SQL theo tập: một truy vấn mỗi bảng con (CTE kỳ → giờ VN `AT TIME ZONE`), dùng index `status_history(to_status, at)`, `session(type, status, ended_at)`, `return_case(created_at)`, `(received_at)`, `claim(created_at)`, `(result_at)`, `(submitted_at)`; thời gian chờ duyệt = tổng `approval_request.decided_at − created_at` theo phiên (subquery gộp) | TTL | NFR-37: 92 ngày ≤ 3 giây p95, 366 ngày ≤ 10 giây (đo `tests/load/perf_reports.py` 180.000 kiện — máy dev, ghi rõ ≠ máy kho) |
| API-32 | Giữ cache 5 giây; mục mới đếm bằng index sẵn có (`return_case(status,…)`, `claim(status, deadline_at)`, `session(type, status, ended_at)` mới) | `report.updated` như cũ | ≤ 300 ms |
| `lookup.find_everywhere` | Không cache kết quả; adapter cache mã vận đơn → đơn (Shopee / TikTok 5.000 mục) | — | NFR-01 ≤ 3 giây p95 với 4 shop (1 chậm 5 giây) |
| API-161 | Index `share_link(status, expires_at)`, `(created_at)` | — | ≤ 300 ms |
| J-21 | Một câu `INSERT … SELECT … ON CONFLICT DO NOTHING` | — | ≤ 5 giây với 50.000 clip |
| Tải lên | Token bucket chung | — | NFR-44: quét p95 không đổi khi tải 5 GB (đo T-221) |

## 9. Config · secret · flag

| Key | Mặc định | Môi trường | Ý nghĩa |
|---|---|---|---|
| `TIKTOK_ENABLED`, `TIKTOK_RETURNS_ENABLED` | `false`, `false` | mọi (dev compose: `true` với mock) | FR-05.20, EX-T1 |
| `TIKTOK_ADAPTER` | `mock` | production cấm `mock` khi `TIKTOK_ENABLED` | `mock` \| `tiktok` |
| `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET`, `TIKTOK_SERVICE_ID` | rỗng | secret | Ứng dụng đối tác (Q18) |
| `TIKTOK_API_BASE`, `TIKTOK_AUTH_BASE`, `TIKTOK_AUTHORIZE_URL` | `https://open-api.tiktokglobalshop.com`, `https://auth.tiktok-shops.com`, `https://services.tiktokshop.com/open/authorize` | mọi | Giả định — Q19 |
| `TIKTOK_REDIRECT_URL` | rỗng (= `{SITE_ADDRESS}/api/v1/shops/tiktok/callback`) | mọi | RK-26 |
| `TIKTOK_TIMEOUT_S`, `TIKTOK_MAX_ATTEMPTS`, `TIKTOK_BACKOFF_S`, `TIKTOK_LOOKUP_LOOKBACK_MIN`, `TIKTOK_INITIAL_SYNC_DAYS`, `TIKTOK_RETURNS_INITIAL_DAYS` | `10`, `5`, `0.5`, `60`, `3`, `15` | mọi | Như Shopee |
| `MOCK_SHOPEE_SHOP_IDS` | `990001,990002` | dev / test | §7.2 |
| `SYNC_TASK_BUDGET_S`, `SYNC_LONG_TASK_BUDGET_S` | `120`, `300` | mọi | J-04 / J-06, J-13 |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ADDRESSING_STYLE` | rỗng, `us-east-1`, rỗng, `path` | mọi | Rỗng → sao lưu + link `NOT_CONFIGURED` |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | rỗng | secret | |
| `S3_PUBLIC_ENDPOINT` | = `S3_ENDPOINT` | mọi | Host dùng khi ký URL link (MinIO dev: `http://<LAN_IP>:59000` để điện thoại mở được) |
| `BACKUP_ENCRYPTION_KEY` | rỗng | secret (base64 32 byte) | Không vào DB / log; `aicam backup-keygen` |
| `BACKUP_TMP_DIR` | `/tmp/aicam-backup` | mọi | File dump tạm |
| `BACKUP_DB_BUDGET_S`, `BACKUP_UPLOAD_BUDGET_S` | `3600`, `240` | mọi | J-20, J-22 |
| `SHARE_BUILD_TIMEOUT_S` | `600` | mọi | J-24 |
| `NOTIFY_ENABLED`, `NOTIFY_TRANSPORT` | `true`, `real` (dev: `mock`) | mọi | |
| `NOTIFY_MOCK_FAIL` | rỗng | dev / test | §7.2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_BASE` | rỗng, `https://api.telegram.org` | secret / mọi | Rỗng → `TELEGRAM` không cấu hình (EX-N1) |
| `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN` | rỗng | secret | Rỗng → `ZALO_OA` không cấu hình |
| `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES` | không đặt | migrate | §3 downgrade |
| Đã có, đổi nghĩa | `PLATFORM_ADAPTER` chỉ cho Shopee; `SHOPEE_*` giữ | | DEC-436 |
| Hạ tầng | `worker-sync` `-c 4`; `worker-backup` `-Q backup -c 1` (volume `video` chỉ đọc, `imports` chỉ đọc); Dockerfile thêm `postgresql-client-16` (PGDG apt) | compose dev + production | DEC-434, 439 |

Validator `core/settings.py` (production / staging): cờ TikTok bật → đủ 3 khóa + `TIKTOK_ADAPTER = tiktok`; có `S3_ENDPOINT` → đủ khóa truy cập + bucket, `BACKUP_ENCRYPTION_KEY` hợp lệ (32 byte) hoặc rỗng; `NOTIFY_TRANSPORT = mock` cấm ở production.

## 10. Observability

| Loại | Tên / nội dung | Ngưỡng cảnh báo |
|---|---|---|
| Log | `platform_sync{platform, shop_id, status, orders, changed, duration_ms}`, `tiktok_call{path, http_status, code, request_id, duration_ms, attempt}`, `platform_lookup{code, shops, found, ambiguous, duration_ms}`, `platform_status_unknown{platform, status}`, `tracking_owned_by_other_shop` | `platform_status_unknown` > 0 / ngày → xem Q19 |
| Log | `backup_db{run_id, status, size, duration_s}`, `backup_object{id, kind, status, attempts}`, `backup_hash_mismatch{object_id, sha_db, sha_file}` | mỗi `hash_mismatch` |
| Log | `share_build{share_id, status, sessions, duration_s}`, `share_cleanup{share_id, deleted, pending}` — **không** log URL / token | `share_build` > 180 giây |
| Log | `notify_event{code, dedupe_key}`, `notify_send{channel_id, status, attempts, provider_code}` — không log text đầy đủ | `DROPPED` > 0 |
| Metric | `aicam_platform_sync_seconds{platform}`, `aicam_platform_sync_errors_total{platform}`, `aicam_platform_lookup_seconds` | lookup p95 > 2,5 giây |
| Metric | `aicam_backup_pending`, `aicam_backup_last_success_timestamp`, `aicam_backup_upload_bytes_total` | pending > 0 quá 24 giờ; last_success > 26 giờ |
| Metric | `aicam_share_build_seconds`, `aicam_notify_sent_total{status}`, `aicam_report_seconds{report}` | report 92 ngày > 3 giây |
| Health | API-81 `backup`, `sync[]` theo shop | D8 |

## 11. Test BE

| Mức | Phạm vi | Case chính (TC-xx — QA đánh số ở `04`) |
|---|---|---|
| Unit | Ánh xạ nhóm Shopee + TikTok (mọi chữ §5.3 + chữ lạ); ký TikTok (vector cố định); `crypto` (mã hóa / giải mã khứ hồi 0 B, 1 B, 4 MiB, 9 MiB; cắt cụt, đảo khối, sai khóa → lỗi; dấu vân tay); `ratelimit`; `w1.render` (escape, whitelist); `notify` render (≤ 10 dòng, không PII); công thức BR-41 (ví dụ 01); BR-37 biên 60 giây; NFR-28 tìm chuỗi | AC-41, 44, 45, 53 |
| Integration (Postgres + Redis thật) | Đa shop: 2 Shopee + 2 TikTok mock, kết nối shop 2 không ngắt shop 1, ngắt 1 shop (AC-40); unique theo shop + EX-T2 + nhận đơn file; fan-out 3 shop 1 luôn lỗi — chu kỳ shop khác đúng giờ (NFR-39); tra song song (AC-43); BR-31 6 kịch bản (AC-42); L11/L13/L14/L15 (AC-56..59); API-150..153 với dữ liệu mẫu (AC-45..47); sao lưu với MinIO (J-20 lên + đọc lại, J-21/22 chỉ BR-33, J-23 xóa, mất mạng → chờ → tự tải — AC-49, 51); link (tạo, W1, thu hồi xóa đối tượng, hết hạn đồng hồ giả, CSKH thu hồi link người khác 403 — AC-52, 53); thông báo server giả (5 luật BR-36, 24 giờ → bỏ — AC-54, 55); migration 0006/0007 lên / xuống / lên | AC-40..59 |
| Contract | `tests/contract/spec.py` thêm 25 API HTTP mới + 25 mở rộng: path, method, mã lỗi, trường, enum (02 §6); runtime giờ `Z`; snapshot `openapi.json` | 02 §6 |
| QA live | `tests/qa/test_m11..m16_live.py` trên stack dev (MinIO, mock TikTok, notify mock) | theo lát 01 §13 |
| Diễn tập | `aicam backup-restore` + `backup-verify` trên DB trống (AC-50) | 100 % SHA-256 khớp; khóa sai → mã 2, DB không đổi |
| Hiệu năng | `tests/load/perf_reports.py` (180.000 kiện), locust quét mã lạ 4 shop mock (1 chậm 5 giây) | NFR-01, NFR-37 |

## 12. Task

| # | Việc | FR / API | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| T-201 | Migration 0006 (bảng, cột, CHECK, backfill nhóm / shop / submitted_at, index báo cáo) + model + `alembic check`; đo trên 1 triệu đơn | §3; FR-05.21, 08.09, 09.04 | — | 2 |
| T-202 | Migration 0007 (unique theo shop) + downgrade 0006/0007 sang `phase3_archive` + nâng cấp lại + `SCHEMA_HEAD` 0007 + test migration | §3; BR-29; DEC-456, 475 | T-201 | 2 |
| T-203 | `base.py` nhóm trạng thái + `registry` + cờ; Shopee `mapping` trả nhóm; lõi đọc nhóm (`rules`, `returns`, `return_scan`, `orders.is_cancelled`, `sync` RETURNING, `sessions` platform); `test_no_platform_status_in_core` | FR-05.07, 05.21, NFR-28; BR-30 | T-201 | 2 |
| T-204 | Đa shop: `upsert_platform_order(…, shop)` (BR-29, nhận đơn file, EX-T2 `sync_warnings`, `package_order`); tra đơn theo (shop, mã) ở `sync`, `returns`, `imports`, bàn hoàn (nhiều kết quả); bỏ ngắt shop khác | FR-05.14, 05.22; BR-29 | T-202, T-203 | 2 |
| T-205 | Fan-out `dispatch.py` J-04/06/13; J-05 theo `lookup`; `grants.ensure_fresh` + J-12 theo grant; `budget.py`; `worker-sync -c 4`; test cô lập 3 shop | FR-05.14; NFR-39; DEC-433, 434 | T-204 | 2 |
| T-206 | `lookup.find_everywhere` (BR-32) + `AMBIGUOUS_SHOP`; nối vào PACK, RETURN (`return_scan.platform_find`), J-05; đo AC-43 | FR-05.19; API-11 | T-205 | 1,5 |
| T-207 | API-70 mở rộng, API-71 theo sàn, API-72 (không ngắt, `expired`), API-154, API-155, API-156, `RESULT_PATH`, audit, WS `shop.updated` + kênh `ws:admin` | FR-05.13, 05.20; API-70..73, 154, 155 | T-204 | 1,5 |
| T-208 | TikTok client (ký, thử lại, `Retry-After`, ngân sách, log, che log) + ủy quyền (token get / refresh, shop list) — test respx theo định dạng giả định | FR-05.08, 05.13 | T-203 | 2 |
| T-209 | TikTok adapter đơn / kiện / vận chuyển / yêu cầu hủy / tra khi quét + `mapping.py` (§5.3) + EX-T5 + kiện gộp | FR-05.15..05.17, 05.22; AS-12, 13 | T-208 | 2 |
| T-210 | TikTok yêu cầu trả + `returns_mapping` (BR-31) + nhóm yêu cầu trả 5 giá trị trong `returns` (thay `OPEN`, `AWAITING_ACCEPT_STATUSES`) | FR-05.18; BR-31 | T-209 | 2 |
| T-211 | Mock TikTok 2 shop + fixture (9 trạng thái, kiện gộp, kho TikTok, 6 kịch bản trả) + mock Shopee nhiều shop; `seed_phase3.py` | §7.2; AC-40..44 | T-209, T-210 | 1,5 |
| T-212 | Station: API-10 sàn / shop / `merged_orders` / `operator_required`; API-11 `OPERATOR_REQUIRED` ở PACK, `ORDER_CANCEL_REQUESTED`, chép `operator_name`; API-80 `packer_name_required` | FR-03.03, 03.16, 05.17, 05.22 | T-203 | 1,5 |
| T-213 | L11: BR-37 (API-12 409, `self_cancel_until`), API-20 `return_summary`, API-21 `note`; BR-39 `auto_evidence` + `primary` / `prior_return` + J-16 sắp xếp + `prior_return_sessions` | FR-04.14, 08.07 | T-201 | 2 |
| T-214 | L15 + L14: bỏ mềm API-134 + `protection` `removed_at` + API-132 `removed_evidence`, `removal_keep_until`; BR-42 hạn đã qua; audit `CLAIM_EVIDENCE_REMOVE` | FR-08.09, 08.10 | T-201 | 2 |
| T-215 | L13 + D2 + lọc: API-110 (`pending_only`, `sort`, `response_due_*`, `claim`); API-80 `refund_only_default_hours`; API-32 counts / attention mới + lọc vai; API-30/110/120/130 `platform`, `shop_id`, API-30 `session_status` nhiều giá trị | FR-08.08, 09.01, 07.01 | T-204, T-213 | 2 |
| T-216 | Báo cáo API-150..152 (BR-41) + cache + `statement_timeout` + test công thức | FR-09.02..05 | T-201 | 2 |
| T-217 | API-153 CSV + `series` (C) + `perf_reports.py` đo NFR-37 | FR-09.06, 09.07; NFR-37 | T-216 | 1,5 |
| T-218 | `cloud`: `ObjectStore`, `S3Store`, `MemoryStore`, `ratelimit`; MinIO + `minio-init` compose dev; API-183 | FR-02.17; ADR-010 | — | 1,5 |
| T-219 | `cloud/crypto.py` `AICAMENC1` + `aicam backup-keygen` + test | FR-02.13; NFR-41 | — | 1,5 |
| T-220 | J-20 sao lưu DB (pg_dump trong image, imports tgz, mã hóa, tải, kiểm đọc lại) + `backup_run`; `worker-backup` + Dockerfile | FR-02.08 a; NFR-40 | T-218, T-219 | 2 |
| T-221 | J-21 / J-22 bằng chứng (BR-33, `HASH_MISMATCH`, thử lại) + J-23 (xóa sau J-02, chính sách DB FR-02.14) + `all_pack_clips`; đo NFR-44 | FR-02.08 b, 02.14, 02.18; EX-K3, K6 | T-220 | 2 |
| T-222 | API-180..182, 184, 185 + API-81 `backup` + attention `BACKUP_STALE` + WS `backup.updated` | FR-02.15, 02.17 | T-221 | 1,5 |
| T-223 | `aicam backup-restore` + `backup-verify` + ops §6.2 runbook + diễn tập trên DB trống (AC-50) | FR-02.16; NFR-40 | T-221 | 2 |
| T-224 | `shares`: model, API-160..164 (BR-35, quyền thu hồi), audit `SHARE_*`, API-31/132 `shares[]` | FR-07.05, 07.08, 07.09 | T-218 | 2 |
| T-225 | J-24 dựng + tải + W1 template + URL ký + Fernet; J-25 thu hồi / hết hạn / treo; WS `share.updated` | FR-07.05, 07.07, 07.08; NFR-42, 46 | T-224 | 2 |
| T-226 | `notify`: model, API-170..176, provider Telegram / Zalo / mock, gửi thử, `notify_provider_token` | FR-06.04, 06.07, 06.10 | T-201 | 2 |
| T-227 | J-26 điều kiện N01..N09 + J-27 BR-36 (gom, trần, giờ yên lặng, thử lại / bỏ) + J-28 N10 + dọn 30 ngày | FR-06.07..06.11; NFR-43 | T-226, T-215, T-222 | 2 |
| T-228 | Quyền API-04, action API-92, che log; contract test spec + snapshot OpenAPI cho mọi API Phase 3 | FR-10.02, 10.03 | T-207, T-215..T-227 | 1,5 |
| T-229 | QA live M11..M16 (stack dev: MinIO, mock TikTok, notify mock) + `seed-demo` Phase 3 | AC-40..62 | T-211..T-228 | 2 |
| T-230 | Nâng cấp / lùi thử trên bản sao DB Phase 2 + ops §7.2 + `.env.production.example` + compose production (`worker-backup`, `-c 4`) + sự cố mới §10 | §3, 02 §10 | T-202, T-220 | 1,5 |

Tổng ≈ 54 ngày công. Đường găng: T-201 → T-203 → T-204 → T-205 → T-206 (đa shop) song song T-218 → T-220 → T-221 → T-224 → T-225 (cloud); T-213..T-215 làm sớm (lát 1 hardening — 01 §13).

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Chọn? (lý do) |
|---|---|---|---|
| boto3 trong `asyncio.to_thread` | Ổn định, mọi S3-compatible, multipart sẵn | Thread cho mỗi lần gọi | ✔ (DEC-464) |
| aiobotocore | Async thật | Ràng phiên bản botocore, khó nâng cấp | ✗ |
| Tự viết AES-GCM theo khối (`cryptography`) | Giải mã luồng, kiểm sai khóa sớm, test được | Phải viết đúng định dạng | ✔ (DEC-465) |
| `age` / `gpg` qua subprocess | Công cụ chuẩn | Thêm binary, khó test, khó phát hiện sai khóa trước khi ghi | ✗ |
| Kiểm DB dump bằng tải lại + giải mã toàn bộ | Chắc chắn đọc lại được (K2) | Gấp đôi băng thông (~200 MB × 4 / ngày) | ✔ cho DB (DEC-466) |
| Kiểm bằng chứng bằng `HEAD` (kích thước + metadata) | Rẻ | Không phát hiện hỏng bit trên cloud | ✔ cho bằng chứng; `backup-verify --from-cloud` khi diễn tập |
| Template W1 bằng `string.Template` + `html.escape` | Không thêm phụ thuộc | Ít tiện (không vòng lặp) — dựng khối lặp bằng Python | ✔ (DEC-470) |
| Jinja2 | Template đầy đủ | Thêm phụ thuộc cho một trang | ✗ |
| J-24 trên queue `export` (dùng lại `worker-export -c 1`) | Không thêm worker encode (CPU kho có hạn) | Chờ sau J-16 / J-03 đang chạy | ✔ (DEC-471) — đo; quá 3 phút thường xuyên → worker riêng |
| Thả `HELD` thành một tin tóm tắt | Đúng BR-36 (3), (4) | Mất chi tiết từng tin (vẫn ở nhật ký) | ✔ (DEC-472) |

## Rủi ro & câu hỏi mở

| ID | Rủi ro / câu hỏi | Ảnh hưởng | Giảm thiểu / ai trả lời | Hạn |
|---|---|---|---|---|
| RB-31 | API TikTok khác giả định §7.1 (Q19) | Adapter viết lại một phần | Mapping / client tách riêng; fixture định dạng TikTok; T-3 TikTok trước go-live | Go-live |
| RB-32 | `pg_dump` 16 client không khớp server khi nâng Postgres | J-20 lỗi | Ghim `postgresql-client-16` = image `postgres:16-alpine`; test J-20 trong CI dev | T-220 |
| RB-33 | `upload_fileobj` với stream không seek + throttle chậm với file lớn | Sao lưu > 1 giờ | Multipart 8 MiB, đo T-221 với 5 GB trên MinIO | T-221 |
| RB-34 | Gửi trùng tin khi worker chết giữa lúc gửi và ghi `SENT` | Người nhận thấy 2 tin | Chấp nhận (hiếm); log `notify_send` | — |
| RB-35 | J-24 chờ sau gói bằng chứng trên `worker-export` | Link > 3 phút | Đo; tách worker nếu cần (DEC-471) | QA |
| RB-36 | Downgrade 0007 không có đường lùi khi đã có mã trùng | Phải sửa tiến | Ghi rõ ops §7.2; thử nâng cấp trên bản sao DB trước (T-230) | T-230 |

## Decisions

| DEC | Bối cảnh | Lựa chọn | Lý do | Người chốt |
|---|---|---|---|---|
| DEC-463 | Bố cục code Phase 3 | 4 module mới `cloud`, `backup`, `shares`, `notify`; `platforms` thêm `registry`, `lookup`, `grants`, `dispatch`, `budget`, `tiktok/`; `reports` thêm `analytics`, `csv_export`; `cloud` không import nghiệp vụ (import-linter) | Theo architecture §4.1 (module nghiệp vụ, gọi qua service); `cloud` dùng lại được cho mọi tính năng. Loại: gộp sao lưu + link vào `media` (phình, khác vòng đời) | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-464 | Thư viện S3 | boto3 qua `asyncio.to_thread`; `MemoryStore` cho unit test; MinIO cho integration | Ổn định, tương thích rộng. Loại: aiobotocore | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-465 | Định dạng mã hóa | `AICAMENC1` (§7.3): nonce = tiền tố 64 bit ‖ bộ đếm, AAD có cờ khối cuối, dấu vân tay trong header; SHA-256 bản rõ trong metadata đối tượng | Chống cắt / đảo khối, phát hiện sai khóa trước khi ghi; metadata băm không lộ nội dung | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-466 | "Kiểm đọc lại được" (K2) | DB: tải lại + giải mã toàn bộ, so SHA-256; bằng chứng: `HEAD` kích thước + metadata; kiểm sâu khi diễn tập | Cân bằng băng thông vs chắc chắn | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-467 | N06 "lỗi liên tục > 30 phút" cần mốc bắt đầu lỗi | Cột `shop.error_since` | `last_error.at` đổi mỗi lần lỗi | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-468 | TikTok yêu cầu hủy nằm ở API riêng | `list_updated_orders` gộp kết quả `cancellations/search` cùng cửa sổ → nhóm `CANCEL_REQUESTED` | Lõi chỉ thấy nhóm; không thêm job | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-469 | TikTok tra theo mã vận đơn khi quét (AS-12) | Quét đơn cập nhật 60 phút + cache mã → đơn (như Shopee DEC-123); có API tra theo tracking thì đổi trong adapter | Không phụ thuộc API chưa xác minh | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-470 | Template W1 | `string.Template` + `html.escape` + whitelist trường | Không thêm phụ thuộc; test được không lộ dữ liệu | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-471 | Queue dựng link | `export` (worker-export `-c 1`) | Giữ CPU kho cho quét / ghi hình | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-472 | Thả tin `HELD` | Gộp thành một tin tóm tắt mỗi kênh, tin gốc `SKIPPED` | BR-36 (3), (4) | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-473 | Dọn `notify_event` mà không phát lại | Mọi điều kiện J-26 nhìn lại ≤ 24 giờ; dọn sự kiện > 30 ngày | Bỏ trùng đúng trong cửa sổ, bảng không phình | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-474 | Mock đủ để chạy AC-40..44 không cần tài khoản thật | Mock Shopee nhiều shop (`MOCK_SHOPEE_SHOP_IDS`), mock TikTok 2 shop, fixture định dạng TikTok qua mapping thật | Kiểm được mapping + lõi; khi có T-3 chỉ thay fixture | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-475 | Downgrade 0006 / 0007 | Như §3: 0007 từ chối khi có trùng; 0006 chép `phase3_archive`, bằng chứng đã bỏ còn hạn → `held` (người dùng hệ thống), link sống → từ chối trừ `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES=1` | Bài học DEC-331, 336, 338 | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-476 | CSV báo cáo | Sinh trong bộ nhớ (≤ vài MB) rồi trả `StreamingResponse`; dấu phẩy, UTF-8 BOM, tỷ lệ dạng chuỗi `4,0%` | Excel VN mở đúng; dữ liệu nhỏ | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-477 | Ngân sách thời gian dùng chung | `platforms/budget.py` (từ `shopee/client.py:58`) cho Shopee + TikTok; Celery `soft_time_limit` = ngân sách + 30 giây | Một cơ chế; task không treo slot | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-478 | Sự kiện WS chỉ cho ADMIN | Kênh Redis `ws:admin` (như `ws:approvals`), hub đăng ký theo vai | Không lộ trạng thái sao lưu / shop cho vai khác | khanhtt (BE, tự quyết theo ủy quyền user) |
