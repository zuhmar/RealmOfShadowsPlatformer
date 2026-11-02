import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, RULES, xpNeeded } from '@ros/game-data';
import {
  World,
  createPlayer,
  grantXp,
  moveActor,
  idleInput,
  platformRoute,
  offlineReward,
} from '@ros/shared';
test('XP crosses multiple levels and restores HP', () => {
  const p = createPlayer('p', 'Hero');
  p.hp = 1;
  const first = xpNeeded(1),
    second = xpNeeded(2);
  assert.equal(grantXp(p, first + second + 3), 2);
  assert.equal(p.level, 3);
  assert.equal(p.xp, 3);
  assert.equal(p.hp, 124);
});
test('movement clamps bounds; jumping lands; one-way platforms allow ascent and drop-through', () => {
  const p = createPlayer('p', 'Hero');
  const m = MAPS.woods;
  p.x = 600;
  p.y = 760;
  let now = 10000;
  moveActor(p, { ...idleInput(), jump: true }, m, 1 / 30, now);
  assert.ok(p.vy < 0);
  for (let i = 0; i < 90; i++) moveActor(p, idleInput(), m, 1 / 30, (now += 34));
  assert.ok(p.grounded);
  assert.equal(p.y, 760);
  p.y = 555;
  p.platform = 'moss';
  p.grounded = true;
  moveActor(p, { ...idleInput(), jump: true, down: true }, m, 1 / 30, (now += 34));
  for (let i = 0; i < 30; i++) moveActor(p, idleInput(), m, 1 / 30, (now += 34));
  assert.equal(p.platform, 'ground');
  assert.equal(p.y, 760);
  p.x = 2;
  moveActor(p, { ...idleInput(), left: true }, m, 1, now);
  assert.equal(p.x, 22);
});
test('combat enforces cooldown, range, facing and grants one reward per kill', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Hero');
  world.players.set(p.id, p);
  const wolf = world.wolves[0];
  p.x = wolf.x - 50;
  p.y = wolf.y;
  p.facing = 1;
  world.attack(p, false, 10000);
  assert.equal(wolf.hp, 34);
  world.attack(p, false, 10001);
  assert.equal(wolf.hp, 34);
  for (let t = 11000; t <= 14000; t += 1000) world.attack(p, false, t);
  assert.equal(wolf.hp, 0);
  assert.equal(p.kills, 1);
  assert.equal(p.xp, 24);
  assert.equal(world.drops.length, 1);
  world.attack(p, false, 16000);
  assert.equal(p.kills, 1);
  world.collect(p, 16001);
  world.collect(p, 16002);
  assert.equal(p.gold, 5);
  assert.equal(p.inventory.fang, 1);
  const other = world.wolves[1];
  other.hp = 48;
  p.x = other.x + 40;
  p.facing = 1;
  world.attack(p, false, 18000);
  assert.equal(other.hp, 48);
  p.x = 100;
  p.facing = 1;
  world.attack(p, false, 20000);
  assert.equal(other.hp, 48);
});
test('loot ownership prevents stealing and arbitrary weapon ids have no bonus', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Hero'),
    q = createPlayer('q', 'Other');
  p.x = world.wolves[0].x - 20;
  p.y = 760;
  p.weapon = 'forged';
  for (let t = 1000; t < 6000; t += 1000) world.attack(p, false, t);
  q.x = p.x;
  q.y = p.y;
  world.collect(q, 7000);
  assert.equal(q.gold, 0);
  world.collect(p, 7000);
  assert.equal(p.gold, 5);
});
test('navigation graph reaches canopy using actual ladders', () => {
  assert.deepEqual(platformRoute(MAPS.woods, 'ground', 'canopy'), [
    { ladder: 1, up: true },
    { ladder: 2, up: true },
  ]);
  assert.equal(platformRoute(MAPS.woods, 'ground', 'unreachable').length, 0);
});
test('AUTO hunts across platforms without teleporting; manual input cancels it', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Auto');
  world.players.set(p.id, p);
  p.auto = true;
  let climbs = false,
    lastX = p.x,
    lastY = p.y;
  const inputs = new Map();
  const visited = new Set<string>();
  for (let tick = 0; tick < 30 * 100; tick++) {
    world.step(1 / 30, 10000 + (tick * 1000) / 30, inputs);
    assert.ok(Math.abs(p.x - lastX) <= RULES.speed / 30 + 1);
    assert.ok(Math.abs(p.y - lastY) < 25);
    if (p.y < 600) climbs = true;
    visited.add(p.platform);
    lastX = p.x;
    lastY = p.y;
  }
  assert.ok(p.kills >= 5, `kills: ${p.kills}`);
  assert.ok(climbs, 'Auto must use a ladder to hunt upper platforms');
  for (const id of ['moss', 'ridge', 'canopy'])
    assert.ok(visited.has(id), `AUTO did not reach ${id}`);
  assert.ok(p.gold > 0);
  world.step(1 / 30, 120000, new Map([[p.id, { ...idleInput(), left: true }]]));
  assert.equal(p.auto, false);
});
test('offline rewards use whole minutes and an eight-hour cap', () => {
  assert.deepEqual(offlineReward(100000, 0), { seconds: 0, xp: 0, gold: 0 });
  const cap = offlineReward(0, 20 * 3600000);
  assert.equal(cap.seconds, 8 * 3600);
  assert.equal(cap.xp, 480 * 8);
  assert.equal(cap.gold, 480 * 2);
  assert.equal(offlineReward(0, 59000).xp, 0);
});
test('village is safe and has a valid two-way portal', () => {
  const world = new World(MAPS.village);
  assert.equal(world.wolves.length, 0);
  assert.equal(MAPS[MAPS.village.portals[0].target].portals[0].target, 'village');
});
