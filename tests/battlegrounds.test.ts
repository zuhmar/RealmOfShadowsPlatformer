import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, BATTLEGROUND_ID, BATTLEGROUND_RULES } from '@ros/game-data';
import {
  World,
  BattlegroundRun,
  createPlayer,
  idleInput,
  playerAttributes,
  type Player,
} from '@ros/shared';
function fixture(count = 1) {
  const w = new World(MAPS[BATTLEGROUND_ID]);
  w.battleground = new BattlegroundRun(w, 'p0');
  const players = Array.from({ length: count }, (_, i) => {
    const p = createPlayer(`p${i}`, `P${i}`, BATTLEGROUND_ID);
    p.level = 35;
    w.players.set(p.id, p);
    w.battleground!.join(p);
    return p;
  });
  return { w, players, run: w.battleground };
}
test('only leader starts and all other party members consent; solo starts without matchmaking strangers', () => {
  const {
    run,
    players: [a, b],
  } = fixture(2);
  assert.throws(() => run.start(b, 10000), /leader/);
  assert.throws(() => run.start(a, 10000), /Ready/);
  run.ready(b, true);
  run.start(a, 10000);
  assert.equal(run.phase, 'countdown');
  assert.equal(run.roster.length, 2);
  const solo = fixture();
  solo.run.start(solo.players[0], 10000);
  assert.equal(solo.run.roster.length, 1);
});
test('waves scale with the starting party, enemies do not respawn, and only kills in the run advance waves', () => {
  const solo = fixture(),
    party = fixture(4);
  for (const f of [solo, party]) {
    for (const p of f.players) f.run.ready(p, true);
    f.run.start(f.players[0], 10000);
    f.run.step(15000);
  }
  assert.ok(party.w.wolves.length > solo.w.wolves.length);
  assert.ok(party.w.wolves[0].hp > solo.w.wolves[0].hp);
  const p = solo.players[0],
    inventory = structuredClone(p.inventory);
  for (const wolf of solo.w.wolves) solo.w.hitWolf(p, wolf, 1e8, 16000);
  assert.equal(solo.w.drops.length, 0);
  assert.deepEqual(p.inventory, inventory);
  assert.equal(p.kills, 0);
  solo.run.step(16000);
  assert.equal(solo.run.phase, 'intermission');
  solo.run.step(23000);
  assert.equal(solo.run.wave, 2);
  assert.ok(solo.w.wolves.every((w) => w.hp > 0 && w.id.startsWith('wave-2-')));
});
test('party knockout cannot auto-revive or attack; full wipe ends run and restores health', () => {
  const {
    w,
    players: [a, b],
    run,
  } = fixture(2);
  run.ready(b, true);
  run.start(a, 10000);
  run.step(15000);
  w.hitPlayer(a, 100000, 16000, 'special');
  assert.equal(a.hp, 0);
  assert.equal(a.battleground!.eliminated, true);
  w.step(1, 25000, new Map([[a.id, { ...idleInput(), right: true, attack: true }]]));
  assert.equal(a.hp, 0);
  assert.equal(run.phase, 'fighting');
  w.hitPlayer(b, 100000, 26000, 'special');
  assert.equal(run.phase, 'finished');
  assert.equal(a.hp, playerAttributes(a).maxHealth);
  w.hitPlayer(a, 100000, 26001, 'special');
  assert.equal(a.hp, playerAttributes(a).maxHealth);
  assert.equal(a.gold, 0);
});
test('ten-wave clear shares one completion reward and excludes late arrivals; repeat finish cannot duplicate', () => {
  const {
    w,
    players: [a, b],
    run,
  } = fixture(2);
  run.ready(b, true);
  run.start(a, 10000);
  run.step(15000);
  run.wave = 10;
  const late = createPlayer('late', 'Late', BATTLEGROUND_ID);
  w.players.set(late.id, late);
  run.join(late);
  assert.equal(late.hp, 0);
  for (const wolf of w.wolves) wolf.hp = 0;
  run.step(16000);
  assert.equal(run.phase, 'finished');
  assert.equal(a.gold, BATTLEGROUND_RULES.rewardGold);
  assert.equal(b.gold, BATTLEGROUND_RULES.rewardGold);
  assert.equal(late.gold, 0);
  assert.equal(late.battleground!.rewardGold, undefined);
  const xp = a.xp;
  run.finish(true, 'again', 17000);
  assert.equal(a.gold, BATTLEGROUND_RULES.rewardGold);
  assert.equal(a.xp, xp);
});
test('leaving transfers waiting leadership, active departures cannot reset or lower the run, time limit fails safely', () => {
  const {
    w,
    players: [a, b],
    run,
  } = fixture(2);
  run.depart(a, 10000);
  w.players.delete(a.id);
  assert.equal(run.leaderId, b.id);
  run.start(b, 11000);
  run.step(16000);
  assert.equal(run.roster.length, 1);
  run.step(11000 + BATTLEGROUND_RULES.runMs);
  assert.equal(run.phase, 'finished');
  assert.equal(b.gold, 0);
});
