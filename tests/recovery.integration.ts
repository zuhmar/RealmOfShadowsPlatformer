import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import { MAPS } from '@ros/game-data';
import type { Player, Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 12_000) throw new Error('Recovery timed out');
    await pause(25);
  }
}
test('server recovery resets a stuck actor, prevents repeated recovery and saves free return without inventory loss', async () => {
  let userId: string | undefined;
  let room: Room | undefined;
  try {
    const guest = await fetch('http://localhost:2567/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const row = await fetch('http://localhost:2567/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'RecoveryTest' }),
    }).then((r) => r.json());
    userId = row.userId;
    await db.character.update({
      where: { id: row.id },
      data: {
        data: {
          ...row.data,
          mapId: 'woods',
          x: 30,
          y: 820,
          hp: 50,
          auto: false,
          teleportStarterGranted: true,
          inventory: { ...row.data.inventory, 'teleport-crystal': 3 },
        },
      },
    });
    const client = new Client('ws://localhost:2567');
    const join = () =>
      client.create('map', { token: guest.token, characterId: row.id, mapId: 'woods' });
    const state: { snapshot?: Snapshot; notices: string[]; travel?: string } = { notices: [] };
    const attach = (r: Room) => {
      for (const name of ['welcome', 'events', 'chat', 'snapshotDelta'])
        r.onMessage(name, () => {});
      r.onMessage('notice', (v: string) => state.notices.push(v));
      r.onMessage('snapshot', (v: Snapshot) => (state.snapshot = v));
      r.onMessage('travel', (v: string) => (state.travel = v));
    };
    room = await join();
    attach(room);
    await until(() => !!state.snapshot);
    room.send('recover', 'unstuck');
    await until(() => state.notices.some((n) => n.includes('Leave combat')));
    await pause(10_200);
    room.send('recover', 'unstuck');
    await until(() => state.notices.some((n) => n.includes('map’s entrance')));
    await until(() =>
      state.snapshot!.players.some((p) => p.id === row.id && p.x === MAPS.woods.spawn.x),
    );
    const recovered = state.snapshot!.players.find((p) => p.id === row.id)!;
    assert.equal(recovered.y, MAPS.woods.spawn.y);
    assert.equal(recovered.inventory['teleport-crystal'], 3);
    room.send('recover', 'village');
    await until(() => state.notices.some((n) => n.includes('Recovery available')));
    assert.equal(state.travel, undefined);
    await room.leave();
    room = undefined;
    await pause(150);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: row.id } }))
      .data as unknown as Player;
    assert.ok(saved.lastRecoveryAt);
    assert.equal(saved.inventory['teleport-crystal'], 3);
    // Advance only the test character's persisted cooldown, then exercise the real travel/save path.
    saved.lastRecoveryAt = Date.now() - 61_000;
    await db.character.update({
      where: { id: row.id },
      data: { data: JSON.parse(JSON.stringify(saved)) },
    });
    state.snapshot = undefined;
    state.notices = [];
    room = await join();
    attach(room);
    await until(() => !!state.snapshot);
    await pause(10_200);
    room.send('recover', 'village');
    await until(() => state.travel === 'village');
    const returned = (await db.character.findUniqueOrThrow({ where: { id: row.id } }))
      .data as unknown as Player;
    assert.equal(returned.mapId, 'village');
    assert.equal(returned.inventory['teleport-crystal'], 3);
    assert.ok(returned.lastRecoveryAt! > saved.lastRecoveryAt);
    assert.equal(returned.gold, saved.gold);
  } finally {
    if (room?.connection.isOpen) await room.leave().catch(() => {});
    await pause(100);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
