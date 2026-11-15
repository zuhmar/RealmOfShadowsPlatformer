import { useId } from 'react';
import frames from '../public/assets/ui/journal/icons.json';
import { assetUrl } from './assets';

export function JournalArt({
  name,
  className = '',
}: {
  name: keyof typeof frames;
  className?: string;
}) {
  const id = useId();
  const f = frames[name];
  return (
    <svg
      className={`journal-icon ${className}`}
      viewBox={`0 0 ${f.w} ${f.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={id}>
          <rect width={f.w} height={f.h} />
        </clipPath>
      </defs>
      <image
        href={assetUrl('/assets/ui/journal/icons.png')}
        x={-f.x}
        y={-f.y}
        width="1536"
        height="1024"
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}
