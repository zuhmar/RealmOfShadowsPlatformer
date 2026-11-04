import crystalResources from '../public/assets/ui/crystal-resources.json';
import crystalDrops from '../public/assets/ui/crystal-loot.json';
import islandAtlas from '../public/assets/equipment/islands/manifest.json';
import { equipmentDefinition } from '@ros/game-data';
import loot from '../public/assets/ui/woods-loot.json';
import resources from '../public/assets/ui/woods-resources.json';
import { itemDefinition, weaponKind } from '@ros/game-data';
import atlas from '../public/assets/equipment/elderwood-weapons.json';

export function ItemIcon({ id }: { id: string | null }) {
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
          href={
            crystalAtlas === crystalResources
              ? '/assets/ui/crystal-resources.png'
              : '/assets/ui/crystal-loot.png'
          }
          width={crystalAtlas.meta.size.w}
          height={crystalAtlas.meta.size.h}
        />
      </svg>
    );
  }
  if (id === 'teleport-crystal')
    return (
      <img
        src="/assets/ui/teleport-crystal.png"
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
          href={`/assets/equipment/islands/${gear.tier}.png`}
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
          href="/assets/ui/woods-loot.png"
          width={loot.meta.size.w}
          height={loot.meta.size.h}
        />
      </svg>
    );
  }
  if (id === 'forest-bear-key')
    return (
      <img
        src="/assets/ui/forest-bear-key.png"
        alt="Forest Bear Key"
        draggable={false}
        width="32"
        height="32"
        style={{ objectFit: 'contain', verticalAlign: 'middle' }}
      />
    );
  if (id === 'iron-bar')
    return (
      <img
        src="/assets/ui/iron-bar.png"
        alt="Iron Bar"
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
          href="/assets/ui/woods-resources.png"
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
        href="/assets/equipment/elderwood-weapons.png"
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
