/**
 * KhiemEdu Math Engine & Dynamic Question Generator
 * Ngân hàng đề thi Toán học chuẩn TOANMATH.com (Lớp 6 - 12 & Luyện Thi Vào 10 / THPT)
 * Tích hợp Hình vẽ Hình học & Đồ thị SVG Vector chuẩn đề thi thật
 * Phân loại chuẩn 4 Mức độ nhận thức: Nhận biết (NB), Thông hiểu (TH), Vận dụng (VD), Vận dụng cao (VDC)
 * Phân loại chuẩn 4 Kỳ: Giữa kỳ 1 (GK1), Cuối kỳ 1 (CK1), Giữa kỳ 2 (GK2), Cuối kỳ 2 (CK2), Tuyển sinh 10 & THPT
 */

/* ================= 📐 BỘ VẼ HÌNH MINH HỌA TOÁN HỌC CHUẨN SVG (VECTOR DIAGRAMS) ================= */
const MathDiagrams = {
  // Tam giác vuông có đường cao và ký hiệu góc vuông
  rightTriangle(AB = '6', AC = '8', BC = '10', AH = 'h') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="240" height="150" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Tam giác vuông ABC vuông tại A -->
          <polygon points="40,120 40,30 200,120" fill="rgba(99, 102, 241, 0.05)" stroke="#4f46e5" stroke-width="2"/>
          <!-- Đường cao AH -->
          <line x1="40" y1="120" x2="88" y2="75" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3,3"/>
          <!-- Ký hiệu vuông góc tại A -->
          <polyline points="40,105 55,105 55,120" fill="none" stroke="#4f46e5" stroke-width="1.5"/>
          <!-- Ký hiệu vuông góc tại H -->
          <polyline points="80,72 88,64 96,72" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          <!-- Tên các đỉnh -->
          <text x="25" y="130" font-weight="bold" fill="#1e293b" font-size="14">A</text>
          <text x="35" y="25" font-weight="bold" fill="#1e293b" font-size="14">B</text>
          <text x="205" y="130" font-weight="bold" fill="#1e293b" font-size="14">C</text>
          <text x="94" y="68" font-weight="bold" fill="#ef4444" font-size="13">H</text>
          <!-- Số liệu cạnh -->
          <text x="15" y="75" fill="#6366f1" font-size="12" font-weight="600">${AB}</text>
          <text x="120" y="138" fill="#6366f1" font-size="12" font-weight="600">${AC}</text>
          <text x="125" y="65" fill="#6366f1" font-size="12" font-weight="600">${BC}</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình minh họa tam giác vuông và đường cao)</div>
      </div>
    `;
  },

  // Đường tròn và 2 tiếp tuyến cắt nhau
  circleWithTangents(r = 5, om = 10) {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="260" height="150" viewBox="0 0 260 150" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Tâm O và đường tròn -->
          <circle cx="80" cy="75" r="45" fill="none" stroke="#0ea5e9" stroke-width="2"/>
          <circle cx="80" cy="75" r="2.5" fill="#0ea5e9"/>
          <!-- Điểm M ngoài đường tròn -->
          <circle cx="210" cy="75" r="3" fill="#ef4444"/>
          <!-- Hai tiếp tuyến MA, MB -->
          <line x1="210" y1="75" x2="105" y2="38" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="210" y1="75" x2="105" y2="112" stroke="#4f46e5" stroke-width="1.8"/>
          <!-- Bán kính OA, OB -->
          <line x1="80" y1="75" x2="105" y2="38" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3,2"/>
          <line x1="80" y1="75" x2="105" y2="112" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3,2"/>
          <!-- Dây cung AB và đoạn OM -->
          <line x1="105" y1="38" x2="105" y2="112" stroke="#f59e0b" stroke-width="1.5"/>
          <line x1="80" y1="75" x2="210" y2="75" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,3"/>
          <!-- Ký hiệu đỉnh -->
          <text x="65" y="78" font-weight="bold" fill="#0ea5e9" font-size="13">O</text>
          <text x="220" y="80" font-weight="bold" fill="#ef4444" font-size="14">M</text>
          <text x="105" y="28" font-weight="bold" fill="#1e293b" font-size="13">A</text>
          <text x="105" y="130" font-weight="bold" fill="#1e293b" font-size="13">B</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình minh họa tiếp tuyến MA, MB từ M đến (O))</div>
      </div>
    `;
  },

  // Đồ thị Parabol y = x^2 - 4x + 3
  parabolaGraph() {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="220" height="150" viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Hệ trục tọa độ Oxy -->
          <line x1="20" y1="110" x2="200" y2="110" stroke="#475569" stroke-width="1.5"/>
          <line x1="70" y1="140" x2="70" y2="15" stroke="#475569" stroke-width="1.5"/>
          <!-- Mũi tên trục -->
          <polygon points="200,110 193,107 193,113" fill="#475569"/>
          <polygon points="70,15 67,22 73,22" fill="#475569"/>
          <text x="195" y="125" font-size="11" font-weight="bold" fill="#475569">x</text>
          <text x="55" y="25" font-size="11" font-weight="bold" fill="#475569">y</text>
          <text x="58" y="123" font-size="11" font-weight="bold" fill="#475569">O</text>
          <!-- Đường cong Parabol y = x^2 - 4x + 3 -->
          <path d="M 40,35 Q 120,175 190,35" fill="none" stroke="#6366f1" stroke-width="2.2"/>
          <!-- Đỉnh I(2; -1) -->
          <circle cx="120" cy="125" r="3" fill="#ef4444"/>
          <line x1="120" y1="110" x2="120" y2="125" stroke="#ef4444" stroke-width="1" stroke-dasharray="2,2"/>
          <text x="125" y="138" font-size="11" font-weight="bold" fill="#ef4444">I(2; -1)</text>
          <!-- Giao điểm x = 1, x = 3 -->
          <circle cx="95" cy="110" r="2.5" fill="#475569"/>
          <circle cx="145" cy="110" r="2.5" fill="#475569"/>
          <text x="90" y="103" font-size="10" font-weight="600" fill="#475569">1</text>
          <text x="145" y="103" font-size="10" font-weight="600" fill="#475569">3</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Đồ thị hàm số bậc hai y = x² - 4x + 3)</div>
      </div>
    `;
  },

  // Hình chóp không gian S.ABCD
  pyramidSABCD() {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="220" height="150" viewBox="0 0 220 150" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Đỉnh S -->
          <circle cx="110" cy="20" r="3" fill="#4f46e5"/>
          <text x="105" y="15" font-weight="bold" fill="#4f46e5" font-size="13">S</text>
          <!-- Đáy ABCD -->
          <line x1="40" y1="100" x2="90" y2="135" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="90" y1="135" x2="190" y2="135" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="190" y1="135" x2="140" y2="100" stroke="#1e293b" stroke-width="1.5"/>
          <!-- Nét đứt mặt đáy AD -->
          <line x1="40" y1="100" x2="140" y2="100" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
          <!-- Cạnh bên -->
          <line x1="110" y1="20" x2="40" y2="100" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="110" y1="20" x2="90" y2="135" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="110" y1="20" x2="190" y2="135" stroke="#4f46e5" stroke-width="1.8"/>
          <!-- Nét đứt cạnh bên SA phía sau -->
          <line x1="110" y1="20" x2="140" y2="100" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <!-- Tên các đỉnh đáy -->
          <text x="25" y="105" font-weight="bold" fill="#1e293b" font-size="12">A</text>
          <text x="80" y="145" font-weight="bold" fill="#1e293b" font-size="12">B</text>
          <text x="195" y="145" font-weight="bold" fill="#1e293b" font-size="12">C</text>
          <text x="145" y="105" font-weight="bold" fill="#1e293b" font-size="12">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình minh họa hình chóp S.ABCD)</div>
      </div>
    `;
  },

  // Bảng biến thiên (Variation Table)
  variationTable() {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <table style="width:260px;margin:0 auto;border-collapse:collapse;font-size:12px;text-align:center;background:#fff;border:1.5px solid #cbd5e1;border-radius:6px;">
          <tr style="border-bottom:1.5px solid #cbd5e1;">
            <td style="padding:4px 8px;font-weight:bold;width:35px;border-right:1.5px solid #cbd5e1;background:#f1f5f9;">x</td>
            <td style="padding:4px;">$-\\infty$</td>
            <td style="padding:4px;font-weight:bold;color:#4f46e5;">$-1$</td>
            <td style="padding:4px;font-weight:bold;color:#ef4444;">$1$</td>
            <td style="padding:4px;">$+\\infty$</td>
          </tr>
          <tr style="border-bottom:1.5px solid #cbd5e1;">
            <td style="padding:4px 8px;font-weight:bold;border-right:1.5px solid #cbd5e1;background:#f1f5f9;">y'</td>
            <td style="padding:4px;">$+$</td>
            <td style="padding:4px;font-weight:bold;">$0$</td>
            <td style="padding:4px;">$-$</td>
            <td style="padding:4px;font-weight:bold;">$0$</td>
            <td style="padding:4px;">$+$</td>
          </tr>
          <tr>
            <td style="padding:8px 8px;font-weight:bold;border-right:1.5px solid #cbd5e1;background:#f1f5f9;">y</td>
            <td colspan="5" style="padding:8px;font-weight:bold;color:#1e293b;">
              $-\\infty \\;\\nearrow\\; 4 \\;\\searrow\\; 0 \\;\\nearrow\\; +\\infty$
            </td>
          </tr>
        </table>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Bảng biến thiên của hàm số y = f(x))</div>
      </div>
    `;
  },

  // Hình thoi với 2 đường chéo vuông góc
  rhombus(d1 = '8cm', d2 = '6cm') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="220" height="130" viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- 4 đỉnh hình thoi -->
          <polygon points="110,15 190,65 110,115 30,65" fill="rgba(14, 165, 233, 0.08)" stroke="#0284c7" stroke-width="2"/>
          <!-- 2 đường chéo -->
          <line x1="30" y1="65" x2="190" y2="65" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
          <line x1="110" y1="15" x2="110" y2="115" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
          <!-- Giao điểm O -->
          <polyline points="110,57 118,57 118,65" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          <text x="115" y="77" font-size="11" fill="#ef4444" font-weight="bold">O</text>
          <!-- Tên các đỉnh -->
          <text x="105" y="12" font-weight="bold" fill="#1e293b" font-size="12">A</text>
          <text x="195" y="70" font-weight="bold" fill="#1e293b" font-size="12">B</text>
          <text x="105" y="128" font-weight="bold" fill="#1e293b" font-size="12">C</text>
          <text x="15" y="70" font-weight="bold" fill="#1e293b" font-size="12">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình thoi ABCD với hai đường chéo d₁ = ${d1}, d₂ = ${d2})</div>
      </div>
    `;
  }
};

/* ================= NGÂN HÀNG CÂU HỎI TOÁN TOANMATH (CHUẨN MA TRẬN & HÌNH ẢNH) ================= */
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
    options: ["$12$", "$6$", "$24$", "$240$"],
    correctAnswer: "A",
    explanation: "$48 = 2^4 \\times 3$; $60 = 2^2 \\times 3 \\times 5$. Vậy $\\text{ƯCLN}(48, 60) = 2^2 \\times 3 = 12$."
  },
  {
    id: "T6_GK1_03",
    grade: 6,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Hình thoi & Diện tích",
    level: "TH",
    type: "mcq",
    question: "Cho hình thoi $ABCD$ có độ dài hai đường chéo là $AC = 8\\text{ cm}$ và $BD = 6\\text{ cm}$ (như hình minh họa). Diện tích hình thoi $ABCD$ là:",
    diagram: MathDiagrams.rhombus('8cm', '6cm'),
    options: ["$24\\text{ cm}^2$", "$48\\text{ cm}^2$", "$14\\text{ cm}^2$", "$28\\text{ cm}^2$"],
    correctAnswer: "A",
    explanation: "$S = \\dfrac{1}{2} d_1 d_2 = \\dfrac{1}{2} \\times 8 \\times 6 = 24\\text{ cm}^2$."
  },
  {
    id: "T6_GK1_VD_E01",
    grade: 6,
    term: "GK1",
    topic: "Số học",
    subtopic: "Tìm x trong tập hợp số tự nhiên",
    level: "VD",
    type: "essay",
    question: "Tìm số tự nhiên $x$ thỏa mãn đẳng thức: $3^{x+1} - 3^x = 162$.",
    options: [],
    correctAnswer: "4 | x=4",
    explanation: "$3^x(3 - 1) = 162 \\iff 2 \\cdot 3^x = 162 \\iff 3^x = 81 = 3^4 \\implies x = 4$."
  },
  {
    id: "T6_GK1_VDC_E01",
    grade: 6,
    term: "GK1",
    topic: "Số học",
    subtopic: "Ước bội nâng cao & Tính chia hết",
    level: "VDC",
    type: "essay",
    question: "Tìm số tự nhiên $n$ nhỏ nhất sao cho phân số $A = \\dfrac{2n+3}{n+1}$ là một số nguyên:",
    options: [],
    correctAnswer: "0 | n=0",
    explanation: "$A = \\dfrac{2(n+1)+1}{n+1} = 2 + \\dfrac{1}{n+1}$. Để $A$ nguyên thì $n+1 \\in \\text{Ư}(1) = \\{1\\} \\implies n = 0$."
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

  // ==================== TOÁN 8 ====================
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
    explanation: "$(2x - 3)^2 = 4x^2 - 12x + 9$."
  },
  {
    id: "T8_VDC_E01",
    grade: 8,
    term: "CK1",
    topic: "Đại số",
    subtopic: "Bất đẳng thức Cauchy 2 số",
    level: "VDC",
    type: "essay",
    question: "Cho hai số thực dương $x, y$ thỏa mãn $x + y = 6$. Tìm giá trị lớn nhất của tích $P = xy$:",
    options: [],
    correctAnswer: "9 | max=9 | P=9",
    explanation: "Áp dụng BĐT Cauchy: $xy \\le \\left(\\dfrac{x+y}{2}\\right)^2 = \\left(\\dfrac{6}{2}\\right)^2 = 9$. Đạt khi $x = y = 3$."
  },

  // ==================== TOÁN 9 ====================
  {
    id: "T9_GK1_01",
    grade: 9,
    term: "GK1",
    topic: "Hình học",
    subtopic: "Hệ thức lượng trong tam giác vuông",
    level: "TH",
    type: "mcq",
    question: "Cho tam giác $ABC$ vuông tại $A$, đường cao $AH$ (như hình minh họa). Biết $BH = 4\\text{ cm}, CH = 9\\text{ cm}$. Độ dài đường cao $AH$ là:",
    diagram: MathDiagrams.rightTriangle('AB', 'AC', 'BC', 'AH'),
    options: ["$6\\text{ cm}$", "$36\\text{ cm}$", "$6.5\\text{ cm}$", "$\\sqrt{13}\\text{ cm}$"],
    correctAnswer: "A",
    explanation: "$AH^2 = BH \\cdot CH = 4 \\times 9 = 36 \\implies AH = 6\\text{ cm}$."
  },
  {
    id: "T9_CK1_01",
    grade: 9,
    term: "CK1",
    topic: "Hình học",
    subtopic: "Đường tròn và tiếp tuyến",
    level: "VD",
    type: "mcq",
    question: "Cho $(O; R)$ và điểm $M$ sao cho $OM = 2R$. Kẻ hai tiếp tuyến $MA, MB$ đến $(O)$ như hình vẽ. Góc $\\widehat{AMB}$ bằng:",
    diagram: MathDiagrams.circleWithTangents(5, 10),
    options: ["$60^\\circ$", "$90^\\circ$", "$45^\\circ$", "$120^\\circ$"],
    correctAnswer: "A",
    explanation: "$\\sin \\widehat{AMO} = \\dfrac{R}{OM} = \\dfrac{1}{2} \\implies \\widehat{AMO} = 30^\\circ \\implies \\widehat{AMB} = 2 \\times 30^\\circ = 60^\\circ$."
  },
  {
    id: "T9_VDC_E01",
    grade: 9,
    term: "CK2",
    topic: "Đại số",
    subtopic: "Cực trị căn thức (Câu 10 điểm)",
    level: "VDC",
    type: "essay",
    question: "Tìm giá trị lớn nhất của biểu thức $A = \\sqrt{x - 2} + \\sqrt{6 - x}$ với $2 \\le x \\le 6$:",
    options: [],
    correctAnswer: "2*sqrt(2) | sqrt(8) | 2.83 | 2sqrt(2)",
    explanation: "$A^2 \\le (1+1)(x-2+6-x) = 8 \\implies A \\le \\sqrt{8} = 2\\sqrt{2}$. Đạt khi $x = 4$."
  },

  // ==================== ÔN THI VÀO 10 (TS10) ====================
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
    explanation: "Rút gọn ta được $P = \\dfrac{\\sqrt{x}-1}{\\sqrt{x}}$."
  },
  {
    id: "TS10_VDC_E01",
    grade: "TS10",
    term: "TS10",
    topic: "Bất đẳng thức & Cực trị đại số (Câu điểm 10 Tuyển sinh 10)",
    subtopic: "Kỹ thuật Cauchy ngược dấu",
    level: "VDC",
    type: "essay",
    question: "Cho ba số thực dương $a, b, c$ thỏa mãn $a + b + c = 3$. Tìm giá trị nhỏ nhất của biểu thức $P = \\dfrac{a}{1+b^2} + \\dfrac{b}{1+c^2} + \\dfrac{c}{1+a^2}$:",
    options: [],
    correctAnswer: "1.5 | 3/2 | min=3/2",
    explanation: "Áp dụng Cauchy ngược dấu: $\\dfrac{a}{1+b^2} = a - \\dfrac{ab^2}{1+b^2} \\ge a - \\dfrac{ab}{2}$. Cộng 3 BĐT: $P \\ge a+b+c - \\dfrac{ab+bc+ca}{2} = 3 - 1.5 = 1.5$."
  },

  // ==================== TOÁN 10 ====================
  {
    id: "T10_GK1_01",
    grade: 10,
    term: "GK1",
    topic: "Hàm số bậc hai",
    subtopic: "Đồ thị Parabol",
    level: "TH",
    type: "mcq",
    question: "Cho hàm số bậc hai có đồ thị hình Parabol như hình vẽ dưới đây. Tọa độ đỉnh $I$ của Parabol là:",
    diagram: MathDiagrams.parabolaGraph(),
    options: ["$I(2; -1)$", "$I(-2; 15)$", "$I(2; 1)$", "$I(4; 3)$"],
    correctAnswer: "A",
    explanation: "Dựa vào đồ thị ta nhận thấy điểm cực tiểu (đỉnh) có tọa độ $x = 2, y = -1 \\implies I(2; -1)$."
  },

  // ==================== TOÁN 11 & 12 ====================
  {
    id: "T11_001",
    grade: 11,
    term: "GK1",
    topic: "Hình học không gian",
    subtopic: "Hình chóp S.ABCD",
    level: "TH",
    type: "mcq",
    question: "Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành (như hình vẽ). Giao tuyến của hai mặt phẳng $(SAB)$ và $(SCD)$ là đường thẳng đi qua $S$ và:",
    diagram: MathDiagrams.pyramidSABCD(),
    options: ["Song song với AB và CD", "Song song với AD và BC", "Cắt đoạn thẳng AC", "Vuông góc với mặt phẳng (ABCD)"],
    correctAnswer: "A",
    explanation: "Vì $AB \\parallel CD$ nên giao tuyến của $(SAB)$ và $(SCD)$ là đường thẳng qua $S$ và song song với $AB, CD$."
  },
  {
    id: "T12_001",
    grade: 12,
    term: "GK1",
    topic: "Khảo sát hàm số",
    subtopic: "Bảng biến thiên",
    level: "TH",
    type: "mcq",
    question: "Cho hàm số $y = f(x)$ có bảng biến thiên như hình bên dưới. Điểm cực tiểu của hàm số đã cho là:",
    diagram: MathDiagrams.variationTable(),
    options: ["$x = 1$", "$x = -1$", "$x = 0$", "$x = 4$"],
    correctAnswer: "A",
    explanation: "Dựa vào bảng biến thiên, đạo hàm đổi dấu từ âm sang dương qua $x = 1$, do đó $x = 1$ là điểm cực tiểu."
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
    const types = ['right_triangle_diagram', 'quadratic_roots', 'linear_system', 'pythagorean_geometry'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    if (chosenType === 'right_triangle_diagram') {
      const a = (Math.floor(Math.random() * 3) + 2) * 3; // 6, 9, 12
      const b = (a / 3) * 4; // 8, 12, 16
      const c = (a / 3) * 5; // 10, 15, 20
      const h = (a * b) / c;

      return {
        id: `DYN_TRI_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Hình học & Hệ thức lượng",
        level: "TH",
        type: "mcq",
        question: `Cho tam giác vuông có hai cạnh góc vuông $AB = ${a}\\text{ cm}, AC = ${b}\\text{ cm}$ (như hình minh họa). Độ dài đường cao $AH$ là:`,
        diagram: MathDiagrams.rightTriangle(`${a}cm`, `${b}cm`, `${c}cm`, 'AH'),
        options: [
          `$AH = ${h}\\text{ cm}$`,
          `$AH = ${h + 1}\\text{ cm}$`,
          `$AH = ${h - 0.5}\\text{ cm}$`,
          `$AH = ${Math.round(c / 2)}\\text{ cm}$`
        ],
        correctAnswer: "A",
        explanation: `$AH = \\dfrac{AB \\cdot AC}{BC} = \\dfrac{${a} \\times ${b}}{${c}} = ${h}\\text{ cm}$.`
      };
    } else if (chosenType === 'quadratic_roots') {
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
    } else {
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
        id: `DYN_SYS_${Date.now()}_${index}`,
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
    }
  },

  /**
   * Sinh câu hỏi tự luận ngẫu nhiên theo mức độ nhận thức (VD, VDC, TH)
   */
  generateRandomDynamicEssay(grade = 10, term = 'GK1', essayLevel = 'VD', index = 1) {
    if (essayLevel === 'VDC') {
      const p = Math.floor(Math.random() * 4) + 2;
      const pSq = p * p;
      return {
        id: `DYN_VDC_E_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Cực trị & Bất đẳng thức tham số (Câu 10 điểm)",
        level: "VDC",
        type: "essay",
        question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $P = x + \\dfrac{${pSq}}{x}$ với mọi số thực dương $x > 0$:`,
        options: [],
        correctAnswer: `${2 * p} | min=${2 * p} | P=${2 * p}`,
        explanation: `Áp dụng bất đẳng thức Cauchy cho hai số dương $x$ và $\\dfrac{${pSq}}{x}$: $P \\ge 2\\sqrt{x \\cdot \\dfrac{${pSq}}{x}} = 2 \\cdot ${p} = ${2 * p}$. Dấu bằng xảy ra khi $x = ${p}$.`
      };
    } else {
      const r1 = Math.floor(Math.random() * 4) + 1;
      const r2 = r1 + Math.floor(Math.random() * 3) + 1;
      const sum = r1 + r2;
      const prod = r1 * r2;
      return {
        id: `DYN_VD_E_${Date.now()}_${index}`,
        grade,
        term,
        topic: "Phương trình & Hệ thức Viète",
        level: "VD",
        type: "essay",
        question: `[Vận Dụng 🧠] Tìm tổng các nghiệm nguyên của phương trình: $x^2 - ${sum}x + ${prod} = 0$:`,
        options: [],
        correctAnswer: `${sum} | x=${sum}`,
        explanation: `Phương trình có hai nghiệm phân biệt là $x_1 = ${r1}, x_2 = ${r2}$. Tổng các nghiệm là $x_1 + x_2 = ${sum}$.`
      };
    }
  },

  /**
   * Sinh bộ đề thi hoàn chỉnh theo cấu hình ma trận, Kỳ thi, Mức độ tự luận & Hình vẽ
   */
  generateExam(config = {}) {
    const {
      grade = '10',
      term = 'GK1',
      topic = 'all',
      mcqCount = 10,
      essayCount = 2,
      essayLevel = 'VD',
      timeLimit = 45,
      title = ''
    } = config;

    let pool = MATH_QUESTION_BANK.filter(q => {
      const matchGrade = grade === 'all' || q.grade.toString() === grade.toString();
      const matchTerm = term === 'all' || q.term === term;
      const matchTopic = topic === 'all' || q.topic.toLowerCase().includes(topic.toLowerCase());
      return matchGrade && matchTerm && matchTopic;
    });

    if (pool.length < (mcqCount + essayCount)) {
      pool = MATH_QUESTION_BANK.filter(q => grade === 'all' || q.grade.toString() === grade.toString());
    }

    if (pool.length < (mcqCount + essayCount)) {
      pool = [...MATH_QUESTION_BANK];
    }

    const mcqPool = pool.filter(q => q.type === 'mcq');
    
    // Filter Essay pool by Cognitive Level (VDC, VD, TH, all)
    let essayPool = pool.filter(q => {
      if (q.type !== 'essay') return false;
      if (essayLevel === 'all') return true;
      return q.level === essayLevel;
    });

    if (!essayPool.length) {
      essayPool = MATH_QUESTION_BANK.filter(q => q.type === 'essay' && (essayLevel === 'all' || q.level === essayLevel));
    }
    if (!essayPool.length) {
      essayPool = pool.filter(q => q.type === 'essay');
    }

    // Shuffle & Pick MCQ
    const shuffledMcq = [...mcqPool].sort(() => 0.5 - Math.random());
    const selectedMcq = shuffledMcq.slice(0, mcqCount);

    // If still missing MCQ, dynamically generate
    while (selectedMcq.length < mcqCount) {
      const dynQ = this.generateRandomDynamicQuestion(grade === 'all' ? 10 : (grade === 'TS10' ? 'TS10' : parseInt(grade, 10)), term, selectedMcq.length + 1);
      selectedMcq.push(dynQ);
    }

    // Shuffle & Pick Essay
    const shuffledEssay = [...essayPool].sort(() => 0.5 - Math.random());
    const selectedEssay = shuffledEssay.slice(0, essayCount);

    while (selectedEssay.length < essayCount) {
      const dynE = this.generateRandomDynamicEssay(grade === 'all' ? 10 : (grade === 'TS10' ? 'TS10' : parseInt(grade, 10)), term, essayLevel, selectedEssay.length + 1);
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
        level: q.level || 'TH',
        correct: shuffledQ.correctAnswer,
        score: mcqScore,
        content: shuffledQ.question,
        diagram: shuffledQ.diagram || null,
        options: shuffledQ.options,
        explanation: shuffledQ.explanation
      });
    });

    selectedEssay.forEach((q, idx) => {
      answerKeys.push({
        num: selectedMcq.length + idx + 1,
        type: 'essay',
        level: q.level || essayLevel || 'VD',
        correct: q.correctAnswer || '12 | x=12',
        score: essayScore,
        content: q.question,
        diagram: q.diagram || null,
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

    const levelLabels = {
      VDC: "Vận Dụng Cao 🔥",
      VD: "Vận Dụng 🧠",
      TH: "Thông Hiểu 💡",
      all: "Đa Dạng Chuẩn Ma Trận"
    };

    const gradeLabel = grade === 'TS10' ? 'Ôn Thi Vào 10' : (grade === 'all' ? 'Tổng Hợp' : `Lớp ${grade}`);
    const termLabel = termLabels[term] || 'Chuẩn Ma Trận';
    const examTitle = title || `Đề Kiểm Tra ${termLabel} — Môn Toán ${gradeLabel} (${levelLabels[essayLevel] || 'Chuẩn'})`;

    // Generate formatted HTML text representation of the exam
    const examHtml = this.renderExamToHtml(examTitle, answerKeys, timeLimit, termLabel);

    return {
      title: examTitle,
      term,
      essayLevel,
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
    .level-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 6px;
    }
    .level-vdc { background: #fee2e2; color: #b91c1c; }
    .level-vd { background: #fef3c7; color: #b45309; }
    .level-th { background: #e0f2fe; color: #0369a1; }
    .level-nb { background: #f1f5f9; color: #475569; }
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
  ${mcqItems.map(q => {
    const lvlClass = q.level === 'VDC' ? 'level-vdc' : (q.level === 'VD' ? 'level-vd' : (q.level === 'TH' ? 'level-th' : 'level-nb'));
    return `
    <div class="q-card">
      <div class="q-header">
        <span class="q-num">Câu ${q.num}:</span>
        <span>${q.content || 'Đọc kỹ câu hỏi và chọn phương án đúng:'}</span>
        ${q.level ? `<span class="level-badge ${lvlClass}">[${q.level}]</span>` : ''}
      </div>
      ${q.diagram ? q.diagram : ''}
      ${q.options && q.options.length ? `
        <div class="opts-grid">
          ${q.options.map((opt, i) => `
            <div class="opt-item"><span class="opt-lbl">${['A', 'B', 'C', 'D'][i]}.</span> <span>${opt}</span></div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;}).join('')}

  ${essayItems.length ? `
    <div class="section-title" style="background:#fffbeb;border-color:#f59e0b;color:#b45309;">✍️ PHẦN II. TỰ LUẬN ĐIỀN ĐÁP SỐ TOÁN HỌC (${essayItems.length} CÂU)</div>
    ${essayItems.map(q => {
      const lvlClass = q.level === 'VDC' ? 'level-vdc' : 'level-vd';
      return `
      <div class="q-card" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
        <div class="q-header">
          <span class="q-num" style="color:#d97706;">Câu ${q.num}:</span>
          <span>${q.content || 'Giải và điền đáp số chuẩn vào phiếu:'}</span>
          ${q.level ? `<span class="level-badge ${lvlClass}">[${q.level === 'VDC' ? 'Vận dụng cao' : 'Vận dụng'}]</span>` : ''}
        </div>
        ${q.diagram ? q.diagram : ''}
      </div>
    `;}).join('')}
  ` : ''}
</body>
</html>`;
  }
};

window.MathEngine = MathEngine;
window.MathDiagrams = MathDiagrams;
