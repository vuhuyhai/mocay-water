/* Xem đăng ký lắp đồng hồ (submissions từ Netlify Forms).
   Cần token admin. Dùng env var NETLIFY_API_TOKEN (Personal Access Token của Netlify).
   Form id mặc định là form "dang-ky-lap-dat"; đổi bằng env NETLIFY_FORM_ID nếu cần. */
const { verifyToken, bearer } = require("./_lib/auth");

const FORM_ID = process.env.NETLIFY_FORM_ID || "6a757896fcbc170008d67e2a";
const FORM_URL = "https://app.netlify.com/projects/mocay-water/forms";

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (!verifyToken(bearer(event))) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Chưa đăng nhập" }) };
  }
  const token = process.env.NETLIFY_API_TOKEN;
  if (!token) {
    return { statusCode: 200, headers, body: JSON.stringify({ configured: false, formUrl: FORM_URL }) };
  }
  try {
    const r = await fetch("https://api.netlify.com/api/v1/forms/" + FORM_ID + "/submissions?per_page=100", {
      headers: { Authorization: "Bearer " + token }
    });
    if (!r.ok) {
      console.error("netlify forms api", r.status);
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Không lấy được dữ liệu (" + r.status + ")", formUrl: FORM_URL }) };
    }
    const arr = await r.json();
    const items = (arr || []).map((s) => ({ id: s.id, ngay: s.created_at, data: s.data || {} }));
    return { statusCode: 200, headers, body: JSON.stringify({ configured: true, items, formUrl: FORM_URL }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 502, headers, body: JSON.stringify({ error: "Lỗi kết nối Netlify API", formUrl: FORM_URL }) };
  }
};
