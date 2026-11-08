import { provisionRecipe } from '@ros/game-data';
import atlas from '../public/assets/ui/recipe-consumables.json';
import { RecipeSprite } from './RecipeSprite';
export function ProvisionIcon({ id }: { id: string }) {
  const r = provisionRecipe(id);
  return r ? (
    <RecipeSprite atlas={atlas} sheet="recipe-consumables" id={id} label={r.name} />
  ) : null;
}
