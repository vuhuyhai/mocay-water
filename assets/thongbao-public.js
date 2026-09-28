/* Đọc danh sách bài đã đăng từ Netlify Function và hiển thị công khai.
   - #tb-noibat (Tin tức): bài mới nhất là thẻ lớn nổi bật, còn lại xếp lưới.
   - #tb-home   (trang chủ): 3 bài mới nhất (chưa có bài thì giữ 3 thẻ tĩnh sẵn).
   Mỗi thẻ dẫn tới trang riêng của bài: /tin/<đường-dẫn-bài>.
   Danh sách chỉ có tóm tắt; toàn văn nằm ở trang riêng. */
(function () {
  var LOAI = {
    "tin-tuc": "Tin tức",
    "thong-bao": "Thông báo khách hàng",
    "lich-cup-nuoc": "Lịch cúp nước",
    "kiem-nghiem": "Kết quả kiểm nghiệm nước",
    "hoat-dong": "Hoạt động công ty",
    "dau-thau": "Chào hàng, đấu thầu"
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function loai(x) { return LOAI[x.loai] || x.loai || "Tin tức"; }
  function lienKet(x) { return "/tin/" + encodeURIComponent(x.slug || x.id); }
  function ngayTxt(x) {
    if (x.ngay) return x.ngay;
    if (!x.ts) return "";
    var d = new Date(x.ts);
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }

  // Thẻ lớn nổi bật (bài mới nhất)
  function heroCard(x) {
    return '<div class="tb-hero">' +
      (x.anhBia ? '<a href="' + lienKet(x) + '" style="display:block;border-radius:12px;overflow:hidden;margin-bottom:16px;max-height:380px"><img src="' + esc(x.anhBia) + '" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></a>' : "") +
      '<span class="badge">' + esc(loai(x)) + '</span>' +
      '<h2 style="font-size:clamp(22px,3.2vw,32px);margin:12px 0 8px"><a href="' + lienKet(x) + '" style="color:var(--ink)">' + esc(x.tieuDe) + '</a></h2>' +
      (x.khuVuc ? '<p style="margin:0 0 6px;color:var(--muted)"><b>Khu vực ảnh hưởng:</b> ' + esc(x.khuVuc) + '</p>' : "") +
      (x.tomTat ? '<p class="lead" style="margin:6px 0 0">' + esc(x.tomTat) + '</p>' : "") +
      '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:16px">' +
        '<a class="btn btn-primary" href="' + lienKet(x) + '" style="padding:10px 18px">Đọc toàn bài →</a>' +
        '<span style="color:var(--dim);font-size:13px">' + (ngayTxt(x) ? "Ngày " + esc(ngayTxt(x)) : "") + '</span>' +
      '</div>' +
      '</div>';
  }

  // Thẻ nhỏ (lưới + trang chủ)
  function card(x) {
    var snip = x.tomTat || "";
    if (snip.length > 130) snip = snip.slice(0, 130) + "…";
    return '<a class="card" href="' + lienKet(x) + '" style="display:flex;flex-direction:column">' +
      (x.anhBia ? '<div style="border-radius:10px;overflow:hidden;aspect-ratio:16/9;margin-bottom:12px;background:var(--surface-2)"><img src="' + esc(x.anhBia) + '" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>' : "") +
      '<span style="color:var(--teal);font-size:12.5px;font-weight:700;letter-spacing:.03em">' + esc(loai(x)).toUpperCase() + '</span>' +
      '<h3 style="margin:8px 0 0;font-size:17px;line-height:1.4;color:var(--ink)">' + esc(x.tieuDe) + '</h3>' +
      (x.khuVuc ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">Khu vực: ' + esc(x.khuVuc) + '</p>' : "") +
      (snip ? '<p style="margin:8px 0 0;color:var(--muted);font-size:14px">' + esc(snip) + '</p>' : "") +
      '<div style="color:var(--dim);font-size:13px;margin-top:12px">' + esc(ngayTxt(x)) + '</div>' +
      '</a>';
  }

  function renderNoiBat(el, items) {
    var html = heroCard(items[0]);
    if (items.length > 1) html += '<div class="grid-3" style="margin-top:18px">' + items.slice(1).map(card).join("") + '</div>';
    el.innerHTML = html;
  }

  // Ẩn hoặc hiện cả section bọc ngoài (không chỉ phần ruột).
  function hienKhoi(el, hien) {
    var sec = el.closest ? el.closest("section") : null;
    if (sec) sec.hidden = !hien;
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
        // Chưa có bài thì ẩn hẳn cả khối, để bài viết chuyên sâu nằm ngay dưới hero.
        if (items.length) { renderNoiBat(noibat, items); hienKhoi(noibat, true); }
        else hienKhoi(noibat, false);
      }
    } catch (e) {
      if (noibat) hienKhoi(noibat, false);
    }
  }
  load();
})();
