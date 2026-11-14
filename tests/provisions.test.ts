import { ALL_RECIPES } from '@ros/game-data';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PROVISION_RECIPES,
  ITEMS,
  PROVISION_IDS,
  provisionRecipe,
  gatheringXpNeeded,
} from '@ros/game-data';
import {
  createPlayer,
  provisionAction,
  foodEffect,
  expireFood,
  attackPower,
  playerAttributes,
  activityReward,
  World,
} from '@ros/shared';
import { MAPS } from '@ros/game-data';
function player() {
  const p = createPlayer('recipes', 'Chef', 'village');
  p.unlockedRecipes = ALL_RECIPES.map((r) => r.id);
  p.level = 20;
  p.craftingSkills = { Cooking: { level: 20, xp: 0 }, Alchemy: { level: 20, xp: 0 } };
  return p;
}
test('all twelve fish and four herb tiers have real recipes and inventory definitions', () => {
  assert.equal(PROVISION_RECIPES.filter((r) => r.skill === 'Cooking').length, 12);
  assert.equal(PROVISION_RECIPES.filter((r) => r.skill === 'Alchemy').length, 8);
  assert.equal(new Set(PROVISION_IDS).size, 20);
  for (const r of PROVISION_RECIPES) {
    assert.equal(ITEMS[r.id].id, r.id);
    assert.ok(r.xp > 0);
    for (const [id, n] of Object.entries(r.cost)) {
      assert.ok(ITEMS[id as keyof typeof ITEMS], id);
      assert.ok(Number.isInteger(n) && n > 0);
    }
    if (r.skill === 'Cooking') assert.ok(r.duration! > 0);
  }
});
test('crafting consumes exact ingredients, grants only profession XP and respects levels', () => {
  const p = player();
  p.craftingSkills = { Cooking: { level: 1, xp: gatheringXpNeeded(1) - 10 } };
  p.inventory = { 'brook-trout': 10 };
  const before = structuredClone(p);
  assert.throws(() => provisionAction(p, 'craft', 'golden-carp-feast'), /Cooking level/);
  assert.deepEqual(p, before);
  provisionAction(p, 'craft', 'trout-skewers');
  assert.equal(p.inventory['brook-trout'], undefined);
  assert.equal(p.inventory['trout-skewers'], 1);
  assert.equal(p.craftingSkills.Cooking!.level, 2);
  assert.equal(p.xp, before.xp);
  assert.equal(p.gold, before.gold);
  const after = structuredClone(p);
  assert.throws(() => provisionAction(p, 'craft', 'trout-skewers'), /ingredients/);
  assert.deepEqual(p, after);
  assert.throws(() => provisionAction(p, 'craft', 'fake'), /Unknown/);
  p.level = 1;
  assert.throws(() => provisionAction(p, 'craft', 'crystal-fish-roast'), /character/);
});
test('food replaces instead of stacking, expires in real time and changes no permanent gear or training', () => {
  const p = player(),
    now = Date.now();
  p.inventory = {
    'trout-skewers': 2,
    'crystal-fish-roast': 1,
    'golden-carp-feast': 1,
    'minnow-broth': 1,
  };
  const base = attackPower(p),
    gear = structuredClone(p.gear),
    training = structuredClone(p.combatSkills);
  provisionAction(p, 'use', 'trout-skewers', now);
  assert.equal(attackPower(p), Math.round(base * 1.1));
  provisionAction(p, 'use', 'crystal-fish-roast', now);
  assert.equal(attackPower(p), Math.round(base * 1.2));
  assert.equal(p.foodBuff!.recipeId, 'crystal-fish-roast');
  provisionAction(p, 'use', 'golden-carp-feast', now);
  assert.equal(attackPower(p), base);
  assert.equal(playerAttributes(p).critChance, 0.1);
  provisionAction(p, 'use', 'minnow-broth', now);
  assert.equal(playerAttributes(p).healthRegen, 5);
  assert.equal(playerAttributes(p).critChance, 0);
  assert.equal(foodEffect(p, now + 600000), undefined);
  expireFood(p, now + 600000);
  assert.equal(p.foodBuff, undefined);
  assert.equal(playerAttributes(p).healthRegen, 3);
  assert.deepEqual(p.gear, gear);
  assert.deepEqual(p.combatSkills, training);
});
test('potions clamp restoration, share a cooldown and reject full bars without wasting an item', () => {
  const p = player(),
    now = Date.now();
  p.inventory = { 'greenleaf-health-potion': 3, 'greenleaf-mana-potion': 2 };
  p.hp = playerAttributes(p).maxHealth - 10;
  p.mp = 0;
  provisionAction(p, 'use', 'greenleaf-health-potion', now);
  assert.equal(p.hp, playerAttributes(p).maxHealth);
  assert.equal(p.inventory['greenleaf-health-potion'], 2);
  const before = structuredClone(p);
  assert.throws(() => provisionAction(p, 'use', 'greenleaf-mana-potion', now + 9999), /cooldown/);
  assert.deepEqual(p, before);
  assert.throws(() => provisionAction(p, 'use', 'greenleaf-health-potion', now + 10000), /full/);
  assert.equal(p.inventory['greenleaf-health-potion'], 2);
  provisionAction(p, 'use', 'greenleaf-mana-potion', now + 10000);
  assert.equal(p.mp, 25);
  assert.equal(p.potionReadyAt, now + 20000);
});
test('food/cooldown survive serialization, food does not retroactively boost offline hunting and remote snapshots hide provisions', () => {
  const p = player(),
    now = Date.now();
  p.mapId = 'crystal-3';
  p.level = 17;
  p.visitedAreas = ['crystal-3'];
  p.inventory = { 'trout-skewers': 1, 'greenleaf-health-potion': 1 };
  p.hp = 1;
  const reward = activityReward(p, 'hunt:crystal-3', now - 3600000, now);
  provisionAction(p, 'use', 'trout-skewers', now);
  provisionAction(p, 'use', 'greenleaf-health-potion', now);
  const saved = JSON.parse(JSON.stringify(p));
  assert.equal(saved.foodBuff.expiresAt, p.foodBuff!.expiresAt);
  assert.equal(saved.potionReadyAt, p.potionReadyAt);
  assert.deepEqual(activityReward(p, 'hunt:crystal-3', now - 3600000, now), reward);
  const w = new World(MAPS.woods);
  w.players.set(p.id, p);
  const remote = w.snapshot(now, 'other').players[0];
  assert.equal(remote.foodBuff, undefined);
  assert.equal(remote.craftingSkills, undefined);
  assert.equal(remote.potionReadyAt, undefined);
  assert.ok(w.snapshot(now, p.id).players[0].foodBuff);
});
