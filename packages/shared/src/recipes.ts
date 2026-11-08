import {
  ALL_RECIPES,
  EQUIPMENT_TIERS,
  recipeFromScroll,
  recipeScroll,
  type RecipeScrollId,
} from '@ros/game-data';
import type { Player } from './index';
export function knowsRecipe(p: Pick<Player, 'unlockedRecipes'>, id: string) {
  return !!p.unlockedRecipes?.includes(id);
}
export function collectRecipe(p: Player, item: string) {
  const r = recipeFromScroll(item);
  if (!r) return false;
  if (!knowsRecipe(p, r.id)) (p.unlockedRecipes ??= []).push(r.id);
  return true;
}
/** Only eligible hunting kills advance pity. Pending ground scrolls cannot be duplicated. */
export function rollRecipeDrop(
  p: Player,
  island: string,
  boss: boolean,
  pending: string[] = [],
  random = Math.random,
): RecipeScrollId | undefined {
  const tier = EQUIPMENT_TIERS.find((t) => t.islandName === island || t.island === island);
  if (!tier) return;
  const available = ALL_RECIPES.filter(
    (r) => r.tier === tier.id && !knowsRecipe(p, r.id) && !pending.includes(recipeScroll(r.id)),
  );
  if (!available.length) return;
  const count = (p.recipeHunts?.[tier.id] ?? 0) + 1;
  (p.recipeHunts ??= {})[tier.id] = count;
  const bar = available.find((r) => r.id === `${tier.material}-bar`);
  if (!bar && !boss && count < 10 && random() >= 0.1) return;
  p.recipeHunts[tier.id] = 0;
  const r =
    bar ?? available[Math.min(available.length - 1, Math.floor(random() * available.length))];
  return recipeScroll(r.id);
}
