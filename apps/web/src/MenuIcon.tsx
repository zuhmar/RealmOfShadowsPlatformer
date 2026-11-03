import atlas from '../public/assets/ui/player-menu.json';
export function MenuIcon({ name }: { name: keyof typeof atlas.frames }) {
  const { x, y, w, h } = atlas.frames[name].frame;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
      <image
        href="/assets/ui/player-menu.png"
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
