import { houseSize } from '@ros/game-data';
import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import {
  createPlayer,
  activityReward,
  applyActivityReward,
  offlineActivities,
  type Player,
} from '@ros/shared';
import { MAPS, RULES } from '@ros/game-data';
import {
  db,
  authenticate,
  session,
  passwordHash,
  passwordMatches,
  activeCharacters,
  json,
} from './db.js';
import { MapRoom } from './room.js';
const app = express();
const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
app.use(cors({ origin }));
app.use(express.json({ limit: '8kb' }));
const route =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const user = (r: Request) => authenticate(r.headers.authorization?.replace(/^Bearer /, ''));
const limits = new Map<string, { start: number; count: number }>();
app.use('/api', (req, res, next) => {
  const key = req.socket.remoteAddress ?? 'local';
  const now = Date.now();
  let l = limits.get(key);
  if (!l || now - l.start > 60000) {
    l = { start: now, count: 0 };
    limits.set(key, l);
  }
  if (++l.count > 180) {
    res.status(429).json({ error: 'Slow down and try again shortly.' });
    return;
  }
  next();
});
const validEmail = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validPassword = (v: unknown): v is string =>
  typeof v === 'string' && v.length >= 10 && v.length <= 128;
app.get(
  '/api/health',
  route(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'Realm of Shadows' });
  }),
);
app.post(
  '/api/guest',
  route(async (_req, res) => {
    const u = await db.user.create({ data: {} });
    res.json({ token: await session(u.id), guest: true });
  }),
);
app.post(
  '/api/register',
  route(async (req, res) => {
    const { email, password } = req.body;
    if (!validEmail(email) || !validPassword(password))
      throw new Error('Use a valid email and a password of 10–128 characters.');
    let u;
    if (req.headers.authorization) {
      u = await user(req);
      if (!u.guest) throw new Error('Account is already registered');
      u = await db.user.update({
        where: { id: u.id },
        data: { email: email.toLowerCase(), passwordHash: passwordHash(password), guest: false },
      });
    } else
      u = await db.user.create({
        data: { email: email.toLowerCase(), passwordHash: passwordHash(password), guest: false },
      });
    res.json({ token: await session(u.id), guest: false });
  }),
);
app.post(
  '/api/login',
  route(async (req, res) => {
    const { email, password } = req.body;
    if (!validEmail(email) || typeof password !== 'string' || password.length > 128)
      throw new Error('Invalid login');
    const u = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!u?.passwordHash || !passwordMatches(password, u.passwordHash))
      throw new Error('Invalid email or password');
    res.json({ token: await session(u.id), guest: false });
  }),
);
app.get(
  '/api/characters',
  route(async (req, res) => {
    const u = await user(req);
    const cs = await db.character.findMany({
      where: { userId: u.id },
      include: { offline: true },
      orderBy: { id: 'asc' },
    });
    for (const c of cs) {
      const p = c.data as unknown as Player;
      if (!houseSize(p.mapId) || activeCharacters.has(c.id)) continue;
      const row = p.houseOwnerId
          ? await db.character.findUnique({ where: { id: p.houseOwnerId } })
          : null,
        owner = row?.data as unknown as Player | undefined;
      if (
        !owner ||
        owner.housing?.stage !== 3 ||
        `house-${owner.housing.size}` !== p.mapId ||
        (owner.id !== p.id && !owner.housing.invited.includes(p.id))
      ) {
        if (activeCharacters.has(c.id)) continue;
        p.mapId = 'village';
        delete p.houseOwnerId;
        p.x = 900;
        p.y = 240;
        p.platform = 'housing';
        p.vx = 0;
        p.vy = 0;
        p.grounded = true;
        p.climbing = false;
        await db.character.update({ where: { id: c.id }, data: { data: json(p) } });
      }
    }
    res.json({
      guest: u.guest,
      characters: cs.map((c) => ({
        ...c,
        offlineReward: c.offline
          ? activityReward(
              c.data as unknown as Player,
              c.offline.kind,
              c.offline.startedAt.getTime(),
              Date.now(),
            )
          : null,
        offlineActivities: offlineActivities(c.data as unknown as Player),
      })),
    });
  }),
);
app.post(
  '/api/characters',
  route(async (req, res) => {
    const u = await user(req);
    const name = String(req.body.name ?? '').trim();
    if (!/^[a-zA-Z][a-zA-Z0-9 ]{2,15}$/.test(name))
      throw new Error('Names must be 3–16 letters, numbers, or spaces.');
    const count = await db.character.count({ where: { userId: u.id } });
    if (count >= 3) throw new Error('All three character slots are occupied');
    const p = createPlayer('', name, 'village');
    p.appearance = req.body.appearance === 'female' ? 'female' : 'male';
    p.outfit = ['sage', 'ember', 'tide'].includes(req.body.outfit) ? req.body.outfit : 'sage';
    const c = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${u.id} FOR UPDATE`;
      if ((await tx.character.count({ where: { userId: u.id } })) >= 3)
        throw new Error('All slots occupied');
      const c = await tx.character.create({
        data: {
          userId: u.id,
          name,
          appearance: p.appearance,
          outfit: p.outfit,
          data: json(p),
          stats: { create: {} },
        },
      });
      p.id = c.id;
      return tx.character.update({ where: { id: c.id }, data: { data: json(p) } });
    });
    res.json(c);
  }),
);
app.delete(
  '/api/characters/:id',
  route(async (req, res) => {
    const u = await user(req);
    if (activeCharacters.has(req.params.id)) throw new Error('Leave the world before deleting');
    const c = await db.character.findFirst({ where: { id: req.params.id, userId: u.id } });
    if (!c || req.body.confirm !== c.name)
      throw new Error('Type the character name to confirm deletion');
    await db.character.delete({ where: { id: c.id } });
    res.json({ ok: true });
  }),
);
app.post(
  '/api/characters/:id/offline',
  route(async (req, res) => {
    const u = await user(req);
    if (activeCharacters.has(req.params.id))
      throw new Error('Leave the world before assigning an offline activity');
    const c = await db.character.findFirst({ where: { id: req.params.id, userId: u.id } });
    if (!c) throw new Error('Character not found');
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${c.id} FOR UPDATE`;
      if (activeCharacters.has(c.id))
        throw new Error('Leave the world before assigning an activity');
      const stored = await tx.character.findUniqueOrThrow({ where: { id: c.id } });
      if (!offlineActivities(stored.data as unknown as Player).some((a) => a.id === req.body.kind))
        throw new Error('Discover this area and meet its level requirement first.');
      if (await tx.offlineActivity.findUnique({ where: { characterId: c.id } }))
        throw new Error('Claim the current activity before changing jobs.');
      await tx.offlineActivity.create({ data: { characterId: c.id, kind: req.body.kind } });
    });
    res.json({ ok: true });
  }),
);
app.post(
  '/api/characters/:id/claim',
  route(async (req, res) => {
    const u = await user(req);
    if (activeCharacters.has(req.params.id)) throw new Error('Leave the world before claiming');
    const result = await db.$transaction(async (tx) => {
      const cs = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Character" WHERE id = ${req.params.id} AND "userId" = ${u.id} FOR UPDATE`;
      if (!cs.length) throw new Error('Character not found');
      if (activeCharacters.has(req.params.id)) throw new Error('Leave the world before claiming');
      const a = await tx.offlineActivity.findUnique({ where: { characterId: req.params.id } });
      if (!a) return { xp: 0, gold: 0, seconds: 0 };
      const c = await tx.character.findUniqueOrThrow({ where: { id: req.params.id } });
      const p = c.data as unknown as Player;
      const reward = activityReward(p, a.kind, a.startedAt.getTime(), Date.now());
      applyActivityReward(p, reward);
      await tx.character.update({ where: { id: c.id }, data: { data: json(p) } });
      await tx.offlineActivity.delete({ where: { characterId: c.id } });
      await tx.offlineReward.create({
        data: { characterId: c.id, xp: reward.xp, gold: reward.gold },
      });
      return reward;
    });
    res.json(result);
  }),
);
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  res.status(400).json({
    error: err.message.includes('Unique constraint')
      ? 'That email is already registered.'
      : err.message,
  });
});
const http = createServer(app);
const game = new Server({
  transport: new WebSocketTransport({
    server: http,
    verifyClient: (info, cb) => cb(!info.origin || info.origin === origin),
  }),
});
game.define('map', MapRoom).filterBy(['mapId', 'houseOwnerId']);
await db.$connect();
await game.listen(Number(process.env.PORT ?? 2567));
console.log(
  `Realm server listening on ${process.env.PORT ?? 2567}; maps: ${Object.keys(MAPS).join(', ')}; guest sessions: ${RULES.guestDays} days`,
);
