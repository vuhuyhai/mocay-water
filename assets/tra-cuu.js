/* ============================================================
   Tra cứu hóa đơn tiền nước — Cấp Thoát Nước Mỏ Cày
   Bản DEMO: dữ liệu mẫu nhúng sẵn. Khi tích hợp thật, thay
   hàm layHoaDon() bằng lời gọi API hệ thống ghi thu của công ty.
   Biểu giá theo QĐ 42/2020/QĐ-UBND; VAT 5%; phí BVMT nước thải 10%.
   ============================================================ */

// === DỮ LIỆU MẪU (thay bằng API khi tích hợp) ===
const HOA_DON = {
  "MC-000001": { ten: "Nguyễn Văn An",        dc: "Ấp Phú Quới, xã Mỏ Cày", ky: "Tháng 07/2026", m3: 18, nhom: "sinh_hoat",  trangthai: "Chưa thanh toán" },
  "MC-000002": { ten: "Trần Thị Bình",         dc: "Xã Mỏ Cày",              ky: "Tháng 07/2026", m3: 12, nhom: "sinh_hoat",  trangthai: "Đã thanh toán"   },
  "MC-000003": { ten: "Hộ KD Lê Văn Cường",    dc: "Khu chợ Mỏ Cày",         ky: "Tháng 07/2026", m3: 40, nhom: "kinh_doanh", trangthai: "Chưa thanh toán" },
  "MC-000123": { ten: "Cơ sở SX Đại Phát",     dc: "Xã Mỏ Cày",              ky: "Tháng 07/2026", m3: 85, nhom: "san_xuat",   trangthai: "Chưa thanh toán" },
  "MC-000456": { ten: "UBND xã Mỏ Cày",        dc: "Xã Mỏ Cày",              ky: "Tháng 07/2026", m3: 30, nhom: "hanh_chinh", trangthai: "Đã thanh toán"   }
};

const NHOM_LABEL = {
  sinh_hoat:  "Sinh hoạt hộ dân",
  hanh_chinh: "Cơ quan hành chính, sự nghiệp",
  san_xuat:   "Sản xuất vật chất",
  kinh_doanh: "Kinh doanh, dịch vụ"
};

// Tính tiền nước theo nhóm (đồng), có bậc thang cho SX/KD
function tinhTienNuoc(m3, nhom) {
  if (nhom === "san_xuat")  return Math.min(m3, 15) * 9700 + Math.max(m3 - 15, 0) * 12000;
  if (nhom === "kinh_doanh") return Math.min(m3, 15) * 9700 + Math.max(m3 - 15, 0) * 13000;
  if (nhom === "hanh_chinh") return m3 * 11000;
  return m3 * 9700; // sinh hoạt
}

function dg(n) { return Math.round(n).toLocaleString("vi-VN"); }

// Thoát ký tự HTML để chống XSS khi ghép dữ liệu (mã KH người dùng nhập, tên KH từ API) vào innerHTML
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

// === Nguồn dữ liệu: ưu tiên API CityWork (qua Netlify Function); lỗi/chưa cấu hình -> dùng dữ liệu mẫu ===
function layHoaDon(ma) {             // demo (fallback)
  return HOA_DON[ma] || null;
}
// Địa chỉ dịch vụ tra cứu (trạm trung chuyển CityWork chạy trên máy chủ IP tĩnh).
// Chỉ cần đổi 1 dòng này khi chuyển sang tên miền chính thức (vd https://api.mocawaco.com/wp-json/mocay/v1/tra-cuu).
const API_TRA_CUU_URL = 'https://vuhai.info/wp-json/mocay/v1/tra-cuu';
async function layHoaDonAPI(ma) {    // proxy giữ token phía server
  const r = await fetch(API_TRA_CUU_URL + '?ma=' + encodeURIComponent(ma), { headers: { 'Accept': 'application/json' } });
  let data = {};
  try { data = await r.json(); } catch (e) {}
  return { status: r.status, data: data };   // data: { configured, found, rec } | { error }
}
// Che tên phía client (cho dữ liệu mẫu); idempotent với tên đã che từ server
function maskTen(name) {
  var s = (name == null ? "" : name).toString().trim().replace(/\s+/g, " ");
  if (!s) return "";
  var parts = s.split(" ");
  var last = parts[parts.length - 1].replace(/\*+$/, "");
  parts[parts.length - 1] = (last.charAt(0) || "") + "**";
  return parts.join(" ");
}
// Che địa chỉ: chỉ hiện cụm đầu (trước dấu phẩy) + "…" để không lộ vị trí chính xác.
function maskDiaChi(dc) {
  var s = (dc == null ? "" : dc).toString().trim().replace(/\s+/g, " ");
  if (!s) return "";
  var first = s.split(",")[0].trim();
  return s.indexOf(",") !== -1 ? first + ", …" : first;
}
function _khongThay(code) {
  return '<div class="tc-msg tc-err">Không tìm thấy mã khách hàng <b>' + esc(code) +
    '</b>. Kiểm tra lại mã in trên hóa đơn/hợp đồng.</div>';
}

async function traCuuHoaDon(rawCode, elResult) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    elResult.innerHTML = '<div class="tc-msg">Vui lòng nhập mã khách hàng.</div>';
    return;
  }
  elResult.innerHTML = '<div class="tc-msg">Đang tra cứu…</div>';
  let rec = null;
  try {
    const res = await layHoaDonAPI(code);
    if (res.status === 429) {
      elResult.innerHTML = '<div class="tc-msg tc-err">' + esc(res.data.error || "Bạn tra cứu quá nhanh, vui lòng thử lại sau ít phút.") + '</div>';
      return;
    }
    if (res.data && res.data.configured) {
      if (res.data.found && res.data.rec) { rec = res.data.rec; rec._api = true; }
      else { elResult.innerHTML = _khongThay(code); return; }
    }
  } catch (e) { /* mạng lỗi -> rơi xuống dùng dữ liệu mẫu */ }
  if (!rec) rec = layHoaDon(code);
  if (!rec) { elResult.innerHTML = _khongThay(code); return; }

  // Số tiền: ưu tiên số chính thức từ CityWork; dữ liệu mẫu thì tự tính theo bậc.
  const tienNuoc = rec._api ? (Number(rec.tienNuoc) || 0) : tinhTienNuoc(rec.m3, rec.nhom);
  const vat  = rec._api ? (Number(rec.vat)  || 0) : tienNuoc * 0.05;
  const bvmt = rec._api ? (Number(rec.bvmt) || 0) : tienNuoc * 0.10;
  const tong = rec._api ? (Number(rec.tong) || 0) : (tienNuoc + vat + bvmt);
  const paid = rec.trangthai === "Đã thanh toán";
  const mauTT = paid ? "#0e9f6e" : "var(--teal)";

  var html =
    '<div class="mk-result">' +
      '<div class="mk-row"><span>Khách hàng</span><b>' + esc(maskTen(rec.ten)) + '</b></div>' +
      (rec.dc ? '<div class="mk-row"><span>Địa chỉ</span><b>' + esc(maskDiaChi(rec.dc)) + '</b></div>' : '') +
      '<div class="mk-row"><span>Kỳ hóa đơn</span><b>' + esc(rec.ky) + '</b></div>' +
      '<div class="mk-row"><span>Nhóm sử dụng</span><b>' + esc(NHOM_LABEL[rec.nhom] || rec.nhom) + '</b></div>' +
      '<div class="mk-row"><span>Số tiêu thụ</span><b>' + (Number(rec.m3) || 0) + ' m³</b></div>' +
      '<div class="mk-row"><span>Tiền nước</span><b>' + dg(tienNuoc) + ' đ</b></div>' +
      '<div class="mk-row"><span>Thuế GTGT (5%)</span><b>' + dg(vat) + ' đ</b></div>' +
      '<div class="mk-row"><span>Phí BVMT nước thải (10%)</span><b>' + dg(bvmt) + ' đ</b></div>' +
      '<div class="mk-row"><span>Trạng thái</span><b style="color:' + mauTT + '">' + esc(rec.trangthai) + '</b></div>' +
      '<div class="mk-total"><span style="color:var(--muted)">Tổng phải trả</span><span class="big">' + dg(tong) + ' đ</span></div>' +
    '</div>';

  if (tong <= 0) {
    window.__lastBill = null;
    html += '<div class="tc-msg" style="margin-top:12px">Kỳ này chưa phát sinh tiền nước phải đóng.</div>';
  } else if (paid) {
    window.__lastBill = null;
    html += '<div class="tc-msg" style="margin-top:12px;color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)">' +
      'Hóa đơn kỳ này đã thanh toán. Cảm ơn quý khách.</div>';
  } else {
    window.__lastBill = { ma: code, ten: rec.ten, ky: rec.ky, tong: tong };
    html += '<button type="button" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:14px" ' +
      'onclick="moThanhToan()">Thanh toán ' + dg(tong) + ' đ →</button>' +
      '<div class="tc-note-pay">Bấm để hiện mã QR và thông tin chuyển khoản BIDV.</div>';
  }
  elResult.innerHTML = html;
}

/* ===== Thanh toán: QR VietQR + thông tin chuyển khoản ===== */
var NGAN_HANG = "BIDV CN Bến Tre - PGD Mỏ Cày";
var SO_TK = "7290023381";
var BIN_BIDV = "970418";

function _boDau(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}
function _copy(text, btn) {
  navigator.clipboard.writeText(text).then(function () {
    var t = btn.textContent; btn.textContent = "Đã chép"; setTimeout(function () { btn.textContent = t; }, 1400);
  }).catch(function () {});
}
function dongThanhToan() { var ov = document.getElementById("payOverlay"); if (ov) ov.classList.remove("open"); }

function _taoModal() {
  if (document.getElementById("payOverlay")) return;
  var ov = document.createElement("div");
  ov.id = "payOverlay"; ov.className = "pay-overlay";
  ov.addEventListener("click", function (e) { if (e.target === ov) dongThanhToan(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") dongThanhToan(); });
  ov.innerHTML =
    '<div class="pay-card">' +
      '<div class="pay-head"><h3>Thanh toán chuyển khoản</h3>' +
        '<button class="pay-close" onclick="dongThanhToan()" aria-label="Đóng">&times;</button></div>' +
      '<div class="pay-body">' +
        '<div class="pay-amount"><span class="lbl">Số tiền cần thanh toán</span><span class="big" id="payAmount"></span></div>' +
        '<img class="pay-qr" id="payQr" alt="Mã QR chuyển khoản VietQR">' +
        '<div class="pay-qr-note">Mở app ngân hàng → quét QR: tự điền số tài khoản, số tiền và nội dung.</div>' +
        '<div class="pay-info">' +
          '<div class="pay-row"><span class="k">Ngân hàng</span><span class="v" id="payBank"></span></div>' +
          '<div class="pay-row"><span class="k">Số tài khoản</span><span class="v"><span id="payAcc"></span>' +
            '<button class="pay-copy" onclick="_copy(document.getElementById(\'payAcc\').textContent,this)">Sao chép</button></span></div>' +
          '<div class="pay-row"><span class="k">Số tiền</span><span class="v" id="payAmount2"></span></div>' +
          '<div class="pay-row"><span class="k">Nội dung</span><span class="v"><span id="payDesc"></span>' +
            '<button class="pay-copy" onclick="_copy(document.getElementById(\'payDesc\').textContent,this)">Sao chép</button></span></div>' +
        '</div>' +
        '<div class="pay-note">Chuyển đúng nội dung để công ty đối soát nhanh. Giao dịch được ghi nhận trong giờ làm việc.</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
}

function moThanhToan() {
  var b = window.__lastBill; if (!b) return;
  _taoModal();
  var ky = (b.ky || "").replace("Tháng ", "T").replace(/\//g, "-"); // "T07-2026"
  // Nội dung CK = Mã KH + Kỳ (bỏ tên để không lộ thông tin cá nhân trong bộ nhớ giao dịch công khai;
  // công ty đối soát theo Mã KH + Kỳ). _boDau vẫn dùng cho các trường khác nếu cần.
  var noiDung = (b.ma + " " + ky).trim();
  var soTien = Math.round(b.tong);
  var qr = "https://img.vietqr.io/image/" + BIN_BIDV + "-" + SO_TK + "-compact2.png?amount=" + soTien +
    "&addInfo=" + encodeURIComponent(noiDung);
  document.getElementById("payAmount").textContent = dg(soTien) + " đ";
  document.getElementById("payAmount2").textContent = dg(soTien) + " đ";
  document.getElementById("payBank").textContent = NGAN_HANG;
  document.getElementById("payAcc").textContent = SO_TK;
  document.getElementById("payDesc").textContent = noiDung;
  document.getElementById("payQr").src = qr;
  document.getElementById("payOverlay").classList.add("open");
}
window.moThanhToan = moThanhToan;
window.dongThanhToan = dongThanhToan;
window._copy = _copy;

// Cho phép gọi từ input (Enter) và nút
window.traCuuHoaDon = traCuuHoaDon;
