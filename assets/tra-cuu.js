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

// Điểm thay thế khi tích hợp thật: gọi API và trả về bản ghi hoặc null
function layHoaDon(ma) {
  return HOA_DON[ma] || null;
}

function traCuuHoaDon(rawCode, elResult) {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) {
    elResult.innerHTML = '<div class="tc-msg">Vui lòng nhập mã khách hàng.</div>';
    return;
  }
  const rec = layHoaDon(code);
  if (!rec) {
    elResult.innerHTML = '<div class="tc-msg tc-err">Không tìm thấy mã khách hàng <b>' + code +
      '</b>. Kiểm tra lại mã in trên hóa đơn/hợp đồng.</div>';
    return;
  }
  const tienNuoc = tinhTienNuoc(rec.m3, rec.nhom);
  const vat  = tienNuoc * 0.05;
  const bvmt = tienNuoc * 0.10;
  const tong = tienNuoc + vat + bvmt;
  const paid = rec.trangthai === "Đã thanh toán";
  const mauTT = paid ? "#0e9f6e" : "var(--teal)";

  var html =
    '<div class="mk-result">' +
      '<div class="mk-row"><span>Khách hàng</span><b>' + rec.ten + '</b></div>' +
      '<div class="mk-row"><span>Kỳ hóa đơn</span><b>' + rec.ky + '</b></div>' +
      '<div class="mk-row"><span>Nhóm sử dụng</span><b>' + (NHOM_LABEL[rec.nhom] || rec.nhom) + '</b></div>' +
      '<div class="mk-row"><span>Số tiêu thụ</span><b>' + rec.m3 + ' m³</b></div>' +
      '<div class="mk-row"><span>Tiền nước</span><b>' + dg(tienNuoc) + ' đ</b></div>' +
      '<div class="mk-row"><span>Thuế GTGT (5%)</span><b>' + dg(vat) + ' đ</b></div>' +
      '<div class="mk-row"><span>Phí BVMT nước thải (10%)</span><b>' + dg(bvmt) + ' đ</b></div>' +
      '<div class="mk-row"><span>Trạng thái</span><b style="color:' + mauTT + '">' + rec.trangthai + '</b></div>' +
      '<div class="mk-total"><span style="color:var(--muted)">Tổng phải trả</span><span class="big">' + dg(tong) + ' đ</span></div>' +
    '</div>';

  if (paid) {
    html += '<div class="tc-msg" style="margin-top:12px;color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)">' +
      'Hóa đơn kỳ này đã thanh toán. Cảm ơn quý khách.</div>';
  } else {
    html += '<a class="btn btn-primary" href="dich-vu-khach-hang.html#thanh-toan" ' +
      'style="width:100%;justify-content:center;margin-top:14px">Thanh toán ' + dg(tong) + ' đ →</a>' +
      '<div class="tc-note-pay">Chọn cổng thanh toán ở bước tiếp theo. (Bản demo dẫn tới danh sách cổng; khi tích hợp sẽ chuyển thẳng sang VNPAY/MoMo kèm số tiền.)</div>';
  }
  elResult.innerHTML = html;
}

// Cho phép gọi từ input (Enter) và nút
window.traCuuHoaDon = traCuuHoaDon;
