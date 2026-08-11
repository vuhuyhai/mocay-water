/* Xác thực admin đơn giản (không cần DB):
   - Mật khẩu đặt ở env var ADMIN_PASSWORD (Netlify), KHÔNG nằm trong mã nguồn.
   - Đăng nhập đúng -> phát token = "<hết hạn>.<HMAC(hết hạn, mật khẩu)>".
   - Mỗi API admin xác minh token bằng cách tính lại HMAC. Đổi mật khẩu = vô hiệu token cũ. */
const crypto = require("crypto");

function pass() { return process.env.ADMIN_PASSWORD || ""; }
function configured() { return !!process.env.ADMIN_PASSWORD; }

function checkPassword(input) {
  const p = pass();
  if (!p) return false;
  const a = crypto.createHash("sha256").update(String(input || "")).digest();
  const b = crypto.createHash("sha256").update(p).digest();
  return crypto.timingSafeEqual(a, b);
}

function sign(exp) { return crypto.createHmac("sha256", pass()).update(String(exp)).digest("hex"); }

function makeToken() {
  const exp = Date.now() + 8 * 3600 * 1000; // hết hạn sau 8 giờ
  return exp + "." + sign(exp);
}

function verifyToken(token) {
  if (!token || !pass()) return false;
  const i = token.indexOf(".");
  if (i < 0) return false;
  const exp = token.slice(0, i), sig = token.slice(i + 1);
  if (!/^\d+$/.test(exp) || Date.now() > Number(exp)) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(sign(exp), "utf8"));
  } catch (e) { return false; }
}

function bearer(event) {
  const h = event.headers || {};
  const a = h.authorization || h.Authorization || "";
  return a.indexOf("Bearer ") === 0 ? a.slice(7) : "";
}

module.exports = { configured, checkPassword, makeToken, verifyToken, bearer };
