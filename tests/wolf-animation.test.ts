import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '@ros/shared';
import { MAPS } from '@ros/game-data';
import { wolfAnimation, wolfFacing, type WolfVisualState } from '../apps/web/src/wolf-animation';
const wolf = () => new World(MAPS.woods).wolves[0];
const previous = (hp = 48): WolfVisualState => ({ hp, x: 600, lastAttack: 0, dead: false });
test('wolf one-shot animations fire on snapshot edges and cannot be restarted by repeated snapshots', () => {
  const w = wolf();
  w.lastAttack = 1200;
  w.state = 'attacking';
  assert.equal(wolfAnimation(w, previous(), false), 'attack');
  const same = { ...previous(), lastAttack: 1200 };
  assert.equal(wolfAnimation(w, same, true), null);
  assert.equal(wolfAnimation(w, same, false), 'idle');
  w.hp = 34;
  assert.equal(wolfAnimation(w, same, true), 'hurt');
  w.hp = 0;
  assert.equal(wolfAnimation(w, same, true), 'death');
  assert.equal(wolfAnimation(w, { ...same, hp: 0, dead: true }, false), null);
  w.hp = 48;
  assert.equal(wolfAnimation(w, { ...same, hp: 0, dead: true }, true), 'idle');
});
test('wolf loops follow authoritative AI state and one-shots finish before locomotion resumes', () => {
  const w = wolf();
  for (const state of ['wandering', 'chasing', 'returning'] as const) {
    w.state = state;
    assert.equal(wolfAnimation(w, previous(), false), 'walk');
    assert.equal(wolfAnimation(w, previous(), true), null);
  }
  w.state = 'idle';
  assert.equal(wolfAnimation(w, undefined, false), 'idle');
});
test('wolf facing follows travel direction and attack target rather than its spawn point', () => {
  const w = wolf();
  w.x = 800;
  assert.equal(wolfFacing(w, 810, []), true);
  assert.equal(wolfFacing(w, 790, []), false);
  assert.equal(wolfFacing(w, 800, []), null);
  w.state = 'attacking';
  assert.equal(
    wolfFacing(w, 800, [
      { x: 700, y: w.y },
      { x: 805, y: w.y - 205 },
    ]),
    true,
  );
  assert.equal(wolfFacing(w, 800, [{ x: 850, y: w.y }]), false);
});
