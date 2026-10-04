# IconButton

Nút chỉ có icon, tròn 40×40px, dùng cho hành động lặp lại trên từng dòng của bảng hoặc thẻ.

**Props**
- `icon`: tên Material Symbol.
- `label`: bắt buộc. Dùng làm `aria-label` và tooltip.
- `variant`: `standard`, `tonal`, `filled` hoặc `danger` (icon xoá).

**Quy tắc**
- Thứ tự trên một dòng: Tải về → Chi tiết → Nhân bản → Xoá. Nút Xoá luôn đứng cuối và dùng `danger`.
- Nếu là link, dùng `<a>`/`Link` với cùng class (`state-layer h-10 w-10 rounded-full`) và `aria-label`.
