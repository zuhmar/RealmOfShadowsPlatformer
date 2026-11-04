import { WOODS_QUESTS as WOODS_ONLY, CRYSTAL_QUESTS } from '@ros/game-data';
import type { Player } from '@ros/shared';
import { db, json } from './db.js';
const WOODS_QUESTS = { ...WOODS_ONLY, ...CRYSTAL_QUESTS };
type WoodsQuestId = keyof typeof WOODS_QUESTS;
export async function changeWoodsQuest(
  snapshot: Player,
  id: WoodsQuestId,
  action: 'accept' | 'claim',
) {
  const quest = WOODS_QUESTS[id];
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const next = structuredClone(snapshot);
    next.quests ??= {};
    const row = await tx.questProgress.findUnique({
      where: { characterId_questId: { characterId: next.id, questId: id } },
    });
    if (action === 'accept') {
      if (row) throw new Error('You already accepted this quest.');
      const prior = await tx.questProgress.findUnique({
        where: { characterId_questId: { characterId: next.id, questId: quest.prerequisite } },
      });
      if (!prior?.claimed) throw new Error('Complete and turn in the previous quest first.');
      await tx.quest.upsert({ where: { id }, create: { id, definition: quest }, update: {} });
      await tx.questProgress.create({
        data: { characterId: next.id, questId: id, progress: 0, claimed: false },
      });
      next.quests[id] = { progress: 0, claimed: false };
    } else {
      if (!row || row.claimed)
        throw new Error('Accept this quest first, or its reward was already claimed.');
      if (
        row.progress < quest.target.count ||
        (next.quests[id]?.progress ?? 0) < quest.target.count
      )
        throw new Error('Finish the quest objective, then return to the quest giver.');
      const claimed = await tx.questProgress.updateMany({
        where: { id: row.id, claimed: false, progress: { gte: quest.target.count } },
        data: { claimed: true },
      });
      if (claimed.count !== 1) throw new Error('Reward already claimed.');
      next.gold += quest.reward.gold;
      for (const item of quest.reward.items)
        next.inventory[item.itemId] = (next.inventory[item.itemId] ?? 0) + item.quantity;
      next.quests[id] = { progress: quest.target.count, claimed: true };
    }
    await tx.character.update({ where: { id: next.id }, data: { data: json(next) } });
    return next;
  });
}
