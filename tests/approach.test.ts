import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS } from '@ros/game-data';
import {
  approachArrived,
  approachInput,
  createPlayer,
  moveActor,
  type ApproachPoint,
} from '@ros/shared';
test('click navigation reaches every playable NPC, node and portal through connected platforms and ladders', () => {
  for (const map of Object.values(MAPS)) {
    const points = [
      ...map.npcs.map((n) => ({ x: n.x, y: n.y, name: n.name })),
      ...(map.resources ?? []).map((n) => ({ x: n.x, y: n.y, name: n.id })),
      ...map.portals.map((n) => ({ x: n.x, y: n.y, name: n.label })),
    ];
    for (const point of points) {
      const platform = map.platforms.find(
        (f) => Math.abs(f.y - point.y) < 2 && point.x >= f.x && point.x <= f.x + f.width,
      );
      assert.ok(platform, `${map.id}: ${point.name} needs a platform`);
      const target: ApproachPoint = { ...point, platform: platform.id, range: 24 };
      const p = createPlayer('walker', 'Walker', map.id);
      let tick = 0;
      for (; tick < 3600 && !approachArrived(p, target); tick++) {
        const input = approachInput(p, map, target);
        assert.equal(input.attack, false);
        assert.equal(input.skill, false);
        moveActor(p, input, map, 1 / 30, 100000 + (tick * 1000) / 30);
      }
      assert.ok(
        approachArrived(p, target),
        `${map.id}: cannot reach ${point.name} (${p.x},${p.y},${p.platform})`,
      );
    }
  }
});
test('unconnected destinations are rejected instead of walking through walls or teleporting', () => {
  const map = { ...MAPS.woods, ladders: [] };
  const p = createPlayer('p', 'P', 'woods');
  assert.throws(
    () => approachInput(p, map, { x: 200, y: 100, platform: 'missing', range: 24, name: 'test' }),
    /connected route/,
  );
  assert.equal(p.x, MAPS.woods.spawn.x);
});
