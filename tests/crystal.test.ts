import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, CRYSTAL_QUESTS, CRYSTAL_FISH, FORGE_RECIPES, CLASS_PATHS } from '@ros/game-data';
import {
  World,
  createPlayer,
  usePortal,
  forgeAction,
  activeGatheringTool,
  activityReward,
  offlineActivities,
  chooseClass,
} from '@ros/shared';
test('Crystal has distinct connected layouts, ten regular spawns and one boss, with all resources on separate platforms', () => {
  const signatures = new Set<string>();
  for (const [i, id] of ['crystal', 'crystal-2', 'crystal-3', 'crystal-boss'].entries()) {
    const map = MAPS[id];
    assert.equal(map.spawns.length, i === 3 ? 1 : 10);
    signatures.add(JSON.stringify(map.platforms));
    const seen = new Set(['ground']);
    for (let pass = 0; pass < map.platforms.length; pass++)
      for (const l of map.ladders) {
        const from = map.platforms.find((p) => p.id === l.from)!,
          to = map.platforms.find((p) => p.id === l.to)!;
        assert.ok(from && to);
        assert.ok(
          l.x >= from.x && l.x <= from.x + from.width && l.x >= to.x && l.x <= to.x + to.width,
        );
        if (seen.has(l.from)) seen.add(l.to);
        if (seen.has(l.to)) seen.add(l.from);
      }
    assert.equal(seen.size, map.platforms.length);
    for (const s of map.spawns) {
      const p = map.platforms.find((p) => p.id === s.platform)!;
      assert.equal(s.y, p.y);
      assert.ok(s.x >= p.x + 35 && s.x <= p.x + p.width - 35);
    }
  }
  assert.equal(signatures.size, 4);
  assert.equal(new Set(MAPS.crystal.resources!.map((n) => n.platform)).size, 4);
  assert.ok(MAPS['crystal-3'].portals.find((p) => p.key)?.y! < 300);
  assert.deepEqual(
    CRYSTAL_FISH.map((f) => f.level),
    [11, 15, 20],
  );
  assert.deepEqual(
    Object.values(CRYSTAL_QUESTS).map((q) => q.target.count),
    [90, 120, 180, 1],
  );
});
test('Crystal access requires Woods victory and level; each boss entry consumes exactly one key', () => {
  const p = createPlayer('p', 'Hero', 'village');
  p.x = 900;
  p.y = 450;
  p.level = 20;
  assert.throws(() => usePortal(p, MAPS.village), /Forest Bear/);
  p.bossKills = { 'forest-bear': 1 };
  assert.equal(usePortal(p, MAPS.village), 'crystal');
  p.mapId = 'crystal-3';
  p.x = 2320;
  p.y = 170;
  const before = structuredClone(p);
  assert.throws(() => usePortal(p, MAPS['crystal-3']), /key/i);
  assert.deepEqual(p, before);
  p.inventory['crystal-boss-key'] = 2;
  assert.equal(usePortal(p, MAPS['crystal-3']), 'crystal-boss');
  assert.equal(p.inventory['crystal-boss-key'], 1);
});
test('Brambleboar Run has a ground-level Crystal route separate from the keyed bear entrance', () => {
  const source = MAPS['woods-3'];
  const portal = source.portals.find((q) => q.target === 'crystal')!;
  assert.ok(portal);
  assert.equal(portal.y, source.platforms.find((f) => f.id === 'ground')!.y);
  assert.ok(Math.abs(portal.y - source.portals.find((q) => q.key)!.y) > 110);
  const p = createPlayer('p', 'Hero', source.id);
  Object.assign(p, { x: portal.x, y: portal.y, level: 11 });
  const original = structuredClone(p);
  assert.throws(() => usePortal(p, source), /Forest Bear/);
  assert.deepEqual(p, original);
  p.bossKills = { 'forest-bear': 1 };
  p.level = 10;
  assert.throws(() => usePortal(p, source), /level 11/);
  p.level = 11;
  p.inventory['forest-bear-key'] = 2;
  assert.equal(usePortal(p, source), 'crystal');
  assert.equal(p.inventory['forest-bear-key'], 2);
  assert.ok(p.visitedAreas?.includes('crystal'));
});
test('Crystal gear drops, first clear, boss counter and earned next-island access are awarded once', () => {
  const w = new World(MAPS['crystal-boss']),
    p = createPlayer('p', 'Hero', 'crystal-boss');
  p.level = 20;
  w.hitWolf(p, w.wolves[0], 99999, 10000);
  assert.equal(p.bossKills?.['crystal-wyrm'], 1);
  assert.equal(p.inventory['crystal-wyrm-trophy'], 1);
  assert.ok(p.unlockedIslands?.includes('murkmire'));
  assert.ok(w.drops[0].gear?.base.startsWith('crystal-'));
  assert.equal(w.drops[0].item, 'wyrm-scale');
  const gold = p.gold;
  w.wolves[0].hp = 1;
  w.hitWolf(p, w.wolves[0], 99999, 20000);
  assert.equal(p.bossKills?.['crystal-wyrm'], 2);
  assert.equal(p.inventory['crystal-wyrm-trophy'], 1);
  assert.equal(p.gold, gold);
});
test('Civilian hits cannot train combat; Crystal gathering and manually equipped tools enforce requirements', () => {
  const w = new World(MAPS.crystal),
    p = createPlayer('p', 'Hero', 'crystal');
  p.weapon = 'elderwood-blade';
  p.level = 11;
  w.hitWolf(p, w.wolves[0], 1, 10000);
  assert.equal(p.combatSkills, undefined);
  const node = MAPS.crystal.resources![0];
  Object.assign(p, { x: node.x, y: node.y, platform: node.platform, grounded: true });
  assert.equal(w.startGathering(p, node.id, 10000), false);
  p.gatheringSkills = { Mining: { level: 11, xp: 0 } };
  p.ownedTools = ['crystal-pickaxe'];
  assert.equal(activeGatheringTool(p, 'Mining').material, 'wood');
  p.equippedTools = { Mining: 'crystal-pickaxe' };
  assert.equal(activeGatheringTool(p, 'Mining').material, 'crystal');
  assert.equal(w.startGathering(p, node.id, 10000), true);
  assert.equal(p.gathering!.finishAt, 12600);
  const reward = activityReward(p, 'gather:crystal:crystal-mine', 0, 3600000);
  assert.ok(reward.items?.['crystal-ore']);
  const smith = createPlayer('s', 'Smith', 'village');
  forgeAction(smith, 'accept');
  smith.level = 11;
  smith.blacksmithing = { level: 11, xp: 0 };
  smith.inventory = { 'crystal-bar': 10, crystalwood: 40 };
  forgeAction(smith, 'craft', 'crystal-pickaxe');
  assert.ok(smith.ownedTools?.includes('crystal-pickaxe'));
  assert.equal(smith.equippedTools, undefined);
  assert.equal(smith.forgeQuest!.toolsCrafted, 0);
});
