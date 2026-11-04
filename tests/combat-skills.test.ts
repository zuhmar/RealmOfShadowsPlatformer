import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '@ros/game-data';
import {
  World,
  createPlayer,
  weaponTrainingSkill,
  trainCombat,
  playerAttributes,
  attackPower,
  createGear,
  identifyGear,
  equipGear,
  identifyCost,
} from '@ros/shared';

test('class mapping and training only increase base damage, never attributes', () => {
  assert.deepEqual(
    [null, 'elderwood-blade', 'elderwood-dagger', 'elderwood-staff', 'elderwood-bow'].map(
      weaponTrainingSkill,
    ),
    [null, 'Melee', 'Melee', 'Magic', 'Distance'],
  );
  const p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-blade';
  p.classId = 'knight';
  const before = playerAttributes(p),
    power = attackPower(p);
  for (const skill of ['Melee', 'Defense', 'Evasion', 'Vitality', 'Focus'] as const)
    trainCombat(p, skill, 1e9);
  const after = playerAttributes(p);
  assert.deepEqual({ ...after, trainingDamage: 0 }, { ...before, trainingDamage: 0 });
  assert.equal(attackPower(p), power + 198);
  p.weapon = 'elderwood-staff';
  assert.equal(playerAttributes(p).trainingDamage, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).combatSkills, p.combatSkills);
});
test('hits train the correct skill; civilians, misses, dead targets do not; Focus is retired', () => {
  for (const weapon of [
    null,
    'elderwood-blade',
    'elderwood-dagger',
    'elderwood-staff',
    'elderwood-bow',
  ]) {
    const w = new World(MAPS.woods),
      p = createPlayer('p', 'Tester');
    p.weapon = weapon;
    p.classId =
      weapon === 'elderwood-blade'
        ? 'knight'
        : weapon === 'elderwood-dagger'
          ? 'rogue'
          : weapon === 'elderwood-bow'
            ? 'archer'
            : weapon === 'elderwood-staff'
              ? 'mage'
              : undefined;
    p.x = -1000;
    w.attack(p, false, 10000);
    assert.equal(Boolean(p.combatSkills), false);
    w.hitWolf(p, w.wolves[0], 1, 11000, {
      skill: weaponTrainingSkill(weapon),
      focus: true,
      critical: false,
    });
    const skill = weaponTrainingSkill(weapon);
    assert.equal(skill ? p.combatSkills?.[skill]?.xp : p.combatSkills, skill ? 3 : undefined);
    assert.equal(p.combatSkills?.Focus, undefined);
    w.wolves[0].hp = 0;
    w.hitWolf(p, w.wolves[0], 1, 12000);
    assert.equal(skill ? p.combatSkills?.[skill]?.xp : p.combatSkills, skill ? 3 : undefined);
  }
});
test('projectiles retain originating training after a weapon swap', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-bow';
  p.classId = 'archer';
  p.x = 480;
  p.y = 760;
  w.players.set(p.id, p);
  w.wolves = w.wolves.slice(0, 1);
  w.attack(p, false, 10000);
  p.weapon = 'elderwood-staff';
  for (let t = 0; t < 20; t++) w.stepProjectiles(0.05, 10050 + t * 50);
  assert.equal(p.combatSkills?.Distance?.xp, 3);
  assert.equal(p.combatSkills?.Magic, undefined);
});
test('rarities identify once into one through four distinct attributes and charge once', () => {
  for (const [roll, count, cost] of [
    [0, 1, 25],
    [0.7, 2, 75],
    [0.95, 3, 200],
    [0.999, 4, 500],
  ]) {
    const p = createPlayer('p', 'Tester'),
      g = createGear('elderwood-blade', 1, () => roll);
    p.gear = [g];
    p.gold = 1000;
    assert.equal(g.attributes, undefined);
    assert.equal(identifyCost(g), cost);
    assert.throws(() => equipGear(p, g.id));
    identifyGear(p, g.id, () => 0.1);
    assert.equal(Object.keys(g.attributes!).length, count);
    assert.equal(p.gold, 1000 - cost);
    const snapshot = JSON.stringify(p);
    assert.throws(() => identifyGear(p, g.id));
    assert.equal(JSON.stringify(p), snapshot);
    assert.throws(() => identifyGear(p, 'unowned'));
  }
});
test('insufficient gold cannot reveal attributes; level requirements prevent equipping', () => {
  const p = createPlayer('p', 'Tester'),
    g = createGear('woods-armor', 10, () => 0);
  p.gear = [g];
  p.gold = 0;
  assert.throws(() => identifyGear(p, g.id));
  assert.equal(g.identified, false);
  p.gold = 1000;
  identifyGear(p, g.id);
  assert.throws(() => equipGear(p, g.id));
});
test('only owned identified equipped gear grants stats; weapon and armor stack, unequip removes stats', () => {
  const p = createPlayer('p', 'Tester'),
    weapon = createGear('elderwood-blade', 1, () => 0),
    armor = createGear('woods-armor', 1, () => 0);
  weapon.identified = armor.identified = true;
  weapon.attributes = { critChance: 0.1, critDamage: 0.5 };
  armor.attributes = { critChance: 0.05, health: 40, armor: 5 };
  p.gear = [weapon, armor];
  assert.equal(playerAttributes(p).critChance, 0);
  equipGear(p, weapon.id);
  equipGear(p, armor.id);
  assert.ok(Math.abs(playerAttributes(p).critChance - 0.15) < 1e-8);
  assert.equal(playerAttributes(p).maxHealth, 140);
  p.weapon = 'elderwood-staff';
  assert.equal(playerAttributes(p).critChance, 0.05);
  equipGear(p, armor.id);
  assert.equal(playerAttributes(p).maxHealth, 100);
  p.equippedGear!.armor = 'unowned';
  assert.equal(playerAttributes(p).armor, 0);
});
test('gear crits and defenses affect basic combat but cannot cancel a boss slam', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester'),
    g = createGear('woods-armor', 1, () => 0);
  g.identified = true;
  g.attributes = { armor: 5, critChance: 0.2, critDamage: 0.5, dodgeChance: 0.1, blockChance: 0.1 };
  p.gear = [g];
  equipGear(p, g.id);
  p.weapon = 'elderwood-blade';
  p.x = 500;
  p.y = 760;
  p.grounded = true;
  const target = w.wolves[0];
  target.x = 530;
  target.y = 760;
  target.hp = 1000;
  const power = attackPower(p),
    original = Math.random;
  try {
    Math.random = () => 0;
    w.attack(p, false, 10000);
    assert.equal(target.hp, 1000 - power * 2);
    w.hitPlayer(p, 22, 10000);
    assert.equal(p.hp, 100);
    Math.random = () => 0.99;
    w.hitPlayer(p, 22, 11000);
    assert.equal(p.hp, 83);
    g.attributes.dodgeChance = 0;
    Math.random = () => 0;
    w.hitPlayer(p, 22, 12000);
    assert.equal(p.hp, 72);
    p.hp = 100;
    w.hitPlayer(p, 88, 13000, 'special');
    assert.equal(p.hp, 12);
  } finally {
    Math.random = original;
  }
});
test('hunting gear drops are owner-only loot and persist as separate instances', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester'),
    other = createPlayer('other', 'Other');
  const original = Math.random;
  try {
    Math.random = () => 0;
    w.hitWolf(p, w.wolves[0], 1000, 10000);
  } finally {
    Math.random = original;
  }
  p.x = other.x = w.wolves[0].x;
  p.y = other.y = w.wolves[0].y;
  w.collect(other, 11000);
  assert.equal(other.gear, undefined);
  w.collect(p, 11000);
  assert.equal(p.gear?.length, 1);
  assert.equal(p.gear?.[0].identified, false);
  assert.deepEqual(JSON.parse(JSON.stringify(p)).gear, p.gear);
});
