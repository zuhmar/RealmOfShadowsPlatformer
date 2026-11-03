import {
  RULES,
  MAPS,
  QUESTS,
  INTERACTION,
  weaponBonus,
  weaponProfile,
  weaponKind,
  WEAPON_SKILL,
  type WeaponKind,
  maxHp,
  xpNeeded,
  damage,
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
  quests?: Record<string, QuestState>;
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
  targetId: string | null;
};
export type Wolf = {
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
  expires: number;
};
export type Projectile = {
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
export type Snapshot = {
  projectiles?: Projectile[];
  players: Player[];
  wolves: Wolf[];
  drops: Drop[];
  time: number;
  mapId: string;
};
export type Event = {
  type: 'hit' | 'kill' | 'level' | 'loot' | 'respawn' | 'skill';
  skill?: WeaponKind;
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
    p.hp = maxHp(p.level);
    p.mp = 50;
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
  if (Math.abs(dx) > (loot ? 80 : weaponProfile(p.weapon).range - 14)) {
    i.left = dx < 0;
    i.right = dx > 0;
  } else {
    p.facing = dx < 0 ? -1 : 1;
    i.attack = !loot;
    i.skill =
      !loot &&
      p.settings.skills &&
      p.mp >= WEAPON_SKILL.mana &&
      now - p.lastSkill >= WEAPON_SKILL.cooldown;
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
  }[] = [];
  players = new Map<string, Player>();
  wolves: Wolf[];
  drops: Drop[] = [];
  events: Event[] = [];
  serial = 0;
  constructor(public map: GameMap) {
    this.wolves = map.spawns.map((s, i) => ({
      id: `wolf-${i}`,
      x: s.x,
      y: s.y,
      homeX: s.x,
      homeY: s.y,
      platform: s.platform,
      hp: RULES.wolfHp,
      deadUntil: 0,
      lastAttack: 0,
      state: 'idle',
      killer: null,
    }));
  }
  step(dt: number, now: number, inputs: Map<string, Input>) {
    this.events = [];
    for (const p of this.players.values()) {
      let i = inputs.get(p.id) ?? idleInput();
      if (Object.values(i).some(Boolean)) p.auto = false;
      if (p.auto) i = autoInput(p, this.wolves, this.map, now, this.drops);
      moveActor(p, i, this.map, dt, now);
      if (p.y > this.map.height + 100) {
        p.x = this.map.spawn.x;
        p.y = this.map.spawn.y;
        p.hp = maxHp(p.level);
        p.vy = 0;
        p.vx = 0;
        p.climbing = false;
        p.grounded = true;
        p.platform = 'ground';
      }
      if (now - p.lastHit > 6000) p.hp = Math.min(maxHp(p.level), p.hp + dt * 3);
      p.mp = Math.min(50, p.mp + dt * 1.5);
      if (p.auto && p.hp < (maxHp(p.level) * p.settings.healBelow) / 100) {
        p.hp = Math.min(maxHp(p.level), p.hp + dt * 5);
      }
      if (i.attack || i.skill) this.attack(p, i.skill, now);
      if (!p.auto || p.settings.loot) this.collect(p, now);
    }
    for (const w of this.wolves) {
      if (w.hp <= 0) {
        if (now >= w.deadUntil) {
          w.hp = RULES.wolfHp;
          w.x = w.homeX;
          w.state = 'idle';
          w.killer = null;
        }
        continue;
      }
      const platform = this.map.platforms.find((f) => f.id === w.platform)!;
      const nearest = [...this.players.values()]
        .filter((p) => Math.abs(p.y - w.y) < 55)
        .sort((a, b) => Math.abs(a.x - w.x) - Math.abs(b.x - w.x))[0];
      if (nearest && Math.abs(nearest.x - w.x) < 260) {
        const dx = nearest.x - w.x;
        w.state = Math.abs(dx) < 44 ? 'attacking' : 'chasing';
        if (w.state === 'chasing') w.x += Math.sign(dx) * 75 * dt;
        else if (now - w.lastAttack > 1200) {
          w.lastAttack = now;
          nearest.hp -= RULES.wolfDamage;
          nearest.lastHit = now;
          this.events.push({
            type: 'hit',
            x: nearest.x,
            y: nearest.y - 55,
            text: `−${RULES.wolfDamage}`,
            playerId: nearest.id,
          });
          if (nearest.hp <= 0) {
            const deathX = nearest.x,
              deathY = nearest.y;
            this.flurry = this.flurry.filter((strike) => strike.owner !== nearest.id);
            nearest.hp = maxHp(nearest.level);
            nearest.x = this.map.spawn.x;
            nearest.y = this.map.spawn.y;
            nearest.platform = 'ground';
            nearest.auto = false;
            nearest.vy = 0;
            nearest.vx = 0;
            nearest.climbing = false;
            nearest.grounded = true;
            this.events.push({
              type: 'respawn',
              x: nearest.x,
              y: nearest.y,
              text: 'Returned to safety',
              deathX,
              deathY,
              playerId: nearest.id,
            });
          }
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
  attack(p: Player, skill: boolean, now: number) {
    const profile = weaponProfile(p.weapon);
    if (now < (p.nextAttackAt ?? p.lastAttack + profile.cooldown)) return;
    const empowered =
      skill && p.mp >= WEAPON_SKILL.mana && now - p.lastSkill >= WEAPON_SKILL.cooldown;
    if (skill && !empowered) return;
    p.lastAttack = now;
    p.nextAttackAt = now + profile.cooldown;
    if (empowered) {
      p.mp -= WEAPON_SKILL.mana;
      this.events.push({
        type: 'skill',
        skill: weaponKind(p.weapon),
        phase: 'cast',
        facing: p.facing,
        playerId: p.id,
        x: p.x,
        y: p.y - 30,
        text: profile.skillName,
      });
      p.lastSkill = now;
    }
    const hit = damage(p.level, weaponBonus(p.weapon)) * (empowered ? 2 : 1);
    if (profile.projectile) {
      this.projectiles.push({
        id: `shot-${++this.serial}`,
        owner: p.id,
        kind: profile.projectile,
        x: p.x + p.facing * 18,
        y: p.y - 30,
        startX: p.x,
        vx: p.facing * profile.speed * (empowered && profile.projectile === 'arrow' ? 1.35 : 1),
        range: profile.range * (empowered && profile.projectile === 'arrow' ? 1.5 : 1),
        damage: hit,
        empowered,
      });
      return;
    }
    const targets = this.wolves
      .filter(
        (w) =>
          w.hp > 0 &&
          Math.abs(w.y - p.y) < 55 &&
          Math.abs(w.x - p.x) < (empowered ? profile.range + 42 : profile.range) &&
          (w.x - p.x) * p.facing >= -12,
      )
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    if (empowered && weaponKind(p.weapon) === 'dagger') {
      const target = targets[0];
      if (target) {
        const strike = damage(p.level, weaponBonus(p.weapon));
        this.hitWolf(p, target, strike, now);
        for (const delay of [110, 220])
          this.flurry.push({
            owner: p.id,
            target: target.id,
            weapon: p.weapon,
            at: now + delay,
            damage: strike,
          });
      }
    } else for (const w of targets.slice(0, empowered ? 3 : 1)) this.hitWolf(p, w, hit, now);
  }
  stepFlurry(now: number) {
    this.flurry = this.flurry.filter((strike) => {
      const owner = this.players.get(strike.owner),
        target = this.wolves.find((w) => w.id === strike.target);
      if (!owner || owner.weapon !== strike.weapon || !target || target.hp <= 0) return false;
      if (now < strike.at) return true;
      if (
        Math.abs(target.x - owner.x) < weaponProfile(owner.weapon).range + 42 &&
        Math.abs(target.y - owner.y) < 55 &&
        (target.x - owner.x) * owner.facing >= -12
      ) {
        this.hitWolf(owner, target, strike.damage, now);
        this.events.push({
          type: 'skill',
          skill: 'dagger',
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
  hitWolf(p: Player, w: Wolf, hit: number, now: number) {
    if (w.hp <= 0) return;
    w.hp = Math.max(0, w.hp - hit);
    this.events.push({ type: 'hit', x: w.x, y: w.y - 50, text: String(hit) });
    if (!w.hp) {
      w.state = 'dead';
      w.deadUntil = now + RULES.respawnMs;
      w.killer = p.id;
      p.kills++;
      advanceQuests(p, 'wolf', this.map.id);
      const leveled = grantXp(p, RULES.wolfXp);
      this.events.push({
        type: leveled ? 'level' : 'kill',
        x: p.x,
        y: p.y - 80,
        text: leveled ? `Level ${p.level}!` : `+${RULES.wolfXp} XP`,
        playerId: p.id,
      });
      this.drops.push({
        id: `drop-${++this.serial}`,
        x: w.x,
        y: w.y,
        owner: p.id,
        gold: RULES.wolfGold,
        item: p.kills % 5 === 0 ? 'sword' : 'fang',
        expires: now + 60000,
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
            shot.y >= w.y - 60 &&
            shot.y <= w.y &&
            w.x + 23 >= Math.min(previous, shot.x) &&
            w.x - 23 <= Math.max(previous, shot.x),
        )
        .sort((a, b) => Math.abs(a.x - previous) - Math.abs(b.x - previous));
      if (shot.empowered && shot.kind === 'arrow') {
        shot.hitIds ??= [];
        for (const target of targets) {
          this.hitWolf(owner, target, shot.damage, now);
          shot.hitIds.push(target.id);
          if (shot.hitIds.length >= 3) return false;
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
                  Math.abs(w.x - first.x) < 140 &&
                  Math.abs(w.y - first.y) < 55,
              ),
            ].slice(0, 3)
          : [first];
        for (const w of affected) this.hitWolf(owner, w, shot.damage, now);
        if (shot.empowered)
          this.events.push({
            type: 'skill',
            skill: 'staff',
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
      p.gold += d.gold;
      p.inventory[d.item] = (p.inventory[d.item] ?? 0) + 1;
      this.drops = this.drops.filter((x) => x.id !== d.id);
      this.events.push({
        type: 'loot',
        x: p.x,
        y: p.y - 40,
        text: `+${d.gold} gold · ${d.item}`,
        playerId: p.id,
      });
    }
  }
  snapshot(now: number): Snapshot {
    return {
      players: [...this.players.values()],
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
