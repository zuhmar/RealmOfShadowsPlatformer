import type Phaser from 'phaser';
import { MAPS, type Ladder, type Platform } from '@ros/game-data';
import type { Player } from '@ros/shared';
import woods from '../public/assets/tilesets/traversal/woods.json';
import crystal from '../public/assets/tilesets/traversal/crystal.json';
import murkmire from '../public/assets/tilesets/traversal/murkmire.json';
import { assetUrl } from './assets';
const atlases = { woods, crystal, murkmire };
export type TraversalTheme = keyof typeof atlases;
export function preloadTraversal(scene: Phaser.Scene, theme: TraversalTheme) {
  const key = `traversal-${theme}`;
  if (!scene.textures.exists(key))
    scene.load.atlas(key, assetUrl(`/assets/tilesets/traversal/${theme}.png`), atlases[theme]);
}
export function islandPond(scene: Phaser.Scene, p: Platform, theme: TraversalTheme) {
  const key = `traversal-${theme}`,
    meta = atlases[theme].meta.pond,
    f = scene.textures.getFrame(key, 'pond'),
    scale = p.width / f.width;
  return scene.add
    .image(p.x, p.y, key, 'pond')
    .setOrigin(0, meta.walkSurface / f.height)
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
      sourceAtlas: key,
      material: 'fishing',
      wholeSpan: true,
      waterOnTop: true,
      waterY: p.y + (meta.waterSurface - meta.walkSurface) * scale,
      castX: p.x + p.width * meta.castX,
    });
}
/** Repeat plain rail strips and complete rungs; never stretch a ladder to fit a climb. */
export function islandLadder(scene: Phaser.Scene, l: Ladder, theme: TraversalTheme) {
  const key = `traversal-${theme}`,
    f = scene.textures.getFrame(key, 'ladder'),
    clip = atlases[theme].meta.ladder,
    scale = 48 / f.width,
    height = l.bottom - l.top,
    pad = 20,
    width = 64,
    textureKey = `island-ladder-v1:${theme}:${height}`,
    density = 2;
  let texture: Phaser.Textures.CanvasTexture;
  if (scene.textures.exists(textureKey))
    texture = scene.textures.get(textureKey) as Phaser.Textures.CanvasTexture;
  else {
    texture = scene.textures.createCanvas(
      textureKey,
      width * density,
      (height + pad * 2) * density,
    )!;
    const ctx = texture.context;
    ctx.scale(density, density);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const image = f.source.image as HTMLImageElement,
      x = (width - 48) / 2,
      top = pad - 14,
      bottom = pad + height + 4;
    const paint = (y: number, sy: number, sh: number) =>
      ctx.drawImage(image, f.cutX, f.cutY + sy, f.cutWidth, sh, x, y, 48, sh * scale);
    const firstRail = top + clip.topCap * scale,
      lastRail = bottom - (f.height - clip.bottomCapStart) * scale;
    for (let y = firstRail; y < lastRail; ) {
      const h = Math.min(clip.railHeight, (lastRail - y) / scale);
      paint(y, clip.railStart, h);
      y += h * scale;
    }
    const spacing = clip.repeat * scale,
      first = firstRail + spacing * 0.55,
      last = lastRail - spacing * 0.55,
      count = Math.max(2, Math.round((last - first) / spacing) + 1);
    for (let i = 0; i < count; i++)
      paint(
        first + ((last - first) * i) / (count - 1) - (clip.rungHeight * scale) / 2,
        clip.rungStart,
        clip.rungHeight,
      );
    paint(top, 0, clip.topCap);
    paint(lastRail, clip.bottomCapStart, f.height - clip.bottomCapStart);
    texture.refresh();
  }
  return scene.add
    .image(l.x, l.top, textureKey)
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
      sourceAtlas: key,
      rasterDensity: density,
      railTop: l.top - 14,
      railBottom: l.bottom + 4,
    });
}
export function fishingCast(p: Pick<Player, 'mapId' | 'x' | 'y' | 'facing'>) {
  const map = MAPS[p.mapId],
    theme = map?.id.split('-')[0] as TraversalTheme,
    art = atlases[theme],
    platform = map?.platforms.find((f) => f.id === 'fishing-dock');
  if (!art || !platform) return { x: 22 * p.facing, y: 30 };
  const meta = art.meta.pond,
    scale = platform.width / art.frames.pond.frame.w;
  return {
    x: (platform.x + platform.width * meta.castX - p.x) * p.facing,
    y: platform.y + (meta.waterSurface - meta.walkSurface) * scale - p.y,
  };
}
