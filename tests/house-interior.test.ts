import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, HOUSE_LAYOUTS } from '@ros/game-data';
import { createPlayer, World, idleInput, changeHousing } from '@ros/shared';
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
