# Button

Nút bấm M3 bo tròn hoàn toàn, có lớp trạng thái (state layer).

**Khi dùng**
- `filled`: hành động chính của vùng, tối đa 1 nút. Ví dụ "Tạo video", "Lưu".
- `tonal`: hành động phụ nhưng quan trọng, ví dụ "Xoá bộ lọc".
- `outlined`: hành động phụ ngang hàng, ví dụ "Tải về", "Sinh câu hỏi mẫu".
- `text`: hành động nhẹ trong dialog, toolbar hoặc thanh chọn, ví dụ "Đóng", "Tìm".
- `elevated`: nút cần nổi trên nền có hình.
- `danger`: chỉ dùng cho nút xác nhận trong dialog xoá hoặc huỷ.
- `outlined-danger` và `text-danger`: mở luồng xoá từ trang hoặc từ thanh chọn.

**Props**
- `variant`
- `size`: `md` cao 40px, `sm` cao 32px
- `icon` (icon đầu), `trailingIcon`
- `fullWidth`: dùng trong form trên mobile
- Mọi thuộc tính của `<button>`. `type` mặc định là `"button"`.

**Phần người dùng tự lo**: nhãn là động từ ngắn. Khi đang chạy mutation, set `disabled` để chặn bấm đúp.

**Token**:
- Màu: `primary`, `on-primary`, `secondary-container`, `outline`, `error`.
- Hình khối: `radius-full`.
- Bóng: `elevation-1` khi hover.
