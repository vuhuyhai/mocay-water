# Tích hợp API CityWork (eKMap): hướng dẫn go-live

Tra cứu hóa đơn nước gọi qua Netlify Function `netlify/functions/tra-cuu.js` (proxy giữ token phía server).
Chưa cấu hình đủ thì web tự lùi về **dữ liệu mẫu**. Muốn chạy thật: chỉ cần đặt biến môi trường trên
Netlify (Project configuration > Environment variables), **không phải sửa code**.

---

## 1. Câu hỏi cần gửi eKMap/CityWork

Xin đúng những mục này là đủ để cắm API:

1. **URL gốc API** tra cứu hóa đơn (base URL) và **đường dẫn** endpoint tra cứu.
2. **Tham số mã khách hàng** truyền trên URL tên là gì? (vd `ma`, `maKH`, `customerCode`)
3. **Kiểu xác thực**: chọn 1 trong
   - `Authorization: Bearer <token>`
   - header riêng, vd `apikey: <token>` (cho biết tên header)
   - token gắn trên URL, vd `?token=<token>` (cho biết tên tham số)
4. **1 mẫu JSON response thật** của một lần tra cứu (che số liệu thật cũng được, chỉ cần đúng
   tên trường và cấu trúc lồng). Cần map các trường: tên KH, kỳ hóa đơn, số tiêu thụ (m³),
   nhóm đối tượng, trạng thái thanh toán, (tùy chọn) địa chỉ.
5. **Giá trị nào nghĩa "đã thanh toán"** trong trường trạng thái? (vd `DA_THANH_TOAN`, `PAID`, `true`)
6. **Quota / giới hạn tần suất** để đặt rate limit cho khớp (hiện đang 20 lượt/phút/IP).
7. IP tĩnh của Netlify Functions có cần **whitelist** phía CityWork không?

---

## 2. Biến môi trường trên Netlify

### Bắt buộc (thiếu 1 trong 2 -> vẫn dùng dữ liệu mẫu)
| Biến | Ý nghĩa |
|---|---|
| `CITYWORK_API_BASE` | URL gốc API do eKMap cấp |
| `CITYWORK_TOKEN` | API key / token xác thực |

### Đường dẫn tra cứu
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `CITYWORK_LOOKUP_PATH` | *(trống)* | Đường dẫn endpoint, vd `/api/v1/hoa-don` |
| `CITYWORK_MA_PARAM` | `ma` | Tên tham số mã KH trên URL |

### Xác thực (đặt theo câu hỏi #3)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `CITYWORK_AUTH_STYLE` | `bearer` | `bearer` \| `header` \| `query` |
| `CITYWORK_AUTH_HEADER` | `apikey` | Tên header khi `AUTH_STYLE=header` |
| `CITYWORK_TOKEN_PARAM` | `token` | Tên tham số token khi `AUTH_STYLE=query` |

### Ánh xạ trường JSON (chỉ đặt khi biết tên thật; bỏ trống -> dùng bộ đoán sẵn)
Giá trị có thể là "dot path" tính từ gốc response, vd `data.hoaDon.ky`.
| Biến | Ánh xạ tới |
|---|---|
| `CITYWORK_DATA_PATH` | Đường dẫn tới bản ghi hóa đơn trong response, vd `data` |
| `CITYWORK_FIELD_TEN` | Tên khách hàng |
| `CITYWORK_FIELD_KY` | Kỳ hóa đơn |
| `CITYWORK_FIELD_M3` | Số tiêu thụ (m³) |
| `CITYWORK_FIELD_NHOM` | Nhóm đối tượng sử dụng |
| `CITYWORK_FIELD_DC` | Địa chỉ (tùy chọn; để trống nếu không hiện) |
| `CITYWORK_FIELD_TT` | Trạng thái thanh toán |
| `CITYWORK_PAID_VALUES` | Các giá trị nghĩa "đã thanh toán", ngăn bởi dấu phẩy, vd `DA_THANH_TOAN,PAID` |

---

## 3. Ba ví dụ cấu hình theo kiểu xác thực

**A. Bearer token, endpoint `/api/v1/hoa-don?maKH=...`, response bọc trong `data`:**
```
CITYWORK_API_BASE   = https://api.citywork.vn
CITYWORK_LOOKUP_PATH= /api/v1/hoa-don
CITYWORK_MA_PARAM   = maKH
CITYWORK_TOKEN      = <token>
CITYWORK_AUTH_STYLE = bearer
CITYWORK_DATA_PATH  = data
CITYWORK_FIELD_TEN  = tenKH
CITYWORK_FIELD_KY   = ky
CITYWORK_FIELD_M3   = tieuThu
CITYWORK_FIELD_NHOM = nhomKH
CITYWORK_FIELD_TT   = trangThai
CITYWORK_PAID_VALUES= DA_THANH_TOAN
```

**B. Header apikey riêng:**
```
CITYWORK_AUTH_STYLE  = header
CITYWORK_AUTH_HEADER = apikey
```

**C. Token trên URL:**
```
CITYWORK_AUTH_STYLE = query
CITYWORK_TOKEN_PARAM= token
```

---

## 4. Kiểm thử sau khi đặt biến

1. Redeploy site (đặt env xong bấm **Trigger deploy** cho function nạp biến mới).
2. Gọi trực tiếp function để xem JSON thô:
   `https://mocay-water.netlify.app/.netlify/functions/tra-cuu?ma=<mã thật>`
   - `{"configured":false}` -> thiếu `CITYWORK_API_BASE` hoặc `CITYWORK_TOKEN`.
   - `{"configured":true,"found":false}` -> gọi được nhưng không thấy mã (kiểm tra `MA_PARAM`, `LOOKUP_PATH`).
   - `{"configured":true,"found":true,"rec":{...}}` -> OK. Đối chiếu `rec` với hóa đơn thật; lệch trường nào thì chỉnh `CITYWORK_FIELD_*`.
3. Tra trên web: nhập mã thật ở trang tra cứu, kiểm tra tên đã che, số tiền, trạng thái.

## 5. Lưu ý bảo mật (đã có sẵn, đừng gỡ)
- Token chỉ nằm ở server (function), không lộ ra trình duyệt.
- Rate limit 20 lượt/phút/IP; validate mã KH `^[A-Za-z0-9._-]{2,30}$`.
- Che tên KH và địa chỉ trước khi trả về; escape HTML chống XSS.
- Nội dung QR chuyển khoản chỉ gồm Mã KH + Kỳ (không kèm tên).
