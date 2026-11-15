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

test('world clicks resolve to a platform and navigate there without attacking or interacting', async () => {
  const { movementPoint } = await import('@ros/shared');
  for (const map of Object.values(MAPS)) {
    for (const platform of map.platforms) {
      const target = movementPoint(map, platform.x + platform.width / 2, platform.y - 12);
      assert.equal(target.platform, platform.id, `${map.id}: selected platform`);
      const p = createPlayer('walker', 'Walker', map.id);
      let tick = 0;
      for (; tick < 3600 && !approachArrived(p, target); tick++) {
        const input = approachInput(p, map, target);
        assert.equal(input.attack, false);
        assert.equal(input.interact, false);
        moveActor(p, input, map, 1 / 30, 100000 + (tick * 1000) / 30);
      }
      assert.ok(approachArrived(p, target), `${map.id}: cannot walk to ${platform.id}`);
    }
  }
});

test('world destinations reject invalid coordinates and stay inside platform edges', async () => {
  const { movementPoint } = await import('@ros/shared');
  for (const [x, y] of [
    [NaN, 100],
    [100, Infinity],
    [-1, 100],
    [MAPS.woods.width + 1, 100],
    [100, -1],
    [100, MAPS.woods.height + 1],
  ]) {
    assert.throws(() => movementPoint(MAPS.woods, x, y), /inside the map/);
  }
  const edge = movementPoint(MAPS.woods, 0, 760);
  assert.equal(edge.x, 16);
  assert.equal(edge.y, 760);
  const map = {
    ...MAPS.woods,
    platforms: [{ id: 'ledge', x: 100, y: 100, width: 100, oneWay: true }],
  };
  assert.throws(() => movementPoint(map, 500, 100), /Choose a platform/);
});
