/* Kiểm dây nối của trang quản trị: mọi hàm HTML gọi đều có trong JS, mọi id JS
   tìm đều có trong HTML. Chạy tại chỗ: node tools/qa/kiem-noi-quan-tri.js */
const fs = require("fs"), path = require("path");
const goc = path.join(__dirname, "../../admin");
const h = fs.readFileSync(path.join(goc, "index.html"), "utf8");
const j = ["admin.js", "bai-viet.js"].map((f) => fs.readFileSync(path.join(goc, f), "utf8")).join("\n");

const trongHtml = [...h.matchAll(/\son\w+="([^"]*)"/g)].map((m) => m[1]);
const ham = new Set();
for (const s of trongHtml) for (const m of s.matchAll(/([A-Za-z_]\w*)\(/g)) {
  if (!["if", "confirm", "alert"].includes(m[1])) ham.add(m[1]);
}
const coHam = (f) => new RegExp("function\\s+" + f + "\\s*\\(").test(j);
const thieuHam = [...ham].filter((f) => !coHam(f));
// Hàm gọi trong chuỗi HTML do JS dựng ra (onclick="suaThongBao(...)")
for (const m of j.matchAll(/onclick=\\?"(\w+)\(|onclick="(\w+)\(/g)) {
  const f = m[1] || m[2]; if (f && !coHam(f)) thieuHam.push(f + " (trong JS)");
}
const ids = [...j.matchAll(/\$\("([\w-]+)"\)|getElementById\("([\w-]+)"\)/g)].map((m) => m[1] || m[2]);
const thieuId = [...new Set(ids)].filter((i) => !h.includes('id="' + i + '"'));

console.log("Hàm HTML gọi: " + ham.size + ". Thiếu: " + (thieuHam.join(", ") || "không"));
console.log("Id JS dùng: " + new Set(ids).size + ". Không có trong HTML: " + (thieuId.join(", ") || "không"));
process.exit(thieuHam.length || thieuId.length ? 1 : 0);
