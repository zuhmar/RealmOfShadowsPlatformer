import test from 'node:test';
import assert from 'node:assert/strict';
import { CUTSCENES, MAPS, cutsceneById, BATTLEGROUND_ID } from '@ros/game-data';
import {
  World,
  createPlayer,
  idleInput,
  beginCinematic,
  cutsceneEligible,
  nextCutscene,
  BattlegroundRun,
  type Player,
} from '@ros/shared';
const mira = () => {
  const p = createPlayer('p', 'Hero', 'village'),
    n = MAPS.village.npcs.find((n) => n.id === 'mira')!;
  Object.assign(p, { x: n.x, y: n.y });
  p.quests = { 'mira-wolves': { progress: 0, claimed: false } };
  return p;
};
test('first quest on each playable island gets its own chapter, requires acceptance and correct NPC', () => {
  for (const [map, id, quest, npc] of [
    ['village', 'chapter-woods', 'mira-wolves', 'mira'],
    ['crystal', 'chapter-crystal', 'crystal-class-trial', 'mentor'],
    ['murkmire', 'chapter-murkmire', 'murkmire-slimes', 'mirewarden'],
    ['frostfall', 'chapter-frostfall', 'frostfall-wolves', 'frostwarden'],
  ]) {
    const p = createPlayer('p', 'Hero', map),
      n = MAPS[map].npcs.find((n) => n.id === npc)!;
    Object.assign(p, { x: n.x, y: n.y });
    assert.equal(cutsceneEligible(p, MAPS[map], id), false);
    p.quests = { [quest]: { progress: 0, claimed: false } };
    assert.equal(nextCutscene(p, MAPS[map])?.id, id);
    p.x += 1000;
    assert.equal(cutsceneEligible(p, MAPS[map], id), false);
  }
});
test('watch receipts prevent repeated protection; replay works only from Elderwood and does not unlock anything', () => {
  const p = mira(),
    before = structuredClone([p.quests, p.inventory, p.gold, p.xp]);
  beginCinematic(p, MAPS.village, 'chapter-woods', 10000);
  assert.deepEqual(p.seenCutscenes, ['chapter-woods']);
  assert.throws(() => beginCinematic(p, MAPS.village, 'chapter-woods', 10001));
  const w = new World(MAPS.village);
  w.players.set(p.id, p);
  w.endCinematic(p, 11000);
  assert.equal(cutsceneEligible(p, MAPS.village, 'chapter-woods'), false);
  assert.equal(cutsceneEligible(p, MAPS.woods, 'chapter-woods', true), false);
  beginCinematic(p, MAPS.village, 'chapter-woods', 12000, true);
  assert.equal(p.seenCutscenes!.length, 1);
  assert.deepEqual([p.quests, p.inventory, p.gold, p.xp], before);
});
test('cinematic movement, attacks, damage and farming stop; expiry always returns control', () => {
  const w = new World(MAPS['woods-boss']),
    p = createPlayer('p', 'Hero', 'woods-boss');
  p.x = 1000;
  w.players.set(p.id, p);
  beginCinematic(p, w.map, 'boss-woods', 10000);
  const initial = { x: p.x, hp: p.hp, mp: p.mp };
  w.attack(p, false, 11000);
  w.hitPlayer(p, 1000, 11000, 'special');
  w.step(0.1, 11000, new Map([[p.id, { ...idleInput(), right: true, attack: true }]]));
  assert.deepEqual({ x: p.x, hp: p.hp, mp: p.mp }, initial);
  assert.equal(p.lastAttack, 0);
  w.step(0.1, 100001, new Map([[p.id, { ...idleInput(), right: true }]]));
  assert.equal(p.cinematic, undefined);
  assert.ok(p.x > initial.x);
});
test('gathering restarts a fresh timed cycle after the film without catch-up rewards', () => {
  const w = new World(MAPS.woods),
    p = createPlayer('p', 'Hero', 'woods'),
    node = MAPS.woods.resources!.find((n) => n.skill === 'Mining')!;
  Object.assign(p, { x: node.x, y: node.y, platform: node.platform });
  w.players.set(p.id, p);
  w.startGathering(p, node.id, 10000);
  beginCinematic(p, w.map, 'feature-gathering', 11000);
  assert.equal(p.gathering, undefined);
  w.step(0.1, 21000, new Map());
  assert.deepEqual(p.inventory, {});
  w.endCinematic(p, 22000);
  assert.equal(p.gathering!.startedAt, 22000);
  assert.ok(p.gathering!.finishAt > 22000);
  assert.deepEqual(p.inventory, {});
});
test('major feature contexts select the right introduction and exclude live arena/battleground combat', () => {
  const p = mira();
  p.quests = {};
  assert.equal(nextCutscene(p, MAPS.village, { panel: 'skills' })?.id, 'feature-training');
  assert.equal(nextCutscene(p, MAPS.village, { panel: 'map' })?.id, 'feature-travel');
  assert.equal(nextCutscene(p, MAPS.village, { panel: 'housing' })?.id, 'feature-housing');
  const n = MAPS.village.npcs.find((n) => n.id === 'bram')!;
  Object.assign(p, { x: n.x, y: n.y });
  assert.equal(nextCutscene(p, MAPS.village, { panel: 'bram' })?.id, 'feature-forging');
  p.mapId = 'murkmire-arena';
  p.arena = { phase: 'fighting', ready: false, participant: true, endsAt: 10000, maxHealth: 100 };
  assert.equal(cutsceneEligible(p, MAPS[p.mapId], 'feature-arena'), false);
  assert.equal(cutsceneEligible(p, MAPS[p.mapId], 'feature-training'), false);
  const w = new World(MAPS[BATTLEGROUND_ID]);
  w.battleground = new BattlegroundRun(w, p.id);
  delete p.arena;
  p.mapId = w.map.id;
  w.players.set(p.id, p);
  w.battleground.join(p);
  beginCinematic(p, w.map, 'feature-battlegrounds', 10000);
  assert.throws(() => w.battleground!.start(p, 11000), /introductions/);
});
test('the origin reveal and future chapters remain locked; early chapters contain no ancestry revelation', () => {
  const p = mira();
  for (const id of ['chapter-ember', 'chapter-celestial', 'chapter-fortress'])
    assert.equal(cutsceneEligible(p, MAPS.village, id), false);
  for (const s of CUTSCENES.filter((s) => !s.spoiler))
    assert.doesNotMatch(
      s.beats.map((b) => b.text).join(' '),
      /you were shadow|he was shadow|taken from the shadow|spell gave him/i,
    );
  assert.ok(cutsceneById('chapter-celestial')!.spoiler);
  assert.equal(new Set(CUTSCENES.map((s) => s.id)).size, CUTSCENES.length);
  for (const s of CUTSCENES) {
    assert.ok(s.beats.length >= 2);
    for (const b of s.beats) {
      assert.ok(b.actors.length);
      assert.ok(b.text && b.duration! >= 4000);
    }
  }
});
