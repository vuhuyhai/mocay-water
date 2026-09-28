/* Thử trọn luồng soạn bài trong trang quản trị bằng Chrome thật.
   Máy chủ được GIẢ LẬP (chặn request, trả lời như Netlify Function), nên không cần
   mật khẩu và không ghi gì lên web thật. TinyMCE, giao diện, luồng bấm là thật.
   Cần chạy web tại chỗ ở GOC (mặc định http://localhost:8123).
   Chạy: node tools/qa/thu-soan-bai.js   (OUT = nơi lưu ảnh chụp) */
const puppeteer = require("puppeteer-core");
const GOC = process.env.GOC || "http://localhost:8123";
const OUT = process.env.OUT || ".";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const cho = (ms) => new Promise((r) => setTimeout(r, ms));

// "Máy chủ" giả: danh sách bài giữ trong bộ nhớ
const db = [];
let soAnh = 0;
const slugHoa = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  const loi = [];
  p.on("pageerror", (e) => loi.push("JS: " + e.message));
  p.on("dialog", (d) => d.accept());
  await p.setRequestInterception(true);
  p.on("request", async (r) => {
    const u = r.url();
    if (u.includes("/api/tai-anh")) {
      soAnh++;
      return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, url: "/assets/anh/song-mo-cay.jpg" }) });
    }
    if (u.includes("/.netlify/functions/thongbao")) {
      const m = r.method();
      if (m === "GET") return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ items: db }) });
      const x = JSON.parse(r.postData() || "{}");
      if (m === "POST") { x.id = "tb_" + db.length; x.slug = x.slug || slugHoa(x.tieuDe); x.ts = Date.now(); db.unshift(x); }
      if (m === "PUT") { const i = db.findIndex((t) => t.id === x.id); x.slug = x.slug || db[i].slug; db[i] = Object.assign(db[i], x); }
      return r.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, item: db.find((t) => t.id === (x.id)) || db[0] }) });
    }
    if (u.includes("/.netlify/functions/")) return r.respond({ status: 200, contentType: "application/json", body: "{}" });
    r.continue();
  });

  await p.goto(GOC + "/admin/", { waitUntil: "networkidle2" });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("mc_admin_token", "0.gia"); });
  await p.goto(GOC + "/admin/", { waitUntil: "networkidle2" });

  const buoc = (t) => console.log("- " + t);
  buoc("Danh sách trống: " + (await p.$eval("#tbList", (e) => e.innerText.trim())));
  await p.screenshot({ path: OUT + "/wp-1-danh-sach-trong.png" });

  await p.click("button[onclick='vietBaiMoi()']");
  await p.waitForFunction(() => window.tinymce && tinymce.get("f-noidung") && tinymce.get("f-noidung").initialized, { timeout: 20000 });
  const tv = await p.evaluate(() => document.querySelector(".tox-tbtn--bespoke, .tox-tbtn") ? (tinymce.get("f-noidung").translate("Bold")) : "");
  buoc("TinyMCE đã chạy, nhãn nút Bold dịch thành: \"" + tv + "\"");

  await p.type("#f-tieude", "Công ty lắp đặt bồn lọc mới tại Nhà máy nước Mỏ Cày");
  await p.evaluate(() => {
    const ed = tinymce.get("f-noidung");
    ed.setContent("<h2>Bồn lọc mới</h2><p>Ngày 25/09, công ty <strong>hoàn thành</strong> lắp đặt bồn lọc thứ tư.</p><ul><li>Công suất tăng thêm</li><li>Nước ổn định hơn mùa khô</li></ul><blockquote>Chất lượng nước là lời hứa mỗi ngày.</blockquote>");
    ed.fire("change");
  });
  await cho(300);
  buoc("Đường dẫn tự sinh: " + (await p.$eval("#dsSlug", (e) => e.textContent)));
  // Tải ảnh đại diện (ảnh thật trên máy, máy chủ giả trả link)
  const inp = await p.$("#fileAnhBia");
  await inp.uploadFile(require("path").join(__dirname, "../../assets/anh/nen-be-lang.jpg"));
  await p.waitForFunction(() => document.querySelector("#anhBiaXem img"), { timeout: 10000 });
  buoc("Ảnh đại diện đã tải lên (số lần gọi /api/tai-anh: " + soAnh + ")");
  await p.type("#f-tomtat", "Bồn lọc thứ tư đi vào vận hành, nước ổn định hơn trong mùa khô.");
  await cho(900);
  await p.screenshot({ path: OUT + "/wp-2-soan-bai.png" });

  await p.click("button[onclick='xemTruoc()']"); await cho(500);
  buoc("Xem trước mở: " + !(await p.$eval("#xtHop", (e) => e.classList.contains("hidden"))));
  await p.screenshot({ path: OUT + "/wp-3-xem-truoc.png" });
  await p.click("#xtHop .xt-dau button"); await cho(200);

  await p.click("#btnNhap"); await cho(600);
  buoc("Lưu nháp: " + (await p.$eval("#tbFormMsg", (e) => e.innerText.trim())) + " | trạng thái: " + (await p.$eval("#hopTrangThai", (e) => e.textContent)));
  await p.click("#btnDang"); await cho(600);
  buoc("Đăng: " + (await p.$eval("#tbFormMsg", (e) => e.innerText.trim().split("\n")[0])) + " | nút đổi thành: " + (await p.$eval("#btnDang", (e) => e.textContent)));
  buoc("Máy chủ nhận: trangThai=" + db[0].trangThai + ", loai=" + db[0].loai + ", anhBia=" + db[0].anhBia + ", có h2: " + /<h2>/.test(db[0].noiDungHtml));

  await p.click("button[onclick='moDanhSach()']"); await cho(600);
  buoc("Danh sách: " + (await p.$eval("#tbList", (e) => e.innerText.replace(/\s+/g, " ").trim())).slice(0, 160));
  await p.screenshot({ path: OUT + "/wp-4-danh-sach.png" });

  // Khổ điện thoại
  await p.setViewport({ width: 390, height: 844, isMobile: true });
  await p.evaluate(() => suaThongBao(TB_ITEMS[0].id)); await cho(1200);
  await p.screenshot({ path: OUT + "/wp-5-dien-thoai.png", fullPage: true });
  buoc("Tràn ngang trên điện thoại: " + (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) + "px");

  console.log("\nLỗi JS: " + (loi.length ? loi.join(" | ") : "không"));
  await b.close();
  process.exit(loi.length ? 1 : 0);
})();
