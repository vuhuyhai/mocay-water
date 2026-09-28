/* Quản lý bài viết và thông báo. Netlify Function v2 (Blobs tự cấu hình).
   Lưu ở Netlify Blobs store "site-data", key "thongbao" (một mảng JSON).

   GET  công khai     : danh sách bài ĐÃ ĐĂNG, chỉ phần tóm tắt (không kèm toàn văn).
   GET  ?slug=...     : một bài đã đăng, đủ toàn văn (trang /tin/<slug> dùng).
   GET  kèm token     : mọi bài kể cả bản nháp, đủ toàn văn (trang quản trị dùng).
   POST  (token)      : thêm bài.   PUT (token): sửa theo id.   DELETE ?id= (token): xóa.

   Nội dung HTML được LỌC an toàn phía máy chủ. */
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

/* Lọc HTML: loại thẻ nguy hiểm, thuộc tính sự kiện, địa chỉ chạy mã. Phòng XSS.
   Bản đầu lọt 5 kiểu đã thử (xem tools/qa/thu-loc-html.js): dấu gạch chéo thay
   cho dấu cách trước onerror, href không có nháy, javascript: viết bằng mã ký
   tự, và javascript: nằm trong style. File thử đọc thẳng hàm từ đây. */
const THE_CAM = "script|style|iframe|object|embed|form|link|meta|base|svg|math|applet|frame|frameset|template|noscript";

/* Địa chỉ có chạy mã không. Giải mã ký tự và bỏ khoảng trắng trước khi xét,
   vì trình duyệt cũng làm vậy: "java&#115;cript:" chính là "javascript:". */
function diaChiAnToan(v) {
  const d = String(v || "")
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[\u0000- ]/g, "");
  if (/^data:image\//i.test(d)) return true;          // ảnh nhúng thì cho qua
  return !/^(javascript|vbscript|data|blob|file):/i.test(d);
}

/* Dọn phần thuộc tính bên trong một thẻ. Chỉ gọi cho phần nằm giữa tên thẻ và
   dấu ">", nên chữ trong bài có chứa "one=" hay "style=" không bị đụng tới. */
function donThuocTinh(a) {
  a = a.replace(/[\s/]on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, " ");
  a = a.replace(/[\s/]style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, " ");
  a = a.replace(/\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, ten, q1, q2, q3) => {
      const v = q1 !== undefined ? q1 : q2 !== undefined ? q2 : q3 || "";
      return diaChiAnToan(v) ? ten + '="' + v.replace(/"/g, "&quot;") + '"' : ten + '="#"';
    });
  return a;
}

function sanitize(html) {
  if (!html) return "";
  let s = String(html);
  // 1. Thẻ nguy hiểm, cả cặp mở đóng lẫn thẻ đứng một mình
  s = s.replace(new RegExp("<(" + THE_CAM + ")[\\s\\S]*?<\\/\\1>", "gi"), "");
  s = s.replace(new RegExp("<\\/?(" + THE_CAM + ")\\b[^>]*>", "gi"), "");
  // 2. Dọn thuộc tính của mọi thẻ còn lại
  s = s.replace(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (m, ten, attrs) => "<" + ten + donThuocTinh(attrs) + ">");
  return s.slice(0, 200000);
}

/* Đường dẫn bài từ tiêu đề: bỏ dấu tiếng Việt, chữ thường, nối bằng gạch nối.
   "Tạm ngừng cấp nước ấp Phú Quới" -> "tam-ngung-cap-nuoc-ap-phu-quoi" */
function taoSlug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/g, "") || "bai-viet";
}
/* Trùng với bài khác thì thêm -2, -3 như WordPress */
function slugKhongTrung(goc, list, idBoQua) {
  let s = goc, n = 2;
  while (list.some((x) => x.id !== idBoQua && x.slug === s)) s = goc + "-" + n++;
  return s;
}
function chuTron(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function buildItem(b, old, list) {
  const tieuDe = (b.tieuDe || "").toString().trim().slice(0, 200);
  const noiDungHtml = sanitize(b.noiDungHtml || "");
  const muonSlug = (b.slug || "").toString().trim();
  const slug = slugKhongTrung(taoSlug(muonSlug || (old && old.slug) || tieuDe), list, old ? old.id : null);
  let tomTat = (b.tomTat || "").toString().trim().slice(0, 400);
  const trangThai = b.trangThai === "nhap" ? "nhap" : "dang";
  return {
    id: old ? old.id : ("tb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    slug,
    loai: (b.loai || "tin-tuc").toString().slice(0, 30),
    trangThai,
    tieuDe,
    tomTat,
    khuVuc: (b.khuVuc || "").toString().slice(0, 200),
    ngay: (b.ngay || "").toString().slice(0, 40),
    anhBia: (b.anhBia || "").toString().slice(0, 600),
    noiDungHtml,
    ts: old ? old.ts : Date.now(),
    // Lần đầu chuyển sang Đã đăng thì ghi thời điểm đăng, sửa về sau không đổi
    tsDang: old && old.tsDang ? old.tsDang : (trangThai === "dang" ? Date.now() : null),
    tsSua: Date.now()
  };
}

/* Bài cũ trước khi có đường dẫn, trạng thái: coi như đã đăng, đường dẫn là mã bài */
function chuanHoa(x) {
  if (!x.slug) x.slug = x.id;
  if (!x.trangThai) x.trangThai = "dang";
  return x;
}
function banTomTat(x) {
  const t = x.tomTat || chuTron(x.noiDungHtml).slice(0, 220);
  return { id: x.id, slug: x.slug, loai: x.loai, tieuDe: x.tieuDe, tomTat: t, khuVuc: x.khuVuc,
    ngay: x.ngay, anhBia: x.anhBia, ts: x.tsDang || x.ts };
}
const moiNhatTruoc = (a, b) => (b.tsDang || b.ts || 0) - (a.tsDang || a.ts || 0);

export default async (req) => {
  try {
    const method = req.method;
    const url = new URL(req.url);
    const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    const laAdmin = !!token && auth.verifyToken(token);
    // Có gửi token mà token hết hạn: báo rõ, đừng lặng lẽ trả bản công khai
    if (token && !laAdmin) return json({ error: "Chưa đăng nhập" }, 401);

    if (method === "GET") {
      const list = (await readAll()).map(chuanHoa).sort(moiNhatTruoc);
      const slug = url.searchParams.get("slug");
      if (slug) {
        const x = list.find((i) => i.slug === slug && (laAdmin || i.trangThai !== "nhap"));
        return x ? json({ item: x }) : json({ error: "Không tìm thấy bài" }, 404);
      }
      if (laAdmin) return json({ items: list });
      return json({ items: list.filter((i) => i.trangThai !== "nhap").map(banTomTat) });
    }

    // Ghi/sửa/xóa cần đăng nhập admin
    if (!laAdmin) return json({ error: "Chưa đăng nhập" }, 401);

    if (method === "POST") {
      let b = {}; try { b = await req.json(); } catch (e) {}
      if (!(b.tieuDe || "").toString().trim()) return json({ error: "Thiếu tiêu đề" }, 400);
      const list = (await readAll()).map(chuanHoa);
      const item = buildItem(b, null, list);
      list.unshift(item);
      await writeAll(list);
      return json({ ok: true, item });
    }

    if (method === "PUT") {
      let b = {}; try { b = await req.json(); } catch (e) {}
      const id = (b.id || "").toString();
      if (!id) return json({ error: "Thiếu id" }, 400);
      if (!(b.tieuDe || "").toString().trim()) return json({ error: "Thiếu tiêu đề" }, 400);
      const list = (await readAll()).map(chuanHoa);
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return json({ error: "Không tìm thấy bài" }, 404);
      list[idx] = buildItem(b, list[idx], list);
      await writeAll(list);
      return json({ ok: true, item: list[idx] });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id") || "";
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
