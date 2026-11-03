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
    assert.equal(
      p.quests['mira-wolves'].progress,
      Math.min(p.kills, QUESTS['mira-wolves'].target.count),
    );
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

test('Cleave hits the nearest three enemies in front and respects vertical separation', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Knight');
  p.x = 500;
  p.y = 760;
  p.weapon = 'elderwood-blade';
  w.players.set(p.id, p);
  const template = w.wolves[0];
  w.wolves = [20, 60, 100, 115, -35].map((dx, i) => ({
    ...template,
    id: `target-${i}`,
    x: 500 + dx,
    y: 760,
    hp: 200,
  }));
  w.wolves.push({ ...template, id: 'upper', x: 530, y: 650, hp: 200 });
  w.attack(p, true, 10000);
  assert.deepEqual(
    w.wolves.map((t) => t.hp),
    [156, 156, 156, 200, 200, 200],
  );
  assert.equal(p.mp, 38);
  assert.equal(p.lastSkill, 10000);
});

test('Power Shot pierces three targets in travel order with no repeat hits or splash', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Archer');
  p.x = 100;
  p.y = 760;
  p.weapon = 'elderwood-bow';
  w.players.set(p.id, p);
  const template = w.wolves[0];
  w.wolves = [200, 310, 450, 490].map((x, i) => ({
    ...template,
    id: `target-${i}`,
    x,
    y: 760,
    hp: 200,
  }));
  w.wolves.push({ ...template, id: 'upper', x: 210, y: 700, hp: 200 });
  w.attack(p, true, 10000);
  assert.equal(w.projectiles[0].range, 420);
  for (let i = 0; i < 50; i++) w.stepProjectiles(0.02, 10020 + i * 20);
  assert.deepEqual(
    w.wolves.map((t) => t.hp),
    [160, 160, 160, 200, 200],
  );
  assert.equal(w.projectiles.length, 0);
});

test('Arcane Burst explodes on impact and catches nearby enemies outside its flight path', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Mage');
  p.x = 100;
  p.y = 760;
  p.weapon = 'elderwood-staff';
  w.players.set(p.id, p);
  const template = w.wolves[0];
  w.wolves = [
    { x: 180, y: 760 },
    { x: 250, y: 720 },
    { x: 400, y: 760 },
    { x: 190, y: 650 },
  ].map((pos, i) => ({ ...template, ...pos, id: `target-${i}`, hp: 200 }));
  w.attack(p, true, 10000);
  assert.deepEqual(
    w.wolves.map((t) => t.hp),
    [200, 200, 200, 200],
  );
  w.stepProjectiles(0.3, 10300);
  assert.deepEqual(
    w.wolves.map((t) => t.hp),
    [156, 156, 200, 200],
  );
  assert.ok(
    w.events.some((e) => e.type === 'skill' && e.skill === 'staff' && e.phase === 'impact'),
  );
});

test('Flurry deals three timed hits to one target and cancels remaining hits after swapping weapons', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Rogue');
  p.x = 630;
  p.y = 760;
  p.weapon = 'elderwood-dagger';
  w.players.set(p.id, p);
  w.wolves = [{ ...w.wolves[0], x: 660, hp: 200 }];
  w.attack(p, true, 10000);
  assert.equal(w.wolves[0].hp, 182);
  w.stepFlurry(10100);
  assert.equal(w.wolves[0].hp, 182);
  w.stepFlurry(10110);
  assert.equal(w.wolves[0].hp, 164);
  w.stepFlurry(10220);
  assert.equal(w.wolves[0].hp, 146);
  assert.equal(p.mp, 38);
  w.attack(p, true, 16000);
  assert.equal(w.flurry.length, 2);
  p.weapon = 'elderwood-blade';
  w.stepFlurry(16300);
  assert.equal(w.wolves[0].hp, 128);
  assert.equal(w.flurry.length, 0);
});

test('Flurry cannot duplicate kill rewards; unavailable skills do not consume mana or emit cast effects', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Rogue');
  p.x = 630;
  p.y = 760;
  p.weapon = 'elderwood-dagger';
  w.players.set(p.id, p);
  w.wolves = [{ ...w.wolves[0], x: 660, hp: 20 }];
  w.attack(p, true, 10000);
  w.stepFlurry(10300);
  assert.equal(p.kills, 1);
  assert.equal(w.drops.length, 1);
  assert.equal(w.flurry.length, 0);
  const events = w.events.length;
  w.attack(p, true, 11000);
  assert.equal(p.mp, 38);
  assert.equal(w.events.length, events);
  p.mp = 0;
  w.attack(p, true, 16000);
  assert.equal(w.events.length, events);
  assert.equal(p.lastSkill, 10000);
});
