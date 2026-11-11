import test from 'node:test';
import assert from 'node:assert/strict';
import { displayStandTheme, EQUIPMENT_TIERS, ISLAND_EQUIPMENT } from '@ros/game-data';
import { decorationSize } from '@ros/shared';
test('every island equipment design and mining material uses its own island stand', () => {
  for (const g of ISLAND_EQUIPMENT) assert.equal(displayStandTheme(g.id), g.tier);
  for (const t of EQUIPMENT_TIERS) {
    for (const id of [t.ore, `${t.material}-bar`, `recipe:${t.id}-sword`])
      assert.equal(displayStandTheme(id), t.id);
  }
});
test('named loot, gathering resources and neutral village items resolve consistently', () => {
  for (const id of ['crystalwood', 'bat-wing', 'wyrm-scale', 'crystal-boss-key', 'prismatic-eel'])
    assert.equal(displayStandTheme(id), 'crystal');
  for (const [id, theme] of [
    ['bog-catfish', 'swamp'],
    ['frostpine', 'frost'],
    ['inferno-eel', 'ember'],
    ['celestial-koi', 'celestial'],
    ['nightshade', 'shadow'],
  ] as const)
    assert.equal(displayStandTheme(id), theme);
  for (const id of ['fang', 'forest-bear-trophy', 'oak-plank', 'teleport-crystal', 'unknown'])
    assert.equal(displayStandTheme(id), 'woods');
});
test('display footprint leaves room for the item and ornamented stand without changing collision width', () => {
  assert.deepEqual(decorationSize('celestial-sword', true), {
    id: 'celestial-sword',
    width: 64,
    height: 90,
  });
});
