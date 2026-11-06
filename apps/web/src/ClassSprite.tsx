import { useEffect, useState } from 'react';
import type { ClassId } from '@ros/game-data';
import { assetUrl } from './assets';
import { Avatar } from './Avatar';
import headwear from '../public/assets/characters/skins/headwear.json';
type Frame = {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
};
type SkinAtlas = {
  frames: Record<string, Frame>;
  meta: {
    size: { w: number; h: number };
    anchors: Record<string, { head: { x: number; y: number } }>;
  };
};
const atlases = new Map<string, Promise<SkinAtlas>>();
export function ClassSprite({
  skin,
  appearance,
  outfit = 'sage',
}: {
  skin: ClassId | null;
  appearance: string;
  outfit?: string;
}) {
  const path = `/assets/characters/skins/${appearance === 'female' ? 'female' : 'male'}-${skin}`;
  const [atlas, setAtlas] = useState<SkinAtlas | null>(null);
  useEffect(() => {
    let active = true;
    setAtlas(null);
    if (skin) {
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
  if (!skin) return <Avatar appearance={appearance} outfit={outfit} />;
  const f = atlas?.frames['idle-0'],
    h = headwear.frames[`${skin}-idle`].frame,
    anchor = atlas?.meta.anchors['idle-0'].head;
  return (
    <svg
      role="img"
      aria-label={`${appearance} ${skin} skin`}
      aria-busy={!atlas}
      viewBox="20 -24 216 280"
      className="class-sprite"
    >
      {atlas && f && anchor && (
        <>
          <svg
            x={f.spriteSourceSize.x}
            y={f.spriteSourceSize.y}
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
          <svg
            x={anchor.x - 48}
            y={anchor.y - 48}
            width="96"
            height="96"
            viewBox={`${h.x} ${h.y} ${h.w} ${h.h}`}
          >
            <image
              href={assetUrl('/assets/characters/skins/headwear.png')}
              width={headwear.meta.size.w}
              height={headwear.meta.size.h}
            />
          </svg>
        </>
      )}
    </svg>
  );
}
