import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { ALL_RECIPES } from '@ros/game-data';
import { createPlayer, type Player, type Snapshot } from '@ros/shared';
import { db, json, session } from '../apps/server/src/db';
import { persistHousing } from '../apps/server/src/housing';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const end = Date.now() + 10000;
  while (!fn()) {
    if (Date.now() > end) throw new Error('Housing check timed out');
    await pause(25);
  }
}
function listen(room: Room) {
  const state: { s?: Snapshot; notices: string[] } = { notices: [] };
  for (const n of ['welcome', 'events', 'chat', 'snapshotDelta']) room.onMessage(n, () => {});
  room.onMessage('snapshot', (s: Snapshot) => (state.s = s));
  room.onMessage('notice', (s: string) => state.notices.push(s));
  return state;
}
test('private houses persist atomically; invitations, visits and revocation are enforced over real sockets', async () => {
  const users: string[] = [],
    rooms: Room[] = [];
  try {
    async function fixture(name: string) {
      const u = await db.user.create({ data: {} });
      users.push(u.id);
      const p = createPlayer('fixture', name, 'village');
      Object.assign(p, {
        x: 900,
        y: 240,
        platform: 'housing',
        carpentry: { level: 10, xp: 0 },
        inventory: { 'oak-plank': 1000, 'iron-bar': 100 },
        unlockedRecipes: ALL_RECIPES.map((r) => r.id),
      });
      const c = await db.character.create({ data: { userId: u.id, name, data: json(p) } });
      p.id = c.id;
      await db.character.update({ where: { id: c.id }, data: { data: json(p) } });
      return { p, token: await session(u.id) };
    }
    const a = await fixture('HousingOwner'),
      b = await fixture('HousingGuest'),
      client = new Client('ws://localhost:2567');
    const owner = await client.create('map', {
      mapId: 'village',
      characterId: a.p.id,
      token: a.token,
    });
    rooms.push(owner);
    const os = listen(owner);
    const guest = await client.joinById(owner.roomId, {
      mapId: 'village',
      characterId: b.p.id,
      token: b.token,
    });
    rooms.push(guest);
    const gs = listen(guest);
    await until(() => !!os.s && !!gs.s);
    const own = () => os.s!.players.find((p) => p.id === a.p.id)!;
    const visitor = () => gs.s!.players.find((p) => p.id === b.p.id)!;
    owner.send('housing', { action: 'plot', id: 'small' });
    await until(() => own().housing?.size === 'small');
    for (let stage = 1; stage <= 3; stage++) {
      owner.send('housing', { action: 'build' });
      await until(() => own().housing?.stage === stage);
    }
    owner.send('housing', { action: 'craft', id: 'oak-table' });
    await until(() => (own().inventory['oak-table'] ?? 0) === 1);
    owner.send('housing', { action: 'place', id: 'oak-table', x: 0 });
    await until(() => own().housing?.furniture.length === 1);
    assert.equal(gs.s!.players.find((p) => p.id === a.p.id)?.housing, undefined);
    assert.equal(visitor().housingView, undefined);
    guest.send('housing', { action: 'visit', id: a.p.id });
    await until(() => gs.notices.some((n) => n.includes('invite you')));
    assert.equal(visitor().housingView, undefined);
    owner.send('housing', { action: 'invite', id: b.p.id });
    await until(() => own().housing?.invited.includes(b.p.id) === true);
    guest.send('housing', { action: 'visit', id: a.p.id });
    await until(() => visitor().housingView?.ownerId === a.p.id);
    assert.equal(visitor().housingView?.furniture.length, 1);
    assert.equal('invited' in visitor().housingView!, false);
    guest.send('housing', { action: 'remove', id: own().housing!.furniture[0].id });
    await until(() => gs.notices.some((n) => n.includes('own plot')));
    assert.equal(own().housing?.furniture.length, 1);
    owner.send('housing', { action: 'revoke', id: b.p.id });
    await until(() => !visitor().housingView);
    assert.equal(own().housing?.invited.length, 0);
    const saved = await db.character.findUniqueOrThrow({ where: { id: a.p.id } });
    const snapshot = saved.data as unknown as Player;
    assert.equal(snapshot.housing?.stage, 3);
    assert.equal(snapshot.housing?.furniture.length, 1);
    assert.equal(snapshot.housingView, undefined);
    await owner.leave(true);
    await pause(150);
    const rejoin = await client.joinById(guest.roomId, {
      mapId: 'village',
      characterId: a.p.id,
      token: a.token,
    });
    rooms.push(rejoin);
    const rs = listen(rejoin);
    await until(() => !!rs.s?.players.find((p) => p.id === a.p.id)?.housingView);
    assert.equal(rs.s!.players.find((p) => p.id === a.p.id)?.housing?.furniture.length, 1);
    await rejoin.leave(true);
    await pause(150);
    const fresh = (await db.character.findUniqueOrThrow({ where: { id: a.p.id } }))
      .data as unknown as Player;
    const results = await Promise.allSettled([
      persistHousing(fresh, { action: 'craft', id: 'oak-chair', quantity: 3 }),
      persistHousing(fresh, { action: 'craft', id: 'oak-chair', quantity: 3 }),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const after = (await db.character.findUniqueOrThrow({ where: { id: a.p.id } }))
      .data as unknown as Player;
    assert.equal(after.inventory['oak-chair'], 3);
    assert.equal(after.inventory['oak-plank'], fresh.inventory['oak-plank'] - 9);
  } finally {
    for (const room of rooms)
      try {
        if (room.connection.isOpen) await room.leave(true);
      } catch {}
    await pause(100);
    for (const id of users) await db.user.delete({ where: { id } });
    await db.$disconnect();
  }
});
