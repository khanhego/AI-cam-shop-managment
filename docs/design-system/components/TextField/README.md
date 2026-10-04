# TextField

Ô nhập outlined theo M3. Nhãn luôn nằm trên viền nên không bao giờ che giá trị.

**Props**: `label` và `name` bắt buộc; `error`, `hint`, `id` (mặc định bằng `name`); mọi thuộc tính của `<input>`.

**Quy tắc**
- Có `error` thì viền và nhãn chuyển sang `error`, chữ lỗi `body-sm` hiện dưới ô và được gắn qua `aria-describedby`.
- Placeholder chỉ để gợi ý định dạng, không thay cho nhãn.
- Trường bắt buộc thêm ` *` vào cuối nhãn.
- Nhãn cắt viền bằng màu `--md-field-bg` do surface cha khai báo: `.card` dùng lowest, dialog dùng high. Nếu tự dựng nền mới, phải set biến này.

Họ hàng: `SelectField`, `TextAreaField` dùng cùng khung. Ô lọc nhỏ trong toolbar dùng `class="md-input md-input-sm"`, không có nhãn nổi, có `aria-label`.
