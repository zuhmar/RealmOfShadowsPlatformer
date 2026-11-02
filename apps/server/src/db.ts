import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { type Player } from '@ros/shared';
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
export const json = (p: Player) => JSON.parse(JSON.stringify(p)) as Prisma.InputJsonValue;
// The snapshot is the milestone's authoritative persistence source. Normalized expansion tables are reserved.
export async function save(p: Player) {
  await db.character.update({ where: { id: p.id }, data: { data: json(p) } });
}
