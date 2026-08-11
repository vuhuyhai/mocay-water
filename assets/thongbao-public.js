/* Đọc thông báo từ Netlify Function và hiển thị lên trang công khai.
   - #tb-home  (trang chủ): thay 3 tin mới nhất nếu có (rỗng -> giữ ảnh tĩnh sẵn).
   - #tb-tintuc (trang Tin tức): hiện tất cả thông báo. */
(function () {
  var LOAI = {
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
  function card(x) {
    var loai = esc((LOAI[x.loai] || x.loai)).toUpperCase();
    var snip = x.noiDung ? esc(x.noiDung.slice(0, 130)) + (x.noiDung.length > 130 ? "…" : "") : "";
    return '<a class="card" href="tin-tuc.html">' +
      '<span style="color:var(--teal);font-size:12.5px;font-weight:700;letter-spacing:.03em">' + loai + '</span>' +
      '<h3 style="margin:8px 0 0;font-size:17px;line-height:1.4;color:var(--ink)">' + esc(x.tieuDe) + '</h3>' +
      (x.khuVuc ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">Khu vực: ' + esc(x.khuVuc) + '</p>' : "") +
      (snip ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">' + snip + '</p>' : "") +
      '<div style="color:var(--dim);font-size:13px;margin-top:12px">' + (x.ngay ? esc(x.ngay) : "Mới cập nhật") + '</div>' +
      '</a>';
  }
  function render(el, items) { el.innerHTML = items.map(card).join(""); }

  async function load() {
    var home = document.getElementById("tb-home");
    var full = document.getElementById("tb-tintuc");
    if (!home && !full) return;
    try {
      var r = await fetch("/.netlify/functions/thongbao", { headers: { "Accept": "application/json" } });
      var j = await r.json();
      var items = j.items || [];
      if (home && items.length) render(home, items.slice(0, 3));
      if (full) {
        if (items.length) render(full, items);
        else full.innerHTML = '<p class="note">Chưa có thông báo mới. Thông tin sẽ hiển thị tại đây khi công ty đăng.</p>';
      }
    } catch (e) { /* lỗi -> giữ nội dung tĩnh */ }
  }
  load();
})();
