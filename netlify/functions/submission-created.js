/* Tự cất hồ sơ khách gửi để trang quản trị đọc thẳng, không cần mã truy cập Netlify.

   Tên file "submission-created" là tên sự kiện của Netlify: mỗi khi một biểu mẫu
   trên web được gửi và đã qua bộ lọc spam, Netlify tự gọi hàm này và gửi kèm hồ sơ.
   Hàm chép hồ sơ vào kho "ho-so" (Netlify Blobs), mỗi hồ sơ một khóa riêng nên
   hai người gửi cùng lúc cũng không đè nhau.

   Chỉ cất hai biểu mẫu của web. Bỏ địa chỉ IP và trình duyệt người gửi mà Netlify
   tự thêm vào, vì công ty không cần và chính sách bảo mật không nêu việc thu chúng.

   Hàm lỗi thì hồ sơ vẫn nằm nguyên trong Netlify Forms, không mất. */
const TEN_FORM = ["dang-ky-lap-dat", "phan-anh"];
const BO_TRUONG = ["bot-field", "form-name", "ip", "user_agent", "referrer"];

exports.handler = async (event) => {
  try {
    let payload = {};
    try { payload = JSON.parse(event.body || "{}").payload || {}; } catch (e) { return { statusCode: 200 }; }

    const form = payload.form_name;
    if (!TEN_FORM.includes(form)) return { statusCode: 200, body: "bo qua" };

    const data = {};
    Object.keys(payload.data || {}).forEach((k) => {
      if (!BO_TRUONG.includes(k)) data[k] = String(payload.data[k] == null ? "" : payload.data[k]).slice(0, 2000);
    });
    const ngay = payload.created_at || new Date().toISOString();
    const id = String(payload.id || Date.now().toString(36));
    const rec = { id, ngay, form, data };

    const { getStore, connectLambda } = await import("@netlify/blobs");
    connectLambda(event);
    // Khóa bắt đầu bằng thời điểm gửi nên liệt kê ra là đã đúng thứ tự thời gian
    const key = form + "/" + ngay.replace(/[^0-9]/g, "").slice(0, 17) + "-" + id.replace(/[^\w-]/g, "");
    await getStore("ho-so").setJSON(key, rec);
    return { statusCode: 200 };
  } catch (e) {
    console.error("submission-created", e && e.message);
    return { statusCode: 200 };
  }
};
