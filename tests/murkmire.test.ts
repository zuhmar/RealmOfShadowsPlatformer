import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  MURKMIRE_QUESTS,
  MURKMIRE_FISH,
  ALL_RECIPES,
  FORGE_RECIPES,
  BOSS_ATTACK,
  displayStandTheme,
  recipeSource,
} from '@ros/game-data';
import {
  World,
  createPlayer,
  usePortal,
  teleportBlock,
  useTeleport,
  forgeAction,
  activeGatheringTool,
  advanceQuests,
  provisionAction,
  rollRecipeDrop,
} from '@ros/shared';
test('Murkmire has four distinct connected layouts, safe entry, ten normal spawns and one Hydra', () => {
  const signatures = new Set<string>();
  for (const [i, id] of ['murkmire', 'murkmire-2', 'murkmire-3', 'murkmire-boss'].entries()) {
    const m = MAPS[id];
    signatures.add(JSON.stringify(m.platforms));
    assert.equal(m.requiredLevel, [21, 24, 27, 30][i]);
    assert.equal(m.spawns.length, i === 3 ? 1 : 10);
    const seen = new Set(['ground']);
    for (let n = 0; n < m.platforms.length; n++)
      for (const l of m.ladders) {
        const a = m.platforms.find((p) => p.id === l.from)!,
          b = m.platforms.find((p) => p.id === l.to)!;
        assert.ok(a && b);
        assert.ok(l.x >= a.x && l.x <= a.x + a.width && l.x >= b.x && l.x <= b.x + b.width);
        assert.equal(l.top, b.y);
        assert.equal(l.bottom, a.y);
        if (seen.has(l.from)) seen.add(l.to);
        if (seen.has(l.to)) seen.add(l.from);
      }
    assert.equal(seen.size, m.platforms.length);
    for (const s of m.spawns) {
      const p = m.platforms.find((p) => p.id === s.platform)!;
      assert.equal(s.y, p.y);
      assert.ok(s.x >= p.x + 35 && s.x <= p.x + p.width - 35);
    }
  }
  assert.equal(signatures.size, 4);
  assert.equal(new Set(MAPS.murkmire.resources!.map((n) => n.platform)).size, 4);
  assert.deepEqual(
    MURKMIRE_FISH.map((f) => f.level),
    [21, 25, 30],
  );
  assert.deepEqual(
    Object.values(MURKMIRE_QUESTS).map((q) => q.target.count),
    [180, 240, 300, 1],
  );
  assert.ok(MAPS['murkmire-3'].bossEntrance!.y < 250);
});
test('Murkmire requires Crystal victory and level; rejected travel never consumes resources', () => {
  const p = createPlayer('p', 'Hero', 'crystal-3');
  Object.assign(p, { x: 2500, y: 800, level: 30 });
  const before = structuredClone(p);
  assert.throws(() => usePortal(p, MAPS['crystal-3']), /Crystal Wyrm/);
  assert.deepEqual(p, before);
  p.bossKills = { 'crystal-wyrm': 1 };
  p.level = 20;
  assert.throws(() => usePortal(p, MAPS['crystal-3']), /level 21/);
  p.level = 30;
  assert.equal(usePortal(p, MAPS['crystal-3']), 'murkmire');
  Object.assign(p, { mapId: 'murkmire-3', x: 2440, y: 180 });
  const missing = structuredClone(p);
  assert.throws(() => usePortal(p, MAPS['murkmire-3']), /Hydra Key/);
  assert.deepEqual(p, missing);
  p.inventory['murkmire-boss-key'] = 2;
  assert.equal(usePortal(p, MAPS['murkmire-3']), 'murkmire-boss');
  assert.equal(p.inventory['murkmire-boss-key'], 1);
  p.mapId = 'murkmire';
  p.inventory['teleport-crystal'] = 1;
  assert.equal(useTeleport(p, 'murkmire-boss'), 'murkmire-boss');
  assert.equal(p.inventory['murkmire-boss-key'], undefined);
  assert.equal(p.inventory['teleport-crystal'], undefined);
  p.mapId = 'village';
  p.visitedAreas = ['murkmire'];
  p.bossKills = {};
  p.unlockedIslands = [];
  assert.match(teleportBlock(p, 'murkmire')!, /Crystal Wyrm/);
});
test('Hydra gives swamp gear, material and exactly one first-clear trophy; special is avoidable', () => {
  const w = new World(MAPS['murkmire-boss']),
    p = createPlayer('p', 'Hero', 'murkmire-boss');
  p.level = 30;
  w.players.set(p.id, p);
  w.hitWolf(p, w.wolves[0], 99999, 10000);
  assert.equal(p.bossKills?.hydra, 1);
  assert.equal(p.inventory['hydra-trophy'], 1);
  assert.equal(w.drops[0].item, 'hydra-fang');
  assert.ok(w.drops[0].gear?.base.startsWith('swamp-'));
  const gold = p.gold;
  w.wolves[0].hp = 1;
  w.hitWolf(p, w.wolves[0], 99999, 20000);
  assert.equal(p.inventory['hydra-trophy'], 1);
  assert.equal(p.gold, gold);
  const boss = w.wolves[0];
  boss.hp = 21000;
  p.hp = 1000;
  const hp = p.hp;
  p.x = 400;
  p.y = 820;
  boss.special = { x: 1000, y: 820, radius: BOSS_ATTACK.radius, startedAt: 10000, impactAt: 11800 };
  w.resolveBossSpecial(boss, 11800);
  assert.equal(p.hp, hp);
  assert.equal(w.events.at(-1)?.text, 'VENOM ERUPTION!');
  p.x = 1000;
  boss.special = { x: 1000, y: 820, radius: BOSS_ATTACK.radius, startedAt: 20000, impactAt: 21800 };
  w.resolveBossSpecial(boss, 21800);
  assert.ok(p.hp < hp || w.events.some((e) => e.type === 'respawn'));
});
test('Mire tools require discovery, 20 bars and 80 wood, and manual equipping; provisions use swamp recipes', () => {
  const p = createPlayer('p', 'Smith');
  p.level = 30;
  p.blacksmithing = { level: 30, xp: 0 };
  forgeAction(p, 'accept');
  p.inventory = { 'mire-bar': 20, bogwood: 80 };
  assert.throws(() => forgeAction(p, 'craft', 'mire-pickaxe'), /recipe/);
  p.unlockedRecipes = ['mire-pickaxe'];
  forgeAction(p, 'craft', 'mire-pickaxe');
  assert.ok(p.ownedTools?.includes('mire-pickaxe'));
  assert.equal(activeGatheringTool(p, 'Mining').material, 'wood');
  p.gatheringSkills = { Mining: { level: 21, xp: 0 } };
  p.equippedTools = { Mining: 'mire-pickaxe' };
  assert.equal(activeGatheringTool(p, 'Mining').material, 'mire');
  assert.equal(FORGE_RECIPES.find((r) => r.id === 'mire-bar')!.cost['mire-ore'], 20);
  assert.equal(
    rollRecipeDrop(createPlayer('q', 'Hunter'), 'Murkmire Swamp', true, [], () => 0),
    'recipe:mire-bar',
  );
  for (const id of [
    'mudfish-roast',
    'bog-catfish-stew',
    'venomfin-feast',
    'mirebloom-health-potion',
    'mirebloom-mana-potion',
  ]) {
    assert.equal(ALL_RECIPES.find((r) => r.id === id)?.tier, 'swamp');
    assert.equal(recipeSource(id), 'Murkmire Swamp monsters');
  }
  p.unlockedRecipes.push('mudfish-roast');
  p.craftingSkills = { Cooking: { level: 21, xp: 0 } };
  p.inventory = { mudfish: 30 };
  provisionAction(p, 'craft', 'mudfish-roast');
  assert.equal(p.inventory['mudfish-roast'], 1);
  assert.equal(displayStandTheme('hydra-trophy'), 'swamp');
  p.quests = { 'murkmire-slimes': { progress: 0, claimed: false } };
  advanceQuests(p, 'bog-slime', 'crystal');
  assert.equal(p.quests['murkmire-slimes'].progress, 0);
  advanceQuests(p, 'bog-slime', 'murkmire');
  assert.equal(p.quests['murkmire-slimes'].progress, 1);
});
