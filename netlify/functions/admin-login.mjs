/* Đăng nhập quản trị. Mật khẩu đặt ở env ADMIN_PASSWORD trên Netlify.

   Có chặn dò mật khẩu: sai 5 lần liên tiếp từ cùng một địa chỉ mạng thì khóa 15
   phút. Trước đây gõ sai bao nhiêu lần cũng được, mỗi lần chưa tới một giây, nên
   máy tự động dò được hàng nghìn mật khẩu mỗi giờ.

   Nguyên tắc: bộ đếm hỏng thì VẪN CHO đăng nhập (fail-open). Thà chặn hụt còn
   hơn khóa nhân viên ra ngoài lúc cần đăng thông báo cúp nước gấp. */
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import auth from "./_lib/auth.js";

const SO_LAN_TOI_DA = 5;
const KHOA_MS = 15 * 60 * 1000;   // khóa 15 phút sau khi sai đủ số lần
const QUEN_MS = 60 * 60 * 1000;   // 1 giờ không thử lại thì xóa bộ đếm

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });

function khoaDem(req) {
  const h = req.headers;
  const ip = h.get("x-nf-client-connection-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "khong-ro";
  return "dangnhap-sai-" + crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

async function docDem(store, key) {
  try {
    const d = await store.get(key, { type: "json" });
    if (!d || typeof d.n !== "number") return null;
    if (Date.now() - (d.moc || 0) > QUEN_MS) return null;
    return d;
  } catch (e) { return null; }           // hỏng kho đếm -> coi như chưa sai lần nào
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!auth.configured()) return json({ configured: false });

  let store = null;
  try { store = getStore("site-data"); } catch (e) { store = null; }
  const key = khoaDem(req);

  // Đang bị khóa?
  if (store) {
    const dem = await docDem(store, key);
    if (dem && dem.n >= SO_LAN_TOI_DA) {
      const conLai = (dem.moc + KHOA_MS) - Date.now();
      if (conLai > 0) {
        return json({
          configured: true, ok: false, khoa: true, conLaiGiay: Math.ceil(conLai / 1000),
          error: "Sai mật khẩu quá nhiều lần. Thử lại sau " + Math.ceil(conLai / 60000) + " phút."
        }, 429);
      }
    }
  }

  let body = {};
  try { body = await req.json(); } catch (e) {}

  if (!auth.checkPassword(body.password)) {
    let conLai = null;
    if (store) {
      try {
        const dem = await docDem(store, key);
        const n = (dem ? dem.n : 0) + 1;
        await store.setJSON(key, { n, moc: Date.now() });
        conLai = Math.max(0, SO_LAN_TOI_DA - n);
      } catch (e) {
        console.error("dem dang nhap sai", e && e.message);   // hỏng thì vẫn cho gõ tiếp
      }
    }
    return json({
      configured: true, ok: false, conLai,
      error: conLai === null ? "Sai mật khẩu."
        : conLai > 0 ? "Sai mật khẩu. Còn " + conLai + " lần trước khi tạm khóa 15 phút."
        : "Sai mật khẩu. Tạm khóa 15 phút."
    }, 401);
  }

  if (store) { try { await store.delete(key); } catch (e) {} }
  return json({ configured: true, ok: true, token: auth.makeToken() });
};
