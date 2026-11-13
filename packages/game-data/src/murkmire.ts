import type { GameMap, Platform, Ladder } from './index';
import type { ResourceNode } from './gathering';
export const MURKMIRE_MONSTERS = {
  'bog-slime': {
    name: 'Bog Slime',
    boss: false,
    hp: 1400,
    damage: 36,
    xp: 260,
    gold: 35,
    speed: 60,
    cooldown: 1600,
    respawn: 11000,
  },
  'swamp-lurker': {
    name: 'Swamp Lurker',
    boss: false,
    hp: 2100,
    damage: 44,
    xp: 340,
    gold: 45,
    speed: 85,
    cooldown: 1500,
    respawn: 12000,
  },
  'venom-toad': {
    name: 'Venom Toad',
    boss: false,
    hp: 2900,
    damage: 52,
    xp: 440,
    gold: 60,
    speed: 95,
    cooldown: 1400,
    respawn: 12000,
  },
  hydra: {
    name: 'Hydra',
    boss: true,
    hp: 21000,
    damage: 68,
    xp: 4500,
    gold: 1200,
    speed: 55,
    cooldown: 1700,
    respawn: 60000,
  },
} as const;
export const MURKMIRE_FISH = [
  { id: 'mudfish', name: 'Mudfish', level: 21, rarity: 'Common' },
  { id: 'bog-catfish', name: 'Bog Catfish', level: 25, rarity: 'Uncommon' },
  { id: 'venomfin', name: 'Venomfin', level: 30, rarity: 'Rare' },
] as const;
export const MURKMIRE_QUESTS = {
  'murkmire-slimes': {
    id: 'murkmire-slimes',
    title: 'A path through the bog',
    prerequisite: 'crystal-wyrm',
    npcId: 'mirewarden',
    target: { monsterId: 'bog-slime', mapId: 'murkmire', count: 180 },
    description:
      'The trail toward the Shadow Dragon leads through the mire. Defeat 180 Bog Slimes after accepting this quest, then return to the Mire Warden.',
    reward: { gold: 800, items: [] },
  },
  'murkmire-lurkers': {
    id: 'murkmire-lurkers',
    title: 'Roots that hunt',
    prerequisite: 'murkmire-slimes',
    npcId: 'mirewarden',
    target: { monsterId: 'swamp-lurker', mapId: 'murkmire-2', count: 240 },
    description: 'Defeat 240 Swamp Lurkers among the root bridges. Return to the Mire Warden.',
    reward: { gold: 1100, items: [{ itemId: 'bogwood', quantity: 30 }] },
  },
  'murkmire-toads': {
    id: 'murkmire-toads',
    title: 'Venom at the shrine',
    prerequisite: 'murkmire-lurkers',
    npcId: 'mirewarden',
    target: { monsterId: 'venom-toad', mapId: 'murkmire-3', count: 300 },
    description:
      'Defeat 300 Venom Toads. The Mire Warden will award one Hydra Key; toads can also drop more keys.',
    reward: { gold: 1600, items: [{ itemId: 'murkmire-boss-key', quantity: 1 }] },
  },
  'murkmire-hydra': {
    id: 'murkmire-hydra',
    title: 'Three heads, one heart',
    prerequisite: 'murkmire-toads',
    npcId: 'mirewarden',
    target: { monsterId: 'hydra', mapId: 'murkmire-boss', count: 1 },
    description:
      'Climb to the Hydra Root Idol above Venom Toad Mire. Each entry consumes one key. Defeat one Hydra and escape its marked Venom Eruption.',
    reward: { gold: 2500, items: [] },
  },
} as const;
const resources = [
  ['mire-ore', 'Mire Ore'],
  ['bogwood', 'Bogwood'],
  ['mirebloom', 'Mirebloom'],
  ...MURKMIRE_FISH.map((f) => [f.id, f.name] as const),
  ['slime-glob', 'Bog Slime Glob'],
  ['lurker-bark', 'Swamp Lurker Bark'],
  ['toad-gland', 'Venom Toad Gland'],
  ['hydra-fang', 'Hydra Fang'],
  ['murkmire-boss-key', 'Hydra Key'],
  ['hydra-trophy', 'Hydra Trophy'],
] as const;
export const MURKMIRE_ITEMS = Object.fromEntries(
  resources.map(([id, name]) => [
    id,
    {
      id,
      name,
      type: 'resource' as const,
      rarity: id.includes('key') ? 'Uncommon' : id.includes('trophy') ? 'Rare' : 'Common',
      level: 21,
      bonus: 0,
      sellValue: 0,
      icon: '◆',
      description:
        id === 'murkmire-boss-key'
          ? 'Consumed for each entry to Hydra Basin. Venom Toads can drop these keys.'
          : `A resource from Murkmire Swamp: ${name}.`,
    },
  ]),
) as Record<
  (typeof resources)[number][0],
  {
    id: string;
    name: string;
    type: 'resource';
    rarity: string;
    level: number;
    bonus: number;
    sellValue: number;
    icon: string;
    description: string;
  }
>;
const f = (id: string, x: number, y: number, width: number): Platform => ({
  id,
  x,
  y,
  width,
  oneWay: id !== 'ground',
});
const l = (x: number, bottom: number, top: number, from: string, to: string): Ladder => ({
  x,
  bottom,
  top,
  from,
  to,
});
const layouts = [
  {
    platforms: [
      f('ground', 0, 820, 2800),
      f('fishing-dock', 40, 620, 360),
      f('warden-ledge', 60, 420, 360),
      f('slime-west', 540, 620, 600),
      f('slime-east', 1450, 600, 650),
      f('bogwood', 960, 410, 380),
      f('mirebloom', 1220, 220, 350),
      f('mire-mine', 2300, 600, 350),
    ],
    ladders: [
      l(170, 820, 620, 'ground', 'fishing-dock'),
      l(170, 620, 420, 'fishing-dock', 'warden-ledge'),
      l(700, 820, 620, 'ground', 'slime-west'),
      l(1700, 820, 600, 'ground', 'slime-east'),
      l(2450, 820, 600, 'ground', 'mire-mine'),
      l(1050, 620, 410, 'slime-west', 'bogwood'),
      l(1280, 410, 220, 'bogwood', 'mirebloom'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'ground',
      'ground',
      'slime-west',
      'slime-west',
      'slime-west',
      'slime-east',
      'slime-east',
      'slime-east',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 2800),
      f('root-west', 180, 650, 600),
      f('root-east', 1800, 580, 760),
      f('root-bridge', 650, 450, 1300),
      f('root-crown', 1050, 250, 520),
    ],
    ladders: [
      l(400, 820, 650, 'ground', 'root-west'),
      l(2200, 820, 580, 'ground', 'root-east'),
      l(720, 650, 450, 'root-west', 'root-bridge'),
      l(1870, 580, 450, 'root-east', 'root-bridge'),
      l(1300, 450, 250, 'root-bridge', 'root-crown'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'ground',
      'root-west',
      'root-west',
      'root-east',
      'root-east',
      'root-bridge',
      'root-bridge',
      'root-crown',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 2800),
      f('mire-bank', 250, 620, 600),
      f('shrine-west', 720, 420, 650),
      f('shrine-rim', 1250, 570, 700),
      f('shrine-rise', 1850, 370, 750),
      f('boss-perch', 2200, 180, 450),
    ],
    ladders: [
      l(500, 820, 620, 'ground', 'mire-bank'),
      l(1500, 820, 570, 'ground', 'shrine-rim'),
      l(780, 620, 420, 'mire-bank', 'shrine-west'),
      l(1300, 570, 420, 'shrine-rim', 'shrine-west'),
      l(1900, 570, 370, 'shrine-rim', 'shrine-rise'),
      l(2400, 370, 180, 'shrine-rise', 'boss-perch'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'ground',
      'mire-bank',
      'mire-bank',
      'shrine-west',
      'shrine-rim',
      'shrine-rim',
      'shrine-rise',
      'shrine-rise',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 2200),
      f('basin-west', 350, 610, 550),
      f('basin-east', 1350, 610, 550),
      f('basin-crown', 780, 400, 650),
    ],
    ladders: [
      l(450, 820, 610, 'ground', 'basin-west'),
      l(1700, 820, 610, 'ground', 'basin-east'),
      l(830, 610, 400, 'basin-west', 'basin-crown'),
      l(1380, 610, 400, 'basin-east', 'basin-crown'),
    ],
    spawnPlatforms: ['ground'],
  },
];
const nodes: ResourceNode[] = [
  {
    id: 'mire-mine',
    skill: 'Mining',
    frame: 'ore',
    x: 2450,
    y: 600,
    platform: 'mire-mine',
    height: 80,
    duration: 5000,
    item: 'mire-ore',
    level: 21,
  },
  {
    id: 'bogwood',
    skill: 'Woodcutting',
    frame: 'tree',
    x: 1150,
    y: 410,
    platform: 'bogwood',
    height: 175,
    duration: 5000,
    item: 'bogwood',
    level: 21,
  },
  {
    id: 'mirebloom',
    skill: 'Herbalism',
    frame: 'herbs',
    x: 1410,
    y: 220,
    platform: 'mirebloom',
    height: 65,
    duration: 4000,
    item: 'mirebloom',
    level: 21,
  },
  {
    id: 'murkmire-fishing',
    skill: 'Fishing',
    frame: 'fishing',
    x: 170,
    y: 620,
    platform: 'fishing-dock',
    height: 0,
    duration: 6000,
    item: null,
    level: 21,
    fish: MURKMIRE_FISH,
  },
];
export const MURKMIRE_MAPS: Record<string, GameMap> = {};
const ids = ['murkmire', 'murkmire-2', 'murkmire-3', 'murkmire-boss'];
const names = ['Bog Slime Pools', 'Swamp Lurker Marsh', 'Venom Toad Mire', 'Hydra Basin'];
const monsters = ['bog-slime', 'swamp-lurker', 'venom-toad', 'hydra'] as const;
for (let i = 0; i < 4; i++) {
  const layout = layouts[i];
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  for (const id of layout.spawnPlatforms) totals.set(id, (totals.get(id) ?? 0) + 1);
  const spawns = layout.spawnPlatforms.map((id) => {
    const p = layout.platforms.find((p) => p.id === id)!;
    const n = (used.get(id) ?? 0) + 1;
    used.set(id, n);
    return {
      x:
        i === 3
          ? 1250
          : p.x +
            (id === 'ground' ? 500 : 0) +
            ((p.width - (id === 'ground' ? 550 : 0)) * n) / (totals.get(id)! + 1),
      y: p.y,
      platform: id,
    };
  });
  MURKMIRE_MAPS[ids[i]] = {
    id: ids[i],
    name: names[i],
    island: 'Murkmire Swamp',
    requiredLevel: [21, 24, 27, 30][i],
    width: i === 3 ? 2200 : 2800,
    height: 1050,
    spawn: { x: 180, y: 820 },
    monster: monsters[i],
    background: `/assets/backgrounds/murkmire-${i === 3 ? 'boss' : i + 1}.png`,
    platforms: layout.platforms,
    ladders: layout.ladders,
    spawns,
    resources: i === 0 ? nodes : [],
    npcs:
      i === 0
        ? [
            {
              id: 'mirewarden',
              x: 340,
              y: 420,
              name: 'Mire Warden',
              role: 'Murkmire quests',
              allegiance: 'celestial',
            },
          ]
        : [],
    ...(i === 2
      ? { bossEntrance: { theme: 'murkmire', x: 2440, y: 180, platform: 'boss-perch' } }
      : {}),
    portals: [
      {
        x: 80,
        y: 820,
        target: i === 0 ? 'crystal-3' : ids[i - 1],
        label: i === 0 ? 'Crystal Caverns' : names[i - 1],
      },
      ...(i < 3
        ? [
            {
              x: i === 2 ? 2440 : 2700,
              y: i === 2 ? 180 : 820,
              target: ids[i + 1],
              label: names[i + 1],
              ...(i === 2 ? { key: 'murkmire-boss-key' } : {}),
            },
          ]
        : []),
    ],
  };
}
