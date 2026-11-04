import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '@ros/game-data';
import { World, createPlayer } from '@ros/shared';
test('regular Woods hunting areas have ten unique valid spawns; village and boss counts stay zero and one', () => {
  for (const id of ['woods', 'woods-2', 'woods-3']) {
    const map = MAPS[id],
      world = new World(map);
    assert.equal(map.spawns.length, 10);
    assert.equal(world.wolves.length, 10);
    assert.equal(new Set(world.wolves.map((w) => w.id)).size, 10);
    assert.equal(new Set(map.spawns.map((s) => `${s.x},${s.y}`)).size, 10);
    for (const spawn of map.spawns) {
      const floor = map.platforms.find((p) => p.id === spawn.platform)!;
      assert.ok(floor);
      assert.equal(spawn.y, floor.y);
      assert.ok(spawn.x >= floor.x + 35 && spawn.x <= floor.x + floor.width - 35);
    }
  }
  assert.equal(new World(MAPS.village).wolves.length, 0);
  assert.equal(new World(MAPS['woods-boss']).wolves.length, 1);
});
test('collection sends sprite identifiers and quantities without changing ownership or rewards', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Hunter'),
    other = createPlayer('other', 'Other');
  const original = Math.random;
  try {
    Math.random = () => 0;
    w.hitWolf(p, w.wolves[0], 1000, 10000);
  } finally {
    Math.random = original;
  }
  const d = w.drops[0];
  p.x = other.x = d.x;
  p.y = other.y = d.y;
  w.collect(other, 11000);
  assert.equal(other.gold, 0);
  w.collect(p, 11000);
  const normal = w.events.find((e) => e.lootGold === d.gold);
  assert.ok(normal?.loot?.some((i) => i.item === 'wolf-pelt'));
  assert.ok(normal?.loot?.some((i) => i.item === 'fang'));
  assert.equal(p.inventory.fang, 1);
  assert.equal(p.inventory['wolf-pelt'], 1);
  assert.equal(p.gold, d.gold);
  const gear = w.events.find((e) => e.lootStage === 'pickup');
  assert.equal(gear?.loot?.[0].item, d.gear!.base);
  assert.equal(gear?.loot?.[0].rarity, d.gear!.rarity);
});
