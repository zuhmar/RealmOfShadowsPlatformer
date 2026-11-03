import test from 'node:test';
import assert from 'node:assert/strict';
import { groundSlamFrame } from '../apps/web/src/boss-animation';
import { World, createPlayer } from '@ros/shared';
import { MAPS, BOSS_ATTACK } from '@ros/game-data';
test('slam raises through four windup poses and never impacts before server confirmation', () => {
  const boss = new World(MAPS['woods-boss']).wolves[0];
  boss.special = { x: 1000, y: 760, radius: 150, startedAt: 10000, impactAt: 11800 };
  for (const [time, frame] of [
    [10000, 0],
    [10450, 1],
    [10900, 2],
    [11350, 3],
    [11799, 3],
    [11900, 3],
  ])
    assert.equal(groundSlamFrame(boss, time), frame);
  delete boss.special;
  boss.lastSlamAt = 11900;
  for (const [time, frame] of [
    [11900, 4],
    [12019, 4],
    [12020, 5],
    [12160, 6],
    [12340, 7],
  ])
    assert.equal(groundSlamFrame(boss, time), frame);
  assert.equal(groundSlamFrame(boss, 11900 + BOSS_ATTACK.recovery), null);
  boss.hp = 0;
  assert.equal(groundSlamFrame(boss, 11900), null);
  boss.hp = 450;
  boss.monster = 'wild-boar';
  assert.equal(groundSlamFrame(boss, 11900), null);
});
test('boss stays planted during recovery then resumes pursuit', () => {
  const world = new World(MAPS['woods-boss']),
    boss = world.wolves[0],
    p = createPlayer('p', 'Hero', 'woods-boss');
  Object.assign(p, {
    x: boss.x + 300,
    y: 760,
    platform: 'ground',
    grounded: true,
    level: 50,
    hp: 600,
  });
  world.players.set(p.id, p);
  boss.special = { x: p.x, y: 760, radius: 150, startedAt: 8200, impactAt: 10000 };
  world.resolveBossSpecial(boss, 10000);
  assert.equal(boss.lastSlamAt, 10000);
  p.x = boss.x + 450;
  const x = boss.x;
  world.step(0.02, 10649, new Map());
  assert.equal(boss.x, x);
  world.step(0.02, 10650, new Map());
  assert.ok(boss.x > x);
});
