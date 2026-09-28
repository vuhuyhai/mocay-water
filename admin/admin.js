/* Trang quản trị: logic phía client. Gọi Netlify Functions (cùng domain). */
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
    if (r.status === 429 || j.khoa) { msg(box, j.error || "Sai quá nhiều lần, tạm khóa. Thử lại sau ít phút."); return; }
    if (!j.ok) { msg(box, j.error || "Sai mật khẩu."); return; }
    setToken(j.token);
    hienDashboard();
  } catch (e) { msg(box, "Lỗi kết nối. Thử lại."); }
}
var roiCoChu = false;   // rời trang do chính hệ thống, không cần nhắc
function dangXuat() { roiCoChu = true; clearToken(); location.reload(); }

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
/* ---------- Giữ bài đang soạn ----------
   Phiên đăng nhập hết hạn sau 8 giờ. Trước đây gặp hết hạn là tải lại trang, bài
   đang gõ dở mất sạch. Nay mỗi thay đổi được cất vào máy của người dùng, mở lại
   là có nguyên. Chỉ xóa khi đăng xong hoặc bấm Hủy. */
var NKEY = "mc_admin_nhap";
var henLuu = null;
function luuNhap() {
  try {
    var b = docForm(); b.editId = editId;
    if (!b.tieuDe && !b.noiDungHtml && !b.khuVuc && !b.anhBia) { localStorage.removeItem(NKEY); return; }
    localStorage.setItem(NKEY, JSON.stringify(b));
  } catch (e) {}
}
function henLuuNhap() { clearTimeout(henLuu); henLuu = setTimeout(luuNhap, 600); }
function xoaNhap() { try { localStorage.removeItem(NKEY); } catch (e) {} }
function phucHoiNhap() {
  var raw = null;
  try { raw = localStorage.getItem(NKEY); } catch (e) {}
  if (!raw) return;
  var b; try { b = JSON.parse(raw); } catch (e) { return; }
  if (!b || (!b.tieuDe && !b.noiDungHtml)) return;
  document.getElementById("f-loai").value = b.loai || "thong-bao";
  if (b.ngay) document.getElementById("f-ngay").value = b.ngay;
  document.getElementById("f-tieude").value = b.tieuDe || "";
  document.getElementById("f-khuvuc").value = b.khuVuc || "";
  document.getElementById("f-anhbia").value = b.anhBia || "";
  setEditorHtml(b.noiDungHtml || "");
  if (b.editId) {
    editId = b.editId;
    document.getElementById("editFlag").classList.remove("hidden");
    document.getElementById("btnSave").textContent = "Cập nhật →";
    document.getElementById("btnCancel").classList.remove("hidden");
  }
  msg(document.getElementById("tbFormMsg"), "Đã khôi phục bài bạn soạn dở lần trước.", true);
}

function resetForm() {
  editId = null;
  xoaNhap();
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
  if (!editId && !confirm("Bài sẽ hiện ngay trên trang chủ và trang Tin tức, mọi người đều đọc được.\n\nĐăng bài này?")) return;
  var method = editId ? "PUT" : "POST";
  if (editId) payload.id = editId;
  luuNhap();
  msg(box, editId ? "Đang cập nhật…" : "Đang đăng…", true);
  try {
    var r = await fetch(API + "/thongbao", { method: method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (r.status === 401) {
      msg(box, "Phiên đăng nhập hết hạn. Bài đang soạn đã được giữ lại, đăng nhập rồi bấm Đăng lại.");
      setTimeout(dangXuat, 2500); return;
    }
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
    if (!items.length) { box.innerHTML = '<p class="muted-note">Chưa có hồ sơ nào ở mục này.</p>'; return; }
    box.innerHTML = items.map(function (s) { return theHoSo(s, form); }).join("") +
      '<p class="muted-note" style="margin-top:10px">Tổng: ' + items.length + ' hồ sơ.</p>';
  } catch (e) { box.innerHTML = '<p class="muted-note">Lỗi kết nối.</p>'; }
}

/* ---------- Khởi động ---------- */
(function init() {
  var d = new Date();
  var s = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  var el = document.getElementById("f-ngay"); if (el) el.value = s;
  var edA = document.getElementById("f-editor");
  if (edA) {
    edA.addEventListener("paste", function (e) {
      e.preventDefault();
      var text = ((e.clipboardData || window.clipboardData).getData("text/plain") || "");
      document.execCommand("insertText", false, text);
    });
    edA.addEventListener("input", henLuuNhap);
  }
  ["f-loai", "f-ngay", "f-tieude", "f-khuvuc", "f-anhbia"].forEach(function (id) {
    var o = document.getElementById(id);
    if (o) { o.addEventListener("input", henLuuNhap); o.addEventListener("change", henLuuNhap); }
  });
  // Nhắc trước khi đóng tab nếu còn bài chưa đăng. Không nhắc khi chính hệ thống
  // tải lại trang (đăng xuất, hết phiên), vì bài đã được cất vào máy rồi.
  window.addEventListener("beforeunload", function (e) {
    if (roiCoChu) return;
    var t = document.getElementById("f-tieude");
    if (t && t.value.trim() && !document.getElementById("dashView").classList.contains("hidden")) {
      e.preventDefault(); e.returnValue = "";
    }
  });
  if (getToken()) { hienDashboard(); phucHoiNhap(); }
})();
