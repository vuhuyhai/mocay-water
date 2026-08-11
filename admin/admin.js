/* Trang quản trị — logic phía client. Gọi Netlify Functions (cùng domain). */
var API = "/.netlify/functions";
var TKEY = "mc_admin_token";

var LOAI_LABEL = {
  "thong-bao": "Thông báo khách hàng",
  "lich-cup-nuoc": "Lịch cúp nước",
  "kiem-nghiem": "Kết quả kiểm nghiệm nước",
  "hoat-dong": "Hoạt động công ty",
  "dau-thau": "Chào hàng – Đấu thầu"
};

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
    if (!j.ok) { msg(box, "Sai mật khẩu."); return; }
    setToken(j.token);
    hienDashboard();
  } catch (e) { msg(box, "Lỗi kết nối. Thử lại."); }
}
function dangXuat() { clearToken(); location.reload(); }

function hienDashboard() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("dashView").classList.remove("hidden");
  taiThongBao();
}
function chonTab(t) {
  document.getElementById("tabTb").classList.toggle("active", t === "tb");
  document.getElementById("tabDk").classList.toggle("active", t === "dk");
  document.getElementById("paneTb").classList.toggle("hidden", t !== "tb");
  document.getElementById("paneDk").classList.toggle("hidden", t !== "dk");
  if (t === "dk") taiDangKy();
}

/* ---------- Thông báo ---------- */
async function taiThongBao() {
  var box = document.getElementById("tbList");
  try {
    var r = await fetch(API + "/thongbao", { headers: { "Accept": "application/json" } });
    var j = await r.json();
    var items = j.items || [];
    if (!items.length) { box.innerHTML = '<p class="muted-note">Chưa có thông báo nào.</p>'; return; }
    box.innerHTML = items.map(function (x) {
      return '<div class="tb-item">' +
        '<div>' +
          '<div class="meta"><span class="pill">' + esc(LOAI_LABEL[x.loai] || x.loai) + '</span>' + (x.ngay ? esc(x.ngay) : "") + '</div>' +
          '<h4>' + esc(x.tieuDe) + '</h4>' +
          (x.khuVuc ? '<div class="meta">Khu vực: ' + esc(x.khuVuc) + '</div>' : '') +
          (x.noiDung ? '<p>' + esc(x.noiDung) + '</p>' : '') +
        '</div>' +
        '<button class="btn-del" onclick="xoaThongBao(\'' + esc(x.id) + '\')">Xóa</button>' +
      '</div>';
    }).join("");
  } catch (e) { box.innerHTML = '<p class="muted-note">Không tải được danh sách.</p>'; }
}

async function dangThongBao() {
  var box = document.getElementById("tbFormMsg");
  var payload = {
    loai: document.getElementById("f-loai").value,
    ngay: document.getElementById("f-ngay").value.trim(),
    tieuDe: document.getElementById("f-tieude").value.trim(),
    khuVuc: document.getElementById("f-khuvuc").value.trim(),
    noiDung: document.getElementById("f-noidung").value.trim()
  };
  if (!payload.tieuDe) { msg(box, "Vui lòng nhập tiêu đề."); return; }
  msg(box, "Đang đăng…", true);
  try {
    var r = await fetch(API + "/thongbao", { method: "POST", headers: authHeaders(), body: JSON.stringify(payload) });
    if (r.status === 401) { msg(box, "Phiên đăng nhập hết hạn. Đăng nhập lại."); setTimeout(dangXuat, 1200); return; }
    var j = await r.json();
    if (!j.ok) { msg(box, j.error || "Không đăng được."); return; }
    msg(box, "Đã đăng thông báo.", true);
    document.getElementById("f-tieude").value = "";
    document.getElementById("f-khuvuc").value = "";
    document.getElementById("f-noidung").value = "";
    taiThongBao();
  } catch (e) { msg(box, "Lỗi kết nối."); }
}

async function xoaThongBao(id) {
  if (!confirm("Xóa thông báo này?")) return;
  try {
    var r = await fetch(API + "/thongbao?id=" + encodeURIComponent(id), { method: "DELETE", headers: authHeaders() });
    if (r.status === 401) { alert("Phiên hết hạn, đăng nhập lại."); dangXuat(); return; }
    taiThongBao();
  } catch (e) { alert("Lỗi kết nối."); }
}

/* ---------- Đăng ký lắp đồng hồ ---------- */
async function taiDangKy() {
  var box = document.getElementById("dkBody");
  box.innerHTML = '<p class="muted-note">Đang tải…</p>';
  try {
    var r = await fetch(API + "/admin-dangky", { headers: authHeaders() });
    if (r.status === 401) { box.innerHTML = '<p class="muted-note">Phiên hết hạn.</p>'; setTimeout(dangXuat, 1000); return; }
    var j = await r.json();
    if (j.configured === false) {
      box.innerHTML = '<div class="card"><p style="margin:0 0 12px;color:var(--muted)">Chưa cấu hình đọc trực tiếp. ' +
        'Đặt biến <b>NETLIFY_API_TOKEN</b> trên Netlify để xem danh sách ngay tại đây, hoặc mở trong Netlify Forms:</p>' +
        '<a class="btn btn-primary" target="_blank" href="' + esc(j.formUrl || "#") + '">Mở Netlify Forms ↗</a></div>';
      return;
    }
    var items = j.items || [];
    if (!items.length) { box.innerHTML = '<p class="muted-note">Chưa có đăng ký nào.</p>'; return; }
    var rows = items.map(function (s) {
      var d = s.data || {};
      var ngay = s.ngay ? new Date(s.ngay).toLocaleString("vi-VN") : "";
      return '<tr>' +
        '<td>' + esc(ngay) + '</td>' +
        '<td><b>' + esc(d.hoten || "") + '</b></td>' +
        '<td>' + esc(d.sodienthoai || "") + '</td>' +
        '<td>' + esc(d.diachi || "") + '</td>' +
        '<td>' + esc(d.doituong || "") + '</td>' +
        '<td>' + esc(d.ghichu || "") + '</td>' +
      '</tr>';
    }).join("");
    box.innerHTML = '<div class="tblwrap"><table class="adm"><thead><tr>' +
      '<th>Thời gian</th><th>Họ tên</th><th>SĐT</th><th>Địa chỉ</th><th>Đối tượng</th><th>Ghi chú</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="muted-note" style="margin-top:10px">Tổng: ' + items.length + ' đăng ký.</p>';
  } catch (e) { box.innerHTML = '<p class="muted-note">Lỗi kết nối.</p>'; }
}

/* ---------- Khởi động ---------- */
(function init() {
  var d = new Date();
  var s = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  var el = document.getElementById("f-ngay"); if (el) el.value = s;
  if (getToken()) hienDashboard();
})();
