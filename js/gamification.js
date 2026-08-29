/**
 * KhiemEdu Gamification & Hall of Fame Engine (Duolingo/Quizizz style)
 */

const BADGES_DEFINITIONS = [
  { id: 'first_blood', name: 'Phát Súng Đầu', icon: '🎯', desc: 'Hoàn thành bài thi trắc nghiệm đầu tiên', xpReq: 0 },
  { id: 'perfect_10', name: 'Điểm Tuyệt Đối', icon: '💯', desc: 'Đạt 10/10 điểm trong bất kỳ bài thi nào', xpReq: 0 },
  { id: 'speed_demon', name: 'Thần Tốc', icon: '⚡', desc: 'Hoàn thành bài thi dưới 50% thời gian quy định', xpReq: 0 },
  { id: 'honest_soul', name: 'Chính Trực', icon: '🛡️', desc: 'Làm bài thi mà không rời khỏi tab một lần nào', xpReq: 0 },
  { id: 'streak_3', name: 'Chăm Chỉ 3 Ngày', icon: '🔥', desc: 'Duy trì chuỗi học tập 3 ngày liên tiếp', xpReq: 0 },
  { id: 'streak_7', name: 'Chiến Binh 7 Ngày', icon: '⭐', desc: 'Duy trì chuỗi học tập 7 ngày liên tiếp', xpReq: 0 },
  { id: 'quiz_master', name: 'Bậc Thầy Luyện Đề', icon: '📚', desc: 'Hoàn thành từ 5 bài thi trở lên', xpReq: 0 },
  { id: 'grand_master', name: 'Đại Tông Sư', icon: '👑', desc: 'Đạt cấp độ 5 trở lên trên hệ thống', xpReq: 1000 }
];

const LEVEL_TIERS = [
  { level: 1, name: 'Tân Binh Học Tập', minXp: 0, maxXp: 200, icon: '🌱' },
  { level: 2, name: 'Học Giả Siêng Năng', minXp: 200, maxXp: 500, icon: '📖' },
  { level: 3, name: 'Chiến Binh Toán Học', minXp: 500, maxXp: 1000, icon: '⚔️' },
  { level: 4, name: 'Bậc Thầy Giải Đề', minXp: 1000, maxXp: 2000, icon: '🧙‍♂️' },
  { level: 5, name: 'Đại Tông Sư Toán Học', minXp: 2000, maxXp: 5000, icon: '👑' }
];

const GamificationEngine = {
  getUserProfile() {
    const raw = localStorage.getItem('khiemedu_profile');
    if (!raw) {
      const initial = {
        name: 'Nguyễn Văn An',
        className: '8A1',
        avatar: '🦊',
        xp: 350,
        streak: 3,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        examsCount: 3,
        perfectCount: 1,
        unlockedBadges: ['first_blood', 'streak_3', 'honest_soul']
      };
      this.saveUserProfile(initial);
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  saveUserProfile(profile) {
    localStorage.setItem('khiemedu_profile', JSON.stringify(profile));
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

  awardExamRewards(result) {
    const profile = this.getUserProfile();
    let xpGained = 50; // base

    if (result.scorePct >= 90) xpGained += 50;
    if (result.scorePct === 100) xpGained += 100;
    if (result.tabSwitches === 0) xpGained += 25; // honest bonus

    profile.xp = (profile.xp || 0) + xpGained;
    profile.examsCount = (profile.examsCount || 0) + 1;
    if (result.totalScore >= 10) profile.perfectCount = (profile.perfectCount || 0) + 1;

    // Streak logic
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate) {
      const last = new Date(profile.lastActiveDate);
      const diffDays = Math.round((new Date(today) - last) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        profile.streak = (profile.streak || 1) + 1;
      } else if (diffDays > 1) {
        profile.streak = 1;
      }
    } else {
      profile.streak = 1;
    }
    profile.lastActiveDate = today;

    // Check Badges
    const newlyUnlocked = [];
    if (!profile.unlockedBadges.includes('first_blood')) {
      profile.unlockedBadges.push('first_blood');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'first_blood'));
    }
    if (result.totalScore >= 10 && !profile.unlockedBadges.includes('perfect_10')) {
      profile.unlockedBadges.push('perfect_10');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'perfect_10'));
    }
    if (result.tabSwitches === 0 && !profile.unlockedBadges.includes('honest_soul')) {
      profile.unlockedBadges.push('honest_soul');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'honest_soul'));
    }
    if (profile.streak >= 3 && !profile.unlockedBadges.includes('streak_3')) {
      profile.unlockedBadges.push('streak_3');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'streak_3'));
    }
    if (profile.streak >= 7 && !profile.unlockedBadges.includes('streak_7')) {
      profile.unlockedBadges.push('streak_7');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'streak_7'));
    }
    if (profile.examsCount >= 5 && !profile.unlockedBadges.includes('quiz_master')) {
      profile.unlockedBadges.push('quiz_master');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'quiz_master'));
    }
    if (profile.xp >= 1000 && !profile.unlockedBadges.includes('grand_master')) {
      profile.unlockedBadges.push('grand_master');
      newlyUnlocked.push(BADGES_DEFINITIONS.find(b => b.id === 'grand_master'));
    }

    this.saveUserProfile(profile);
    return { xpGained, streak: profile.streak, newlyUnlocked };
  },

  fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    }
  }
};

window.GamificationEngine = GamificationEngine;
window.BADGES_DEFINITIONS = BADGES_DEFINITIONS;
