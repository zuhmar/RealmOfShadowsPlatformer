export type Platform = { id: string; x: number; y: number; width: number; oneWay: boolean };
export type Ladder = { x: number; bottom: number; top: number; from: string; to: string };
export type GameMap = {
  id: string;
  name: string;
  island: string;
  requiredLevel: number;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  platforms: Platform[];
  ladders: Ladder[];
  portals: { x: number; y: number; target: string; label: string }[];
  spawns: { x: number; y: number; platform: string }[];
  npcs: { id?: string; x: number; y: number; name: string; role: string }[];
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
      { id: 'terrace', x: 600, y: 450, width: 420, oneWay: true },
    ],
    ladders: [{ x: 660, bottom: 650, top: 450, from: 'ground', to: 'terrace' }],
    portals: [{ x: 1560, y: 650, target: 'woods', label: 'Whispering Woods' }],
    spawns: [],
    npcs: [
      { id: 'mira', x: 500, y: 650, name: 'Mira', role: 'Village guide' },
      { x: 900, y: 650, name: 'Bram', role: 'Blacksmith · coming later' },
    ],
  },
  woods: {
    id: 'woods',
    name: 'Wolf Hollow',
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
    ],
    ladders: [
      { x: 530, bottom: 760, top: 555, from: 'ground', to: 'moss' },
      { x: 1640, bottom: 760, top: 555, from: 'ground', to: 'ridge' },
      { x: 1670, bottom: 555, top: 350, from: 'ridge', to: 'canopy' },
    ],
    portals: [{ x: 90, y: 760, target: 'village', label: 'Elderwood Village' }],
    spawns: [
      { x: 680, y: 760, platform: 'ground' },
      { x: 1080, y: 760, platform: 'ground' },
      { x: 820, y: 555, platform: 'moss' },
      { x: 1930, y: 555, platform: 'ridge' },
      { x: 1420, y: 350, platform: 'canopy' },
    ],
    npcs: [],
  },
};
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
    available: false,
  },
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `reserved-${i + 3}`,
    name: `Island ${i + 3} · content pending`,
    minLevel: 21 + i * 10,
    maxLevel: 30 + i * 10,
    monsters: [] as string[],
    boss: null,
    available: false,
  })),
  {
    id: 'fortress',
    name: 'Shadow Fortress',
    minLevel: 61,
    maxLevel: 70,
    monsters: [],
    boss: 'Shadow Dragon',
    available: false,
  },
];
export const STORY = {
  title: 'The last survivor',
  prologue:
    'The Shadow Dragon attacked a boy’s hometown and killed everyone but him. He trained for years. Now he is ready to begin the journey to slay the Shadow Dragon.',
};
export const MIRA_WEAPON_KIT_LEDGER = 'mira-wolves-weapon-kit-v1';
export const QUESTS = {
  'mira-wolves': {
    id: 'mira-wolves',
    title: 'The first trial',
    chapter: 'CHAPTER I · THE LAST SURVIVOR',
    npcId: 'mira',
    npcName: 'Mira',
    mapId: 'village',
    target: { monsterId: 'wolf', mapId: 'woods', count: 5 },
    description:
      'Speak with Mira, defeat five Wolves in Wolf Hollow, then return to her. Only Wolves defeated after accepting this quest count.',
    offer:
      'The Shadow Dragon took your hometown and everyone in it. You alone survived. You have trained for years for this journey. Before you follow its shadow, show me what that training has made of you: defeat five Wolves in Wolf Hollow, then return to me.',
    active:
      'Your training has brought you this far. Face five Wolves in Wolf Hollow, then return. The road to the Shadow Dragon begins with this first trial.',
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
export type ItemId = keyof typeof ITEMS;
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
  return id && Object.prototype.hasOwnProperty.call(ITEMS, id) ? ITEMS[id as ItemId] : null;
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
    className: 'Citizen',
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
