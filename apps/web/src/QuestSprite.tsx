import { useEffect, useId, useState } from 'react';
import { assetUrl } from './assets';
type Atlas = {
  frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
  meta: { size: { w: number; h: number } };
};
const cache = new Map<string, Promise<Atlas>>();
function load(path: string) {
  let pending = cache.get(path);
  if (!pending) {
    pending = fetch(path + '.json').then((r) => {
      if (!r.ok) throw Error('Missing quest sprite');
      return r.json() as Promise<Atlas>;
    });
    cache.set(path, pending);
    pending.catch(() => cache.delete(path));
  }
  return pending;
}
const npcs: Record<string, [string, string]> = {
  mira: ['/assets/characters/skins/npc-outfits', 'mira'],
  bram: ['/assets/characters/skins/npc-outfits', 'bram'],
  mentor: ['/assets/characters/skins/npc-outfits', 'mentor'],
  mirewarden: ['/assets/tilesets/murkmire-scenery', 'warden'],
  frostwarden: ['/assets/characters/frostwarden', 'idle'],
};
/** One explicitly clipped atlas image. Keep neighboring animation frames out of the UI. */
export function QuestSprite({
  id,
  label,
  npc = false,
}: {
  id: string;
  label: string;
  npc?: boolean;
}) {
  const clip = useId();
  const [path, frame] = npc ? npcs[id] : [`/assets/monsters/${id}`, 'idle-0'];
  const [loaded, setLoaded] = useState<{ path: string; atlas: Atlas } | null>(null);
  useEffect(() => {
    if (id === 'wolf') return;
    let live = true;
    load(path)
      .then((atlas) => {
        if (live) setLoaded({ path, atlas });
      })
      .catch(() => {
        if (live) setLoaded(null);
      });
    return () => {
      live = false;
    };
  }, [path, id]);
  const atlas = loaded?.path === path ? loaded.atlas : null;
  const f = id === 'wolf' ? { x: 0, y: 0, w: 229, h: 229 } : atlas?.frames[frame]?.frame;
  const size = id === 'wolf' ? { w: 1374, h: 1145 } : atlas?.meta.size;
  return (
    <div className={`quest-sprite ${npc ? 'quest-npc' : 'quest-monster'}`}>
      {f && size ? (
        <svg role="img" aria-label={label} viewBox={`0 0 ${f.w} ${f.h}`}>
          <defs>
            <clipPath id={clip}>
              <rect width={f.w} height={f.h} />
            </clipPath>
          </defs>
          <image
            href={assetUrl(id === 'wolf' ? '/assets/monsters/wolf-spritesheet.png' : path + '.png')}
            x={-f.x}
            y={-f.y}
            width={size.w}
            height={size.h}
            clipPath={`url(#${clip})`}
          />
        </svg>
      ) : (
        <span className="quest-sprite-loading" aria-label={`Loading ${label}`} />
      )}
    </div>
  );
}
