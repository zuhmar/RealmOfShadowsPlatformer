import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS } from '@ros/game-data';
import { createPlayer, advanceQuests, World, type Player } from '@ros/shared';
import { MAPS } from '@ros/game-data';
import { db, save, json } from '../apps/server/src/db';
import { changeQuest } from '../apps/server/src/quests';
test('progressive quest gates and exactly-once turn-ins survive saves', async () => {
  let userId: string | undefined;
  try {
    const user = await db.user.create({ data: { guest: true } });
    userId = user.id;
    const character = await db.character.create({
      data: {
        userId: user.id,
        name: 'QuestChain',
        data: json(createPlayer('', 'QuestChain', 'village')),
      },
    });
    let p = createPlayer(character.id, 'QuestChain', 'village');
    p.quests = { 'mira-wolves': { progress: 5, claimed: true, trialKitClaimed: true } };
    await db.quest.upsert({
      where: { id: 'mira-wolves' },
      create: { id: 'mira-wolves', definition: QUESTS['mira-wolves'] },
      update: {},
    });
    await db.questProgress.create({
      data: { characterId: p.id, questId: 'mira-wolves', progress: 5, claimed: true },
    });
    await save(p);
    await assert.rejects(() => changeQuest(p, 'mira-boars', 'accept'), /previous/);
    p = await changeQuest(p, 'mira-spiders', 'accept');
    for (let i = 0; i < 29; i++) advanceQuests(p, 'thorn-spider', 'woods-2');
    await save(p);
    await assert.rejects(() => changeQuest(p, 'mira-spiders', 'claim'), /Finish/);
    advanceQuests(p, 'thorn-spider', 'woods-2');
    await save(p);
    const claims = await Promise.allSettled([
      changeQuest(structuredClone(p), 'mira-spiders', 'claim'),
      changeQuest(structuredClone(p), 'mira-spiders', 'claim'),
    ]);
    assert.equal(claims.filter((c) => c.status === 'fulfilled').length, 1);
    p = (await db.character.findUniqueOrThrow({ where: { id: p.id } })).data as unknown as Player;
    assert.equal(p.gold, 100);
    assert.equal(p.inventory.greenleaf, 5);
    p = await changeQuest(p, 'mira-boars', 'accept');
    for (let i = 0; i < 60; i++) advanceQuests(p, 'wild-boar', 'woods-3');
    await save(p);
    p = await changeQuest(p, 'mira-boars', 'claim');
    assert.equal(p.gold, 300);
    assert.equal(p.inventory['forest-bear-key'], 1);
    p = await changeQuest(p, 'mira-bear', 'accept');
    for (let i = 0; i < 3; i++) {
      const world = new World(MAPS['woods-boss']);
      world.hitWolf(p, world.wolves[0], 10000, 10000 + i);
    }
    await save(p);
    p = await changeQuest(p, 'mira-bear', 'claim');
    assert.equal(p.gold, 900);
    assert.equal(p.inventory['forest-bear-trophy'], 1);
    assert.ok(p.unlockedIslands?.includes('crystal'));
    await assert.rejects(() => changeQuest(p, 'mira-bear', 'claim'));
    const stored = (await db.character.findUniqueOrThrow({ where: { id: p.id } }))
      .data as unknown as Player;
    assert.equal(stored.gold, 900);
    assert.equal(stored.quests?.['mira-bear'].claimed, true);
    assert.equal(stored.inventory['forest-bear-trophy'], 1);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  }
});
