import { provisionAction, type Player } from '@ros/shared';
import { db, json } from './db.js';
export async function changeProvision(snapshot: Player, action: 'craft' | 'use', id: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id=${snapshot.id} FOR UPDATE`;
    const stored = await tx.character.findUniqueOrThrow({ where: { id: snapshot.id } });
    const revision = (stored.data as unknown as Player).provisionRevision ?? 0;
    if ((snapshot.provisionRevision ?? 0) !== revision)
      throw new Error('Recipe state changed. Reconnect and try again.');
    const next = structuredClone(snapshot);
    const message = provisionAction(next, action, id);
    next.provisionRevision = revision + 1;
    await tx.character.update({ where: { id: next.id }, data: { data: json(next) } });
    return { next, message };
  });
}
