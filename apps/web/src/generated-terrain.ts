import type Phaser from 'phaser';
import type { GameMap, Platform, Ladder } from '@ros/game-data';
import { assetUrl } from './assets';
export type GeneratedTerrainTheme = 'woods' | 'village';
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
export function preloadGeneratedTerrain(scene: Phaser.Scene, theme: GeneratedTerrainTheme) {
  const key = `${theme}-terrain-art`;
  if (!scene.textures.exists(key))
    scene.load.atlas(
      key,
      assetUrl(`/assets/ui/${theme}-terrain.png`),
      `/assets/ui/${theme}-terrain.json`,
    );
}
function source(scene: Phaser.Scene, theme: GeneratedTerrainTheme, name: string) {
  const f = scene.textures.getFrame(`${theme}-terrain-art`, name);
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
/** Extend the authored center strip; keep one end cap at each end. Never stretch the artwork. */
function horizontal(
  ctx: CanvasRenderingContext2D,
  f: Source,
  x: number,
  y: number,
  width: number,
  scale: number,
) {
  const cap = Math.min(60, width / (scale * 3)),
    edge = cap * scale;
  const end = x + width - edge;
  const nativeBody = f.w - cap * 2;
  for (let at = x + edge; at < end; ) {
    const length = Math.min(nativeBody * scale, end - at);
    paint(ctx, f, at, y, scale, cap, 0, length / scale, f.h);
    at += length;
  }
  paint(ctx, f, x, y, scale, 0, 0, cap, f.h);
  paint(ctx, f, end, y, scale, f.w - cap, 0, cap, f.h);
}
function soil(ctx: CanvasRenderingContext2D, f: Source, width: number, y: number, height: number) {
  const scale = 0.65,
    tw = f.w * scale,
    th = f.h * scale;
  for (let top = y; top < height; top += th)
    for (let left = 0; left < width; left += tw)
      paint(
        ctx,
        f,
        left,
        top,
        scale,
        0,
        0,
        Math.min(f.w, (width - left) / scale),
        Math.min(f.h, (height - top) / scale),
      );
}
/** A small repeating generated soil texture fills below the map without a giant baked canvas. */
export function generatedSoil(scene: Phaser.Scene, map: GameMap, theme: GeneratedTerrainTheme) {
  const ground = map.platforms.find((p) => !p.oneWay);
  if (!ground) return;
  const f = source(scene, theme, 'soil'),
    scale = 0.65,
    key = `terrain-soil-art:${theme}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(
      key,
      Math.floor(f.w * scale),
      Math.floor(f.h * scale),
    )!;
    paint(texture.context, f, 0, 0, scale);
    texture.refresh();
  }
  return scene.add
    .tileSprite(0, ground.y + 60, map.width, map.height + 1600, key)
    .setOrigin(0)
    .setDepth(-1)
    .setName('terrain-soil')
    .setData({ generated: true, sourceAtlas: `${theme}-terrain-art` });
}
export function generatedPlatform(
  scene: Phaser.Scene,
  map: GameMap,
  p: Platform,
  theme: GeneratedTerrainTheme,
) {
  const kind = !p.oneWay
    ? 'ground'
    : p.id === 'fishing-dock'
      ? 'dock'
      : theme === 'village'
        ? 'timber'
        : 'ledge';
  const frame = source(scene, theme, kind);
  const scale =
    kind === 'timber'
      ? 36 / frame.h
      : kind === 'dock'
        ? 82 / frame.h
        : kind === 'ground'
          ? 0.7
          : 70 / frame.h;
  const pad = 4,
    height = !p.oneWay ? Math.max(180, map.height - p.y + 160) : Math.ceil(frame.h * scale);
  const key = `terrain-generated-v1:${theme}:${map.id}:${p.id}`;
  remember(scene, map.id, key);
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(
      key,
      Math.ceil(p.width + pad * 2),
      Math.ceil(height + pad * 2),
    )!;
    const ctx = texture.context;
    if (!p.oneWay) {
      ctx.save();
      ctx.translate(pad, pad);
      soil(ctx, source(scene, theme, 'soil'), p.width, Math.floor(frame.h * scale) - 3, height);
      ctx.restore();
    }
    horizontal(ctx, frame, pad, pad, p.width, scale);
    texture.refresh();
  }
  return scene.add
    .image(p.x, p.y, key)
    .setOrigin(pad / (p.width + pad * 2), pad / (height + pad * 2))
    .setDepth(0)
    .setName('terrain-platform')
    .setData({
      platformId: p.id,
      surfaceY: p.y,
      artSurfaceY: 0,
      terrainWidth: p.width,
      terrainHeight: height,
      theme,
      continuous: true,
      generated: true,
      sourceAtlas: `${theme}-terrain-art`,
      material: kind === 'timber' ? 'timber' : kind === 'dock' ? 'fishing' : 'terrain',
    });
}
export function generatedLadder(scene: Phaser.Scene, l: Ladder, theme: GeneratedTerrainTheme) {
  const frame = source(scene, theme, 'ladder'),
    scale = 48 / frame.w;
  const height = l.bottom - l.top,
    pad = 20,
    width = 64,
    fullHeight = height + pad * 2;
  const key = `ladder-generated-v1:${theme}:${height}`;
  if (!scene.textures.exists(key)) {
    const texture = scene.textures.createCanvas(key, width, fullHeight)!;
    const ctx = texture.context,
      x = (width - 48) / 2;
    const cap = 24,
      edge = cap * scale,
      top = pad - 14,
      bottom = pad + height + 4;
    // Select a whole rung interval for repeats so the rails and rungs meet naturally.
    const start = theme === 'woods' ? 92 : 60,
      repeat = theme === 'woods' ? 42 : 40;
    for (let y = top + edge; y < bottom - edge; ) {
      const size = Math.min(repeat * scale, bottom - edge - y);
      paint(ctx, frame, x, y, scale, 0, start, frame.w, size / scale);
      y += size;
    }
    paint(ctx, frame, x, top, scale, 0, 0, frame.w, cap);
    paint(ctx, frame, x, bottom - edge, scale, 0, frame.h - cap, frame.w, cap);
    texture.refresh();
  }
  return scene.add
    .image(l.x, l.top, key)
    .setOrigin(0.5, pad / fullHeight)
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
      sourceAtlas: `${theme}-terrain-art`,
      railTop: l.top - 14,
      railBottom: l.bottom + 4,
    });
}
