import { FORGE_RECIPES } from './forging';
import { PROVISION_RECIPES } from './provisions';
import { EQUIPMENT_TIERS, equipmentDefinition } from './island-equipment';
export type RecipeScrollId = `recipe:${string}`;
export type RecipeCategory = 'cooking' | 'alchemy' | 'smelting' | 'tool' | 'weapon' | 'armor';
export const ALL_RECIPES = [
  ...FORGE_RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    tier: r.tier ?? 'woods',
    category: (r.kind === 'material'
      ? 'smelting'
      : r.kind === 'tool'
        ? 'tool'
        : equipmentDefinition(r.id)?.weaponKind
          ? 'weapon'
          : 'armor') as RecipeCategory,
  })),
  ...PROVISION_RECIPES.map((r) => ({
    id: r.id,
    name: r.name,
    tier: r.characterLevel >= 11 ? 'crystal' : 'woods',
    category: (r.skill === 'Cooking' ? 'cooking' : 'alchemy') as RecipeCategory,
  })),
];
export const recipeScroll = (id: string): RecipeScrollId => `recipe:${id}`;
export const recipeDiscovery = (id: unknown) =>
  typeof id === 'string' ? ALL_RECIPES.find((r) => r.id === id) : undefined;
export const recipeFromScroll = (id: unknown) =>
  typeof id === 'string' && id.startsWith('recipe:') ? recipeDiscovery(id.slice(7)) : undefined;
export const recipeSource = (id: string) => {
  const r = recipeDiscovery(id),
    tier = EQUIPMENT_TIERS.find((t) => t.id === r?.tier);
  return tier
    ? `${tier.islandName} monsters${['woods', 'crystal'].includes(tier.id) ? '' : ' (future island)'}`
    : 'Unknown recipe';
};
export const RECIPE_SCROLL_ITEMS = Object.fromEntries(
  ALL_RECIPES.map((r) => [
    recipeScroll(r.id),
    {
      id: recipeScroll(r.id),
      name: `${r.name} Recipe`,
      type: 'recipe' as const,
      level: 1,
      bonus: 0,
      icon: '📜',
      description: `Find on ${recipeSource(r.id)}. Collected recipe loot permanently unlocks ${r.name}.`,
    },
  ]),
) as Record<
  RecipeScrollId,
  {
    id: RecipeScrollId;
    name: string;
    type: 'recipe';
    level: number;
    bonus: number;
    icon: string;
    description: string;
  }
>;
