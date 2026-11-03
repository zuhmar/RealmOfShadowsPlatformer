import loot from '../public/assets/ui/woods-loot.json';
import resources from '../public/assets/ui/woods-resources.json';
import { itemDefinition, weaponKind } from '@ros/game-data';
import atlas from '../public/assets/equipment/elderwood-weapons.json';

export function ItemIcon({ id }: { id: string | null }) {
  const item = itemDefinition(id);
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
