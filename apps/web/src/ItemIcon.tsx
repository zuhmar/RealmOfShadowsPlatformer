import housing from '../public/assets/ui/housing.json';
import { recipeFromScroll, GATHERING_TOOLS } from '@ros/game-data';
import { RecipeSprite } from './RecipeSprite';
import { ToolIcon } from './ToolIcon';
import bars from '../public/assets/ui/recipe-bars.json';
import scrolls from '../public/assets/ui/recipe-scrolls.json';
import { ProvisionIcon } from './ProvisionIcon';
import { provisionRecipe } from '@ros/game-data';
import { assetUrl } from './assets';
import crystalResources from '../public/assets/ui/crystal-resources.json';
import crystalDrops from '../public/assets/ui/crystal-loot.json';
import islandAtlas from '../public/assets/equipment/islands/manifest.json';
import { equipmentDefinition } from '@ros/game-data';
import loot from '../public/assets/ui/woods-loot.json';
import resources from '../public/assets/ui/woods-resources.json';
import { itemDefinition, weaponKind } from '@ros/game-data';
import atlas from '../public/assets/equipment/elderwood-weapons.json';

export function ItemIcon({ id }: { id: string | null }) {
  if (id && Object.hasOwn(housing.frames, id))
    return (
      <RecipeSprite
        atlas={housing}
        sheet="housing"
        id={id}
        label={itemDefinition(id)?.name ?? id}
      />
    );
  if (id === 'oak-plank') return <ItemIcon id="oak-logs" />;
  const recipe = recipeFromScroll(id);
  if (recipe)
    return (
      <span style={{ position: 'relative', display: 'inline-block', width: 44, height: 44 }}>
        <RecipeSprite
          atlas={scrolls}
          sheet="recipe-scrolls"
          id={
            recipe.category === 'carpentry'
              ? 'tool'
              : recipe.category === 'housing'
                ? 'armor'
                : recipe.category
          }
          label={`${recipe.name} Recipe`}
        />
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: 14,
            transform: 'scale(.6)',
            transformOrigin: 'top left',
          }}
        >
          <ItemIcon id={recipe.id} />
        </span>
      </span>
    );
  if (id && Object.hasOwn(bars.frames, id))
    return (
      <RecipeSprite
        atlas={bars}
        sheet="recipe-bars"
        id={id}
        label={itemDefinition(id)?.name ?? id}
      />
    );
  if (id && GATHERING_TOOLS.some((t) => t.id === id)) return <ToolIcon id={id} />;
  if (provisionRecipe(id)) return <ProvisionIcon id={id!} />;
  const crystalAtlas =
    id && Object.hasOwn(crystalResources.frames, id)
      ? crystalResources
      : id && Object.hasOwn(crystalDrops.frames, id)
        ? crystalDrops
        : null;
  if (crystalAtlas && id) {
    const entry = (
      crystalAtlas.frames as Record<
        string,
        { frame: { x: number; y: number; w: number; h: number } }
      >
    )[id].frame;
    return (
      <svg
        width="40"
        height="40"
        viewBox={`${entry.x} ${entry.y} ${entry.w} ${entry.h}`}
        role="img"
        aria-label={itemDefinition(id)?.name ?? id}
      >
        <image
          href={assetUrl(
            crystalAtlas === crystalResources
              ? '/assets/ui/crystal-resources.png'
              : '/assets/ui/crystal-loot.png',
          )}
          width={crystalAtlas.meta.size.w}
          height={crystalAtlas.meta.size.h}
        />
      </svg>
    );
  }
  if (id === 'teleport-crystal')
    return (
      <img
        src={assetUrl('/assets/ui/teleport-crystal.png')}
        alt="Teleport Crystal"
        draggable={false}
        width="40"
        height="40"
        style={{ objectFit: 'contain', verticalAlign: 'middle' }}
      />
    );
  const item = itemDefinition(id),
    gear = equipmentDefinition(id);
  if (gear) {
    const sheet = islandAtlas.sheets[gear.tier as keyof typeof islandAtlas.sheets];
    const w = sheet.width / 4,
      h = sheet.height / 2;
    return (
      <svg
        width="40"
        height="40"
        viewBox={`${(gear.frame % 4) * w} ${Math.floor(gear.frame / 4) * h} ${w} ${h}`}
        role="img"
        aria-label={gear.name}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      >
        <image
          href={assetUrl(`/assets/equipment/islands/${gear.tier}.png`)}
          width={sheet.width}
          height={sheet.height}
        />
      </svg>
    );
  }
  if (id && Object.hasOwn(loot.frames, id)) {
    const { x, y, w, h } = loot.frames[id as keyof typeof loot.frames].frame;
    return (
      <svg
        width="32"
        height="32"
        viewBox={`${x} ${y} ${w} ${h}`}
        role="img"
        aria-label={item?.name ?? id}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      >
        <image
          href={assetUrl('/assets/ui/woods-loot.png')}
          width={loot.meta.size.w}
          height={loot.meta.size.h}
        />
      </svg>
    );
  }
  if (id === 'forest-bear-key')
    return (
      <img
        src={assetUrl('/assets/ui/forest-bear-key.png')}
        alt="Forest Bear Key"
        draggable={false}
        width="32"
        height="32"
        style={{ objectFit: 'contain', verticalAlign: 'middle' }}
      />
    );
  const resource =
    id && Object.prototype.hasOwnProperty.call(resources.frames, id)
      ? resources.frames[id as keyof typeof resources.frames]
      : null;
  if (resource) {
    const { x, y, w, h } = resource.frame;
    return (
      <svg
        width="30"
        height="32"
        viewBox={`${x} ${y} ${w} ${h}`}
        role="img"
        aria-label={item?.name ?? id!}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      >
        <image
          href={assetUrl('/assets/ui/woods-resources.png')}
          width={resources.meta.size.w}
          height={resources.meta.size.h}
        />
      </svg>
    );
  }
  const kind = weaponKind(id);
  if (kind === 'unarmed') return <span>{item?.icon ?? '⚔'}</span>;
  const { x, y, w, h } = atlas.frames[kind].frame;
  return (
    <svg
      width="28"
      height="32"
      viewBox={`${x} ${y} ${w} ${h}`}
      role="img"
      aria-label={item?.name ?? kind}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <image
        href={assetUrl('/assets/equipment/elderwood-weapons.png')}
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
