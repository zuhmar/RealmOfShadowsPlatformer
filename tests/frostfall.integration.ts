import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db, json, save } from '../apps/server/src/db';
import { changeQuest } from '../apps/server/src/quests';
import { FROSTFALL_QUESTS, QUESTS, BATTLEGROUND_ID } from '@ros/game-data';
import {
  createPlayer,
  idleInput,
  advanceQuests,
  SnapshotDecoder,
  type Snapshot,
  type Player,
} from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > 18000) throw new Error('Frostfall live flow timed out');
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
  room.onMessage('travel', (v) => {
    state.travel = v;
  });
  room.onMessage('notice', (v) => state.notices.push(v));
  for (const n of ['welcome', 'events', 'chat', 'questResult', 'provisionResult'])
    room.onMessage(n, () => {});
  return state;
}
test('Frostfall quest prerequisites and escalating claims persist; concurrent boss-key claim awards once', async () => {
  let uid: string | undefined;
  try {
    const guest = await api('/guest'),
      row = await api('/characters', guest.token, { name: 'FrostQuest' });
    uid = row.userId;
    let p = createPlayer(row.id, row.name, 'frostfall');
    p.level = 40;
    await assert.rejects(() => changeQuest(p, 'frostfall-wolves', 'accept'), /previous/);
    await db.quest.upsert({
      where: { id: 'murkmire-hydra' },
      create: { id: 'murkmire-hydra', definition: QUESTS['murkmire-hydra'] },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: p.id, questId: 'murkmire-hydra', progress: 1, claimed: true },
    });
    p.quests = { 'murkmire-hydra': { progress: 1, claimed: true } };
    await save(p);
    for (const q of Object.values(FROSTFALL_QUESTS)) {
      p = await changeQuest(p, q.id, 'accept');
      for (let i = 0; i < q.target.count; i++) advanceQuests(p, q.target.monsterId, q.target.mapId);
      await save(p);
      const claims = await Promise.allSettled([
        changeQuest(structuredClone(p), q.id, 'claim'),
        changeQuest(structuredClone(p), q.id, 'claim'),
      ]);
      assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
      p = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data as unknown as Player;
    }
    assert.equal(p.inventory['frostfall-boss-key'], 1);
    assert.equal(p.inventory.frostpine, 50);
    assert.equal(p.gold, 12400);
  } finally {
    if (uid) await db.user.delete({ where: { id: uid } });
  }
});
test('private solo rooms, four-player party codes, ready lock, wave scaling, refused fifth member and durable exit', async () => {
  const users: string[] = [],
    rooms: Room[] = [];
  const client = new Client('ws://localhost:2567');
  try {
    const entrants: {
      account: { token: string; characterId: string };
      room: Room;
      state: ReturnType<typeof listen>;
    }[] = [];
    async function follow(entry: (typeof entrants)[number]) {
      await until(() => !!entry.state.travel);
      const v = entry.state.travel;
      const next = v.reservation
        ? await client.consumeSeatReservation(v.reservation)
        : await client.joinOrCreate('map', {
            ...entry.account,
            mapId: v.target,
            battlegroundId: v.battlegroundId,
            snapshotProtocol: 1,
            travelProtocol: 2,
          });
      rooms.push(next);
      const old = entry.room;
      entry.room = next;
      entry.state = listen(next);
      await Promise.race([old.leave(), pause(600)]);
      await until(() => !!entry.state.snapshot);
    }
    for (let i = 0; i < 5; i++) {
      const guest = await api('/guest'),
        row = await api('/characters', guest.token, { name: `FrostParty${i}` });
      users.push(row.userId);
      const p = createPlayer(row.id, row.name, 'frostfall');
      Object.assign(p, {
        x: 520,
        y: 820,
        level: 40,
        hp: 568,
        weapon: 'frost-sword',
        classId: 'knight',
        bossKills: { hydra: 1 },
        inventory: { 'frost-sword': 1, 'frostleaf-health-potion': 5, 'frostleaf-mana-potion': 5 },
      });
      await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
      const account = { token: guest.token, characterId: p.id },
        room = await client.joinOrCreate('map', {
          ...account,
          mapId: 'frostfall',
          snapshotProtocol: 1,
          travelProtocol: 2,
        });
      rooms.push(room);
      const e = { account, room, state: listen(room) };
      entrants.push(e);
      await until(() => !!e.state.snapshot);
      room.send('travel');
      await follow(e);
      assert.equal(e.state.snapshot!.mapId, BATTLEGROUND_ID);
    }
    const [a, b, c, d, e] = entrants,
      me = (v: typeof a) => v.state.snapshot!.players.find((p) => p.id === v.account.characterId)!;
    assert.equal(new Set(entrants.map((v) => v.room.roomId)).size, 5);
    const code = me(a).battleground!.groupId;
    assert.ok(code.length > 25);
    for (const v of [b, c, d]) {
      v.room.send('battleground', { action: 'join', code });
      await follow(v);
      assert.equal(v.room.roomId, a.room.roomId);
    }
    await until(() => a.state.snapshot?.players.length === 4);
    e.room.send('battleground', { action: 'join', code });
    await until(() => e.state.notices.some((s) => /full|offline|fighting/.test(s)));
    assert.notEqual(e.room.roomId, a.room.roomId);
    b.room.send('battleground', { action: 'start' });
    await until(() => b.state.notices.some((s) => s.includes('leader')));
    a.room.send('battleground', { action: 'start' });
    await until(() => a.state.notices.some((s) => s.includes('Ready')));
    for (const v of [b, c, d]) v.room.send('battleground', { action: 'ready', ready: true });
    await until(() => a.state.snapshot!.players.filter((p) => p.battleground?.ready).length === 3);
    a.room.send('battleground', { action: 'start' });
    e.room.send('battleground', { action: 'start' });
    await until(
      () => me(a).battleground?.phase === 'countdown' && me(e).battleground?.phase === 'countdown',
    );
    b.room.send('equip', null);
    await until(() => b.state.notices.some((s) => s.includes('Finish the expedition')));
    assert.equal(me(b).weapon, 'frost-sword');
    assert.equal(me(b).inventory['frostleaf-health-potion'], 5);
    await until(
      () => me(a).battleground?.phase === 'fighting' && me(e).battleground?.phase === 'fighting',
    );
    assert.equal(a.state.snapshot!.wolves.length, 8);
    assert.equal(e.state.snapshot!.wolves.length, 4);
    assert.ok(a.state.snapshot!.wolves[0].maxHp! > e.state.snapshot!.wolves[0].maxHp!);
    b.room.send('input', { ...idleInput(), skill: true });
    await until(() => me(b).mp < 45);
    b.room.send('provision', { action: 'use', recipeId: 'frostleaf-mana-potion' });
    await until(() => me(b).inventory['frostleaf-mana-potion'] === 4);
    assert.ok(me(b).potionReadyAt! > Date.now());
    const potionSave = (
      await db.character.findUniqueOrThrow({ where: { id: b.account.characterId } })
    ).data as unknown as Player;
    assert.equal(potionSave.battleground, undefined);
    assert.equal(potionSave.battlegroundGroupId, code);
    b.room.send('provision', { action: 'use', recipeId: 'frostleaf-mana-potion' });
    await pause(150);
    assert.equal(me(b).inventory['frostleaf-mana-potion'], 4);
    a.room.send('battleground', { action: 'finish', won: true });
    await pause(150);
    assert.equal(me(a).gold, 0);
    assert.equal(me(a).battleground!.wave, 1);
    b.room.send('travel');
    await until(() => !!b.state.travel);
    const stored = (await db.character.findUniqueOrThrow({ where: { id: b.account.characterId } }))
      .data as unknown as Player;
    assert.equal(stored.mapId, 'frostfall');
    assert.equal(stored.battlegroundGroupId, undefined);
    assert.equal(stored.battleground, undefined);
    assert.equal(stored.gold, 0);
    console.log(
      'Live Frostfall party flow passed: five private entries, party code cap four, ready/gear locks and normal potion cooldown, scaled waves, solo isolation, rejected client reward and saved exit.',
    );
  } catch (error) {
    console.error('Frostfall live failure:', error);
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
