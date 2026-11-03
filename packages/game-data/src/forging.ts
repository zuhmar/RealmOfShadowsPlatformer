import { EQUIPMENT_TIERS, ISLAND_EQUIPMENT } from './island-equipment';
export type ForgeRecipe = {
  id: string;
  name: string;
  kind: 'material' | 'tool' | 'equipment';
  cost: Record<string, number>;
  xp: number;
  level?: number;
  tier?: string;
};
export const BRAM_QUEST = {
  id: 'bram-forge',
  title: 'A proper set of tools',
  npcId: 'bram',
  offer:
    'You survived the Shadow Dragon and trained for years. Good tools will carry you further. Gather 100 Iron Ore and 20 Oak Logs, smelt 5 Iron Bars here, then forge your first Iron tool.',
  rewardGold: 25,
  rewardXp: 20,
} as const;
export const FORGE_RECIPES: ForgeRecipe[] = [
  { id: 'iron-bar', name: 'Iron Bar', kind: 'material', cost: { 'iron-ore': 20 }, xp: 5 },
  ...['pickaxe', 'axe', 'rod', 'sickle'].map((type) => ({
    id: `iron-${type}`,
    name: `Iron ${type === 'rod' ? 'Fishing Rod' : type[0].toUpperCase() + type.slice(1)}`,
    kind: 'tool' as const,
    cost: { 'iron-bar': 5, 'oak-logs': 20 },
    xp: 15,
  })),
  ...EQUIPMENT_TIERS.filter((t) => t.material !== 'iron').map((t, i) => ({
    id: `${t.material}-bar`,
    name: `${t.material[0].toUpperCase() + t.material.slice(1)} Bar`,
    kind: 'material' as const,
    cost: { [t.ore]: 20 },
    xp: 10 + i * 5,
    level: t.level,
    tier: t.id,
  })),
  ...ISLAND_EQUIPMENT.map((g) => {
    const tier = EQUIPMENT_TIERS.find((t) => t.id === g.tier)!;
    return {
      id: g.id,
      name: g.name,
      kind: 'equipment' as const,
      cost: { [`${tier.material}-bar`]: tier.bars },
      xp: 20 + EQUIPMENT_TIERS.indexOf(tier) * 15,
      level: g.level,
      tier: tier.id,
    };
  }),
];
export const IRON_TOOL_DURATION = 0.8;
