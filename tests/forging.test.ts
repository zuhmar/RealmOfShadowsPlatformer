import test from 'node:test';
import assert from 'node:assert/strict';
import { BRAM_QUEST, FORGE_RECIPES, MAPS, WOODS_RESOURCE_NODES } from '@ros/game-data';
import { createPlayer, forgeAction, activeGatheringTool, World } from '@ros/shared';
test('forge recipes use starter Iron material costs and never grant an automatic upgrade', () => {
  assert.deepEqual(FORGE_RECIPES[0].cost, { 'iron-ore': 20 });
  for (const recipe of FORGE_RECIPES.filter((r) => r.kind === 'tool' && r.id.startsWith('iron-')))
    assert.deepEqual(recipe.cost, { 'iron-bar': 5, 'oak-logs': 20 });
  for (const recipe of FORGE_RECIPES.filter((r) => r.kind === 'tool' && r.id.startsWith('iron-'))) {
    const p = createPlayer('p', 'Smith', 'village');
    forgeAction(p, 'accept');
    p.inventory = { 'iron-bar': 5, 'oak-logs': 20 };
    forgeAction(p, 'craft', recipe.id);
    assert.deepEqual(p.ownedTools, [recipe.id]);
    assert.equal(p.equippedTools, undefined);
    assert.deepEqual(p.inventory, {});
    assert.equal(p.forgeQuest?.toolsCrafted, 1);
  }
});
test('shortages, forged recipe ids and duplicate tools cannot consume materials or grant XP', () => {
  const p = createPlayer('p', 'Smith', 'village');
  assert.throws(() => forgeAction(p, 'craft', 'iron-bar'));
  forgeAction(p, 'accept');
  p.inventory = { 'iron-ore': 19 };
  const before = JSON.stringify(p);
  assert.throws(() => forgeAction(p, 'craft', 'iron-bar'));
  assert.equal(JSON.stringify(p), before);
  assert.throws(() => forgeAction(p, 'craft', 'shadow-pickaxe'));
  assert.equal(JSON.stringify(p), before);
  p.inventory = { 'iron-bar': 5, 'oak-logs': 20 };
  forgeAction(p, 'craft', 'iron-pickaxe');
  p.inventory = { 'iron-bar': 5, 'oak-logs': 20 };
  const owned = JSON.stringify(p);
  assert.throws(() => forgeAction(p, 'craft', 'iron-pickaxe'));
  assert.equal(JSON.stringify(p), owned);
});
test('Bram requires five smelts and a forged tool, then rewards exactly once', () => {
  const p = createPlayer('p', 'Smith', 'village');
  forgeAction(p, 'accept');
  p.inventory = { 'iron-ore': 100, 'oak-logs': 20 };
  assert.throws(() => forgeAction(p, 'claim'));
  for (let i = 0; i < 5; i++) forgeAction(p, 'craft', 'iron-bar');
  assert.equal(p.inventory['iron-bar'], 5);
  assert.throws(() => forgeAction(p, 'claim'));
  forgeAction(p, 'craft', 'iron-pickaxe');
  forgeAction(p, 'claim');
  assert.equal(p.gold, BRAM_QUEST.rewardGold);
  assert.equal(p.forgeQuest?.claimed, true);
  assert.deepEqual(p.inventory, {});
  const before = JSON.stringify(p);
  assert.throws(() => forgeAction(p, 'claim'));
  assert.throws(() => forgeAction(p, 'accept'));
  assert.equal(JSON.stringify(p), before);
  assert.ok((p.blacksmithing?.level ?? 1) > 1);
});
test('only owned and manually equipped Iron tools shorten the corresponding gathering action', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Smith'),
    node = WOODS_RESOURCE_NODES.find((n) => n.skill === 'Mining')!;
  Object.assign(p, { x: node.x, y: node.y, platform: node.platform, grounded: true });
  w.players.set(p.id, p);
  p.ownedTools = ['iron-pickaxe'];
  w.startGathering(p, node.id, 10000);
  assert.equal(p.gathering?.toolId, 'wood-pickaxe');
  assert.equal(p.gathering?.finishAt, 13000);
  delete p.gathering;
  p.equippedTools = { Mining: 'iron-pickaxe' };
  w.startGathering(p, node.id, 10000);
  assert.equal(w.players.get(p.id)?.gathering?.toolId, 'iron-pickaxe');
  assert.equal(w.players.get(p.id)?.gathering?.finishAt, 12400);
  assert.equal(activeGatheringTool(p, 'Fishing').id, 'wood-rod');
  p.ownedTools = [];
  assert.equal(activeGatheringTool(p, 'Mining').id, 'wood-pickaxe');
});
