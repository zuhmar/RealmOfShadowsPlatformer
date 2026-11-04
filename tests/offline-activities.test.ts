import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, offlineActivities, activityReward, applyActivityReward } from '@ros/shared';
test('offline tasks require discoveries and levels, never offer bosses, and retain legacy training', () => {
  const p = createPlayer('p', 'P', 'village');
  assert.deepEqual(
    offlineActivities(p).map((a) => a.id),
    ['training'],
  );
  p.visitedAreas = ['woods', 'woods-boss'];
  assert.ok(offlineActivities(p).some((a) => a.id === 'gather:woods:woods-iron'));
  assert.ok(!offlineActivities(p).some((a) => a.id === 'hunt:woods-boss'));
  assert.equal(activityReward(p, 'hunt:woods-boss', 0, 3600000).xp, 0);
});
test('gathering rewards are capped, deterministic, use equipped tools, and apply materials and skill XP', () => {
  const p = createPlayer('p', 'P');
  p.visitedAreas = ['woods'];
  const kind = 'gather:woods:woods-iron';
  const reward = activityReward(p, kind, 0, 3600000);
  assert.equal(reward.items?.['iron-ore'], 840);
  assert.deepEqual(
    activityReward(p, kind, 0, 9 * 3600000),
    activityReward(p, kind, 0, 8 * 3600000),
  );
  assert.equal(activityReward(p, kind, 100, 0).items?.['iron-ore'], undefined);
  p.ownedTools = ['iron-pickaxe'];
  assert.deepEqual(activityReward(p, kind, 0, 3600000), reward);
  p.equippedTools = { Mining: 'iron-pickaxe' };
  assert.ok(activityReward(p, kind, 0, 3600000).items!['iron-ore'] > reward.items!['iron-ore']);
  applyActivityReward(p, reward);
  assert.equal(p.inventory['iron-ore'], 840);
  assert.ok(p.gatheringSkills!.Mining!.level > 1);
});
test('offline hunts train the equipped weapon but never award boss progress, keys, gear or quests', () => {
  const p = createPlayer('p', 'P');
  p.weapon = 'elderwood-bow';
  p.classId = 'archer';
  const reward = activityReward(p, 'hunt:woods', 0, 3600000);
  applyActivityReward(p, reward);
  assert.ok(reward.xp > 0 && reward.gold > 0);
  assert.equal(reward.skill, 'Distance');
  assert.equal(p.bossKills, undefined);
  assert.equal(p.gear, undefined);
  assert.deepEqual(p.quests, {});
  assert.ok(p.combatSkills!.Distance!.level > 1);
});
