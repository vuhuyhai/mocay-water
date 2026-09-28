/* Trang đọc từng bài viết: /tin/<đường-dẫn-bài>, và sơ đồ bài /sitemap-tin.xml.
   Dựng HTML ngay trên máy chủ (không phải JavaScript trong trình duyệt) để Zalo,
   Facebook, Google đọc được tiêu đề, mô tả và ảnh chia sẻ của từng bài.
   Thanh điều hướng và chân trang lấy từ tin-tuc.html nên luôn khớp với site. */
import { getStore } from "@netlify/blobs";

export const config = { path: ["/tin/:slug", "/sitemap-tin.xml"] };

const TEN_LOAI = {
  "tin-tuc": "Tin tức", "thong-bao": "Thông báo khách hàng", "lich-cup-nuoc": "Lịch cúp nước",
  "kiem-nghiem": "Kết quả kiểm nghiệm nước", "hoat-dong": "Hoạt động công ty", "dau-thau": "Chào hàng, đấu thầu"
};
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const chuTron = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

async function docBai() {
  const d = await getStore("site-data").get("thongbao", { type: "json" });
  return (Array.isArray(d) ? d : []).map((x) => { if (!x.slug) x.slug = x.id; if (!x.trangThai) x.trangThai = "dang"; return x; })
    .filter((x) => x.trangThai !== "nhap")
    .sort((a, b) => (b.tsDang || b.ts || 0) - (a.tsDang || a.ts || 0));
}

/* Khung trang lấy từ tin-tuc.html, giữ trong bộ nhớ 10 phút */
let khung = null, khungLuc = 0;
async function layKhung(goc) {
  if (khung && Date.now() - khungLuc < 600000) return khung;
  try {
    const h = await (await fetch(goc + "/tin-tuc.html")).text();
    const nav = h.slice(h.indexOf('<nav class="nav">'), h.indexOf("</nav>") + 6);
    const footer = h.slice(h.indexOf('<footer class="footer">'), h.indexOf("</footer>") + 9);
    if (nav.length > 20 && footer.length > 20) { khung = { nav, footer }; khungLuc = Date.now(); return khung; }
  } catch (e) { console.error("lay khung", e && e.message); }
  return {
    nav: '<nav class="nav"><div class="nav-inner"><a class="logo" href="index.html"><span class="mark"><img src="assets/logo-mo-cay.png" alt="Logo"></span><span>Cấp Thoát Nước Mỏ Cày</span></a><div class="nav-links"><a href="tin-tuc.html">Tin tức</a></div></div></nav>',
    footer: '<footer class="footer"><div class="container"><p>Công ty TNHH Cấp Thoát Nước Mỏ Cày</p></div></footer>'
  };
}

function ngayHien(x) {
  if (x.ngay) return x.ngay;
  const t = x.tsDang || x.ts; if (!t) return "";
  const d = new Date(t + 7 * 3600 * 1000);
  return ("0" + d.getUTCDate()).slice(-2) + "/" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "/" + d.getUTCFullYear();
}
const tuyetDoi = (goc, u) => !u ? "" : /^https?:\/\//i.test(u) ? u : goc + (u.startsWith("/") ? u : "/" + u);

/* Kiểu trình bày bài nằm trong assets/styles.css (khối .bai và .noi-dung) */

function trang({ goc, tieuDe, moTa, anh, url, jsonld, than, k, status = 200 }) {
  const html = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="/">
<title>${esc(tieuDe)} · Công ty Cấp Thoát Nước Mỏ Cày</title>
<meta name="description" content="${esc(moTa)}">
${url ? `<link rel="canonical" href="${esc(url)}">` : '<meta name="robots" content="noindex">'}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Công ty TNHH Cấp Thoát Nước Mỏ Cày">
<meta property="og:title" content="${esc(tieuDe)}">
<meta property="og:description" content="${esc(moTa)}">
${url ? `<meta property="og:url" content="${esc(url)}">` : ""}
<meta property="og:image" content="${esc(anh)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="/assets/logo-mo-cay.png">
<link rel="stylesheet" href="/assets/styles.css">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : ""}
</head>
<body>
${k.nav}
${than}
${k.footer}
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      // CDN giữ 60 giây: sửa bài xong, tối đa một phút sau trang mới cập nhật
      "Netlify-CDN-Cache-Control": "public, durable, s-maxage=60, stale-while-revalidate=300"
    }
  });
}

function theNho(x) {
  return `<a class="card" href="/tin/${esc(x.slug)}" style="display:flex;flex-direction:column">` +
    (x.anhBia ? `<div style="border-radius:10px;overflow:hidden;aspect-ratio:16/9;margin-bottom:12px;background:var(--surface-2)"><img src="${esc(x.anhBia)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div>` : "") +
    `<span style="color:var(--teal);font-size:12.5px;font-weight:700;letter-spacing:.03em">${esc((TEN_LOAI[x.loai] || x.loai || "").toUpperCase())}</span>` +
    `<h3 style="margin:8px 0 0;font-size:17px;line-height:1.4;color:var(--ink)">${esc(x.tieuDe)}</h3>` +
    `<div style="color:var(--dim);font-size:13px;margin-top:10px">${esc(ngayHien(x))}</div></a>`;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const goc = url.origin;

  try {
    const list = await docBai();

    // Sơ đồ bài cho công cụ tìm kiếm
    if (url.pathname === "/sitemap-tin.xml") {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        list.map((x) => `  <url><loc>${goc}/tin/${esc(x.slug)}</loc><lastmod>${new Date(x.tsSua || x.ts || Date.now()).toISOString().slice(0, 10)}</lastmod></url>`).join("\n") +
        "\n</urlset>\n";
      return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Netlify-CDN-Cache-Control": "public, s-maxage=300" } });
    }

    const k = await layKhung(goc);
    const slug = decodeURIComponent((context.params && context.params.slug) || "");
    const x = list.find((i) => i.slug === slug);

    if (!x) {
      return trang({
        goc, tieuDe: "Không tìm thấy bài viết", moTa: "Bài viết không có hoặc đã được gỡ.",
        anh: goc + "/assets/og-mocaywaco.jpg", url: "", k, status: 404,
        than: `<header class="page-hero glow"><div class="container"><div class="crumb"><a href="index.html">Trang chủ</a> / <a href="tin-tuc.html">Tin tức</a></div>
<h1>Không tìm thấy bài viết.</h1><p class="lead">Bài có thể đã được gỡ hoặc đường link bị gõ sai.</p>
<div class="hero-actions"><a class="btn btn-primary" href="tin-tuc.html">Xem tất cả tin tức →</a></div></div></header>`
      });
    }

    const trangUrl = goc + "/tin/" + x.slug;
    const moTa = (x.tomTat || chuTron(x.noiDungHtml)).slice(0, 180);
    const anh = tuyetDoi(goc, x.anhBia) || goc + "/assets/og-mocaywaco.jpg";
    const loai = TEN_LOAI[x.loai] || x.loai || "Tin tức";
    const ngay = ngayHien(x);
    const khac = list.filter((i) => i.id !== x.id).slice(0, 3);

    const jsonld = {
      "@context": "https://schema.org", "@type": "NewsArticle",
      headline: x.tieuDe, description: moTa, image: [anh], mainEntityOfPage: trangUrl,
      datePublished: new Date(x.tsDang || x.ts || Date.now()).toISOString(),
      dateModified: new Date(x.tsSua || x.ts || Date.now()).toISOString(),
      author: { "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày" },
      publisher: { "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày",
        logo: { "@type": "ImageObject", url: goc + "/assets/logo-mo-cay.png" } }
    };

    const than = `
<header class="page-hero glow"><div class="container"><div class="bai">
  <div class="crumb"><a href="index.html">Trang chủ</a> / <a href="tin-tuc.html">Tin tức</a>${x.loai && x.loai !== "tin-tuc" ? ` / <span>${esc(loai)}</span>` : ""}</div>
  <span class="badge">${esc(loai)}</span>
  <h1 style="font-size:clamp(28px,4.4vw,44px);margin:14px 0 8px">${esc(x.tieuDe)}</h1>
  <div class="meta">${ngay ? `<span>Ngày ${esc(ngay)}</span>` : ""}<span>Công ty TNHH Cấp Thoát Nước Mỏ Cày</span></div>
</div></div></header>

<section class="section" style="padding-top:34px"><div class="container"><article class="bai">
  ${x.khuVuc ? `<div class="khu"><b>Khu vực ảnh hưởng:</b> ${esc(x.khuVuc)}</div>` : ""}
  ${x.anhBia ? `<figure class="bia"><img src="${esc(x.anhBia)}" alt="${esc(x.tieuDe)}"></figure>` : ""}
  <div class="noi-dung">${x.noiDungHtml || ""}</div>
  <div class="chia-se">
    <button type="button" class="btn btn-primary" id="nutChiaSe" style="padding:10px 18px">Chia sẻ bài này</button>
    <a class="btn btn-ghost" style="padding:10px 18px" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trangUrl)}">Facebook ↗</a>
    <a class="btn btn-ghost" style="padding:10px 18px" href="tin-tuc.html">← Tất cả tin tức</a>
  </div>
</article></div></section>
${khac.length ? `<section class="section alt"><div class="container lien-quan">
  <div class="sh"><span class="badge">Đọc thêm</span><h2 style="font-size:clamp(22px,3vw,30px)">Tin khác của công ty.</h2></div>
  <div class="grid-3">${khac.map(theNho).join("")}</div>
</div></section>` : ""}
<script>
(function(){var b=document.getElementById("nutChiaSe");if(!b)return;
var u=${JSON.stringify(trangUrl)},t=${JSON.stringify(x.tieuDe)};
b.addEventListener("click",function(){
 if(navigator.share){navigator.share({title:t,url:u}).catch(function(){});return;}
 var xong=function(){b.textContent="Đã chép đường link";setTimeout(function(){b.textContent="Chia sẻ bài này"},2500)};
 if(navigator.clipboard){navigator.clipboard.writeText(u).then(xong,function(){prompt("Chép đường link:",u)})}else{prompt("Chép đường link:",u)}
});})();
</script>`;
    return trang({ goc, tieuDe: x.tieuDe, moTa, anh, url: trangUrl, jsonld, than, k });
  } catch (e) {
    console.error("bai", e && e.message);
    return new Response("Lỗi máy chủ, vui lòng thử lại.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
};
