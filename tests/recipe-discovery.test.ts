import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_RECIPES,
  CARPENTRY_RECIPES,
  HOUSING_PLOTS,
  FORGE_RECIPES,
  PROVISION_RECIPES,
  MAPS,
  recipeScroll,
  recipeFromScroll,
  recipeSource,
  itemDefinition,
} from '@ros/game-data';
import {
  createPlayer,
  changeHousing,
  forgeAction,
  provisionAction,
  collectRecipe,
  knowsRecipe,
  rollRecipeDrop,
  World,
} from '@ros/shared';

test('every crafting recipe has a unique hunting scroll and rejects undiscovered crafting without mutation', () => {
  assert.equal(new Set(ALL_RECIPES.map((r) => r.id)).size, ALL_RECIPES.length);
  assert.equal(
    ALL_RECIPES.length,
    FORGE_RECIPES.length +
      PROVISION_RECIPES.length +
      CARPENTRY_RECIPES.length +
      Object.keys(HOUSING_PLOTS).length,
  );
  for (const r of ALL_RECIPES) {
    assert.equal(recipeFromScroll(recipeScroll(r.id))?.id, r.id);
    assert.equal(itemDefinition(recipeScroll(r.id))?.type, 'recipe');
    assert.ok(!recipeSource(r.id).includes('Unknown'));
    const p = createPlayer('p', 'Hunter', 'village');
    forgeAction(p, 'accept');
    p.level = 100;
    p.carpentry = { level: 100, xp: 0 };
    p.x = 900;
    p.y = 240;
    p.blacksmithing = { level: 100, xp: 0 };
    p.craftingSkills = { Cooking: { level: 100, xp: 0 }, Alchemy: { level: 100, xp: 0 } };
    const before = structuredClone(p);
    assert.throws(
      () =>
        FORGE_RECIPES.some((f) => f.id === r.id)
          ? forgeAction(p, 'craft', r.id)
          : PROVISION_RECIPES.some((f) => f.id === r.id)
            ? provisionAction(p, 'craft', r.id)
            : changeHousing(p, {
                action: r.category === 'housing' ? 'plot' : 'craft',
                id: r.category === 'housing' ? r.id.replace('house-', '') : r.id,
              }),
      /Find this.*(?:recipe|blueprint)/,
    );
    assert.deepEqual(p, before);
  }
});
test('scroll pickup is permanent, unique, owner-only, private and never ordinary inventory', () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Hunter'),
    other = createPlayer('other', 'Other');
  world.players.set(p.id, p);
  world.players.set(other.id, other);
  world.drops.push({
    id: 'recipe',
    x: p.x,
    y: p.y,
    owner: p.id,
    item: 'fang',
    gold: 0,
    expires: 10000,
    items: [{ item: recipeScroll('iron-bar'), quantity: 1 }],
  });
  world.collect(other, 100);
  assert.ok(!knowsRecipe(other, 'iron-bar'));
  assert.equal(world.drops.length, 1);
  world.collect(p, 100);
  assert.ok(knowsRecipe(p, 'iron-bar'));
  assert.equal(p.inventory['recipe:iron-bar'], undefined);
  assert.equal(world.drops.length, 0);
  collectRecipe(p, 'recipe:iron-bar');
  assert.deepEqual(p.unlockedRecipes, ['iron-bar']);
  assert.equal(collectRecipe(p, 'recipe:invalid'), false);
  assert.ok(knowsRecipe(JSON.parse(JSON.stringify(p)), 'iron-bar'));
  assert.equal(
    world.snapshot(100, other.id).players.find((q) => q.id === p.id)?.unlockedRecipes,
    undefined,
  );
  assert.ok(
    world.events.some(
      (e) => e.lootStage === 'pickup' && e.loot?.some((i) => i.item === 'recipe:iron-bar'),
    ),
  );
});
test('tier-only unknown loot prioritizes bars, excludes pending scrolls and has pity and boss guarantees', () => {
  const p = createPlayer('p', 'Hunter');
  assert.equal(
    rollRecipeDrop(p, 'Whispering Woods', false, [], () => 0.99),
    'recipe:iron-bar',
  );
  collectRecipe(p, 'recipe:iron-bar');
  for (let n = 0; n < 9; n++)
    assert.equal(
      rollRecipeDrop(p, 'Whispering Woods', false, [], () => 0.99),
      undefined,
    );
  const pity = rollRecipeDrop(p, 'Whispering Woods', false, [], () => 0.99);
  assert.ok(pity);
  assert.equal(recipeFromScroll(pity)?.tier, 'woods');
  const boss = rollRecipeDrop(p, 'Whispering Woods', true, [pity!], () => 0.99);
  assert.ok(boss);
  assert.notEqual(boss, pity);
  const random = rollRecipeDrop(p, 'Whispering Woods', false, [], () => 0);
  assert.ok(random);
  assert.equal(
    rollRecipeDrop(p, 'Crystal Caverns', false, [], () => 0.99),
    'recipe:crystal-bar',
  );
  p.unlockedRecipes = ALL_RECIPES.filter((r) => r.tier === 'woods').map((r) => r.id);
  assert.equal(rollRecipeDrop(p, 'Whispering Woods', true), undefined);
  assert.equal(rollRecipeDrop(p, 'Elderwood Village', true), undefined);
});
test('a hunted scroll unlocks crafting while owned consumables work without the recipe', () => {
  const p = createPlayer('p', 'Hunter', 'village');
  forgeAction(p, 'accept');
  p.inventory = { 'iron-ore': 20, 'trout-skewers': 1 };
  collectRecipe(p, rollRecipeDrop(p, 'Whispering Woods', false, [], () => 0.99)!);
  forgeAction(p, 'craft', 'iron-bar');
  assert.equal(p.inventory['iron-bar'], 1);
  assert.ok(!knowsRecipe(p, 'trout-skewers'));
  provisionAction(p, 'use', 'trout-skewers');
  assert.ok(p.foodBuff);
});
