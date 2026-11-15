import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { MAPS } from '@ros/game-data';
import { createPlayer, type Player } from '@ros/shared';
import { db, json, session } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > 8000) throw Error('Click interaction timed out');
    await pause(25);
  }
}
test('targeted NPC clicks preserve proximity and clicked portals use free portal travel instead of crystal teleportation', async () => {
  let userId: string | undefined, room: Room | undefined;
  try {
    const u = await db.user.create({ data: {} });
    userId = u.id;
    const p = createPlayer('fixture', 'ClickTester', 'village'),
      mira = MAPS.village.npcs.find((n) => n.id === 'mira')!;
    p.x = mira.x;
    p.y = mira.y;
    p.level = 40;
    p.inventory['teleport-crystal'] = 3;
    p.teleportStarterGranted = true;
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
    const client = new Client('ws://localhost:2567'),
      token = await session(u.id);
    const state: { ready: boolean; npcs: string[]; notices: string[]; travel?: string } = {
      ready: false,
      npcs: [],
      notices: [],
    };
    async function join() {
      state.ready = false;
      room = await client.create('map', { token, characterId: p.id, mapId: 'village' });
      room.onMessage('snapshot', () => (state.ready = true));
      room.onMessage('npc', (n: { id: string }) => state.npcs.push(n.id));
      room.onMessage('notice', (n: string) => state.notices.push(n));
      room.onMessage('travel', (t: string) => (state.travel = t));
      for (const n of ['welcome', 'events', 'chat']) room.onMessage(n, () => {});
      await until(() => state.ready);
    }
    await join();
    room!.send('interact', { npcId: 'bram' });
    await until(() => state.notices.length > 0);
    assert.match(state.notices.at(-1)!, /Walking to.*Bram/i);
    room!.send('input', { left: true });
    room!.send('input', {});
    assert.deepEqual(state.npcs, []);
    room!.send('interact', { npcId: 'missing' });
    await until(() => state.notices.length > 1);
    assert.deepEqual(state.npcs, []);
    room!.send('interact', { npcId: 'mira' });
    await until(() => state.npcs.length === 1);
    assert.equal(state.npcs[0], 'mira');
    await room!.leave();
    room = undefined;
    await pause(150);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    const portal = MAPS.village.portals.find((q) => q.target === 'woods')!;
    saved.x = portal.x;
    saved.y = portal.y;
    await db.character.update({ where: { id: p.id }, data: { data: json(saved) } });
    await join();
    const notices = state.notices.length;
    room!.send('portal', 'crystal-boss');
    await until(() => state.notices.length > notices);
    assert.equal(state.travel, undefined);
    room!.send('portal', 'woods');
    await until(() => state.travel === 'woods');
    const destination = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(destination.mapId, 'woods');
    assert.equal(destination.inventory['teleport-crystal'], 3);
  } finally {
    if (room?.connection.isOpen) await room.leave().catch(() => {});
    await pause(150);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
