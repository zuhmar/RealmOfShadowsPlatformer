import { assetUrl } from './assets';
import atlas from '../public/assets/equipment/gathering-tools.json';
import { GATHERING_TOOLS } from '@ros/game-data';
export function ToolIcon({ id }: { id: string }) {
  const entry = Object.prototype.hasOwnProperty.call(atlas.frames, id)
    ? atlas.frames[id as keyof typeof atlas.frames]
    : null;
  if (!entry) return null;
  const { x, y, w, h } = entry.frame;
  return (
    <svg
      className="tool-icon"
      width="40"
      height="44"
      viewBox={`${x} ${y} ${w} ${h}`}
      role="img"
      aria-label={GATHERING_TOOLS.find((tool) => tool.id === id)?.name ?? id}
    >
      <image
        href={assetUrl('/assets/equipment/gathering-tools.png')}
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
