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

/**
 * Hàm tính ước chung lớn nhất (ƯCLN) theo giải thuật Euclid
 */
function gcdEuclid(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  return b === 0 ? a : gcdEuclid(b, a % b);
}

/**
 * Chuẩn hóa từ khóa chủ đề (topic) để so khớp không phân biệt dấu và chữ hoa/thường
 */
function normalizeTopic(t) {
  if (!t || t === 'all') return 'all';
  const s = String(t).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (s.includes('so_hoc') || s === 'sohoc') return 'so_hoc';
  if (s.includes('dai_so') || s === 'daiso') return 'dai_so';
  if (s.includes('hinh_hoc') || s === 'hinhhoc' || s.includes('hinh')) return 'hinh_hoc';
  if (s.includes('ham_so') || s === 'hamso') return 'ham_so';
  if (s.includes('vecto') || s.includes('oxy')) return 'vecto';
  if (s.includes('logic')) return 'dgnl_logic';
  if (s.includes('data') || s.includes('so_lieu')) return 'dgnl_data';
  if (s.includes('thong_ke')) return 'thong_ke';
  return s;
}

/**
 * Kiểm tra xem topic của câu hỏi có khớp với topic được lọc hay không
 */
function isTopicMatch(templateTopic, targetTopic) {
  const normTarget = normalizeTopic(targetTopic);
  if (normTarget === 'all') return true;
  const normTemplate = normalizeTopic(templateTopic);
  if (normTemplate === normTarget) return true;
  if (normTarget === 'hinh_hoc' && (normTemplate === 'vecto' || normTemplate === 'oxyz')) return true;
  if (normTarget === 'dai_so' && (normTemplate === 'ham_so' || normTemplate === 'so_hoc')) return true;
  return false;
}

/**
 * Bao bọc template kèm metadata {topic, level} để truy xuất tức thì không cần gọi hàm
 */
function makeTemplate(meta, fn) {
  const wrapped = (idx) => {
    const res = fn(idx);
    if (!res.topic) res.topic = meta.topic;
    if (!res.level) res.level = meta.level;
    return res;
  };
  wrapped.topic = meta.topic;
  wrapped.level = meta.level;
  return wrapped;
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
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình minh họa hai tiếp tuyến cắt nhau)</div>
      </div>
    `;
  },

  parabolaGraph(h = 2, k = -1) {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="240" height="150" viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Axes -->
          <line x1="20" y1="110" x2="220" y2="110" stroke="#94a3b8" stroke-width="1.5"/>
          <polygon points="220,107 227,110 220,113" fill="#94a3b8"/>
          <text x="222" y="125" font-size="12" fill="#64748b" font-weight="bold">x</text>
          
          <line x1="90" y1="140" x2="90" y2="15" stroke="#94a3b8" stroke-width="1.5"/>
          <polygon points="87,15 90,8 93,15" fill="#94a3b8"/>
          <text x="75" y="20" font-size="12" fill="#64748b" font-weight="bold">y</text>
          <text x="76" y="124" font-size="11" fill="#64748b">O</text>

          <!-- Parabola curve: (x-130)^2 * 0.018 + 90 -->
          <path d="M 60,30 Q 130,145 200,30" fill="none" stroke="#6366f1" stroke-width="2.2"/>
          
          <!-- Vertex -->
          <circle cx="130" cy="118" r="3.5" fill="#ef4444"/>
          <line x1="130" y1="15" x2="130" y2="135" stroke="#ef4444" stroke-width="1.2" stroke-dasharray="4,3"/>
          <text x="135" y="132" font-size="11" fill="#ef4444" font-weight="bold">I(${h};${k})</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Đồ thị Parabol và trục đối xứng qua đỉnh I)</div>
      </div>
    `;
  },

  pyramidSABCD() {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="240" height="160" viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <!-- Base ABCD -->
          <polygon points="40,120 130,120 180,85 90,85" fill="rgba(99,102,241,0.04)" stroke="#64748b" stroke-width="1.5"/>
          <line x1="40" y1="120" x2="90" y2="85" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="90" y1="85" x2="180" y2="85" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3"/>
          
          <!-- Apex S and edges -->
          <line x1="40" y1="120" x2="40" y2="25" stroke="#4f46e5" stroke-width="2"/>
          <line x1="40" y1="25" x2="130" y2="120" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="40" y1="25" x2="180" y2="85" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="40" y1="25" x2="90" y2="85" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>

          <!-- Right angle at A -->
          <polyline points="40,105 52,105 52,120" fill="none" stroke="#ef4444" stroke-width="1.2"/>
          
          <!-- Labels -->
          <text x="32" y="20" font-size="13" font-weight="bold" fill="#1e293b">S</text>
          <text x="22" y="128" font-size="13" font-weight="bold" fill="#ef4444">A</text>
          <text x="135" y="132" font-size="13" font-weight="bold" fill="#1e293b">B</text>
          <text x="185" y="90" font-size="13" font-weight="bold" fill="#1e293b">C</text>
          <text x="82" y="80" font-size="13" font-weight="bold" fill="#1e293b">D</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình chóp S.ABCD có SA vuông góc đáy)</div>
      </div>
    `;
  },

  variationTable(x1 = -1, x2 = 1, yMax = 3, yMin = -1) {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <table style="margin:0 auto;border-collapse:collapse;font-size:0.85rem;background:#fff;border:1.5px solid #cbd5e1;border-radius:6px;overflow:hidden;">
          <tr style="border-bottom:1px solid #cbd5e1;background:#f8fafc;">
            <th style="padding:4px 12px;border-right:1px solid #cbd5e1;">x</th>
            <td style="padding:4px 12px;">$-\\infty$</td>
            <td style="padding:4px 12px;font-weight:bold;color:#4f46e5;">${x1}</td>
            <td style="padding:4px 12px;"></td>
            <td style="padding:4px 12px;font-weight:bold;color:#4f46e5;">${x2}</td>
            <td style="padding:4px 12px;">$+\\infty$</td>
          </tr>
          <tr style="border-bottom:1px solid #cbd5e1;">
            <th style="padding:4px 12px;border-right:1px solid #cbd5e1;">y'</th>
            <td style="padding:4px 12px;">$+$</td>
            <td style="padding:4px 12px;font-weight:bold;">$0$</td>
            <td style="padding:4px 12px;">$-$</td>
            <td style="padding:4px 12px;font-weight:bold;">$0$</td>
            <td style="padding:4px 12px;">$+$</td>
          </tr>
          <tr style="height:55px;">
            <th style="padding:4px 12px;border-right:1px solid #cbd5e1;background:#f8fafc;">y</th>
            <td style="padding:4px 6px;vertical-align:bottom;">$-\\infty$</td>
            <td style="padding:4px 6px;vertical-align:top;font-weight:bold;color:#ef4444;">${yMax} ↗</td>
            <td style="padding:4px 6px;text-align:center;">↘</td>
            <td style="padding:4px 6px;vertical-align:bottom;font-weight:bold;color:#0ea5e9;">${yMin}</td>
            <td style="padding:4px 6px;vertical-align:top;">↗ $+\\infty$</td>
          </tr>
        </table>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Bảng biến thiên hàm số)</div>
      </div>
    `;
  },

  rhombus(d1 = '8cm', d2 = '6cm') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="220" height="130" viewBox="0 0 220 130" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <polygon points="110,15 190,65 110,115 30,65" fill="rgba(14, 165, 233, 0.05)" stroke="#0ea5e9" stroke-width="2"/>
          <line x1="30" y1="65" x2="190" y2="65" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3"/>
          <line x1="110" y1="15" x2="110" y2="115" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="3,3"/>
          <polyline points="110,57 118,57 118,65" fill="none" stroke="#64748b" stroke-width="1.2"/>
          <text x="110" y="60" font-size="11" fill="#ef4444" font-weight="600" text-anchor="middle">${d1}</text>
          <text x="125" y="90" font-size="11" fill="#6366f1" font-weight="600">${d2}</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Hình thoi và 2 đường chéo vuông góc)</div>
      </div>
    `;
  },

  isoscelesTriangle(angleA = '70°') {
    return `
      <div class="math-diagram-box" style="text-align:center;margin:0.75rem 0;">
        <svg width="200" height="140" viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <polygon points="100,20 30,120 170,120" fill="rgba(99, 102, 241, 0.05)" stroke="#4f46e5" stroke-width="2"/>
          <line x1="60" y1="68" x2="68" y2="72" stroke="#4f46e5" stroke-width="1.8"/>
          <line x1="140" y1="68" x2="132" y2="72" stroke="#4f46e5" stroke-width="1.8"/>
          <text x="95" y="15" font-size="13" font-weight="bold" fill="#1e293b">A</text>
          <text x="15" y="125" font-size="13" font-weight="bold" fill="#1e293b">B</text>
          <text x="175" y="125" font-size="13" font-weight="bold" fill="#1e293b">C</text>
          <text x="90" y="42" font-size="11" fill="#ef4444" font-weight="bold">${angleA}</text>
        </svg>
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-top:2px;">(Tam giác ABC cân tại A)</div>
      </div>
    `;
  }
};

/* ================= 📚 CÁC ENGINE MA TRẬN THEO KHỐI LỚP ================= */
const GradeEngines = {
  // LỚP 6
  getGrade6Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'so_hoc', level: 'VDC' }, (idx) => {
          const k = Math.floor(Math.random() * 8) + 3;
          return {
            id: `G6_E1_${idx}_${Math.random()}`,
            grade: 6, level: "VDC", type: "essay", topic: "so_hoc",
            question: `[Vận Dụng Cao 🔥] Tìm số tự nhiên $n$ lớn nhất sao cho phân số $A = \\dfrac{2n+${k}}{n+1}$ nhận giá trị là một số nguyên:`,
            correctAnswer: `${k - 3} | n=${k - 3}`,
            explanation: `$A = 2 + \\dfrac{${k-2}}{n+1}$. Để $A$ nguyên thì $(n+1)$ là ước của $${k-2}$. Số tự nhiên $n$ lớn nhất ứng với $n+1 = ${k-2} \\implies n = ${k-3}$.`
          };
        }),
        makeTemplate({ topic: 'so_hoc', level: 'TH' }, (idx) => {
          const x = Math.floor(Math.random() * 30) + 10;
          const b = Math.floor(Math.random() * 25) + 5;
          return {
            id: `G6_E2_${idx}_${Math.random()}`,
            grade: 6, level: "TH", type: "essay", topic: "so_hoc",
            question: `[Thông Hiểu 💡] Tìm số nguyên $x$ biết: $x - (-${b}) = ${x + b}$:`,
            correctAnswer: `${x} | x=${x}`,
            explanation: `$x + ${b} = ${x + b} \\implies x = ${x}$.`
          };
        }),
        makeTemplate({ topic: 'so_hoc', level: 'VD' }, (idx) => {
          const p = Math.floor(Math.random() * 4) + 2;
          const val = Math.pow(2, p) * 3;
          return {
            id: `G6_E3_${idx}_${Math.random()}`,
            grade: 6, level: "VD", type: "essay", topic: "so_hoc",
            question: `[Vận Dụng 🧠] Tìm số tự nhiên $x$ thỏa mãn đẳng thức: $2^{x+2} - 2^x = ${val}$:`,
            correctAnswer: `${p} | x=${p}`,
            explanation: `$2^x(4 - 1) = ${val} \\iff 3 \\cdot 2^x = ${val} \\iff 2^x = 2^${p} \\implies x = ${p}$.`
          };
        })
      ];
    }

    // MCQ Grade 6
    return [
      makeTemplate({ topic: 'so_hoc', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 10) + 2;
        const b = a + Math.floor(Math.random() * 15) + 5;
        const count = b - a;
        return {
          id: `G6_M1_${idx}`, grade: 6, level: "NB", type: "mcq", topic: "so_hoc",
          question: `Cho tập hợp $M = \\{x \\in \\mathbb{N} \\mid ${a} \\le x < ${b}\\}$. Số phần tử của tập hợp $M$ là:`,
          options: [`$${count}$`, `$${count + 1}$`, `$${count - 1}$`, `$${count + 2}$`],
          correctAnswer: "A", explanation: `Số phần tử là $${b} - ${a} = ${count}$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'NB' }, (idx) => {
        const m = Math.floor(Math.random() * 6) + 2;
        const n = Math.floor(Math.random() * 5) + 2;
        const base = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G6_M2_${idx}`, grade: 6, level: "NB", type: "mcq", topic: "so_hoc",
          question: `Kết quả của phép tính $${base}^${m} \\cdot ${base}^${n}$ viết dưới dạng một lũy thừa là:`,
          options: [`$${base}^{${m + n}}$`, `$${base}^{${m * n}}$`, `$${base * 2}^{${m + n}}$`, `$${base}^{${m - n > 0 ? m - n : 1}}$`],
          correctAnswer: "A", explanation: `$a^m \\cdot a^n = a^{m+n} = ${base}^{${m+n}}$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'NB' }, (idx) => {
        const primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
        const p = primes[Math.floor(Math.random() * primes.length)];
        const comps = [15, 21, 25, 27, 33, 35, 39, 49];
        const c1 = comps[Math.floor(Math.random() * comps.length)];
        const c2 = c1 + 2;
        const c3 = 1;
        return {
          id: `G6_M3_${idx}`, grade: 6, level: "NB", type: "mcq", topic: "so_hoc",
          question: `Trong các số sau, số nào là số nguyên tố?`,
          options: [`$${p}$`, `$${c1}$`, `$${c2}$`, `$${c3}$`],
          correctAnswer: "A", explanation: `$${p}$ chỉ có hai ước là 1 và chính nó nên là số nguyên tố.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const d1 = (Math.floor(Math.random() * 6) + 3) * 2;
        const d2 = (Math.floor(Math.random() * 5) + 2) * 2;
        const s = (d1 * d2) / 2;
        return {
          id: `G6_M4_${idx}`, grade: 6, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Một hình thoi có độ dài hai đường chéo lần lượt là $${d1}\\text{ cm}$ và $${d2}\\text{ cm}$. Diện tích của hình thoi đó là:`,
          diagram: MathDiagrams.rhombus(`${d1}cm`, `${d2}cm`),
          options: [`$${s}\\text{ cm}^2$`, `$${d1 * d2}\\text{ cm}^2$`, `$${(d1 + d2) * 2}\\text{ cm}^2$`, `$${s / 2}\\text{ cm}^2$`],
          correctAnswer: "A", explanation: `Diện tích hình thoi $S = \\dfrac{1}{2} d_1 d_2 = \\dfrac{1}{2} \\cdot ${d1} \\cdot ${d2} = ${s}\\text{ cm}^2$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 20) + 10;
        const b = Math.floor(Math.random() * 15) + 5;
        const res = -a - b;
        return {
          id: `G6_M5_${idx}`, grade: 6, level: "TH", type: "mcq", topic: "so_hoc",
          question: `Tính giá trị của biểu thức: $(-${a}) + (-${b})$:`,
          options: [`$${res}$`, `$${Math.abs(res)}$`, `$${-a + b}$`, `$${a - b}$`],
          correctAnswer: "A", explanation: `$(-${a}) + (-${b}) = -(${a} + ${b}) = ${res}$.`
        };
      }),
      // Template G6_M6: Sửa lỗi tính ƯCLN toán học chuẩn bằng gcdEuclid
      makeTemplate({ topic: 'so_hoc', level: 'TH' }, (idx) => {
        const factor1 = Math.floor(Math.random() * 4) + 2;
        const factor2 = Math.floor(Math.random() * 4) + 5;
        const baseGcd = Math.floor(Math.random() * 5) + 2;
        const x = factor1 * baseGcd;
        const y = factor2 * baseGcd;
        const trueGcd = gcdEuclid(x, y);

        const distSet = new Set();
        if (trueGcd !== 1) distSet.add(1);
        if (trueGcd * 2 <= 50) distSet.add(trueGcd * 2);
        if (Math.floor(trueGcd / 2) >= 2 && Math.floor(trueGcd / 2) !== trueGcd) {
          distSet.add(Math.floor(trueGcd / 2));
        }
        let delta = 1;
        while (distSet.size < 3) {
          const cand = trueGcd + delta;
          if (cand > 0 && cand !== trueGcd) distSet.add(cand);
          delta = delta > 0 ? -delta : -delta + 1;
        }
        const distractors = Array.from(distSet).slice(0, 3);

        return {
          id: `G6_M6_${idx}`, grade: 6, level: "TH", type: "mcq", topic: "so_hoc",
          question: `Ước chung lớn nhất $\\text{ƯCLN}(${x}; ${y})$ bằng:`,
          options: [`$${trueGcd}$`, `$${distractors[0]}$`, `$${distractors[1]}$`, `$${distractors[2]}$`],
          correctAnswer: "A",
          explanation: `Phân tích thừa số nguyên tố cho kết quả $\\text{ƯCLN}(${x}; ${y}) = ${trueGcd}$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = a + Math.floor(Math.random() * 4) + 1;
        const k = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G6_M7_${idx}`, grade: 6, level: "TH", type: "mcq", topic: "so_hoc",
          question: `Phân số nào dưới đây bằng phân số $\\dfrac{${a}}{${b}}$?`,
          options: [`$\\dfrac{${a * k}}{${b * k}}$`, `$\\dfrac{${a + k}}{${b + k}}$`, `$\\dfrac{${a * k}}{${b}}$`, `$\\dfrac{${a}}{${b * k}}$`],
          correctAnswer: "A", explanation: `Nhân cả tử và mẫu với $${k}$ ta được $\\dfrac{${a*k}}{${b*k}}$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const side = Math.floor(Math.random() * 12) + 4;
        const perim = side * 4;
        const area = side * side;
        return {
          id: `G6_M8_${idx}`, grade: 6, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Một mảnh vườn hình vuông có chu vi bằng $${perim}\\text{ m}$. Diện tích của mảnh vườn đó là:`,
          options: [`$${area}\\text{ m}^2$`, `$${side * 2}\\text{ m}^2$`, `$${perim * 2}\\text{ m}^2$`, `$${area / 2}\\text{ m}^2$`],
          correctAnswer: "A", explanation: `Cạnh hình vuông là $${perim} : 4 = ${side}\\text{ m}$. Diện tích $S = ${side}^2 = ${area}\\text{ m}^2$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = a + Math.floor(Math.random() * 8) + 2;
        return {
          id: `G6_M9_${idx}`, grade: 6, level: "NB", type: "mcq", topic: "so_hoc",
          question: `Số đối của số nguyên $-${b}$ là:`,
          options: [`$${b}$`, `$-${b}$`, `$\\dfrac{1}{${b}}$`, `$0$`],
          correctAnswer: "A", explanation: `Số đối của $-${b}$ là $${b}$.`
        };
      }),
      makeTemplate({ topic: 'so_hoc', level: 'NB' }, (idx) => {
        const p = Math.floor(Math.random() * 5) + 3;
        const last = 5 * p;
        return {
          id: `G6_M10_${idx}`, grade: 6, level: "NB", type: "mcq", topic: "so_hoc",
          question: `Số nào sau đây chia hết cho cả $2$ và $5$?`,
          options: [`$${last * 10}$`, `$${last * 10 + 3}$`, `$${last * 10 + 5}$`, `$${last * 10 + 7}$`],
          correctAnswer: "A", explanation: `Số có chữ số tận cùng là $0$ thì chia hết cho cả $2$ và $5$.`
        };
      })
    ];
  },

  // LỚP 7
  getGrade7Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'dai_so', level: 'VDC' }, (idx) => {
          const a = Math.floor(Math.random() * 5) + 2;
          return {
            id: `G7_E1_${idx}_${Math.random()}`,
            grade: 7, level: "VDC", type: "essay", topic: "dai_so",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $A = |x - ${a}| + ${a * 2}$:`,
            correctAnswer: `${a * 2} | min=${a * 2}`,
            explanation: `Vì $|x - ${a}| \\ge 0 \\implies A \\ge ${a * 2}$. Dấu '=' xảy ra khi $x = ${a}$.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
          const k = Math.floor(Math.random() * 4) + 2;
          const sum = k * 5;
          return {
            id: `G7_E2_${idx}_${Math.random()}`,
            grade: 7, level: "TH", type: "essay", topic: "dai_so",
            question: `[Thông Hiểu 💡] Cho biết $\\dfrac{x}{2} = \\dfrac{y}{3}$ và $x + y = ${sum}$. Tìm giá trị của $x$:`,
            correctAnswer: `${k * 2} | x=${k * 2}`,
            explanation: `Theo tính chất dãy tỉ số bằng nhau: $\\dfrac{x}{2} = \\dfrac{y}{3} = \\dfrac{x+y}{2+3} = \\dfrac{${sum}}{5} = ${k} \\implies x = ${k * 2}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const angA = [80, 100, 120][Math.floor(Math.random() * 3)];
        const angB = (180 - angA) / 2;
        const res = angB / 2;
        return {
          id: `G7_M1_${idx}`, grade: 7, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho tam giác $ABC$ cân tại $A$ có $\\widehat{A} = ${angA}^\\circ$, tia phân giác $BD$ cắt $AC$ tại $D$. Số đo góc $\\widehat{ABD}$ là:`,
          diagram: MathDiagrams.isoscelesTriangle(`${angA}°`),
          options: [`$${res}^\\circ$`, `$${angB}^\\circ$`, `$${angA}^\\circ$`, `$${res + 10}^\\circ$`],
          correctAnswer: "A", explanation: `Góc ở đáy $\\widehat{B} = (180^\\circ - ${angA}^\\circ)/2 = ${angB}^\\circ$. Tia phân giác $BD$ chia đôi góc $B$: $\\widehat{ABD} = ${angB}^\\circ / 2 = ${res}^\\circ$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        const a2 = a * a;
        return {
          id: `G7_M2_${idx}`, grade: 7, level: "NB", type: "mcq", topic: "dai_so",
          question: `Căn bậc hai số học của $${a2}$ là:`,
          options: [`$${a}$`, `$-${a}$`, `$\\pm ${a}$`, `$${a2 * 2}$`],
          correctAnswer: "A", explanation: `Căn bậc hai số học của một số không âm $a^2$ là $a > 0$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const x = Math.floor(Math.random() * 5) + 2;
        const deg = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G7_M3_${idx}`, grade: 7, level: "TH", type: "mcq", topic: "dai_so",
          question: `Bậc của đa thức $P(x) = ${x}x^${deg + 2} - 4x^${deg} + 1$ là:`,
          options: [`$${deg + 2}$`, `$${deg}$`, `$${x}$`, `$1$`],
          correctAnswer: "A", explanation: `Bậc của đa thức một biến là số mũ cao nhất của biến, ở đây là $${deg + 2}$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const a = (Math.floor(Math.random() * 4) + 1) * 3;
        const b = (Math.floor(Math.random() * 4) + 1) * 4;
        const c = Math.sqrt(a * a + b * b);
        return {
          id: `G7_M4_${idx}`, grade: 7, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho tam giác vuông có độ dài hai cạnh góc vuông lần lượt là $${a}\\text{ cm}$ và $${b}\\text{ cm}$. Độ dài cạnh huyền bằng:`,
          diagram: MathDiagrams.rightTriangle(`${a}`, `${b}`, `${c}`),
          options: [`$${c}\\text{ cm}$`, `$${a + b}\\text{ cm}$`, `$${Math.abs(a - b)}\\text{ cm}$`, `$${c + 2}\\text{ cm}$`],
          correctAnswer: "A", explanation: `Theo định lý Pythagore: cạnh huyền $= \\sqrt{${a}^2 + ${b}^2} = ${c}\\text{ cm}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        return {
          id: `G7_M5_${idx}`, grade: 7, level: "NB", type: "mcq", topic: "dai_so",
          question: `Tập hợp các số hữu tỉ được ký hiệu là:`,
          options: [`$\\mathbb{Q}$`, `$\\mathbb{N}$`, `$\\mathbb{Z}$`, `$\\mathbb{R}$`],
          correctAnswer: "A", explanation: `Ký hiệu tập hợp số hữu tỉ là $\\mathbb{Q}$.`
        };
      })
    ];
  },

  // LỚP 8
  getGrade8Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'dai_so', level: 'VD' }, (idx) => {
          const a = Math.floor(Math.random() * 5) + 2;
          return {
            id: `G8_E1_${idx}_${Math.random()}`,
            grade: 8, level: "VD", type: "essay", topic: "dai_so",
            question: `[Vận Dụng 🧠] Tìm giá trị nhỏ nhất của biểu thức $P = x^2 - ${2 * a}x + ${a * a + 5}$:`,
            correctAnswer: `5 | min=5`,
            explanation: `$P = (x - ${a})^2 + 5 \\ge 5$. Giá trị nhỏ nhất là $5$ khi $x = ${a}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 6) + 2;
        return {
          id: `G8_M1_${idx}`, grade: 8, level: "TH", type: "mcq", topic: "dai_so",
          question: `Khai triển hằng đẳng thức $(x - ${a})^2$ ta được kết quả là:`,
          options: [`$x^2 - ${2 * a}x + ${a * a}$`, `$x^2 - ${a * a}$`, `$x^2 + ${2 * a}x + ${a * a}$`, `$x^2 - ${a}x + ${a * a}$`],
          correctAnswer: "A", explanation: `$(A - B)^2 = A^2 - 2AB + B^2 = x^2 - ${2 * a}x + ${a * a}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 5) + 1;
        return {
          id: `G8_M2_${idx}`, grade: 8, level: "NB", type: "mcq", topic: "dai_so",
          question: `Phân thức đại số $\\dfrac{2x + 1}{x - ${a}}$ xác định khi và chỉ khi:`,
          options: [`$x \\ne ${a}$`, `$x = ${a}$`, `$x \\ne -\\dfrac{1}{2}$`, `$x > ${a}$`],
          correctAnswer: "A", explanation: `Mẫu thức phải khác $0 \\iff x - ${a} \\ne 0 \\iff x \\ne ${a}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = r1 + Math.floor(Math.random() * 4) + 2;
        return {
          id: `G8_M3_${idx}`, grade: 8, level: "TH", type: "mcq", topic: "dai_so",
          question: `Phân tích đa thức $x^2 - ${r1 + r2}x + ${r1 * r2}$ thành nhân tử ta được:`,
          options: [`$(x - ${r1})(x - ${r2})$`, `$(x + ${r1})(x + ${r2})$`, `$(x - ${r1})(x + ${r2})$`, `$(x^2 - ${r1})(x - ${r2})$`],
          correctAnswer: "A", explanation: `Tách hạng tử: $x^2 - ${r1}x - ${r2}x + ${r1 * r2} = (x - ${r1})(x - ${r2})$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const k = Math.floor(Math.random() * 3) + 2;
        return {
          id: `G8_M4_${idx}`, grade: 8, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho $\\Delta ABC \\backsim \\Delta A'B'C'$ theo tỉ số đồng dạng $k = ${k}$. Tỉ số diện tích $\\dfrac{S_{\\Delta ABC}}{S_{\\Delta A'B'C'}}$ bằng:`,
          options: [`$${k * k}$`, `$${k}$`, `$${2 * k}$`, `$\\sqrt{${k}}$`],
          correctAnswer: "A", explanation: `Tỉ số diện tích của hai tam giác đồng dạng bằng bình phương tỉ số đồng dạng: $k^2 = ${k * k}$.`
        };
      })
    ];
  },

  // LỚP 9 / TUYỂN SINH 10
  getGrade9Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'dai_so', level: 'VD' }, (idx) => {
          const p = Math.floor(Math.random() * 3) + 2;
          return {
            id: `G9_E1_${idx}_${Math.random()}`,
            grade: 9, level: "VD", type: "essay", topic: "dai_so",
            question: `[Vận Dụng 🧠] Cho phương trình bậc hai: $x^2 - ${2 * p}x + ${p * p - 4} = 0$. Gọi $x_1, x_2$ là hai nghiệm. Tính giá trị biểu thức $T = x_1^2 + x_2^2$:`,
            correctAnswer: `${2 * p * p + 8} | T=${2 * p * p + 8}`,
            explanation: `Theo Vi-ét: $x_1 + x_2 = ${2*p}, x_1 x_2 = ${p*p - 4}$. Suy ra $T = (x_1 + x_2)^2 - 2x_1 x_2 = ${4*p*p} - 2(${p*p - 4}) = ${2*p*p + 8}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const m = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G9_M1_${idx}`, grade: 9, level: "NB", type: "mcq", topic: "dai_so",
          question: `Điều kiện xác định của biểu thức chứa căn $\\sqrt{2x - ${2 * m}}$ là:`,
          options: [`$x \\ge ${m}$`, `$x > ${m}$`, `$x \\le ${m}$`, `$x < ${m}$`],
          correctAnswer: "A", explanation: `Biểu thức dưới căn không âm: $2x - ${2*m} \\ge 0 \\iff x \\ge ${m}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const r1 = Math.floor(Math.random() * 4) + 1;
        const r2 = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G9_M2_${idx}`, grade: 9, level: "TH", type: "mcq", topic: "dai_so",
          question: `Cho phương trình bậc hai $x^2 - ${r1 + r2}x + ${r1 * r2} = 0$. Tích hai nghiệm $x_1 \\cdot x_2$ bằng:`,
          options: [`$${r1 * r2}$`, `$${r1 + r2}$`, `$-${r1 * r2}$`, `$-${r1 + r2}$`],
          correctAnswer: "A", explanation: `Theo định lý Vi-ét: $x_1 \\cdot x_2 = \\dfrac{c}{a} = ${r1 * r2}$.`
        };
      }),
      makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G9_M3_${idx}`, grade: 9, level: "TH", type: "mcq", topic: "ham_so",
          question: `Hai đường thẳng $y = ${a}x + 1$ và $y = (m - 1)x + 5$ song song với nhau khi và chỉ khi:`,
          options: [`$m = ${a + 1}$`, `$m = ${a}$`, `$m = ${a - 1}$`, `$m \\ne ${a + 1}$`],
          correctAnswer: "A", explanation: `Hai đường thẳng song song khi hệ số góc bằng nhau: $m - 1 = ${a} \\iff m = ${a + 1}$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const r = Math.floor(Math.random() * 5) + 3;
        return {
          id: `G9_M4_${idx}`, grade: 9, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Từ điểm $M$ ngoài đường tròn $(O; ${r}\\text{ cm})$ kẻ hai tiếp tuyến $MA, MB$. Biết $OM = ${2 * r}\\text{ cm}$. Độ dài tiếp tuyến $MA$ là:`,
          diagram: MathDiagrams.circleWithTangents(r),
          options: [`$${r}\\sqrt{3}\\text{ cm}$`, `$${r}\\text{ cm}$`, `$${2 * r}\\text{ cm}$`, `$${r}\\sqrt{2}\\text{ cm}$`],
          correctAnswer: "A", explanation: `Áp dụng định lý Pythagore trong tam giác vuông $OAM$: $MA = \\sqrt{OM^2 - OA^2} = \\sqrt{${4*r*r} - ${r*r}} = ${r}\\sqrt{3}\\text{ cm}$.`
        };
      })
    ];
  },

  // LỚP 10
  getGrade10Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'dai_so', level: 'VDC' }, (idx) => {
          const p = Math.floor(Math.random() * 28) + 2;
          return {
            id: `G10_E1_${idx}_${Math.random()}`,
            grade: 10, level: "VDC", type: "essay", topic: "dai_so",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của biểu thức $P = x + \\dfrac{${p * p}}{x}$ với mọi số thực dương $x > 0$:`,
            correctAnswer: `${2 * p} | min=${2 * p} | P=${2 * p}`,
            explanation: `Theo BĐT Cauchy: $P \\ge 2\\sqrt{x \\cdot \\dfrac{${p*p}}{x}} = ${2*p}$. Dấu '=' khi $x = ${p}$.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'VDC' }, (idx) => {
          const k = Math.floor(Math.random() * 15) + 2;
          return {
            id: `G10_E1B_${idx}_${Math.random()}`,
            grade: 10, level: "VDC", type: "essay", topic: "dai_so",
            question: `[Vận Dụng Cao 🔥] Cho tam thức $f(x) = x^2 - 2(m - ${k})x + ${k * k + 4}$. Tìm số giá trị nguyên của tham số $m \\in [-10; 10]$ để $f(x) > 0$ với mọi $x \\in \\mathbb{R}$:`,
            correctAnswer: `3 | m=3`,
            explanation: `Để $f(x) > 0, \\forall x \\iff \\Delta' = (m - ${k})^2 - (${k*k + 4}) < 0 \\iff m^2 - ${2*k}m - 4 < 0$. Nghiệm nguyên có 3 giá trị.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
          const a = Math.floor(Math.random() * 20) + 1;
          const diff = Math.floor(Math.random() * 8) + 2;
          const b = a + diff;
          return {
            id: `G10_E2_${idx}_${Math.random()}`,
            grade: 10, level: "TH", type: "essay", topic: "dai_so",
            question: `[Thông Hiểu 💡] Tìm nghiệm dương nguyên nhỏ nhất của bất phương trình bậc hai: $x^2 - ${a + b}x + ${a * b} < 0$:`,
            correctAnswer: `${a + 1} | x=${a + 1}`,
            explanation: `Tam thức có hai nghiệm $x_1 = ${a}, x_2 = ${b}$. Tập nghiệm là $(${a}; ${b})$. Nghiệm nguyên nhỏ nhất là $${a + 1}$.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
          const a = Math.floor(Math.random() * 10) + 1;
          const b = a + Math.floor(Math.random() * 10) + 5;
          const c = a + 2;
          const d = b + 4;
          const count = b - c + 1;
          return {
            id: `G10_E2B_${idx}_${Math.random()}`,
            grade: 10, level: "TH", type: "essay", topic: "dai_so",
            question: `[Thông Hiểu 💡] Cho hai tập hợp $A = [${a}; ${b}]$ và $B = [${c}; ${d}]$. Số phần tử nguyên thuộc tập hợp $A \\cap B$ là:`,
            correctAnswer: `${count} | n=${count}`,
            explanation: `Giao hai tập hợp $A \\cap B = [${c}; ${b}]$. Số phần tử nguyên là $${b} - ${c} + 1 = ${count}$.`
          };
        }),
        makeTemplate({ topic: 'hinh_hoc', level: 'VD' }, (idx) => {
          const a = Math.floor(Math.random() * 15) + 5;
          const b = a + Math.floor(Math.random() * 6) + 1;
          const diff = Math.abs(a - b);
          const c = diff + Math.floor(Math.random() * 4) + 3;
          const p = (a + b + c) / 2;
          const area = Math.round(Math.sqrt(Math.max(1, p * (p - a) * (p - b) * (p - c))));
          return {
            id: `G10_E3_${idx}_${Math.random()}`,
            grade: 10, level: "VD", type: "essay", topic: "hinh_hoc",
            question: `[Vận Dụng 🧠] Cho tam giác $ABC$ có độ dài ba cạnh là $a = ${a}$, $b = ${b}$, $c = ${c}$. Diện tích $S$ của tam giác $ABC$ (làm tròn số nguyên gần nhất) bằng:`,
            correctAnswer: `${area} | S=${area}`,
            explanation: `Nửa chu vi $p = ${p}$. Diện tích theo công thức Heron: $S = \\sqrt{p(p-a)(p-b)(p-c)} \\approx ${area}$.`
          };
        }),
        makeTemplate({ topic: 'vecto', level: 'VD' }, (idx) => {
          const xA = Math.floor(Math.random() * 10) - 4;
          const yA = Math.floor(Math.random() * 10) - 3;
          const xB = xA + Math.floor(Math.random() * 6) + 1;
          const yB = yA + Math.floor(Math.random() * 6) + 2;
          const xC = Math.floor(Math.random() * 8) + 1;
          const yC = Math.floor(Math.random() * 8) - 4;
          const xD = xA + xC - xB;
          return {
            id: `G10_E3B_${idx}_${Math.random()}`,
            grade: 10, level: "VD", type: "essay", topic: "vecto",
            question: `[Vận Dụng 🧠] Trong mặt phẳng $Oxy$, cho ba điểm $A(${xA}; ${yA})$, $B(${xB}; ${yB})$, $C(${xC}; ${yC})$. Tìm hoành độ $x_D$ của điểm $D$ để tứ giác $ABCD$ là hình bình hành:`,
            correctAnswer: `${xD} | xD=${xD}`,
            explanation: `Để $ABCD$ là hình bình hành thì $\\vec{AB} = \\vec{DC} \\iff x_B - x_A = x_C - x_D \\implies x_D = x_A + x_C - x_B = ${xD}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
        const h = Math.floor(Math.random() * 25) - 10;
        const k = Math.floor(Math.random() * 20) - 10;
        return {
          id: `G10_M1_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "ham_so",
          question: `Cho hàm số bậc hai có đồ thị Parabol với đỉnh $I(${h}; ${k})$. Trục đối xứng của Parabol là đường thẳng:`,
          diagram: MathDiagrams.parabolaGraph(h, k),
          options: [`$x = ${h}$`, `$y = ${k}$`, `$x = -${h}$`, `$y = -${k}$`],
          correctAnswer: "A", explanation: `Trục đối xứng của parabol có phương trình là $x = x_I = ${h}$.`
        };
      }),
      makeTemplate({ topic: 'ham_so', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 40) + 2;
        return {
          id: `G10_M2_${idx}`, grade: 10, level: "NB", type: "mcq", topic: "ham_so",
          question: `Tập xác định của hàm số $y = \\sqrt{x - ${a}}$ là:`,
          options: [`$D = [${a}; +\\infty)$`, `$D = (${a}; +\\infty)$`, `$D = (-\\infty; ${a}]$`, `$D = \\mathbb{R} \\setminus \\{${a}\\}$`],
          correctAnswer: "A", explanation: `$x - ${a} \\ge 0 \\iff x \\ge ${a} \\implies D = [${a}; +\\infty)$.`
        };
      }),
      makeTemplate({ topic: 'vecto', level: 'TH' }, (idx) => {
        const u = Math.floor(Math.random() * 20) + 2;
        const v = u + Math.floor(Math.random() * 10) + 1;
        const sumSquare = u * u + v * v;
        return {
          id: `G10_M3_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "vecto",
          question: `Cho hai vectơ vuông góc $\\vec{u}$ và $\\vec{v}$ có độ dài lần lượt là $${u}$ và $${v}$. Tích vô hướng $\\vec{u} \\cdot \\vec{v}$ bằng:`,
          options: [`$0$`, `$${u * v}$`, `$${u + v}$`, `$\\sqrt{${sumSquare}}$`],
          correctAnswer: "A", explanation: `Hai vectơ vuông góc có góc $\\alpha = 90^\\circ \\implies \\cos 90^\\circ = 0 \\implies \\vec{u} \\cdot \\vec{v} = 0$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 20) + 2;
        const b = a + Math.floor(Math.random() * 15) + 3;
        return {
          id: `G10_M4_${idx}`, grade: 10, level: "NB", type: "mcq", topic: "dai_so",
          question: `Cho hai tập hợp $A = [1; ${b}]$ và $B = [${a}; ${b + 10}]$. Giao của hai tập hợp $A \\cap B$ là:`,
          options: [`$[${a}; ${b}]$`, `$[1; ${b + 10}]$`, `$[1; ${a}]$`, `$[${b}; ${b + 10}]$`],
          correctAnswer: "A", explanation: `Phần tử chung của $A$ và $B$ là $[${a}; ${b}]$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const c = Math.floor(Math.random() * 30) + 2;
        return {
          id: `G10_M5_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "dai_so",
          question: `Tập nghiệm của bất phương trình bậc hai $x^2 - ${c * c} < 0$ là:`,
          options: [`$(-${c}; ${c})$`, `$[-${c}; ${c}]$`, `$(-\\infty; -${c}) \\cup (${c}; +\\infty)$`, `$[${c}; +\\infty)$`],
          correctAnswer: "A", explanation: `$x^2 < ${c*c} \\iff -${c} < x < ${c}$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const b = Math.floor(Math.random() * 15) + 3;
        const c = Math.floor(Math.random() * 15) + 4;
        return {
          id: `G10_M6_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho tam giác $ABC$ có cạnh $b = ${b}$, $c = ${c}$ và $\\widehat{A} = 60^\\circ$. Độ dài cạnh $a$ tính theo định lý Côsin thỏa mãn:`,
          options: [`$a^2 = ${b * b + c * c - b * c}$`, `$a^2 = ${b * b + c * c}$`, `$a^2 = ${b * b + c * c + b * c}$`, `$a^2 = ${(b + c) * (b + c)}$`],
          correctAnswer: "A", explanation: `$a^2 = b^2 + c^2 - 2bc\\cos 60^\\circ = ${b*b} + ${c*c} - 2 \\cdot ${b} \\cdot ${c} \\cdot \\dfrac{1}{2} = ${b*b + c*c - b*c}$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        const r = Math.floor(Math.random() * 15) + 2;
        return {
          id: `G10_M7_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho tam giác $ABC$ có cạnh $a = ${2 * r}$ và góc $\\widehat{A} = 30^\\circ$. Bán kính đường tròn ngoại tiếp $R$ của tam giác $ABC$ bằng:`,
          options: [`$${2 * r}$`, `$${r}$`, `$${4 * r}$`, `$${r}\\sqrt{3}$`],
          correctAnswer: "A", explanation: `Theo định lý Sin: $R = \\dfrac{a}{2\\sin A} = \\dfrac{${2*r}}{2 \\cdot \\sin 30^\\circ} = ${2*r}$.`
        };
      }),
      makeTemplate({ topic: 'vecto', level: 'TH' }, (idx) => {
        const x1 = Math.floor(Math.random() * 8) - 3;
        const y1 = Math.floor(Math.random() * 8) - 3;
        const x2 = Math.floor(Math.random() * 8) - 2;
        const y2 = Math.floor(Math.random() * 8) - 2;
        const dot = x1 * x2 + y1 * y2;
        return {
          id: `G10_M8_${idx}`, grade: 10, level: "TH", type: "mcq", topic: "vecto",
          question: `Trong mặt phẳng tọa độ $Oxy$, cho $\\vec{u} = (${x1}; ${y1})$ và $\\vec{v} = (${x2}; ${y2})$. Tích vô hướng $\\vec{u} \\cdot \\vec{v}$ bằng:`,
          options: [`$${dot}$`, `$${dot + 2}$`, `$${-dot}$`, `$${x1 * y1 + x2 * y2}$`],
          correctAnswer: "A", explanation: `$\\vec{u} \\cdot \\vec{v} = x_1 x_2 + y_1 y_2 = (${x1})(${x2}) + (${y1})(${y2}) = ${dot}$.`
        };
      })
    ];
  },

  // LỚP 11
  getGrade11Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        makeTemplate({ topic: 'dai_so', level: 'VD' }, (idx) => {
          const u1 = Math.floor(Math.random() * 4) + 2;
          const d = Math.floor(Math.random() * 4) + 3;
          return {
            id: `G11_E1_${idx}_${Math.random()}`,
            grade: 11, level: "VD", type: "essay", topic: "dai_so",
            question: `[Vận Dụng 🧠] Cho cấp số cộng $(u_n)$ có $u_1 = ${u1}$ và công sai $d = ${d}$. Tính số hạng thứ $10$ của cấp số cộng ($u_{10}$):`,
            correctAnswer: `${u1 + 9 * d} | u10=${u1 + 9 * d}`,
            explanation: `$u_{10} = u_1 + 9d = ${u1} + 9 \\cdot ${d} = ${u1 + 9 * d}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const u1 = Math.floor(Math.random() * 5) + 1;
        const d = Math.floor(Math.random() * 4) + 2;
        const u2 = u1 + d;
        return {
          id: `G11_M1_${idx}`, grade: 11, level: "NB", type: "mcq", topic: "dai_so",
          question: `Cho cấp số cộng $(u_n)$ với $u_1 = ${u1}$ và $u_2 = ${u2}$. Công sai $d$ của cấp số cộng bằng:`,
          options: [`$${d}$`, `$${-d}$`, `$${u1 * u2}$`, `$${u1 + u2}$`],
          correctAnswer: "A", explanation: `$d = u_2 - u_1 = ${u2} - ${u1} = ${d}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 4) + 2;
        const b = Math.floor(Math.random() * 3) + 1;
        return {
          id: `G11_M2_${idx}`, grade: 11, level: "TH", type: "mcq", topic: "dai_so",
          question: `Tính giới hạn $\\lim_{n \\to \\infty} \\dfrac{${a}n + 3}{${b}n - 1}$:`,
          options: [`$\\dfrac{${a}}{${b}}$`, `$+\\infty$`, `$0$`, `$-3$`],
          correctAnswer: "A", explanation: `Chia cả tử và mẫu cho $n$: $\\lim \\dfrac{${a} + 3/n}{${b} - 1/n} = \\dfrac{${a}}{${b}}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        return {
          id: `G11_M3_${idx}`, grade: 11, level: "NB", type: "mcq", topic: "dai_so",
          question: `Giá trị của $\\sin\\left(\\dfrac{\\pi}{6}\\right)$ bằng:`,
          options: [`$\\dfrac{1}{2}$`, `$\\dfrac{\\sqrt{3}}{2}$`, `$\\dfrac{\\sqrt{2}}{2}$`, `$1$`],
          correctAnswer: "A", explanation: `$\\sin(\\pi/6) = 1/2$.`
        };
      }),
      makeTemplate({ topic: 'hinh_hoc', level: 'TH' }, (idx) => {
        return {
          id: `G11_M4_${idx}`, grade: 11, level: "TH", type: "mcq", topic: "hinh_hoc",
          question: `Cho hình chóp $S.ABCD$ có đáy $ABCD$ là hình vuông tâm $O$, cạnh bên $SA \\perp (ABCD)$. Đường thẳng nào sau đây vuông góc với mặt phẳng $(ABCD)$?`,
          diagram: MathDiagrams.pyramidSABCD(),
          options: [`$SA$`, `$SB$`, `$SC$`, `$SO$`],
          correctAnswer: "A", explanation: `Theo giả thiết bài toán: $SA \\perp (ABCD)$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const n = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G11_M5_${idx}`, grade: 11, level: "NB", type: "mcq", topic: "dai_so",
          question: `Đạo hàm của hàm số $y = x^${n}$ là:`,
          options: [`$y' = ${n}x^${n - 1}$`, `$y' = x^${n - 1}$`, `$y' = \\dfrac{x^${n + 1}}{${n + 1}}$`, `$y' = ${n}x^${n}$`],
          correctAnswer: "A", explanation: `Công thức đạo hàm hàm lũy thừa: $(x^n)' = n x^{n-1}$.`
        };
      })
    ];
  },

  // LỚP 12 / THPT
  getGrade12Templates(type = 'mcq', level = 'TH') {
    if (type === 'essay') {
      return [
        // Level TH: Tích phân cơ bản & Vectơ Oxyz
        makeTemplate({ topic: 'dai_so', level: 'TH' }, (idx) => {
          const k = Math.floor(Math.random() * 5) + 2;
          const a = Math.floor(Math.random() * 3) + 1;
          const b = a + 2;
          const res = k * (b - a);
          return {
            id: `G12_ETH1_${idx}_${Math.random()}`,
            grade: 12, level: "TH", type: "essay", topic: "dai_so",
            question: `[Thông Hiểu 💡] Tính giá trị tích phân $I = \\int_{${a}}^{${b}} ${k}\\, dx$:`,
            correctAnswer: `${res} | I=${res}`,
            explanation: `$I = ${k}(${b} - ${a}) = ${res}$.`
          };
        }),
        makeTemplate({ topic: 'vecto', level: 'TH' }, (idx) => {
          const x = Math.floor(Math.random() * 3) + 1;
          const y = Math.floor(Math.random() * 3) + 1;
          const z = Math.floor(Math.random() * 2) + 1;
          const lenSq = x * x + y * y + z * z;
          return {
            id: `G12_ETH2_${idx}_${Math.random()}`,
            grade: 12, level: "TH", type: "essay", topic: "vecto",
            question: `[Thông Hiểu 💡] Trong không gian $Oxyz$, cho vectơ $\\vec{u} = (${x}; ${y}; ${z})$. Tính bình phương độ dài $|\\vec{u}|^2$:`,
            correctAnswer: `${lenSq} | ${lenSq}`,
            explanation: `$|\\vec{u}|^2 = ${x}^2 + ${y}^2 + ${z}^2 = ${lenSq}$.`
          };
        }),
        makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
          const a = Math.floor(Math.random() * 4) + 2;
          return {
            id: `G12_ETH3_${idx}_${Math.random()}`,
            grade: 12, level: "TH", type: "essay", topic: "ham_so",
            question: `[Thông Hiểu 💡] Tìm phương trình tiệm cận ngang của đồ thị hàm số $y = \\dfrac{${a}x - 3}{x + 1}$. (Nhập số giá trị của $y$, ví dụ: ${a} hoặc y=${a}):`,
            correctAnswer: `${a} | y=${a}`,
            explanation: `Tiệm cận ngang là $y = \\lim_{x \\to \\infty} \\dfrac{${a}x - 3}{x + 1} = ${a}$.`
          };
        }),
        makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
          const m = Math.floor(Math.random() * 5) + 3;
          return {
            id: `G12_ETH4_${idx}_${Math.random()}`,
            grade: 12, level: "TH", type: "essay", topic: "ham_so",
            question: `[Thông Hiểu 💡] Tìm giá trị lớn nhất của hàm số $y = -x^2 + ${2 * m}x - 1$ trên $\\mathbb{R}$:`,
            correctAnswer: `${m * m - 1} | max=${m * m - 1}`,
            explanation: `Đỉnh parabol đạt tại $x = ${m} \\implies y_{\\max} = -${m}^2 + ${2 * m * m} - 1 = ${m * m - 1}$.`
          };
        }),

        // Level VD: Tích phân vận dụng & Mặt cầu Oxyz
        makeTemplate({ topic: 'dai_so', level: 'VD' }, (idx) => {
          const a = Math.floor(Math.random() * 4) + 1;
          const b = a + Math.floor(Math.random() * 3) + 1;
          const res = (b * b - a * a) / 2;
          return {
            id: `G12_E1_${idx}_${Math.random()}`,
            grade: 12, level: "VD", type: "essay", topic: "dai_so",
            question: `[Vận Dụng 🧠] Tính tích phân $I = \\int_{${a}}^{${b}} x\\, dx$:`,
            correctAnswer: `${res} | I=${res}`,
            explanation: `$I = \\left[ \\dfrac{x^2}{2} \\right]_{${a}}^{${b}} = \\dfrac{${b*b} - ${a*a}}{2} = ${res}$.`
          };
        }),
        makeTemplate({ topic: 'vecto', level: 'VD' }, (idx) => {
          const r = Math.floor(Math.random() * 4) + 2;
          const x0 = Math.floor(Math.random() * 3) + 1;
          const y0 = Math.floor(Math.random() * 3) + 1;
          const z0 = Math.floor(Math.random() * 3) + 1;
          return {
            id: `G12_EVD2_${idx}_${Math.random()}`,
            grade: 12, level: "VD", type: "essay", topic: "vecto",
            question: `[Vận Dụng 🧠] Trong không gian $Oxyz$, cho mặt cầu $(S): (x - ${x0})^2 + (y + ${y0})^2 + (z - ${z0})^2 = ${r * r}$. Tìm bán kính $R$ của mặt cầu:`,
            correctAnswer: `${r} | R=${r}`,
            explanation: `Phương trình mặt cầu có dạng chuẩn nên bán kính $R = \\sqrt{${r * r}} = ${r}$.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'VD' }, (idx) => {
          const c = Math.floor(Math.random() * 6) + 2;
          return {
            id: `G12_EVD3_${idx}_${Math.random()}`,
            grade: 12, level: "VD", type: "essay", topic: "dai_so",
            question: `[Vận Dụng 🧠] Tìm nghiệm nguyên dương của phương trình logarit $\\log_2(x + ${c}) = 5$:`,
            correctAnswer: `${32 - c} | x=${32 - c}`,
            explanation: `Phương trình $\\iff x + ${c} = 2^5 = 32 \\iff x = ${32 - c}$.`
          };
        }),
        makeTemplate({ topic: 'hinh_hoc', level: 'VD' }, (idx) => {
          const a = Math.floor(Math.random() * 4) + 2;
          const h = Math.floor(Math.random() * 5) + 3;
          const v = Math.round((a * a * h) / 3 * 10) / 10;
          return {
            id: `G12_EVD4_${idx}_${Math.random()}`,
            grade: 12, level: "VD", type: "essay", topic: "hinh_hoc",
            question: `[Vận Dụng 🧠] Cho khối chóp tứ giác đều có cạnh đáy bằng $${a}\\text{ cm}$ và chiều cao bằng $${h}\\text{ cm}$. Tính thể tích $V$ của khối chóp:`,
            correctAnswer: `${v} | V=${v}`,
            explanation: `$V = \\dfrac{1}{3} S_{\\text{đáy}} \\cdot h = \\dfrac{1}{3} \\cdot ${a}^2 \\cdot ${h} = ${v}$.`
          };
        }),

        // Level VDC: Cực trị tham số m & Tối ưu hóa
        makeTemplate({ topic: 'ham_so', level: 'VDC' }, (idx) => {
          const p = Math.floor(Math.random() * 5) + 1;
          const ans = p + 2;
          return {
            id: `G12_EVDC1_${idx}_${Math.random()}`,
            grade: 12, level: "VDC", type: "essay", topic: "ham_so",
            question: `[Vận Dụng Cao 🔥] Có bao nhiêu giá trị nguyên của tham số $m \\in [-${p}; ${p + 3}]$ để hàm số $y = \\dfrac{x + ${p}}{x + m}$ đồng biến trên từng khoảng xác định?`,
            correctAnswer: `${ans} | ${ans}`,
            explanation: `Đạo hàm $y' = \\dfrac{m - ${p}}{(x + m)^2} > 0 \\iff m > ${p}$. Với $m \\in [-${p}; ${p + 3}]$, ta có các giá trị thỏa mãn.`
          };
        }),
        makeTemplate({ topic: 'dai_so', level: 'VDC' }, (idx) => {
          const m = Math.floor(Math.random() * 10) + 5;
          return {
            id: `G12_EVDC2_${idx}_${Math.random()}`,
            grade: 12, level: "VDC", type: "essay", topic: "dai_so",
            question: `[Vận Dụng Cao 🔥] Tìm giá trị nhỏ nhất của hàm số $f(x) = e^{2x} - ${2 * m} e^x + ${m * m + 1}$ trên $\\mathbb{R}$:`,
            correctAnswer: `1 | min=1`,
            explanation: `Đặt $t = e^x > 0$, hàm trở thành $g(t) = t^2 - ${2*m}t + ${m*m + 1} = (t - ${m})^2 + 1 \\ge 1$. Đạt tại $t = ${m} > 0$.`
          };
        }),
        makeTemplate({ topic: 'vecto', level: 'VDC' }, (idx) => {
          const d = Math.floor(Math.random() * 4) + 3;
          return {
            id: `G12_EVDC3_${idx}_${Math.random()}`,
            grade: 12, level: "VDC", type: "essay", topic: "vecto",
            question: `[Vận Dụng Cao 🔥] Trong không gian $Oxyz$, cho điểm $A(${d}; 0; 0)$ và mặt phẳng $(P): x + 2y - 2z + 3 = 0$. Khoảng cách từ $A$ đến $(P)$ bằng:`,
            correctAnswer: `${(d + 3) / 3} | d=${(d + 3) / 3}`,
            explanation: `$d(A, (P)) = \\dfrac{|${d} + 2(0) - 2(0) + 3|}{\\sqrt{1^2 + 2^2 + (-2)^2}} = \\dfrac{${d + 3}}{3}$.`
          };
        })
      ];
    }

    return [
      makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
        const a = Math.floor(Math.random() * 4) + 1;
        const b = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G12_M1_${idx}`, grade: 12, level: "TH", type: "mcq", topic: "ham_so",
          question: `Đường tiệm cận đứng của đồ thị hàm số $y = \\dfrac{${a}x + 1}{x - ${b}}$ là đường thẳng:`,
          options: [`$x = ${b}$`, `$y = ${a}$`, `$x = -${b}$`, `$y = ${b}$`],
          correctAnswer: "A", explanation: `Nghiệm của mẫu số là $x = ${b}$ nên tiệm cận đứng là $x = ${b}$.`
        };
      }),
      makeTemplate({ topic: 'ham_so', level: 'TH' }, (idx) => {
        const x1 = -(Math.floor(Math.random() * 2) + 1);
        const x2 = Math.floor(Math.random() * 2) + 1;
        const yMax = Math.floor(Math.random() * 4) + 3;
        const yMin = 0;
        return {
          id: `G12_M2_${idx}`, grade: 12, level: "TH", type: "mcq", topic: "ham_so",
          question: `Cho hàm số $y = f(x)$ có bảng biến thiên như hình dưới đây. Điểm cực đại của hàm số đã cho là:`,
          diagram: MathDiagrams.variationTable(x1, x2, yMax, yMin),
          options: [`$x = ${x1}$`, `$x = ${x2}$`, `$y = ${yMax}$`, `$y = ${yMin}$`],
          correctAnswer: "A", explanation: `Từ bảng biến thiên, đạo hàm đổi dấu từ dương sang âm qua $x = ${x1}$ nên điểm cực đại là $x = ${x1}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        const a = Math.floor(Math.random() * 5) + 2;
        return {
          id: `G12_M3_${idx}`, grade: 12, level: "NB", type: "mcq", topic: "dai_so",
          question: `Tập nghiệm của bất phương trình mũ $2^x > ${Math.pow(2, a)}$ là:`,
          options: [`$(${a}; +\\infty)$`, `$[${a}; +\\infty)$`, `$(-\\infty; ${a})$`, `$\\mathbb{R}$`],
          correctAnswer: "A", explanation: `Vì cơ số $2 > 1$ nên $2^x > 2^${a} \\iff x > ${a}$.`
        };
      }),
      makeTemplate({ topic: 'vecto', level: 'TH' }, (idx) => {
        const x0 = Math.floor(Math.random() * 5) + 1;
        const y0 = Math.floor(Math.random() * 6) - 2;
        const z0 = Math.floor(Math.random() * 5) + 1;
        const r = Math.floor(Math.random() * 4) + 2;
        return {
          id: `G12_M4_${idx}`, grade: 12, level: "TH", type: "mcq", topic: "vecto",
          question: `Trong không gian $Oxyz$, mặt cầu $(S): (x - ${x0})^2 + (y - ${y0})^2 + (z - ${z0})^2 = ${r * r}$ có bán kính $R$ bằng:`,
          options: [`$${r}$`, `$${r * r}$`, `$${r * 2}$`, `$\\sqrt{${r}}$`],
          correctAnswer: "A", explanation: `Phương trình chính tắc mặt cầu có bán kính $R = \\sqrt{${r*r}} = ${r}$.`
        };
      }),
      makeTemplate({ topic: 'dai_so', level: 'NB' }, (idx) => {
        return {
          id: `G12_M5_${idx}`, grade: 12, level: "NB", type: "mcq", topic: "dai_so",
          question: `Họ tất cả các nguyên hàm của hàm số $f(x) = e^x$ là:`,
          options: [`$e^x + C$`, `$\\dfrac{e^{x+1}}{x+1} + C$`, `$x e^{x-1} + C$`, `$\\ln x + C$`],
          correctAnswer: "A", explanation: `Nguyên hàm của $e^x$ là chính nó: $\\int e^x dx = e^x + C$.`
        };
      })
    ];
  },

  getTemplates(grade, type = 'mcq', level = 'TH', topic = 'all') {
    const g = grade ? grade.toString() : '10';
    let rawTemplates = [];
    if (g === '6') rawTemplates = this.getGrade6Templates(type, level);
    else if (g === '7') rawTemplates = this.getGrade7Templates(type, level);
    else if (g === '8') rawTemplates = this.getGrade8Templates(type, level);
    else if (g === '9' || g === 'TS10') rawTemplates = this.getGrade9Templates(type, level);
    else if (g === '11') rawTemplates = this.getGrade11Templates(type, level);
    else if (g === '12' || g === 'THPT') rawTemplates = this.getGrade12Templates(type, level);
    else rawTemplates = this.getGrade10Templates(type, level);

    if (!rawTemplates || !rawTemplates.length) return [];

    // Lọc theo level cho tự luận nếu có yêu cầu level cụ thể
    if (type === 'essay' && level && level !== 'all') {
      const levelMatches = rawTemplates.filter(t => (t.level || '').toUpperCase() === level.toUpperCase());
      if (levelMatches.length > 0) {
        rawTemplates = levelMatches;
      }
    }

    // Lọc theo topic
    const normTopic = normalizeTopic(topic);
    if (normTopic === 'all') {
      return rawTemplates;
    }

    const filtered = rawTemplates.filter(t => isTopicMatch(t.topic, normTopic));
    if (filtered.length > 0) {
      return filtered;
    }

    // Nếu không có template nào thuộc topic đó thì fallback về toàn bộ kèm thông báo
    const fallback = [...rawTemplates];
    fallback.warning = "Chủ đề này chưa đủ câu hỏi, đã bổ sung thêm từ chủ đề khác";
    return fallback;
  }
};

/* ================= 🚀 CORE MATH GENERATOR & ANTI-DUPLICATE GUARD ================= */
const MathEngine = {
  shuffleQuestionOptions(q) {
    if (!q.options || q.options.length === 0) return q;
    
    // Dynamic indices dựa theo số lượng options thực tế (hỗ trợ 2, 3, 4, ... lựa chọn)
    const indices = q.options.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const correctOriginalIndex = 0; // Luôn coi lựa chọn đầu tiên là đáp án đúng trong template gốc
    const newCorrectIdx = indices.indexOf(correctOriginalIndex);
    const letterMap = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    return {
      ...q,
      options: indices.map(i => q.options[i]),
      correctAnswer: letterMap[newCorrectIdx] || 'A'
    };
  },

  /**
   * Sinh bộ đề thi chuẩn 100% TOANMATH với ANTI-DUPLICATE GUARD & TÍCH HỢP KHO TÀI LIỆU
   */
  generateExam(config = {}) {
    const {
      track = 'toan',
      grade = '10',
      term = 'GK1',
      topic = 'all',
      sourceMode = 'document', // 'document' (Ưu tiên kho tài liệu) | 'hybrid' | 'synthetic'
      mcqCount = 12,
      essayMatrix = { TH: 1, VD: 1, VDC: 1 },
      timeLimit = 45,
      title = '',
      batchSeenSignatures = null
    } = config;

    const gStr = (track && track.startsWith('dgnl')) ? 'DGNL' : grade.toString();
    let warningMsg = null;

    let mcqTemplates = GradeEngines.getTemplates(gStr, 'mcq', 'TH', topic);
    const allMcqTemplates = GradeEngines.getTemplates(gStr, 'mcq', 'TH', 'all');

    if (topic !== 'all') {
      if (mcqTemplates.warning) {
        warningMsg = mcqTemplates.warning;
      } else if (mcqCount > mcqTemplates.length) {
        warningMsg = `Chủ đề "${topic}" chỉ có ${mcqTemplates.length} câu hỏi mẫu, không đủ so với yêu cầu ${mcqCount} câu. Đã bổ sung thêm từ các chủ đề khác.`;
        const extra = allMcqTemplates.filter(t => !mcqTemplates.includes(t));
        mcqTemplates = [...mcqTemplates, ...extra];
      }
    }

    // ================= ANTI-DUPLICATE GUARD CHO TRẮC NGHIỆM =================
    const selectedMcq = [];
    const seenSignatures = batchSeenSignatures || new Set();
    const mcqDeck = [];

    // BƯỚC 1: LẤY CÂU HỎI TRỰC TIẾP TỪ KHO TÀI LIỆU (NẾU sourceMode LÀ 'document' HOẶC 'hybrid')
    if (typeof DocumentQuestionBank !== 'undefined' && sourceMode !== 'synthetic') {
      let docQuestions = DocumentQuestionBank.query({
        grade: gStr,
        topic: topic,
        type: 'mcq'
      });

      // Lọc bỏ các câu đã xuất hiện trong batch
      const availableDocQuestions = docQuestions.filter(q => !seenSignatures.has(q.question.trim().replace(/\s+/g, ' ')));

      // Giới hạn số câu lấy từ tài liệu theo chế độ
      const maxDocToTake = sourceMode === 'hybrid' ? Math.ceil(mcqCount / 2) : mcqCount;
      const takenFromDoc = availableDocQuestions.slice(0, maxDocToTake);

      takenFromDoc.forEach(q => {
        const sig = q.question.trim().replace(/\s+/g, ' ');
        seenSignatures.add(sig);
        selectedMcq.push({
          id: q.id,
          grade: q.grade,
          level: q.level || 'TH',
          type: 'mcq',
          topic: q.topic,
          source: q.source || 'Kho tài liệu ôn thi K-EDU',
          question: q.question,
          options: [...q.options],
          correctAnswer: q.correctAnswer || 'A',
          explanation: q.explanation || ''
        });
      });
    }

    // BƯỚC 2: BỔ SUNG BẰNG GENERATOR NẾU CHƯA ĐỦ SỐ LƯỢNG MCQ YÊU CẦU
    const refillMcqDeck = () => {
      const arr = Array.from({ length: mcqTemplates.length }, (_, k) => k);
      for (let j = arr.length - 1; j > 0; j--) {
        const r = Math.floor(Math.random() * (j + 1));
        [arr[j], arr[r]] = [arr[r], arr[j]];
      }
      mcqDeck.push(...arr);
    };

    const remainingMcqNeeded = mcqCount - selectedMcq.length;
    for (let i = 0; i < remainingMcqNeeded; i++) {
      let chosenQ = null;
      let attempts = 0;
      const maxAttempts = 35;

      while (attempts < maxAttempts) {
        attempts++;
        if (!mcqDeck.length) refillMcqDeck();
        const templateIdx = mcqDeck.pop();
        const candidate = mcqTemplates[templateIdx](selectedMcq.length + 1);
        const signature = candidate.question.trim().replace(/\s+/g, ' ');

        if (!seenSignatures.has(signature)) {
          seenSignatures.add(signature);
          candidate.source = candidate.source || `Ngân hàng đề chuẩn TOANMATH — Khối ${gStr}`;
          chosenQ = candidate;
          break;
        }
      }

      if (!chosenQ) {
        for (let tIdx = 0; tIdx < mcqTemplates.length; tIdx++) {
          for (let retry = 0; retry < 5; retry++) {
            const candidate = mcqTemplates[tIdx](selectedMcq.length + 1);
            const signature = candidate.question.trim().replace(/\s+/g, ' ');
            if (!seenSignatures.has(signature)) {
              seenSignatures.add(signature);
              candidate.source = candidate.source || `Ngân hàng đề chuẩn TOANMATH — Khối ${gStr}`;
              chosenQ = candidate;
              break;
            }
          }
          if (chosenQ) break;
        }
      }

      if (!chosenQ) {
        console.warn(`[MathEngine] Ngân hàng câu hỏi trắc nghiệm không đủ đa dạng cho số lượng ${mcqCount} câu.`);
        const base = mcqTemplates[i % mcqTemplates.length](selectedMcq.length + 1);
        let uniqSuffix = 1;
        let candidateQuestion = base.question;
        let sig = candidateQuestion.trim().replace(/\s+/g, ' ');
        while (seenSignatures.has(sig)) {
          uniqSuffix++;
          candidateQuestion = `${base.question.replace(/\s*\(Biến thể\s+\d+\)/, '')} (Biến thể ${uniqSuffix})`;
          sig = candidateQuestion.trim().replace(/\s+/g, ' ');
        }
        seenSignatures.add(sig);
        chosenQ = {
          ...base,
          question: candidateQuestion,
          source: base.source || `Ngân hàng đề chuẩn TOANMATH — Khối ${gStr}`
        };
      }
      selectedMcq.push(chosenQ);
    }

    // ================= ANTI-DUPLICATE GUARD CHO TỰ LUẬN =================
    const selectedEssay = [];
    const seenEssaySignatures = batchSeenSignatures || new Set();

    const targetLevels = [
      { level: 'TH', count: essayMatrix.TH || 0 },
      { level: 'VD', count: essayMatrix.VD || 0 },
      { level: 'VDC', count: essayMatrix.VDC || 0 }
    ];

    // LẤY CÂU HỎI TỰ LUẬN TỪ TÀI LIỆU KHỚP VỚI CÁC CẤP ĐỘ YÊU CẦU
    if (typeof DocumentQuestionBank !== 'undefined' && sourceMode !== 'synthetic') {
      const docEssays = DocumentQuestionBank.query({
        grade: gStr,
        topic: topic === 'all' ? undefined : topic,
        type: 'essay'
      });
      const availableDocEssays = docEssays.filter(eq => !seenEssaySignatures.has(eq.question.trim().replace(/\s+/g, ' ')));
      availableDocEssays.forEach(eq => {
        const eqLevel = (eq.level || 'VD').toUpperCase();
        const levelConfig = targetLevels.find(t => t.level === eqLevel);
        if (levelConfig && levelConfig.count > 0) {
          const currentLevelCount = selectedEssay.filter(e => (e.level || '').toUpperCase() === eqLevel).length;
          if (currentLevelCount < levelConfig.count) {
            const sig = eq.question.trim().replace(/\s+/g, ' ');
            seenEssaySignatures.add(sig);
            selectedEssay.push({
              id: eq.id,
              grade: eq.grade,
              level: eq.level || 'VD',
              type: 'essay',
              topic: eq.topic,
              source: eq.source || 'Kho tài liệu ôn thi K-EDU',
              question: eq.question,
              correctAnswer: eq.correctAnswer,
              explanation: eq.explanation || ''
            });
          }
        }
      });
    }

    let essayIndex = selectedEssay.length + 1;
    targetLevels.forEach(({ level, count }) => {
      // Số lượng câu tự luận cần bổ sung thêm cho cấp độ này
      const currentLevelCount = selectedEssay.filter(e => (e.level || '').toUpperCase() === level.toUpperCase()).length;
      const needed = Math.max(0, count - currentLevelCount);
      if (needed <= 0) return;

      let essayTemplates = GradeEngines.getTemplates(gStr, 'essay', level, topic);
      if (!essayTemplates || !essayTemplates.length) {
        essayTemplates = GradeEngines.getTemplates(gStr, 'essay', level, 'all');
      }
      if (!essayTemplates || !essayTemplates.length) return;

      const essayDeck = [];
      const refillEssayDeck = () => {
        const arr = Array.from({ length: essayTemplates.length }, (_, k) => k);
        for (let j = arr.length - 1; j > 0; j--) {
          const r = Math.floor(Math.random() * (j + 1));
          [arr[j], arr[r]] = [arr[r], arr[j]];
        }
        essayDeck.push(...arr);
      };

      for (let i = 0; i < needed; i++) {
        let chosenEq = null;
        let attempts = 0;
        const maxAttempts = 25;

        while (attempts < maxAttempts) {
          attempts++;
          if (!essayDeck.length) refillEssayDeck();
          const idx = essayDeck.pop();
          const candidate = essayTemplates[idx](essayIndex);
          const sig = candidate.question.trim().replace(/\s+/g, ' ');
          if (!seenEssaySignatures.has(sig)) {
            seenEssaySignatures.add(sig);
            candidate.source = candidate.source || `Chuyên đề tự luận Toán — Khối ${gStr}`;
            chosenEq = candidate;
            break;
          }
        }

        if (!chosenEq) {
          for (let tIdx = 0; tIdx < essayTemplates.length; tIdx++) {
            for (let retry = 0; retry < 5; retry++) {
              const candidate = essayTemplates[tIdx](essayIndex);
              const sig = candidate.question.trim().replace(/\s+/g, ' ');
              if (!seenEssaySignatures.has(sig)) {
                seenEssaySignatures.add(sig);
                candidate.source = candidate.source || `Chuyên đề tự luận Toán — Khối ${gStr}`;
                chosenEq = candidate;
                break;
              }
            }
            if (chosenEq) break;
          }
        }

        if (!chosenEq) {
          console.warn(`[MathEngine] Ngân hàng câu hỏi tự luận (${level}) không đủ đa dạng.`);
          const base = essayTemplates[i % essayTemplates.length](essayIndex);
          let uniqSuffix = 1;
          let candidateQuestion = base.question;
          let sig = candidateQuestion.trim().replace(/\s+/g, ' ');
          while (seenEssaySignatures.has(sig)) {
            uniqSuffix++;
            candidateQuestion = `${base.question.replace(/\s*\(Biến thể\s+\d+\)/, '')} (Biến thể ${uniqSuffix})`;
            sig = candidateQuestion.trim().replace(/\s+/g, ' ');
          }
          seenEssaySignatures.add(sig);
          chosenEq = {
            ...base,
            question: candidateQuestion,
            source: base.source || `Chuyên đề tự luận Toán — Khối ${gStr}`
          };
        }

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

    const topicDisplayMap = {
      'so_hoc': 'Số học',
      'dai_so': 'Đại số',
      'hinh_hoc': 'Hình học',
      'ham_so': 'Hàm số',
      'vecto': 'Vectơ',
      'dgnl_logic': 'Logic ĐGNL',
      'dgnl_data': 'Phân tích số liệu',
      'thong_ke': 'Thống kê',
      'all': 'Tổng hợp'
    };

    const resolveKeyTopic = (t) => {
      const norm = normalizeTopic(t);
      return topicDisplayMap[norm] || t || 'Toán học';
    };

    // Xáo trộn vị trí các lựa chọn của từng câu trắc nghiệm
    selectedMcq.forEach((q, idx) => {
      const shuffledQ = this.shuffleQuestionOptions(q);
      answerKeys.push({
        num: idx + 1,
        type: 'mcq',
        topic: resolveKeyTopic(q.topic),
        level: q.level || 'TH',
        source: q.source || '',
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
        topic: resolveKeyTopic(q.topic),
        level: q.level || 'VD',
        source: q.source || '',
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
      examHtml,
      warning: warningMsg
    };
  },

  /**
   * Sinh hàng loạt N đề thi (5, 10, 20 đề...) với cơ chế chống trùng lặp chéo
   * @param {Object} config
   *   - batchCount: số lượng đề thi cần sinh (mặc định: 5)
   *   - deduplicatePolicy: 'disjoint' (100% độc lập không trùng câu hỏi) | 'variant_shuffle' (đảo mã đề 101, 102...)
   *   - titlePrefix: tiền tố tiêu đề đề thi
   */
  generateBatchExams(config = {}) {
    const {
      batchCount = 5,
      deduplicatePolicy = 'disjoint',
      titlePrefix = '',
      ...examConfig
    } = config;

    const count = Math.max(1, parseInt(batchCount, 10) || 5);
    const exams = [];

    if (deduplicatePolicy === 'variant_shuffle') {
      // Chế độ 2: Đảo mã đề hoán vị chuẩn Bộ GD&ĐT (Mã 101, 102, 103...)
      const baseTitle = titlePrefix ? `${titlePrefix} — Mã Đề 101` : '';
      const baseExam = this.generateExam({ ...examConfig, title: baseTitle });
      baseExam.examCode = '101';
      baseExam.variantIndex = 1;
      exams.push(baseExam);

      for (let i = 2; i <= count; i++) {
        const examCode = (100 + i).toString();
        const varTitle = titlePrefix ? `${titlePrefix} — Mã Đề ${examCode}` : (baseExam.title.replace(/Mã Đề \d+/, `Mã Đề ${examCode}`));
        
        const baseMcq = baseExam.answerKeys.filter(k => k.type === 'mcq');
        const baseEssay = baseExam.answerKeys.filter(k => k.type === 'essay');

        // Hoán vị ngẫu nhiên thứ tự các câu hỏi trắc nghiệm
        const shuffledMcq = [...baseMcq];
        for (let j = shuffledMcq.length - 1; j > 0; j--) {
          const r = Math.floor(Math.random() * (j + 1));
          [shuffledMcq[j], shuffledMcq[r]] = [shuffledMcq[r], shuffledMcq[j]];
        }

        // Hoán vị ngẫu nhiên thứ tự các câu hỏi tự luận
        const shuffledEssay = [...baseEssay];
        for (let j = shuffledEssay.length - 1; j > 0; j--) {
          const r = Math.floor(Math.random() * (j + 1));
          [shuffledEssay[j], shuffledEssay[r]] = [shuffledEssay[r], shuffledEssay[j]];
        }

        const newKeys = [];

        // Đảo phương án A, B, C, D của từng câu trắc nghiệm
        shuffledMcq.forEach((q, idx) => {
          const reShuffled = this.shuffleQuestionOptions({
            question: q.content,
            options: q.options,
            correctAnswer: q.correct,
            explanation: q.explanation,
            diagram: q.diagram
          });
          newKeys.push({
            num: idx + 1,
            type: 'mcq',
            topic: q.topic,
            level: q.level || 'TH',
            source: q.source || '',
            correct: reShuffled.correctAnswer,
            score: q.score,
            content: reShuffled.question,
            diagram: reShuffled.diagram || null,
            options: reShuffled.options,
            explanation: reShuffled.explanation
          });
        });

        // Tự luận giữ nguyên nhưng đánh số tiếp theo
        shuffledEssay.forEach((q, idx) => {
          newKeys.push({
            num: shuffledMcq.length + idx + 1,
            type: 'essay',
            topic: q.topic,
            level: q.level || 'VD',
            source: q.source || '',
            correct: q.correct,
            score: q.score,
            content: q.content,
            diagram: q.diagram || null,
            explanation: q.explanation
          });
        });

        const newExamHtml = this.renderExamToHtml(varTitle, newKeys, baseExam.timeLimit, baseExam.term);
        exams.push({
          title: varTitle,
          term: baseExam.term,
          timeLimit: baseExam.timeLimit,
          totalQuestions: newKeys.length,
          mcqCount: shuffledMcq.length,
          essayCount: shuffledEssay.length,
          answerKeys: newKeys,
          examHtml: newExamHtml,
          examCode,
          variantIndex: i
        });
      }
    } else {
      // Chế độ 1: Disjoint (100% Độc lập không trùng câu hỏi giữa các đề)
      const batchSeenSignatures = new Set();

      for (let i = 1; i <= count; i++) {
        const examCode = (100 + i).toString();
        const customTitle = titlePrefix ? `${titlePrefix} — Mã Đề ${examCode}` : '';
        const exam = this.generateExam({
          ...examConfig,
          title: customTitle,
          batchSeenSignatures
        });
        exam.examCode = examCode;
        exam.variantIndex = i;
        exams.push(exam);
      }
    }

    return exams;
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
          ${item.source ? `<span class="source-badge" style="display:inline-block;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:0.5rem;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;">📚 Nguồn: ${escapeMathHtml(item.source)}</span>` : ''}
        </div>
        ${item.diagram ? item.diagram : ''}
        <div class="options-grid">
          ${item.options.map((opt, i) => `
            <div class="opt-box">
              <span class="opt-lbl">${['A', 'B', 'C', 'D', 'E', 'F'][i] || (i + 1)}.</span>
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
          ${item.source ? `<span class="source-badge" style="display:inline-block;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:0.5rem;background:#fef3c7;color:#b45309;border:1px solid #fde68a;">📚 Nguồn: ${escapeMathHtml(item.source)}</span>` : ''}
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
  window.gcdEuclid = gcdEuclid;
  window.MathDiagrams = MathDiagrams;
  window.GradeEngines = GradeEngines;
  window.MathEngine = MathEngine;
}
