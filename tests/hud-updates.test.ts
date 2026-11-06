import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, World } from '@ros/shared';
import { MAPS } from '@ros/game-data';
import { hudSignature, HudUpdates } from '../apps/web/src/hud-updates';
test('HUD ignores distant movement and animation ticks but tracks health, cooldown, proximity and inventory', () => {
  const world = new World(MAPS.village),
    p = createPlayer('p', 'Hero', 'village');
  world.players.set(p.id, p);
  const signature = () => hudSignature(world.snapshot(10000), p.id);
  const initial = signature();
  p.x += 2;
  p.lastAttack = 200;
  p.lastHit = 100;
  p.vx = 100;
  assert.equal(signature(), initial);
  p.hp--;
  assert.notEqual(signature(), initial);
  const damaged = signature();
  p.inventory['iron-ore'] = 1;
  assert.notEqual(signature(), damaged);
  const inventory = signature();
  p.x = 1560;
  p.y = 650;
  assert.notEqual(signature(), inventory);
  p.lastSkill = 9000;
  assert.notEqual(
    hudSignature(world.snapshot(10000), p.id),
    hudSignature(world.snapshot(12000), p.id),
  );
});
test('HUD coalesces bursts, publishes latest state and cancels pending work on leave', async () => {
  const world = new World(MAPS.woods),
    p = createPlayer('p', 'Hero', 'woods');
  world.players.set(p.id, p);
  const published: number[] = [],
    hud = new HudUpdates(p.id, (s) => published.push(s.players[0].hp));
  const push = () => hud.push(structuredClone(world.snapshot(10000)));
  push();
  for (let i = 0; i < 20; i++) {
    p.hp--;
    push();
  }
  await new Promise((r) => setTimeout(r, 130));
  assert.deepEqual(published, [100, 80]);
  p.hp--;
  push();
  hud.stop();
  await new Promise((r) => setTimeout(r, 130));
  assert.equal(published.length, 2);
});
