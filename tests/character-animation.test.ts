import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, idleInput, moveActor, World } from '@ros/shared';
import { MAPS } from '@ros/game-data';
import { characterAction, characterMotion, jumpFrame } from '../apps/web/src/character-animation';
import { outfitPixel } from '../apps/web/src/character-art';
test('characters choose movement from authoritative state; jump and ladder are distinct', () => {
  const p = createPlayer('p', 'Hero');
  assert.equal(characterMotion(p, MAPS.woods), 'idle');
  p.vx = 200;
  assert.equal(characterMotion(p, MAPS.woods), 'walk');
  p.grounded = false;
  p.vx = 0;
  p.vy = -155;
  p.climbing = false;
  assert.equal(characterMotion(p, MAPS.woods), 'air');
  p.climbing = true;
  assert.equal(characterMotion(p, MAPS.woods), 'climb');
  for (const [vy, frame] of [
    [-500, 'jump-1'],
    [-200, 'jump-2'],
    [0, 'jump-3'],
    [250, 'jump-4'],
  ] as const)
    assert.equal(jumpFrame({ vy, grounded: false }, false), frame);
  assert.equal(jumpFrame(p, true), 'jump-5');
});
test('attacks trigger once and incoming damage does not trigger a player animation', () => {
  const p = createPlayer('p', 'Hero');
  const previous = { ...p };
  assert.equal(characterAction(p, undefined), null);
  p.lastAttack = 100;
  assert.equal(characterAction(p, previous), 'attack');
  assert.equal(characterAction(p, { ...p }), null);
  const afterAttack = { ...p };
  p.hp = 93;
  p.lastHit = 150;
  assert.equal(characterAction(p, afterAttack), null);
  p.lastAttack = 200;
  assert.equal(characterAction(p, afterAttack), 'attack');
});
test('stopping on a ladder keeps the player attached; horizontal input detaches', () => {
  const p = createPlayer('p', 'Climber');
  p.x = 530;
  p.y = 760;
  moveActor(p, { ...idleInput(), up: true }, MAPS.woods, 1 / 30, 1000);
  assert.equal(p.climbing, true);
  const y = p.y;
  for (let i = 0; i < 30; i++) moveActor(p, idleInput(), MAPS.woods, 1 / 30, 1034 + i * 34);
  assert.equal(p.y, y);
  assert.equal(p.vy, 0);
  assert.equal(p.climbing, true);
  moveActor(p, { ...idleInput(), right: true }, MAPS.woods, 1 / 30, 3000);
  assert.equal(p.climbing, false);
  assert.ok(p.x > 530);
  assert.ok(p.vy > 0);
});
test('outfit recoloring preserves skin, hair, cream cuffs, dark outlines and alpha fringe', () => {
  for (const rgb of [
    [234, 208, 164],
    [105, 77, 54],
    [235, 224, 184],
    [27, 32, 15],
  ])
    assert.deepEqual(outfitPixel(...(rgb as [number, number, number]), 255, 'tide'), rgb);
  assert.deepEqual(outfitPixel(91, 102, 54, 255, 'ember'), [181, 111, 75]);
  assert.deepEqual(outfitPixel(91, 102, 54, 255, 'tide'), [83, 136, 161]);
  assert.notDeepEqual(outfitPixel(86, 83, 51, 255, 'tide'), [86, 83, 51]);
  assert.deepEqual(outfitPixel(91, 102, 54, 4, 'tide'), [91, 102, 54]);
});
test('defeat events preserve the death location while the authoritative player respawns immediately', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Hero');
  p.x = 680;
  p.y = 760;
  p.hp = 1;
  world.players.set(p.id, p);
  world.step(1 / 30, 10000, new Map());
  const event = world.events.find((e) => e.type === 'respawn');
  assert.ok(event);
  assert.equal(event.deathX, 680);
  assert.equal(event.deathY, 760);
  assert.equal(p.x, MAPS.woods.spawn.x);
  assert.ok(p.hp > 0);
});
