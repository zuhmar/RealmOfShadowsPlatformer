import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, QUESTS, weaponBonus } from '@ros/game-data';
import { World, createPlayer, advanceQuests, questStatus, nearNpc } from '@ros/shared';
const id = QUESTS['mira-wolves'].id;
test('Mira requires acceptance and counts only eligible online kills after acceptance', () => {
  const p = createPlayer('p', 'Hero');
  p.kills = 100;
  advanceQuests(p, 'wolf', 'woods');
  assert.equal(questStatus(p), 'available');
  p.quests = { [id]: { progress: 0, claimed: false } };
  advanceQuests(p, 'wolf', 'village');
  advanceQuests(p, 'boar', 'woods');
  assert.equal(p.quests[id].progress, 0);
  advanceQuests(p, 'wolf', 'woods');
  assert.equal(p.quests[id].progress, 1);
  assert.equal(questStatus(p), 'active');
  for (let i = 0; i < 10; i++) advanceQuests(p, 'wolf', 'woods');
  assert.equal(p.quests[id].progress, 5);
  assert.equal(questStatus(p), 'ready');
  p.quests[id].claimed = true;
  advanceQuests(p, 'wolf', 'woods');
  assert.equal(p.quests[id].progress, 5);
  assert.equal(questStatus(p), 'claimed');
});
test('only the character landing the killing blow gets quest credit and dead wolves cannot count again', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'One'),
    q = createPlayer('q', 'Two');
  for (const a of [p, q]) {
    a.x = 630;
    a.y = 760;
    a.quests = { [id]: { progress: 0, claimed: false } };
    world.players.set(a.id, a);
  }
  world.wolves[0].hp = 15;
  world.attack(p, false, 1000);
  assert.equal(world.wolves[0].hp, 1);
  world.attack(q, false, 1100);
  assert.equal(p.quests![id].progress, 0);
  assert.equal(q.quests![id].progress, 1);
  world.attack(q, false, 2100);
  assert.equal(q.quests![id].progress, 1);
});
test('AUTO combat advances an accepted quest and caps at five', () => {
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Auto');
  p.quests = { [id]: { progress: 0, claimed: false } };
  p.auto = true;
  world.players.set(p.id, p);
  for (let t = 0; t < 30 * 100; t++) world.step(1 / 30, 10000 + (t * 1000) / 30, new Map());
  assert.ok(p.kills >= 5);
  assert.equal(p.quests[id].progress, 5);
});
test('Mira interaction requires the correct map, horizontal range and floor', () => {
  const p = createPlayer('p', 'Hero', 'village');
  assert.equal(nearNpc(p, MAPS.village, 'mira'), false);
  p.x = 440;
  assert.equal(nearNpc(p, MAPS.village, 'mira'), true);
  p.y = 450;
  assert.equal(nearNpc(p, MAPS.village, 'mira'), false);
  p.y = 650;
  assert.equal(nearNpc(p, MAPS.woods, 'mira'), false);
});
test('Elderwood Blade reward uses configured weapon damage and unknown weapons give no bonus', () => {
  assert.equal(weaponBonus('elderwood-blade'), 8);
  assert.equal(weaponBonus('forged'), 0);
  const world = new World(MAPS.woods);
  const p = createPlayer('p', 'Hero');
  p.x = 630;
  p.y = 760;
  p.weapon = 'elderwood-blade';
  world.attack(p, false, 1000);
  assert.equal(world.wolves[0].hp, 26);
});
