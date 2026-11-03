import { BRAM_QUEST } from '@ros/game-data';
import { forgeAction, type Player } from '@ros/shared';
import { db, json } from './db.js';
export async function changeForge(
  snapshot: Player,
  action: 'accept' | 'craft' | 'claim',
  recipeId?: string,
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const ledger = await tx.questProgress.findUnique({
      where: { characterId_questId: { characterId: snapshot.id, questId: BRAM_QUEST.id } },
    });
    if (action === 'accept' && ledger) throw new Error('You already accepted Bram’s quest.');
    if (action !== 'accept' && !ledger) throw new Error('Accept Bram’s quest first.');
    const stored = await tx.character.findUniqueOrThrow({ where: { id: snapshot.id } });
    const revision = (stored.data as unknown as Player).forgeRevision ?? 0;
    if ((snapshot.forgeRevision ?? 0) !== revision)
      throw new Error('Crafting state changed. Reconnect and try again.');
    const next = structuredClone(snapshot);
    next.forgeRevision = revision + 1;
    if (ledger?.claimed && next.forgeQuest) next.forgeQuest.claimed = true;
    const message = forgeAction(next, action, recipeId);
    if (action === 'accept') {
      await tx.quest.upsert({
        where: { id: BRAM_QUEST.id },
        create: { id: BRAM_QUEST.id, definition: BRAM_QUEST },
        update: {},
      });
      await tx.questProgress.create({
        data: { characterId: snapshot.id, questId: BRAM_QUEST.id, progress: 0, claimed: false },
      });
    }
    if (action === 'claim') {
      const result = await tx.questProgress.updateMany({
        where: { characterId: snapshot.id, questId: BRAM_QUEST.id, claimed: false },
        data: { claimed: true, progress: 1 },
      });
      if (result.count !== 1) throw new Error('You already claimed this reward.');
    }
    await tx.character.update({ where: { id: snapshot.id }, data: { data: json(next) } });
    return { next, message };
  });
}
