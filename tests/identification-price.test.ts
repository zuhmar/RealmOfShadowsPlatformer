import test from 'node:test';
import assert from 'node:assert/strict';
import { createGear, identifyCost, gearSellValue, createPlayer, identifyGear } from '@ros/shared';
import { bagStacks } from '../apps/web/src/bag-items';
test('identification price scales with item level, never hidden rarity or player level', () => {
  for (const level of [1, 10, 11, 20, 21, 31, 41, 51, 61, 100])
    for (const roll of [0, 0.7, 0.95, 0.999]) {
      const g = createGear('woods-sword', level, () => roll);
      assert.equal(identifyCost(g), 75 * Math.ceil(level / 10));
      assert.equal(gearSellValue(g), 8 * Math.ceil(level / 10));
    }
  const p = createPlayer('p', 'Identifier', 'woods'),
    g = createGear('woods-sword', 1, () => 0.999);
  p.gear = [g];
  p.gold = 74;
  const before = structuredClone(p);
  assert.throws(() => identifyGear(p, g.id), /75 gold/);
  assert.deepEqual(p, before);
  p.gold = 75;
  identifyGear(p, g.id);
  assert.equal(p.gold, 0);
  assert.equal(g.rarity, 'Legendary');
  assert.equal(Object.keys(g.attributes!).length, 4);
});
test('unidentified equipment stacks without revealing its rarity through separate slots', () => {
  const p = createPlayer('p', 'Mystery');
  p.gear = [createGear('woods-sword', 1, () => 0), createGear('woods-sword', 1, () => 0.999)];
  assert.equal(bagStacks(p).length, 1);
  assert.equal(bagStacks(p)[0].quantity, 2);
  p.gear[0].identified = true;
  assert.equal(bagStacks(p).length, 2);
});
