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
function soil(
  ctx: CanvasRenderingContext2D,
  f: Source,
  width: number,
  y: number,
  height: number,
  scale = 0.65,
) {
  const tw = f.w * scale,
    th = f.h * scale;
  let row = 0;
  for (let top = y; top < height; top += th, row++) {
    for (let left = 0; left < width; left += tw) {
      const sw = Math.min(f.w, (width - left) / scale);
      ctx.save();
      // Reflect alternating rows so dark soil meets dark soil, without visible stripe resets.
      if (row % 2 === 0) {
        ctx.translate(0, top + th);
        ctx.scale(1, -1);
        paint(ctx, f, left, 0, scale, 0, 0, sw, f.h);
      } else paint(ctx, f, left, top, scale, 0, 0, sw, f.h);
      ctx.restore();
    }
  }
}
/** A small repeating generated soil texture fills below the map without a giant baked canvas. */
export function generatedSoil(scene: Phaser.Scene, map: GameMap, theme: GeneratedTerrainTheme) {
  const ground = map.platforms.find((p) => !p.oneWay);
  if (!ground) return;
  const f = source(scene, theme, 'soil'),
    scale = Math.round(f.h * 0.65) / f.h,
    key = `terrain-soil-art-matched-v3:${theme}`;
  const width = Math.floor(f.w * scale),
    height = Math.round(f.h * scale) * 2;
  const { texture, ctx, density } = raster(scene, key, width, height);
  if (!texture.canvas.dataset.rendered) {
    soil(ctx, f, width, 0, height, scale);
    texture.refresh();
    texture.canvas.dataset.rendered = 'true';
  }
  return scene.add
    .tileSprite(0, ground.y + 60, map.width, map.height + 1600, key)
    .setOrigin(0)
    .setDepth(-1)
    .setTileScale(1 / density)
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
          ? 85 / frame.h
          : 70 / frame.h;
  const bakedFoundation = !p.oneWay && map.id.startsWith('house-');
  const pad = 4,
    height = bakedFoundation ? Math.max(180, map.height - p.y + 160) : Math.ceil(frame.h * scale);
  const key = `terrain-generated-hd-v4:${theme}:${map.id}:${p.id}`;
  remember(scene, map.id, key);
  const { texture, ctx, density } = raster(scene, key, p.width + pad * 2, height + pad * 2);
  if (!texture.canvas.dataset.rendered) {
    if (bakedFoundation) {
      ctx.save();
      ctx.translate(pad, pad);
      soil(ctx, source(scene, theme, 'soil'), p.width, Math.floor(frame.h * scale) - 3, height);
      ctx.restore();
    }
    horizontal(ctx, frame, pad, pad, p.width, scale);
    texture.refresh();
    texture.canvas.dataset.rendered = 'true';
  }
  return scene.add
    .image(p.x, p.y, key)
    .setOrigin((pad * density) / texture.width, (pad * density) / texture.height)
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
      sourceAtlas: `${theme}-terrain-art`,
      material: kind === 'timber' ? 'timber' : kind === 'dock' ? 'fishing' : 'terrain',
    });
}
export function generatedLadder(scene: Phaser.Scene, l: Ladder, theme: GeneratedTerrainTheme) {
  const frame = source(scene, theme, 'ladder'),
    artWidth = theme === 'woods' ? 60 : 48,
    scale = artWidth / frame.w;
  const height = l.bottom - l.top,
    pad = 20,
    width = artWidth + 16,
    fullHeight = height + pad * 2;
  const key = `ladder-generated-hd-v3:${theme}:${height}`;
  const { texture, ctx, density } = raster(scene, key, width, fullHeight);
  if (!texture.canvas.dataset.rendered) {
    const x = (width - artWidth) / 2;
    const cap = 32,
      edge = cap * scale,
      top = pad - 14,
      bottom = pad + height + 4;
    // Select a whole rung interval for repeats so the rails and rungs meet naturally.
    const start = theme === 'woods' ? 90 : 80,
      repeat = theme === 'woods' ? 70 : 61;
    for (let y = top + edge; y < bottom - edge; ) {
      const size = Math.min(repeat * scale, bottom - edge - y);
      paint(ctx, frame, x, y, scale, 0, start, frame.w, size / scale);
      y += size;
    }
    paint(ctx, frame, x, top, scale, 0, 0, frame.w, cap);
    paint(ctx, frame, x, bottom - edge, scale, 0, frame.h - cap, frame.w, cap);
    texture.refresh();
    texture.canvas.dataset.rendered = 'true';
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
      sourceAtlas: `${theme}-terrain-art`,
      rasterDensity: density,
      railTop: l.top - 14,
      railBottom: l.bottom + 4,
    });
}
