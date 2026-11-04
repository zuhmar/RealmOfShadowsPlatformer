import test from 'node:test';
import assert from 'node:assert/strict';
import { CLASS_PATHS } from '@ros/game-data';
import {
  createPlayer,
  chooseClass,
  trainClassTalent,
  classPoints,
  canUseClassWeapon,
  classSkillEvolution,
  classSkillCooldown,
  playerAttributes,
  type Player,
} from '@ros/shared';
function ready() {
  const p = createPlayer('p', 'Hero');
  p.quests = { 'crystal-class-trial': { claimed: true, progress: 90 } };
  p.level = 20;
  return p;
}
test('the Woods weapon kit alone cannot unlock classes; Civilians retain saved training without using or gaining it', () => {
  const p = createPlayer('p', 'Civilian');
  p.quests = { 'mira-wolves': { claimed: true, progress: 15 } };
  p.weapon = 'elderwood-blade';
  p.combatSkills = { Melee: { level: 20, xp: 0 } };
  assert.throws(() => chooseClass(p, 'knight'), /Crystal Caverns/);
  assert.equal(playerAttributes(p).activeSkill, null);
  assert.equal(playerAttributes(p).trainingDamage, 0);
});
test('class trials remain open; choosing requires the trial; later changes cost gold, refund talents and unequip mismatched weapons', () => {
  const p = createPlayer('p', 'Hero');
  assert.ok(canUseClassWeapon(p, 'elderwood-staff'));
  assert.throws(() => chooseClass(p, 'mage'), /trial/);
  Object.assign(p, ready());
  p.weapon = 'elderwood-blade';
  chooseClass(p, 'knight');
  assert.equal(p.gold, 0);
  assert.equal(p.weapon, 'elderwood-blade');
  assert.ok(!canUseClassWeapon(p, 'elderwood-staff'));
  trainClassTalent(p, 'signature');
  p.lastSkill = 9000;
  const before = structuredClone(p);
  assert.throws(() => chooseClass(p, 'rogue'), /500/);
  assert.deepEqual(p, before);
  p.gold = 500;
  chooseClass(p, 'rogue');
  assert.equal(p.gold, 0);
  assert.equal(p.weapon, null);
  assert.deepEqual(p.classTalents, {});
  assert.equal(p.lastSkill, 9000);
  assert.equal(classPoints(p), 4);
});
test('talents have finite earned points, correct class mechanics, and never grant equipment attributes', () => {
  for (const [id, path] of Object.entries(CLASS_PATHS)) {
    const p = ready();
    p.level = 100;
    chooseClass(p, id);
    p.weapon = `woods-${path.weapon}`;
    const attrs = playerAttributes(p),
      base = classSkillEvolution(p);
    for (let i = 0; i < 5; i++) trainClassTalent(p, 'signature');
    for (let i = 0; i < 5; i++) trainClassTalent(p, 'discipline');
    for (let i = 0; i < 5; i++) trainClassTalent(p, 'mastery');
    assert.equal(classPoints(p), 0);
    assert.throws(() => trainClassTalent(p, 'mastery'));
    assert.deepEqual(playerAttributes(p), attrs);
    assert.equal(classSkillCooldown(p), 4500);
    const next = classSkillEvolution(p);
    assert.ok(next.damageMultiplier > base.damageMultiplier);
    if (id === 'knight') assert.ok(next.meleeReach > base.meleeReach);
    if (id === 'archer') assert.ok(next.arrowRangeMultiplier > base.arrowRangeMultiplier);
    if (id === 'mage') assert.ok(next.burstRadius > base.burstRadius);
    if (id === 'rogue') assert.equal(next.flurryStrikes, base.flurryStrikes + 1);
  }
});
