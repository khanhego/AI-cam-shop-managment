# BE Spec — 03 Mở rộng: TikTok Shop, báo cáo, sao lưu, link chia sẻ, thông báo · ai-cam-be (api, worker, beat)

| | |
|---|---|
| Tác giả | khanhtt (BE, agent soạn, tự quyết theo ủy quyền user) |
| Reviewer | khanhtt (tech lead, review ở bước 5) |
| Trạng thái | **In review** · v0.2 (sửa theo review G2 lượt 1 — DEC-512) |
| Tổng quan & contract | [02-tech-spec.md](02-tech-spec.md) v0.2 · SRS [01-srs.md](01-srs.md) v0.3 · nền [item 02 02a](../02-returns-reconciliation/02a-be-spec.md) (bài học G3: DEC-266, 336, 338, 342, 361, 362) · ADR-009 (bổ sung), [ADR-010](../../system/decisions/ADR-010-shared-cloud-object-store.md), [ADR-011](../../system/decisions/ADR-011-multi-platform-shops-status-groups.md) |
| Last update | 2026-10-07 · BE (v0.2: G2-1..G2-20 — bảng cuối tài liệu) |

> **TL;DR** — `platforms` thành đa sàn đa shop (registry, tra song song, fan-out một task / shop, khóa grant, nhóm trạng thái) + adapter TikTok (client ký HMAC, OAuth nhiều shop, đơn / kiện / hủy / trả hàng) + mock TikTok 2 shop. 4 module mới: `cloud` (boto3 S3, mã hóa `AICAMENC1`, giới hạn tốc độ Redis), `backup` (J-20..23, API-180..185, CLI khôi phục), `shares` (API-160..164, J-24/25, template W1), `notify` (API-170..176, J-26..28, Telegram / Zalo / mock). `reports` thêm API-150..153. Hardening L11 / L13 / L14 / L15 trong `sessions`, `approvals`, `claims`, `media.protection`, `reports`.
> 2 migration: **0006** (25 cột + 9 bảng + backfill nhóm trạng thái + index báo cáo, chỉ thêm), **0007** (unique theo shop); downgrade sang `phase3_archive`; `SCHEMA_HEAD = "0007"`.
> Điểm khó nhất: (1) bỏ giả định "một shop" ở ~20 chỗ tra theo mã (bảng §5.1) mà không phá thứ tự khóa DEC-266; (2) mã hóa luồng + tải lên có giới hạn tốc độ, đổi khóa, khôi phục kiểm được, máy kho bị chiếm quyền không xóa được bản sao (2 bucket, versioning); (3) chống spam thông báo đúng BR-36 mà không mất tin; (4) lùi 0006 không làm Phase 2 xóa bằng chứng hay gọi Shopee bằng mã TikTok.
> 40 task T-201..T-230 + T-271..T-280 (≈ 69 ngày công), mỗi task ≤ 2 ngày. Mọi tích hợp ngoài chạy được bằng mock / MinIO; với tài nguyên thật: "chưa test — thiếu tài nguyên" (CO-07).

Không viết lại contract: request / response / mã lỗi theo [02 §6](02-tech-spec.md#6-api-contract).

---

## 1. Phạm vi

| Goals (spec này làm) | Non-goals (cố ý không làm — để đâu) |
|---|---|
| API-150..156, 160..164, 170..176, 180..185, 187, 188, CLI API-186 + mở rộng API-04, 10, 11, 12, 20, 21, 30, 31, 32, 70..73, 80, 81, 92, 104, 110, 120, 130..132, 134, 136..138, WS-02 | Gửi khiếu nại lên sàn; Lazada (02 Non-goals) |
| Adapter TikTok + mock; đa shop Shopee; job một task / shop | Token bucket gọi sàn theo shop (ADR-007 backlog) — chỉ thử lại + `Retry-After` như Shopee |
| J-20..J-28; mở rộng J-02 (bảo vệ theo `removed_at`), J-04, J-05, J-06, J-11, J-12, J-13, J-16 | Mã hóa lại bản sao cũ trên cloud bằng khóa mới (backlog — đổi khóa chỉ hỗ trợ tối thiểu, DEC-495) |
| Migration 0006 + 0007 có downgrade + test; `alembic check` khớp model | Kiểm với TikTok / bucket / bot thật — "chưa test, thiếu tài nguyên" |
| W1 template HTML (BE sinh — DEC-428) | Đếm lượt xem link |
| MinIO + `minio-init` (2 bucket, versioning bucket sao lưu) ở `compose.dev.yml`; `worker-backup`, `worker-notify`, `worker-sync-long` ở cả hai compose | |

| API / job / lệnh | FR | Module |
|---|---|---|
| API-70..73, 154..156; J-04/05/06/12/13 fan-out; `platforms.lookup` | FR-05.13, 05.14, 05.19, 05.20 | `platforms` |
| Adapter TikTok (đơn, kiện, hủy, trả) + mapping | FR-05.07, 05.08, 05.15..05.18, 05.21, 05.22 | `platforms/tiktok` |
| Unique theo shop, nhóm trạng thái, `package_order`, EX-T2 | FR-05.14, 05.21, 05.22, BR-29, BR-30 | `orders`, `returns`, `reconciliation`, `sessions` |
| API-10, 11, 12, 101 (PACK), 20, 21 | FR-03.03, 03.16, 04.14, 05.17 | `sessions`, `approvals` |
| API-131, 132, 134, J-16, `media.protection` | FR-08.07, 08.09, 08.10 | `claims`, `media` |
| API-110, 32 | FR-08.08, 09.01 | `returns`, `reports` |
| API-150..153 | FR-09.02..09.07 | `reports` |
| API-180..188, J-20..23, API-81 `backup` | FR-02.08, 02.13..02.18 | `cloud`, `backup` |
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
| platforms | `dispatch.py` | Mới | Task phân phối: shop `CONNECTED` của sàn bật → `send_task` một task / shop (J-04, J-05, J-12 → queue `sync_fast`; J-06, J-13 → queue `sync` — DEC-503) |
| platforms | `service.py`, `router.py`, `schemas.py` | Sửa | API-70 (`platforms[]`, cảnh báo), API-71 theo sàn, API-72 không ngắt shop khác + `expired`, API-154, API-155, `RESULT_PATH = /admin/settings/platforms` |
| platforms | `sync.py` | Sửa | Hàm theo **một shop** (`sync_shop_orders`, `verify_shop_unverified`, `sync_shop_shipping`, `sync_shop_returns`, `refresh_shop_token`); `_order_return_signal` đọc nhóm `RETURNING`; tra đơn theo (shop, mã) |
| platforms/shopee | `mapping.py`, `returns_mapping.py`, `adapter.py` | Sửa | Trả nhóm chung; `exchange_code` trả list một phần tử |
| platforms/tiktok | `client.py`, `adapter.py`, `mapping.py`, `returns_mapping.py` | Mới | §7.1 |
| platforms/mock | `adapter.py` (Shopee nhiều shop), `tiktok.py`, `fixtures/tiktok/{orders,returns,cancellations}/*.json` | Sửa / mới | §7.2 |
| orders | `models.py`, `service.py`, `packages.py`, `router.py` | Sửa | `PLATFORMS`, unique theo shop, `PackageOrder`, `upsert_platform_order(…, shop)` nhận đơn file + EX-T2 + kiện gộp; `set_platform_status(order, raw, group)` — **nơi duy nhất** ghi `platform_status` + `platform_status_group` (DEC-508); `orders_by_sn(…, shop_id=None)` chỉ trong `shop_id IS NULL` cho file nhập; `find_orders_by_sn(code) -> list[Order]` cho nơi không biết shop; `is_cancelled` theo nhóm; API-30/31 trường + lọc (`return_dropped`) |
| returns | `models.py`, `service.py`, `views.py`, `router.py`, `schemas.py` | Sửa | `shop_id`, nhóm; `set_platform_status(case, raw, group)` (DEC-508); bỏ `SHIPPED_PLATFORM_STATUSES`, `AWAITING_ACCEPT_STATUSES` (đọc nhóm); `platform_return_sn` tra theo (shop, mã); `resolve_code` bàn hoàn trả `MULTIPLE_ORDERS` (§5.1); API-110 |
| reconciliation | `rules.py`, `service.py`, `router.py` | Sửa | BR-10/11/14/19 theo nhóm (gồm `rules.py:229-243` `DONE_PLATFORM_STATUSES` → nhóm `DONE`); API-120 lọc |
| sessions | `service.py`, `return_scan.py`, `return_state.py`, `return_lookup.py`, `schemas.py`, `jobs.py` | Sửa | Tra song song; `OPERATOR_REQUIRED` ở PACK; alert + cờ `ORDER_CANCEL_REQUESTED` (`flag_order_cancelled(kind)`); alert `RETURN_MULTIPLE_ORDERS`; API-104 `platform`, `shop_name`; chép `operator_name` vào phiên PACK; BR-37; `self_cancel_until`; trường sàn / shop / kiện gộp; `sessions/service.py:156` bỏ `platform="SHOPEE"` cứng |
| approvals | `service.py`, `views.py`, `schemas.py` | Sửa | `return_summary`; `note` bắt buộc khi hủy phiên RETURN |
| claims | `models.py`, `service.py`, `views.py`, `pack.py`, `schemas.py`, `router.py` | Sửa | BR-39 `auto_evidence` (loại `WRONG_SCAN` / `NOT_A_RETURN` — `EXCLUDED_CANCEL_REASONS`); BR-38 bỏ mềm; BR-42; API-130 lọc; API-132 trường (`excluded_return_sessions`); `views.primary_session()` dùng chung API-132 / J-16 / J-24; `submitted_at` / `result_at` |
| media | `protection.py` | Sửa | (a) tính `removed_at`; `evidence_targets_sql()` cho J-21 |
| reports | `service.py` | Sửa | API-32 counts / attention mới, lọc vai sau cache |
| reports | `analytics.py`, `csv_export.py`, `schemas.py`, `router.py` | Mới / sửa | API-150..153 |
| settings | `models.py`, `schemas.py`, `service.py` | Sửa | Trường mới; API-81 `backup`, `sync[].platform` |
| cloud | `config.py`, `store.py`, `crypto.py`, `ratelimit.py` | Mới | `ObjectStore` (Protocol) + `S3Store` (boto3) + `MemoryStore` (test); `encrypt_stream` / `decrypt_stream`; token bucket Redis |
| backup | `models.py`, `schemas.py`, `service.py`, `jobs.py`, `restore.py` (duyệt cloud, nhiều khóa, `MISSING`), `router.py` | Mới | §4, §7.3; API-187, 188 |
| shares | `models.py`, `schemas.py`, `service.py`, `build.py`, `cleanup.py`, `w1.py`, `templates/w1.html`, `router.py` | Mới | §4, §7.4 |
| notify | `models.py`, `schemas.py`, `catalog.py`, `service.py`, `conditions.py`, `dispatch.py`, `render.py`, `summary.py`, `providers/{base,telegram,zalo,mock}.py`, `router.py` | Mới | §4, §7.5 |
| workers | `tasks.py`, `celery_app.py` | Sửa | Task + route + beat §7; queue `sync_fast`, `sync`, `backup`, `notify`; `worker_prefetch_multiplier = 1`, `task_acks_late` cho `sync*` |
| entrypoints | `cli.py`, `seed_returns.py` → `seed_phase3.py` (mới) | Sửa / mới | `backup-keygen`, `backup-restore`, `backup-verify`; seed |
| docker | `Dockerfile` (`postgresql-client-16`), `compose.dev.yml` (`minio`, `minio-init` tạo `aicam-dev-backup` versioning + lifecycle và `aicam-dev-share`, `worker-backup`, `worker-notify`, `worker-sync -Q sync_fast -c 3`, `worker-sync-long -Q sync -c 2`, biến mới), `compose.yml` (cùng các worker), `.env.production.example`, `docs/s3-policy.example.json` (chính sách quyền khóa ứng dụng — ADR-010) | Sửa | §9 |
| docs | `docs/ops.md` §6.2 "Sao lưu cloud" (gồm danh sách bí mật phải cất ngoài máy — 02 API-186), §7.2 "Phase 3" (dừng cả `worker-sync-long worker-backup worker-notify`), §10 sự cố mới | Sửa | Runbook giữ khóa, đổi khóa, khôi phục, nâng cấp / lùi |
| tests | `tests/unit/test_{status_groups,lookup,grants,crypto,ratelimit,notify_rules,report_formulas,w1_render,tiktok_sign,tiktok_mapping}.py`, `tests/integration/test_{multishop_sync,fanout_isolation,order_unique_shop,code_lookup_two_shops,cancel_requested_br21,cancel_rule_br37,evidence_prior_br39,evidence_remove_br38,deadline_br42,refund_pending_br40,reports_api,backup_jobs,backup_key_rotation,backup_restore,shares_api,share_security_nfr42,backup_security_nfr41,notify_dispatch,migration_0006_0007,downgrade_phase2_jobs}.py`, `tests/contract/spec.py` (+ API Phase 3), `tests/qa/test_m11..m16_live.py`, `tests/load/perf_reports.py`, `tests/unit/test_no_platform_status_in_core.py` | Mới / sửa | §11 |

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
| claim_evidence | `backfilled` | bool | | false | dòng do backfill 0006 (4b) thêm — DEC-498 |
| setting | `packer_name_required` | bool | | false | |
| setting | `refund_only_default_hours` | int | | 48 | CHECK 1..168 |
| setting | `quiet_hours_enabled`, `quiet_start`, `quiet_end` | bool, time, time | | true, `22:00`, `07:00` | CHECK `quiet_start <> quiet_end` |
| setting | `backup_enabled` | bool | | false | |
| setting | `backup_confirmed_fingerprint`, `backup_confirmed_at`, `backup_confirmed_by` | text, timestamptz, uuid | ✔ | | |
| setting | `backup_upload_mbps` | int | | 10 | CHECK 1..1000 |
| setting | `backup_all_pack_clips` | bool | | false | |
| setting | `backup_restore_pending` | bool | | false | Lệnh khôi phục đặt `true`, `backup-verify` đạt mới xóa (DEC-499) |
| clip | `status` (CHECK mở rộng) | text | | | thêm `MISSING` (drop + create CHECK) — chỉ lệnh khôi phục đặt |
| status_history | index `ix_status_history_to_status_at` | | | | `(to_status, at)` — "kiện chuyển Đã bàn giao trong kỳ" |
| session | index `ix_session_type_status_ended` | | | | `(type, status, ended_at)` — báo cáo |

**Bảng mới (0006)**

| Bảng | Field | Kiểu | Null | Default | Index / ràng buộc |
|---|---|---|:---:|---|---|
| package_order | `package_id` FK package CASCADE, `order_id` FK order CASCADE, `created_at` | uuid, uuid, timestamptz | | now() | PK (package_id, order_id); index `(order_id)` |
| share_link | `id`, `status`, `source_type`, `claim_id` (FK claim SET NULL), `package_id` (FK RESTRICT), `layout`, `include_snapshots`, `recipient`, `expires_at`, `object_prefix` (`share/{token}/`), `url_enc` (bytea, Fernet), `object_keys` (jsonb), `progress`, `step`, `step_index`, `step_total`, `error_code`, `error_message`, `created_by` (FK user), `created_at`, `revoked_at`, `revoked_by`, `cloud_deleted_at`, `job_started_at` | … | theo nghĩa | `status='CREATING'`, `progress=0` | CHECK status, source_type (`CLAIM`/`SESSION`), layout; unique `object_prefix`; index `(status, expires_at)`, `(created_by, created_at)`, `(claim_id)`, `(package_id)`, `(created_at)` |
| share_item | `share_id` FK CASCADE, `ord` (1..4), `session_id` FK session RESTRICT, `video_key`, `video_sha256`, `size_bytes`, `source_sha256` jsonb, `snapshot_ids` uuid[] | | | | PK (share_id, ord); index `(session_id)` |
| backup_run | `id`, `kind` (`DB`), `trigger` (`SCHEDULE`/`MANUAL`), `status`, `started_at`, `finished_at`, `size_bytes`, `object_key`, `imports_object_key`, `error`, `created_by`, `key_fingerprint` (text, null khi chưa mã hóa) | | | | index `(started_at)`, `(key_fingerprint) WHERE status = 'SUCCESS' AND cloud_deleted_at IS NULL`; partial unique `(kind) WHERE status = 'RUNNING'` (một lượt chạy); thêm `cloud_deleted_at` |
| backup_object | `id`, `kind` (`DB_DUMP`/`IMPORTS`/`CLIP`/`SNAPSHOT`), `clip_id` FK RESTRICT, `snapshot_id` FK RESTRICT, `run_id` FK backup_run CASCADE, `object_key`, `status` (`PENDING`/`UPLOADING`/`UPLOADED`/`FAILED`/`HASH_MISMATCH`/`SOURCE_DELETED`/`IGNORED`/`CLOUD_DELETED`), `sha256`, `size_bytes`, `encrypted_size`, `attempts`, `next_attempt_at`, `uploaded_at`, `cloud_deleted_at`, `last_error`, `reason` (`EVIDENCE`/`ALL_PACK`), `key_fingerprint` (khóa của bản đang trên cloud — DEC-495), `hash_override` (bool, false), `sha256_actual`, `resolution_action` (`UPLOAD_ANYWAY`/`IGNORE`), `resolution_note`, `resolved_by`, `resolved_at`, `created_at`, `updated_at` (lease J-22) | | | `status='PENDING'`, `attempts=0` | CHECK status, `(resolution_action IS NULL) = (resolved_at IS NULL)`; unique `object_key`; partial unique `(clip_id) WHERE clip_id IS NOT NULL`, `(snapshot_id) WHERE snapshot_id IS NOT NULL`; index `(status, next_attempt_at)`, `(status, updated_at) WHERE status = 'UPLOADING'`, `(key_fingerprint) WHERE status = 'UPLOADED'` |
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

**Migration 0006 — bước:** (1) `SET LOCAL lock_timeout = '5s'`; (2) bảng mới; (3) cột mới nullable / có default; (4) backfill: `order.platform_status_group` bằng `CASE` theo bảng Shopee (hằng trong migration — không import code; `IN_CANCEL` → `CANCEL_REQUESTED`), `return_case.platform_status_group`, `return_case.shop_id`, `shop.grant_ref = platform_shop_id`, `claim.submitted_at` / `result_at` từ `audit_log` (lần đầu `after.status = 'SUBMITTED'`; lần cuối `WON`/`LOST`), hồ sơ không có audit → `updated_at` nếu trạng thái hiện tại tương ứng; **(4b) phiên mở hoàn trước (BR-39 v0.3, DEC-498)**: với mọi `claim` `status <> 'CLOSED'` và `source <> 'LEGACY_HOLD'`, `INSERT INTO claim_evidence (id, claim_id, kind, session_id, auto, added_by, added_at) SELECT … 'SESSION', s.id, true, NULL, now()` từ phiên `RETURN` `status IN ('CANCELLED','ABANDONED')` của `claim.package_id` hoặc của kiện thuộc `claim.return_case_id`, có ≥ 1 clip `status <> 'DELETED'`, `COALESCE(s.cancel_reason, '') NOT IN ('WRONG_SCAN','NOT_A_RETURN')`, `ON CONFLICT (claim_id, session_id) DO NOTHING`, cột `backfilled = true`; nâng cấp lại: **bỏ qua** cặp (hồ sơ, phiên) có trong `phase3_archive.backfill_prior_pairs` mà nay không còn trong `claim_evidence` (người dùng đã bỏ khi chạy Phase 2 — không thêm lại); log số dòng + số hồ sơ chạm; audit `CLAIM_EVIDENCE_UPDATE` một dòng / hồ sơ (`data.reason = "BACKFILL_BR39"`, người dùng `null`); (5) index báo cáo **sau** backfill; (6) khôi phục từ `phase3_archive` nếu có (nâng cấp lại sau downgrade — như DEC-331; chi tiết dưới) rồi drop schema; (7) log số dòng backfill, số `UNKNOWN`. Ước lượng: 0006 cập nhật mọi dòng `order` (1 cột) — đo ở T-201 trên 1 triệu đơn (máy dev), ghi vào ops §7.2.

**Downgrade (DEC-475; sửa v0.2 — DEC-497, 498, 509):**
- 0007: đếm (`platform_order_sn`) trùng toàn bảng và (`platform_return_sn`) trùng → > 0 → `raise` kèm 20 mã đầu ("Có mã đơn trùng giữa shop — không lùi được về Phase 2, sửa tiến"). Không có → tạo lại unique toàn cục cũ.
- 0006, theo thứ tự, **một transaction**, chép trước — xóa sau:
  1. **Kiểm chặn.** (a) Link `CREATING`/`ACTIVE` → từ chối trừ `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES=1` (in danh sách). (b) **Đơn ngoài** = đơn của shop TikTok + đơn của shop Shopee sẽ bị chuyển `DISCONNECTED` ở bước 3. Còn kiện của đơn ngoài → từ chối, in số kiện theo trạng thái, trừ `AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS=1` (DEC-509 — lý do: J-06 Phase 2 `sync.py:494-518` lấy mọi kiện `PACKED`/`HANDED_OVER`/hoàn giao thất bại không lọc shop, gọi Shopee bằng token shop mới nhất; lô có mã đơn lạ có thể lỗi cả lô → `break` → J-06 kẹt).
  2. `CREATE SCHEMA phase3_archive`; chép 9 bảng mới (`CREATE TABLE … AS SELECT *`); `shop_cols`; `tiktok_shops`; `order_shop` (đơn ngoài → `shop_id`); `reconnected_shops`; cột mới của `claim`, `order`, `return_case`, `setting`, `claim_evidence` vào `*_cols`; `backfill_prior_pairs` (cặp `claim_evidence.backfilled = true`); `missing_clips` (clip `MISSING`).
  3. Shop Shopee `CONNECTED` trừ shop mới nhất → `DISCONNECTED`.
  4. **Tách kiện đơn ngoài** (chỉ khi cờ 1b): `detached_packages(package_id, order_id)` ← mọi kiện của đơn ngoài; `UPDATE package SET order_id = NULL` (J-06 Phase 2 join `order` → bỏ qua; J-05 chỉ lấy `verified = false` → không tra). Đơn giữ dòng (`shop_id = NULL`) để nâng cấp lại.
  5. **Bằng chứng đã bỏ còn hạn giữ** (DEC-497 — thay cờ `held` của v0.1 vì `held` không bảo vệ ảnh): tập trước `B` = clip (không `DELETED`) + ảnh (`READY`) của dòng `claim_evidence` có `removed_at` mà `max(clip.end_at, removed_at) + số ngày giữ > now` (ảnh: `max(taken_at, removed_at)`). Nhóm theo `claim.package_id` → mỗi kiện **một hồ sơ hệ thống** `source = 'LEGACY_HOLD'`, `type = 'OTHER'`, `counterparty = 'PLATFORM'`, `status = 'CLOSED'`, `closed_at = max(removed_at)` của nhóm, `close_reason = 'Bằng chứng đã bỏ — giữ tới {keep_until}'`, `created_by` = người dùng hệ thống DEC-338, `deadline_at = closed_at`, `deadline_source = 'DEFAULT'`; bằng chứng `SESSION` / `SNAPSHOT` (khử trùng theo phiên / ảnh, `auto = false`); ghi chú `SYSTEM` "Bằng chứng đã bỏ khỏi KN-xxxxxx lúc … (lý do: …) — giữ tới {dd/mm/yyyy}". Luật Phase 2 (`protection.py:5` — `closed_at ≥ now − số ngày giữ`) cho đúng hạn BR-38 cho **cả clip lẫn ảnh**. Ghi id hồ sơ + `updated_at` vào `downgrade_removed_claims`. Xóa dòng `claim_evidence` đã bỏ (đã chép ở bước 2).
  6. **Kiểm tập con** (như 0004 `_check_subset`): `B` ⊆ tập được bảo vệ tính bằng SQL luật Phase 2 (hằng trong migration) **sau** bước 5; thiếu → `raise RuntimeError` (cả transaction lùi), in 5 id đầu. Log `|B|`, `|sau|`, chênh.
  7. Clip `MISSING` → `FAILED` (Phase 2 không có `MISSING`; J-11 Phase 2 chỉ đẩy lại J-01 — vô hại). Dòng `claim_evidence.backfilled` giữ nguyên (là bằng chứng hợp lệ — Phase 2 bảo vệ qua hồ sơ, DEC-498).
  8. `order.shop_id = NULL` cho đơn TikTok, xóa shop TikTok, CHECK `platform` về `('SHOPEE')`, CHECK `clip.status` về cũ, drop cột / bảng. Log số dòng từng phần.
- **Nâng cấp lại (0006 bước 6):** khôi phục shop, cột, bảng từ archive; `detached_packages` → `package.order_id` gắn lại nếu vẫn `NULL` (kiện đã được gắn đơn khác khi chạy Phase 2 → giữ, log); `missing_clips` → `MISSING` nếu vẫn `FAILED`; dòng đã bỏ từ archive: chèn lại vào hồ sơ gốc **trừ** khi (hồ sơ, phiên) / (hồ sơ, ảnh) đã có dòng đang dùng (người dùng thêm lại ở Phase 2 → giữ dòng hiện có, bỏ dòng archive, log `restore_removed_conflict`); hồ sơ hệ thống trong `downgrade_removed_claims` còn nguyên (`updated_at` không đổi, không thêm bằng chứng / ghi chú) → xóa; đã bị đổi → giữ, log. Backfill (4b) bỏ qua `backfill_prior_pairs` đã bị người dùng bỏ.
- Test `tests/integration/test_migration_0006_0007.py`: lên → dữ liệu mẫu (2 shop Shopee + 2 TikTok, link, kênh, bằng chứng đã bỏ có clip **và** ảnh, phiên hủy `WRONG_SCAN` + `ABANDONED`, kiện TikTok `PACKED`) → xuống không cờ → từ chối (đơn ngoài) → xuống với cờ → kiểm: hồ sơ `LEGACY_HOLD` `CLOSED` đúng `closed_at`, J-02 **Phase 2** (chạy hàm protection Phase 2 từ tag `main` trong test) không xóa clip / ảnh trước hạn và xóa sau hạn; kiện TikTok `order_id NULL`; J-06 Phase 2 với adapter mock ghi `calls[]` không có mã đơn TikTok → lên lại → dữ liệu như trước, không trùng (hồ sơ, phiên) khi Phase 2 đã thêm lại; trùng mã đơn → downgrade 0007 lỗi, DB nguyên vẹn; backfill 4b: hồ sơ mở có phiên `ABANDONED` → thêm, phiên `WRONG_SCAN` → không, chạy lại không nhân đôi.

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
| API-11 | Như cũ | STATION | PACK: (1) `operator_required` ∧ chưa có tên → ALERT `OPERATOR_REQUIRED {mode: PACK}` (trước mọi tra cứu); (2) mã lạ → `lookup.find_everywhere` ngoài khóa station; (3) mở phiên: `is_cancelled` → nhóm `CANCEL_REQUESTED` → `ORDER_CANCEL_REQUESTED`, `CANCELLED` → `ORDER_CANCELLED`; chép `operator_name`; cờ `AMBIGUOUS_SHOP` khi lookup trả ≥ 2. RETURN: `returns.resolve_code` (§5.1) trả `MULTIPLE_ORDERS` → ALERT `RETURN_MULTIPLE_ORDERS` `data.{code, orders[{platform, shop_name, platform_order_sn}]}` (≤ 10 đơn, sắp theo sàn, tên shop), không mở phiên | Như Phase 2 (DEC-266) | Như cũ |
| API-12 | Như cũ | STATION | Phiên RETURN: dưới khóa station, `now − started_at ≤ 60 giây` ∧ `inspection_saved_at IS NULL` ∧ không có `snapshot.kind = MANUAL` của phiên → hủy như Phase 2; ngược lại 409 | Khóa station | 409 `CANCEL_REQUIRES_SUPERVISOR` |
| API-20 | — | ADMIN, SUPERVISOR | `return_summary` cho item `session_type = RETURN` (một truy vấn gộp đếm ảnh) | Đọc | — |
| API-21 | `note` 5–500 khi `CANCEL_SESSION` ∧ phiên RETURN (service, `details.fields` tiếng Việt — C-05) | ADMIN, SUPERVISOR | Như Phase 2 | Như Phase 2 | 422 |
| API-104 | Như Phase 2 | STATION | `return_lookup._package_ids` giữ union theo mã kiện / mã đơn / mã chiều về / mã yêu cầu trả **mọi shop** (không `LIMIT 1` ngầm theo mã đơn); item thêm `platform`, `shop_name` (join `order` → `shop`, null khi chưa gắn) | Đọc | Như cũ |
| API-30 / 110 / 120 / 130 | `platform` enum, `shop_id` uuid; API-30 `session_status` danh sách (≤ 4 giá trị), `return_dropped` bool; API-110 `sort`, `pending_only` | 3 vai | Join `shop` theo `order.shop_id` (API-110 `return_case.shop_id`); API-110 `response_due_at` = `COALESCE(seller_due_at, reported_at + make_interval(hours => :h))` (SQL, dùng cho cả sắp xếp); `claim` = subquery hồ sơ chưa đóng mới nhất của đơn; `pending_only` = BR-40; `return_dropped` = `sessions.queries.dropped_return_filter()` (dùng chung API-32 `returns_dropped_7d`, J-26 N03 — BR-39) | Đọc | 422 |
| API-31 | — | 3 vai | Thêm trường đơn; `shares` (≤ 3, mọi trạng thái trừ `FAILED`, theo `share_item.session_id ∈` phiên của kiện); `url` giải mã chỉ khi `ACTIVE` | Đọc | — |
| API-32 | `date` như cũ | 3 vai | Counts / attention mới (§5); cache 5 giây giữ nguyên; lọc `SYNC_ERROR`, `BACKUP_STALE` theo vai **sau** cache | Đọc | — |
| API-80 | `packer_name_required` bool, `refund_only_default_hours` 1–168 | GET ADMIN, SUPERVISOR; PUT ADMIN | Như cũ + trường mới; đổi `packer_name_required` → after_commit publish state mọi station | Như cũ | 422 |
| API-81 | — | ADMIN, SUPERVISOR | `backup` = `backup.service.health_summary()`; `sync[]` + `platform`, `shop_name` | Đọc | — |
| API-131 / tự tạo | Như cũ | Như cũ | `claims._deadline`: `seller_due_at < now` → mặc định + `DEFAULT_PLATFORM_PASSED` + ghi chú hệ thống (BR-42); `auto_evidence` thêm phiên RETURN trước có clip (BR-39) | Như Phase 2 (khóa clip / ảnh — DEC-251, B-1) | Như cũ |
| API-132 | — | 3 vai | `evidence` = `removed_at IS NULL`; `removed_evidence`; `primary` / `prior_return` (DEC-448, loại `EXCLUDED_CANCEL_REASONS`); `removal_keep_until`; `prior_return_sessions`; `excluded_return_sessions` (phiên RETURN `CANCELLED` lý do `WRONG_SCAN`/`NOT_A_RETURN` có clip không `DELETED`, `in_evidence`); `session.cancel_reason`; `shares` | Đọc | — |
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
| API-181 | `upload_mbps` 1..1000 | ADMIN | `enabled: true` cần `state ∈ {ON, DISABLED}` với khóa đã xác nhận đúng dấu vân tay; `backup_restore_pending` → 409; audit | — | 409 `BACKUP_KEY_UNCONFIRMED`, `BACKUP_RESTORE_UNVERIFIED`, 503, 422 |
| API-182 | `fingerprint` | ADMIN | So `crypto.fingerprint(BACKUP_ENCRYPTION_KEY)`; khớp → lưu, `backup_enabled = true` (trừ khi `backup_restore_pending`); audit `BACKUP_KEY_CONFIRM` `{fingerprint, previous_fingerprint}` | — | 409 `BACKUP_KEY_MISMATCH`, 503 |
| API-183 | — | ADMIN | `store.probe()` (PUT / GET / DELETE `backup/_probe/{uuid}`) trong `asyncio.timeout(10)`; phân loại lỗi boto3: `InvalidAccessKeyId`/`SignatureDoesNotMatch`/`AccessDenied` → 502 `CLOUD_AUTH_FAILED`; `EndpointConnectionError`/timeout → 504; khác → 502 `CLOUD_ERROR`; audit `BACKUP_TEST` | — | 502, 504, 503 |
| API-184 | — | ADMIN | `state = ON` (else 409 — gồm `BACKUP_RESTORE_UNVERIFIED`); trước INSERT: `backup.jobs.fail_stale_runs()` (`RUNNING` > 2 giờ → `FAILED`, DEC-500); INSERT `backup_run RUNNING` (partial unique → `IntegrityError` → 409 `BACKUP_RUNNING`); after_commit J-20 `run_db(run_id)`; audit `BACKUP_RUN_NOW` | — | 409, 503 |
| API-185 | `kind`, `include_resolved`, trang | ADMIN | `backup_object` `HASH_MISMATCH` (chưa xử lý; `include_resolved` thêm `IGNORED` + `hash_override`) / `FAILED` (attempts ≥ 3) join clip → session → package; `sha256_expected` = `clip.sha256`, `sha256_actual` | Đọc | — |
| API-187 | — | ADMIN | `state = ON`; một `UPDATE backup_object SET status='PENDING', attempts=0, next_attempt_at=now() WHERE status='UPLOADED' AND kind IN ('CLIP','SNAPSHOT') AND key_fingerprint <> :fp_hiện_tại AND <tệp nguồn READY> RETURNING …`; trả `queued`, `bytes`; audit `BACKUP_REUPLOAD_OLD_KEY` | Một transaction | 409 `BACKUP_KEY_UNCONFIRMED`, `BACKUP_RESTORE_UNVERIFIED`, 503 |
| API-188 | `action ∈ {UPLOAD_ANYWAY, IGNORE}`, `note` 5–500 sau trim | ADMIN | `SELECT … FOR UPDATE` `backup_object`; không phải `HASH_MISMATCH` → 409; `UPLOAD_ANYWAY` → `PENDING`, `hash_override = true`, `attempts = 0`; `IGNORE` → `IGNORED`; ghi `resolution_*`; audit `BACKUP_ISSUE_RESOLVE`; WS `backup.updated` | Một transaction | 404, 409 `BACKUP_ISSUE_RESOLVED`, 422 |

## 5. Quy tắc nghiệp vụ → nơi thực thi

| BR | Thực thi ở | Test |
|---|---|---|
| BR-01 (theo nhóm) | `orders.blocks_packing()` đọc `order.platform_status_group ∈ {CANCEL_REQUESTED, CANCELLED}` (chỉ dùng để **chặn mở phiên**); `sessions._open_session_unsafe` chọn alert theo nhóm | `test_status_groups` (TikTok yêu cầu hủy → `ORDER_CANCEL_REQUESTED`) |
| BR-21 (làm rõ v0.3 — DEC-494) | `orders.set_platform_status()` so nhóm cũ → mới: vào `CANCELLED` → `apply_platform_cancel` (`orders/service.py:154-165`, như Phase 2); vào `CANCEL_REQUESTED` → **không** gọi `apply_platform_cancel`; kiện `PACKING` → `jobs.enqueue_flag_order_cancelled(package_id, kind="CANCEL_REQUESTED")` → cờ phiên `ORDER_CANCEL_REQUESTED` + WS; kiện `NEW`/`PACKED` giữ nguyên. Áp cho Shopee `IN_CANCEL` (Phase 2 `base.py:9` `CANCELLED_STATUSES` gồm `IN_CANCEL` → đường `upsert_platform_order` / `_apply_shipping` `sync.py:442` hủy kiện — sửa). `_order_return_signal` / `_apply_shipping` chỉ coi nhóm `CANCELLED` là hủy | `test_cancel_requested_br21`: (1) yêu cầu hủy khi `NEW` → kiện `NEW`, quét → S4; (2) khi `PACKING` → cờ, đóng xong `PACKED`; (3) yêu cầu bị **từ chối** (fixture TikTok `REJECTED`, Shopee `IN_CANCEL` → `READY_TO_SHIP`) → quét mở phiên, đóng gói, J-06 → `HANDED_OVER`; (4) yêu cầu được chấp nhận khi `PACKED` → `CANCELLED_AFTER_PACK` + BR-11; AC-41 |
| BR-29 | Index 0007; `orders.upsert_platform_order(session, data, shop)`: dưới `order:{sn}` tìm (shop, mã) → không có → tìm đơn file (`shop_id IS NULL`, mã) → nhận (đặt `shop_id`, `source = API`, audit `ORDER_OVERWRITTEN_BY_API` như BR-17) → không có → tạo. Mã vận đơn của kiện thuộc đơn **shop khác** → bỏ qua kiện đó, `platforms.warn(shop, TRACKING_OWNED_BY_OTHER_SHOP)`; cùng shop → như Phase 1. Mọi điểm tra theo mã khác: bảng §5.1 | `test_order_unique_shop` (2 shop cùng mã → 2 đơn; EX-T2; nhận đơn file) + `test_code_lookup_two_shops` (§5.1) |
| BR-30 | `platforms/<sàn>/mapping.order_group(raw)`; ghi chữ + nhóm **chỉ** qua `orders.set_platform_status` / `returns.set_platform_status` (DEC-508 — thay 3 chỗ ghi trực tiếp `orders/service.py:255`, `platforms/sync.py:441`, `returns/service.py:329`); `UNKNOWN` → `sync` không gọi `transition`, log `platform_status_unknown`; `test_no_platform_status_in_core` (tìm chuỗi trạng thái TikTok + Shopee trong `src/aicam` ngoài `platforms/{shopee,tiktok,mock}` = 0 — danh sách điểm đã biết phải sạch: `reconciliation/rules.py:32,33`, `rules.py:229-243` `DONE_PLATFORM_STATUSES`, `returns/service.py:52,83-108`, `sessions/return_scan.py:245`, `sessions/service.py:156`, `orders/packages.py:562`, `platforms/sync.py:204`, `platforms/service.py:41` `PLATFORM = "SHOPEE"`, `platforms/base.py:9`; + test AST: gán `.platform_status =` ngoài 2 helper = 0) | AC-41, AC-44 |
| BR-31 | `tiktok/returns_mapping.py` (loại → `needs_parcel`, `is_exchange`; trạng thái → nhóm); `returns.clock_started()` đọc nhóm `REQUESTED` thay danh sách chữ | AC-42 (6 kịch bản fixture) |
| BR-32 | `platforms.lookup.find_everywhere`: đọc shop + creds (DB) → `asyncio.gather(*(asyncio.wait_for(adapter.find_by_tracking(c, code), 2.0)))` với `return_exceptions=True`; tổng bọc `asyncio.timeout(settings.platform_lookup_timeout_s + 0.2)`; kết quả: 1 → upsert (savepoint), ≥ 2 → `AMBIGUOUS_SHOP` | `test_lookup` (1 shop chậm 5 giây, 1 có đơn → ~2 giây), AC-43 |
| BR-33 | `media.protection.evidence_targets_sql(now, cutoff)` = (a)–(d) clip `READY` + ảnh `READY`; + `backup_all_pack_clips` → clip phiên PACK `COMPLETED`; J-21 INSERT `ON CONFLICT (clip_id) WHERE clip_id IS NOT NULL DO NOTHING` (vị từ literal — DEC-362) | `test_backup_jobs` (video thô / clip không thuộc BR-33 không có trên bucket) |
| BR-34 | `shares`: `expires_at = now + expires_days`; URL ký `ExpiresIn = expires_at − now` (≤ 604.800); J-25: `ACTIVE ∧ expires_at ≤ now` → `EXPIRED` + xóa; thu hồi → J-25 ngay | AC-52 đồng hồ giả |
| BR-35 | API-160 validate; J-24 ảnh ≤ 20 | `test_shares_api` |
| BR-36 | `notify.dispatch` (§7.5) | `test_notify_dispatch` (AC-54 đủ 5 luật) |
| BR-37 | `sessions.cancel` (API-12) + `return_state.self_cancel_until` | `test_cancel_rule_br37` (45 giây được; 61 giây 409; có ảnh 409; có kết luận 409) |
| BR-38 | `claims.set_evidence` bỏ mềm; `protection.claim_session_ids` / `claim_snapshot_ids`: `(removed_at IS NULL AND (status <> 'CLOSED' OR closed_at >= cutoff)) OR removed_at >= cutoff`; `removal_keep_until` | `test_evidence_remove_br38` (clip quá hạn bị bỏ không bị J-02 xóa đêm đó; xóa đúng sau hạn) — AC-58 |
| BR-39 (v0.3 — DEC-491) | `claims.EXCLUDED_CANCEL_REASONS = ("WRONG_SCAN", "NOT_A_RETURN")` (tên thật `sessions/service.py:66-69` `_CANCEL_REASONS["RETURN"]`, `sessions/models.py` `CANCEL_REASONS`). `claims.auto_evidence(…, prior=True)`: phiên RETURN của kiện / hồ sơ hàng hoàn với `status ∈ (CANCELLED, ABANDONED)` có ≥ 1 clip `≠ DELETED` **và** `COALESCE(cancel_reason,'') NOT IN EXCLUDED_CANCEL_REASONS`. `views.primary_session(evidence)` = phiên RETURN có clip sớm nhất (`started_at`) **trừ** `EXCLUDED_CANCEL_REASONS` (kể cả thêm tay); không có → PACK hiệu lực — dùng cho API-132, `pack._session_rows` (J-16), J-24. Bảo vệ clip không đổi (BR-09 b — `protection.case_session_ids` lấy **mọi** phiên RETURN của kiện). `sessions.queries.dropped_return_filter()` (cùng loại trừ) cho API-32 `returns_dropped_7d`, API-30 `return_dropped`, J-26 N03 | `test_evidence_prior_br39`: (1) A `ABANDONED` + B `EMPTY_BOX` → A chính; (2) C `CANCELLED WRONG_SCAN` 25 giây có clip + D `COMPLETED` → KN không có C, D chính, `excluded_return_sessions = [C]`; (3) thêm tay C → `primary` vẫn D, J-16 thư mục chính là D; (4) C `NOT_A_RETURN` như (2); (5) `SUPERVISOR` → vào bằng chứng; (6) J-02 không xóa clip C khi hồ sơ hàng hoàn còn mở; (7) API-32 `returns_dropped_7d` và J-26 N03 không đếm C, API-30 `return_dropped=true` không liệt kê C — AC-56 |
| BR-40 | SQL dùng chung `returns.queries.refund_pending_filter(now, hours)` cho API-110 `pending_only`, API-32, J-26 N04 | `test_refund_pending_br40` — AC-57 |
| BR-41 | `reports.analytics` (công thức §8) | `test_report_formulas` (bộ dữ liệu cố định = ví dụ BR-41) — AC-45..47 |
| BR-42 | `claims._deadline` | `test_deadline_br42` — AC-59 |


### 5.1 Điểm tra theo mã → luật mới (BR-29, DEC-492, 493)

Bỏ unique toàn cục `order.platform_order_sn` / `return_case.platform_return_sn` (0007). Mã vận đơn vẫn unique toàn hệ thống → tra theo mã vận đơn không đổi. Grep `platform_order_sn`, `platform_return_sn`, `lock_orders`, `hashtext` trên `ai-cam-be/src/aicam` (`main` sau PR #2):

| # | Điểm (`main`) | Hiện nay | Luật mới | Test 2 shop trùng mã (`test_code_lookup_two_shops`) |
|:-:|---|---|---|---|
| 1 | `orders/service.py:111-127` `lock_orders` / `try_lock_order` — advisory `order:{sn}` (DEC-266) | Khóa theo mã | **Giữ** `order:{sn}` (DEC-493): khóa lấy trước khi có dòng → không theo id được; (shop, mã) không tuần tự hóa đơn file (shop null) với shop nhận nó. Hai shop cùng mã chia một khóa — chỉ chậm, đúng | A, B ghi cùng mã song song (2 transaction) → 2 đơn, không deadlock, không `IntegrityError` |
| 2 | `orders/service.py:234-242` `upsert_platform_order` | `WHERE sn` | Dưới `order:{sn}`: `(shop_id = :shop, sn)` → đơn file `(shop_id IS NULL, sn)` → tạo (BR-29 §5) | A rồi B → 2 đơn; file + A → A nhận; file + A + B → A nhận, B tạo |
| 3 | `orders/service.py:297-300` `orders_by_sn` ← `imports/service.py:80` `classify` | Map mã → đơn toàn cục; đơn API → `SKIP` | `orders_by_sn(sns, shop_id=None)` chỉ `shop_id IS NULL` → `NEW` / `UPDATE`. `SKIP` (BR-17) khi có đơn API ở **một** shop cùng mã **và** mọi mã vận đơn của nhóm đã thuộc đơn đó; ngược lại theo đơn file | File mã trùng đơn A, cùng mã vận đơn → `SKIP`; mã trùng đơn A + B, mã vận đơn mới → `NEW` đơn file; mã vận đơn của B → lỗi dòng "Mã vận đơn đã thuộc đơn {mã} ({shop})" |
| 4 | `orders/service.py:342-355` `apply_csv_order` | `WHERE sn FOR UPDATE`; `source = API` → bỏ qua | `WHERE sn AND shop_id IS NULL FOR UPDATE`; kiểm lại điều kiện `SKIP` của #3 dưới khóa (đơn API vừa nhận đơn file → `None`) | Nhập trong lúc J-04 shop A nhận đơn file cùng mã → không ghi đè đơn A |
| 5 | `orders/service.py:303-316` `packages_by_code` | Mã vận đơn → (kiện, mã đơn) | Trả thêm `order_id`, `shop_name` cho câu lỗi | Lỗi dòng nêu đúng shop |
| 6 | `platforms/sync.py:161-166` `_order_packages(order_sn)` | Kiện theo mã đơn toàn cục | Theo `order_id` (trước upsert: tra `(shop, sn)`; chưa có → `{}`) | J-04 shop B không thấy kiện của A khi so trước / sau |
| 7 | `platforms/sync.py:574` `_sync_one_return` | Đơn theo mã toàn cục | `(shop_id = shop của task, sn)`; không có → `get_order` + upsert với shop | Yêu cầu trả của B gắn đơn B, không gắn A |
| 8 | `returns/service.py:445-452` `attach_or_create` | `platform_return_sn` toàn cục | `(shop_id = order.shop_id, platform_return_sn)` (đơn file → `shop_id IS NULL`) | Mã yêu cầu trả trùng A / B → 2 hồ sơ |
| 9 | `returns/service.py:548-556` `upsert_from_platform` | `platform_return_sn` toàn cục `FOR UPDATE` | `(shop_id = :shop, platform_return_sn)` `FOR UPDATE`; tham số `shop_id` | Cập nhật yêu cầu của B không đụng hồ sơ A |
| 10 | `returns/service.py:671-757` `resolve_code` bước 3 (`:736-738`) | `session.scalar(WHERE sn = code)` — ≥ 2 dòng thì lấy dòng đầu **tùy ý**; rồi `platform_return_sn` | `find_orders_by_sn(code)` (mọi shop + đơn file) → 0: tra `platform_return_sn` (mọi shop) → đơn của chúng; 1 → như Phase 2; ≥ 2 → `Resolution("MULTIPLE_ORDERS", orders=[…])` → API-11 ALERT `RETURN_MULTIPLE_ORDERS` (02 §6.2) | Quét mã đơn trùng → alert 2 đơn có shop; mã yêu cầu trả trùng → alert; mã chỉ ở A → mở phiên A |
| 11 | `sessions/return_lookup.py:28-58` API-104 | Union theo mã; trả mọi kiện khớp | Giữ; item thêm `platform`, `shop_name` | Tìm mã trùng → 2 dòng, chip đúng |
| 12 | `sessions/return_scan.py:150,168,395,529`, `returns/service.py:445,548,954,1125`, `sessions/correction.py:81`, `orders/adjust.py:69`, `sessions/service.py:610,1080`, `platforms/sync.py:428` | `lock_orders` / `try_lock_order` theo mã của đơn đã biết | Không đổi (khóa theo mã — #1) | Có trong test #1 |
| 13 | `returns/service.py:1177-1194` `accepted_codes` | Mã đóng phiên gồm mã đơn | Không đổi — chỉ so trong hồ sơ của phiên | Đóng phiên bằng mã đơn trùng shop khác → vẫn đóng đúng phiên |
| 14 | `returns/views.py:169-175` (API-110 `q`), `orders/packages.py:266` (API-30 `q`), `claims/views.py:110` (API-130 `q`) | Lọc `EXISTS` theo mã | Không đổi logic (trả mọi kết quả); item có `shop` để phân biệt | Ô tìm mã trùng → 2 dòng, chip shop |
| 15 | `returns/service.py:916-940` `_unidentified_candidates`, `merge_unidentified_by_code` | Theo mã vận đơn / mã chiều về | Không đổi (unique toàn hệ thống) | — |
| 16 | `sessions/service.py:600-610` khóa `return_code:{code}` | Theo mã quét | Không đổi | — |
| 17 | `reconciliation/rules.py:176` | `platform_return_sn IS NULL` (không tra) | Không đổi | — |
| 18 | `entrypoints/seed_returns.py:144`, `platforms/mock/adapter.py:116` | Mã toàn cục | Seed / mock theo `(shop, sn)` (mock dict theo shop) | Seed 2 shop chạy lại idempotent |
| 19 | `platforms/sync.py:236` `failed_signal_key(sn, at)` | Khóa đợt chứa mã đơn | Không đổi — `_case_with_key` lọc theo `order.id` | — |
| 20 | `sessions/service.py:156` (`platform="SHOPEE"` cứng), `platforms/service.py:41` | Một sàn | `shop.platform` (NFR-28) | Chip TikTok đúng |
| 21 | J-13 Phase 3 (mới) | — | Luôn tra `(shop, mã)` (task theo shop) | Như #7, #9 |


## 6. Concurrency & toàn vẹn

**Thứ tự khóa (DEC-266 mở rộng, DEC-507 — khớp code J-04):** Redis `sync:{shop}` / `sync_returns:{shop}` (`SET NX`, **không chờ** — bận → `SKIPPED locked`) → Redis `grant:{platform}:{ref}` (chỉ `grants.ensure_fresh`, chờ ≤ 10 giây; J-12 chỉ lấy khóa này, không bao giờ chờ `sync:`) → advisory `order:{sn}` (DEC-493) → advisory station → `return_case` → `package` (id tăng) → `clip` → `snapshot` / `claim_evidence`. Bảng mới (`share_link`, `backup_*`, `notify_*`) khóa độc lập (`FOR UPDATE SKIP LOCKED`), không giữ khóa nghiệp vụ khi gọi mạng.

| Chỗ | Rủi ro | Cách giữ đúng |
|---|---|---|
| Hai shop cùng grant làm mới token | Refresh token dùng một lần bị dùng hai lần → một shop `EXPIRED` oan | `grants.ensure_fresh`: `SET NX grant:{p}:{ref}` TTL 60 giây, chờ tối đa 10 giây (poll 200 ms); sau khi có khóa **đọc lại** shop (`populate_existing`), còn hạn > 1 giờ → dùng luôn; làm mới → ghi token cho **mọi** shop cùng grant (`FOR UPDATE` theo id tăng), commit, nhả khóa compare-and-delete (G3-N4) |
| Ngắt shop khi job đang chạy | Job ghi tiếp bằng token cũ | Job kiểm `auth_status` sau khi lấy khóa `sync:{shop}` và **giữa mỗi trang** (đọc một cột, không khóa); đơn đã ghi trước khi dừng hợp lệ (EX-T7 "dữ liệu giữ nguyên") |
| Fan-out task trùng | Beat phát khi lượt trước chưa xong | Khóa Redis `sync:{shop}` như Phase 2 → `SKIPPED locked` |
| Tra song song khi quét + J-04 cùng đơn | Hai đường tạo cùng đơn | `upsert_platform_order` dưới `order:{sn}` + savepoint ở đường quét (Phase 1 review #5); unique theo shop |
| EX-T2 kiện của shop khác | Ghi đè `package.order_id` | Kiểm dưới `order:{sn}` của đơn **mới**; kiện được khóa `FOR UPDATE` trước khi quyết; khác shop → không đổi |
| BR-37 hủy đúng giây 60 | FE thấy còn nút, server hết hạn | Server quyết dưới khóa station theo `clock.now()`; FE hiện Toast từ 409 |
| Bỏ bằng chứng vs J-02 | Bỏ xong J-02 xóa ngay | Dòng không xóa; J-02 kiểm lại bảo vệ dưới khóa clip (DEC-251) đã tính `removed_at` |
| J-21 vs J-02 | Clip vào hàng chờ rồi bị xóa | J-22 khóa `backup_object` (`SKIP LOCKED`), nguồn `DELETED` hoặc mở file không thấy → `SOURCE_DELETED` (**trạng thái cuối**, không tính `pending`, không thử lại, J-23 không xét — không có gì trên cloud) |
| J-22 chết giữa lúc tải (worker bị kill, mất điện) | Dòng kẹt `UPLOADING` mãi, không ai tải lại | **Lease**: đầu mỗi lượt J-22 `UPDATE backup_object SET status='FAILED', attempts=attempts+1, next_attempt_at=now(), last_error='LEASE_EXPIRED' WHERE status='UPLOADING' AND updated_at < now() − (BACKUP_UPLOAD_BUDGET_S + 60 giây)`; J-22 cập nhật `updated_at` khi nhận dòng và sau mỗi 64 MiB tải |
| J-22 vs J-23 | Xóa bản cloud trong lúc tải | J-23 chỉ xét `UPLOADED` + nguồn bị **retention** xóa; J-22 chỉ `PENDING`/`FAILED` |
| J-22 tải lại bằng khóa mới (API-187) vs khôi phục đang đọc | Đọc nửa cũ nửa mới | Tải đè cùng `object_key` là một PUT nguyên tử (multipart hoàn tất mới thấy); versioning giữ bản cũ 7 ngày |
| Hai lượt J-20 | Hai dump song song | Partial unique `backup_run(kind) WHERE status = 'RUNNING'`; **J-20 / API-184 trước khi tạo lượt mới** đánh `FAILED` mọi `RUNNING` có `started_at < now − 2 giờ` (`error = 'STALE_RUNNING'`, DEC-500) — không chờ J-23 |
| Thu hồi khi J-24 đang dựng | Link thành `ACTIVE` sau khi thu hồi | J-24 trước khi công bố: `SELECT … FOR UPDATE` share → không còn `CREATING` → xóa đối tượng đã tải, dừng |
| J-26 / J-27 chạy chồng | Gửi trùng | Khóa Redis `notify:scan`, `notify:dispatch` (TTL 60 giây, không được → bỏ lượt); `notify_event` unique (code, dedupe_key); gửi: `FOR UPDATE SKIP LOCKED` từng tin, đánh `SENT` **sau** khi nhà cung cấp trả OK (gửi trùng tối đa một lần khi crash giữa chừng — chấp nhận, ghi rủi ro) |
| API-171 trùng tên | Hai Admin cùng thêm | Unique `lower(name)` + bắt `IntegrityError` trong savepoint → 409 |
| `ON CONFLICT` index một phần | Generic plan (DEC-362) | Mọi `ON CONFLICT … WHERE` viết vị từ literal: `backup_object(clip_id) WHERE clip_id IS NOT NULL`, `(snapshot_id) WHERE snapshot_id IS NOT NULL`; test chạy với `plan_cache_mode = force_generic_plan` |

## 7. Job nền · queue · tích hợp ngoài

| Tên | Trigger / lịch | Input | Làm gì | Retry / timeout | Lỗi cuối thì |
|---|---|---|---|---|---|
| J-04 `platforms.sync_orders` (phân phối) → `platforms.sync_shop_orders` | 5 phút; sau callback; API-73 | — / shop_id | Mỗi shop `CONNECTED` của sàn bật → 1 task (queue `sync_fast` — DEC-503); task: lock `sync:{shop}` (không chờ) → `grants.ensure_fresh` → `list_updated_orders(since = cursor − 10 phút)` trong `time_budget(120)` → upsert từng đơn (commit mỗi đơn — DEC-162); `fulfilled_by_platform` → bỏ qua + đếm | HTTP thử lại trong client (5 lần, `Retry-After`); hết ngân sách → dừng, cursor không tiến; Celery `soft_time_limit = 150` | `last_error SYNC_FAILED` + `error_since`; shop khác không ảnh hưởng (NFR-39) |
| J-05 `platforms.verify_unverified` | 10 phút (queue `sync_fast`) | — | Kiện chưa xác minh 7 ngày → `lookup.find_everywhere` (mỗi kiện ≤ 2 giây, ngân sách lượt 120 giây) | — | Giữ chưa xác minh |
| J-06 `platforms.sync_shipping_status` (phân phối) → `sync_shop_shipping` | 15 phút (queue `sync`) | shop_id | Kiện `PACKED`/`HANDED_OVER`/hoàn giao thất bại của **đơn thuộc shop** → `get_shipping_statuses` theo lô 50 (token của shop) → `_apply_shipping` ghi qua `orders.set_platform_status` (thay `sync.py:441`), luật hủy theo nhóm (BR-21 §5) | Ngân sách 300 giây | Lô lỗi → dừng shop, lượt sau |
| J-12 `platforms.refresh_tokens` | 30 phút (queue `sync_fast`) | — | Theo **grant** của shop `CONNECTED` / `EXPIRED` (bỏ qua shop `DISCONNECTED` — không làm mới, không ghi token cho nó; grant chỉ còn shop ngắt → bỏ cả grant — DEC-507): `grants.ensure_fresh(force)` dưới khóa `grant:` (không lấy `sync:`) | — | `EXPIRED` + `AUTH_EXPIRED` (mọi shop chưa ngắt của grant) |
| J-13 `platforms.sync_returns` (phân phối) → `sync_shop_returns` | 15 phút; sau callback (queue `sync`) | shop_id | Như Phase 2 (DEC-342, 361) + `returns_enabled(platform)`; đơn + yêu cầu trả tìm theo (shop, mã) (§5.1 #7, #9); TikTok qua `tiktok/returns_mapping` | Ngân sách 300 giây | Như Phase 2 |
| J-16 (mở rộng) | API-136 | pack_id | Bỏ dòng đã bỏ; phiên chính DEC-448 | Như cũ | Như cũ |
| J-02 (mở rộng) | 02:00 VN | — | Bảo vệ tính `removed_at` (qua `protection`) | Như cũ | Như cũ |
| J-11 (mở rộng) | 5 phút | — | Xóa `notify_message` > 30 ngày, `notify_event` > 30 ngày (đã xử lý), `backup_run` > 400 ngày | — | log |
| J-20 `backup.run_db` | crontab UTC 18, 0, 6, 12 (= 01, 07, 13, 19 VN); API-184 | run_id? | `state = ON`? → `fail_stale_runs()` (`RUNNING` > 2 giờ → `FAILED STALE_RUNNING`) → tạo / nhận `backup_run`; `pg_dump -Fc --no-owner` (env từ `DATABASE_URL`) → `BACKUP_TMP_DIR`; `tar czf` `IMPORT_ROOT`; mã hóa luồng + tải `backup/db/YYYY/MM/DD/aicam-{stamp}.dump.enc`, `backup/imports/{stamp}.tgz.enc`; **kiểm**: tải lại, giải mã luồng, so SHA-256 bản rõ (DEC-466); `SUCCESS` + `size_bytes` + `key_fingerprint`; xóa file tạm | Celery 2 lần thử (10 phút); ngân sách 3.600 giây | `FAILED` + `error`; > 26 giờ **hoặc** 2 lượt `kind = DB` gần nhất (theo `started_at`, đã kết thúc) đều `FAILED` → `BACKUP_STALE` (`DB_LATE` / `DB_FAILED_TWICE`), N08 (`dedupe_key = backup:db2:{run_id lượt lỗi thứ 2}`) — DEC-500 |
| J-21 `backup.enqueue_evidence` | 10 phút | — | `state = ON`; INSERT `backup_object PENDING` cho `evidence_targets_sql` chưa có (`ON CONFLICT … DO NOTHING`); ưu tiên: hồ sơ khiếu nại chưa đóng trước (cột `reason` + sắp ở J-22) | Ngân sách 60 giây | log |
| J-22 `backup.upload_evidence` | 5 phút | — | `state = ON`; (0) **lease**: `UPLOADING` có `updated_at < now − (BACKUP_UPLOAD_BUDGET_S + 60 giây)` → `FAILED` (`LEASE_EXPIRED`) (§6); lấy `PENDING`/`FAILED` đến hạn (`FOR UPDATE SKIP LOCKED`, lô 20) → `UPLOADING` (`updated_at = now`) → commit → nguồn `DELETED` / file không có → `SOURCE_DELETED` (cuối); SHA-256 file == `clip.sha256` / `snapshot.sha256`? lệch và `hash_override = false` → `HASH_MISMATCH` + `sha256_actual` (N08, không tải); khớp **hoặc** `hash_override` → mã hóa + tải `backup/evidence/{clips\|snapshots}/{id}.enc` lên `S3_BUCKET` (metadata `sha256` = băm thực tế, `relpath`, `kind`, `id`, `key-fp`; `hash_override` → thêm `sha256-expected`, `integrity=MISMATCH_ACCEPTED`) qua token bucket → HEAD kiểm `ContentLength` → `UPLOADED` + `key_fingerprint` hiện tại | Ngân sách 240 giây / lượt; nhường khi có job link (Redis `share:active`); lỗi → `FAILED`, `next_attempt_at` 5, 15, 60 phút rồi mỗi 60 phút | > 24 giờ chờ → `BACKUP_STALE`, N08 |
| J-23 `backup.prune` | 03:00 VN (crontab UTC 20) | — | `state = ON` (không chạy khi `RESTORE_PENDING`); **schema guard** ngay trước khi xóa (`schema_guard.matches()` lệch → log `skipped_schema_mismatch`, dừng — như J-02); (1) `backup_object` `UPLOADED` có clip `DELETED` **kèm audit `DELETE_CLIP` `data.reason = 'RETENTION'`** / ảnh `DELETED` (chỉ J-02 xóa ảnh — `media/service.py:855`) → `delete(key)` (delete marker ở bucket versioning) → `CLOUD_DELETED` (FR-02.14 ≤ 24 giờ); clip `MISSING` / `SOURCE_DELETED` / `IGNORED` **không** xét (DEC-499); (2) DB: giữ lượt `SUCCESS` < 30 ngày + lượt sớm nhất ngày 1 mỗi tháng trong 12 tháng **+ luôn 3 lượt `SUCCESS` mới nhất bất kể tuổi** (DEC-505), còn lại xóa đối tượng (`backup_run.cloud_deleted_at`); (3) `RUNNING` > 2 giờ → `FAILED` (lưới an toàn, J-20 đã làm); (4) đối tượng `backup/_probe/` > 1 ngày | Ngân sách 1.800 giây | Lượt sau |
| J-24 `shares.build` | API-160 (queue `export`) | share_id | `share:active` = 1 (TTL); mỗi phiên: `render_side_by_side_to` (CAM1 hoặc ghép), `+faststart`, SHA-256 → tải `v{n}.mp4`; ảnh `p{n}-{k}.jpg`; `w1.render()` → `index.html`; URL ký; `FOR UPDATE` share còn `CREATING` → `ACTIVE`, `url_enc`; WS `share.updated` từng bước | Ngân sách 600 giây (`soft_time_limit` 630) | `FAILED` (`RENDER_FAILED` / `UPLOAD_FAILED` / `TIMEOUT`), xóa đối tượng đã tải |
| J-25 `shares.cleanup` | 5 phút; ngay sau API-163 | share_id? | `ACTIVE ∧ expires_at ≤ now` → `EXPIRED` + audit `SHARE_EXPIRE` (user null); mọi share `REVOKED`/`EXPIRED`/`FAILED` có `cloud_deleted_at IS NULL` → `delete_prefix(object_prefix)` → `cloud_deleted_at`; `CREATING` > 15 phút → `FAILED` | Thử lại mỗi lượt (mỗi phút khi `revoke_pending` — beat 60 giây cho nhánh này) | `revoke_pending` còn `true` (D21 "Đang thu hồi — chờ Internet") |
| J-26 `notify.scan` | 30 giây | — | Điều kiện N01..N09 (§7.5) → `notify_event` | Khóa `notify:scan`; ngân sách 20 giây | Lượt sau |
| J-27 `notify.dispatch` | 15 giây | — | Gom / giữ / gửi (§7.5) | Khóa `notify:dispatch`; ngân sách 10 giây; HTTP timeout 8 giây | `RETRYING` → `DROPPED` sau 24 giờ |
| J-28 `notify.daily_summary` | crontab UTC 11:00 (18:00 VN) | — | N10 `summary:{yyyy-mm-dd}` (số đóng gói / lệch / hoàn nhận / có vấn đề hôm nay, hồ sơ mở / sắp hạn / quá hạn, Chỉ hoàn tiền chưa xử lý — dùng `reports.service._counts`) | — | log |

Route Celery (DEC-503, 504): `platforms.sync_orders*`, `platforms.verify_unverified`, `platforms.refresh_tokens` → `sync_fast` (`worker-sync -c 3`); `platforms.sync_shipping*`, `platforms.sync_returns*` → `sync` (`worker-sync-long -c 2`); `backup.*` → `backup` (`worker-backup -c 1`); `notify.*` (J-26, J-27, J-28) → `notify` (`worker-notify -c 1` — tuần tự, không chờ J-20 chạy tới 1 giờ); `shares.build` → `export`; `shares.cleanup` → `default`. `worker_prefetch_multiplier = 1`, `task_acks_late = true` cho `sync*` (task dài không giữ task khác trong bộ đệm). Beat thêm J-20..J-28.

### 7.1 TikTok Shop Partner API (giả định theo tài liệu công khai — **chưa test, thiếu tài khoản đối tác: Q18, Q19**)

| Nhóm | Gọi (giả định, version `202309`) | Điểm cần xác minh (T-3 TikTok) |
|---|---|---|
| Ký request | Tham số chung `app_key`, `timestamp` (giây), `shop_cipher` (API cấp shop), `sign`; header `x-tts-access-token`. `sign` = HMAC-SHA256(`app_secret`, `app_secret + path + Σ(k+v theo k tăng, trừ sign, access_token) + body JSON + app_secret`) hex | Công thức chuỗi gốc, mã lỗi chữ ký |
| Ủy quyền | Trang `https://services.tiktokshop.com/open/authorize?service_id={TIKTOK_SERVICE_ID}&state=…`; `GET {TIKTOK_AUTH_BASE}/api/v2/token/get?app_key&app_secret&auth_code&grant_type=authorized_code`; làm mới `…/api/v2/token/refresh?…&refresh_token&grant_type=refresh_token` → `access_token`, `access_token_expire_in`, `refresh_token`, `open_id` (→ `grant_ref`) | Redirect URI có nhận `https://x.local/…` không (RK-26); refresh token có dùng một lần không |
| Shop được ủy quyền | `GET /authorization/202309/shops` → `[{id, name, region, cipher}]` | |
| Đơn đổi | `POST /order/202309/orders/search?page_size=50&page_token=` body `{update_time_ge, update_time_lt}`; chi tiết `GET /order/202309/orders?ids=` (≤ 50) → `status`, `line_items[] {product_name, sku_name, seller_sku, sku_image, package_id, tracking_number}`, `buyer_message`, `fulfillment_type`, `create_time`, `update_time` | `fulfillment_type` nhận biết đơn kho TikTok (AS-13); mỗi kiện một `tracking_number` |
| Yêu cầu hủy (DEC-468, sửa DEC-502) | `POST /return_refund/202309/cancellations/search` body `{update_time_ge, update_time_lt}` → mọi `order_id` có yêu cầu hủy cập nhật trong cửa sổ (mọi trạng thái yêu cầu: `PENDING` / được chấp nhận / bị từ chối / người mua rút) → **luôn** lấy chi tiết đơn `GET /order/202309/orders?ids=` (≤ 50 / lần) kể cả khi `orders/search` không trả đơn đó; nhóm = `mapping.order_group(order.status, latest_cancel)` với `latest_cancel` = yêu cầu hủy **mới nhất** theo `update_time` của đơn: `order.status` thuộc nhóm `CANCELLED` → `CANCELLED`; `latest_cancel.status = PENDING` và đơn chưa giao (`AWAITING_*`, `PARTIALLY_SHIPPING`, `UNPAID`, `ON_HOLD`) → `CANCEL_REQUESTED`; còn lại (từ chối / rút / không có) → nhóm theo `order.status`. `list_updated_orders` gộp và khử trùng theo `order_id` | Tên trạng thái yêu cầu hủy (giả định `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED_BY_BUYER`); fixture `cancellations/{pending,rejected,withdrawn,approved}.json` |
| Vận chuyển (J-06) | Đọc lại chi tiết đơn theo lô (`orders?ids=`) → nhóm + `package_status` → `warehouse_hint` | Trạng thái giao thất bại / trả về người bán |
| Tra khi quét | Không tra được theo mã vận đơn (giả định AS-12) → quét đơn cập nhật `TIKTOK_LOOKUP_LOOKBACK_MIN` (60) phút gần nhất, 1 trang, cache mã vận đơn → đơn (5.000 mục) như Shopee (DEC-469) | API tra theo tracking (nếu có → dùng) |
| Yêu cầu trả | `POST /return_refund/202309/returns/search` body `{update_time_ge, update_time_lt}` → `return_id`, `order_id`, `return_type` (`REFUND_ONLY`/`RETURN_AND_REFUND`/`REPLACEMENT`), `return_status`, `return_reason`, `return_reason_text`, `return_line_items[]`, `return_tracking_number`, hạn người bán (tên trường chưa rõ → `seller_due_at = None` nếu không có), `create_time`, `update_time`; `get_return` = search theo `return_ids` | Bảng 02 §5.3; hạn người bán (L14) |
| Lỗi | `code ≠ 0` → `TikTokRequestError`; mã token (giả định `105002`, `105003`, `36004004`) → `PlatformAuthError`; HTTP 429 / 5xx / mã giới hạn tần suất → thử lại giãn cách (`TIKTOK_MAX_ATTEMPTS`, `Retry-After`), trong `time_budget` | Danh sách mã lỗi thật |

Client log mỗi lần gọi: path, HTTP, `code`, `request_id`, thời gian — không log query / header (token, sign). Lưu payload gốc vào `order.raw_payload`, `return_case.raw_payload`.

### 7.2 Adapter mock (dev / test — DEC-474)

| Mock | Hành vi |
|---|---|
| Shopee nhiều shop | `MOCK_SHOPEE_SHOP_IDS` (mặc định `990001,990002`): `build_auth_url` lần lượt trả shop chưa kết nối; dữ liệu theo shop (dict `{shop: {sn: order}}`) — `990001` giữ fixture Phase 1–2 (`SPXTST…`), `990002` sinh `SPXTSTB000000001..20`, mã đơn `2410TSTB…`; **một mã đơn trùng** giữa 2 shop (`2410DUP00001`) + một mã yêu cầu trả trùng cho BR-29 / §5.1; một đơn `IN_CANCEL` rồi về `READY_TO_SHIP` (từ chối hủy) |
| TikTok | `platforms/mock/tiktok.py`, `code = "TIKTOK"`; auth → callback `code = MOCK-TT-CODE` → 2 shop `TTMOCKA` "TST TikTok A (mock)", `TTMOCKB`; fixture JSON **định dạng TikTok** qua `tiktok/mapping.py` thật (như mock Shopee đi qua `returns_mapping`): 9 trạng thái đơn §5.3 + 1 lạ (`XYZ`), kiện gộp (`TTTST0000000077` cho 2 đơn), đơn kho TikTok (bỏ qua), 6 kịch bản trả (AC-42), 4 kịch bản yêu cầu hủy (`pending`, `rejected`, `withdrawn`, `approved` — đơn `TTTST0000000050..53`, DEC-502); mã `TTTST…`; một mã đơn trùng với shop Shopee `990002` (`2410DUP00001`) |
| Điều khiển test | `delay_s_by_shop`, `fail_shop` (luôn `PlatformError`), `fail_times`, `fail_auth`, `calls[]` — NFR-39, AC-43 |
| S3 | `MemoryStore` (unit, có mô phỏng versioning: `delete` → delete marker, `list_versions`); MinIO (`minio/minio`, cổng 59000 / console 59001, `minio-init` tạo `aicam-dev-backup` (`mc version enable` + `mc ilm rule add --noncurrent-expire-days 7`) và `aicam-dev-share`, user ứng dụng gắn policy `docs/s3-policy.example.json` không có `s3:DeleteObjectVersion`) ở compose dev; production cấm endpoint `localhost` |
| Thông báo | `NOTIFY_TRANSPORT=mock`: `RPUSH notify:mock:{TELEGRAM\|ZALO_OA}` JSON `{target, text, at}` (`LTRIM` 1.000) + log `notify_mock_sent`; `NOTIFY_MOCK_FAIL=TELEGRAM` → luôn lỗi (thử lại / bỏ); Telegram thật trỏ server giả được qua `TELEGRAM_API_BASE` (respx trong test) |

### 7.3 Kho lưu + mã hóa (ADR-010)

- **Hai bucket** (ADR-010, DEC-501): `S3Store(bucket=S3_BUCKET)` cho `backup/*` (versioning + lifecycle ở nhà cung cấp; `delete` = delete marker), `S3Store(bucket=S3_SHARE_BUCKET)` cho `share/*` (không versioning; `delete_prefix` nếu thấy `VersionId` trong list → xóa mọi phiên bản). Validator production: hai bucket khác nhau.
- `cloud/store.py`: `ObjectStore` Protocol — `put_stream(key, stream, *, content_type, metadata, throttle)`, `get_stream(key)`, `head(key)`, `delete(key)`, `delete_prefix(prefix)`, `list(prefix)`, `presign_get(key, expires_s, *, filename=None, content_type=None)`, `probe()`. `S3Store` dùng boto3 (`signature_version="s3v4"`, `addressing_style` cấu hình, `connect_timeout` 5, `read_timeout` 30, retry botocore `standard` 3) chạy qua `asyncio.to_thread`; `upload_fileobj` multipart 8 MiB với stream không seek được.
- `cloud/crypto.py` — định dạng `AICAMENC1`: header 32 byte = `b"AICAMENC"` ‖ `0x01` (phiên bản) ‖ `0x16` (log2 khối = 22 → 4 MiB) ‖ `0x0000` ‖ dấu vân tay 8 byte ‖ tiền tố nonce 8 byte ngẫu nhiên ‖ 4 byte dự phòng; mỗi khối: `len u32` ‖ AES-256-GCM(nonce = tiền tố ‖ `counter u32`, AAD = header ‖ `counter` ‖ `final u8`). Khối cuối `final = 1` (kể cả rỗng) — cắt cụt / đảo khối → lỗi giải mã. Dấu vân tay = 8 byte đầu SHA-256(`"aicam-backup-key-fp:" ‖ key`), hiển thị `XXXX-XXXX-XXXX-XXXX`. Giải mã kiểm dấu vân tay trước (sai khóa → `WrongKeyError`, không ghi gì). `decrypt_stream(stream, keys: Mapping[fp, key])` — chọn khóa theo dấu vân tay header (khôi phục nhiều khóa — DEC-495; `keys` = `BACKUP_ENCRYPTION_KEY` + `BACKUP_OLD_KEYS` + `--key-file`); không khóa nào khớp → `WrongKeyError(fp)`. Mỗi lần mã hóa trả `fingerprint` để ghi `backup_object.key_fingerprint` / `backup_run.key_fingerprint`.
- `cloud/ratelimit.py`: token bucket Redis (Lua) `upload:bucket`, dung lượng 1 giây × `upload_mbps`; `throttle(n_bytes)` chờ đủ token; job link gọi `priority=True` (bỏ qua chờ khi bucket còn ≥ 50 %, đặt `share:active`).

### 7.4 Link chia sẻ + W1

- Khóa đối tượng: `share/{token}/index.html`, `v{n}.mp4`, `p{n}-{k}.jpg` (`token = secrets.token_urlsafe(32)` — 256 bit).
- Mọi đối tượng link ở `S3_SHARE_BUCKET` (không versioning — G2-15); URL ký theo `S3_PUBLIC_ENDPOINT`.
- `index.html`: `Content-Type: text/html; charset=utf-8`, `Cache-Control: no-store`; video `video/mp4`; link "Tải video" = URL ký có `ResponseContentDisposition=attachment; filename="phien-{n}.mp4"`. Template `<head>` có `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src {origin}; media-src {origin}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">` (`origin` = scheme + host của `S3_PUBLIC_ENDPOINT` — escape) và `<meta name="referrer" content="no-referrer">`; không `<script>` (DEC-506). Test `test_w1_render`: có 2 thẻ meta, không `<script`, mọi `src` / `href` cùng origin.
- `w1.render(ctx)`: `string.Template` + `html.escape` cho mọi giá trị (DEC-470); nội dung đúng 02 §6.3 (whitelist trường — test kiểm không có `recipient`, tên người tạo, ghi chú, số tiền, tên shop).
- URL ký: `ExpiresIn = int((expires_at − now).total_seconds())` (≤ 604.800); toàn bộ ký trong một lần dựng.

### 7.5 Thông báo (BR-36, DEC-443)

**J-26 điều kiện** (mọi điều kiện có cửa sổ nhìn lại ≤ 24 giờ → dọn `notify_event` sau 30 ngày an toàn — DEC-473):

| Mã | Điều kiện | `dedupe_key` | Mục trong tin |
|---|---|---|---|
| N01 | Camera `OFFLINE`, `last_seen_at < now − 60 giây` và > now − 24 giờ, **ngoài giờ yên lặng** (DEC-444) | `cam:{id}:{last_seen_at}` | "Station 01 · Cam 2 · từ 14:00" |
| N02 | `recon_alert` `HIGH` `OPEN`, `detected_at > now − 24 giờ` | `alert:{id}` | mã kiện · sàn · shop · từ ngày |
| N03 | Phiên RETURN `CANCELLED`/`ABANDONED` `ended_at > now − 24 giờ` qua `sessions.queries.dropped_return_filter()` (trừ `cancel_reason ∈ {WRONG_SCAN, NOT_A_RETURN}` — BR-39); hồ sơ `UNIDENTIFIED` mới | `sess:{id}` / `case:{id}` | mã kiện · station · giờ |
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
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_SHARE_BUCKET`, `S3_ADDRESSING_STYLE` | rỗng, `us-east-1`, rỗng, rỗng, `path` | mọi | Rỗng → sao lưu + link `NOT_CONFIGURED`; `S3_BUCKET` = sao lưu (versioning), `S3_SHARE_BUCKET` = link (không versioning) — DEC-501 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | rỗng | secret | |
| `S3_PUBLIC_ENDPOINT` | = `S3_ENDPOINT` | mọi | Host dùng khi ký URL link (MinIO dev: `http://<LAN_IP>:59000` để điện thoại mở được) |
| `BACKUP_ENCRYPTION_KEY` | rỗng | secret (base64 32 byte) | Không vào DB / log; `aicam backup-keygen` |
| `BACKUP_OLD_KEYS` | rỗng | secret (base64, cách dấu phẩy) | Khóa cũ chỉ để **giải mã** (khôi phục, kiểm `--from-cloud`) — DEC-495; không dùng mã hóa |
| `BACKUP_TMP_DIR` | `/tmp/aicam-backup` | mọi | File dump tạm |
| `BACKUP_DB_BUDGET_S`, `BACKUP_UPLOAD_BUDGET_S` | `3600`, `240` | mọi | J-20, J-22 |
| `SHARE_BUILD_TIMEOUT_S` | `600` | mọi | J-24 |
| `NOTIFY_ENABLED`, `NOTIFY_TRANSPORT` | `true`, `real` (dev: `mock`) | mọi | |
| `NOTIFY_MOCK_FAIL` | rỗng | dev / test | §7.2 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_BASE` | rỗng, `https://api.telegram.org` | secret / mọi | Rỗng → `TELEGRAM` không cấu hình (EX-N1) |
| `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN` | rỗng | secret | Rỗng → `ZALO_OA` không cấu hình |
| `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES` | không đặt | migrate | §3 downgrade |
| `AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS` | không đặt | migrate | §3 downgrade bước 1b, 4 (DEC-509) |
| Đã có, đổi nghĩa | `PLATFORM_ADAPTER` chỉ cho Shopee; `SHOPEE_*` giữ | | DEC-436 |
| Hạ tầng | `worker-sync` `-Q sync_fast -c 3`; `worker-sync-long` `-Q sync -c 2` (mới); `worker-backup` `-Q backup -c 1` (volume `video` chỉ đọc, `imports` chỉ đọc); `worker-notify` `-Q notify -c 1` (mới, ~60 MB RAM); Dockerfile thêm `postgresql-client-16` (PGDG apt) | compose dev + production | DEC-434, 439, 503, 504 |

Validator `core/settings.py` (production / staging): cờ TikTok bật → đủ 3 khóa + `TIKTOK_ADAPTER = tiktok`; có `S3_ENDPOINT` → đủ khóa truy cập + **hai** bucket khác nhau, `BACKUP_ENCRYPTION_KEY` hợp lệ (32 byte) hoặc rỗng, mỗi khóa trong `BACKUP_OLD_KEYS` hợp lệ và khác khóa hiện tại; `NOTIFY_TRANSPORT = mock` cấm ở production.

## 10. Observability

| Loại | Tên / nội dung | Ngưỡng cảnh báo |
|---|---|---|
| Log | `platform_sync{platform, shop_id, status, orders, changed, duration_ms}`, `tiktok_call{path, http_status, code, request_id, duration_ms, attempt}`, `platform_lookup{code, shops, found, ambiguous, duration_ms}`, `platform_status_unknown{platform, status}`, `tracking_owned_by_other_shop` | `platform_status_unknown` > 0 / ngày → xem Q19 |
| Log | `backup_db{run_id, status, size, duration_s, key_fp}`, `backup_object{id, kind, status, attempts, key_fp}`, `backup_hash_mismatch{object_id, sha_db, sha_file}`, `backup_lease_expired{object_id}`, `backup_issue_resolved{object_id, action}`, `backup_restore{downloaded, missing, outside_db, keys}`, `backup_prune_skipped_schema_mismatch` | mỗi `hash_mismatch`; `lease_expired` > 3 / ngày |
| Log | `share_build{share_id, status, sessions, duration_s}`, `share_cleanup{share_id, deleted, pending}` — **không** log URL / token | `share_build` > 180 giây |
| Log | `notify_event{code, dedupe_key}`, `notify_send{channel_id, status, attempts, provider_code}` — không log text đầy đủ | `DROPPED` > 0 |
| Metric | `aicam_platform_sync_seconds{platform}`, `aicam_platform_sync_errors_total{platform}`, `aicam_platform_lookup_seconds` | lookup p95 > 2,5 giây |
| Metric | `aicam_backup_pending` (không gồm `SOURCE_DELETED`, `IGNORED`), `aicam_backup_last_success_timestamp`, `aicam_backup_db_consecutive_failures`, `aicam_backup_upload_bytes_total`, `aicam_backup_old_key_objects` | pending > 0 quá 24 giờ; last_success > 26 giờ; consecutive_failures ≥ 2 |
| Metric | `aicam_share_build_seconds`, `aicam_notify_sent_total{status}`, `aicam_report_seconds{report}` | report 92 ngày > 3 giây |
| Health | API-81 `backup`, `sync[]` theo shop | D8 |

## 11. Test BE

| Mức | Phạm vi | Case chính (TC-xx — QA đánh số ở `04`) |
|---|---|---|
| Unit | Ánh xạ nhóm Shopee + TikTok (mọi chữ §5.3 + chữ lạ; TikTok `(status, latest_cancel)` 4 kịch bản hủy — DEC-502); ký TikTok (vector cố định); `crypto` (mã hóa / giải mã khứ hồi 0 B, 1 B, 4 MiB, 9 MiB; cắt cụt, đảo khối, sai khóa → lỗi; dấu vân tay; giải mã chọn đúng khóa trong 2 khóa); `ratelimit`; `w1.render` (escape, whitelist, CSP + referrer, không `<script`); `notify` render (≤ 10 dòng, không PII); công thức BR-41 (ví dụ 01); BR-37 biên 60 giây; `primary_session` (BR-39 6 kịch bản §5); NFR-28 tìm chuỗi + AST gán `platform_status` ngoài helper = 0 | AC-41, 44, 45, 53 |
| Integration (Postgres + Redis thật) | Đa shop: 2 Shopee + 2 TikTok mock, kết nối shop 2 không ngắt shop 1, ngắt 1 shop (AC-40); unique theo shop + EX-T2 + nhận đơn file; **`test_code_lookup_two_shops` — một case cho mỗi dòng §5.1** (2 shop trùng mã đơn + mã yêu cầu trả); **`test_cancel_requested_br21`** (4 kịch bản §5, gồm yêu cầu hủy bị từ chối → kiện vẫn đóng gói, bàn giao; Shopee `IN_CANCEL` cùng luật); **fan-out 6 shop, 1 shop luôn timeout** (mock `delay_s_by_shop` > ngân sách) chạy 1 giờ đồng hồ giả: J-04 của 5 shop còn lại mỗi chu kỳ ≤ 5 phút, không task nào chờ slot quá 1 chu kỳ (NFR-39, DEC-503); tra song song (AC-43); BR-31 6 kịch bản (AC-42); L11/L13/L14/L15 (AC-56..59); API-150..153 với dữ liệu mẫu (AC-45..47); sao lưu với MinIO (J-20 lên + đọc lại, J-21/22 chỉ BR-33, J-22 lease (giết worker giữa chừng → `FAILED` sau ngân sách + 60 giây → tải lại), `SOURCE_DELETED` không tính chờ, API-188 hai hành động + audit, J-20 lượt treo → `FAILED` trước lượt mới, 2 lượt lỗi → `DB_FAILED_TWICE`, J-23 xóa chỉ clip retention, giữ ≥ 3 bản DB khi mọi bản > 30 ngày, J-23 bỏ qua khi schema lệch, mất mạng → chờ → tự tải — AC-49, 51); **`test_backup_key_rotation`** (đổi khóa → `old_keys` đúng số, API-187 xếp đúng tệp còn ở kho, sau J-22 `key_fingerprint` mới); link (tạo, W1, thu hồi xóa đối tượng ở bucket link, hết hạn đồng hồ giả, CSKH thu hồi link người khác 403 — AC-52, 53); thông báo server giả (5 luật BR-36, 24 giờ → bỏ, queue `notify` tuần tự — AC-54, 55); migration 0006/0007 lên / xuống / lên (§3) + **`test_downgrade_phase2_jobs`** (J-02, J-06 code Phase 2 trên DB đã lùi) | AC-40..59 |
| Bảo mật | **NFR-41 `test_backup_security_nfr41`**: tải 5 đối tượng bất kỳ từ bucket sao lưu MinIO → không giải mã / phát được không khóa (`ffprobe` lỗi, `pg_restore --list` lỗi); tìm chuỗi khóa (base64 + hex) trong dump DB giải mã, log test (caplog), metadata đối tượng = 0; khóa ứng dụng thử `DeleteObjectVersion` / `PutBucketVersioning` → `AccessDenied`. **NFR-42 `test_share_security_nfr42`**: token `share/` ≥ 256 bit (độ dài base64url 43, 1.000 token không trùng); đổi 1 ký tự token / chữ ký → 403 / 404; `ListObjects` bằng URL không ký / có ký `index.html` → từ chối; chỉ `https` ở production (`S3_PUBLIC_ENDPOINT` validator); thu hồi → GET trả `NoSuchKey` ≤ 60 giây (đồng hồ thật, MinIO); bucket link không có phiên bản sau thu hồi | NFR-41, NFR-42, AC-49, 53 |
| Contract | `tests/contract/spec.py` thêm 27 API HTTP mới + 26 mở rộng: path, method, mã lỗi, trường, enum (02 §6); runtime giờ `Z`; snapshot `openapi.json` | 02 §6 |
| QA live | `tests/qa/test_m11..m16_live.py` trên stack dev (MinIO 2 bucket, mock TikTok, notify mock) | theo lát 01 §13 |
| Diễn tập | `aicam backup-restore` (2 khóa: trước / sau đổi khóa) + `backup-verify` trên DB trống (AC-50); xóa 1 đối tượng clip trên MinIO trước khi khôi phục → `MISSING`, các đối tượng khác còn, J-23 không chạy (`RESTORE_PENDING`) | 100 % SHA-256 khớp (trừ `MISSING` đã ghi nhận); khóa sai → mã 2, DB không đổi |
| Hiệu năng | `tests/load/perf_reports.py` (180.000 kiện), locust quét mã lạ 4 shop mock (1 chậm 5 giây) | NFR-01, NFR-37 |

**Chưa test — thiếu tài nguyên** (để `04` ghi đúng, CO-07; chạy được bằng mock / MinIO thì vẫn test phần mock):

| Hạng mục | Thiếu gì | Phần mock thay thế | Khi có tài nguyên |
|---|---|---|---|
| TikTok Shop thật: ký, OAuth nhiều shop, trạng thái đơn / hủy / trả, hạn người bán, redirect `x.local` (RK-26) | Tài khoản đối tác (Q18, Q19) | Fixture định dạng TikTok qua `mapping.py` thật | T-3 TikTok trước go-live |
| Shopee thật nhiều shop; phản hồi `get_order_detail` với mã đơn lạ (DEC-509) | T-3 Shopee | Mock Shopee nhiều shop | T-3 Shopee |
| Kho lưu thật: presign 7 ngày, `text/html` inline, versioning + lifecycle + chính sách quyền, object lock (RK-27, RK-28) | Nhà cung cấp (Q20) | MinIO 2 bucket | Khi chốt Q20 |
| Telegram / Zalo OA thật, mạng kho có chặn không | Bot / OA (Q21) | Server giả + `notify:mock` | Khi có Q21 |
| NFR-44 băng thông thật (quét p95 khi tải 5 GB qua Internet kho) | Mạng kho | MinIO local + token bucket | Lắp tại kho |
| NFR-46 W1 trên điện thoại thật (Chrome Android, Safari iOS) | Thiết bị | Trình duyệt desktop giả lập | QA có thiết bị |
| NFR-40 RTO ≤ 60 phút trên **máy kho** | Máy kho | Máy dev / VM | Diễn tập go-live |
| NFR-37 trên máy kho (số đo máy dev ≠ máy kho) | Máy kho | Máy dev | Go-live |

## 12. Task

| # | Việc | FR / API | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| T-201 | Migration 0006 (bảng, cột, CHECK, backfill nhóm / shop / submitted_at, index báo cáo) + model + `alembic check`; đo trên 1 triệu đơn | §3; FR-05.21, 08.09, 09.04 | — | 2 |
| T-202 | Migration 0007 (unique theo shop) + downgrade 0006/0007 sang `phase3_archive` + nâng cấp lại + `SCHEMA_HEAD` 0007 + test migration | §3; BR-29; DEC-456, 475 | T-201 | 2 |
| T-203 | `base.py` nhóm trạng thái + `registry` + cờ; Shopee `mapping` trả nhóm; lõi đọc nhóm (`rules`, `returns`, `return_scan`, `orders.is_cancelled`, `sync` RETURNING, `sessions` platform); `test_no_platform_status_in_core` | FR-05.07, 05.21, NFR-28; BR-30 | T-201 | 2 |
| T-204 | Đa shop: `upsert_platform_order(…, shop)` (BR-29, nhận đơn file, EX-T2 `sync_warnings`, `package_order`); tra (shop, mã) ở J-04 / J-05 / J-06 (§5.1 #2, #6); bỏ ngắt shop khác (điểm tra theo mã còn lại → T-271) | FR-05.14, 05.22; BR-29 | T-202, T-203 | 2 |
| T-205 | Fan-out `dispatch.py` J-04/06/13; J-05 theo `lookup`; `grants.ensure_fresh` + J-12 theo grant (bỏ shop `DISCONNECTED`, chỉ khóa `grant:` — DEC-507); `budget.py`; test cô lập 3 shop (queue / worker → T-276) | FR-05.14; NFR-39; DEC-433, 434, 507 | T-204 | 2 |
| T-206 | `lookup.find_everywhere` (BR-32) + `AMBIGUOUS_SHOP`; nối vào PACK, RETURN (`return_scan.platform_find`), J-05; đo AC-43 | FR-05.19; API-11 | T-205 | 1,5 |
| T-207 | API-70 mở rộng, API-71 theo sàn, API-72 (không ngắt, `expired`), API-154, API-155, API-156, `RESULT_PATH`, audit, WS `shop.updated` + kênh `ws:admin` | FR-05.13, 05.20; API-70..73, 154, 155 | T-204 | 1,5 |
| T-208 | TikTok client (ký, thử lại, `Retry-After`, ngân sách, log, che log) + ủy quyền (token get / refresh, shop list) — test respx theo định dạng giả định | FR-05.08, 05.13 | T-203 | 2 |
| T-209 | TikTok adapter đơn / kiện / vận chuyển / yêu cầu hủy / tra khi quét + `mapping.py` (§5.3) + EX-T5 + kiện gộp | FR-05.15..05.17, 05.22; AS-12, 13 | T-208 | 2 |
| T-210 | TikTok yêu cầu trả + `returns_mapping` (BR-31) + nhóm yêu cầu trả 5 giá trị trong `returns` (thay `OPEN`, `AWAITING_ACCEPT_STATUSES`) | FR-05.18; BR-31 | T-209 | 2 |
| T-211 | Mock TikTok 2 shop + fixture (9 trạng thái, kiện gộp, kho TikTok, 6 kịch bản trả) + mock Shopee nhiều shop; `seed_phase3.py` | §7.2; AC-40..44 | T-209, T-210 | 1,5 |
| T-212 | Station: API-10 sàn / shop / `merged_orders` / `operator_required`; API-11 `OPERATOR_REQUIRED` ở PACK, `ORDER_CANCEL_REQUESTED`, chép `operator_name`; API-80 `packer_name_required` | FR-03.03, 03.16, 05.17, 05.22 | T-203, **T-204** (shop của đơn, `package_order`) | 1,5 |
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
| T-223 | `aicam backup-restore` (DB) + `backup-verify` + ops §6.2 runbook (giữ khóa) + diễn tập trên DB trống (AC-50) — phần duyệt cloud / nhiều khóa / `MISSING` ở T-274 | FR-02.16; NFR-40 | T-221 | 2 |
| T-224 | `shares`: model, API-160..164 (BR-35, quyền thu hồi), audit `SHARE_*`, API-31/132 `shares[]` | FR-07.05, 07.08, 07.09 | T-218 | 2 |
| T-225 | J-24 dựng + tải (bucket link) + W1 template (CSP + referrer — DEC-506) + URL ký + Fernet; J-25 thu hồi / hết hạn / treo (xóa mọi phiên bản nếu bucket có versioning); WS `share.updated` | FR-07.05, 07.07, 07.08; NFR-42, 46 | T-224 | 2 |
| T-226 | `notify`: model, API-170..176, provider Telegram / Zalo / mock, gửi thử, `notify_provider_token` | FR-06.04, 06.07, 06.10 | T-201 | 2 |
| T-227 | J-26 điều kiện N01..N09 + J-27 BR-36 (gom, trần, giờ yên lặng, thử lại / bỏ) + J-28 N10 + dọn 30 ngày | FR-06.07..06.11; NFR-43 | T-226, T-215, T-222 | 2 |
| T-228 | Quyền API-04, action API-92, che log; contract test spec + snapshot OpenAPI cho mọi API Phase 3 | FR-10.02, 10.03 | T-207, T-215..T-227 | 1,5 |
| T-229 | QA live M11..M16 (stack dev: MinIO, mock TikTok, notify mock) + `seed-demo` Phase 3 | AC-40..62 | T-211..T-228 | 2 |
| T-230 | Nâng cấp / lùi thử trên bản sao DB Phase 2 (có đơn TikTok mock + 2 shop Shopee: lùi không cờ → từ chối; có cờ → chạy image Phase 2, J-06 mock không nhận mã đơn TikTok — DEC-509) + ops §7.2 (dừng `api vision worker worker-sync worker-sync-long worker-export worker-backup worker-notify beat`) + `.env.production.example` + compose production (`worker-backup`, `worker-notify`, `worker-sync-long`) + sự cố mới §10 | §3, 02 §10 | T-202, T-220, T-275, T-276 | 1,5 |
| T-271 | Bảng §5.1: tra theo mã ở `returns` (`attach_or_create`, `upsert_from_platform`, `resolve_code` → `MULTIPLE_ORDERS`), `imports` (`orders_by_sn` chỉ `shop_id IS NULL`, `SKIP` theo mã vận đơn, `apply_csv_order`), J-13 `_sync_one_return`, `packages_by_code`, API-104 `platform` / `shop_name`, API-11 ALERT `RETURN_MULTIPLE_ORDERS`, seed / mock theo shop; `test_code_lookup_two_shops` (mỗi dòng §5.1) | BR-29, EX-R20; API-11, 104 | T-204, T-210 | 2 |
| T-272 | Đổi khóa: `key_fingerprint` ở `backup_object` / `backup_run`; API-180 `key.old_keys[]`; API-187 + audit; `decrypt_stream` nhiều khóa; `BACKUP_OLD_KEYS`; `test_backup_key_rotation` | FR-02.17, EX-K7; DEC-495 | T-221, T-222 | 1,5 |
| T-273 | Cứng hóa J-20 / J-22 / J-23: J-22 lease + `updated_at`, `SOURCE_DELETED` cuối, `hash_override`; API-188 + API-185 mở rộng + audit; J-20 `fail_stale_runs` + `DB_FAILED_TWICE` (API-32, N08, API-180 `consecutive_failures`); J-23 chỉ retention, ≥ 3 bản DB, schema guard | FR-02.14, 02.15, EX-K6; DEC-496, 500, 505 | T-221, T-222 | 2 |
| T-274 | Khôi phục: duyệt `backup/evidence/` theo metadata, tải đối tượng ngoài DB, `MISSING` (CHECK `clip.status`), `backup_restore_pending` / `RESTORE_PENDING` + API-181 409 + `backup-verify` xóa cờ + audit; runbook danh sách bí mật (02 API-186); diễn tập 2 khóa + 1 đối tượng bị xóa | FR-02.16, EX-K8; DEC-499 | T-223, T-272 | 1,5 |
| T-275 | Migration 0006 v0.2: backfill 4b phiên trước (BR-39 v0.3) + `claim_evidence.backfilled`; downgrade bước 1b / 4 (đơn ngoài, `detached_packages`), bước 5–6 (hồ sơ `LEGACY_HOLD` `CLOSED`, kiểm tập con `raise`), bước 7 (`MISSING`); nâng cấp lại xử lý trùng (hồ sơ, phiên / ảnh), `backfill_prior_pairs`; test §3 | §3; DEC-497, 498, 509 | T-202, T-213, T-214 | 2 |
| T-276 | Hạ tầng queue + bucket: route `sync_fast` / `sync` / `notify`, `worker-sync-long`, `worker-notify`, prefetch 1 / `acks_late`; `S3_SHARE_BUCKET` + validator; `minio-init` 2 bucket + versioning + lifecycle + user policy; `docs/s3-policy.example.json`; test 6 shop 1 shop luôn timeout (NFR-39) | NFR-39, NFR-43; DEC-501, 503, 504 | T-205, T-218, T-227 | 1,5 |
| T-277 | TikTok yêu cầu hủy: `cancellations/search` → luôn `orders?ids=` → nhóm từ (trạng thái đơn, yêu cầu hủy mới nhất); fixture `pending` / `rejected` / `withdrawn` / `approved`; unit mapping | FR-05.17; DEC-502 | T-209, T-211 | 1 |
| T-278 | Helper `orders.set_platform_status` / `returns.set_platform_status` thay 3 chỗ ghi; BR-21 làm rõ (`CANCEL_REQUESTED` không gọi `apply_platform_cancel`, cờ phiên `ORDER_CANCEL_REQUESTED` qua `flag_order_cancelled(kind)`, Shopee `IN_CANCEL`); NFR-28 danh sách đủ + test AST; `test_cancel_requested_br21` | FR-05.17, 05.21, NFR-28; BR-21; DEC-494, 508 | T-203, T-212 | 1,5 |
| T-279 | BR-39 v0.3: `EXCLUDED_CANCEL_REASONS`, `auto_evidence`, `primary_session` (API-132 / J-16 / J-24), `excluded_return_sessions`, `session.cancel_reason`; `dropped_return_filter` cho API-32 / API-30 `return_dropped` / J-26 N03; `test_evidence_prior_br39` 7 kịch bản | FR-08.07, 09.01; BR-39; DEC-491 | T-213, T-215 | 1 |
| T-280 | Test bảo mật NFR-41 (`test_backup_security_nfr41`), NFR-42 (`test_share_security_nfr42`) trên MinIO; schema guard J-23; cập nhật danh sách "chưa test — thiếu tài nguyên" (§11) cho `04` | NFR-41, NFR-42 | T-221, T-225, T-276 | 1 |

Tổng ≈ 69 ngày công (54 + 15 bổ sung v0.2). Đường găng: T-201 → T-203 → T-204 → T-205 → T-206 (đa shop) → T-271 song song T-218 → T-220 → T-221 → T-273 → T-224 → T-225 (cloud); T-213..T-215 → T-279 làm sớm (lát 1 hardening — 01 §13); T-275 sau T-213, T-214, trước T-230.

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
| RB-37 | Backfill 4b thêm nhiều phiên trước vào hồ sơ mở → J-21 xếp thêm bằng chứng tải lên ngay sau nâng cấp | Hàng chờ sao lưu dồn | Log số dòng ở 0006; token bucket giới hạn; đo trên bản sao DB (T-230) | T-275 |
| RB-38 | Lùi 0006 với `AICAM_DOWNGRADE_DETACH_FOREIGN_ORDERS=1`: kiện TikTok / shop bị ngắt mất đơn trên UI Phase 2 (không thấy sản phẩm khi quét) | Đóng gói kiện TikTok còn lại phải dựa vào phiếu | Ghi ops §7.2: lùi là đường cuối, kiện TikTok chưa đóng xử lý tay; nâng cấp lại gắn lại | T-230 |
| RB-39 | Nhà cung cấp kho lưu không hỗ trợ versioning / chính sách quyền theo khóa | Bản sao xóa được bằng khóa ứng dụng (RK-28) | Q20 kiểm; chấp nhận có ghi nhận nếu không có lựa chọn | Go-live |

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
| DEC-475 | Downgrade 0006 / 0007 | Như §3: 0007 từ chối khi có trùng; 0006 chép `phase3_archive`, link sống → từ chối trừ `AICAM_DOWNGRADE_ALLOW_ACTIVE_SHARES=1`; (v0.2: bằng chứng đã bỏ → DEC-497 thay `held`; đơn ngoài → DEC-509) | Bài học DEC-331, 336, 338 | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-476 | CSV báo cáo | Sinh trong bộ nhớ (≤ vài MB) rồi trả `StreamingResponse`; dấu phẩy, UTF-8 BOM, tỷ lệ dạng chuỗi `4,0%` | Excel VN mở đúng; dữ liệu nhỏ | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-477 | Ngân sách thời gian dùng chung | `platforms/budget.py` (từ `shopee/client.py:58`) cho Shopee + TikTok; Celery `soft_time_limit` = ngân sách + 30 giây | Một cơ chế; task không treo slot | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-478 | Sự kiện WS chỉ cho ADMIN | Kênh Redis `ws:admin` (như `ws:approvals`), hub đăng ký theo vai | Không lộ trạng thái sao lưu / shop cho vai khác | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-497 | Lùi 0006 với bằng chứng đã bỏ còn hạn: v0.1 đặt `held` — chỉ bảo vệ clip, **không** bảo vệ ảnh, và giữ mãi tới khi có người bỏ cờ | Mỗi kiện một hồ sơ hệ thống `LEGACY_HOLD` `CLOSED`, `closed_at` = mốc bỏ → luật Phase 2 (`closed_at ≥ now − số ngày giữ`) giữ cả clip lẫn ảnh đúng hạn BR-38 rồi tự hết; kiểm tập con trước ⊆ sau (`raise`); nâng cấp lại chèn lại dòng đã bỏ, gặp (hồ sơ, phiên / ảnh) đã có thì giữ dòng hiện có, xóa hồ sơ hệ thống chưa bị đổi | Không mất bằng chứng khi lùi, không giữ thừa, dùng đúng cơ chế 0004 đã kiểm. Loại: `held` (DEC-475 v0.1); hồ sơ `NEW` (giữ mãi, hiện "cần xử lý" sai) | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-498 | Hồ sơ khiếu nại mở từ Phase 2 thiếu phiên mở hoàn trước (BR-39 chỉ áp lúc tạo) | Backfill trong 0006 (bước 4b) theo BR-39 v0.3, `auto = true`, `backfilled = true`, `ON CONFLICT DO NOTHING`, log; lùi giữ dòng (bằng chứng hợp lệ ở Phase 2); nâng cấp lại không thêm lại cặp người dùng đã bỏ | Hồ sơ đang tranh chấp hưởng L11 ngay. Loại: không backfill (hồ sơ cũ thiếu video mở hộp đầu); job nền sau nâng cấp (lệch giữa lúc nâng cấp và lúc chạy) | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-502 | TikTok: v0.1 chỉ đặt `CANCEL_REQUESTED` khi đơn có yêu cầu `PENDING` **và** `orders/search` trả đơn đó; từ chối / rút yêu cầu có thể không đổi `update_time` đơn → kẹt nhóm cũ | Mọi đơn trong `cancellations/search` luôn lấy chi tiết theo id; nhóm = f(trạng thái đơn, yêu cầu hủy mới nhất); fixture từ chối / rút / chấp nhận | Không kẹt "Đang yêu cầu hủy" sau khi người bán từ chối. Loại: suy từ danh sách `PENDING` hiện tại (không thấy lúc yêu cầu rời `PENDING`) | khanhtt (BE, tự quyết theo ủy quyền user) |
| DEC-508 | Chữ trạng thái + nhóm ghi ở 3 chỗ (`orders/service.py:255`, `platforms/sync.py:441`, `returns/service.py:329`) — dễ lệch nhau | Một helper mỗi bảng (`orders.set_platform_status`, `returns.set_platform_status`) tính nhóm qua adapter mapping, so nhóm cũ / mới để quyết BR-21; test AST cấm gán trực tiếp | Một nơi quyết luật hủy theo nhóm. Loại: trigger DB (luật nghiệp vụ trong SQL, khó test) | khanhtt (BE, tự quyết theo ủy quyền user) |

## Sửa theo review G2 lượt 1 (v0.2)

| Finding | Sửa ở (02a) |
|---|---|
| G2-1 CRITICAL BR-39 | §2 claims, §4 API-30 / 132, §5 BR-39, §7 J-26 N03, T-279 |
| G2-2 tra theo mã | §2 orders / returns / sessions, §4 API-11 / 104, §5.1 (bảng 21 điểm + test), §11, T-204, T-271 |
| G2-3 yêu cầu hủy | §5 BR-01, BR-21, §7 J-06, T-278 |
| G2-4 đổi khóa | §3 `key_fingerprint`, §4 API-182 / 187, §7.3, §9 `BACKUP_OLD_KEYS`, T-272 |
| G2-5 lease / `SOURCE_DELETED` / lệch băm | §3, §4 API-185 / 188, §6, §7 J-22 / J-23, T-273 |
| G2-6 downgrade bằng chứng đã bỏ | §3 Downgrade bước 5–6 + nâng cấp lại, DEC-497, T-275 |
| G2-7 backfill phiên trước | §3 bước 4b, DEC-498, T-275 |
| G2-8 khôi phục | §3 `clip.status`, `backup_restore_pending`, §4 API-181, §7 J-23, T-274 |
| G2-9 J-20 treo / 2 lượt | §4 API-184, §6, §7 J-20, T-273 |
| G2-10 versioning / khóa | §7.3 hai bucket, §7.2 MinIO, §9, T-276 (ADR-010, DEC-501) |
| G2-11 TikTok hủy | §7.1, §7.2, DEC-502, T-277 |
| G2-12, 13 queue | §2 workers / docker, §7 route, §9, T-276 (DEC-503, 504) |
| G2-14 ≥ 3 bản DB | §7 J-23 |
| G2-15 W1 CSP / `share/` | §7.4, T-225 (DEC-506) |
| G2-16 thứ tự khóa / J-12 | §6, §7 J-12, T-205 (DEC-507) |
| G2-17 helper + NFR-28 | §2, §5 BR-30, DEC-508, T-278 |
| G2-18 test NFR-41 / 42, schema guard, chưa test | §11, T-280 |
| G2-19 | §12 T-212 phụ thuộc T-204 |
| G2-20 runbook | §2 docs, T-230 |
| Cần xác minh (lùi 0006 + đơn TikTok) | §3 Downgrade bước 1b / 4, T-230, T-275 (DEC-509 ở 02) |
