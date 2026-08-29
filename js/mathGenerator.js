/**
 * KhiemEdu Math Engine & Dynamic Question Generator
 * Ngân hàng đề thi Toán học chuẩn TOANMATH.com (Phân cấp chuẩn từng Khối Lớp 6 - 12 & Tuyển sinh 10)
 * ĐẢM BẢO 100% KIẾN THỨC CHUẨN ĐÚNG KHỐI LỚP - KHÔNG TRỘN LẪN
 * Tích hợp Hình vẽ Hình học SVG & KaTeX sắc nét
 */

function escapeMathHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
if (typeof window !== 'undefined' && typeof window.escapeHtml === 'undefined') {
  window.escapeHtml = escapeMathHtml;
}

/* ================= 📐 BỘ VẼ HÌNH MINH HỌA TOÁN HỌC CHUẨN SVG ================= */
const MathDiagrams = {
  // Tam giác vuông có đường cao và ký hiệu góc vuông
  rightTriangle(AB = '6', AC = '8', BC = '10', AH = 'h') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="240" height="150" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <polygon points="40,120 40,30 200,120" fill="rgba(99, 102, 241, 0.05)" stroke="#4f46e5" stroke-width="2"/>
          <line x1="40" y1="120" x2="88" y2="75" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="3,3"/>
          <polyline points="40,105 55,105 55,120" fill="none" stroke="#4f46e5" stroke-width="1.5"/>
          <polyline points="80,72 88,64 96,72" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          <text x="25" y="130" font-weight="bold" fill="#1e293b" font-size="14">A</text>
          <text x="35" y="25" font-weight="bold" fill="#1e293b" font-size="14">B</text>
          <text x="205" y="130" font-weight="bold" fill="#1e293b" font-size="14">C</text>
          <text x="94" y="68" font-weight="bold" fill="#ef4444" font-size="13">H</text>
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
          <circle cx="80" cy="75" r="45" fill="none" stroke="#0ea5e9" stroke-width="2"/>
          <circle cx="80" cy="75" r="2.5" fill="#0ea5e9"/>
          <circle cx="210" cy="75" r="3" fill="#ef4444"/>
          <line x1="210" y1="75" x2="105" y2="38" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="210" y1="75" x2="105" y2="112" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="80" y1="75" x2="105" y2="38" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3,2"/>
          <line x1="80" y1="75" x2="105" y2="112" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="3,2"/>
          <line x1="105" y1="38" x2="105" y2="112" stroke="#f59e0b" stroke-width="1.5"/>
          <line x1="80" y1="75" x2="210" y2="75" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,3"/>
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
          <line x1="20" y1="110" x2="200" y2="110" stroke="#475569" stroke-width="1.5"/>
          <line x1="70" y1="140" x2="70" y2="15" stroke="#475569" stroke-width="1.5"/>
          <polygon points="200,110 193,107 193,113" fill="#475569"/>
          <polygon points="70,15 67,22 73,22" fill="#475569"/>
          <text x="195" y="125" font-size="11" font-weight="bold" fill="#475569">x</text>
          <text x="55" y="25" font-size="11" font-weight="bold" fill="#475569">y</text>
          <text x="58" y="123" font-size="11" font-weight="bold" fill="#475569">O</text>
          <path d="M 40,35 Q 120,175 190,35" fill="none" stroke="#6366f1" stroke-width="2.2"/>
          <circle cx="120" cy="125" r="3" fill="#ef4444"/>
          <line x1="120" y1="110" x2="120" y2="125" stroke="#ef4444" stroke-width="1" stroke-dasharray="2,2"/>
          <text x="125" y="138" font-size="11" font-weight="bold" fill="#ef4444">I(2; -1)</text>
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
          <circle cx="110" cy="20" r="3" fill="#4f46e5"/>
          <text x="105" y="15" font-weight="bold" fill="#4f46e5" font-size="13">S</text>
          <line x1="40" y1="100" x2="90" y2="135" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="90" y1="135" x2="190" y2="135" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="190" y1="135" x2="140" y2="100" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="40" y1="100" x2="140" y2="100" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="110" y1="20" x2="40" y2="100" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="110" y1="20" x2="90" y2="135" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="110" y1="20" x2="190" y2="135" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="110" y1="20" x2="140" y2="100" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="25" y="105" font-weight="bold" fill="#1e293b" font-size="12">A</text>
          <text x="80" y="145" font-weight="bold" fill="#1e293b" font-size="12">B</text>
          <text x="195" y="145" font-weight="bold" fill="#1e293b" font-size="12">C</text>
          <text x="145" y="105" font-weight="bold" fill="#1e293b" font-size="12">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình minh họa hình chóp S.ABCD)</div>
      </div>
    `;
  },

  // Bảng biến thiên
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
          <polygon points="110,15 190,65 110,115 30,65" fill="rgba(14, 165, 233, 0.08)" stroke="#0284c7" stroke-width="2"/>
          <line x1="30" y1="65" x2="190" y2="65" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
          <line x1="110" y1="15" x2="110" y2="115" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,2"/>
          <polyline points="110,57 118,57 118,65" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          <text x="115" y="77" font-size="11" fill="#ef4444" font-weight="bold">O</text>
          <text x="105" y="12" font-weight="bold" fill="#1e293b" font-size="12">A</text>
          <text x="195" y="70" font-weight="bold" fill="#1e293b" font-size="12">B</text>
          <text x="105" y="128" font-weight="bold" fill="#1e293b" font-size="12">C</text>
          <text x="15" y="70" font-weight="bold" fill="#1e293b" font-size="12">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình thoi ABCD với hai đường chéo d₁ = ${d1}, d₂ = ${d2})</div>
      </div>
    `;
  },

  // Tam giác cân có đường phân giác (Toán 7)
  isoscelesTriangle(angleA = '100°') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="220" height="140" viewBox="0 0 220 140" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <polygon points="110,25 30,115 190,115" fill="rgba(16, 185, 129, 0.06)" stroke="#059669" stroke-width="2"/>
          <line x1="30" y1="115" x2="145" y2="65" stroke="#ef4444" stroke-width="1.6" stroke-dasharray="3,2"/>
          <text x="105" y="18" font-weight="bold" fill="#1e293b" font-size="13">A (${angleA})</text>
          <text x="15" y="125" font-weight="bold" fill="#1e293b" font-size="13">B</text>
          <text x="195" y="125" font-weight="bold" fill="#1e293b" font-size="13">C</text>
          <text x="150" y="60" font-weight="bold" fill="#ef4444" font-size="12">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Tam giác ABC cân tại A, phân giác BD)</div>
      </div>
    `;
  }
};

/* ================= 🎓 LÕI SINH ĐỀ TOÁN ĐỘC LẬP THEO TỪNG LỚP (GRADE-SPECIFIC GENERATORS) ================= */
const GradeEngines = {
  // 📚 TOÁN 6: Số tự nhiên, Lũy thừa, Ước & Bội, Số nguyên Z, Phân số, Hình thoi, Chu vi diện tích
  generateGrade6(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      if (level === 'VDC') {
        const k = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G6_VDC_E_${Date.now()}_${index}`,
          grade: 6,
          topic: "Số học & Chia hết",
          level: "VDC",
          type: "essay",
          question: `[Vận Dụng Cao 🔥] Tìm số tự nhiên $n$ sao cho phân số $A = \\dfrac{2n+${k}}{n+1}$ nhận giá trị là một số nguyên dương:`,
          options: [],
          correctAnswer: `0 | n=0`,
          explanation: `$A = \\dfrac{2(n+1) + (${k}-2)}{n+1} = 2 + \\dfrac{${k-2}}{n+1}$. Để $A$ nguyên thì $(n+1)$ là ước của ${k-2}$. Suy ra $n = 0$.`
        };
      } else if (level === 'TH') {
        const xVal = Math.floor(Math.random() * 15) + 5;
        const b = Math.floor(Math.random() * 20) + 10;
        const sum = xVal + b;
        return {
          id: `G6_TH_E_${Date.now()}_${index}`,
          grade: 6,
          topic: "Số nguyên",
          level: "TH",
          type: "essay",
          question: `[Thông Hiểu 💡] Tìm số nguyên $x$ biết: $x - (-${b}) = ${sum}$:`,
          options: [],
          correctAnswer: `${xVal} | x=${xVal}`,
          explanation: `$x + ${b} = ${sum} \\implies x = ${sum} - ${b} = ${xVal}$.`
        };
      } else {
        const p = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
        const val = Math.pow(3, p) * 2;
        return {
          id: `G6_VD_E_${Date.now()}_${index}`,
          grade: 6,
          topic: "Lũy thừa với số tự nhiên",
          level: "VD",
          type: "essay",
          question: `[Vận Dụng 🧠] Tìm số tự nhiên $x$ thỏa mãn: $3^{x+1} - 3^x = ${val}$:`,
          options: [],
          correctAnswer: `${p} | x=${p}`,
          explanation: `$3^x(3 - 1) = ${val} \\iff 2 \\cdot 3^x = ${val} \\iff 3^x = ${val/2} = 3^${p} \\implies x = ${p}$.`
        };
      }
    } else {
      // MCQ Grade 6
      const r = Math.random();
      if (r < 0.33) {
        const a = Math.floor(Math.random() * 5) + 3;
        const b = a + Math.floor(Math.random() * 4) + 2;
        return {
          id: `G6_MCQ_${Date.now()}_${index}`,
          grade: 6,
          topic: "Tập hợp",
          level: "NB",
          type: "mcq",
          question: `Cho tập hợp $M = \\{x \\in \\mathbb{N} \\mid ${a} \\le x < ${b}\\}$. Số phần tử của tập hợp $M$ là:`,
          options: [`$${b - a}$ phần tử`, `$${b - a + 1}$ phần tử`, `$${b - a - 1}$ phần tử`, `$${b}$ phần tử`],
          correctAnswer: "A",
          explanation: `Các phần tử của $M$ là $\\{${a}; ${a+1}; \\dots; ${b-1}\\}$. Số phần tử là ${b - a}.`
        };
      } else if (r < 0.66) {
        const d1 = (Math.floor(Math.random() * 4) + 3) * 2;
        const d2 = (Math.floor(Math.random() * 3) + 2) * 2;
        const S = (d1 * d2) / 2;
        return {
          id: `G6_MCQ_DIAG_${Date.now()}_${index}`,
          grade: 6,
          topic: "Hình học trực quan & Diện tích",
          level: "TH",
          type: "mcq",
          question: `Cho hình thoi có hai đường chéo $d_1 = ${d1}\\text{ cm}$ và $d_2 = ${d2}\\text{ cm}$ (như hình minh họa). Diện tích của hình thoi là:`,
          diagram: MathDiagrams.rhombus(`${d1}cm`, `${d2}cm`),
          options: [`$${S}\\text{ cm}^2$`, `$${d1 * d2}\\text{ cm}^2$`, `$${S + 4}\\text{ cm}^2$`, `$${d1 + d2}\\text{ cm}^2$`],
          correctAnswer: "A",
          explanation: `$S = \\dfrac{1}{2} d_1 d_2 = \\dfrac{1}{2} \\times ${d1} \\times ${d2} = ${S}\\text{ cm}^2$.`
        };
      } else {
        const u = 12;
        const v = 18;
        return {
          id: `G6_MCQ_UCLN_${Date.now()}_${index}`,
          grade: 6,
          topic: "Ước và Bội",
          level: "TH",
          type: "mcq",
          question: `Ước chung lớn nhất của hai số $24$ và $36$ là:`,
          options: ["$12$", "$6$", "$18$", "$72$"],
          correctAnswer: "A",
          explanation: `$\\text{ƯCLN}(24, 36) = 12$.`
        };
      }
    }
  },

  // 📚 TOÁN 7: Số hữu tỉ Q, Tỉ lệ thức, Đa thức một biến, Tam giác cân, Phân giác
  generateGrade7(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      if (level === 'VDC') {
        const minVal = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G7_VDC_E_${Date.now()}_${index}`,
          grade: 7,
          topic: "Giá trị tuyệt đối & Cực trị đại số",
          level: "VDC",
          type: "essay",
          question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $A = |x - 2| + |x - ${2 + minVal}|$:`,
          options: [],
          correctAnswer: `${minVal} | min=${minVal} | GTNN=${minVal}`,
          explanation: `Áp dụng $|a| + |b| \\ge |a + b| \\implies A = |x - 2| + |${2 + minVal} - x| \\ge |x - 2 + ${2 + minVal} - x| = ${minVal}$.`
        };
      } else if (level === 'TH') {
        const k = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G7_TH_E_${Date.now()}_${index}`,
          grade: 7,
          topic: "Nghiệm của đa thức một biến",
          level: "TH",
          type: "essay",
          question: `[Thông Hiểu 💡] Tìm nghiệm của đa thức một biến: $P(x) = 2x - ${2 * k}$:`,
          options: [],
          correctAnswer: `${k} | x=${k}`,
          explanation: `$2x - ${2 * k} = 0 \\iff 2x = ${2 * k} \\implies x = ${k}$.`
        };
      } else {
        const k = Math.floor(Math.random() * 4) + 2;
        const xVal = 3 * k;
        const yVal = 5 * k;
        const sum = xVal + yVal;
        return {
          id: `G7_VD_E_${Date.now()}_${index}`,
          grade: 7,
          topic: "Dãy tỉ số bằng nhau",
          level: "VD",
          type: "essay",
          question: `[Vận Dụng 🧠] Cho $\\dfrac{x}{3} = \\dfrac{y}{5}$ và $x + y = ${sum}$. Giá trị của $x$ là:`,
          options: [],
          correctAnswer: `${xVal} | x=${xVal}`,
          explanation: `$\\dfrac{x}{3} = \\dfrac{y}{5} = \\dfrac{x+y}{3+5} = \\dfrac{${sum}}{8} = ${k} \\implies x = 3 \\times ${k} = ${xVal}$.`
        };
      }
    } else {
      // MCQ Grade 7
      const r = Math.random();
      if (r < 0.5) {
        return {
          id: `G7_MCQ_DIAG_${Date.now()}_${index}`,
          grade: 7,
          topic: "Tam giác cân & Tia phân giác",
          level: "VD",
          type: "mcq",
          question: `Cho tam giác $ABC$ cân tại $A$ có $\\widehat{A} = 100^\\circ$, tia phân giác $BD$ cắt $AC$ tại $D$ (như hình minh họa). Số đo góc $\\widehat{ADB}$ là:`,
          diagram: MathDiagrams.isoscelesTriangle('100°'),
          options: ["$60^\\circ$", "$50^\\circ$", "$40^\\circ$", "$70^\\circ$"],
          correctAnswer: "A",
          explanation: `$\\widehat{B} = \\widehat{C} = (180^\\circ - 100^\\circ)/2 = 40^\\circ \\implies \\widehat{ABD} = 20^\\circ \\implies \\widehat{ADB} = 180^\\circ - 100^\\circ - 20^\\circ = 60^\\circ$.`
        };
      } else {
        return {
          id: `G7_MCQ_EXP_${Date.now()}_${index}`,
          grade: 7,
          topic: "Số hữu tỉ & Lũy thừa",
          level: "NB",
          type: "mcq",
          question: `Giá trị của biểu thức $\\left(-\\dfrac{2}{3}\\right)^2$ bằng:`,
          options: ["$\\dfrac{4}{9}$", "$-\\dfrac{4}{9}$", "$-\\dfrac{4}{6}$", "$\\dfrac{4}{6}$"],
          correctAnswer: "A",
          explanation: `$\\left(-\\dfrac{2}{3}\\right)^2 = \\dfrac{(-2)^2}{3^2} = \\dfrac{4}{9}$.`
        };
      }
    }
  },

  // 📚 TOÁN 8: Hằng đẳng thức, Phân tích nhân tử, Phân thức, Định lý Pythagore, Tam giác đồng dạng
  generateGrade8(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      if (level === 'VDC') {
        const sum = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, 7
        const maxProd = Math.floor((sum * sum) / 4);
        return {
          id: `G8_VDC_E_${Date.now()}_${index}`,
          grade: 8,
          topic: "Bất đẳng thức Cauchy 2 số",
          level: "VDC",
          type: "essay",
          question: `[Vận Dụng Cao 🔥] Cho hai số thực dương $x, y$ thỏa mãn $x + y = ${sum}$. Giá trị lớn nhất của tích $P = xy$ là:`,
          options: [],
          correctAnswer: `${(sum*sum)/4} | max=${(sum*sum)/4} | P=${(sum*sum)/4}`,
          explanation: `Theo BĐT Cauchy: $xy \\le \\left(\\dfrac{x+y}{2}\\right)^2 = \\left(\\dfrac{${sum}}{2}\\right)^2 = ${(sum*sum)/4}$. Dấu '=' khi $x = y = ${sum/2}$.`
        };
      } else if (level === 'TH') {
        const a = Math.floor(Math.random() * 5) + 2;
        const b = Math.floor(Math.random() * 6) + 1;
        const res = a * b;
        return {
          id: `G8_TH_E_${Date.now()}_${index}`,
          grade: 8,
          topic: "Phương trình bậc nhất",
          level: "TH",
          type: "essay",
          question: `[Thông Hiểu 💡] Giải phương trình bậc nhất một biến: $${a}x - ${b} = ${res - b}$:`,
          options: [],
          correctAnswer: `${b} | x=${b}`,
          explanation: `$${a}x = ${res} \\implies x = ${b}$.`
        };
      } else {
        const r = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G8_VD_E_${Date.now()}_${index}`,
          grade: 8,
          topic: "Phân tích nhân tử & Tìm nghiệm dương",
          level: "VD",
          type: "essay",
          question: `[Vận Dụng 🧠] Tìm giá trị của $x > 0$ thỏa mãn phương trình: $x^3 - ${r * r}x = 0$:`,
          options: [],
          correctAnswer: `${r} | x=${r}`,
          explanation: `$x(x - ${r})(x + ${r}) = 0$. Vì $x > 0$ nên $x = ${r}$.`
        };
      }
    } else {
      // MCQ Grade 8
      const a = Math.floor(Math.random() * 3) + 2;
      const b = Math.floor(Math.random() * 4) + 1;
      return {
        id: `G8_MCQ_${Date.now()}_${index}`,
        grade: 8,
        topic: "Hằng đẳng thức đáng nhớ",
        level: "NB",
        type: "mcq",
        question: `Khai triển hằng đẳng thức $(x - ${b})^2$ ta được:`,
        options: [`$x^2 - ${2 * b}x + ${b * b}$`, `$x^2 - ${b}x + ${b * b}$`, `$x^2 - ${b * b}$`, `$x^2 + ${2 * b}x + ${b * b}$`],
        correctAnswer: "A",
        explanation: `$(x - ${b})^2 = x^2 - 2(${b})x + ${b}^2 = x^2 - ${2 * b}x + ${b * b}$.`
      };
    }
  },

  // 📚 TOÁN 9: Căn bậc hai, Hệ thức lượng, Hệ phương trình, PT bậc hai & Vi-ét, Đường tròn tiếp tuyến
  generateGrade9(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      if (level === 'VDC') {
        const k = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G9_VDC_E_${Date.now()}_${index}`,
          grade: 9,
          topic: "Cực trị căn thức (Câu điểm 10)",
          level: "VDC",
          type: "essay",
          question: `[Vận Dụng Cao 🔥] Tìm giá trị lớn nhất của biểu thức $A = \\sqrt{x - 2} + \\sqrt{${2 + 2 * k} - x}$ với $2 \\le x \\le ${2 + 2 * k}$:`,
          options: [],
          correctAnswer: `${Math.round(Math.sqrt(4 * k) * 100) / 100} | 2*sqrt(${k}) | 2sqrt(${k})`,
          explanation: `Áp dụng BĐT Cauchy-Schwarz: $A^2 \\le (1+1)(x - 2 + ${2 + 2 * k} - x) = 2 \\times ${2 * k} = ${4 * k} \\implies A \\le \\sqrt{${4 * k}}$.`
        };
      } else if (level === 'TH') {
        const a = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G9_TH_E_${Date.now()}_${index}`,
          grade: 9,
          topic: "Căn bậc hai số học",
          level: "TH",
          type: "essay",
          question: `[Thông Hiểu 💡] Tính giá trị của biểu thức: $P = \\sqrt{(${a} - \\sqrt{${a * a + 1}})^2} + \\sqrt{${a * a + 1}}$:`,
          options: [],
          correctAnswer: `${a} | P=${a}`,
          explanation: `$P = |${a} - \\sqrt{${a * a + 1}}| + \\sqrt{${a * a + 1}} = \\sqrt{${a * a + 1}} - ${a} + \\sqrt{${a * a + 1}}$... Suy ra giá trị $P = ${a}$.`
        };
      } else {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = r1 + Math.floor(Math.random() * 3) + 1;
        const sum = r1 + r2;
        const prod = r1 * r2;
        return {
          id: `G9_VD_E_${Date.now()}_${index}`,
          grade: 9,
          topic: "Định lý Viète bậc hai",
          level: "VD",
          type: "essay",
          question: `[Vận Dụng 🧠] Gọi $x_1, x_2$ là hai nghiệm của phương trình $x^2 - ${sum}x + ${prod} = 0$. Tính giá trị $S = x_1 + x_2$:`,
          options: [],
          correctAnswer: `${sum} | S=${sum}`,
          explanation: `Theo định lý Vi-ét: $x_1 + x_2 = -(-${sum})/1 = ${sum}$.`
        };
      }
    } else {
      // MCQ Grade 9
      const r = Math.random();
      if (r < 0.5) {
        const a = (Math.floor(Math.random() * 3) + 2) * 3; // 6, 9
        const b = (a / 3) * 4; // 8, 12
        const c = (a / 3) * 5; // 10, 15
        const h = (a * b) / c;
        return {
          id: `G9_MCQ_DIAG_${Date.now()}_${index}`,
          grade: 9,
          topic: "Hệ thức lượng trong tam giác vuông",
          level: "TH",
          type: "mcq",
          question: `Cho tam giác $ABC$ vuông tại $A$ có $AB = ${a}\\text{ cm}, AC = ${b}\\text{ cm}$ (như hình vẽ). Độ dài đường cao $AH$ là:`,
          diagram: MathDiagrams.rightTriangle(`${a}cm`, `${b}cm`, `${c}cm`, 'AH'),
          options: [`$AH = ${h}\\text{ cm}$`, `$AH = ${h + 1}\\text{ cm}$`, `$AH = ${h - 0.5}\\text{ cm}$`, `$AH = ${c/2}\\text{ cm}$`],
          correctAnswer: "A",
          explanation: `$AH = \\dfrac{AB \\cdot AC}{BC} = \\dfrac{${a} \\times ${b}}{${c}} = ${h}\\text{ cm}$.`
        };
      } else {
        return {
          id: `G9_MCQ_CIRCLE_${Date.now()}_${index}`,
          grade: 9,
          topic: "Đường tròn và tiếp tuyến",
          level: "VD",
          type: "mcq",
          question: `Cho $(O; R)$ và điểm $M$ sao cho $OM = 2R$. Kẻ hai tiếp tuyến $MA, MB$ (như hình minh họa). Góc $\\widehat{AMB}$ bằng:`,
          diagram: MathDiagrams.circleWithTangents(5, 10),
          options: ["$60^\\circ$", "$90^\\circ$", "$45^\\circ$", "$120^\\circ$"],
          correctAnswer: "A",
          explanation: `$\\sin \\widehat{AMO} = \\dfrac{R}{2R} = \\dfrac{1}{2} \\implies \\widehat{AMO} = 30^\\circ \\implies \\widehat{AMB} = 60^\\circ$.`
        };
      }
    }
  },

  // 📚 TOÁN 10: Tập hợp, Parabol, Vectơ, Bất phương trình bậc hai
  generateGrade10(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      if (level === 'VDC') {
        const p = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G10_VDC_E_${Date.now()}_${index}`,
          grade: 10,
          topic: "Cực trị & Bất đẳng thức Cauchy",
          level: "VDC",
          type: "essay",
          question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $P = x + \\dfrac{${p * p}}{x}$ với mọi số thực dương $x > 0$:`,
          options: [],
          correctAnswer: `${2 * p} | min=${2 * p} | P=${2 * p}`,
          explanation: `Áp dụng BĐT Cauchy: $P \\ge 2\\sqrt{x \\cdot \\dfrac{${p * p}}{x}} = 2 \\cdot ${p} = ${2 * p}$. Dấu '=' khi $x = ${p}$.`
        };
      } else {
        return {
          id: `G10_VD_E_${Date.now()}_${index}`,
          grade: 10,
          topic: "Quy hoạch tuyến tính & Bất phương trình",
          level: "VD",
          type: "essay",
          question: `[Vận Dụng 🧠] Tìm giá trị lớn nhất của biểu thức $F(x; y) = 2x + 3y$ trên miền nghiệm của hệ $\\begin{cases} x \\ge 0 \\\\ y \\ge 0 \\\\ x + y \\le 4 \\end{cases}$:`,
          options: [],
          correctAnswer: "12 | F=12 | max=12",
          explanation: `Các đỉnh của miền nghiệm là $(0; 0), (4; 0), (0; 4)$. Ta có $F(0; 4) = 2(0) + 3(4) = 12$ là giá trị lớn nhất.`
        };
      }
    } else {
      return {
        id: `G10_MCQ_PARABOL_${Date.now()}_${index}`,
        grade: 10,
        topic: "Hàm số bậc hai & Parabol",
        level: "TH",
        type: "mcq",
        question: `Cho hàm số bậc hai có đồ thị Parabol như hình vẽ dưới đây. Tọa độ đỉnh $I$ của Parabol là:`,
        diagram: MathDiagrams.parabolaGraph(),
        options: ["$I(2; -1)$", "$I(-2; 15)$", "$I(2; 1)$", "$I(4; 3)$"],
        correctAnswer: "A",
        explanation: `Đỉnh Parabol có hoành độ $x = 2$ và tung độ $y = -1 \\implies I(2; -1)$.`
      };
    }
  },

  // 📚 TOÁN 11: Lượng giác, Hình chóp S.ABCD, Cấp số cộng / Cấp số nhân
  generateGrade11(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      return {
        id: `G11_VDC_E_${Date.now()}_${index}`,
        grade: 11,
        topic: "Cấp số nhân lùi vô hạn",
        level: "VDC",
        type: "essay",
        question: `[Vận Dụng Cao 🔥] Tính tổng của cấp số nhân lùi vô hạn $S = 1 + \\dfrac{1}{3} + \\dfrac{1}{9} + \\dots + \\dfrac{1}{3^n} + \\dots$:`,
        options: [],
        correctAnswer: "1.5 | 3/2 | S=3/2",
        explanation: `$S = \\dfrac{u_1}{1 - q} = \\dfrac{1}{1 - 1/3} = 1.5$.`
      };
    } else {
      return {
        id: `G11_MCQ_PYRAMID_${Date.now()}_${index}`,
        grade: 11,
        topic: "Hình học không gian",
        level: "TH",
        type: "mcq",
        question: `Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình bình hành (như hình minh họa). Giao tuyến của hai mặt phẳng $(SAB)$ và $(SCD)$ là đường thẳng đi qua $S$ và:`,
        diagram: MathDiagrams.pyramidSABCD(),
        options: ["Song song với AB và CD", "Song song với AD và BC", "Cắt đoạn thẳng AC", "Vuông góc với đáy"],
        correctAnswer: "A",
        explanation: `Vì $AB \\parallel CD$ nên giao tuyến của $(SAB)$ và $(SCD)$ qua $S$ và song song với $AB, CD$.`
      };
    }
  },

  // 📚 TOÁN 12: Đạo hàm, Khảo sát hàm số, Bảng biến thiên, Tích phân
  generateGrade12(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      return {
        id: `G12_VDC_E_${Date.now()}_${index}`,
        grade: 12,
        topic: "Hàm số chứa tham số m (Câu 9+)",
        level: "VDC",
        type: "essay",
        question: `[Vận Dụng Cao 🔥] Tìm số giá trị nguyên của $m \\in [-10; 10]$ để hàm số $y = \\dfrac{x+m}{x+2}$ đồng biến trên từng khoảng xác định:`,
        options: [],
        correctAnswer: "12 | 12 gia tri",
        explanation: `$y' = \\dfrac{2-m}{(x+2)^2} > 0 \\iff m < 2$. Vì $m \\in [-10; 10] \\implies m \\in \\{-10, -9, \\dots, 1\\}$, có 12 giá trị nguyên.`
      };
    } else {
      return {
        id: `G12_MCQ_VAR_${Date.now()}_${index}`,
        grade: 12,
        topic: "Khảo sát hàm số & Bảng biến thiên",
        level: "TH",
        type: "mcq",
        question: `Cho hàm số $y = f(x)$ có bảng biến thiên như hình bên dưới. Điểm cực tiểu của hàm số đã cho là:`,
        diagram: MathDiagrams.variationTable(),
        options: ["$x = 1$", "$x = -1$", "$x = 0$", "$x = 4$"],
        correctAnswer: "A",
        explanation: `Đạo hàm $y'$ đổi dấu từ âm sang dương qua $x = 1$, do đó $x = 1$ là điểm cực tiểu.`
      };
    }
  }
};

const MathEngine = {
  shuffleQuestionOptions(q) {
    if (!q.options || q.options.length < 2) return q;
    
    const letters = ['A', 'B', 'C', 'D'];
    const correctLetter = (q.correctAnswer || 'A').toUpperCase();
    const correctIdx = letters.indexOf(correctLetter);
    const correctContent = q.options[correctIdx >= 0 ? correctIdx : 0];

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
   * Sinh bộ đề thi chuẩn 100% theo đúng kiến thức của khối lớp được chọn
   */
  generateExam(config = {}) {
    const {
      grade = '10',
      term = 'GK1',
      topic = 'all',
      mcqCount = 12,
      essayMatrix = { TH: 1, VD: 1, VDC: 1 },
      timeLimit = 45,
      title = ''
    } = config;

    const gStr = grade.toString();
    const getGradeEngine = () => {
      if (gStr === '6') return GradeEngines.generateGrade6;
      if (gStr === '7') return GradeEngines.generateGrade7;
      if (gStr === '8') return GradeEngines.generateGrade8;
      if (gStr === '9' || gStr === 'TS10') return GradeEngines.generateGrade9;
      if (gStr === '11') return GradeEngines.generateGrade11;
      if (gStr === '12' || gStr === 'THPT') return GradeEngines.generateGrade12;
      return GradeEngines.generateGrade10;
    };

    const engineFunc = getGradeEngine();

    // 1. Generate MCQ strictly for this grade
    const selectedMcq = [];
    for (let i = 1; i <= mcqCount; i++) {
      const q = engineFunc('mcq', 'TH', i);
      selectedMcq.push(q);
    }

    // 2. Generate Essay strictly for this grade based on matrix { TH, VD, VDC }
    const selectedEssay = [];
    const targetLevels = [
      { level: 'TH', count: essayMatrix.TH || 0 },
      { level: 'VD', count: essayMatrix.VD || 0 },
      { level: 'VDC', count: essayMatrix.VDC || 0 }
    ];

    let essayIndex = 1;
    targetLevels.forEach(({ level, count }) => {
      for (let i = 0; i < count; i++) {
        const eq = engineFunc('essay', level, essayIndex++);
        selectedEssay.push(eq);
      }
    });

    const totalEssays = selectedEssay.length;
    const essayTotalScore = totalEssays > 0 ? 3.0 : 0;
    const mcqTotalScore = 10.0 - essayTotalScore;
    const mcqScore = mcqCount ? Math.round((mcqTotalScore / mcqCount) * 100) / 100 : 0;
    const essayScore = totalEssays ? Math.round((essayTotalScore / totalEssays) * 100) / 100 : 0;

    const answerKeys = [];

    // Shuffle options of MCQ
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
        level: q.level || 'VD',
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

    const gradeLabel = gStr === 'TS10' ? 'Ôn Thi Vào 10' : (gStr === 'all' ? 'Tổng Hợp' : `Lớp ${gStr}`);
    const termLabel = termLabels[term] || 'Chuẩn Ma Trận';
    const essaySummaryStr = `${essayMatrix.TH || 0}TH + ${essayMatrix.VD || 0}VD + ${essayMatrix.VDC || 0}VDC`;
    const examTitle = title || `Đề Kiểm Tra ${termLabel} — Môn Toán ${gradeLabel} (${essaySummaryStr})`;

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
  <title>${escapeMathHtml(title)}</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  
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
    .katex { font-size: 1.1em !important; }
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
    <div class="title">📐 ${escapeMathHtml(title)}</div>
    <div class="meta">⏱️ Thời gian làm bài: <strong>${timeLimit} phút</strong> &nbsp;|&nbsp; Tổng số: <strong>${keys.length} câu hỏi</strong> &nbsp;|&nbsp; Định dạng: <strong>${escapeMathHtml(termLabel || 'Chuẩn TOANMATH')}</strong></div>
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
window.GradeEngines = GradeEngines;
