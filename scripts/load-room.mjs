import { Client } from 'colyseus.js';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { db } from '../apps/server/src/db.ts';
import { createPlayer, createCraftedGear } from '../packages/shared/src/index.ts';
import { ISLAND_EQUIPMENT } from '../packages/game-data/src/index.ts';
const users = [],
  rooms = [],
  counts = new Map(),
  intervals = [];
let bytes = 0,
  total = 0,
  previous = 0;
async function api(path, token, body) {
  const r = await fetch(`http://localhost:2567/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const client = new Client('ws://localhost:2567');
  for (let account = 0; account < 8; account++) {
    const guest = await api('/guest', undefined, {});
    for (let slot = 0; slot < 3; slot++) {
      const n = account * 3 + slot,
        c = await api('/characters', guest.token, { name: `Loadhero ${n}` });
      if (!slot) users.push(c.userId);
      const p = createPlayer(c.id, c.name, 'crystal');
      Object.assign(p, {
        level: 20,
        hp: 328,
        appearance: n % 2 ? 'female' : 'male',
        outfit: ['sage', 'ember', 'tide'][n % 3],
        classId: ['knight', 'archer', 'mage', 'rogue'][n % 4],
        weapon: `crystal-${['sword', 'bow', 'staff', 'dagger'][n % 4]}`,
        visitedAreas: ['village', 'woods', 'crystal'],
        unlockedIslands: ['crystal'],
        bossKills: { 'forest-bear': 1 },
        inventory: { 'iron-ore': 1000, 'crystal-ore': 1000, 'oak-logs': 1000 },
        gear: ISLAND_EQUIPMENT.map((g) => createCraftedGear(g.id)),
      });
      await db.character.update({
        where: { id: p.id },
        data: { data: JSON.parse(JSON.stringify(p)) },
      });
      const room = await client.joinOrCreate('map', {
        token: guest.token,
        characterId: c.id,
        mapId: 'crystal',
      });
      rooms.push(room);
      counts.set(room.sessionId, 0);
      for (const type of ['welcome', 'events', 'notice', 'chat']) room.onMessage(type, () => {});
      room.onMessage('snapshot', (s) => {
        counts.set(room.sessionId, counts.get(room.sessionId) + 1);
        bytes += Buffer.byteLength(JSON.stringify(s));
        total++;
        if (room === rooms[0]) {
          const now = performance.now();
          if (previous) intervals.push(now - previous);
          previous = now;
        }
      });
      room.send('auto', true);
    }
  }
  assert.equal(new Set(rooms.map((r) => r.roomId)).size, 1);
  await pause(12000);
  const sorted = intervals.slice(-180).sort((a, b) => a - b),
    p95 = sorted[Math.floor(sorted.length * 0.95)];
  const report = {
    clients: rooms.length,
    roomId: rooms[0].roomId,
    minSnapshots: Math.min(...counts.values()),
    snapshotIntervalP95Ms: +p95.toFixed(2),
    averageSnapshotBytes: Math.round(bytes / total),
    measurementSeconds: 12,
    scope:
      'One local 24-client room with 10 monsters and large gear inventories. Not a production capacity or physical-phone test.',
  };
  assert.equal(rooms.length, 24);
  assert.ok(report.minSnapshots >= 100);
  assert.ok(p95 < 250, `Snapshot p95 ${p95} ms`);
  assert.ok(report.averageSnapshotBytes < 50000);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/room-load.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Promise.allSettled(
    rooms.map(
      (room) =>
        new Promise((resolve) => {
          const t = setTimeout(resolve, 10000);
          room.onMessage('saved', () => {
            clearTimeout(t);
            resolve();
          });
          try {
            room.send('logout', null);
          } catch {
            clearTimeout(t);
            resolve();
          }
        }),
    ),
  );
  await Promise.allSettled(rooms.map((r) => r.leave()));
  for (const id of users) await db.user.delete({ where: { id } });
  await db.$disconnect();
}
