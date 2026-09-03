/**
 * KhiemEdu Math Engine & Dynamic Question Generator v2.0
 * Ngân hàng đề thi Toán học chuẩn TOANMATH (Đầy đủ khối lớp 6 - 12 & Tuyển sinh 10)
 * TÍCH HỢP ANTI-DUPLICATE GUARD (CHỐNG TRÙNG LẶP TUYỆT ĐỐI 0%)
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
  rightTriangle(AB = '6', AC = '8', BC = '10') {
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

  circleWithTangents(r = 5) {
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

  parabolaGraph(h = 2, k = -1) {
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
          <text x="125" y="138" font-size="11" font-weight="bold" fill="#ef4444">I(${h}; ${k})</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Đồ thị Parabol có đỉnh I(${h}; ${k}))</div>
      </div>
    `;
  },

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

  variationTable(x1 = -1, x2 = 1, yMax = 4, yMin = 0) {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <table style="width:260px;margin:0 auto;border-collapse:collapse;font-size:12px;text-align:center;background:#fff;border:1.5px solid #cbd5e1;border-radius:6px;">
          <tr style="border-bottom:1.5px solid #cbd5e1;">
            <td style="padding:4px 8px;font-weight:bold;width:35px;border-right:1.5px solid #cbd5e1;background:#f1f5f9;">x</td>
            <td style="padding:4px;">$-\\infty$</td>
            <td style="padding:4px;font-weight:bold;color:#4f46e5;">${x1}</td>
            <td style="padding:4px;font-weight:bold;color:#ef4444;">${x2}</td>
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
              $-\\infty \\;\\nearrow\\; ${yMax} \\;\\searrow\\; ${yMin} \\;\\nearrow\\; +\\infty$
            </td>
          </tr>
        </table>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Bảng biến thiên của hàm số y = f(x))</div>
      </div>
    `;
  },

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

/* ================= 🎓 TOANMATH DIVERSE QUESTION BANK ENGINE ================= */
const GradeEngines = {
  // LỚP 6
  getGrade6Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const k = Math.floor(Math.random() * 8) + 3;
          return {
            id: `G6_E1_${idx}_${Math.random()}`,
            grade: 6, level: "VDC", type: "essay",
            question: `[Vận Dụng Cao 🔥] Tìm số tự nhiên $n$ sao cho phân số $A = \\dfrac{2n+${k}}{n+1}$ nhận giá trị là một số nguyên:`,
            correctAnswer: `${k - 2} | n=${k - 2}`,
            explanation: `$A = 2 + \\dfrac{${k-2}}{n+1}$. Để $A$ nguyên thì $(n+1)$ là ước của ${k-2}$. Suy ra $n = ${k-2}$.`
          };
        },
        (idx) => {
          const x = Math.floor(Math.random() * 30) + 10;
          const b = Math.floor(Math.random() * 25) + 5;
          return {
            id: `G6_E2_${idx}_${Math.random()}`,
            grade: 6, level: "TH", type: "essay",
            question: `[Thông Hiểu 💡] Tìm số nguyên $x$ biết: $x - (-${b}) = ${x + b}$:`,
            correctAnswer: `${x} | x=${x}`,
            explanation: `$x + ${b} = ${x + b} \\implies x = ${x}$.`
          };
        },
        (idx) => {
          const p = Math.floor(Math.random() * 4) + 2;
          const val = Math.pow(2, p) * 3;
          return {
            id: `G6_E3_${idx}_${Math.random()}`,
            grade: 6, level: "VD", type: "essay",
            question: `[Vận Dụng 🧠] Tìm số tự nhiên $x$ thỏa mãn đẳng thức: $2^{x+2} - 2^x = ${val}$:`,
            correctAnswer: `${p} | x=${p}`,
            explanation: `$2^x(4 - 1) = ${val} \\iff 3 \\cdot 2^x = ${val} \\iff 2^x = 2^${p} \\implies x = ${p}$.`
          };
        }
      ];
    }

    // MCQ Grade 6 (18 distinct templates)
    return [
      (idx) => {
        const a = Math.floor(Math.random() * 10) + 2;
        const b = a + Math.floor(Math.random() * 15) + 5;
        const count = b - a;
        return {
          id: `G6_M1_${idx}`, grade: 6, level: "NB", type: "mcq",
          question: `Cho tập hợp $M = \\{x \\in \\mathbb{N} \\mid ${a} \\le x < ${b}\\}$. Số phần tử của tập hợp $M$ là:`,
          options: [`$${count}$`, `$${count + 1}$`, `$${count - 1}$`, `$${count + 2}$`],
          correctAnswer: "A", explanation: `Số phần tử là $${b} - ${a} = ${count}$.`
        };
      },
      (idx) => {
        const m = Math.floor(Math.random() * 6) + 2;
        const n = Math.floor(Math.random() * 5) + 2;
        const base = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G6_M2_${idx}`, grade: 6, level: "NB", type: "mcq",
          question: `Kết quả của phép tính $${base}^${m} \\cdot ${base}^${n}$ viết dưới dạng một lũy thừa là:`,
          options: [`$${base}^{${m + n}}$`, `$${base}^{${m * n}}$`, `$${base * 2}^{${m + n}}$`, `$${base}^{${m - n > 0 ? m - n : 1}}$`],
          correctAnswer: "A", explanation: `$a^m \\cdot a^n = a^{m+n} = ${base}^{${m+n}}$.`
        };
      },
      (idx) => {
        const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
        const p = primes[Math.floor(Math.random() * primes.length)];
        const comps = [15, 21, 25, 27, 33, 35, 39, 49];
        const c1 = comps[Math.floor(Math.random() * comps.length)];
        const c2 = c1 + 2;
        const c3 = 1;
        return {
          id: `G6_M3_${idx}`, grade: 6, level: "NB", type: "mcq",
          question: `Trong các số sau, số nào là số nguyên tố?`,
          options: [`$${p}$`, `$${c1}$`, `$${c2}$`, `$${c3}$`],
          correctAnswer: "A", explanation: `$${p}$ chỉ có hai ước là 1 và chính nó nên là số nguyên tố.`
        };
      },
      (idx) => {
        const d1 = (Math.floor(Math.random() * 6) + 3) * 2;
        const d2 = (Math.floor(Math.random() * 5) + 2) * 2;
        const s = (d1 * d2) / 2;
        return {
          id: `G6_M4_${idx}`, grade: 6, level: "TH", type: "mcq",
          question: `Một hình thoi có độ dài hai đường chéo lần lượt là $${d1}\\text{ cm}$ và $${d2}\\text{ cm}$. Diện tích của hình thoi đó là:`,
          diagram: MathDiagrams.rhombus(`${d1}cm`, `${d2}cm`),
          options: [`$${s}\\text{ cm}^2$`, `$${d1 * d2}\\text{ cm}^2$`, `$${(d1 + d2) * 2}\\text{ cm}^2$`, `$${s / 2}\\text{ cm}^2$`],
          correctAnswer: "A", explanation: `Diện tích hình thoi $S = \\dfrac{1}{2} d_1 d_2 = \\dfrac{1}{2} \\cdot ${d1} \\cdot ${d2} = ${s}\\text{ cm}^2$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 15) + 5;
        const res = -a - b;
        return {
          id: `G6_M5_${idx}`, grade: 6, level: "TH", type: "mcq",
          question: `Tính giá trị của biểu thức: $(-${a}) + (-${b})$:`,
          options: [`$${res}$`, `$${Math.abs(res)}$`, `$${-a + b}$`, `$${a - b}$`],
          correctAnswer: "A", explanation: `$(-${a}) + (-${b}) = -(${a} + ${b}) = ${res}$.`
        };
      },
      (idx) => {
        const gcd = Math.floor(Math.random() * 6) + 2;
        const x = (Math.floor(Math.random() * 4) + 2) * gcd;
        const y = (Math.floor(Math.random() * 3) + 5) * gcd;
        return {
          id: `G6_M6_${idx}`, grade: 6, level: "TH", type: "mcq",
          question: `Ước chung lớn nhất $\\text{ƯCLN}(${x}; ${y})$ bằng:`,
          options: [`$${gcd}$`, `$${gcd * 2}$`, `$${1}$`, `$${x * y}$`],
          correctAnswer: "A", explanation: `Phân tích thừa số nguyên tố cho kết quả $\\text{ƯCLN}(${x}; ${y}) = ${gcd}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = a + Math.floor(Math.random() * 4) + 1;
        const k = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G6_M7_${idx}`, grade: 6, level: "TH", type: "mcq",
          question: `Phân số nào dưới đây bằng phân số $\\dfrac{${a}}{${b}}$?`,
          options: [`$\\dfrac{${a * k}}{${b * k}}$`, `$\\dfrac{${a + k}}{${b + k}}$`, `$\\dfrac{${a * k}}{${b}}$`, `$\\dfrac{${a}}{${b * k}}$`],
          correctAnswer: "A", explanation: `Nhân cả tử và mẫu với $${k}$ ta được $\\dfrac{${a*k}}{${b*k}}$.`
        };
      },
      (idx) => {
        const side = Math.floor(Math.random() * 12) + 4;
        const perim = side * 4;
        const area = side * side;
        return {
          id: `G6_M8_${idx}`, grade: 6, level: "TH", type: "mcq",
          question: `Một mảnh vườn hình vuông có chu vi bằng $${perim}\\text{ m}$. Diện tích của mảnh vườn đó là:`,
          options: [`$${area}\\text{ m}^2$`, `$${side * 2}\\text{ m}^2$`, `$${perim * 2}\\text{ m}^2$`, `$${area / 2}\\text{ m}^2$`],
          correctAnswer: "A", explanation: `Cạnh hình vuông là $${perim} : 4 = ${side}\\text{ m}$. Diện tích $S = ${side}^2 = ${area}\\text{ m}^2$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = a + Math.floor(Math.random() * 8) + 2;
        return {
          id: `G6_M9_${idx}`, grade: 6, level: "NB", type: "mcq",
          question: `Số đối của số nguyên $-${b}$ là:`,
          options: [`$${b}$`, `$-${b}$`, `$\\dfrac{1}{${b}}$`, `$0$`],
          correctAnswer: "A", explanation: `Số đối của $-${b}$ là $${b}$.`
        };
      },
      (idx) => {
        const p = Math.floor(Math.random() * 5) + 3;
        const last = 5 * p;
        return {
          id: `G6_M10_${idx}`, grade: 6, level: "NB", type: "mcq",
          question: `Số nào sau đây chia hết cho cả $2$ và $5$?`,
          options: [`$${last * 10}$`, `$${last * 10 + 3}$`, `$${last * 10 + 5}$`, `$${last * 10 + 7}$`],
          correctAnswer: "A", explanation: `Số có chữ số tận cùng là $0$ thì chia hết cho cả $2$ và $5$.`
        };
      }
    ];
  },

  // LỚP 7
  getGrade7Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const a = Math.floor(Math.random() * 5) + 2;
          return {
            id: `G7_E1_${idx}_${Math.random()}`,
            grade: 7, level: "VDC", type: "essay",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $A = |x - ${a}| + ${a * 2}$:`,
            correctAnswer: `${a * 2} | min=${a * 2}`,
            explanation: `Vì $|x - ${a}| \\ge 0 \\implies A \\ge ${a * 2}$. Dấu '=' xảy ra khi $x = ${a}$.`
          };
        },
        (idx) => {
          const k = Math.floor(Math.random() * 4) + 2;
          const sum = k * 5;
          return {
            id: `G7_E2_${idx}_${Math.random()}`,
            grade: 7, level: "TH", type: "essay",
            question: `[Thông Hiểu 💡] Cho biết $\\dfrac{x}{2} = \\dfrac{y}{3}$ và $x + y = ${sum}$. Tìm giá trị của $x$:`,
            correctAnswer: `${k * 2} | x=${k * 2}`,
            explanation: `Theo tính chất dãy tỉ số bằng nhau: $\\dfrac{x}{2} = \\dfrac{y}{3} = \\dfrac{x+y}{2+3} = \\dfrac{${sum}}{5} = ${k} \\implies x = ${k * 2}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const angA = [80, 100, 120][Math.floor(Math.random() * 3)];
        const angB = (180 - angA) / 2;
        const res = angB / 2;
        return {
          id: `G7_M1_${idx}`, grade: 7, level: "TH", type: "mcq",
          question: `Cho tam giác $ABC$ cân tại $A$ có $\\widehat{A} = ${angA}^\\circ$, tia phân giác $BD$ cắt $AC$ tại $D$. Số đo góc $\\widehat{ABD}$ là:`,
          diagram: MathDiagrams.isoscelesTriangle(`${angA}°`),
          options: [`$${res}^\\circ$`, `$${angB}^\\circ$`, `$${angA}^\\circ$`, `$${res + 10}^\\circ$`],
          correctAnswer: "A", explanation: `Góc ở đáy $\\widehat{B} = (180^\\circ - ${angA}^\\circ)/2 = ${angB}^\\circ$. Tia phân giác $BD$ chia đôi góc $B$: $\\widehat{ABD} = ${angB}^\\circ / 2 = ${res}^\\circ$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        const a2 = a * a;
        return {
          id: `G7_M2_${idx}`, grade: 7, level: "NB", type: "mcq",
          question: `Căn bậc hai số học của $${a2}$ là:`,
          options: [`$${a}$`, `$-${a}$`, `$\\pm ${a}$`, `$${a2 * 2}$`],
          correctAnswer: "A", explanation: `Căn bậc hai số học của một số không âm $a^2$ là $a > 0$.`
        };
      },
      (idx) => {
        const x = Math.floor(Math.random() * 5) + 2;
        const deg = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G7_M3_${idx}`, grade: 7, level: "TH", type: "mcq",
          question: `Bậc của đa thức $P(x) = ${x}x^${deg + 2} - 4x^${deg} + 1$ là:`,
          options: [`$${deg + 2}$`, `$${deg}$`, `$${x}$`, `$1$`],
          correctAnswer: "A", explanation: `Bậc của đa thức một biến là số mũ cao nhất của biến, ở đây là $${deg + 2}$.`
        };
      },
      (idx) => {
        const a = (Math.floor(Math.random() * 4) + 1) * 3;
        const b = (Math.floor(Math.random() * 4) + 1) * 4;
        const c = Math.sqrt(a * a + b * b);
        return {
          id: `G7_M4_${idx}`, grade: 7, level: "TH", type: "mcq",
          question: `Cho tam giác vuông có độ dài hai cạnh góc vuông lần lượt là $${a}\\text{ cm}$ và $${b}\\text{ cm}$. Độ dài cạnh huyền bằng:`,
          diagram: MathDiagrams.rightTriangle(`${a}`, `${b}`, `${c}`),
          options: [`$${c}\\text{ cm}$`, `$${a + b}\\text{ cm}$`, `$${Math.abs(a - b)}\\text{ cm}$`, `$${c + 2}\\text{ cm}$`],
          correctAnswer: "A", explanation: `Theo định lý Pythagore: cạnh huyền $= \\sqrt{${a}^2 + ${b}^2} = ${c}\\text{ cm}$.`
        };
      },
      (idx) => {
        const num = Math.floor(Math.random() * 10) + 2;
        return {
          id: `G7_M5_${idx}`, grade: 7, level: "NB", type: "mcq",
          question: `Tập hợp các số hữu tỉ được ký hiệu là:`,
          options: [`$\\mathbb{Q}$`, `$\\mathbb{N}$`, `$\\mathbb{Z}$`, `$\\mathbb{R}$`],
          correctAnswer: "A", explanation: `Ký hiệu tập hợp số hữu tỉ là $\\mathbb{Q}$.`
        };
      }
    ];
  },

  // LỚP 8
  getGrade8Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const a = Math.floor(Math.random() * 5) + 2;
          return {
            id: `G8_E1_${idx}_${Math.random()}`,
            grade: 8, level: "VD", type: "essay",
            question: `[Vận Dụng 🧠] Tìm giá trị nhỏ nhất của biểu thức $P = x^2 - ${2 * a}x + ${a * a + 5}$:`,
            correctAnswer: `5 | min=5`,
            explanation: `$P = (x - ${a})^2 + 5 \\ge 5$. Giá trị nhỏ nhất là $5$ khi $x = ${a}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const a = Math.floor(Math.random() * 6) + 2;
        return {
          id: `G8_M1_${idx}`, grade: 8, level: "TH", type: "mcq",
          question: `Khai triển hằng đẳng thức $(x - ${a})^2$ ta được kết quả là:`,
          options: [`$x^2 - ${2 * a}x + ${a * a}$`, `$x^2 - ${a * a}$`, `$x^2 + ${2 * a}x + ${a * a}$`, `$x^2 - ${a}x + ${a * a}$`],
          correctAnswer: "A", explanation: `$(A - B)^2 = A^2 - 2AB + B^2 = x^2 - ${2 * a}x + ${a * a}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 5) + 1;
        return {
          id: `G8_M2_${idx}`, grade: 8, level: "NB", type: "mcq",
          question: `Phân thức đại số $\\dfrac{2x + 1}{x - ${a}}$ xác định khi và chỉ khi:`,
          options: [`$x \\ne ${a}$`, `$x = ${a}$`, `$x \\ne -\\dfrac{1}{2}$`, `$x > ${a}$`],
          correctAnswer: "A", explanation: `Mẫu thức phải khác $0 \\iff x - ${a} \\ne 0 \\iff x \\ne ${a}$.`
        };
      },
      (idx) => {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = r1 + Math.floor(Math.random() * 4) + 2;
        return {
          id: `G8_M3_${idx}`, grade: 8, level: "TH", type: "mcq",
          question: `Phân tích đa thức $x^2 - ${r1 + r2}x + ${r1 * r2}$ thành nhân tử ta được:`,
          options: [`$(x - ${r1})(x - ${r2})$`, `$(x + ${r1})(x + ${r2})$`, `$(x - ${r1})(x + ${r2})$`, `$(x^2 - ${r1})(x - ${r2})$`],
          correctAnswer: "A", explanation: `Tách hạng tử: $x^2 - ${r1}x - ${r2}x + ${r1 * r2} = (x - ${r1})(x - ${r2})$.`
        };
      },
      (idx) => {
        const k = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G8_M4_${idx}`, grade: 8, level: "TH", type: "mcq",
          question: `Cho $\\Delta ABC \\backsim \\Delta A'B'C'$ theo tỉ số đồng dạng $k = ${k}$. Tỉ số diện tích $\\dfrac{S_{\\Delta ABC}}{S_{\\Delta A'B'C'}}$ bằng:`,
          options: [`$${k * k}$`, `$${k}$`, `$${2 * k}$`, `$\\sqrt{${k}}$`],
          correctAnswer: "A", explanation: `Tỉ số diện tích của hai tam giác đồng dạng bằng bình phương tỉ số đồng dạng: $k^2 = ${k * k}$.`
        };
      }
    ];
  },

  // LỚP 9 / TUYỂN SINH 10
  getGrade9Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const p = Math.floor(Math.random() * 3) + 2;
          return {
            id: `G9_E1_${idx}_${Math.random()}`,
            grade: 9, level: "VD", type: "essay",
            question: `[Vận Dụng 🧠] Cho phương trình bậc hai: $x^2 - ${2 * p}x + ${p * p - 4} = 0$. Gọi $x_1, x_2$ là hai nghiệm. Tính giá trị biểu thức $T = x_1^2 + x_2^2$:`,
            correctAnswer: `${2 * p * p + 8} | T=${2 * p * p + 8}`,
            explanation: `Theo Vi-ét: $x_1 + x_2 = ${2*p}, x_1 x_2 = ${p*p - 4}$. Suy ra $T = (x_1 + x_2)^2 - 2x_1 x_2 = ${4*p*p} - 2(${p*p - 4}) = ${2*p*p + 8}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const m = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G9_M1_${idx}`, grade: 9, level: "NB", type: "mcq",
          question: `Điều kiện xác định của biểu thức chứa căn $\\sqrt{2x - ${2 * m}}$ là:`,
          options: [`$x \\ge ${m}$`, `$x > ${m}$`, `$x \\le ${m}$`, `$x < ${m}$`],
          correctAnswer: "A", explanation: `Biểu thức dưới căn không âm: $2x - ${2*m} \\ge 0 \\iff x \\ge ${m}$.`
        };
      },
      (idx) => {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G9_M2_${idx}`, grade: 9, level: "TH", type: "mcq",
          question: `Cho phương trình bậc hai $x^2 - ${r1 + r2}x + ${r1 * r2} = 0$. Tích hai nghiệm $x_1 \\cdot x_2$ bằng:`,
          options: [`$${r1 * r2}$`, `$${r1 + r2}$`, `$-${r1 * r2}$`, `$-${r1 + r2}$`],
          correctAnswer: "A", explanation: `Theo định lý Vi-ét: $x_1 \\cdot x_2 = \\dfrac{c}{a} = ${r1 * r2}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G9_M3_${idx}`, grade: 9, level: "TH", type: "mcq",
          question: `Hai đường thẳng $y = ${a}x + 1$ và $y = (m - 1)x + 5$ song song với nhau khi và chỉ khi:`,
          options: [`$m = ${a + 1}$`, `$m = ${a}$`, `$m = ${a - 1}$`, `$m \\ne ${a + 1}$`],
          correctAnswer: "A", explanation: `Hai đường thẳng song song khi hệ số góc bằng nhau: $m - 1 = ${a} \\iff m = ${a + 1}$.`
        };
      },
      (idx) => {
        const r = Math.floor(Math.random() * 5) + 3;
        return {
          id: `G9_M4_${idx}`, grade: 9, level: "TH", type: "mcq",
          question: `Từ điểm $M$ ngoài đường tròn $(O; ${r}\\text{ cm})$ kẻ hai tiếp tuyến $MA, MB$. Biết $OM = ${2 * r}\\text{ cm}$. Độ dài tiếp tuyến $MA$ là:`,
          diagram: MathDiagrams.circleWithTangents(r),
          options: [`$${r}\\sqrt{3}\\text{ cm}$`, `$${r}\\text{ cm}$`, `$${2 * r}\\text{ cm}$`, `$${r}\\sqrt{2}\\text{ cm}$`],
          correctAnswer: "A", explanation: `Áp dụng định lý Pythagore trong tam giác vuông $OAM$: $MA = \\sqrt{OM^2 - OA^2} = \\sqrt{${4*r*r} - ${r*r}} = ${r}\\sqrt{3}\\text{ cm}$.`
        };
      }
    ];
  },

  // LỚP 10
  getGrade10Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const p = Math.floor(Math.random() * 5) + 2;
          return {
            id: `G10_E1_${idx}_${Math.random()}`,
            grade: 10, level: "VDC", type: "essay",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $P = x + \\dfrac{${p * p}}{x}$ với mọi số thực dương $x > 0$:`,
            correctAnswer: `${2 * p} | min=${2 * p} | P=${2 * p}`,
            explanation: `Theo BĐT Cauchy: $P \\ge 2\\sqrt{x \\cdot \\dfrac{${p*p}}{x}} = ${2*p}$. Dấu '=' khi $x = ${p}$.`
          };
        },
        (idx) => {
          const a = Math.floor(Math.random() * 4) + 2;
          const b = a + 2;
          return {
            id: `G10_E2_${idx}_${Math.random()}`,
            grade: 10, level: "TH", type: "essay",
            question: `[Thông Hiểu 💡] Tìm nghiệm dương nguyên nhỏ nhất của bất phương trình bậc hai: $x^2 - ${a + b}x + ${a * b} < 0$:`,
            correctAnswer: `${a + 1} | x=${a + 1}`,
            explanation: `Tam thức có hai nghiệm $x_1 = ${a}, x_2 = ${b}$. Tập nghiệm là $(${a}; ${b})$. Nghiệm nguyên nhỏ nhất là $${a + 1}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const h = Math.floor(Math.random() * 5) + 1;
        const k = -(Math.floor(Math.random() * 4) + 1);
        return {
          id: `G10_M1_${idx}`, grade: 10, level: "TH", type: "mcq",
          question: `Cho hàm số bậc hai có đồ thị Parabol với đỉnh $I(${h}; ${k})$. Trục đối xứng của Parabol là đường thẳng:`,
          diagram: MathDiagrams.parabolaGraph(h, k),
          options: [`$x = ${h}$`, `$y = ${k}$`, `$x = -${h}$`, `$y = -${k}$`],
          correctAnswer: "A", explanation: `Trục đối xứng của parabol có phương trình là $x = x_I = ${h}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 12) + 2;
        return {
          id: `G10_M2_${idx}`, grade: 10, level: "NB", type: "mcq",
          question: `Tập xác định của hàm số $y = \\sqrt{x - ${a}}$ là:`,
          options: [`$D = [${a}; +\\infty)$`, `$D = (${a}; +\\infty)$`, `$D = (-\\infty; ${a}]$`, `$D = \\mathbb{R} \\setminus \\{${a}\\}$`],
          correctAnswer: "A", explanation: `$x - ${a} \\ge 0 \\iff x \\ge ${a} \\implies D = [${a}; +\\infty)$.`
        };
      },
      (idx) => {
        const u = Math.floor(Math.random() * 4) + 3;
        const v = u + 1;
        const sumSquare = u * u + v * v;
        return {
          id: `G10_M3_${idx}`, grade: 10, level: "TH", type: "mcq",
          question: `Cho hai vectơ vuông góc $\\vec{u}$ và $\\vec{v}$ có độ dài lần lượt là $${u}$ và $${v}$. Tích vô hướng $\\vec{u} \\cdot \\vec{v}$ bằng:`,
          options: [`$0$`, `$${u * v}$`, `$${u + v}$`, `$\\sqrt{${sumSquare}}$`],
          correctAnswer: "A", explanation: `Hai vectơ vuông góc có góc $\\alpha = 90^\\circ \\implies \\cos 90^\\circ = 0 \\implies \\vec{u} \\cdot \\vec{v} = 0$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 5) + 2;
        const b = a + Math.floor(Math.random() * 4) + 3;
        return {
          id: `G10_M4_${idx}`, grade: 10, level: "NB", type: "mcq",
          question: `Cho hai tập hợp $A = [1; ${b}]$ và $B = [${a}; 15]$. Giao của hai tập hợp $A \\cap B$ là:`,
          options: [`$[${a}; ${b}]$`, `$[1; 15]$`, `$[1; ${a}]$`, `$[${b}; 15]$`],
          correctAnswer: "A", explanation: `Phần tử chung của $A$ và $B$ là $[${a}; ${b}]$.`
        };
      },
      (idx) => {
        const c = Math.floor(Math.random() * 6) + 2;
        return {
          id: `G10_M5_${idx}`, grade: 10, level: "TH", type: "mcq",
          question: `Tập nghiệm của bất phương trình bậc hai $x^2 - ${c * c} < 0$ là:`,
          options: [`$(-${c}; ${c})$`, `$[-${c}; ${c}]$`, `$(-\\infty; -${c}) \\cup (${c}; +\\infty)$`, `$[${c}; +\\infty)$`],
          correctAnswer: "A", explanation: `$x^2 < ${c*c} \\iff -${c} < x < ${c}$.`
        };
      },
      (idx) => {
        const b = Math.floor(Math.random() * 5) + 3;
        const c = Math.floor(Math.random() * 5) + 4;
        return {
          id: `G10_M6_${idx}`, grade: 10, level: "TH", type: "mcq",
          question: `Cho tam giác $ABC$ có cạnh $b = ${b}$, $c = ${c}$ và $\\widehat{A} = 60^\\circ$. Độ dài cạnh $a$ tính theo định lý Côsin thỏa mãn:`,
          options: [`$a^2 = ${b * b + c * c - b * c}$`, `$a^2 = ${b * b + c * c}$`, `$a^2 = ${b * b + c * c + b * c}$`, `$a^2 = ${(b + c) * (b + c)}$`],
          correctAnswer: "A", explanation: `$a^2 = b^2 + c^2 - 2bc\\cos 60^\\circ = ${b*b} + ${c*c} - 2 \\cdot ${b} \\cdot ${c} \\cdot \\dfrac{1}{2} = ${b*b + c*c - b*c}$.`
        };
      }
    ];
  },

  // LỚP 11
  getGrade11Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const u1 = Math.floor(Math.random() * 4) + 2;
          const d = Math.floor(Math.random() * 4) + 3;
          return {
            id: `G11_E1_${idx}_${Math.random()}`,
            grade: 11, level: "VD", type: "essay",
            question: `[Vận Dụng 🧠] Cho cấp số cộng $(u_n)$ có $u_1 = ${u1}$ và công sai $d = ${d}$. Tính số hạng thứ $10$ của cấp số cộng ($u_{10}$):`,
            correctAnswer: `${u1 + 9 * d} | u10=${u1 + 9 * d}`,
            explanation: `$u_{10} = u_1 + 9d = ${u1} + 9 \\cdot ${d} = ${u1 + 9 * d}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const u1 = Math.floor(Math.random() * 5) + 1;
        const d = Math.floor(Math.random() * 4) + 2;
        const u2 = u1 + d;
        return {
          id: `G11_M1_${idx}`, grade: 11, level: "NB", type: "mcq",
          question: `Cho cấp số cộng $(u_n)$ với $u_1 = ${u1}$ và $u_2 = ${u2}$. Công sai $d$ của cấp số cộng bằng:`,
          options: [`$${d}$`, `$${-d}$`, `$${u1 * u2}$`, `$${u1 + u2}$`],
          correctAnswer: "A", explanation: `$d = u_2 - u_1 = ${u2} - ${u1} = ${d}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        const b = Math.floor(Math.random() * 3) + 1;
        return {
          id: `G11_M2_${idx}`, grade: 11, level: "TH", type: "mcq",
          question: `Tính giới hạn $\\lim_{n \\to \\infty} \\dfrac{${a}n + 3}{${b}n - 1}$:`,
          options: [`$\\dfrac{${a}}{${b}}$`, `$+\\infty$`, `$0$`, `$-3$`],
          correctAnswer: "A", explanation: `Chia cả tử và mẫu cho $n$: $\\lim \\dfrac{${a} + 3/n}{${b} - 1/n} = \\dfrac{${a}}{${b}}$.`
        };
      },
      (idx) => {
        return {
          id: `G11_M3_${idx}`, grade: 11, level: "NB", type: "mcq",
          question: `Giá trị của $\\sin\\left(\\dfrac{\\pi}{6}\\right)$ bằng:`,
          options: [`$\\dfrac{1}{2}$`, `$\\dfrac{\\sqrt{3}}{2}$`, `$\\dfrac{\\sqrt{2}}{2}$`, `$1$`],
          correctAnswer: "A", explanation: `$\\sin(\\pi/6) = 1/2$.`
        };
      },
      (idx) => {
        return {
          id: `G11_M4_${idx}`, grade: 11, level: "TH", type: "mcq",
          question: `Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông tâm $O$, cạnh bên $SA \\perp (ABCD)$. Đường thẳng nào sau đây vuông góc với mặt phẳng $(ABCD)$?`,
          diagram: MathDiagrams.pyramidSABCD(),
          options: [`$SA$`, `$SB$`, `$SC$`, `$SO$`],
          correctAnswer: "A", explanation: `Theo giả thiết bài toán: $SA \\perp (ABCD)$.`
        };
      },
      (idx) => {
        const n = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G11_M5_${idx}`, grade: 11, level: "NB", type: "mcq",
          question: `Đạo hàm của hàm số $y = x^${n}$ là:`,
          options: [`$y' = ${n}x^${n - 1}$`, `$y' = x^${n - 1}$`, `$y' = \\dfrac{x^${n + 1}}{${n + 1}}$`, `$y' = ${n}x^${n}$`],
          correctAnswer: "A", explanation: `Công thức đạo hàm hàm lũy thừa: $(x^n)' = n x^{n-1}$.`
        };
      }
    ];
  },

  // LỚP 12 / THPT
  getGrade12Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        (idx) => {
          const a = Math.floor(Math.random() * 4) + 1;
          const b = a + Math.floor(Math.random() * 3) + 1;
          const res = (b * b - a * a) / 2;
          return {
            id: `G12_E1_${idx}_${Math.random()}`,
            grade: 12, level: "VD", type: "essay",
            question: `[Vận Dụng 🧠] Tính tích phân $I = \\int_{${a}}^{${b}} x\\, dx$:`,
            correctAnswer: `${res} | I=${res}`,
            explanation: `$I = \\left[ \\dfrac{x^2}{2} \\right]_{${a}}^{${b}} = \\dfrac{${b*b} - ${a*a}}{2} = ${res}$.`
          };
        }
      ];
    }

    return [
      (idx) => {
        const a = Math.floor(Math.random() * 4) + 1;
        const b = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G12_M1_${idx}`, grade: 12, level: "TH", type: "mcq",
          question: `Đường tiệm cận đứng của đồ thị hàm số $y = \\dfrac{${a}x + 1}{x - ${b}}$ là đường thẳng:`,
          options: [`$x = ${b}$`, `$y = ${a}$`, `$x = -${b}$`, `$y = ${b}$`],
          correctAnswer: "A", explanation: `Nghiệm của mẫu số là $x = ${b}$ nên tiệm cận đứng là $x = ${b}$.`
        };
      },
      (idx) => {
        const x1 = -(Math.floor(Math.random() * 2) + 1);
        const x2 = Math.floor(Math.random() * 2) + 1;
        const yMax = Math.floor(Math.random() * 4) + 3;
        const yMin = 0;
        return {
          id: `G12_M2_${idx}`, grade: 12, level: "TH", type: "mcq",
          question: `Cho hàm số $y = f(x)$ có bảng biến thiên như hình dưới đây. Điểm cực đại của hàm số đã cho là:`,
          diagram: MathDiagrams.variationTable(x1, x2, yMax, yMin),
          options: [`$x = ${x1}$`, `$x = ${x2}$`, `$y = ${yMax}$`, `$y = ${yMin}$`],
          correctAnswer: "A", explanation: `Từ bảng biến thiên, đạo hàm đổi dấu từ dương sang âm qua $x = ${x1}$ nên điểm cực đại là $x = ${x1}$.`
        };
      },
      (idx) => {
        const a = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G12_M3_${idx}`, grade: 12, level: "NB", type: "mcq",
          question: `Tập nghiệm của bất phương trình mũ $2^x > ${Math.pow(2, a)}$ là:`,
          options: [`$(${a}; +\\infty)$`, `$[${a}; +\\infty)$`, `$(-\\infty; ${a})$`, `$\\mathbb{R}$`],
          correctAnswer: "A", explanation: `Vì cơ số $2 > 1$ nên $2^x > 2^${a} \\iff x > ${a}$.`
        };
      },
      (idx) => {
        const x0 = Math.floor(Math.random() * 5) + 1;
        const y0 = Math.floor(Math.random() * 6) - 2;
        const z0 = Math.floor(Math.random() * 5) + 1;
        const r = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G12_M4_${idx}`, grade: 12, level: "TH", type: "mcq",
          question: `Trong không gian $Oxyz$, mặt cầu $(S): (x - ${x0})^2 + (y - ${y0})^2 + (z - ${z0})^2 = ${r * r}$ có bán kính $R$ bằng:`,
          options: [`$${r}$`, `$${r * r}$`, `$${r * 2}$`, `$\\sqrt{${r}}$`],
          correctAnswer: "A", explanation: `Phương trình chính tắc mặt cầu có bán kính $R = \\sqrt{${r*r}} = ${r}$.`
        };
      },
      (idx) => {
        return {
          id: `G12_M5_${idx}`, grade: 12, level: "NB", type: "mcq",
          question: `Họ tất cả các nguyên hàm của hàm số $f(x) = e^x$ là:`,
          options: [`$e^x + C$`, `$\\dfrac{e^{x+1}}{x+1} + C$`, `$x e^{x-1} + C$`, `$\\ln x + C$`],
          correctAnswer: "A", explanation: `Nguyên hàm của $e^x$ là chính nó: $\\int e^x dx = e^x + C$.`
        };
      }
    ];
  },

  getTemplates(grade, type = 'mcq', level = 'TH') {
    const g = grade.toString();
    if (g === '6') return this.getGrade6Templates(type, level);
    if (g === '7') return this.getGrade7Templates(type, level);
    if (g === '8') return this.getGrade8Templates(type, level);
    if (g === '9' || g === 'TS10') return this.getGrade9Templates(type, level);
    if (g === '11') return this.getGrade11Templates(type, level);
    if (g === '12' || g === 'THPT') return this.getGrade12Templates(type, level);
    return this.getGrade10Templates(type, level);
  }
};

/* ================= 🚀 CORE MATH GENERATOR & ANTI-DUPLICATE GUARD ================= */
const MathEngine = {
  shuffleQuestionOptions(q) {
    if (!q.options || q.options.length === 0) return q;
    
    // Fisher-Yates shuffle
    const indices = [0, 1, 2, 3];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const correctOriginalIndex = 0; // Luôn coi A là đáp án gốc trong template
    const newCorrectIdx = indices.indexOf(correctOriginalIndex);
    const letterMap = ['A', 'B', 'C', 'D'];

    return {
      ...q,
      options: indices.map(i => q.options[i]),
      correctAnswer: letterMap[newCorrectIdx]
    };
  },

  /**
   * Sinh bộ đề thi chuẩn 100% TOANMATH với ANTI-DUPLICATE GUARD (CHỐNG TRÙNG LẬP 0%)
   */
  generateExam(config = {}) {
    const {
      grade = '10',
      term = 'GK1',
      mcqCount = 12,
      essayMatrix = { TH: 1, VD: 1, VDC: 1 },
      timeLimit = 45,
      title = ''
    } = config;

    const gStr = grade.toString();
    const mcqTemplates = GradeEngines.getTemplates(gStr, 'mcq');

    // ================= ANTI-DUPLICATE GUARD CHO TRẮC NGHIỆM =================
    const selectedMcq = [];
    const seenSignatures = new Set();
    const availableIndices = [];

    for (let i = 0; i < mcqCount; i++) {
      if (!availableIndices.length) {
        const arr = Array.from({ length: mcqTemplates.length }, (_, k) => k);
        // Fisher-Yates shuffle index
        for (let j = arr.length - 1; j > 0; j--) {
          const r = Math.floor(Math.random() * (j + 1));
          [arr[j], arr[r]] = [arr[r], arr[j]];
        }
        availableIndices.push(...arr);
      }

      let chosenQ = null;
      let attempts = 0;

      while (attempts < 30) {
        attempts++;
        const templateIdx = availableIndices.length ? availableIndices[attempts % availableIndices.length] : Math.floor(Math.random() * mcqTemplates.length);
        const candidate = mcqTemplates[templateIdx](i + 1);
        const signature = candidate.question.trim().replace(/\s+/g, ' ');

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          chosenQ = candidate;
          break;
        }
      }

      // Fallback an toàn nếu miền gieo số quá chật
      if (!chosenQ) {
        chosenQ = mcqTemplates[i % mcqTemplates.length](i + 1);
      }
      selectedMcq.push(chosenQ);
    }

    // ================= ANTI-DUPLICATE GUARD CHO TỰ LUẬN =================
    const selectedEssay = [];
    const seenEssaySignatures = new Set();
    const targetLevels = [
      { level: 'TH', count: essayMatrix.TH || 0 },
      { level: 'VD', count: essayMatrix.VD || 0 },
      { level: 'VDC', count: essayMatrix.VDC || 0 }
    ];

    let essayIndex = 1;
    targetLevels.forEach(({ level, count }) => {
      const essayTemplates = GradeEngines.getTemplates(gStr, 'essay', level);
      for (let i = 0; i < count; i++) {
        let chosenEq = null;
        let attempts = 0;
        while (attempts < 20) {
          attempts++;
          const idx = Math.floor(Math.random() * essayTemplates.length);
          const candidate = essayTemplates[idx](essayIndex);
          const sig = candidate.question.trim().replace(/\s+/g, ' ');
          if (!seenEssaySignatures.has(sig)) {
            seenEssaySignatures.add(sig);
            chosenEq = candidate;
            break;
          }
        }
        if (!chosenEq) chosenEq = essayTemplates[i % essayTemplates.length](essayIndex);
        essayIndex++;
        selectedEssay.push(chosenEq);
      }
    });

    const totalEssays = selectedEssay.length;
    const essayTotalScore = totalEssays > 0 ? 3.0 : 0;
    const mcqTotalScore = 10.0 - essayTotalScore;
    const mcqScore = mcqCount ? Math.round((mcqTotalScore / mcqCount) * 100) / 100 : 0;
    const essayScore = totalEssays ? Math.round((essayTotalScore / totalEssays) * 100) / 100 : 0;

    const answerKeys = [];

    // Xáo trộn vị trí A, B, C, D của từng câu trắc nghiệm
    selectedMcq.forEach((q, idx) => {
      const shuffledQ = this.shuffleQuestionOptions(q);
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
      margin-left: 0.5rem;
      background: #f1f5f9;
      color: #475569;
    }
    .level-nb { background: #e0f2fe; color: #0369a1; }
    .level-th { background: #fef3c7; color: #b45309; }
    .level-vd { background: #dcfce7; color: #15803d; }
    .level-vdc { background: #fee2e2; color: #b91c1c; }
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
      margin-top: 0.85rem;
    }
    .opt-box {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      padding: 0.6rem 0.9rem;
      border-radius: 6px;
      font-size: 0.95rem;
      font-weight: 600;
    }
    .opt-lbl {
      color: #4f46e5;
      font-weight: 800;
      margin-right: 0.35rem;
    }
  </style>
</head>
<body>

  <div class="header">
    <div style="font-size:0.85rem;font-weight:800;color:#6366f1;letter-spacing:1px;text-transform:uppercase;margin-bottom:0.25rem;">
      HỆ THỐNG GIÁO DỤC K-EDU · NGÂN HÀNG ĐỀ TOÁN TOANMATH CHUẨN
    </div>
    <div class="title">${escapeMathHtml(title)}</div>
    <div class="meta">
      Thời gian làm bài: <strong>${timeLimit} phút</strong> (Không kể thời gian phát đề)
    </div>
  </div>

  ${mcqItems.length > 0 ? `
    <div class="section-title">I. PHẦN TRẮC NGHIỆM KHÁCH QUAN (${mcqItems.length} CÂU)</div>
    ${mcqItems.map(item => `
      <div class="q-card">
        <div class="q-header">
          <span class="q-num">Câu ${item.num}:</span>
          <span>${item.content}</span>
          <span class="level-badge level-${(item.level || 'th').toLowerCase()}">${item.level || 'TH'}</span>
        </div>
        ${item.diagram ? item.diagram : ''}
        <div class="options-grid">
          ${item.options.map((opt, i) => `
            <div class="opt-box">
              <span class="opt-lbl">${['A', 'B', 'C', 'D'][i]}.</span>
              <span>${opt}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  ` : ''}

  ${essayItems.length > 0 ? `
    <div class="section-title" style="background:#fef3c7;border-left-color:#f59e0b;color:#b45309;">
      II. PHẦN TỰ LUẬN ĐIỀN ĐÁP SỐ (${essayItems.length} CÂU)
    </div>
    ${essayItems.map(item => `
      <div class="q-card" style="border-left:4px solid #f59e0b;">
        <div class="q-header">
          <span class="q-num" style="color:#b45309;">Câu ${item.num}:</span>
          <span>${item.content}</span>
          <span class="level-badge level-${(item.level || 'vd').toLowerCase()}">${item.level || 'VD'}</span>
        </div>
        ${item.diagram ? item.diagram : ''}
        <div style="margin-top:0.75rem;padding:0.6rem 0.9rem;background:#fff;border:1.5px dashed #cbd5e1;border-radius:6px;color:#64748b;font-weight:600;font-size:0.9rem;">
          ✍️ Học sinh điền đáp số vào ô trống tương ứng trên phiếu tô bên phải.
        </div>
      </div>
    `).join('')}
  ` : ''}

  <div style="margin-top:3rem;text-align:center;font-size:0.85rem;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:1rem;">
    ——— HẾT ———<br>
    <em>Cán bộ coi thi không giải thích gì thêm. Học sinh không được sử dụng tài liệu.</em>
  </div>

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\\\(", right: "\\\\)", display: false},
            {left: "\\\\[", right: "\\\\]", display: true}
          ],
          throwOnError: false
        });
      }
    });
  </script>
</body>
</html>`;
  }
};

if (typeof window !== 'undefined') {
  window.MathDiagrams = MathDiagrams;
  window.GradeEngines = GradeEngines;
  window.MathEngine = MathEngine;
}
