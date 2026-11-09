export * from './housing';
import { CARPENTRY_ITEMS } from './housing';
export * from './recipes';
import { RECIPE_SCROLL_ITEMS } from './recipes';
export * from './provisions';
import { PROVISION_ITEMS, PROVISION_STATIONS } from './provisions';
export * from './crystal';
import { CRYSTAL_MAPS, CRYSTAL_ITEMS, CRYSTAL_QUESTS } from './crystal';
export * from './world-map';
export * from './classes';
export * from './skins';
export * from './island-equipment';
import {
  EQUIPMENT_ITEMS,
  TIER_MINING_ITEMS,
  EQUIPMENT_TIERS,
  equipmentDefinition,
} from './island-equipment';
export * from './combat-skills';
export * from './woods-progression';
import { WOODS_ITEMS, WOODS_QUESTS } from './woods-progression';
import { WOODS_HUNTING_LAYOUTS } from './hunting-layouts';
import type { PortalTheme } from './portals';
export * from './monsters';
import { BOSS_QUEST_KILLS, type WoodsMonster } from './monsters';
export * from './portals';
export * from './forging';
export * from './tools';
import { WOODS_RESOURCE_ITEMS, WOODS_RESOURCE_NODES, type ResourceNode } from './gathering';
export * from './gathering';
export type Platform = { id: string; x: number; y: number; width: number; oneWay: boolean };
export type Ladder = { x: number; bottom: number; top: number; from: string; to: string };
export type GameMap = {
  id: string;
  name: string;
  island: string;
  requiredLevel: number;
  monster?: WoodsMonster;
  background?: string;
  bossEntrance?: { theme: PortalTheme; x: number; y: number; platform: string };
  width: number;
  height: number;
  spawn: { x: number; y: number };
  platforms: Platform[];
  ladders: Ladder[];
  portals: { x: number; y: number; target: string; label: string; key?: string }[];
  spawns: { x: number; y: number; platform: string }[];
  resources?: ResourceNode[];
  npcs: {
    id?: string;
    x: number;
    y: number;
    name: string;
    role: string;
    allegiance?: 'celestial' | 'shadow';
  }[];
};
export const RULES = {
  tick: 30,
  speed: 200,
  gravity: 1250,
  jump: 515,
  climb: 155,
  playerWidth: 28,
  playerHeight: 48,
  attackRange: 78,
  attackCooldown: 650,
  baseDamage: 14,
  baseHp: 100,
  wolfHp: 48,
  wolfDamage: 7,
  wolfXp: 24,
  wolfGold: 5,
  respawnMs: 6500,
  offlineCapHours: 8,
  offlineXpPerMinute: 8,
  offlineGoldPerMinute: 2,
  guestDays: 30,
};
export const xpNeeded = (level: number) => Math.floor(80 * Math.pow(level, 1.45));
export const maxHp = (level: number) => RULES.baseHp + (level - 1) * 12;
export const damage = (level: number, bonus = 0) => RULES.baseDamage + (level - 1) * 3 + bonus;
export const MAPS: Record<string, GameMap> = {
  village: {
    id: 'village',
    name: 'Elderwood Village',
    island: 'Elderwood',
    requiredLevel: 1,
    width: 1800,
    height: 800,
    spawn: { x: 240, y: 650 },
    platforms: [
      { id: 'ground', x: 0, y: 650, width: 1800, oneWay: false },
      { id: 'housing', x: 500, y: 240, width: 800, oneWay: true },
      { id: 'terrace', x: 600, y: 450, width: 420, oneWay: true },
    ],
    ladders: [
      { x: 660, bottom: 650, top: 450, from: 'ground', to: 'terrace' },
      { x: 760, bottom: 450, top: 240, from: 'terrace', to: 'housing' },
    ],
    portals: [{ x: 1560, y: 650, target: 'woods', label: 'Whispering Woods' }],
    spawns: [],
    npcs: [
      { id: 'mira', x: 500, y: 650, name: 'Mira', role: 'Village guide' },
      { id: 'bram', x: 900, y: 650, name: 'Bram', role: 'Blacksmith' },
    ],
  },
  woods: {
    id: 'woods',
    name: 'Wolf Hollow',
    resources: WOODS_RESOURCE_NODES,
    island: 'Whispering Woods',
    requiredLevel: 1,
    width: 2400,
    height: 900,
    spawn: { x: 180, y: 760 },
    platforms: [
      { id: 'ground', x: 0, y: 760, width: 2400, oneWay: false },
      { id: 'moss', x: 450, y: 555, width: 550, oneWay: true },
      { id: 'canopy', x: 1160, y: 350, width: 570, oneWay: true },
      { id: 'ridge', x: 1550, y: 555, width: 590, oneWay: true },
      { id: 'fishing-dock', x: 40, y: 555, width: 360, oneWay: true },
      { id: 'oak-terrace', x: 1090, y: 555, width: 360, oneWay: true },
      { id: 'herb-garden', x: 1780, y: 350, width: 340, oneWay: true },
      { id: 'mining-ledge', x: 2180, y: 555, width: 210, oneWay: true },
    ],
    ladders: [
      { x: 530, bottom: 760, top: 555, from: 'ground', to: 'moss' },
      { x: 1640, bottom: 760, top: 555, from: 'ground', to: 'ridge' },
      { x: 1670, bottom: 555, top: 350, from: 'ridge', to: 'canopy' },
      { x: 140, bottom: 760, top: 555, from: 'ground', to: 'fishing-dock' },
      { x: 1190, bottom: 760, top: 555, from: 'ground', to: 'oak-terrace' },
      { x: 1850, bottom: 555, top: 350, from: 'ridge', to: 'herb-garden' },
      { x: 2220, bottom: 760, top: 555, from: 'ground', to: 'mining-ledge' },
    ],
    portals: [
      { x: 90, y: 760, target: 'village', label: 'Elderwood Village' },
      { x: 2300, y: 760, target: 'woods-2', label: 'Silkshade Glade' },
    ],
    spawns: [
      { x: 680, y: 760, platform: 'ground' },
      { x: 1080, y: 760, platform: 'ground' },
      { x: 820, y: 555, platform: 'moss' },
      { x: 1930, y: 555, platform: 'ridge' },
      { x: 1420, y: 350, platform: 'canopy' },
      { x: 1440, y: 760, platform: 'ground' },
      { x: 1780, y: 760, platform: 'ground' },
      { x: 600, y: 555, platform: 'moss' },
      { x: 1710, y: 555, platform: 'ridge' },
      { x: 1630, y: 350, platform: 'canopy' },
    ],
    npcs: [],
  },
};
MAPS.village.npcs.push(...PROVISION_STATIONS, {
  id: 'carpentry-station',
  name: 'Carpentry Workbench',
  role: 'Houses & furniture',
  x: 560,
  y: 240,
});
export const ISLANDS = [
  {
    id: 'woods',
    name: 'Whispering Woods',
    minLevel: 1,
    maxLevel: 10,
    monsters: ['Wolf', 'Thorn Spider', 'Wild Boar'],
    boss: 'Forest Bear',
    available: true,
  },
  {
    id: 'crystal',
    name: 'Crystal Caverns',
    minLevel: 11,
    maxLevel: 20,
    monsters: ['Cave Bat', 'Crystal Golem', 'Shard Scorpion'],
    boss: 'Crystal Wyrm',
    available: true,
  },
  {
    id: 'murkmire',
    name: 'Murkmire Swamp',
    minLevel: 21,
    maxLevel: 30,
    monsters: ['Bog Slime', 'Swamp Lurker', 'Venom Toad'],
    boss: 'Hydra',
    available: false,
  },
  {
    id: 'frostfall',
    name: 'Frostfall Tundra',
    minLevel: 31,
    maxLevel: 40,
    monsters: ['Frost Wolf', 'Ice Troll', 'Frozen Wraith'],
    boss: 'Frost Giant',
    available: false,
  },
  {
    id: 'ember',
    name: 'Ember Peaks',
    minLevel: 41,
    maxLevel: 50,
    monsters: ['Fire Imp', 'Magma Golem', 'Ember Salamander'],
    boss: 'Infernal Drake',
    available: false,
  },
  {
    id: 'celestial',
    name: 'Celestial Realm',
    minLevel: 51,
    maxLevel: 60,
    monsters: ['Fallen Sprite', 'Celestial Sentinel', 'Astral Wisp'],
    boss: 'Fallen Seraph',
    available: false,
  },
  {
    id: 'fortress',
    name: 'Shadow Fortress',
    minLevel: 61,
    maxLevel: 100,
    monsters: ['Shadow Knight', 'Shadow Lich', 'Void Stalker'],
    boss: 'Shadow Dragon',
    available: false,
  },
];
/** All islands follow three monster areas, then a key-gated boss area. */
export const ISLAND_AREAS = ISLANDS.map((island) => ({
  islandId: island.id,
  areas: [island.id, `${island.id}-2`, `${island.id}-3`, `${island.id}-boss`],
  monsters: [...island.monsters, island.boss],
  bossEntranceTheme: island.id as PortalTheme,
  bossKillCount: BOSS_QUEST_KILLS,
  bossKey: island.id === 'woods' ? 'forest-bear-key' : `${island.id}-boss-key`,
}));
for (const [stage, name, monster, background] of [
  [2, 'Silkshade Glade', 'thorn-spider', 'spider-glade'],
  [3, 'Brambleboar Run', 'wild-boar', 'boar-run'],
  ['boss', 'Forest Bear Den', 'forest-bear', 'bear-den'],
] as const) {
  const id = `woods-${stage}`;
  const previous = stage === 2 ? 'woods' : stage === 3 ? 'woods-2' : 'woods-3';
  const next = stage === 2 ? 'woods-3' : stage === 3 ? 'woods-boss' : null;
  MAPS[id] = {
    ...MAPS.woods,
    id,
    name,
    monster,
    background: `/assets/backgrounds/${background}.png`,
    resources: [],
    ...WOODS_HUNTING_LAYOUTS[id],
    ...(stage === 3
      ? { bossEntrance: { theme: 'woods' as const, x: 2240, y: 285, platform: 'boss-perch' } }
      : {}),
    portals: [
      {
        x: 90,
        y: 760,
        target: previous,
        label: stage === 2 ? 'Wolf Hollow' : stage === 3 ? 'Silkshade Glade' : 'Brambleboar Run',
      },
      ...(next
        ? [
            {
              x: stage === 3 ? 2240 : 2300,
              y: stage === 3 ? 285 : 760,
              target: next,
              label: stage === 2 ? 'Brambleboar Run' : 'Forest Bear Den',
              ...(stage === 3 ? { key: 'forest-bear-key' } : {}),
            },
          ]
        : []),
    ],
  };
}
Object.assign(MAPS, CRYSTAL_MAPS);
MAPS['woods-3'].portals.push({
  x: 2300,
  y: 760,
  target: 'crystal',
  label: 'Crystal Caverns',
});
MAPS.village.portals.push({ x: 900, y: 450, target: 'crystal', label: 'Crystal Caverns' });
export const STORY = {
  title: 'The last survivor',
  prologue:
    'A boy raised among the white-and-gold Celestial people lost his hometown when the Shadow Dragon attacked. Everyone he knew was killed, but he survived. After years of training, he is ready to begin the journey to slay the Shadow Dragon.',
};
export const MIRA_WEAPON_KIT_LEDGER = 'mira-wolves-weapon-kit-v1';
export const QUESTS = {
  ...CRYSTAL_QUESTS,
  ...WOODS_QUESTS,
  'mira-wolves': {
    id: 'mira-wolves',
    title: 'The first trial',
    chapter: 'CHAPTER I · THE LAST SURVIVOR',
    npcId: 'mira',
    npcName: 'Mira',
    mapId: 'village',
    target: { monsterId: 'wolf', mapId: 'woods', count: 15 },
    description:
      'Speak with Mira, defeat 15 Wolves in Wolf Hollow, then return to her. Only Wolves defeated after accepting this quest count.',
    offer:
      'The Shadow Dragon took your hometown and everyone in it. You alone survived. You have trained for years for this journey. Before you follow its shadow, show me what that training has made of you: defeat 15 Wolves in Wolf Hollow, then return to me.',
    active:
      'Your training has brought you this far. Face 15 Wolves in Wolf Hollow, then return. The road to the Shadow Dragon begins with this first trial.',
    ready:
      'Your training has served you well. Take a sword for the Knight’s path, a bow for the Archer’s, a staff for the Mage’s, and a dagger for the Rogue’s. Try each before choosing your path. There are greater trials between you and the Shadow Dragon, but today your journey truly begins.',
    completed:
      'Learn what each weapon can teach you. Your hometown is gone, but its last survivor is still standing. The Shadow Dragon waits at the end of a long road.',
    reward: {
      gold: 75,
      items: [
        { itemId: 'elderwood-blade', quantity: 1 },
        { itemId: 'elderwood-bow', quantity: 1 },
        { itemId: 'elderwood-staff', quantity: 1 },
        { itemId: 'elderwood-dagger', quantity: 1 },
      ],
    },
  },
} as const;
export const INTERACTION = { horizontal: 100, vertical: 65 };
export const ITEMS = {
  ...CARPENTRY_ITEMS,
  ...RECIPE_SCROLL_ITEMS,
  ...PROVISION_ITEMS,
  'teleport-crystal': {
    id: 'teleport-crystal',
    name: 'Teleport Crystal',
    rarity: 'Uncommon',
    type: 'resource' as const,
    description:
      'Spend one on the World Map to teleport to a visited area. Buy from Bram for 25 gold or find on monsters.',
    sellValue: 0,
    level: 1,
    bonus: 0,
    icon: '◆',
  },
  ...CRYSTAL_ITEMS,
  ...EQUIPMENT_ITEMS,
  ...TIER_MINING_ITEMS,
  ...WOODS_ITEMS,
  'forest-bear-key': {
    id: 'forest-bear-key',
    name: 'Forest Bear Key',
    rarity: 'Uncommon',
    description: 'Dropped by Wild Boars. Consumed when entering the Forest Bear Den.',
    type: 'resource' as const,
    sellValue: 0,
    level: 1,
    bonus: 0,
    icon: '⚿',
  },
  'iron-bar': {
    id: 'iron-bar',
    name: 'Iron Bar',
    rarity: 'Common',
    type: 'resource',
    description: 'Smelted by Bram from 20 Iron Ore. Used to forge Iron gathering tools.',
    sellValue: 2,
    level: 1,
    bonus: 0,
    icon: '▰',
  },
  ...WOODS_RESOURCE_ITEMS,
  'elderwood-blade': {
    id: 'elderwood-blade',
    name: 'Elderwood Blade',
    rarity: 'Uncommon',
    type: 'weapon',
    description: 'Knight trial weapon. A steady melee sword. +8 attack.',
    weaponKind: 'sword',
    sellValue: 35,
    level: 1,
    bonus: 8,
    icon: '⚔',
  },
  'elderwood-bow': {
    id: 'elderwood-bow',
    name: 'Elderwood Bow',
    rarity: 'Uncommon',
    type: 'weapon',
    weaponKind: 'bow',
    description: 'Archer trial weapon. Fires arrows from a distance. +6 attack.',
    sellValue: 35,
    level: 1,
    bonus: 6,
    icon: '➶',
  },
  'elderwood-staff': {
    id: 'elderwood-staff',
    name: 'Elderwood Staff',
    rarity: 'Uncommon',
    type: 'weapon',
    weaponKind: 'staff',
    description: 'Mage trial weapon. Casts bolts; Arcane Burst hits nearby foes. +8 attack.',
    sellValue: 35,
    level: 1,
    bonus: 8,
    icon: '✧',
  },
  'elderwood-dagger': {
    id: 'elderwood-dagger',
    name: 'Elderwood Dagger',
    rarity: 'Uncommon',
    type: 'weapon',
    weaponKind: 'dagger',
    description: 'Rogue trial weapon. Fast attacks at close range. +4 attack.',
    sellValue: 35,
    level: 1,
    bonus: 4,
    icon: '†',
  },
  fang: {
    id: 'fang',
    name: 'Wolf Fang',
    rarity: 'Common',
    type: 'material',
    description: 'A sharp fang. Save it for future crafting.',
    sellValue: 2,
    level: 1,
    bonus: 0,
    icon: '◈',
  },
  sword: {
    id: 'sword',
    name: 'Wayfarer Blade',
    rarity: 'Uncommon',
    type: 'weapon',
    description: 'A dependable blade. +5 attack.',
    weaponKind: 'sword',
    sellValue: 20,
    level: 1,
    bonus: 5,
    icon: '⚔',
  },
} as const;
export type ItemId = keyof typeof ITEMS | import('./recipes').RecipeScrollId;
export const CLASSES = ['Citizen', 'Knight', 'Archer', 'Mage', 'Rogue'] as const;
export const SKILLS = [
  'Sword',
  'Archery',
  'Magic',
  'Mining',
  'Woodcutting',
  'Fishing',
  'Crafting',
] as const;
// Converts the supported Tiled object layers; coordinates use feet/bottom origin for actors.
export function fromTiled(
  raw: {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: {
      name: string;
      objects?: {
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        name: string;
        properties?: { name: string; value: unknown }[];
      }[];
    }[];
  },
  base: GameMap,
): GameMap {
  const layer = (name: string) => raw.layers.find((l) => l.name === name)?.objects ?? [];
  return {
    ...base,
    width: raw.width * raw.tilewidth,
    height: raw.height * raw.tileheight,
    platforms: layer('platforms').map((o) => ({
      id: o.name || String(o.id),
      x: o.x,
      y: o.y,
      width: o.width,
      oneWay: o.properties?.some((p) => p.name === 'oneWay' && p.value === true) ?? false,
    })),
    ladders: layer('ladders').map((o) => ({
      x: o.x,
      bottom: o.y + o.height,
      top: o.y,
      from: String(o.properties?.find((p) => p.name === 'from')?.value ?? 'ground'),
      to: String(o.properties?.find((p) => p.name === 'to')?.value ?? 'ground'),
    })),
  };
}

export function itemDefinition(id: string | null | undefined) {
  return id && Object.prototype.hasOwnProperty.call(RECIPE_SCROLL_ITEMS, id)
    ? RECIPE_SCROLL_ITEMS[id as import('./recipes').RecipeScrollId]
    : id && Object.prototype.hasOwnProperty.call(ITEMS, id)
      ? ITEMS[id as keyof typeof ITEMS]
      : null;
}
export function weaponBonus(id: string | null | undefined) {
  const item = itemDefinition(id);
  return item?.type === 'weapon' ? item.bonus : 0;
}

export const WEAPON_SKILL = { mana: 12, cooldown: 5000 } as const;
export const SKILL_DESCRIPTIONS = {
  Cleave: 'Sweep through up to three enemies in front of you.',
  'Power Shot': 'Fire a long-range arrow that pierces up to three enemies.',
  'Arcane Burst': 'Launch an orb that explodes around its first target.',
  Flurry: 'Strike one nearby enemy three times in rapid succession.',
} as const;
export type WeaponKind = 'unarmed' | 'sword' | 'bow' | 'staff' | 'dagger';
export const WEAPON_PROFILES: Record<
  WeaponKind,
  {
    className: string;
    range: number;
    cooldown: number;
    projectile: 'arrow' | 'orb' | null;
    speed: number;
    skillName: string;
  }
> = {
  unarmed: {
    className: 'Civilian',
    range: 78,
    cooldown: 650,
    projectile: null,
    speed: 0,
    skillName: 'Cleave',
  },
  sword: {
    className: 'Knight',
    range: 78,
    cooldown: 650,
    projectile: null,
    speed: 0,
    skillName: 'Cleave',
  },
  bow: {
    className: 'Archer',
    range: 280,
    cooldown: 850,
    projectile: 'arrow',
    speed: 560,
    skillName: 'Power Shot',
  },
  staff: {
    className: 'Mage',
    range: 320,
    cooldown: 1000,
    projectile: 'orb',
    speed: 400,
    skillName: 'Arcane Burst',
  },
  dagger: {
    className: 'Rogue',
    range: 58,
    cooldown: 380,
    projectile: null,
    speed: 0,
    skillName: 'Flurry',
  },
};
export function weaponKind(id: string | null | undefined): WeaponKind {
  const item = itemDefinition(id);
  return item?.type === 'weapon' ? item.weaponKind : 'unarmed';
}
export function weaponProfile(id: string | null | undefined) {
  return WEAPON_PROFILES[weaponKind(id)];
}

/** Specials evolve with equipment tiers; starter and Ironwood retain the original rank-one balance. */
export function weaponSkillProgression(id: string | null | undefined) {
  const tier = equipmentDefinition(id)?.tier;
  const step = Math.max(
    0,
    EQUIPMENT_TIERS.findIndex((t) => t.id === tier),
  );
  return {
    rank: step + 1,
    damageMultiplier: 2 + step * 0.15,
    maxTargets: 3 + Math.floor(step / 2),
    meleeReach: 42 + step * 6,
    arrowRangeMultiplier: 1.5 + step * 0.08,
    burstRadius: 140 + step * 15,
    flurryStrikes: 3 + Math.floor(step / 2),
    flurryMultiplier: 1 + step * 0.08,
    visualScale: 1 + step * 0.07,
  };
}
export function weaponSkillDescription(id: string | null | undefined) {
  const s = weaponSkillProgression(id);
  const kind = weaponKind(id);
  const detail =
    kind === 'dagger'
      ? `Strike one enemy ${s.flurryStrikes} times for ${s.flurryMultiplier.toFixed(2)}× damage per strike.`
      : kind === 'bow'
        ? `Pierce up to ${s.maxTargets} enemies at ${Math.round(s.arrowRangeMultiplier * 100)}% range.`
        : kind === 'staff'
          ? `Explode in a ${s.burstRadius}px radius, hitting up to ${s.maxTargets} enemies.`
          : `Sweep up to ${s.maxTargets} enemies with +${s.meleeReach}px reach.`;
  return `Rank ${s.rank} · ${detail}${kind === 'dagger' ? '' : ` ${s.damageMultiplier.toFixed(2)}× damage.`}`;
}
