import test from 'node:test';
import assert from 'node:assert/strict';
import { createGear, type Player } from '@ros/shared';
import { changeEquipment } from '../apps/server/src/equipment';
import { db } from '../apps/server/src/db';
test('identification locks gold and rolls once across duplicate or stale requests', async () => {
  let userId: string | undefined;
  try {
    const guest = await fetch('http://localhost:2567/api/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const c = await fetch('http://localhost:2567/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'AtomicIdentifier', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    userId = c.userId;
    const p = c.data as Player;
    p.gear = [createGear('woods-armor', 1, () => 0.999)];
    p.gold = 1000;
    await db.character.update({
      where: { id: c.id },
      data: { data: JSON.parse(JSON.stringify(p)) },
    });
    const results = await Promise.allSettled([
      changeEquipment(structuredClone(p), p.gear[0].id),
      changeEquipment(structuredClone(p), p.gear[0].id),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const saved = (await db.character.findUniqueOrThrow({ where: { id: c.id } }))
      .data as unknown as Player;
    assert.equal(saved.gold, 500);
    assert.equal(Object.keys(saved.gear![0].attributes!).length, 4);
    await assert.rejects(() => changeEquipment(saved, saved.gear![0].id));
    await assert.rejects(() => changeEquipment(saved, 'unowned'));
    const after = (await db.character.findUniqueOrThrow({ where: { id: c.id } })).data;
    assert.deepEqual(after, saved);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
