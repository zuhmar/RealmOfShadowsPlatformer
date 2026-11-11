import test from 'node:test';
import assert from 'node:assert/strict';
import { CARPENTRY_RECIPES } from '@ros/game-data';
import {
  createPlayer,
  createGear,
  changeHousing,
  decorationSelection,
  furniturePlacement,
  housingView,
} from '@ros/shared';
function owner() {
  const p = createPlayer('owner', 'Decorator', 'house-medium');
  p.houseOwnerId = p.id;
  p.housing = { size: 'medium', stage: 3, invited: [], furniture: [] };
  p.inventory = { fang: 2, 'oak-chair': 2 };
  p.gear = [];
  p.grounded = true;
  p.y = 780;
  return p;
}
test('all furniture is substantially larger while remaining inside a house storey', () => {
  for (const [id, width] of [
    ['oak-table', 64],
    ['oak-chair', 30],
    ['oak-bed', 90],
    ['oak-chest', 55],
  ] as const) {
    const r = CARPENTRY_RECIPES.find((r) => r.id === id)!;
    assert.ok(r.width >= width * 1.6);
    assert.ok(r.height < 260);
  }
});
test('loot previews are read-only; placement consumes one item and removal returns exactly one', () => {
  const p = owner(),
    before = structuredClone(p);
  const preview = furniturePlacement(p, 'display:fang', -100);
  assert.equal(preview.r.id, 'fang');
  assert.deepEqual(p, before);
  changeHousing(p, { action: 'place', id: 'display:fang', x: -100 });
  assert.equal(p.inventory.fang, 1);
  assert.equal(p.housing!.furniture[0].display, true);
  assert.throws(() => changeHousing(p, { action: 'place', id: 'display:fang', x: -100 }), /space/);
  assert.equal(p.inventory.fang, 1);
  const id = p.housing!.furniture[0].id;
  changeHousing(p, { action: 'remove', id });
  assert.equal(p.inventory.fang, 2);
  assert.equal(p.housing!.furniture.length, 0);
  assert.throws(() => changeHousing(p, { action: 'remove', id }), /Unknown/);
});
test('displayed equipment leaves the bag and returns the exact identified instance and attributes', () => {
  const p = owner(),
    g = createGear('crystal-sword', 11);
  g.identified = true;
  g.attributes = { critChance: 0.07, health: 31 };
  p.gear = [g];
  const expected = structuredClone(g);
  changeHousing(p, { action: 'place', id: 'gear:' + g.id, x: 0 });
  assert.equal(p.gear.length, 0);
  assert.deepEqual(p.housing!.furniture[0].gear, expected);
  assert.throws(
    () => changeHousing(p, { action: 'place', id: 'gear:' + g.id, x: 200 }),
    /Identify/,
  );
  changeHousing(p, { action: 'remove', id: p.housing!.furniture[0].id });
  assert.deepEqual(p.gear, [expected]);
});
test('unidentified and equipped gear, unknown items and guest changes are rejected', () => {
  const p = owner(),
    g = createGear('woods-sword', 1);
  p.gear = [g];
  assert.throws(() => decorationSelection(p, 'gear:' + g.id), /Identify/);
  g.identified = true;
  p.equippedGear = { weapon: g.id };
  assert.throws(() => decorationSelection(p, 'gear:' + g.id), /Unequip/);
  delete p.equippedGear;
  assert.throws(() => decorationSelection(p, 'display:not-real'), /Choose/);
  p.houseOwnerId = 'somebody-else';
  assert.throws(() => changeHousing(p, { action: 'place', id: 'display:fang', x: 0 }), /owner/);
});
test('invited viewers see placed displays but cannot remove them; display collisions are floor-specific', () => {
  const p = owner();
  changeHousing(p, { action: 'place', id: 'display:fang', x: 0 });
  p.y = 500;
  changeHousing(p, { action: 'place', id: 'display:fang', x: 0 });
  assert.equal(p.housing!.furniture.length, 2);
  const visitor = createPlayer('guest', 'Guest', 'house-medium');
  p.housing!.invited.push(visitor.id);
  assert.equal(housingView(p, visitor)?.furniture.length, 2);
  visitor.houseOwnerId = p.id;
  visitor.housing = structuredClone(p.housing);
  assert.throws(
    () => changeHousing(visitor, { action: 'remove', id: p.housing!.furniture[0].id }),
    /owner/,
  );
});

test('an equipped legacy accessory must be unequipped before its only copy is displayed', () => {
  const p = owner();
  p.inventory['forest-guardian-ring'] = 1;
  p.accessory = 'forest-guardian-ring';
  assert.throws(() => decorationSelection(p, 'display:forest-guardian-ring'), /Unequip/);
  assert.equal(p.inventory['forest-guardian-ring'], 1);
  p.accessory = null;
  assert.equal(decorationSelection(p, 'display:forest-guardian-ring').id, 'forest-guardian-ring');
});
