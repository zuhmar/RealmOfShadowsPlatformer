export * from './housing';
export * from './recipes';
import { collectRecipe, rollRecipeDrop } from './recipes';
export * from './provisions';
import { expireFood } from './provisions';
import { TELEPORT_CRYSTAL_DROP_CHANCE } from '@ros/game-data';
export * from './teleport';
export * from './equipment-comparison';
export * from './equipment';
import { islandGearDrop, type Gear } from './equipment';
export * from './combat-skills';
import {
  weaponTrainingSkill,
  activeCombatSkill,
  trainCombat,
  playerAttributes,
  attackPower,
} from './combat-skills';
export * from './woods-progression';
import { applyWoodsMilestones } from './woods-progression';
export * from './travel';
export * from './forging';
export * from './offline';
export * from './classes';
import { canUseClassWeapon, classSkillCooldown, classSkillEvolution } from './classes';
import {
  RULES,
  WOODS_MONSTERS,
  BOSS_ATTACK,
  FOREST_BEAR_KEY,
  FOREST_BEAR_KEY_CHANCE,
  FOREST_BEAR_RING_CHANCE,
  type WoodsMonster,
  type CombatSkill,
  type OffensiveSkill,
  MAPS,
  QUESTS,
  INTERACTION,
  itemDefinition,
  weaponProfile,
  weaponKind,
  WEAPON_SKILL,
  weaponSkillProgression,
  type WeaponKind,
  type GatheringSkill,
  type ResourceNode,
  fishingCatch,
  gatheringXpNeeded,
  starterTool,
  GATHERING_TOOLS,
  IRON_TOOL_DURATION,
  toolDurationMultiplier,
  xpNeeded,
  type GameMap,
  type ItemId,
} from '@ros/game-data';
export type Input = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  skill: boolean;
  interact: boolean;
};
export const idleInput = (): Input => ({
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  attack: false,
  skill: false,
  interact: false,
});
export type AutoSettings = {
  skills: boolean;
  loot: boolean;
  target: 'nearest' | 'weakest';
  healBelow: number;
};
export type Actor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  grounded: boolean;
  climbing?: boolean;
  platform: string;
  dropUntil: number;
};
export type QuestState = { progress: number; claimed: boolean; trialKitClaimed?: boolean };
export type Player = Actor & {
  housing?: import('./housing').Housing;
  housingView?: import('./housing').HousingView;
  housingRevision?: number;
  carpentry?: { level: number; xp: number };
  originRevelation?: { title: string; text: string };
  unlockedRecipes?: string[];
  recipeHunts?: Record<string, number>;
  craftingSkills?: Partial<
    Record<import('@ros/game-data').ProvisionSkill, { level: number; xp: number }>
  >;
  foodBuff?: { recipeId: import('@ros/game-data').ProvisionId; expiresAt: number };
  potionReadyAt?: number;
  provisionRevision?: number;
  classId?: import('@ros/game-data').ClassId;
  skin?: import('@ros/game-data').SkinId | null;
  skinConceptVersion?: number;
  classTalents?: Partial<Record<import('@ros/game-data').ClassTalent, number>>;
  classRevision?: number;
  visitedAreas?: string[];
  teleportStarterGranted?: boolean;
  gear?: Gear[];
  equippedGear?: Partial<Record<import('@ros/game-data').EquipmentSlot, string>>;
  equipmentRevision?: number;
  combatSkills?: Partial<Record<CombatSkill, { level: number; xp: number }>>;
  lastMovedAt?: number;
  quests?: Record<string, QuestState>;
  ownedTools?: string[];
  equippedTools?: Partial<Record<GatheringSkill, string>>;
  forgeRevision?: number;
  forgeQuest?: { accepted: boolean; claimed: boolean; barsSmelted: number; toolsCrafted: number };
  blacksmithing?: { level: number; xp: number };
  gatheringSkills?: Partial<Record<GatheringSkill, { level: number; xp: number }>>;
  gathering?: { nodeId: string; startedAt: number; finishAt: number; toolId?: string };
  id: string;
  name: string;
  appearance: string;
  outfit: string;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  gold: number;
  inventory: Record<string, number>;
  weapon: string | null;
  auto: boolean;
  settings: AutoSettings;
  lastAttack: number;
  nextAttackAt?: number;
  lastSkill: number;
  lastHit: number;
  mapId: string;
  kills: number;
  bossKills?: Record<string, number>;
  firstClearRewards?: string[];
  unlockedIslands?: string[];
  accessory?: string | null;
  targetId: string | null;
};
export function activeGatheringTool(
  p: Pick<Player, 'ownedTools' | 'equippedTools' | 'level'>,
  skill: GatheringSkill,
) {
  const id = p.equippedTools?.[skill];
  return (
    GATHERING_TOOLS.find(
      (t) =>
        t.id === id &&
        t.skill === skill &&
        t.material !== 'wood' &&
        p.level >= t.level &&
        p.ownedTools?.includes(t.id),
    ) ?? starterTool(skill)
  );
}
export type Wolf = {
  monster?: WoodsMonster;
  nextSpecialAt?: number;
  lastSlamAt?: number;
  slamFacing?: number;
  special?: { x: number; y: number; radius: number; startedAt: number; impactAt: number };
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  platform: string;
  hp: number;
  deadUntil: number;
  lastAttack: number;
  state: 'idle' | 'wandering' | 'chasing' | 'attacking' | 'returning' | 'dead';
  killer: string | null;
};
export type Drop = {
  id: string;
  x: number;
  y: number;
  owner: string;
  gold: number;
  item: ItemId;
  gear?: Gear;
  items?: { item: ItemId; quantity: number }[];
  expires: number;
};
export type Projectile = {
  skillTargets?: number;
  burstRadius?: number;
  weapon?: string | null;
  training?: OffensiveSkill | null;
  critical?: boolean;
  id: string;
  owner: string;
  kind: 'arrow' | 'orb';
  x: number;
  y: number;
  startX: number;
  vx: number;
  range: number;
  damage: number;
  empowered: boolean;
  hitIds?: string[];
};
export {
  SnapshotEncoder,
  SnapshotDecoder,
  type SnapshotDelta,
  type SnapshotKeyframe,
} from './snapshot-stream';
export { equipSkin, normalizeSkin } from './skins';
export type Snapshot = {
  projectiles?: Projectile[];
  players: Player[];
  wolves: Wolf[];
  drops: Drop[];
  time: number;
  mapId: string;
};
export type Event = {
  monster?: WoodsMonster;
  type: 'hit' | 'kill' | 'level' | 'loot' | 'respawn' | 'skill' | 'bossAttack';
  radius?: number;
  critical?: boolean;
  gear?: Pick<Gear, 'name' | 'rarity'>;
  lootStage?: 'drop' | 'pickup';
  loot?: { item: string; quantity: number; rarity?: Gear['rarity'] }[];
  lootGold?: number;
  skill?: WeaponKind;
  weapon?: string | null;
  facing?: number;
  phase?: 'cast' | 'impact';
  x: number;
  y: number;
  text: string;
  playerId?: string;
  deathX?: number;
  deathY?: number;
};
export function createPlayer(id: string, name: string, mapId = 'woods'): Player {
  const m = MAPS[mapId];
  return {
    id,
    name,
    skin: 'golden-test',
    skinConceptVersion: 2,
    appearance: 'male',
    outfit: 'sage',
    x: m.spawn.x,
    y: m.spawn.y,
    vx: 0,
    vy: 0,
    facing: 1,
    grounded: true,
    platform: 'ground',
    dropUntil: 0,
    level: 1,
    xp: 0,
    hp: 100,
    mp: 50,
    gold: 0,
    inventory: {},
    weapon: null,
    quests: {},
    auto: false,
    settings: { skills: true, loot: true, target: 'nearest', healBelow: 30 },
    lastAttack: 0,
    lastSkill: 0,
    lastHit: 0,
    mapId,
    kills: 0,
    targetId: null,
  };
}
export function grantXp(p: Player, amount: number) {
  p.xp += amount;
  let levels = 0;
  while (p.xp >= xpNeeded(p.level) && p.level < 100) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    p.hp = playerAttributes(p).maxHealth;
    p.mp = playerAttributes(p).maxMana;
    levels++;
  }
  return levels;
}
export function moveActor(p: Actor, input: Input, map: GameMap, dt: number, now: number) {
  const oldY = p.y;
  const ladder = map.ladders
    .filter(
      (l) =>
        Math.abs(p.x - l.x) < 30 &&
        p.y >= l.top - 1 &&
        p.y <= l.bottom + 1 &&
        (!input.up || p.y > l.top + 1) &&
        (!input.down || p.y < l.bottom - 1),
    )
    .sort((a, b) => Math.abs(p.x - a.x) - Math.abs(p.x - b.x))[0];
  p.vx = (Number(input.right) - Number(input.left)) * RULES.speed;
  if (p.vx) p.facing = Math.sign(p.vx);
  if (input.down && input.jump && p.platform !== 'ground') {
    p.dropUntil = now + 350;
    p.grounded = false;
    p.vy = 80;
  } else if (input.jump && p.grounded) {
    p.vy = -RULES.jump;
    p.grounded = false;
  }
  const climbing =
    !!ladder &&
    (input.up || input.down || p.climbing === true) &&
    !input.jump &&
    Math.abs(p.vx) < 1;
  if (climbing) {
    p.vy = (Number(input.down) - Number(input.up)) * RULES.climb;
    p.x += Math.sign(ladder!.x - p.x) * Math.min(Math.abs(ladder!.x - p.x), RULES.speed * dt);
    p.grounded = false;
  } else p.vy += RULES.gravity * dt;
  p.x = Math.max(22, Math.min(map.width - 22, p.x + p.vx * dt));
  p.y += p.vy * dt;
  p.climbing = climbing;
  p.grounded = false;
  if (p.vy >= 0 && !climbing) {
    for (const floor of [...map.platforms].sort((a, b) => a.y - b.y)) {
      if (
        p.x >= floor.x - 8 &&
        p.x <= floor.x + floor.width + 8 &&
        oldY <= floor.y + 2 &&
        p.y >= floor.y &&
        (!floor.oneWay || now >= p.dropUntil)
      ) {
        p.y = floor.y;
        p.vy = 0;
        p.grounded = true;
        p.platform = floor.id;
        break;
      }
    }
  }
  if (climbing && p.y <= ladder!.top) {
    p.y = ladder!.top;
    p.platform = ladder!.to;
    p.vy = 0;
    p.grounded = true;
  }
  if (climbing && p.y >= ladder!.bottom) {
    p.y = ladder!.bottom;
    p.platform = ladder!.from;
    p.vy = 0;
    p.grounded = true;
  }
  if (p.grounded) p.climbing = false;
}
export function platformRoute(
  map: GameMap,
  from: string,
  to: string,
): { ladder: number; up: boolean }[] {
  const queue: [string, { ladder: number; up: boolean }[]][] = [[from, []]];
  const seen = new Set<string>();
  while (queue.length) {
    const [id, path] = queue.shift()!;
    if (id === to) return path;
    if (seen.has(id)) continue;
    seen.add(id);
    map.ladders.forEach((l, i) => {
      if (l.from === id) queue.push([l.to, [...path, { ladder: i, up: true }]]);
      if (l.to === id) queue.push([l.from, [...path, { ladder: i, up: false }]]);
    });
  }
  return [];
}
export function autoInput(
  p: Player,
  wolves: Wolf[],
  map: GameMap,
  now: number,
  drops: Drop[] = [],
): Input {
  const i = idleInput();
  const alive = wolves.filter(
    (w) =>
      w.hp > 0 && (w.platform === p.platform || platformRoute(map, p.platform, w.platform).length),
  );
  alive.sort((a, b) =>
    p.settings.target === 'weakest'
      ? a.hp - b.hp
      : Math.abs(a.x - p.x) +
        Math.abs(a.y - p.y) * 2 -
        (Math.abs(b.x - p.x) + Math.abs(b.y - p.y) * 2),
  );
  const loot = p.settings.loot
    ? drops
        .filter((d) => d.owner === p.id && d.expires > now)
        .map((d) => ({
          ...d,
          platform: map.platforms.find((f) => Math.abs(f.y - d.y) < 2)?.id ?? '',
        }))
        .filter(
          (d) =>
            d.platform &&
            (d.platform === p.platform || platformRoute(map, p.platform, d.platform).length),
        )
        .sort(
          (a, b) =>
            Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - Math.abs(b.x - p.x) - Math.abs(b.y - p.y),
        )[0]
    : undefined;
  const target = loot ?? alive.find((w) => w.id === p.targetId) ?? alive[0];
  p.targetId = loot ? null : (target?.id ?? null);
  if (!target) return i;
  const route = platformRoute(map, p.platform, target.platform);
  if (p.platform !== target.platform && route.length) {
    const step = route[0];
    const l = map.ladders[step.ladder];
    if (Math.abs(p.x - l.x) > 8) {
      i.left = p.x > l.x;
      i.right = p.x < l.x;
    } else {
      i.up = step.up;
      i.down = !step.up;
    }
    return i;
  }
  const dx = target.x - p.x;
  const bossReach =
    !loot && 'monster' in target && WOODS_MONSTERS[target.monster ?? 'wolf'].boss
      ? BOSS_ATTACK.bodyRadius
      : 0;
  if (Math.abs(dx) > (loot ? 80 : weaponProfile(p.weapon).range - 14 + bossReach)) {
    i.left = dx < 0;
    i.right = dx > 0;
  } else {
    p.facing = dx < 0 ? -1 : 1;
    i.attack = !loot;
    i.skill =
      !loot &&
      p.settings.skills &&
      p.mp >= WEAPON_SKILL.mana &&
      now - p.lastSkill >= classSkillCooldown(p);
  }
  return i;
}
export class World {
  projectiles: Projectile[] = [];
  flurry: {
    owner: string;
    target: string;
    weapon: Player['weapon'];
    at: number;
    damage: number;
    training?: OffensiveSkill | null;
    critical?: boolean;
  }[] = [];
  players = new Map<string, Player>();
  wolves: Wolf[];
  drops: Drop[] = [];
  events: Event[] = [];
  serial = 0;
  constructor(public map: GameMap) {
    this.wolves = map.spawns.map((s, i) => ({
      id: `wolf-${i}`,
      monster: map.monster,
      x: s.x,
      y: s.y,
      homeX: s.x,
      homeY: s.y,
      platform: s.platform,
      hp: WOODS_MONSTERS[map.monster ?? 'wolf'].hp,
      deadUntil: 0,
      lastAttack: 0,
      state: 'idle',
      killer: null,
    }));
  }
  nearResource(p: Player, node: ResourceNode) {
    return (
      p.mapId === this.map.id &&
      p.grounded &&
      !p.climbing &&
      p.platform === node.platform &&
      Math.abs(p.x - node.x) <= 72 &&
      Math.abs(p.y - node.y) < 40
    );
  }
  startGathering(p: Player, nodeId: string, now: number) {
    const node = this.map.resources?.find((n) => n.id === nodeId);
    if (
      !node ||
      !this.nearResource(p, node) ||
      (p.gatheringSkills?.[node.skill]?.level ?? 1) < (node.level ?? 1)
    )
      return false;
    if (p.gathering) return true;
    p.auto = false;
    const tool = activeGatheringTool(p, node.skill);
    p.gathering = {
      nodeId,
      startedAt: now,
      finishAt: now + node.duration * toolDurationMultiplier(tool.material),
      toolId: tool.id,
    };
    return true;
  }
  stepGathering(p: Player, input: Input, now: number) {
    const active = p.gathering;
    if (!active) return;
    const node = this.map.resources?.find((n) => n.id === active.nodeId);
    if (
      !node ||
      !this.nearResource(p, node) ||
      input.left ||
      input.right ||
      input.up ||
      input.down ||
      input.jump ||
      input.attack ||
      input.skill ||
      p.lastHit > active.startedAt
    ) {
      delete p.gathering;
      return;
    }
    if (now < active.finishAt) return;
    p.gatheringSkills ??= {};
    const skill = (p.gatheringSkills[node.skill] ??= { level: 1, xp: 0 });
    const item = node.item ?? fishingCatch(skill.level, Math.random(), node.fish);
    const quantity = node.skill === 'Fishing' ? 1 : 1 + Math.floor(Math.random() * 3);
    p.inventory[item] = (p.inventory[item] ?? 0) + quantity;
    skill.xp += 10;
    while (skill.xp >= gatheringXpNeeded(skill.level)) {
      skill.xp -= gatheringXpNeeded(skill.level);
      skill.level++;
    }
    // Start a fresh timed cycle; a delayed tick never grants catch-up rewards.
    active.startedAt = now;
    active.finishAt =
      now + node.duration * toolDurationMultiplier(activeGatheringTool(p, node.skill).material);
    this.events.push({
      type: 'loot',
      x: p.x,
      y: p.y - 60,
      text: `+${quantity} ${item.replaceAll('-', ' ')} · ${node.skill} +10 XP`,
      loot: [{ item, quantity }],
      playerId: p.id,
    });
  }
  step(dt: number, now: number, inputs: Map<string, Input>) {
    this.events = [];
    for (const p of this.players.values()) {
      let i = inputs.get(p.id) ?? idleInput();
      if (Object.values(i).some(Boolean)) p.auto = false;
      if (p.auto) i = autoInput(p, this.wolves, this.map, now, this.drops);
      moveActor(p, i, this.map, dt, now);
      if (i.left || i.right || i.up || i.down || i.jump) p.lastMovedAt = now;
      this.stepGathering(p, i, now);
      if (p.y > this.map.height + 100) {
        p.x = this.map.spawn.x;
        p.y = this.map.spawn.y;
        p.hp = playerAttributes(p).maxHealth;
        p.vy = 0;
        p.vx = 0;
        p.climbing = false;
        p.grounded = true;
        p.platform = 'ground';
      }
      expireFood(p, now);
      if (now - p.lastHit > 6000)
        p.hp = Math.min(playerAttributes(p).maxHealth, p.hp + dt * playerAttributes(p).healthRegen);
      p.mp = Math.min(playerAttributes(p).maxMana, p.mp + dt * playerAttributes(p).manaRegen);
      if (p.auto && p.hp < (playerAttributes(p).maxHealth * p.settings.healBelow) / 100) {
        p.hp = Math.min(playerAttributes(p).maxHealth, p.hp + dt * 5);
      }
      if (i.attack || i.skill) this.attack(p, i.skill, now);
      if (!p.auto || p.settings.loot) this.collect(p, now);
    }
    for (const w of this.wolves) {
      if (w.hp <= 0) {
        delete w.special;
        delete w.nextSpecialAt;
        delete w.lastSlamAt;
        delete w.slamFacing;
        if (now >= w.deadUntil) {
          w.hp = WOODS_MONSTERS[w.monster ?? 'wolf'].hp;
          w.x = w.homeX;
          w.state = 'idle';
          w.killer = null;
        }
        continue;
      }
      const stats = WOODS_MONSTERS[w.monster ?? 'wolf'];
      if (w.special) {
        w.state = 'attacking';
        if (now >= w.special.impactAt) this.resolveBossSpecial(w, now);
        continue;
      }
      if (stats.boss && w.lastSlamAt !== undefined && now - w.lastSlamAt < BOSS_ATTACK.recovery) {
        w.state = 'attacking';
        continue;
      }
      const platform = this.map.platforms.find((f) => f.id === w.platform)!;
      const nearest = [...this.players.values()]
        .filter((p) => Math.abs(p.y - w.y) < (stats.boss ? 300 : 55))
        .sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0];
      if (nearest && Math.abs(nearest.x - w.x) < (stats.boss ? BOSS_ATTACK.aggroRange : 260)) {
        if (stats.boss) {
          w.nextSpecialAt ??= now + BOSS_ATTACK.firstSpecialDelay;
          if (now >= w.nextSpecialAt) {
            const floor = this.map.platforms.find((p) => p.id === nearest.platform);
            const x = Math.max(
              BOSS_ATTACK.radius,
              Math.min(this.map.width - BOSS_ATTACK.radius, nearest.x),
            );
            w.slamFacing = nearest.x < w.x ? -1 : 1;
            w.special = {
              x,
              y: floor?.y ?? w.y,
              radius: BOSS_ATTACK.radius,
              startedAt: now,
              impactAt: now + BOSS_ATTACK.windup,
            };
            w.state = 'attacking';
            w.lastAttack = now;
            continue;
          }
        }
        const dx = nearest.x - w.x;
        w.state =
          Math.abs(dx) < (stats.boss ? BOSS_ATTACK.basicRange : 44) ? 'attacking' : 'chasing';
        if (w.state === 'chasing')
          w.x += Math.sign(dx) * WOODS_MONSTERS[w.monster ?? 'wolf'].speed * dt;
        else if (Math.abs(nearest.y - w.y) < 100 && now - w.lastAttack > stats.cooldown) {
          w.lastAttack = now;
          this.hitPlayer(nearest, WOODS_MONSTERS[w.monster ?? 'wolf'].damage, now);
        }
      } else {
        w.state = Math.abs(w.x - w.homeX) > 100 ? 'returning' : 'wandering';
        w.x +=
          (w.state === 'returning'
            ? Math.sign(w.homeX - w.x)
            : Math.sin(now / 1800 + Number(w.id.slice(-1)))) *
          25 *
          dt;
      }
      w.x = Math.max(platform.x + 25, Math.min(platform.x + platform.width - 25, w.x));
    }
    this.stepFlurry(now);
    this.stepProjectiles(dt, now);
    this.drops = this.drops.filter((d) => d.expires > now);
  }
  hitPlayer(p: Player, amount: number, now: number, kind: 'basic' | 'special' = 'basic') {
    const stats = playerAttributes(p);
    if (kind === 'basic') {
      if (stats.dodgeChance > 0 && Math.random() < stats.dodgeChance) {
        this.events.push({ type: 'hit', x: p.x, y: p.y - 55, text: 'Dodge!', playerId: p.id });
        return;
      }
      const blocked = stats.blockChance > 0 && Math.random() < stats.blockChance;
      amount = Math.max(
        1,
        Math.round(Math.max(1, amount - stats.armor) * (blocked ? 1 - stats.blockReduction : 1)),
      );
      if (blocked)
        this.events.push({ type: 'hit', x: p.x, y: p.y - 80, text: 'Block!', playerId: p.id });
    }

    p.hp -= amount;
    p.lastHit = now;
    delete p.gathering;
    this.events.push({ type: 'hit', x: p.x, y: p.y - 55, text: `−${amount}`, playerId: p.id });
    if (p.hp > 0) return;
    const deathX = p.x,
      deathY = p.y;
    this.flurry = this.flurry.filter((strike) => strike.owner !== p.id);
    p.hp = playerAttributes(p).maxHealth;
    p.x = this.map.spawn.x;
    p.y = this.map.spawn.y;
    p.platform = 'ground';
    p.auto = false;
    p.vy = 0;
    p.vx = 0;
    p.climbing = false;
    p.grounded = true;
    this.events.push({
      type: 'respawn',
      x: p.x,
      y: p.y,
      text: 'Returned to safety',
      deathX,
      deathY,
      playerId: p.id,
    });
  }
  resolveBossSpecial(w: Wolf, now: number) {
    const zone = w.special;
    if (!zone || now < zone.impactAt) return;
    delete w.special;
    w.nextSpecialAt = now + BOSS_ATTACK.specialCooldown;
    w.lastAttack = now;
    if (w.hp <= 0) return;
    w.lastSlamAt = now;
    this.events.push({
      type: 'bossAttack',
      phase: 'impact',
      x: zone.x,
      y: zone.y,
      radius: zone.radius,
      monster: w.monster,
      text: w.monster === 'crystal-wyrm' ? 'CRYSTAL ERUPTION!' : 'GROUND SLAM!',
    });
    for (const p of this.players.values()) {
      if (
        Math.abs(p.x - zone.x) <= zone.radius &&
        p.y > zone.y - BOSS_ATTACK.height &&
        p.y <= zone.y + 30
      )
        this.hitPlayer(
          p,
          WOODS_MONSTERS[w.monster ?? 'wolf'].damage * BOSS_ATTACK.specialDamageMultiplier,
          now,
          'special',
        );
    }
  }
  attack(p: Player, skill: boolean, now: number) {
    if (!canUseClassWeapon(p, p.weapon)) return;
    const profile = weaponProfile(p.weapon);
    const evolution = classSkillEvolution(p);
    if (now < (p.nextAttackAt ?? p.lastAttack + profile.cooldown)) return;
    const empowered =
      skill && p.mp >= WEAPON_SKILL.mana && now - p.lastSkill >= classSkillCooldown(p);
    if (skill && !empowered) return;
    p.lastAttack = now;
    p.nextAttackAt = now + profile.cooldown;
    if (empowered) {
      p.mp -= WEAPON_SKILL.mana;
      this.events.push({
        type: 'skill',
        skill: weaponKind(p.weapon),
        weapon: p.weapon,
        phase: 'cast',
        facing: p.facing,
        playerId: p.id,
        x: p.x,
        y: p.y - 30,
        text: profile.skillName,
      });
      p.lastSkill = now;
    }
    const stats = playerAttributes(p);
    const critical = stats.critChance > 0 && Math.random() < stats.critChance;
    const training = activeCombatSkill(p);
    const hit = Math.round(
      attackPower(p) *
        (empowered ? evolution.damageMultiplier : 1) *
        (critical ? stats.critDamage : 1),
    );
    if (profile.projectile) {
      this.projectiles.push({
        id: `shot-${++this.serial}`,
        owner: p.id,
        weapon: p.weapon,
        kind: profile.projectile,
        x: p.x + p.facing * 18,
        y: p.y - 30,
        startX: p.x,
        vx: p.facing * profile.speed * (empowered && profile.projectile === 'arrow' ? 1.35 : 1),
        range:
          profile.range *
          (empowered && profile.projectile === 'arrow' ? evolution.arrowRangeMultiplier : 1),
        damage: hit,
        empowered,
        skillTargets: evolution.maxTargets,
        burstRadius: evolution.burstRadius,
        training,
        critical,
      });
      return;
    }
    const targets = this.wolves
      .filter(
        (w) =>
          w.hp > 0 &&
          Math.abs(w.y - p.y) < 55 &&
          Math.abs(w.x - p.x) <
            (empowered ? profile.range + evolution.meleeReach : profile.range) +
              (WOODS_MONSTERS[w.monster ?? 'wolf'].boss ? BOSS_ATTACK.bodyRadius : 0) &&
          (w.x - p.x) * p.facing >= -12,
      )
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    if (empowered && weaponKind(p.weapon) === 'dagger') {
      const target = targets[0];
      if (target) {
        const strike = Math.round(
          attackPower(p) * evolution.flurryMultiplier * (critical ? stats.critDamage : 1),
        );
        this.hitWolf(p, target, strike, now, { skill: training, focus: true, critical });
        for (let strikeIndex = 1; strikeIndex < evolution.flurryStrikes; strikeIndex++)
          this.flurry.push({
            owner: p.id,
            target: target.id,
            weapon: p.weapon,
            at: now + strikeIndex * 110,
            damage: strike,
            training,
            critical,
          });
      }
    } else
      for (const w of targets.slice(0, empowered ? evolution.maxTargets : 1))
        this.hitWolf(p, w, hit, now, { skill: training, focus: empowered, critical });
  }
  stepFlurry(now: number) {
    this.flurry = this.flurry.filter((strike) => {
      const owner = this.players.get(strike.owner),
        target = this.wolves.find((w) => w.id === strike.target);
      if (!owner || owner.weapon !== strike.weapon || !target || target.hp <= 0) return false;
      if (now < strike.at) return true;
      if (
        Math.abs(target.x - owner.x) <
          weaponProfile(owner.weapon).range +
            classSkillEvolution(owner).meleeReach +
            (WOODS_MONSTERS[target.monster ?? 'wolf'].boss ? BOSS_ATTACK.bodyRadius : 0) &&
        Math.abs(target.y - owner.y) < 55 &&
        (target.x - owner.x) * owner.facing >= -12
      ) {
        this.hitWolf(owner, target, strike.damage, now, {
          skill: strike.training ?? weaponTrainingSkill(owner.weapon),
          focus: true,
          critical: !!strike.critical,
        });
        this.events.push({
          type: 'skill',
          skill: 'dagger',
          weapon: strike.weapon,
          phase: 'impact',
          facing: owner.facing,
          x: target.x,
          y: target.y - 30,
          text: '',
        });
      }
      return false;
    });
  }
  hitWolf(
    p: Player,
    w: Wolf,
    hit: number,
    now: number,
    training = {
      skill: activeCombatSkill(p) as OffensiveSkill | null,
      focus: false,
      critical: false,
    },
  ) {
    if (w.hp <= 0) return;
    if (training.skill && p.classId && hit > 0) {
      trainCombat(p, training.skill, 3);
    }
    w.hp = Math.max(0, w.hp - hit);
    this.events.push({
      type: 'hit',
      x: w.x,
      y: w.y - 50,
      text: training.critical ? `${hit} CRIT!` : String(hit),
      critical: training.critical,
    });
    if (!w.hp) {
      w.state = 'dead';
      delete w.special;
      delete w.nextSpecialAt;
      delete w.lastSlamAt;
      delete w.slamFacing;
      const stats = WOODS_MONSTERS[w.monster ?? 'wolf'];
      w.deadUntil = now + stats.respawn;
      w.killer = p.id;
      p.kills++;
      advanceQuests(p, w.monster ?? 'wolf', this.map.id);
      if (w.monster === 'wild-boar' && Math.random() < FOREST_BEAR_KEY_CHANCE) {
        p.inventory[FOREST_BEAR_KEY] = (p.inventory[FOREST_BEAR_KEY] ?? 0) + 1;
        this.events.push({
          type: 'loot',
          x: p.x,
          y: p.y - 105,
          text: '+1 Forest Bear Key',
          loot: [{ item: FOREST_BEAR_KEY, quantity: 1 }],
          playerId: p.id,
        });
      }
      if (w.monster === 'shard-scorpion' && Math.random() < 0.2) {
        p.inventory['crystal-boss-key'] = (p.inventory['crystal-boss-key'] ?? 0) + 1;
        this.events.push({
          type: 'loot',
          x: p.x,
          y: p.y - 105,
          text: 'Crystal Wyrm Key',
          loot: [{ item: 'crystal-boss-key', quantity: 1 }],
          playerId: p.id,
        });
      }
      if (w.monster === 'crystal-wyrm') {
        p.bossKills ??= {};
        p.bossKills['crystal-wyrm'] = (p.bossKills['crystal-wyrm'] ?? 0) + 1;
        if (!p.firstClearRewards?.includes('crystal-wyrm')) {
          (p.firstClearRewards ??= []).push('crystal-wyrm');
          (p.unlockedIslands ??= []).push('murkmire');
          p.inventory['crystal-wyrm-trophy'] = (p.inventory['crystal-wyrm-trophy'] ?? 0) + 1;
          p.gold += 500;
          this.events.push({
            type: 'loot',
            x: p.x,
            y: p.y - 130,
            text: 'Crystal Wyrm defeated',
            lootGold: 500,
            loot: [{ item: 'crystal-wyrm-trophy', quantity: 1 }],
            playerId: p.id,
          });
        }
      }
      if (w.monster === 'forest-bear') {
        p.bossKills ??= {};
        p.bossKills['forest-bear'] = (p.bossKills['forest-bear'] ?? 0) + 1;
        if (applyWoodsMilestones(p))
          this.events.push({
            type: 'loot',
            x: p.x,
            y: p.y - 130,
            text: 'First clear! +100 gold · Trophy · Crystal Caverns unlocked',
            lootGold: 100,
            loot: [{ item: 'forest-bear-trophy', quantity: 1 }],
            playerId: p.id,
          });
      }
      const leveled = grantXp(p, stats.xp);
      this.events.push({
        type: leveled ? 'level' : 'kill',
        x: p.x,
        y: p.y - 80,
        text: leveled ? `Level ${p.level}!` : `+${stats.xp} XP`,
        playerId: p.id,
      });
      const monster = w.monster ?? 'wolf';
      const materials = {
        'cave-bat': 'bat-wing',
        'crystal-golem': 'golem-core',
        'shard-scorpion': 'shard-stinger',
        'crystal-wyrm': 'wyrm-scale',
        'thorn-spider': 'thorn-silk',
        'wild-boar': 'boar-tusk',
        'forest-bear': 'bear-claw',
      } as const;
      const items: { item: ItemId; quantity: number }[] =
        monster === 'wolf' ? [{ item: 'wolf-pelt', quantity: 1 }] : [];
      const scroll = rollRecipeDrop(
        p,
        this.map.island,
        !!stats.boss,
        this.drops
          .filter((d) => d.owner === p.id)
          .flatMap((d) => (d.items ?? []).map((b) => b.item)),
      );
      if (scroll) items.push({ item: scroll, quantity: 1 });
      if (monster === 'forest-bear' && Math.random() < FOREST_BEAR_RING_CHANCE)
        items.push({ item: 'forest-guardian-ring', quantity: 1 });
      this.drops.push({
        id: `drop-${++this.serial}`,
        x: w.x,
        y: w.y,
        owner: p.id,
        gear:
          stats.boss || Math.random() < 0.1
            ? islandGearDrop(
                this.map.island,
                {
                  wolf: 1,
                  'thorn-spider': 4,
                  'wild-boar': 7,
                  'forest-bear': 10,
                  'cave-bat': 11,
                  'crystal-golem': 14,
                  'shard-scorpion': 17,
                  'crystal-wyrm': 20,
                }[monster],
              )
            : undefined,
        gold: stats.gold,
        item: monster === 'wolf' ? (p.kills % 5 === 0 ? 'sword' : 'fang') : materials[monster],
        items,
        expires: now + 60000,
      });
      if (Math.random() < TELEPORT_CRYSTAL_DROP_CHANCE)
        items.push({ item: 'teleport-crystal', quantity: 1 });
      const droppedGear = this.drops[this.drops.length - 1].gear;
      if (droppedGear)
        this.events.push({
          type: 'loot',
          x: w.x,
          y: w.y - 90,
          text: `${droppedGear.rarity} ${droppedGear.name} dropped!`,
          playerId: p.id,
          gear: { name: droppedGear.name, rarity: droppedGear.rarity },
          lootStage: 'drop',
          loot: [{ item: droppedGear.base, quantity: 1, rarity: droppedGear.rarity }],
        });
    }
  }
  stepProjectiles(dt: number, now: number) {
    this.projectiles = this.projectiles.filter((shot) => {
      const owner = this.players.get(shot.owner);
      if (!owner) return false;
      const previous = shot.x;
      const end = shot.startX + Math.sign(shot.vx) * shot.range;
      shot.x =
        shot.vx > 0 ? Math.min(end, shot.x + shot.vx * dt) : Math.max(end, shot.x + shot.vx * dt);
      const targets = this.wolves
        .filter(
          (w) =>
            w.hp > 0 &&
            !shot.hitIds?.includes(w.id) &&
            shot.y >=
              w.y - (WOODS_MONSTERS[w.monster ?? 'wolf'].boss ? BOSS_ATTACK.bodyHeight : 60) &&
            shot.y <= w.y &&
            w.x + (WOODS_MONSTERS[w.monster ?? 'wolf'].boss ? BOSS_ATTACK.bodyRadius : 23) >=
              Math.min(previous, shot.x) &&
            w.x - (WOODS_MONSTERS[w.monster ?? 'wolf'].boss ? BOSS_ATTACK.bodyRadius : 23) <=
              Math.max(previous, shot.x),
        )
        .sort((a, b) => Math.abs(a.x - previous) - Math.abs(b.x - previous));
      if (shot.empowered && shot.kind === 'arrow') {
        shot.hitIds ??= [];
        for (const target of targets) {
          this.hitWolf(owner, target, shot.damage, now, {
            skill: shot.training ?? (shot.kind === 'arrow' ? 'Distance' : 'Magic'),
            focus: shot.empowered,
            critical: !!shot.critical,
          });
          shot.hitIds.push(target.id);
          if (
            shot.hitIds.length >=
            (shot.skillTargets ?? weaponSkillProgression(shot.weapon).maxTargets)
          )
            return false;
        }
        return Math.abs(shot.x - shot.startX) < shot.range;
      }
      const first = targets[0];
      if (first) {
        const affected = shot.empowered
          ? [
              first,
              ...this.wolves.filter(
                (w) =>
                  w !== first &&
                  w.hp > 0 &&
                  Math.abs(w.x - first.x) <
                    (shot.burstRadius ?? weaponSkillProgression(shot.weapon).burstRadius) &&
                  Math.abs(w.y - first.y) < 55,
              ),
            ].slice(0, shot.skillTargets ?? weaponSkillProgression(shot.weapon).maxTargets)
          : [first];
        for (const w of affected)
          this.hitWolf(owner, w, shot.damage, now, {
            skill: shot.training ?? (shot.kind === 'arrow' ? 'Distance' : 'Magic'),
            focus: shot.empowered,
            critical: !!shot.critical,
          });
        if (shot.empowered)
          this.events.push({
            type: 'skill',
            skill: 'staff',
            weapon: shot.weapon,
            phase: 'impact',
            x: first.x,
            y: first.y - 30,
            text: '',
          });
        return false;
      }
      return Math.abs(shot.x - shot.startX) < shot.range;
    });
  }
  collect(p: Player, now: number) {
    for (const d of this.drops.filter(
      (d) => d.owner === p.id && Math.abs(d.x - p.x) < 110 && Math.abs(d.y - p.y) < 55,
    )) {
      if (d.gear) {
        (p.gear ??= []).push(d.gear);
        this.events.push({
          type: 'loot',
          x: p.x,
          y: p.y - 110,
          text: `Collected ${d.gear.rarity} ${d.gear.name}`,
          playerId: p.id,
          gear: { name: d.gear.name, rarity: d.gear.rarity },
          lootStage: 'pickup',
          loot: [{ item: d.gear.base, quantity: 1, rarity: d.gear.rarity }],
        });
      }
      p.gold += d.gold;
      if (!collectRecipe(p, d.item)) p.inventory[d.item] = (p.inventory[d.item] ?? 0) + 1;
      for (const bonus of d.items ?? [])
        if (!collectRecipe(p, bonus.item))
          p.inventory[bonus.item] = (p.inventory[bonus.item] ?? 0) + bonus.quantity;
      this.drops = this.drops.filter((x) => x.id !== d.id);
      this.events.push({
        type: 'loot',
        x: p.x,
        y: p.y - 40,
        lootGold: d.gold,
        lootStage: 'pickup',
        loot: [
          { item: d.item, quantity: 1 },
          ...(d.items ?? []).map((b) => ({ item: b.item, quantity: b.quantity })),
        ],
        text: `+${d.gold} gold · ${[d.item, ...(d.items ?? []).map((b) => b.item)].map((id) => itemDefinition(id)?.name ?? id).join(' · ')}`,
        playerId: p.id,
      });
    }
  }
  snapshot(now: number, viewerId?: string): Snapshot {
    return {
      players: [...this.players.values()].map((p) => {
        if (!viewerId || p.id === viewerId) return p;
        const visible = { ...p, inventory: {}, gold: 0, xp: 0, kills: 0 };
        for (const key of [
          'housing',
          'housingView',
          'housingRevision',
          'carpentry',
          'gear',
          'equippedGear',
          'equipmentRevision',
          'combatSkills',
          'quests',
          'ownedTools',
          'equippedTools',
          'skinConceptVersion',
          'originRevelation',
          'unlockedRecipes',
          'recipeHunts',
          'craftingSkills',
          'foodBuff',
          'potionReadyAt',
          'provisionRevision',
          'forgeRevision',
          'forgeQuest',
          'blacksmithing',
          'gatheringSkills',
          'bossKills',
          'firstClearRewards',
          'unlockedIslands',
          'visitedAreas',
          'classTalents',
          'classRevision',
          'teleportStarterGranted',
        ] as const)
          delete visible[key];
        return visible;
      }),
      wolves: this.wolves,
      drops: this.drops,
      projectiles: this.projectiles,
      time: now,
      mapId: this.map.id,
    };
  }
}
export function offlineReward(start: number, now: number) {
  const seconds = Math.max(0, Math.min((now - start) / 1000, RULES.offlineCapHours * 3600));
  const minutes = Math.floor(seconds / 60);
  return {
    seconds: Math.floor(seconds),
    xp: minutes * RULES.offlineXpPerMinute,
    gold: minutes * RULES.offlineGoldPerMinute,
  };
}

export function questStatus(
  p: Pick<Player, 'quests'>,
  id = 'mira-wolves',
): 'available' | 'active' | 'ready' | 'claimed' {
  const state = p.quests?.[id];
  if (!state) return 'available';
  if (state.claimed) return 'claimed';
  const quest = QUESTS[id as keyof typeof QUESTS];
  return quest && state.progress >= quest.target.count ? 'ready' : 'active';
}
export function advanceQuests(p: Player, monsterId: string, mapId: string) {
  for (const [id, quest] of Object.entries(QUESTS)) {
    const state = p.quests?.[id];
    if (
      state &&
      !state.claimed &&
      quest.target.monsterId === monsterId &&
      quest.target.mapId === mapId
    )
      state.progress = Math.min(quest.target.count, state.progress + 1);
  }
}
export function nearNpc(p: Pick<Player, 'x' | 'y'>, map: GameMap, id: string) {
  const npc = map.npcs.find((n) => n.id === id);
  return (
    !!npc &&
    Math.abs(p.x - npc.x) <= INTERACTION.horizontal &&
    Math.abs(p.y - npc.y) <= INTERACTION.vertical
  );
}

export function needsTrialWeapons(p: Pick<Player, 'quests'>) {
  const quest = p.quests?.['mira-wolves'];
  return !!quest?.claimed && !quest.trialKitClaimed;
}
