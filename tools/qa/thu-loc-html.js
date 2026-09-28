/* Thử hàm lọc HTML của netlify/functions/thongbao.mjs.
   Chạy tại chỗ, KHÔNG gọi máy chủ, KHÔNG ghi dữ liệu thật.
   Hàm lọc được đọc thẳng từ thongbao.mjs nên không sợ hai bản lệch nhau.
   Chạy: node tools/qa/thu-loc-html.js */
const fs = require("fs"), path = require("path");

const src = fs.readFileSync(path.join(__dirname, "../../netlify/functions/thongbao.mjs"), "utf8");
const i = src.indexOf("const THE_CAM"), j = src.indexOf("function buildItem");
if (i < 0 || j < 0) { console.error("Không tách được hàm lọc từ thongbao.mjs"); process.exit(1); }
const sanitize = new Function(src.slice(i, j) + "\nreturn sanitize;")();

/* A. Mẫu chèn mã: lọc xong mà còn dấu hiệu chạy mã là LỌT. */
const macTan = [
  ["Thẻ script thường",           '<script>alert(1)</script>'],
  ["Thẻ iframe",                  '<iframe src="https://vi.du"></iframe>'],
  ["onerror có dấu cách",         '<img src=x onerror=alert(1)>'],
  ["onerror sau dấu gạch chéo",   '<img src=x/onerror=alert(1)>'],
  ["svg onload sau gạch chéo",    '<svg/onload=alert(1)>'],
  ["onfocus có xuống dòng",       '<input\nonfocus=alert(1) autofocus>'],
  ["href javascript trong nháy",  '<a href="javascript:alert(1)">bấm</a>'],
  ["href javascript không nháy",  '<a href=javascript:alert(1)>bấm</a>'],
  ["href javascript mã hóa",      '<a href="java&#115;cript:alert(1)">bấm</a>'],
  ["href có tab chen giữa",       '<a href="java\tscript:alert(1)">bấm</a>'],
  ["thẻ script không đóng",       '<script src="https://vi.du/x.js">'],
  ["style chứa javascript",       '<div style="background:url(javascript:alert(1))">x</div>'],
  ["src data html",               '<img src="data:text/html;base64,PHNjcmlwdD4=">'],
  ["thẻ form giả mạo",            '<form action="https://ke-gian"><input name=pw></form>']
];
const NGUY = /<\s*(script|iframe|object|embed|svg|form)\b|[\/\s]on\w+\s*=|javascript\s*:|vbscript\s*:|&#\d|data:text/i;

/* B. Nội dung hợp lệ trình soạn thảo sinh ra: phải GIỮ NGUYÊN, không được xóa mất. */
const hopLe = [
  ["Đoạn văn",        '<p>Kính gửi quý khách hàng.</p>', ["<p>", "Kính gửi"]],
  ["Đậm, nghiêng",    '<p><b>Quan trọng</b> và <i>ghi chú</i></p>', ["<b>", "<i>"]],
  ["Tiêu đề H2 H3",   '<h2>Thời gian</h2><h3>Khu vực</h3>', ["<h2>", "<h3>"]],
  ["Danh sách",       '<ul><li>8h00 tới 14h00</li></ul>', ["<ul>", "<li>", "14h00"]],
  ["Trích dẫn",       '<blockquote>Theo thông báo</blockquote>', ["<blockquote>"]],
  ["Liên kết thường", '<a href="https://mocaywaco.com/tin-tuc">Xem tin</a>', ['href="https://mocaywaco.com/tin-tuc"', "Xem tin"]],
  ["Ảnh thường",      '<img src="https://mocaywaco.com/assets/anh/a.jpg">', ['src="https://mocaywaco.com/assets/anh/a.jpg"']],
  ["Chữ có one=",     '<p>Ghi chú: mã one=2 và style=A trong hợp đồng</p>', ["one=2", "style=A"]],
  ["Dấu tiếng Việt",  '<p>Ấp Phú Quới, xã Mỏ Cày</p>', ["Ấp Phú Quới", "Mỏ Cày"]]
];

let lot = 0, hong = 0;
console.log("A. Chặn chèn mã (" + macTan.length + " mẫu)\n");
for (const [ten, vao] of macTan) {
  const ra = sanitize(vao), con = NGUY.test(ra);
  if (con) lot++;
  console.log("  " + (con ? "LỌT  " : "chặn ") + ten.padEnd(30) + (con ? "còn: " + ra.replace(/\n/g, " ") : ""));
}
console.log("\nB. Giữ nội dung hợp lệ (" + hopLe.length + " mẫu)\n");
for (const [ten, vao, phaiCon] of hopLe) {
  const ra = sanitize(vao);
  const thieu = phaiCon.filter((x) => !ra.includes(x));
  if (thieu.length) hong++;
  console.log("  " + (thieu.length ? "HỎNG " : "giữ  ") + ten.padEnd(30) + (thieu.length ? "mất: " + thieu.join(" | ") + "  ->  " + ra : ""));
}
console.log("\n" + lot + "/" + macTan.length + " mẫu chèn mã lọt qua.  " + hong + "/" + hopLe.length + " mẫu hợp lệ bị hỏng.");
process.exit(lot || hong ? 1 : 0);
