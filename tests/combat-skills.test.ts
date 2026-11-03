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
} from '@ros/shared';

test('class weapons train the correct skill; civilians have none', () => {
  assert.deepEqual(
    [null, 'elderwood-blade', 'elderwood-dagger', 'elderwood-staff', 'elderwood-bow'].map(
      weaponTrainingSkill,
    ),
    [null, 'Melee', 'Melee', 'Magic', 'Distance'],
  );
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
    w.hitWolf(p, w.wolves[0], 1, 10000);
    const skill = weaponTrainingSkill(weapon);
    assert.equal(skill ? p.combatSkills?.[skill]?.xp : p.combatSkills, skill ? 3 : undefined);
  }
});
test('training thresholds grow, stop at level 100 and survive snapshot serialization', () => {
  const p = createPlayer('p', 'Tester');
  trainCombat(p, 'Melee', 90);
  assert.deepEqual(p.combatSkills?.Melee, { level: 3, xp: 0 });
  trainCombat(p, 'Melee', 1e9);
  assert.deepEqual(p.combatSkills?.Melee, { level: 100, xp: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(p)).combatSkills, p.combatSkills);
});
test('real hits train while misses and already dead targets do not; specials train Focus', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-blade';
  p.x = -1000;
  w.attack(p, false, 10000);
  assert.equal(Boolean(p.combatSkills), false);
  const target = w.wolves[0];
  w.hitWolf(p, target, 1, 11000, { skill: 'Melee', focus: true, critical: false });
  assert.equal(p.combatSkills?.Focus?.xp, 2);
  target.hp = 0;
  w.hitWolf(p, target, 1, 12000);
  assert.equal(p.combatSkills?.Melee?.xp, 3);
});
test('projectiles retain their original weapon training after swapping weapons', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-bow';
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
test('trained armor, dodge and block affect basic damage but cannot cancel a boss slam', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-blade';
  p.grounded = true;
  p.combatSkills = { Defense: { level: 11, xp: 0 }, Evasion: { level: 11, xp: 0 } };
  const original = Math.random;
  try {
    Math.random = () => 0.99;
    w.hitPlayer(p, 22, 10000);
    assert.equal(p.hp, 83);
    assert.equal(p.combatSkills.Defense?.xp, 2);
    assert.equal(p.combatSkills.Vitality?.xp, 2);
    Math.random = () => 0;
    w.hitPlayer(p, 22, 11000);
    assert.equal(p.hp, 83);
    p.combatSkills.Evasion = { level: 1, xp: 0 };
    w.hitPlayer(p, 22, 12000);
    assert.equal(p.hp, 72);
    p.hp = 100;
    w.hitPlayer(p, 88, 13000, 'special');
    assert.equal(p.hp, 12);
  } finally {
    Math.random = original;
  }
});
test('offensive levels and Focus produce actual critical hits and bounded attributes', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Tester');
  p.weapon = 'elderwood-blade';
  p.x = 500;
  p.y = 760;
  p.combatSkills = { Melee: { level: 51, xp: 0 }, Focus: { level: 11, xp: 0 } };
  const target = w.wolves[0];
  target.x = 530;
  target.y = 760;
  target.hp = 1000;
  const power = attackPower(p),
    attrs = playerAttributes(p),
    original = Math.random;
  try {
    Math.random = () => 0;
    w.attack(p, false, 10000);
  } finally {
    Math.random = original;
  }
  assert.equal(target.hp, 1000 - Math.round(power * attrs.critDamage));
  assert.ok(w.events.some((e) => e.critical));
  assert.equal(attrs.maxMana, 70);
  p.weapon = null;
  assert.equal(playerAttributes(p).activeSkill, null);
  assert.equal(playerAttributes(p).trainingDamage, 0);
});
