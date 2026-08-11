/* Đọc thông báo từ Netlify Function và hiển thị lên trang công khai.
   - #tb-noibat (trang Tin tức): tin mới nhất = thẻ lớn nổi bật, còn lại xếp lưới.
   - #tb-home   (trang chủ): 3 tin mới nhất (nếu có; rỗng -> giữ ảnh tĩnh sẵn). */
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
  function loai(x) { return LOAI[x.loai] || x.loai; }
  function ngayTxt(x) { return x.ngay ? esc(x.ngay) : "Mới cập nhật"; }

  // Thẻ nhỏ (lưới + trang chủ)
  function card(x) {
    var snip = x.noiDung ? esc(x.noiDung.slice(0, 130)) + (x.noiDung.length > 130 ? "…" : "") : "";
    return '<a class="card" href="tin-tuc.html">' +
      '<span style="color:var(--teal);font-size:12.5px;font-weight:700;letter-spacing:.03em">' + esc(loai(x)).toUpperCase() + '</span>' +
      '<h3 style="margin:8px 0 0;font-size:17px;line-height:1.4;color:var(--ink)">' + esc(x.tieuDe) + '</h3>' +
      (x.khuVuc ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">Khu vực: ' + esc(x.khuVuc) + '</p>' : "") +
      (snip ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">' + snip + '</p>' : "") +
      '<div style="color:var(--dim);font-size:13px;margin-top:12px">' + ngayTxt(x) + '</div>' +
      '</a>';
  }

  // Thẻ lớn nổi bật (tin mới nhất)
  function heroCard(x) {
    return '<div class="tb-hero">' +
      '<span class="badge">' + esc(loai(x)) + '</span>' +
      '<h2 style="font-size:clamp(22px,3.2vw,32px);margin:12px 0 8px;color:var(--ink)">' + esc(x.tieuDe) + '</h2>' +
      (x.khuVuc ? '<p style="margin:0 0 6px;color:var(--muted)"><b>Khu vực ảnh hưởng:</b> ' + esc(x.khuVuc) + '</p>' : "") +
      (x.noiDung ? '<p class="lead" style="margin:6px 0 0;white-space:pre-wrap">' + esc(x.noiDung) + '</p>' : "") +
      '<div style="color:var(--dim);font-size:13px;margin-top:14px">' + (x.ngay ? "Ngày " + esc(x.ngay) : "Mới cập nhật") + '</div>' +
      '</div>';
  }

  function renderNoiBat(el, items) {
    var html = heroCard(items[0]);
    if (items.length > 1) {
      html += '<div class="grid-3" style="margin-top:18px">' + items.slice(1).map(card).join("") + '</div>';
    }
    el.innerHTML = html;
  }

  async function load() {
    var noibat = document.getElementById("tb-noibat");
    var home = document.getElementById("tb-home");
    if (!noibat && !home) return;
    try {
      var r = await fetch("/.netlify/functions/thongbao", { headers: { "Accept": "application/json" } });
      var j = await r.json();
      var items = j.items || [];
      if (home && items.length) home.innerHTML = items.slice(0, 3).map(card).join("");
      if (noibat) {
        if (items.length) renderNoiBat(noibat, items);
        else noibat.innerHTML = '<p class="note">Chưa có thông báo mới. Thông tin sẽ hiển thị tại đây khi công ty đăng.</p>';
      }
    } catch (e) {
      if (noibat) noibat.innerHTML = '<p class="note">Không tải được thông báo.</p>';
    }
  }
  load();
})();
