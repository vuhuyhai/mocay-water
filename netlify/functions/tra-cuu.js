/* ==========================================================================
   Netlify Function: proxy tra cứu hóa đơn nước từ CityWork (eKMap).
   Chạy phía server nên GIỮ TOKEN BÍ MẬT (không lộ ra trình duyệt) và tránh CORS.

   ---- CẤU HÌNH BẰNG ENVIRONMENT VARIABLES TRÊN NETLIFY ----
   (Project configuration > Environment variables. KHÔNG ghi vào mã nguồn.)

   Bắt buộc để bật API thật:
     CITYWORK_API_BASE      URL gốc API do eKMap/CityWork cấp
     CITYWORK_TOKEN         API key / token xác thực

   Đường dẫn tra cứu:
     CITYWORK_LOOKUP_PATH   đường dẫn tra cứu (vd: /api/v1/hoa-don). Để trống nếu base đã đủ.
     CITYWORK_MA_PARAM      tên tham số mã KH trên URL (mặc định "ma")

   Kiểu xác thực (chọn đúng theo tài liệu CityWork, bỏ hardcode Bearer):
     CITYWORK_AUTH_STYLE    "bearer" (mặc định) | "header" | "query"
       - bearer : gửi header  Authorization: Bearer <token>
       - header : gửi header  <CITYWORK_AUTH_HEADER>: <token>   (vd apikey: <token>)
       - query  : gắn <CITYWORK_TOKEN_PARAM>=<token> vào URL
     CITYWORK_AUTH_HEADER   tên header khi AUTH_STYLE=header (mặc định "apikey")
     CITYWORK_TOKEN_PARAM   tên tham số token khi AUTH_STYLE=query (mặc định "token")

   Ánh xạ tên trường trong JSON response (tùy chọn, có thể là "dot path", vd "data.hoaDon.ky").
   Nếu bỏ trống, dùng bộ tên đoán sẵn (đủ cho nhiều hệ). Chỉ đặt khi biết tên thật:
     CITYWORK_DATA_PATH     đường dẫn tới bản ghi hóa đơn trong response (vd "data" hoặc "result.hoaDon")
     CITYWORK_FIELD_TEN     trường tên khách hàng
     CITYWORK_FIELD_KY      trường kỳ hóa đơn
     CITYWORK_FIELD_M3      trường số tiêu thụ (m3)
     CITYWORK_FIELD_NHOM    trường nhóm đối tượng sử dụng
     CITYWORK_FIELD_DC      trường địa chỉ (tùy chọn; để trống nếu không dùng)
     CITYWORK_FIELD_TT      trường trạng thái thanh toán
     CITYWORK_PAID_VALUES   danh sách giá trị nghĩa "đã thanh toán", ngăn cách bởi dấu phẩy
                            (vd "DA_THANH_TOAN,PAID,true"). Không phân biệt hoa thường.

   Khi CHƯA cấu hình (thiếu BASE hoặc TOKEN) -> trả {configured:false} để front-end dùng dữ liệu mẫu.
   Trả về cho front-end: { configured, found, rec:{ten,ky,m3,nhom,dc,trangthai} }
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

  const AUTH_STYLE  = (process.env.CITYWORK_AUTH_STYLE || "bearer").toLowerCase();
  const AUTH_HEADER = process.env.CITYWORK_AUTH_HEADER || "apikey";
  const TOKEN_PARAM = process.env.CITYWORK_TOKEN_PARAM || "token";

  try {
    // Ghép URL: mã KH luôn có; nếu auth theo query thì gắn token vào URL.
    const qs = [PARAM + "=" + encodeURIComponent(ma)];
    if (AUTH_STYLE === "query") qs.push(TOKEN_PARAM + "=" + encodeURIComponent(TOKEN));
    const url = BASE.replace(/\/+$/, "") + PATH + (PATH.includes("?") ? "&" : "?") + qs.join("&");

    // Header xác thực theo cấu hình (thay cho hardcode Bearer trước đây).
    const reqHeaders = { "Accept": "application/json" };
    if (AUTH_STYLE === "bearer") reqHeaders["Authorization"] = "Bearer " + TOKEN;
    else if (AUTH_STYLE === "header") reqHeaders[AUTH_HEADER] = TOKEN;

    const res = await fetch(url, { headers: reqHeaders });

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

/* ---- Đọc trường theo "dot path" (vd "data.hoaDon.ky"). Trả về undefined nếu không có. ---- */
function getPath(obj, path) {
  if (!obj || !path) return undefined;
  return String(path).split(".").reduce(function (o, k) {
    return (o == null) ? undefined : o[k];
  }, obj);
}
// Lấy giá trị: ưu tiên tên trường do env chỉ định; nếu không có thì thử lần lượt các tên đoán sẵn.
function pick(rootForOverride, record, overridePath, guesses) {
  if (overridePath) {
    var v = getPath(rootForOverride, overridePath);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  for (var i = 0; i < guesses.length; i++) {
    if (record[guesses[i]] != null) return record[guesses[i]];
  }
  return undefined;
}

/* Ánh xạ response CityWork -> khuôn dữ liệu website dùng.
   Tên trường lấy từ env (CITYWORK_FIELD_*) nếu có; nếu không, dùng bộ đoán sẵn.
   Override path tính từ GỐC response, còn bộ đoán tính từ bản ghi đã gỡ lớp bọc. */
function mapCityWork(d) {
  if (!d) return null;

  const DATA_PATH = process.env.CITYWORK_DATA_PATH || "";
  const F_TEN  = process.env.CITYWORK_FIELD_TEN  || "";
  const F_KY   = process.env.CITYWORK_FIELD_KY   || "";
  const F_M3   = process.env.CITYWORK_FIELD_M3   || "";
  const F_NHOM = process.env.CITYWORK_FIELD_NHOM || "";
  const F_DC   = process.env.CITYWORK_FIELD_DC   || "";
  const F_TT   = process.env.CITYWORK_FIELD_TT   || "";

  // Bản ghi: theo DATA_PATH nếu đặt; nếu không, gỡ các lớp bọc thường gặp.
  const x = DATA_PATH ? getPath(d, DATA_PATH) : (d.data || d.result || d.hoaDon || d);
  if (!x || typeof x !== "object") return null;

  const m3raw = pick(d, x, F_M3, ["tieuThu", "soTieuThu", "sanLuong", "consumption"]);
  const m3 = Number(m3raw);

  const tt = pick(d, x, F_TT, ["daThanhToan", "trangThai", "paid", "status"]);
  const daTT = isPaid(tt);

  return {
    ten: maskTen(String(pick(d, x, F_TEN, ["tenKhachHang", "hoTen", "customerName", "ten"]) || "")),
    ky: String(pick(d, x, F_KY, ["kyHoaDon", "ky", "period"]) || ""),
    m3: isFinite(m3) ? m3 : 0,
    nhom: mapNhom(String(pick(d, x, F_NHOM, ["nhomDoiTuong", "doiTuong", "nhom", "loaiKH"]) || "")),
    dc: F_DC ? maskDiaChi(String(getPath(d, F_DC) || "")) : "",
    trangthai: daTT ? "Đã thanh toán" : "Chưa thanh toán"
  };
}

// Xác định "đã thanh toán". Nhận danh sách giá trị paid từ env, kèm các mặc định thường gặp.
function isPaid(v) {
  if (v === true) return true;
  const s = String(v == null ? "" : v).trim().toLowerCase();
  if (!s) return false;
  const defaults = ["true", "1", "da_thanh_toan", "da thanh toan", "paid", "đã thanh toán"];
  const extra = (process.env.CITYWORK_PAID_VALUES || "")
    .split(",").map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean);
  return defaults.concat(extra).indexOf(s) !== -1;
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

// Che địa chỉ: giữ số nhà + đường/ấp đầu, ẩn phần còn lại để không lộ vị trí chính xác.
// Chỉ hiện cụm đầu tiên (trước dấu phẩy) + "…".
function maskDiaChi(dc) {
  const s = (dc || "").toString().trim().replace(/\s+/g, " ");
  if (!s) return "";
  const first = s.split(",")[0].trim();
  return s.indexOf(",") !== -1 ? first + ", …" : first;
}

function mapNhom(s) {
  s = (s || "").toString().toLowerCase();
  if (s.includes("kinh doanh") || s.includes("dich vu") || s.includes("dịch vụ")) return "kinh_doanh";
  if (s.includes("san xuat") || s.includes("sản xuất")) return "san_xuat";
  if (s.includes("hanh chinh") || s.includes("su nghiep") || s.includes("cơ quan") || s.includes("hành chính")) return "hanh_chinh";
  return "sinh_hoat"; // mặc định sinh hoạt
}
