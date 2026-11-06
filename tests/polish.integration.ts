import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db } from '../apps/server/src/db';
import { changeClass } from '../apps/server/src/classes';
import { SnapshotDecoder, createPlayer, type Player, type Snapshot } from '@ros/shared';
import { QUESTS } from '@ros/game-data';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 12000) throw new Error('Polish integration timed out');
    await pause(30);
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
  const value = await r.json();
  if (!r.ok) throw new Error(value.error);
  return value;
}
test('class choice checks the durable Crystal quest, serializes paid changes, and resource offline claims award once', async () => {
  let userId: string | undefined;
  try {
    const guest = await api('/guest', undefined, {}),
      c = await api('/characters', guest.token, { name: 'PolishTester' });
    userId = c.userId;
    const p = createPlayer(c.id, c.name, 'crystal');
    p.level = 20;
    p.gold = 1000;
    p.quests = { 'crystal-class-trial': { claimed: true, progress: 90 } };
    p.visitedAreas = ['woods', 'crystal'];
    p.gatheringSkills = { Mining: { level: 11, xp: 0 } };
    await db.character.update({
      where: { id: p.id },
      data: { data: JSON.parse(JSON.stringify(p)) },
    });
    await assert.rejects(() => changeClass(p, 'choose', 'mage'), /claim the Crystal/);
    const q = QUESTS['crystal-class-trial'];
    await db.quest.upsert({ where: { id: q.id }, create: { id: q.id, definition: q }, update: {} });
    await db.questProgress.create({
      data: { characterId: p.id, questId: q.id, progress: 90, claimed: true },
    });
    const chosen = await changeClass(p, 'choose', 'mage');
    assert.equal(chosen.classId, 'mage');
    assert.equal(chosen.gold, 1000);
    const changes = await Promise.allSettled([
      changeClass(chosen, 'choose', 'knight'),
      changeClass(chosen, 'choose', 'rogue'),
    ]);
    assert.equal(changes.filter((r) => r.status === 'fulfilled').length, 1);
    const stored = await db.character.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal((stored.data as unknown as Player).gold, 500);
    await api(`/characters/${p.id}/offline`, guest.token, { kind: 'gather:crystal:crystal-mine' });
    await assert.rejects(
      () => api(`/characters/${p.id}/offline`, guest.token, { kind: 'training' }),
      /Claim the current/,
    );
    await db.offlineActivity.update({
      where: { characterId: p.id },
      data: { startedAt: new Date(Date.now() - 3600000) },
    });
    const rewards = await Promise.all([
      api(`/characters/${p.id}/claim`, guest.token, {}),
      api(`/characters/${p.id}/claim`, guest.token, {}),
    ]);
    assert.equal(rewards.filter((r) => r.items?.['crystal-ore'] > 0).length, 1);
    assert.equal(await db.offlineReward.count({ where: { characterId: p.id } }), 1);
    const after = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.ok(after.inventory['crystal-ore'] > 0);
    assert.equal(after.gold, 500);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
  }
});
test('unexpected disconnect reserves and restores the same character without resetting cooldown or accepting duplicate joins', async () => {
  let userId: string | undefined;
  let room: Room | undefined;
  try {
    const guest = await api('/guest', undefined, {}),
      c = await api('/characters', guest.token, { name: 'ReconnectTester' });
    userId = c.userId;
    const client = new Client('ws://localhost:2567');
    room = await client.joinOrCreate('map', {
      token: guest.token,
      characterId: c.id,
      mapId: 'village',
      snapshotProtocol: 1,
    });
    let snapshot: Snapshot | undefined;
    const decoder = new SnapshotDecoder();
    let deltas = 0,
      fullFrames = 0;
    room.onMessage('welcome', () => {});
    room.onMessage('events', () => {});
    room.onMessage('notice', () => {});
    room.onMessage('snapshot', (s: Snapshot) => {
      snapshot = decoder.full(s);
      fullFrames++;
    });
    room.onMessage('snapshotDelta', (d) => {
      snapshot = decoder.delta(d);
      assert.ok(snapshot);
      deltas++;
    });
    await until(() => !!snapshot);
    room.send('input', { skill: true });
    await until(() => !!snapshot?.players.find((p) => p.id === c.id)?.lastSkill);
    const lastSkill = snapshot!.players.find((p) => p.id === c.id)!.lastSkill;
    await until(() => deltas >= 2);
    const framesBefore = fullFrames;
    room.send('snapshotResync');
    await until(() => fullFrames > framesBefore);
    const token = room.reconnectionToken,
      id = room.sessionId;
    const old = room;
    const disconnected = new Promise<void>((resolve) => old.onLeave(() => resolve()));
    const socket = (old.connection as any).transport.ws;
    if (typeof socket.terminate === 'function') socket.terminate();
    else socket.close();
    await disconnected;
    await assert.rejects(
      () => client.joinOrCreate('map', { token: guest.token, characterId: c.id, mapId: 'village' }),
      /already online/,
    );
    room = await client.reconnect(token);
    assert.equal(room.sessionId, id);
    let recovered: Snapshot | undefined;
    const recoveredDecoder = new SnapshotDecoder();
    room.onMessage('welcome', () => {});
    room.onMessage('events', () => {});
    room.onMessage('notice', () => {});
    room.onMessage('snapshot', (s: Snapshot) => {
      recovered = recoveredDecoder.full(s);
    });
    room.onMessage('snapshotDelta', (d) => {
      recovered = recoveredDecoder.delta(d);
      assert.ok(recovered);
    });
    await until(() => !!recovered?.players.some((p) => p.id === c.id));
    const hero = recovered!.players.find((p) => p.id === c.id)!;
    assert.equal(hero.auto, false);
    assert.equal(hero.lastSkill, lastSkill);
    assert.ok(hero.mp < 50);
    assert.equal(hero.gold, snapshot!.players.find((p) => p.id === c.id)!.gold);
    await room.leave();
    room = undefined;
    await pause(100);
  } finally {
    await room?.leave().catch(() => {});
    if (userId) await db.user.delete({ where: { id: userId } });
  }
});

test.after(() => db.$disconnect());
