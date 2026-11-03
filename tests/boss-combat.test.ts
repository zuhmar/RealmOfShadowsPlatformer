import test from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, BOSS_ATTACK, WOODS_MONSTERS, maxHp } from '@ros/game-data';
import { World, createPlayer, idleInput } from '@ros/shared';
function setup() {
  const w = new World(MAPS['woods-boss']);
  const boss = w.wolves[0];
  const p = createPlayer('p', 'Hero', 'woods-boss');
  Object.assign(p, {
    x: boss.x + 100,
    y: 760,
    platform: 'ground',
    grounded: true,
    level: 50,
    hp: maxHp(50),
  });
  w.players.set(p.id, p);
  return { w, boss, p };
}
test('boss basic swipe deals normal damage, then warns a fixed target before its heavy special', () => {
  const { w, boss, p } = setup();
  const initialHp = p.hp;
  w.step(0.02, 10000, new Map());
  assert.equal(p.hp, initialHp - WOODS_MONSTERS['forest-bear'].damage);
  boss.nextSpecialAt = 11000;
  w.step(0.02, 11000, new Map());
  const zone = structuredClone(boss.special!);
  assert.ok(zone);
  assert.equal(zone.impactAt, 11000 + BOSS_ATTACK.windup);
  assert.equal(zone.x, p.x);
  const bossX = boss.x;
  p.x += 30;
  w.step(0.02, 11500, new Map());
  assert.equal(boss.special?.x, zone.x);
  assert.equal(boss.x, bossX);
  assert.equal(p.hp, initialHp - 22);
  w.step(0.02, zone.impactAt - 1, new Map());
  assert.equal(p.hp, initialHp - 22);
  w.step(0.02, zone.impactAt, new Map());
  assert.equal(p.hp, initialHp - 110);
  assert.equal(boss.special, undefined);
  assert.equal(boss.nextSpecialAt, zone.impactAt + BOSS_ATTACK.specialCooldown);
  w.resolveBossSpecial(boss, zone.impactAt);
  assert.equal(p.hp, initialHp - 110);
});
test('players outside the marked zone or high above it dodge; all players left inside take one hit', () => {
  const { w, boss, p } = setup();
  p.x = 1200;
  const inside = createPlayer('in', 'Inside', 'woods-boss'),
    outside = createPlayer('out', 'Outside', 'woods-boss'),
    jump = createPlayer('jump', 'Jumper', 'woods-boss');
  for (const actor of [p, inside, outside, jump]) {
    actor.hp = 1000;
    w.players.set(actor.id, actor);
  }
  Object.assign(inside, { x: 1300, y: 760 });
  Object.assign(outside, { x: 1351, y: 760 });
  Object.assign(jump, { x: 1200, y: 659 });
  boss.special = { x: 1200, y: 760, radius: 150, startedAt: 10000, impactAt: 11800 };
  w.resolveBossSpecial(boss, 11799);
  assert.equal(p.hp, 1000);
  w.resolveBossSpecial(boss, 11800);
  assert.equal(p.hp, 912);
  assert.equal(inside.hp, 912);
  assert.equal(outside.hp, 1000);
  assert.equal(jump.hp, 1000);
  w.resolveBossSpecial(boss, 20000);
  assert.equal(p.hp, 912);
});
test('killing the boss cancels its warning; lethal slams use normal respawn and cancel gathering', () => {
  const { w, boss, p } = setup();
  boss.special = { x: p.x, y: 760, radius: 150, startedAt: 1, impactAt: 2000 };
  w.hitWolf(p, boss, 10000, 1000);
  assert.equal(boss.special, undefined);
  const hp = p.hp;
  w.resolveBossSpecial(boss, 2000);
  assert.equal(p.hp, hp);
  const t = setup();
  t.p.hp = 30;
  t.p.auto = true;
  t.p.gathering = { nodeId: 'fake', startedAt: 1, finishAt: 5000 };
  t.boss.special = { x: t.p.x, y: 760, radius: 150, startedAt: 1, impactAt: 2000 };
  t.w.resolveBossSpecial(t.boss, 2000);
  assert.equal(t.p.hp, maxHp(t.p.level));
  assert.equal(t.p.x, MAPS['woods-boss'].spawn.x);
  assert.equal(t.p.auto, false);
  assert.equal(t.p.gathering, undefined);
  assert.equal(t.w.events.filter((e) => e.type === 'respawn').length, 1);
});
test('larger boss hitbox accepts melee at the visible edge and projectiles through its upper body', () => {
  const { w, boss, p } = setup();
  p.x = boss.x - 150;
  p.facing = 1;
  p.weapon = 'elderwood-blade';
  w.attack(p, false, 10000);
  assert.ok(boss.hp < 450);
  const t = setup();
  t.w.projectiles.push({
    id: 'shot',
    owner: t.p.id,
    kind: 'arrow',
    x: t.boss.x - 150,
    y: t.boss.y - 180,
    startX: t.boss.x - 150,
    vx: 500,
    range: 500,
    damage: 10,
    empowered: false,
  });
  t.w.stepProjectiles(0.2, 10000);
  assert.equal(t.boss.hp, 440);
});
