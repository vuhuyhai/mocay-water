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

/* ---------- Trình soạn thảo (rich text) ---------- */
function editorEl() { return document.getElementById("f-editor"); }
function ed(cmd) { editorEl().focus(); document.execCommand(cmd, false, null); }
function edBlock(tag) { editorEl().focus(); document.execCommand("formatBlock", false, "<" + tag + ">"); }
function edLink() {
  var url = prompt("Nhập địa chỉ liên kết (URL):", "https://");
  if (!url) return; editorEl().focus(); document.execCommand("createLink", false, url);
}
function edImg() {
  var url = prompt("Nhập URL ảnh:", "https://");
  if (!url) return; editorEl().focus(); document.execCommand("insertImage", false, url);
}
function getEditorHtml() { return editorEl().innerHTML.trim(); }
function setEditorHtml(html) { editorEl().innerHTML = html || ""; }
function stripTags(html) { var d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); }

/* ---------- Bài viết / thông báo (CRUD đầy đủ) ---------- */
var TB_ITEMS = [];
var editId = null;

async function taiThongBao() {
  var box = document.getElementById("tbList");
  try {
    var r = await fetch(API + "/thongbao", { headers: { "Accept": "application/json" } });
    var j = await r.json();
    TB_ITEMS = j.items || [];
    if (!TB_ITEMS.length) { box.innerHTML = '<p class="muted-note">Chưa có bài nào.</p>'; return; }
    box.innerHTML = TB_ITEMS.map(function (x) {
      var snip = stripTags(x.noiDungHtml || x.noiDung || "");
      if (snip.length > 140) snip = snip.slice(0, 140) + "…";
      return '<div class="tb-item">' +
        '<div style="min-width:0">' +
          '<div class="meta"><span class="pill">' + esc(LOAI_LABEL[x.loai] || x.loai) + '</span>' + (x.ngay ? esc(x.ngay) : "") + '</div>' +
          '<h4>' + esc(x.tieuDe) + '</h4>' +
          (x.khuVuc ? '<div class="meta">Khu vực: ' + esc(x.khuVuc) + '</div>' : '') +
          (snip ? '<p>' + esc(snip) + '</p>' : '') +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;flex:none">' +
          '<button class="btn-del" style="background:var(--teal-dim);color:var(--teal);border-color:var(--teal-line)" onclick="suaThongBao(\'' + esc(x.id) + '\')">Sửa</button>' +
          '<button class="btn-del" onclick="xoaThongBao(\'' + esc(x.id) + '\')">Xóa</button>' +
        '</div>' +
      '</div>';
    }).join("");
  } catch (e) { box.innerHTML = '<p class="muted-note">Không tải được danh sách.</p>'; }
}

function docForm() {
  return {
    loai: document.getElementById("f-loai").value,
    ngay: document.getElementById("f-ngay").value.trim(),
    tieuDe: document.getElementById("f-tieude").value.trim(),
    khuVuc: document.getElementById("f-khuvuc").value.trim(),
    anhBia: document.getElementById("f-anhbia").value.trim(),
    noiDungHtml: getEditorHtml()
  };
}
function resetForm() {
  editId = null;
  document.getElementById("f-tieude").value = "";
  document.getElementById("f-khuvuc").value = "";
  document.getElementById("f-anhbia").value = "";
  document.getElementById("f-loai").value = "thong-bao";
  setEditorHtml("");
  document.getElementById("tbFormTitle").firstChild.nodeValue = "Đăng bài / thông báo mới ";
  document.getElementById("editFlag").classList.add("hidden");
  document.getElementById("btnSave").textContent = "Đăng bài →";
  document.getElementById("btnCancel").classList.add("hidden");
}
function huySua() { resetForm(); document.getElementById("tbFormMsg").innerHTML = ""; }

async function dangThongBao() {
  var box = document.getElementById("tbFormMsg");
  var payload = docForm();
  if (!payload.tieuDe) { msg(box, "Vui lòng nhập tiêu đề."); return; }
  var method = editId ? "PUT" : "POST";
  if (editId) payload.id = editId;
  msg(box, editId ? "Đang cập nhật…" : "Đang đăng…", true);
  try {
    var r = await fetch(API + "/thongbao", { method: method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (r.status === 401) { msg(box, "Phiên đăng nhập hết hạn. Đăng nhập lại."); setTimeout(dangXuat, 1200); return; }
    var j = await r.json();
    if (!j.ok) { msg(box, j.error || "Không lưu được."); return; }
    msg(box, editId ? "Đã cập nhật bài." : "Đã đăng bài.", true);
    resetForm();
    taiThongBao();
  } catch (e) { msg(box, "Lỗi kết nối."); }
}

function suaThongBao(id) {
  var x = null;
  for (var i = 0; i < TB_ITEMS.length; i++) if (TB_ITEMS[i].id === id) { x = TB_ITEMS[i]; break; }
  if (!x) return;
  editId = id;
  document.getElementById("f-loai").value = x.loai || "thong-bao";
  document.getElementById("f-ngay").value = x.ngay || "";
  document.getElementById("f-tieude").value = x.tieuDe || "";
  document.getElementById("f-khuvuc").value = x.khuVuc || "";
  document.getElementById("f-anhbia").value = x.anhBia || "";
  setEditorHtml(x.noiDungHtml || (x.noiDung ? "<p>" + esc(x.noiDung) + "</p>" : ""));
  document.getElementById("tbFormTitle").firstChild.nodeValue = "Sửa bài ";
  document.getElementById("editFlag").classList.remove("hidden");
  document.getElementById("btnSave").textContent = "Cập nhật →";
  document.getElementById("btnCancel").classList.remove("hidden");
  document.getElementById("tbFormCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function xoaThongBao(id) {
  if (!confirm("Xóa bài này?")) return;
  try {
    var r = await fetch(API + "/thongbao?id=" + encodeURIComponent(id), { method: "DELETE", headers: authHeaders() });
    if (r.status === 401) { alert("Phiên hết hạn, đăng nhập lại."); dangXuat(); return; }
    if (editId === id) resetForm();
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
  var edA = document.getElementById("f-editor");
  if (edA) edA.addEventListener("paste", function (e) {
    e.preventDefault();
    var text = ((e.clipboardData || window.clipboardData).getData("text/plain") || "");
    document.execCommand("insertText", false, text);
  });
  if (getToken()) hienDashboard();
})();
