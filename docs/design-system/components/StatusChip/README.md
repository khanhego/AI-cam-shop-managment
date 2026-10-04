# StatusChip

Chip trạng thái chỉ để đọc, cao 24px, bo `radius-sm`. Có thể kèm icon 14px.

**Tone**
- `success`: Sẵn sàng, Đã kết nối, Đang hoạt động.
- `warning`: đang xử lý, sắp hết hạn, cần xem lại.
- `error`: Lỗi, Hết hạn, Cần kết nối lại.
- `primary`: Đã rà soát, gói đang chọn.
- `info`: thông tin trung tính có nhấn.
- `neutral`: chưa bắt đầu.
- `live`: chỉ dùng khi phiên đang phát, luôn kèm chữ "LIVE" và icon `sensors`.

**Props**: `tone`, `icon`, `title` (tooltip giải thích), `children`.

Không dùng chip làm nút. Để lọc, dùng filter chip (nút có `aria-pressed`, viền `outline`, chọn thì nền `secondary-container` và có icon `check`).
