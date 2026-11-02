import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createPlayer, idleInput, type Snapshot, type Player } from '@ros/shared';
const URL = process.env.TEST_SERVER_URL ?? 'http://localhost:2567';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
async function api(
  path: string,
  token?: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
) {
  const r = await fetch(`${URL}/api${path}`, {
    method,
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
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, timeout = 12000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error('Timed out waiting for game state');
    await wait(50);
  }
}
function observe(room: Room) {
  const ref: { snapshot: Snapshot | null } = { snapshot: null };
  room.onMessage('welcome', () => {});
  room.onMessage('events', () => {});
  room.onMessage('chat', () => {});
  room.onMessage('notice', () => {});
  room.onMessage('snapshot', (s: Snapshot) => (ref.snapshot = s));
  return ref;
}
async function saveLeave(room: Room) {
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Save timeout')), 5000);
    room.onMessage('saved', () => {
      clearTimeout(t);
      resolve();
    });
    room.send('logout', null);
  });
  await room.leave();
  await wait(150);
}
test(
  'authoritative multiplayer: auth, shared room, forged state, manual combat, AUTO, saves and reconnect',
  { timeout: 65000 },
  async () => {
    const health = await api('/health');
    assert.equal(health.ok, true);
    const guests = await Promise.all([api('/guest', undefined, {}), api('/guest', undefined, {})]);
    const users: string[] = [];
    const rooms: Room[] = [];
    try {
      const chars = await Promise.all(
        guests.map((g, i) =>
          api('/characters', g.token, {
            name: `Tester ${i}`,
            appearance: 'female',
            outfit: 'sage',
          }),
        ),
      );
      for (let i = 0; i < chars.length; i++) {
        users.push(chars[i].userId);
        const p = createPlayer(chars[i].id, chars[i].name);
        p.x = 600;
        p.y = 760;
        await db.character.update({
          where: { id: p.id },
          data: { data: JSON.parse(JSON.stringify(p)) },
        });
      }
      const client = new Client(URL.replace('http', 'ws'));
      await assert.rejects(
        () =>
          client.joinOrCreate('map', { token: 'bad', characterId: chars[0].id, mapId: 'woods' }),
        /Session expired/,
      );
      for (let i = 0; i < 2; i++)
        rooms.push(
          await client.joinOrCreate('map', {
            token: guests[i].token,
            characterId: chars[i].id,
            mapId: 'woods',
          }),
        );
      const refs = rooms.map(observe);
      await until(() => refs.every((r) => r.snapshot?.players.length === 2));
      assert.equal(rooms[0].roomId, rooms[1].roomId);
      await assert.rejects(
        () =>
          client.joinOrCreate('map', {
            token: guests[0].token,
            characterId: chars[1].id,
            mapId: 'woods',
          }),
        /Character not found|already online/,
      );
      await assert.rejects(
        () =>
          client.joinOrCreate('map', {
            token: guests[0].token,
            characterId: chars[0].id,
            mapId: 'woods',
          }),
        /already online/,
      );
      const me = () => refs[0].snapshot!.players.find((p) => p.id === chars[0].id)!;
      const before = me().x;
      rooms[0].send('input', { x: 999999, y: 0, gold: 999999, damage: 999999, ...idleInput() });
      await wait(250);
      assert.ok(Math.abs(me().x - before) < 1);
      assert.equal(me().gold, 0);
      // Move into melee range, then send attacks; only server cooldowns may apply damage.
      const movement = setInterval(
        () => rooms[0].send('input', { ...idleInput(), right: true }),
        50,
      );
      await until(() => me().x > 650, 3000);
      clearInterval(movement);
      rooms[0].send('input', idleInput());
      const attacks = setInterval(
        () => rooms[0].send('input', { ...idleInput(), attack: true }),
        50,
      );
      await until(() => me().kills >= 1, 6000);
      clearInterval(attacks);
      rooms[0].send('input', idleInput());
      assert.ok(me().xp > 0);
      assert.ok(me().gold >= 5);
      assert.ok(me().inventory.fang >= 1);
      const manualKills = me().kills;
      rooms[0].send('auto', true);
      await until(() => me().auto);
      await until(() => me().kills >= manualKills + 3, 25000);
      assert.ok(me().level >= 2);
      rooms[0].send('input', { ...idleInput(), left: true });
      await until(() => !me().auto);
      rooms[0].send('input', idleInput());
      // Chat is shared and rendered as plain text, with angle brackets removed.
      const chat = new Promise<{ name: string; text: string }>((resolve) =>
        rooms[1].onMessage('chat', resolve),
      );
      rooms[0].send('chat', '<hello> fellow traveler');
      assert.equal((await chat).text, 'hello fellow traveler');
      const kills = me().kills;
      await saveLeave(rooms[0]);
      const saved = await api('/characters', guests[0].token);
      assert.ok(saved.characters[0].data.kills >= kills);
      assert.ok(saved.characters[0].data.gold >= 5);
      const again = await client.joinOrCreate('map', {
        token: guests[0].token,
        characterId: chars[0].id,
        mapId: 'woods',
      });
      rooms[0] = again;
      const state = observe(again);
      await until(() => !!state.snapshot?.players.some((p) => p.id === chars[0].id));
      assert.ok(state.snapshot!.players.find((p) => p.id === chars[0].id)!.kills >= kills);
    } finally {
      for (const r of rooms) await r.leave().catch(() => {});
      await wait(300);
      for (const id of users) await db.user.delete({ where: { id } });
      await db.$disconnect();
    }
  },
);
test(
  'offline reward claim is atomic, capped, and guest upgrade keeps characters',
  { timeout: 20000 },
  async () => {
    const guest = await api('/guest', undefined, {});
    let userId = '';
    try {
      const c = await api('/characters', guest.token, { name: 'Sleeper' });
      userId = c.userId;
      await api(`/characters/${c.id}/offline`, guest.token, { kind: 'training' });
      await db.offlineActivity.update({
        where: { characterId: c.id },
        data: { startedAt: new Date(Date.now() - 12 * 3600000) },
      });
      const rewards = await Promise.all([
        api(`/characters/${c.id}/claim`, guest.token, {}),
        api(`/characters/${c.id}/claim`, guest.token, {}),
      ]);
      assert.equal(
        rewards.reduce((n, r) => n + r.xp, 0),
        3840,
      );
      assert.equal(
        rewards.reduce((n, r) => n + r.gold, 0),
        960,
      );
      const s = await api('/characters', guest.token);
      assert.equal(s.characters[0].data.gold, 960);
      assert.equal(await db.offlineReward.count({ where: { characterId: c.id } }), 1);
      const email = `test-${Date.now()}@realm.example`;
      const upgraded = await api('/register', guest.token, { email, password: 'testpassword123' });
      assert.equal(upgraded.guest, false);
      const login = await api('/login', undefined, { email, password: 'testpassword123' });
      const account = await api('/characters', login.token);
      assert.equal(account.characters[0].id, c.id);
      await assert.rejects(
        () => api(`/characters/${c.id}`, login.token, { confirm: 'wrong' }, 'DELETE'),
        /confirm/,
      );
      await api(`/characters/${c.id}`, login.token, { confirm: 'Sleeper' }, 'DELETE');
      assert.equal((await api('/characters', login.token)).characters.length, 0);
    } finally {
      if (userId) await db.user.delete({ where: { id: userId } });
      await db.$disconnect();
    }
  },
);
