import { assetUrl } from './assets';
import { useEffect, useId, useState } from 'react';
import { characterPreview, type Atlas } from './character-art';
export function Avatar({
  outfit = 'sage',
  appearance = 'male',
}: {
  outfit?: string;
  appearance?: string;
}) {
  const [art, setArt] = useState<{ atlas: Atlas; image: string } | null>(null);
  const id = useId();
  useEffect(() => {
    let active = true;
    setArt(null);
    characterPreview(appearance, outfit)
      .then((value) => {
        if (active) setArt(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [appearance, outfit]);
  const pose = art?.atlas.frames['idle-0'];
  return (
    <svg
      viewBox="40 0 176 256"
      aria-label={`${appearance} ${outfit} adventurer`}
      role="img"
      aria-busy={!art}
    >
      {art && pose ? (
        <>
          <defs>
            <clipPath id={id}>
              <rect
                x={pose.spriteSourceSize.x}
                y={pose.spriteSourceSize.y}
                width={pose.frame.w}
                height={pose.frame.h}
              />
            </clipPath>
          </defs>
          <image
            href={assetUrl(art.image)}
            x={pose.spriteSourceSize.x - pose.frame.x}
            y={pose.spriteSourceSize.y - pose.frame.y}
            width={art.atlas.meta.size.w}
            height={art.atlas.meta.size.h}
            clipPath={`url(#${id})`}
          />
        </>
      ) : (
        <text x="128" y="170" textAnchor="middle" fill="#b9c88c" fontSize="110">
          ♙
        </text>
      )}
    </svg>
  );
}
