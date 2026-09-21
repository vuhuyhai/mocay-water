/* Quét bản live mocaywaco.com trước khi bàn giao. Không cần trình duyệt.
   Chạy: node tools/qa/quet-live.js
   Kiểm: mọi trang trong sitemap, link và ảnh nội bộ gãy, thiếu title/meta,
   số H1, chữ giữ chỗ, từ cấm, em-dash, link href="#", ảnh stock Pexels. */
const ROOT = process.env.ROOT || "https://mocaywaco.com";
const GIU_CHO = [/khi có\./i, /lorem/i, /\bTODO\b/, /đang cập nhật/i, /coming soon/i, /\[svg\]/, /XXX/];
const TU_CAM = /kiến tạo|lan tỏa|nâng tầm|truyền cảm hứng|cuộc cách mạng|đi theo/;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function lay(url) {
  try {
    const r = await fetch(url, { redirect: "manual" });
    const ct = r.headers.get("content-type") || "";
    return { st: r.status, loc: r.headers.get("location"), ct, txt: r.status === 200 && /html/.test(ct) ? await r.text() : "" };
  } catch (e) { return { st: 0, err: e.message }; }
}

(async () => {
  const sm = await (await fetch(ROOT + "/sitemap.xml")).text();
  const trang = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const daKiem = new Map();
  const loi = [], anhStock = [];
  for (const u of trang) {
    const r = await lay(u);
    daKiem.set(u, r.st);
    const ten = u.replace(ROOT, "") || "/";
    if (r.st !== 200) { loi.push({ muc: "TRANG", url: ten, ghi: "HTTP " + r.st }); continue; }
    const h = r.txt;
    if (!/<title>[^<]{5,}<\/title>/.test(h)) loi.push({ muc: "META", url: ten, ghi: "thiếu <title>" });
    if (!/<meta name="description" content="[^"]{20,}"/.test(h)) loi.push({ muc: "META", url: ten, ghi: "thiếu meta description" });
    if (!/property="og:title"/.test(h)) loi.push({ muc: "OG", url: ten, ghi: "thiếu og:title (chia sẻ Zalo/Facebook không có tiêu đề)" });
    if (!/property="og:image"/.test(h)) loi.push({ muc: "OG", url: ten, ghi: "thiếu og:image (chia sẻ không có ảnh)" });
    const h1 = (h.match(/<h1[^>]*>/g) || []).length;
    if (h1 !== 1) loi.push({ muc: "SEO", url: ten, ghi: "số H1 = " + h1 });
    const nd = h.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
    for (const re of GIU_CHO) { const m = nd.match(re); if (m) loi.push({ muc: "GIU-CHO", url: ten, ghi: "'" + m[0] + "'" }); }
    const tc = nd.match(TU_CAM); if (tc) loi.push({ muc: "TU-CAM", url: ten, ghi: "'" + tc[0] + "'" });
    if (nd.includes("—")) loi.push({ muc: "EM-DASH", url: ten, ghi: (nd.match(/—/g) || []).length + " chỗ" });
    const hashChet = (nd.match(/href="#"/g) || []).length; if (hashChet) loi.push({ muc: "LINK-#", url: ten, ghi: hashChet + " link href=\"#\"" });
    for (const m of nd.matchAll(/src="(https:\/\/images\.pexels\.com[^"]+)"/g)) anhStock.push({ url: ten });
    const base = new URL(u), ds = new Set();
    for (const m of nd.matchAll(/(?:href|src|srcset)="([^"#]+?)(?:#[^"]*)?"/g)) {
      for (const phan of m[1].split(",")) {
        const v = phan.trim().split(" ")[0];
        if (!v || /^(mailto:|tel:|javascript:|data:)/.test(v)) continue;
        let abs; try { abs = new URL(v, base).href; } catch { continue; }
        if (abs.startsWith(ROOT)) ds.add(abs);
      }
    }
    for (const abs of ds) {
      if (!daKiem.has(abs)) { const rr = await lay(abs); daKiem.set(abs, rr.st); }
      const st = daKiem.get(abs);
      if (st >= 400 || st === 0) loi.push({ muc: "LINK-GAY", url: ten, ghi: abs.replace(ROOT, "") + " -> " + st });
    }
    await sleep(50);
  }
  const nhom = {};
  for (const l of loi) (nhom[l.muc] = nhom[l.muc] || []).push(l);
  console.log("Đã quét " + trang.length + " trang, " + daKiem.size + " URL.");
  if (!loi.length) console.log("Không phát hiện lỗi.");
  for (const k of Object.keys(nhom)) { console.log("\n== " + k + " (" + nhom[k].length + ") =="); for (const l of nhom[k]) console.log("  " + l.url + "  " + l.ghi); }
  const theoTrang = {}; for (const a of anhStock) theoTrang[a.url] = (theoTrang[a.url] || 0) + 1;
  console.log("\n== ẢNH STOCK PEXELS (" + anhStock.length + ") =="); for (const k in theoTrang) console.log("  " + k + ": " + theoTrang[k]);
})();
