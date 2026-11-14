import { createPortal } from 'react-dom';
import groundSurfaces from './cinematic-ground-surfaces.json';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  classSkinSheet,
  canEquipSkin,
  type FilmActor,
  type Cutscene,
  type FilmAnimation,
} from '@ros/game-data';
import type { Player } from '@ros/shared';
import { assetUrl } from './assets';
import { ItemIcon } from './ItemIcon';
import { realmAudio } from './audio';
type Frame = {
  frame: { x: number; y: number; w: number; h: number };
  spriteSourceSize?: { x: number; y: number };
  sourceSize?: { w: number; h: number };
};
type Atlas = {
  frames: Record<string, Frame>;
  meta: {
    size: { w: number; h: number };
    sourceFrame?: { width: number; height: number; baseline: number; scale: number };
    animations?: Record<string, { frames: string[]; frameRate: number }>;
  };
};
const cache = new Map<string, Promise<Atlas>>();
export function filmAtlas(path: string) {
  let value = cache.get(path);
  if (!value) {
    value = fetch(`${path}.json?image=${encodeURIComponent(assetUrl(`${path}.png`))}`).then((r) => {
      if (!r.ok) throw new Error('Artwork unavailable');
      return r.json();
    });
    cache.set(path, value);
    value.catch(() => cache.delete(path));
  }
  return value;
}
function descriptor(a: FilmActor, p: Player) {
  const k = a.kind;
  if (k === 'hero') return { path: classSkinSheet(p).path, action: a.action ?? 'idle' };
  if (k === 'young' || k === 'training')
    return {
      path: classSkinSheet({
        skin: 'golden-test',
        weapon: k === 'training' ? 'sword' : null,
      }).path,
      action: a.action ?? 'idle',
    };
  if (['knight', 'archer', 'mage', 'rogue'].includes(k))
    return { path: `/assets/characters/skins/celestial/${k}-armed`, action: a.action ?? 'idle' };
  if (k === 'shadow')
    return { path: '/assets/characters/skins/shadow-being', action: a.action ?? 'idle' };
  if (k === 'gathering') {
    const skin =
      typeof p.skin === 'string' &&
      ['knight', 'archer', 'mage', 'rogue'].includes(p.skin) &&
      canEquipSkin(p.classId, p.skin)
        ? p.skin
        : 'base';
    return {
      path: `/assets/characters/gathering/baked/${skin}-wood`,
      action: a.action ?? 'mining',
    };
  }
  if (['mira', 'bram', 'mentor'].includes(k))
    return { path: '/assets/characters/skins/npc-outfits', action: k };
  if (k === 'mirewarden') return { path: '/assets/tilesets/murkmire-scenery', action: 'warden' };
  if (k === 'frostwarden') return { path: '/assets/characters/frostwarden', action: 'idle' };
  if (k === 'bench')
    return { path: '/assets/props/crafting-stations', action: a.action ?? 'smelting' };
  if (k === 'house') return { path: '/assets/ui/housing', action: 'house-small' };
  if (k === 'fx') return { path: '/assets/effects/weapon-specials/staff', action: 'fx' };
  if (k === 'ground')
    return {
      path: `/assets/tilesets/${a.action}-platforms`,
      action: a.action === 'elderwood-village' ? 'grass-ground' : 'ground',
    };
  return { path: `/assets/monsters/${k}`, action: a.action ?? 'idle' };
}
export function FilmSprite({
  actor,
  player,
  paused = false,
}: {
  actor: FilmActor;
  player: Player;
  paused?: boolean;
}) {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)'),
      change = () => setReduced(q.matches);
    q.addEventListener('change', change);
    return () => q.removeEventListener('change', change);
  }, []);
  const { path, action } = descriptor(actor, player),
    [atlas, setAtlas] = useState<Atlas | null>(null),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setAtlas(null);
    filmAtlas(path)
      .then((a) => {
        if (alive) setAtlas(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path]);
  useEffect(() => {
    setTick(0);
  }, [path, action]);
  useEffect(() => {
    if (paused || reduced) return;
    const timer = setInterval(() => setTick((v) => v + 1), 140);
    return () => clearInterval(timer);
  }, [paused, reduced]);
  if (!atlas) return null;
  const clip =
    atlas.meta.animations?.[action]?.frames ??
    Object.keys(atlas.frames)
      .filter((n) => n === action || n.startsWith(`${action}-`))
      .sort();
  const name = clip[tick % Math.max(1, clip.length)] ?? Object.keys(atlas.frames)[0],
    entry = atlas.frames[name];
  if (!entry) return null;
  const f = entry.frame,
    sf = atlas.meta.sourceFrame,
    sz = entry.sourceSize,
    offset = entry.spriteSourceSize;
  const v = sf ? 110 / sf.scale : undefined;
  const groundSurface =
    actor.kind === 'ground'
      ? ((groundSurfaces as Record<string, number>)[actor.action ?? ''] ?? 0)
      : 0;
  const view =
    actor.kind === 'ground'
      ? `0 ${groundSurface} ${f.w} ${f.h - groundSurface}`
      : sf
        ? `${sf.width / 2 - v! / 2} ${sf.baseline - v! * 0.95} ${v} ${v}`
        : sz
          ? `0 0 ${sz.w} ${sz.h}`
          : `0 0 ${f.w} ${f.h}`;
  return (
    <svg
      viewBox={view}
      role="img"
      aria-label={actor.kind}
      data-film-frame={name}
      data-film-path={path}
      preserveAspectRatio={actor.kind === 'ground' ? 'xMidYMin slice' : 'xMidYMax meet'}
    >
      <svg
        x={offset?.x ?? 0}
        y={offset?.y ?? 0}
        width={f.w}
        height={f.h}
        viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`}
      >
        <image
          href={assetUrl(`${path}.png`)}
          width={atlas.meta.size.w}
          height={atlas.meta.size.h}
        />
      </svg>
    </svg>
  );
}
const groundTheme = (bg: string) =>
  bg.includes('frostfall')
    ? 'frostfall'
    : bg.includes('crystal')
      ? 'crystal'
      : bg.includes('murkmire')
        ? 'murkmire'
        : bg.includes('elderwood') || bg.includes('cinematic')
          ? 'elderwood-village'
          : 'whispering-woods';
/** Nested viewports clip the sheet to one cell even when the outer view is letterboxed. */
function SceneFrames({
  animation,
  paused,
  origin,
}: {
  animation: FilmAnimation;
  paused: boolean;
  origin: string;
}) {
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const q = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(q.matches);
    q.addEventListener('change', change);
    return () => q.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (paused || reduced || frame >= animation.frames - 1) return;
    const timer = setTimeout(
      () => setFrame((f) => Math.min(f + 1, animation.frames - 1)),
      1000 / animation.fps,
    );
    return () => clearTimeout(timer);
  }, [animation.sheet, animation.frames, animation.fps, frame, paused, reduced]);
  const current = reduced ? 0 : frame;
  // Verified source dimensions and grid divisions preserve each frame's proportions.
  const width = 1536 / animation.columns,
    height = 1024 / animation.rows;
  // Inset each cell two pixels to keep filtered neighboring pixels out of view.
  const x = (current % animation.columns) * width,
    y = Math.floor(current / animation.columns) * height;
  return (
    <svg
      className="cinema-backdrop cinema-scene-frames"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      data-scene-sheet={animation.sheet}
      data-scene-frame={current}
      style={{ transformOrigin: origin }}
    >
      <svg
        x="0"
        y="0"
        width={width}
        height={height}
        viewBox={`${x + 2} ${y + 2} ${width - 4} ${height - 4}`}
        preserveAspectRatio="xMidYMid slice"
        overflow="hidden"
      >
        <image href={assetUrl(animation.sheet)} x="0" y="0" width="1536" height="1024" />
      </svg>
    </svg>
  );
}
export function CutscenePlayer({
  scene,
  player,
  onFinish,
}: {
  scene: Cutscene;
  player: Player;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0),
    [paused, setPaused] = useState(false),
    [readyIndex, setReadyIndex] = useState(-1),
    [loadedSheet, setLoadedSheet] = useState<string | null>(null),
    [hidden, setHidden] = useState(document.hidden),
    finished = useRef(false),
    close = useRef<HTMLButtonElement>(null);
  const ready = readyIndex === index;
  const beat = scene.beats[index],
    stopped = paused || hidden;
  const finish = () => {
    if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  };
  const next = () => (index + 1 < scene.beats.length ? setIndex((v) => v + 1) : finish());
  useLayoutEffect(() => {
    const previous = document.activeElement;
    close.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    let alive = true;
    setReadyIndex(-1);
    const paths = (beat.illustration ? [] : beat.actors)
      .filter((a) => a.kind !== 'item')
      .map((a) => descriptor(a, player).path);
    const load = (src: string) =>
      new Promise<boolean>((resolve) => {
        const im = new Image();
        im.onload = () => resolve(true);
        im.onerror = () => resolve(false);
        im.src = assetUrl(src);
      });
    Promise.all([
      load(beat.illustration ?? beat.background),
      beat.animation ? load(beat.animation.sheet) : Promise.resolve(false),
      ...paths.map((path) =>
        filmAtlas(path)
          .then(() => load(`${path}.png`))
          .catch(() => {}),
      ),
    ]).then(([, sheetLoaded]) => {
      if (alive) {
        setLoadedSheet(sheetLoaded ? (beat.animation?.sheet ?? null) : null);
        setReadyIndex(index);
      }
    });
    return () => {
      alive = false;
    };
  }, [index, scene.id]);
  useEffect(() => {
    if (!ready || stopped) return;
    const t = setTimeout(next, beat.duration ?? 6500);
    return () => clearTimeout(t);
  }, [index, ready, stopped]);
  useEffect(() => {
    if (ready) realmAudio.cinematic(beat.cue ?? 'arrival');
  }, [index, ready]);
  const key = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      finish();
    } else if (e.key === 'Tab') {
      const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (e.shiftKey && i <= 0) {
        e.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!e.shiftKey && i === buttons.length - 1) {
        e.preventDefault();
        buttons[0]?.focus();
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      next();
    }
  };
  return createPortal(
    <section
      className={`cinema ${stopped ? 'cinema-paused' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={scene.title}
      onKeyDown={key}
      onKeyUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className={`cinema-stage ${beat.illustration ? 'cinema-illustrated' : ''}`}
        key={`${scene.id}:${beat.animation?.sheet ?? index}`}
        data-cinema-beat={index}
      >
        {beat.illustration && (
          <img
            className="cinema-ambient"
            src={assetUrl(beat.illustration)}
            alt=""
            draggable={false}
          />
        )}
        {beat.animation && loadedSheet === beat.animation.sheet ? (
          <SceneFrames
            animation={beat.animation}
            paused={stopped || !ready}
            origin={`${35 + (index % 3) * 15}% ${45 + (index % 2) * 10}%`}
          />
        ) : (
          <img
            className="cinema-backdrop"
            src={assetUrl(beat.illustration ?? beat.background)}
            alt=""
            draggable={false}
          />
        )}
        <div className="cinema-shade" />
        {!beat.illustration && !beat.background.includes('cinematic-fall') && (
          <div className="cinema-ground">
            <FilmSprite
              actor={{ kind: 'ground', x: 50, action: groundTheme(beat.background) }}
              player={player}
              paused={stopped}
            />
          </div>
        )}
        {!beat.illustration &&
          beat.actors.map((a, i) => (
            <div
              key={`${a.kind}:${i}`}
              className={`cinema-actor cinema-${a.move ?? 'stand'}`}
              style={
                {
                  left: `${a.x}%`,
                  bottom: [
                    'mira',
                    'mentor',
                    'bram',
                    'mirewarden',
                    'frostwarden',
                    'bench',
                    'house',
                  ].includes(a.kind)
                    ? '18%'
                    : a.kind === 'item'
                      ? '25%'
                      : undefined,
                  '--actor-size': a.size ?? 1,
                } as React.CSSProperties
              }
            >
              <div
                className="cinema-facing"
                style={{ transform: a.flip ? 'scaleX(-1)' : undefined }}
              >
                {a.kind === 'item' ? (
                  <ItemIcon id={a.item ?? null} />
                ) : (
                  <FilmSprite actor={a} player={player} paused={stopped} />
                )}
              </div>
            </div>
          ))}
        {!beat.illustration && beat.effect === 'magic' && (
          <div className="cinema-magic">
            <FilmSprite
              actor={{ kind: 'fx', x: 50, action: 'fx' }}
              player={player}
              paused={stopped}
            />
          </div>
        )}
        <div className={`cinema-particles cinema-${beat.effect ?? 'mist'}`} aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${i * 5.8}%`,
                animationDelay: `${-i * 0.73}s`,
                animationDuration: `${4 + (i % 5)}s`,
              }}
            />
          ))}
        </div>
        <header>
          <span>
            {scene.kind === 'chapter'
              ? 'STORY'
              : scene.kind === 'boss'
                ? 'GUARDIAN'
                : 'YOUR JOURNEY'}
          </span>
          <h2>{scene.title}</h2>
        </header>
        {!ready && (
          <p className="cinema-loading" role="status">
            Preparing the scene…
          </p>
        )}
      </div>
      <div className="cinema-caption" aria-live="polite" aria-atomic="true">
        <strong>{beat.speaker}</strong>
        <p>{beat.text}</p>
      </div>
      <footer>
        <span>
          {index + 1} / {scene.beats.length}
        </span>
        <button ref={close} onClick={finish}>
          Skip scene
        </button>
        <button onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
          {paused ? 'Play' : 'Pause'}
        </button>
        <button className="primary" onClick={next}>
          {index + 1 === scene.beats.length ? 'Continue journey' : 'Next'}
        </button>
      </footer>
    </section>,
    document.body,
  );
}
