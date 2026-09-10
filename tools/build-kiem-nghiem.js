/* Dựng mục Chất lượng nước từ tools/kiem-nghiem-data.js
   Chạy tại thư mục gốc website:  node tools/build-kiem-nghiem.js
   Sinh ra: chat-luong-nuoc/index.html và chat-luong-nuoc/<slug>.html cho từng kỳ. */
const fs = require("fs");
const path = require("path");
const { KY } = require("./kiem-nghiem-data.js");

const ROOT = path.resolve(__dirname, "..");
const TPL = path.join(ROOT, "huong-dan/tra-cuu-tien-nuoc-mo-cay.html");
const BASE = "https://mocaywaco.com/chat-luong-nuoc/";

const tpl = fs.readFileSync(TPL, "utf8");
const lay = (a, b) => { const i = tpl.indexOf(a), j = tpl.indexOf(b, i); return tpl.slice(i, j + b.length); };
const STYLE = lay("<style>", "</style>");
const FOOTER = lay('<footer class="footer">', "</div></footer>").replace(/href="index\.html"/g, 'href="../huong-dan/"');

const NAV = `<nav class="nav"><div class="nav-inner">
  <a class="logo" href="../index.html">
    <span class="mark"><img src="../assets/logo-mo-cay.png" alt="Logo Công ty Cấp Thoát Nước Mỏ Cày"></span>
    <span>Cấp Thoát Nước Mỏ Cày<small>Nước sạch · Mỏ Cày</small></span>
  </a>
  <div class="nav-links" id="navlinks">
    <a href="../gioi-thieu.html">Giới thiệu</a>
    <a href="../cap-nuoc.html">Cấp nước</a>
    <a href="../huong-dan/">Hướng dẫn</a>
    <a href="../tin-tuc.html">Tin tức</a>
    <a href="../lien-he.html">Liên hệ</a>
    <div class="m-cta"><a href="../dich-vu-khach-hang.html#tra-cuu">Tra cứu tiền nước →</a></div>
  </div>
  <div class="nav-cta">
    <a class="login" href="../dich-vu-khach-hang.html">Đăng nhập</a>
    <a class="btn btn-white" href="../dich-vu-khach-hang.html#tra-cuu">Tra cứu tiền nước →</a>
    <button class="nav-toggle" aria-label="Menu" onclick="document.getElementById('navlinks').classList.toggle('open')">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</div></nav>`;

const CSS_THEM = `
  .verdict{background:linear-gradient(135deg,#e7f6ee,#f2fbf6);border:1px solid #9fd9bb;border-radius:16px;padding:26px 28px;margin:26px 0}
  .verdict .tick{display:inline-flex;align-items:center;gap:9px;color:#12724a;font-weight:800;font-size:19px;line-height:1.3}
  .verdict p{margin:12px 0 0;color:#245c44}
  .verdict .quote{border-left:3px solid #9fd9bb;padding-left:14px;margin-top:14px;font-style:italic}
  .meta-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;margin:22px 0}
  .meta-grid div{padding:12px 16px;border-bottom:1px solid var(--border-soft);font-size:14.5px}
  .meta-grid div:nth-child(odd){background:var(--surface-2);color:var(--muted);font-weight:600}
  .meta-grid div:nth-child(even){color:var(--ink)}
  @media(max-width:620px){.meta-grid{grid-template-columns:1fr}
    .meta-grid div:nth-child(even){padding-top:0}}
  .dat{color:#12724a;font-weight:700;white-space:nowrap}
  .kn-nam{margin-top:34px}
  .kn-nam h2{font-size:clamp(20px,2.6vw,25px);margin:0 0 14px;color:var(--ink)}
  .kn-list{display:grid;gap:14px}
  .kn-item{display:flex;gap:18px;align-items:center;justify-content:space-between;background:var(--surface);
    border:1px solid var(--border);border-radius:14px;padding:18px 22px;box-shadow:var(--sh-sm);transition:.2s;color:var(--text)}
  a.kn-item:hover{border-color:var(--teal-line);transform:translateY(-2px);box-shadow:var(--sh)}
  .kn-item h3{margin:0 0 4px;font-size:17.5px;color:var(--ink)}
  .kn-item p{margin:0;color:var(--muted);font-size:14.5px}
  .kn-item .pill{flex:none;background:#e7f6ee;color:#12724a;border:1px solid #9fd9bb;border-radius:999px;
    padding:6px 14px;font-size:13px;font-weight:700;white-space:nowrap}
  .kn-loai{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
    color:var(--teal);background:var(--teal-dim);border-radius:999px;padding:3px 10px;margin-bottom:7px}
  @media(max-width:620px){.kn-item{flex-direction:column;align-items:flex-start;gap:10px}}
`;

const tenLoai = k => k.loai === "day-du" ? "Phiếu đầy đủ" : "Phiếu định kỳ";
const demChiTieu = k => k.phieu.reduce((n, p) => n + p.nhom.reduce((m, g) => m + g[1].length, 0), 0);

function khung(p) {
  const bc = [
    { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://mocaywaco.com/" },
    { "@type": "ListItem", position: 2, name: "Chất lượng nước", item: BASE }
  ];
  if (p.crumb3) bc.push({ "@type": "ListItem", position: 3, name: p.crumb3 });
  const graph = [p.main, { "@type": "BreadcrumbList", itemListElement: bc }].concat(p.them || []);
  const wrap = p.hepy ? "art" : "container";

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${p.desc}">
<link rel="canonical" href="${p.url}">
<meta property="og:type" content="${p.ogType || "website"}">
<meta property="og:title" content="${p.ogTitle || p.h1}">
<meta property="og:description" content="${p.desc}">
<meta property="og:url" content="${p.url}">
<meta property="og:image" content="https://mocaywaco.com/assets/logo-mo-cay.png">
<meta property="og:site_name" content="Công ty TNHH Cấp Thoát Nước Mỏ Cày">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="../assets/logo-mo-cay.png">
<link rel="stylesheet" href="../assets/styles.css">
${STYLE.replace("</style>", CSS_THEM + "</style>")}
<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}
</script>
</head>
<body>

${NAV}

<header class="page-hero glow"><div class="${wrap}">
  <div class="crumb"><a href="../index.html">Trang chủ</a> / ${p.crumb3 ? '<a href="index.html">Chất lượng nước</a> / <span>' + p.crumb3 + "</span>" : "<span>Chất lượng nước</span>"}</div>
  <span class="badge">${p.badge}</span>
  <h1>${p.h1}</h1>
  <p class="lead">${p.lead}</p>
</div></header>

<section class="section"><div class="${wrap}">
${p.body}
</div></section>

${FOOTER}

</body>
</html>
`;
}

/* ---------------- Trang chi tiết một kỳ ---------------- */
function bangNhom(nhom) {
  return nhom.map(([ten, rows]) =>
    "<h3>" + ten + "</h3>\n<table>\n" +
    '  <thead><tr><th>Chỉ tiêu</th><th>Giới hạn cho phép</th><th>Kết quả</th><th>Đơn vị</th><th>Đánh giá</th></tr></thead>\n  <tbody>\n' +
    rows.map(r => "    <tr><td>" + r[0] + "</td><td>" + r[1] + "</td><td><b>" + r[2] + "</b></td><td>" +
      (r[3] || "/") + '</td><td class="dat">Đạt</td></tr>').join("\n") +
    "\n  </tbody>\n</table>"
  ).join("\n\n");
}

function trangKy(k) {
  const daChep = demChiTieu(k);
  const conLai = k.chepDu ? 0 : k.soChiTieu - daChep;
  const nhieuDiem = k.phieu.length > 1;
  const pdfRel = "../tai-lieu/kiem-nghiem/" + k.pdf;
  const pdfAbs = "https://mocaywaco.com/tai-lieu/kiem-nghiem/" + k.pdf;
  const diemList = k.phieu.map(p => p.diem).join(", ");

  const khoiPhieu = k.phieu.map((p, i) => {
    const tieuDe = nhieuDiem
      ? '<h2 id="diem-' + (i + 1) + '">Điểm lấy mẫu ' + (i + 1) + ": " + p.diem + "</h2>"
      : '<h2 id="so-lieu">Số liệu từng chỉ tiêu</h2>';
    const phu = nhieuDiem
      ? "<p>Mã số mẫu " + p.maMau + ", lượng mẫu " + p.luongMau + ", " + p.diaChi + ".</p>"
      : "<p>Bảng dưới chép lại " + daChep + " chỉ tiêu có con số đo được hoặc bà con hay nghe nhắc tới. Cột giới hạn cho phép là ngưỡng tối đa mà " +
        k.quyChuan + " cho phép, cột kết quả là con số đo thật của mẫu nước Mỏ Cày.</p>";
    return tieuDe + "\n" + phu + "\n" + bangNhom(p.nhom);
  }).join("\n\n");

  const dongNgayKy = k.ngayKy ? "\n  <div>Ngày ký phiếu</div><div>" + k.ngayKy + "</div>" : "";
  const mucNhieuDiem = nhieuDiem
    ? '\n<h2 id="so-lieu">Số liệu từng điểm lấy mẫu</h2>\n<p>Công ty lấy mẫu ở ' + k.phieu.length +
      " điểm: tại nhà máy và trên mạng lưới cấp nước. Lấy thêm mẫu trên mạng lưới để kiểm tra nước có giữ được chất lượng trên đường ống tới nhà bà con hay không.</p>\n"
    : "";
  const hopConLai = conLai > 0
    ? '\n<div class="callout"><b>' + conLai + ' chỉ tiêu còn lại đều là "Không phát hiện".</b> ' + k.conLai + " Chi tiết từng chỉ tiêu xem trong phiếu gốc.</div>"
    : "";

  return khung({
    hepy: true,
    url: BASE + k.slug + ".html",
    ogType: "article",
    title: "Kết quả kiểm nghiệm nước Mỏ Cày " + k.nhan.toLowerCase() + ": đạt " + k.quyChuan,
    desc: "Phiếu kết quả kiểm nghiệm nước sạch Mỏ Cày " + k.nhan.toLowerCase() + " do " + k.donViNgan +
      " thực hiện. Toàn bộ " + k.soChiTieu + " chỉ tiêu đạt " + k.quyChuan + ". Xem số liệu và tải phiếu gốc.",
    ogTitle: "Kết quả kiểm nghiệm nước Mỏ Cày " + k.nhan.toLowerCase(),
    crumb3: k.nhan,
    badge: "Kết quả kiểm nghiệm",
    h1: "Kết quả kiểm nghiệm nước sạch " + k.nhan.toLowerCase(),
    lead: "Mẫu " + k.tenMau.toLowerCase() + " lấy ngày " + k.ngayLay +
      (nhieuDiem ? " tại " + k.phieu.length + " điểm: " + diemList : " tại " + k.phieu[0].diem) +
      ", do " + k.donViNgan + " thực hiện.",
    main: {
      "@type": "Article",
      headline: "Kết quả kiểm nghiệm nước sạch Mỏ Cày " + k.nhan.toLowerCase(),
      description: "Toàn bộ " + k.soChiTieu + " chỉ tiêu kiểm nghiệm đạt " + k.quyChuan + ".",
      inLanguage: "vi-VN",
      datePublished: k.ngayDang,
      dateModified: k.ngayDang,
      image: "https://mocaywaco.com/assets/logo-mo-cay.png",
      mainEntityOfPage: BASE + k.slug + ".html",
      author: { "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày", url: "https://mocaywaco.com/" },
      publisher: {
        "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày",
        logo: { "@type": "ImageObject", url: "https://mocaywaco.com/assets/logo-mo-cay.png" }
      }
    },
    them: [{
      "@type": "Dataset",
      name: "Kết quả kiểm nghiệm nước sạch Mỏ Cày " + k.nhan.toLowerCase(),
      description: "Kết quả " + k.soChiTieu + " chỉ tiêu chất lượng nước sạch, mẫu " + k.tenMau.toLowerCase() +
        " lấy ngày " + k.ngayLay + " tại " + diemList + ", kiểm nghiệm bởi " + k.donViNgan + ".",
      inLanguage: "vi-VN",
      datePublished: k.ngayKyISO,
      license: BASE,
      creator: { "@type": "Organization", name: k.donViNgan },
      publisher: { "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày", url: "https://mocaywaco.com/" },
      spatialCoverage: { "@type": "Place", name: "Mỏ Cày, tỉnh Vĩnh Long" },
      distribution: { "@type": "DataDownload", encodingFormat: "application/pdf", contentUrl: pdfAbs }
    }],
    body: `
<div class="verdict">
  <span class="tick"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Đạt toàn bộ ${k.soChiTieu} chỉ tiêu${nhieuDiem ? " tại " + k.phieu.length + " điểm lấy mẫu" : ""}</span>
  <p>Kết luận của đơn vị kiểm nghiệm, chép nguyên văn từ phiếu:</p>
  <p class="quote">${k.ketLuan}</p>
</div>

<div class="cta-box">
  <h3>Xem phiếu gốc có chữ ký và dấu đỏ</h3>
  <p>Bản PDF đầy đủ do ${k.donViNgan} phát hành. Đây là văn bản gốc, các số liệu trên trang này chép lại từ đó.</p>
  <a class="btn btn-primary" href="${pdfRel}" target="_blank" rel="noopener">Mở phiếu kiểm nghiệm (PDF) →</a>
</div>

<h2 id="nguon-goc">Phiếu này do ai làm</h2>
<p>Công ty không tự kiểm nghiệm rồi tự công bố. Mẫu nước được gửi tới một đơn vị y tế độc lập, có phòng thử nghiệm được công nhận theo chuẩn quốc tế.</p>
<div class="meta-grid">
  <div>Đơn vị kiểm nghiệm</div><div>${k.donViKN}</div>
  <div>Công nhận phòng thử nghiệm</div><div>${k.congNhan}</div>
  <div>Số phiếu</div><div>${k.soPhieu}</div>
  <div>Tên mẫu</div><div>${k.tenMau}</div>
  <div>Điểm lấy mẫu</div><div>${diemList}</div>
  <div>Ngày lấy mẫu</div><div>${k.ngayLay}</div>
  <div>Thời gian thử nghiệm</div><div>${k.thoiGianThu}</div>${dongNgayKy}
  <div>Quy chuẩn đối chiếu</div><div>${k.quyChuan}, ${k.quyChuanTen}</div>
</div>
${mucNhieuDiem}
${khoiPhieu}
${hopConLai}

<h2 id="doc-the-nao">Đọc bảng này thế nào cho đúng</h2>
<ul>
  <li><b>Dấu nhỏ hơn, ví dụ &lt; 0,0005.</b> Nghĩa là nếu có thì cũng ít hơn con số đó, máy không đo được tới mức thấp hơn nữa.</li>
  <li><b>Không phát hiện.</b> Máy không tìm thấy chất đó ở ngưỡng phát hiện của phương pháp.</li>
  <li><b>Số càng nhỏ càng tốt</b> với hầu hết chỉ tiêu. Riêng pH thì tốt nhất là nằm giữa khoảng 6,0 tới 8,5.</li>
</ul>
<div class="callout"><b>Một lưu ý của đơn vị kiểm nghiệm.</b> Phiếu ghi rõ kết quả chỉ có giá trị trên mẫu đã thử nghiệm, tức mẫu lấy ngày ${k.ngayLay}. Đó là lý do công ty kiểm nghiệm định kỳ và công bố từng kỳ tại đây.</div>

<h2 id="tai-sao">Vì sao công ty công bố phiếu này</h2>
<p>Nước là thứ bà con dùng mỗi ngày mà không nhìn thấy chất lượng bằng mắt thường. Công bố nguyên phiếu, kèm chữ ký và dấu của đơn vị kiểm nghiệm độc lập, là cách rõ ràng nhất để bà con tự kiểm chứng thay vì phải tin lời hứa.</p>
<p>Phiếu của các kỳ khác được lưu tại <a href="index.html">trang Chất lượng nước</a>.</p>

<div class="cta-box">
  <h3>Nước nhà mình có gì bất thường?</h3>
  <p>Nước đục, có mùi lạ hoặc màu khác thường, bà con báo ngay để công ty kiểm tra. Đội trực sự cố làm việc 24/7.</p>
  <a class="btn btn-primary" href="tel:02753843993">Báo sự cố (0275) 3843 993</a>
  <a class="btn btn-ghost" href="../lien-he.html">Gửi phản ánh</a>
</div>

<h2 id="doc-them">Đọc thêm</h2>
<ul>
  <li><a href="../huong-dan/chat-luong-nuoc-sach.html">Chất lượng nước sạch: công ty kiểm soát và công bố ra sao</a></li>
  <li><a href="../huong-dan/nuoc-co-mui-clo-nuoc-duc.html">Nước có mùi clo, nước đục: nguyên nhân và cách xử lý</a></li>
  <li><a href="../bai-viet/nuoc-may-nuoc-gieng-nuoc-mua.html">Nước máy, nước giếng hay nước mưa</a></li>
  <li><a href="index.html">Tất cả kỳ kiểm nghiệm đã công bố</a></li>
</ul>
`
  });
}

/* ---------------- Trang lưu trữ ---------------- */
function trangLuuTru() {
  const nam = [...new Set(KY.map(k => k.nam))].sort((a, b) => b - a);
  const khoiNam = nam.map(n => {
    const ds = KY.filter(k => k.nam === n).sort((a, b) => b.thang - a.thang);
    return `  <div class="kn-nam">
    <h2>Năm ${n}</h2>
    <div class="kn-list">
` + ds.map(k => {
      const soDiem = k.phieu.length;
      const moTa = soDiem > 1
        ? "Lấy mẫu ngày " + k.ngayLay + " tại " + soDiem + " điểm: " + k.phieu.map(p => p.diem).join(", ") + ". " + k.donViNgan + " thực hiện."
        : "Mẫu " + k.tenMau.toLowerCase() + " lấy ngày " + k.ngayLay + " tại " + k.phieu[0].diem + ". " + k.donViNgan + " thực hiện, " + k.soChiTieu + " chỉ tiêu.";
      return `      <a class="kn-item" href="${k.slug}.html">
        <div>
          <span class="kn-loai">${tenLoai(k)}</span>
          <h3>Kết quả kiểm nghiệm ${k.nhan.toLowerCase()}</h3>
          <p>${moTa}</p>
        </div>
        <span class="pill">Đạt ${k.soChiTieu}/${k.soChiTieu}</span>
      </a>`;
    }).join("\n") + `
    </div>
  </div>`;
  }).join("\n");

  return khung({
    url: BASE,
    title: "Chất lượng nước · Công bố kết quả kiểm nghiệm định kỳ",
    desc: "Công ty TNHH Cấp Thoát Nước Mỏ Cày công bố phiếu kết quả kiểm nghiệm nước sạch định kỳ do đơn vị y tế độc lập thực hiện. Xem số liệu từng kỳ và tải phiếu gốc.",
    ogTitle: "Công bố kết quả kiểm nghiệm nước Mỏ Cày",
    badge: "Chất lượng nước",
    h1: "Kết quả kiểm nghiệm, công bố nguyên phiếu.",
    lead: "Mỗi kỳ, mẫu nước được gửi đi kiểm nghiệm tại đơn vị y tế độc lập. Phiếu gốc có chữ ký và dấu đỏ được đăng đầy đủ tại đây để bà con tự kiểm chứng.",
    main: {
      "@type": "CollectionPage",
      name: "Công bố kết quả kiểm nghiệm chất lượng nước",
      description: "Trang lưu trữ các phiếu kết quả kiểm nghiệm nước sạch định kỳ của Công ty TNHH Cấp Thoát Nước Mỏ Cày.",
      url: BASE,
      inLanguage: "vi-VN",
      isPartOf: { "@type": "WebSite", url: "https://mocaywaco.com/" },
      publisher: { "@type": "Organization", name: "Công ty TNHH Cấp Thoát Nước Mỏ Cày", url: "https://mocaywaco.com/" }
    },
    them: [{
      "@type": "ItemList",
      itemListElement: KY.map((k, i) => ({
        "@type": "ListItem", position: i + 1,
        name: "Kết quả kiểm nghiệm " + k.nhan.toLowerCase(),
        url: BASE + k.slug + ".html"
      }))
    }],
    body: `
${khoiNam}
  <p class="note" style="margin-top:20px">Công ty kiểm nghiệm định kỳ hằng tháng, và mỗi năm một lần kiểm nghiệm đầy đủ với số chỉ tiêu nhiều nhất. Phiếu của các kỳ tiếp theo sẽ được đăng bổ sung tại đây.</p>

  <div class="grid-2" style="margin-top:44px;align-items:start">
    <div>
      <span class="badge">Ai kiểm nghiệm</span>
      <h2 style="font-size:clamp(24px,3.5vw,32px)">Đơn vị y tế độc lập, không phải công ty tự kiểm.</h2>
      <div class="prose" style="max-width:60ch">
        <p><b>Phiếu định kỳ hằng tháng</b> do <b>Trung tâm Kiểm soát Bệnh tật tỉnh Đồng Tháp</b> thực hiện, phòng thử nghiệm được công nhận <b>VILAS 502</b>, đối chiếu quy chuẩn kỹ thuật địa phương <b>QCĐP 01:2022/BTr</b>. Mẫu lấy cả tại nhà máy và trên mạng lưới cấp nước.</p>
        <p><b>Phiếu đầy đủ mỗi năm một lần</b> do <b>Viện Y tế Công cộng Thành phố Hồ Chí Minh</b> thuộc Bộ Y tế thực hiện, phòng thử nghiệm được công nhận <b>VILAS 219</b>, đối chiếu <b>QCVN 01-1:2024/BYT</b> với gần một trăm chỉ tiêu.</p>
        <p>Cả hai phòng thử nghiệm đều được công nhận theo chuẩn <b>ISO/IEC 17025</b>.</p>
      </div>
    </div>
    <div class="price-card">
      <span class="badge" style="color:var(--teal)">Công bố nguyên bản</span>
      <h3 style="font-size:21px;margin:14px 0 10px">Vì sao đăng cả file PDF gốc</h3>
      <p style="color:var(--muted);margin:0 0 14px">Số liệu gõ lại có thể sai sót. Đăng nguyên phiếu có chữ ký và dấu đỏ để bà con, cơ quan quản lý và bất kỳ ai cũng đối chiếu được với bản gốc.</p>
      <div class="check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg><span>Phiếu đầy đủ, không cắt xén</span></div>
      <div class="check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg><span>Có số phiếu và mã số mẫu để tra lại</span></div>
      <div class="check"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg><span>Ghi rõ ngày lấy mẫu và thời gian thử nghiệm</span></div>
    </div>
  </div>

  <div class="cta" style="margin-top:44px">
    <span class="badge">Thấy nước bất thường?</span>
    <h2>Báo ngay, công ty kiểm tra tận nơi.</h2>
    <p class="lead">Nước đục, có mùi lạ hoặc màu khác thường thì bà con gọi đội trực sự cố, làm việc cả ngày lễ Tết.</p>
    <div class="cta-actions">
      <a class="btn btn-primary" href="tel:02753843993">Gọi (0275) 3843 993</a>
      <a class="btn btn-ghost" href="../huong-dan/chat-luong-nuoc-sach.html">Tìm hiểu cách kiểm soát chất lượng</a>
    </div>
  </div>
`
  });
}

/* ---------------- Ghi file ---------------- */
fs.mkdirSync(path.join(ROOT, "chat-luong-nuoc"), { recursive: true });
const ra = [["chat-luong-nuoc/index.html", trangLuuTru(), null]];
for (const k of KY) ra.push(["chat-luong-nuoc/" + k.slug + ".html", trangKy(k), k]);

for (const [f, html, k] of ra) {
  if (html.includes("—")) throw new Error("Con dau gach ngang dai trong " + f);
  if (k) {
    const pdf = path.join(ROOT, "tai-lieu/kiem-nghiem", k.pdf);
    if (!fs.existsSync(pdf)) throw new Error("THIEU FILE PDF: " + pdf);
    if (k.chepDu && demChiTieu(k) !== k.soChiTieu)
      throw new Error("LECH SO CHI TIEU o " + k.slug + ": khai " + k.soChiTieu + " nhung chep " + demChiTieu(k));
  }
  fs.writeFileSync(path.join(ROOT, f), html, "utf8");
  console.log("Da ghi " + f + "  (" + Math.round(html.length / 1024) + " KB)");
}
console.log("Tong so ky da cong bo: " + KY.length);
