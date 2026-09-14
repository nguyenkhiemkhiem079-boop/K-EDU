/**
 * KhiemEdu Gamification & Weekly Hall of Fame Engine v3.2
 * Tích hợp Bảng Vàng Vinh Danh Theo Tuần, 5 Hạng Đấu Tuần (Leagues),
 * Đa Chiều Vinh Danh, Đại Chiến Lớp, Nhiệm Vụ Tuần (Battle Pass Quests),
 * 18 Huy Hiệu Danh Giá & Thành Tựu — MỖI HUY HIỆU TẶNG 1 KHUNG VIỀN AVATAR ĐỘC BẢN!
 */

const BADGES_DEFINITIONS = [
  {
    id: 'first_blood',
    name: 'Phát Súng Đầu',
    icon: '🎯',
    desc: 'Hoàn thành bài thi trắc nghiệm đầu tiên',
    xpReq: 0,
    frame: {
      id: 'frame_target',
      name: 'Viền Hồng Ngọc Tân Binh',
      icon: '🎯',
      cssClass: 'frame-target',
      desc: 'Viền hồng ngọc đôi sáng nhẹ khích lệ chiến binh mới bắt đầu hành trình'
    }
  },
  {
    id: 'perfect_10',
    name: 'Điểm Tuyệt Đối',
    icon: '💯',
    desc: 'Đạt 10/10 điểm trong bất kỳ bài thi nào',
    xpReq: 0,
    frame: {
      id: 'frame_gold_perfect',
      name: 'Hào Quang Kim Cương Vàng',
      icon: '💯',
      cssClass: 'frame-gold-perfect',
      desc: 'Viền hào quang vàng rực tỏa 4 tia sáng lấp lánh cho điểm 10 trọn vẹn'
    }
  },
  {
    id: 'streak_perfect_2',
    name: 'Song Đao Hợp Bích',
    icon: '⚔️',
    desc: 'Đạt 10/10 điểm trong 2 bài thi liên tiếp',
    xpReq: 0,
    frame: {
      id: 'frame_dual_swords',
      name: 'Song Kiếm Lam Băng',
      icon: '⚔️',
      cssClass: 'frame-dual-swords',
      desc: 'Viền hàn băng xanh lam sắc lẹm phát ra luồng điện băng giá kỳ ảo'
    }
  },
  {
    id: 'streak_perfect_3',
    name: 'Tam Tinh Tỏa Sáng',
    icon: '🌟',
    desc: 'Đạt 10/10 điểm trong 3 bài thi liên tiếp',
    xpReq: 0,
    frame: {
      id: 'frame_triple_stars',
      name: 'Tinh Cầu Vũ Trụ',
      icon: '🌟',
      cssClass: 'frame-triple-stars',
      desc: 'Hào quang ngân hà tím vàng xoay vòng bất tận mang năng lượng vũ trụ'
    }
  },
  {
    id: 'streak_perfect_5',
    name: 'Bất Khả Chiến Bại',
    icon: '👑',
    desc: 'Duy trì chuỗi 5 bài thi liên tiếp đạt điểm 10',
    xpReq: 0,
    frame: {
      id: 'frame_sovereign_crown',
      name: 'Ngai Vàng Đế Vương',
      icon: '👑',
      cssClass: 'frame-sovereign-crown',
      desc: 'Khung rồng vàng hoàng gia tối thượng lộng lẫy uy phong'
    }
  },
  {
    id: 'weekly_completionist',
    name: 'Chiến Binh Toàn Năng',
    icon: '🛡️',
    desc: 'Hoàn thành 100% toàn bộ bài tập được giao trong tuần',
    xpReq: 0,
    frame: {
      id: 'frame_aegis_shield',
      name: 'Khiên Thần Hộ Mệnh',
      icon: '🛡️',
      cssClass: 'frame-aegis-shield',
      desc: 'Khiên hộ vệ lục bảo phát ra hào quang kiên cố không gì xuyên phá'
    }
  },
  {
    id: 'most_improved_badge',
    name: 'Ngôi Sao Vượt Khó',
    icon: '🧗',
    desc: 'Tiến bộ vượt bậc về điểm số so với tuần trước',
    xpReq: 0,
    frame: {
      id: 'frame_rising_star',
      name: 'Sao Băng Hy Vọng',
      icon: '🧗',
      cssClass: 'frame-rising-star',
      desc: 'Viền ngọc lục bảo phát sáng biểu trưng cho sự vươn lên mạnh mẽ'
    }
  },
  {
    id: 'speed_demon',
    name: 'Thần Tốc',
    icon: '⚡',
    desc: 'Hoàn thành bài thi dưới 50% thời gian quy định & điểm ≥ 8.0',
    xpReq: 0,
    frame: {
      id: 'frame_lightning_storm',
      name: 'Lôi Điện Chớp Nhoáng',
      icon: '⚡',
      cssClass: 'frame-lightning-storm',
      desc: 'Viền sấm sét neon vàng cyan nhấp nháy tốc độ âm thanh'
    }
  },
  {
    id: 'honest_soul',
    name: 'Chính Trực',
    icon: '🕊️',
    desc: 'Làm bài thi mà không rời khỏi màn hình lần nào',
    xpReq: 0,
    frame: {
      id: 'frame_angel_wings',
      name: 'Cánh Chim Bạch Kim',
      icon: '🕊️',
      cssClass: 'frame-angel-wings',
      desc: 'Viền bạch kim thanh khiết với vầng hào quang thiên thần tinh khôi'
    }
  },
  {
    id: 'streak_3',
    name: 'Chăm Chỉ 3 Ngày',
    icon: '🔥',
    desc: 'Duy trì chuỗi học tập 3 ngày liên tiếp',
    xpReq: 0,
    frame: {
      id: 'frame_flame_ember',
      name: 'Hỏa Diệm Nhiệt Huyết',
      icon: '🔥',
      cssClass: 'frame-flame-ember',
      desc: 'Ngọn lửa rực cháy cam đỏ thắp sáng ngọn lửa tri thức bền bỉ'
    }
  },
  {
    id: 'streak_7',
    name: 'Chiến Binh 7 Ngày',
    icon: '⭐',
    desc: 'Duy trì chuỗi học tập 7 ngày liên tiếp',
    xpReq: 0,
    frame: {
      id: 'frame_solar_flare',
      name: 'Bão Mặt Trời',
      icon: '⭐',
      cssClass: 'frame-solar-flare',
      desc: 'Vòng xoáy mặt trời hoàng kim uy lực bừng sáng rực rỡ'
    }
  },
  {
    id: 'quiz_master',
    name: 'Bậc Thầy Luyện Đề',
    icon: '📚',
    desc: 'Hoàn thành từ 5 bài thi trở lên trên hệ thống',
    xpReq: 0,
    frame: {
      id: 'frame_arcane_tome',
      name: 'Vòng Phép Cổ Thư',
      icon: '📚',
      cssClass: 'frame-arcane-tome',
      desc: 'Vòng tròn ma pháp màu thạch anh tím của bậc thầy học giả'
    }
  },
  {
    id: 'grand_master',
    name: 'Đại Tông Sư',
    icon: '🏆',
    desc: 'Đạt cấp độ 5 trở lên trên hệ thống (≥ 2000 XP)',
    xpReq: 2000,
    frame: {
      id: 'frame_celestial_grandmaster',
      name: 'Hào Quang Thần Giới',
      icon: '🏆',
      cssClass: 'frame-celestial-grandmaster',
      desc: 'Hào quang cầu vồng chuyển động đa sắc đẳng cấp tối cao'
    }
  },
  {
    id: 'night_owl',
    name: 'Cú Đêm Chăm Chỉ',
    icon: '🦉',
    desc: 'Hoàn thành bài thi trong khung giờ đêm (20:00 - 23:59)',
    xpReq: 0,
    frame: {
      id: 'frame_moonlight_owl',
      name: 'Ánh Trăng Huyền Diệu',
      icon: '🦉',
      cssClass: 'frame-moonlight-owl',
      desc: 'Viền bóng đêm huyền bí đính ánh trăng bạc mờ ảo lãng mạn'
    }
  },
  {
    id: 'early_bird',
    name: 'Bình Minh Chăm Học',
    icon: '🌅',
    desc: 'Hoàn thành bài thi sớm trước 7:30 sáng',
    xpReq: 0,
    frame: {
      id: 'frame_morning_sun',
      name: 'Bình Minh Tỏa Rạng',
      icon: '🌅',
      cssClass: 'frame-morning-sun',
      desc: 'Tia nắng ban mai vàng cam tiếp thêm năng lượng học tập dồi dào'
    }
  },
  {
    id: 'scholar_100_correct',
    name: 'Học Giả Bách Khoa',
    icon: '🎓',
    desc: 'Đạt tích lũy từ 50 câu trả lời đúng trên hệ thống',
    xpReq: 0,
    frame: {
      id: 'frame_academic_laurel',
      name: 'Vòng Nguyệt Quế Vinh Quang',
      icon: '🎓',
      cssClass: 'frame-academic-laurel',
      desc: 'Vòng lá nguyệt quế dát vàng cổ điển danh giá của thủ khoa'
    }
  },
  {
    id: 'diamond_ranker',
    name: 'Chiến Thần Kim Cương',
    icon: '💎',
    desc: 'Đạt Hạng Kim Cương trở lên trong tuần (≥ 1000 XP)',
    xpReq: 1000,
    frame: {
      id: 'frame_diamond_frost',
      name: 'Pha Lê Kim Cương',
      icon: '💎',
      cssClass: 'frame-diamond-frost',
      desc: 'Khung tinh thể kim cương sáng chói đa giác phản quang lộng lẫy'
    }
  },
  {
    id: 'weekly_champion',
    name: 'Quán Quân Bảng Vàng',
    icon: '👑',
    desc: 'Đứng Hạng 1 trên Bảng Vàng Vinh Danh tuần',
    xpReq: 0,
    frame: {
      id: 'frame_champion_throne',
      name: 'Vương Miện Quán Quân',
      icon: '👑',
      cssClass: 'frame-champion-throne',
      desc: 'Hào quang vương giả đỉnh cao dành riêng cho Nhà Vô Địch'
    }
  }
];

const LEVEL_TIERS = [
  { level: 1, name: 'Tân Binh Học Tập', minXp: 0, maxXp: 50, icon: '🌱' },
  { level: 2, name: 'Học Giả Siêng Năng', minXp: 50, maxXp: 150, icon: '📖' },
  { level: 3, name: 'Chiến Binh Toán Học', minXp: 150, maxXp: 300, icon: '⚔️' },
  { level: 4, name: 'Bậc Thầy Giải Đề', minXp: 300, maxXp: 600, icon: '🧙‍♂️' },
  { level: 5, name: 'Đại Tông Sư K-EDU', minXp: 600, maxXp: 1500, icon: '👑' }
];

/* ================= 🛡️ 5 HẠNG ĐẤU XẾP HẠNG TUẦN (WEEKLY LEAGUES - DEFLATED SCALE) ================= */
const WEEKLY_LEAGUES = [
  { id: 'bronze', name: 'Hạng Đồng', icon: '🪵', minXp: 0, maxXp: 39, color: '#b45309', border: '#d97706', bg: 'rgba(180, 83, 9, 0.1)' },
  { id: 'silver', name: 'Hạng Bạc', icon: '🥈', minXp: 40, maxXp: 79, color: '#64748b', border: '#94a3b8', bg: 'rgba(100, 116, 139, 0.1)' },
  { id: 'gold', name: 'Hạng Vàng', icon: '🥇', minXp: 80, maxXp: 149, color: '#d97706', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'diamond', name: 'Hạng Kim Cương', icon: '💎', minXp: 150, maxXp: 249, color: '#0284c7', border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'legend', name: 'Hạng Huyền Thoại', icon: '👑', minXp: 250, maxXp: 999999, color: '#7c3aed', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' }
];

/* ================= 🎁 CỬA HÀNG ĐỔI THƯỞNG K-EDU (REWARD HUB & MARKETPLACE) ================= */
const SHOP_ITEMS = [
  // === CATEGORY 1: VOUCHER & ĐẶC QUYỀN LỚP HỌC (perks) ===
  {
    id: 'perk_homework_pass',
    name: 'Thẻ Miễn 1 Buổi BTVN',
    icon: '🎟️',
    type: 'perk',
    category: 'perks',
    priceXp: 120,
    desc: 'Xuất trình mã Voucher điện tử cho Thầy Khiêm để được miễn làm bài tập về nhà 1 buổi!',
    prefix: 'HW',
    badgeText: 'HOT 🎟️'
  },
  {
    id: 'perk_milk_tea',
    name: 'Voucher Trà Sữa Thầy Khiêm',
    icon: '🧋',
    type: 'perk',
    category: 'perks',
    priceXp: 250,
    desc: 'Đổi 1 ly trà sữa thơm ngon hoặc phần nước ngọt giải khát tại buổi học trực tiếp của Thầy.',
    prefix: 'TS',
    badgeText: 'QUÀ THỰC TẾ 🧋'
  },
  {
    id: 'perk_bonus_point',
    name: 'Điểm Cộng Ưu Tiên Kiểm Tra',
    icon: '📝',
    type: 'perk',
    category: 'perks',
    priceXp: 180,
    desc: 'Được cộng ưu tiên +0.5 điểm trực tiếp vào bài kiểm tra 15 phút trên lớp học.',
    prefix: 'PT',
    badgeText: 'ĐẶC QUYỀN 📝'
  },

  // === CATEGORY 2: THẺ BỔ TRỢ & VẬT PHẨM TRỢ LỰC (boosters) ===
  {
    id: 'booster_xp_2x',
    name: 'Thẻ Nhân Đôi XP (24h)',
    icon: '🌟',
    type: 'booster',
    category: 'boosters',
    priceXp: 40,
    desc: 'Kích hoạt nhân 2 toàn bộ điểm XP nhận được từ tất cả các bài thi trong 24 giờ tiếp theo.',
    durationHours: 24,
    badgeText: 'X2 XP ⚡'
  },
  {
    id: 'shield_freeze',
    name: 'Bùa Hộ Mệnh Chuỗi Streak',
    icon: '🛡️',
    type: 'booster',
    category: 'boosters',
    priceXp: 25,
    desc: 'Tự động bảo vệ chuỗi ngày học Streak không bị đứt đoạn nếu lỡ quên hoặc bận 1 ngày.',
    badgeText: 'BẢO VỆ 🛡️'
  },
  {
    id: 'booster_deep_hint',
    name: 'Vé Lời Giải Chuyên Sâu VDC',
    icon: '💡',
    type: 'booster',
    category: 'boosters',
    priceXp: 15,
    desc: 'Mở khóa phân tích sơ đồ tư duy giải nhanh cho các câu hỏi Vận dụng cao (VDC) điểm 10.',
    badgeText: 'MẸO GIẢI 💡'
  },

  // === CATEGORY 3: DANH HIỆU ĐEO TRƯỚC TÊN (titles) ===
  {
    id: 'title_thu_khoa',
    name: 'Danh hiệu [🏆 Thủ Khoa K-EDU]',
    icon: '🏆',
    type: 'title',
    category: 'titles',
    priceXp: 100,
    titleText: '🏆 Thủ Khoa',
    titleColor: '#d97706',
    desc: 'Gắn huy hiệu danh dự vương giả màu vàng sáng chói cạnh tên bạn trên Bảng Vàng toàn trường.'
  },
  {
    id: 'title_dgnl_god',
    name: 'Danh hiệu [🧠 Chiến Thần ĐGNL]',
    icon: '🧠',
    type: 'title',
    category: 'titles',
    priceXp: 80,
    titleText: '🧠 Chiến Thần ĐGNL',
    titleColor: '#7c3aed',
    desc: 'Khẳng định đẳng cấp tư duy logic và số liệu chuẩn hóa của thí sinh chinh phục ĐGNL hàng đầu.'
  },
  {
    id: 'title_hoc_ba',
    name: 'Danh hiệu [💎 Học Bá]',
    icon: '💎',
    type: 'title',
    category: 'titles',
    priceXp: 70,
    titleText: '💎 Học Bá',
    titleColor: '#0284c7',
    desc: 'Danh xưng dành riêng cho những bạn học sinh chăm chỉ, đạt điểm cao liên tục.'
  },
  {
    id: 'title_bat_bai',
    name: 'Danh hiệu [⚡ Bất Bại]',
    icon: '⚡',
    type: 'title',
    category: 'titles',
    priceXp: 90,
    titleText: '⚡ Bất Bại',
    titleColor: '#dc2626',
    desc: 'Tia chớp đỏ rực lửa thể hiện phong độ thi cử bất khả chiến bại.'
  },

  // === CATEGORY 4: KHUNG AVATAR 3D ĐỘC QUYỀN (frames) ===
  {
    id: 'frame_sakura',
    name: 'Khung Cánh Hoa Anh Đào',
    icon: '🌸',
    type: 'frame',
    category: 'frames',
    priceXp: 50,
    desc: 'Hiệu ứng cánh hoa anh đào nở rộ lung linh mang sắc xuân tươi thắm xung quanh Avatar.',
    cssClass: 'frame-sakura-bloom'
  },
  {
    id: 'frame_galaxy',
    name: 'Khung Dải Ngân Hà Vũ Trụ',
    icon: '🌌',
    type: 'frame',
    category: 'frames',
    priceXp: 80,
    desc: 'Vòng xoáy ngân hà tinh vân huyền ảo tỏa ánh sao băng tím thẫm đa chiều.',
    cssClass: 'frame-cosmic-galaxy'
  },
  {
    id: 'frame_neon',
    name: 'Khung Điện Quang Cyberpunk',
    icon: '⚡',
    type: 'frame',
    category: 'frames',
    priceXp: 65,
    desc: 'Hiệu ứng neon công nghệ tương lai nhấp nháy năng động màu xanh ngọc lam.',
    cssClass: 'frame-neon-cyber'
  },
  {
    id: 'frame_gold',
    name: 'Khung Hoàng Gia Dát Vàng',
    icon: '👑',
    type: 'frame',
    category: 'frames',
    priceXp: 120,
    desc: 'Khung kim hoàn hoàng tộc dát vàng 24K đính ngọc bích quý phái của thủ khoa.',
    cssClass: 'frame-royal-gold'
  },
  {
    id: 'frame_fire',
    name: 'Khung Lửa Rực Cháy',
    icon: '🔥',
    type: 'frame',
    category: 'frames',
    priceXp: 40,
    desc: 'Ngọn lửa đỏ cam rực cháy tiếp thêm tinh thần quyết tâm giải toán mãnh liệt.',
    cssClass: 'frame-flame-ember'
  }
];

/* ================= 🎰 VÒNG QUAY MAY MẮN (LUCKY SPIN WHEEL) ================= */
const LUCKY_WHEEL_ITEMS = [
  { id: 'w_booster_2x', name: 'Thẻ 2x XP Booster (24h)', icon: '🌟', type: 'booster', color: '#6366f1', weight: 15 },
  { id: 'w_shield', name: 'Bùa Hộ Mệnh Chuỗi Streak', icon: '🛡️', type: 'booster', color: '#0ea5e9', weight: 20 },
  { id: 'w_jackpot_50', name: 'Jackpot +50 XP Khủng!', icon: '💰', type: 'xp', value: 50, color: '#f59e0b', weight: 5 },
  { id: 'w_frame_sakura', name: 'Khung Avatar Sakura', icon: '🌸', type: 'frame', frameClass: 'frame-sakura-bloom', color: '#ec4899', weight: 10 },
  { id: 'w_voucher_discount', name: 'Mã Giảm 50 XP Đổi Trà Sữa', icon: '🧋', type: 'discount', color: '#8b5cf6', weight: 10 },
  { id: 'w_consolation_5', name: 'Thưởng May Mắn +5 XP', icon: '🍀', type: 'xp', value: 5, color: '#10b981', weight: 40 }
];

/* ================= 🗓️ WEEKLY HONOR ENGINE ================= */
const WeeklyHonorEngine = {
  getLeague(xp = 0) {
    for (let i = WEEKLY_LEAGUES.length - 1; i >= 0; i--) {
      if (xp >= WEEKLY_LEAGUES[i].minXp) {
        return WEEKLY_LEAGUES[i];
      }
    }
    return WEEKLY_LEAGUES[0];
  },

  /**
   * Tính dải ngày bắt đầu (Thứ 2 00:00:00) và kết thúc (Chủ Nhật 23:59:59)
   */
  getWeekRange(offsetWeeks = 0) {
    const now = new Date();
    const target = new Date(now.getTime() - offsetWeeks * 7 * 24 * 60 * 60 * 1000);
    
    const day = target.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    
    const start = new Date(target);
    start.setDate(target.getDate() + diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const oneJan = new Date(start.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((start - oneJan) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);

    const fmtDate = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}`;
    };

    const label = offsetWeeks === 0
      ? `Tuần Này · Tuần ${weekNumber} (${fmtDate(start)} — ${fmtDate(end)})`
      : (offsetWeeks === 1
        ? `Tuần Trước · Tuần ${weekNumber} (${fmtDate(start)} — ${fmtDate(end)})`
        : `Tuần ${weekNumber} (${fmtDate(start)} — ${fmtDate(end)})`);

    return {
      start,
      end,
      weekNumber,
      year: start.getFullYear(),
      label,
      isCurrent: offsetWeeks === 0
    };
  },

  isInWeek(dateString, weekRange) {
    if (!dateString || !weekRange) return false;
    const time = new Date(dateString).getTime();
    return time >= weekRange.start.getTime() && time <= weekRange.end.getTime();
  },

  calculateWeeklyLeaderboard(allResults = [], weekRange = null, roster = [], availableQuizzes = [], targetClass = 'all') {
    const studentMap = {};

    roster.forEach(st => {
      if (targetClass !== 'all' && st.className !== targetClass) return;
      const key = st.name.trim().toLowerCase();
      studentMap[key] = {
        name: st.name.trim(),
        className: st.className || 'Chung',
        avatar: st.avatar || '🦊',
        frame: st.frame || 'frame-gold-perfect',
        submissionsCount: 0,
        uniqueQuizzes: new Set(),
        perfectScores: 0,
        currentPerfectStreak: 0,
        maxPerfectStreak: 0,
        totalScoreSum: 0,
        avgScore: 0,
        fastestQuizSeconds: 999999,
        honestSubmissions: 0,
        honorXp: 0,
        honorsBadges: [],
        lastSubmittedAt: null
      };
    });

    const sortedResults = [...allResults].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));

    // Nhóm bài nộp theo từng học sinh và theo từng đề thi (quizId)
    // để chỉ lấy ĐIỂM CAO NHẤT cho mỗi đề, ngăn chặn hoàn toàn lạm phát điểm do làm lại
    const studentSubmissions = {};

    sortedResults.forEach(res => {
      if (!res || !res.name || res.gradingStatus === 'pending' || res.isDocumentOnly) return;
      if (targetClass !== 'all' && res.className !== targetClass) return;
      if (weekRange && !this.isInWeek(res.submittedAt, weekRange)) return;

      const key = JSON.stringify([(res.className || '').trim().toLowerCase(), res.name.trim().toLowerCase()]);
      if (!studentSubmissions[key]) {
        studentSubmissions[key] = {
          name: res.name.trim(),
          className: res.className || '10',
          avatar: res.avatar || '🦊',
          frame: res.frame || 'frame-gold-perfect',
          byQuiz: {}
        };
      }
      const qId = res.quizId || 'quiz_default';
      if (!studentSubmissions[key].byQuiz[qId]) {
        studentSubmissions[key].byQuiz[qId] = [];
      }
      studentSubmissions[key].byQuiz[qId].push(res);
    });

    Object.entries(studentSubmissions).forEach(([key, stData]) => {
      if (!studentMap[key]) {
        studentMap[key] = {
          name: stData.name,
          className: stData.className,
          avatar: stData.avatar,
          frame: stData.frame,
          submissionsCount: 0,
          uniqueQuizzes: new Set(),
          perfectScores: 0,
          currentPerfectStreak: 0,
          maxPerfectStreak: 0,
          totalScoreSum: 0,
          avgScore: 0,
          fastestQuizSeconds: 999999,
          honestSubmissions: 0,
          honorXp: 0,
          honorsBadges: [],
          lastSubmittedAt: null
        };
      }

      const item = studentMap[key];
      let practiceBonusTotal = 0;

      // Sắp xếp các đề theo thời gian nộp bài đầu tiên
      const quizIds = Object.keys(stData.byQuiz);
      quizIds.sort((qa, qb) => {
        const timeA = new Date(stData.byQuiz[qa][0].submittedAt || 0);
        const timeB = new Date(stData.byQuiz[qb][0].submittedAt || 0);
        return timeA - timeB;
      });

      quizIds.forEach(qId => {
        const attempts = stData.byQuiz[qId];
        // Chọn bài thi có điểm cao nhất trong các lần nộp của đề này
        const bestAttempt = [...attempts].sort((a, b) => {
          if ((b.totalScore || 0) !== (a.totalScore || 0)) {
            return (b.totalScore || 0) - (a.totalScore || 0);
          }
          return (a.timeTakenSeconds || 9999) - (b.timeTakenSeconds || 9999);
        })[0];

        item.submissionsCount++;
        item.uniqueQuizzes.add(qId);
        const score = typeof bestAttempt.totalScore === 'number' ? bestAttempt.totalScore : 0;
        item.totalScoreSum += score;
        item.lastSubmittedAt = bestAttempt.submittedAt;

        if (bestAttempt.timeTakenSeconds && bestAttempt.timeTakenSeconds < item.fastestQuizSeconds) {
          item.fastestQuizSeconds = bestAttempt.timeTakenSeconds;
        }
        if (bestAttempt.tabSwitches === 0) {
          item.honestSubmissions++;
        }

        // Tính điểm Vinh Danh cho kết quả tốt nhất của đề này (kinh tế điểm mới không lạm phát)
        let earnedXp = 5; // Điểm nền hoàn thành bài thi
        if (score >= 10 || bestAttempt.scorePct === 100) {
          earnedXp += 10; // Điểm 10 tuyệt đối
          item.perfectScores++;
          item.currentPerfectStreak++;
          if (item.currentPerfectStreak > item.maxPerfectStreak) {
            item.maxPerfectStreak = item.currentPerfectStreak;
          }

          if (item.currentPerfectStreak === 2) {
            earnedXp += 5;
            if (!item.honorsBadges.includes('⚔️ Song Đao')) item.honorsBadges.push('⚔️ Song Đao');
          } else if (item.currentPerfectStreak === 3) {
            earnedXp += 10;
            if (!item.honorsBadges.includes('🌟 Tam Tinh')) item.honorsBadges.push('🌟 Tam Tinh');
          } else if (item.currentPerfectStreak >= 5) {
            earnedXp += 20;
            if (!item.honorsBadges.includes('👑 Bất Bại')) item.honorsBadges.push('👑 Bất Bại');
          }
        } else {
          item.currentPerfectStreak = 0;
          if (score >= 9.0) earnedXp += 5;
          else if (score >= 8.0) earnedXp += 3;
        }

        if (bestAttempt.tabSwitches === 0) earnedXp += 2;
        item.honorXp += earnedXp;

        // Nếu có làm lại (retake), chỉ cộng thưởng rèn luyện nhỏ (1 XP mỗi lần, tối đa 5 XP/tuần)
        const retakesCount = attempts.length - 1;
        if (retakesCount > 0 && practiceBonusTotal < 5) {
          const bonus = Math.min(retakesCount * 1, 5 - practiceBonusTotal);
          practiceBonusTotal += bonus;
        }
      });

      item.honorXp += practiceBonusTotal;
      item.avgScore = item.submissionsCount ? Math.round((item.totalScoreSum / item.submissionsCount) * 10) / 10 : 0;
    });

    const list = Object.values(studentMap);
    list.forEach(st => {
      // Áp dụng điểm thưởng/phạt kỷ luật từ Giáo viên (Teacher Disciplinary Adjustments)
      const allPenalties = typeof StorageEngine !== 'undefined' && typeof StorageEngine.getAllPenalties === 'function'
        ? StorageEngine.getAllPenalties()
        : [];

      const studentPenalties = allPenalties.filter(p => {
        if (!p || !p.studentName) return false;
        if (p.studentName.trim().toLowerCase() !== st.name.trim().toLowerCase()) return false;
        if (weekRange && !WeeklyHonorEngine.isInWeek(p.createdAt, weekRange)) return false;
        return true;
      });

      const penaltySum = studentPenalties.reduce((sum, p) => sum + (p.xpChange || 0), 0);
      st.honorXp = Math.max(0, st.honorXp + penaltySum);
      st.penaltiesCount = studentPenalties.length;
      st.penaltiesTotalXp = penaltySum;
      st.penaltiesList = studentPenalties;

      const classQuizzes = availableQuizzes.filter(q => {
        if (!q.grade) return true;
        const g = q.grade.toString();
        return st.className.includes(g) || g === 'all';
      });

      const totalRequired = classQuizzes.length || 3;
      const completedCount = st.uniqueQuizzes.size;
      st.completionRate = Math.min(100, Math.round((completedCount / totalRequired) * 100));

      if (completedCount >= totalRequired && totalRequired > 0) {
        st.honorXp += 25; // Thưởng hoàn thành 100% nhiệm vụ tuần (deflated from 400)
        if (!st.honorsBadges.includes('🛡️ Toàn Năng')) {
          st.honorsBadges.push('🛡️ Toàn Năng');
        }
      }

      st.league = WeeklyHonorEngine.getLeague(st.honorXp);
    });

    list.sort((a, b) => {
      if (b.honorXp !== a.honorXp) return b.honorXp - a.honorXp;
      if (b.perfectScores !== a.perfectScores) return b.perfectScores - a.perfectScores;
      return b.avgScore - a.avgScore;
    });

    list.forEach((item, index) => {
      item.rank = index + 1;
      if (item.rank === 1 && item.honorXp > 0) {
        if (!item.honorsBadges.includes('👑 Quán Quân')) {
          item.honorsBadges.unshift('👑 Quán Quân');
        }
      }
    });

    return list;
  },

  calculateSpecialHonors(weeklyRankings, previousWeekRankings = []) {
    if (!weeklyRankings || weeklyRankings.length === 0) return {};

    const titan = weeklyRankings.find(s => (s.honorXp || 0) > 0) || null;

    let mostImproved = null;
    let maxDiff = 0;
    if (previousWeekRankings.length > 0) {
      const prevMap = {};
      previousWeekRankings.forEach(p => {
        if (p.submissionsCount > 0) prevMap[p.name.toLowerCase()] = p.avgScore;
      });

      weeklyRankings.forEach(cur => {
        const prev = prevMap[cur.name.toLowerCase()];
        if (prev !== undefined && cur.submissionsCount > 0) {
          const diff = cur.avgScore - prev;
          if (diff > maxDiff) {
            maxDiff = diff;
            mostImproved = { ...cur, scoreDiff: Math.round(diff * 10) / 10 };
          }
        }
      });
    }

    let speedMaster = null;
    let fastestSec = 999999;
    weeklyRankings.forEach(s => {
      if (s.avgScore >= 8.5 && s.fastestQuizSeconds < fastestSec) {
        fastestSec = s.fastestQuizSeconds;
        speedMaster = s;
      }
    });

    let streakMaster = null;
    let maxStreak = 0;
    weeklyRankings.forEach(s => {
      if (s.maxPerfectStreak > maxStreak) {
        maxStreak = s.maxPerfectStreak;
        streakMaster = s;
      }
    });

    let dedicated = null;
    let maxSub = 0;
    weeklyRankings.forEach(s => {
      if (s.submissionsCount > maxSub) {
        maxSub = s.submissionsCount;
        dedicated = s;
      }
    });

    let honestParagon = null;
    let maxHonest = 0;
    weeklyRankings.forEach(s => {
      if (s.honestSubmissions > maxHonest && s.submissionsCount >= 2) {
        maxHonest = s.honestSubmissions;
        honestParagon = s;
      }
    });

    return {
      titan,
      mostImproved,
      speedMaster,
      streakMaster,
      dedicated,
      honestParagon
    };
  },

  calculateClassBattle(weeklyRankings) {
    const map = {};
    weeklyRankings.forEach(st => {
      const c = st.className || 'Chung';
      if (!map[c]) {
        map[c] = {
          className: c,
          studentsCount: 0,
          totalHonorXp: 0,
          totalSubmissions: 0,
          perfectCount: 0,
          scoreSum: 0
        };
      }
      map[c].studentsCount++;
      map[c].totalHonorXp += st.honorXp;
      map[c].totalSubmissions += st.submissionsCount;
      map[c].perfectCount += st.perfectScores;
      map[c].scoreSum += st.avgScore;
    });

    const list = Object.values(map);
    list.forEach(item => {
      item.avgXp = item.studentsCount ? Math.round(item.totalHonorXp / item.studentsCount) : 0;
      item.classAvgScore = item.studentsCount ? Math.round((item.scoreSum / item.studentsCount) * 10) / 10 : 0;
    });

    list.sort((a, b) => b.totalHonorXp - a.totalHonorXp || b.classAvgScore - a.classAvgScore);
    list.forEach((c, idx) => c.rank = idx + 1);
    return list;
  },

  getWeeklyQuests(profile, studentWeeklyStat = null) {
    const submissions = studentWeeklyStat ? studentWeeklyStat.submissionsCount : 0;
    const perfects = studentWeeklyStat ? studentWeeklyStat.perfectScores : 0;
    const honest = studentWeeklyStat ? studentWeeklyStat.honestSubmissions : 0;

    return [
      {
        id: 'quest_sub_3',
        title: 'Khởi Động Tuần Mới',
        desc: 'Hoàn thành ít nhất 3 đề thi trong tuần',
        target: 3,
        current: Math.min(3, submissions),
        rewardXp: 15,
        icon: '🎯',
        isCompleted: submissions >= 3
      },
      {
        id: 'quest_perf_1',
        title: 'Đỉnh Cao Hoàn Hảo',
        desc: 'Giành ít nhất 1 bài thi đạt điểm 10 tuyệt đối',
        target: 1,
        current: Math.min(1, perfects),
        rewardXp: 20,
        icon: '💯',
        isCompleted: perfects >= 1
      },
      {
        id: 'quest_honest_1',
        title: 'Chiến Binh Chính Trực',
        desc: 'Làm bài thi nghiêm túc, 0 lần rời màn hình',
        target: 1,
        current: Math.min(1, honest),
        rewardXp: 10,
        icon: '🕊️',
        isCompleted: honest >= 1
      }
    ];
  }
};

/* ================= 🎮 CORE GAMIFICATION ENGINE ================= */
const GamificationEngine = {
  getUserProfile() {
    const raw = localStorage.getItem('khiemedu_profile' + (window.StudentAccounts?.uid ? '_' + window.StudentAccounts.uid : ''));
    if (!raw) {
      const initial = {
        name: 'Nguyễn Văn An',
        className: '10',
        avatar: '🦊',
        frame: 'frame-target',
        xp: 45,
        streak: 3,
        perfectStreak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        examsCount: 3,
        perfectCount: 1,
        totalCorrectAnswers: 28,
        inventory: ['frame_target', 'frame-target'],
        unlockedFrames: ['frame-target', 'frame-gold-perfect', 'frame-flame-ember', 'frame-angel-wings'],
        unlockedBadges: ['first_blood', 'streak_3', 'honest_soul'],
        vouchers: [],
        boosters: {},
        unlockedTitles: [],
        equippedTitle: '',
        penalties: []
      };
      if (window.StudentAccounts?.uid) {
        Object.assign(initial, { name: window.StudentAccounts.profile?.name || '', className: window.StudentAccounts.profile?.className || '',
          xp: 0, streak: 0, perfectStreak: 0, examsCount: 0, perfectCount: 0, totalCorrectAnswers: 0,
          unlockedBadges: [], unlockedFrames: ['frame-target'] });
      }
      this.saveUserProfile(initial);
      return initial;
    }
    try {
      const p = JSON.parse(raw);
      if (p.perfectStreak === undefined) p.perfectStreak = 0;
      if (!p.inventory) p.inventory = [];
      if (!p.unlockedFrames) p.unlockedFrames = ['frame-target'];
      if (!p.unlockedBadges) p.unlockedBadges = ['first_blood'];
      if (!p.frame) p.frame = 'frame-target';
      if (!p.vouchers) p.vouchers = [];
      if (!p.boosters) p.boosters = {};
      if (!p.unlockedTitles) p.unlockedTitles = [];
      if (!p.equippedTitle) p.equippedTitle = '';
      if (!p.penalties) p.penalties = [];
      return p;
    } catch {
      return {};
    }
  },

  saveUserProfile(profile) {
    localStorage.setItem('khiemedu_profile' + (window.StudentAccounts?.uid ? '_' + window.StudentAccounts.uid : ''), JSON.stringify(profile));
  },

  resetUserProfile(cleanStats = true) {
    const current = this.getUserProfile();
    const clean = {
      name: current.name || 'Học Sinh K-EDU',
      className: current.className || '10',
      avatar: current.avatar || '🦊',
      frame: 'frame-target',
      xp: 0,
      streak: 1,
      perfectStreak: 0,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      examsCount: 0,
      perfectCount: 0,
      totalCorrectAnswers: 0,
      inventory: ['frame_target', 'frame-target'],
      unlockedFrames: ['frame-target'],
      unlockedBadges: [],
      vouchers: [],
      boosters: {},
      unlockedTitles: [],
      equippedTitle: '',
      penalties: []
    };
    this.saveUserProfile(clean);
    return clean;
  },

  equipAvatarFrame(frameCssClass) {
    const profile = this.getUserProfile();
    profile.frame = frameCssClass;
    this.saveUserProfile(profile);
    return profile;
  },

  getLevelInfo(xp) {
    const safeXp = xp || 0;
    for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
      if (safeXp >= LEVEL_TIERS[i].minXp) {
        const tier = LEVEL_TIERS[i];
        const range = tier.maxXp - tier.minXp;
        const progress = Math.min(100, Math.max(0, Math.round(((safeXp - tier.minXp) / range) * 100)));
        return {
          level: tier.level,
          name: tier.name,
          icon: tier.icon,
          currentXp: safeXp,
          nextXp: tier.maxXp,
          progress
        };
      }
    }
    return { level: 1, name: LEVEL_TIERS[0].name, icon: '🌱', currentXp: safeXp, nextXp: 200, progress: 0 };
  },

  awardExamRewards(result, allQuizzesForClass = []) {
    const profile = this.getUserProfile();
    if (result.gradingStatus === 'pending' || result.isDocumentOnly) {
      return { xpGained: 0, streak: profile.streak || 0, bonusBreakdown: [], newBadges: [], newFrames: [] };
    }

    // Kiểm tra thẻ nhân đôi XP (2x XP Booster) còn hiệu lực
    const hasActive2x = profile.boosters && profile.boosters.xp2xUntil && profile.boosters.xp2xUntil > Date.now();

    // ================= XỬ LÝ LÀM LẠI (RETAKE) — CHỐNG LẠM PHÁT ĐIỂM =================
    if (result.isRetake) {
      let baseRetakeXp = 2; // Điểm rèn luyện củng cố tượng trưng (deflated from 10)
      const bonusBreakdown = [{ label: 'Luyện tập củng cố (Làm lại đề)', xp: baseRetakeXp, icon: '🔄' }];

      if (result.tabSwitches === 0) {
        baseRetakeXp += 1;
        bonusBreakdown.push({ label: 'Tập trung chính trực', xp: 1, icon: '🕊️' });
      }

      let finalRetakeXp = baseRetakeXp;
      if (hasActive2x) {
        finalRetakeXp *= 2;
        bonusBreakdown.push({ label: '⚡ Kích hoạt 2x Booster (Nhân đôi XP)', xp: baseRetakeXp, icon: '🌟' });
      }

      profile.xp = (profile.xp || 0) + finalRetakeXp;
      this.saveUserProfile(profile);

      return {
        xpGained: finalRetakeXp,
        streak: profile.streak || 1,
        bonusBreakdown,
        newBadges: [],
        newFrames: []
      };
    }

    // ================= LÀM BÀI MỚI (LẦN ĐẦU) — QUY CHUẨN ĐIỂM DEFLATED =================
    let xpGained = 5; // Base XP hoàn thành đề (deflated from 50)
    const bonusBreakdown = [{ label: 'Hoàn thành bài thi', xp: 5, icon: '📝' }];

    // Tích lũy câu đúng
    profile.totalCorrectAnswers = (profile.totalCorrectAnswers || 0) + (result.correct || 0);

    // Điểm số bài thi
    if (result.totalScore >= 10 || result.scorePct === 100) {
      xpGained += 10; // deflated from 120
      bonusBreakdown.push({ label: 'Điểm 10 Tuyệt Đối', xp: 10, icon: '💯' });
      profile.perfectCount = (profile.perfectCount || 0) + 1;
      profile.perfectStreak = (profile.perfectStreak || 0) + 1;

      if (profile.perfectStreak === 2) {
        xpGained += 5; // deflated from 100
        bonusBreakdown.push({ label: 'Chuỗi 2 Điểm 10 (Song Đao ⚔️)', xp: 5, icon: '⚔️' });
      } else if (profile.perfectStreak === 3) {
        xpGained += 10; // deflated from 250
        bonusBreakdown.push({ label: 'Chuỗi 3 Điểm 10 (Tam Tinh 🌟)', xp: 10, icon: '🌟' });
      } else if (profile.perfectStreak >= 5) {
        xpGained += 20; // deflated from 500
        bonusBreakdown.push({ label: `Chuỗi ${profile.perfectStreak} Điểm 10 (Bất Bại 👑)`, xp: 20, icon: '👑' });
      }
    } else {
      profile.perfectStreak = 0;
      if (result.totalScore >= 9.0) {
        xpGained += 5; // deflated from 60
        bonusBreakdown.push({ label: 'Điểm Xuất Sắc (>=9.0)', xp: 5, icon: '✨' });
      } else if (result.totalScore >= 8.0) {
        xpGained += 3; // deflated from 30
        bonusBreakdown.push({ label: 'Điểm Giỏi (>=8.0)', xp: 3, icon: '📘' });
      }
    }

    if (result.tabSwitches === 0) {
      xpGained += 2; // deflated from 25
      bonusBreakdown.push({ label: 'Chính Trực (0 lần rời tab)', xp: 2, icon: '🕊️' });
    } else if (result.tabSwitches > 0) {
      // Kỷ luật trừ điểm khi rời màn hình: -2 XP mỗi lần rời tab (tối đa -10 XP)
      const cheatPenalty = Math.min(10, result.tabSwitches * 2);
      xpGained = Math.max(0, xpGained - cheatPenalty);
      bonusBreakdown.push({
        label: `Kỷ luật rời màn hình (${result.tabSwitches} lần)`,
        xp: -cheatPenalty,
        icon: '⚠️'
      });

      // Lưu bản ghi vi phạm kỷ luật phòng thi vào Storage
      const penaltyRecord = {
        id: 'pen_cheat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        studentName: profile.name,
        className: profile.className,
        xpChange: -cheatPenalty,
        reason: `Rời màn hình ${result.tabSwitches} lần khi thi đề [${result.quizTitle || result.quizId || 'Bài thi'}]`,
        teacherNote: 'Hệ thống tự động ghi nhận cảnh báo rời màn hình',
        createdAt: new Date().toISOString()
      };
      if (typeof StorageEngine !== 'undefined' && typeof StorageEngine.savePenalty === 'function') {
        StorageEngine.savePenalty(penaltyRecord);
      }
      if (!profile.penalties) profile.penalties = [];
      profile.penalties.unshift(penaltyRecord);
    }

    // Kiểm tra thần tốc
    const isSpeedy = result.timeTakenSeconds && result.timeLimitSeconds && (result.timeTakenSeconds <= result.timeLimitSeconds * 0.5) && (result.totalScore >= 8.0);
    if (isSpeedy) {
      xpGained += 3; // deflated from 30
      bonusBreakdown.push({ label: 'Thần Tốc (≤ 50% thời gian)', xp: 3, icon: '⚡' });
    }

    if (hasActive2x) {
      const baseEarned = xpGained;
      xpGained *= 2;
      bonusBreakdown.push({ label: '⚡ Kích hoạt 2x Booster (Nhân đôi XP)', xp: baseEarned, icon: '🌟' });
    }

    profile.xp = (profile.xp || 0) + xpGained;
    profile.examsCount = (profile.examsCount || 0) + 1;

    // Chuỗi ngày học
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate) {
      const last = new Date(profile.lastActiveDate);
      const diffDays = Math.round((new Date(today) - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        profile.streak = (profile.streak || 1) + 1;
      } else if (diffDays > 1) {
        if (profile.inventory && profile.inventory.includes('shield_freeze')) {
          const idx = profile.inventory.indexOf('shield_freeze');
          profile.inventory.splice(idx, 1);
          bonusBreakdown.push({ label: 'Khiên bảo vệ đã cứu chuỗi Streak của bạn!', xp: 0, icon: '🛡️' });
        } else {
          profile.streak = 1;
        }
      }
    } else {
      profile.streak = 1;
    }
    profile.lastActiveDate = today;

    // Mở khóa Huy hiệu & Khung Viền Avatar
    const newlyUnlocked = [];
    if (!profile.unlockedBadges) profile.unlockedBadges = [];
    if (!profile.unlockedFrames) profile.unlockedFrames = ['frame-target'];

    const unlockBadge = (id) => {
      if (!profile.unlockedBadges.includes(id)) {
        profile.unlockedBadges.push(id);
        const b = BADGES_DEFINITIONS.find(item => item.id === id);
        if (b) {
          newlyUnlocked.push(b);
          if (b.frame && !profile.unlockedFrames.includes(b.frame.cssClass)) {
            profile.unlockedFrames.push(b.frame.cssClass);
            // Tự động trang bị khung mới mở khóa
            profile.frame = b.frame.cssClass;
          }
        }
      }
    };

    unlockBadge('first_blood');
    if (result.totalScore >= 10) unlockBadge('perfect_10');
    if (profile.perfectStreak >= 2) unlockBadge('streak_perfect_2');
    if (profile.perfectStreak >= 3) unlockBadge('streak_perfect_3');
    if (profile.perfectStreak >= 5) unlockBadge('streak_perfect_5');
    if (result.tabSwitches === 0) unlockBadge('honest_soul');
    if (isSpeedy) unlockBadge('speed_demon');
    if (profile.streak >= 3) unlockBadge('streak_3');
    if (profile.streak >= 7) unlockBadge('streak_7');
    if (profile.examsCount >= 5) unlockBadge('quiz_master');
    if (profile.xp >= 500) unlockBadge('grand_master');
    if (profile.xp >= 250) unlockBadge('diamond_ranker');
    if (profile.totalCorrectAnswers >= 50) unlockBadge('scholar_100_correct');

    const currentHour = new Date().getHours();
    if (currentHour >= 20 || currentHour <= 23) unlockBadge('night_owl');
    if (currentHour >= 4 && currentHour < 8) unlockBadge('early_bird');

    this.saveUserProfile(profile);

    return {
      xpGained,
      streak: profile.streak,
      perfectStreak: profile.perfectStreak,
      bonusBreakdown,
      newlyUnlocked
    };
  },

  /* ================= 🎰 VÒNG QUAY MAY MẮN (LUCKY SPIN WHEEL) ================= */
  spinLuckyWheel() {
    const profile = this.getUserProfile();
    const SPIN_COST = 20;
    if ((profile.xp || 0) < SPIN_COST) {
      return { success: false, error: `Bạn cần ít nhất ${SPIN_COST} XP để quay! Hãy làm thêm bài thi để tích lũy điểm.` };
    }

    // Trừ 20 XP
    profile.xp -= SPIN_COST;

    // Chọn phần thưởng theo tỉ lệ trọng số (weighted random)
    const items = typeof LUCKY_WHEEL_ITEMS !== 'undefined' ? LUCKY_WHEEL_ITEMS : [];
    const totalWeight = items.reduce((sum, it) => sum + (it.weight || 10), 0);
    let randomNum = Math.random() * totalWeight;
    let selectedIndex = 0;
    for (let i = 0; i < items.length; i++) {
      if (randomNum < items[i].weight) {
        selectedIndex = i;
        break;
      }
      randomNum -= items[i].weight;
    }
    const reward = items[selectedIndex] || items[0];

    let rewardDetail = '';
    if (reward.type === 'xp') {
      profile.xp += reward.value;
      rewardDetail = `+${reward.value} XP vào tài khoản!`;
    } else if (reward.type === 'booster') {
      if (!profile.boosters) profile.boosters = {};
      if (reward.id === 'w_booster_2x') {
        const curUntil = profile.boosters.xp2xUntil && profile.boosters.xp2xUntil > Date.now() ? profile.boosters.xp2xUntil : Date.now();
        profile.boosters.xp2xUntil = curUntil + 24 * 60 * 60 * 1000;
        rewardDetail = 'Kích hoạt nhân đôi XP (2x XP) trong 24 giờ tới!';
      } else if (reward.id === 'w_shield') {
        if (!profile.inventory) profile.inventory = [];
        profile.inventory.push('shield_freeze');
        rewardDetail = 'Nhận 1 Bùa Hộ Mệnh Chuỗi Streak vào Túi đồ!';
      }
    } else if (reward.type === 'frame') {
      if (!profile.unlockedFrames) profile.unlockedFrames = [];
      if (!profile.unlockedFrames.includes(reward.frameClass)) {
        profile.unlockedFrames.push(reward.frameClass);
      }
      profile.frame = reward.frameClass;
      rewardDetail = 'Đã mở khóa và trang bị Khung Sakura Tươi Thắm!';
    } else if (reward.type === 'discount') {
      if (!profile.vouchers) profile.vouchers = [];
      const code = 'DISC-' + Math.floor(1000 + Math.random() * 9000);
      const discVoucher = {
        code,
        itemId: 'voucher_discount_50',
        name: 'Mã Giảm 50 XP Đổi Trà Sữa',
        category: 'discount',
        createdAt: new Date().toISOString(),
        status: 'active',
        value: 50,
        desc: 'Được giảm trực tiếp 50 XP khi đổi Thẻ Trà Sữa Thầy Khiêm'
      };
      profile.vouchers.unshift(discVoucher);
      rewardDetail = `Nhận mã giảm giá [${code}] giảm 50 XP khi đổi Trà Sữa!`;
    }

    this.saveUserProfile(profile);
    return {
      success: true,
      reward,
      rewardIndex: selectedIndex,
      rewardDetail,
      newXp: profile.xp,
      profile
    };
  },

  /* ================= 🛒 MUA & ĐỔI VẬT PHẨM (SHOP PURCHASE ENGINE) ================= */
  buyShopItem(itemId, studentClass = '10') {
    const profile = this.getUserProfile();
    const item = SHOP_ITEMS.find(it => it.id === itemId);
    if (!item) {
      return { success: false, error: 'Vật phẩm không tồn tại trong hệ thống!' };
    }

    // Nếu mua thẻ trà sữa, tự động áp dụng mã giảm giá 50 XP nếu có
    let effectivePrice = item.priceXp;
    let appliedDiscount = null;
    if (itemId === 'perk_milk_tea') {
      const discIdx = (profile.vouchers || []).findIndex(v => v.category === 'discount' && v.status === 'active');
      if (discIdx !== -1) {
        appliedDiscount = profile.vouchers[discIdx];
        effectivePrice = Math.max(10, item.priceXp - appliedDiscount.value);
        profile.vouchers[discIdx].status = 'used';
      }
    }

    if ((profile.xp || 0) < effectivePrice) {
      return {
        success: false,
        error: `Bạn cần ${effectivePrice} XP để đổi món này (hiện có ${profile.xp || 0} XP)!`
      };
    }

    // Trừ XP
    profile.xp -= effectivePrice;
    let voucher = null;
    let message = '';

    if (item.category === 'perks') {
      const prefix = itemId === 'perk_no_homework' ? 'HW' : (itemId === 'perk_milk_tea' ? 'TS' : 'PLUS');
      const code = `#${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      voucher = {
        code,
        itemId: item.id,
        name: item.name,
        icon: item.icon,
        category: 'perks',
        studentName: profile.name,
        className: profile.className || studentClass,
        costXp: effectivePrice,
        createdAt: new Date().toISOString(),
        status: 'pending', // pending -> teacher marks redeemed
        desc: item.desc
      };
      if (!profile.vouchers) profile.vouchers = [];
      profile.vouchers.unshift(voucher);

      if (typeof StorageEngine !== 'undefined' && typeof StorageEngine.saveVoucher === 'function') {
        StorageEngine.saveVoucher(voucher);
      }
      message = `Đổi thành công mã Voucher [${code}]! Xuất trình mã này cho Thầy Khiêm để nhận quà nhé.`;
    } else if (item.category === 'boosters') {
      if (!profile.boosters) profile.boosters = {};
      if (item.id === 'booster_xp_2x') {
        const curUntil = profile.boosters.xp2xUntil && profile.boosters.xp2xUntil > Date.now() ? profile.boosters.xp2xUntil : Date.now();
        profile.boosters.xp2xUntil = curUntil + 24 * 60 * 60 * 1000;
        message = 'Đã kích hoạt Thẻ 2x XP Booster trong 24 giờ tiếp theo!';
      } else if (item.id === 'booster_streak_freeze') {
        if (!profile.inventory) profile.inventory = [];
        profile.inventory.push('shield_freeze');
        message = 'Đã thêm Bùa Hộ Mệnh Chuỗi Streak vào Túi đồ!';
      } else if (item.id === 'booster_deep_hint') {
        profile.boosters.hasVdcHints = true;
        message = 'Đã mở khóa Phân tích Mẹo giải Chuyên Sâu VDC!';
      }
    } else if (item.category === 'titles') {
      if (!profile.unlockedTitles) profile.unlockedTitles = [];
      if (!profile.unlockedTitles.includes(item.id)) {
        profile.unlockedTitles.push(item.id);
      }
      profile.equippedTitle = item.id;
      message = `Đã mở khóa và trang bị danh hiệu: ${item.titleText}!`;
    } else if (item.category === 'frames') {
      if (!profile.unlockedFrames) profile.unlockedFrames = [];
      if (!profile.unlockedFrames.includes(item.cssClass)) {
        profile.unlockedFrames.push(item.cssClass);
      }
      profile.frame = item.cssClass;
      message = 'Đã mở khóa và trang bị Khung Avatar mới!';
    }

    this.saveUserProfile(profile);
    return {
      success: true,
      item,
      voucher,
      effectivePrice,
      message,
      profile
    };
  },

  equipTitle(titleId) {
    const profile = this.getUserProfile();
    if (!titleId) {
      profile.equippedTitle = '';
    } else if (profile.unlockedTitles && profile.unlockedTitles.includes(titleId)) {
      profile.equippedTitle = titleId;
    }
    this.saveUserProfile(profile);
    return profile;
  },

  /* ================= ⚖️ GIÁO VIÊN ĐIỀU CHỈNH / TRỪ / CỘNG ĐIỂM KỶ LUẬT ================= */
  applyTeacherAdjustment(studentName, className, xpChange, reason, teacherNote = '') {
    if (!studentName) return { success: false, error: 'Thiếu tên học sinh' };
    const numChange = Number(xpChange);
    if (isNaN(numChange) || numChange === 0) return { success: false, error: 'Điểm điều chỉnh không hợp lệ' };

    const record = {
      id: 'pen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      studentName: studentName.trim(),
      className: className || '10',
      xpChange: numChange,
      reason: reason || (numChange < 0 ? 'Kỷ luật trừ điểm' : 'Khen thưởng cộng điểm'),
      teacherNote: teacherNote || '',
      createdAt: new Date().toISOString()
    };

    if (typeof StorageEngine !== 'undefined' && typeof StorageEngine.savePenalty === 'function') {
      StorageEngine.savePenalty(record);
    }

    // Nếu học sinh khớp với tài khoản cá nhân hiện tại, cập nhật ngay profile.xp
    const profile = this.getUserProfile();
    if (profile && profile.name && profile.name.trim().toLowerCase() === studentName.trim().toLowerCase()) {
      profile.xp = Math.max(0, (profile.xp || 0) + numChange);
      if (!profile.penalties) profile.penalties = [];
      profile.penalties.unshift(record);
      this.saveUserProfile(profile);
    }

    return { success: true, record, profile };
  },

  fireConfetti() {
    if (typeof confetti === 'function') {
      const colors = ['#58cc02', '#1cb0f6', '#ff9600', '#ce82ff', '#ff4b4b', '#ffd900'];
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 }, colors });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0 }, colors });
        confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1 }, colors });
      }, 250);
    }
  }
};

if (typeof window !== 'undefined') {
  window.GamificationEngine = GamificationEngine;
  window.WeeklyHonorEngine = WeeklyHonorEngine;
  window.WEEKLY_LEAGUES = WEEKLY_LEAGUES;
  window.SHOP_ITEMS = SHOP_ITEMS;
  window.LUCKY_WHEEL_ITEMS = LUCKY_WHEEL_ITEMS;
  window.BADGES_DEFINITIONS = BADGES_DEFINITIONS;
  window.LEVEL_TIERS = LEVEL_TIERS;
}
