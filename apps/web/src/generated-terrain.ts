import { preloadTraversal, islandPond, islandLadder } from './island-traversal';
import villageTerrain from '../public/assets/ui/village-terrain.json';
import crystalSpans from '../public/assets/ui/crystal-platform-spans.json';
import type Phaser from 'phaser';
import type { GameMap, Platform, Ladder } from '@ros/game-data';
import { assetUrl } from './assets';
import villageSpans from '../public/assets/ui/village-platform-spans.json';
import woodsSpans from '../public/assets/ui/woods-platform-spans.json';
import woodsLadder from '../public/assets/ui/woods-clean-ladder.json';
export type GeneratedTerrainTheme = 'woods' | 'village' | 'crystal';
// Phaser recycles cleared HTML canvases; draw state belongs to the texture instance.
const paintedTextures = new WeakSet<Phaser.Textures.CanvasTexture>();
const caches = new WeakMap<Phaser.Game, Map<string, Set<string>>>();
function remember(scene: Phaser.Scene, map: string, key: string) {
  let groups = caches.get(scene.game);
  if (!groups) {
    groups = new Map();
    caches.set(scene.game, groups);
  }
  const keys = groups.get(map) ?? new Set<string>();
  keys.add(key);
  groups.delete(map);
  groups.set(map, keys);
  while (groups.size > 3) {
    const oldest = groups.keys().next().value!;
    for (const texture of groups.get(oldest)!) scene.textures.remove(texture);
    groups.delete(oldest);
  }
}
const spans = (theme: GeneratedTerrainTheme) =>
  theme === 'crystal' ? crystalSpans : theme === 'woods' ? woodsSpans : villageSpans;
function walkingSurface(theme: GeneratedTerrainTheme, name: string) {
  if (theme === 'crystal') return 0;
  const art = theme === 'woods' ? woodsSpans : villageSpans;
  return (art.meta.walkSurfaces as Record<string, number>)[name] ?? 0;
}
export function preloadGeneratedTerrain(scene: Phaser.Scene, theme: GeneratedTerrainTheme) {
  if (theme !== 'village') preloadTraversal(scene, theme);
  for (const kind of theme === 'village' ? ['terrain', 'platform-spans'] : ['platform-spans']) {
    const key = kind === 'terrain' ? `${theme}-terrain-art` : `${theme}-platform-spans`;
    if (!scene.textures.exists(key))
      scene.load.atlas(
        key,
        assetUrl(`/assets/ui/${theme}-${kind}.png`),
        kind === 'platform-spans' ? spans(theme) : villageTerrain,
      );
  }
}
/** Match retained sprite detail while keeping every uploaded texture within 4096px. */
function raster(scene: Phaser.Scene, key: string, width: number, height: number) {
  const density = Math.max(1, Math.min(2, Math.floor((4096 / Math.max(width, height)) * 2) / 2));
  const texture = scene.textures.exists(key)
    ? (scene.textures.get(key) as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas(key, Math.ceil(width * density), Math.ceil(height * density))!;
  const ctx = texture.context;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(density, 0, 0, density, 0, 0);
  return { texture, ctx, density };
}
function source(
  scene: Phaser.Scene,
  theme: GeneratedTerrainTheme,
  name: string,
  wholeSpan = false,
) {
  const key =
    theme === 'woods' && name === 'ladder'
      ? 'woods-clean-ladder'
      : wholeSpan
        ? `${theme}-platform-spans`
        : `${theme}-terrain-art`;
  const f = scene.textures.getFrame(key, name);
  return {
    image: f.source.image as HTMLImageElement,
    x: f.cutX,
    y: f.cutY,
    w: f.cutWidth,
    h: f.cutHeight,
  };
}
type Source = ReturnType<typeof source>;
function paint(
  ctx: CanvasRenderingContext2D,
  f: Source,
  x: number,
  y: number,
  scale: number,
  sx = 0,
  sy = 0,
  sw = f.w,
  sh = f.h,
) {
  ctx.drawImage(f.image, f.x + sx, f.y + sy, sw, sh, x, y, sw * scale, sh * scale);
}
/** The fill comes from undecorated earth in the ground drawing itself, never from a second soil style. */
function groundFill(scene: Phaser.Scene, theme: GeneratedTerrainTheme) {
  const f = source(scene, theme, 'ground', true),
    cut = spans(theme).meta.ground.fill;
  return { ...f, x: f.x + cut.x, y: f.y + cut.y, w: cut.w, h: cut.h };
}
export function generatedSoil(scene: Phaser.Scene, map: GameMap, theme: GeneratedTerrainTheme) {
  const ground = map.platforms.find((p) => !p.oneWay);
  if (!ground) return;
  const f = groundFill(scene, theme),
    key = `ground-fill-v6:${theme}`;
  const { texture, ctx, density } = raster(scene, key, f.w, f.h);
  if (!paintedTextures.has(texture)) {
    paint(ctx, f, 0, 0, 1);
    texture.refresh();
    paintedTextures.add(texture);
  }
  const spec = spans(theme).meta.ground;
  const join =
    ground.y +
    spec.worldHeight -
    (walkingSurface(theme, 'ground') * spec.worldHeight) / source(scene, theme, 'ground', true).h;
  return scene.add
    .tileSprite(ground.x, join - 1, ground.width, map.height + 1600, key)
    .setOrigin(0)
    .setDepth(-1)
    .setTileScale(1 / density)
    .setName('terrain-soil')
    .setData({
      generated: true,
      sourceAtlas: `${theme}-platform-spans`,
      surfaceJoinY: join,
      groundOriginX: ground.x,
    });
}
export function generatedPlatform(
  scene: Phaser.Scene,
  map: GameMap,
  p: Platform,
  theme: GeneratedTerrainTheme,
) {
  if (!p.oneWay) {
    const f = source(scene, theme, 'ground', true),
      spec = spans(theme).meta.ground;
    const scale = spec.worldHeight / f.h,
      surface = walkingSurface(theme, 'ground') * scale,
      pad = 4;
    const height = map.id.startsWith('house-')
      ? Math.max(spec.worldHeight, map.height - p.y + 160)
      : spec.worldHeight;
    const key = `ground-connected-v6:${theme}:${map.id}:${p.id}`;
    remember(scene, map.id, key);
    const { texture, ctx, density } = raster(scene, key, p.width + pad * 2, height + pad * 2);
    if (!paintedTextures.has(texture)) {
      const length = (spec.repeatEnd - spec.repeatStart) * scale;
      for (let x = 0; x < p.width; x += length) {
        const size = Math.min(length, p.width - x);
        paint(ctx, f, pad + x, pad, scale, spec.repeatStart, 0, size / scale, f.h);
      }
      // Houses use this same bank beneath their foundation, without a scenery soil layer.
      if (height > spec.worldHeight) {
        const fill = groundFill(scene, theme);
        const tile = document.createElement('canvas');
        tile.width = fill.w;
        tile.height = fill.h;
        tile
          .getContext('2d')!
          .drawImage(fill.image, fill.x, fill.y, fill.w, fill.h, 0, 0, fill.w, fill.h);
        ctx.save();
        ctx.translate(pad, pad + spec.worldHeight);
        ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
        ctx.fillRect(0, 0, p.width, height - spec.worldHeight);
        ctx.restore();
      }
      texture.refresh();
      paintedTextures.add(texture);
    }
    return scene.add
      .image(p.x, p.y, key)
      .setOrigin((pad * density) / texture.width, ((pad + surface) * density) / texture.height)
      .setScale(1 / density)
      .setDepth(0)
      .setName('terrain-platform')
      .setData({
        platformId: p.id,
        surfaceY: p.y,
        artSurfaceY: 0,
        terrainWidth: p.width,
        terrainHeight: height,
        rasterDensity: density,
        theme,
        continuous: true,
        generated: true,
        sourceAtlas: `${theme}-platform-spans`,
        material: 'terrain',
        surfaceJoinY: p.y + spec.worldHeight - surface,
      });
  }
  if (p.id === 'fishing-dock' && theme !== 'village') return islandPond(scene, p, theme);
  const dock = p.id === 'fishing-dock';
  const names = theme !== 'village' ? ['short', 'medium', 'long'] : ['medium', 'long'];
  const target = theme !== 'village' ? 70 : 36;
  const name = dock
    ? 'dock'
    : names.reduce((best, next) => {
        const a = scene.textures.getFrame(`${theme}-platform-spans`, best),
          b = scene.textures.getFrame(`${theme}-platform-spans`, next);
        return Math.abs(Math.log((b.height * p.width) / b.width / target)) <
          Math.abs(Math.log((a.height * p.width) / a.width / target))
          ? next
          : best;
      });
  const atlas = dock ? `${theme}-terrain-art` : `${theme}-platform-spans`;
  const f = scene.textures.getFrame(atlas, name),
    scale = p.width / f.width;
  return scene.add
    .image(p.x, p.y, atlas, name)
    .setOrigin(0, walkingSurface(theme, name) / f.height)
    .setScale(scale)
    .setDepth(0)
    .setName('terrain-platform')
    .setData({
      platformId: p.id,
      surfaceY: p.y,
      artSurfaceY: 0,
      terrainWidth: p.width,
      terrainHeight: f.height * scale,
      rasterDensity: 1 / scale,
      theme,
      continuous: true,
      generated: true,
      sourceAtlas: atlas,
      material: dock ? 'fishing' : theme === 'village' ? 'timber' : 'terrain',
      wholeSpan: true,
    });
}
export function generatedLadder(scene: Phaser.Scene, l: Ladder, theme: GeneratedTerrainTheme) {
  return theme === 'village'
    ? legacyGeneratedLadder(scene, l, theme)
    : islandLadder(scene, l, theme);
}
function legacyGeneratedLadder(scene: Phaser.Scene, l: Ladder, theme: GeneratedTerrainTheme) {
  const frame = source(scene, theme, 'ladder'),
    artWidth = 48,
    scale = artWidth / frame.w;
  const height = l.bottom - l.top,
    pad = 20,
    width = artWidth + 16,
    fullHeight = height + pad * 2;
  const key = `ladder-generated-clean-v4:${theme}:${height}`;
  const { texture, ctx, density } = raster(scene, key, width, fullHeight);
  if (!paintedTextures.has(texture)) {
    const x = (width - artWidth) / 2;
    const cap =
        theme === 'crystal'
          ? crystalSpans.meta.ladder.cap
          : theme === 'woods'
            ? woodsLadder.meta.ladder.cap
            : 32,
      edge = cap * scale,
      top = pad - 14,
      bottom = pad + height + 4;
    // Select a whole rung interval for repeats so the rails and rungs meet naturally.
    const start =
        theme === 'crystal'
          ? crystalSpans.meta.ladder.start
          : theme === 'woods'
            ? woodsLadder.meta.ladder.start
            : 80,
      repeat =
        theme === 'crystal'
          ? crystalSpans.meta.ladder.repeat
          : theme === 'woods'
            ? woodsLadder.meta.ladder.repeat
            : 61;
    if (theme !== 'village') {
      const clip = theme === 'crystal' ? crystalSpans.meta.ladder : woodsLadder.meta.ladder;
      // Fill only the plain rails, then place complete rungs. A partial repeat must never cut a rung in half.
      for (let y = top + edge; y < bottom - edge; ) {
        const size = Math.min(clip.railHeight * scale, bottom - edge - y);
        paint(ctx, frame, x, y, scale, 0, clip.railStart, frame.w, size / scale);
        y += size;
      }
      const spacing = repeat * scale,
        first = top + edge + spacing * 0.6,
        last = bottom - edge - spacing * 0.6;
      const count = Math.max(2, Math.round((last - first) / spacing) + 1);
      for (let i = 0; i < count; i++) {
        const center = first + ((last - first) * i) / (count - 1);
        paint(
          ctx,
          frame,
          x,
          center - (clip.rungHeight * scale) / 2,
          scale,
          0,
          clip.rungStart,
          frame.w,
          clip.rungHeight,
        );
      }
    } else {
      for (let y = top + edge; y < bottom - edge; ) {
        const size = Math.min(repeat * scale, bottom - edge - y);
        paint(ctx, frame, x, y, scale, 0, start, frame.w, size / scale);
        y += size;
      }
    }
    paint(ctx, frame, x, top, scale, 0, 0, frame.w, cap);
    paint(ctx, frame, x, bottom - edge, scale, 0, frame.h - cap, frame.w, cap);
    texture.refresh();
    paintedTextures.add(texture);
  }
  return scene.add
    .image(l.x, l.top, key)
    .setOrigin(0.5, (pad * density) / texture.height)
    .setScale(1 / density)
    .setDepth(3)
    .setName('terrain-ladder')
    .setData({
      top: l.top,
      bottom: l.bottom,
      from: l.from,
      to: l.to,
      theme,
      continuous: true,
      generated: true,
      sourceAtlas:
        theme === 'crystal'
          ? 'crystal-terrain-art'
          : theme === 'woods'
            ? 'woods-clean-ladder'
            : `${theme}-terrain-art`,
      rasterDensity: density,
      railTop: l.top - 14,
      railBottom: l.bottom + 4,
    });
}
