import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import { changeEquipment } from '../apps/server/src/equipment';
import type { Player, Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 8000) throw new Error('Teleport test timed out');
    await pause(30);
  }
}
test('teleport RPC rejects forged targets, charges once under duplicate travel, persists starter and shop purchases', async () => {
  let userId: string | undefined;
  const rooms: Room[] = [];
  try {
    const guest = await fetch('http://localhost:2567/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const c = await fetch('http://localhost:2567/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'CrystalTraveler', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    userId = c.userId;
    await db.character.update({
      where: { id: c.id },
      data: { data: { ...c.data, visitedAreas: ['village', 'woods'], gold: 100 } },
    });
    const client = new Client('ws://localhost:2567');
    const r = await client.joinOrCreate('map', {
      token: guest.token,
      characterId: c.id,
      mapId: 'village',
    });
    rooms.push(r);
    let snapshot: Snapshot | undefined;
    const notices: string[] = [];
    let destination = '';
    r.onMessage('welcome', () => {});
    r.onMessage('events', () => {});
    r.onMessage('chat', () => {});
    r.onMessage('snapshot', (s: Snapshot) => (snapshot = s));
    r.onMessage('notice', (s: string) => notices.push(s));
    r.onMessage('travel', (s: string) => (destination = s));
    await until(() => !!snapshot);
    assert.equal(snapshot!.players.find((p) => p.id === c.id)!.inventory['teleport-crystal'], 3);
    r.send('buyTeleportCrystal');
    await until(() => notices.length === 1);
    assert.match(notices[0], /Bram/);
    r.send('teleport', 'woods-2');
    await until(() => notices.length === 2);
    assert.match(notices[1], /portal/);
    r.send('teleport', 'crystal');
    await until(() => notices.length === 3);
    assert.match(notices[2], /Forest Bear/);
    r.send('teleport', { target: 'woods', cost: 0 });
    await pause(100);
    assert.equal(destination, '');
    r.send('teleport', 'woods');
    r.send('teleport', 'woods');
    await until(() => destination === 'woods');
    let saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.mapId, 'woods');
    assert.equal(saved.inventory['teleport-crystal'], 2);
    assert.equal(saved.gold, 100);
    assert.equal(saved.teleportStarterGranted, true);
    await r.leave();
    await pause(100);
    const again = await client.joinOrCreate('map', {
      token: guest.token,
      characterId: c.id,
      mapId: 'woods',
    });
    rooms.push(again);
    let next: Snapshot | undefined;
    again.onMessage('welcome', () => {});
    again.onMessage('events', () => {});
    again.onMessage('chat', () => {});
    again.onMessage('notice', () => {});
    again.onMessage('snapshot', (s: Snapshot) => (next = s));
    await until(() => !!next);
    assert.equal(next!.players.find((p) => p.id === c.id)!.inventory['teleport-crystal'], 2);
    await again.leave();
    await pause(100);
    saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    const buys = await Promise.allSettled([
      changeEquipment(structuredClone(saved), '', 'buyCrystal'),
      changeEquipment(structuredClone(saved), '', 'buyCrystal'),
    ]);
    assert.equal(buys.filter((r) => r.status === 'fulfilled').length, 1);
    saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.gold, 75);
    assert.equal(saved.inventory['teleport-crystal'], 3);
  } finally {
    for (const room of rooms) if (room.connection.isOpen) await room.leave().catch(() => {});
    await pause(100);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
