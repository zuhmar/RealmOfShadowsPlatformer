import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, createGear, changeHousing, housingView, CHEST_CAPACITY } from '@ros/shared';
import { HOUSE_LAYOUTS } from '@ros/game-data';
function owner() {
  const p = createPlayer('owner', 'Owner', 'house-small');
  p.houseOwnerId = p.id;
  p.x = HOUSE_LAYOUTS.small.width / 2;
  p.y = HOUSE_LAYOUTS.small.floors[0];
  p.housing = {
    size: 'small',
    stage: 3,
    invited: ['guest'],
    furniture: [
      { id: 'chest', item: 'oak-chest', x: 0 },
      { id: 'other', item: 'oak-chest', x: 200 },
    ],
  };
  p.inventory = { fang: 20 };
  return p;
}
const move = (p: ReturnType<typeof owner>, action: string, item: string, quantity = 1) =>
  changeHousing(p, { action, id: 'chest', item, quantity });
test('chests store stacks separately, persist through serialization, and return exact quantities', () => {
  const p = owner();
  move(p, 'deposit', 'fang', 12);
  assert.equal(p.inventory.fang, 8);
  assert.equal(p.housing!.furniture[0].storage!.items.fang, 12);
  assert.equal(p.housing!.furniture[1].storage, undefined);
  const loaded = JSON.parse(JSON.stringify(p));
  move(loaded, 'withdraw', 'fang', 5);
  assert.equal(loaded.inventory.fang, 13);
  move(loaded, 'withdraw', 'fang', 7);
  assert.deepEqual(loaded.housing.furniture[0].storage.items, {});
});
test('full equipment instances survive storage including hidden rarity and attribute rolls', () => {
  const p = owner();
  const gear = createGear('crystal-sword', 11);
  gear.attributes = { critChance: 0.07, health: 31 };
  p.gear = [structuredClone(gear)];
  move(p, 'deposit', `gear:${gear.id}`);
  assert.deepEqual(p.gear, []);
  assert.deepEqual(p.housing!.furniture[0].storage!.gear, [gear]);
  move(p, 'withdraw', `gear:${gear.id}`);
  assert.deepEqual(p.gear, [gear]);
  p.equippedGear = { weapon: gear.id };
  assert.throws(() => move(p, 'deposit', `gear:${gear.id}`), /Unequip/);
});
test('storage rejects invalid transfers atomically and blocks pickup until empty', () => {
  const p = owner();
  for (const n of [0, -1, 1.5, NaN, Infinity, 21]) {
    const before = structuredClone(p);
    assert.throws(() => move(p, 'deposit', 'fang', n));
    assert.deepEqual(p, before);
  }
  assert.throws(() => move(p, 'deposit', '__proto__'));
  move(p, 'deposit', 'fang');
  assert.throws(() => changeHousing(p, { action: 'remove', id: 'chest' }), /Empty/);
  move(p, 'withdraw', 'fang');
  changeHousing(p, { action: 'remove', id: 'chest' });
  assert.equal(p.inventory['oak-chest'], 1);
});
test('storage is owner-only, proximity checked and hidden from visitors', () => {
  const p = owner();
  move(p, 'deposit', 'fang');
  const guest = createPlayer('guest', 'Guest', 'house-small');
  const view = housingView(p, guest)!;
  assert.equal(view.furniture[0].storage, undefined);
  p.houseOwnerId = 'someone-else';
  assert.throws(() => move(p, 'withdraw', 'fang'), /owner/);
  p.houseOwnerId = p.id;
  p.x += 400;
  assert.throws(() => move(p, 'withdraw', 'fang'), /closer/);
  p.x -= 400;
  p.y -= 260;
  assert.throws(() => move(p, 'withdraw', 'fang'), /closer/);
});
test('capacity counts stacks and individual gear, and existing stacks remain usable when full', () => {
  const p = owner();
  const chest = p.housing!.furniture[0];
  chest.storage = {
    items: { fang: 1 },
    gear: Array.from({ length: CHEST_CAPACITY - 1 }, () => createGear('crystal-sword', 11)),
  };
  move(p, 'deposit', 'fang', 2);
  p.inventory['oak-logs'] = 1;
  const before = structuredClone(p);
  assert.throws(() => move(p, 'deposit', 'oak-logs'), /full/);
  assert.deepEqual(p, before);
  move(p, 'withdraw', 'fang', 3);
  move(p, 'deposit', 'oak-logs');
});
