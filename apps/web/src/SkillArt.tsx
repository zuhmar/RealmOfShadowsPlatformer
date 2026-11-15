import { useId } from 'react';
import frames from '../public/assets/ui/skills/icons.json';
import { assetUrl } from './assets';
export type SkillIcon = keyof typeof frames;
export function SkillArt({ name }: { name: SkillIcon }) {
  const id = useId(),
    f = frames[name];
  return (
    <svg className="skill-art" viewBox={`0 0 ${f.w} ${f.h}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id}>
          <rect width={f.w} height={f.h} />
        </clipPath>
      </defs>
      <image
        href={assetUrl('/assets/ui/skills/icons.png')}
        x={-f.x}
        y={-f.y}
        width="1254"
        height="1254"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}
