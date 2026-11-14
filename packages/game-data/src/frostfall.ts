import type { GameMap, Platform, Ladder } from './index';
import type { ResourceNode } from './gathering';
export const FROSTFALL_MONSTERS = {
  'frost-wolf': {
    name: 'Frost Wolf',
    boss: false,
    hp: 4200,
    damage: 68,
    xp: 550,
    gold: 70,
    speed: 100,
    cooldown: 1300,
    respawn: 12000,
  },
  'ice-troll': {
    name: 'Ice Troll',
    boss: false,
    hp: 5800,
    damage: 82,
    xp: 700,
    gold: 90,
    speed: 65,
    cooldown: 1700,
    respawn: 14000,
  },
  'frozen-wraith': {
    name: 'Frozen Wraith',
    boss: false,
    hp: 8200,
    damage: 98,
    xp: 900,
    gold: 120,
    speed: 100,
    cooldown: 1400,
    respawn: 15000,
  },
  'frost-giant': {
    name: 'Frost Giant',
    boss: true,
    hp: 52000,
    damage: 125,
    xp: 7500,
    gold: 2200,
    speed: 50,
    cooldown: 1800,
    respawn: 60000,
  },
} as const;
export const FROSTFALL_FISH = [
  { id: 'icefin', name: 'Icefin', level: 31, rarity: 'Common' },
  { id: 'frost-salmon', name: 'Frost Salmon', level: 35, rarity: 'Uncommon' },
  { id: 'glacier-pike', name: 'Glacier Pike', level: 40, rarity: 'Rare' },
] as const;
export const FROSTFALL_QUESTS = {
  'frostfall-wolves': {
    id: 'frostfall-wolves',
    title: 'Tracks beneath the snow',
    prerequisite: 'murkmire-hydra',
    npcId: 'frostwarden',
    target: { monsterId: 'frost-wolf', mapId: 'frostfall', count: 270 },
    description:
      'The Shadow Dragon’s trail crosses the frozen north. Accept this task, defeat 270 Frost Wolves and return to the Frost Warden.',
    reward: { gold: 1800, items: [] },
  },
  'frostfall-trolls': {
    id: 'frostfall-trolls',
    title: 'Break the frozen watch',
    prerequisite: 'frostfall-wolves',
    npcId: 'frostwarden',
    target: { monsterId: 'ice-troll', mapId: 'frostfall-2', count: 360 },
    description:
      'Defeat 360 Ice Trolls guarding the glacier bridges, then return to the Frost Warden.',
    reward: { gold: 2400, items: [{ itemId: 'frostpine', quantity: 50 }] },
  },
  'frostfall-wraiths': {
    id: 'frostfall-wraiths',
    title: 'Silence in the ice',
    prerequisite: 'frostfall-trolls',
    npcId: 'frostwarden',
    target: { monsterId: 'frozen-wraith', mapId: 'frostfall-3', count: 450 },
    description:
      'Defeat 450 Frozen Wraiths. Earn a Frost Giant Key; wraiths may drop additional keys.',
    reward: { gold: 3200, items: [{ itemId: 'frostfall-boss-key', quantity: 1 }] },
  },
  'frostfall-giant': {
    id: 'frostfall-giant',
    title: 'The mountain wakes',
    prerequisite: 'frostfall-wraiths',
    npcId: 'frostwarden',
    target: { monsterId: 'frost-giant', mapId: 'frostfall-boss', count: 1 },
    description:
      'Climb to the Frost Giant Cairn above Wraith Ruins. Each entry consumes a key. Defeat one Frost Giant and dodge its marked Glacial Slam.',
    reward: { gold: 5000, items: [] },
  },
} as const;
const resources = [
  ['frost-ore', 'Frost Ore'],
  ['frostpine', 'Frostpine'],
  ['frostleaf', 'Frostleaf'],
  ...FROSTFALL_FISH.map((f) => [f.id, f.name] as const),
  ['frost-pelt', 'Frost Wolf Pelt'],
  ['troll-tusk', 'Ice Troll Tusk'],
  ['wraith-essence', 'Wraith Essence'],
  ['giant-heart', 'Frost Giant Heart'],
  ['frostfall-boss-key', 'Frost Giant Key'],
  ['frost-giant-trophy', 'Frost Giant Trophy'],
] as const;
export const FROSTFALL_ITEMS = Object.fromEntries(
  resources.map(([id, name]) => [
    id,
    {
      id,
      name,
      type: 'resource' as const,
      rarity: id.includes('key') ? 'Uncommon' : id.includes('trophy') ? 'Rare' : 'Common',
      level: 31,
      bonus: 0,
      sellValue: 0,
      icon: '◆',
      description:
        id === 'frostfall-boss-key'
          ? 'Consumed for each Frost Giant entry. Frozen Wraiths may drop more.'
          : `A resource from Frostfall Tundra: ${name}.`,
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
      f('ground', 0, 820, 3000),
      f('fishing-dock', 40, 620, 400),
      f('warden-ledge', 60, 420, 400),
      f('wolf-west', 620, 620, 680),
      f('wolf-east', 1580, 580, 720),
      f('frostpine', 1080, 410, 390),
      f('frostleaf', 1310, 210, 410),
      f('frost-mine', 2480, 610, 420),
    ],
    ladders: [
      l(145, 820, 620, 'ground', 'fishing-dock'),
      l(145, 620, 420, 'fishing-dock', 'warden-ledge'),
      l(820, 820, 620, 'ground', 'wolf-west'),
      l(1840, 820, 580, 'ground', 'wolf-east'),
      l(2660, 820, 610, 'ground', 'frost-mine'),
      l(1200, 620, 410, 'wolf-west', 'frostpine'),
      l(1390, 410, 210, 'frostpine', 'frostleaf'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'ground',
      'ground',
      'wolf-west',
      'wolf-west',
      'wolf-west',
      'wolf-east',
      'wolf-east',
      'wolf-east',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 3000),
      f('glacier-low', 260, 640, 750),
      f('glacier-right', 1900, 640, 800),
      f('bridge-left', 750, 450, 800),
      f('bridge-right', 1430, 450, 750),
      f('watch-crown', 1220, 240, 600),
    ],
    ladders: [
      l(520, 820, 640, 'ground', 'glacier-low'),
      l(2280, 820, 640, 'ground', 'glacier-right'),
      l(900, 640, 450, 'glacier-low', 'bridge-left'),
      l(2050, 640, 450, 'glacier-right', 'bridge-right'),
      l(1400, 450, 240, 'bridge-left', 'watch-crown'),
      l(1630, 450, 240, 'bridge-right', 'watch-crown'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'glacier-low',
      'glacier-low',
      'glacier-right',
      'glacier-right',
      'bridge-left',
      'bridge-left',
      'bridge-right',
      'watch-crown',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 3000),
      f('ruin-west', 160, 620, 650),
      f('ruin-center', 1000, 620, 700),
      f('ruin-balcony', 570, 420, 760),
      f('ruin-rise', 1610, 430, 880),
      f('boss-perch', 2240, 210, 620),
    ],
    ladders: [
      l(400, 820, 620, 'ground', 'ruin-west'),
      l(1350, 820, 620, 'ground', 'ruin-center'),
      l(710, 620, 420, 'ruin-west', 'ruin-balcony'),
      l(1130, 620, 420, 'ruin-center', 'ruin-balcony'),
      l(1660, 620, 430, 'ruin-center', 'ruin-rise'),
      l(2380, 430, 210, 'ruin-rise', 'boss-perch'),
    ],
    spawnPlatforms: [
      'ground',
      'ground',
      'ground',
      'ruin-west',
      'ruin-west',
      'ruin-center',
      'ruin-balcony',
      'ruin-balcony',
      'ruin-rise',
      'ruin-rise',
    ],
  },
  {
    platforms: [
      f('ground', 0, 820, 2400),
      f('giant-west', 270, 610, 600),
      f('giant-east', 1520, 610, 620),
      f('giant-crown', 760, 400, 920),
    ],
    ladders: [
      l(460, 820, 610, 'ground', 'giant-west'),
      l(1840, 820, 610, 'ground', 'giant-east'),
      l(810, 610, 400, 'giant-west', 'giant-crown'),
      l(1580, 610, 400, 'giant-east', 'giant-crown'),
    ],
    spawnPlatforms: ['ground'],
  },
];
const nodes: ResourceNode[] = [
  {
    id: 'frost-mine',
    skill: 'Mining',
    frame: 'ore',
    x: 2690,
    y: 610,
    platform: 'frost-mine',
    height: 85,
    duration: 5000,
    item: 'frost-ore',
    level: 31,
  },
  {
    id: 'frostpine',
    skill: 'Woodcutting',
    frame: 'tree',
    x: 1270,
    y: 410,
    platform: 'frostpine',
    height: 180,
    duration: 5000,
    item: 'frostpine',
    level: 31,
  },
  {
    id: 'frostleaf',
    skill: 'Herbalism',
    frame: 'herbs',
    x: 1510,
    y: 210,
    platform: 'frostleaf',
    height: 65,
    duration: 4000,
    item: 'frostleaf',
    level: 31,
  },
  {
    id: 'frostfall-fishing',
    skill: 'Fishing',
    frame: 'fishing',
    x: 145,
    y: 620,
    platform: 'fishing-dock',
    height: 0,
    duration: 6000,
    item: null,
    level: 31,
    fish: FROSTFALL_FISH,
  },
];
export const FROSTFALL_MAPS: Record<string, GameMap> = {};
const ids = ['frostfall', 'frostfall-2', 'frostfall-3', 'frostfall-boss'];
const names = ['Snowfang Pass', 'Glacier Watch', 'Wraith Ruins', 'Frost Giant Summit'];
const monsters = ['frost-wolf', 'ice-troll', 'frozen-wraith', 'frost-giant'] as const;
for (let i = 0; i < 4; i++) {
  const layout = layouts[i],
    totals = new Map<string, number>(),
    used = new Map<string, number>();
  for (const id of layout.spawnPlatforms) totals.set(id, (totals.get(id) ?? 0) + 1);
  const spawns = layout.spawnPlatforms.map((id) => {
    const p = layout.platforms.find((p) => p.id === id)!,
      n = (used.get(id) ?? 0) + 1;
    used.set(id, n);
    return {
      x:
        i === 3
          ? 1400
          : p.x +
            (id === 'ground' ? 650 : 0) +
            ((p.width - (id === 'ground' ? 750 : 0)) * n) / (totals.get(id)! + 1),
      y: p.y,
      platform: id,
    };
  });
  FROSTFALL_MAPS[ids[i]] = {
    id: ids[i],
    name: names[i],
    island: 'Frostfall Tundra',
    requiredLevel: [31, 34, 37, 40][i],
    width: i === 3 ? 2400 : 3000,
    height: 1050,
    spawn: { x: 180, y: 820 },
    monster: monsters[i],
    background: `/assets/backgrounds/frostfall-${i === 3 ? 'boss' : i + 1}.png`,
    platforms: layout.platforms,
    ladders: layout.ladders,
    spawns,
    resources: i === 0 ? nodes : [],
    npcs:
      i === 0
        ? [
            {
              id: 'frostwarden',
              name: 'Frost Warden',
              role: 'Frostfall quests',
              x: 350,
              y: 420,
              allegiance: 'celestial',
            },
          ]
        : [],
    ...(i === 2
      ? { bossEntrance: { theme: 'frostfall' as const, x: 2600, y: 210, platform: 'boss-perch' } }
      : {}),
    portals: [
      {
        x: 80,
        y: 820,
        target: i === 0 ? 'murkmire-3' : ids[i - 1],
        label: i === 0 ? 'Murkmire Swamp' : names[i - 1],
      },
      ...(i < 3
        ? [
            {
              x: i === 2 ? 2600 : 2900,
              y: i === 2 ? 210 : 820,
              target: ids[i + 1],
              label: names[i + 1],
              ...(i === 2 ? { key: 'frostfall-boss-key' } : {}),
            },
          ]
        : []),
    ],
  };
}
