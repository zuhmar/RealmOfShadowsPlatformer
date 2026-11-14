import { constrainHouseActor } from '@ros/shared';
import { houseSize, HOUSE_LAYOUTS } from '@ros/game-data';
import { persistHousing } from './housing.js';
import { housingView, nearHousing } from '@ros/shared';
import { revealOrigin } from './story.js';
import { changeProvision } from './provisions.js';
import { provisionRecipe, PROVISION_STATIONS } from '@ros/game-data';
import { changeClass } from './classes.js';
import { canUseClassWeapon, useTeleport, initializeTeleport } from '@ros/shared';
import { changeEquipment } from './equipment.js';
import { equipGear } from '@ros/shared';
import { usePortal, applyWoodsMilestones } from '@ros/shared';
import { changeForge } from './forge.js';
import { Room, matchMaker, type Client } from '@colyseus/core';
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
  activityReward,
  applyActivityReward,
  playerAttributes,
  equipSkin,
  normalizeSkin,
  SnapshotEncoder,
  type Input,
  type Player,
} from '@ros/shared';
import { changeQuest } from './quests.js';
import { activeCharacters, authenticate, db, save, json } from './db.js';
export class MapRoom extends Room {
  maxClients = 24;
  houseOwnerId?: string;
  houseOwner?: Player;
  world!: World;
  inputs = new Map<string, Input>();
  characters = new Map<string, string>();
  rates = new Map<string, { at: number; count: number }>();
  saves: Promise<unknown> = Promise.resolve();
  ticks = 0;
  questTasks = new Map<string, Promise<void>>();
  inputTimes = new Map<string, number>();
  snapshotStreams = new Map<string, SnapshotEncoder>();
  snapshotResyncAt = new Map<string, number>();
  housingVisits = new Map<string, string>();
  visitingOwners = new Map<string, Player>();
  fastTravel = new Set<string>();
  travelTokens = new Map<string, string>();
  onCreate(options: { mapId?: string; houseOwnerId?: string }) {
    const map = MAPS[options.mapId ?? 'woods'];
    if (!map) throw new Error('Unknown map');
    if (houseSize(map.id)) {
      if (typeof options.houseOwnerId !== 'string' || !options.houseOwnerId)
        throw new Error('Private house owner required.');
      this.houseOwnerId = options.houseOwnerId;
    }
    this.world = new World(map);
    if (this.world.arena) this.maxClients = 2;
    this.clock.setInterval(() => {
      for (const ownerId of new Set(this.housingVisits.values()))
        if (!this.world.players.has(ownerId))
          void db.character
            .findUnique({ where: { id: ownerId } })
            .then((row) => {
              if (row) this.visitingOwners.set(ownerId, row.data as unknown as Player);
              else this.visitingOwners.delete(ownerId);
            })
            .catch(() => {});
    }, 1000);
    this.setMetadata({ mapId: map.id, houseOwnerId: this.houseOwnerId });
    if (this.houseOwnerId)
      this.clock.setInterval(() => {
        if (!this.world.players.has(this.houseOwnerId!))
          void db.character
            .findUnique({ where: { id: this.houseOwnerId } })
            .then((row) => (this.houseOwner = row?.data as unknown as Player | undefined))
            .catch(() => {});
      }, 1000);
    this.setSimulationInterval((dt) => this.tick(Math.min(dt, 100) / 1000), 1000 / 30);
    this.onMessage('snapshotResync', (c) => {
      const now = Date.now();
      if (now - (this.snapshotResyncAt.get(c.sessionId) ?? 0) >= 1000) {
        this.snapshotResyncAt.set(c.sessionId, now);
        this.sendSnapshot(c, now, true);
      }
    });
    this.onMessage('arena', (c, value) => {
      const p = this.player(c, true);
      if (!p || !this.world.arena || !this.rate(c, 10) || typeof value !== 'boolean') return;
      this.world.arena.ready(p, value, Date.now());
    });
    this.onMessage('housing', (c, value) => this.housing(c, value));
    this.onMessage('input', (c, payload) => {
      if (!this.rate(c, 100)) return;
      const p = this.player(c, true);
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
        if (definition?.type === 'weapon' && !canUseClassWeapon(p, item)) {
          c.send(
            'notice',
            'That weapon belongs to another class. Visit a class mentor to change paths.',
          );
          return;
        }
        if (
          definition?.type === 'weapon' &&
          canUseClassWeapon(p, item) &&
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
    this.onMessage('class', (c, payload) => this.classAction(c, payload));
    this.onMessage('skin', (c, id) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      try {
        equipSkin(p, id);
      } catch (error) {
        c.send('notice', (error as Error).message);
      }
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
      const p = this.player(c, true);
      if (p) {
        const text = msg
          .replace(/[<>\x00-\x1f]/g, '')
          .trim()
          .slice(0, 180);
        if (text) this.broadcast('chat', { name: p.name, text });
      }
    });
    this.onMessage('logout', async (c) => {
      const p = this.player(c, true);
      if (!p) return;
      p.auto = false;
      delete p.gathering;
      this.inputs.set(p.id, idleInput());
      this.world.arena?.depart(p, Date.now());
      this.world.players.delete(p.id);
      try {
        await this.enqueueSave(p);
        c.send('saved', null);
      } catch {
        c.send('notice', 'Could not save. Please reconnect.');
      }
    });
    this.onMessage('travel', (c) => this.travel(c));
    this.onMessage('teleport', (c, target) => {
      if (typeof target === 'string') void this.travel(c, target);
    });
    this.onMessage('buyTeleportCrystal', (c) => this.identify(c, '', 'buyCrystal'));
    this.onMessage('interact', (c, payload) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100)) return;
      if (
        this.world.map.id === 'village' &&
        Math.abs(p.x - 900) < 100 &&
        Math.abs(p.y - 240) < 65
      ) {
        void this.enterHouse(c).catch(() =>
          c.send('notice', 'Could not enter the house. Try again.'),
        );
        return;
      }
      if (
        houseSize(this.world.map.id) &&
        Math.abs(p.x - 110) < 110 &&
        Math.abs(p.y - this.world.map.spawn.y) < 65
      ) {
        void this.exitHouse(c);
        return;
      }
      if (nearNpc(p, this.world.map, 'carpentry-station')) {
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'carpentry-station' });
      } else if (nearNpc(p, this.world.map, 'mira')) {
        p.auto = false;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'mira' });
      } else if (nearNpc(p, this.world.map, 'bram')) {
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'bram' });
      } else if (nearNpc(p, this.world.map, 'mirewarden')) {
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'mirewarden' });
      } else if (nearNpc(p, this.world.map, 'mentor')) {
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: 'mentor' });
      } else if (PROVISION_STATIONS.some((station) => nearNpc(p, this.world.map, station.id))) {
        const station = PROVISION_STATIONS.find((station) =>
          nearNpc(p, this.world.map, station.id),
        )!;
        p.auto = false;
        delete p.gathering;
        this.inputs.set(p.id, idleInput());
        c.send('npc', { id: station.id });
      } else if (payload?.npcId === 'mirewarden')
        c.send('notice', 'Climb to the Mire Warden’s ledge to speak.');
      else if (payload?.npcId === 'mentor')
        c.send('notice', 'Climb to the Cavern Mentor’s ledge to speak.');
      else if (payload?.npcId === 'bram') c.send('notice', 'Walk closer to Bram.');
      else if (payload?.npcId === 'mira')
        c.send('notice', 'Walk closer to Mira to speak with her.');
      else {
        const node = this.world.map.resources?.find((n) => this.world.nearResource(p, n));
        if (node) this.world.startGathering(p, node.id, Date.now());
        else void this.travel(c);
      }
    });
    this.onMessage('provision', (c, payload) => this.provision(c, payload));
    this.onMessage('forge', (c, payload) => this.forge(c, payload));
    this.onMessage('equipTool', (c, id) => {
      const p = this.player(c);
      if (!p || !this.rate(c, 100) || typeof id !== 'string') return;
      const tool = GATHERING_TOOLS.find((t) => t.id === id);
      if (!tool || (!tool.starter && (p.level < tool.level || !p.ownedTools?.includes(id)))) {
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
  classAction(c: Client, payload: unknown) {
    const p = this.player(c);
    if (!p || !this.rate(c, 100) || !payload || typeof payload !== 'object') return;
    const { action, id } = payload as { action?: unknown; id?: unknown };
    if ((action !== 'choose' && action !== 'talent') || typeof id !== 'string') return;
    if (
      action === 'choose' &&
      !(
        (this.world.map.id === 'village' && nearNpc(p, this.world.map, 'mira') && !!p.classId) ||
        (this.world.map.id === 'crystal' && nearNpc(p, this.world.map, 'mentor'))
      )
    ) {
      c.send(
        'notice',
        'Complete the class trial and visit the Cavern Mentor. Later changes are also available from Mira.',
      );
      return;
    }
    p.auto = false;
    delete p.gathering;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        const next = await changeClass(structuredClone(p), action, id);
        for (const key of [
          'classId',
          'skin',
          'skinConceptVersion',
          'classTalents',
          'classRevision',
          'gold',
          'weapon',
          'equippedGear',
        ] as const)
          (p as any)[key] = next[key];
        c.send(
          'notice',
          action === 'choose'
            ? 'Class selected. Equip a matching weapon in Bag.'
            : 'Talent learned.',
        );
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task.catch((e) => c.send('notice', e.message)).finally(() => this.questTasks.delete(p.id));
  }
  async travel(
    c: Client,
    destination?: string,
    housingTarget?: { mapId: string; ownerId?: string },
  ) {
    const p = this.player(c, true);
    if (!p || !this.rate(c, 100)) return;
    if (!housingTarget && houseSize(this.world.map.id) && destination === undefined) {
      await this.exitHouse(c);
      return;
    }
    let target: string;
    try {
      if (!housingTarget && destination && houseSize(destination))
        throw new Error('Enter houses through their front door.');
      if (housingTarget) {
        target = housingTarget.mapId;
        const m = MAPS[target];
        p.mapId = target;
        p.houseOwnerId = housingTarget.ownerId;
        p.x = target === 'village' ? 900 : m.spawn.x;
        p.y = target === 'village' ? 240 : m.spawn.y;
        p.platform = target === 'village' ? 'housing' : 'ground';
        p.vx = 0;
        p.vy = 0;
        p.grounded = true;
        p.climbing = false;
        p.auto = false;
        delete p.gathering;
      } else
        target =
          destination !== undefined ? useTeleport(p, destination) : usePortal(p, this.world.map);
    } catch (error) {
      c.send('notice', error instanceof Error ? error.message : 'Could not travel.');
      return;
    }
    if (!houseSize(target)) delete p.houseOwnerId;
    this.inputs.set(p.id, idleInput());
    this.world.arena?.depart(p, Date.now());
    this.world.players.delete(p.id);
    try {
      await this.enqueueSave(p);
      const fast = this.fastTravel.has(c.sessionId);
      const token = this.travelTokens.get(c.sessionId);
      this.releaseClient(c);
      let reservation;
      if (token) {
        try {
          reservation = await matchMaker.joinOrCreate('map', {
            token,
            characterId: p.id,
            mapId: target,
            houseOwnerId: p.houseOwnerId,
            snapshotProtocol: 1,
            travelProtocol: 2,
          });
        } catch {
          // A regular authenticated join remains available if seat preparation fails.
        }
      }
      c.send(
        'travel',
        fast
          ? {
              target,
              houseOwnerId: p.houseOwnerId,
              overlapLeave: true,
              ...(reservation ? { reservation } : {}),
            }
          : p.houseOwnerId
            ? { target, houseOwnerId: p.houseOwnerId, overlapLeave: false }
            : target,
      );
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
    const giver = QUESTS[value.questId as keyof typeof QUESTS].npcId;
    if (
      !nearNpc(p, this.world.map, giver) ||
      this.world.map.id !==
        (giver === 'mirewarden' ? 'murkmire' : giver === 'mentor' ? 'crystal' : 'village')
    ) {
      result(
        false,
        giver === 'mirewarden'
          ? 'Return to the Mire Warden.'
          : giver === 'mentor'
            ? 'Return to the Cavern Mentor.'
            : 'Return to Mira in Elderwood Village to do that.',
      );
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
  provision(c: Client, payload: unknown) {
    const result = (ok: boolean, message: string) => {
      if (this.clients.includes(c)) c.send('provisionResult', { ok, message });
    };
    const p = this.player(c);
    if (!p) {
      result(false, 'Please wait for the current action.');
      return;
    }
    if (!this.rate(c, 100)) {
      result(false, 'Please wait before another recipe action.');
      return;
    }
    const value = payload as { action?: unknown; recipeId?: unknown } | null;
    if (
      !value ||
      typeof value.action !== 'string' ||
      !['craft', 'use'].includes(value.action) ||
      typeof value.recipeId !== 'string'
    ) {
      result(false, 'Unknown recipe action.');
      return;
    }
    const action = value.action as 'craft' | 'use',
      id = value.recipeId,
      recipe = provisionRecipe(id);
    if (!recipe) {
      result(false, 'Unknown recipe.');
      return;
    }
    const station = PROVISION_STATIONS.find((s) => s.skill === recipe.skill)!;
    const atStation = () =>
      this.world.map.id === 'village' && nearNpc(p, this.world.map, station.id);
    if (action === 'craft' && !atStation()) {
      result(false, `Visit the ${station.name} in Elderwood Village.`);
      return;
    }
    if (action === 'craft') {
      p.auto = false;
      delete p.gathering;
      this.inputs.set(p.id, idleInput());
    }
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        if (action === 'craft' && !atStation()) throw new Error(`Stand near the ${station.name}.`);
        const before = structuredClone(p),
          { next, message } = await changeProvision(before, action, id);
        // Preserve combat damage, regeneration and loot received while the durable action was saving.
        for (const item of new Set([
          ...Object.keys(before.inventory),
          ...Object.keys(next.inventory),
        ])) {
          const delta = (next.inventory[item] ?? 0) - (before.inventory[item] ?? 0);
          if (delta) {
            p.inventory[item] = (p.inventory[item] ?? 0) + delta;
            if (p.inventory[item] === 0) delete p.inventory[item];
          }
        }
        p.craftingSkills = next.craftingSkills;
        p.provisionRevision = next.provisionRevision;
        p.foodBuff = next.foodBuff;
        p.potionReadyAt = next.potionReadyAt;
        const stats = playerAttributes(p);
        p.hp = Math.min(stats.maxHealth, p.hp + Math.max(0, next.hp - before.hp));
        p.mp = Math.min(stats.maxMana, p.mp + Math.max(0, next.mp - before.mp));
        result(true, message);
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task
      .catch((error) =>
        result(false, error instanceof Error ? error.message : 'Could not save recipe action.'),
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
  identify(c: Client, id: unknown, action: 'identify' | 'sell' | 'buyCrystal' = 'identify') {
    const p = this.player(c);
    if (!p || typeof id !== 'string' || !this.rate(c, 100)) return;
    if (
      action !== 'identify' &&
      (this.world.map.id !== 'village' || !nearNpc(p, this.world.map, 'bram'))
    ) {
      c.send('notice', 'Visit Bram in Elderwood Village to sell gear or buy Teleport Crystals.');
      return;
    }
    p.auto = false;
    delete p.gathering;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        if (action !== 'identify' && !nearNpc(p, this.world.map, 'bram'))
          throw new Error('Stand near Bram to sell gear or buy Teleport Crystals.');
        const next = await changeEquipment(structuredClone(p), id, action);
        p.gear = next.gear;
        p.inventory = next.inventory;
        p.gold = next.gold;
        p.equipmentRevision = next.equipmentRevision;
        if (this.clients.includes(c))
          c.send(
            'notice',
            action === 'buyCrystal'
              ? 'Teleport Crystal purchased! Open your World Map to travel.'
              : action === 'sell'
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
        if (normalizeSkin(p)) await tx.character.update({ where: { id }, data: { data: json(p) } });
        if (p.mapId !== this.world.map.id) throw new Error('Invalid map. Refresh your characters.');
        if (this.houseOwnerId) {
          const row = await tx.character.findUnique({ where: { id: this.houseOwnerId } });
          const owner = row?.data as unknown as Player | undefined;
          if (
            !owner ||
            p.houseOwnerId !== this.houseOwnerId ||
            owner.housing?.stage !== 3 ||
            `house-${owner.housing.size}` !== this.world.map.id ||
            (owner.id !== p.id && !owner.housing.invited.includes(p.id))
          )
            throw new Error('You are not invited to this house.');
          this.houseOwner = owner;
        }

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
        if (initializeTeleport(p))
          await tx.character.update({ where: { id }, data: { data: json(p) } });
        if (applyWoodsMilestones(p))
          await tx.character.update({ where: { id }, data: { data: json(p) } });
        const activity = await tx.offlineActivity.findUnique({ where: { characterId: id } });
        if (activity) {
          const reward = activityReward(p, activity.kind, activity.startedAt.getTime(), Date.now());
          applyActivityReward(p, reward);
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

  onJoin(
    c: Client,
    options: { snapshotProtocol?: number; travelProtocol?: number; token?: string },
    auth: { id: string; name: string; data: unknown },
  ) {
    const p = auth.data as Player;
    constrainHouseActor(p, this.world.map);
    revealOrigin(p, this.world.map);
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
    if (this.world.arena) this.world.arena.join(p);
    else delete p.arena;
    this.characters.set(c.sessionId, p.id);
    if (options.snapshotProtocol === 1)
      this.snapshotStreams.set(c.sessionId, new SnapshotEncoder());
    this.inputs.set(p.id, idleInput());
    if ((options.travelProtocol ?? 0) >= 1) this.fastTravel.add(c.sessionId);
    if (options.travelProtocol === 2 && typeof options.token === 'string')
      this.travelTokens.set(c.sessionId, options.token);
    c.send('welcome', { id: p.id, mapId: this.world.map.id });
    this.sendSnapshot(c, Date.now(), true);
  }
  async selectHouse(c: Client, ownerId: string) {
    const p = this.player(c);
    if (!p || this.world.map.id !== 'village' || !nearHousing(p)) return;
    const owner =
      this.world.players.get(ownerId) ??
      ((await db.character.findUnique({ where: { id: ownerId } }))?.data as unknown as
        | Player
        | undefined);
    if (!owner || !housingView(owner, p)) {
      c.send('notice', 'That owner must invite you first.');
      return;
    }
    this.visitingOwners.set(owner.id, owner);
    this.housingVisits.set(p.id, owner.id);
    this.sendSnapshot(c, Date.now(), true);
  }
  async enterHouse(c: Client) {
    const p = this.player(c);
    if (!p) return;
    if (this.world.map.id !== 'village' || Math.abs(p.x - 900) > 100 || Math.abs(p.y - 240) > 65) {
      c.send('notice', 'Walk to the front of the house on the housing platform.');
      return;
    }
    const ownerId = this.housingVisits.get(p.id) ?? p.id;
    const owner =
      this.world.players.get(ownerId) ??
      ((await db.character.findUnique({ where: { id: ownerId } }))?.data as unknown as
        | Player
        | undefined);
    if (!owner || owner.housing?.stage !== 3 || !housingView(owner, p)) {
      c.send('notice', 'Finish the house or ask its owner for an invitation.');
      return;
    }
    await this.travel(c, undefined, { mapId: `house-${owner.housing.size}`, ownerId: owner.id });
  }
  async exitHouse(c: Client, forced = false) {
    const p = this.player(c);
    if (!p || !houseSize(this.world.map.id)) return;
    if (!forced && (Math.abs(p.x - 110) > 110 || Math.abs(p.y - this.world.map.spawn.y) > 65)) {
      c.send('notice', 'Walk to the exit door on the ground floor.');
      return;
    }
    await this.travel(c, undefined, { mapId: 'village' });
  }
  housing(c: Client, value: unknown) {
    const p = this.player(c);
    if (!p || !this.rate(c, 100) || !value || typeof value !== 'object') return;
    const v = value as { action?: unknown; id?: unknown; x?: unknown; quantity?: unknown };
    if (v.action === 'list') {
      void db.character
        .findMany({
          where: { data: { path: ['housing', 'invited'], array_contains: [p.id] } },
          select: { id: true, name: true, data: true },
        })
        .then((rows) =>
          c.send(
            'housingInvitations',
            rows
              .filter((row) => (row.data as unknown as Player).housing?.stage === 3)
              .map((row) => ({ id: row.id, name: row.name })),
          ),
        )
        .catch(() => c.send('notice', 'Could not load invited houses.'));
      return;
    }
    if (v.action === 'visit' && this.world.map.id === 'village') {
      void this.selectHouse(c, typeof v.id === 'string' ? v.id : '').catch(() =>
        c.send('notice', 'Could not load that house. Try again.'),
      );
      return;
    }
    if (v.action === 'enter') {
      void this.enterHouse(c).catch(() =>
        c.send('notice', 'Could not enter the house. Try again.'),
      );
      return;
    }
    if (v.action === 'exit') {
      void this.exitHouse(c);
      return;
    }
    if (this.houseOwnerId && this.houseOwnerId !== p.id) {
      c.send('notice', 'Only the owner can edit this house.');
      return;
    }
    if (!nearHousing(p)) {
      c.send('notice', 'Climb to the housing platform in central Elderwood.');
      return;
    }
    if (v.action === 'visit' || v.action === 'home') {
      const owner =
        v.action === 'home' ? p : this.world.players.get(typeof v.id === 'string' ? v.id : '');
      if (!owner || (owner.id !== p.id && !housingView(owner, p))) {
        c.send('notice', 'That owner must be here and must invite you first.');
        return;
      }
      this.visitingOwners.set(owner.id, owner);
      this.housingVisits.set(p.id, owner.id);
      this.sendSnapshot(c, Date.now(), true);
      return;
    }
    if ((this.housingVisits.get(p.id) ?? p.id) !== p.id) {
      c.send('notice', 'Return to your own plot to build or decorate.');
      return;
    }
    if (v.action === 'invite' && !this.world.players.has(typeof v.id === 'string' ? v.id : '')) {
      c.send('notice', 'Invite an adventurer currently in this village.');
      return;
    }
    p.auto = false;
    delete p.gathering;
    this.inputs.set(p.id, idleInput());
    const task = this.saves
      .catch(() => {})
      .then(async () => {
        if (!nearHousing(p)) throw new Error('Stand on the housing platform.');
        const next = await persistHousing(structuredClone(p), v);
        p.housing = next.housing;
        p.gear = next.gear;
        p.carpentry = next.carpentry;
        p.inventory = next.inventory;
        p.housingRevision = next.housingRevision;
        c.send(
          'notice',
          v.action === 'plot'
            ? 'Plot claimed! Next, build the foundation from Home.'
            : v.action === 'build'
              ? p.housing?.stage === 3
                ? 'Your house is complete! You can now place furniture.'
                : 'Construction saved. Continue with the next house stage in Home.'
              : 'Housing saved.',
        );
      });
    this.questTasks.set(p.id, task);
    this.saves = task.catch(() => {});
    void task
      .catch((e) => c.send('notice', e instanceof Error ? e.message : 'Could not save housing.'))
      .finally(() => this.questTasks.delete(p.id));
  }
  sendSnapshot(c: Client, now: number, force = false) {
    const id = this.characters.get(c.sessionId);
    if (!id || !this.world.players.has(id)) return;
    const snapshot = this.world.snapshot(now, id);
    const viewer = this.world.players.get(id)!;
    const owner = this.houseOwnerId
      ? (this.world.players.get(this.houseOwnerId) ?? this.houseOwner)
      : (this.world.players.get(this.housingVisits.get(id) ?? id) ??
        this.visitingOwners.get(this.housingVisits.get(id) ?? id));
    const view = owner ? housingView(owner, viewer) : undefined;
    if (
      this.houseOwnerId &&
      (!view || `house-${view.size}` !== this.world.map.id || view.stage !== 3)
    ) {
      c.send('notice', 'Your house invitation was revoked.');
      void this.exitHouse(c, true);
      return;
    }
    if (!view) this.housingVisits.delete(id);
    snapshot.players = snapshot.players.map((p) =>
      p.id === id
        ? {
            ...p,
            housingView:
              view ?? (this.world.map.id === 'village' ? housingView(viewer, viewer) : undefined),
          }
        : p,
    );
    const stream = this.snapshotStreams.get(c.sessionId);
    if (!stream) c.send('snapshot', snapshot);
    else {
      const message = stream.encode(snapshot, force);
      c.send(message.type, message.data);
    }
  }
  player(c: Client, allowArenaCombat = false) {
    const id = this.characters.get(c.sessionId) ?? '';
    const p = this.questTasks.has(id) ? undefined : this.world.players.get(id);
    if (
      p &&
      !allowArenaCombat &&
      p.arena &&
      (p.arena.ready || p.arena.phase === 'countdown' || p.arena.phase === 'fighting')
    ) {
      c.send('notice', 'Cancel Ready or finish the duel before changing equipment or using items.');
      return undefined;
    }
    return p;
  }
  enqueueSave(p: Player) {
    const copy = structuredClone(p);
    delete copy.arena;
    if (p.id === this.houseOwnerId) this.houseOwner = copy;
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
    if (++this.ticks % 2 === 0)
      for (const client of this.clients) {
        const id = this.characters.get(client.sessionId);
        if (id && this.world.players.has(id)) this.sendSnapshot(client, now);
      }
    if (this.world.events.length) this.broadcast('events', this.world.events);
    if (this.ticks % 150 === 0)
      for (const p of this.world.players.values())
        if (!this.questTasks.has(p.id))
          void this.enqueueSave(p).catch((e) => console.error('Save failed', e.message));
  }
  async onLeave(c: Client, consented: boolean) {
    const id = this.characters.get(c.sessionId);
    if (!id) return;
    const p = this.world.players.get(id);
    if (p) {
      this.world.arena?.depart(p, Date.now());
      p.auto = false;
      delete p.gathering;
      this.world.players.delete(id);
    }
    this.inputs.delete(id);
    this.inputTimes.delete(id);
    await this.questTasks.get(id)?.catch(() => {});
    if (!consented && p) {
      try {
        await this.enqueueSave(p);
        await this.allowReconnection(c, 30);
        this.world.players.set(id, p);
        this.world.arena?.join(p);
        this.inputs.set(id, idleInput());
        this.inputTimes.set(id, Date.now());
        c.send('welcome', { id, mapId: this.world.map.id });
        this.sendSnapshot(c, Date.now(), true);
        return;
      } catch (error) {
        console.info('Reconnect window closed', id);
      }
    }
    try {
      if (p) await this.enqueueSave(p);
    } finally {
      this.releaseClient(c);
    }
  }
  /** Release only this session's ownership; stale room cleanup cannot unlock a new owner. */
  releaseClient(c: Client) {
    const id = this.characters.get(c.sessionId);
    if (!id) return;
    this.housingVisits.delete(id);
    this.characters.delete(c.sessionId);
    this.snapshotStreams.delete(c.sessionId);
    this.snapshotResyncAt.delete(c.sessionId);
    this.rates.delete(c.sessionId);
    this.rates.delete(`chat:${c.sessionId}`);
    this.fastTravel.delete(c.sessionId);
    this.travelTokens.delete(c.sessionId);
    this.inputs.delete(id);
    this.inputTimes.delete(id);
    activeCharacters.delete(id);
  }

  async onDispose() {
    await this.saves;
  }
}
