export const GATHERING_SKILLS = ['Mining', 'Woodcutting', 'Fishing', 'Herbalism'] as const;
export type GatheringSkill = (typeof GATHERING_SKILLS)[number];
export type ResourceNode = {
  level?: number;
  fish?: readonly { id: string; name: string; level: number; rarity: string }[];
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
    y: 555,
    platform: 'mining-ledge',
    height: 66,
    duration: 3000,
    item: 'iron-ore',
  },
  {
    id: 'woods-oak',
    skill: 'Woodcutting',
    frame: 'oak-tree',
    x: 1360,
    y: 555,
    platform: 'oak-terrace',
    height: 160,
    duration: 3000,
    item: 'oak-logs',
  },
  {
    id: 'woods-greenleaf',
    skill: 'Herbalism',
    frame: 'greenleaf-patch',
    x: 2040,
    y: 350,
    platform: 'herb-garden',
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
export function fishingCatch(
  level: number,
  roll: number,
  fish: readonly { id: string; level: number }[] = WOODS_FISH,
) {
  if (level >= fish[2].level && roll < 0.08) return fish[2].id;
  if (level >= fish[1].level && roll < 0.33) return fish[1].id;
  return fish[0].id;
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
      'Medicinal leaves gathered in Whispering Woods. Brew health and mana potions at the Alchemy Table in Elderwood Village.',
    ],
    ...WOODS_FISH.map((f) => [
      f.id,
      f.name,
      f.rarity,
      `Caught in Whispering Woods at Fishing level ${f.level}. Cook temporary buff meals at the Cooking Campfire in Elderwood Village.`,
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
