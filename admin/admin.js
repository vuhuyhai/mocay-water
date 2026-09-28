/* Trang quản trị: đăng nhập, chuyển tab, hồ sơ khách gửi.
   Phần soạn và quản lý bài viết nằm ở admin/bai-viet.js (nạp sau file này). */
var API = "/.netlify/functions";
var TKEY = "mc_admin_token";

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function getToken() { return localStorage.getItem(TKEY) || ""; }
function setToken(t) { localStorage.setItem(TKEY, t); }
function clearToken() { localStorage.removeItem(TKEY); }
function authHeaders() { return { "Authorization": "Bearer " + getToken(), "Content-Type": "application/json" }; }
function msg(el, text, ok) {
  el.innerHTML = '<div class="tc-msg' + (ok ? '' : ' tc-err') + '"' +
    (ok ? ' style="color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)"' : '') +
    '>' + esc(text) + '</div>';
}

/* ---------- Đăng nhập ---------- */
async function dangNhap() {
  var pw = document.getElementById("pw").value;
  var box = document.getElementById("loginMsg");
  msg(box, "Đang kiểm tra…", true);
  try {
    var r = await fetch(API + "/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    var j = await r.json();
    if (j.configured === false) { msg(box, "Chưa đặt mật khẩu. Công ty cần đặt biến ADMIN_PASSWORD trên Netlify."); return; }
    if (r.status === 429 || j.khoa) { msg(box, j.error || "Sai quá nhiều lần, tạm khóa. Thử lại sau ít phút."); return; }
    if (!j.ok) { msg(box, j.error || "Sai mật khẩu."); return; }
    setToken(j.token);
    hienDashboard();
  } catch (e) { msg(box, "Lỗi kết nối. Thử lại."); }
}
var roiCoChu = false;   // rời trang do chính hệ thống, không cần nhắc
function dangXuat() { roiCoChu = true; clearToken(); location.reload(); }

var daKhoiDong = false;
function hienDashboard() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashView").classList.remove("hidden");
  if (!daKhoiDong) { daKhoiDong = true; khoiDongBaiViet(); }
}
function chonTab(t) {
  document.getElementById("tabTb").classList.toggle("active", t === "tb");
  document.getElementById("tabDk").classList.toggle("active", t === "dk");
  document.getElementById("paneTb").classList.toggle("hidden", t !== "tb");
  document.getElementById("paneDk").classList.toggle("hidden", t !== "dk");
  if (t === "dk") taiDangKy();
}

/* ---------- Hồ sơ khách gửi (hai biểu mẫu) ----------
   Trước đây bảng này đọc cứng hoten / diachi / doituong, trong khi biểu mẫu đăng
   ký gửi lên tenkhachhang / diachithuongtru / diachilapdat / loaikhachhang, nên
   ba cột luôn trống và 11 trường khác không hiện ra. Nay hiện MỌI trường có
   trong hồ sơ, tên nào chưa có nhãn tiếng Việt thì in nguyên tên. */
var NHAN = {
  loaikhachhang: "Loại khách hàng", tenkhachhang: "Tên khách hàng / chủ hộ",
  nguoidaidien: "Người đại diện", chucvu: "Chức vụ", masothue: "Mã số thuế",
  sodienthoai: "Số điện thoại", email: "Email",
  diachithuongtru: "Địa chỉ thường trú", diachilapdat: "Địa chỉ lắp đặt",
  mucdichsudung: "Mục đích sử dụng", vitridongho: "Vị trí đặt đồng hồ",
  ghichu: "Ghi chú", camket: "Đã cam kết",
  hoten: "Họ tên", diachi: "Địa chỉ / mã khách hàng", chude: "Chủ đề", noidung: "Nội dung"
};
/* Trường đưa lên đầu thẻ cho dễ nhìn, theo từng biểu mẫu */
var NOI_BAT = {
  "dang-ky-lap-dat": ["tenkhachhang", "sodienthoai", "diachilapdat"],
  "phan-anh": ["hoten", "sodienthoai", "chude"]
};
var formHienTai = "dang-ky-lap-dat";

function chonForm(f) {
  formHienTai = f;
  var a = document.getElementById("fmDangKy"), b = document.getElementById("fmPhanAnh");
  var on = "btn btn-primary", off = "btn btn-ghost";
  a.className = (f === "dang-ky-lap-dat" ? on : off); a.style.padding = "8px 14px";
  b.className = (f === "phan-anh" ? on : off); b.style.padding = "8px 14px";
  taiDangKy();
}

function theHoSo(s, form) {
  var d = s.data || {};
  var ngay = s.ngay ? new Date(s.ngay).toLocaleString("vi-VN") : "";
  var uuTien = NOI_BAT[form] || [];
  var dong = [];
  // Bỏ các trường kỹ thuật của Netlify, giữ mọi trường còn lại có giá trị
  Object.keys(d).forEach(function (k) {
    if (k === "form-name" || k === "bot-field") return;
    var v = (d[k] == null ? "" : String(d[k])).trim();
    if (!v) return;
    if (v === "on") v = "Có";           // ô tích của trình duyệt gửi lên chữ "on"
    dong.push({ k: k, nhan: NHAN[k] || k, v: v, uu: uuTien.indexOf(k) });
  });
  dong.sort(function (x, y) {
    if (x.uu !== y.uu) return (x.uu < 0 ? 99 : x.uu) - (y.uu < 0 ? 99 : y.uu);
    return 0;
  });
  var sdt = d.sodienthoai ? String(d.sodienthoai).replace(/[^\d+]/g, "") : "";
  var tieuDe = esc(d.tenkhachhang || d.hoten || "(không ghi tên)");
  return '<div class="tb-item" style="flex-direction:column;align-items:stretch">' +
    '<div class="meta" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
      '<span>' + esc(ngay) + '</span>' +
      (sdt ? '<a href="tel:' + esc(sdt) + '" style="color:var(--teal);font-weight:600">Gọi ' + esc(d.sodienthoai) + '</a>' : '') +
    '</div>' +
    '<h4 style="margin:2px 0 10px">' + tieuDe + '</h4>' +
    '<div style="display:grid;grid-template-columns:minmax(120px,190px) 1fr;gap:4px 14px;font-size:14px">' +
      dong.map(function (x) {
        return '<div style="color:var(--dim)">' + esc(x.nhan) + '</div>' +
               '<div style="color:var(--text);white-space:pre-wrap;word-break:break-word">' + esc(x.v) + '</div>';
      }).join("") +
    '</div></div>';
}

async function taiDangKy() {
  var box = document.getElementById("dkBody");
  var form = formHienTai;
  box.innerHTML = '<p class="muted-note">Đang tải…</p>';
  try {
    var r = await fetch(API + "/admin-dangky?form=" + encodeURIComponent(form), { headers: authHeaders() });
    if (r.status === 401) { box.innerHTML = '<p class="muted-note">Phiên hết hạn.</p>'; setTimeout(dangXuat, 1000); return; }
    var j = await r.json();
    var linkNetlify = '<a class="btn btn-ghost" target="_blank" href="' + esc(j.formUrl || "#") + '">Mở Netlify Forms ↗</a>';
    if (j.configured === false) {
      box.innerHTML = '<div class="card"><p style="margin:0 0 12px;color:var(--muted)">Chưa cấu hình đọc trực tiếp. ' +
        'Đặt biến <b>NETLIFY_API_TOKEN</b> trên Netlify để xem hồ sơ ngay tại đây, hoặc mở trong Netlify Forms:</p>' +
        linkNetlify + '</div>';
      return;
    }
    var items = j.items || [];
    if (j.error) {
      box.innerHTML = '<div class="card"><p style="margin:0 0 12px;color:var(--muted)">' + esc(j.error) + '</p>' + linkNetlify + '</div>';
      return;
    }
    // Chưa có mã truy cập Netlify thì chỉ thấy hồ sơ gửi từ 28/09/2026, ngày bật chức năng tự cất
    var ghiChuCu = j.coLichSu ? "" :
      '<p class="muted-note" style="margin-top:12px">Hồ sơ gửi trước ngày 28/09/2026 xem trong ' +
      '<a target="_blank" href="' + esc(j.formUrl || "#") + '" style="color:var(--teal);font-weight:600">Netlify Forms ↗</a>.</p>';
    if (!items.length) { box.innerHTML = '<p class="muted-note">Chưa có hồ sơ mới nào ở mục này.</p>' + ghiChuCu; return; }
    box.innerHTML = items.map(function (s) { return theHoSo(s, form); }).join("") +
      '<p class="muted-note" style="margin-top:10px">Tổng: ' + items.length + ' hồ sơ.</p>' + ghiChuCu;
  } catch (e) { box.innerHTML = '<p class="muted-note">Lỗi kết nối.</p>'; }
}

/* ---------- Khởi động ----------
   Chờ trang nạp xong mọi file (kể cả bai-viet.js nạp sau file này) rồi mới chạy. */
document.addEventListener("DOMContentLoaded", function init() {
  // Nhắc trước khi đóng tab nếu bài đang soạn chưa lưu. Không nhắc khi chính hệ
  // thống tải lại trang (đăng xuất, hết phiên), vì bài đã được cất vào máy rồi.
  window.addEventListener("beforeunload", function (e) {
    if (roiCoChu) return;
    if (typeof coThayDoi === "function" && coThayDoi()) { e.preventDefault(); e.returnValue = ""; }
  });
  if (getToken()) hienDashboard();
});
