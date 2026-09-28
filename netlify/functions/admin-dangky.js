/* Đọc hồ sơ khách gửi từ Netlify Forms. Cần token admin.
   Hai biểu mẫu đang chạy trên web:
     - dang-ky-lap-dat : đăng ký lắp đồng hồ nước (trang Dịch vụ)
     - phan-anh        : phản ánh, báo sự cố (trang Liên hệ)
   Gọi: /admin-dangky?form=dang-ky-lap-dat | phan-anh

   Mã của biểu mẫu do Netlify sinh ra và ĐỔI mỗi khi biểu mẫu được dựng lại, nên
   ở đây tra mã theo TÊN biểu mẫu thay vì ghi cứng một chuỗi. Bản cũ ghi cứng một
   mã từ tháng 8, sau khi biểu mẫu đăng ký được dựng lại thì mã đó không còn đúng.

   Cần env NETLIFY_API_TOKEN (Personal Access Token của Netlify). SITE_ID do
   Netlify tự đặt lúc chạy. */
const { verifyToken, bearer } = require("./_lib/auth");

const TEN_FORM = ["dang-ky-lap-dat", "phan-anh"];
const FORM_URL = "https://app.netlify.com/projects/mocay-water/forms";
const API = "https://api.netlify.com/api/v1";

async function goiNetlify(duongDan, token) {
  const r = await fetch(API + duongDan, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw Object.assign(new Error("Netlify API " + r.status), { status: r.status });
  return r.json();
}

/* Tra mã biểu mẫu theo tên. Hỏng thì lùi về env NETLIFY_FORM_ID (nếu có). */
async function timMaForm(ten, token) {
  const siteId = process.env.SITE_ID;
  if (siteId) {
    const ds = await goiNetlify("/sites/" + siteId + "/forms", token);
    const ds2 = Array.isArray(ds) ? ds : [];
    const f = ds2.find((x) => x && x.name === ten);
    if (f) return { id: f.id, nguon: "ten" };
    if (ds2.length) return { id: null, nguon: "ten", coTen: ds2.map((x) => x.name) };
  }
  if (process.env.NETLIFY_FORM_ID) return { id: process.env.NETLIFY_FORM_ID, nguon: "env" };
  return { id: null, nguon: "khong-co" };
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const tra = (obj, code = 200) => ({ statusCode: code, headers, body: JSON.stringify(obj) });

  if (!verifyToken(bearer(event))) return tra({ error: "Chưa đăng nhập" }, 401);

  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) return tra({ configured: false, formUrl: FORM_URL });

  const q = (event.queryStringParameters || {});
  const ten = TEN_FORM.includes(q.form) ? q.form : TEN_FORM[0];

  try {
    const { id, coTen } = await timMaForm(ten, token);
    if (!id) {
      return tra({
        configured: true, items: [], formUrl: FORM_URL, form: ten,
        error: "Không tìm thấy biểu mẫu tên \"" + ten + "\" trên Netlify" +
          (coTen && coTen.length ? ". Các biểu mẫu đang có: " + coTen.join(", ") : "")
      });
    }
    const arr = await goiNetlify("/forms/" + id + "/submissions?per_page=100", token);
    const items = (Array.isArray(arr) ? arr : []).map((s) => ({
      id: s.id, ngay: s.created_at, data: s.data || {}
    }));
    return tra({ configured: true, form: ten, items, formUrl: FORM_URL });
  } catch (e) {
    console.error("admin-dangky", ten, e && e.message);
    return tra({
      configured: true, items: [], form: ten, formUrl: FORM_URL,
      error: "Không lấy được dữ liệu từ Netlify" + (e && e.status ? " (" + e.status + ")" : "") +
        ". Mở thẳng Netlify Forms để xem."
    });
  }
};
