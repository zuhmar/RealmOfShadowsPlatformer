import { CLASS_PATHS } from '@ros/game-data';
import weapons from '../public/assets/equipment/elderwood-weapons.json';
import { useEffect, useState } from 'react';
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
}: {
  skin: SkinId | null;
  appearance: string;
  outfit?: string;
  armedPreview?: boolean;
}) {
  const path = '/assets/characters/skins/golden-test';
  const [atlas, setAtlas] = useState<SkinAtlas | null>(null);
  useEffect(() => {
    let active = true;
    setAtlas(null);
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
          if (active) setAtlas(a);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [path, skin]);

  const f = atlas?.frames['idle-0'];
  const viewport = atlas ? 104 / atlas.meta.sourceFrame.scale : 256;
  const weapon = armedPreview && skin && skin !== 'golden-test' ? CLASS_PATHS[skin].weapon : null;
  const wf = weapon ? weapons.frames[weapon].frame : null;
  return (
    <svg
      role="img"
      aria-label="Celestial adventurer"
      aria-busy={!atlas}
      viewBox={`0 0 ${viewport} ${viewport}`}
      className="class-sprite"
    >
      {atlas && f && (
        <svg
          x={f.spriteSourceSize.x + viewport / 2 - f.sourceSize.w / 2}
          y={f.spriteSourceSize.y + viewport * 0.9 - atlas.meta.sourceFrame.baseline}
          width={f.frame.w}
          height={f.frame.h}
          viewBox={`${f.frame.x} ${f.frame.y} ${f.frame.w} ${f.frame.h}`}
        >
          <image
            href={assetUrl(`${path}.png`)}
            width={atlas.meta.size.w}
            height={atlas.meta.size.h}
          />
        </svg>
      )}
      {atlas && wf && (
        <svg
          x={viewport * 0.61}
          y={viewport * 0.47}
          width={viewport * 0.28}
          height={viewport * 0.4}
          viewBox={`${wf.x} ${wf.y} ${wf.w} ${wf.h}`}
        >
          <image
            href={assetUrl('/assets/equipment/elderwood-weapons.png')}
            width={weapons.meta.size.w}
            height={weapons.meta.size.h}
          />
        </svg>
      )}
    </svg>
  );
}
