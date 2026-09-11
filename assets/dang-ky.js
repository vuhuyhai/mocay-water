/* Gửi form Đăng ký lắp đặt đồng hồ nước qua Netlify Forms (AJAX).
   Netlify tự nhận diện form tĩnh (data-netlify) khi deploy; submission
   lưu ở dashboard Netlify > Forms > dang-ky-lap-dat (bật email báo nếu cần). */
function guiDangKy(e) {
  e.preventDefault();
  var form = e.target;
  var btn = form.querySelector('button[type=submit]');
  var result = document.getElementById('dangKyResult');
  var body = new URLSearchParams(new FormData(form)).toString();
  var oldLabel = btn.textContent;
  btn.disabled = true; btn.textContent = 'Đang gửi...';
  fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.style.display = 'none';
      result.innerHTML =
        '<div class="tc-msg" style="color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)">' +
        '<b>Đã gửi đăng ký thành công.</b> Công ty sẽ liên hệ khảo sát thực tế và báo chi phí trong thời gian sớm nhất. Cảm ơn quý khách.</div>';
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function (err) {
      btn.disabled = false; btn.textContent = oldLabel;
      result.innerHTML =
        '<div class="tc-msg tc-err">Gửi chưa được (' + err.message +
        '). Vui lòng thử lại, hoặc gọi hotline <b>(0275) 3843 993</b>.</div>';
    });
  return false;
}
window.guiDangKy = guiDangKy;

/* Form phan anh / bao su co o trang Lien he: gui len Netlify Forms nhu form dang ky. */
function guiPhanAnh(e) {
  e.preventDefault();
  var form = e.target;
  var btn = form.querySelector('button[type=submit]');
  var result = document.getElementById('phanAnhResult');
  var body = new URLSearchParams(new FormData(form)).toString();
  var oldLabel = btn.textContent;
  btn.disabled = true; btn.textContent = 'Đang gửi...';
  fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.style.display = 'none';
      result.innerHTML =
        '<div class="tc-msg" style="color:#0e9f6e;background:rgba(14,159,110,.08);border-color:rgba(14,159,110,.28)">' +
        '<b>Đã nhận yêu cầu của quý khách.</b> Công ty sẽ liên hệ lại theo số điện thoại đã ghi. Sự cố khẩn cấp xin gọi (0275) 3843 993.</div>';
      result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function (err) {
      btn.disabled = false; btn.textContent = oldLabel;
      result.innerHTML =
        '<div class="tc-msg tc-err">Gửi chưa được (' + err.message +
        '). Vui lòng thử lại, hoặc gọi <b>(0275) 3843 993</b>.</div>';
    });
  return false;
}
window.guiPhanAnh = guiPhanAnh;

/* Đổi giữa cá nhân và tổ chức: hiện hoặc ẩn các ô riêng của tổ chức. */
function doiLoaiKhach(loai) {
  var toChuc = loai === 'Tổ chức, doanh nghiệp';
  document.querySelectorAll('.to-chuc').forEach(function (o) {
    o.hidden = !toChuc;
    var input = o.querySelector('input');
    if (!input) return;
    // Người đại diện và Chức vụ bắt buộc với tổ chức, mã số thuế thì không
    if (input.id === 'dk-daidien' || input.id === 'dk-chucvu') input.required = toChuc;
    if (!toChuc) input.value = '';
  });
  document.getElementById('dk-ten-nhan').textContent = toChuc ? 'Tên cơ quan, doanh nghiệp *' : 'Họ tên chủ hộ *';
  document.getElementById('dk-ten').placeholder = toChuc ? 'Công ty TNHH ABC' : 'Nguyễn Văn A';
  document.getElementById('dk-thuongtru-nhan').textContent = toChuc ? 'Địa chỉ trụ sở *' : 'Địa chỉ thường trú *';
}

/* Tích vào ô trùng địa chỉ thì chép sang, bỏ tích thì cho nhập lại. */
function chepDiaChi(trung) {
  var tt = document.getElementById('dk-thuongtru');
  var ld = document.getElementById('dk-lapdat');
  if (trung) { ld.value = tt.value; ld.readOnly = true; ld.style.opacity = '.7'; }
  else { ld.readOnly = false; ld.style.opacity = ''; }
  nhacGiayTo();
}

/* Địa chỉ lắp khác địa chỉ thường trú thì nhắc mang thêm giấy tờ đất. */
function nhacGiayTo() {
  var tt = (document.getElementById('dk-thuongtru') || {}).value || '';
  var ld = (document.getElementById('dk-lapdat') || {}).value || '';
  var hop = document.getElementById('dk-nhac-giayto');
  if (!hop) return;
  var chuan = function (s) { return s.trim().toLowerCase().replace(/\s+/g, ' '); };
  hop.hidden = !(chuan(tt) && chuan(ld) && chuan(tt) !== chuan(ld));
}

document.addEventListener('DOMContentLoaded', function () {
  var tt = document.getElementById('dk-thuongtru');
  var ld = document.getElementById('dk-lapdat');
  if (!tt || !ld) return;
  tt.addEventListener('input', function () {
    if (document.getElementById('dk-trungdc').checked) ld.value = tt.value;
    nhacGiayTo();
  });
  ld.addEventListener('input', nhacGiayTo);
});

window.doiLoaiKhach = doiLoaiKhach;
window.chepDiaChi = chepDiaChi;
