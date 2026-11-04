import test from 'node:test';
import assert from 'node:assert/strict';
import { EQUIPMENT_TIERS, MAPS, weaponSkillProgression } from '@ros/game-data';
import { World, createPlayer, attackPower } from '@ros/shared';
function setup(weapon: string) {
  const w = new World(MAPS.woods),
    p = createPlayer('hero', 'Hero');
  p.weapon = weapon;
  p.x = 500;
  p.y = 760;
  p.facing = 1;
  w.players.set(p.id, p);
  for (const [i, wolf] of w.wolves.entries())
    Object.assign(wolf, { x: 580 + i * 5, y: 760, hp: 1000000 });
  return { w, p };
}
test('seven equipment tiers grow specials monotonically; starter retains rank-one values', () => {
  const ranks = EQUIPMENT_TIERS.map((t) => weaponSkillProgression(`${t.id}-sword`));
  assert.deepEqual(
    ranks.map((r) => r.rank),
    [1, 2, 3, 4, 5, 6, 7],
  );
  assert.deepEqual(weaponSkillProgression('elderwood-blade'), ranks[0]);
  for (let i = 1; i < ranks.length; i++) {
    assert.ok(ranks[i].damageMultiplier > ranks[i - 1].damageMultiplier);
    assert.ok(ranks[i].meleeReach > ranks[i - 1].meleeReach);
    assert.ok(ranks[i].burstRadius > ranks[i - 1].burstRadius);
    assert.ok(ranks[i].flurryStrikes >= ranks[i - 1].flurryStrikes);
  }
});
test('later skills gain targets, piercing, bursts and strikes with unchanged MP cost', () => {
  for (const tier of ['woods', 'shadow'])
    for (const kind of ['sword', 'bow', 'staff', 'dagger']) {
      const { w, p } = setup(`${tier}-${kind}`),
        evolution = weaponSkillProgression(p.weapon);
      const before = w.wolves.map((m) => m.hp);
      const expectedHit = Math.round(
        attackPower(p) *
          (kind === 'dagger' ? evolution.flurryMultiplier : evolution.damageMultiplier),
      );
      w.attack(p, true, 10000);
      assert.equal(p.mp, 38);
      assert.equal(w.events.find((e) => e.phase === 'cast')?.weapon, `${tier}-${kind}`);
      if (kind === 'bow' || kind === 'staff') {
        assert.equal(w.projectiles[0].weapon, `${tier}-${kind}`);
        p.weapon = 'frost-sword'; // Projectile identity must survive gear swaps.
        w.stepProjectiles(0.5, 10500);
        if (kind === 'staff')
          assert.equal(w.events.find((e) => e.phase === 'impact')?.weapon, `${tier}-${kind}`);
      }
      if (kind === 'dagger')
        for (let i = 1; i < evolution.flurryStrikes; i++) w.stepFlurry(10000 + i * 110);
      const hits = w.events.filter((e) => e.type === 'hit' && /^\d/.test(e.text));
      assert.equal(Number(hits[0]?.text), expectedHit);
      assert.equal(
        hits.length,
        kind === 'dagger' ? evolution.flurryStrikes : evolution.maxTargets,
        `${tier}-${kind}`,
      );
      assert.equal(
        w.wolves.filter((m, i) => m.hp < before[i]).length,
        kind === 'dagger' ? 1 : evolution.maxTargets,
      );
    }
});
