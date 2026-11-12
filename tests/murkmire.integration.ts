import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, MURKMIRE_QUESTS } from '@ros/game-data';
import { createPlayer, advanceQuests, type Player } from '@ros/shared';
import { db, save, json } from '../apps/server/src/db';
import { changeQuest } from '../apps/server/src/quests';
test('Murkmire quest chain persists and only one concurrent claim grants the key', async () => {
  let userId: string | undefined;
  try {
    const user = await db.user.create({ data: { guest: true } });
    userId = user.id;
    const row = await db.character.create({
      data: { userId, name: 'MireQuest', data: json(createPlayer('', 'MireQuest', 'murkmire')) },
    });
    let p = createPlayer(row.id, 'MireQuest', 'murkmire');
    p.level = 30;
    await assert.rejects(() => changeQuest(p, 'murkmire-slimes', 'accept'), /previous/);
    await db.quest.upsert({
      where: { id: 'crystal-wyrm' },
      create: { id: 'crystal-wyrm', definition: QUESTS['crystal-wyrm'] },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: p.id, questId: 'crystal-wyrm', progress: 1, claimed: true },
    });
    p.quests = { 'crystal-wyrm': { progress: 1, claimed: true } };
    await save(p);
    for (const q of Object.values(MURKMIRE_QUESTS)) {
      p = await changeQuest(p, q.id, 'accept');
      for (let i = 0; i < q.target.count - 1; i++)
        advanceQuests(p, q.target.monsterId, q.target.mapId);
      await save(p);
      await assert.rejects(() => changeQuest(p, q.id, 'claim'), /Finish/);
      advanceQuests(p, q.target.monsterId, q.target.mapId);
      await save(p);
      const results = await Promise.allSettled([
        changeQuest(structuredClone(p), q.id, 'claim'),
        changeQuest(structuredClone(p), q.id, 'claim'),
      ]);
      assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
      p = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data as unknown as Player;
      assert.equal(p.quests?.[q.id]?.claimed, true);
    }
    assert.equal(p.inventory['murkmire-boss-key'], 1);
    assert.equal(p.inventory.bogwood, 30);
    assert.equal(p.gold, 6000);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
