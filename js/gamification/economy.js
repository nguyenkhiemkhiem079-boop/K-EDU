/**
 * K-EDU Koboyo economy and mascot inventory service.
 *
 * XP remains progression-only. K-Coin is the only currency used by the
 * mascot reward shop. Ownership/equipment is derived from the profile by
 * this service so views never keep their own copy of economy state.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    const api = factory();
    root.KEDU_ECONOMY = api;
    root.KOB_OYO_CATALOG = api.KOB_OYO_CATALOG;
    root.MascotInventoryService = api.MascotInventoryService;

    if (root.GamificationEngine) {
      Object.assign(root.GamificationEngine, {
        getKCoinBalance() {
          return api.MascotInventoryService.getWallet(this.getUserProfile()).balance;
        },
        earnKCoin(amount, reason) {
          const profile = this.getUserProfile();
          const result = api.MascotInventoryService.earnKCoin(profile, amount, reason);
          this.saveUserProfile(profile);
          return result;
        },
        getMascotCatalog() {
          return api.MascotInventoryService.getCatalog(this.getUserProfile());
        },
        purchaseMascot(id) {
          const profile = this.getUserProfile();
          const result = api.MascotInventoryService.purchaseMascot(profile, id);
          if (result.success) this.saveUserProfile(profile);
          return result;
        },
        equipMascot(id) {
          const profile = this.getUserProfile();
          const result = api.MascotInventoryService.equipMascot(profile, id);
          if (result.success) this.saveUserProfile(profile);
          return result;
        }
      });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ASSET_ROOT = 'assets/mascots/koboyo/';

  function mascot(id, name, asset, price, rarity, emoji, legacyIds = []) {
    return Object.freeze({
      id,
      type: 'avatar',
      name,
      asset: `${ASSET_ROOT}${asset}`,
      price,
      currency: 'kcoin',
      rarity,
      emoji,
      legacyIds
    });
  }

  // The catalog is metadata only. `owned` and `equipped` are added by
  // getCatalog(profile), keeping ownership canonical in the profile/service.
  const KOB_OYO_CATALOG = Object.freeze([
    mascot('koboyo_fox', 'Cáo Koboyo', 'fox.svg', 0, 'starter', '🦊', ['fox']),
    mascot('koboyo_owl', 'Cú Koboyo', 'owl.svg', 0, 'starter', '🦉', ['owl']),
    mascot('koboyo_panda', 'Gấu trúc Koboyo', 'panda.svg', 0, 'starter', '🐼', ['panda']),
    mascot('koboyo_penguin', 'Cánh cụt Koboyo', 'penguin.svg', 0, 'starter', '🐧', ['penguin']),
    mascot('koboyo_cat', 'Mèo Koboyo', 'cat.svg', 0, 'starter', '🐱', ['cat']),
    mascot('koboyo_tiger', 'Hổ Koboyo', 'tiger.svg', 80, 'rare', '🐯', ['tiger']),
    mascot('koboyo_koala', 'Koala Koboyo', 'koala.svg', 80, 'rare', '🐨', ['koala']),
    mascot('koboyo_frog', 'Ếch Koboyo', 'frog.svg', 90, 'rare', '🐸', ['frog']),
    mascot('koboyo_bunny', 'Thỏ Koboyo', 'bunny.svg', 90, 'rare', '🐰', ['rabbit', 'bunny']),
    mascot('koboyo_dino', 'Khủng long Koboyo', 'dino.svg', 120, 'rare', '🦖', ['dino', 'dragon']),
    mascot('koboyo_lion', 'Sư tử Koboyo', 'lion.svg', 120, 'rare', '🦁', ['lion']),
    mascot('koboyo_monkey', 'Khỉ Koboyo', 'monkey.svg', 120, 'rare', '🐵', ['monkey']),
    mascot('koboyo_astronaut', 'Phi hành gia Koboyo', 'astronaut.svg', 160, 'epic', '🚀', ['astronaut']),
    mascot('koboyo_scientist', 'Nhà khoa học Koboyo', 'scientist.svg', 160, 'epic', '🧪', ['scientist']),
    mascot('koboyo_wizard', 'Pháp sư Koboyo', 'wizard.svg', 180, 'epic', '🧙‍♂️', ['wizard']),
    mascot('koboyo_robot', 'Robot Koboyo', 'robot.svg', 180, 'epic', '🤖', ['robot']),
    mascot('koboyo_knight', 'Kỵ sĩ Koboyo', 'knight.svg', 220, 'epic', '🛡️', ['knight', 'shield', 'sword']),
    mascot('koboyo_unicorn', 'Kỳ lân Koboyo', 'unicorn.svg', 240, 'epic', '🦄', ['unicorn']),
    mascot('koboyo_dragon', 'Rồng sao Koboyo', 'dragon.svg', 300, 'legendary', '🐲', ['dragon']),
    mascot('koboyo_eagle', 'Đại bàng Koboyo', 'eagle.svg', 260, 'legendary', '🦅', ['eagle']),
    mascot('koboyo_wolf', 'Sói thủ lĩnh Koboyo', 'wolf.svg', 260, 'legendary', '🐺', ['wolf']),
    mascot('koboyo_crystal', 'Koboyo pha lê', 'crystal.svg', 320, 'legendary', '🔮', ['crystal']),
    mascot('koboyo_rainbow', 'Koboyo cầu vồng', 'rainbow.svg', 340, 'legendary', '🌈', ['rainbow']),
    mascot('koboyo_star', 'Koboyo ngôi sao', 'star.svg', 360, 'legendary', '🌟', ['star'])
  ]);

  const CATALOG_BY_ID = new Map(KOB_OYO_CATALOG.map(item => [item.id, item]));
  const LEGACY_TO_ID = new Map();
  const EMOJI_TO_ID = new Map();
  KOB_OYO_CATALOG.forEach(item => {
    LEGACY_TO_ID.set(item.id, item.id);
    LEGACY_TO_ID.set(item.id.replace(/^koboyo_/, ''), item.id);
    item.legacyIds.forEach(legacyId => LEGACY_TO_ID.set(legacyId, item.id));
    EMOJI_TO_ID.set(item.emoji, item.id);
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function resolveMascotId(value) {
    if (!value) return null;
    if (typeof value === 'object') return resolveMascotId(value.id || value.avatarId || value.emoji);
    return LEGACY_TO_ID.get(String(value)) || EMOJI_TO_ID.get(String(value)) || null;
  }

  function ensureProfile(profile = {}) {
    if (!profile || typeof profile !== 'object') throw new TypeError('A profile object is required');
    if (!Number.isFinite(Number(profile.kcoins))) profile.kcoins = Number(profile.kcoin) || 0;
    profile.kcoins = Math.max(0, Math.floor(profile.kcoins));
    if (!Array.isArray(profile.ownedMascotIds)) profile.ownedMascotIds = [];

    // Starter mascots are always free. Existing legacy avatars are migrated
    // into permanent ownership before an equipped ID is derived.
    KOB_OYO_CATALOG.filter(item => item.price === 0).forEach(item => {
      if (!profile.ownedMascotIds.includes(item.id)) profile.ownedMascotIds.push(item.id);
    });
    const legacySelected = resolveMascotId(profile.mascotId || profile.avatarId || profile.avatar);
    if (legacySelected && !profile.ownedMascotIds.includes(legacySelected)) {
      profile.ownedMascotIds.push(legacySelected);
    }
    const requestedEquipped = resolveMascotId(profile.equippedMascotId);
    const equipped = requestedEquipped && profile.ownedMascotIds.includes(requestedEquipped)
      ? requestedEquipped
      : (legacySelected && profile.ownedMascotIds.includes(legacySelected) ? legacySelected : 'koboyo_fox');
    profile.equippedMascotId = equipped;
    const equippedItem = CATALOG_BY_ID.get(equipped) || CATALOG_BY_ID.get('koboyo_fox');
    profile.mascotId = equippedItem.id;
    profile.avatarId = equippedItem.id.replace(/^koboyo_/, '');
    // Keep the legacy emoji field so old roster/result/profile code remains compatible.
    if (!profile.avatar || EMOJI_TO_ID.has(profile.avatar) || resolveMascotId(profile.avatar)) {
      profile.avatar = equippedItem.emoji;
    }
    if (!Array.isArray(profile.kcoinLedger)) profile.kcoinLedger = [];
    return profile;
  }

  function getWallet(profile = {}) {
    const normalized = ensureProfile(profile);
    return {
      balance: normalized.kcoins,
      currency: 'kcoin',
      currencyLabel: 'K-Coin',
      ledger: clone(normalized.kcoinLedger)
    };
  }

  function getCatalog(profile = {}) {
    const normalized = ensureProfile(profile);
    const owned = new Set(normalized.ownedMascotIds);
    return KOB_OYO_CATALOG.map(item => ({
      ...item,
      owned: owned.has(item.id),
      equipped: normalized.equippedMascotId === item.id
    }));
  }

  function getMascot(profile, id) {
    const canonicalId = resolveMascotId(id);
    if (!canonicalId) return null;
    return getCatalog(profile).find(item => item.id === canonicalId) || null;
  }

  function earnKCoin(profile, amount, reason = 'reward') {
    const normalized = ensureProfile(profile);
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return { success: false, code: 'INVALID_KCOIN_AMOUNT', profile: normalized };
    }
    normalized.kcoins += value;
    normalized.kcoinLedger.unshift({ type: 'earn', amount: value, reason: String(reason || 'reward'), createdAt: new Date().toISOString() });
    return { success: true, amount: value, balance: normalized.kcoins, profile: normalized };
  }

  function purchaseMascot(profile, id) {
    const normalized = ensureProfile(profile);
    const canonicalId = resolveMascotId(id);
    const item = canonicalId ? CATALOG_BY_ID.get(canonicalId) : null;
    if (!item) return { success: false, code: 'MASCOT_NOT_FOUND', error: 'Mascot không tồn tại.' };
    if (normalized.ownedMascotIds.includes(item.id)) {
      return { success: false, code: 'ALREADY_OWNED', error: 'Mascot này đã có trong Inventory.' };
    }
    if (item.price <= 0) {
      normalized.ownedMascotIds.push(item.id);
      return { success: true, code: 'FREE_UNLOCK', item, balance: normalized.kcoins, profile: normalized };
    }
    if (normalized.kcoins < item.price) {
      return { success: false, code: 'INSUFFICIENT_KCOIN', error: `Cần ${item.price} K-Coin (đang có ${normalized.kcoins}).` };
    }
    normalized.kcoins -= item.price;
    normalized.ownedMascotIds.push(item.id);
    normalized.kcoinLedger.unshift({ type: 'spend', amount: -item.price, reason: `purchase:${item.id}`, createdAt: new Date().toISOString() });
    return { success: true, code: 'PURCHASED', item, balance: normalized.kcoins, profile: normalized };
  }

  function equipMascot(profile, id) {
    const normalized = ensureProfile(profile);
    const canonicalId = resolveMascotId(id);
    const item = canonicalId ? CATALOG_BY_ID.get(canonicalId) : null;
    if (!item) return { success: false, code: 'MASCOT_NOT_FOUND', error: 'Mascot không tồn tại.' };
    if (!normalized.ownedMascotIds.includes(item.id)) {
      return { success: false, code: 'NOT_OWNED', error: 'Hãy mở khóa mascot trong Reward Shop trước.' };
    }
    normalized.equippedMascotId = item.id;
    normalized.mascotId = item.id;
    normalized.avatarId = item.id.replace(/^koboyo_/, '');
    normalized.avatar = item.emoji;
    return { success: true, code: 'EQUIPPED', item, profile: normalized };
  }

  function getEquipped(profile = {}) {
    const normalized = ensureProfile(profile);
    return CATALOG_BY_ID.get(normalized.equippedMascotId) || CATALOG_BY_ID.get('koboyo_fox');
  }

  const MascotInventoryService = Object.freeze({
    ASSET_ROOT,
    KOB_OYO_CATALOG,
    LEGACY_TO_ID,
    ensureProfile,
    resolveMascotId,
    getWallet,
    getCatalog,
    getMascot,
    getEquipped,
    earnKCoin,
    purchaseMascot,
    equipMascot
  });

  return { KOB_OYO_CATALOG, MascotInventoryService };
});
