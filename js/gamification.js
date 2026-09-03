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
  { level: 1, name: 'Tân Binh Học Tập', minXp: 0, maxXp: 200, icon: '🌱' },
  { level: 2, name: 'Học Giả Siêng Năng', minXp: 200, maxXp: 500, icon: '📖' },
  { level: 3, name: 'Chiến Binh Toán Học', minXp: 500, maxXp: 1000, icon: '⚔️' },
  { level: 4, name: 'Bậc Thầy Giải Đề', minXp: 1000, maxXp: 2000, icon: '🧙‍♂️' },
  { level: 5, name: 'Đại Tông Sư Toán Học', minXp: 2000, maxXp: 5000, icon: '👑' }
];

/* ================= 🛡️ 5 HẠNG ĐẤU XẾP HẠNG TUẦN (WEEKLY LEAGUES) ================= */
const WEEKLY_LEAGUES = [
  { id: 'bronze', name: 'Hạng Đồng', icon: '🪵', minXp: 0, maxXp: 299, color: '#b45309', border: '#d97706', bg: 'rgba(180, 83, 9, 0.1)' },
  { id: 'silver', name: 'Hạng Bạc', icon: '🥈', minXp: 300, maxXp: 599, color: '#64748b', border: '#94a3b8', bg: 'rgba(100, 116, 139, 0.1)' },
  { id: 'gold', name: 'Hạng Vàng', icon: '🥇', minXp: 600, maxXp: 999, color: '#d97706', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'diamond', name: 'Hạng Kim Cương', icon: '💎', minXp: 1000, maxXp: 1499, color: '#0284c7', border: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'legend', name: 'Hạng Huyền Thoại', icon: '👑', minXp: 1500, maxXp: 999999, color: '#7c3aed', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' }
];

/* ================= 🎁 CỬA HÀNG ĐỔI THƯỞNG XP (REWARD SHOP) ================= */
const SHOP_ITEMS = [
  { id: 'frame_fire', name: 'Khung Lửa Rực Cháy', icon: '🔥', type: 'frame', priceXp: 300, desc: 'Hiệu ứng lửa cháy rực rỡ xung quanh Avatar của bạn', cssClass: 'frame-flame-ember' },
  { id: 'frame_gold', name: 'Khung Vương Miện Vàng', icon: '👑', type: 'frame', priceXp: 600, desc: 'Khung Hoàng Gia dát vàng sáng lấp lánh dành cho thủ khoa', cssClass: 'frame-sovereign-crown' },
  { id: 'frame_neon', name: 'Khung Điện Quang Neon', icon: '⚡', type: 'frame', priceXp: 450, desc: 'Hiệu ứng điện quang Cyberpunk đổi màu năng động', cssClass: 'frame-lightning-storm' },
  { id: 'shield_freeze', name: 'Khiên Bảo Vệ Chuỗi', icon: '🛡️', type: 'consumable', priceXp: 200, desc: 'Tự động bảo vệ chuỗi Streak không bị mất nếu nghỉ 1 ngày' },
  { id: 'avatar_dragon', name: 'Linh Vật Rồng Lửa', icon: '🐉', type: 'avatar', priceXp: 500, desc: 'Linh vật Avatar tối thượng thể hiện sức mạnh toán học' }
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

    sortedResults.forEach(res => {
      if (!res || !res.name) return;
      if (targetClass !== 'all' && res.className !== targetClass) return;
      
      if (weekRange && !this.isInWeek(res.submittedAt, weekRange)) {
        return;
      }

      const key = res.name.trim().toLowerCase();
      if (!studentMap[key]) {
        studentMap[key] = {
          name: res.name.trim(),
          className: res.className || '10',
          avatar: res.avatar || '🦊',
          frame: res.frame || 'frame-gold-perfect',
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
      item.submissionsCount++;
      if (res.quizId) item.uniqueQuizzes.add(res.quizId);
      const score = typeof res.totalScore === 'number' ? res.totalScore : 0;
      item.totalScoreSum += score;
      item.lastSubmittedAt = res.submittedAt;

      if (res.timeTakenSeconds && res.timeTakenSeconds < item.fastestQuizSeconds) {
        item.fastestQuizSeconds = res.timeTakenSeconds;
      }
      if (res.tabSwitches === 0) {
        item.honestSubmissions++;
      }

      // Điểm Vinh Danh
      let earnedXp = 50;
      if (score >= 10 || res.scorePct === 100) {
        earnedXp += 120;
        item.perfectScores++;
        item.currentPerfectStreak++;
        if (item.currentPerfectStreak > item.maxPerfectStreak) {
          item.maxPerfectStreak = item.currentPerfectStreak;
        }

        if (item.currentPerfectStreak === 2) {
          earnedXp += 100;
          if (!item.honorsBadges.includes('⚔️ Song Đao')) item.honorsBadges.push('⚔️ Song Đao');
        } else if (item.currentPerfectStreak === 3) {
          earnedXp += 250;
          if (!item.honorsBadges.includes('🌟 Tam Tinh')) item.honorsBadges.push('🌟 Tam Tinh');
        } else if (item.currentPerfectStreak >= 5) {
          earnedXp += 500;
          if (!item.honorsBadges.includes('👑 Bất Bại')) item.honorsBadges.push('👑 Bất Bại');
        }
      } else {
        item.currentPerfectStreak = 0;
        if (score >= 9.0) earnedXp += 60;
        else if (score >= 8.0) earnedXp += 30;
      }

      if (res.tabSwitches === 0) earnedXp += 25;

      item.honorXp += earnedXp;
    });

    const list = Object.values(studentMap);
    list.forEach(st => {
      st.avgScore = st.submissionsCount ? (Math.round((st.totalScoreSum / st.submissionsCount) * 10) / 10) : 0;

      const classQuizzes = availableQuizzes.filter(q => {
        if (!q.grade) return true;
        const g = q.grade.toString();
        return st.className.includes(g) || g === 'all';
      });

      const totalRequired = classQuizzes.length || 3;
      const completedCount = st.uniqueQuizzes.size;
      st.completionRate = Math.min(100, Math.round((completedCount / totalRequired) * 100));

      if (completedCount >= totalRequired && totalRequired > 0) {
        st.honorXp += 400;
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

    const titan = weeklyRankings.find(s => s.honorXp > 0) || weeklyRankings[0] || null;

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
        rewardXp: 150,
        icon: '🎯',
        isCompleted: submissions >= 3
      },
      {
        id: 'quest_perf_1',
        title: 'Đỉnh Cao Hoàn Hảo',
        desc: 'Giành ít nhất 1 bài thi đạt điểm 10 tuyệt đối',
        target: 1,
        current: Math.min(1, perfects),
        rewardXp: 200,
        icon: '💯',
        isCompleted: perfects >= 1
      },
      {
        id: 'quest_honest_1',
        title: 'Chiến Binh Chính Trực',
        desc: 'Làm bài thi nghiêm túc, 0 lần rời màn hình',
        target: 1,
        current: Math.min(1, honest),
        rewardXp: 100,
        icon: '🕊️',
        isCompleted: honest >= 1
      }
    ];
  }
};

/* ================= 🎮 CORE GAMIFICATION ENGINE ================= */
const GamificationEngine = {
  getUserProfile() {
    const raw = localStorage.getItem('khiemedu_profile');
    if (!raw) {
      const initial = {
        name: 'Nguyễn Văn An',
        className: '10',
        avatar: '🦊',
        frame: 'frame-target',
        xp: 350,
        streak: 3,
        perfectStreak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        examsCount: 3,
        perfectCount: 1,
        totalCorrectAnswers: 28,
        inventory: ['frame_target', 'frame-target'],
        unlockedFrames: ['frame-target', 'frame-gold-perfect', 'frame-flame-ember', 'frame-angel-wings'],
        unlockedBadges: ['first_blood', 'streak_3', 'honest_soul']
      };
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
      return p;
    } catch {
      return {};
    }
  },

  saveUserProfile(profile) {
    localStorage.setItem('khiemedu_profile', JSON.stringify(profile));
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
    let xpGained = 50;
    const bonusBreakdown = [];

    // Tích lũy câu đúng
    profile.totalCorrectAnswers = (profile.totalCorrectAnswers || 0) + (result.correct || 0);

    // Điểm số bài thi
    if (result.totalScore >= 10 || result.scorePct === 100) {
      xpGained += 120;
      bonusBreakdown.push({ label: 'Điểm 10 Tuyệt Đối', xp: 120, icon: '💯' });
      profile.perfectCount = (profile.perfectCount || 0) + 1;
      profile.perfectStreak = (profile.perfectStreak || 0) + 1;

      if (profile.perfectStreak === 2) {
        xpGained += 100;
        bonusBreakdown.push({ label: 'Chuỗi 2 Điểm 10 (Song Đao ⚔️)', xp: 100, icon: '⚔️' });
      } else if (profile.perfectStreak === 3) {
        xpGained += 250;
        bonusBreakdown.push({ label: 'Chuỗi 3 Điểm 10 (Tam Tinh 🌟)', xp: 250, icon: '🌟' });
      } else if (profile.perfectStreak >= 5) {
        xpGained += 500;
        bonusBreakdown.push({ label: `Chuỗi ${profile.perfectStreak} Điểm 10 (Bất Bại 👑)`, xp: 500, icon: '👑' });
      }
    } else {
      profile.perfectStreak = 0;
      if (result.totalScore >= 9.0) {
        xpGained += 60;
        bonusBreakdown.push({ label: 'Điểm Xuất Sắc (>=9.0)', xp: 60, icon: '✨' });
      } else if (result.totalScore >= 8.0) {
        xpGained += 30;
        bonusBreakdown.push({ label: 'Điểm Giỏi (>=8.0)', xp: 30, icon: '📘' });
      }
    }

    if (result.tabSwitches === 0) {
      xpGained += 25;
      bonusBreakdown.push({ label: 'Chính Trực (0 lần rời tab)', xp: 25, icon: '🕊️' });
    }

    // Kiểm tra thần tốc
    const isSpeedy = result.timeTakenSeconds && result.timeLimitSeconds && (result.timeTakenSeconds <= result.timeLimitSeconds * 0.5) && (result.totalScore >= 8.0);
    if (isSpeedy) {
      xpGained += 30;
      bonusBreakdown.push({ label: 'Thần Tốc (≤ 50% thời gian)', xp: 30, icon: '⚡' });
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
    if (profile.xp >= 2000) unlockBadge('grand_master');
    if (profile.xp >= 1000) unlockBadge('diamond_ranker');
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

  fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 70, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 70, angle: 120, spread: 60, origin: { x: 1 } });
      }, 250);
    }
  }
};

if (typeof window !== 'undefined') {
  window.GamificationEngine = GamificationEngine;
  window.WeeklyHonorEngine = WeeklyHonorEngine;
  window.WEEKLY_LEAGUES = WEEKLY_LEAGUES;
  window.SHOP_ITEMS = SHOP_ITEMS;
  window.BADGES_DEFINITIONS = BADGES_DEFINITIONS;
  window.LEVEL_TIERS = LEVEL_TIERS;
}
