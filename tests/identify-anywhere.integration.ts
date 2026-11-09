import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, type Room } from 'colyseus.js';
import { createPlayer, createGear, type Player, type Snapshot } from '@ros/shared';
import { db, session, json } from '../apps/server/src/db';
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean) {
  const end = Date.now() + 8000;
  while (!fn()) {
    if (Date.now() > end) throw new Error('Identification check timed out');
    await pause(25);
  }
}
test('identification RPC works while hunting, charges once, rejects insufficient gold; shop stays at Bram', async () => {
  let userId: string | undefined, room: Room | undefined;
  try {
    const u = await db.user.create({ data: {} });
    userId = u.id;
    const p = createPlayer('fixture', 'FieldIdentifier', 'woods');
    p.gold = 75;
    p.gear = [createGear('woods-sword', 1, () => 0.999), createGear('woods-helmet', 1, () => 0)];
    const c = await db.character.create({ data: { userId: u.id, name: p.name, data: json(p) } });
    p.id = c.id;
    await db.character.update({ where: { id: c.id }, data: { data: json(p) } });
    room = await new Client('ws://localhost:2567').create('map', {
      mapId: 'woods',
      characterId: p.id,
      token: await session(u.id),
    });
    let snap: Snapshot | undefined;
    const notices: string[] = [];
    for (const name of ['welcome', 'events', 'chat']) room.onMessage(name, () => {});
    room.onMessage('snapshot', (s: Snapshot) => (snap = s));
    room.onMessage('notice', (s: string) => notices.push(s));
    const hero = () => snap?.players.find((p) => p.id === c.id);
    await until(() => !!hero());
    room.send('identify', p.gear[0].id);
    room.send('identify', p.gear[0].id);
    await until(() => hero()?.gear?.[0].identified === true);
    assert.equal(hero()!.gold, 0);
    assert.equal(hero()!.gear![0].rarity, 'Legendary');
    assert.equal(Object.keys(hero()!.gear![0].attributes!).length, 4);
    room.send('identify', p.gear[1].id);
    await until(() => notices.some((n) => n.includes('75 gold')));
    assert.equal(hero()!.gear![1].identified, false);
    assert.equal(hero()!.gold, 0);
    room.send('sellGear', p.gear[0].id);
    await until(() => notices.some((n) => n.includes('Visit Bram')));
    assert.equal(hero()!.gear!.length, 2);
    await room.leave(true);
    room = undefined;
    await pause(100);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.gear?.[0].identified, true);
    assert.equal(saved.gear?.[1].identified, false);
    assert.equal(saved.gold, 0);
  } finally {
    if (room?.connection.isOpen) await room.leave(true);
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
