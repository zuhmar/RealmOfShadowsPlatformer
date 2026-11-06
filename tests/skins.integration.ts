import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import { createPlayer, SnapshotDecoder, type Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 10000) throw new Error('Skin test timed out');
    await pause(25);
  }
}
async function api(path: string, token?: string, body?: unknown) {
  const r = await fetch(`http://localhost:2567/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
test('skin RPC enforces class restrictions, migrates old cosmetics and saves free allowed switches', async () => {
  let userId: string | undefined, room: Room | undefined;
  try {
    const guest = await api('/guest', undefined, {}),
      c = await api('/characters', guest.token, { name: 'SkinRestriction' });
    userId = c.userId;
    const p = createPlayer(c.id, c.name, 'village');
    Object.assign(p, {
      classId: 'knight',
      skin: 'mage',
      gold: 1000,
      weapon: 'elderwood-blade',
      inventory: { 'elderwood-blade': 1 },
    });
    await db.character.update({
      where: { id: p.id },
      data: { class: 'Knight', data: JSON.parse(JSON.stringify(p)) },
    });
    room = await new Client('ws://localhost:2567').joinOrCreate('map', {
      token: guest.token,
      characterId: p.id,
      mapId: 'village',
      snapshotProtocol: 1,
    });
    const decoder = new SnapshotDecoder();
    let snapshot: Snapshot | undefined;
    const notices: string[] = [];
    for (const name of ['welcome', 'events', 'chat']) room.onMessage(name, () => {});
    room.onMessage('snapshot', (s) => {
      snapshot = decoder.full(s);
    });
    room.onMessage('snapshotDelta', (d) => {
      snapshot = decoder.delta(d);
    });
    room.onMessage('notice', (s) => notices.push(s));
    const me = () => snapshot?.players.find((v) => v.id === p.id);
    await until(() => !!me());
    assert.equal(me()!.skin, 'knight');
    const gold = me()!.gold,
      weapon = me()!.weapon;
    room.send('skin', 'mage');
    await until(() => notices.some((s) => s.includes('matching class')));
    assert.equal(me()!.skin, 'knight');
    room.send('skin', null);
    await until(() => me()?.skin === null);
    room.send('skin', 'knight');
    await until(() => me()?.skin === 'knight');
    room.send('skin', 'dragon');
    await until(() => notices.some((s) => s.includes('Unknown skin')));
    assert.equal(me()!.skin, 'knight');
    assert.equal(me()!.gold, gold);
    assert.equal(me()!.weapon, weapon);
    assert.equal(me()!.classId, 'knight');
    const saved = new Promise<void>((resolve) => room!.onMessage('saved', () => resolve()));
    room.send('logout');
    await saved;
    await room.leave();
    room = undefined;
    const stored = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as typeof p;
    assert.equal(stored.skin, 'knight');
    assert.equal(stored.gold, gold);
    assert.equal(stored.classId, 'knight');
  } finally {
    await room?.leave().catch(() => {});
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
