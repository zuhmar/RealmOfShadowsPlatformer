import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, TELEPORT_CRYSTAL, WORLD_MAP_ISLANDS } from '@ros/game-data';
import {
  createPlayer,
  initializeTeleport,
  useTeleport,
  usePortal,
  buyTeleportCrystal,
  World,
} from '@ros/shared';
test('starter crystals grant once; current map and proven quest history become visited', () => {
  const p = createPlayer('p', 'Hero', 'woods-3');
  p.quests = { 'mira-spiders': { progress: 1, claimed: false } };
  assert.equal(initializeTeleport(p), true);
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 3);
  assert.deepEqual(p.visitedAreas, ['village', 'woods-3', 'woods-2']);
  assert.equal(initializeTeleport(p), false);
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 3);
  const saved = JSON.parse(JSON.stringify(p));
  assert.equal(initializeTeleport(saved), false);
  assert.equal(saved.inventory[TELEPORT_CRYSTAL], 3);
  assert.equal(WORLD_MAP_ISLANDS.length, 7);
  assert.ok(WORLD_MAP_ISLANDS.every((i) => i.areas.length === 4));
});
test('valid teleport consumes exactly one crystal, resets movement and keeps combat health', () => {
  const p = createPlayer('p', 'Hero', 'village');
  initializeTeleport(p);
  p.visitedAreas!.push('woods-2');
  p.hp = 45;
  p.auto = true;
  p.vx = 20;
  p.climbing = true;
  p.targetId = 'wolf';
  p.gathering = { nodeId: 'fake', startedAt: 1, finishAt: 2, toolId: 'iron-pickaxe' };
  assert.equal(useTeleport(p, 'woods-2'), 'woods-2');
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 2);
  assert.equal(p.hp, 45);
  assert.equal(p.x, MAPS['woods-2'].spawn.x);
  assert.equal(p.y, MAPS['woods-2'].spawn.y);
  assert.equal(p.auto, false);
  assert.equal(p.climbing, false);
  assert.equal(p.targetId, null);
  assert.equal(p.gathering, undefined);
  assert.equal(p.vx, 0);
  const before = JSON.stringify(p);
  assert.throws(() => useTeleport(p, 'woods-2'), /here/);
  assert.equal(JSON.stringify(p), before);
});
test('unvisited, unbuilt, forged and unaffordable destinations never charge or move', () => {
  const p = createPlayer('p', 'Hero', 'village');
  initializeTeleport(p);
  for (const id of ['woods-2', 'crystal', '__proto__', 'not-a-map']) {
    const before = JSON.stringify(p);
    assert.throws(() => useTeleport(p, id));
    assert.equal(JSON.stringify(p), before);
  }
  p.visitedAreas!.push('woods');
  delete p.inventory[TELEPORT_CRYSTAL];
  const before = JSON.stringify(p);
  assert.throws(() => useTeleport(p, 'woods'), /Crystal/);
  assert.equal(JSON.stringify(p), before);
});
test('boss teleports require a previous visit and a fresh key for every entry', () => {
  const p = createPlayer('p', 'Hero', 'village');
  initializeTeleport(p);
  p.visitedAreas!.push('woods-boss');
  const before = JSON.stringify(p);
  assert.throws(() => useTeleport(p, 'woods-boss'), /key/);
  assert.equal(JSON.stringify(p), before);
  p.inventory['forest-bear-key'] = 1;
  useTeleport(p, 'woods-boss');
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 2);
  assert.equal(p.inventory['forest-bear-key'], undefined);
  useTeleport(p, 'village');
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 1);
  assert.throws(() => useTeleport(p, 'woods-boss'), /key/);
});
test('normal portal discovery stays free and records the unlocked destination', () => {
  const p = createPlayer('p', 'Hero', 'village'),
    gate = MAPS.village.portals[0];
  p.x = gate.x;
  p.y = gate.y;
  assert.equal(usePortal(p, MAPS.village), 'woods');
  assert.deepEqual(p.visitedAreas, ['village', 'woods']);
  assert.equal(p.inventory[TELEPORT_CRYSTAL], undefined);
});
test('Bram crystal purchases use gold and reject insufficient funds', () => {
  const p = createPlayer('p', 'Hero', 'village');
  p.gold = 50;
  buyTeleportCrystal(p);
  assert.equal(p.gold, 25);
  assert.equal(p.inventory[TELEPORT_CRYSTAL], 1);
  buyTeleportCrystal(p);
  assert.equal(p.gold, 0);
  const before = JSON.stringify(p);
  assert.throws(() => buyTeleportCrystal(p), /25/);
  assert.equal(JSON.stringify(p), before);
});
test('monsters drop crystals at the configured threshold, through owner-only collection', () => {
  for (const roll of [0.049, 0.05]) {
    const w = new World(MAPS.woods),
      p = createPlayer('p', 'Hero'),
      other = createPlayer('other', 'Other');
    const original = Math.random;
    try {
      Math.random = () => roll;
      w.hitWolf(p, w.wolves[0], 1000, 10000);
    } finally {
      Math.random = original;
    }
    const d = w.drops[0];
    other.x = p.x = d.x;
    other.y = p.y = d.y;
    w.collect(other, 10001);
    assert.equal(other.inventory[TELEPORT_CRYSTAL], undefined);
    w.collect(p, 10001);
    assert.equal(p.inventory[TELEPORT_CRYSTAL], roll < 0.05 ? 1 : undefined);
  }
});
