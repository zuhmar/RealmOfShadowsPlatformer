import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { db, json } from '../apps/server/src/db';
import { MAPS, QUESTS } from '@ros/game-data';
import { createPlayer, idleInput, SnapshotDecoder, type Player, type Snapshot } from '@ros/shared';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > 10000) throw new Error('Cutscene flow timed out');
    await pause(25);
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
test('story receipt persists, watching blocks controls, skipping restores play, duplicate starts fail and hub replay is safe', async () => {
  let uid: string | undefined, room: Room | undefined;
  try {
    const guest = await api('/guest'),
      row = await api('/characters', guest.token, { name: 'FilmTester' });
    uid = row.userId;
    const p = createPlayer(row.id, row.name, 'village'),
      n = MAPS.village.npcs.find((n) => n.id === 'mira')!;
    Object.assign(p, { x: n.x, y: n.y });
    await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
    await db.quest.upsert({
      where: { id: 'mira-wolves' },
      create: { id: 'mira-wolves', definition: QUESTS['mira-wolves'] },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: p.id, questId: 'mira-wolves', progress: 0, claimed: false },
    });
    room = await new Client('ws://localhost:2567').joinOrCreate('map', {
      token: guest.token,
      characterId: p.id,
      mapId: 'village',
      snapshotProtocol: 1,
    });
    const decoder = new SnapshotDecoder();
    let snapshot: Snapshot | undefined;
    room.onMessage('snapshot', (s) => {
      snapshot = decoder.full(s);
    });
    room.onMessage('snapshotDelta', (d) => {
      const s = decoder.delta(d);
      if (s) snapshot = s;
      else room!.send('snapshotResync');
    });
    for (const name of ['welcome', 'events', 'notice', 'chat']) room.onMessage(name, () => {});
    const me = () => snapshot!.players.find((q) => q.id === p.id)!;
    await until(() => !!snapshot);
    room.send('cutscene', { action: 'start', id: 'chapter-celestial' });
    await pause(200);
    assert.equal(me().cinematic, undefined);
    room.send('cutscene', { action: 'start', id: 'chapter-woods' });
    await until(() => me().cinematic?.id === 'chapter-woods');
    const x = me().x,
      gold = me().gold,
      hp = me().hp;
    for (let i = 0; i < 6; i++) {
      room.send('input', { ...idleInput(), right: true, attack: true, skill: true });
      await pause(75);
    }
    assert.equal(me().x, x);
    assert.equal(me().hp, hp);
    assert.equal(me().lastAttack, 0);
    assert.equal(me().gold, gold);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.ok(saved.seenCutscenes?.includes('chapter-woods'));
    assert.equal(saved.cinematic, undefined);
    room.send('cutscene', { action: 'finish', id: 'wrong-id' });
    await pause(100);
    assert.ok(me().cinematic);
    room.send('input', idleInput());
    room.send('cutscene', { action: 'finish', id: 'chapter-woods' });
    await until(() => !me().cinematic);
    room.send('cutscene', { action: 'start', id: 'chapter-woods' });
    await pause(200);
    assert.equal(me().cinematic, undefined);
    room.send('cutscene', { action: 'start', id: 'chapter-woods', replay: true });
    await until(() => !!me().cinematic?.replay);
    room.send('cutscene', { action: 'finish', id: 'chapter-woods' });
    await until(() => !me().cinematic);
    room.send('input', { ...idleInput(), right: true });
    await until(() => me().x > x);
    room.send('input', idleInput());
    assert.equal(me().seenCutscenes!.filter((id) => id === 'chapter-woods').length, 1);
    console.log(
      'Live cutscene: gated chapter, persistent once-only receipt, combat/input freeze, finish validation, skip, safe hub replay and restored movement passed.',
    );
  } finally {
    if (room) {
      await Promise.race([room.leave().catch(() => {}), pause(500)]);
      room.connection.close();
    }
    await pause(200);
    if (uid) await db.user.delete({ where: { id: uid } });
    await db.$disconnect();
  }
});
