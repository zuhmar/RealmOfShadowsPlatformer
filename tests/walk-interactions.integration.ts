import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { MAPS, HOUSE_LAYOUTS } from '@ros/game-data';
import { createPlayer, type Player, type Snapshot } from '@ros/shared';
import { db, json, session } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean, timeout = 20000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeout) throw Error('Approach timed out');
    await pause(25);
  }
}
async function fixture(mapId: string, configure: (p: Player) => void = () => {}) {
  const u = await db.user.create({ data: {} }),
    p = createPlayer('fixture', 'Walker', mapId);
  p.level = 40;
  p.hp = 10000;
  configure(p);
  const row = await db.character.create({ data: { userId: u.id, name: p.name, data: json(p) } });
  p.id = row.id;
  if (mapId.startsWith('house-')) p.houseOwnerId = p.id;
  await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
  const room = await new Client('ws://localhost:2567').create('map', {
    token: await session(u.id),
    characterId: p.id,
    mapId,
    houseOwnerId: p.houseOwnerId,
  });
  const state: {
    snapshot?: Snapshot;
    npcs: string[];
    chests: string[];
    notices: string[];
    travel?: string;
  } = { npcs: [], chests: [], notices: [] };
  for (const n of ['welcome', 'events', 'chat']) room.onMessage(n, () => {});
  room.onMessage('snapshot', (s: Snapshot) => (state.snapshot = s));
  room.onMessage('npc', (v: { id: string }) => state.npcs.push(v.id));
  room.onMessage('chest', (v: { id: string }) => state.chests.push(v.id));
  room.onMessage('notice', (v: string) => state.notices.push(v));
  room.onMessage('travel', (v: string) => (state.travel = v));
  await until(() => !!state.snapshot);
  return {
    p,
    room,
    state,
    me: () => state.snapshot!.players.find((q) => q.id === p.id)!,
    close: async () => {
      if (room.connection.isOpen) await room.leave().catch(() => {});
      await pause(150);
      await db.user.delete({ where: { id: u.id } });
    },
  };
}
test('NPC clicks walk physically before opening; manual input cancels and a new click replaces the route', async () => {
  const t = await fixture('village');
  try {
    const start = t.me().x;
    t.room.send('approach', { kind: 'npc', id: 'bram' });
    await until(() => t.state.notices.some((n) => n.includes('Walking to')));
    assert.deepEqual(t.state.npcs, []);
    await until(() => Math.abs(t.me().x - start) > 20);
    t.room.send('input', { left: true });
    await pause(150);
    t.room.send('input', {});
    const stopped = t.me().x;
    await pause(350);
    assert.ok(Math.abs(t.me().x - stopped) < 12);
    assert.deepEqual(t.state.npcs, []);
    t.room.send('approach', { kind: 'npc', id: 'bram' });
    t.room.send('approach', { kind: 'npc', id: 'mira' });
    await until(() => t.state.npcs.includes('mira'));
    assert.deepEqual(t.state.npcs, ['mira']);
    const mira = MAPS.village.npcs.find((n) => n.id === 'mira')!;
    assert.ok(Math.abs(t.me().x - mira.x) <= 50);
  } finally {
    await t.close();
  }
});
test('resource clicks climb ladders and start continuous gathering only on the node platform', async () => {
  const t = await fixture('woods');
  try {
    const node = MAPS.woods.resources!.find((n) => n.skill === 'Mining')!;
    assert.notEqual(t.me().platform, node.platform);
    t.room.send('approach', { kind: 'resource', id: node.id });
    await pause(200);
    assert.equal(t.me().gathering, undefined);
    await until(() => t.me().gathering?.nodeId === node.id);
    assert.equal(t.me().platform, node.platform);
    assert.ok(Math.abs(t.me().x - node.x) <= 26);
    assert.equal(t.me().auto, false);
  } finally {
    await t.close();
  }
});
test('a chest on an upper house floor opens only after walking and climbing to it', async () => {
  const t = await fixture('house-medium', (p) => {
    p.housing = {
      size: 'medium',
      stage: 3,
      invited: [],
      furniture: [{ id: 'upper', item: 'oak-chest', x: 0, floor: 1 }],
    };
  });
  try {
    t.room.send('approach', { kind: 'chest', id: 'upper' });
    await pause(200);
    assert.deepEqual(t.state.chests, []);
    await until(() => t.state.chests.includes('upper'));
    assert.equal(t.me().y, HOUSE_LAYOUTS.medium.floors[1]);
    assert.ok(Math.abs(t.me().x - HOUSE_LAYOUTS.medium.width / 2) <= 50);
    t.room.send('approach', { kind: 'house-exit' });
    await until(() => t.state.travel === 'village');
    const saved = (await db.character.findUniqueOrThrow({ where: { id: t.p.id } }))
      .data as unknown as Player;
    assert.equal(saved.mapId, 'village');
    assert.equal(saved.housing!.furniture.length, 1);
  } finally {
    await t.close();
  }
  await db.$disconnect();
});
