const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { KOB_OYO_CATALOG, MascotInventoryService: service } = require('../js/gamification/economy');

assert.ok(KOB_OYO_CATALOG.length >= 20 && KOB_OYO_CATALOG.length <= 30, 'Koboyo catalog should contain approximately 20–30 mascots');
for (const item of KOB_OYO_CATALOG) {
  for (const key of ['id', 'type', 'name', 'asset', 'price', 'currency', 'rarity']) assert.ok(item[key] !== undefined, `${item.id} missing ${key}`);
  assert.equal(item.type, 'avatar');
  assert.equal(item.currency, 'kcoin');
  assert.ok(item.asset.startsWith('assets/mascots/koboyo/'));
  assert.ok(fs.existsSync(path.join(__dirname, '..', item.asset)));
  assert.equal(Object.prototype.hasOwnProperty.call(item, 'owned'), false, 'Catalog must not duplicate ownership state');
}

const profile = { avatar: '🦊', xp: 500, kcoins: 200 };
service.ensureProfile(profile);
assert.equal(service.getEquipped(profile).id, 'koboyo_fox', 'Legacy emoji avatar must map to Koboyo fox');
assert.ok(profile.ownedMascotIds.includes('koboyo_fox'), 'Starter avatar should remain owned');

const xpBefore = profile.xp;
const purchase = service.purchaseMascot(profile, 'koboyo_tiger');
assert.equal(purchase.success, true);
assert.equal(profile.xp, xpBefore, 'XP must never be spent by the mascot shop');
assert.equal(profile.kcoins, 120);
assert.equal(service.purchaseMascot(profile, 'koboyo_tiger').code, 'ALREADY_OWNED', 'Duplicate purchase must be rejected');
assert.equal(service.equipMascot(profile, 'koboyo_tiger').success, true);
assert.equal(profile.equippedMascotId, 'koboyo_tiger');
assert.equal(profile.avatar, '🐯', 'Legacy avatar field must stay compatible after equip');

const poorProfile = { avatar: '🦊', xp: 77, kcoins: 0 };
assert.equal(service.purchaseMascot(poorProfile, 'koboyo_robot').code, 'INSUFFICIENT_KCOIN');
assert.equal(poorProfile.xp, 77);
assert.equal(service.equipMascot(poorProfile, 'koboyo_robot').code, 'NOT_OWNED');

const starter = service.purchaseMascot(poorProfile, 'koboyo_fox');
assert.equal(starter.code, 'ALREADY_OWNED', 'Starter avatars remain free and are already available');
assert.equal(service.earnKCoin(poorProfile, 25, 'practice_reward').balance, 25);
console.log('Phase 8 mascot catalog, legacy compatibility, K-Coin purchase, duplicate prevention, and equip flow passed.');
