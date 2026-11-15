import type { Player } from '@ros/shared';
import { classSkinSheet, baseSkinSheet } from '@ros/game-data';
import { useEffect, useId, useState } from 'react';
import type { SkinId } from '@ros/game-data';
import { assetUrl } from './assets';

type Frame = {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number };
  sourceSize: { w: number; h: number };
};
type SkinAtlas = {
  frames: Record<string, Frame>;
  meta: { size: { w: number; h: number }; sourceFrame: { scale: number; baseline: number } };
};
const atlases = new Map<string, Promise<SkinAtlas>>();
/** Headwear and weapons are part of the authored character pixels. */
export function ClassSprite({
  skin,
  appearance,
  outfit = 'sage',
  armedPreview = false,
  weapon,
  player,
}: {
  skin: SkinId | null;
  appearance: string;
  outfit?: string;
  armedPreview?: boolean;
  weapon?: string | null;
  player?: Player;
}) {
  const path =
    player && armedPreview
      ? classSkinSheet(player).path
      : skin && skin !== 'golden-test'
        ? `/assets/characters/skins/celestial/${skin}-${armedPreview ? 'armed' : 'unarmed'}`
        : baseSkinSheet({ weapon }, !armedPreview).path;
  const clipId = useId();
  const [loaded, setLoaded] = useState<{ path: string; atlas: SkinAtlas } | null>(null);
  const atlas = loaded?.path === path ? loaded.atlas : null;
  useEffect(() => {
    let active = true;
    setLoaded(null);
    {
      let promise = atlases.get(path);
      if (!promise) {
        promise = fetch(`${path}.json`).then((r) => {
          if (!r.ok) throw new Error('Skin artwork unavailable');
          return r.json();
        });
        atlases.set(path, promise);
        promise.catch(() => atlases.delete(path));
      }
      promise
        .then((a) => {
          if (active) setLoaded({ path, atlas: a });
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [path, skin]);

  const f = atlas?.frames['idle-0'];
  const viewport = atlas ? 104 / atlas.meta.sourceFrame.scale : 256;
  const x = f ? f.spriteSourceSize.x + viewport / 2 - f.sourceSize.w / 2 : 0;
  const y =
    atlas && f ? f.spriteSourceSize.y + viewport * 0.9 - atlas.meta.sourceFrame.baseline : 0;
  return (
    <svg
      role="img"
      aria-label={
        skin && skin !== 'golden-test' ? `${skin} Celestial adventurer` : 'Celestial adventurer'
      }
      aria-busy={!atlas}
      viewBox={`0 0 ${viewport} ${viewport}`}
      className="class-sprite"
    >
      {atlas && f && (
        <g>
          <defs>
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect x={x} y={y} width={f.frame.w} height={f.frame.h} />
            </clipPath>
          </defs>
          <image
            clipPath={`url(#${clipId})`}
            x={x - f.frame.x}
            y={y - f.frame.y}
            href={assetUrl(`${path}.png`)}
            width={atlas.meta.size.w}
            height={atlas.meta.size.h}
          />
        </g>
      )}
    </svg>
  );
}
