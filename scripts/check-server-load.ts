import { Client, type Room } from 'colyseus.js';
import { createPlayer, SnapshotDecoder } from '@ros/shared';
import { db, json, session, save } from '../apps/server/src/db';
import { QUESTS } from '@ros/game-data';
import { writeFile, mkdir } from 'node:fs/promises';
const rooms: Room[] = [];
let userId: string | undefined;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
try {
  const user = await db.user.create({ data: {} });
  userId = user.id;
  const token = await session(user.id),
    sdk = new Client('ws://localhost:2567');
  const counts = Array.from({ length: 24 }, () => ({ messages: 0, bytes: 0, players: 0 }));
  const characters = [];
  for (let i = 0; i < 24; i++) {
    const p = createPlayer('fixture', `Load${i}`, 'frostfall-3');
    Object.assign(p, {
      level: 40,
      hp: 10000,
      classId: 'mage',
      weapon: 'frost-staff',
      x: 400 + i * 70,
      bossKills: { hydra: 1 },
    });
    const row = await db.character.create({ data: { userId, name: p.name, data: json(p) } });
    p.id = row.id;
    await db.character.update({ where: { id: row.id }, data: { data: json(p) } });
    characters.push(p);
    const room = i
      ? await sdk.joinById(rooms[0].roomId, { token, characterId: row.id, snapshotProtocol: 1 })
      : await sdk.create('map', {
          token,
          characterId: row.id,
          mapId: p.mapId,
          snapshotProtocol: 1,
        });
    rooms.push(room);
    const decoder = new SnapshotDecoder();
    for (const name of ['welcome', 'events', 'chat', 'notice']) room.onMessage(name, () => {});
    const receive = (type: 'snapshot' | 'snapshotDelta', value: any) => {
      counts[i].messages++;
      counts[i].bytes += JSON.stringify(value).length;
      const snap = type === 'snapshot' ? decoder.full(value) : decoder.delta(value);
      if (!snap) room.send('snapshotResync');
      else counts[i].players = snap.players.length;
    };
    room.onMessage('snapshot', (v) => receive('snapshot', v));
    room.onMessage('snapshotDelta', (v) => receive('snapshotDelta', v));
    room.send('auto', true);
  }
  await pause(1000);
  counts.forEach((c) => {
    c.messages = 0;
    c.bytes = 0;
  });
  const started = performance.now();
  await pause(10_000);
  const seconds = (performance.now() - started) / 1000;
  if (counts.some((c) => c.players !== 24 || c.messages < 80))
    throw Error('Room did not sustain 24 participants and regular snapshots');
  const result: any = {
    players: 24,
    measuredSeconds: +seconds.toFixed(2),
    minUpdatesPerSecond: +(Math.min(...counts.map((c) => c.messages)) / seconds).toFixed(1),
    maxUpdatesPerSecond: +(Math.max(...counts.map((c) => c.messages)) / seconds).toFixed(1),
    aggregateJsonKiBPerSecond: +(counts.reduce((n, c) => n + c.bytes, 0) / 1024 / seconds).toFixed(
      1,
    ),
    scope:
      'Local 24-player WebSocket room with AUTO combat and normal five-second saves; not an internet bandwidth or production capacity guarantee.',
  };
  for (const room of rooms) await room.leave();
  rooms.length = 0;
  await pause(200);
  // Measure saves after quest completion: completed ledgers need no progress UPDATEs.
  const p = characters[0];
  p.quests = Object.fromEntries(
    Object.entries(QUESTS).map(([id, q]) => [id, { progress: q.target.count, claimed: true }]),
  );
  const times = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await save(p);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  result.completedQuestSaveMedianMs = +times[5].toFixed(2);
  result.completedQuestSaveP95Ms = +times[9].toFixed(2);
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/server-load.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  for (const room of rooms) if (room.connection.isOpen) await room.leave().catch(() => {});
  await pause(200);
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
}
