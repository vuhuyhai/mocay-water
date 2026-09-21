/* Quét bằng Chrome thật: mọi trang trong sitemap ở khổ điện thoại 375 và máy tính 1280.
   Chạy: node tools/qa/quet-trinh-duyet.js
   Kiểm: lỗi console, request hỏng, tràn ngang, ảnh vỡ, chữ quá nhỏ, tốc độ tải,
   dung lượng trang. Cần Chrome cài sẵn ở đường dẫn mặc định. */
const puppeteer = require("puppeteer-core");
const ROOT = process.env.ROOT || "https://mocaywaco.com";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

(async () => {
  const sm = await (await fetch(ROOT + "/sitemap.xml")).text();
  const trang = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const loi = [], nang = [];
  for (const u of trang) {
    const ten = u.replace(ROOT, "") || "/";
    for (const vp of [{ w: 375, h: 812, mobile: true }, { w: 1280, h: 800, mobile: false }]) {
      const p = await b.newPage();
      await p.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, hasTouch: vp.mobile });
      const consoleLoi = [], failed = []; let bytes = 0;
      p.on("console", m => { if (m.type() === "error") consoleLoi.push(m.text().slice(0, 140)); });
      p.on("pageerror", e => consoleLoi.push("JS: " + e.message.slice(0, 140)));
      p.on("requestfailed", r => failed.push(r.url().slice(0, 100) + " (" + (r.failure() || {}).errorText + ")"));
      p.on("response", async r => { if (r.status() >= 400) failed.push(r.url().slice(0, 100) + " -> " + r.status()); try { const l = r.headers()["content-length"]; if (l) bytes += +l; } catch {} });
      const t0 = Date.now();
      try { await p.goto(u, { waitUntil: "networkidle2", timeout: 45000 }); } catch (e) { loi.push({ ten, vp: vp.w, muc: "TAI", ghi: e.message.slice(0, 80) }); await p.close(); continue; }
      const ms = Date.now() - t0;
      const kq = await p.evaluate(() => {
        const tran = document.documentElement.scrollWidth - window.innerWidth;
        let thuPham = [];
        if (tran > 2) for (const el of document.querySelectorAll("body *")) { const r = el.getBoundingClientRect(); if (r.right > window.innerWidth + 2 && r.width > 40) { thuPham.push((el.tagName + "." + [...el.classList].join(".")).slice(0, 50)); if (thuPham.length >= 3) break; } }
        const anhHong = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map(i => i.getAttribute("src").slice(0, 80));
        const chuNho = [...document.querySelectorAll("p,li,td,a,span,label")].filter(e => { const s = getComputedStyle(e); return e.innerText && e.innerText.trim().length > 20 && parseFloat(s.fontSize) < 12 && s.display !== "none"; }).length;
        const nutNho = [...document.querySelectorAll("a,button")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32 && e.innerText.trim().length > 0 && getComputedStyle(e).display !== "inline"; }).length;
        return { tran, thuPham, anhHong, chuNho, nutNho };
      });
      if (kq.tran > 2) loi.push({ ten, vp: vp.w, muc: "TRAN-NGANG", ghi: kq.tran + "px, do: " + kq.thuPham.join(", ") });
      if (kq.anhHong.length) loi.push({ ten, vp: vp.w, muc: "ANH-HONG", ghi: kq.anhHong.join(", ") });
      if (kq.chuNho && vp.mobile) loi.push({ ten, vp: vp.w, muc: "CHU-NHO", ghi: kq.chuNho + " đoạn chữ < 12px" });
      if (kq.nutNho > 3 && vp.mobile) loi.push({ ten, vp: vp.w, muc: "NUT-NHO", ghi: kq.nutNho + " nút/link cao < 32px, khó bấm bằng ngón tay" });
      for (const c of consoleLoi) loi.push({ ten, vp: vp.w, muc: "CONSOLE", ghi: c });
      for (const f of failed) loi.push({ ten, vp: vp.w, muc: "REQUEST", ghi: f });
      if (vp.mobile) nang.push({ ten, ms, kb: Math.round(bytes / 1024) });
      await p.close();
    }
    process.stdout.write(".");
  }
  console.log("\n");
  const nhom = {};
  for (const l of loi) (nhom[l.muc] = nhom[l.muc] || []).push(l);
  if (!loi.length) console.log("Không phát hiện lỗi hiển thị hay lỗi console.");
  for (const k of Object.keys(nhom)) { console.log("== " + k + " (" + nhom[k].length + ") =="); for (const l of nhom[k]) console.log("  [" + l.vp + "] " + l.ten + "  " + l.ghi); }
  nang.sort((a, b) => b.kb - a.kb);
  console.log("\n== 8 TRANG NẶNG NHẤT (điện thoại, KB tải về / ms tới khi mạng yên) ==");
  for (const n of nang.slice(0, 8)) console.log("  " + String(n.kb).padStart(5) + " KB  " + String(n.ms).padStart(5) + " ms  " + n.ten);
  await b.close();
})();
