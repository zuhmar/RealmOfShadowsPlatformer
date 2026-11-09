import { changeHousing, type Player } from '@ros/shared';
import { db, json } from './db.js';
export async function persistHousing(
  snapshot: Player,
  action: Parameters<typeof changeHousing>[1],
) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const stored = await tx.character.findUniqueOrThrow({ where: { id: snapshot.id } });
    if (
      ((stored.data as unknown as Player).housingRevision ?? 0) !== (snapshot.housingRevision ?? 0)
    )
      throw new Error('Housing changed. Reconnect before building again.');
    const next = structuredClone(snapshot);
    delete next.housingView;
    changeHousing(next, action);
    await tx.character.update({ where: { id: next.id }, data: { data: json(next) } });
    return next;
  });
}
