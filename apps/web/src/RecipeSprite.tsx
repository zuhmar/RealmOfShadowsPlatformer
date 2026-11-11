import { useId } from 'react';
import { assetUrl } from './assets';
type Atlas = {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { size: { w: number; h: number } };
};
export function RecipeSprite({
  atlas,
  sheet,
  id,
  label,
}: {
  atlas: Atlas;
  sheet: string;
  id: string;
  label: string;
}) {
  const clipId = useId();
  const f = atlas.frames[id]?.frame;
  if (!f) return null;
  return (
    <svg
      width="40"
      height="40"
      viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`}
      role="img"
      aria-label={label}
      style={{ verticalAlign: 'middle', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} />
        </clipPath>
      </defs>
      <image
        clipPath={`url(#${clipId})`}
        href={assetUrl(`/assets/ui/${sheet}.png`)}
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
