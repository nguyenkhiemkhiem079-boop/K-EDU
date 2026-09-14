function khtnAssignScores(keys) {
  const essay = keys.filter(k => k.type === 'essay');
  const mcq = keys.filter(k => k.type !== 'essay');
  const assign = (items, cents) => items.forEach((k, i) => { k.score = (Math.floor(cents / items.length) + (i < cents % items.length ? 1 : 0)) / 100; });
  assign(essay, essay.length ? (mcq.length ? 300 : 1000) : 0);
  assign(mcq, essay.length ? 700 : 1000);
}

function khtnQuestionSignature(text) { return String(text || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s*\(Biến thể\s+\d+\)\s*$/iu, '').trim().replace(/\s+/g, ' '); }

/**
 * ============================================================================
 * K-EDU KHTN ENGINE — BỘ SINH ĐỀ THI KHOA HỌC TỰ NHIÊN (GDPT 2018)
 * Phiên bản: 4.0 — Tích hợp Anti-Duplicate Guard, mhchem và Kho Tài Liệu Thật
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Helper escape HTML
  function escapeKhtnHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Shuffle mảng (Fisher-Yates)
  function shuffleArray(arr) {
    const res = [...arr];
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [res[i], res[j]] = [res[j], res[i]];
    }
    return res;
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ============================================================================
  // CÁC DẠNG BÀI TẬP TÍNH TOÁN KHOA HỌC TỰ NHIÊN (ĐÃ KIỂM CHUẨN CÔNG THỨC)
  // ============================================================================

  /**
   * 1. PHÂN MÔN VẬT LÝ
   */
  const PhysicsCalculations = {
    // Dạng 1.1: Vận tốc v = s / t (Lớp 7, 8)
    velocityQuestion(index = 1) {
      const modes = ['calc_v', 'calc_s', 'calc_t'];
      const mode = pickRandom(modes);

      if (mode === 'calc_v') {
        // v = s / t (km/h)
        const pairs = [
          { s: 30, t: 0.5, v: 60, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 45, t: 1.5, v: 30, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 60, t: 1.5, v: 40, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 90, t: 2, v: 45, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 120, t: 2.5, v: 48, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 150, t: 3, v: 50, unitS: 'km', unitT: 'giờ', unitV: 'km/h' },
          { s: 200, t: 10, v: 20, unitS: 'm', unitT: 'giây', unitV: 'm/s' },
          { s: 300, t: 15, v: 20, unitS: 'm', unitT: 'giây', unitV: 'm/s' },
          { s: 500, t: 25, v: 20, unitS: 'm', unitT: 'giây', unitV: 'm/s' },
          { s: 600, t: 40, v: 15, unitS: 'm', unitT: 'giây', unitV: 'm/s' }
        ];
        const data = pickRandom(pairs);
        const correctVal = data.v;
        const distractors = [
          correctVal + 10,
          Math.max(5, correctVal - 10),
          Math.round((data.s * data.t) * 10) / 10
        ].filter(x => x !== correctVal);

        const options = [
          `${correctVal} ${data.unitV}`,
          `${distractors[0]} ${data.unitV}`,
          `${distractors[1]} ${data.unitV}`,
          `${distractors[2] || correctVal + 15} ${data.unitV}`
        ];

        return {
          id: `KHTN_CALC_V_${Date.now()}_${index}`,
          grade: '7',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một chuyển động đi được quãng đường $s = ${data.s}\\text{ ${data.unitS}}$ trong thời gian $t = ${data.t}\\text{ ${data.unitT}}$. Tốc độ trung bình của chuyển động là:`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức tính tốc độ: $v = \\frac{s}{t} = \\frac{${data.s}}{${data.t}} = ${correctVal}\\text{ ${data.unitV}}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else if (mode === 'calc_s') {
        // s = v * t
        const pairs = [
          { v: 40, t: 1.5, s: 60, unitV: 'km/h', unitT: 'giờ', unitS: 'km' },
          { v: 45, t: 2, s: 90, unitV: 'km/h', unitT: 'giờ', unitS: 'km' },
          { v: 50, t: 2.5, s: 125, unitV: 'km/h', unitT: 'giờ', unitS: 'km' },
          { v: 60, t: 1.5, s: 90, unitV: 'km/h', unitT: 'giờ', unitS: 'km' },
          { v: 12, t: 25, s: 300, unitV: 'm/s', unitT: 'giây', unitS: 'm' },
          { v: 15, t: 20, s: 300, unitV: 'm/s', unitT: 'giây', unitS: 'm' }
        ];
        const data = pickRandom(pairs);
        const correctVal = data.s;
        const options = [
          `${correctVal} ${data.unitS}`,
          `${Math.round(data.v / data.t)} ${data.unitS}`,
          `${correctVal + 20} ${data.unitS}`,
          `${Math.max(10, correctVal - 30)} ${data.unitS}`
        ];

        return {
          id: `KHTN_CALC_S_${Date.now()}_${index}`,
          grade: '7',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một ô tô chuyển động với tốc độ không đổi $v = ${data.v}\\text{ ${data.unitV}}$ trong thời gian $t = ${data.t}\\text{ ${data.unitT}}$. Quãng đường ô tô đã đi được là:`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức: $s = v \\times t = ${data.v} \\times ${data.t} = ${correctVal}\\text{ ${data.unitS}}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        // t = s / v
        const pairs = [
          { s: 75, v: 50, t: 1.5, unitS: 'km', unitV: 'km/h', unitT: 'giờ' },
          { s: 120, v: 60, t: 2, unitS: 'km', unitV: 'km/h', unitT: 'giờ' },
          { s: 180, v: 45, t: 4, unitS: 'km', unitV: 'km/h', unitT: 'giờ' },
          { s: 400, v: 20, t: 20, unitS: 'm', unitV: 'm/s', unitT: 'giây' },
          { s: 600, v: 15, t: 40, unitS: 'm', unitV: 'm/s', unitT: 'giây' }
        ];
        const data = pickRandom(pairs);
        const correctVal = data.t;
        const options = [
          `${correctVal} ${data.unitT}`,
          `${correctVal + 1} ${data.unitT}`,
          `${Math.max(0.5, correctVal - 0.5)} ${data.unitT}`,
          `${Math.round((data.s * data.v) / 100)} ${data.unitT}`
        ];

        return {
          id: `KHTN_CALC_T_${Date.now()}_${index}`,
          grade: '7',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một người đi xe máy với tốc độ $v = ${data.v}\\text{ ${data.unitV}}$ trên quãng đường dài $s = ${data.s}\\text{ ${data.unitS}}$. Thời gian chuyển động là:`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức: $t = \\frac{s}{v} = \\frac{${data.s}}{${data.v}} = ${correctVal}\\text{ ${data.unitT}}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 1.2: Khối lượng riêng D = m / V (Lớp 8)
    densityQuestion(index = 1) {
      const substances = [
        { name: 'nhôm', D: 2.7, unitD: 'g/cm³', D_kg: 2700, unitD_kg: 'kg/m³' },
        { name: 'sắt', D: 7.8, unitD: 'g/cm³', D_kg: 7800, unitD_kg: 'kg/m³' },
        { name: 'đồng', D: 8.9, unitD: 'g/cm³', D_kg: 8900, unitD_kg: 'kg/m³' },
        { name: 'chì', D: 11.3, unitD: 'g/cm³', D_kg: 11300, unitD_kg: 'kg/m³' }
      ];
      const sub = pickRandom(substances);
      const mode = pickRandom(['calc_D', 'calc_m', 'calc_V']);

      if (mode === 'calc_D') {
        const volumes = [50, 100, 150, 200];
        const V = pickRandom(volumes);
        const m = Math.round(sub.D * V * 10) / 10;
        const correctVal = sub.D;
        const options = [
          `${correctVal} g/cm³`,
          `${Math.round((correctVal + 1.2) * 10) / 10} g/cm³`,
          `${Math.max(1, Math.round((correctVal - 1.1) * 10) / 10)} g/cm³`,
          `${Math.round(m / (V * 2) * 10) / 10} g/cm³`
        ];

        return {
          id: `KHTN_CALC_D_${Date.now()}_${index}`,
          grade: '8',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một khối kim loại bằng ${sub.name} có thể tích $V = ${V}\\text{ cm}^3$ và khối lượng $m = ${m}\\text{ g}$. Khối lượng riêng của kim loại này là:`,
          options,
          correctAnswer: 'A',
          explanation: `Công thức khối lượng riêng: $D = \\frac{m}{V} = \\frac{${m}}{${V}} = ${correctVal}\\text{ g/cm}^3$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else if (mode === 'calc_m') {
        const volumes = [20, 50, 80, 100];
        const V = pickRandom(volumes);
        const m = Math.round(sub.D * V * 10) / 10;
        const correctVal = m;
        const options = [
          `${correctVal} g`,
          `${correctVal + 50} g`,
          `${Math.max(10, correctVal - 30)} g`,
          `${Math.round((V / sub.D) * 10) / 10} g`
        ];

        return {
          id: `KHTN_CALC_M_DENSITY_${Date.now()}_${index}`,
          grade: '8',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Biết khối lượng riêng của ${sub.name} là $D = ${sub.D}\\text{ g/cm}^3$. Một vật bằng ${sub.name} có thể tích $V = ${V}\\text{ cm}^3$ sẽ có khối lượng là:`,
          options,
          correctAnswer: 'A',
          explanation: `Từ $D = \\frac{m}{V} \\Rightarrow m = D \\times V = ${sub.D} \\times ${V} = ${correctVal}\\text{ g}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        const volumes = [20, 50, 100];
        const V = pickRandom(volumes);
        const m = Math.round(sub.D * V * 10) / 10;
        const correctVal = V;
        const options = [
          `${correctVal} cm³`,
          `${correctVal + 25} cm³`,
          `${Math.max(5, correctVal - 10)} cm³`,
          `${Math.round(m * sub.D)} cm³`
        ];

        return {
          id: `KHTN_CALC_V_DENSITY_${Date.now()}_${index}`,
          grade: '8',
          topic: 'vat_ly',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Khối lượng riêng của ${sub.name} là $D = ${sub.D}\\text{ g/cm}^3$. Thể tích của một khối ${sub.name} có khối lượng $m = ${m}\\text{ g}$ là:`,
          options,
          correctAnswer: 'A',
          explanation: `Từ $D = \\frac{m}{V} \\Rightarrow V = \\frac{m}{D} = \\frac{${m}}{${sub.D}} = ${correctVal}\\text{ cm}^3$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 1.3: Tính nhiệt lượng Q = mcΔt (Lớp 8, 9)
    heatQuestion(index = 1) {
      const liquids = [
        { name: 'nước', c: 4200, unitC: 'J/(kg·K)' },
        { name: 'đồng', c: 380, unitC: 'J/(kg·K)' },
        { name: 'nhôm', c: 880, unitC: 'J/(kg·K)' },
        { name: 'sắt', c: 460, unitC: 'J/(kg·K)' }
      ];
      const mat = pickRandom(liquids);
      const mList = [1, 2, 3, 5];
      const m = pickRandom(mList);
      const t1 = pickRandom([20, 25, 30]);
      const deltaT = pickRandom([20, 30, 40, 50]);
      const t2 = t1 + deltaT;

      const Q = m * mat.c * deltaT;
      const Q_kJ = Q / 1000;

      const mode = pickRandom(['calc_Q', 'calc_deltaT']);

      if (mode === 'calc_Q') {
        const correctVal = `${Q.toLocaleString('vi-VN')} J (hay ${Q_kJ} kJ)`;
        const wrong1 = `${(Q * 2).toLocaleString('vi-VN')} J (hay ${Q_kJ * 2} kJ)`;
        const wrong2 = `${(Math.round(Q / 2)).toLocaleString('vi-VN')} J (hay ${Q_kJ / 2} kJ)`;
        const wrong3 = `${(m * mat.c * t2).toLocaleString('vi-VN')} J`;

        const options = [correctVal, wrong1, wrong2, wrong3];

        return {
          id: `KHTN_CALC_HEAT_Q_${Date.now()}_${index}`,
          grade: '8',
          topic: 'vat_ly',
          level: 'VD',
          type: 'mcq',
          subject: 'khtn',
          question: `Tính nhiệt lượng cần truyền cho $m = ${m}\\text{ kg}$ ${mat.name} ($c = ${mat.c}\\text{ J/(kg}\\cdot\\text{K)}$) để tăng nhiệt độ từ $t_1 = ${t1}^\\circ\\text{C}$ lên $t_2 = ${t2}^\\circ\\text{C}$.`,
          options,
          correctAnswer: 'A',
          explanation: `Nhiệt lượng cần cung cấp: $Q = m \\cdot c \\cdot \\Delta t = ${m} \\times ${mat.c} \\times (${t2} - ${t1}) = ${Q.toLocaleString('vi-VN')}\\text{ J} = ${Q_kJ}\\text{ kJ}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        const correctVal = `${deltaT}°C`;
        const options = [
          correctVal,
          `${deltaT + 10}°C`,
          `${Math.max(5, deltaT - 15)}°C`,
          `${t2}°C`
        ];

        return {
          id: `KHTN_CALC_HEAT_DELTAT_${Date.now()}_${index}`,
          grade: '8',
          topic: 'vat_ly',
          level: 'VD',
          type: 'mcq',
          subject: 'khtn',
          question: `Người ta cung cấp nhiệt lượng $Q = ${Q_kJ}\\text{ kJ}$ ($=${Q}\\text{ J}$) cho khối lượng $m = ${m}\\text{ kg}$ ${mat.name} ($c = ${mat.c}\\text{ J/(kg}\\cdot\\text{K)}$). Nhiệt độ của vật sẽ tăng thêm một lượng $\\Delta t$ là:`,
          options,
          correctAnswer: 'A',
          explanation: `Độ tăng nhiệt độ: $\\Delta t = \\frac{Q}{m \\cdot c} = \\frac{${Q}}{${m} \\times ${mat.c}} = ${deltaT}^\\circ\\text{C}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 1.4: Tự luận tính toán Vật lý (Vận tốc / Nhiệt lượng / Khối lượng riêng)
    essayPhysicsQuestion(index = 1) {
      const templates = [
        {
          question: `Một xe ô tô chạy từ Hà Nội đến Hải Phòng với quãng đường dài $120\\text{ km}$. Biết ô tô chuyển động với tốc độ không đổi $v = 60\\text{ km/h}$. Hãy tính thời gian (giờ) để xe đi hết quãng đường đó.`,
          correctAnswer: '2 | 2 giờ | t=2 | 2h',
          explanation: `Áp dụng công thức tính thời gian: $t = \\frac{s}{v} = \\frac{120}{60} = 2\\text{ (giờ)}$.`
        },
        {
          question: `Tính nhiệt lượng (theo đơn vị kJ) cần cung cấp để đun nóng $2\\text{ kg}$ nước từ $20^\\circ\\text{C}$ lên $100^\\circ\\text{C}$. Biết nhiệt dung riêng của nước là $c = 4200\\text{ J/(kg}\\cdot\\text{K)}$. (Chỉ điền số nguyên kJ).`,
          correctAnswer: '672 | 672 kJ',
          explanation: `Nhiệt lượng: $Q = m \\cdot c \\cdot \\Delta t = 2 \\times 4200 \\times (100 - 20) = 672\\,000\\text{ J} = 672\\text{ kJ}$.`
        },
        {
          question: `Một khối sắt có thể tích $V = 50\\text{ cm}^3$, khối lượng riêng của sắt là $D = 7.8\\text{ g/cm}^3$. Tính khối lượng của khối sắt theo đơn vị gam.`,
          correctAnswer: '390 | 390g | 390 gam',
          explanation: `Khối lượng: $m = D \\times V = 7.8 \\times 50 = 390\\text{ (g)}$.`
        }
      ];
      const chosen = pickRandom(templates);
      return {
        id: `KHTN_ESSAY_PHYS_${Date.now()}_${index}`,
        grade: '8',
        topic: 'vat_ly',
        level: 'VD',
        type: 'essay',
        subject: 'khtn',
        question: chosen.question,
        options: [],
        correctAnswer: chosen.correctAnswer,
        explanation: chosen.explanation,
        source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
      };
    }
  };

  /**
   * 2. PHÂN MÔN HÓA HỌC
   */
  const ChemistryCalculations = {
    // Dạng 2.1: Số mol n = m / M (Lớp 8, 9)
    moleQuestion(index = 1) {
      const chemicals = [
        { name: 'Sắt (Fe)', formula: 'Fe', M: 56, samples: [{ m: 5.6, n: 0.1 }, { m: 11.2, n: 0.2 }, { m: 28, n: 0.5 }] },
        { name: 'Đồng (Cu)', formula: 'Cu', M: 64, samples: [{ m: 6.4, n: 0.1 }, { m: 12.8, n: 0.2 }, { m: 32, n: 0.5 }] },
        { name: 'Nhôm (Al)', formula: 'Al', M: 27, samples: [{ m: 2.7, n: 0.1 }, { m: 5.4, n: 0.2 }, { m: 8.1, n: 0.3 }] },
        { name: 'Canxi cacbonat (CaCO₃)', formula: '\\ce{CaCO3}', M: 100, samples: [{ m: 10, n: 0.1 }, { m: 20, n: 0.2 }, { m: 50, n: 0.5 }] },
        { name: 'Natri hidroxit (NaOH)', formula: '\\ce{NaOH}', M: 40, samples: [{ m: 4, n: 0.1 }, { m: 8, n: 0.2 }, { m: 20, n: 0.5 }] },
        { name: 'Axit sunfuric (H₂SO₄)', formula: '\\ce{H2SO4}', M: 98, samples: [{ m: 9.8, n: 0.1 }, { m: 19.6, n: 0.2 }, { m: 49, n: 0.5 }] }
      ];

      const chem = pickRandom(chemicals);
      const sample = pickRandom(chem.samples);
      const mode = pickRandom(['calc_n', 'calc_m']);

      if (mode === 'calc_n') {
        const correctVal = `${sample.n} mol`;
        const wrong1 = `${Math.round((sample.n * 2) * 10) / 10} mol`;
        const wrong2 = `${Math.round((sample.n / 2) * 100) / 100} mol`;
        const wrong3 = `${Math.round((sample.m / 10) * 10) / 10} mol`;

        const options = [correctVal, wrong1, wrong2, wrong3];

        return {
          id: `KHTN_CALC_MOLE_N_${Date.now()}_${index}`,
          grade: '8',
          topic: 'hoa_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Số mol tương ứng với $m = ${sample.m}\\text{ g}$ ${chem.name} (khối lượng mol $M = ${chem.M}\\text{ g/mol}$) là:`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức tính số mol: $n = \\frac{m}{M} = \\frac{${sample.m}}{${chem.M}} = ${sample.n}\\text{ mol}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        const correctVal = `${sample.m} g`;
        const wrong1 = `${sample.m * 2} g`;
        const wrong2 = `${Math.round(sample.m / 2 * 10) / 10} g`;
        const wrong3 = `${chem.M} g`;

        const options = [correctVal, wrong1, wrong2, wrong3];

        return {
          id: `KHTN_CALC_MOLE_M_${Date.now()}_${index}`,
          grade: '8',
          topic: 'hoa_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Khối lượng của $n = ${sample.n}\\text{ mol}$ ${chem.name} (biết $M = ${chem.M}\\text{ g/mol}$) là:`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức chuyển đổi: $m = n \\times M = ${sample.n} \\times ${chem.M} = ${sample.m}\\text{ g}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 2.2: Nồng độ phần trăm dung dịch C% = (m_ct / m_dd) * 100% (Lớp 8, 9)
    concentrationQuestion(index = 1) {
      const dataSet = [
        { m_ct: 10, m_dm: 90, m_dd: 100, C: 10, solute: 'NaCl' },
        { m_ct: 20, m_dm: 80, m_dd: 100, C: 20, solute: 'đường sacarozơ' },
        { m_ct: 15, m_dm: 185, m_dd: 200, C: 7.5, solute: 'NaCl' },
        { m_ct: 25, m_dm: 225, m_dd: 250, C: 10, solute: 'CuSO₄' },
        { m_ct: 40, m_dm: 160, m_dd: 200, C: 20, solute: 'NaOH' },
        { m_ct: 50, m_dm: 450, m_dd: 500, C: 10, solute: 'KNO₃' }
      ];

      const item = pickRandom(dataSet);
      const mode = pickRandom(['calc_C', 'calc_mct']);

      if (mode === 'calc_C') {
        const correctVal = `${item.C}%`;
        const distractors = [
          `${Math.round((item.m_ct / item.m_dm) * 100 * 10) / 10}%`, // Lỗi phổ biến: chia m nước thay vì m dd
          `${item.C * 2}%`,
          `${Math.max(2, item.C - 3)}%`
        ];
        const options = [correctVal, distractors[0], distractors[1], distractors[2]];

        return {
          id: `KHTN_CALC_CONC_C_${Date.now()}_${index}`,
          grade: '8',
          topic: 'hoa_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Hòa tan hoàn toàn $${item.m_ct}\\text{ g}$ ${item.solute} vào $${item.m_dm}\\text{ g}$ nước cất. Nồng độ phần trăm ($C\\%$) của dung dịch thu được là:`,
          options,
          correctAnswer: 'A',
          explanation: `Khối lượng dung dịch: $m_{dd} = m_{ct} + m_{\\text{nước}} = ${item.m_ct} + ${item.m_dm} = ${item.m_dd}\\text{ g}$.\nNồng độ phần trăm: $C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\% = \\frac{${item.m_ct}}{${item.m_dd}} \\times 100\\% = ${item.C}\\%$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        const correctVal = `${item.m_ct} g`;
        const options = [
          correctVal,
          `${item.m_ct * 2} g`,
          `${Math.round(item.m_dd / item.C)} g`,
          `${Math.max(5, item.m_ct - 5)} g`
        ];

        return {
          id: `KHTN_CALC_CONC_MCT_${Date.now()}_${index}`,
          grade: '8',
          topic: 'hoa_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Để pha được $${item.m_dd}\\text{ g}$ dung dịch ${item.solute} có nồng độ $${item.C}\\%$, cần dùng bao nhiêu gam chất tan ${item.solute}?`,
          options,
          correctAnswer: 'A',
          explanation: `Áp dụng công thức: $m_{ct} = \\frac{C\\% \\times m_{dd}}{100\\%} = \\frac{${item.C} \\times ${item.m_dd}}{100} = ${item.m_ct}\\text{ g}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 2.3: Thể tích khí ở đkc (chuẩn GDPT 2018: 24.79 L/mol tại 25°C, 1 bar)
    gasVolumeQuestion(index = 1) {
      const gasSamples = [
        { formula: '\\ce{H2}', name: 'khí hiđro', n: 0.1, V: 2.479 },
        { formula: '\\ce{O2}', name: 'khí oxi', n: 0.2, V: 4.958 },
        { formula: '\\ce{CO2}', name: 'khí cacbonic', n: 0.5, V: 12.395 },
        { formula: '\\ce{N2}', name: 'khí nitơ', n: 1.0, V: 24.79 }
      ];
      const g = pickRandom(gasSamples);
      const correctVal = `${g.V} lít`;
      const wrong1 = `${Math.round(g.n * 22.4 * 100) / 100} lít`; // Giá trị theo chương trình cũ 22.4L
      const wrong2 = `${g.V * 2} lít`;
      const wrong3 = `${Math.round((g.V / 2) * 1000) / 1000} lít`;

      const options = [correctVal, wrong1, wrong2, wrong3];

      return {
        id: `KHTN_CALC_GAS_VOL_${Date.now()}_${index}`,
        grade: '8',
        topic: 'hoa_hoc',
        level: 'TH',
        type: 'mcq',
        subject: 'khtn',
        question: `Theo chương trình GDPT 2018 (ở điều kiện chuẩn $25^\\circ\\text{C}$ và $1\\text{ bar}$, $1\\text{ mol}$ chất khí chiếm thể tích $24.79\\text{ lít}$). Thể tích của $${g.n}\\text{ mol}$ ${g.name} (${g.formula}) ở đkc là:`,
        options,
        correctAnswer: 'A',
        explanation: `Thể tích khí ở đkc: $V = n \\times 24.79 = ${g.n} \\times 24.79 = ${g.V}\\text{ (lít)}$.`,
        source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
      };
    },

    // Dạng 2.4: Tự luận tính toán Hóa học (Tính số mol / Khối lượng / Nồng độ)
    essayChemistryQuestion(index = 1) {
      const templates = [
        {
          question: `Cho $11.2\\text{ g}$ kim loại sắt (Fe) phản ứng vừa đủ với dung dịch axit clohiđric theo phương trình:\\n$$\\ce{Fe + 2HCl -> FeCl2 + H2 ^}$$\\nBiết $M_{\\text{Fe}} = 56\\text{ g/mol}$. Hãy tính số mol khí $\\ce{H2}$ thoát ra.`,
          correctAnswer: '0.2 | 0.2 mol | 0,2',
          explanation: `Số mol Fe tham gia phản ứng: $n_{\\text{Fe}} = \\frac{11.2}{56} = 0.2\\text{ mol}$.\\nTheo PTHH: $n_{\\ce{H2}} = n_{\\text{Fe}} = 0.2\\text{ mol}$.`
        },
        {
          question: `Hòa tan $20\\text{ g}$ muối ăn (NaCl) vào $180\\text{ g}$ nước cất. Tính nồng độ phần trăm ($C\\%$) của dung dịch thu được. (Chỉ ghi số phần trăm, ví dụ: 10).`,
          correctAnswer: '10 | 10% | 10 percent',
          explanation: `Khối lượng dung dịch: $m_{dd} = 20 + 180 = 200\\text{ g}$.\\nNồng độ phần trăm: $C\\% = \\frac{20}{200} \\times 100\\% = 10\\%$.`
        },
        {
          question: `Cần lấy bao nhiêu gam chất tan $\\ce{NaOH}$ để pha chế thành $250\\text{ g}$ dung dịch $\\ce{NaOH}$ $8\\%$? (Chỉ điền số gam).`,
          correctAnswer: '20 | 20g | 20 gam',
          explanation: `Khối lượng chất tan: $m_{\\ce{NaOH}} = \\frac{8 \\times 250}{100} = 20\\text{ g}$.`
        }
      ];
      const chosen = pickRandom(templates);
      return {
        id: `KHTN_ESSAY_CHEM_${Date.now()}_${index}`,
        grade: '8',
        topic: 'hoa_hoc',
        level: 'VD',
        type: 'essay',
        subject: 'khtn',
        question: chosen.question,
        options: [],
        correctAnswer: chosen.correctAnswer,
        explanation: chosen.explanation,
        source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
      };
    }
  };

  /**
   * 3. PHÂN MÔN SINH HỌC
   */
  const BiologyCalculations = {
    // Dạng 3.1: Cấu trúc phân tử ADN / Gen (Lớp 9)
    adnQuestion(index = 1) {
      const dataSet = [
        { N: 1200, L_angstrom: 2040, L_nm: 204, C: 60 },
        { N: 1500, L_angstrom: 2550, L_nm: 255, C: 75 },
        { N: 1800, L_angstrom: 3060, L_nm: 306, C: 90 },
        { N: 2400, L_angstrom: 4080, L_nm: 408, C: 120 },
        { N: 3000, L_angstrom: 5100, L_nm: 510, C: 150 }
      ];
      const item = pickRandom(dataSet);
      const mode = pickRandom(['calc_L', 'calc_C']);

      if (mode === 'calc_L') {
        const correctVal = `${item.L_angstrom} Å (hay ${item.L_nm} nm)`;
        const wrong1 = `${item.L_angstrom * 2} Å`;
        const wrong2 = `${Math.round(item.N * 3.4)} Å`;
        const wrong3 = `${Math.round(item.L_angstrom / 2)} Å`;

        const options = [correctVal, wrong1, wrong2, wrong3];

        return {
          id: `KHTN_CALC_ADN_L_${Date.now()}_${index}`,
          grade: '9',
          topic: 'sinh_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một phân tử ADN (gen) có tổng số $N = ${item.N}$ nuclêôtit. Chiều dài của phân tử ADN này là:`,
          options,
          correctAnswer: 'A',
          explanation: `Chiều dài phân tử ADN: $L = \\frac{N}{2} \\times 3.4\\text{ \\AA} = \\frac{${item.N}}{2} \\times 3.4 = ${item.L_angstrom}\\text{ \\AA} = ${item.L_nm}\\text{ nm}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      } else {
        const correctVal = `${item.C} chu kỳ`;
        const wrong1 = `${item.C * 2} chu kỳ`;
        const wrong2 = `${Math.round(item.N / 10)} chu kỳ`;
        const wrong3 = `${item.C + 10} chu kỳ`;

        const options = [correctVal, wrong1, wrong2, wrong3];

        return {
          id: `KHTN_CALC_ADN_C_${Date.now()}_${index}`,
          grade: '9',
          topic: 'sinh_hoc',
          level: 'TH',
          type: 'mcq',
          subject: 'khtn',
          question: `Một gen có tổng số $N = ${item.N}$ nuclêôtit. Biết mỗi chu kỳ xoắn của ADN gồm 10 cặp nuclêôtit ($20$ nuclêôtit). Số chu kỳ xoắn của gen là:`,
          options,
          correctAnswer: 'A',
          explanation: `Số chu kỳ xoắn của gen: $C = \\frac{N}{20} = \\frac{${item.N}}{20} = ${item.C}\\text{ chu kỳ}$.`,
          source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
        };
      }
    },

    // Dạng 3.2: Tự luận tính toán Sinh học (Chiều dài / Số chu kỳ ADN)
    essayBiologyQuestion(index = 1) {
      const dataSet = [
        { N: 1800, L: 3060, C: 90 },
        { N: 2400, L: 4080, C: 120 }
      ];
      const item = pickRandom(dataSet);
      return {
        id: `KHTN_ESSAY_BIO_${Date.now()}_${index}`,
        grade: '9',
        topic: 'sinh_hoc',
        level: 'VD',
        type: 'essay',
        subject: 'khtn',
        question: `Một phân tử ADN mạch kép có tổng số nuclêôtit $N = ${item.N}$. Tính số chu kỳ xoắn của phân tử ADN này.`,
        options: [],
        correctAnswer: `${item.C} | ${item.C} chu kỳ`,
        explanation: `Số chu kỳ xoắn: $C = \\frac{N}{20} = \\frac{${item.N}}{20} = ${item.C}\\text{ chu kỳ}$.`,
        source: 'Biên soạn chuẩn GDPT 2018 — KhtnEngine'
      };
    }
  };

  // ============================================================================
  // CƠ CHẾ SINH BỘ ĐỀ VÀ ANTI-DUPLICATE GUARD CỦA KHTN ENGINE
  // ============================================================================
  const KhtnEngine = {
    /**
     * Đảo ngẫu nhiên vị trí các lựa chọn A, B, C, D của câu trắc nghiệm
     */
    shuffleQuestionOptions(q) {
      if (!q.options || q.options.length === 0) return q;
      const indices = q.options.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      const letterMap = ['A', 'B', 'C', 'D', 'E', 'F'];
      let correctOriginalIndex = 0;
      if (q.correctAnswer && typeof q.correctAnswer === 'string') {
        const foundIdx = letterMap.indexOf(q.correctAnswer.toUpperCase());
        if (foundIdx !== -1 && foundIdx < q.options.length) {
          correctOriginalIndex = foundIdx;
        }
      }
      const newCorrectIdx = indices.indexOf(correctOriginalIndex);

      return {
        ...q,
        options: indices.map(i => q.options[i]),
        correctAnswer: letterMap[newCorrectIdx] || 'A'
      };
    },

    /**
     * Lấy các hàm template tính toán theo phân môn
     */
    getCalculationTemplates(topic = 'all') {
      const templates = [];
      if (topic === 'all' || topic === 'vat_ly') {
        templates.push((i) => PhysicsCalculations.velocityQuestion(i));
        templates.push((i) => PhysicsCalculations.densityQuestion(i));
        templates.push((i) => PhysicsCalculations.heatQuestion(i));
      }
      if (topic === 'all' || topic === 'hoa_hoc') {
        templates.push((i) => ChemistryCalculations.moleQuestion(i));
        templates.push((i) => ChemistryCalculations.concentrationQuestion(i));
        templates.push((i) => ChemistryCalculations.gasVolumeQuestion(i));
      }
      if (topic === 'all' || topic === 'sinh_hoc') {
        templates.push((i) => BiologyCalculations.adnQuestion(i));
      }
      return templates;
    },

    /**
     * Lấy các hàm template tự luận tính toán theo phân môn
     */
    getEssayTemplates(topic = 'all') {
      const templates = [];
      if (topic === 'all' || topic === 'vat_ly') {
        templates.push((i) => PhysicsCalculations.essayPhysicsQuestion(i));
      }
      if (topic === 'all' || topic === 'hoa_hoc') {
        templates.push((i) => ChemistryCalculations.essayChemistryQuestion(i));
      }
      if (topic === 'all' || topic === 'sinh_hoc') {
        templates.push((i) => BiologyCalculations.essayBiologyQuestion(i));
      }
      return templates;
    },

    /**
     * API CHÍNH: SINH BỘ ĐỀ THI KHTN
     * Chuẩn format answerKeys như MathEngine.generateExam
     */
    generateExam(config = {}) {
      const difficultyMode = config.difficultyMode || 'mixed';
      const discipline = config.discipline || 'all';
      if (!['basic', 'advanced', 'mixed'].includes(difficultyMode)) throw new Error('Chế độ độ khó không hợp lệ.');
      if (!['all', 'vat_ly', 'hoa_hoc', 'sinh_hoc'].includes(discipline)) throw new Error('Phân môn không hợp lệ.');
      const specializedPolicy = typeof SpecializedBankPolicy !== 'undefined' ? SpecializedBankPolicy : (typeof require === 'function' ? require('./specializedBankPolicy') : null);
      const matches = q => (discipline === 'all' || q.topic === discipline) && (difficultyMode === 'advanced' ? !!specializedPolicy?.isApproved(q) : difficultyMode === 'mixed' || ['NB', 'TH'].includes(String(q.level || '').toUpperCase()));
      if (difficultyMode === 'advanced') config = { ...config, sourceMode: 'document' };
      const {
        grade = '8',
        term = 'GK1',
        topic = 'all',
        sourceMode = 'document', // 'document' | 'hybrid' | 'synthetic'
        mcqCount = 12,
        essayMatrix = { TH: 1, VD: 1, VDC: 0 },
        timeLimit = 45,
        title = '',
        batchSeenSignatures = null
      } = config;

      const gStr = grade.toString();
      let warningMsg = null;

      // Danh sách các templates tính toán
      const scopedTopic = discipline === 'all' ? topic : discipline;
      // Metadata của mẫu được đọc từ câu sinh; ứng viên cũng được kiểm tra trước khi chọn.
      const mcqTemplates = this.getCalculationTemplates(scopedTopic).filter(t => matches(t(0)));
      const essayTemplates = this.getEssayTemplates(scopedTopic).filter(t => matches(t(0)));

      // ================= ANTI-DUPLICATE GUARD =================
      const selectedMcq = [];
      const seenSignatures = batchSeenSignatures || new Set();
      const mcqDeck = [];

      const refillMcqDeck = () => {
        mcqDeck.length = 0;
        for (let i = 0; i < mcqTemplates.length; i++) mcqDeck.push(i);
        // Tráo bộ bài
        for (let i = mcqDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mcqDeck[i], mcqDeck[j]] = [mcqDeck[j], mcqDeck[i]];
        }
      };

      // Tải danh sách câu hỏi tài liệu đã dùng gần đây
      let recentDocIds = new Set();
      try {
        if (typeof AppState !== 'undefined' && AppState.recentDocQuestionIds) {
          recentDocIds = AppState.recentDocQuestionIds;
        } else if (typeof localStorage !== 'undefined') {
          const stored = JSON.parse(localStorage.getItem('khiemedu_recent_doc_question_ids') || '[]');
          recentDocIds = new Set(stored);
        }
      } catch (e) {}

      // BƯỚC 1: LẤY CÂU HỎI TRỰC TIẾP TỪ KHO TÀI LIỆU (NẾU sourceMode LÀ 'document' HOẶC 'hybrid')
      if (typeof DocumentQuestionBank !== 'undefined' && sourceMode !== 'synthetic') {
        const queryFilter = { subject: 'khtn', type: 'mcq' };
        if (gStr !== 'all') queryFilter.grade = gStr;
        if (scopedTopic !== 'all') queryFilter.topic = scopedTopic;

        const docQuestions = DocumentQuestionBank.getQuestions(queryFilter).filter(matches);

        // Lọc bỏ câu đã xuất hiện trong đợt sinh hoặc dùng gần đây
        let availableDocQuestions = docQuestions.filter(q =>
          !seenSignatures.has(khtnQuestionSignature(q.question)) &&
          !recentDocIds.has(q.id)
        );

        if (availableDocQuestions.length < mcqCount) {
          const fallbackCandidates = docQuestions.filter(q =>
            !seenSignatures.has(khtnQuestionSignature(q.question))
          );
          availableDocQuestions = [...availableDocQuestions, ...fallbackCandidates.filter(q => !availableDocQuestions.includes(q))];
        }

        const shuffledDocs = availableDocQuestions;
        const countToTake = (sourceMode === 'hybrid')
          ? Math.min(Math.ceil(mcqCount / 2), shuffledDocs.length)
          : Math.min(mcqCount, shuffledDocs.length);

        for (let i = 0; i < countToTake; i++) {
          const q = shuffledDocs[i];
          if (seenSignatures.has(khtnQuestionSignature(q.question))) continue;
          const sig = khtnQuestionSignature(q.question);
          seenSignatures.add(sig);
          recentDocIds.add(q.id);
          selectedMcq.push({ ...q });
        }

        if (sourceMode === 'document' && selectedMcq.length < mcqCount) {
          const shortage = mcqCount - selectedMcq.length;
          warningMsg = `Ngân hàng tài liệu KHTN hiện chỉ có ${selectedMcq.length} câu phù hợp với tiêu chí (yêu cầu ${mcqCount} câu). Đề thiếu ${shortage} câu; cần bổ sung ngân hàng tài liệu.`;
        }
      }

      // Lưu lại recentDocIds vào AppState / localStorage
      try {
        if (typeof AppState !== 'undefined') AppState.recentDocQuestionIds = recentDocIds;
        if (typeof localStorage !== 'undefined') {
          const arr = Array.from(recentDocIds).slice(-50000);
          localStorage.setItem('khiemedu_recent_doc_question_ids', JSON.stringify(arr));
        }
      } catch (e) {}

      // BƯỚC 2: BỔ SUNG CÂU TÍNH TOÁN SINH TỰ ĐỘNG BẰNG ANTI-DUPLICATE GUARD
      const remainingMcqNeeded = sourceMode === 'document' ? 0 : mcqCount - selectedMcq.length;
      for (let i = 0; i < remainingMcqNeeded; i++) {
        if (!mcqTemplates.length) { warningMsg = 'Chưa đủ câu đúng môn và mức độ đã chọn; không lấy câu nhóm khác để bù.'; break; }
        let chosenQ = null;
        let attempts = 0;
        const maxAttempts = 40;

        while (attempts < maxAttempts) {
          attempts++;
          if (!mcqDeck.length) refillMcqDeck();
          const templateIdx = mcqDeck.pop();
          const candidate = mcqTemplates[templateIdx](selectedMcq.length + 1);
          if (!matches(candidate)) continue;
          const signature = khtnQuestionSignature(candidate.question);

          if (!seenSignatures.has(signature)) {
            seenSignatures.add(signature);
            chosenQ = candidate;
            break;
          }
        }

        // Fallback tạo biến thể nếu trùng lặp
        if (!chosenQ) {
          warningMsg = 'Không đủ câu hỏi độc nhất; đã dừng bổ sung để tránh trùng lặp.';
          break;
        }

        selectedMcq.push(chosenQ);
      }

      // ================= CÂU HỎI TỰ LUẬN TÍNH TOÁN =================
      const selectedEssay = [];
      const totalEssaysRequested = (essayMatrix.TH || 0) + (essayMatrix.VD || 0) + (essayMatrix.VDC || 0);

      // Thử lấy câu tự luận từ DocumentQuestionBank trước nếu có
      if (typeof DocumentQuestionBank !== 'undefined' && sourceMode !== 'synthetic') {
        const queryFilter = { subject: 'khtn', type: 'essay' };
        if (gStr !== 'all') queryFilter.grade = gStr;
        if (scopedTopic !== 'all') queryFilter.topic = scopedTopic;

        const docEssays = DocumentQuestionBank.getQuestions(queryFilter).filter(matches);
        const shuffledEssays = shuffleArray(docEssays);
        const takeEssay = Math.min(totalEssaysRequested, shuffledEssays.length);
        for (let i = 0; i < takeEssay; i++) {
          const q = shuffledEssays[i];
          const sig = khtnQuestionSignature(q.question);
          if (seenSignatures.has(sig)) continue;
          seenSignatures.add(sig);
          selectedEssay.push(q);
        }
      }

      // Bổ sung bằng templates tính toán tự luận
      const essayDeck = [];
      const refillEssayDeck = () => {
        essayDeck.length = 0;
        for (let i = 0; i < essayTemplates.length; i++) essayDeck.push(i);
        for (let i = essayDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [essayDeck[i], essayDeck[j]] = [essayDeck[j], essayDeck[i]];
        }
      };

      const remainingEssayNeeded = sourceMode === 'document' ? 0 : totalEssaysRequested - selectedEssay.length;
      for (let i = 0; i < remainingEssayNeeded; i++) {
        let candidate = null;
        for (let attempt = 0; attempt < 100 && essayTemplates.length; attempt++) {
          if (!essayDeck.length) refillEssayDeck();
          const q = essayTemplates[essayDeck.pop()](selectedEssay.length + 1);
          if (!matches(q)) continue;
          const sig = khtnQuestionSignature(q.question);
          if (seenSignatures.has(sig)) continue;
          seenSignatures.add(sig);
          candidate = q;
          break;
        }
        if (!candidate) {
          warningMsg = 'Không đủ câu tự luận độc nhất; đã dừng bổ sung để tránh trùng lặp.';
          break;
        }
        selectedEssay.push(candidate);
      }

      if (selectedMcq.length < mcqCount || selectedEssay.length < Object.values(essayMatrix).reduce((sum, n) => sum + n, 0)) {
        warningMsg = [warningMsg, 'Số câu thực tế ít hơn yêu cầu do ngân hàng chưa đủ câu độc nhất.'].filter(Boolean).join(' ');
      }

      // Tính điểm số
      const totalEssays = selectedEssay.length;
      const essayTotalScore = totalEssays > 0 ? (selectedMcq.length ? 3.0 : 10.0) : 0;
      const mcqTotalScore = 10.0 - essayTotalScore;
      const mcqScore = selectedMcq.length ? Math.round((mcqTotalScore / selectedMcq.length) * 100) / 100 : 0;
      const essayScore = totalEssays ? Math.round((essayTotalScore / totalEssays) * 100) / 100 : 0;

      const topicDisplayMap = {
        vat_ly: 'Vật lý',
        hoa_hoc: 'Hóa học',
        sinh_hoc: 'Sinh học',
        all: 'Khoa học Tự nhiên'
      };

      const answerKeys = [];

      // Format MCQ câu hỏi
      selectedMcq.forEach((q, idx) => {
        const shuffledQ = this.shuffleQuestionOptions(q);
        answerKeys.push({
          num: idx + 1,
          type: 'mcq',
          subject: 'khtn',
          topic: topicDisplayMap[q.topic] || q.topic || 'Khoa học Tự nhiên',
          level: q.level || 'TH',
          source: q.source || 'Biên soạn theo chương trình GDPT 2018',
          correct: shuffledQ.correctAnswer,
          score: mcqScore,
          content: shuffledQ.question,
          diagram: shuffledQ.diagram || null,
          options: shuffledQ.options,
          explanation: shuffledQ.explanation
        });
      });

      // Format Essay câu hỏi
      selectedEssay.forEach((q, idx) => {
        answerKeys.push({
          num: selectedMcq.length + idx + 1,
          type: 'essay',
          subject: 'khtn',
          topic: topicDisplayMap[q.topic] || q.topic || 'Khoa học Tự nhiên',
          level: q.level || 'VD',
          source: q.source || 'Biên soạn theo chương trình GDPT 2018',
          correct: q.correctAnswer || '',
          score: essayScore,
          content: q.question,
          diagram: q.diagram || null,
          explanation: q.explanation
        });
      });

      const termLabels = {
        GK1: 'Giữa Học Kỳ I',
        CK1: 'Cuối Học Kỳ I',
        GK2: 'Giữa Học Kỳ II',
        CK2: 'Cuối Học Kỳ II',
        all: 'Tổng Hợp Cả Năm'
      };

      const gradeLabel = gStr === 'all' ? 'Tổng Hợp (6-9)' : `Lớp ${gStr}`;
      const termLabel = termLabels[term] || 'Chuẩn Ma Trận';
      const topicLabel = topicDisplayMap[topic] || 'Tổng Hợp';
      const disciplineLabel = { vat_ly: 'Vật lý', hoa_hoc: 'Hóa học', sinh_hoc: 'Sinh học', all: 'KHTN tổng hợp' }[discipline];
      const difficultyLabel = difficultyMode === 'advanced' ? 'Nâng cao' : difficultyMode === 'basic' ? 'Cơ bản' : '';
      const examTitle = (title || `Đề Kiểm Tra ${termLabel} — ${disciplineLabel} ${gradeLabel} [${topicLabel}]`) + (difficultyLabel ? ` — ${difficultyLabel}` : '');

      khtnAssignScores(answerKeys);

      const examHtml = this.renderExamToHtml(examTitle, answerKeys, timeLimit, termLabel);

      return {
        title: examTitle,
        difficultyMode,
        specializedSourceOnly: difficultyMode === 'advanced',
        discipline,
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
     * Sinh hàng loạt N đề thi KHTN với cơ chế chống trùng lặp
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
        const baseTitle = titlePrefix ? `${titlePrefix} — Mã Đề 101` : '';
        const baseExam = this.generateExam({ ...examConfig, title: baseTitle });
        baseExam.examCode = '101';
        baseExam.variantIndex = 1;
        exams.push(baseExam);

        for (let i = 2; i <= count; i++) {
          const examCode = (100 + i).toString();
          const varTitle = titlePrefix
            ? `${titlePrefix} — Mã Đề ${examCode}`
            : (baseExam.title.replace(/Mã Đề \d+/, `Mã Đề ${examCode}`));

          const baseMcq = baseExam.answerKeys.filter(k => k.type === 'mcq');
          const baseEssay = baseExam.answerKeys.filter(k => k.type === 'essay');

          // Đảo thứ tự câu hỏi
          const shuffledMcq = shuffleArray(baseMcq);
          const shuffledEssay = shuffleArray(baseEssay);

          const newKeys = [];

          // Đảo phương án A, B, C, D
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
              subject: 'khtn',
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

          shuffledEssay.forEach((q, idx) => {
            newKeys.push({
              num: shuffledMcq.length + idx + 1,
              type: 'essay',
              subject: 'khtn',
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
        // Chế độ 'disjoint': 100% câu hỏi độc lập giữa các đề
        const batchSeenSignatures = new Set();
        for (let i = 1; i <= count; i++) {
          const examCode = (100 + i).toString();
          const customTitle = titlePrefix ? `${titlePrefix} — Đề Số ${i}` : '';
          const exam = this.generateExam({
            ...examConfig,
            title: customTitle,
            batchSeenSignatures
          });
          exam.examCode = examCode;
          exam.batchIndex = i;
          exams.push(exam);
        }
      }

      return exams;
    },

    /**
     * Xuất HTML standalone in đề thi (Tích hợp KaTeX + mhchem)
     */
    renderExamToHtml(title, keys, timeLimit, termLabel = '', includeAnswers = false) {
      const mcqItems = keys.filter(k => k.type === 'mcq');
      const essayItems = keys.filter(k => k.type === 'essay');

      return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeKhtnHtml(title)}</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  
  <!-- KaTeX + mhchem -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js"></script>
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
      color: #059669;
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
      color: #047857;
      margin: 1.75rem 0 1rem;
      padding: 0.4rem 0.8rem;
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      border-radius: 4px;
    }
    .question {
      margin-bottom: 1.35rem;
      padding-bottom: 1rem;
      border-bottom: 1px dotted #e2e8f0;
      page-break-inside: avoid;
    }
    .q-text {
      font-weight: 700;
      margin-bottom: 0.6rem;
      color: #0f172a;
    }
    .q-meta {
      font-size: 0.8rem;
      color: #059669;
      font-weight: 600;
      margin-bottom: 0.35rem;
    }
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1.25rem;
    }
    @media (max-width: 600px) {
      .options-grid { grid-template-columns: 1fr; }
    }
    .option {
      padding: 0.45rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.93rem;
    }
    .answer-key-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2rem;
      font-size: 0.9rem;
    }
    .answer-key-table th, .answer-key-table td {
      border: 1px solid #cbd5e1;
      padding: 0.5rem 0.65rem;
      text-align: center;
    }
    .answer-key-table th {
      background: #059669;
      color: #ffffff;
      font-weight: 700;
    }
    @media print {
      body { padding: 0.5cm; }
      .page-break { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">🔬 ${escapeKhtnHtml(title)}</div>
    <div class="meta">
      Chương Trình GDPT 2018 · Thời gian làm bài: <strong>${timeLimit} phút</strong> (Không kể thời gian phát đề)
    </div>
  </div>

  ${mcqItems.length > 0 ? `
    <div class="section-title">PHẦN I. CÂU HỎI TRẮC NGHIỆM (${mcqItems.length} câu)</div>
    ${mcqItems.map(item => `
      <div class="question">
        <div class="q-meta">[${escapeKhtnHtml(item.topic)}] · Cấp độ: ${escapeKhtnHtml(item.level)}</div>
        <div class="q-text"><strong>Câu ${item.num}:</strong> ${escapeKhtnHtml(item.content)}</div>
        <div class="options-grid">
          ${(item.options || []).map((opt, oIdx) => `
            <div class="option"><strong>${String.fromCharCode(65 + oIdx)}.</strong> ${escapeKhtnHtml(opt)}</div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  ` : ''}

  ${essayItems.length > 0 ? `
    <div class="section-title">PHẦN II. CÂU HỎI TỰ LUẬN TÍNH TOÁN (${essayItems.length} câu)</div>
    ${essayItems.map(item => `
      <div class="question">
        <div class="q-meta">[${escapeKhtnHtml(item.topic)}] · Cấp độ: ${escapeKhtnHtml(item.level)}</div>
        <div class="q-text"><strong>Câu ${item.num}:</strong> ${escapeKhtnHtml(item.content)}</div>
        <div style="min-height: 70px; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 0.6rem; margin-top: 0.5rem; color: #94a3b8; font-size: 0.85rem;">
          <em>(Thí sinh trình bày bài làm và đáp số tại đây)</em>
        </div>
      </div>
    `).join('')}
  ` : ''}

${includeAnswers ? `
  <div class="page-break"></div>
  <div class="section-title" style="margin-top: 2.5rem;">BẢNG ĐÁP ÁN & HƯỚNG DẪN CHẤM THI</div>
  <table class="answer-key-table">
    <thead>
      <tr>
        <th>Câu</th>
        <th>Phân Môn</th>
        <th>Dạng</th>
        <th>Cấp Độ</th>
        <th>Đáp Án Chuẩn</th>
        <th>Điểm</th>
      </tr>
    </thead>
    <tbody>
      ${keys.map(k => `
        <tr>
          <td><strong>${k.num}</strong></td>
          <td>${escapeKhtnHtml(k.topic)}</td>
          <td>${k.type === 'mcq' ? 'Trắc nghiệm' : 'Tự luận'}</td>
          <td>${escapeKhtnHtml(k.level)}</td>
          <td style="font-weight: 800; color: #059669;">${escapeKhtnHtml(k.correct)}</td>
          <td>${k.score}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <script>
    document.addEventListener("DOMContentLoaded", function() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
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

  // Export module cho cả Browser và Node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = KhtnEngine;
  }
  if (typeof window !== 'undefined') {
    window.KhtnEngine = KhtnEngine;
  }
  global.KhtnEngine = KhtnEngine;

})(typeof window !== 'undefined' ? window : global);
