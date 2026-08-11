/* Quản lý Thông báo / bài viết — Netlify Function v2 (Blobs tự cấu hình).
   GET (công khai): danh sách để website hiển thị.
   POST (token): thêm bài.  PUT (token): sửa bài theo id.  DELETE ?id= (token): xóa.
   Lưu ở Netlify Blobs store "site-data", key "thongbao".
   Nội dung HTML (rich text) được LỌC an toàn phía máy chủ. */
import { getStore } from "@netlify/blobs";
import auth from "./_lib/auth.js";

const KEY = "thongbao";
function store() { return getStore("site-data"); }
async function readAll() {
  const d = await store().get(KEY, { type: "json" });
  return Array.isArray(d) ? d : [];
}
async function writeAll(list) { await store().setJSON(KEY, list); }

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(obj, status = 200) { return new Response(JSON.stringify(obj), { status, headers: HEADERS }); }

/* Lọc HTML: loại thẻ nguy hiểm, thuộc tính sự kiện, javascript: — phòng XSS. */
function sanitize(html) {
  if (!html) return "";
  let s = String(html);
  s = s.replace(/<(script|style|iframe|object|embed|form|link|meta|base)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>/gi, "");
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  s = s.replace(/(href|src)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"');
  s = s.replace(/(href|src)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
  return s.slice(0, 30000);
}

function buildItem(b, old) {
  const tieuDe = (b.tieuDe || "").toString().trim();
  return {
    id: old ? old.id : ("tb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    loai: (b.loai || "thong-bao").toString().slice(0, 30),
    tieuDe: tieuDe.slice(0, 200),
    khuVuc: (b.khuVuc || "").toString().slice(0, 200),
    ngay: (b.ngay || "").toString().slice(0, 40),
    anhBia: (b.anhBia || "").toString().slice(0, 600),
    noiDungHtml: sanitize(b.noiDungHtml || ""),
    ts: old ? old.ts : Date.now(),
    tsSua: Date.now()
  };
}

export default async (req) => {
  try {
    const method = req.method;

    if (method === "GET") {
      const list = await readAll();
      list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return json({ items: list });
    }

    // Ghi/sửa/xóa cần đăng nhập admin
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    if (!auth.verifyToken(token)) return json({ error: "Chưa đăng nhập" }, 401);

    if (method === "POST") {
      let b = {}; try { b = await req.json(); } catch (e) {}
      if (!(b.tieuDe || "").toString().trim()) return json({ error: "Thiếu tiêu đề" }, 400);
      const item = buildItem(b, null);
      const list = await readAll();
      list.unshift(item);
      await writeAll(list);
      return json({ ok: true, item });
    }

    if (method === "PUT") {
      let b = {}; try { b = await req.json(); } catch (e) {}
      const id = (b.id || "").toString();
      if (!id) return json({ error: "Thiếu id" }, 400);
      if (!(b.tieuDe || "").toString().trim()) return json({ error: "Thiếu tiêu đề" }, 400);
      const list = await readAll();
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return json({ error: "Không tìm thấy bài" }, 404);
      list[idx] = buildItem(b, list[idx]);
      await writeAll(list);
      return json({ ok: true, item: list[idx] });
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
    console.error("thongbao error", e);
    return json({ error: "Lỗi máy chủ" }, 500);
  }
};
