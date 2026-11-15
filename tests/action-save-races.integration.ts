import test from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@colyseus/core';
import { MAPS, QUESTS } from '@ros/game-data';
import { createPlayer, BattlegroundRun, World, type Player } from '@ros/shared';
import { MapRoom } from '../apps/server/src/room';
import { db, json } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function blockedAction(
  p: Player,
  begin: () => void,
  during: () => void,
  finish: () => Promise<unknown>,
) {
  let acquired!: () => void, release!: () => void;
  const ready = new Promise<void>((r) => (acquired = r));
  const unlock = new Promise<void>((r) => (release = r));
  const lock = db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${p.id} FOR UPDATE`;
      acquired();
      await unlock;
    },
    { timeout: 10_000 },
  );
  try {
    await ready;
    begin();
    await pause(150);
    during();
    release();
    await lock;
    await finish();
  } finally {
    release();
    await lock.catch(() => {});
  }
}
function fixture(p: Player) {
  const room = new MapRoom();
  room.world = new World(MAPS[p.mapId]);
  room.world.players.set(p.id, p);
  const c = { sessionId: 'fixture', send: () => {} } as unknown as Client;
  room.characters.set(c.sessionId, p.id);
  room.clients.push(c);
  return { room, c };
}
test('a potion saving during a battleground knockout does not revive the eliminated player', async () => {
  let userId: string | undefined;
  try {
    const u = await db.user.create({ data: {} });
    userId = u.id;
    const p = createPlayer('fixture', 'PotionRace', 'frostfall-battleground');
    p.level = 40;
    p.inventory = { 'greenleaf-health-potion': 1 };
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await saveFixture(p);
    const { room, c } = fixture(p),
      partner = createPlayer('partner', 'Partner', p.mapId);
    const run = new BattlegroundRun(room.world, `${p.id}_test`, p.id);
    room.world.battleground = run;
    run.join(p);
    room.world.players.set(partner.id, partner);
    run.join(partner);
    run.ready(partner, true);
    run.start(p, Date.now());
    run.step(Date.now() + 5_000);
    p.hp = 20;
    await blockedAction(
      p,
      () => room.provision(c, { action: 'use', recipeId: 'greenleaf-health-potion' }),
      () => run.knockout(p, Date.now()),
      async () => room.questTasks.get(p.id),
    );
    assert.equal(run.phase, 'fighting');
    assert.ok(run.eliminated.has(p.id));
    assert.equal(p.hp, 0);
    assert.equal(p.inventory['greenleaf-health-potion'], undefined);
    assert.ok(p.potionReadyAt! > Date.now());
    await room.enqueueSave(p);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(saved.hp, 0);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
  }
});
async function saveFixture(p: Player) {
  await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
}
test('training a class talent preserves gold collected while its save waits', async () => {
  let userId: string | undefined;
  try {
    const u = await db.user.create({ data: {} });
    userId = u.id;
    const p = createPlayer('fixture', 'TalentLootRace', 'frostfall');
    p.classId = 'mage';
    p.level = 40;
    p.gold = 100;
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await saveFixture(p);
    const { room, c } = fixture(p);
    await blockedAction(
      p,
      () => room.classAction(c, { action: 'talent', id: 'mastery' }),
      () => {
        room.world.drops.push({
          id: 'loot',
          x: p.x,
          y: p.y,
          owner: p.id,
          gold: 70,
          item: 'frost-pelt',
          expires: Date.now() + 60_000,
        });
        room.world.collect(p, Date.now());
      },
      async () => room.questTasks.get(p.id),
    );
    assert.equal(p.classTalents?.mastery, 1);
    assert.equal(p.gold, 170);
    assert.equal(p.inventory['frost-pelt'], 1);
    await room.enqueueSave(p);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(saved.gold, 170);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
  }
});
test('quest rewards preserve loot and progress from other hunts received while the save waits', async () => {
  let userId: string | undefined;
  try {
    const u = await db.user.create({ data: {} });
    userId = u.id;
    const p = createPlayer('fixture', 'QuestLootRace', 'frostfall');
    const npc = MAPS.frostfall.npcs.find((n) => n.id === 'frostwarden')!;
    Object.assign(p, {
      x: npc.x,
      y: npc.y,
      level: 40,
      gold: 100,
      inventory: { 'frost-pelt': 1 },
      quests: {
        'frostfall-wolves': { progress: 270, claimed: false },
        'frostfall-trolls': { progress: 1, claimed: false },
      },
    });
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await saveFixture(p);
    await db.quest.upsert({
      where: { id: 'frostfall-wolves' },
      create: { id: 'frostfall-wolves', definition: QUESTS['frostfall-wolves'] },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: p.id, questId: 'frostfall-wolves', progress: 270, claimed: false },
    });
    const { room, c } = fixture(p);
    await blockedAction(
      p,
      () => room.quest(c, { questId: 'frostfall-wolves', action: 'claim' }),
      () => {
        room.world.drops.push({
          id: 'loot',
          x: p.x,
          y: p.y,
          owner: p.id,
          gold: 70,
          item: 'frost-pelt',
          expires: Date.now() + 60_000,
        });
        room.world.collect(p, Date.now());
        p.quests!['frostfall-trolls'].progress++;
      },
      async () => room.questTasks.get(p.id),
    );
    assert.ok(p.quests!['frostfall-wolves'].claimed);
    assert.equal(p.quests!['frostfall-trolls'].progress, 2);
    assert.equal(p.gold, 1970);
    assert.equal(p.inventory['frost-pelt'], 2);
    await room.enqueueSave(p);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(saved.gold, 1970);
    assert.equal(saved.inventory['frost-pelt'], 2);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
