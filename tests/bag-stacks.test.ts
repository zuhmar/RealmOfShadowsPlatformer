import test from 'node:test';
import assert from 'node:assert/strict';
import { bagStacks } from '../apps/web/src/bag-items';
import { createPlayer, type Gear } from '@ros/shared';
test('bag stacks quantities and equivalent gear without merging distinct rolls or mutating instances', () => {
  const p = createPlayer('bag', 'Bag');
  p.inventory = { 'oak-logs': 1234, 'iron-ore': 25, fang: 0 };
  const base: Gear = {
    id: 'one',
    base: 'woods-helmet',
    slot: 'helmet',
    source: 'monster',
    name: 'Ironwood Helmet',
    level: 1,
    rarity: 'Rare',
    identified: true,
    attributes: { armor: 3, health: 5 },
  };
  p.gear = [
    base,
    { ...base, id: 'two', attributes: { health: 5, armor: 3 } },
    { ...base, id: 'other-roll', attributes: { armor: 4 } },
    { ...base, id: 'hidden', identified: false, attributes: undefined },
    { ...base, id: 'crafted', source: 'crafted' },
    { ...base, id: 'worn' },
  ];
  p.equippedGear = { helmet: 'worn' };
  const before = structuredClone(p),
    stacks = bagStacks(p);
  assert.equal(stacks.length, 6);
  assert.equal(stacks.find((s) => s.item === 'oak-logs')?.quantity, 1234);
  assert.equal(stacks.find((s) => s.gearIds?.includes('one'))?.quantity, 2);
  assert.ok(!stacks.some((s) => s.gearIds?.includes('worn')));
  assert.equal(stacks.flatMap((s) => s.gearIds ?? []).length, 5);
  assert.deepEqual(p, before);
  p.gear[1].identified = false;
  assert.equal(bagStacks(p).find((s) => s.gearIds?.includes('one'))?.quantity, 1);
});
