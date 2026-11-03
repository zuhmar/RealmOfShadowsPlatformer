import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_TIERS,
  ISLAND_EQUIPMENT,
  FORGE_RECIPES,
  weaponKind,
  weaponBonus,
} from '@ros/game-data';
import {
  createPlayer,
  createCraftedGear,
  islandGearDrop,
  identifyGear,
  equipGear,
  playerAttributes,
  forgeAction,
} from '@ros/shared';

test('all seven islands have four class weapons and four separately equippable armor parts', () => {
  assert.equal(ISLAND_EQUIPMENT.length, 56);
  assert.equal(new Set(ISLAND_EQUIPMENT.map((g) => g.id)).size, 56);
  for (const tier of EQUIPMENT_TIERS) {
    const items = ISLAND_EQUIPMENT.filter((g) => g.tier === tier.id);
    assert.deepEqual(
      items.map((g) => g.slot),
      ['weapon', 'weapon', 'weapon', 'weapon', 'helmet', 'armor', 'legs', 'boots'],
    );
    assert.deepEqual(
      items.slice(0, 4).map((g) => weaponKind(g.id)),
      ['sword', 'bow', 'staff', 'dagger'],
    );
    for (const item of items) assert.ok(FORGE_RECIPES.find((r) => r.id === item.id));
    for (let frame = 0; frame < 8; frame++) {
      let call = 0;
      const drop = islandGearDrop(tier.island, tier.level, () =>
        call++ === 0 ? (frame + 0.1) / 8 : 0.999,
      );
      assert.equal(drop.base, items[frame].id);
      assert.equal(drop.source, 'monster');
      assert.equal(drop.identified, false);
      assert.equal(drop.rarity, 'Legendary');
    }
  }
  assert.ok(weaponBonus('shadow-sword') > weaponBonus('woods-sword'));
});
test('crafting uses each tier ore at 20:1 and increasing bars, never allows identification', () => {
  let previous = 0;
  for (const tier of EQUIPMENT_TIERS) {
    assert.ok(tier.bars > previous);
    previous = tier.bars;
    const p = createPlayer('p', 'Smith');
    p.level = 100;
    p.blacksmithing = { level: 100, xp: 0 };
    forgeAction(p, 'accept');
    p.inventory[tier.ore] = 20;
    forgeAction(p, 'craft', `${tier.material}-bar`);
    assert.equal(p.inventory[tier.ore], undefined);
    assert.equal(p.inventory[`${tier.material}-bar`], 1);
    p.inventory[`${tier.material}-bar`] = tier.bars;
    forgeAction(p, 'craft', `${tier.id}-sword`);
    assert.equal(p.inventory[`${tier.material}-bar`], undefined);
    const g = p.gear![0];
    assert.equal(g.source, 'crafted');
    assert.equal(g.identified, true);
    assert.deepEqual(g.attributes, createCraftedGear(g.base).attributes);
    const before = JSON.stringify(p);
    assert.throws(() => identifyGear(p, g.id), /Only monster/);
    assert.equal(JSON.stringify(p), before);
    g.identified = false;
    assert.throws(() => identifyGear(p, g.id), /Only monster/);
    if (tier.id !== 'woods') assert.equal(p.forgeQuest?.barsSmelted, 0);
    assert.equal(p.forgeQuest?.toolsCrafted, 0);
  }
});
test('crafting rejects locked tiers and insufficient materials without charging', () => {
  const p = createPlayer('p', 'Smith');
  forgeAction(p, 'accept');
  p.inventory['crystal-bar'] = 100;
  const before = JSON.stringify(p);
  assert.throws(() => forgeAction(p, 'craft', 'crystal-armor'), /level/);
  assert.equal(JSON.stringify(p), before);
  assert.throws(() => forgeAction(p, 'craft', 'woods-armor'), /materials/);
});
test('all four armor slots stack and unequip independently; crafted stats cannot be rerolled', () => {
  const p = createPlayer('p', 'Smith');
  p.gear = ['helmet', 'armor', 'legs', 'boots'].map((part) => createCraftedGear(`woods-${part}`));
  for (const g of p.gear) equipGear(p, g.id);
  assert.equal(Object.keys(p.equippedGear!).length, 4);
  assert.equal(playerAttributes(p).maxHealth, 120);
  assert.equal(playerAttributes(p).armor, 2.5);
  equipGear(p, p.gear[0].id);
  assert.equal(playerAttributes(p).maxHealth, 116);
  assert.equal(playerAttributes(p).armor, 2);
  assert.ok(p.equippedGear?.armor);
});
