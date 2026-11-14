import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_ID, ARENA_RULES, MAPS, weaponProfile } from '@ros/game-data';
import {
  World,
  createPlayer,
  idleInput,
  playerAttributes,
  attackPower,
  usePortal,
  teleportBlock,
  type Player,
} from '@ros/shared';
const start = 100000;
function fixture(weapon = 'sword', classId: Player['classId'] = 'knight') {
  const w = new World(MAPS[ARENA_ID]);
  const a = createPlayer('a', 'A', ARENA_ID),
    b = createPlayer('b', 'B', ARENA_ID);
  for (const p of [a, b]) {
    Object.assign(p, {
      level: 30,
      weapon: weapon === 'sword' ? 'sword' : `elderwood-${weapon}`,
      classId,
    });
    w.players.set(p.id, p);
    w.arena!.join(p);
  }
  return { w, a, b };
}
function fight(w: World, a: Player, b: Player) {
  w.arena!.ready(a, true, start);
  w.arena!.ready(b, true, start);
  w.step(0, start + ARENA_RULES.countdownMs, new Map());
  a.x = 800;
  b.x = 850;
  a.facing = 1;
  b.facing = -1;
}
test('arena portal requires Murkmire progression and level; return is free from any position', () => {
  const p = createPlayer('p', 'P', 'murkmire');
  Object.assign(p, { x: 440, y: 820, level: 21 });
  assert.throws(() => usePortal(p, MAPS.murkmire), /Crystal Wyrm/);
  p.bossKills = { 'crystal-wyrm': 1 };
  p.level = 20;
  assert.throws(() => usePortal(p, MAPS.murkmire), /21/);
  p.level = 21;
  assert.equal(usePortal(p, MAPS.murkmire), ARENA_ID);
  p.x = 1700;
  assert.match(teleportBlock(p, 'village')!, /arena/);
  assert.equal(usePortal(p, MAPS[ARENA_ID]), 'murkmire');
  assert.equal(p.x, 180);
  assert.equal(p.y, 820);
  assert.ok(teleportBlock(p, ARENA_ID));
});
test('both players consent, countdown freezes movement, no attacks outside live duel', () => {
  const { w, a, b } = fixture();
  const hp = b.hp;
  w.attack(a, false, start);
  assert.equal(b.hp, hp);
  w.arena!.ready(a, true, start);
  assert.equal(w.arena!.phase, 'waiting');
  w.arena!.ready(b, true, start);
  assert.equal(w.arena!.phase, 'countdown');
  const x = a.x;
  w.step(0.1, start + 1000, new Map([[a.id, { ...idleInput(), right: true, attack: true }]]));
  assert.equal(a.x, x);
  assert.equal(b.hp, playerAttributes(b).maxHealth);
  w.step(0, start + 5000, new Map());
  assert.equal(w.arena!.phase, 'fighting');
  assert.equal(a.mp, playerAttributes(a).maxMana);
});
test('actual level, gear and trained damage apply to PvP; no PvE rewards or skill farming', () => {
  const { w, a, b } = fixture();
  fight(w, a, b);
  a.combatSkills = { Melee: { level: 15, xp: 0 } };
  const hp = b.hp,
    damage = attackPower(a),
    before = structuredClone([a.inventory, a.combatSkills, a.quests, a.gold, a.xp]);
  w.attack(a, false, start + 6000);
  assert.equal(b.hp, hp - damage);
  assert.deepEqual([a.inventory, a.combatSkills, a.quests, a.gold, a.xp], before);
  assert.equal(w.drops.length, 0);
  assert.equal(w.wolves.length, 0);
  const after = b.hp;
  w.attack(a, false, start + 6001);
  assert.equal(b.hp, after);
  a.facing = -1;
  w.attack(a, false, start + 6000 + weaponProfile(a.weapon).cooldown);
  assert.equal(b.hp, after);
});
test('bows and staves use swept PvP collisions, range and vertical avoidance', () => {
  for (const [weapon, cls] of [
    ['bow', 'archer'],
    ['staff', 'mage'],
  ] as const) {
    const { w, a, b } = fixture(weapon, cls);
    fight(w, a, b);
    b.x = 1000;
    const hp = b.hp;
    w.attack(a, true, start + 6000);
    assert.equal(w.projectiles.length, 1);
    assert.ok(a.mp < 50);
    w.stepProjectiles(1, start + 6100);
    assert.ok(b.hp < hp);
    assert.equal(w.projectiles.length, 0);
    if (cls === 'mage')
      assert.ok(
        w.events.some((e) => e.type === 'skill' && e.phase === 'impact' && e.skill === 'staff'),
      );
    b.hp = hp;
    b.y = 620;
    w.attack(a, false, start + 12000);
    w.stepProjectiles(2, start + 12100);
    assert.equal(b.hp, hp);
  }
});
test('rogue special schedules multiple strikes and movement evades follow-ups', () => {
  const { w, a, b } = fixture('dagger', 'rogue');
  fight(w, a, b);
  w.attack(a, true, start + 6000);
  const hp = b.hp;
  assert.ok(hp < playerAttributes(b).maxHealth);
  b.x = 1400;
  w.arena!.step(start + 6500);
  assert.equal(b.hp, hp);
});
test('knockout ends exactly once, clears projectiles, restores players; rematch requires fresh ready', () => {
  const { w, a, b } = fixture();
  fight(w, a, b);
  b.hp = 1;
  w.attack(a, false, start + 6000);
  assert.equal(w.arena!.phase, 'finished');
  assert.equal(a.arena!.winnerId, a.id);
  assert.equal(b.hp, playerAttributes(b).maxHealth);
  const hp = b.hp;
  w.attack(a, false, start + 8000);
  assert.equal(b.hp, hp);
  w.arena!.step(start + 6000 + ARENA_RULES.resultMs);
  assert.equal(w.arena!.phase, 'waiting');
  assert.equal(a.arena!.ready, false);
  w.arena!.ready(a, true, start + 20000);
  assert.equal(w.arena!.phase, 'waiting');
});
test('timeout draws and departures forfeit without damaging a replacement player', () => {
  const { w, a, b } = fixture();
  fight(w, a, b);
  w.arena!.step(start + 5000 + ARENA_RULES.matchMs);
  assert.equal(w.arena!.result, 'Time limit · draw');
  const second = fixture();
  fight(second.w, second.a, second.b);
  second.w.arena!.depart(second.b, start + 6000);
  second.w.players.delete(second.b.id);
  assert.equal(second.a.arena!.winnerId, second.a.id);
  const c = createPlayer('c', 'C', ARENA_ID);
  second.w.players.set(c.id, c);
  second.w.arena!.join(c);
  assert.equal(c.arena!.participant, false);
  second.w.attack(second.a, false, start + 7000);
  assert.equal(c.hp, 100);
});
test('arena ladders connect every perch and public snapshots include status without inventory', () => {
  const { w, a, b } = fixture();
  const m = w.map,
    reached = new Set(['ground']);
  for (let i = 0; i < m.platforms.length; i++)
    for (const l of m.ladders) {
      const from = m.platforms.find((p) => p.id === l.from)!,
        to = m.platforms.find((p) => p.id === l.to)!;
      assert.ok(
        l.x >= from.x && l.x <= from.x + from.width && l.x >= to.x && l.x <= to.x + to.width,
      );
      if (reached.has(l.from)) reached.add(l.to);
    }
  assert.equal(reached.size, m.platforms.length);
  b.inventory = { 'iron-ore': 20 };
  w.arena!.ready(b, true, start);
  const remote = w.snapshot(start, a.id).players.find((p) => p.id === b.id)!;
  assert.deepEqual(remote.inventory, {});
  assert.equal(remote.arena!.ready, true);
  assert.ok(remote.arena!.maxHealth > 0);
});

test('equipped armor, dodge, block and health attributes apply to duel damage', () => {
  const { w, a, b } = fixture();
  b.gear = [
    {
      id: 'armor',
      base: 'woods-armor',
      name: 'Arena armor',
      slot: 'armor',
      level: 1,
      rarity: 'Rare',
      identified: true,
      attributes: { armor: 10, health: 80, dodgeChance: 0.25, blockChance: 0.3 },
    },
  ];
  b.equippedGear = { armor: 'armor' };
  fight(w, a, b);
  assert.equal(b.hp, 528);
  const random = Math.random;
  try {
    Math.random = () => 0.99;
    w.arena!.damage(a, b, 100, start + 6000);
    assert.equal(b.hp, 438);
    Math.random = () => 0;
    w.arena!.damage(a, b, 100, start + 6100);
    assert.equal(b.hp, 438);
    b.gear[0].attributes!.dodgeChance = 0;
    w.arena!.damage(a, b, 100, start + 6200);
    assert.equal(b.hp, 438 - Math.round(90 * 0.65));
  } finally {
    Math.random = random;
  }
});
