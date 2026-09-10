/* ============================================================
   DỮ LIỆU CÁC KỲ KIỂM NGHIỆM NƯỚC
   ------------------------------------------------------------
   Thêm một kỳ mới: chép nguyên khối { ... } của kỳ cùng loại,
   sửa số liệu theo phiếu mới, đặt lên ĐẦU mảng KY, rồi chạy:

       node tools/build-kiem-nghiem.js

   Hai loại phiếu, khác nhau cả đơn vị lẫn quy chuẩn:
   - loai "dinh-ky": hằng tháng, Trung tâm Kiểm soát Bệnh tật
     tỉnh Đồng Tháp, đối chiếu QCĐP 01:2022/BTr, ít chỉ tiêu,
     lấy mẫu ở NHIỀU điểm (nhà máy và trên mạng lưới).
   - loai "day-du": mỗi năm một lần, Viện Y tế Công cộng TP.HCM,
     đối chiếu QCVN 01-1:2024/BYT, gần trăm chỉ tiêu, một điểm.

   Quy ước an toàn:
   - ketLuan chép NGUYÊN VĂN mục Nhận xét trên phiếu.
   - Phiếu ít chỉ tiêu thì chép đủ (chepDu: true).
     Phiếu gần trăm chỉ tiêu thì chỉ chép các chỉ tiêu có số đo
     được, phần còn lại gộp một dòng, vì gõ tay nhiều số liệu an
     toàn nước rất dễ sai mà PDF gốc mới là văn bản có giá trị.
   - Ngày nào trên phiếu không đọc chắc chắn thì BỎ TRỐNG, đừng đoán.
   ============================================================ */

const KY = [
  /* ---------------- Kỳ 08/2026: phiếu năm, đầy đủ ---------------- */
  {
    slug: "ky-08-2026",
    nam: 2026,
    thang: 8,
    nhan: "Kỳ 08/2026",
    loai: "day-du",
    soChiTieu: 98,
    chepDu: false,
    soPhieu: "044284/VYTCC",
    donViKN: "Viện Y tế Công cộng Thành phố Hồ Chí Minh, Bộ Y tế",
    donViNgan: "Viện Y tế Công cộng Thành phố Hồ Chí Minh",
    congNhan: "VILAS 219, Văn phòng Công nhận Chất lượng (BoA). Các phép thử đánh dấu (a) được công nhận phù hợp ISO/IEC 17025:2017",
    tenMau: "Nước đã xử lý",
    ngayLay: "05/08/2026",
    thoiGianThu: "05/08/2026 tới 13/08/2026",
    ngayKy: "14/08/2026",
    ngayKyISO: "2026-08-14",
    ngayDang: "2026-09-10",
    quyChuan: "QCVN 01-1:2024/BYT",
    quyChuanTen: "Quy chuẩn kỹ thuật quốc gia về chất lượng nước sạch sử dụng cho mục đích sinh hoạt, Bộ Y tế ban hành",
    ketLuan: "Mẫu NƯỚC ĐÃ XỬ LÝ có các chỉ tiêu được kiểm nghiệm đạt Quy chuẩn kỹ thuật quốc gia về chất lượng nước sạch sử dụng cho mục đích sinh hoạt QCVN 01-1:2024/BYT do Bộ Y tế ban hành.",
    pdf: "phieu-kiem-nghiem-nmn-mo-cay-08-2026.pdf",
    conLai: "Đó là nhóm thuốc trừ sâu, dung môi công nghiệp và các hợp chất hữu cơ như Benzen, Toluen, Xylen, Vinyl clorua, DDT, Atrazine, Chlorpyrifos. Máy đo không tìm thấy dấu vết nào trong mẫu nước.",
    phieu: [
      {
        diem: "Nhà máy nước Mỏ Cày",
        diaChi: "xã Mỏ Cày, tỉnh Vĩnh Long",
        maMau: "31972.26",
        luongMau: "01 chai x 1,5 lít và 02 bình x 5 lít",
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
        ]
      }
    ]
  },

  /* ---------------- Kỳ 07/2026: phiếu tháng, 3 điểm lấy mẫu ---------------- */
  {
    slug: "ky-07-2026",
    nam: 2026,
    thang: 7,
    nhan: "Kỳ 07/2026",
    loai: "dinh-ky",
    soChiTieu: 10,
    chepDu: true,
    soPhieu: "0229.26/KSBT-XN",
    donViKN: "Trung tâm Kiểm soát Bệnh tật tỉnh Đồng Tháp, Sở Y tế Đồng Tháp",
    donViNgan: "Trung tâm Kiểm soát Bệnh tật tỉnh Đồng Tháp",
    congNhan: "VILAS 502, Văn phòng Công nhận Chất lượng (BoA). Các phép thử đánh dấu (*) được công nhận phù hợp TCVN ISO/IEC 17025:2017",
    tenMau: "Nước đã xử lý",
    ngayLay: "21/07/2026",
    thoiGianThu: "21/07/2026 tới 29/07/2026",
    ngayKy: "",              // để trống: ngày viết tay trên ba phiếu không thống nhất
    ngayKyISO: "2026-07-29",
    ngayDang: "2026-09-10",
    quyChuan: "QCĐP 01:2022/BTr",
    quyChuanTen: "Quy chuẩn kỹ thuật địa phương về chất lượng nước sạch sử dụng cho mục đích sinh hoạt",
    ketLuan: "Mẫu thử nghiệm có các chỉ tiêu đạt theo QCĐP 01:2022/BTr.",
    pdf: "phieu-kiem-nghiem-nmn-mo-cay-07-2026.pdf",
    conLai: "",
    phieu: [
      {
        diem: "Nhà máy nước Mỏ Cày",
        diaChi: "xã Mỏ Cày, tỉnh Vĩnh Long",
        maMau: "0764.26",
        luongMau: "2,5 lít",
        nhom: [
          ["Cảm quan và lý hóa", [
            ["Mùi, vị", "Không có mùi, vị lạ", "Không có mùi, vị lạ", ""],
            ["Màu sắc", "≤ 15", "7,69", "TCU"],
            ["Độ pH", "6,0 tới 8,5", "7,19", ""],
            ["Độ đục", "≤ 2", "0,56", "NTU"]
          ]],
          ["Vi sinh vật", [
            ["Coliforms", "< 3", "Không phát hiện", "CFU/100 ml"],
            ["E. Coli", "< 1", "Không phát hiện", "CFU/100 ml"]
          ]]
        ]
      },
      {
        diem: "Bệnh viện Cù Lao Minh",
        diaChi: "trên mạng lưới cấp nước",
        maMau: "0767.26",
        luongMau: "0,5 lít",
        nhom: [
          ["Vi sinh vật", [
            ["Coliforms", "< 3", "Không phát hiện", "CFU/100 ml"],
            ["E. Coli", "< 1", "Không phát hiện", "CFU/100 ml"]
          ]]
        ]
      },
      {
        diem: "Bến xe Mỏ Cày",
        diaChi: "trên mạng lưới cấp nước",
        maMau: "0768.26",
        luongMau: "0,5 lít",
        nhom: [
          ["Vi sinh vật", [
            ["Coliforms", "< 3", "Không phát hiện", "CFU/100 ml"],
            ["E. Coli", "< 1", "Không phát hiện", "CFU/100 ml"]
          ]]
        ]
      }
    ]
  }
];

module.exports = { KY };
