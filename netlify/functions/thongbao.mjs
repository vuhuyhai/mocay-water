/* Quản lý Thông báo / lịch cúp nước / tin tức — Netlify Function v2 (Blobs tự cấu hình).
   GET (công khai): danh sách để website hiển thị.
   POST (cần token): thêm.  DELETE ?id= (cần token): xóa.
   Lưu ở Netlify Blobs store "site-data", key "thongbao". */
import { getStore } from "@netlify/blobs";
import auth from "./_lib/auth.js"; // CommonJS -> default import

const KEY = "thongbao";
function store() { return getStore("site-data"); }
async function readAll() {
  const d = await store().get(KEY, { type: "json" });
  return Array.isArray(d) ? d : [];
}
async function writeAll(list) { await store().setJSON(KEY, list); }

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: HEADERS }); }

export default async (req) => {
  try {
    const method = req.method;

    if (method === "GET") {
      const list = await readAll();
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return json({ items: list });
    }

    // Ghi/xóa cần đăng nhập admin
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    if (!auth.verifyToken(token)) return json({ error: "Chưa đăng nhập" }, 401);

    if (method === "POST") {
      let b = {};
      try { b = await req.json(); } catch (e) {}
      const tieuDe = (b.tieuDe || "").toString().trim();
      if (!tieuDe) return json({ error: "Thiếu tiêu đề" }, 400);
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
      return json({ ok: true, item });
    }

    if (method === "DELETE") {
      const id = new URL(req.url).searchParams.get("id") || "";
      let list = await readAll();
      const before = list.length;
      list = list.filter((x) => x.id !== id);
      await writeAll(list);
      return json({ ok: true, removed: before - list.length });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ error: "Lỗi máy chủ", detail: String((e && e.message) || e) }, 500);
  }
};
