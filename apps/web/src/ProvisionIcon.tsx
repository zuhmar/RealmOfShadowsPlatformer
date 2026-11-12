import murkmire from '../public/assets/ui/murkmire-provisions.json';
import { provisionRecipe } from '@ros/game-data';
import atlas from '../public/assets/ui/recipe-consumables.json';
import { RecipeSprite } from './RecipeSprite';
export function ProvisionIcon({ id }: { id: string }) {
  const r = provisionRecipe(id);
  return r ? (
    <RecipeSprite
      atlas={Object.hasOwn(murkmire.frames, id) ? murkmire : atlas}
      sheet={Object.hasOwn(murkmire.frames, id) ? 'murkmire-provisions' : 'recipe-consumables'}
      id={id}
      label={r.name}
    />
  ) : null;
}
