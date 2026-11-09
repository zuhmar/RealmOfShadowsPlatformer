import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { ALL_RECIPES, HOUSE_LAYOUTS } from '@ros/game-data';
import { createPlayer, SnapshotDecoder, type Player, type Snapshot } from '@ros/shared';
import { db, json, session } from '../apps/server/src/db';
import { persistHousing } from '../apps/server/src/housing';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, timeout = 12000) {
  const end = Date.now() + timeout;
  while (!fn()) {
    if (Date.now() > end) throw new Error('Housing check timed out');
    await pause(25);
  }
}
function listen(room: Room) {
  const decoder = new SnapshotDecoder();
  const state: {
    s?: Snapshot;
    travel?: any;
    invitedHomes?: { id: string; name: string }[];
    notices: string[];
  } = { notices: [] };
  for (const name of ['welcome', 'events', 'chat', 'npc']) room.onMessage(name, () => {});
  room.onMessage('snapshot', (s: Snapshot) => (state.s = decoder.full(s)));
  room.onMessage('snapshotDelta', (d) => {
    state.s = decoder.delta(d);
    if (!state.s) room.send('snapshotResync');
  });
  room.onMessage('housingInvitations', (homes) => (state.invitedHomes = homes));
  room.onMessage('travel', (t) => (state.travel = t));
  room.onMessage('notice', (n) => state.notices.push(n));
  room.send('snapshotResync');
  return state;
}
test('private interiors support invitation-checked entry, floors, placement, revocation, saves and atomic batches', async () => {
  const users: string[] = [],
    rooms: Room[] = [];
  let timer: ReturnType<typeof setInterval> | undefined;
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
        inventory: { 'oak-plank': 1000, 'iron-bar': 100, 'oak-chair': 10 },
        unlockedRecipes: ALL_RECIPES.map((r) => r.id),
      });
      const c = await db.character.create({ data: { userId: u.id, name, data: json(p) } });
      p.id = c.id;
      await db.character.update({ where: { id: c.id }, data: { data: json(p) } });
      return { p, token: await session(u.id) };
    }
    const a = await fixture('InteriorOwner'),
      b = await fixture('InteriorGuest'),
      other = await fixture('OtherHouse'),
      client = new Client('ws://localhost:2567');
    const owner = await client.create('map', {
      mapId: 'village',
      characterId: a.p.id,
      token: a.token,
      travelProtocol: 2,
    });
    rooms.push(owner);
    const os = listen(owner);
    const guest = await client.joinById(owner.roomId, {
      mapId: 'village',
      characterId: b.p.id,
      token: b.token,
      travelProtocol: 2,
    });
    rooms.push(guest);
    const gs = listen(guest);
    await until(() => !!os.s && !!gs.s);
    const own = () => os.s!.players.find((p) => p.id === a.p.id)!,
      visitor = () => gs.s!.players.find((p) => p.id === b.p.id)!;
    owner.send('housing', { action: 'plot', id: 'medium' });
    await until(() => own().housing?.size === 'medium');
    for (let stage = 1; stage <= 3; stage++) {
      owner.send('housing', { action: 'build' });
      await until(() => own().housing?.stage === stage);
    }
    assert.equal(gs.s!.players.find((p) => p.id === a.p.id)?.housing, undefined);
    guest.send('housing', { action: 'visit', id: a.p.id });
    await until(() => gs.notices.some((n) => n.includes('invite you')));
    owner.send('housing', { action: 'invite', id: b.p.id });
    await until(() => own().housing?.invited.includes(b.p.id) === true);
    guest.send('housing', { action: 'visit', id: a.p.id });
    await until(() => visitor().housingView?.ownerId === a.p.id);
    owner.send('housing', { action: 'enter' });
    await until(() => !!os.travel);
    assert.equal(os.travel.target, 'house-medium');
    assert.equal(os.travel.houseOwnerId, a.p.id);
    const inside = await client.consumeSeatReservation(os.travel.reservation);
    rooms.push(inside);
    const ins = listen(inside);
    await until(() => !!ins.s);
    assert.equal(ins.s!.mapId, 'house-medium');
    const hero = () => ins.s!.players.find((p) => p.id === a.p.id)!;
    guest.send('housing', { action: 'home' });
    await until(() => !visitor().housingView);
    guest.send('housing', { action: 'list' });
    await until(() => gs.invitedHomes?.some((home) => home.id === a.p.id) === true);
    guest.send('housing', { action: 'visit', id: a.p.id });
    await until(() => visitor().housingView?.ownerId === a.p.id);
    guest.send('housing', { action: 'enter' });
    await until(() => !!gs.travel);
    const visiting = await client.consumeSeatReservation(gs.travel.reservation);
    rooms.push(visiting);
    const vs = listen(visiting);
    await until(() => !!vs.s);
    assert.equal(visiting.roomId, inside.roomId);
    assert.ok(vs.s!.players.find((p) => p.id === b.p.id)?.housingView);
    visiting.send('housing', { action: 'place', id: 'oak-chair', x: 0 });
    await until(() => vs.notices.some((n) => n.includes('Only the owner')));
    assert.equal(hero().housing?.furniture.length, 0);
    inside.send('housing', { action: 'place', id: 'oak-chair', x: 0 });
    await until(() => hero().housing?.furniture.length === 1);
    assert.equal(hero().housing?.furniture[0].floor, 0);
    const ladder = HOUSE_LAYOUTS.medium.width - 160;
    timer = setInterval(() => inside.send('input', { right: true }), 100);
    inside.send('input', { right: true });
    await until(() => hero().x >= ladder - 15);
    clearInterval(timer);
    timer = setInterval(() => inside.send('input', { up: true }), 100);
    inside.send('input', { up: true });
    await until(() => hero().y <= 501);
    clearInterval(timer);
    timer = undefined;
    inside.send('input', {});
    await pause(150);
    inside.send('housing', { action: 'place', id: 'oak-chair', x: 0 });
    await until(() => hero().housing?.furniture.length === 2);
    assert.equal(hero().housing?.furniture[1].floor, 1);
    await until(
      () => vs.s!.players.find((p) => p.id === b.p.id)?.housingView?.furniture.length === 2,
    );
    await db.character.update({
      where: { id: other.p.id },
      data: { data: json({ ...other.p, mapId: 'house-medium', houseOwnerId: a.p.id }) },
    });
    await assert.rejects(
      () =>
        client.joinOrCreate('map', {
          mapId: 'house-medium',
          houseOwnerId: a.p.id,
          token: other.token,
          characterId: other.p.id,
        }),
      /invited/,
    );
    await db.character.update({
      where: { id: other.p.id },
      data: {
        data: json({
          ...other.p,
          mapId: 'house-medium',
          houseOwnerId: other.p.id,
          housing: { size: 'medium', stage: 3, invited: [], furniture: [] },
        }),
      },
    });
    const isolated = await client.joinOrCreate('map', {
      mapId: 'house-medium',
      houseOwnerId: other.p.id,
      token: other.token,
      characterId: other.p.id,
    });
    rooms.push(isolated);
    listen(isolated);
    assert.notEqual(isolated.roomId, inside.roomId);
    await isolated.leave(true);
    inside.send('housing', { action: 'revoke', id: b.p.id });
    await until(() => !!vs.travel);
    assert.equal(vs.travel.target, 'village');
    const back = await client.consumeSeatReservation(vs.travel.reservation);
    rooms.push(back);
    const bs = listen(back);
    await until(() => bs.s?.mapId === 'village');
    assert.equal(bs.s!.players.find((p) => p.id === b.p.id)?.houseOwnerId, undefined);
    await back.leave(true);
    await pause(150);
    const stranded = (await db.character.findUniqueOrThrow({ where: { id: b.p.id } }))
      .data as unknown as Player;
    stranded.mapId = 'house-medium';
    stranded.houseOwnerId = a.p.id;
    await db.character.update({ where: { id: b.p.id }, data: { data: json(stranded) } });
    const recovered = await fetch('http://localhost:2567/api/characters', {
      headers: { Authorization: `Bearer ${b.token}` },
    }).then((r) => r.json());
    assert.equal(recovered.characters[0].data.mapId, 'village');
    assert.equal(recovered.characters[0].data.houseOwnerId, undefined);

    await inside.leave(true);
    await pause(150);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: a.p.id } }))
      .data as unknown as Player;
    assert.equal(saved.mapId, 'house-medium');
    assert.equal(saved.housing?.furniture.length, 2);
    assert.equal(saved.housingView, undefined);
    const resume = await client.joinOrCreate('map', {
      mapId: saved.mapId,
      houseOwnerId: a.p.id,
      token: a.token,
      characterId: a.p.id,
      travelProtocol: 2,
    });
    rooms.push(resume);
    const rs = listen(resume);
    await until(() => rs.s?.players.some((p) => p.id === a.p.id) === true);
    await resume.leave(true);
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
    assert.equal(after.inventory['oak-chair'], fresh.inventory['oak-chair'] + 3);
    assert.equal(after.inventory['oak-plank'], fresh.inventory['oak-plank'] - 9);
  } finally {
    if (timer) clearInterval(timer);
    for (const room of rooms)
      try {
        if (room.connection.isOpen) await room.leave(true);
      } catch {}
    await pause(100);
    for (const id of users) await db.user.delete({ where: { id } });
    await db.$disconnect();
  }
});
