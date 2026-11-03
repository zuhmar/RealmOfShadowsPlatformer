import atlas from '../public/assets/ui/player-menu.json';
export function MenuIcon({ name }: { name: keyof typeof atlas.frames | 'skills' }) {
  if (name === 'skills')
    return (
      <svg viewBox="100 50 1050 1160" aria-hidden="true" focusable="false">
        <image href="/assets/ui/skills.png" width="1254" height="1254" />
      </svg>
    );
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
