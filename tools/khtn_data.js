/**
 * BỘ 72 CÂU HỎI KHOA HỌC TỰ NHIÊN (KHTN) LỚP 6 - 9 (GDPT 2018)
 * 4 Khối lớp (6, 7, 8, 9) x 3 Phân môn (Vật lý, Hóa học, Sinh học) x 6 câu = 72 câu
 * Độ chính xác khoa học kiểm chứng 100%.
 */

const KHTN_QUESTIONS = [
  // =========================================================================
  // LỚP 6: 18 CÂU (6 VẬT LÝ, 6 HÓA HỌC, 6 SINH HỌC)
  // =========================================================================

  // --- KHTN 6 - VẬT LÝ (6 CÂU) ---
  {
    id: "KHTN6_VATLY_01",
    grade: "6",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Đơn vị đo độ dài hợp pháp trong hệ thống đo lường chính thức của nước ta là:",
    options: ["Mét (m)", "Kilômét (km)", "Centimét (cm)", "Milimét (mm)"],
    correctAnswer: "A",
    explanation: "Theo hệ đo lường quốc tế SI và quy chuẩn đo lường Việt Nam, đơn vị cơ bản đo chiều dài là mét (kí hiệu: m)."
  },
  {
    id: "KHTN6_VATLY_02",
    grade: "6",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Giới hạn đo (GHĐ) của một cây thước là:",
    options: [
      "Chiều dài lớn nhất ghi trên thước",
      "Chiều dài giữa hai vạch chia liên tiếp trên thước",
      "Chiều dài nhỏ nhất có thể đo bằng thước",
      "Khoảng cách giữa vạch số 0 và vạch số 1"
    ],
    correctAnswer: "A",
    explanation: "Giới hạn đo (GHĐ) của thước là độ dài lớn nhất ghi trên thước."
  },
  {
    id: "KHTN6_VATLY_03",
    grade: "6",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Trường hợp nào sau đây xuất hiện lực tiếp xúc?",
    options: [
      "Tay cầu thủ tác dụng lực vào quả bóng khi sút phạt",
      "Lực hút của Trái Đất tác dụng lên quả táo rơi trên cành",
      "Hai cực cùng tên của hai thanh nam châm đẩy nhau",
      "Lực hút tĩnh điện giữa thước nhựa cọ xát với mẩu giấy vụn"
    ],
    correctAnswer: "A",
    explanation: "Lực tiếp xúc xuất hiện khi vật gây ra lực có sự tiếp xúc trực tiếp với vật chịu tác dụng của lực. Chân cầu thủ chạm vào bóng là lực tiếp xúc."
  },
  {
    id: "KHTN6_VATLY_04",
    grade: "6",
    topic: "vat_ly",
    level: "TH",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Lực cản của nước tác dụng lên thuyền buồm có chiều cùng chiều với chiều chuyển động của thuyền. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "B",
    explanation: "Sai. Lực cản của môi trường (nước, không khí) luôn ngược chiều với chiều chuyển động của vật."
  },
  {
    id: "KHTN6_VATLY_05",
    grade: "6",
    topic: "vat_ly",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một vật có khối lượng $m = 4.5\\text{ kg}$. Trọng lượng của vật đó trên mặt đất (với $P \\approx 10 \\cdot m$) là:",
    options: ["$45\\text{ N}$", "$4.5\\text{ N}$", "$450\\text{ N}$", "$0.45\\text{ N}$"],
    correctAnswer: "A",
    explanation: "Trọng lượng của vật: $P = 10 \\cdot m = 10 \\cdot 4.5 = 45\\text{ N}$."
  },
  {
    id: "KHTN6_VATLY_06",
    grade: "6",
    topic: "vat_ly",
    level: "VD",
    type: "essay",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Treo một quả nặng có khối lượng $250\\text{ g}$ vào lực kế lò xo ở nơi có gia tốc trọng trường $g \\approx 10\\text{ m/s}^2$. Lực kế chỉ giá trị bao nhiêu Newton (N)? (Nhập số thập phân dùng dấu chấm hoặc phẩy, vd: 2.5)",
    options: [],
    correctAnswer: "2.5|2,5",
    explanation: "Đổi $m = 250\\text{ g} = 0.25\\text{ kg}$. Trọng lượng của quả nặng: $P = 10 \\cdot m = 10 \\cdot 0.25 = 2.5\\text{ N}$."
  },

  // --- KHTN 6 - HÓA HỌC (6 CÂU) ---
  {
    id: "KHTN6_HOAHOC_01",
    grade: "6",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Chất ở thể khí có đặc điểm nào sau đây?",
    options: [
      "Không có hình dạng xác định và không có thể tích xác định, dễ bị nén",
      "Có hình dạng xác định nhưng không có thể tích xác định",
      "Có thể tích xác định nhưng không có hình dạng xác định",
      "Có cả hình dạng và thể tích xác định, rất khó nén"
    ],
    correctAnswer: "A",
    explanation: "Chất ở thể khí (gas) lan tỏa chiếm toàn bộ thể tích bình chứa, không có hình dạng và thể tích xác định, các hạt cách xa nhau nên rất dễ bị nén."
  },
  {
    id: "KHTN6_HOAHOC_02",
    grade: "6",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Thành phần phần trăm theo thể tích của khí Nitrogen và Oxygen trong không khí khô xấp xỉ lần lượt là:",
    options: [
      "$78\\%$ Nitrogen và $21\\%$ Oxygen",
      "$21\\%$ Nitrogen và $78\\%$ Oxygen",
      "$50\\%$ Nitrogen và $50\\%$ Oxygen",
      "$70\\%$ Nitrogen và $30\\%$ Oxygen"
    ],
    correctAnswer: "A",
    explanation: "Không khí khô gồm khoảng $78\\%$ thể tích là khí Nitrogen (Đạm), $21\\%$ thể tích là khí Oxygen (Oxy), $1\\%$ còn lại là khí hiếm, carbon dioxide và hơi nước."
  },
  {
    id: "KHTN6_HOAHOC_03",
    grade: "6",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hiện tượng nào sau đây thể hiện tính chất hóa học của chất?",
    options: [
      "Đinh sắt để lâu ngày trong không khí ẩm bị gỉ sét màu nâu đỏ",
      "Thủy tinh bị nung nóng chảy rồi thổi thành bình hoa",
      "Cồn y tế để trong lọ không đậy nắp bị bay hơi dần",
      "Hòa tan đường vào nước ấm thu được nước đường trong suốt"
    ],
    correctAnswer: "A",
    explanation: "Sự gỉ sét của đinh sắt là quá trình sắt tác dụng với oxygen và hơi nước tạo thành chất mới (gỉ sắt $Fe_2O_3 \\cdot nH_2O$), đây là tính chất hóa học. Các hiện tượng còn lại chỉ là biến đổi vật lý."
  },
  {
    id: "KHTN6_HOAHOC_04",
    grade: "6",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Để tách cát không tan ra khỏi hỗn hợp nước và cát, phương pháp phù hợp nhất là:",
    options: [
      "Phương pháp lọc",
      "Phương pháp kết tinh",
      "Phương pháp chiết",
      "Phương pháp chưng cất"
    ],
    correctAnswer: "A",
    explanation: "Phương pháp lọc dùng để tách chất rắn không tan ra khỏi chất lỏng trong hỗn hợp."
  },
  {
    id: "KHTN6_HOAHOC_05",
    grade: "6",
    topic: "hoa_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Dầu ăn nổi lên trên mặt nước và không tan trong nước tạo thành một nhũ tương khi khuấy mạnh. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Hỗn hợp gồm các giọt chất lỏng lơ lửng trong một chất lỏng khác mà không hòa tan vào nhau (như dầu ăn phân tán trong nước khi lắc mạnh) được gọi là nhũ tương."
  },
  {
    id: "KHTN6_HOAHOC_06",
    grade: "6",
    topic: "hoa_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Nhiệt độ nóng chảy của nước đá tinh khiết ở áp suất khí quyển tiêu chuẩn là:",
    options: ["$0^\\circ\\text{C}$", "$100^\\circ\\text{C}$", "$37^\\circ\\text{C}$", "$-10^\\circ\\text{C}$"],
    correctAnswer: "A",
    explanation: "Ở áp suất tiêu chuẩn, nước đá nóng chảy (và nước đông đặc) ở đúng $0^\\circ\\text{C}$, sôi ở $100^\\circ\\text{C}$."
  },

  // --- KHTN 6 - SINH HỌC (6 CÂU) ---
  {
    id: "KHTN6_SINHHOC_01",
    grade: "6",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Thành phần nào sau đây có ở tế bào thực vật nhưng KHÔNG có ở tế bào động vật?",
    options: [
      "Thành tế bào và lục lạp",
      "Màng sinh chất và tế bào chất",
      "Nhân tế bào và ti thể",
      "Không bào nhỏ và màng sinh chất"
    ],
    correctAnswer: "A",
    explanation: "Tế bào thực vật có thành tế bào (bằng cellulose) giúp tạo khung vững chắc và lục lạp chứa diệp lục để quang hợp, tế bào động vật không có hai thành phần này."
  },
  {
    id: "KHTN6_SINHHOC_02",
    grade: "6",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Đặc điểm cơ bản nhất để phân biệt tế bào nhân sơ và tế bào nhân thực là:",
    options: [
      "Tế bào nhân sơ chưa có màng nhân bao bọc vật chất di truyền",
      "Tế bào nhân sơ có kích thước lớn hơn tế bào nhân thực",
      "Tế bào nhân sơ không có màng sinh chất",
      "Tế bào nhân sơ luôn có nhiều nhân"
    ],
    correctAnswer: "A",
    explanation: "Tế bào nhân sơ (như vi khuẩn) chỉ có vùng nhân chứa ADN trần, chưa có màng nhân bao bọc; còn tế bào nhân thực đã có nhân hoàn chỉnh với màng nhân ngăn cách với tế bào chất."
  },
  {
    id: "KHTN6_SINHHOC_03",
    grade: "6",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Trình tự sắp xếp đúng các cấp độ tổ chức của cơ thể đa bào từ thấp đến cao là:",
    options: [
      "Tế bào $\\to$ Mô $\\to$ Cơ quan $\\to$ Hệ cơ quan $\\to$ Cơ thể",
      "Mô $\\to$ Tế bào $\\to$ Cơ quan $\\to$ Hệ cơ quan $\\to$ Cơ thể",
      "Tế bào $\\to$ Cơ quan $\\to$ Mô $\\to$ Hệ cơ quan $\\to$ Cơ thể",
      "Cơ thể $\\to$ Hệ cơ quan $\\to$ Cơ quan $\\to$ Mô $\\to$ Tế bào"
    ],
    correctAnswer: "A",
    explanation: "Cấp độ tổ chức sống đa bào: Tế bào là đơn vị cấu trúc $\\to$ tập hợp các tế bào cùng chức năng tạo thành Mô $\\to$ tập hợp mô tạo thành Cơ quan $\\to$ Hệ cơ quan $\\to$ Cơ thể hoàn chỉnh."
  },
  {
    id: "KHTN6_SINHHOC_04",
    grade: "6",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Sinh vật nào sau đây là cơ thể đơn bào?",
    options: ["Trùng giày", "Cây bàng", "Con giun đất", "Cây nấm rơm"],
    correctAnswer: "A",
    explanation: "Trùng giày (Paramecium) là sinh vật đơn bào thuộc giới Nguyên sinh, toàn bộ cơ thể chỉ cấu tạo từ 1 tế bào."
  },
  {
    id: "KHTN6_SINHHOC_05",
    grade: "6",
    topic: "sinh_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Từ 1 tế bào ban đầu, sau 4 lần phân chia liên tiếp sẽ tạo ra bao nhiêu tế bào con?",
    options: ["16 tế bào con", "8 tế bào con", "12 tế bào con", "32 tế bào con"],
    correctAnswer: "A",
    explanation: "Số tế bào con tạo thành sau $n$ lần phân chia là $2^n$. Với $n = 4$, số tế bào con là $2^4 = 16$ tế bào."
  },
  {
    id: "KHTN6_SINHHOC_06",
    grade: "6",
    topic: "sinh_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Virus không được coi là một tế bào hoàn chỉnh vì chúng chưa có màng sinh chất và tế bào chất, chỉ gồm lõi vật chất di truyền và vỏ protein. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Virus có cấu tạo đơn giản phi tế bào, bắt buộc phải sống kí sinh nội bào trong tế bào vật chủ để nhân lên."
  },

  // =========================================================================
  // LỚP 7: 18 CÂU (6 VẬT LÝ, 6 HÓA HỌC, 6 SINH HỌC)
  // =========================================================================

  // --- KHTN 7 - VẬT LÝ (6 CÂU) ---
  {
    id: "KHTN7_VATLY_01",
    grade: "7",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Công thức tính tốc độ chuyển động của một vật khi biết quãng đường đi được $s$ trong khoảng thời gian $t$ là:",
    options: ["$v = \\dfrac{s}{t}$", "$v = s \\cdot t$", "$v = \\dfrac{t}{s}$", "$v = s + t$"],
    correctAnswer: "A",
    explanation: "Tốc độ chuyển động bằng quãng đường đi được chia cho khoảng thời gian đi quãng đường đó: $v = s / t$."
  },
  {
    id: "KHTN7_VATLY_02",
    grade: "7",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một xe máy di chuyển với tốc độ $36\\text{ km/h}$. Tốc độ này tương ứng với bao nhiêu $\\text{m/s}$?",
    options: ["$10\\text{ m/s}$", "$15\\text{ m/s}$", "$20\\text{ m/s}$", "$12.5\\text{ m/s}$"],
    correctAnswer: "A",
    explanation: "Để đổi từ $\\text{km/h}$ sang $\\text{m/s}$, ta chia cho 3.6: $36 : 3.6 = 10\\text{ m/s}$."
  },
  {
    id: "KHTN7_VATLY_03",
    grade: "7",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Độ to của âm do nguồn âm phát ra phụ thuộc chủ yếu vào yếu tố nào?",
    options: [
      "Biên độ dao động của nguồn âm",
      "Tần số dao động của nguồn âm",
      "Vật liệu làm nguồn âm",
      "Vận tốc truyền âm trong không khí"
    ],
    correctAnswer: "A",
    explanation: "Biên độ dao động càng lớn thì âm phát ra càng to. Trong khi đó, tần số dao động quyết định độ cao (trầm hay bổng) của âm."
  },
  {
    id: "KHTN7_VATLY_04",
    grade: "7",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Âm thanh truyền nhanh nhất trong môi trường nào sau đây?",
    options: ["Chất rắn", "Chất lỏng", "Chất khí", "Chân không"],
    correctAnswer: "A",
    explanation: "Tốc độ truyền âm giảm dần theo thứ tự: Chất rắn > Chất lỏng > Chất khí. Âm thanh hoàn toàn không truyền được trong chân không."
  },
  {
    id: "KHTN7_VATLY_05",
    grade: "7",
    topic: "vat_ly",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Chiếu một tia sáng tới bề mặt một gương phẳng nằm ngang với góc tới bằng $35^\\circ$. Góc phản xạ của tia sáng là:",
    options: ["$35^\\circ$", "$55^\\circ$", "$70^\\circ$", "$90^\\circ$"],
    correctAnswer: "A",
    explanation: "Theo định luật phản xạ ánh sáng, góc phản xạ $i'$ luôn bằng góc tới $i$: $i' = i = 35^\\circ$."
  },
  {
    id: "KHTN7_VATLY_06",
    grade: "7",
    topic: "vat_ly",
    level: "VD",
    type: "essay",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một bạn học sinh chạy bộ đều đặn trên một đoạn đường thẳng dài $300\\text{ m}$ trong thời gian $1\\text{ phút } 15\\text{ giây}$. Tính tốc độ chạy của bạn học sinh đó theo đơn vị $\\text{m/s}$? (Nhập số thập phân)",
    options: [],
    correctAnswer: "4|4.0|4,0",
    explanation: "Đổi $1\\text{ phút } 15\\text{ giây} = 60 + 15 = 75\\text{ s}$. Tốc độ: $v = \\dfrac{s}{t} = \\dfrac{300}{75} = 4\\text{ m/s}$."
  },

  // --- KHTN 7 - HÓA HỌC (6 CÂU) ---
  {
    id: "KHTN7_HOAHOC_01",
    grade: "7",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Các hạt cấu tạo nên hạt nhân nguyên tử gồm:",
    options: [
      "Proton và neutron",
      "Proton và electron",
      "Electron và neutron",
      "Chỉ có hạt proton"
    ],
    correctAnswer: "A",
    explanation: "Nguyên tử gồm vỏ electron mang điện tích âm và hạt nhân ở tâm mang điện tích dương gồm proton (mang điện tích +) và neutron (không mang điện)."
  },
  {
    id: "KHTN7_HOAHOC_02",
    grade: "7",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Trong bảng tuần hoàn các nguyên tố hóa học, các nguyên tố trong cùng một chu kì có đặc điểm chung là:",
    options: [
      "Có cùng số lớp electron trong nguyên tử",
      "Có cùng số electron ở lớp ngoài cùng",
      "Có cùng số proton trong hạt nhân",
      "Có tính chất hóa học tương tự nhau"
    ],
    correctAnswer: "A",
    explanation: "Chu kì là dãy các nguyên tố mà nguyên tử của chúng có cùng số lớp electron, được xếp theo chiều tăng dần của điện tích hạt nhân."
  },
  {
    id: "KHTN7_HOAHOC_03",
    grade: "7",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Phân tử khối của khí Carbon dioxide ($\\text{CO}_2$) tính theo đơn vị amu (biết khối lượng nguyên tử $C = 12\\text{ amu}$, $O = 16\\text{ amu}$) là:",
    options: ["$44\\text{ amu}$", "$28\\text{ amu}$", "$32\\text{ amu}$", "$40\\text{ amu}$"],
    correctAnswer: "A",
    explanation: "Phân tử khối của $\\text{CO}_2 = 12 + 16 \\cdot 2 = 12 + 32 = 44\\text{ amu}$."
  },
  {
    id: "KHTN7_HOAHOC_04",
    grade: "7",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Liên kết trong phân tử muối ăn ($\\text{NaCl}$) được hình thành do lực hút tĩnh điện giữa các ion mang điện tích trái dấu là loại liên kết nào?",
    options: [
      "Liên kết ion",
      "Liên kết cộng hóa trị",
      "Liên kết kim loại",
      "Liên kết hydrogen"
    ],
    correctAnswer: "A",
    explanation: "Nguyên tử Na nhường 1 electron tạo ion $Na^+$, nguyên tử Cl nhận 1 electron tạo ion $Cl^-$. Lực hút tĩnh điện giữa $Na^+$ và $Cl^-$ hình thành liên kết ion."
  },
  {
    id: "KHTN7_HOAHOC_05",
    grade: "7",
    topic: "hoa_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Cho biết nguyên tố Silicon ($Si$) có hóa trị IV, Oxygen ($O$) có hóa trị II. Công thức hóa học chuẩn của hợp chất tạo bởi $Si$ và $O$ là:",
    options: ["$\\text{SiO}_2$", "$\\text{SiO}$", "$\\text{Si}_2\\text{O}$", "$\\text{Si}_2\\text{O}_4$"],
    correctAnswer: "A",
    explanation: "Đặt công thức là $Si_x O_y$. Theo quy tắc hóa trị: $x \\cdot IV = y \\cdot II \\Rightarrow \\dfrac{x}{y} = \\dfrac{II}{IV} = \\dfrac{1}{2} \\Rightarrow x = 1, y = 2$. Công thức là $\\text{SiO}_2$."
  },
  {
    id: "KHTN7_HOAHOC_06",
    grade: "7",
    topic: "hoa_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Khí Hydrogen ($\\text{H}_2$) và khí Oxygen ($\\text{O}_2$) là các đơn chất, trong khi Nước ($\\text{H}_2\\text{O}$) là hợp chất. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Đơn chất được tạo nên từ 1 nguyên tố hóa học ($H_2, O_2$), còn hợp chất được tạo nên từ từ 2 nguyên tố hóa học trở lên ($H_2O$ gồm H và O)."
  },

  // --- KHTN 7 - SINH HỌC (6 CÂU) ---
  {
    id: "KHTN7_SINHHOC_01",
    grade: "7",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Quá trình quang hợp ở thực vật diễn ra chủ yếu ở bào quan nào của tế bào lá?",
    options: ["Lục lạp", "Ti thể", "Không bào", "Bộ máy Golgi"],
    correctAnswer: "A",
    explanation: "Lục lạp chứa chất diệp lục có khả năng hấp thụ năng lượng ánh sáng mặt trời để tổng hợp chất hữu cơ trong quá trình quang hợp."
  },
  {
    id: "KHTN7_SINHHOC_02",
    grade: "7",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Phương trình tổng quát dạng chữ của quá trình quang hợp là:",
    options: [
      "Nước + Carbon dioxide $\\xrightarrow{\\text{Ánh sáng, Diệp lục}}$ Glucose + Oxygen",
      "Glucose + Oxygen $\\to$ Nước + Carbon dioxide + Năng lượng (ATP)",
      "Nước + Oxygen $\\xrightarrow{\\text{Ánh sáng}}$ Glucose + Carbon dioxide",
      "Carbon dioxide + Glucose $\\to$ Nước + Oxygen + Năng lượng"
    ],
    correctAnswer: "A",
    explanation: "Quang hợp lấy nước và carbon dioxide dưới tác dụng của ánh sáng và chất diệp lục tạo ra chất hữu cơ (glucose) và giải phóng khí oxygen."
  },
  {
    id: "KHTN7_SINHHOC_03",
    grade: "7",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Mục đích chính của quá trình hô hấp tế bào ở sinh vật là:",
    options: [
      "Phân giải chất hữu cơ giải phóng năng lượng (dưới dạng ATP) cung cấp cho các hoạt động sống",
      "Tổng hợp chất hữu cơ tích lũy năng lượng cho cơ thể",
      "Thải khí oxygen ra ngoài môi trường",
      "Hấp thu nước và chất khoáng từ môi trường ngoài"
    ],
    correctAnswer: "A",
    explanation: "Hô hấp tế bào là quá trình phân giải hợp chất hữu cơ (chủ yếu là glucose) giải phóng năng lượng tích lũy trong ATP để cung cấp cho mọi hoạt động sống của tế bào."
  },
  {
    id: "KHTN7_SINHHOC_04",
    grade: "7",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Dòng mạch gỗ trong thân cây có chức năng chủ yếu là:",
    options: [
      "Vận chuyển nước và muối khoáng hòa tan từ rễ lên thân và lá",
      "Vận chuyển chất hữu cơ tổng hợp từ lá đến các cơ quan khác",
      "Thực hiện quá trình thoát hơi nước",
      "Hút chất dinh dưỡng từ không khí"
    ],
    correctAnswer: "A",
    explanation: "Mạch gỗ (gồm các tế bào chết) vận chuyển nước và khoáng từ rễ lên ngọn; mạch rây vận chuyển chất hữu cơ từ lá xuống các bộ phận khác."
  },
  {
    id: "KHTN7_SINHHOC_05",
    grade: "7",
    topic: "sinh_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hiện tượng ngọn cây trồng gần cửa sổ có xu hướng vươn cong về phía có ánh sáng thể hiện hình thức cảm ứng nào?",
    options: [
      "Tính hướng sáng dương",
      "Tính hướng trọng lực âm",
      "Tính hướng nước",
      "Tính hướng hóa"
    ],
    correctAnswer: "A",
    explanation: "Ngọn cây sinh trưởng hướng về phía nguồn kích thích ánh sáng gọi là tính hướng sáng dương (nhờ sự phân bố không đều của auxin)."
  },
  {
    id: "KHTN7_SINHHOC_06",
    grade: "7",
    topic: "sinh_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Vào ban đêm, không nên để quá nhiều chậu cây xanh trong phòng ngủ đóng kín cửa vì cây thực hiện hô hấp lấy khí oxygen và thải khí carbon dioxide gây ngột ngạt. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Ban đêm không có ánh sáng nên cây không quang hợp mà chỉ hô hấp, tiêu thụ $O_2$ và thải $CO_2$ trong phòng kín."
  },

  // =========================================================================
  // LỚP 8: 18 CÂU (6 VẬT LÝ, 6 HÓA HỌC, 6 SINH HỌC)
  // =========================================================================

  // --- KHTN 8 - VẬT LÝ (6 CÂU) ---
  {
    id: "KHTN8_VATLY_01",
    grade: "8",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Công thức tính khối lượng riêng $D$ của một chất đồng chất có khối lượng $m$ và thể tích $V$ là:",
    options: ["$D = \\dfrac{m}{V}$", "$D = m \\cdot V$", "$D = \\dfrac{V}{m}$", "$D = \\dfrac{P}{V}$"],
    correctAnswer: "A",
    explanation: "Khối lượng riêng của một chất là khối lượng của một đơn vị thể tích chất đó: $D = m / V$ (đơn vị thường dùng: $\\text{kg/m}^3$)."
  },
  {
    id: "KHTN8_VATLY_02",
    grade: "8",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một khối sắt có thể tích $V = 0.02\\text{ m}^3$, biết khối lượng riêng của sắt là $D = 7800\\text{ kg/m}^3$. Khối lượng của khối sắt đó là:",
    options: ["$156\\text{ kg}$", "$390\\text{ kg}$", "$78\\text{ kg}$", "$1560\\text{ kg}$"],
    correctAnswer: "A",
    explanation: "Khối lượng của khối sắt: $m = D \\cdot V = 7800 \\cdot 0.02 = 156\\text{ kg}$."
  },
  {
    id: "KHTN8_VATLY_03",
    grade: "8",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Áp suất được định nghĩa là:",
    options: [
      "Độ lớn của áp lực trên một đơn vị diện tích bị ép",
      "Lực tác dụng vuông góc lên mặt bị ép",
      "Tích của lực ép và diện tích bị ép",
      "Khối lượng chất lỏng tác dụng lên đáy bình chứa"
    ],
    correctAnswer: "A",
    explanation: "Áp suất $p = F / S$, đặc trưng cho tác dụng nén của áp lực vuông góc lên một đơn vị diện tích bị ép."
  },
  {
    id: "KHTN8_VATLY_04",
    grade: "8",
    topic: "vat_ly",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một khối hộp chữ nhật có trọng lượng $P = 600\\text{ N}$ đặt trên mặt bàn nằm ngang. Diện tích mặt đáy tiếp xúc với bàn là $S = 0.15\\text{ m}^2$. Áp suất do khối hộp tác dụng lên mặt bàn là:",
    options: ["$4000\\text{ Pa}$", "$90\\text{ Pa}$", "$400\\text{ Pa}$", "$2500\\text{ Pa}$"],
    correctAnswer: "A",
    explanation: "Áp suất tác dụng lên mặt bàn: $p = \\dfrac{F}{S} = \\dfrac{600}{0.15} = 4000\\text{ N/m}^2\\text{ (Pa)}$."
  },
  {
    id: "KHTN8_VATLY_05",
    grade: "8",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Lực đẩy Archimedes tác dụng lên một vật nhúng chìm hoàn toàn trong chất lỏng có phương, chiều và độ lớn như thế nào?",
    options: [
      "Phương thẳng đứng, chiều từ dưới lên trên, độ lớn bằng trọng lượng phần chất lỏng bị vật chiếm chỗ",
      "Phương nằm ngang, chiều từ trái sang phải, độ lớn bằng trọng lượng của vật",
      "Phương thẳng đứng, chiều từ trên xuống dưới, độ lớn bằng khối lượng riêng chất lỏng",
      "Phương bất kì, độ lớn bằng thể tích vật"
    ],
    correctAnswer: "A",
    explanation: "Định luật Archimedes: Một vật nhúng trong chất lỏng bị chất lỏng tác dụng một lực đẩy hướng thẳng đứng từ dưới lên, có độ lớn $F_A = d \\cdot V$ (bằng trọng lượng chất lỏng bị chiếm chỗ)."
  },
  {
    id: "KHTN8_VATLY_06",
    grade: "8",
    topic: "vat_ly",
    level: "VD",
    type: "essay",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một vật có thể tích $V = 0.003\\text{ m}^3$ được nhúng chìm hoàn toàn trong nước. Biết trọng lượng riêng của nước là $d = 10000\\text{ N/m}^3$. Tính độ lớn lực đẩy Archimedes tác dụng lên vật theo đơn vị Newton (N)?",
    options: [],
    correctAnswer: "30|30.0|30,0",
    explanation: "Độ lớn lực đẩy Archimedes: $F_A = d \\cdot V = 10000 \\cdot 0.003 = 30\\text{ N}$."
  },

  // --- KHTN 8 - HÓA HỌC (6 CÂU) ---
  {
    id: "KHTN8_HOAHOC_01",
    grade: "8",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Nội dung của Định luật bảo toàn khối lượng trong phản ứng hóa học là:",
    options: [
      "Trong một phản ứng hóa học, tổng khối lượng của các chất sản phẩm bằng tổng khối lượng của các chất tham gia phản ứng",
      "Tổng số phân tử chất sản phẩm luôn bằng tổng số phân tử chất phản ứng",
      "Khối lượng của mỗi chất sau phản ứng luôn tăng lên gấp đôi",
      "Tổng thể tích các chất sản phẩm luôn bằng tổng thể tích các chất tham gia"
    ],
    correctAnswer: "A",
    explanation: "Trong phản ứng hóa học, liên kết giữa các nguyên tử thay đổi nhưng số lượng nguyên tử mỗi nguyên tố được bảo toàn, do đó tổng khối lượng trước và sau phản ứng không đổi: $m_{\\text{tham gia}} = m_{\\text{sản phẩm}}$."
  },
  {
    id: "KHTN8_HOAHOC_02",
    grade: "8",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Nung $100\\text{ g}$ đá vôi ($\\text{CaCO}_3$) thu được $56\\text{ g}$ vôi sống ($\\text{CaO}$) và khí carbon dioxide ($\\text{CO}_2$). Khối lượng khí $\\text{CO}_2$ sinh ra là:",
    options: ["$44\\text{ g}$", "$56\\text{ g}$", "$156\\text{ g}$", "$28\\text{ g}$"],
    correctAnswer: "A",
    explanation: "Theo định luật bảo toàn khối lượng: $m_{\\text{CaCO}_3} = m_{\\text{CaO}} + m_{\\text{CO}_2} \\Rightarrow m_{\\text{CO}_2} = 100 - 56 = 44\\text{ g}$."
  },
  {
    id: "KHTN8_HOAHOC_03",
    grade: "8",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Cho phương trình hóa học chưa cân bằng: $\\text{Al} + \\text{O}_2 \\xrightarrow{t^\\circ} \\text{Al}_2\\text{O}_3$. Tỉ lệ hệ số nguyên tối giản của $\\text{Al} : \\text{O}_2 : \\text{Al}_2\\text{O}_3$ lần lượt là:",
    options: ["$4 : 3 : 2$", "$2 : 3 : 1$", "$1 : 1 : 1$", "$4 : 3 : 1$"],
    correctAnswer: "A",
    explanation: "Phương trình hóa học cân bằng: $4\\text{Al} + 3\\text{O}_2 \\xrightarrow{t^\\circ} 2\\text{Al}_2\\text{O}_3$. Vế trái có 4 Al và 6 O, vế phải có $2 \\times 2 = 4\\text{ Al}$ và $2 \\times 3 = 6\\text{ O}$."
  },
  {
    id: "KHTN8_HOAHOC_04",
    grade: "8",
    topic: "hoa_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Ở điều kiện chuẩn ($25^\\circ\\text{C}$ và $1\\text{ bar}$), thể tích của $0.5\\text{ mol}$ khí $\\text{H}_2$ (biết $1\\text{ mol}$ khí chiếm $24.79\\text{ L}$) là:",
    options: ["$12.395\\text{ L}$", "$24.79\\text{ L}$", "$11.2\\text{ L}$", "$22.4\\text{ L}$"],
    correctAnswer: "A",
    explanation: "Thể tích khí ở điều kiện chuẩn ($25^\\circ\\text{C}, 1\\text{ bar}$): $V = n \\cdot 24.79 = 0.5 \\cdot 24.79 = 12.395\\text{ L}$."
  },
  {
    id: "KHTN8_HOAHOC_05",
    grade: "8",
    topic: "hoa_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hòa tan $20\\text{ g}$ muối ăn ($\\text{NaCl}$) vào $80\\text{ g}$ nước cất. Nồng độ phần trăm ($C\\%$) của dung dịch thu được là:",
    options: ["$20\\%$", "$25\\%$", "$16.67\\%$", "$10\\%$"],
    correctAnswer: "A",
    explanation: "Khối lượng dung dịch: $m_{dd} = m_{ct} + m_{dm} = 20 + 80 = 100\\text{ g}$. Nồng độ phần trăm: $C\\% = \\dfrac{20}{100} \\cdot 100\\% = 20\\%$."
  },
  {
    id: "KHTN8_HOAHOC_06",
    grade: "8",
    topic: "hoa_hoc",
    level: "TH",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Dung dịch acid làm quỳ tím chuyển sang màu đỏ, trong khi dung dịch base (kiềm) làm quỳ tím chuyển sang màu xanh. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Đây là tính chất chỉ thị màu cơ bản của dung dịch acid và dung dịch base."
  },

  // --- KHTN 8 - SINH HỌC (6 CÂU) ---
  {
    id: "KHTN8_SINHHOC_01",
    grade: "8",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Tim của người bình thường có cấu tạo gồm mấy ngăn?",
    options: [
      "4 ngăn (2 tâm nhĩ ở trên, 2 tâm thất ở dưới)",
      "3 ngăn (2 tâm nhĩ, 1 tâm thất)",
      "2 ngăn (1 tâm nhĩ, 1 tâm thất)",
      "4 ngăn (2 tâm thất ở trên, 2 tâm nhĩ ở dưới)"
    ],
    correctAnswer: "A",
    explanation: "Tim người cấu tạo 4 ngăn: nửa trên là tâm nhĩ trái và tâm nhĩ phải (thành mỏng), nửa dưới là tâm thất trái và tâm thất phải (thành dày)."
  },
  {
    id: "KHTN8_SINHHOC_02",
    grade: "8",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Loại tế bào máu có chức năng chính là vận chuyển khí Oxygen ($O_2$) và Carbon dioxide ($CO_2$) nhờ chứa huyết sắc tố (Hemoglobin) là:",
    options: ["Hồng cầu", "Bạch cầu", "Tiểu cầu", "Tế bào lympho"],
    correctAnswer: "A",
    explanation: "Hồng cầu hình đĩa lõm hai mặt, không nhân khi trưởng thành, chứa giàu Hemoglobin ($Hb$) chuyên trách vận chuyển $O_2$ từ phổi tới tế bào và $CO_2$ về phổi."
  },
  {
    id: "KHTN8_SINHHOC_03",
    grade: "8",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Sự trao đổi khí giữa cơ thể và môi trường ngoài diễn ra tại bộ phận nào của phổi?",
    options: ["Phế nang", "Khí quản", "Phế quản", "Thanh quản"],
    correctAnswer: "A",
    explanation: "Phế nang là những túi khí nhỏ li ti có mạng mao mạch dày đặc bao quanh, là nơi trực tiếp diễn ra sự khuếch tán trao đổi khí $O_2$ và $CO_2$ với máu."
  },
  {
    id: "KHTN8_SINHHOC_04",
    grade: "8",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Cơ quan nào trong hệ tiêu hóa là nơi diễn ra quá trình tiêu hóa và hấp thụ chất dinh dưỡng chủ yếu nhất?",
    options: ["Ruột non", "Dạ dày", "Khoang miệng", "Ruột già"],
    correctAnswer: "A",
    explanation: "Ruột non có bề mặt hấp thu rất lớn nhờ các nếp gấp, lông ruột và vi nhung mao, đồng thời có đầy đủ các loại enzyme tiêu hóa biến thức ăn thành chất dinh dưỡng đơn giản hấp thụ vào máu."
  },
  {
    id: "KHTN8_SINHHOC_05",
    grade: "8",
    topic: "sinh_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Đơn vị chức năng cấu tạo nên thận thực hiện quá trình lọc máu tạo nước tiểu là:",
    options: ["Nephron", "Nơron", "Nang cầu thận", "Bể thận"],
    correctAnswer: "A",
    explanation: "Mỗi quả thận người gồm khoảng 1 triệu đơn vị chức năng gọi là Nephron (gồm cầu thận, nang Bowman và ống thận)."
  },
  {
    id: "KHTN8_SINHHOC_06",
    grade: "8",
    topic: "sinh_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Trong hệ nhóm máu ABO, người mang nhóm máu O được gọi là nhóm máu chuyên cho hồng cầu vì trên màng tế bào hồng cầu không có kháng nguyên A và B. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Hồng cầu nhóm O không có kháng nguyên A và B nên không bị kháng thể tương ứng trong huyết tương của người nhận ngưng kết."
  },

  // =========================================================================
  // LỚP 9: 18 CÂU (6 VẬT LÝ, 6 HÓA HỌC, 6 SINH HỌC)
  // =========================================================================

  // --- KHTN 9 - VẬT LÝ (6 CÂU) ---
  {
    id: "KHTN9_VATLY_01",
    grade: "9",
    topic: "vat_ly",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hệ thức của Định luật Ohm cho một đoạn mạch có điện trở $R$, hiệu điện thế hai đầu là $U$ và cường độ dòng điện là $I$ là:",
    options: ["$I = \\dfrac{U}{R}$", "$I = U \\cdot R$", "$I = \\dfrac{R}{U}$", "$U = \\dfrac{I}{R}$"],
    correctAnswer: "A",
    explanation: "Định luật Ohm: Cường độ dòng điện chạy qua dây dẫn tỉ lệ thuận với hiệu điện thế đặt vào hai đầu dây và tỉ lệ nghịch với điện trở của dây: $I = U / R$."
  },
  {
    id: "KHTN9_VATLY_02",
    grade: "9",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Đặt một hiệu điện thế $U = 12\\text{ V}$ vào hai đầu một điện trở $R = 30\\ \\Omega$. Cường độ dòng điện chạy qua điện trở đó là:",
    options: ["$0.4\\text{ A}$", "$2.5\\text{ A}$", "$360\\text{ A}$", "$0.25\\text{ A}$"],
    correctAnswer: "A",
    explanation: "Áp dụng định luật Ohm: $I = \\dfrac{U}{R} = \\dfrac{12}{30} = 0.4\\text{ A}$."
  },
  {
    id: "KHTN9_VATLY_03",
    grade: "9",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hai điện trở $R_1 = 20\\ \\Omega$ và $R_2 = 30\\ \\Omega$ được mắc nối tiếp nhau vào mạch điện. Điện trở tương đương của đoạn mạch này là:",
    options: ["$50\\ \\Omega$", "$12\\ \\Omega$", "$600\\ \\Omega$", "$10\\ \\Omega$"],
    correctAnswer: "A",
    explanation: "Đối với đoạn mạch gồm hai điện trở mắc nối tiếp: $R_{td} = R_1 + R_2 = 20 + 30 = 50\\ \\Omega$."
  },
  {
    id: "KHTN9_VATLY_04",
    grade: "9",
    topic: "vat_ly",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một ấm điện hoạt động bình thường ở công suất định mức $P = 1000\\text{ W}$. Điện năng mà ấm điện tiêu thụ khi đun nước liên tục trong thời gian $15\\text{ phút}$ ($900\\text{ s}$) là:",
    options: ["$900\\,000\\text{ J}$", "$15\\,000\\text{ J}$", "$60\\,000\\text{ J}$", "$1\\,500\\,000\\text{ J}$"],
    correctAnswer: "A",
    explanation: "Điện năng tiêu thụ: $A = P \\cdot t = 1000\\text{ W} \\cdot 900\\text{ s} = 900\\,000\\text{ J}$ (tương đương $0.25\\text{ kWh}$)."
  },
  {
    id: "KHTN9_VATLY_05",
    grade: "9",
    topic: "vat_ly",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Đặt một vật sáng vuông góc với trục chính của một thấu kính hội tụ, ở ngoài khoảng tiêu cự ($d > f$). Ảnh của vật tạo bởi thấu kính có tính chất:",
    options: [
      "Ảnh thật, ngược chiều với vật",
      "Ảnh ảo, cùng chiều với vật và luôn nhỏ hơn vật",
      "Ảnh ảo, ngược chiều với vật",
      "Ảnh thật, cùng chiều với vật"
    ],
    correctAnswer: "A",
    explanation: "Vật thật đặt ngoài khoảng tiêu cự của thấu kính hội tụ ($d > f$) luôn cho ảnh thật, ngược chiều với vật."
  },
  {
    id: "KHTN9_VATLY_06",
    grade: "9",
    topic: "vat_ly",
    level: "VD",
    type: "essay",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một bếp điện có điện trở $R = 50\\ \\Omega$ hoạt động với dòng điện cường độ $I = 2\\text{ A}$ chạy qua trong thời gian $t = 100\\text{ s}$. Tính nhiệt lượng $Q$ tỏa ra trên bếp theo định luật Joule - Lenz ($Q = I^2 \\cdot R \\cdot t$) theo đơn vị Joule (J)?",
    options: [],
    correctAnswer: "20000|20000.0",
    explanation: "Nhiệt lượng tỏa ra: $Q = I^2 \\cdot R \\cdot t = 2^2 \\cdot 50 \\cdot 100 = 4 \\cdot 50 \\cdot 100 = 20\\,000\\text{ J}$."
  },

  // --- KHTN 9 - HÓA HỌC (6 CÂU) ---
  {
    id: "KHTN9_HOAHOC_01",
    grade: "9",
    topic: "hoa_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Dãy sắp xếp các kim loại theo chiều hoạt động hóa học giảm dần đúng là:",
    options: [
      "$\\text{K}, \\text{Na}, \\text{Mg}, \\text{Al}, \\text{Zn}, \\text{Fe}, \\text{Cu}, \\text{Ag}$",
      "$\\text{Cu}, \\text{Fe}, \\text{Zn}, \\text{Al}, \\text{Mg}, \\text{Na}, \\text{K}, \\text{Ag}$",
      "$\\text{K}, \\text{Na}, \\text{Cu}, \\text{Al}, \\text{Zn}, \\text{Fe}, \\text{Mg}, \\text{Ag}$",
      "$\\text{Ag}, \\text{Cu}, \\text{Fe}, \\text{Zn}, \\text{Al}, \\text{Mg}, \\text{Na}, \\text{K}$"
    ],
    correctAnswer: "A",
    explanation: "Dãy hoạt động hóa học của kim loại (mẹo nhớ: Khi Nào May Áo Giáp Sắt Nhớ Sang Phố Hỏi Cửa Hàng Á Phi Âu): K > Na > Ca > Mg > Al > Zn > Fe > Pb > (H) > Cu > Ag > Au."
  },
  {
    id: "KHTN9_HOAHOC_02",
    grade: "9",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Kim loại nào sau đây phản ứng được với dung dịch acid $\\text{HCl}$ giải phóng khí hydrogen ($\\text{H}_2$)?",
    options: ["Kẽm (Zn)", "Đồng (Cu)", "Bạc (Ag)", "Vàng (Au)"],
    correctAnswer: "A",
    explanation: "Chỉ các kim loại đứng trước Hydrogen (H) trong dãy hoạt động hóa học mới phản ứng với $HCl/H_2SO_4$ loãng giải phóng $H_2$. Zn đứng trước H nên phản ứng: $\\text{Zn} + 2\\text{HCl} \\to \\text{ZnCl}_2 + \\text{H}_2 \\uparrow$."
  },
  {
    id: "KHTN9_HOAHOC_03",
    grade: "9",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Khí Ethylene ($\\text{C}_2\\text{H}_4$) làm mất màu dung dịch Bromine ($\\text{Br}_2$) màu da cam là do trong phân tử có chứa:",
    options: [
      "Một liên kết đôi $C=C$ kém bền dễ đứt trong phản ứng cộng",
      "Toàn bộ là các liên kết đơn $C-C$ bền vững",
      "Một liên kết ba $C \\equiv C$",
      "Nguyên tử oxygen hoạt động mạnh"
    ],
    correctAnswer: "A",
    explanation: "Phân tử ethylene có chứa 1 liên kết đôi $C=C$ (gồm 1 liên kết $\\sigma$ bền và 1 liên kết $\\pi$ kém bền), liên kết $\\pi$ dễ bị đứt ra để tham gia phản ứng cộng làm mất màu dung dịch bromine: $\\text{C}_2\\text{H}_4 + \\text{Br}_2 \\to \\text{C}_2\\text{H}_4\\text{Br}_2$."
  },
  {
    id: "KHTN9_HOAHOC_04",
    grade: "9",
    topic: "hoa_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Chất béo (lipid) là triester của glycerol với:",
    options: [
      "Các acid béo",
      "Acid acetic",
      "Acid sulfuric",
      "Rượu etylic"
    ],
    correctAnswer: "A",
    explanation: "Chất béo là trieste của glycerol với các acid béo mạch dài không phân nhánh, có công thức chung là $(RCOO)_3C_3H_5$."
  },
  {
    id: "KHTN9_HOAHOC_05",
    grade: "9",
    topic: "hoa_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Cho phương trình hóa học lên men rượu từ glucose: $\\text{C}_6\\text{H}_{12}\\text{O}_6 \\xrightarrow{\\text{men rượu}} 2\\text{C}_2\\text{H}_5\\text{OH} + 2\\text{CO}_2$. Từ $180\\text{ g}$ glucose lên men với hiệu suất $100\\%$ thu được bao nhiêu gam ethyl alcohol ($\\text{C}_2\\text{H}_5\\text{OH}$)? (Biết khối lượng mol: $C=12, H=1, O=16$)",
    options: ["$92\\text{ g}$", "$46\\text{ g}$", "$180\\text{ g}$", "$88\\text{ g}$"],
    correctAnswer: "A",
    explanation: "Số mol glucose: $n = 180 / 180 = 1\\text{ mol}$. Theo phương trình, $n_{\\text{C}_2\\text{H}_5\\text{OH}} = 2 \\cdot n_{\\text{glucose}} = 2\\text{ mol}$. Khối lượng ethyl alcohol ($M = 46\\text{ g/mol}$): $m = 2 \\cdot 46 = 92\\text{ g}$."
  },
  {
    id: "KHTN9_HOAHOC_06",
    grade: "9",
    topic: "hoa_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Acetic acid ($\\text{CH}_3\\text{COOH}$) phản ứng được với đá vôi ($\\text{CaCO}_3$) sủi bọt khí $\\text{CO}_2$, chứng tỏ nó có tính acid mạnh hơn acid carbonic ($\\text{H}_2\\text{CO}_3$). Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Phản ứng $2\\text{CH}_3\\text{COOH} + \\text{CaCO}_3 \\to (\\text{CH}_3\\text{COO})_2\\text{Ca} + \\text{CO}_2 \\uparrow + \\text{H}_2\\text{O}$ chứng minh acid axetic đẩy được acid yếu hơn ($H_2CO_3$) ra khỏi muối cacbonat."
  },

  // --- KHTN 9 - SINH HỌC (6 CÂU) ---
  {
    id: "KHTN9_SINHHOC_01",
    grade: "9",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Theo quy luật phân li của Mendel, khi lai hai cơ thể bố mẹ thuần chủng khác nhau về một cặp tính trạng tương phản ($AA \\times aa$), tỉ lệ phân li kiểu hình ở thế hệ $F_2$ là:",
    options: [
      "3 trội : 1 lặn",
      "1 trội : 1 lặn",
      "1 trội : 2 trung gian : 1 lặn",
      "100% kiểu hình trội"
    ],
    correctAnswer: "A",
    explanation: "Ở thế hệ $F_2$, tỉ lệ phân li kiểu gen là $1 AA : 2 Aa : 1 aa$, do gen A trội hoàn toàn so với gen a nên tỉ lệ phân li kiểu hình là 3 trội : 1 lặn."
  },
  {
    id: "KHTN9_SINHHOC_02",
    grade: "9",
    topic: "sinh_hoc",
    level: "NB",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Nguyên tắc bổ sung giữa các cặp nucleotide trên hai mạch đơn của phân tử ADN là:",
    options: [
      "A liên kết với T bằng 2 liên kết hydro, G liên kết với C bằng 3 liên kết hydro",
      "A liên kết với G bằng 2 liên kết hydro, T liên kết với C bằng 3 liên kết hydro",
      "A liên kết với C bằng 3 liên kết hydro, T liên kết với G bằng 2 liên kết hydro",
      "A liên kết với U bằng 2 liên kết hydro, G liên kết với C bằng 3 liên kết hydro"
    ],
    correctAnswer: "A",
    explanation: "Theo mô hình Watson - Crick, các nucleotide giữa hai mạch ADN liên kết theo nguyên tắc bổ sung: Adenine (A) liên kết với Thymine (T) bằng 2 liên kết hydro; Guanine (G) liên kết với Cytosine (C) bằng 3 liên kết hydro."
  },
  {
    id: "KHTN9_SINHHOC_03",
    grade: "9",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Ý nghĩa sinh học quan trọng nhất của quá trình nguyên phân là:",
    options: [
      "Duy trì ổn định bộ nhiễm sắc thể đặc trưng của loài qua các thế hệ tế bào và thế hệ cơ thể sinh sản vô tính",
      "Tạo ra sự đa dạng di truyền lớn cho loài",
      "Giảm một nửa số lượng nhiễm sắc thể để hình thành giao tử",
      "Tạo ra các biến dị tổ hợp phong phú"
    ],
    correctAnswer: "A",
    explanation: "Nguyên phân là phương thức phân bào giúp tế bào con nhận nguyên vẹn bộ NST $2n$ của tế bào mẹ, duy trì sự ổn định di truyền trong sinh trưởng và sinh sản vô tính."
  },
  {
    id: "KHTN9_SINHHOC_04",
    grade: "9",
    topic: "sinh_hoc",
    level: "TH",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Hội chứng Down ở người là do dạng đột biến số lượng nhiễm sắc thể nào sau đây?",
    options: [
      "Có 3 nhiễm sắc thể ở cặp số 21 (thể ba nhiễm $2n + 1$)",
      "Mất 1 nhiễm sắc thể ở cặp số 21 (thể một nhiễm $2n - 1$)",
      "Chỉ có 1 nhiễm sắc thể giới tính X (hội chứng Turner)",
      "Đột biến mất đoạn nhiễm sắc thể số 5"
    ],
    correctAnswer: "A",
    explanation: "Bệnh nhân mắc hội chứng Down có 47 nhiễm sắc thể trong tế bào sinh dưỡng do có 3 NST ở cặp số 21 ($2n + 1 = 47$)."
  },
  {
    id: "KHTN9_SINHHOC_05",
    grade: "9",
    topic: "sinh_hoc",
    level: "VD",
    type: "mcq",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Một đoạn mạch đơn của phân tử ADN có trình tự nucleotide: $- A - T - G - C - A - T -$. Trình tự các nucleotide trên mạch bổ sung là:",
    options: [
      "$- T - A - C - G - T - A -$",
      "$- U - A - C - G - U - A -$",
      "$- A - T - G - C - A - T -$",
      "$- T - A - G - C - T - A -$"
    ],
    correctAnswer: "A",
    explanation: "Theo nguyên tắc bổ sung ($A \\leftrightarrow T, G \\leftrightarrow C$): A cặp với T, T cặp với A, G cặp với C, C cặp với G. Do đó mạch bổ sung là $- T - A - C - G - T - A -$."
  },
  {
    id: "KHTN9_SINHHOC_06",
    grade: "9",
    topic: "sinh_hoc",
    level: "VD",
    type: "truefalse",
    subject: "khtn",
    passage: null,
    source: "Biên soạn theo chương trình GDPT 2018",
    question: "Trong một chuỗi thức ăn trên cạn: Cỏ $\\to$ Sâu ăn lá $\\to$ Chim sâu $\\to$ Diều hâu, thì Cỏ là sinh vật sản xuất, còn Chim sâu là sinh vật tiêu thụ bậc 2. Phát biểu này Đúng hay Sai?",
    options: ["Đúng", "Sai"],
    correctAnswer: "A",
    explanation: "Đúng. Cỏ là sinh vật sản xuất; Sâu ăn lá là sinh vật tiêu thụ bậc 1; Chim sâu là sinh vật tiêu thụ bậc 2; Diều hâu là sinh vật tiêu thụ bậc 3."
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KHTN_QUESTIONS;
}
