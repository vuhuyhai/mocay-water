/* ==========================================================================
   Netlify Function: proxy tra cứu hóa đơn nước từ CityWork (eKMap).
   Chạy phía server nên GIỮ TOKEN BÍ MẬT (không lộ ra trình duyệt) và tránh CORS.

   Cấu hình bằng Environment variables trên Netlify
   (Project configuration > Environment variables) — KHÔNG ghi vào mã nguồn:
     CITYWORK_API_BASE     URL gốc API do eKMap/CityWork cấp
     CITYWORK_TOKEN        API key / token xác thực
     CITYWORK_LOOKUP_PATH  đường dẫn tra cứu (vd: /api/v1/hoa-don), có thể để trống
     CITYWORK_MA_PARAM     tên tham số mã KH (mặc định "ma")

   Khi CHƯA cấu hình -> trả {configured:false} để front-end dùng dữ liệu mẫu.
   Trả về cho front-end: { configured:boolean, found:boolean, rec:{ten,ky,m3,nhom,trangthai} }
   ========================================================================== */

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  const ma = ((event.queryStringParameters && event.queryStringParameters.ma) || "").trim();
  if (!ma) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thiếu mã khách hàng" }) };

  const BASE  = process.env.CITYWORK_API_BASE;
  const TOKEN = process.env.CITYWORK_TOKEN;
  const PATH  = process.env.CITYWORK_LOOKUP_PATH || "";
  const PARAM = process.env.CITYWORK_MA_PARAM || "ma";

  // Chưa cấu hình CityWork -> báo front-end dùng dữ liệu mẫu
  if (!BASE || !TOKEN) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false }) };
  }

  try {
    const url = BASE.replace(/\/+$/, "") + PATH + (PATH.includes("?") ? "&" : "?") +
      PARAM + "=" + encodeURIComponent(ma);

    // TODO(eKMap): chỉnh header xác thực đúng theo tài liệu CityWork.
    // Có thể là: Authorization: Bearer <token>  |  hoặc  apikey: <token>  |  hoặc  ?token=<token>
    const res = await fetch(url, {
      headers: { "Authorization": "Bearer " + TOKEN, "Accept": "application/json" }
    });

    if (res.status === 404) {
      return { statusCode: 200, headers, body: JSON.stringify({ configured: true, found: false }) };
    }
    if (!res.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: "CityWork trả về lỗi " + res.status }) };
    }

    const data = await res.json();
    const rec = mapCityWork(data);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ configured: true, found: !!rec, rec: rec || null })
    };
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Không gọi được CityWork: " + String(e) }) };
  }
};

/* Ánh xạ response CityWork -> khuôn dữ liệu website dùng.
   TODO(eKMap): sửa tên trường cho khớp response THẬT của CityWork
   (dựa trên 1 mẫu JSON tra cứu do eKMap cung cấp). */
function mapCityWork(d) {
  if (!d) return null;
  const x = d.data || d.result || d.hoaDon || d;   // gỡ lớp bọc thường gặp
  if (!x || typeof x !== "object") return null;

  const m3 = Number(
    x.tieuThu != null ? x.tieuThu :
    x.soTieuThu != null ? x.soTieuThu :
    x.sanLuong != null ? x.sanLuong :
    x.consumption != null ? x.consumption : 0
  );
  const daTT = x.daThanhToan === true || x.trangThai === "DA_THANH_TOAN" || x.paid === true;

  return {
    ten: x.tenKhachHang || x.hoTen || x.customerName || x.ten || "",
    ky: x.kyHoaDon || x.ky || x.period || "",
    m3: isFinite(m3) ? m3 : 0,
    nhom: mapNhom(x.nhomDoiTuong || x.doiTuong || x.nhom || x.loaiKH || ""),
    trangthai: daTT ? "Đã thanh toán" : "Chưa thanh toán"
  };
}

function mapNhom(s) {
  s = (s || "").toString().toLowerCase();
  if (s.includes("kinh doanh") || s.includes("dich vu") || s.includes("dịch vụ")) return "kinh_doanh";
  if (s.includes("san xuat") || s.includes("sản xuất")) return "san_xuat";
  if (s.includes("hanh chinh") || s.includes("su nghiep") || s.includes("cơ quan") || s.includes("hành chính")) return "hanh_chinh";
  return "sinh_hoat"; // mặc định sinh hoạt
}
