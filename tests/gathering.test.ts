import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, WOODS_RESOURCE_NODES, fishingCatch } from '@ros/game-data';
import { World, createPlayer, idleInput, platformRoute } from '@ros/shared';
function setup(nodeId: string) {
  const w = new World(MAPS.woods),
    p = createPlayer('gatherer', 'Gatherer');
  const node = WOODS_RESOURCE_NODES.find((n) => n.id === nodeId)!;
  Object.assign(p, { x: node.x, y: node.y, platform: node.platform, grounded: true });
  w.players.set(p.id, p);
  return { w, p, node };
}
test('fishing has a reachable dock and fish rarity requires its separate skill level', () => {
  assert.ok(platformRoute(MAPS.woods, 'ground', 'fishing-dock').length);
  assert.equal(fishingCatch(1, 0), 'brook-trout');
  assert.equal(fishingCatch(4, 0.1), 'brook-trout');
  assert.equal(fishingCatch(5, 0.1), 'silver-minnow');
  assert.equal(fishingCatch(9, 0), 'silver-minnow');
  assert.equal(fishingCatch(10, 0), 'golden-carp');
  assert.equal(fishingCatch(10, 0.7), 'brook-trout');
});
test('gathering repeats timed cycles without duplicate or catch-up rewards', (t) => {
  t.mock.method(Math, 'random', () => 0);
  for (const node of WOODS_RESOURCE_NODES) {
    const { w, p } = setup(node.id);
    assert.ok(w.startGathering(p, node.id, 10000));
    w.startGathering(p, node.id, 11000);
    assert.equal(p.gathering!.finishAt, 10000 + node.duration);
    w.stepGathering(p, idleInput(), 10000 + node.duration - 1);
    assert.deepEqual(p.inventory, {});
    w.stepGathering(p, idleInput(), 10000 + node.duration);
    assert.equal(p.inventory[node.item ?? 'brook-trout'], 1);
    assert.equal(p.gatheringSkills?.[node.skill]?.xp, 10);
    const nextFinish = p.gathering!.finishAt;
    w.stepGathering(p, idleInput(), nextFinish - 1);
    assert.equal(p.inventory[node.item ?? 'brook-trout'], 1);
    w.stepGathering(p, idleInput(), nextFinish);
    assert.equal(p.inventory[node.item ?? 'brook-trout'], 2);
    w.stepGathering(p, idleInput(), nextFinish);
    assert.equal(p.inventory[node.item ?? 'brook-trout'], 2);
    w.stepGathering(p, idleInput(), 100000);
    assert.equal(
      Object.values(p.inventory).reduce((a, b) => a + b, 0),
      3,
    );
    assert.equal(p.gathering!.finishAt, 100000 + node.duration);
  }
});
test('wrong map, platform, distance and airborne requests cannot award resources', () => {
  for (const invalid of [
    { x: 0 },
    { platform: 'ground' },
    { mapId: 'village' },
    { grounded: false },
  ]) {
    const { w, p } = setup('woods-fishing');
    Object.assign(p, invalid);
    assert.equal(w.startGathering(p, 'woods-fishing', 10000), false);
    assert.equal(p.gathering, undefined);
  }
  const { w, p } = setup('woods-fishing');
  assert.equal(w.startGathering(p, 'forged-node', 10000), false);
});
test('movement, attacks and incoming damage cancel gathering with no reward', () => {
  for (const change of ['movement', 'attack', 'damage', 'range']) {
    const { w, p } = setup('woods-fishing');
    w.startGathering(p, 'woods-fishing', 10000);
    const input = idleInput();
    if (change === 'movement') input.left = true;
    if (change === 'attack') input.attack = true;
    if (change === 'damage') p.lastHit = 10001;
    if (change === 'range') p.x += 100;
    w.stepGathering(p, input, 15000);
    assert.equal(p.gathering, undefined);
    assert.deepEqual(p.inventory, {});
  }
});
test('gathering skill levels advance separately from combat and persist in player data', (t) => {
  t.mock.method(Math, 'random', () => 0);
  const { w, p } = setup('woods-iron');
  w.startGathering(p, 'woods-iron', 10000);
  w.stepGathering(p, idleInput(), 13000);
  w.startGathering(p, 'woods-iron', 14000);
  w.stepGathering(p, idleInput(), 17000);
  assert.deepEqual(p.gatheringSkills?.Mining, { level: 2, xp: 0 });
  assert.equal(p.level, 1);
  assert.equal(p.xp, 0);
  assert.equal(p.inventory['iron-ore'], 2);
  assert.equal(JSON.parse(JSON.stringify(p)).gatheringSkills.Mining.level, 2);
});

test('wooden starter tools are selected by the server for every gathering skill', () => {
  for (const node of WOODS_RESOURCE_NODES) {
    const { w, p } = setup(node.id);
    w.startGathering(p, node.id, 10000);
    assert.ok(p.gathering?.toolId?.startsWith('wood-'));
  }
});

test('each node owns a reachable, separate platform with no monster spawns', () => {
  const ids = new Set<string>();
  for (const node of WOODS_RESOURCE_NODES) {
    const platform = MAPS.woods.platforms.find((p) => p.id === node.platform)!;
    assert.ok(platform.oneWay);
    assert.ok(!ids.has(platform.id));
    ids.add(platform.id);
    assert.equal(node.y, platform.y);
    assert.ok(node.x >= platform.x && node.x <= platform.x + platform.width);
    assert.ok(platformRoute(MAPS.woods, 'ground', platform.id).length);
    assert.ok(!MAPS.woods.spawns.some((s) => s.platform === platform.id));
    const { w, p } = setup(node.id);
    p.y = 760;
    p.platform = 'ground';
    assert.equal(w.startGathering(p, node.id, 10000), false);
  }
});

test('land gathering rolls one to three resources while fishing always awards one', (t) => {
  for (const [roll, quantity] of [
    [0, 1],
    [0.34, 2],
    [0.999999, 3],
  ]) {
    const random = t.mock.method(Math, 'random', () => roll);
    for (const node of WOODS_RESOURCE_NODES) {
      const { w, p } = setup(node.id);
      w.startGathering(p, node.id, 10000);
      w.stepGathering(p, idleInput(), 10000 + node.duration);
      const expected = node.skill === 'Fishing' ? 1 : quantity;
      assert.equal(
        Object.values(p.inventory).reduce((a, b) => a + b, 0),
        expected,
      );
      assert.equal(p.gatheringSkills?.[node.skill]?.xp, 10);
      assert.ok(w.events.at(-1)?.text.startsWith(`+${expected} `));
    }
    random.mock.restore();
  }
});
