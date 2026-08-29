/**
 * KhiemEdu Math Engine & Dynamic Question Generator
 * Ngân hàng đề thi Toán học chuẩn TOANMATH.com (Lớp 6 - 12 & Luyện Thi Vào 10 / THPT)
 * Phân loại chuẩn 4 Kỳ: Giữa kỳ 1 (GK1), Cuối kỳ 1 (CK1), Giữa kỳ 2 (GK2), Cuối kỳ 2 (CK2), Tuyển sinh 10 & THPT
 */

const MATH_QUESTION_BANK = [
  // ==================== TOÁN 6 ====================
  // Giữa Kỳ 1 (GK1)
  {
    id: "T6_GK1_01",
    grade: 6,
    term: "GK1",
    topic: "Số học",
    subtopic: "Tập hợp & Phần tử",
    level: "NB",
    type: "mcq",
    question: "Cho tập hợp $A = \\{x \\in \\mathbb{N} \\mid 3 < x \\le 7\\}$. Tập hợp $A$ viết dưới dạng liệt kê các phần tử là:",
    options: ["$A = \\{4; 5; 6; 7\\}$", "$A = \\{3; 4; 5; 6; 7\\}$", "$A = \\{4; 5; 6\\}$", "$A = \\{3; 4; 5; 6\\}$"],
    correctAnswer: "A",
    explanation: "Các số tự nhiên $x$ thỏa mãn $3 < x \\le 7$ là $4; 5; 6; 7$. Do đó $A = \\{4; 5; 6; 7\\}$."
  },
  {
    id: "T6_GK1_02",
    grade: 6,
    term: "GK1",
    topic: "Số học",
    subtopic: "Ước & Bội - Số nguyên tố",
    level: "TH",
    type: "mcq",
    question: "Ước chung lớn nhất của hai số $48$ và $60$ là:",
    options: ["$6$", "$12$", "$24$", "$240$"],
    correctAnswer: "B",
    explanation: "$48 = 2^4 \\times 3$; $60 = 2^2 \\times 3 \\times 5$. Vậy $\\text{ƯCLN}(48, 60) = 2^2 \\times 3 = 12$."
  },
  {
    id: "T6_GK1_03",
    grade: 6,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Hình vuông, Tam giác đều, Lục giác đều",
    level: "NB",
    type: "mcq",
    question: "Tam giác đều có cạnh bằng $5\\text{ cm}$. Chu vi của tam giác đều đó là:",
    options: ["$15\\text{ cm}$", "$10\\text{ cm}$", "$25\\text{ cm}$", "$20\\text{ cm}$"],
    correctAnswer: "A",
    explanation: "Chu vi tam giác đều cạnh $a$ là $C = 3a = 3 \\times 5 = 15\\text{ cm}$."
  },
  // Cuối Kỳ 1 (CK1)
  {
    id: "T6_CK1_01",
    grade: 6,
    term: "CK1",
    topic: "Số học",
    subtopic: "Số nguyên",
    level: "VD",
    type: "mcq",
    question: "Tìm số nguyên $x$ biết: $2x - (-15) = 3^2 + (-2)^3$.",
    options: ["$x = -7$", "$x = 7$", "$x = -8$", "$x = 8$"],
    correctAnswer: "A",
    explanation: "$2x + 15 = 9 - 8 = 1 \\iff 2x = -14 \\implies x = -7$."
  },
  {
    id: "T6_CK1_02",
    grade: 6,
    term: "CK1",
    topic: "Hình học",
    subtopic: "Diện tích hình thoi & Hình bình hành",
    level: "TH",
    type: "mcq",
    question: "Hình thoi có độ dài hai đường chéo $d_1 = 8\\text{ cm}$ và $d_2 = 6\\text{ cm}$. Diện tích là:",
    options: ["$24\\text{ cm}^2$", "$48\\text{ cm}^2$", "$14\\text{ cm}^2$", "$28\\text{ cm}^2$"],
    correctAnswer: "A",
    explanation: "$S = \\dfrac{1}{2} d_1 d_2 = \\dfrac{1}{2} \\times 8 \\times 6 = 24\\text{ cm}^2$."
  },
  // Giữa Kỳ 2 (GK2)
  {
    id: "T6_GK2_01",
    grade: 6,
    term: "GK2",
    topic: "Số học",
    subtopic: "Phân số",
    level: "TH",
    type: "mcq",
    question: "Giá trị của biểu thức $A = \\dfrac{3}{5} + \\dfrac{2}{5} \\times \\dfrac{1}{2}$ bằng:",
    options: ["$\\dfrac{4}{5}$", "$\\dfrac{1}{2}$", "$1$", "$\\dfrac{7}{10}$"],
    correctAnswer: "A",
    explanation: "$A = \\dfrac{3}{5} + \\dfrac{1}{5} = \\dfrac{4}{5}$."
  },
  // Cuối Kỳ 2 (CK2)
  {
    id: "T6_CK2_01",
    grade: 6,
    term: "CK2",
    topic: "Số học",
    subtopic: "Số thập phân & Tỉ số phần trăm",
    level: "VD",
    type: "essay",
    question: "Một lớp học có $40$ học sinh, trong đó số học sinh giỏi chiếm $25\\%$. Hỏi lớp đó có bao nhiêu học sinh giỏi?",
    options: [],
    correctAnswer: "10 | 10 học sinh | 10 hs",
    explanation: "Số học sinh giỏi là: $40 \\times 25\\% = 40 \\times 0.25 = 10$ học sinh."
  },

  // ==================== TOÁN 7 ====================
  // Giữa Kỳ 1 (GK1)
  {
    id: "T7_GK1_01",
    grade: 7,
    term: "GK1",
    topic: "Đại số",
    subtopic: "Số hữu tỉ & Lũy thừa",
    level: "NB",
    type: "mcq",
    question: "Giá trị của biểu thức $\\left(-\\dfrac{2}{3}\\right)^2$ bằng:",
    options: ["$\\dfrac{4}{9}$", "$-\\dfrac{4}{9}$", "$-\\dfrac{4}{6}$", "$\\dfrac{4}{6}$"],
    correctAnswer: "A",
    explanation: "$\\left(-\\dfrac{2}{3}\\right)^2 = \\dfrac{(-2)^2}{3^2} = \\dfrac{4}{9}$."
  },
  {
    id: "T7_GK1_02",
    grade: 7,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Góc ở vị trí đặc biệt & Hai đường thẳng song song",
    level: "TH",
    type: "mcq",
    question: "Cho hai đường thẳng $a \\parallel b$. Một đường thẳng $c$ cắt $a, b$ lần lượt tại $A, B$. Biết một góc so le trong bằng $65^\\circ$. Góc so le trong còn lại có số đo là:",
    options: ["$65^\\circ$", "$115^\\circ$", "$90^\\circ$", "$180^\\circ$"],
    correctAnswer: "A",
    explanation: "Hai đường thẳng song song thì hai góc so le trong bằng nhau, do đó bằng $65^\\circ$."
  },
  // Cuối Kỳ 1 (CK1)
  {
    id: "T7_CK1_01",
    grade: 7,
    term: "CK1",
    topic: "Đại số",
    subtopic: "Tỉ lệ thức & Dãy tỉ số bằng nhau",
    level: "TH",
    type: "mcq",
    question: "Cho $\\dfrac{x}{3} = \\dfrac{y}{5}$ và $x + y = 32$. Giá trị của $x$ và $y$ là:",
    options: ["$x = 12;\\; y = 20$", "$x = 20;\\; y = 12$", "$x = 15;\\; y = 17$", "$x = 10;\\; y = 22$"],
    correctAnswer: "A",
    explanation: "$\\dfrac{x}{3} = \\dfrac{y}{5} = \\dfrac{x+y}{3+5} = \\dfrac{32}{8} = 4 \\implies x = 12, y = 20$."
  },
  {
    id: "T7_CK1_02",
    grade: 7,
    term: "CK1",
    topic: "Hình học",
    subtopic: "Tam giác bằng nhau (c-c-c, c-g-c, g-c-g)",
    level: "VD",
    type: "mcq",
    question: "Cho $\\triangle ABC$ có $\\widehat{A} = 70^\\circ$, $\\widehat{B} = 50^\\circ$. Tia phân giác của góc $C$ cắt cạnh $AB$ tại $D$. Số đo $\\widehat{ACD}$ là:",
    options: ["$30^\\circ$", "$60^\\circ$", "$35^\\circ$", "$25^\\circ$"],
    correctAnswer: "A",
    explanation: "$\\widehat{C} = 180^\\circ - (70^\\circ + 50^\\circ) = 60^\\circ \\implies \\widehat{ACD} = 60^\\circ / 2 = 30^\\circ$."
  },
  // Giữa Kỳ 2 (GK2)
  {
    id: "T7_GK2_01",
    grade: 7,
    term: "GK2",
    topic: "Đại số",
    subtopic: "Đa thức một biến",
    level: "TH",
    type: "mcq",
    question: "Bậc của đa thức $P(x) = 3x^4 - 2x^2 + 5x - 7$ là:",
    options: ["$4$", "$3$", "$2$", "$5$"],
    correctAnswer: "A",
    explanation: "Hạng tử có số mũ cao nhất là $3x^4$, bậc của đa thức là 4."
  },
  // Cuối Kỳ 2 (CK2)
  {
    id: "T7_CK2_01",
    grade: 7,
    term: "CK2",
    topic: "Đại số",
    subtopic: "Nghiệm của đa thức một biến",
    level: "VD",
    type: "essay",
    question: "Tìm giá trị của $a$ để đa thức $P(x) = 2x^3 - 3x^2 + ax + 5$ nhận $x = -1$ làm nghiệm:",
    options: [],
    correctAnswer: "0 | a=0",
    explanation: "$P(-1) = 2(-1)^3 - 3(-1)^2 + a(-1) + 5 = 0 \\iff -2 - 3 - a + 5 = 0 \\implies a = 0$."
  },

  // ==================== TOÁN 8 ====================
  // Giữa Kỳ 1 (GK1)
  {
    id: "T8_GK1_01",
    grade: 8,
    term: "GK1",
    topic: "Đại số",
    subtopic: "Hằng đẳng thức đáng nhớ",
    level: "NB",
    type: "mcq",
    question: "Khai triển hằng đẳng thức $(2x - 3)^2$ ta được:",
    options: ["$4x^2 - 12x + 9$", "$4x^2 - 6x + 9$", "$4x^2 - 9$", "$4x^2 + 12x + 9$"],
    correctAnswer: "A",
    explanation: "$(2x - 3)^2 = (2x)^2 - 2(2x)(3) + 3^2 = 4x^2 - 12x + 9$."
  },
  {
    id: "T8_GK1_02",
    grade: 8,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Tứ giác & Hình bình hành, Hình chữ nhật",
    level: "TH",
    type: "mcq",
    question: "Tứ giác có hai đường chéo bằng nhau và cắt nhau tại trung điểm của mỗi đường là:",
    options: ["Hình chữ nhật", "Hình thoi", "Hình bình hành", "Hình thang cân"],
    correctAnswer: "A",
    explanation: "Theo dấu hiệu nhận biết: Hình bình hành có hai đường chéo bằng nhau là Hình chữ nhật."
  },
  // Cuối Kỳ 1 (CK1)
  {
    id: "T8_CK1_01",
    grade: 8,
    term: "CK1",
    topic: "Đại số",
    subtopic: "Phân thức đại số",
    level: "TH",
    type: "mcq",
    question: "Điều kiện xác định của phân thức $P = \\dfrac{2x + 1}{x^2 - 4}$ là:",
    options: ["$x \\ne 2 \\text{ và } x \\ne -2$", "$x \\ne 2$", "$x \\ne -2$", "$x \\ne 4$"],
    correctAnswer: "A",
    explanation: "$x^2 - 4 \\ne 0 \\iff (x-2)(x+2) \\ne 0 \\iff x \\ne 2$ và $x \\ne -2$."
  },
  // Giữa Kỳ 2 (GK2)
  {
    id: "T8_GK2_01",
    grade: 8,
    term: "GK2",
    topic: "Hình học",
    subtopic: "Định lý Thalès & Tam giác đồng dạng",
    level: "TH",
    type: "mcq",
    question: "Cho $\\triangle ABC$ có $MN \\parallel BC$ ($M \\in AB, N \\in AC$). Biết $AM = 4\\text{ cm}, MB = 2\\text{ cm}, AN = 6\\text{ cm}$. Độ dài $NC$ là:",
    options: ["$3\\text{ cm}$", "$2\\text{ cm}$", "$4\\text{ cm}$", "$8\\text{ cm}$"],
    correctAnswer: "A",
    explanation: "$\\dfrac{AM}{MB} = \\dfrac{AN}{NC} \\iff \\dfrac{4}{2} = \\dfrac{6}{NC} \\implies NC = 3\\text{ cm}$."
  },
  // Cuối Kỳ 2 (CK2)
  {
    id: "T8_CK2_01",
    grade: 8,
    term: "CK2",
    topic: "Đại số",
    subtopic: "Phương trình bậc nhất một biến",
    level: "VD",
    type: "essay",
    question: "Giải phương trình $(x - 3)(2x + 4) = 0$. Tổng các nghiệm của phương trình là:",
    options: [],
    correctAnswer: "1 | x=1",
    explanation: "Nghiệm $x_1 = 3, x_2 = -2$. Tổng $x_1 + x_2 = 3 + (-2) = 1$."
  },

  // ==================== TOÁN 9 ====================
  // Giữa Kỳ 1 (GK1)
  {
    id: "T9_GK1_01",
    grade: 9,
    term: "GK1",
    topic: "Đại số",
    subtopic: "Căn bậc hai & Điều kiện xác định",
    level: "NB",
    type: "mcq",
    question: "Biểu thức $\\sqrt{3 - 2x}$ xác định với các giá trị của $x$ là:",
    options: ["$x \\le \\dfrac{3}{2}$", "$x \\ge \\dfrac{3}{2}$", "$x < \\dfrac{3}{2}$", "$x \\le -\\dfrac{3}{2}$"],
    correctAnswer: "A",
    explanation: "$3 - 2x \\ge 0 \\iff 2x \\le 3 \\iff x \\le \\dfrac{3}{2}$."
  },
  {
    id: "T9_GK1_02",
    grade: 9,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Hệ thức lượng trong tam giác vuông",
    level: "TH",
    type: "mcq",
    question: "Cho $\\triangle ABC$ vuông tại $A$, đường cao $AH$. Biết $BH = 4\\text{ cm}, CH = 9\\text{ cm}$. Độ dài đường cao $AH$ là:",
    options: ["$6\\text{ cm}$", "$36\\text{ cm}$", "$6.5\\text{ cm}$", "$\\sqrt{13}\\text{ cm}$"],
    correctAnswer: "A",
    explanation: "$AH^2 = BH \\cdot CH = 4 \\times 9 = 36 \\implies AH = 6\\text{ cm}$."
  },
  // Cuối Kỳ 1 (CK1)
  {
    id: "T9_CK1_01",
    grade: 9,
    term: "CK1",
    topic: "Đại số",
    subtopic: "Hệ phương trình bậc nhất hai ẩn",
    level: "TH",
    type: "mcq",
    question: "Nghiệm $(x; y)$ của hệ phương trình $\\begin{cases} 2x + y = 7 \\\\ x - 3y = -7 \\end{cases}$ là:",
    options: ["$(2; 3)$", "$(3; 2)$", "$(1; 5)$", "$(4; -1)$"],
    correctAnswer: "A",
    explanation: "Giải hệ phương trình ta nhận được $x = 2$ và $y = 3$."
  },
  // Giữa Kỳ 2 (GK2)
  {
    id: "T9_GK2_01",
    grade: 9,
    term: "GK2",
    topic: "Đại số",
    subtopic: "Phương trình bậc hai & Định lý Viète",
    level: "VD",
    type: "mcq",
    question: "Gọi $x_1, x_2$ là hai nghiệm của phương trình $x^2 - 5x + 3 = 0$. Giá trị $A = x_1^2 + x_2^2$ là:",
    options: ["$19$", "$25$", "$22$", "$31$"],
    correctAnswer: "A",
    explanation: "$A = (x_1+x_2)^2 - 2x_1 x_2 = 5^2 - 2(3) = 25 - 6 = 19$."
  },
  // Cuối Kỳ 2 (CK2)
  {
    id: "T9_CK2_01",
    grade: 9,
    term: "CK2",
    topic: "Hình học",
    subtopic: "Đường tròn & Tứ giác nội tiếp",
    level: "VD",
    type: "essay",
    question: "Cho $(O; 5\\text{ cm})$ và dây $AB = 8\\text{ cm}$. Khoảng cách từ tâm $O$ đến dây $AB$ bằng bao nhiêu cm?",
    options: [],
    correctAnswer: "3 | 3cm | d=3",
    explanation: "$d = \\sqrt{R^2 - (AB/2)^2} = \\sqrt{5^2 - 4^2} = 3\\text{ cm}$."
  },

  // ==================== ÔN THI TUYỂN SINH VÀO 10 (TS10) ====================
  {
    id: "TS10_001",
    grade: "TS10",
    term: "TS10",
    topic: "Rút gọn biểu thức chứa căn",
    subtopic: "Biến đổi đồng nhất",
    level: "TH",
    type: "mcq",
    question: "Rút gọn biểu thức $P = \\left(\\dfrac{\\sqrt{x}}{\\sqrt{x}-1} - \\dfrac{1}{x-\\sqrt{x}}\\right) : \\dfrac{\\sqrt{x}+1}{\\sqrt{x}-1}$ với $x > 0, x \\ne 1$ được:",
    options: ["$P = \\dfrac{\\sqrt{x}-1}{\\sqrt{x}}$", "$P = \\dfrac{1}{\\sqrt{x}}$", "$P = \\sqrt{x}$", "$P = \\dfrac{\\sqrt{x}+1}{\\sqrt{x}}$"],
    correctAnswer: "A",
    explanation: "Quy đồng và rút gọn biểu thức trong ngoặc ta được kết quả $P = \\dfrac{\\sqrt{x}-1}{\\sqrt{x}}$."
  },
  {
    id: "TS10_002",
    grade: "TS10",
    term: "TS10",
    topic: "Phương trình & Tham số m",
    subtopic: "Hệ thức Viète nâng cao",
    level: "VD",
    type: "mcq",
    question: "Cho phương trình $x^2 - 2(m-1)x + m^2 - 4 = 0$. Tìm $m$ để phương trình có hai nghiệm phân biệt $x_1, x_2$ thỏa mãn $x_1^2 + x_2^2 + x_1 x_2 = 7$.",
    options: ["$m = 1$", "$m = -1$", "$m = 2$", "$m = 3$"],
    correctAnswer: "A",
    explanation: "Áp dụng định lý Vi-ét và điều kiện $\\Delta' > 0$, giải tìm được giá trị thỏa mãn là $m = 1$."
  },
  {
    id: "TS10_003",
    grade: "TS10",
    term: "TS10",
    topic: "Toán thực tế",
    subtopic: "Giải bài toán bằng cách lập phương trình",
    level: "VD",
    type: "essay",
    question: "Một xưởng may theo kế hoạch phải may $1000$ cái áo. Do cải tiến kỹ thuật, mỗi ngày xưởng may thêm được $10$ cái áo nên đã hoàn thành sớm hơn $5$ ngày và may thêm được $50$ cái áo. Hỏi theo kế hoạch mỗi ngày xưởng phải may bao nhiêu cái áo?",
    options: [],
    correctAnswer: "40 | 40 áo | x=40",
    explanation: "Lập phương trình $\\dfrac{1000}{x} - \\dfrac{1050}{x+10} = 5 \\implies x = 40$ chiếc áo/ngày."
  },

  // ==================== TOÁN 10 ====================
  // Giữa Kỳ 1 (GK1)
  {
    id: "T10_GK1_01",
    grade: 10,
    term: "GK1",
    topic: "Mệnh đề & Tập hợp",
    subtopic: "Giao và hợp của tập hợp số",
    level: "NB",
    type: "mcq",
    question: "Cho hai tập hợp $A = [-2; 4)$ và $B = (0; 5]$. Khi đó $A \\cap B$ là khoảng/đoạn:",
    options: ["$(0; 4)$", "$[-2; 5]$", "$[0; 4)$", "$(-2; 0)$"],
    correctAnswer: "A",
    explanation: "Giao của hai tập hợp là $A \\cap B = (0; 4)$."
  },
  {
    id: "T10_GK1_02",
    grade: 10,
    term: "GK1",
    topic: "Bất phương trình",
    subtopic: "Bất phương trình bậc nhất hai ẩn",
    level: "TH",
    type: "mcq",
    question: "Cặp số nào sau đây là một nghiệm của bất phương trình $2x - 3y + 6 > 0$?",
    options: ["$(1; 2)$", "$(0; 3)$", "$(-4; 0)$", "$(1; 4)$"],
    correctAnswer: "A",
    explanation: "Thay $(1; 2)$ vào bất phương trình: $2(1) - 3(2) + 6 = 2 > 0$ (Thỏa mãn)."
  },
  // Cuối Kỳ 1 (CK1)
  {
    id: "T10_CK1_01",
    grade: 10,
    term: "CK1",
    topic: "Hàm số bậc hai",
    subtopic: "Tọa độ đỉnh Parabol",
    level: "TH",
    type: "mcq",
    question: "Tọa độ đỉnh $I$ của Parabol $(P): y = x^2 - 4x + 3$ là:",
    options: ["$I(2; -1)$", "$I(-2; 15)$", "$I(2; 1)$", "$I(4; 3)$"],
    correctAnswer: "A",
    explanation: "$x_I = -b/(2a) = 2; y_I = 2^2 - 4(2) + 3 = -1 \\implies I(2; -1)$."
  },
  {
    id: "T10_CK1_02",
    grade: 10,
    term: "CK1",
    topic: "Vectơ",
    subtopic: "Tích vô hướng hai vectơ",
    level: "VD",
    type: "mcq",
    question: "Trong mặt phẳng $Oxy$, cho $\\vec{a} = (2; -1)$ và $\\vec{b} = (3; 4)$. Tích vô hướng $\\vec{a} \\cdot \\vec{b}$ bằng:",
    options: ["$2$", "$-2$", "$10$", "$14$"],
    correctAnswer: "A",
    explanation: "$\\vec{a} \\cdot \\vec{b} = 2(3) + (-1)(4) = 6 - 4 = 2$."
  },
  // Giữa Kỳ 2 (GK2)
  {
    id: "T10_GK2_01",
    grade: 10,
    term: "GK2",
    topic: "Đại số tổ hợp",
    subtopic: "Quy tắc cộng & Quy tắc nhân",
    level: "NB",
    type: "mcq",
    question: "Từ các chữ số $1, 2, 3, 4, 5$ có thể lập được bao nhiêu số tự nhiên gồm 3 chữ số đôi một khác nhau?",
    options: ["$60$", "$125$", "$20$", "$10$"],
    correctAnswer: "A",
    explanation: "Số các số lập được là $A_5^3 = 5 \\times 4 \\times 3 = 60$ số."
  },
  // Cuối Kỳ 2 (CK2)
  {
    id: "T10_CK2_01",
    grade: 10,
    term: "CK2",
    topic: "Hình học tọa độ",
    subtopic: "Phương trình đường tròn",
    level: "TH",
    type: "mcq",
    question: "Tâm $I$ và bán kính $R$ của đường tròn $(C): (x - 2)^2 + (y + 3)^2 = 25$ là:",
    options: ["$I(2; -3), R = 5$", "$I(-2; 3), R = 5$", "$I(2; -3), R = 25$", "$I(-2; 3), R = 25$"],
    correctAnswer: "A",
    explanation: "Đường tròn có tâm $I(2; -3)$ và bán kính $R = \\sqrt{25} = 5$."
  },

  // ==================== TOÁN 11 ====================
  {
    id: "T11_GK1_01",
    grade: 11,
    term: "GK1",
    topic: "Lượng giác",
    subtopic: "Phương trình lượng giác cơ bản",
    level: "NB",
    type: "mcq",
    question: "Nghiệm của phương trình $\\sin x = 0$ là:",
    options: ["$x = k\\pi\\; (k \\in \\mathbb{Z})$", "$x = \\dfrac{\\pi}{2} + k\\pi$", "$x = k2\\pi$", "$x = \\dfrac{\\pi}{2} + k2\\pi$"],
    correctAnswer: "A",
    explanation: "Phương trình $\\sin x = 0 \\iff x = k\\pi\\; (k \\in \\mathbb{Z})$."
  },
  {
    id: "T11_CK1_01",
    grade: 11,
    term: "CK1",
    topic: "Dãy số",
    subtopic: "Cấp số cộng",
    level: "TH",
    type: "mcq",
    question: "Cho cấp số cộng $(u_n)$ có $u_1 = 3$ và công sai $d = 2$. Số hạng thứ 5 là:",
    options: ["$11$", "$13$", "$9$", "$15$"],
    correctAnswer: "A",
    explanation: "$u_5 = u_1 + 4d = 3 + 4(2) = 11$."
  },

  // ==================== TOÁN 12 & THPT ====================
  {
    id: "T12_GK1_01",
    grade: 12,
    term: "GK1",
    topic: "Giải tích",
    subtopic: "Cực trị của hàm số",
    level: "TH",
    type: "mcq",
    question: "Điểm cực tiểu của hàm số $y = x^3 - 3x + 2$ là:",
    options: ["$x = 1$", "$x = -1$", "$x = 0$", "$x = 2$"],
    correctAnswer: "A",
    explanation: "$y' = 3x^2 - 3 = 0 \\iff x = \\pm 1$. Vì $y''(1) = 6 > 0$ nên $x = 1$ là điểm cực tiểu."
  },
  {
    id: "T12_CK1_01",
    grade: 12,
    term: "CK1",
    topic: "Giải tích",
    subtopic: "Nguyên hàm & Tích phân",
    level: "NB",
    type: "mcq",
    question: "Họ nguyên hàm của hàm số $f(x) = e^{2x}$ là:",
    options: ["$\\dfrac{1}{2} e^{2x} + C$", "$2e^{2x} + C$", "$e^{2x} + C$", "$\\dfrac{1}{2} e^x + C$"],
    correctAnswer: "A",
    explanation: "$\\int e^{2x} dx = \\dfrac{1}{2} e^{2x} + C$."
  }
];

const MathEngine = {
  /**
   * Xáo trộn vị trí 4 đáp án A, B, C, D và tự động ánh xạ lại đáp án đúng
   */
  shuffleQuestionOptions(q) {
    if (!q.options || q.options.length < 2) return q;
    
    const letters = ['A', 'B', 'C', 'D'];
    const correctLetter = (q.correctAnswer || 'A').toUpperCase();
    const correctIdx = letters.indexOf(correctLetter);
    const correctContent = q.options[correctIdx >= 0 ? correctIdx : 0];

    // Xáo trộn ngẫu nhiên 4 phương án
    const shuffled = [...q.options].sort(() => 0.5 - Math.random());
    const newCorrectIdx = shuffled.indexOf(correctContent);
    const newCorrectLetter = letters[newCorrectIdx >= 0 ? newCorrectIdx : 0];

    return {
      ...q,
      options: shuffled,
      correctAnswer: newCorrectLetter
    };
  },

  /**
   * Sinh câu hỏi ngẫu nhiên bằng thuật toán biến đổi tham số số học
   */
  generateRandomDynamicQuestion(grade = 10, term = 'GK1', index = 1) {
    const types = ['quadratic_roots', 'pythagorean_geometry', 'linear_system', 'fraction_eval'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    if (chosenType === 'quadratic_roots') {
      const r1 = Math.floor(Math.random() * 7) - 3;
      const r2 = Math.floor(Math.random() * 7) + 1;
      const b = -(r1 + r2);
      const c = r1 * r2;
      const bSign = b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`;
      const cSign = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;

      const options = [
        `$x_1 = ${r1};\\; x_2 = ${r2}$`,
        `$x_1 = ${-r1};\\; x_2 = ${-r2}$`,
        `$x_1 = ${r1 + 1};\\; x_2 = ${r2 - 1}$`,
        `$x_1 = ${r1 - 1};\\; x_2 = ${r2 + 2}$`
      ];

      return {
        id: `DYN_Q_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Phương trình bậc hai",
        level: "TH",
        type: "mcq",
        question: `Tìm nghiệm của phương trình bậc hai: $x^2 ${bSign} ${cSign} = 0$.`,
        options,
        correctAnswer: "A",
        explanation: `Phương trình tương đương $(x - ${r1})(x - ${r2}) = 0 \\implies x_1 = ${r1}; x_2 = ${r2}$.`
      };
    } else if (chosenType === 'linear_system') {
      const x = Math.floor(Math.random() * 5) + 1;
      const y = Math.floor(Math.random() * 5) + 1;
      const eq1 = 2 * x + y;
      const eq2 = x - 2 * y;

      const options = [
        `$(${x}; ${y})$`,
        `$(${y}; ${x})$`,
        `$(${x + 1}; ${y - 1})$`,
        `$(${x - 1}; ${y + 2})$`
      ];

      return {
        id: `DYN_Q_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Hệ phương trình bậc nhất",
        level: "TH",
        type: "mcq",
        question: `Nghiệm $(x; y)$ của hệ phương trình $\\begin{cases} 2x + y = ${eq1} \\\\ x - 2y = ${eq2} \\end{cases}$ là:`,
        options,
        correctAnswer: "A",
        explanation: `Giải hệ phương trình ta nhận được nghiệm duy nhất $(x; y) = (${x}; ${y})$.`
      };
    } else {
      const a = (Math.floor(Math.random() * 4) + 1) * 3;
      const b = (a / 3) * 4;
      const c = (a / 3) * 5;

      const options = [`$${c}\\text{ cm}$`, `$${c + 2}\\text{ cm}$`, `$${c - 1}\\text{ cm}$`, `$${a + b}\\text{ cm}$`];

      return {
        id: `DYN_Q_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Định lý Pythagore",
        level: "NB",
        type: "mcq",
        question: `Cho tam giác vuông có độ dài hai cạnh góc vuông là $a = ${a}\\text{ cm}$ và $b = ${b}\\text{ cm}$. Độ dài cạnh huyền là:`,
        options,
        correctAnswer: "A",
        explanation: `$c = \\sqrt{a^2 + b^2} = \\sqrt{${a}^2 + ${b}^2} = ${c}\\text{ cm}$.`
      };
    }
  },

  /**
   * Sinh bộ đề thi hoàn chỉnh theo cấu hình ma trận & Kỳ thi
   */
  generateExam(config = {}) {
    const {
      grade = '10',
      term = 'GK1',
      topic = 'all',
      mcqCount = 10,
      essayCount = 2,
      timeLimit = 45,
      title = ''
    } = config;

    let pool = MATH_QUESTION_BANK.filter(q => {
      const matchGrade = grade === 'all' || q.grade.toString() === grade.toString();
      const matchTerm = term === 'all' || q.term === term;
      const matchTopic = topic === 'all' || q.topic.toLowerCase().includes(topic.toLowerCase());
      return matchGrade && matchTerm && matchTopic;
    });

    // Nếu bộ lọc quá chặt, lấy theo khối lớp
    if (pool.length < (mcqCount + essayCount)) {
      pool = MATH_QUESTION_BANK.filter(q => grade === 'all' || q.grade.toString() === grade.toString());
    }

    if (pool.length < (mcqCount + essayCount)) {
      pool = [...MATH_QUESTION_BANK];
    }

    const mcqPool = pool.filter(q => q.type === 'mcq');
    const essayPool = pool.filter(q => q.type === 'essay');

    // Shuffle & Pick MCQ
    const shuffledMcq = [...mcqPool].sort(() => 0.5 - Math.random());
    const selectedMcq = shuffledMcq.slice(0, mcqCount);

    // If still missing MCQ, dynamically generate
    while (selectedMcq.length < mcqCount) {
      const dynQ = this.generateRandomDynamicQuestion(grade === 'all' ? 10 : parseInt(grade, 10), term, selectedMcq.length + 1);
      selectedMcq.push(dynQ);
    }

    // Shuffle & Pick Essay
    const shuffledEssay = [...essayPool].sort(() => 0.5 - Math.random());
    const selectedEssay = shuffledEssay.slice(0, essayCount);

    while (selectedEssay.length < essayCount) {
      const dynE = {
        id: `DYN_ESSAY_${Date.now()}_${selectedEssay.length + 1}`,
        grade: grade === 'all' ? 10 : parseInt(grade, 10),
        term,
        topic: "Tự luận Toán",
        level: "VD",
        type: "essay",
        question: `Tìm nghiệm nguyên dương của phương trình: $2x^2 - 8x + 6 = 0$.`,
        options: [],
        correctAnswer: "1 | 3 | x=1 | x=3",
        explanation: "Phương trình có 2 nghiệm $x_1 = 1, x_2 = 3$."
      };
      selectedEssay.push(dynE);
    }

    // Build answer keys array & HTML document
    const answerKeys = [];
    const mcqScore = mcqCount ? Math.round(((10 - essayCount * 2) / mcqCount) * 100) / 100 : 0;
    const essayScore = 2.0;

    // Shuffle options of MCQ so correct answers are naturally distributed among A, B, C, D
    selectedMcq.forEach((q, idx) => {
      const shuffledQ = MathEngine.shuffleQuestionOptions(q);
      answerKeys.push({
        num: idx + 1,
        type: 'mcq',
        correct: shuffledQ.correctAnswer,
        score: mcqScore,
        content: shuffledQ.question,
        options: shuffledQ.options,
        explanation: shuffledQ.explanation
      });
    });

    selectedEssay.forEach((q, idx) => {
      answerKeys.push({
        num: selectedMcq.length + idx + 1,
        type: 'essay',
        correct: q.correctAnswer || '12 | x=12',
        score: essayScore,
        content: q.question,
        explanation: q.explanation
      });
    });

    const termLabels = {
      GK1: "Giữa Học Kỳ I",
      CK1: "Cuối Học Kỳ I",
      GK2: "Giữa Học Kỳ II",
      CK2: "Cuối Học Kỳ II",
      TS10: "Tuyển Sinh Vào Lớp 10",
      THPT: "Thi Thử Tốt Nghiệp THPT"
    };

    const gradeLabel = grade === 'TS10' ? 'Ôn Thi Vào 10' : (grade === 'all' ? 'Tổng Hợp' : `Lớp ${grade}`);
    const termLabel = termLabels[term] || 'Chuẩn Ma Trận';
    const examTitle = title || `Đề Kiểm Tra ${termLabel} — Môn Toán ${gradeLabel}`;

    // Generate formatted HTML text representation of the exam
    const examHtml = this.renderExamToHtml(examTitle, answerKeys, timeLimit, termLabel);

    return {
      title: examTitle,
      term,
      timeLimit,
      totalQuestions: answerKeys.length,
      mcqCount: selectedMcq.length,
      essayCount: selectedEssay.length,
      answerKeys,
      examHtml
    };
  },

  renderExamToHtml(title, keys, timeLimit, termLabel = '') {
    const mcqItems = keys.filter(k => k.type === 'mcq');
    const essayItems = keys.filter(k => k.type === 'essay');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Google Fonts: Plus Jakarta Sans -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  
  <!-- KaTeX Math Rendering -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 2.25rem 2rem;
      color: #1e293b;
      line-height: 1.7;
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      font-size: 15px;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #cbd5e1;
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
    }
    .title {
      font-family: 'Outfit', 'Plus Jakarta Sans', sans-serif;
      font-size: 1.55rem;
      font-weight: 800;
      color: #4338ca;
      margin-bottom: 0.4rem;
    }
    .meta {
      font-size: 0.95rem;
      font-weight: 700;
      color: #64748b;
    }
    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 1.15rem;
      font-weight: 800;
      color: #3730a3;
      margin: 1.75rem 0 1rem;
      padding: 0.4rem 0.8rem;
      background: #eef2ff;
      border-left: 4px solid #6366f1;
      border-radius: 4px;
    }
    .q-card {
      margin-bottom: 1.25rem;
      background: #f8fafc;
      padding: 1.1rem 1.35rem;
      border-radius: 10px;
      border: 1.5px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    .q-card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .q-header {
      font-size: 1rem;
      font-weight: 600;
      color: #1e293b;
    }
    .q-num {
      font-weight: 800;
      color: #4f46e5;
      margin-right: 0.35rem;
    }
    .opts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.65rem;
      margin-top: 0.85rem;
    }
    .opt-item {
      background: #ffffff;
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      border: 1.5px solid #cbd5e1;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #334155;
    }
    .opt-lbl {
      font-weight: 800;
      color: #4f46e5;
    }
    .katex {
      font-size: 1.1em !important;
    }
    .katex-display {
      margin: 0.6em 0 !important;
    }
  </style>

  <script>
    function triggerKatexRender() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false,
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
        });
      }
    }
    document.addEventListener("DOMContentLoaded", triggerKatexRender);
    window.addEventListener("load", triggerKatexRender);
    setTimeout(triggerKatexRender, 150);
    setTimeout(triggerKatexRender, 600);
  </script>
</head>
<body>
  <div class="header">
    <div class="title">📐 ${escapeHtml(title)}</div>
    <div class="meta">⏱️ Thời gian làm bài: <strong>${timeLimit} phút</strong> &nbsp;|&nbsp; Tổng số: <strong>${keys.length} câu hỏi</strong> &nbsp;|&nbsp; Định dạng: <strong>${escapeHtml(termLabel || 'Chuẩn TOANMATH')}</strong></div>
  </div>

  <div class="section-title">🔵 PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (${mcqItems.length} CÂU)</div>
  ${mcqItems.map(q => `
    <div class="q-card">
      <div class="q-header"><span class="q-num">Câu ${q.num}:</span> ${q.content || 'Đọc kỹ câu hỏi và chọn phương án đúng:'}</div>
      ${q.options && q.options.length ? `
        <div class="opts-grid">
          ${q.options.map((opt, i) => `
            <div class="opt-item"><span class="opt-lbl">${['A', 'B', 'C', 'D'][i]}.</span> <span>${opt}</span></div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}

  ${essayItems.length ? `
    <div class="section-title" style="background:#fffbeb;border-color:#f59e0b;color:#b45309;">✍️ PHẦN II. TỰ LUẬN ĐIỀN ĐÁP SỐ TOÁN HỌC (${essayItems.length} CÂU)</div>
    ${essayItems.map(q => `
      <div class="q-card" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
        <div class="q-header"><span class="q-num" style="color:#d97706;">Câu ${q.num}:</span> ${q.content || 'Giải và điền đáp số chuẩn vào phiếu:'}</div>
      </div>
    `).join('')}
  ` : ''}
</body>
</html>`;
  }
};

window.MathEngine = MathEngine;
