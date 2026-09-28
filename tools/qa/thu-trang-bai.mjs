/* Thử trang đọc bài (netlify/functions/bai.mjs) tại chỗ, không cần Netlify.
   Nạp đúng mã của bai.mjs, chỉ thay kho Netlify Blobs bằng dữ liệu mẫu, rồi gọi
   hàm như Netlify gọi. Trang dựng ra được ghi thành _thu-bai.html ở gốc web để
   mở bằng máy chủ tại chỗ và chụp ảnh. Chạy xong nhớ xóa _thu-bai.html.
   Cần web chạy tại chỗ ở GOC (mặc định http://localhost:8123).
   Chạy: node tools/qa/thu-trang-bai.mjs */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GOC = process.env.GOC || "http://localhost:8123";
const thuMuc = path.dirname(fileURLToPath(import.meta.url));
const nguon = fs.readFileSync(path.join(thuMuc, "../../netlify/functions/bai.mjs"), "utf8");

const MAU = [
  { id: "tb_1", slug: "lap-dat-bon-loc-moi", loai: "tin-tuc", trangThai: "dang", tieuDe: "Công ty lắp đặt bồn lọc mới tại Nhà máy nước Mỏ Cày",
    tomTat: "Bồn lọc thứ tư đi vào vận hành, nước ổn định hơn trong mùa khô.", ngay: "25/09/2026", khuVuc: "",
    anhBia: "/assets/anh/nen-be-lang.jpg", ts: Date.now() - 1000, tsDang: Date.now() - 1000,
    noiDungHtml: '<h2>Bồn lọc mới</h2><p>Ngày 25/09, công ty <strong>hoàn thành</strong> lắp đặt bồn lọc thứ tư.</p><ul><li>Công suất tăng thêm</li><li>Nước ổn định hơn mùa khô</li></ul><blockquote>Chất lượng nước là lời hứa mỗi ngày.</blockquote><p class="can-giua"><img src="/assets/nha-may/toan-canh.jpg" alt="Toàn cảnh"></p>' },
  { id: "tb_2", slug: "tam-ngung-cap-nuoc-ap-phu-quoi", loai: "lich-cup-nuoc", trangThai: "dang", tieuDe: "Tạm ngừng cấp nước ấp Phú Quới ngày 30/09",
    tomTat: "Súc xả tuyến ống từ 8h00 tới 14h00.", ngay: "28/09/2026", khuVuc: "Ấp Phú Quới", anhBia: "", ts: Date.now() - 5000, noiDungHtml: "<p>Nội dung</p>" },
  { id: "tb_3", slug: "bai-nhap", loai: "tin-tuc", trangThai: "nhap", tieuDe: "Bài nháp KHÔNG được hiện", ts: Date.now(), noiDungHtml: "<p>x</p>" }
];
const stub = `const getStore = () => ({ get: async () => (${JSON.stringify(MAU)}) });`;
const ma = nguon.replace(/^import \{ getStore \} from "@netlify\/blobs";$/m, stub);
if (ma === nguon) { console.error("Không thay được dòng import của bai.mjs"); process.exit(1); }
const tam = path.join(thuMuc, "_bai-tam.mjs");
fs.writeFileSync(tam, ma, "utf8");
const { default: xuLy } = await import(pathToFileURL(tam).href + "?v=" + Date.now());
fs.unlinkSync(tam);

const goi = (duong, slug) => xuLy(new Request(GOC + duong), { params: slug ? { slug } : {} });

let loi = 0;
const kiem = (dk, ten) => { console.log((dk ? "  đúng " : "  SAI  ") + ten); if (!dk) loi++; };

const r1 = await goi("/tin/lap-dat-bon-loc-moi", "lap-dat-bon-loc-moi");
const h1 = await r1.text();
kiem(r1.status === 200, "bài có thật trả 200");
kiem(/<title>Công ty lắp đặt bồn lọc mới/.test(h1), "tiêu đề trang đúng tên bài");
kiem(/og:image" content="http:\/\/localhost:8123\/assets\/anh\/nen-be-lang\.jpg"/.test(h1), "ảnh chia sẻ là link tuyệt đối tới ảnh đại diện");
kiem(/og:description" content="Bồn lọc thứ tư/.test(h1), "mô tả chia sẻ lấy từ tóm tắt");
kiem(/"@type":"NewsArticle"/.test(h1), "có dữ liệu cấu trúc NewsArticle");
kiem(/<nav class="nav">/.test(h1) && /<footer class="footer">/.test(h1), "có thanh điều hướng và chân trang của site");
kiem(/Tạm ngừng cấp nước ấp Phú Quới/.test(h1), "mục Đọc thêm có bài khác");
kiem(!/Bài nháp KHÔNG được hiện/.test(h1), "bài nháp không lọt vào Đọc thêm");
fs.writeFileSync(path.join(thuMuc, "../../_thu-bai.html"), h1, "utf8");

const r2 = await goi("/tin/bai-nhap", "bai-nhap");
kiem(r2.status === 404, "bài nháp mở trực tiếp trả 404");
const r3 = await goi("/tin/khong-co-bai-nay", "khong-co-bai-nay");
kiem(r3.status === 404, "bài không tồn tại trả 404");
const r4 = await goi("/sitemap-tin.xml");
const x4 = await r4.text();
kiem(/lap-dat-bon-loc-moi/.test(x4) && !/bai-nhap/.test(x4), "sơ đồ bài có bài đã đăng, không có bản nháp");

console.log("\n" + (loi ? loi + " mục SAI" : "Tất cả đúng") + ". Trang mẫu ghi ở _thu-bai.html (xóa sau khi xem).");
process.exit(loi ? 1 : 0);
