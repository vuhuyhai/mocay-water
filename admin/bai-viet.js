/* Trang quản trị: soạn và quản lý bài viết, bố cục giống trình soạn thảo WordPress.
   - Danh sách "Tất cả bài viết": lọc Tất cả / Đã đăng / Bản nháp, tìm theo tiêu đề,
     mỗi dòng có Sửa, Xem, Xóa.
   - Màn soạn bài: cột chính (tiêu đề, đường dẫn, khung soạn thảo TinyMCE, tóm tắt)
     và cột phải (Đăng, Chuyên mục, Khu vực ảnh hưởng, Ảnh đại diện).
   Khung soạn thảo là TinyMCE 7 (mã nguồn mở, GPL), cùng bộ soạn thảo của WordPress
   cổ điển, tải từ jsDelivr. Ảnh được thu nhỏ trong trình duyệt rồi mới gửi lên.
   Cần admin.js nạp trước (esc, getToken, authHeaders, msg, API, dangXuat). */

var LOAI_LABEL = {
  "tin-tuc": "Tin tức",
  "thong-bao": "Thông báo khách hàng",
  "lich-cup-nuoc": "Lịch cúp nước",
  "kiem-nghiem": "Kết quả kiểm nghiệm nước",
  "hoat-dong": "Hoạt động công ty",
  "dau-thau": "Chào hàng, đấu thầu"
};
var TB_ITEMS = [];
var editId = null;       // đang sửa bài nào; null là bài mới
var trangThaiHienTai = "nhap";
var locHienTai = "tat-ca";
var edReady = false;

/* ---------- Tiện ích ---------- */
function taoSlug(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/g, "");
}
function homNay() {
  var d = new Date();
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}
function ngayCua(x) {
  if (x.ngay) return x.ngay;
  var t = x.tsDang || x.ts; if (!t) return "";
  var d = new Date(t);
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}
function $(id) { return document.getElementById(id); }
function noiDung() { return (window.tinymce && tinymce.get("f-noidung")) ? tinymce.get("f-noidung").getContent() : ($("f-noidung").value || ""); }
function datNoiDung(h) {
  var ed = window.tinymce && tinymce.get("f-noidung");
  if (ed && ed.initialized) { ed.setContent(h || ""); ed.undoManager.clear(); return; }
  // Khung soạn thảo chưa tải xong: để nội dung chờ, lúc khởi động xong sẽ nạp vào
  $("f-noidung").value = h || "";
  window._noiDungCho = h || "";
}

/* ---------- Chuyển giữa danh sách và màn soạn ---------- */
function moDanhSach() {
  if (coThayDoi() && !confirm("Bài đang soạn chưa lưu. Rời khỏi màn soạn?")) return;
  $("vSoan").classList.add("hidden");
  $("vDanhSach").classList.remove("hidden");
  taiThongBao();
  window.scrollTo(0, 0);
}
function moSoan(x) {
  $("vDanhSach").classList.add("hidden");
  $("vSoan").classList.remove("hidden");
  napForm(x || null);
  window.scrollTo(0, 0);
}
function vietBaiMoi() { xoaNhap(); moSoan(null); }

/* ---------- Danh sách bài ---------- */
async function taiThongBao() {
  var box = $("tbList");
  box.innerHTML = '<p class="muted-note">Đang tải…</p>';
  try {
    var r = await fetch(API + "/thongbao", { headers: { "Accept": "application/json", "Authorization": "Bearer " + getToken() } });
    if (r.status === 401) { box.innerHTML = '<p class="muted-note">Phiên hết hạn.</p>'; setTimeout(dangXuat, 1200); return; }
    var j = await r.json();
    TB_ITEMS = j.items || [];
    veDanhSach();
  } catch (e) { box.innerHTML = '<p class="muted-note">Không tải được danh sách.</p>'; }
}
function chonLoc(l) { locHienTai = l; veDanhSach(); }
function veDanhSach() {
  var box = $("tbList");
  var tim = ($("tbTim").value || "").trim().toLowerCase();
  var dem = { "tat-ca": TB_ITEMS.length, dang: 0, nhap: 0 };
  TB_ITEMS.forEach(function (x) { dem[x.trangThai === "nhap" ? "nhap" : "dang"]++; });
  $("tbLoc").innerHTML = [["tat-ca", "Tất cả"], ["dang", "Đã đăng"], ["nhap", "Bản nháp"]].map(function (p) {
    return '<a href="javascript:void 0" onclick="chonLoc(\'' + p[0] + '\')" class="' + (locHienTai === p[0] ? "on" : "") + '">' +
      p[1] + ' <span>(' + dem[p[0]] + ')</span></a>';
  }).join(" | ");

  var ds = TB_ITEMS.filter(function (x) {
    var tt = x.trangThai === "nhap" ? "nhap" : "dang";
    if (locHienTai !== "tat-ca" && tt !== locHienTai) return false;
    return !tim || (x.tieuDe || "").toLowerCase().indexOf(tim) >= 0;
  });
  if (!TB_ITEMS.length) { box.innerHTML = '<div class="wp-trong">Chưa có bài viết nào. Bấm <b>Viết bài mới</b> để bắt đầu.</div>'; return; }
  if (!ds.length) { box.innerHTML = '<div class="wp-trong">Không có bài nào khớp.</div>'; return; }
  box.innerHTML = '<div class="tblwrap"><table class="adm wp-bang"><thead><tr>' +
    '<th>Tiêu đề</th><th style="width:190px">Chuyên mục</th><th style="width:130px">Ngày</th></tr></thead><tbody>' +
    ds.map(function (x) {
      var nhap = x.trangThai === "nhap";
      var xem = nhap ? "" : ' | <a href="/tin/' + encodeURIComponent(x.slug) + '" target="_blank">Xem</a>';
      return '<tr><td>' +
        '<a class="wp-td" href="javascript:void 0" onclick="suaThongBao(\'' + esc(x.id) + '\')">' + esc(x.tieuDe) + '</a>' +
        (nhap ? ' <span class="wp-nhan">Bản nháp</span>' : '') +
        '<div class="wp-hanh-dong"><a href="javascript:void 0" onclick="suaThongBao(\'' + esc(x.id) + '\')">Sửa</a>' + xem +
        ' | <a href="javascript:void 0" class="xoa" onclick="xoaThongBao(\'' + esc(x.id) + '\')">Xóa</a></div>' +
        '</td><td>' + esc(LOAI_LABEL[x.loai] || x.loai || "") + '</td>' +
        '<td><div>' + (nhap ? "Sửa lần cuối" : "Đã đăng") + '</div><div class="muted-note">' + esc(ngayCua(x)) + '</div></td></tr>';
    }).join("") + '</tbody></table></div>';
}

/* ---------- Màn soạn bài ---------- */
var giaTriGoc = "";   // để biết có sửa gì chưa lưu
function docForm() {
  var loai = document.querySelector('input[name="f-loai"]:checked');
  return {
    tieuDe: $("f-tieude").value.trim(),
    slug: $("f-slug").value.trim(),
    loai: loai ? loai.value : "tin-tuc",
    ngay: $("f-ngay").value.trim(),
    khuVuc: $("f-khuvuc").value.trim(),
    anhBia: $("f-anhbia").value.trim(),
    tomTat: $("f-tomtat").value.trim(),
    noiDungHtml: noiDung()
  };
}
function coThayDoi() { return !$("vSoan").classList.contains("hidden") && JSON.stringify(docForm()) !== giaTriGoc; }

function napForm(x) {
  editId = x ? x.id : null;
  trangThaiHienTai = x ? (x.trangThai === "nhap" ? "nhap" : "dang") : "nhap";
  $("soanTieuDe").textContent = x ? "Sửa bài viết" : "Viết bài mới";
  $("f-tieude").value = x ? x.tieuDe || "" : "";
  $("f-slug").value = x ? x.slug || "" : "";
  $("f-ngay").value = x ? (x.ngay || ngayCua(x)) : homNay();
  $("f-khuvuc").value = x ? x.khuVuc || "" : "";
  $("f-tomtat").value = x ? x.tomTat || "" : "";
  datAnhBia(x ? x.anhBia || "" : "");
  var loai = x ? (x.loai || "tin-tuc") : "tin-tuc";
  var r = document.querySelector('input[name="f-loai"][value="' + loai + '"]');
  (r || document.querySelector('input[name="f-loai"]')).checked = true;
  datNoiDung(x ? x.noiDungHtml || (x.noiDung ? "<p>" + esc(x.noiDung) + "</p>" : "") : "");
  $("tbFormMsg").innerHTML = "";
  capNhatHopDang();
  capNhatDuongDan();
  setTimeout(function () { giaTriGoc = JSON.stringify(docForm()); }, 50);
}

function capNhatHopDang() {
  var dang = trangThaiHienTai === "dang";
  $("hopTrangThai").textContent = editId ? (dang ? "Đã đăng" : "Bản nháp") : "Bản nháp (chưa lưu)";
  $("btnNhap").textContent = dang ? "Chuyển về bản nháp" : "Lưu nháp";
  $("btnDang").textContent = dang ? "Cập nhật" : "Đăng";
  $("btnXoa").classList.toggle("hidden", !editId);
  var xem = $("lnkXemBai");
  if (editId && dang) { xem.href = "/tin/" + encodeURIComponent($("f-slug").value); xem.classList.remove("hidden"); }
  else xem.classList.add("hidden");
}

function capNhatDuongDan() {
  var s = $("f-slug").value.trim() || taoSlug($("f-tieude").value);
  $("dsSlug").textContent = s || "…";
}
function suaDuongDan() {
  var s = prompt("Đường dẫn của bài (chỉ chữ không dấu, số và gạch nối):", $("f-slug").value || taoSlug($("f-tieude").value));
  if (s === null) return;
  $("f-slug").value = taoSlug(s);
  capNhatDuongDan(); henLuuNhap();
}

/* ---------- Ảnh đại diện ---------- */
function datAnhBia(url) {
  $("f-anhbia").value = url || "";
  var co = !!url;
  $("anhBiaXem").innerHTML = co ? '<img src="' + esc(url) + '" alt="Ảnh đại diện">' : "";
  $("btnDatAnh").textContent = co ? "Đổi ảnh đại diện" : "Đặt ảnh đại diện";
  $("btnBoAnh").classList.toggle("hidden", !co);
}
function chonAnhBia() { $("fileAnhBia").click(); }
async function taiAnhBia(input) {
  var f = input.files && input.files[0]; input.value = "";
  if (!f) return;
  var nut = $("btnDatAnh"), cu = nut.textContent;
  nut.disabled = true; nut.textContent = "Đang tải ảnh…";
  try { datAnhBia(await taiAnhLen(f)); henLuuNhap(); }
  catch (e) { alert(e.message || "Không tải được ảnh."); }
  finally { nut.disabled = false; if (nut.textContent === "Đang tải ảnh…") nut.textContent = cu; }
}
function boAnhBia() { datAnhBia(""); henLuuNhap(); }

/* Thu nhỏ ảnh về tối đa 1600px trong trình duyệt rồi gửi lên /api/tai-anh */
function thuNhoAnh(file) {
  return new Promise(function (ok) {
    if (file.type === "image/gif" || !/^image\//.test(file.type)) return ok(file);
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      URL.revokeObjectURL(url);
      var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
      if (w <= max && h <= max && file.size < 900 * 1024) return ok(file);
      var k = Math.min(1, max / Math.max(w, h));
      var c = document.createElement("canvas");
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      var g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (b) { ok(b || file); }, "image/jpeg", 0.84);
    };
    img.onerror = function () { URL.revokeObjectURL(url); ok(file); };
    img.src = url;
  });
}
async function taiAnhLen(file) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF.");
  var b = await thuNhoAnh(file);
  var r = await fetch("/api/tai-anh", { method: "POST", headers: { "Authorization": "Bearer " + getToken(), "Content-Type": b.type || file.type }, body: b });
  if (r.status === 401) throw new Error("Phiên đăng nhập hết hạn. Bài đang soạn đã được giữ lại, hãy đăng nhập lại.");
  var j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok || !j.url) throw new Error(j.error || "Không tải được ảnh (" + r.status + ").");
  return j.url;
}

/* ---------- Lưu, đăng, xóa ---------- */
async function luuBai(trangThai) {
  var box = $("tbFormMsg");
  var p = docForm();
  if (!p.tieuDe) { msg(box, "Vui lòng nhập tiêu đề."); $("f-tieude").focus(); return; }
  if (trangThai === "dang" && trangThaiHienTai !== "dang" &&
      !confirm("Bài sẽ hiện ngay trên trang chủ và trang Tin tức, mọi người đều đọc được.\n\nĐăng bài này?")) return;
  p.trangThai = trangThai;
  if (editId) p.id = editId;
  luuNhap();
  ["btnDang", "btnNhap"].forEach(function (i) { $(i).disabled = true; });
  msg(box, trangThai === "dang" ? "Đang đăng…" : "Đang lưu…", true);
  try {
    var r = await fetch(API + "/thongbao", { method: editId ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(p) });
    if (r.status === 401) {
      msg(box, "Phiên đăng nhập hết hạn. Bài đang soạn đã được giữ lại, đăng nhập rồi bấm lưu lại.");
      setTimeout(dangXuat, 2500); return;
    }
    var j = await r.json();
    if (!j.ok) { msg(box, j.error || "Không lưu được."); return; }
    var x = j.item;
    editId = x.id; trangThaiHienTai = x.trangThai;
    $("f-slug").value = x.slug;
    xoaNhap();
    capNhatHopDang(); capNhatDuongDan();
    giaTriGoc = JSON.stringify(docForm());
    // Cập nhật danh sách trong bộ nhớ
    var i = TB_ITEMS.findIndex(function (t) { return t.id === x.id; });
    if (i >= 0) TB_ITEMS[i] = x; else TB_ITEMS.unshift(x);
    if (x.trangThai === "dang") {
      box.innerHTML = '<div class="tc-msg" style="color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)">' +
        '<b>Đã đăng.</b> <a href="/tin/' + encodeURIComponent(x.slug) + '" target="_blank" style="color:inherit;text-decoration:underline">Xem bài trên web ↗</a>' +
        '<br><span style="font-size:13px">Trang bài có thể mất tới 1 phút mới hiện bản vừa sửa.</span></div>';
    } else msg(box, "Đã lưu bản nháp. Bản nháp không hiện ngoài web.", true);
  } catch (e) { msg(box, "Lỗi kết nối. Bài đang soạn vẫn được giữ trên máy này."); }
  finally { ["btnDang", "btnNhap"].forEach(function (i) { $(i).disabled = false; }); }
}
function bamDang() { luuBai("dang"); }
function bamNhap() { luuBai("nhap"); }

function suaThongBao(id) {
  var x = TB_ITEMS.find(function (t) { return t.id === id; });
  if (x) moSoan(x);
}
async function xoaThongBao(id) {
  var x = TB_ITEMS.find(function (t) { return t.id === id; });
  if (!confirm("Xóa hẳn bài \"" + (x ? x.tieuDe : "") + "\"? Không khôi phục được.")) return;
  try {
    var r = await fetch(API + "/thongbao?id=" + encodeURIComponent(id), { method: "DELETE", headers: authHeaders() });
    if (r.status === 401) { alert("Phiên hết hạn, đăng nhập lại."); dangXuat(); return; }
    TB_ITEMS = TB_ITEMS.filter(function (t) { return t.id !== id; });
    if (editId === id) { editId = null; giaTriGoc = JSON.stringify(docForm()); xoaNhap(); moDanhSach(); }
    else veDanhSach();
  } catch (e) { alert("Lỗi kết nối."); }
}
function xoaBaiDangSoan() { if (editId) xoaThongBao(editId); }

/* ---------- Xem trước ---------- */
function xemTruoc() {
  var p = docForm();
  var loai = LOAI_LABEL[p.loai] || "Tin tức";
  $("xtThan").innerHTML =
    '<div class="bai"><span class="badge">' + esc(loai) + '</span>' +
    '<h1 style="font-size:clamp(26px,4vw,40px);margin:14px 0 8px">' + esc(p.tieuDe || "(Chưa có tiêu đề)") + '</h1>' +
    '<div class="meta">' + (p.ngay ? "<span>Ngày " + esc(p.ngay) + "</span>" : "") + '<span>Công ty TNHH Cấp Thoát Nước Mỏ Cày</span></div>' +
    (p.khuVuc ? '<div class="khu"><b>Khu vực ảnh hưởng:</b> ' + esc(p.khuVuc) + '</div>' : "") +
    (p.anhBia ? '<figure class="bia"><img src="' + esc(p.anhBia) + '" alt=""></figure>' : "") +
    '<div class="noi-dung">' + p.noiDungHtml + '</div></div>';
  $("xtHop").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function dongXemTruoc() { $("xtHop").classList.add("hidden"); document.body.style.overflow = ""; }

/* ---------- Giữ bài đang soạn ----------
   Mỗi thay đổi được cất vào máy của người dùng. Phiên hết hạn hay lỡ đóng tab,
   mở lại là có nguyên. Chỉ xóa khi đã lưu lên máy chủ. */
var NKEY = "mc_admin_nhap";
var henLuu = null;
function luuNhap() {
  try {
    if ($("vSoan").classList.contains("hidden")) return;
    var b = docForm(); b.editId = editId; b.trangThai = trangThaiHienTai;
    if (!b.tieuDe && !b.noiDungHtml) { localStorage.removeItem(NKEY); return; }
    localStorage.setItem(NKEY, JSON.stringify(b));
  } catch (e) {}
}
function henLuuNhap() { capNhatDuongDan(); clearTimeout(henLuu); henLuu = setTimeout(luuNhap, 700); }
function xoaNhap() { try { localStorage.removeItem(NKEY); } catch (e) {} }
function phucHoiNhap() {
  var b = null;
  try { b = JSON.parse(localStorage.getItem(NKEY) || "null"); } catch (e) {}
  if (!b || (!b.tieuDe && !b.noiDungHtml)) return false;
  moSoan({ id: b.editId || null, trangThai: b.trangThai, tieuDe: b.tieuDe, slug: b.slug, loai: b.loai, ngay: b.ngay,
    khuVuc: b.khuVuc, anhBia: b.anhBia, tomTat: b.tomTat, noiDungHtml: b.noiDungHtml });
  if (!b.editId) editId = null;
  capNhatHopDang();
  msg($("tbFormMsg"), "Đã khôi phục bài bạn soạn dở lần trước. Nhớ bấm Lưu nháp hoặc Đăng.", true);
  setTimeout(function () { giaTriGoc = ""; }, 100);   // coi như chưa lưu
  return true;
}

/* ---------- Khung soạn thảo TinyMCE ---------- */
function khoiDongSoanThao() {
  if (!window.tinymce) { $("f-noidung").style.display = "block"; return; }   // mất mạng CDN thì dùng ô chữ thường
  tinymce.init({
    selector: "#f-noidung",
    license_key: "gpl",
    language: "vi",
    language_url: "https://cdn.jsdelivr.net/npm/tinymce-i18n@25.11.17/langs7/vi.js",
    menubar: false, branding: false, promotion: false, statusbar: true, elementpath: false,
    height: 560, min_height: 380, resize: true,
    plugins: "lists link image table autolink wordcount fullscreen code",
    toolbar: "blocks | bold italic underline | bullist numlist blockquote | alignleft aligncenter alignright | link image table hr | removeformat | code fullscreen",
    toolbar_mode: "wrap",
    block_formats: "Đoạn văn=p; Tiêu đề lớn=h2; Tiêu đề nhỏ=h3",
    // Canh lề bằng class chứ không bằng style, vì máy chủ bỏ mọi thuộc tính style
    formats: {
      alignleft: { selector: "p,h2,h3,li,td,th,img,figure", classes: "can-trai" },
      aligncenter: { selector: "p,h2,h3,li,td,th,img,figure", classes: "can-giua" },
      alignright: { selector: "p,h2,h3,li,td,th,img,figure", classes: "can-phai" },
      alignjustify: { selector: "p,li", classes: "can-deu" }
    },
    content_css: "/assets/styles.css",
    body_class: "noi-dung",
    // Bỏ lề trên của .noi-dung (dành cho trang bài) và lề đầu của dòng đầu tiên
    content_style: "body.noi-dung{background:#fff;margin:0!important;padding:16px 22px;max-width:760px}body.noi-dung>*:first-child{margin-top:0}",
    relative_urls: false, remove_script_host: true, convert_urls: true,
    link_default_target: "_blank", link_assume_external_targets: "https",
    image_dimensions: false, image_description: true, image_caption: true, image_advtab: false,
    automatic_uploads: true, paste_data_images: true,
    images_file_types: "jpg,jpeg,png,webp,gif",
    images_upload_handler: function (blobInfo) {
      var f = blobInfo.blob();
      var file = new File([f], blobInfo.filename() || "anh.jpg", { type: f.type || "image/jpeg" });
      return taiAnhLen(file);
    },
    setup: function (ed) {
      ed.on("input change undo redo SetContent", henLuuNhap);
      ed.on("init", function () {
        edReady = true;
        if (window._noiDungCho != null) { ed.setContent(window._noiDungCho); ed.undoManager.clear(); window._noiDungCho = null; }
        // TinyMCE chuẩn hóa lại HTML khi nạp; tính lại mốc "chưa sửa gì" cho khớp
        if (giaTriGoc) giaTriGoc = JSON.stringify(docForm());
      });
    }
  });
}

/* ---------- Khởi động phần bài viết (gọi từ admin.js sau khi đăng nhập) ---------- */
function khoiDongBaiViet() {
  ["f-tieude", "f-ngay", "f-khuvuc", "f-tomtat"].forEach(function (id) {
    var o = $(id); if (o) o.addEventListener("input", henLuuNhap);
  });
  document.querySelectorAll('input[name="f-loai"]').forEach(function (o) { o.addEventListener("change", henLuuNhap); });
  $("f-tieude").addEventListener("blur", function () {
    // Như WordPress: đường dẫn lấy theo tiêu đề cho tới khi bài được lưu lần đầu
    if (!editId && !$("f-slug").value) capNhatDuongDan();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") dongXemTruoc(); });
  khoiDongSoanThao();
  taiThongBao().then(function () {
    // Còn bài soạn dở từ lần trước thì mở lại ngay
    var cho = setInterval(function () {
      if (edReady || !window.tinymce) { clearInterval(cho); phucHoiNhap(); }
    }, 150);
    setTimeout(function () { clearInterval(cho); }, 8000);
  });
}
