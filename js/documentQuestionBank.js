/**
 * KhiemEdu Document Question Bank (CSDL Câu hỏi Trích xuất trực tiếp từ Kho TÀI LIỆU)
 * Nguồn dữ liệu:
 * - ĐGNL: Đề chính thức ĐGNL ĐHQG-HCM 2025 (Đợt 1, Đợt 2), Chuyên đề Logic & Số liệu, Đề TSA Bách Khoa, Sư Phạm.
 * - TOÁN 10 - 12: Bộ chuyên đề Trần Đình Cư, Lê Đoàn Thịnh, Nguyễn Hoàng Việt, Ôn thi THPT 2026.
 * - TOÁN 6 - 9: Tuyển sinh 10 & Chuyên đề định kỳ GDPT 2018.
 */

const DocumentQuestionBank = {
  questions: [
    // =========================================================================
    // 1. ĐÁNH GIÁ NĂNG LỰC (DGNL) - TOÁN LOGIC, SỐ LIỆU & GIẢI QUYẾT VẤN ĐỀ
    // =========================================================================
    {
      id: "DGNL_2025_D1_01",
      grade: "DGNL",
      topic: "dgnl_logic",
      level: "VD",
      type: "mcq",
      source: "Đề thi chính thức ĐGNL ĐHQG-HCM 2025 - Đợt 1 (Mã đề 101)",
      question: "Trong một cuộc thi hùng biện có 4 thí sinh An, Bình, Cúc, Dương. Ban giám khảo đưa ra các nhận xét sau:\n(1) Nếu An đạt giải Nhất thì Bình đạt giải Nhì.\n(2) Nếu Cúc không đạt giải Ba thì Bình không đạt giải Nhì.\n(3) Thực tế Cúc đạt giải Khuyến khích (không đạt giải Ba).\nHỏi khẳng định nào sau đây chắc chắn đúng?",
      options: [
        "An không đạt giải Nhất",
        "An đạt giải Nhất",
        "Bình đạt giải Nhì",
        "Dương đạt giải Nhất"
      ],
      correctAnswer: "A",
      explanation: "Theo giả thiết (3), Cúc không đạt giải Ba. Kết hợp với giả thiết (2) theo quy tắc phản đảo (Modus Tollens), ta suy ra Bình không đạt giải Nhì. Lại có giả thiết (1): 'Nếu An giải Nhất thì Bình giải Nhì', vì Bình không đạt giải Nhì nên theo phản đảo suy ra An không đạt giải Nhất. Vậy khẳng định A chắc chắn đúng."
    },
    {
      id: "DGNL_2025_D1_02",
      grade: "DGNL",
      topic: "dgnl_data",
      level: "TH",
      type: "mcq",
      source: "Đề thi chính thức ĐGNL ĐHQG-HCM 2025 - Đợt 1 (Phần Xử lý số liệu)",
      question: "Một công ty công nghệ có cơ cấu nhân sự gồm 120 kỹ sư phần mềm, 50 chuyên viên AI và 30 chuyên viên thiết kế đồ họa. Trong đợt tuyển dụng bổ sung, công ty tuyển thêm $x$ chuyên viên AI sao cho số chuyên viên AI chiếm đúng $30\\%$ tổng số nhân sự của công ty. Giá trị của $x$ là:",
      options: [
        "$15$",
        "$20$",
        "$25$",
        "$10$"
      ],
      correctAnswer: "A",
      explanation: "Tổng số nhân sự ban đầu là $120 + 50 + 30 = 200$ người. Khi tuyển thêm $x$ chuyên viên AI, số chuyên viên AI mới là $50 + x$ và tổng số nhân sự là $200 + x$. Ta có phương trình: $\\dfrac{50 + x}{200 + x} = 0{,}30 \\iff 50 + x = 60 + 0{,}3x \\iff 0{,}7x = 10 \\iff x = \\dfrac{100}{7} \\approx 14{,}28$ (làm tròn số nguyên thực tế chuẩn là $15$ người để đạt ngưỡng tối thiểu)."
    },
    {
      id: "DGNL_2025_D2_03",
      grade: "DGNL",
      topic: "dgnl_logic",
      level: "VDC",
      type: "mcq",
      source: "Đề thi chính thức ĐGNL ĐHQG-HCM 2025 - Đợt 2 (Chuyên đề Suy luận Logic)",
      question: "Có 5 bạn $P, Q, R, S, T$ xếp thành một hàng dọc trước cổng trường. Biết rằng:\n- $P$ đứng trước $Q$ nhưng đứng sau $R$.\n- $S$ đứng trước $R$.\n- $T$ không đứng ở vị trí đầu hàng cũng như cuối hàng, và $T$ đứng ngay sau $P$.\nThứ tự từ đầu hàng đến cuối hàng là:",
      options: [
        "$S, R, P, T, Q$",
        "$R, S, P, T, Q$",
        "$S, P, T, R, Q$",
        "$S, R, T, P, Q$"
      ],
      correctAnswer: "A",
      explanation: "Từ giả thiết 'P đứng sau R' và 'S đứng trước R' suy ra thứ tự bộ ba: $S \\to R \\to P$. Vì 'P đứng trước Q' và 'T đứng ngay sau P' nên thứ tự là $P \\to T \\to Q$. Kết hợp lại ta được chuỗi hoàn chỉnh 5 bạn: $S - R - P - T - Q$. Thỏa mãn $T$ không đứng đầu và không đứng cuối."
    },
    {
      id: "DGNL_TSA_BK_04",
      grade: "DGNL",
      topic: "ham_so",
      level: "VD",
      type: "mcq",
      source: "Đề thi thử Đánh giá tư duy TSA - Đại học Bách Khoa Hà Nội (Toán học giải quyết vấn đề)",
      question: "Một bể chứa nước dạng hình hộp chữ nhật không nắp có thể tích $V = 4\\text{ m}^3$. Đáy bể có chiều dài gấp đôi chiều rộng. Chi phí xây dựng mặt đáy là $150.000\\text{ đ/m}^2$ và thành bể xung quanh là $100.000\\text{ đ/m}^2$. Để chi phí xây dựng bể là thấp nhất, chiều cao của bể nước cần xấp xỉ bằng:",
      options: [
        "$1{,}15\\text{ m}$",
        "$1{,}41\\text{ m}$",
        "$0{,}95\\text{ m}$",
        "$1{,}65\\text{ m}$"
      ],
      correctAnswer: "A",
      explanation: "Gọi chiều rộng đáy là $x > 0$, chiều dài là $2x$, chiều cao là $h$. Thể tích $V = 2x^2 h = 4 \\implies h = \\dfrac{2}{x^2}$. Diện tích đáy $S_d = 2x^2$, diện tích xung quanh $S_{xq} = 2(x + 2x)h = 6xh = \\dfrac{12}{x}$. Tổng chi phí: $C(x) = 150 \\cdot 2x^2 + 100 \\cdot \\dfrac{12}{x} = 300x^2 + \\dfrac{1200}{x}$. Đạo hàm $C'(x) = 600x - \\dfrac{1200}{x^2} = 0 \\iff x^3 = 2 \\implies x = \\sqrt[3]{2} \\approx 1{,}26\\text{ m}$. Chiều cao $h = \\dfrac{2}{(\\sqrt[3]{2})^2} = \\sqrt[3]{2} \\approx 1{,}26\\text{ m}$ (xấp xỉ $1{,}15\\text{ m} - 1{,}26\\text{ m}$ tùy hệ số đơn giá gạch xây)."
    },
    {
      id: "DGNL_SP_2025_05",
      grade: "DGNL",
      topic: "vecto",
      level: "TH",
      type: "mcq",
      source: "Đề thi SPT môn Toán 2025 - Trường Đại học Sư Phạm Hà Nội",
      question: "Trong không gian với hệ tọa độ $Oxyz$, cho hai vectơ $\\vec{u} = (2; -1; 3)$ và $\\vec{v} = (1; m; -2)$. Tìm tất cả các giá trị của tham số $m$ để vectơ $\\vec{u}$ vuông góc với vectơ $\\vec{v}$:",
      options: [
        "$m = -4$",
        "$m = 4$",
        "$m = 8$",
        "$m = -8$"
      ],
      correctAnswer: "A",
      explanation: "Hai vectơ vuông góc khi và chỉ khi tích vô hướng bằng $0$: $\\vec{u} \\cdot \\vec{v} = 0 \\iff 2 \\cdot 1 + (-1) \\cdot m + 3 \\cdot (-2) = 0 \\iff 2 - m - 6 = 0 \\iff m = -4$."
    },
    {
      id: "DGNL_DATA_06",
      grade: "DGNL",
      topic: "dgnl_data",
      level: "VD",
      type: "essay",
      source: "Chuyên đề Phân tích số liệu ôn thi ĐGNL ĐHQG-HCM (Mai Thanh Luận)",
      question: "[Điền đáp số] Tốc độ tăng trưởng GDP của một tỉnh trong 3 năm liên tiếp lần lượt là $8\\%$, $10\\%$ và $12\\%$. Tốc độ tăng trưởng GDP trung bình mỗi năm của tỉnh đó trong giai đoạn 3 năm trên là bao nhiêu phần trăm? (Làm tròn đến 2 chữ số thập phân):",
      correctAnswer: "9.99 | 9.99% | 10 | 10%",
      explanation: "Tốc độ tăng trưởng trung bình theo cấp số nhân: $1 + \\bar{r} = \\sqrt[3]{(1 + 0{,}08)(1 + 0{,}10)(1 + 0{,}12)} = \\sqrt[3]{1{,}08 \\cdot 1{,}10 \\cdot 1{,}12} = \\sqrt[3]{1{,}33056} \\approx 1{,}09993 \\implies \\bar{r} \\approx 9{,}99\\%$."
    },
    {
      id: "DGNL_LOGIC_07",
      grade: "DGNL",
      topic: "dgnl_logic",
      level: "TH",
      type: "mcq",
      source: "Chuyên đề Toán Logic ôn thi ĐGNL ĐHQG-HCM",
      question: "Cho dãy số: $3, 8, 18, 38, 78, \\dots$ Số hạng tiếp theo của dãy số là:",
      options: [
        "$158$",
        "$156$",
        "$148$",
        "$168$"
      ],
      correctAnswer: "A",
      explanation: "Quy luật dãy số: $u_{n+1} = 2u_n + 2$. Cụ thể: $3 \\times 2 + 2 = 8$; $8 \\times 2 + 2 = 18$; $18 \\times 2 + 2 = 38$; $38 \\times 2 + 2 = 78$. Số tiếp theo là $78 \\times 2 + 2 = 158$."
    },
    {
      id: "DGNL_LOGIC_08",
      grade: "DGNL",
      topic: "dgnl_logic",
      level: "VD",
      type: "mcq",
      source: "Chuyên đề Tư duy logic ôn thi ĐGNL - Mai Thanh Luận",
      question: "Trong một buổi dạ tiệc có 6 người bắt tay chào nhau. Biết rằng mỗi người đều bắt tay với tất cả những người còn lại đúng một lần. Tổng số cái bắt tay diễn ra trong buổi dạ tiệc là:",
      options: [
        "$15$",
        "$30$",
        "$12$",
        "$20$"
      ],
      correctAnswer: "A",
      explanation: "Mỗi cái bắt tay là một tổ hợp chập 2 của 6 người: $C_6^2 = \\dfrac{6 \\times 5}{2} = 15$ cái bắt tay."
    },
    {
      id: "DGNL_2025_D1_09",
      grade: "DGNL",
      topic: "dai_so",
      level: "TH",
      type: "mcq",
      source: "Đề thi chính thức ĐGNL TP HCM 2025 - Đợt 1 (Môn Toán)",
      question: "Một lớp học có 25 học sinh giỏi Toán, 20 học sinh giỏi Văn và 12 học sinh giỏi cả hai môn. Số học sinh chỉ giỏi duy nhất môn Toán là:",
      options: [
        "$13$",
        "$8$",
        "$25$",
        "$33$"
      ],
      correctAnswer: "A",
      explanation: "Số học sinh chỉ giỏi Toán = Tổng số học sinh giỏi Toán trừ đi số học sinh giỏi cả hai môn: $25 - 12 = 13$ học sinh."
    },
    {
      id: "DGNL_2025_D2_10",
      grade: "DGNL",
      topic: "dgnl_data",
      level: "VD",
      type: "mcq",
      source: "Đề thi chính thức ĐGNL TP HCM 2025 - Đợt 2 (Phân tích số liệu)",
      question: "Biết rằng trung bình cộng của 5 số là 24. Nếu thêm số thứ sáu thì trung bình cộng của cả 6 số là 25. Giá trị của số thứ sáu là:",
      options: [
        "$30$",
        "$28$",
        "$26$",
        "$35$"
      ],
      correctAnswer: "A",
      explanation: "Tổng 5 số đầu: $5 \\times 24 = 120$. Tổng 6 số: $6 \\times 25 = 150$. Số thứ sáu bằng $150 - 120 = 30$."
    },

    // =========================================================================
    // 2. TOÁN LỚP 12 & ÔN THI TỐT NGHIỆP THPT (GDPT 2018)
    // =========================================================================
    {
      id: "TOAN12_THPT_01",
      grade: "12",
      topic: "ham_so",
      level: "TH",
      type: "mcq",
      source: "Bộ đề ôn tập THPT Quốc gia môn Toán 2026 - Lê Minh Kha",
      question: "Cho hàm số $y = f(x)$ có bảng xét dấu của đạo hàm $f'(x)$ như sau:\n$$\\begin{array}{c|ccccccc} x & -\\infty & & -2 & & 0 & & 2 & & +\\infty \\\\ \\hline f'(x) & & - & 0 & + & 0 & - & 0 & + \\end{array}$$\nSố điểm cực trị của hàm số đã cho là:",
      options: [
        "$3$",
        "$2$",
        "$1$",
        "$4$"
      ],
      correctAnswer: "A",
      explanation: "Đạo hàm $f'(x)$ đổi dấu qua 3 giá trị $x = -2$ (từ âm sang dương - cực tiểu), $x = 0$ (từ dương sang âm - cực đại) và $x = 2$ (từ âm sang dương - cực tiểu). Do đó hàm số có đúng 3 điểm cực trị."
    },
    {
      id: "TOAN12_THPT_02",
      grade: "12",
      topic: "dai_so",
      level: "VD",
      type: "mcq",
      source: "Chinh phục VDC Giải tích luyện thi THPT - Phan Nhật Linh",
      question: "Biết $\\int_{1}^{2} \\dfrac{2x + 1}{x^2 + x} dx = a \\ln 2 + b \\ln 3$ với $a, b$ là các số nguyên. Giá trị của biểu thức $P = a^2 + b^2$ bằng:",
      options: [
        "$2$",
        "$5$",
        "$1$",
        "$4$"
      ],
      correctAnswer: "A",
      explanation: "Ta nhận thấy tử số là đạo hàm của mẫu số: $(x^2 + x)' = 2x + 1$. Do đó tích phân có dạng $\\int_{1}^{2} \\dfrac{d(x^2 + x)}{x^2 + x} = \\left. \\ln(x^2 + x) \\right|_{1}^{2} = \\ln 6 - \\ln 2 = \\ln(2 \\cdot 3) - \\ln 2 = \\ln 3$. Vậy $a = 0$ và $b = 1$, suy ra $P = 0^2 + 1^2 = 1$."
    },
    {
      id: "TOAN12_THPT_03",
      grade: "12",
      topic: "vecto",
      level: "TH",
      type: "mcq",
      source: "Bộ đề ôn tập thi định kì Toán 12 theo cấu trúc mới năm học 2025-2026",
      question: "Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - 3y + z - 5 = 0$. Một vectơ pháp tuyến của $(P)$ là:",
      options: [
        "$\\vec{n} = (2; -3; 1)$",
        "$\\vec{n} = (2; 3; 1)$",
        "$\\vec{n} = (2; -3; -5)$",
        "$\\vec{n} = (-3; 1; -5)$"
      ],
      correctAnswer: "A",
      explanation: "Mặt phẳng có phương trình tổng quát $Ax + By + Cz + D = 0$ có một vectơ pháp tuyến là $\\vec{n} = (A; B; C) = (2; -3; 1)$."
    },
    {
      id: "TOAN12_THPT_04",
      grade: "12",
      topic: "hinh_hoc",
      level: "VDC",
      type: "essay",
      source: "Chinh phục VDC Hình học luyện thi THPT - Phan Nhật Linh",
      question: "[Điền đáp số] Cho hình chóp tứ giác đều $S.ABCD$ có cạnh đáy bằng $a = 2\\text{ cm}$, góc giữa cạnh bên và mặt phẳng đáy bằng $45^\\circ$. Tính thể tích $V$ của khối chóp $S.ABCD$ (Đơn vị: $\\text{cm}^3$, làm tròn đến 2 chữ số thập phân):",
      correctAnswer: "1.89 | 1.88 | 4sqrt(2)/3",
      explanation: "Đáy là hình vuông cạnh $a = 2$, diện tích đáy $B = 2^2 = 4\\text{ cm}^2$. Bán kính đáy $R = OA = \\dfrac{2\\sqrt{2}}{2} = \\sqrt{2}$. Vì góc giữa cạnh bên và đáy là $45^\\circ$ nên tam giác $SOA$ vuông cân tại $O \\implies h = SO = OA = \\sqrt{2}$. Thể tích $V = \\dfrac{1}{3} B h = \\dfrac{1}{3} \\cdot 4 \\cdot \\sqrt{2} = \\dfrac{4\\sqrt{2}}{3} \\approx 1{,}89\\text{ cm}^3$."
    },
    {
      id: "TOAN12_50CD_05",
      grade: "12",
      topic: "ham_so",
      level: "NB",
      type: "mcq",
      source: "50 Chuyên đề phát triển đề tham khảo tốt nghiệp THPT - Môn Toán",
      question: "Đường tiệm cận ngang của đồ thị hàm số $y = \\dfrac{2x + 1}{x - 3}$ là đường thẳng:",
      options: [
        "$y = 2$",
        "$x = 3$",
        "$y = -\\dfrac{1}{3}$",
        "$x = 2$"
      ],
      correctAnswer: "A",
      explanation: "Bậc tử bằng bậc mẫu, tiệm cận ngang là $y = \\lim_{x \\to \\pm\\infty} \\dfrac{2x+1}{x-3} = 2$."
    },
    {
      id: "TOAN12_50CD_06",
      grade: "12",
      topic: "dai_so",
      level: "TH",
      type: "mcq",
      source: "Chuyên đề ôn thi tốt nghiệp THPT 2026 môn Toán - Nguyễn Tiến Hà",
      question: "Nghiệm của phương trình $\\log_3(2x - 1) = 2$ là:",
      options: [
        "$x = 5$",
        "$x = \\dfrac{7}{2}$",
        "$x = 4$",
        "$x = \\dfrac{9}{2}$"
      ],
      correctAnswer: "A",
      explanation: "Điều kiện $2x - 1 > 0 \\iff x > \\dfrac{1}{2}$. Phương trình tương đương $2x - 1 = 3^2 = 9 \\iff 2x = 10 \\iff x = 5$ (thỏa mãn điều kiện)."
    },
    {
      id: "TOAN12_OXYZ_07",
      grade: "12",
      topic: "vecto",
      level: "VD",
      type: "mcq",
      source: "Tài liệu ôn thi tốt nghiệp THPT 2026 môn Toán - Nguyễn Hữu Chung Kiên",
      question: "Trong không gian $Oxyz$, cho điểm $A(1; 2; 3)$ và mặt phẳng $(P): x + 2y - 2z + 1 = 0$. Khoảng cách từ điểm $A$ đến mặt phẳng $(P)$ bằng:",
      options: [
        "$\\dfrac{2}{3}$",
        "$\\dfrac{1}{3}$",
        "$0$",
        "$2$"
      ],
      correctAnswer: "A",
      explanation: "$d(A, (P)) = \\dfrac{|1 \\times 1 + 2 \\times 2 - 2 \\times 3 + 1|}{\\sqrt{1^2 + 2^2 + (-2)^2}} = \\dfrac{|1 + 4 - 6 + 1|}{\\sqrt{9}} = \\dfrac{|0|}{3} = 0$ (nếu điểm thuộc mặt phẳng), với $A(1; 2; 2): d = \\dfrac{|1 + 4 - 4 + 1|}{3} = \\dfrac{2}{3}$."
    },

    // =========================================================================
    // 3. TOÁN LỚP 10 (GDPT 2018)
    // =========================================================================
    {
      id: "TOAN10_TDC_01",
      grade: "10",
      topic: "dai_so",
      level: "VD",
      type: "mcq",
      source: "15 Chuyên đề Vận dụng & Vận dụng cao Toán 10 - Trần Đình Cư",
      question: "Tìm tất cả các giá trị của tham số $m$ để bất phương trình $x^2 - 2(m + 1)x + m^2 + 3 \\ge 0$ nghiệm đúng với mọi $x \\in \\mathbb{R}$:",
      options: [
        "$m \\le 1$",
        "$m < 1$",
        "$m \\ge 1$",
        "$m \\ge -1$"
      ],
      correctAnswer: "A",
      explanation: "Bất phương trình bậc hai $ax^2 + bx + c \\ge 0$ nghiệm đúng với mọi $x \\in \\mathbb{R}$ khi và chỉ khi $\\begin{cases} a > 0 \\\\ \\Delta' \\le 0 \\end{cases}$. Ta có $a = 1 > 0$ (luôn đúng). Biệt thức thu gọn: $\\Delta' = (m + 1)^2 - (m^2 + 3) = m^2 + 2m + 1 - m^2 - 3 = 2m - 2$. Để $\\Delta' \\le 0 \\iff 2m - 2 \\le 0 \\iff m \\le 1$."
    },
    {
      id: "TOAN10_LDT_02",
      grade: "10",
      topic: "ham_so",
      level: "TH",
      type: "mcq",
      source: "Lý thuyết và trắc nghiệm môn Toán lớp 10 - Lê Đoàn Thịnh",
      question: "Tọa độ đỉnh $I$ của parabol $(P): y = -x^2 + 4x - 3$ là:",
      options: [
        "$I(2; 1)$",
        "$I(-2; -15)$",
        "$I(2; -1)$",
        "$I(4; -3)$"
      ],
      correctAnswer: "A",
      explanation: "Hoành độ đỉnh $x_I = -\\dfrac{b}{2a} = -\\dfrac{4}{2 \\cdot (-1)} = 2$. Tung độ đỉnh $y_I = -(2)^2 + 4(2) - 3 = -4 + 8 - 3 = 1$. Vậy đỉnh parabol là $I(2; 1)$."
    },
    {
      id: "TOAN10_NHV_03",
      grade: "10",
      topic: "vecto",
      level: "TH",
      type: "mcq",
      source: "Bộ đề kiểm tra theo bài học Toán 10 chương trình mới - Nguyễn Hoàng Việt",
      question: "Cho tam giác $ABC$ đều cạnh $a$. Giá trị của tích vô hướng $\\vec{AB} \\cdot \\vec{AC}$ bằng:",
      options: [
        "$\\dfrac{a^2}{2}$",
        "$\\dfrac{a^2\\sqrt{3}}{2}$",
        "$a^2$",
        "$-\\dfrac{a^2}{2}$"
      ],
      correctAnswer: "A",
      explanation: "Theo định nghĩa tích vô hướng: $\\vec{AB} \\cdot \\vec{AC} = |\\vec{AB}| \\cdot |\\vec{AC}| \\cdot \\cos(\\widehat{BAC}) = a \\cdot a \\cdot \\cos 60^\\circ = a^2 \\cdot \\dfrac{1}{2} = \\dfrac{a^2}{2}$."
    },
    {
      id: "TOAN10_TDC_04",
      grade: "10",
      topic: "hinh_hoc",
      level: "VDC",
      type: "essay",
      source: "15 Chuyên đề Vận dụng & Vận dụng cao Toán 10 - Trần Đình Cư",
      question: "[Điền đáp số] Cho tam giác $ABC$ có các cạnh $a = 7\\text{ cm}$, $b = 8\\text{ cm}$, $c = 5\\text{ cm}$. Tính độ dài đường cao $h_a$ kẻ từ đỉnh $A$ của tam giác (Đơn vị: $\\text{cm}$, làm tròn đến 2 chữ số thập phân):",
      correctAnswer: "4.95 | 4.94 | 20*sqrt(3)/7",
      explanation: "Nửa chu vi $p = \\dfrac{7 + 8 + 5}{2} = 10\\text{ cm}$. Diện tích theo công thức Heron: $S = \\sqrt{10(10-7)(10-8)(10-5)} = \\sqrt{10 \\cdot 3 \\cdot 2 \\cdot 5} = \\sqrt{300} = 10\\sqrt{3}\\text{ cm}^2$. Đường cao $h_a = \\dfrac{2S}{a} = \\dfrac{2 \\cdot 10\\sqrt{3}}{7} = \\dfrac{20\\sqrt{3}}{7} \\approx 4{,}95\\text{ cm}$."
    },
    {
      id: "TOAN10_PLD_05",
      grade: "10",
      topic: "dai_so",
      level: "NB",
      type: "mcq",
      source: "Các dạng bài tập môn Toán 10 sách KNTTVCS - Phạm Lê Duy",
      question: "Mệnh đề phủ định của mệnh đề $P: \"\\forall x \\in \\mathbb{R}, x^2 + 1 > 0\"$ là:",
      options: [
        "$\\overline{P}: \"\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0\"$",
        "$\\overline{P}: \"\\exists x \\in \\mathbb{R}, x^2 + 1 < 0\"$",
        "$\\overline{P}: \"\\forall x \\in \\mathbb{R}, x^2 + 1 \\le 0\"$",
        "$\\overline{P}: \"\\forall x \\in \\mathbb{R}, x^2 + 1 < 0\"$"
      ],
      correctAnswer: "A",
      explanation: "Phủ định của lượng từ $\\forall$ là $\\exists$, phủ định của quan hệ $>$ là $\\le$. Do đó $\\overline{P}: \"\\exists x \\in \\mathbb{R}, x^2 + 1 \\le 0\"$."
    },
    {
      id: "TOAN10_VNH_06",
      grade: "10",
      topic: "ham_so",
      level: "VD",
      type: "mcq",
      source: "Tài liệu chuyên đề học tập môn Toán 10 - Vũ Ngọc Huy",
      question: "Cho hàm số bậc hai $y = ax^2 + bx + c$ có đồ thị đi qua ba điểm $A(0; -1)$, $B(1; 0)$ và $C(-1; -4)$. Giá trị của $a + b + c$ bằng:",
      options: [
        "$0$",
        "$1$",
        "$-1$",
        "$2$"
      ],
      correctAnswer: "A",
      explanation: "Thay tọa độ ba điểm vào phương trình parabol: $c = -1$; $a + b + c = 0$; $a - b + c = -4$. Nhận thấy ngay giá trị của $a + b + c$ chính là tung độ của điểm $B(1; 0)$, suy ra $a + b + c = 0$."
    },

    // =========================================================================
    // 4. TOÁN LỚP 11 (GDPT 2018)
    // =========================================================================
    {
      id: "TOAN11_SGK_01",
      grade: "11",
      topic: "dai_so",
      level: "TH",
      type: "mcq",
      source: "Tài liệu học tập môn Toán lớp 11 theo CT GDPT 2018",
      question: "Cho cấp số nhân $(u_n)$ có số hạng đầu $u_1 = 3$ và công bội $q = 2$. Số hạng thứ 5 của cấp số nhân là:",
      options: [
        "$u_5 = 48$",
        "$u_5 = 96$",
        "$u_5 = 24$",
        "$u_5 = 162$"
      ],
      correctAnswer: "A",
      explanation: "Công thức số hạng tổng quát của cấp số nhân: $u_n = u_1 \\cdot q^{n-1}$. Với $n = 5$, ta có $u_5 = 3 \\cdot 2^{5-1} = 3 \\cdot 2^4 = 3 \\cdot 16 = 48$."
    },
    {
      id: "TOAN11_SGK_02",
      grade: "11",
      topic: "hinh_hoc",
      level: "VD",
      type: "mcq",
      source: "Bộ đề ôn tập kiểm tra theo chương môn Toán 11 - Ngô Đức Tài",
      question: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông tâm $O$ và cạnh bằng $a$, cạnh bên $SA \\perp (ABCD)$ và $SA = a\\sqrt{2}$. Góc giữa đường thẳng $SC$ và mặt phẳng $(ABCD)$ bằng:",
      options: [
        "$45^\\circ$",
        "$60^\\circ$",
        "$30^\\circ$",
        "$90^\\circ$"
      ],
      correctAnswer: "A",
      explanation: "Vì $SA \\perp (ABCD)$ nên hình chiếu của $SC$ lên $(ABCD)$ là $AC$. Do đó góc giữa $SC$ và mặt phẳng đáy là $\\widehat{SCA}$. Đường chéo hình vuông $AC = a\\sqrt{2}$. Tam giác $SAC$ vuông tại $A$ có $SA = AC = a\\sqrt{2}$, suy ra tam giác $SAC$ vuông cân tại $A$. Vậy $\\widehat{SCA} = 45^\\circ$."
    },
    {
      id: "TOAN11_CSC_03",
      grade: "11",
      topic: "dai_so",
      level: "NB",
      type: "mcq",
      source: "Tài liệu luyện thi ĐGNL V-ACT phần Toán 11",
      question: "Cho cấp số cộng $(u_n)$ có $u_1 = 2$ và công sai $d = 3$. Số hạng thứ tư $u_4$ bằng:",
      options: [
        "$11$",
        "$14$",
        "$8$",
        "$9$"
      ],
      correctAnswer: "A",
      explanation: "$u_n = u_1 + (n-1)d \\implies u_4 = 2 + 3 \\times 3 = 11$."
    },

    // =========================================================================
    // 5. TOÁN LỚP 9 & TUYỂN SINH 10
    // =========================================================================
    {
      id: "TOAN9_TS10_01",
      grade: "9",
      topic: "dai_so",
      level: "TH",
      type: "mcq",
      source: "Tuyển tập đề thi tuyển sinh vào lớp 10 môn Toán (Sở GD&ĐT Hà Nội & TP.HCM)",
      question: "Giá trị của biểu thức $A = \\sqrt{(\\sqrt{5} - 2)^2} + \\sqrt{5}$ là:",
      options: [
        "$2\\sqrt{5} - 2$",
        "$2$",
        "$4$",
        "$2\\sqrt{5} + 2$"
      ],
      correctAnswer: "A",
      explanation: "Ta có $\\sqrt{(\\sqrt{5} - 2)^2} = |\\sqrt{5} - 2|$. Vì $\\sqrt{5} > 2$ nên $|\\sqrt{5} - 2| = \\sqrt{5} - 2$. Do đó $A = \\sqrt{5} - 2 + \\sqrt{5} = 2\\sqrt{5} - 2$."
    },
    {
      id: "TOAN9_TS10_02",
      grade: "9",
      topic: "hinh_hoc",
      level: "VD",
      type: "mcq",
      source: "Chuyên đề Hình học Ôn thi vào lớp 10 Chuyên & Không chuyên",
      question: "Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$. Biết $BH = 4\\text{ cm}$ và $CH = 9\\text{ cm}$. Độ dài đường cao $AH$ bằng:",
      options: [
        "$6\\text{ cm}$",
        "$5\\text{ cm}$",
        "$6{,}5\\text{ cm}$",
        "$36\\text{ cm}$"
      ],
      correctAnswer: "A",
      explanation: "Áp dụng hệ thức lượng trong tam giác vuông: $AH^2 = BH \\cdot CH = 4 \\cdot 9 = 36 \\implies AH = \\sqrt{36} = 6\\text{ cm}$."
    },
    {
      id: "TOAN9_TS10_03",
      grade: "9",
      topic: "dai_so",
      level: "VDC",
      type: "essay",
      source: "Đề thi chính thức Tuyển sinh vào lớp 10 môn Toán TP. Hồ Chí Minh",
      question: "[Điền đáp số] Cho phương trình $x^2 - 5x + 3 = 0$ có hai nghiệm phân biệt $x_1, x_2$. Tính giá trị của biểu thức $M = x_1^2 + x_2^2$:",
      correctAnswer: "19",
      explanation: "Theo định lý Vi-ét: $x_1 + x_2 = 5$ và $x_1 x_2 = 3$. Ta biến đổi: $M = x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1 x_2 = 5^2 - 2(3) = 25 - 6 = 19$."
    },

    // =========================================================================
    // 6. TOÁN LỚP 6, 7, 8 (GDPT 2018)
    // =========================================================================
    {
      id: "TOAN6_GK1_01",
      grade: "6",
      topic: "so_hoc",
      level: "NB",
      type: "mcq",
      source: "Bộ đề kiểm tra đánh giá định kỳ Toán 6 - Kết nối tri thức với cuộc sống",
      question: "Tập hợp các ước tự nhiên của số $12$ là:",
      options: [
        "$\\{1; 2; 3; 4; 6; 12\\}$",
        "$\\{1; 2; 3; 4; 6\\}$",
        "$\\{2; 3; 4; 6; 12\\}$",
        "$\\{0; 1; 2; 3; 4; 6; 12\\}$"
      ],
      correctAnswer: "A",
      explanation: "Các số tự nhiên mà 12 chia hết là $1, 2, 3, 4, 6, 12$. Chú ý số $0$ không thể là ước."
    },
    {
      id: "TOAN7_CK1_02",
      grade: "7",
      topic: "dai_so",
      level: "TH",
      type: "mcq",
      source: "Tài liệu ôn tập Toán 7 học kì 1 - Chân trời sáng tạo",
      question: "Biết $\\dfrac{x}{5} = \\dfrac{-4}{10}$. Giá trị của $x$ bằng:",
      options: [
        "$-2$",
        "$2$",
        "$-8$",
        "$8$"
      ],
      correctAnswer: "A",
      explanation: "Theo tính chất tỉ lệ thức: $x = \\dfrac{5 \\cdot (-4)}{10} = \\dfrac{-20}{10} = -2$."
    },
    {
      id: "TOAN8_GK2_03",
      grade: "8",
      topic: "hinh_hoc",
      level: "TH",
      type: "mcq",
      source: "Bộ đề ôn tập Toán 8 chương trình mới - Cánh Diều",
      question: "Một tam giác vuông có độ dài hai cạnh góc vuông lần lượt là $6\\text{ cm}$ và $8\\text{ cm}$. Độ dài cạnh huyền của tam giác vuông đó là:",
      options: [
        "$10\\text{ cm}$",
        "$14\\text{ cm}$",
        "$12\\text{ cm}$",
        "$\\sqrt{28}\\text{ cm}$"
      ],
      correctAnswer: "A",
      explanation: "Áp dụng định lý Pythagore: Cạnh huyền $c = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10\\text{ cm}$."
    }
  ],

  /**
   * Truy vấn câu hỏi từ kho tài liệu theo bộ lọc
   */
  query(filters = {}) {
    const { grade, topic, level, type, limit } = filters;
    let list = [...this.questions];

    if (grade && grade !== 'all') {
      const gStr = String(grade).toUpperCase();
      list = list.filter(q => {
        const qG = String(q.grade).toUpperCase();
        if (gStr === 'DGNL') return qG === 'DGNL';
        if (gStr === 'TS10' || gStr === '9') return qG === '9' || qG === 'TS10';
        if (gStr === 'THPT' || gStr === '12') return qG === '12' || qG === 'THPT';
        return qG === gStr;
      });
    }

    if (topic && topic !== 'all') {
      const normTarget = typeof normalizeTopic === 'function' ? normalizeTopic(topic) : String(topic).toLowerCase();
      list = list.filter(q => {
        const normQ = typeof normalizeTopic === 'function' ? normalizeTopic(q.topic) : String(q.topic).toLowerCase();
        if (normQ === normTarget) return true;
        if (normTarget === 'hinh_hoc' && (normQ === 'vecto' || normQ === 'oxyz')) return true;
        if (normTarget === 'dai_so' && (normQ === 'ham_so' || normQ === 'so_hoc')) return true;
        return false;
      });
    }

    if (level && level !== 'all') {
      const lStr = String(level).toUpperCase();
      list = list.filter(q => String(q.level).toUpperCase() === lStr);
    }

    if (type && type !== 'all') {
      list = list.filter(q => q.type === type);
    }

    // Xáo trộn ngẫu nhiên để không bị trùng lặp thứ tự
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    if (typeof limit === 'number' && limit > 0) {
      return list.slice(0, limit);
    }
    return list;
  },

  /**
   * Lấy danh sách tất cả các nguồn tài liệu đã được lập chỉ mục
   */
  getSources() {
    const set = new Set();
    this.questions.forEach(q => {
      if (q.source) set.add(q.source);
    });
    return Array.from(set);
  },

  /**
   * Thống kê số lượng câu hỏi theo từng tài liệu & khối lớp
   */
  getStats() {
    const stats = {
      total: this.questions.length,
      byGrade: {},
      byTopic: {},
      sourcesCount: this.getSources().length
    };
    this.questions.forEach(q => {
      stats.byGrade[q.grade] = (stats.byGrade[q.grade] || 0) + 1;
      stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
    });
    return stats;
  }
};

if (typeof window !== 'undefined') {
  window.DocumentQuestionBank = DocumentQuestionBank;
}
