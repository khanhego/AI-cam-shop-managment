# Dialog

Dialog cơ bản theo M3, dựng trên `<dialog>` (modal thật, Esc để đóng): bo `radius-xl`, nền `surface-container-high`, bóng `elevation-3`, scrim 40%.

**Props**: `open`, `title`, `onClose`, `children`, `actions` (các nút đặt sau "Đóng"), `wide` (rộng 672px thay cho 512px).

**Quy tắc**
- Nút "Đóng" kiểu `text` luôn có sẵn.
- Hành động phá huỷ dùng `danger` và nói rõ hậu quả, ví dụ "Video sẽ bị xoá sau 30 ngày".
- Form trong dialog dùng TextField như bình thường; nhãn tự cắt viền theo nền dialog.
