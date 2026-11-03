import atlas from '../public/assets/ui/game-controls.json';
export function ControlIcon({ name }: { name: keyof typeof atlas.frames }) {
  const { x, y, w, h } = atlas.frames[name].frame;
  return (
    <svg
      className="control-icon"
      viewBox={`${x} ${y} ${w} ${h}`}
      aria-hidden="true"
      focusable="false"
    >
      <image
        href="/assets/ui/game-controls.png"
        width={atlas.meta.size.w}
        height={atlas.meta.size.h}
      />
    </svg>
  );
}
