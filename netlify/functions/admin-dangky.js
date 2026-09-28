/* Đọc hồ sơ khách gửi cho trang quản trị. Cần token admin.
   Hai biểu mẫu: dang-ky-lap-dat (đăng ký lắp đồng hồ), phan-anh (phản ánh, báo sự cố).
   Gọi: /admin-dangky?form=dang-ky-lap-dat | phan-anh

   Hai nguồn, gộp lại và bỏ trùng:
   1. Kho "ho-so" (Netlify Blobs): hàm submission-created tự chép vào mỗi khi có
      người gửi. Không cần cài gì thêm. Chỉ có hồ sơ gửi SAU khi hàm đó chạy.
   2. Netlify Forms API: chỉ dùng khi có env NETLIFY_API_TOKEN. Có cả hồ sơ cũ.
      Mã biểu mẫu tra theo TÊN qua SITE_ID, không ghi cứng. */
const { verifyToken, bearer } = require("./_lib/auth");

const TEN_FORM = ["dang-ky-lap-dat", "phan-anh"];
const FORM_URL = "https://app.netlify.com/projects/mocay-water/forms";
const API = "https://api.netlify.com/api/v1";

async function goiNetlify(duongDan, token) {
  const r = await fetch(API + duongDan, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) throw Object.assign(new Error("Netlify API " + r.status), { status: r.status });
  return r.json();
}

async function tuKho(event, ten) {
  const { getStore, connectLambda } = await import("@netlify/blobs");
  connectLambda(event);
  const store = getStore("ho-so");
  const { blobs } = await store.list({ prefix: ten + "/" });
  const ds = await Promise.all((blobs || []).map((b) => store.get(b.key, { type: "json" }).catch(() => null)));
  return ds.filter(Boolean).map((x) => ({ id: x.id, ngay: x.ngay, data: x.data || {} }));
}

async function tuNetlifyForms(ten, token) {
  const siteId = process.env.SITE_ID;
  let id = null;
  if (siteId) {
    const ds = await goiNetlify("/sites/" + siteId + "/forms", token);
    const f = (Array.isArray(ds) ? ds : []).find((x) => x && x.name === ten);
    if (f) id = f.id;
  }
  if (!id && ten === "dang-ky-lap-dat" && process.env.NETLIFY_FORM_ID) id = process.env.NETLIFY_FORM_ID;
  if (!id) return [];
  const arr = await goiNetlify("/forms/" + id + "/submissions?per_page=100", token);
  return (Array.isArray(arr) ? arr : []).map((s) => ({ id: s.id, ngay: s.created_at, data: s.data || {} }));
}

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const tra = (obj, code = 200) => ({ statusCode: code, headers, body: JSON.stringify(obj) });

  if (!verifyToken(bearer(event))) return tra({ error: "Chưa đăng nhập" }, 401);

  const q = event.queryStringParameters || {};
  const ten = TEN_FORM.includes(q.form) ? q.form : TEN_FORM[0];
  const token = process.env.NETLIFY_API_TOKEN;

  const loi = [];
  let tuKhoDs = [], tuApiDs = [];
  try { tuKhoDs = await tuKho(event, ten); }
  catch (e) { console.error("admin-dangky kho", e && e.message); loi.push("kho hồ sơ"); }
  if (token) {
    try { tuApiDs = await tuNetlifyForms(ten, token); }
    catch (e) { console.error("admin-dangky api", e && e.message); loi.push("Netlify Forms"); }
  }

  // Gộp, bỏ trùng theo mã hồ sơ, mới nhất lên đầu
  const theoId = new Map();
  for (const x of tuApiDs.concat(tuKhoDs)) if (x && x.id && !theoId.has(x.id)) theoId.set(x.id, x);
  const items = [...theoId.values()].sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));

  return tra({
    configured: true, form: ten, items, formUrl: FORM_URL,
    coLichSu: !!token,
    error: !items.length && loi.length ? "Không đọc được " + loi.join(" và ") + ". Mở thẳng Netlify Forms để xem." : undefined
  });
};
