import test from 'node:test';
import assert from 'node:assert/strict';
import { changeForge } from '../apps/server/src/forge';
import { db } from '../apps/server/src/db';
import type { Player } from '@ros/shared';
const base = 'http://localhost:2567';
test('forge transactions reject stale parallel crafts and cannot repeat claimed rewards', async () => {
  let userId: string | undefined;
  try {
    const guest = await fetch(`${base}/api/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => r.json());
    const result = await fetch(`${base}/api/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${guest.token}` },
      body: JSON.stringify({ name: 'AtomicSmith', appearance: 'male', outfit: 'sage' }),
    }).then((r) => r.json());
    const character = result;
    assert.ok(character?.id, JSON.stringify(result));
    userId = character.userId;
    let p = character.data as Player;
    p.inventory = { 'iron-ore': 100, 'oak-logs': 20 };
    p.x = 900;
    p.y = 650;
    await db.character.update({
      where: { id: character.id },
      data: { data: JSON.parse(JSON.stringify(p)) },
    });
    p = (await changeForge(p, 'accept')).next;
    const attempts = await Promise.allSettled([
      changeForge(structuredClone(p), 'craft', 'iron-bar'),
      changeForge(structuredClone(p), 'craft', 'iron-bar'),
    ]);
    assert.equal(attempts.filter((a) => a.status === 'fulfilled').length, 1);
    const saved = await db.character.findUniqueOrThrow({ where: { id: p.id } });
    p = saved.data as unknown as Player;
    assert.equal(p.inventory['iron-ore'], 80);
    assert.equal(p.inventory['iron-bar'], 1);
    for (let i = 1; i < 5; i++) p = (await changeForge(p, 'craft', 'iron-bar')).next;
    p = (await changeForge(p, 'craft', 'iron-pickaxe')).next;
    assert.equal(p.equippedTools?.Mining, undefined);
    p = (await changeForge(p, 'claim')).next;
    const before = structuredClone(p);
    await assert.rejects(() => changeForge(p, 'claim'));
    const final = await db.character.findUniqueOrThrow({ where: { id: p.id } });
    assert.deepEqual(final.data, before);
    assert.equal(p.gold, 25);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
