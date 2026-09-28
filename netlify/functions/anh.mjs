/* Ảnh trong bài viết: tải lên từ trang quản trị và phát ra công khai.
   POST /api/tai-anh   (token)  thân là dữ liệu ảnh thô, Content-Type image/*.
                                Trả về { url: "/anh/<ma>.jpg" }.
   GET  /anh/<ma>               phát ảnh, cho trình duyệt giữ lâu vì ảnh không bao giờ đổi.
   Lưu ở Netlify Blobs store "anh". Trang quản trị thu nhỏ ảnh về tối đa 1600px
   trước khi gửi, nên mỗi ảnh chỉ vài trăm KB. */
import { getStore } from "@netlify/blobs";
import auth from "./_lib/auth.js";

export const config = { path: ["/anh/:ma", "/api/tai-anh"] };

const LOAI = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const TOI_DA = 4 * 1024 * 1024;   // Netlify nhận tối đa khoảng 4,5 MB dữ liệu nhị phân mỗi lần
const J = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: J });

export default async (req, context) => {
  const kho = getStore("anh");

  if (req.method === "GET") {
    const ma = (context.params && context.params.ma) || "";
    if (!/^[a-z0-9]+\.(jpg|png|webp|gif)$/.test(ma)) return new Response("Không tìm thấy", { status: 404 });
    const r = await kho.getWithMetadata(ma, { type: "arrayBuffer" });
    if (!r || !r.data) return new Response("Không tìm thấy", { status: 404 });
    return new Response(r.data, {
      headers: {
        "Content-Type": (r.metadata && r.metadata.loai) || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!auth.verifyToken(token)) return json({ error: "Chưa đăng nhập" }, 401);

  const loai = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!LOAI[loai]) return json({ error: "Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF." }, 415);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: "Ảnh rỗng." }, 400);
  if (buf.byteLength > TOI_DA) return json({ error: "Ảnh quá lớn, tối đa 4 MB." }, 413);

  // Kiểm chữ ký đầu tệp, không tin mỗi Content-Type do trình duyệt khai
  const b = new Uint8Array(buf.slice(0, 12));
  const dung =
    (loai === "image/jpeg" && b[0] === 0xff && b[1] === 0xd8) ||
    (loai === "image/png" && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) ||
    (loai === "image/gif" && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) ||
    (loai === "image/webp" && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50);
  if (!dung) return json({ error: "Tệp không phải ảnh hợp lệ." }, 415);

  const ma = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + LOAI[loai];
  await kho.set(ma, buf, { metadata: { loai, kichThuoc: buf.byteLength, luc: new Date().toISOString() } });
  return json({ ok: true, url: "/anh/" + ma, location: "/anh/" + ma });
};
