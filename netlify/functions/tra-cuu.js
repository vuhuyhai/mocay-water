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

// Giới hạn tần suất theo IP (chống dò quét). Lưu ý: bộ nhớ theo từng instance function;
// khi go-live nên bật thêm rate limit ở tầng nền tảng Netlify cho chắc.
const RL_WINDOW_MS = 60 * 1000;   // cửa sổ 60 giây
const RL_MAX = 20;                // tối đa 20 lượt/phút/IP (điều chỉnh theo quota CityWork)
const _hits = new Map();
function _rateLimited(ip) {
  const now = Date.now();
  const arr = (_hits.get(ip) || []).filter(function (t) { return now - t < RL_WINDOW_MS; });
  if (arr.length >= RL_MAX) { _hits.set(ip, arr); return true; }
  arr.push(now); _hits.set(ip, arr);
  if (_hits.size > 5000) _hits.clear(); // chống phình bộ nhớ
  return false;
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
  const h = event.headers || {};
  const ip = ((h["x-nf-client-connection-ip"] || h["x-forwarded-for"] || "").split(",")[0] || "").trim() || "unknown";
  if (_rateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Bạn tra cứu quá nhanh. Vui lòng thử lại sau ít phút." }) };
  }
  const ma = ((event.queryStringParameters && event.queryStringParameters.ma) || "").trim();
  if (!ma) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thiếu mã khách hàng" }) };
  // Chỉ nhận mã hợp lệ (chữ, số, . _ -) để tránh truyền chuỗi rác/độc sang CityWork
  if (!/^[A-Za-z0-9._-]{2,30}$/.test(ma)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Mã khách hàng không hợp lệ" }) };
  }

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
      console.error("CityWork error status", res.status);
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Không tra cứu được, vui lòng thử lại sau." }) };
    }

    const data = await res.json();
    const rec = mapCityWork(data);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ configured: true, found: !!rec, rec: rec || null })
    };
  } catch (e) {
    console.error("CityWork call failed", e);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Không tra cứu được, vui lòng thử lại sau." }) };
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
    ten: maskTen(x.tenKhachHang || x.hoTen || x.customerName || x.ten || ""),
    ky: x.kyHoaDon || x.ky || x.period || "",
    m3: isFinite(m3) ? m3 : 0,
    nhom: mapNhom(x.nhomDoiTuong || x.doiTuong || x.nhom || x.loaiKH || ""),
    trangthai: daTT ? "Đã thanh toán" : "Chưa thanh toán"
  };
}

// Che tên: chỉ hiện chữ đầu của tên gọi + "**"  (vd "Nguyễn Văn An" -> "Nguyễn Văn A**").
// Idempotent: che lại tên đã che vẫn ra kết quả cũ.
function maskTen(name) {
  const s = (name || "").toString().trim().replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(" ");
  const last = parts[parts.length - 1].replace(/\*+$/, ""); // bỏ ** nếu đã che
  parts[parts.length - 1] = (last.charAt(0) || "") + "**";
  return parts.join(" ");
}

function mapNhom(s) {
  s = (s || "").toString().toLowerCase();
  if (s.includes("kinh doanh") || s.includes("dich vu") || s.includes("dịch vụ")) return "kinh_doanh";
  if (s.includes("san xuat") || s.includes("sản xuất")) return "san_xuat";
  if (s.includes("hanh chinh") || s.includes("su nghiep") || s.includes("cơ quan") || s.includes("hành chính")) return "hanh_chinh";
  return "sinh_hoat"; // mặc định sinh hoạt
}
