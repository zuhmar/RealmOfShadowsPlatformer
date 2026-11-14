import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db, json } from '../apps/server/src/db';
import { createPlayer, SnapshotDecoder, idleInput, type Snapshot, type Player } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, timeout = 14000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw new Error('Arena live check timed out');
    await pause(30);
  }
}
async function api(path: string, token?: string, body: unknown = {}) {
  const r = await fetch(`http://localhost:2567/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error);
  return v;
}
function listen(room: Room) {
  const decoder = new SnapshotDecoder(),
    state: { snapshot?: Snapshot; travel?: any; notices: string[] } = { notices: [] };
  room.onMessage('snapshot', (s) => {
    state.snapshot = decoder.full(s);
  });
  room.onMessage('snapshotDelta', (d) => {
    const s = decoder.delta(d);
    if (s) state.snapshot = s;
    else room.send('snapshotResync');
  });
  room.onMessage('notice', (s) => state.notices.push(s));
  room.onMessage('travel', (v) => {
    state.travel = v;
  });
  for (const name of ['welcome', 'events', 'chat', 'saved', 'provisionResult'])
    room.onMessage(name, () => {});
  return state;
}
test('live arena portal, two-seat matchmaking, ready lock, combat, forfeit exit and durable return', async () => {
  const users: string[] = [],
    rooms: Room[] = [];
  try {
    const client = new Client('ws://localhost:2567');
    const accounts: { token: string; characterId: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const guest = await api('/guest'),
        row = await api('/characters', guest.token, { name: `ArenaTest${i}` });
      users.push(row.userId);
      const p = createPlayer(row.id, row.name, i ? 'murkmire-arena' : 'murkmire');
      Object.assign(p, {
        x: 440,
        y: 820,
        level: 30,
        classId: 'knight',
        weapon: 'sword',
        hp: 448,
        inventory: { sword: 1, 'greenleaf-health-potion': 5 },
        combatSkills: { Melee: { level: i ? 1 : 100, xp: 0 } },
        bossKills: { 'crystal-wyrm': 1 },
      });
      await db.character.update({ where: { id: row.id }, data: { data: json(p) } });
      accounts.push({ token: guest.token, characterId: row.id });
    }
    const origin = await client.joinOrCreate('map', {
      ...accounts[0],
      mapId: 'murkmire',
      snapshotProtocol: 1,
      travelProtocol: 2,
    });
    rooms.push(origin);
    console.log('Arena integration: entered Murkmire');
    const os = listen(origin);
    await until(() => !!os.snapshot);
    origin.send('travel');
    await until(() => !!os.travel);
    assert.equal(os.travel.target, 'murkmire-arena');
    const a = os.travel.reservation
      ? await client.consumeSeatReservation(os.travel.reservation)
      : await client.joinOrCreate('map', {
          ...accounts[0],
          mapId: 'murkmire-arena',
          snapshotProtocol: 1,
        });
    console.log('Arena integration: consumed arena seat');
    rooms.push(a);
    const as = listen(a);
    await Promise.race([origin.leave(), pause(1000)]);
    const b = await client.joinOrCreate('map', {
      ...accounts[1],
      mapId: 'murkmire-arena',
      snapshotProtocol: 1,
    });
    rooms.push(b);
    const bs = listen(b);
    const c = await client.joinOrCreate('map', {
      ...accounts[2],
      mapId: 'murkmire-arena',
      snapshotProtocol: 1,
    });
    rooms.push(c);
    const cs = listen(c);
    console.log('Arena integration: joined three challengers');
    assert.equal(a.roomId, b.roomId);
    assert.notEqual(c.roomId, a.roomId);
    const me = () => as.snapshot!.players.find((p) => p.id === accounts[0].characterId)!;
    const opponent = () => as.snapshot!.players.find((p) => p.id === accounts[1].characterId)!;
    await until(() => as.snapshot?.players.length === 2 && !!bs.snapshot && !!cs.snapshot);
    a.send('arena', true);
    await until(() => !!me().arena?.ready);
    a.send('equip', null);
    a.send('provision', { action: 'use', recipeId: 'greenleaf-health-potion' });
    await until(() => as.notices.filter((s) => s.includes('finish the duel')).length >= 2);
    assert.equal(me().weapon, 'sword');
    assert.equal(me().inventory['greenleaf-health-potion'], 5);
    b.send('arena', true);
    await until(() => me().arena?.phase === 'countdown');
    await until(() => me().arena?.phase === 'fighting');
    const before = {
      gold: me().gold,
      xp: me().xp,
      inventory: structuredClone(me().inventory),
      training: structuredClone(me().combatSkills),
    };
    for (let i = 0; i < 32 && Math.abs(me().x - opponent().x) > 65; i++) {
      a.send('input', { ...idleInput(), right: true });
      b.send('input', { ...idleInput(), left: true });
      await pause(100);
    }
    b.send('input', idleInput());
    for (let i = 0; i < 35 && me().arena?.phase === 'fighting'; i++) {
      a.send('input', { ...idleInput(), attack: true });
      await pause(100);
    }
    a.send('input', idleInput());
    await until(() => me().arena?.phase === 'finished');
    assert.equal(me().arena!.winnerId, accounts[0].characterId);
    assert.deepEqual(
      { gold: me().gold, xp: me().xp, inventory: me().inventory, training: me().combatSkills },
      before,
    );
    a.send('travel');
    await until(() => !!as.travel);
    const stored = (
      await db.character.findUniqueOrThrow({ where: { id: accounts[0].characterId } })
    ).data as unknown as Player;
    assert.equal(stored.mapId, 'murkmire');
    assert.equal(stored.arena, undefined);
    assert.ok(stored.hp > 0);
    console.log(
      'Arena live flow: portal, 2-seat rooms, gear lock, actual trained damage, knockout, no PvE rewards and saved return passed.',
    );
  } catch (error) {
    console.error('Arena integration failure:', error);
    throw error;
  } finally {
    for (const room of rooms.reverse()) {
      await Promise.race([room.leave().catch(() => {}), pause(500)]);
      room.connection.close();
    }
    await pause(300);
    for (const id of users) await db.user.delete({ where: { id } });
    await db.$disconnect();
  }
});
