import { chooseClass, trainClassTalent, type Player } from '@ros/shared';
import { CLASS_PATHS } from '@ros/game-data';
import { db, json } from './db.js';
export async function changeClass(snapshot: Player, action: 'choose' | 'talent', id: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const stored = await tx.character.findUniqueOrThrow({ where: { id: snapshot.id } });
    if (((stored.data as unknown as Player).classRevision ?? 0) !== (snapshot.classRevision ?? 0))
      throw new Error('Class changed. Reconnect and try again.');
    const next = structuredClone(snapshot);
    if (action === 'choose') {
      const trial = await tx.questProgress.findUnique({
        where: { characterId_questId: { characterId: next.id, questId: 'crystal-class-trial' } },
      });
      if (!trial?.claimed)
        throw new Error('Complete and claim the Crystal Caverns class trial first.');
    }
    if (action === 'choose') chooseClass(next, id);
    else trainClassTalent(next, id);
    await tx.character.update({
      where: { id: next.id },
      data: { data: json(next), class: next.classId ? CLASS_PATHS[next.classId].name : 'Citizen' },
    });
    return next;
  });
}
