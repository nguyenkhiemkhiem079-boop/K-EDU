/**
 * ToanMath Platform - Ngân hàng dữ liệu câu hỏi Toán THCS
 * Bao gồm các khối lớp: 6, 7, 8, 9 và Ôn thi Tuyển sinh vào 10
 * Phân loại 4 mức độ: Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao
 */

const INITIAL_QUESTION_BANK = [
  // ==================== TOÁN 6 ====================
  {
    id: "T6_001",
    grade: 6,
    topic: "Số học",
    subtopic: "Tập hợp và các phép tính trong N",
    level: "NB", // Nhận biết
    type: "choice",
    content: "Cho tập hợp $A = \\{x \\in \\mathbb{N} \\mid 3 < x \\le 7\\}$. Tập hợp $A$ viết dưới dạng liệt kê các phần tử là:",
    options: [
      "$A = \\{4; 5; 6; 7\\}$",
      "$A = \\{3; 4; 5; 6; 7\\}$",
      "$A = \\{4; 5; 6\\}$",
      "$A = \\{3; 4; 5; 6\\}$"
    ],
    correctAnswer: 0,
    solution: "Các số tự nhiên $x$ thỏa mãn $3 < x \\le 7$ là $4; 5; 6; 7$. Do đó $A = \\{4; 5; 6; 7\\}$."
  },
  {
    id: "T6_002",
    grade: 6,
    topic: "Số học",
    subtopic: "Ước và bội - Số nguyên tố",
    level: "TH", // Thông hiểu
    type: "choice",
    content: "Ước chung lớn nhất của hai số $48$ và $60$ là:",
    options: ["$6$", "$12$", "$24$", "$240$"],
    correctAnswer: 1,
    solution: "Ta phân tích ra thừa số nguyên tố:\n- $48 = 2^4 \\times 3$\n- $60 = 2^2 \\times 3 \\times 5$\n\nDo đó $\\text{ƯCLN}(48, 60) = 2^2 \\times 3 = 12$."
  },
  {
    id: "T6_003",
    grade: 6,
    topic: "Số học",
    subtopic: "Số nguyên",
    level: "VD", // Vận dụng
    type: "choice",
    content: "Tìm số nguyên $x$ biết: $2x - (-15) = 3^2 + (-2)^3$.",
    options: ["$x = -7$", "$x = 7$", "$x = -8$", "$x = 8$"],
    correctAnswer: 0,
    solution: "Ta có:\n$$2x + 15 = 9 - 8$$\n$$2x + 15 = 1$$\n$$2x = 1 - 15 = -14$$\n$$x = -14 : 2 = -7$$\nVậy $x = -7$."
  },
  {
    id: "T6_004",
    grade: 6,
    topic: "Hình học",
    subtopic: "Hình học trực quan",
    level: "NB",
    type: "choice",
    content: "Hình thoi có độ dài hai đường chéo lần lượt là $d_1 = 8\\text{ cm}$ và $d_2 = 6\\text{ cm}$. Diện tích của hình thoi đó là:",
    options: ["$48\\text{ cm}^2$", "$24\\text{ cm}^2$", "$14\\text{ cm}^2$", "$28\\text{ cm}^2$"],
    correctAnswer: 1,
    solution: "Diện tích hình thoi bằng nửa tích hai đường chéo: $S = \\dfrac{1}{2} \\times d_1 \\times d_2 = \\dfrac{1}{2} \\times 8 \\times 6 = 24\\text{ cm}^2$."
  },
  {
    id: "T6_005",
    grade: 6,
    topic: "Số học",
    subtopic: "Tính chia hết & Số học nâng cao",
    level: "VDC", // Vận dụng cao
    type: "choice",
    content: "Tìm chữ số tận cùng của tổng $S = 2 + 2^2 + 2^3 + \\dots + 2^{2024}$.",
    options: ["$0$", "$4$", "$6$", "$8$"],
    correctAnswer: 0,
    solution: "Nhận xét tổng có $2024$ số hạng (chia hết cho 4). Ta nhóm 4 số liên tiếp:\n$$(2 + 2^2 + 2^3 + 2^4) = 2 + 4 + 8 + 16 = 30$$\nTương tự, mỗi nhóm 4 số hạng đều có tổng tận cùng là $0$ và chia hết cho $30$.\nDo $2024 = 4 \\times 506$ nên $S$ là tổng của 506 nhóm có tận cùng bằng $0$. Vậy chữ số tận cùng của $S$ là $0$."
  },

  // ==================== TOÁN 7 ====================
  {
    id: "T7_001",
    grade: 7,
    topic: "Đại số",
    subtopic: "Số hữu tỉ",
    level: "NB",
    type: "choice",
    content: "Giá trị của biểu thức $\\left(-\\dfrac{2}{3}\\right)^2$ bằng:",
    options: ["$-\\dfrac{4}{9}$", "$\\dfrac{4}{9}$", "$-\\dfrac{4}{6}$", "$\\dfrac{4}{6}$"],
    correctAnswer: 1,
    solution: "$\\left(-\\dfrac{2}{3}\\right)^2 = \\dfrac{(-2)^2}{3^2} = \\dfrac{4}{9}$."
  },
  {
    id: "T7_002",
    grade: 7,
    topic: "Đại số",
    subtopic: "Tỉ lệ thức & Dãy tỉ số bằng nhau",
    level: "TH",
    type: "choice",
    content: "Cho $\\dfrac{x}{3} = \\dfrac{y}{5}$ và $x + y = 32$. Giá trị của $x$ và $y$ lần lượt là:",
    options: [
      "$x = 12;\\; y = 20$",
      "$x = 20;\\; y = 12$",
      "$x = 15;\\; y = 17$",
      "$x = 10;\\; y = 22$"
    ],
    correctAnswer: 0,
    solution: "Áp dụng tính chất dãy tỉ số bằng nhau:\n$$\\dfrac{x}{3} = \\dfrac{y}{5} = \\dfrac{x+y}{3+5} = \\dfrac{32}{8} = 4$$\nSuy ra $x = 3 \\times 4 = 12$ và $y = 5 \\times 4 = 20$."
  },
  {
    id: "T7_003",
    grade: 7,
    topic: "Hình học",
    subtopic: "Tam giác bằng nhau",
    level: "TH",
    type: "choice",
    content: "Cho $\\triangle ABC$ có $\\widehat{A} = 70^\\circ$, $\\widehat{B} = 50^\\circ$. Tia phân giác của góc $C$ cắt cạnh $AB$ tại $D$. Số đo của góc $\\widehat{ACD}$ là:",
    options: ["$30^\\circ$", "$60^\\circ$", "$35^\\circ$", "$25^\\circ$"],
    correctAnswer: 0,
    solution: "Trong tam giác $ABC$:\n$$\\widehat{C} = 180^\\circ - (\\widehat{A} + \\widehat{B}) = 180^\\circ - (70^\\circ + 50^\\circ) = 60^\\circ$$\nVì $CD$ là tia phân giác góc $C$ nên:\n$$\\widehat{ACD} = \\dfrac{\\widehat{C}}{2} = \\dfrac{60^\\circ}{2} = 30^\\circ$$"
  },
  {
    id: "T7_004",
    grade: 7,
    topic: "Đại số",
    subtopic: "Đa thức một biến",
    level: "VD",
    type: "choice",
    content: "Cho đa thức $P(x) = 2x^3 - 3x^2 + ax + 5$. Tìm $a$ để $x = -1$ là nghiệm của đa thức $P(x)$.",
    options: ["$a = 0$", "$a = 10$", "$a = -10$", "$a = -1$"],
    correctAnswer: 0,
    solution: "Để $x = -1$ là nghiệm của $P(x)$ thì $P(-1) = 0$.\n$$P(-1) = 2(-1)^3 - 3(-1)^2 + a(-1) + 5 = 0$$\n$$-2 - 3 - a + 5 = 0 \\iff -a = 0 \\iff a = 0$$"
  },
  {
    id: "T7_005",
    grade: 7,
    topic: "Đại số",
    subtopic: "Bất đẳng thức & Cực trị",
    level: "VDC",
    type: "choice",
    content: "Giá trị nhỏ nhất của biểu thức $M = |x - 2023| + |x - 2024| + |x - 2025|$ là:",
    options: ["$1$", "$2$", "$3$", "$0$"],
    correctAnswer: 1,
    solution: "Ta có: $|x - 2023| + |x - 2025| = |x - 2023| + |2025 - x| \\ge |x - 2023 + 2025 - x| = 2$.\nDấu \"=\" xảy ra khi $2023 \\le x \\le 2025$.\nLại có $|x - 2024| \\ge 0$, dấu \"=\" xảy ra khi $x = 2024$.\nDo đó $M \\ge 2 + 0 = 2$. Đạt được khi $x = 2024$."
  },

  // ==================== TOÁN 8 ====================
  {
    id: "T8_001",
    grade: 8,
    topic: "Đại số",
    subtopic: "Hằng đẳng thức đáng nhớ",
    level: "NB",
    type: "choice",
    content: "Khai triển của hằng đẳng thức $(2x - 3)^2$ là:",
    options: [
      "$4x^2 - 12x + 9$",
      "$4x^2 - 6x + 9$",
      "$4x^2 - 9$",
      "$4x^2 + 12x + 9$"
    ],
    correctAnswer: 0,
    solution: "$(2x - 3)^2 = (2x)^2 - 2 \\cdot 2x \\cdot 3 + 3^2 = 4x^2 - 12x + 9$."
  },
  {
    id: "T8_002",
    grade: 8,
    topic: "Đại số",
    subtopic: "Phân thức đại số",
    level: "TH",
    type: "choice",
    content: "Điều kiện xác định của phân thức $P = \\dfrac{2x + 1}{x^2 - 4}$ là:",
    options: [
      "$x \\ne 2$",
      "$x \\ne -2$",
      "$x \\ne 2$ và $x \\ne -2$",
      "$x \\ne 4$"
    ],
    correctAnswer: 2,
    solution: "Điều kiện để phân thức xác định là mẫu thức khác 0:\n$$x^2 - 4 \\ne 0 \\iff (x - 2)(x + 2) \\ne 0 \\iff x \\ne 2 \\text{ và } x \\ne -2$$"
  },
  {
    id: "T8_003",
    grade: 8,
    topic: "Hình học",
    subtopic: "Định lý Thalès & Tam giác đồng dạng",
    level: "TH",
    type: "choice",
    content: "Cho $\\triangle ABC$, một đường thẳng song song với $BC$ cắt $AB, AC$ lần lượt tại $M, N$. Biết $AM = 4\\text{ cm}, MB = 2\\text{ cm}, AN = 6\\text{ cm}$. Độ dài đoạn $NC$ là:",
    options: ["$3\\text{ cm}$", "$2\\text{ cm}$", "$4\\text{ cm}$", "$8\\text{ cm}$"],
    correctAnswer: 0,
    solution: "Theo định lí Thalès trong $\\triangle ABC$ có $MN \\parallel BC$:\n$$\\dfrac{AM}{MB} = \\dfrac{AN}{NC} \\iff \\dfrac{4}{2} = \\dfrac{6}{NC} \\implies NC = \\dfrac{2 \\times 6}{4} = 3\\text{ cm}$$"
  },
  {
    id: "T8_004",
    grade: 8,
    topic: "Đại số",
    subtopic: "Phương trình bậc nhất một biến",
    level: "VD",
    type: "choice",
    content: "Nghiệm của phương trình $\\dfrac{x + 2}{x - 2} - \\dfrac{1}{x} = \\dfrac{2}{x(x - 2)}$ là:",
    options: ["$x = -1$", "$x = 2$", "$x = -1$ và $x = 2$", "Vô nghiệm"],
    correctAnswer: 0,
    solution: "ĐKXĐ: $x \\ne 0, x \\ne 2$.\nQuy đồng khử mẫu:\n$$x(x + 2) - (x - 2) = 2$$\n$$x^2 + 2x - x + 2 = 2 \\iff x^2 + x = 0 \\iff x(x + 1) = 0$$\nSuy ra $x = 0$ (loại do ĐKXĐ) hoặc $x = -1$ (thỏa mãn).\nVậy nghiệm duy nhất là $x = -1$."
  },
  {
    id: "T8_005",
    grade: 8,
    topic: "Đại số",
    subtopic: "Bất đẳng thức Cauchy",
    level: "VDC",
    type: "choice",
    content: "Cho hai số thực dương $a, b$ thỏa mãn $a + b = 2$. Giá trị nhỏ nhất của $P = \\dfrac{1}{a} + \\dfrac{1}{b}$ là:",
    options: ["$2$", "$4$", "$1$", "$\\dfrac{1}{2}$"],
    correctAnswer: 0,
    solution: "Áp dụng bất đẳng thức Cauchy-Schwarz dạng Engel:\n$$P = \\dfrac{1}{a} + \\dfrac{1}{b} \\ge \\dfrac{(1 + 1)^2}{a + b} = \\dfrac{4}{2} = 2$$\nDấu bằng xảy ra khi $a = b = 1$. Vậy $\\min P = 2$."
  },

  // ==================== TOÁN 9 ====================
  {
    id: "T9_001",
    grade: 9,
    topic: "Đại số",
    subtopic: "Căn bậc hai và căn bậc ba",
    level: "NB",
    type: "choice",
    content: "Biểu thức $\\sqrt{3 - 2x}$ xác định với các giá trị của $x$ là:",
    options: [
      "$x \\le \\dfrac{3}{2}$",
      "$x \\ge \\dfrac{3}{2}$",
      "$x < \\dfrac{3}{2}$",
      "$x \\le -\\dfrac{3}{2}$"
    ],
    correctAnswer: 0,
    solution: "Căn thức $\\sqrt{3 - 2x}$ xác định $\\iff 3 - 2x \\ge 0 \\iff 2x \\le 3 \\iff x \\le \\dfrac{3}{2}$."
  },
  {
    id: "T9_002",
    grade: 9,
    topic: "Đại số",
    subtopic: "Hệ phương trình bậc nhất hai ẩn",
    level: "TH",
    type: "choice",
    content: "Nghiệm $(x; y)$ của hệ phương trình $\\begin{cases} 2x + y = 7 \\\\ x - 3y = -7 \\end{cases}$ là:",
    options: ["$(2; 3)$", "$(3; 2)$", "$(1; 5)$", "$(4; -1)$"],
    correctAnswer: 0,
    solution: "Từ pt (1) suy ra $y = 7 - 2x$, thế vào pt (2):\n$$x - 3(7 - 2x) = -7 \\iff x - 21 + 6x = -7 \\iff 7x = 14 \\implies x = 2$$\nThay $x = 2$ vào được $y = 7 - 2(2) = 3$.\nVậy nghiệm là $(2; 3)$."
  },
  {
    id: "T9_003",
    grade: 9,
    topic: "Hình học",
    subtopic: "Hệ thức lượng trong tam giác vuông",
    level: "TH",
    type: "choice",
    content: "Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$. Biết $BH = 4\\text{ cm}, CH = 9\\text{ cm}$. Độ dài đường cao $AH$ là:",
    options: ["$6\\text{ cm}$", "$36\\text{ cm}$", "$6.5\\text{ cm}$", "$\\sqrt{13}\\text{ cm}$"],
    correctAnswer: 0,
    solution: "Áp dụng hệ thức lượng trong tam giác vuông: $AH^2 = BH \\cdot CH = 4 \\cdot 9 = 36 \\implies AH = 6\\text{ cm}$."
  },
  {
    id: "T9_004",
    grade: 9,
    topic: "Đại số",
    subtopic: "Phương trình bậc hai & Hệ thức Viète",
    level: "VD",
    type: "choice",
    content: "Gọi $x_1, x_2$ là hai nghiệm của phương trình $x^2 - 5x + 3 = 0$. Giá trị của biểu thức $A = x_1^2 + x_2^2$ là:",
    options: ["$19$", "$25$", "$22$", "$31$"],
    correctAnswer: 0,
    solution: "Theo định lí Viète:\n$$\\begin{cases} x_1 + x_2 = 5 \\\\ x_1 x_2 = 3 \\end{cases}$$\nTa có: $A = x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1 x_2 = 5^2 - 2(3) = 25 - 6 = 19$."
  },
  {
    id: "T9_005",
    grade: 9,
    topic: "Hình học",
    subtopic: "Tứ giác nội tiếp & Góc với đường tròn",
    level: "VD",
    type: "choice",
    content: "Cho đường tròn $(O; R)$ và điểm $M$ nằm ngoài đường tròn sao cho $OM = 2R$. Kẻ các tiếp tuyến $MA, MB$ với $(O)$ ($A, B$ là tiếp điểm). Số đo góc ở tâm $\\widehat{AOB}$ là:",
    options: ["$120^\\circ$", "$60^\\circ$", "$90^\\circ$", "$150^\\circ$"],
    correctAnswer: 0,
    solution: "Xét tam giác $OAM$ vuông tại $A$:\n$$\\cos \\widehat{AOM} = \\dfrac{OA}{OM} = \\dfrac{R}{2R} = \\dfrac{1}{2} \\implies \\widehat{AOM} = 60^\\circ$$\nVì $OM$ là tia phân giác của $\\widehat{AOB}$ nên $\\widehat{AOB} = 2 \\times 60^\\circ = 120^\\circ$."
  },

  // ==================== ÔN THI VÀO LỚP 10 ====================
  {
    id: "T10_001",
    grade: 10,
    topic: "Rút gọn biểu thức",
    subtopic: "Rút gọn chứa căn bậc hai",
    level: "TH",
    type: "choice",
    content: "Rút gọn biểu thức $A = \\left(\\dfrac{\\sqrt{x}}{\\sqrt{x}-1} - \\dfrac{1}{x-\\sqrt{x}}\\right) : \\dfrac{\\sqrt{x}+1}{\\sqrt{x}-1}$ với $x > 0, x \\ne 1$ ta được:",
    options: [
      "$A = \\dfrac{1}{\\sqrt{x}}$",
      "$A = \\sqrt{x}$",
      "$A = \\dfrac{\\sqrt{x}-1}{\\sqrt{x}}$",
      "$A = \\dfrac{\\sqrt{x}+1}{\\sqrt{x}}$"
    ],
    correctAnswer: 0,
    solution: "Ta có $x - \\sqrt{x} = \\sqrt{x}(\\sqrt{x} - 1)$. Quy đồng trong ngoặc:\n$$\\dfrac{\\sqrt{x} \\cdot \\sqrt{x} - 1}{\\sqrt{x}(\\sqrt{x}-1)} = \\dfrac{x - 1}{\\sqrt{x}(\\sqrt{x}-1)} = \\dfrac{(\\sqrt{x}-1)(\\sqrt{x}+1)}{\\sqrt{x}(\\sqrt{x}-1)} = \\dfrac{\\sqrt{x}+1}{\\sqrt{x}}$$\nThực hiện phép chia:\n$$A = \\dfrac{\\sqrt{x}+1}{\\sqrt{x}} \\times \\dfrac{\\sqrt{x}-1}{\\sqrt{x}+1} = \\dfrac{\\sqrt{x}-1}{\\sqrt{x}}$$"
  },
  {
    id: "T10_002",
    grade: 10,
    topic: "Phương trình & Hệ phương trình",
    subtopic: "Phương trình bậc hai chứa tham số $m$",
    level: "VD",
    type: "choice",
    content: "Cho phương trình $x^2 - 2(m-1)x + m^2 - 4 = 0$. Tìm $m$ để phương trình có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn $x_1^2 + x_2^2 + x_1 x_2 = 7$.",
    options: [
      "$m = 1$",
      "$m = -1$",
      "$m = 2$",
      "$m = 3$"
    ],
    correctAnswer: 0,
    solution: "1) Điều kiện có 2 nghiệm phân biệt: $\\Delta' = (m-1)^2 - (m^2 - 4) = -2m + 5 > 0 \\iff m < \\dfrac{5}{2}$.\n2) Theo Vi-ét: $x_1+x_2 = 2(m-1), x_1 x_2 = m^2-4$.\nTa có: $x_1^2 + x_2^2 + x_1 x_2 = (x_1+x_2)^2 - x_1 x_2 = 4(m-1)^2 - (m^2-4) = 3m^2 - 8m + 8$.\nTheo đề: $3m^2 - 8m + 8 = 7 \\iff 3m^2 - 8m + 1 = 0 \\dots$ Với $m=1$ thỏa mãn điều kiện."
  },
  {
    id: "T10_003",
    grade: 10,
    topic: "Hình học tuyển sinh 10",
    subtopic: "Đường tròn & Tứ giác nội tiếp",
    level: "VD",
    type: "choice",
    content: "Cho nửa đường tròn đường kính $AB = 2R$. Điểm $C$ nằm trên nửa đường tròn sao cho $\\widehat{CAB} = 30^\\circ$. Diện tích tam giác $ABC$ theo $R$ là:",
    options: [
      "$\\dfrac{\\sqrt{3}}{2} R^2$",
      "$\\sqrt{3} R^2$",
      "$\\dfrac{\\sqrt{3}}{4} R^2$",
      "$\\dfrac{1}{2} R^2$"
    ],
    correctAnswer: 0,
    solution: "Tam giác $ABC$ nội tiếp nửa đường tròn nên vuông tại $C$.\nTa có: $AC = AB \\cos 30^\\circ = 2R \\cdot \\dfrac{\\sqrt{3}}{2} = R\\sqrt{3}$.\n$BC = AB \\sin 30^\\circ = 2R \\cdot \\dfrac{1}{2} = R$.\nDiện tích tam giác $ABC$ là:\n$$S = \\dfrac{1}{2} AC \\cdot BC = \\dfrac{1}{2} (R\\sqrt{3})(R) = \\dfrac{\\sqrt{3}}{2} R^2$$."
  },
  {
    id: "T10_004",
    grade: 10,
    topic: "Bất đẳng thức & Min/Max",
    subtopic: "Bất đẳng thức thi vào 10 chuyên & đại trà",
    level: "VDC",
    type: "choice",
    content: "Cho các số thực dương $x, y$ thỏa mãn $x + y \\le 2$. Giá trị nhỏ nhất của biểu thức $P = \\dfrac{1}{x^2 + y^2} + \\dfrac{2}{xy} + 3xy$ là:",
    options: ["$\\dfrac{11}{2}$", "$6$", "$5$", "$\\dfrac{13}{2}$"],
    correctAnswer: 0,
    solution: "Ta tách $P = \\left(\\dfrac{1}{x^2+y^2} + \\dfrac{1}{2xy}\\right) + \\left(\\dfrac{3}{2xy} + \\dfrac{3}{8}xy\\right) + \\dfrac{21}{8}xy$.\nÁp dụng BĐT $\\dfrac{1}{A} + \\dfrac{1}{B} \\ge \\dfrac{4}{A+B}$ và AM-GM:\n- $\\dfrac{1}{x^2+y^2} + \\dfrac{1}{2xy} \\ge \\dfrac{4}{(x+y)^2} \\ge \\dfrac{4}{4} = 1$\n- $\\dfrac{3}{2xy} + \\dfrac{3}{8}xy \\ge 2\\sqrt{\\dfrac{9}{16}} = \\dfrac{3}{2}$\n- Do $xy \\le \\dfrac{(x+y)^2}{4} \\le 1 \\implies \\dots$\nCộng các vế ta được $\\min P = \\dfrac{11}{2}$ khi $x = y = 1$."
  },
  {
    id: "T10_005",
    grade: 10,
    topic: "Toán thực tế",
    subtopic: "Ứng dụng hệ phương trình trong thực tế",
    level: "TH",
    type: "choice",
    content: "Một xưởng may theo kế hoạch phải may $1000$ cái áo trong một thời gian quy định. Do cải tiến kỹ thuật, mỗi ngày xưởng may thêm được $10$ cái áo nên đã hoàn thành sớm hơn $5$ ngày và may thêm được $50$ cái áo. Hỏi theo kế hoạch mỗi ngày xưởng phải may bao nhiêu cái áo?",
    options: ["$40$ áo/ngày", "$50$ áo/ngày", "$60$ áo/ngày", "$45$ áo/ngày"],
    correctAnswer: 0,
    solution: "Gọi số áo phải may mỗi ngày theo kế hoạch là $x$ ($x > 0$, chiếc áo).\nThời gian dự định: $\\dfrac{1000}{x}$ (ngày).\nThực tế mỗi ngày may: $x + 10$ áo, tổng số áo may được là $1050$ áo.\nThời gian thực tế: $\\dfrac{1050}{x + 10}$ (ngày).\nPhương trình:\n$$\\dfrac{1000}{x} - \\dfrac{1050}{x + 10} = 5$$\nGiải phương trình tìm được $x = 40$ (thỏa mãn)."
  }
];

// Khởi tạo và đồng bộ với LocalStorage
function getLocalQuestionBank() {
  try {
    const saved = localStorage.getItem("toanmath_question_bank");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Lỗi khi đọc LocalStorage:", e);
  }
  return [...INITIAL_QUESTION_BANK];
}

function saveLocalQuestionBank(bank) {
  try {
    localStorage.setItem("toanmath_question_bank", JSON.stringify(bank));
  } catch (e) {
    console.error("Lỗi khi ghi LocalStorage:", e);
  }
}
