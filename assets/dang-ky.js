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
