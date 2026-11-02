import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, QUESTS, weaponProfile, weaponBonus } from '@ros/game-data';
import { World, createPlayer, idleInput, needsTrialWeapons, autoInput } from '@ros/shared';
const ids = ['elderwood-blade', 'elderwood-bow', 'elderwood-staff', 'elderwood-dagger'];
test('first quest grants one weapon for each of the four class paths', () => {
  assert.deepEqual(
    QUESTS['mira-wolves'].reward.items.map((i) => i.itemId),
    ids,
  );
  assert.deepEqual(
    ids.map((id) => weaponProfile(id).className),
    ['Knight', 'Archer', 'Mage', 'Rogue'],
  );
  assert.equal(new Set(ids.map((id) => weaponProfile(id).cooldown)).size, 4);
});
test('ranged damage is delayed until a server projectile actually hits and respects range/facing', () => {
  for (const id of ['elderwood-bow', 'elderwood-staff']) {
    const world = new World(MAPS.woods);
    world.wolves = world.wolves.slice(0, 1);
    const p = createPlayer('p', 'Archer');
    p.weapon = id;
    p.x = 480;
    p.y = 760;
    world.players.set(p.id, p);
    world.attack(p, false, 10000);
    assert.equal(world.wolves[0].hp, 48);
    assert.equal(world.projectiles.length, 1);
    world.stepProjectiles(0.05, 10050);
    assert.equal(world.wolves[0].hp, 48);
    for (let t = 0; t < 20; t++) world.stepProjectiles(0.05, 10100 + t * 50);
    assert.equal(world.wolves[0].hp, 48 - 14 - weaponBonus(id));
    assert.equal(world.projectiles.length, 0);
    world.wolves[0].hp = 48;
    p.x = world.wolves[0].x - weaponProfile(id).range - 100;
    world.attack(p, false, 20000);
    for (let t = 0; t < 30; t++) world.stepProjectiles(0.05, 20100 + t * 50);
    assert.equal(world.wolves[0].hp, 48);
    p.x = 480;
    p.facing = -1;
    world.attack(p, false, 30000);
    for (let t = 0; t < 30; t++) world.stepProjectiles(0.05, 30100 + t * 50);
    assert.equal(world.wolves[0].hp, 48);
  }
});
test('swapping to a dagger cannot bypass the previous weapon cooldown', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Hero');
  p.weapon = 'elderwood-staff';
  p.x = 630;
  w.players.set(p.id, p);
  w.attack(p, false, 10000);
  p.weapon = 'elderwood-dagger';
  w.attack(p, false, 10400);
  assert.equal(p.lastAttack, 10000);
  w.attack(p, false, 11000);
  assert.equal(p.lastAttack, 11000);
});
test('every trial weapon hunts across platforms and retrieves owner loot in AUTO', () => {
  for (const id of ids) {
    const w = new World(MAPS.woods),
      p = createPlayer(id, 'Auto');
    p.weapon = id;
    p.auto = true;
    p.quests = { 'mira-wolves': { progress: 0, claimed: false } };
    w.players.set(p.id, p);
    for (let t = 0; t < 30 * 70; t++) w.step(1 / 30, 10000 + (t * 1000) / 30, new Map());
    assert.ok(p.kills >= 5, `${id} only defeated ${p.kills}`);
    assert.ok(p.gold >= 25, `${id} did not retrieve loot`);
    assert.equal(p.quests['mira-wolves'].progress, 5);
  }
});
test('projectiles cannot duplicate a kill or award rewards after their owner leaves', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Mage');
  p.weapon = 'elderwood-staff';
  p.x = 630;
  w.players.set(p.id, p);
  w.wolves[0].hp = 1;
  w.attack(p, false, 10000);
  w.projectiles.push({ ...w.projectiles[0], id: 'duplicate' });
  w.stepProjectiles(0.1, 10100);
  assert.equal(p.kills, 1);
  assert.equal(p.xp, 24);
  assert.equal(w.drops.length, 1);
  w.attack(p, false, 12000);
  w.players.delete(p.id);
  w.stepProjectiles(0.5, 12500);
  assert.equal(w.projectiles.length, 0);
});
test('legacy completed quests advertise a one-time missing weapon kit', () => {
  const p = createPlayer('p', 'Legacy');
  assert.equal(needsTrialWeapons(p), false);
  p.quests = { 'mira-wolves': { progress: 5, claimed: true } };
  assert.equal(needsTrialWeapons(p), true);
  p.quests['mira-wolves'].trialKitClaimed = true;
  assert.equal(needsTrialWeapons(p), false);
});

test('AUTO continues basic attacks when there is not enough mana for the weapon skill', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Mage');
  p.weapon = 'elderwood-staff';
  p.x = 630;
  p.mp = 0;
  const input = autoInput(p, w.wolves, MAPS.woods, 10000);
  assert.equal(input.attack, true);
  assert.equal(input.skill, false);
});
