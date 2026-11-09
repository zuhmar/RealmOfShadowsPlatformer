import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, BOSS_ATTACK, WOODS_MONSTERS } from '@ros/game-data';
import {
  createPlayer,
  createGear,
  createCraftedGear,
  equipGear,
  sellGear,
  gearSellValue,
  compareGear,
  World,
} from '@ros/shared';
test('sales pay once, preserve other instances, reject unowned and equipped items', () => {
  const p = createPlayer('p', 'Seller'),
    a = createCraftedGear('woods-helmet'),
    b = createGear('woods-helmet', 1, () => 0.999);
  p.gear = [a, b];
  p.gold = 100;
  equipGear(p, a.id);
  assert.throws(() => sellGear(p, a.id), /Unequip/);
  assert.equal(p.gold, 100);
  const value = gearSellValue(b);
  sellGear(p, b.id);
  assert.equal(p.gold, 100 + value);
  assert.deepEqual(p.gear, [a]);
  assert.throws(() => sellGear(p, b.id), /own/);
  assert.equal(p.gold, 100 + value);
});
test('unidentified sale prices conceal rarity and average identification resale stays below fees', () => {
  const p = createPlayer('p', 'Seller');
  let expectedResale = 0;
  for (const [roll, weight] of [
    [0, 0.65],
    [0.7, 0.25],
    [0.95, 0.085],
    [0.999, 0.015],
  ]) {
    const g = createGear('woods-sword', 1, () => roll);
    assert.equal(gearSellValue(g), 8);
    g.identified = true;
    expectedResale += gearSellValue(g) * weight;
  }
  assert.ok(expectedResale < 75);
  assert.equal(gearSellValue(createCraftedGear('woods-sword')), 4);
});
test('comparisons include gains, losses, weapon skill changes, caps and never mutate equipment', () => {
  const p = createPlayer('p', 'Compare'),
    a = createCraftedGear('woods-armor'),
    b = createGear('woods-armor', 1, () => 0);
  a.attributes = { health: 40, armor: 5 };
  b.identified = true;
  b.attributes = { health: 20, armor: 2, critChance: 0.1 };
  p.gear = [a, b];
  equipGear(p, a.id);
  const before = JSON.stringify(p),
    rows = compareGear(p, b);
  assert.equal(rows.find((r) => r.stat === 'maxHealth')?.difference, -20);
  assert.equal(rows.find((r) => r.stat === 'armor')?.difference, -3);
  assert.equal(rows.find((r) => r.stat === 'critChance')?.difference, 0.1);
  assert.equal(JSON.stringify(p), before);
  b.identified = false;
  assert.deepEqual(compareGear(p, b), []);
  b.identified = true;
  b.level = 10;
  assert.deepEqual(compareGear(p, b), []);
});
test('unidentified loot names its owner item without rarity spoilers on drop and collection', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Hunter');
  const original = Math.random;
  try {
    Math.random = () => 0;
    w.hitWolf(p, w.wolves[0], 1000, 10000);
  } finally {
    Math.random = original;
  }
  const drop = w.drops[0];
  assert.ok(drop.gear);
  const event = w.events.find((e) => e.lootStage === 'drop');
  assert.equal(event?.playerId, p.id);
  assert.ok(event?.text.includes(drop.gear!.name));
  assert.equal(event?.gear?.rarity, undefined);
  assert.equal(event?.loot?.[0].rarity, undefined);
  assert.ok(!event?.text.includes(drop.gear!.rarity));
  p.x = drop.x;
  p.y = drop.y;
  w.collect(p, 11000);
  assert.ok(w.events.find((e) => e.lootStage === 'pickup')?.text.includes(drop.gear!.name));
  assert.equal(p.gear?.[0].attributes, undefined);
});
test('Forest Bear survives enough level-seven basic hits for its first dodge window', () => {
  assert.equal(WOODS_MONSTERS['forest-bear'].hp, 1100);
  assert.equal(WOODS_MONSTERS['forest-bear'].damage * BOSS_ATTACK.specialDamageMultiplier, 88);
  const w = new World(MAPS['woods-boss']),
    p = createPlayer('p', 'Knight', 'woods-boss'),
    boss = w.wolves[0];
  p.level = 7;
  p.weapon = 'woods-sword';
  p.combatSkills = { Melee: { level: 6, xp: 0 } };
  p.x = boss.x - 45;
  p.y = boss.y;
  for (
    let now = 10000;
    now < 10000 + BOSS_ATTACK.firstSpecialDelay + BOSS_ATTACK.windup;
    now += 660
  )
    w.attack(p, false, now);
  assert.ok(boss.hp > 0);
});
test('class-incompatible weapon comparisons are withheld and equipment caps remain active', () => {
  const p = createPlayer('p', 'Switcher');
  p.classId = 'knight';
  p.gear = [
    createCraftedGear('woods-sword'),
    createCraftedGear('woods-bow'),
    createCraftedGear('woods-armor'),
  ];
  p.combatSkills = { Melee: { level: 11, xp: 0 }, Distance: { level: 1, xp: 0 } };
  p.gear[2].attributes = { critChance: 0.3 };
  equipGear(p, p.gear[0].id);
  equipGear(p, p.gear[2].id);
  const rows = compareGear(p, p.gear[1]);
  assert.equal(rows.length, 0);
  assert.equal(
    rows.find((r) => r.stat === 'critChance'),
    undefined,
  );
});
