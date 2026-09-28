/* Chụp màn hình trang quản trị ở khổ máy tính và điện thoại, để duyệt giao diện.
   Dùng bản chạy tại chỗ (mặc định http://localhost:8123) và một token GIẢ, nên
   không đụng vào dữ liệu thật và không cần mật khẩu công ty.
   Chạy: node tools/qa/chup-quan-tri.js   (biến OUT đặt nơi lưu ảnh) */
const puppeteer = require("puppeteer-core");
const GOC = process.env.GOC || "http://localhost:8123";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = process.env.OUT || ".";

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
  for (const kho of [{ ten: "may-tinh", w: 1280, h: 900 }, { ten: "dien-thoai", w: 390, h: 844, mobile: true }]) {
    const p = await b.newPage();
    await p.setViewport({ width: kho.w, height: kho.h, isMobile: !!kho.mobile, hasTouch: !!kho.mobile, deviceScaleFactor: 1 });
    const loi = [];
    p.on("pageerror", e => loi.push("JS: " + e.message.slice(0, 120)));

    // 1. Màn đăng nhập
    await p.goto(GOC + "/admin/", { waitUntil: "networkidle2" });
    await p.screenshot({ path: `${OUT}/qt-dangnhap-${kho.ten}.png` });

    // 2. Bảng điều khiển: đặt token giả rồi tải lại. Mọi lệnh gọi máy chủ sẽ hỏng,
    //    nhưng bố cục, biểu mẫu và thanh công cụ soạn thảo vẫn dựng đủ để duyệt.
    await p.evaluate(() => localStorage.setItem("mc_admin_token", "0.gia-de-xem-giao-dien"));
    await p.goto(GOC + "/admin/", { waitUntil: "networkidle2" });
    await p.evaluate(() => {
      const ed = document.getElementById("f-editor");
      if (ed) ed.innerHTML = "<p>Kính gửi quý khách hàng,</p><p>Công ty thông báo tạm ngừng cấp nước để súc xả tuyến ống.</p><ul><li>Thời gian: 8h00 tới 14h00</li><li>Khu vực: ấp Phú Quới</li></ul>";
      const t = document.getElementById("f-tieude");
      if (t) t.value = "Tạm ngừng cấp nước khu vực ấp Phú Quới ngày 30/09";
    });
    await new Promise(r => setTimeout(r, 400));
    await p.screenshot({ path: `${OUT}/qt-dangbai-${kho.ten}.png`, fullPage: true });

    // 3. Đo vài thứ về khả năng dùng được
    const do_ = await p.evaluate(() => {
      const tran = document.documentElement.scrollWidth - window.innerWidth;
      const nut = [...document.querySelectorAll(".ed-toolbar button")].map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
      const nhoHon32 = nut.filter(n => n.h < 32 || n.w < 32).length;
      const ed = document.getElementById("f-editor");
      return {
        tranNgang: tran,
        soNutCongCu: nut.length,
        nutNhoHon32px: nhoHon32,
        vungSoanCao: ed ? Math.round(ed.getBoundingClientRect().height) : 0,
        coNutXemTruoc: !!document.querySelector("[onclick*='xemTruoc'],[id*='preview'],[id*='xemTruoc']"),
        coNutLuuNhap: !!document.querySelector("[onclick*='luuNhap'],[id*='nhap']"),
        thanhCongCuXuongDong: (() => { const tb = document.querySelector(".ed-toolbar"); if (!tb) return null;
          const ys = [...tb.querySelectorAll("button")].map(e => Math.round(e.getBoundingClientRect().top)); return new Set(ys).size; })()
      };
    });
    console.log("[" + kho.ten + "] " + JSON.stringify(do_) + (loi.length ? "  LỖI JS: " + loi.join(" | ") : ""));
    await p.close();
  }
  await b.close();
})();
