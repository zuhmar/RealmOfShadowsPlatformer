import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '@ros/game-data';
import { createPlayer, moveActor, idleInput, platformRoute, usePortal } from '@ros/shared';
import { WOODS_AREA_PROPS } from '../apps/web/src/woods-layout';
test('each hunting area has distinct geometry and every spawn stands on a reachable platform', () => {
  const signatures = new Set<string>();
  for (const id of ['woods', 'woods-2', 'woods-3', 'woods-boss']) {
    const map = MAPS[id];
    const signature = JSON.stringify(map.platforms.map((p) => [p.x, p.y, p.width]));
    assert.ok(!signatures.has(signature));
    signatures.add(signature);
    for (const spawn of map.spawns) {
      const p = map.platforms.find((p) => p.id === spawn.platform)!;
      assert.equal(spawn.y, p.y);
      assert.ok(spawn.x >= p.x && spawn.x <= p.x + p.width);
      if (p.id !== 'ground') assert.ok(platformRoute(map, 'ground', p.id).length);
    }
    for (const ladder of map.ladders) {
      for (const [platform, y] of [
        [ladder.from, ladder.bottom],
        [ladder.to, ladder.top],
      ] as const) {
        const p = map.platforms.find((p) => p.id === platform)!;
        assert.equal(p.y, y);
        assert.ok(ladder.x >= p.x && ladder.x <= p.x + p.width);
      }
      const p = createPlayer('p', 'Climber', id);
      Object.assign(p, { x: ladder.x, y: ladder.bottom, platform: ladder.from, grounded: true });
      for (let n = 0; n < 300 && !(p.platform === ladder.to && p.grounded); n++)
        moveActor(p, { ...idleInput(), up: true }, map, 0.02, n * 20);
      assert.equal(p.y, ladder.top);
      assert.equal(p.platform, ladder.to);
    }
    for (const prop of WOODS_AREA_PROPS[id] ?? []) {
      const p = map.platforms.find((p) => p.id === prop.platform)!;
      assert.ok(prop.offset >= 0 && prop.offset <= p.width);
    }
  }
});
test('bear entrance and guardian prop sit on the highest platform; ground cannot enter or spend a key', () => {
  const map = MAPS['woods-3'],
    gate = map.portals.find((p) => p.key)!,
    prop = map.bossEntrance!,
    platform = map.platforms.find((p) => p.id === prop.platform)!;
  assert.equal(platform.y, Math.min(...map.platforms.map((p) => p.y)));
  assert.equal(gate.y, platform.y);
  assert.equal(prop.y, platform.y);
  assert.equal(prop.x, gate.x);
  assert.ok(gate.x >= platform.x && gate.x <= platform.x + platform.width);
  assert.ok(prop.x >= platform.x && prop.x <= platform.x + platform.width);
  assert.ok(platformRoute(map, 'ground', platform.id).length);
  const p = createPlayer('p', 'Hero', map.id);
  p.x = gate.x;
  p.y = 760;
  p.inventory['forest-bear-key'] = 1;
  // Ground-level interaction reaches the Crystal route, never the bear gate above.
  assert.throws(() => usePortal(p, map), /Forest Bear/);
  assert.equal(p.mapId, map.id);
  assert.equal(p.inventory['forest-bear-key'], 1);
});
