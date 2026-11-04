import { changeEquipment } from './equipment.js';
import { equipGear } from '@ros/shared';
import { usePortal, applyWoodsMilestones } from '@ros/shared';
import { changeForge } from './forge.js';
import { Room, type Client } from '@colyseus/core';
import {
  MAPS,
  ITEMS,
  QUESTS,
  MIRA_WEAPON_KIT_LEDGER,
  itemDefinition,
  GATHERING_TOOLS,
  BRAM_QUEST,
} from '@ros/game-data';
import {
  World,
  idleInput,
  nearNpc,
  offlineReward,
  grantXp,
  playerAttributes,
  type Input,
  type Player,
} from '@ros/shared';
import { changeQuest } from './quests.js';
import { activeCharacters, authenticate, db, save, json } from './db.js';
export class MapRoom extends Room {
  maxClients = 24;
  world!: World;
  inputs = new Map<string, Input>();
  characters = new Map<string, string>();
  rates = new Map<string, { at: number; count: number }>();
  saves: Promise<unknown> = Promise.resolve();
  ticks = 0;
  questTasks = new Map<string, Promise<void>>();
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
        delete p.gathering;
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
      if (item === null) {
        p.weapon = null;
        if (p.equippedGear) delete p.equippedGear.weapon;
      } else if (typeof item === 'string') {
        const definition = itemDefinition(item);
        if (
          definition?.type === 'weapon' &&
          (p.inventory[item] ?? 0) > 0 &&
          p.level >= definition.level
        ) {
          p.weapon = item;
          if (p.equippedGear) delete p.equippedGear.weapon;
        }
      }
      p.hp = Math.min(p.hp, playerAttributes(p).maxHealth);
      p.mp = Math.min(p.mp, playerAttributes(p).maxMana);
    });
    this.onMessage('equipGear', (c, id) => {
      const p = this.player(c);
      if (!p || typeof id !== 'string' || !this.rate(c, 100)) return;
      try {
        equipGear(p, id);
        p.hp = Math.min(p.hp, playerAttributes(p).maxHealth);
        p.mp = Math.min(p.mp, playerAttributes(p).maxMana);
      } catch (error) {
        c.send('notice', (error as Error).message);
      }
    });
    this.onMessage('identify', (c, id) => this.identify(c, id));
    this.onMessage('sellGear', (c, id) => this.identify(c, id, 'sell'));
    this.onMessage('equipAccessory', (c, id) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      if (id === null) p.accessory = null;
      else if (id === 'forest-guardian-ring' && (p.inventory[id] ?? 0) > 0) p.accessory = id;
      else c.send('notice', 'You do not own that accessory.');
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
      delete p.gathering;
      this.inputs.set(p.id, idleInput());
      this.world.players.delete(p.id);
      try {
        await this.enqueueSave(p);
        c.send('saved', null);
      } catch {
        c.send('notice', 'Could not save. Please reconnect.');
      }
    });
    this.onMessage('travel', (c) => this.travel(c));
    this.onMessage('interact', (c, payload) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      if (nearNpc(p, this.world.map, 'mira')) {
        p.auto = false;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'mira' });
      } else if (nearNpc(p, this.world.map, 'bram')) {
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'bram' });
      } else if (payload?.npcId === 'bram') c.send('notice', 'Walk closer to Bram.');
      else if (payload?.npcId === 'mira')
        c.send('notice', 'Walk closer to Mira to speak with her.');
      else {
        const node = this.world.map.resources?.find((n) => this.world.nearResource(p, n));
        if (node) this.world.startGathering(p, node.id, Date.now());
        else void this.travel(c);
      }
    });
    this.onMessage('forge', (c, payload) => this.forge(c, payload));
    this.onMessage('equipTool', (c, id) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100) || typeof id !== 'string') return;
      const tool = GATHERING_TOOLS.find((t) => t.id === id);
      if (!tool || (!tool.starter && (tool.material !== 'iron' || !p.ownedTools?.includes(id)))) {
        c.send('notice', 'You do not own that tool.');
        return;
      }
      delete p.gathering;
      p.equippedTools ??= {};
      p.equippedTools[tool.skill] = id;
    });
    this.onMessage('gather', (c, nodeId) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      if (typeof nodeId !== 'string' || !this.world.startGathering(p, nodeId, Date.now()))
        c.send('notice', 'Stand next to the resource on its platform to gather.');
    });
    this.onMessage('quest', (c, payload) => this.quest(c, payload));
  }
  async travel(c: Client) {
    const p = this.player(c);
    if (!p || !this.rate(c, 100)) return;
    let target: string;
    try {
      target = usePortal(p, this.world.map);
    } catch (error) {
      c.send('notice', error instanceof Error ? error.message : 'Could not travel.');
      return;
    }
    this.inputs.set(p.id, idleInput());
    this.world.players.delete(p.id);
    try {
      await this.enqueueSave(p);
      c.send('travel', target);
    } catch {
      c.send('notice', 'Travel save failed. Please reconnect.');
      c.leave();
    }
  }

  quest(c: Client, payload: unknown) {
    const result = (ok: boolean, message: string) => {
      if (this.clients.includes(c)) c.send('questResult', { ok, message });
    };
    const p = this.player(c);
    if (!p) {
      result(false, 'Please wait for the current action to finish.');
      return;
    }
    if (!this.rate(c, 100)) return;
    const value = payload as { questId?: unknown; action?: unknown } | null;
    if (
      typeof value?.questId !== 'string' ||
      !Object.hasOwn(QUESTS, value.questId) ||
      (value.action !== 'accept' && value.action !== 'claim')
    ) {
      result(false, 'Unknown quest action.');
      return;
    }
    if (this.world.map.id !== 'village' || !nearNpc(p, this.world.map, 'mira')) {
      result(false, 'Return to Mira in Elderwood Village to do that.');
      return;
    }
    const action = value.action;
    const questId = value.questId as keyof typeof QUESTS;
    p.auto = false;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        const wasClaimed = p.quests?.['mira-wolves']?.claimed === true;
        const next = await changeQuest(structuredClone(p), questId, action);
        p.quests = next.quests;
        p.gold = next.gold;
        p.inventory = next.inventory;
        result(
          true,
          questId !== 'mira-wolves'
            ? `${QUESTS[questId].title}: ${action === 'accept' ? 'quest accepted' : 'reward claimed'}.`
            : action === 'accept'
              ? 'Quest accepted: defeat 15 Wolves in Wolf Hollow, then return to Mira.'
              : wasClaimed
                ? 'Training kit collected: bow, staff and dagger.'
                : 'Quest complete: +75 gold and four class trial weapons.',
        );
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task
      .catch((error) =>
        result(
          false,
          error instanceof Error ? error.message : 'Could not save the quest. Try again.',
        ),
      )
      .finally(() => this.questTasks.delete(p.id));
  }
  forge(c: Client, payload: unknown) {
    const result = (ok: boolean, message: string) => {
      if (this.clients.includes(c)) c.send('forgeResult', { ok, message });
    };
    const p = this.player(c);
    if (!p) {
      result(false, 'Please wait for the current action.');
      return;
    }
    if (!this.rate(c, 100)) return;
    const value = payload as { action?: unknown; recipeId?: unknown } | null;
    if (
      !value ||
      typeof value.action !== 'string' ||
      !['accept', 'craft', 'claim'].includes(value.action) ||
      (value.recipeId !== undefined && typeof value.recipeId !== 'string')
    ) {
      result(false, 'Unknown forge action.');
      return;
    }
    if (this.world.map.id !== 'village' || !nearNpc(p, this.world.map, 'bram')) {
      result(false, 'Return to Bram’s forge in Elderwood Village.');
      return;
    }
    const action = value.action as 'accept' | 'craft' | 'claim',
      recipeId = value.recipeId as string | undefined;
    p.auto = false;
    delete p.gathering;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        if (!nearNpc(p, this.world.map, 'bram')) throw new Error('Stand near Bram’s forge.');
        const { next, message } = await changeForge(structuredClone(p), action, recipeId);
        p.inventory = next.inventory;
        p.gear = next.gear;
        p.gold = next.gold;
        p.forgeQuest = next.forgeQuest;
        p.forgeRevision = next.forgeRevision;
        p.blacksmithing = next.blacksmithing;
        p.ownedTools = next.ownedTools;
        p.equippedTools = next.equippedTools;
        result(true, message);
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task
      .catch((error) =>
        result(false, error instanceof Error ? error.message : 'Could not save crafting.'),
      )
      .finally(() => this.questTasks.delete(p.id));
  }
  identify(c: Client, id: unknown, action: 'identify' | 'sell' = 'identify') {
    const p = this.player(c);
    if (!p || typeof id !== 'string' || !this.rate(c, 100)) return;
    if (this.world.map.id !== 'village' || !nearNpc(p, this.world.map, 'bram')) {
      c.send('notice', 'Visit Bram in Elderwood Village to identify or sell equipment.');
      return;
    }
    p.auto = false;
    delete p.gathering;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        if (!nearNpc(p, this.world.map, 'bram'))
          throw new Error('Stand near Bram to identify or sell gear.');
        const next = await changeEquipment(structuredClone(p), id, action);
        p.gear = next.gear;
        p.gold = next.gold;
        p.equipmentRevision = next.equipmentRevision;
        if (this.clients.includes(c))
          c.send(
            'notice',
            action === 'sell'
              ? 'Equipment sold to Bram. Gold added to your Bag.'
              : 'Equipment identified! Open your Bag to view its attributes.',
          );
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task
      .catch((error) => {
        if (this.clients.includes(c))
          c.send('notice', error instanceof Error ? error.message : 'Could not identify gear.');
      })
      .finally(() => this.questTasks.delete(p.id));
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
        const questRows = await tx.questProgress.findMany({ where: { characterId: id } });
        p.quests = Object.fromEntries(
          questRows
            .filter((q) => Object.hasOwn(QUESTS, q.questId))
            .map((q) => [
              q.questId,
              {
                progress: q.progress,
                claimed: q.claimed,
                trialKitClaimed: questRows.some(
                  (ledger) => ledger.questId === MIRA_WEAPON_KIT_LEDGER && ledger.claimed,
                ),
              },
            ]),
        );
        const forgeLedger = questRows.find((q) => q.questId === BRAM_QUEST.id);
        if (forgeLedger) {
          p.forgeQuest ??= {
            accepted: true,
            claimed: forgeLedger.claimed,
            barsSmelted: 0,
            toolsCrafted: 0,
          };
          p.forgeQuest.claimed = forgeLedger.claimed;
        } else delete p.forgeQuest;
        if (applyWoodsMilestones(p))
          await tx.character.update({ where: { id }, data: { data: json(p) } });
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
    delete p.gathering;
    p.vx = 0;
    p.vy = 0;
    p.lastAttack = 0;
    p.nextAttackAt = 0;
    p.lastSkill = 0;
    p.lastHit = Date.now();
    p.hp = Math.max(1, Math.min(p.hp, playerAttributes(p).maxHealth));
    p.mp = Math.max(0, Math.min(p.mp, playerAttributes(p).maxMana));
    this.world.players.set(p.id, p);
    this.characters.set(c.sessionId, p.id);
    this.inputs.set(p.id, idleInput());
    c.send('welcome', { id: p.id, mapId: this.world.map.id });
    c.send('snapshot', this.world.snapshot(Date.now()));
  }
  player(c: Client) {
    const id = this.characters.get(c.sessionId) ?? '';
    return this.questTasks.has(id) ? undefined : this.world.players.get(id);
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
        if (!this.questTasks.has(p.id))
          void this.enqueueSave(p).catch((e) => console.error('Save failed', e.message));
  }
  async onLeave(c: Client) {
    const id = this.characters.get(c.sessionId);
    if (!id) return;
    await this.questTasks.get(id)?.catch(() => {});
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
