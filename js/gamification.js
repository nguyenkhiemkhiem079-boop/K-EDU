/**
 * KhiemEdu Gamification Engine
 * Handles XP, Levels, Streaks, Badges, and Celebrations.
 */

const BADGES_DEFINITIONS = [
  { id: 'first_exam', name: 'Phát Súng Đầu', icon: '🎯', desc: 'Hoàn thành bài thi trắc nghiệm đầu tiên' },
  { id: 'perfect_score', name: 'Điểm Tuyệt Đối', icon: '💯', desc: 'Đạt 100% điểm trong bài thi' },
  { id: 'speed_demon', name: 'Thần Tốc', icon: '⚡', desc: 'Hoàn thành bài thi trong vòng dưới nửa thời gian quy định' },
  { id: 'honest_student', name: 'Chính Trực', icon: '🛡️', desc: 'Hoàn thành bài thi mà không rời khỏi tab một lần nào' },
  { id: 'streak_3', name: 'Chăm Chỉ 3 Ngày', icon: '🔥', desc: 'Duy trì chuỗi học tập 3 ngày liên tiếp' },
  { id: 'streak_7', name: 'Chiến Binh 7 Ngày', icon: '🌟', desc: 'Duy trì chuỗi học tập 7 ngày liên tiếp' },
  { id: 'exam_master', name: 'Bậc Thầy Luyện Đề', icon: '📚', desc: 'Hoàn thành từ 5 bài thi trở lên' },
  { id: 'grandmaster', name: 'Đại Tông Sư', icon: '👑', desc: 'Đạt cấp độ 5 trở lên trên hệ thống' }
];

const LEVEL_TIERS = [
  { level: 1, name: 'Tân Binh', minXp: 0, maxXp: 200 },
  { level: 2, name: 'Tập Sự', minXp: 200, maxXp: 500 },
  { level: 3, name: 'Học Giả', minXp: 500, maxXp: 1000 },
  { level: 4, name: 'Tinh Anh', minXp: 1000, maxXp: 2000 },
  { level: 5, name: 'Bậc Thầy', minXp: 2000, maxXp: 4000 },
  { level: 6, name: 'Đại Tông Sư', minXp: 4000, maxXp: 99999 }
];

const GamificationEngine = {
  getUserProfile() {
    const defaultProfile = {
      name: 'Học sinh',
      avatar: '🦊',
      xp: 0,
      streak: 1,
      lastStudyDate: new Date().toISOString().split('T')[0],
      unlockedBadges: ['first_exam'],
      examsCount: 0,
      perfectCount: 0
    };
    try {
      const saved = localStorage.getItem('khiemedu_profile');
      if (saved) return { ...defaultProfile, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultProfile;
  },

  saveUserProfile(profile) {
    localStorage.setItem('khiemedu_profile', JSON.stringify(profile));
  },

  getLevelInfo(xp) {
    for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_TIERS[i].minXp) {
        const tier = LEVEL_TIERS[i];
        const nextTier = LEVEL_TIERS[i + 1] || tier;
        const progress = tier === nextTier ? 100 : Math.min(100, Math.round(((xp - tier.minXp) / (nextTier.minXp - tier.minXp)) * 100));
        return { ...tier, progress, nextXp: nextTier.minXp };
      }
    }
    return { ...LEVEL_TIERS[0], progress: 0, nextXp: LEVEL_TIERS[1].minXp };
  },

  updateStreak(profile) {
    const today = new Date().toISOString().split('T')[0];
    if (!profile.lastStudyDate) {
      profile.streak = 1;
      profile.lastStudyDate = today;
      return;
    }

    if (profile.lastStudyDate === today) {
      return; // Already studied today
    }

    const lastDate = new Date(profile.lastStudyDate);
    const currentDate = new Date(today);
    const diffDays = Math.round((currentDate - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      profile.streak += 1;
    } else if (diffDays > 1) {
      profile.streak = 1;
    }
    profile.lastStudyDate = today;
  },

  awardExamRewards(examResult) {
    const profile = this.getUserProfile();
    this.updateStreak(profile);

    // XP calculation
    // Base: 50 XP for completion
    // + 20 XP per correct answer
    // + 50 bonus for 100% score
    // + 30 bonus for zero tab switches
    let xpGained = 50 + (examResult.correct * 20);
    if (examResult.scorePct === 100) xpGained += 50;
    if (examResult.tabSwitches === 0) xpGained += 30;

    const oldLevel = this.getLevelInfo(profile.xp).level;
    profile.xp += xpGained;
    profile.examsCount = (profile.examsCount || 0) + 1;
    if (examResult.scorePct === 100) {
      profile.perfectCount = (profile.perfectCount || 0) + 1;
    }

    const newLevelInfo = this.getLevelInfo(profile.xp);
    const leveledUp = newLevelInfo.level > oldLevel;

    // Check Badges
    const newlyUnlocked = [];
    const checkBadge = (id, condition) => {
      if (condition && !profile.unlockedBadges.includes(id)) {
        profile.unlockedBadges.push(id);
        const b = BADGES_DEFINITIONS.find(x => x.id === id);
        if (b) newlyUnlocked.push(b);
      }
    };

    checkBadge('first_exam', profile.examsCount >= 1);
    checkBadge('perfect_score', examResult.scorePct === 100);
    checkBadge('honest_student', examResult.tabSwitches === 0);
    checkBadge('streak_3', profile.streak >= 3);
    checkBadge('streak_7', profile.streak >= 7);
    checkBadge('exam_master', profile.examsCount >= 5);
    checkBadge('grandmaster', newLevelInfo.level >= 5);

    this.saveUserProfile(profile);

    return {
      xpGained,
      totalXp: profile.xp,
      levelInfo: newLevelInfo,
      leveledUp,
      streak: profile.streak,
      newlyUnlocked
    };
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
