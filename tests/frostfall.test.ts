import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  ISLANDS,
  FROSTFALL_QUESTS,
  FROSTFALL_FISH,
  FORGE_RECIPES,
  ALL_RECIPES,
  recipeSource,
  BOSS_ATTACK,
  WOODS_MONSTERS,
} from '@ros/game-data';
import {
  World,
  createPlayer,
  usePortal,
  useTeleport,
  teleportBlock,
  advanceQuests,
  rollRecipeDrop,
  playerAttributes,
  type Player,
} from '@ros/shared';
test('Frostfall has four distinct reachable layouts, ten normal monsters, one boss and separate resource platforms', () => {
  const ids = ['frostfall', 'frostfall-2', 'frostfall-3', 'frostfall-boss'],
    signatures = new Set();
  for (const [i, id] of ids.entries()) {
    const m = MAPS[id];
    signatures.add(JSON.stringify(m.platforms));
    assert.equal(m.requiredLevel, [31, 34, 37, 40][i]);
    assert.equal(m.spawns.length, i === 3 ? 1 : 10);
    const seen = new Set(['ground']);
    for (let n = 0; n < m.platforms.length; n++)
      for (const l of m.ladders) {
        const a = m.platforms.find((p) => p.id === l.from)!,
          b = m.platforms.find((p) => p.id === l.to)!;
        assert.equal(l.bottom, a.y);
        assert.equal(l.top, b.y);
        assert.ok(l.x >= a.x && l.x <= a.x + a.width && l.x >= b.x && l.x <= b.x + b.width);
        if (seen.has(l.from)) seen.add(l.to);
        if (seen.has(l.to)) seen.add(l.from);
      }
    assert.equal(seen.size, m.platforms.length);
    for (const q of m.portals) {
      const p = m.platforms.find((p) => q.y === p.y && q.x >= p.x && q.x <= p.x + p.width);
      assert.ok(p, `${id}: portal unsupported`);
    }
    for (const s of m.spawns) {
      const p = m.platforms.find((p) => p.id === s.platform)!;
      assert.ok(s.x >= p.x + 25 && s.x <= p.x + p.width - 25);
      assert.equal(s.y, p.y);
    }
  }
  assert.equal(signatures.size, 4);
  assert.equal(new Set(MAPS.frostfall.resources!.map((n) => n.platform)).size, 4);
  assert.deepEqual(
    FROSTFALL_FISH.map((f) => f.level),
    [31, 35, 40],
  );
  assert.deepEqual(
    Object.values(FROSTFALL_QUESTS).map((q) => q.target.count),
    [270, 360, 450, 1],
  );
  assert.ok(MAPS['frostfall-3'].bossEntrance!.y < 250);
  assert.equal(ISLANDS.find((i) => i.id === 'frostfall')!.available, true);
});
test('Hydra and level gates protect both travel paths; boss entry consumes exactly one key', () => {
  const p = createPlayer('p', 'Hero', 'murkmire-3');
  Object.assign(p, { x: 2750, y: 820, level: 31 });
  assert.throws(() => usePortal(p, MAPS['murkmire-3']), /Hydra/);
  p.bossKills = { hydra: 1 };
  p.level = 30;
  assert.throws(() => usePortal(p, MAPS['murkmire-3']), /31/);
  p.level = 31;
  assert.equal(usePortal(p, MAPS['murkmire-3']), 'frostfall');
  Object.assign(p, {
    mapId: 'frostfall-3',
    x: 2600,
    y: 210,
    level: 40,
    inventory: { 'frostfall-boss-key': 2, 'teleport-crystal': 2 },
  });
  assert.equal(usePortal(p, MAPS['frostfall-3']), 'frostfall-boss');
  assert.equal(p.inventory['frostfall-boss-key'], 1);
  p.mapId = 'frostfall';
  assert.equal(useTeleport(p, 'frostfall-boss'), 'frostfall-boss');
  assert.equal(p.inventory['frostfall-boss-key'], undefined);
  assert.equal(p.inventory['teleport-crystal'], 1);
  p.mapId = 'frostfall';
  assert.match(teleportBlock(p, 'frostfall-boss')!, /boss key/);
});
test('Frost tools escalate to 40 bars and 160 wood, bars retain 20 ore, recipes drop only from their island', () => {
  assert.deepEqual(FORGE_RECIPES.find((r) => r.id === 'frost-bar')!.cost, { 'frost-ore': 20 });
  for (const kind of ['pickaxe', 'axe', 'rod', 'sickle'])
    assert.deepEqual(FORGE_RECIPES.find((r) => r.id === `frost-${kind}`)!.cost, {
      'frost-bar': 40,
      frostpine: 160,
    });
  assert.equal(
    ALL_RECIPES.filter((r) => r.tier === 'frost' && ['cooking', 'alchemy'].includes(r.category))
      .length,
    5,
  );
  assert.doesNotMatch(recipeSource('icefin-roast'), /future/);
  const p = createPlayer('p', 'Hero');
  assert.equal(
    rollRecipeDrop(p, 'Frostfall Tundra', true, [], () => 0),
    'recipe:frost-bar',
  );
});
test('Frost Giant special is fixed, telegraphed and avoidable; boss quest remains one', () => {
  const w = new World(MAPS['frostfall-boss']),
    boss = w.wolves[0];
  const a = createPlayer('a', 'A', 'frostfall-boss'),
    b = createPlayer('b', 'B', 'frostfall-boss');
  for (const p of [a, b]) {
    p.level = 40;
    p.hp = playerAttributes(p).maxHealth;
    p.y = 820;
    w.players.set(p.id, p);
  }
  a.x = 1000;
  b.x = 1400;
  boss.special = { x: 1000, y: 820, radius: BOSS_ATTACK.radius, startedAt: 10000, impactAt: 11800 };
  w.resolveBossSpecial(boss, 11799);
  assert.equal(a.hp, playerAttributes(a).maxHealth);
  w.resolveBossSpecial(boss, 11800);
  assert.ok(a.hp < playerAttributes(a).maxHealth);
  assert.equal(b.hp, playerAttributes(b).maxHealth);
  assert.equal(w.events.find((e) => e.type === 'bossAttack')!.text, 'GLACIAL SLAM!');
  a.quests = { 'frostfall-giant': { progress: 0, claimed: false } };
  advanceQuests(a, 'frost-giant', 'frostfall-boss');
  assert.equal(a.quests['frostfall-giant'].progress, 1);
});
test('Frost Giant first-clear trophy is awarded once and kills drop Frost-tier gear', () => {
  const w = new World(MAPS['frostfall-boss']),
    p = createPlayer('p', 'P', 'frostfall-boss');
  p.level = 40;
  w.players.set(p.id, p);
  const boss = w.wolves[0];
  w.hitWolf(p, boss, WOODS_MONSTERS['frost-giant'].hp, 10000);
  assert.equal(p.inventory['frost-giant-trophy'], 1);
  assert.equal(p.bossKills!['frost-giant'], 1);
  assert.equal(w.drops[0].gear!.level, 40);
  boss.hp = 1;
  w.hitWolf(p, boss, 1, 20000);
  assert.equal(p.inventory['frost-giant-trophy'], 1);
  assert.equal(p.bossKills!['frost-giant'], 2);
});
