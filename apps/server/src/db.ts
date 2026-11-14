import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { type Player } from '@ros/shared';
import { QUESTS, CLASS_PATHS } from '@ros/game-data';
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
export const activeCharacters = new Set<string>();
export const hash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function session(userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.session.create({
    data: { id: hash(token), userId, expiresAt: new Date(Date.now() + 30 * 86400000) },
  });
  return token;
}
export async function authenticate(token: unknown) {
  if (typeof token !== 'string' || token.length !== 64)
    throw new Error('Session expired. Please enter again.');
  const s = await db.session.findUnique({ where: { id: hash(token) }, include: { user: true } });
  if (!s || s.expiresAt.getTime() < Date.now())
    throw new Error('Session expired. Please enter again.');
  return s.user;
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function passwordMatches(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(key, 'hex'));
}
export const json = (p: Player) => {
  const durable = { ...p };
  delete durable.cinematic;
  delete durable.arena;
  delete durable.battleground;
  return JSON.parse(JSON.stringify(durable)) as Prisma.InputJsonValue;
};
// Combat and inventory live in the character snapshot. QuestProgress is the durable
// acceptance/progress/claim ledger; room serialization keeps these writes ordered.
export async function save(p: Player) {
  await db.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: p.id },
      data: { data: json(p), class: p.classId ? CLASS_PATHS[p.classId].name : 'Citizen' },
    });
    for (const [id, state] of Object.entries(p.quests ?? {})) {
      const quest = QUESTS[id as keyof typeof QUESTS];
      if (!quest) continue;
      await tx.questProgress.updateMany({
        where: {
          characterId: p.id,
          questId: id,
          claimed: false,
          progress: { lt: Math.min(state.progress, quest.target.count) },
        },
        data: { progress: Math.min(state.progress, quest.target.count) },
      });
    }
  });
}
