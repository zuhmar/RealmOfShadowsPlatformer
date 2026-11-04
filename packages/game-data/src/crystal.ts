import type { GameMap, Platform, Ladder } from './index';
import type { ResourceNode } from './gathering';
export const CRYSTAL_MONSTERS = {
  'cave-bat': {
    name: 'Cave Bat',
    boss: false,
    hp: 260,
    damage: 16,
    xp: 90,
    gold: 12,
    speed: 90,
    cooldown: 1250,
    respawn: 9000,
  },
  'crystal-golem': {
    name: 'Crystal Golem',
    boss: false,
    hp: 540,
    damage: 25,
    xp: 125,
    gold: 18,
    speed: 55,
    cooldown: 1700,
    respawn: 11000,
  },
  'shard-scorpion': {
    name: 'Shard Scorpion',
    boss: false,
    hp: 820,
    damage: 32,
    xp: 180,
    gold: 25,
    speed: 100,
    cooldown: 1300,
    respawn: 12000,
  },
  'crystal-wyrm': {
    name: 'Crystal Wyrm',
    boss: true,
    hp: 8500,
    damage: 48,
    xp: 1800,
    gold: 500,
    speed: 55,
    cooldown: 1600,
    respawn: 60000,
  },
} as const;
export const CRYSTAL_FISH = [
  { id: 'crystal-fish', name: 'Crystal Fish', level: 11, rarity: 'Common' },
  { id: 'glowfin', name: 'Glowfin', level: 15, rarity: 'Uncommon' },
  { id: 'prismatic-eel', name: 'Prismatic Eel', level: 20, rarity: 'Rare' },
] as const;
export const CRYSTAL_QUESTS = {
  'crystal-class-trial': {
    id: 'crystal-class-trial',
    title: 'A path forged in crystal',
    prerequisite: 'mira-bear',
    npcId: 'mentor',
    target: { monsterId: 'cave-bat', mapId: 'crystal', count: 90 },
    description:
      'Defeat 90 Cave Bats after accepting this trial. Return to the Cavern Mentor to unlock your class choice.',
    reward: { gold: 250, items: [] },
  },
  'crystal-golems': {
    id: 'crystal-golems',
    title: 'Break the crystal guard',
    prerequisite: 'crystal-class-trial',
    npcId: 'mentor',
    target: { monsterId: 'crystal-golem', mapId: 'crystal-2', count: 120 },
    description: 'Defeat 120 Crystal Golems in their gallery, then return to the Cavern Mentor.',
    reward: { gold: 400, items: [{ itemId: 'crystalwood', quantity: 20 }] },
  },
  'crystal-scorpions': {
    id: 'crystal-scorpions',
    title: 'Shards in the dark',
    prerequisite: 'crystal-golems',
    npcId: 'mentor',
    target: { monsterId: 'shard-scorpion', mapId: 'crystal-3', count: 180 },
    description:
      'Defeat 180 Shard Scorpions. Return to the Cavern Mentor for a guaranteed Crystal Wyrm Key.',
    reward: { gold: 750, items: [{ itemId: 'crystal-boss-key', quantity: 1 }] },
  },
  'crystal-wyrm': {
    id: 'crystal-wyrm',
    title: 'The heart of the cavern',
    prerequisite: 'crystal-scorpions',
    npcId: 'mentor',
    target: { monsterId: 'crystal-wyrm', mapId: 'crystal-boss', count: 1 },
    description:
      'Use a key at the crystal guardian high above the scorpion nest. Defeat one Crystal Wyrm and dodge its Crystal Eruption.',
    reward: { gold: 1200, items: [] },
  },
} as const;
const resources = [
  ['crystal-ore', 'Crystal Ore'],
  ['crystalwood', 'Crystalwood'],
  ['glowcap', 'Glowcap'],
  ...CRYSTAL_FISH.map((f) => [f.id, f.name]),
  ['bat-wing', 'Cave Bat Wing'],
  ['golem-core', 'Crystal Golem Core'],
  ['shard-stinger', 'Shard Stinger'],
  ['wyrm-scale', 'Crystal Wyrm Scale'],
  ['crystal-boss-key', 'Crystal Wyrm Key'],
  ['crystal-wyrm-trophy', 'Crystal Wyrm Trophy'],
] as const;
export const CRYSTAL_ITEMS = Object.fromEntries(
  resources.map(([id, name]) => [
    id,
    {
      id,
      name,
      type: 'resource' as const,
      rarity: id.includes('key') ? 'Uncommon' : id.includes('trophy') ? 'Rare' : 'Common',
      level: 11,
      bonus: 0,
      sellValue: 0,
      icon: '◆',
      description:
        id === 'crystal-boss-key'
          ? 'Consumed for each entry to Crystal Wyrm Lair. Shard Scorpions can drop these keys.'
          : `A resource from Crystal Caverns: ${name}.`,
    },
  ]),
) as Record<
  | 'crystal-ore'
  | 'crystalwood'
  | 'glowcap'
  | 'crystal-fish'
  | 'glowfin'
  | 'prismatic-eel'
  | 'bat-wing'
  | 'golem-core'
  | 'shard-stinger'
  | 'wyrm-scale'
  | 'crystal-boss-key'
  | 'crystal-wyrm-trophy',
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
const floor = (id: string, x: number, y: number, width: number): Platform => ({
  id,
  x,
  y,
  width,
  oneWay: id !== 'ground',
});
const ladder = (x: number, bottom: number, top: number, from: string, to: string): Ladder => ({
  x,
  bottom,
  top,
  from,
  to,
});
const ground = floor('ground', 0, 800, 2600);
const layouts: {
  platforms: Platform[];
  ladders: Ladder[];
  spawns: { x: number; y: number; platform: string }[];
}[] = [
  {
    platforms: [
      ground,
      floor('bat-left', 420, 610, 620),
      floor('bat-right', 1200, 610, 600),
      floor('bat-high', 1700, 400, 550),
      floor('crystal-tree', 800, 400, 450),
      floor('crystal-herbs', 450, 210, 400),
      floor('crystal-mine', 2250, 610, 300),
      floor('fishing-dock', 40, 610, 300),
      floor('mentor-ledge', 50, 400, 350),
    ],
    ladders: [
      ladder(220, 800, 610, 'ground', 'fishing-dock'),
      ladder(220, 610, 400, 'fishing-dock', 'mentor-ledge'),
      ladder(600, 800, 610, 'ground', 'bat-left'),
      ladder(1400, 800, 610, 'ground', 'bat-right'),
      ladder(2400, 800, 610, 'ground', 'crystal-mine'),
      ladder(900, 610, 400, 'bat-left', 'crystal-tree'),
      ladder(1740, 610, 400, 'bat-right', 'bat-high'),
      ladder(825, 400, 210, 'crystal-tree', 'crystal-herbs'),
    ],
    spawns: [
      { x: 800, y: 800, platform: 'ground' },
      { x: 1100, y: 800, platform: 'ground' },
      { x: 1600, y: 800, platform: 'ground' },
      { x: 2000, y: 800, platform: 'ground' },
      { x: 540, y: 610, platform: 'bat-left' },
      { x: 920, y: 610, platform: 'bat-left' },
      { x: 1320, y: 610, platform: 'bat-right' },
      { x: 1670, y: 610, platform: 'bat-right' },
      { x: 1840, y: 400, platform: 'bat-high' },
      { x: 2100, y: 400, platform: 'bat-high' },
    ],
  },
  {
    platforms: [
      ground,
      floor('gallery-west', 200, 640, 520),
      floor('gallery-east', 1680, 600, 670),
      floor('gallery-span', 650, 430, 1150),
      floor('gallery-crown', 1000, 230, 520),
    ],
    ladders: [
      ladder(400, 800, 640, 'ground', 'gallery-west'),
      ladder(2050, 800, 600, 'ground', 'gallery-east'),
      ladder(690, 640, 430, 'gallery-west', 'gallery-span'),
      ladder(1730, 600, 430, 'gallery-east', 'gallery-span'),
      ladder(1200, 430, 230, 'gallery-span', 'gallery-crown'),
    ],
    spawns: [
      { x: 850, y: 800, platform: 'ground' },
      { x: 1250, y: 800, platform: 'ground' },
      { x: 1650, y: 800, platform: 'ground' },
      { x: 330, y: 640, platform: 'gallery-west' },
      { x: 600, y: 640, platform: 'gallery-west' },
      { x: 1850, y: 600, platform: 'gallery-east' },
      { x: 2200, y: 600, platform: 'gallery-east' },
      { x: 850, y: 430, platform: 'gallery-span' },
      { x: 1550, y: 430, platform: 'gallery-span' },
      { x: 1250, y: 230, platform: 'gallery-crown' },
    ],
  },
  {
    platforms: [
      ground,
      floor('nest-bank', 250, 610, 580),
      floor('nest-bridge', 650, 420, 650),
      floor('nest-rim', 1100, 530, 750),
      floor('nest-rise', 1750, 350, 690),
      floor('boss-perch', 2080, 170, 420),
    ],
    ladders: [
      ladder(500, 800, 610, 'ground', 'nest-bank'),
      ladder(1400, 800, 530, 'ground', 'nest-rim'),
      ladder(730, 610, 420, 'nest-bank', 'nest-bridge'),
      ladder(1200, 530, 420, 'nest-rim', 'nest-bridge'),
      ladder(1800, 530, 350, 'nest-rim', 'nest-rise'),
      ladder(2250, 350, 170, 'nest-rise', 'boss-perch'),
    ],
    spawns: [
      { x: 850, y: 800, platform: 'ground' },
      { x: 1250, y: 800, platform: 'ground' },
      { x: 1700, y: 800, platform: 'ground' },
      { x: 390, y: 610, platform: 'nest-bank' },
      { x: 700, y: 610, platform: 'nest-bank' },
      { x: 1260, y: 530, platform: 'nest-rim' },
      { x: 1680, y: 530, platform: 'nest-rim' },
      { x: 1000, y: 420, platform: 'nest-bridge' },
      { x: 1930, y: 350, platform: 'nest-rise' },
      { x: 2280, y: 350, platform: 'nest-rise' },
    ],
  },
  {
    platforms: [
      floor('ground', 0, 800, 2000),
      floor('wyrm-left', 350, 600, 500),
      floor('wyrm-right', 1150, 600, 500),
      floor('wyrm-crown', 700, 390, 600),
    ],
    ladders: [
      ladder(450, 800, 600, 'ground', 'wyrm-left'),
      ladder(1500, 800, 600, 'ground', 'wyrm-right'),
      ladder(800, 600, 390, 'wyrm-left', 'wyrm-crown'),
      ladder(1200, 600, 390, 'wyrm-right', 'wyrm-crown'),
    ],
    spawns: [{ x: 1050, y: 800, platform: 'ground' }],
  },
];
const nodes: ResourceNode[] = [
  {
    id: 'crystal-mine',
    skill: 'Mining',
    frame: 'ore',
    x: 2400,
    y: 610,
    platform: 'crystal-mine',
    height: 70,
    duration: 4000,
    item: 'crystal-ore',
    level: 11,
  },
  {
    id: 'crystal-tree',
    skill: 'Woodcutting',
    frame: 'tree',
    x: 1030,
    y: 400,
    platform: 'crystal-tree',
    height: 165,
    duration: 4000,
    item: 'crystalwood',
    level: 11,
  },
  {
    id: 'crystal-herbs',
    skill: 'Herbalism',
    frame: 'herbs',
    x: 640,
    y: 210,
    platform: 'crystal-herbs',
    height: 65,
    duration: 3000,
    item: 'glowcap',
    level: 11,
  },
  {
    id: 'crystal-fishing',
    skill: 'Fishing',
    frame: 'fishing',
    x: 190,
    y: 610,
    platform: 'fishing-dock',
    height: 0,
    duration: 5000,
    item: null,
    level: 11,
    fish: CRYSTAL_FISH,
  },
];
export const CRYSTAL_MAPS: Record<string, GameMap> = {};
const ids = ['crystal', 'crystal-2', 'crystal-3', 'crystal-boss'];
const monsters = ['cave-bat', 'crystal-golem', 'shard-scorpion', 'crystal-wyrm'] as const;
const names = [
  'Cave Bat Roost',
  'Crystal Golem Gallery',
  'Shard Scorpion Nest',
  'Crystal Wyrm Lair',
];
for (let i = 0; i < 4; i++)
  CRYSTAL_MAPS[ids[i]] = {
    id: ids[i],
    name: names[i],
    island: 'Crystal Caverns',
    requiredLevel: [11, 14, 17, 20][i],
    width: i === 3 ? 2000 : 2600,
    height: 1000,
    spawn: { x: 180, y: 800 },
    monster: monsters[i],
    background: `/assets/backgrounds/crystal-${i === 3 ? 'boss' : i + 1}.png`,
    ...layouts[i],
    resources: i === 0 ? nodes : [],
    npcs:
      i === 0
        ? [
            {
              id: 'mentor',
              x: 350,
              y: 400,
              name: 'Cavern Mentor',
              role: 'Classes & Crystal quests',
            },
          ]
        : [],
    ...(i === 2
      ? { bossEntrance: { theme: 'crystal', x: 2320, y: 170, platform: 'boss-perch' } }
      : {}),
    portals: [
      {
        x: 80,
        y: 800,
        target: i === 0 ? 'village' : ids[i - 1],
        label: i === 0 ? 'Elderwood Village' : names[i - 1],
      },
      ...(i < 3
        ? [
            {
              x: i === 2 ? 2320 : 2500,
              y: i === 2 ? 170 : 800,
              target: ids[i + 1],
              label: names[i + 1],
              ...(i === 2 ? { key: 'crystal-boss-key' } : {}),
            },
          ]
        : []),
    ],
  };
