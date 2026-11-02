import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { type Player, type Snapshot, idleInput } from '@ros/shared';
const URL = process.env.TEST_SERVER_URL ?? 'http://localhost:2567';
const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://realm:realm@localhost:5432/realm',
  }),
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean | Promise<boolean>, timeout = 12000) {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeout) throw new Error('Quest test timed out');
    await wait(40);
  }
}
async function api(path: string, token?: string, body?: unknown) {
  const r = await fetch(`${URL}/api${path}`, {
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
async function join(token: string, id: string, mapId: string) {
  const room = await new Client(URL.replace('http', 'ws')).joinOrCreate('map', {
    token,
    characterId: id,
    mapId,
  });
  const state: { snapshot: Snapshot | null; results: { ok: boolean; message: string }[] } = {
    snapshot: null,
    results: [],
  };
  room.onMessage('welcome', () => {});
  room.onMessage('events', () => {});
  room.onMessage('chat', () => {});
  room.onMessage('notice', () => {});
  room.onMessage('snapshot', (s: Snapshot) => (state.snapshot = s));
  room.onMessage('questResult', (r) => state.results.push(r));
  room.onMessage('npc', () => {});
  await until(() => !!state.snapshot?.players.some((p) => p.id === id));
  return { room, state, me: () => state.snapshot!.players.find((p) => p.id === id)! };
}
async function quest(client: Awaited<ReturnType<typeof join>>, action: string, extra = {}) {
  const n = client.state.results.length;
  client.room.send('quest', { questId: 'mira-wolves', action, ...extra });
  await until(() => client.state.results.length > n);
  return client.state.results[n];
}
async function leave(room: Room) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Save timeout')), 5000);
    room.onMessage('saved', () => {
      clearTimeout(timer);
      resolve();
    });
    room.send('logout', null);
  });
  await room.leave();
  await wait(200);
}
async function position(id: string, mapId: string, x: number, y: number) {
  const c = await db.character.findUniqueOrThrow({ where: { id } });
  const p = c.data as unknown as Player;
  Object.assign(p, {
    mapId,
    x,
    y,
    vx: 0,
    vy: 0,
    grounded: true,
    climbing: false,
    platform: 'ground',
  });
  await db.character.update({ where: { id }, data: { data: JSON.parse(JSON.stringify(p)) } });
}
test(
  'Mira quest: proximity, acceptance, forged progress, real AUTO kills, durable single claim and disconnect during claim',
  { timeout: 80000 },
  async () => {
    let room: Room | undefined,
      userId = '';
    let release: (() => void) | undefined;
    let lock: Promise<unknown> | undefined;
    try {
      const guest = await api('/guest', undefined, {});
      const c = await api('/characters', guest.token, { name: 'Mira Tester' });
      userId = c.userId;
      let client = await join(guest.token, c.id, 'village');
      room = client.room;
      assert.equal((await quest(client, 'accept')).ok, false);
      const walking = setInterval(() => room!.send('input', { ...idleInput(), right: true }), 50);
      try {
        await until(() => client.me().x > 430, 3000);
      } finally {
        clearInterval(walking);
        room.send('input', idleInput());
      }
      assert.equal(
        (await quest(client, 'accept', { progress: 5, gold: 999999, characterId: 'other' })).ok,
        true,
      );
      await until(() => !!client.me().quests?.['mira-wolves']);
      assert.equal(client.me().quests!['mira-wolves'].progress, 0);
      assert.equal(client.me().gold, 0);
      assert.equal((await quest(client, 'claim', { progress: 5 })).ok, false);
      assert.equal((await quest(client, 'accept')).ok, false);
      await leave(room);
      await position(c.id, 'woods', 600, 760);
      client = await join(guest.token, c.id, 'woods');
      room = client.room;
      assert.equal((await quest(client, 'claim')).ok, false);
      room.send('auto', true);
      await until(() => client.me().quests?.['mira-wolves']?.progress === 5, 40000);
      room.send('auto', false);
      room.send('input', idleInput());
      await wait(100);
      await leave(room);
      const progress = await db.questProgress.findUniqueOrThrow({
        where: { characterId_questId: { characterId: c.id, questId: 'mira-wolves' } },
      });
      assert.equal(progress.progress, 5);
      assert.equal(progress.claimed, false);
      await position(c.id, 'village', 480, 650);
      client = await join(guest.token, c.id, 'village');
      room = client.room;
      const before = client.me().gold;
      const blades = client.me().inventory['elderwood-blade'] ?? 0;
      // Hold the DB row while claim begins, then disconnect. The room must finish the claim
      // before its leave-save captures the character, or a stale snapshot would erase rewards.
      let locked!: () => void;
      const ready = new Promise<void>((r) => (locked = r));
      const unlock = new Promise<void>((r) => (release = r));
      lock = db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${c.id} FOR UPDATE`;
          locked();
          await unlock;
        },
        { timeout: 10000 },
      );
      await Promise.race([
        ready,
        lock.then(() => {
          throw new Error('Quest row lock ended before it was acquired');
        }),
      ]);
      room.send('quest', { questId: 'mira-wolves', action: 'claim' });
      room.send('quest', { questId: 'mira-wolves', action: 'claim' });
      await wait(120);
      room.connection.close();
      room = undefined;
      await wait(100);
      release?.();
      release = undefined;
      await lock;
      await until(
        async () => !!(await db.questProgress.findUnique({ where: { id: progress.id } }))?.claimed,
      );
      await wait(350);
      client = await join(guest.token, c.id, 'village');
      room = client.room;
      assert.equal(client.me().gold, before + 75);
      assert.equal(client.me().inventory['elderwood-blade'], blades + 1);
      assert.equal(client.me().quests!['mira-wolves'].claimed, true);
      assert.equal((await quest(client, 'claim')).ok, false);
      room.send('equip', 'elderwood-blade');
      await until(() => client.me().weapon === 'elderwood-blade');
      await wait(5400);
      const saved = await db.character.findUniqueOrThrow({ where: { id: c.id } });
      const p = saved.data as unknown as Player;
      assert.equal(p.gold, before + 75);
      assert.equal(p.inventory['elderwood-blade'], blades + 1);
      assert.equal(p.quests!['mira-wolves'].claimed, true);
      await leave(room);
      room = undefined;
    } catch (error) {
      console.error('Quest integration failure', error);
      throw error;
    } finally {
      release?.();
      await lock?.catch(() => {});
      if (room?.connection.isOpen) await room.leave(false).catch(() => {});
      await wait(350);
      if (userId) await db.user.delete({ where: { id: userId } });
      await db.$disconnect();
    }
  },
);
