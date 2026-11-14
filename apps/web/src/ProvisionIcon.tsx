import frost from '../public/assets/ui/frostfall-items.json';
import frostExtras from '../public/assets/ui/frostfall-extras.json';
import murkmire from '../public/assets/ui/murkmire-provisions.json';
import { provisionRecipe } from '@ros/game-data';
import atlas from '../public/assets/ui/recipe-consumables.json';
import { RecipeSprite } from './RecipeSprite';
export function ProvisionIcon({ id }: { id: string }) {
  const r = provisionRecipe(id);
  if (r && Object.hasOwn(frost.frames, id))
    return <RecipeSprite atlas={frost} sheet="frostfall-items" id={id} label={r.name} />;
  if (r && Object.hasOwn(frostExtras.frames, id))
    return <RecipeSprite atlas={frostExtras} sheet="frostfall-extras" id={id} label={r.name} />;
  return r ? (
    <RecipeSprite
      atlas={Object.hasOwn(murkmire.frames, id) ? murkmire : atlas}
      sheet={Object.hasOwn(murkmire.frames, id) ? 'murkmire-provisions' : 'recipe-consumables'}
      id={id}
      label={r.name}
    />
  ) : null;
}
