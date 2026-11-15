import test from 'node:test';
import assert from 'node:assert/strict';
import type { Client } from '@colyseus/core';
import { MAPS } from '@ros/game-data';
import { createPlayer, createGear, World, type Player } from '@ros/shared';
import { MapRoom } from '../apps/server/src/room';
import { db, json } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
test('loot collected during a blocked identification transaction survives its result and next save', async () => {
  let userId: string | undefined;
  let release: (() => void) | undefined;
  let lock: Promise<unknown> | undefined;
  try {
    const user = await db.user.create({ data: {} });
    userId = user.id;
    const p = createPlayer('fixture', 'IdentifyLoot', 'woods');
    p.gold = 100;
    p.inventory = { fang: 1 };
    const identifying = createGear('woods-sword', 1, () => 0);
    const fresh = createGear('woods-helmet', 1, () => 0);
    p.gear = [identifying];
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
    const room = new MapRoom();
    room.world = new World(MAPS.woods);
    room.world.players.set(p.id, p);
    const c = { sessionId: 'fixture-session', send: () => {} } as unknown as Client;
    room.characters.set(c.sessionId, p.id);
    room.clients.push(c);
    let ready!: () => void;
    const locked = new Promise<void>((resolve) => (ready = resolve));
    const unlock = new Promise<void>((resolve) => (release = resolve));
    lock = db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${p.id} FOR UPDATE`;
        ready();
        await unlock;
      },
      { timeout: 10_000 },
    );
    await locked;
    room.identify(c, identifying.id);
    await pause(200);
    assert.equal(p.gear[0].identified, false);
    assert.ok(room.questTasks.has(p.id));
    room.world.drops.push({
      id: 'pending-loot',
      x: p.x,
      y: p.y,
      gold: 12,
      item: 'fang',
      owner: p.id,
      expires: Date.now() + 60_000,
      gear: fresh,
    });
    room.world.collect(p, Date.now());
    assert.equal(p.gear.length, 2);
    assert.equal(p.gold, 112);
    assert.equal(p.inventory.fang, 2);
    release!();
    await lock;
    await room.questTasks.get(p.id);
    assert.equal(p.gear.find((g) => g.id === identifying.id)?.identified, true);
    assert.equal(p.gear.find((g) => g.id === fresh.id)?.identified, false);
    assert.equal(p.gold, 37);
    assert.equal(p.inventory.fang, 2);
    await room.enqueueSave(p);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(saved.gold, 37);
    assert.equal(saved.inventory.fang, 2);
    assert.equal(saved.gear?.length, 2);
  } finally {
    release?.();
    await lock?.catch(() => {});
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
