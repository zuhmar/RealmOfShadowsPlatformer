import { Prisma } from '@prisma/client';
import { QUESTS } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { db, json } from './db.js';
export async function changeQuest(
  snapshot: Player,
  questId: keyof typeof QUESTS,
  action: 'accept' | 'claim',
) {
  const quest = QUESTS[questId];
  const next = structuredClone(snapshot);
  const states = (next.quests ??= {});
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const row = await tx.questProgress.findUnique({
      where: { characterId_questId: { characterId: snapshot.id, questId } },
    });
    if (action === 'accept') {
      if (row) throw new Error('You have already accepted this quest.');
      await tx.quest.upsert({
        where: { id: questId },
        create: {
          id: questId,
          definition: JSON.parse(JSON.stringify(quest)) as Prisma.InputJsonValue,
        },
        update: {},
      });
      await tx.questProgress.create({
        data: { characterId: snapshot.id, questId, progress: 0, claimed: false },
      });
      states[questId] = { progress: 0, claimed: false };
    } else {
      if (!row) throw new Error('Speak with Mira and accept the quest first.');
      if (row.claimed) throw new Error('You have already claimed this reward.');
      if (
        row.progress < quest.target.count ||
        (states[questId]?.progress ?? 0) < quest.target.count
      )
        throw new Error('Defeat five Wolves after accepting the quest, then return to Mira.');
      const claimed = await tx.questProgress.updateMany({
        where: { id: row.id, claimed: false, progress: { gte: quest.target.count } },
        data: { claimed: true },
      });
      if (claimed.count !== 1) throw new Error('You have already claimed this reward.');
      next.gold += quest.reward.gold;
      for (const item of quest.reward.items)
        next.inventory[item.itemId] = (next.inventory[item.itemId] ?? 0) + item.quantity;
      states[questId] = { progress: quest.target.count, claimed: true };
    }
    await tx.character.update({ where: { id: next.id }, data: { data: json(next) } });
    return next;
  });
}
