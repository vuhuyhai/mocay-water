/* Quản lý Thông báo / lịch cúp nước / tin tức.
   GET  (công khai): trả danh sách để website hiển thị.
   POST (cần token): thêm 1 thông báo.
   DELETE ?id= (cần token): xóa 1 thông báo.
   Lưu trên Netlify Blobs (store "site-data", key "thongbao"). */
const { getStore } = require("@netlify/blobs");
const { verifyToken, bearer } = require("./_lib/auth");

const KEY = "thongbao";
function store() { return getStore("site-data"); }
async function readAll() {
  const d = await store().get(KEY, { type: "json" });
  return Array.isArray(d) ? d : [];
}
async function writeAll(list) { await store().setJSON(KEY, list); }

exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  try {
    if (event.httpMethod === "GET") {
      const list = await readAll();
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return { statusCode: 200, headers, body: JSON.stringify({ items: list }) };
    }

    // Ghi/xóa: cần đăng nhập admin
    if (!verifyToken(bearer(event))) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: "Chưa đăng nhập" }) };
    }

    if (event.httpMethod === "POST") {
      let b = {};
      try { b = JSON.parse(event.body || "{}"); } catch (e) {}
      const tieuDe = (b.tieuDe || "").toString().trim();
      if (!tieuDe) return { statusCode: 400, headers, body: JSON.stringify({ error: "Thiếu tiêu đề" }) };
      const item = {
        id: "tb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        loai: (b.loai || "thong-bao").toString().slice(0, 30),
        tieuDe: tieuDe.slice(0, 200),
        noiDung: (b.noiDung || "").toString().slice(0, 5000),
        khuVuc: (b.khuVuc || "").toString().slice(0, 200),
        ngay: (b.ngay || "").toString().slice(0, 40),
        ts: Date.now()
      };
      const list = await readAll();
      list.unshift(item);
      await writeAll(list);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, item }) };
    }

    if (event.httpMethod === "DELETE") {
      const id = (event.queryStringParameters && event.queryStringParameters.id) || "";
      let list = await readAll();
      const before = list.length;
      list = list.filter((x) => x.id !== id);
      await writeAll(list);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, removed: before - list.length }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (e) {
    console.error("thongbao error", e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Lỗi máy chủ" }) };
  }
};
