import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import type { Player, Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 8000) throw new Error('Handoff timed out');
    await pause(20);
  }
}
function listen(room: Room) {
  const state: {
    snapshot?: Snapshot;
    travel?:
      | string
      | {
          target: string;
          overlapLeave: boolean;
          reservation?: Parameters<Client['consumeSeatReservation']>[0];
        };
  } = {};
  for (const name of ['welcome', 'events', 'chat', 'notice', 'snapshotDelta'])
    room.onMessage(name, () => {});
  room.onMessage('snapshot', (s: Snapshot) => (state.snapshot = s));
  room.onMessage('travel', (t: any) => (state.travel = t));
  return state;
}
test('saved travel releases only the old session, permits join before old close and preserves destination ownership', async () => {
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
      body: JSON.stringify({ name: 'FastHandoff', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    userId = c.userId;
    await db.character.update({
      where: { id: c.id },
      data: {
        data: {
          ...c.data,
          teleportStarterGranted: true,
          visitedAreas: ['village', 'woods'],
          inventory: { ...c.data.inventory, 'teleport-crystal': 5 },
        },
      },
    });
    const client = new Client('ws://localhost:2567'),
      options = { token: guest.token, characterId: c.id };
    const old = await client.joinOrCreate('map', {
      ...options,
      mapId: 'village',
      travelProtocol: 2,
    });
    rooms.push(old);
    const before = listen(old);
    await until(() => !!before.snapshot);
    old.send('teleport', 'woods');
    old.send('teleport', 'woods');
    await until(() => !!before.travel);
    assert.equal(typeof before.travel, 'object');
    const transfer = before.travel as {
      target: string;
      overlapLeave: boolean;
      reservation: Parameters<Client['consumeSeatReservation']>[0];
    };
    assert.equal(transfer.target, 'woods');
    assert.equal(transfer.overlapLeave, true);
    assert.equal(typeof transfer.reservation?.sessionId, 'string');
    const saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.mapId, 'woods');
    assert.equal(saved.inventory['teleport-crystal'], 4);
    assert.equal(old.connection.isOpen, true);
    const next = await client.consumeSeatReservation(transfer.reservation);
    rooms.push(next);
    const after = listen(next);
    await until(() => !!after.snapshot);
    assert.equal(
      after.snapshot!.players.find((p) => p.id === c.id)!.inventory['teleport-crystal'],
      4,
    );
    old.send('teleport', 'village');
    await pause(150);
    assert.equal(after.travel, undefined);
    await old.leave();
    await pause(100);
    await assert.rejects(
      client.joinOrCreate('map', { ...options, mapId: 'woods' }),
      /already online/,
    );
    next.send('teleport', 'village');
    await until(() => !!after.travel);
    const returned = after.travel as unknown as string | { target: string };
    assert.equal(typeof returned === 'string' ? returned : returned.target, 'village');
    const final = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(final.inventory['teleport-crystal'], 3);
    assert.equal(final.mapId, 'village');
  } finally {
    for (const room of rooms) if (room.connection.isOpen) await room.leave().catch(() => {});
    await pause(100);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
