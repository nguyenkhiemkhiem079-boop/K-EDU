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
      const templates = [
        // VDC
        () => {
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
        },
        // TH
        () => {
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
        },
        // VD
        () => {
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
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[1]();
      return templates[2]();
    } else {
      // MCQ Grade 6
      const templates = [
        () => {
          const a = Math.floor(Math.random() * 5) + 3;
          const b = a + Math.floor(Math.random() * 5) + 2;
          return {
            id: `G6_MCQ_SET_${Date.now()}_${index}`,
            grade: 6,
            topic: "Tập hợp",
            level: "NB",
            type: "mcq",
            question: `Cho tập hợp $M = \\{x \\in \\mathbb{N} \\mid ${a} \\le x < ${b}\\}$. Số phần tử của tập hợp $M$ là:`,
            options: [`$${b - a}$ phần tử`, `$${b - a + 1}$ phần tử`, `$${b - a - 1}$ phần tử`, `$${b}$ phần tử`],
            correctAnswer: "A",
            explanation: `Các phần tử của $M$ là $\\{${a}; ${a+1}; \\dots; ${b-1}\\}$. Số phần tử là ${b - a}.`
          };
        },
        () => {
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
        },
        () => {
          const k = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const u = 12 * k;
          const v = 18 * k;
          const ucln = 6 * k;
          return {
            id: `G6_MCQ_UCLN_${Date.now()}_${index}`,
            grade: 6,
            topic: "Ước và Bội",
            level: "TH",
            type: "mcq",
            question: `Ước chung lớn nhất của hai số $${u}$ và $${v}$ là:`,
            options: [`$${ucln}$`, `$${ucln * 2}$`, `$${ucln / 2}$`, `$${u * v}$`],
            correctAnswer: "A",
            explanation: `$\\text{ƯCLN}(${u}, ${v}) = ${ucln}$.`
          };
        },
        () => {
          const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23];
          const composite = [4, 9, 15, 21];
          const p = primes[Math.floor(Math.random() * primes.length)];
          const c1 = composite[0];
          const c2 = composite[1];
          const c3 = composite[2];
          return {
            id: `G6_MCQ_PRIME_${Date.now()}_${index}`,
            grade: 6,
            topic: "Số nguyên tố",
            level: "NB",
            type: "mcq",
            question: `Trong các số sau, số nào là số nguyên tố?`,
            options: [`$${p}$`, `$${c1}$`, `$${c2}$`, `$${c3}$`],
            correctAnswer: "A",
            explanation: `$${p}$ chỉ chia hết cho 1 và chính nó nên là số nguyên tố.`
          };
        },
        () => {
          const start = Math.floor(Math.random() * 10) + 1;
          const step = Math.floor(Math.random() * 5) + 3;
          const next = start + 3 * step;
          return {
            id: `G6_MCQ_SEQ_${Date.now()}_${index}`,
            grade: 6,
            topic: "Quy luật số tự nhiên",
            level: "VD",
            type: "mcq",
            question: `Cho dãy số tự nhiên: $${start}; ${start + step}; ${start + 2 * step}; \\dots$. Số hạng tiếp theo của dãy là:`,
            options: [`$${next}$`, `$${next + step}$`, `$${next + 1}$`, `$${next - 2}$`],
            correctAnswer: "A",
            explanation: `Dãy số cộng dồn cách đều $${step}$ đơn vị. Số hạng tiếp theo là $${start + 2 * step} + ${step} = ${next}$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 7: Số hữu tỉ Q, Tỉ lệ thức, Đa thức một biến, Tam giác cân, Phân giác
  generateGrade7(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
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
        },
        // TH
        () => {
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
        },
        // VD
        () => {
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
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[1]();
      return templates[2]();
    } else {
      // MCQ Grade 7
      const templates = [
        () => {
          const angle = 100 - (Math.floor(Math.random() * 5) * 10); // 100, 90, 80...
          const res = (180 - angle) / 2 + angle / 2; // angle_b / 2 + angle_a
          const ans = 180 - res;
          return {
            id: `G7_MCQ_DIAG_${Date.now()}_${index}`,
            grade: 7,
            topic: "Tam giác cân & Tia phân giác",
            level: "VD",
            type: "mcq",
            question: `Cho tam giác $ABC$ cân tại $A$ có $\\widehat{A} = ${angle}^\\circ$, tia phân giác $BD$ cắt $AC$ tại $D$ (như hình minh họa). Số đo góc $\\widehat{ADB}$ là:`,
            diagram: MathDiagrams.isoscelesTriangle(`${angle}°`),
            options: [`$${ans}^\\circ$`, `$${ans - 10}^\\circ$`, `$${ans + 10}^\\circ$`, `$${180 - angle}^\\circ$`],
            correctAnswer: "A",
            explanation: `$\\widehat{B} = (180^\\circ - ${angle}^\\circ)/2 = ${90 - angle/2}^\\circ \\implies \\widehat{ABD} = ${45 - angle/4}^\\circ$. Vậy $\\widehat{ADB} = 180^\\circ - ${angle}^\\circ - ${45 - angle/4}^\\circ = ${ans}^\\circ$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const b = a + 1;
          return {
            id: `G7_MCQ_EXP_${Date.now()}_${index}`,
            grade: 7,
            topic: "Số hữu tỉ & Lũy thừa",
            level: "NB",
            type: "mcq",
            question: `Giá trị của biểu thức $\\left(-\\dfrac{${a}}{${b}}\\right)^2$ bằng:`,
            options: [`$\\dfrac{${a*a}}{${b*b}}$`, `$-\\dfrac{${a*a}}{${b*b}}$`, `$-\\dfrac{${a*2}}{${b*2}}$`, `$\\dfrac{${a*2}}{${b*2}}$`],
            correctAnswer: "A",
            explanation: `$\\left(-\\dfrac{${a}}{${b}}\\right)^2 = \\dfrac{(-${a})^2}{${b}^2} = \\dfrac{${a*a}}{${b*b}}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 40) + 30; // 30-70
          const b = Math.floor(Math.random() * 40) + 30;
          const c = 180 - a - b;
          return {
            id: `G7_MCQ_ANGLES_${Date.now()}_${index}`,
            grade: 7,
            topic: "Tổng các góc trong tam giác",
            level: "NB",
            type: "mcq",
            question: `Cho tam giác $ABC$ có $\\widehat{A} = ${a}^\\circ$ và $\\widehat{B} = ${b}^\\circ$. Số đo góc $\\widehat{C}$ là:`,
            options: [`$${c}^\\circ$`, `$${c + 10}^\\circ$`, `$${c - 10}^\\circ$`, `$${180 - c}^\\circ$`],
            correctAnswer: "A",
            explanation: `Tổng ba góc bằng $180^\\circ \\implies \\widehat{C} = 180^\\circ - (${a}^\\circ + ${b}^\\circ) = ${c}^\\circ$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 4) + 2;
          const b = Math.floor(Math.random() * 6) + 1;
          const x = Math.floor(Math.random() * 3) + 2;
          const res = a * x + b;
          return {
            id: `G7_MCQ_EVAL_${Date.now()}_${index}`,
            grade: 7,
            topic: "Biểu thức đại số",
            level: "TH",
            type: "mcq",
            question: `Giá trị của biểu thức $A = ${a}x + ${b}$ tại $x = ${x}$ là:`,
            options: [`$${res}$`, `$${res - 3}$`, `$${res + 4}$`, `$${a * x}$`],
            correctAnswer: "A",
            explanation: `Thay $x = ${x}$ vào biểu thức ta có $A = ${a} \\times ${x} + ${b} = ${res}$.`
          };
        },
        () => {
          const k = Math.floor(Math.random() * 4) + 2;
          const x1 = 3;
          const y1 = 3 * k;
          const x2 = 5;
          const y2 = 5 * k;
          return {
            id: `G7_MCQ_PROP_${Date.now()}_${index}`,
            grade: 7,
            topic: "Tỉ lệ thuận",
            level: "TH",
            type: "mcq",
            question: `Biết hai đại lượng $x$ và $y$ tỉ lệ thuận với nhau và khi $x = ${x1}$ thì $y = ${y1}$. Khi $x = ${x2}$ thì giá trị của $y$ là:`,
            options: [`$${y2}$`, `$${y2 - 2}$`, `$${y2 + 3}$`, `$${k}$`],
            correctAnswer: "A",
            explanation: `Hệ số tỉ lệ $k = y/x = ${y1}/${x1} = ${k}$. Khi $x = ${x2} \\implies y = ${k} \\times ${x2} = ${y2}$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 8: Hằng đẳng thức, Phân tích nhân tử, Phân thức, Định lý Pythagore, Tam giác đồng dạng
  generateGrade8(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
          const sum = Math.floor(Math.random() * 4) + 4; // 4, 5, 6, 7
          const maxProd = (sum * sum) / 4;
          return {
            id: `G8_VDC_E_${Date.now()}_${index}`,
            grade: 8,
            topic: "Bất đẳng thức Cauchy 2 số",
            level: "VDC",
            type: "essay",
            question: `[Vận Dụng Cao 🔥] Cho hai số thực dương $x, y$ thỏa mãn $x + y = ${sum}$. Giá trị lớn nhất của tích $P = xy$ là:`,
            options: [],
            correctAnswer: `${maxProd} | max=${maxProd} | P=${maxProd}`,
            explanation: `Theo BĐT Cauchy: $xy \\le \\left(\\dfrac{x+y}{2}\\right)^2 = \\left(\\dfrac{${sum}}{2}\\right)^2 = ${maxProd}$. Dấu '=' khi $x = y = ${sum/2}$.`
          };
        },
        // TH
        () => {
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
        },
        // VD
        () => {
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
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[1]();
      return templates[2]();
    } else {
      // MCQ Grade 8
      const templates = [
        () => {
          const b = Math.floor(Math.random() * 5) + 1;
          return {
            id: `G8_MCQ_ID_${Date.now()}_${index}`,
            grade: 8,
            topic: "Hằng đẳng thức đáng nhớ",
            level: "NB",
            type: "mcq",
            question: `Khai triển hằng đẳng thức $(x - ${b})^2$ ta được:`,
            options: [`$x^2 - ${2 * b}x + ${b * b}$`, `$x^2 - ${b}x + ${b * b}$`, `$x^2 - ${b * b}$`, `$x^2 + ${2 * b}x + ${b * b}$`],
            correctAnswer: "A",
            explanation: `$(x - ${b})^2 = x^2 - 2(${b})x + ${b}^2 = x^2 - ${2 * b}x + ${b * b}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 6) + 2; // 2 to 7
          const a2 = a * a;
          return {
            id: `G8_MCQ_FACTOR_${Date.now()}_${index}`,
            grade: 8,
            topic: "Phân tích nhân tử",
            level: "NB",
            type: "mcq",
            question: `Phân tích đa thức $x^2 - ${a2}$ thành nhân tử ta được:`,
            options: [`$(x - ${a})(x + ${a})$`, `$(x - ${a})^2$`, `$(x + ${a})^2$`, `$(x - ${a2})(x + 1)$`],
            correctAnswer: "A",
            explanation: `Sử dụng hằng đẳng thức hiệu hai bình phương: $x^2 - ${a}^2 = (x - ${a})(x + ${a})$.`
          };
        },
        () => {
          const triplets = [
            { a: 3, b: 4, c: 5 },
            { a: 6, b: 8, c: 10 },
            { a: 5, b: 12, c: 13 },
            { a: 8, b: 15, c: 17 }
          ];
          const trip = triplets[Math.floor(Math.random() * triplets.length)];
          return {
            id: `G8_MCQ_PYTH_${Date.now()}_${index}`,
            grade: 8,
            topic: "Định lý Pythagore",
            level: "TH",
            type: "mcq",
            question: `Cho tam giác vuông có độ dài hai cạnh góc vuông lần lượt là $${trip.a}\\text{ cm}$ và $${trip.b}\\text{ cm}$. Độ dài cạnh huyền là:`,
            options: [`$${trip.c}\\text{ cm}$`, `$${trip.a + trip.b}\\text{ cm}$`, `$${trip.c + 2}\\text{ cm}$`, `$${trip.c - 1}\\text{ cm}$`],
            correctAnswer: "A",
            explanation: `Theo định lý Pythagore, cạnh huyền bằng $\sqrt{${trip.a}^2 + ${trip.b}^2} = \sqrt{${trip.a*trip.a} + ${trip.b*trip.b}} = ${trip.c}\text{ cm}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 4) + 4; // 4-7
          const b = a + Math.floor(Math.random() * 4) + 2; // base 2
          const h = Math.floor(Math.random() * 4) + 3; // height
          const S = ((a + b) * h) / 2;
          return {
            id: `G8_MCQ_TRAP_${Date.now()}_${index}`,
            grade: 8,
            topic: "Hình học & Diện tích hình thang",
            level: "TH",
            type: "mcq",
            question: `Một hình thang có độ dài hai đáy lần lượt là $${a}\\text{ cm}$ và $${b}\\text{ cm}$, chiều cao là $${h}\\text{ cm}$. Diện tích hình thang đó là:`,
            options: [`$${S}\\text{ cm}^2$`, `$${S * 2}\\text{ cm}^2$`, `$${a * b}\\text{ cm}^2$`, `$${(a + b) * h}\\text{ cm}^2$`],
            correctAnswer: "A",
            explanation: `Diện tích hình thang $S = \\dfrac{(a+b)h}{2} = \\dfrac{(${a}+${b}) \\times ${h}}{2} = ${S}\\text{ cm}^2$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const b = Math.floor(Math.random() * 5) + 1;
          const c = a * 4 + b; // x = 4
          return {
            id: `G8_MCQ_EQ_${Date.now()}_${index}`,
            grade: 8,
            topic: "Giải phương trình bậc nhất",
            level: "VD",
            type: "mcq",
            question: `Nghiệm của phương trình $${a}x + ${b} = ${c}$ là:`,
            options: ["$x = 4$", "$x = 3$", "$x = 5$", "$x = -4$"],
            correctAnswer: "A",
            explanation: `$${a}x = ${c - b} \\implies x = ${c - b}/${a} = 4$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 9: Căn bậc hai, Hệ thức lượng, Hệ phương trình, PT bậc hai & Vi-ét, Đường tròn tiếp tuyến
  generateGrade9(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
          const k = Math.floor(Math.random() * 4) + 2;
          const maxVal = Math.round(Math.sqrt(4 * k) * 100) / 100;
          return {
            id: `G9_VDC_E_${Date.now()}_${index}`,
            grade: 9,
            topic: "Cực trị căn thức (Câu điểm 10)",
            level: "VDC",
            type: "essay",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị lớn nhất của biểu thức $A = \\sqrt{x - 2} + \\sqrt{${2 + 2 * k} - x}$ với $2 \\le x \\le ${2 + 2 * k}$:`,
            options: [],
            correctAnswer: `${maxVal} | 2*sqrt(${k}) | 2sqrt(${k})`,
            explanation: `Áp dụng BĐT Cauchy-Schwarz: $A^2 \\le (1+1)(x - 2 + ${2 + 2 * k} - x) = 2 \\times ${2 * k} = ${4 * k} \\implies A \\le \\sqrt{${4 * k}}$.`
          };
        },
        // TH
        () => {
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
        },
        // VD
        () => {
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
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[1]();
      return templates[2]();
    } else {
      // MCQ Grade 9
      const templates = [
        () => {
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
        },
        () => {
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
        },
        () => {
          const x = Math.floor(Math.random() * 4) + 1;
          const y = Math.floor(Math.random() * 4) + 1;
          const eq1 = x + y;
          const eq2 = 2 * x - y;
          const sum = x + y;
          return {
            id: `G9_MCQ_SYS_${Date.now()}_${index}`,
            grade: 9,
            topic: "Hệ phương trình bậc nhất hai ẩn",
            level: "TH",
            type: "mcq",
            question: `Nghiệm $(x; y)$ của hệ phương trình $\\begin{cases} x + y = ${eq1} \\\\ 2x - y = ${eq2} \\end{cases}$ là:`,
            options: [`$(${x}; ${y})$`, `$(${y}; ${x})$`, `$(${x + 1}; ${y - 1})$`, `$(${x - 1}; ${y + 1})$`],
            correctAnswer: "A",
            explanation: `Cộng vế theo vế hai phương trình ta được $3x = ${eq1 + eq2} \\implies x = ${x} \\implies y = ${y}$.`
          };
        },
        () => {
          const a = 1;
          const b = -(Math.floor(Math.random() * 5) + 3); // -3 to -7
          const c = Math.floor(Math.random() * 4) + 1;
          const delta = b * b - 4 * a * c;
          return {
            id: `G9_MCQ_DELTA_${Date.now()}_${index}`,
            grade: 9,
            topic: "Biệt thức delta bậc hai",
            level: "NB",
            type: "mcq",
            question: `Biệt thức $\\Delta$ của phương trình bậc hai $x^2 + ${b}x + ${c} = 0$ bằng:`,
            options: [`$${delta}$`, `$${delta - 5}$`, `$${delta + 8}$`, `$${b * b + 4 * c}$`],
            correctAnswer: "A",
            explanation: `$\\Delta = b^2 - 4ac = (${b})^2 - 4 \\times 1 \\times ${c} = ${delta}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 4) + 2; // 2-5
          const a2 = a * a;
          return {
            id: `G9_MCQ_RAD_${Date.now()}_${index}`,
            grade: 9,
            topic: "Rút gọn căn thức",
            level: "NB",
            type: "mcq",
            question: `Rút gọn biểu thức $A = \\sqrt{${a2}x}$ với $x \\ge 0$ ta được:`,
            options: [`$${a}\\sqrt{x}$`, `$${a}x$`, `$${a2}\\sqrt{x}$`, `$${a}\\sqrt{x^2}$`],
            correctAnswer: "A",
            explanation: `$A = \\sqrt{${a}^2 \\cdot x} = ${a}\\sqrt{x}$ (do $x \\ge 0$).`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 10: Tập hợp, Parabol, Vectơ, Bất phương trình bậc hai
  generateGrade10(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
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
        },
        // VD
        () => {
          const a = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const b = Math.floor(Math.random() * 2) + 2; // 2, 3
          const boundary = Math.floor(Math.random() * 3) + 4; // 4, 5, 6
          const maxVal = a * boundary; // F(boundary, 0) vs F(0, boundary). Since a > b, max is at (boundary, 0) or (0, boundary)
          const fMax = Math.max(a * boundary, b * boundary);
          return {
            id: `G10_VD_E_${Date.now()}_${index}`,
            grade: 10,
            topic: "Quy hoạch tuyến tính & Bất phương trình",
            level: "VD",
            type: "essay",
            question: `[Vận Dụng 🧠] Tìm giá trị lớn nhất của biểu thức $F(x; y) = ${a}x + ${b}y$ trên miền nghiệm của hệ $\\begin{cases} x \\ge 0 \\\\ y \\ge 0 \\\\ x + y \\le ${boundary} \\end{cases}$:`,
            options: [],
            correctAnswer: `${fMax} | F=${fMax} | max=${fMax}`,
            explanation: `Miền nghiệm có các đỉnh $(0; 0), (${boundary}; 0), (0; ${boundary})$. $F(${boundary}; 0) = ${a * boundary}, F(0; ${boundary}) = ${b * boundary}$. Giá trị lớn nhất thu được là $F = ${fMax}$.`
          };
        },
        // TH
        () => {
          const r1 = Math.floor(Math.random() * 3) + 1; // 1 to 3
          const r2 = r1 + Math.floor(Math.random() * 3) + 2; // 4 to 8
          const sum = r1 + r2;
          const prod = r1 * r2;
          return {
            id: `G10_TH_E_${Date.now()}_${index}`,
            grade: 10,
            topic: "Giải bất phương trình bậc hai",
            level: "TH",
            type: "essay",
            question: `[Thông Hiểu 💡] Tìm nghiệm dương nguyên nhỏ nhất của bất phương trình bậc hai: $x^2 - ${sum}x + ${prod} < 0$:`,
            options: [],
            correctAnswer: `${r1 + 1}`,
            explanation: `Bất phương trình tương đương $(x - ${r1})(x - ${r2}) < 0 \\iff ${r1} < x < ${r2}$. Nghiệm nguyên nhỏ nhất nằm trong khoảng là $x = ${r1 + 1}$.`
          };
        }
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[2]();
      return templates[1]();
    } else {
      // MCQ Grade 10
      const templates = [
        () => {
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
        },
        () => {
          const a = Math.floor(Math.random() * 6) + 1;
          return {
            id: `G10_MCQ_DOMAIN_${Date.now()}_${index}`,
            grade: 10,
            topic: "Tập xác định của hàm số",
            level: "NB",
            type: "mcq",
            question: `Tập xác định của hàm số $y = \\sqrt{x - ${a}}$ là:`,
            options: [`$D = [${a}; +\\infty)$`, `$D = (${a}; +\\infty)$`, `$D = (-\\infty; ${a}]$`, `$D = \\mathbb{R} \\setminus \\{${a}\\}$`],
            correctAnswer: "A",
            explanation: `Hàm số xác định khi và chỉ khi $x - ${a} \\ge 0 \\iff x \\ge ${a} \\implies D = [${a}; +\\infty)$.`
          };
        },
        () => {
          const triplets = [[3, 4, 5], [6, 8, 10]];
          const trip = triplets[Math.floor(Math.random() * triplets.length)];
          return {
            id: `G10_MCQ_VEC_${Date.now()}_${index}`,
            grade: 10,
            topic: "Vectơ trong mặt phẳng",
            level: "TH",
            type: "mcq",
            question: `Cho hai vectơ vuông góc $\\vec{u}$ và $\\vec{v}$ có độ dài lần lượt là $${trip[0]}$ và $${trip[1]}$. Độ dài của vectơ tổng $\\vec{u} + \\vec{v}$ bằng:`,
            options: [`$${trip[2]}$`, `$${trip[0] + trip[1]}$`, `$${trip[0] * trip[1]}$`, `$\\sqrt{${trip[0] + trip[1]}}$`],
            correctAnswer: "A",
            explanation: `Vì hai vectơ vuông góc nên độ dài tổng $|\\vec{u} + \\vec{v}| = \\sqrt{|\\vec{u}|^2 + |\\vec{v}|^2} = \\sqrt{${trip[0]}^2 + ${trip[1]}^2} = ${trip[2]}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const b = a + 2;
          return {
            id: `G10_MCQ_UNION_${Date.now()}_${index}`,
            grade: 10,
            topic: "Tập hợp số",
            level: "NB",
            type: "mcq",
            question: `Cho hai tập hợp $A = [1; ${b}]$ và $B = [${a}; 10]$. Giao của hai tập hợp $A \\cap B$ là:`,
            options: [`$[${a}; ${b}]$`, `$A \\cap B = [1; 10]$`, `$A \\cap B = [1; ${a}]$`, `$A \\cap B = [${b}; 10]$`],
            correctAnswer: "A",
            explanation: `Giao của $A = [1; ${b}]$ và $B = [${a}; 10]$ với $1 < ${a} < ${b} < 10$ là phần chung $[${a}; ${b}]$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
          const a2 = a * a;
          return {
            id: `G10_MCQ_INEQ_${Date.now()}_${index}`,
            grade: 10,
            topic: "Bất phương trình bậc hai",
            level: "TH",
            type: "mcq",
            question: `Tập nghiệm của bất phương trình bậc hai $x^2 - ${a2} < 0$ là:`,
            options: [`$(-${a}; ${a})$`, `$D = (-\\infty; -${a}) \\cup (${a}; +\\infty)$`, `$[-${a}; ${a}]$`, `$D = (-\\infty; -${a}]$`],
            correctAnswer: "A",
            explanation: `$x^2 - ${a2} < 0 \\iff x^2 < ${a2} \\iff -${a} < x < ${a}$. Tập nghiệm là $(-{a}; ${a})$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 11: Lượng giác, Hình chóp S.ABCD, Cấp số cộng / Cấp số nhân
  generateGrade11(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
          const q = Math.floor(Math.random() * 3) + 3; // 3, 4, 5
          const sum = q / (q - 1);
          return {
            id: `G11_VDC_E_${Date.now()}_${index}`,
            grade: 11,
            topic: "Cấp số nhân lùi vô hạn",
            level: "VDC",
            type: "essay",
            question: `[Vận Dụng Cao 🔥] Tính tổng của cấp số nhân lùi vô hạn $S = 1 + \\dfrac{1}{${q}} + \\dfrac{1}{${q * q}} + \\dots + \\dfrac{1}{${q}^n} + \\dots$:`,
            options: [],
            correctAnswer: `${sum} | ${q}/${q-1} | S=${sum}`,
            explanation: `$S = \\dfrac{u_1}{1 - q} = \\dfrac{1}{1 - 1/${q}} = \\dfrac{${q}}{${q - 1}} = ${sum}$.`
          };
        },
        // VD
        () => {
          const u1 = Math.floor(Math.random() * 4) + 1; // 1-4
          const d = Math.floor(Math.random() * 3) + 2; // 2-4
          const n = 10;
          const sum = (n / 2) * (2 * u1 + (n - 1) * d);
          return {
            id: `G11_VD_E_${Date.now()}_${index}`,
            grade: 11,
            topic: "Cấp số cộng",
            level: "VD",
            type: "essay",
            question: `[Vận Dụng 🧠] Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = ${u1}$, công sai $d = ${d}$. Tính tổng $S_{10}$ của 10 số hạng đầu tiên:`,
            options: [],
            correctAnswer: `${sum} | S10=${sum}`,
            explanation: `$S_{10} = \\dfrac{10}{2}[2u_1 + 9d] = 5 \\times [2(${u1}) + 9(${d})] = 5 \\times [${2 * u1} + ${9 * d}] = ${sum}$.`
          };
        },
        // TH
        () => {
          return {
            id: `G11_TH_E_${Date.now()}_${index}`,
            grade: 11,
            topic: "Giải phương trình lượng giác cơ bản",
            level: "TH",
            type: "essay",
            question: `[Thông Hiểu 💡] Tìm nghiệm dương bé nhất (độ) của phương trình lượng giác: $\\cos(x) = \\cos(45^\\circ)$:`,
            options: [],
            correctAnswer: "45 | 45 do",
            explanation: `$\\cos(x) = \\cos(45^\\circ) \\iff x = \\pm 45^\\circ + k360^\\circ$. Nghiệm dương bé nhất là $x = 45^\\circ$.`
          };
        }
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[2]();
      return templates[1]();
    } else {
      // MCQ Grade 11
      const templates = [
        () => {
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
        },
        () => {
          const u1 = Math.floor(Math.random() * 5) + 1;
          const d = Math.floor(Math.random() * 4) + 2;
          const u5 = u1 + 4 * d;
          return {
            id: `G11_MCQ_AP_${Date.now()}_${index}`,
            grade: 11,
            topic: "Cấp số cộng",
            level: "NB",
            type: "mcq",
            question: `Cho cấp số cộng $(u_n)$ có số hạng đầu $u_1 = ${u1}$ và công sai $d = ${d}$. Số hạng thứ năm $u_5$ là:`,
            options: [`$${u5}$`, `$${u1 + 5 * d}$`, `$${u1 + d}$`, `$${u1 * Math.pow(d, 4)}$`],
            correctAnswer: "A",
            explanation: `$u_5 = u_1 + 4d = ${u1} + 4 \\times ${d} = ${u5}$.`
          };
        },
        () => {
          return {
            id: `G11_MCQ_TRIG_${Date.now()}_${index}`,
            grade: 11,
            topic: "Phương trình lượng giác",
            level: "TH",
            type: "mcq",
            question: `Nghiệm của phương trình lượng giác $\\sin(x) = \\dfrac{1}{2}$ trong khoảng $[0; \\pi]$ là:`,
            options: [`$x = \\dfrac{\\pi}{6}; \\dfrac{5\\pi}{6}$`, `$x = \\dfrac{\\pi}{3}; \\dfrac{2\\pi}{3}$`, `$x = \\dfrac{\\pi}{4}; \\dfrac{3\\pi}{4}$`, `$x = \\dfrac{\\pi}{2}$`],
            correctAnswer: "A",
            explanation: `$\\sin(x) = 1/2 \\iff x = \\pi/6 + k2\\pi$ hoặc $x = 5\\pi/6 + k2\\pi$. Trong khoảng $[0; \\pi]$ có hai nghiệm $\\dfrac{\\pi}{6}$ và $\\dfrac{5\\pi}{6}$.`
          };
        },
        () => {
          const n = Math.floor(Math.random() * 4) + 5; // 5-8 boys
          const m = Math.floor(Math.random() * 4) + 4; // 4-7 girls
          const k = 2;
          const ways = (n * (n - 1)) / 2; // ways to choose 2 boys
          const totalWays = ((n + m) * (n + m - 1)) / 2;
          return {
            id: `G11_MCQ_PROB_${Date.now()}_${index}`,
            grade: 11,
            topic: "Xác suất & Tổ hợp",
            level: "VD",
            type: "mcq",
            question: `Một hộp chứa $${n}$ học sinh nam và $${m}$ học sinh nữ. Chọn ngẫu nhiên $2$ học sinh. Xác suất để chọn được $2$ học sinh đều là nam là:`,
            options: [`$\\dfrac{${ways}}{${totalWays}}$`, `$\\dfrac{${n}}{${n + m}}$`, `$\\dfrac{${ways * 2}}{${totalWays}}$`, `$\\dfrac{1}{2}$`],
            correctAnswer: "A",
            explanation: `Không gian mẫu $C_{${n+m}}^2 = ${totalWays}$. Số cách chọn 2 nam là $C_{${n}}^2 = ${ways}$. Xác suất là $P = \\dfrac{${ways}}{${totalWays}}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 5) + 2;
          const c = Math.floor(Math.random() * 4) + 2;
          return {
            id: `G11_MCQ_LIMIT_${Date.now()}_${index}`,
            grade: 11,
            topic: "Giới hạn của dãy số",
            level: "NB",
            type: "mcq",
            question: `Giới hạn của dãy số $\\lim \\dfrac{${a}n + 3}{${c}n - 1}$ bằng:`,
            options: [`$\\dfrac{${a}}{${c}}$`, `$${a}$`, `$0$`, `$-3$`],
            correctAnswer: "A",
            explanation: `$\\lim \\dfrac{${a}n + 3}{${c}n - 1} = \\lim \\dfrac{${a} + 3/n}{${c} - 1/n} = \\dfrac{${a}}{${c}}$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  },

  // 📚 TOÁN 12: Đạo hàm, Khảo sát hàm số, Bảng biến thiên, Tích phân
  generateGrade12(type = 'mcq', level = 'TH', index = 1) {
    if (type === 'essay') {
      const templates = [
        // VDC
        () => {
          const mMax = Math.floor(Math.random() * 4) + 2; // 2 to 5
          const count = 10 + mMax;
          return {
            id: `G12_VDC_E_${Date.now()}_${index}`,
            grade: 12,
            topic: "Hàm số chứa tham số m (Câu 9+)",
            level: "VDC",
            type: "essay",
            question: `[Vận Dụng Cao 🔥] Tìm số giá trị nguyên của $m \\in [-10; 10]$ để hàm số $y = \\dfrac{x+m}{x+${mMax}}$ đồng biến trên từng khoảng xác định:`,
            options: [],
            correctAnswer: `${count} | ${count} gia tri`,
            explanation: `$y' = \\dfrac{${mMax}-m}{(x+${mMax})^2} > 0 \\iff m < ${mMax}$. Vì $m \\in [-10; 10] \\implies m \\in \\{-10, -9, \\dots, ${mMax - 1}\\}$, có ${count} giá trị nguyên.`
          };
        },
        // VD
        () => {
          const a = Math.floor(Math.random() * 3) + 1; // 1 to 3
          // find extrema of y = x^3 - 3a^2x on [0; 2a]. y(0) = 0, y(a) = -2a^3, y(2a) = 2a^3.
          // absolute min is -2a^3
          const minVal = -2 * Math.pow(a, 3);
          return {
            id: `G12_VD_E_${Date.now()}_${index}`,
            grade: 12,
            topic: "Tìm cực trị trên đoạn",
            level: "VD",
            type: "essay",
            question: `[Vận Dụng 🧠] Tìm giá trị nhỏ nhất của hàm số $y = x^3 - ${3 * a * a}x$ trên đoạn $[0; ${2 * a}]$:`,
            options: [],
            correctAnswer: `${minVal} | min=${minVal}`,
            explanation: `$y' = 3x^2 - ${3 * a * a} = 0 \\iff x = \\pm ${a}$. Trên $[0; ${2 * a}]$, ta tính $y(0) = 0, y(${a}) = ${minVal}, y(${2 * a}) = ${8 * a * a * a - 6 * a * a * a} = ${2 * Math.pow(a, 3)}$. Vậy giá trị nhỏ nhất là ${minVal}.`
          };
        },
        // TH
        () => {
          const r = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const h = Math.floor(Math.random() * 3) + 4; // 4, 5, 6
          const V = Math.round((Math.PI * r * r * h) / 3 * 100) / 100;
          return {
            id: `G12_TH_E_${Date.now()}_${index}`,
            grade: 12,
            topic: "Hình nón tròn xoay",
            level: "TH",
            type: "essay",
            question: `[Thông Hiểu 💡] Tính thể tích khối nón tròn xoay có bán kính đáy $R = ${r}\\text{ cm}$ và chiều cao $h = ${h}\\text{ cm}$ (lấy xấp xỉ theo số thực hoặc biểu thức của $\\pi$):`,
            options: [],
            correctAnswer: `${Math.round((r*r*h)/3 * 100)/100}*pi | ${(r*r*h)/3}pi | ${V}`,
            explanation: `$V = \\dfrac{1}{3}\\pi R^2 h = \\dfrac{1}{3}\\pi (${r})^2 (${h}) = \\dfrac{${r*r*h}}{3}\\pi \\approx ${V}\\text{ cm}^3$.`
          };
        }
      ];
      if (level === 'VDC') return templates[0]();
      if (level === 'TH') return templates[2]();
      return templates[1]();
    } else {
      // MCQ Grade 12
      const templates = [
        () => {
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
        },
        () => {
          const a = Math.floor(Math.random() * 4) + 1; // 1 to 4
          const b = Math.floor(Math.random() * 3) + 2; // 2 to 4
          const res = (b * a * a) / 2;
          return {
            id: `G12_MCQ_INT_${Date.now()}_${index}`,
            grade: 12,
            topic: "Nguyên hàm & Tích phân",
            level: "TH",
            type: "mcq",
            question: `Tính tích phân $I = \\int_{0}^{${a}} ${b}x \\, dx$:`,
            options: [`$${res}$`, `$${res * 2}$`, `$${res / 2}$`, `$${b * a}$`],
            correctAnswer: "A",
            explanation: `$I = \\left[ \\dfrac{${b}x^2}{2} \\right]_{0}^{${a}} = \\dfrac{${b} \\times ${a}^2}{2} = ${res}$.`
          };
        },
        () => {
          const real = Math.floor(Math.random() * 5) + 2; // 2-6
          const imag = Math.floor(Math.random() * 4) + 3; // 3-6
          const mod2 = real * real + imag * imag;
          const mod = Math.sqrt(mod2);
          return {
            id: `G12_MCQ_COMPLEX_${Date.now()}_${index}`,
            grade: 12,
            topic: "Số phức",
            level: "NB",
            type: "mcq",
            question: `Cho số phức $z = ${real} + ${imag}i$. Môđun của số phức $z$ là:`,
            options: [`$\\sqrt{${mod2}}$`, `$${real + imag}$`, `$${real * imag}$`, `$\\sqrt{${real * real - imag * imag}}$`],
            correctAnswer: "A",
            explanation: `$|z| = \\sqrt{a^2 + b^2} = \\sqrt{${real}^2 + ${imag}^2} = \\sqrt{${mod2}}$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 3) + 2; // 2, 3, 4
          const b = Math.floor(Math.random() * 4) + 2; // 2-5
          const c = Math.floor(Math.random() * 5) - 2;
          return {
            id: `G12_MCQ_OXYZ_${Date.now()}_${index}`,
            grade: 12,
            topic: "Hình học tọa độ Oxyz",
            level: "NB",
            type: "mcq",
            question: `Trong không gian $Oxyz$, phương trình mặt phẳng $(\\alpha): ${a}x - ${b}y + ${c}z - 7 = 0$ có một vectơ pháp tuyến là:`,
            options: [`$\\vec{n} = (${a}; -${b}; ${c})$`, `$\\vec{n} = (${a}; ${b}; ${c})$`, `$\\vec{n} = (${a}; -${b}; -7)$`, `$\\vec{n} = (1; 1; 1)$`],
            correctAnswer: "A",
            explanation: `Hệ số trước $x, y, z$ của phương trình mặt phẳng là tọa độ của vectơ pháp tuyến: $\\vec{n} = (${a}; -${b}; ${c})$.`
          };
        },
        () => {
          const a = Math.floor(Math.random() * 5) + 2; // 2, 3, 4, 5, 6
          return {
            id: `G12_MCQ_DERIV_${Date.now()}_${index}`,
            grade: 12,
            topic: "Đạo hàm hàm mũ",
            level: "TH",
            type: "mcq",
            question: `Đạo hàm của hàm số $y = ${a}^x$ là:`,
            options: [`$y' = ${a}^x \\ln ${a}$`, `$y' = ${a}^x$`, `$y' = x \\cdot ${a}^{x-1}$`, `$y' = \\dfrac{${a}^x}{\\ln ${a}}$`],
            correctAnswer: "A",
            explanation: `Đạo hàm của hàm mũ: $(a^x)' = a^x \\ln a$. Vậy $(${a}^x)' = ${a}^x \\ln ${a}$.`
          };
        }
      ];
      return templates[(index - 1) % templates.length]();
    }
  }
};;

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
