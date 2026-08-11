/* Đọc thông báo/bài viết từ Netlify Function và hiển thị công khai.
   - #tb-noibat (Tin tức): tin mới nhất = thẻ lớn nổi bật (ảnh bìa + nội dung định dạng), còn lại xếp lưới.
   - #tb-home   (trang chủ): 3 tin mới nhất (nếu có; rỗng -> giữ ảnh tĩnh sẵn).
   Nội dung HTML đã được lọc an toàn phía máy chủ. */
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
  function stripTags(html) { var d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").replace(/\s+/g, " ").trim(); }
  function loai(x) { return LOAI[x.loai] || x.loai; }
  function ngayTxt(x) { return x.ngay ? esc(x.ngay) : "Mới cập nhật"; }

  function bodyHtml(x) {
    if (x.noiDungHtml) return '<div class="prose" style="max-width:none;margin-top:8px">' + x.noiDungHtml + '</div>';
    if (x.noiDung) return '<p class="lead" style="margin:6px 0 0;white-space:pre-wrap">' + esc(x.noiDung) + '</p>';
    return "";
  }

  // Thẻ lớn nổi bật (tin mới nhất)
  function heroCard(x) {
    return '<div class="tb-hero">' +
      (x.anhBia ? '<div style="border-radius:12px;overflow:hidden;margin-bottom:16px;max-height:360px"><img src="' + esc(x.anhBia) + '" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>' : "") +
      '<span class="badge">' + esc(loai(x)) + '</span>' +
      '<h2 style="font-size:clamp(22px,3.2vw,32px);margin:12px 0 8px;color:var(--ink)">' + esc(x.tieuDe) + '</h2>' +
      (x.khuVuc ? '<p style="margin:0 0 6px;color:var(--muted)"><b>Khu vực ảnh hưởng:</b> ' + esc(x.khuVuc) + '</p>' : "") +
      bodyHtml(x) +
      '<div style="color:var(--dim);font-size:13px;margin-top:14px">' + (x.ngay ? "Ngày " + esc(x.ngay) : "Mới cập nhật") + '</div>' +
      '</div>';
  }

  // Thẻ nhỏ (lưới + trang chủ)
  function card(x) {
    var snip = stripTags(x.noiDungHtml || x.noiDung || "");
    if (snip.length > 130) snip = snip.slice(0, 130) + "…";
    return '<a class="card" href="tin-tuc.html" style="display:flex;flex-direction:column">' +
      (x.anhBia ? '<div style="border-radius:10px;overflow:hidden;aspect-ratio:16/9;margin-bottom:12px"><img src="' + esc(x.anhBia) + '" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>' : "") +
      '<span style="color:var(--teal);font-size:12.5px;font-weight:700;letter-spacing:.03em">' + esc(loai(x)).toUpperCase() + '</span>' +
      '<h3 style="margin:8px 0 0;font-size:17px;line-height:1.4;color:var(--ink)">' + esc(x.tieuDe) + '</h3>' +
      (x.khuVuc ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">Khu vực: ' + esc(x.khuVuc) + '</p>' : "") +
      (snip ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">' + esc(snip) + '</p>' : "") +
      '<div style="color:var(--dim);font-size:13px;margin-top:12px">' + ngayTxt(x) + '</div>' +
      '</a>';
  }

  function renderNoiBat(el, items) {
    var html = heroCard(items[0]);
    if (items.length > 1) html += '<div class="grid-3" style="margin-top:18px">' + items.slice(1).map(card).join("") + '</div>';
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
