import { Room, type Client } from '@colyseus/core';
import { MAPS, ITEMS, maxHp } from '@ros/game-data';
import { World, idleInput, offlineReward, grantXp, type Input, type Player } from '@ros/shared';
import { activeCharacters, authenticate, db, save, json } from './db.js';
export class MapRoom extends Room {
  maxClients = 24;
  world!: World;
  inputs = new Map<string, Input>();
  characters = new Map<string, string>();
  rates = new Map<string, { at: number; count: number }>();
  saves: Promise<unknown> = Promise.resolve();
  ticks = 0;
  inputTimes = new Map<string, number>();
  onCreate(options: { mapId?: string }) {
    const map = MAPS[options.mapId ?? 'woods'];
    if (!map) throw new Error('Unknown map');
    this.world = new World(map);
    this.setMetadata({ mapId: map.id });
    this.setSimulationInterval((dt) => this.tick(Math.min(dt, 100) / 1000), 1000 / 30);
    this.onMessage('input', (c, payload) => {
      if (!this.rate(c, 100)) return;
      const p = this.player(c);
      if (!p) return;
      const clean = idleInput();
      if (payload && typeof payload === 'object')
        for (const k of Object.keys(clean) as (keyof Input)[]) clean[k] = payload[k] === true;
      this.inputs.set(p.id, clean);
      this.inputTimes.set(p.id, Date.now());
    });
    this.onMessage('auto', (c, v) => {
      const p = this.player(c);
      if (p && this.rate(c, 100)) {
        p.auto = v === true;
        p.targetId = null;
        this.inputs.set(p.id, idleInput());
      }
    });
    this.onMessage('settings', (c, s) => {
      const p = this.player(c);
      if (!p || !s || !this.rate(c, 100)) return;
      p.settings = {
        skills: s.skills === true,
        loot: s.loot === true,
        target: s.target === 'weakest' ? 'weakest' : 'nearest',
        healBelow: Math.max(0, Math.min(70, Number(s.healBelow) || 30)),
      };
    });
    this.onMessage('equip', (c, item) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      if (item === null) p.weapon = null;
      else if (item === 'sword' && (p.inventory.sword ?? 0) > 0 && p.level >= ITEMS.sword.level)
        p.weapon = 'sword';
    });
    this.onMessage('chat', (c, msg) => {
      if (typeof msg !== 'string' || !this.rate(c, 100)) return;
      const key = `chat:${c.sessionId}`;
      const last = this.rates.get(key)?.at ?? 0;
      if (Date.now() - last < 1500) return;
      this.rates.set(key, { at: Date.now(), count: 0 });
      const p = this.player(c);
      if (p) {
        const text = msg
          .replace(/[<>\x00-\x1f]/g, '')
          .trim()
          .slice(0, 180);
        if (text) this.broadcast('chat', { name: p.name, text });
      }
    });
    this.onMessage('logout', async (c) => {
      const p = this.player(c);
      if (!p) return;
      p.auto = false;
      this.inputs.set(p.id, idleInput());
      this.world.players.delete(p.id);
      try {
        await this.enqueueSave(p);
        c.send('saved', null);
      } catch {
        c.send('notice', 'Could not save. Please reconnect.');
      }
    });
    this.onMessage('travel', async (c) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      const portal = this.world.map.portals.find(
        (q) => Math.abs(q.x - p.x) < 110 && Math.abs(q.y - p.y) < 65,
      );
      if (!portal) {
        c.send('notice', 'Walk close to a portal first.');
        return;
      }
      p.auto = false;
      this.inputs.set(p.id, idleInput());
      p.mapId = portal.target;
      const m = MAPS[portal.target];
      p.x = m.spawn.x;
      p.y = m.spawn.y;
      p.vy = 0;
      p.platform = 'ground';
      this.world.players.delete(p.id);
      try {
        await this.enqueueSave(p);
        c.send('travel', portal.target);
      } catch {
        c.send('notice', 'Travel save failed. Please reconnect.');
        c.leave();
      }
    });
  }
  rate(c: Client, limit: number) {
    const now = Date.now();
    let r = this.rates.get(c.sessionId);
    if (!r || now - r.at > 1000) {
      r = { at: now, count: 0 };
      this.rates.set(c.sessionId, r);
    }
    return ++r.count <= limit;
  }
  async onAuth(c: Client, options: { token?: string; characterId?: string }) {
    const user = await authenticate(options.token);
    const id = options.characterId ?? '';
    if (activeCharacters.has(id)) throw new Error('Character is already online');
    activeCharacters.add(id);
    this.characters.set(c.sessionId, id);
    try {
      return await db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "Character" WHERE id = ${id} AND "userId" = ${user.id} FOR UPDATE`;
        if (!rows.length) throw new Error('Character not found');
        const character = await tx.character.findUniqueOrThrow({ where: { id } });
        const p = character.data as unknown as Player;
        if (p.mapId !== this.world.map.id) throw new Error('Invalid map. Refresh your characters.');
        const activity = await tx.offlineActivity.findUnique({ where: { characterId: id } });
        if (activity) {
          const reward = offlineReward(activity.startedAt.getTime(), Date.now());
          grantXp(p, reward.xp);
          p.gold += reward.gold;
          await tx.offlineReward.create({
            data: { characterId: id, xp: reward.xp, gold: reward.gold },
          });
          await tx.offlineActivity.delete({ where: { characterId: id } });
          await tx.character.update({ where: { id }, data: { data: json(p) } });
        }
        return { ...character, data: p };
      });
    } catch (e) {
      activeCharacters.delete(id);
      this.characters.delete(c.sessionId);
      throw e;
    }
  }

  onJoin(c: Client, _options: unknown, auth: { id: string; name: string; data: unknown }) {
    const p = auth.data as Player;
    p.auto = false;
    p.vx = 0;
    p.vy = 0;
    p.lastAttack = 0;
    p.lastSkill = 0;
    p.lastHit = Date.now();
    p.hp = Math.max(1, Math.min(p.hp, maxHp(p.level)));
    this.world.players.set(p.id, p);
    this.characters.set(c.sessionId, p.id);
    this.inputs.set(p.id, idleInput());
    c.send('welcome', { id: p.id, mapId: this.world.map.id });
    c.send('snapshot', this.world.snapshot(Date.now()));
  }
  player(c: Client) {
    return this.world.players.get(this.characters.get(c.sessionId) ?? '');
  }
  enqueueSave(p: Player) {
    const copy = structuredClone(p);
    const task = this.saves.catch(() => {}).then(() => save(copy));
    this.saves = task;
    return task;
  }
  tick(dt: number) {
    const now = Date.now();
    for (const [id, at] of this.inputTimes) if (now - at > 300) this.inputs.set(id, idleInput());
    this.world.step(dt, now, this.inputs);
    for (const i of this.inputs.values()) {
      i.jump = false;
      i.skill = false;
      i.interact = false;
    }
    if (++this.ticks % 2 === 0) this.broadcast('snapshot', this.world.snapshot(now));
    if (this.world.events.length) this.broadcast('events', this.world.events);
    if (this.ticks % 150 === 0)
      for (const p of this.world.players.values())
        void this.enqueueSave(p).catch((e) => console.error('Save failed', e.message));
  }
  async onLeave(c: Client) {
    const id = this.characters.get(c.sessionId);
    if (!id) return;
    const p = this.world.players.get(id);
    this.world.players.delete(id);
    this.inputs.delete(id);
    this.inputTimes.delete(id);
    this.characters.delete(c.sessionId);
    this.rates.delete(c.sessionId);
    this.rates.delete(`chat:${c.sessionId}`);
    try {
      if (p) {
        p.auto = false;
        await this.enqueueSave(p);
      }
    } finally {
      activeCharacters.delete(id);
    }
  }
  async onDispose() {
    await this.saves;
  }
}
