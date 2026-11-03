import { identifyGear, type Player } from '@ros/shared';
import { db, json } from './db.js';
export async function changeEquipment(snapshot: Player, id: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${snapshot.id} FOR UPDATE`;
    const stored = await tx.character.findUniqueOrThrow({ where: { id: snapshot.id } });
    const revision = (stored.data as unknown as Player).equipmentRevision ?? 0;
    if ((snapshot.equipmentRevision ?? 0) !== revision)
      throw new Error('Equipment changed. Reconnect and try again.');
    const next = structuredClone(snapshot);
    identifyGear(next, id);
    next.equipmentRevision = revision + 1;
    await tx.character.update({ where: { id: snapshot.id }, data: { data: json(next) } });
    return next;
  });
}
