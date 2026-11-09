import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, HOUSE_LAYOUTS } from '@ros/game-data';
import {
  createPlayer,
  World,
  idleInput,
  changeHousing,
  furniturePlacement,
  moveActor,
  constrainHouseActor,
} from '@ros/shared';
test('bigger houses have wider rooms, more connected floors and more furniture capacity', () => {
  const sizes = ['small', 'medium', 'large'] as const;
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i],
      m = MAPS[`house-${size}`],
      l = HOUSE_LAYOUTS[size];
    assert.equal(m.platforms.length, i + 1);
    assert.equal(m.ladders.length, i);
    assert.equal(m.spawns.length, 0);
    if (i) {
      assert.ok(l.width > HOUSE_LAYOUTS[sizes[i - 1]].width);
      assert.ok(l.capacity > HOUSE_LAYOUTS[sizes[i - 1]].capacity);
    }
    for (const ladder of m.ladders) {
      assert.ok(m.platforms.some((p) => p.id === ladder.from && p.y === ladder.bottom));
      assert.ok(m.platforms.some((p) => p.id === ladder.to && p.y === ladder.top));
    }
  }
  const m = MAPS['house-medium'],
    w = new World(m),
    p = createPlayer('p', 'Climber', m.id);
  p.x = m.ladders[0].x;
  p.y = m.ladders[0].bottom;
  w.players.set(p.id, p);
  const input = { ...idleInput(), up: true };
  for (let i = 0; i < 90; i++) w.step(1 / 30, i * 34, new Map([[p.id, input]]));
  assert.ok(p.y <= m.ladders[0].top + 5);
});
test('only the owner places furniture inside, with floor-specific collision and preserved legacy furniture', () => {
  const p = createPlayer('p', 'Owner', 'house-medium');
  p.houseOwnerId = p.id;
  p.housing = { size: 'medium', stage: 3, invited: [], furniture: [] };
  p.inventory = { 'oak-chair': 4 };
  changeHousing(p, { action: 'place', id: 'oak-chair', x: 0 });
  assert.equal(p.housing.furniture[0].floor, 0);
  assert.throws(() => changeHousing(p, { action: 'place', id: 'oak-chair', x: 0 }), /space/);
  p.y = 500;
  p.platform = 'floor-1';
  changeHousing(p, { action: 'place', id: 'oak-chair', x: 0 });
  assert.equal(p.housing.furniture[1].floor, 1);
  assert.equal(p.inventory['oak-chair'], 2);
  p.houseOwnerId = 'other';
  assert.throws(() => changeHousing(p, { action: 'place', id: 'oak-chair', x: 100 }), /owner/);
  p.houseOwnerId = p.id;
  p.mapId = 'village';
  p.x = 900;
  p.y = 240;
  assert.throws(
    () => changeHousing(p, { action: 'place', id: 'oak-chair', x: 100 }),
    /Enter your house/,
  );
});

test('house movement remains inside visible walls on every floor and recovers invalid saved positions', () => {
  for (const size of ['small', 'medium', 'large']) {
    const map = MAPS[`house-${size}`],
      b = map.interiorBounds!;
    for (const floor of map.platforms) {
      const p = createPlayer('p', 'Edges', map.id);
      p.y = floor.y;
      p.platform = floor.id;
      p.grounded = true;
      for (let i = 0; i < 700; i++)
        moveActor(p, { ...idleInput(), right: true }, map, 1 / 30, i * 34);
      assert.equal(p.x, b.right - 28);
      assert.equal(p.vx, 0);
      assert.equal(p.y, floor.y);
      for (let i = 0; i < 700; i++)
        moveActor(p, { ...idleInput(), left: true }, map, 1 / 30, i * 34);
      assert.equal(p.x, b.left + 28);
      assert.equal(p.vx, 0);
      assert.equal(p.y, floor.y);
      p.y = b.top + 81;
      p.vy = -900;
      p.grounded = false;
      moveActor(p, idleInput(), map, 1 / 30, 100);
      assert.ok(p.y >= b.top + 80);
      assert.ok(p.vy >= 0);
      p.x = -500;
      p.y = b.bottom + 500;
      constrainHouseActor(p, map);
      assert.equal(p.x, b.left + 28);
      assert.equal(p.y, b.bottom);
      assert.equal(p.platform, 'ground');
    }
  }
});

test('furniture previews validate the same placement as the server without consuming inventory', () => {
  const p = createPlayer('preview', 'Decorator', 'house-medium');
  p.houseOwnerId = p.id;
  p.housing = { size: 'medium', stage: 3, invited: [], furniture: [] };
  p.inventory = { 'oak-table': 2 };
  p.y = 780;
  p.grounded = true;
  const original = structuredClone(p);
  const target = furniturePlacement(p, 'oak-table', 100);
  assert.equal(target.floor, 0);
  assert.equal(target.x, 100);
  assert.deepEqual(p, original);
  changeHousing(p, { action: 'place', id: 'oak-table', x: target.x });
  assert.equal(p.inventory['oak-table'], 1);
  assert.throws(() => furniturePlacement(p, 'oak-table', 100), /space/);
  assert.throws(() => furniturePlacement(p, 'oak-table', 10000), /within/);
  p.y = 500;
  assert.equal(furniturePlacement(p, 'oak-table', 100).floor, 1);
  p.grounded = false;
  assert.throws(() => furniturePlacement(p, 'oak-table', 200), /Stand/);
});
