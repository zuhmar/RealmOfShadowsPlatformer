import { assetUrl } from './assets';
import atlas from '../public/assets/ui/world-actions.json';
export function ActionIcon({ name }: { name: keyof typeof atlas.frames }) {
  const { x, y, w, h } = atlas.frames[name].frame;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
      <image
        href={assetUrl('/assets/ui/world-actions.png')}
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
