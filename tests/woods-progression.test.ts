import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, WOODS_QUESTS, QUESTS, weaponBonus } from '@ros/game-data';
import { World, createPlayer, applyWoodsMilestones, attackBonus, advanceQuests } from '@ros/shared';
test('Woods requirements and rewards ramp through the accepted quest chain', () => {
  assert.deepEqual(
    [
      QUESTS['mira-wolves'].target.count,
      WOODS_QUESTS['mira-spiders'].target.count,
      WOODS_QUESTS['mira-boars'].target.count,
    ],
    [5, 10, 20],
  );
  assert.deepEqual(
    Object.values(WOODS_QUESTS).map((q) => q.reward.gold),
    [100, 200, 500],
  );
  const p = createPlayer('p', 'Hero');
  advanceQuests(p, 'thorn-spider', 'woods-2');
  assert.equal(p.quests?.['mira-spiders'], undefined);
  p.quests = { 'mira-spiders': { progress: 0, claimed: false } };
  advanceQuests(p, 'thorn-spider', 'woods');
  assert.equal(p.quests['mira-spiders'].progress, 0);
  for (let n = 0; n < 30; n++) advanceQuests(p, 'thorn-spider', 'woods-2');
  assert.equal(p.quests['mira-spiders'].progress, 10);
});
test('species loot is collectible once and a rare ring only drops on a successful roll', (t) => {
  const roll = t.mock.method(Math, 'random', () => 0.099);
  for (const [id, item] of [
    ['woods', 'fang'],
    ['woods-2', 'thorn-silk'],
    ['woods-3', 'boar-tusk'],
    ['woods-boss', 'bear-claw'],
  ] as const) {
    const w = new World(MAPS[id]),
      p = createPlayer('p', 'Hero', id),
      enemy = w.wolves[0];
    w.players.set(p.id, p);
    w.hitWolf(p, enemy, 10000, 10000);
    assert.equal(w.drops.length, 1);
    assert.equal(w.drops[0].item, item);
    Object.assign(p, { x: enemy.x, y: enemy.y });
    w.collect(p, 10001);
    assert.equal(p.inventory[item], 1);
    w.collect(p, 10002);
    assert.equal(p.inventory[item], 1);
    if (id === 'woods') assert.equal(p.inventory['wolf-pelt'], 1);
    if (id === 'woods-boss') assert.equal(p.inventory['forest-guardian-ring'], 1);
  }
  roll.mock.mockImplementation(() => 0.1);
  const w = new World(MAPS['woods-boss']),
    p = createPlayer('p', 'Hero', 'woods-boss');
  w.hitWolf(p, w.wolves[0], 10000, 10000);
  assert.ok(!w.drops[0].items?.some((i) => i.item === 'forest-guardian-ring'));
});
test('first clear and Crystal access are durable and never repeat, including legacy victories', () => {
  const p = createPlayer('p', 'Hero');
  assert.equal(applyWoodsMilestones(p), false);
  p.bossKills = { 'forest-bear': 1 };
  assert.equal(applyWoodsMilestones(p), true);
  assert.equal(p.gold, 100);
  assert.equal(p.inventory['forest-bear-trophy'], 1);
  assert.deepEqual(p.unlockedIslands, ['crystal']);
  const saved = JSON.parse(JSON.stringify(p));
  assert.equal(applyWoodsMilestones(saved), false);
  assert.equal(saved.gold, 100);
  assert.equal(saved.inventory['forest-bear-trophy'], 1);
});
test('ring attack bonus requires both ownership and manual equipment and applies to all weapons', () => {
  const p = createPlayer('p', 'Hero');
  p.inventory['forest-guardian-ring'] = 1;
  for (const weapon of [
    null,
    'elderwood-blade',
    'elderwood-bow',
    'elderwood-staff',
    'elderwood-dagger',
  ]) {
    p.weapon = weapon;
    p.accessory = null;
    assert.equal(attackBonus(p), weaponBonus(weapon));
    p.accessory = 'forest-guardian-ring';
    assert.equal(attackBonus(p), weaponBonus(weapon) + 4);
  }
  delete p.inventory['forest-guardian-ring'];
  assert.equal(attackBonus(p), weaponBonus(p.weapon));
});
