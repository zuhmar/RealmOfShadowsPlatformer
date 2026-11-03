import { itemDefinition, weaponKind } from '@ros/game-data';
import atlas from '../public/assets/equipment/elderwood-weapons.json';

export function ItemIcon({ id }: { id: string | null }) {
  const item = itemDefinition(id);
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
