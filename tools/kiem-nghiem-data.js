/* ============================================================
   DỮ LIỆU CÁC KỲ KIỂM NGHIỆM NƯỚC
   ------------------------------------------------------------
   Thêm một kỳ mới: chép nguyên khối { ... } của kỳ gần nhất,
   sửa số liệu theo phiếu mới, đặt lên ĐẦU mảng KY, rồi chạy:

       node tools/build-kiem-nghiem.js

   Quy ước:
   - loai: "day-du"  = phiếu đầy đủ, làm mỗi năm một lần
           "dinh-ky" = phiếu định kỳ hằng tháng, ít chỉ tiêu hơn
   - Chỉ chép vào bảng những chỉ tiêu có con số đo được hoặc bà con
     quen nghe. Các chỉ tiêu còn lại đều "Không phát hiện" thì để
     builder tự gộp thành một dòng, tránh gõ tay nhiều số dễ sai.
   - ketLuan phải chép NGUYÊN VĂN từ mục Nhận xét trên phiếu.
   ============================================================ */

const KY = [
  {
    slug: "ky-08-2026",
    nam: 2026,
    thang: 8,
    nhan: "Kỳ 08/2026",
    loai: "day-du",
    soChiTieu: 98,
    soPhieu: "044284/VYTCC",
    maMau: "31972.26",
    tenMau: "Nước đã xử lý",
    diaDiem: "Nhà máy nước Mỏ Cày, xã Mỏ Cày, tỉnh Vĩnh Long",
    donViKN: "Viện Y tế Công cộng Thành phố Hồ Chí Minh, Bộ Y tế",
    congNhan: "VILAS 219, Văn phòng Công nhận Chất lượng (BoA). Các phép thử đánh dấu (a) được công nhận phù hợp ISO/IEC 17025:2017",
    ngayLay: "05/08/2026",
    thoiGianThu: "05/08/2026 tới 13/08/2026",
    ngayKy: "14/08/2026",
    ngayKyISO: "2026-08-14",
    ngayDang: "2026-09-10",
    quyChuan: "QCVN 01-1:2024/BYT",
    ketLuan: "Mẫu NƯỚC ĐÃ XỬ LÝ có các chỉ tiêu được kiểm nghiệm đạt Quy chuẩn kỹ thuật quốc gia về chất lượng nước sạch sử dụng cho mục đích sinh hoạt QCVN 01-1:2024/BYT do Bộ Y tế ban hành.",
    pdf: "phieu-kiem-nghiem-nmn-mo-cay-08-2026.pdf",
    // Nhóm chỉ tiêu: [tên nhóm, [[chỉ tiêu, giới hạn, kết quả, đơn vị], ...]]
    nhom: [
      ["Vi sinh vật", [
        ["Coliforms tổng số", "< 1", "< 1", "CFU/100 ml"],
        ["Escherichia coli", "< 1", "< 1", "CFU/100 ml"],
        ["Pseudomonas aeruginosa", "< 1", "< 1", "CFU/100 ml"],
        ["Staphylococcus aureus", "< 1", "< 1", "CFU/100 ml"]
      ]],
      ["Cảm quan, thấy được bằng mắt và mũi", [
        ["Màu sắc", "≤ 15", "< 5", "TCU"],
        ["Mùi", "Không có mùi lạ", "Không có mùi lạ", ""],
        ["Độ đục", "≤ 2", "0,30", "NTU"],
        ["pH", "6,0 tới 8,5", "7,27", ""]
      ]],
      ["Khoáng chất và muối hòa tan", [
        ["Tổng chất rắn hòa tan (TDS)", "≤ 1000", "186", "mg/l"],
        ["Độ cứng tổng cộng", "≤ 300", "80", "mg/l"],
        ["Clorua", "≤ 250", "45,9", "mg/l"],
        ["Natri (Na)", "≤ 200", "18,31", "mg/l"],
        ["Sulfate", "≤ 250", "12,8", "mg/l"],
        ["Nitrate (tính theo N)", "≤ 11", "0,73", "mg/l"],
        ["Nhôm (Al)", "≤ 0,2", "< 0,050", "mg/l"]
      ]],
      ["Kim loại nặng", [
        ["Arsen (As) tổng", "≤ 0,01", "< 0,0005", "mg/l"],
        ["Chì (Pb)", "≤ 0,01", "Không phát hiện", "mg/l"],
        ["Thủy ngân (Hg)", "≤ 0,001", "Không phát hiện", "mg/l"],
        ["Cadimi (Cd)", "≤ 0,003", "Không phát hiện", "mg/l"],
        ["Mangan (Mn)", "≤ 0,1", "Không phát hiện", "mg/l"],
        ["Antimon (Sb)", "≤ 0,02", "< 0,0005", "mg/l"],
        ["Bari (Ba)", "≤ 1,3", "< 0,05", "mg/l"]
      ]],
      ["Sản phẩm phụ của quá trình khử trùng", [
        ["Monocloramin", "≤ 3000", "< 100", "µg/l"],
        ["Cloroform", "≤ 300", "12,0", "µg/l"],
        ["Dibromochlorometan", "≤ 100", "17,8", "µg/l"],
        ["Bromodichlorometan", "≤ 60", "19,3", "µg/l"],
        ["Bromoform", "≤ 100", "4,18", "µg/l"],
        ["Dicloroaxetonitril", "≤ 20", "1,26", "µg/l"],
        ["Dibromoaxetonitril", "≤ 70", "< 1,20", "µg/l"],
        ["Dichloroacetic acid", "≤ 50", "< 10", "µg/l"]
      ]],
      ["Phóng xạ", [
        ["Tổng hoạt độ phóng xạ α (Gross alpha)", "≤ 0,1", "Không phát hiện", "Bq/l"],
        ["Tổng hoạt độ phóng xạ β (Gross beta)", "≤ 1,0", "< 0,150", "Bq/l"]
      ]]
    ],
    // Mô tả nhóm chỉ tiêu còn lại, builder tự tính số lượng
    conLai: "Đó là nhóm thuốc trừ sâu, dung môi công nghiệp và các hợp chất hữu cơ như Benzen, Toluen, Xylen, Vinyl clorua, DDT, Atrazine, Chlorpyrifos. Máy đo không tìm thấy dấu vết nào trong mẫu nước."
  }
];

module.exports = { KY };
