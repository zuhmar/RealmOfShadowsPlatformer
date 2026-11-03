export const GATHERING_SKILLS = ['Mining', 'Woodcutting', 'Fishing', 'Herbalism'] as const;
export type GatheringSkill = (typeof GATHERING_SKILLS)[number];
export type ResourceNode = {
  id: string;
  skill: GatheringSkill;
  frame: string;
  x: number;
  y: number;
  platform: string;
  height: number;
  duration: number;
  item: string | null;
};
export const WOODS_RESOURCE_NODES: ResourceNode[] = [
  {
    id: 'woods-iron',
    skill: 'Mining',
    frame: 'iron-deposit',
    x: 2250,
    y: 760,
    platform: 'ground',
    height: 66,
    duration: 3000,
    item: 'iron-ore',
  },
  {
    id: 'woods-oak',
    skill: 'Woodcutting',
    frame: 'oak-tree',
    x: 1360,
    y: 760,
    platform: 'ground',
    height: 160,
    duration: 3000,
    item: 'oak-logs',
  },
  {
    id: 'woods-greenleaf',
    skill: 'Herbalism',
    frame: 'greenleaf-patch',
    x: 2040,
    y: 760,
    platform: 'ground',
    height: 42,
    duration: 2000,
    item: 'greenleaf',
  },
  {
    id: 'woods-fishing',
    skill: 'Fishing',
    frame: 'fishing',
    x: 260,
    y: 555,
    platform: 'fishing-dock',
    height: 0,
    duration: 4000,
    item: null,
  },
];
export const WOODS_FISH = [
  { id: 'brook-trout', name: 'Brook Trout', level: 1, rarity: 'Common' },
  { id: 'silver-minnow', name: 'Silver Minnow', level: 5, rarity: 'Uncommon' },
  { id: 'golden-carp', name: 'Golden Carp', level: 10, rarity: 'Rare' },
] as const;
export function fishingCatch(level: number, roll: number) {
  if (level >= 10 && roll < 0.08) return WOODS_FISH[2].id;
  if (level >= 5 && roll < 0.33) return WOODS_FISH[1].id;
  return WOODS_FISH[0].id;
}
export const gatheringXpNeeded = (level: number) => level * 20;
export const WOODS_RESOURCE_ITEMS = Object.fromEntries(
  [
    [
      'iron-ore',
      'Iron Ore',
      'Common',
      'Ore gathered in Whispering Woods. Used for future Blacksmithing recipes.',
    ],
    [
      'oak-logs',
      'Oak Logs',
      'Common',
      'Oak timber gathered in Whispering Woods. Used for future Carpentry recipes.',
    ],
    [
      'greenleaf',
      'Greenleaf',
      'Common',
      'Medicinal leaves gathered in Whispering Woods. Used for future Alchemy recipes.',
    ],
    ...WOODS_FISH.map((f) => [
      f.id,
      f.name,
      f.rarity,
      `Caught in Whispering Woods at Fishing level ${f.level}. Used for future Cooking recipes.`,
    ]),
  ].map(([id, name, rarity, description]) => [
    id,
    {
      id,
      name,
      rarity,
      description,
      type: 'resource' as const,
      sellValue: 1,
      level: 1,
      bonus: 0,
      icon: '✦',
    },
  ]),
);
