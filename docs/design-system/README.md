# Hệ thống X — Design system

Hệ thống thiết kế của Hệ thống X: màn hình station tại bàn đóng gói (kiosk) và dashboard quản lý (tra cứu đơn, xem clip, cấu hình camera). Nền tảng là Material Design 3, điều chỉnh cho thao tác kho: dữ liệu dày, nhiều trạng thái, phản hồi tức thì khi quét mã.

Sao từ design system LiveAI ngày 2026-10-04 và điều chỉnh cho Hệ thống X. Thư mục `components/` là **bản tham chiếu** từ LiveAI (`window.LiveAI`, `bundle.js`) để xem trước; không import trực tiếp vào code.

Nguồn sự thật khi đã dựng repo `ai-cam-fe` (dự kiến):
- Token màu: `src/design/tokens.css`, sinh từ `tokens.json` (seed `#4F46E5`). Không sửa tay.
- Thang chữ, hình khối, độ nổi và các class dùng chung: `src/design/system.css`.
- Component React: `src/shared/ui/` (viết lại theo API của `components/index.d.ts`).
- Stack: Tailwind CSS + React; không dùng thư viện UI khác (ADR-006).

## Nguyên tắc

1. **Dữ liệu trước, trang trí sau.** Người dùng vào dashboard để kiểm tra trạng thái và làm việc tiếp. Mỗi màn hình trả lời ngay câu "cái gì cần tôi xử lý?" bằng chip trạng thái và Alert, không dùng hình minh hoạ.
2. **Một hành động chính.** Mỗi vùng có tối đa một nút `filled` (màu `primary`). Các hành động còn lại dùng `tonal`, `outlined` hoặc `text`.
3. **Màu mang nghĩa, không trang trí.** `success`, `warning`, `error`, `live`, `price` chỉ dùng đúng nghĩa của chúng. Không dùng màu đỏ để làm đẹp.
4. **Dashboard chạy tốt từ 360px.** Mọi màn dashboard phải dùng được trên điện thoại: bảng chuyển thành thẻ, hoặc cuộn ngang trong card của nó. Trang không bao giờ cuộn ngang.
5. **Station đọc được từ 1,5 m, không cần chuột.** Xem mục Station kiosk.

## Giọng văn

- Tiếng Việt có dấu, câu ngắn, xưng hô trung tính và không dùng "bạn ơi". Ví dụ: "Chưa có station nào", "Thêm station đầu tiên".
- Nhãn nút là động từ và đặt tên chính hành động: "Đồng bộ ngay", "Xuất clip", "Giữ clip". Tránh "OK", "Xác nhận".
- Thông báo lỗi nêu chuyện gì đã xảy ra và cần làm gì tiếp. Ví dụ: "Không kết nối được Cam 2 của Station 01. Kiểm tra dây mạng rồi bấm Thử lại."
- Thuật ngữ Shopee giữ nguyên (shop, Seller Center). Thuật ngữ nghiệp vụ dùng đúng tên trong SRS: "mã vận đơn", "phiên đóng gói", "station", "clip". Trạng thái hiển thị bằng tiếng Việt ("Đã đóng gói", "Lệch mã"), không hiện mã kỹ thuật (`PACKED`, `MISMATCH`).
- Số dùng định dạng vi-VN: `1.250.000₫`, `04/10/2026 14:27`. Thời lượng viết `mm:ss`. Mã vận đơn, mã đơn sàn, SHA-256 dùng font mono và luôn có nút "Copy" kèm theo.
- Không dùng emoji trong giao diện.

## Màu

Bảng màu sinh theo thuật toán M3 (scheme *fidelity*) từ seed indigo `#4F46E5`, nên tông chủ đạo là indigo đậm `primary` `#3525cd` ở light và `#c3c0ff` ở dark. Có 2 theme `light` và `dark`. Mặc định là `light` cho mọi người dùng, không theo chế độ sáng/tối của máy. Người dùng chuyển sang `dark` bằng nút mặt trăng trên top app bar; lựa chọn được lưu trong trình duyệt (`localStorage` key `aicam-theme`) và áp dụng qua `data-theme` trên `<html>` trước khi trang vẽ (`src/lib/theme.ts`). Màn station luôn dùng `light`.

| Vai trò | Token | Dùng cho |
|---|---|---|
| Nền | `surface`, `surface-container-lowest` (card), `surface-container-high` (dialog) | Bậc nền thay cho bóng: càng nổi thì container càng "high". |
| Chữ | `on-surface`, `on-surface-variant` | Chữ chính và chữ phụ. Không dùng xám tự chế. |
| Hành động | `primary`, `secondary-container` | Nút filled; nút tonal và mục đang chọn. |
| Đường | `outline` (control), `outline-variant` (chia) | Viền ô nhập phải dùng `outline` để đạt 3:1. |
| Trạng thái | `success`, `warning`, `error` + `-container` | Chip, Alert, chữ trạng thái. |
| Ghi hình | `live` | Chỉ cho chỉ báo ĐANG GHI HÌNH (REC). `price` giữ trong token nhưng chưa dùng. |

Quy tắc:
- Chữ đặt trên một màu `X` luôn dùng `on-X`. Mọi cặp `on-X/X` đạt ≥ 4.5:1 ở cả hai theme. `outline` trên `surface` đạt 4.3:1 ở light, đủ ngưỡng 3:1 cho viền control.
- `live` (`#bf002e`) và `error` (`#ba1a1a`) gần nhau về tông. Vì vậy `live` luôn đi kèm chữ "REC" hoặc icon `fiber_manual_record`, còn lỗi luôn đi kèm icon `error`. Không bao giờ phân biệt hai trạng thái chỉ bằng màu.
- Trong Tailwind, màu là class `bg-<role>`, `text-<role>`, `border-<role>`. Trong CSS là `var(--md-sys-color-<role>)`.

## Chữ

- **Be Vietnam Pro** (Google Fonts, 400–700) cho toàn bộ giao diện. Font này được thiết kế cho tiếng Việt nên dấu chồng (ặ, ỗ, ữ) không bị cắt dòng.
- **JetBrains Mono** cho mã vận đơn, mã đơn sàn, SHA-256, tên file và JSON.
- Thang chữ M3 dùng qua class `text-<style>`, ví dụ `text-headline-sm`, `text-body-md`, `text-label-lg`. Không dùng `text-sm`/`text-lg` của Tailwind.
  - Tiêu đề trang: `headline-sm`. Tiêu đề card: `title-md`. Chữ mặc định: `body-md`. Nút: `label-lg`. Chip: `label-md`.
- Ô nhập dùng `body-lg` (16px) để Safari iOS không tự zoom khi focus.
- Số trong bảng và bộ đếm dùng `tabular-nums`.

## Khoảng cách và bố cục

- Lưới bước 4px: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-6` 24, `space-8` 32.
- Khung app:
  - Top app bar cao 64px, màu `surface`, có `border-b outline-variant`.
  - Navigation drawer chuẩn rộng 256px từ `lg` (1024px) trở lên. Dưới mức đó là drawer modal, mở bằng nút "Mở menu".
- Nội dung:
  - Rộng tối đa 1280px (`max-w-7xl`).
  - Gutter 16px trên mobile, 24px từ `sm`, 32px từ `lg`.
- Breakpoint của Tailwind: `sm` 640, `md` 768, `lg` 1024.
  - Danh sách đơn / phiên chuyển từ thẻ sang bảng ở `md`.
  - Lưới 2 cột mở ra ở `lg`.
- Bảng luôn nằm trong `div.overflow-x-auto`. Lưới có bảng con thì dùng `*:min-w-0` để cột không bị nội dung đẩy rộng ra.

## Hình khối, độ nổi, chuyển động

- Hình khối theo M3:
  - `radius-sm` 8px: ô nhập, chip.
  - `radius-md` 12px: card, bảng, Alert.
  - `radius-xl` 28px: dialog.
  - `radius-full`: nút, icon button, segmented buttons, pill của drawer.
- Độ nổi chủ yếu thể hiện bằng bậc màu `surface-container-*`.
  - Bóng `elevation-1` chỉ dùng cho hover của nút filled/tonal, AuthCard và thanh chọn hàng loạt.
  - `elevation-3` dùng cho dialog.
  - Card thường không có bóng, chỉ có viền `outline-variant`.
- **State layer** (`.state-layer`): lớp phủ cùng màu chữ.
  - Mức phủ: hover 8%, focus và pressed 10%.
  - Mọi phần tử bấm được (nút, link dạng nút, tab, hàng menu) đều phải có lớp này.
- **Focus**: viền 3px màu `secondary`, lệch 2px (`:focus-visible`). Không tắt outline.
- **Chuyển động**: 150ms với easing `ease-standard` `cubic-bezier(0.2, 0, 0, 1)`. Tôn trọng `prefers-reduced-motion`.
- **Disabled**: độ mờ 38%, không có state layer.

## Icon

- **Material Symbols Rounded** (Google Fonts, variable). Mặc định FILL 0, wght 400, cỡ 20px.
  - Dùng qua component `Icon name="…"` hoặc `<span class="icon">tên_icon</span>`.
- Icon mang trạng thái dùng bản `filled`. Ví dụ: `check_circle` cho Sẵn sàng, `error` cho Lỗi.
- Icon trong nút 18px, trong icon button 22px, trong chip 14px.
- Icon chỉ để minh hoạ thì có `aria-hidden`. Icon button bắt buộc có `label`, dùng làm `aria-label` và tooltip.
- Bộ icon đang dùng:
  - Menu: `dashboard` (Tổng quan), `manage_search` (Tra cứu đơn), `upload_file` (Nhập đơn), `videocam` (Live view), `point_of_sale` (Station), `storefront` (Kết nối Shopee), `settings`, `admin_panel_settings` (Người dùng, audit log).
  - Hành động: `add`, `download`, `delete`, `content_copy`, `open_in_new`, `autorenew`, `bookmark` (Giữ clip), `play_arrow`, `qr_code_scanner`.
  - Trạng thái: `check_circle` (Đã đóng gói, online), `schedule`, `error`, `warning`, `verified` (Cam 2 khớp mã), `fiber_manual_record` (REC), `videocam_off` (camera mất tín hiệu), `cloud_off` (mất kết nối sàn).
- Logo là ô vuông `radius-md` màu `primary` chứa icon `videocam`, đặt cạnh chữ "Hệ thống X" `title-lg`. Tên chính thức chưa chốt, chưa có file logo riêng.

## Component

| Component | Dùng khi |
|---|---|
| `Button` | Hành động. Có các biến thể `filled` (chính), `tonal`, `outlined`, `text`, `elevated`, `danger` (xác nhận xoá), `outlined-danger`, `text-danger`. |
| `IconButton` | Hành động lặp lại trên từng dòng (tải về, xoá, mở). Bắt buộc có `label`. |
| `TextField`, `SelectField`, `TextAreaField` | Form. Viền outlined, nhãn nằm trên viền, lỗi và hint đặt dưới ô. |
| `StatusChip` | Trạng thái chỉ để đọc (kiện, phiên, camera, clip). Có các tone `neutral`, `primary`, `success`, `warning`, `error`, `live`, `info`. |
| `Alert` | Thông báo trong trang hoặc form, có thể kèm một `action`. |
| `Tabs` | Chuyển giữa các khung nội dung của cùng một đối tượng. |
| `SegmentedButtons` | Chọn 1 trong 2–5 chế độ xem. |
| `LinearProgress` | Tiến độ có phần trăm (nhập CSV, xuất clip, dung lượng ổ). |
| `PageHeader` | Đầu mỗi trang: tiêu đề, mô tả, hành động chính. |
| `EmptyState` | Danh sách rỗng hoặc không có kết quả, kèm đúng một hành động để sửa. |
| `Dialog` | Xác nhận hoặc form ngắn. Nút "Đóng" ở trái, hành động chính ở phải. |
| `Pagination` | Cuối mọi bảng có phân trang. |

Class CSS dùng chung:
- `.card` và `.card-filled`: khung chứa.
- `.md-input` và `.md-input-sm`: ô lọc trong toolbar.
- `.md-table`: bảng.
- `.md-link`: link trong đoạn văn.
- `.md-field` và `.md-field-label`: tự dựng field có nhãn trên viền.

Mỗi surface khai báo `--md-field-bg` để nhãn cắt được viền đúng màu nền.

## Mẫu màn hình dashboard

- **Danh sách**:
  - Thanh lọc nằm trong card: select `md-input-sm`, ô tìm kiếm, `SegmentedButtons` chọn chế độ xem.
  - Khi chọn nhiều dòng, thanh hành động hàng loạt màu `secondary-container` dính dưới app bar.
  - Trên mobile mỗi dòng là một card: tiêu đề `title-sm`, hàng chip, metadata `body-sm`, hàng icon button.
- **Chi tiết**:
  - Hàng tiêu đề gồm tên, các chip và các hành động. Hành động xuống dòng đầy đủ bề rộng khi màn hình dưới `lg`.
  - Thông tin dạng `dl`: hai cột từ `sm`, xếp dọc trên mobile.
- **Trạng thái clip**: chip `warning` có icon `autorenew` khi đang cắt, `success` khi sẵn sàng, `error` khi lỗi, kèm chip `warning` "Thiếu video" khi có cờ `video_incomplete`.
- **Trạng thái kiện** (chip): Mới `neutral` · Đang đóng gói `primary` · Đã đóng gói `success` · Lệch mã `error` · Đã bàn giao `info` · Đã hủy `neutral` · Hủy sau khi đóng `warning`.
- **Trình phát clip**: video 16:9 trong card, dưới là hàng Tabs "Cam 1 / Cam 2 / Ghép", rồi `dl` thông tin phiên (station, giờ mở, giờ đóng, SHA-256 mono + Copy) và một nút filled "Xuất clip".
- **Ô camera (live view)**: tỉ lệ 16:9, góc trên trái tên camera `label-lg`, góc trên phải chip `live` "REC" hoặc chip `error` "Mất tín hiệu" kèm icon `videocam_off`.

## Station kiosk

Màn station chạy toàn màn hình (Chromium kiosk, 1920×1080 hoặc 1366×768), người dùng đứng cách 1–1,5 m, tay bận đóng gói. Mọi thao tác chính bằng máy quét. Quy tắc riêng, ưu tiên hơn các mục trên khi xung đột:

| Chủ đề | Quy tắc |
|---|---|
| Bố cục | Không có app bar / drawer. Thanh trạng thái trên cùng cao 56px: tên station, chip Cam 1 / Cam 2 / Mạng, đồng hồ. Phần còn lại là một vùng nội dung theo trạng thái |
| Nền theo trạng thái | Toàn vùng nội dung đổi nền bằng vai trò màu `-container`: Sẵn sàng `success-container` · Đang đóng gói `primary-container` · Cảnh báo `warning-container` · Lệch mã / lỗi `error-container`. Chữ dùng `on-…-container` tương ứng. Luôn kèm icon + chữ trạng thái, không chỉ dựa vào màu |
| Cỡ chữ | Mã vận đơn: `display-md` mono. Tiêu đề trạng thái ("ĐANG ĐÓNG GÓI"): `headline-lg`. Danh sách sản phẩm: `title-lg`. Không dùng chữ nhỏ hơn `body-lg` |
| Nút | Chỉ nút phụ (Hủy phiên, Gọi quản lý), cao ≥ 56px, `label-lg`, cách nhau ≥ 24px. Không có nút filled cho hành động chính: hành động chính là quét mã |
| Âm thanh | 3 âm: thành công (1 bíp ngắn), cảnh báo (2 bíp), lỗi (âm dài 1 giây, lặp tới khi xử lý). Mỗi âm gắn với một màu nền ở trên |
| Ảnh sản phẩm | Ô vuông 64px `radius-sm`; không có ảnh thì icon `inventory_2` trên `surface-container-high` |
| Chuyển trạng thái | Đổi nền tức thì (không animation) để phản hồi trong ≤ 1 giây đúng như NFR-01 |
| Theme | Luôn `light`; không có nút đổi theme |

## Không làm

- Không dùng gradient xanh–tím, card viền trái màu hay emoji.
- Không dùng trực tiếp palette Tailwind (`slate-*`, `indigo-*`, `red-*`). Chỉ dùng vai trò màu.
- Không đặt nhãn ô nhập làm placeholder: nhãn phải luôn nhìn thấy.
- Không để bảng tràn ra ngoài card, và không để trang cuộn ngang ở 360px.
- Không đặt mã kỹ thuật (`PACKED`, `MISMATCH`) lên giao diện người dùng.
