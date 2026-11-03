import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, ISLAND_AREAS, FOREST_BEAR_KEY, WOODS_MONSTERS } from '@ros/game-data';
import { World, createPlayer, usePortal } from '@ros/shared';
test('seven islands declare three monster stages and one boss; Woods route is connected both ways', () => {
  assert.equal(ISLAND_AREAS.length, 7);
  for (const island of ISLAND_AREAS) {
    assert.equal(island.areas.length, 4);
    assert.equal(island.monsters.length, 4);
    assert.ok(island.bossKey);
  }
  const ids = ['woods', 'woods-2', 'woods-3', 'woods-boss'];
  for (let i = 0; i < 3; i++) {
    assert.ok(MAPS[ids[i]].portals.some((p) => p.target === ids[i + 1]));
    assert.ok(MAPS[ids[i + 1]].portals.some((p) => p.target === ids[i]));
  }
  assert.equal(
    MAPS['woods-3'].portals.find((p) => p.target === 'woods-boss')?.key,
    FOREST_BEAR_KEY,
  );
  assert.equal(new World(MAPS['woods-2']).wolves[0].monster, 'thorn-spider');
  assert.equal(new World(MAPS['woods-3']).wolves[0].hp, WOODS_MONSTERS['wild-boar'].hp);
  assert.equal(new World(MAPS['woods-boss']).wolves.length, 1);
});
test('boss entry requires proximity and consumes one key per entry; return is free', () => {
  const p = createPlayer('p', 'Hero', 'woods-3');
  p.x = 2300;
  p.y = 760;
  const before = JSON.stringify(p);
  assert.throws(() => usePortal(p, MAPS['woods-3']), /Key/);
  assert.equal(JSON.stringify(p), before);
  p.inventory[FOREST_BEAR_KEY] = 2;
  p.x = 1000;
  assert.throws(() => usePortal(p, MAPS['woods-3']), /Walk/);
  assert.equal(p.inventory[FOREST_BEAR_KEY], 2);
  p.x = 2300;
  assert.equal(usePortal(p, MAPS['woods-3']), 'woods-boss');
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
  assert.equal(usePortal(p, MAPS['woods-boss']), 'woods-3');
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
  assert.equal(usePortal(p, MAPS['woods-3']), 'woods-boss');
  assert.equal(p.inventory[FOREST_BEAR_KEY], undefined);
  usePortal(p, MAPS['woods-boss']);
  assert.throws(() => usePortal(p, MAPS['woods-3']), /Key/);
  assert.equal(JSON.parse(JSON.stringify(p)).inventory[FOREST_BEAR_KEY], undefined);
});
test('boars award keys only on a successful roll and a kill cannot reward twice', (t) => {
  const roll = t.mock.method(Math, 'random', () => 0.19);
  const w = new World(MAPS['woods-3']),
    p = createPlayer('p', 'Hero', 'woods-3');
  w.players.set(p.id, p);
  w.hitWolf(p, w.wolves[0], 10000, 10000);
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
  w.hitWolf(p, w.wolves[0], 10000, 10000);
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
  roll.mock.mockImplementation(() => 0.2);
  w.hitWolf(p, w.wolves[1], 10000, 10000);
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
  const boss = new World(MAPS['woods-boss']);
  boss.hitWolf(p, boss.wolves[0], 10000, 10000);
  boss.hitWolf(p, boss.wolves[0], 10000, 10000);
  assert.equal(p.bossKills?.['forest-bear'], 1);
  assert.equal(p.inventory[FOREST_BEAR_KEY], 1);
});
