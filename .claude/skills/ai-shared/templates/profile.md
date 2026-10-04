# Project profile

> Adapter giữa bộ skill `ai-*` và dự án này. Skill đọc file này thay vì đoán.
> Last update: <YYYY-MM-DD> · <role>

## 1. Tổng quan
| Trường | Giá trị |
|---|---|
| Tên dự án | |
| Loại | web-app · mobile · api/service · cli · library · data/ml · infra · monorepo (nhiều loại) |
| Mô tả 1 câu | |
| Có UI người dùng | yes / no |
| Quy mô | S / M / L |
| Ngôn ngữ tài liệu | vi / en |
| `docs_root` | docs/ai |

## 2. Thành phần (component)
| Component | Loại `be`/`fe` | Path | Ngôn ngữ / framework | build | lint | test | run (local) |
|---|:---:|---|---|---|---|---|---|
| | | | | | | | |

> Lệnh phải chạy được từ root repo. Không có → ghi `—`. Repo đang đỏ sẵn → ghi ở §8.

## 3. Nguồn sự thật của hệ thống hiện tại
| Loại | Ở đâu (file / lệnh / URL) |
|---|---|
| Schema dữ liệu | (vd: migrations/, prisma/schema.prisma, models/) |
| Interface / API | (vd: openapi.yaml, routes/, proto/) |
| Màn hình / route UI | (vd: src/routes, app/router.dart) |
| Cấu hình / env | (vd: .env.example) |
| Tài liệu sẵn có | (vd: README, docs/) |

## 4. Quy trình mã nguồn
| Trường | Giá trị |
|---|---|
| VCS host | github / gitlab / bitbucket / none |
| Nhánh gốc | main |
| Mẫu nhánh | feat/<NN>-<slug> · fix/<NN>-<slug> · proto/<NN>-<slug> |
| Đích PR | main |
| Quy ước commit | (vd: conventional commits) |
| CI | (vd: .github/workflows/ci.yml) |
| Agent được commit? | chỉ khi user yêu cầu (mặc định) |

## 5. Tracker
| Trường | Giá trị |
|---|---|
| Loại | none (chỉ 03-plan.md) / github / gitlab / jira / linear |
| Project / board | |
| Cách tạo ticket | (CLI / MCP / thủ công) |

## 6. Môi trường & release
| Môi trường | URL / đích | Cách deploy | Ai được deploy | Rollback |
|---|---|---|---|---|
| local | | | | |
| staging | | | | |
| production | | | | |

## 7. Vai trò
| Vai | Người |
|---|---|
| PO | |
| UX | |
| Architect | |
| Tech lead (review, G2/G3) | |
| PM | |
| Dev BE | |
| Dev FE | |
| QA | |
| Ops | |

## 8. Definition of Done (bổ sung cho dự án)
- [ ] build + lint + test pass (hoặc không thêm lỗi so với baseline)
- [ ] test mới cho hành vi mới
- [ ] `system-map.md` cập nhật nếu đổi data/API/màn
- [ ] 

## 9. Ràng buộc & lưu ý riêng
- (vd: không sửa thư mục vendor/, mọi query phải scoped theo tenant, …)
