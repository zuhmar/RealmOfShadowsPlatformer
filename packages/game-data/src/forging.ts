export const BRAM_QUEST = {
  id: 'bram-forge',
  title: 'A proper set of tools',
  npcId: 'bram',
  offer:
    'You survived the Shadow Dragon and trained for years. Good tools will carry you further. Gather 600 Iron Ore and 20 Oak Logs, smelt 30 Iron Bars here, then forge your first Iron tool.',
  rewardGold: 25,
  rewardXp: 20,
} as const;
export const FORGE_RECIPES = [
  { id: 'iron-bar', name: 'Iron Bar', kind: 'material', cost: { 'iron-ore': 20 }, xp: 5 },
  ...['pickaxe', 'axe', 'rod', 'sickle'].map((type) => ({
    id: `iron-${type}`,
    name: `Iron ${type === 'rod' ? 'Fishing Rod' : type[0].toUpperCase() + type.slice(1)}`,
    kind: 'tool',
    cost: { 'iron-bar': 30, 'oak-logs': 20 },
    xp: 15,
  })),
] as const;
export const IRON_TOOL_DURATION = 0.8;
