import { generatedPlatform, generatedLadder } from './generated-terrain';
import type Phaser from 'phaser';
import type { GameMap, Ladder, Platform } from '@ros/game-data';

export type TerrainTheme = 'woods' | 'village' | 'crystal';
const palettes = {
  woods: {
    edge: 0x2c3025,
    earth: 0x654732,
    facets: [0x79583b, 0x87613e, 0x573c2c],
    surface: 0x538832,
    light: 0xa6ce64,
    dark: 0x365c28,
    wood: 0x956438,
    woodLight: 0xc99355,
    metal: 0x55604d,
  },
  village: {
    edge: 0x3b302a,
    earth: 0x80603f,
    facets: [0x987349, 0xa07e51, 0x6c5036],
    surface: 0x648f3d,
    light: 0xb8d37d,
    dark: 0x456530,
    wood: 0xa46e40,
    woodLight: 0xe0ab69,
    metal: 0x5b6570,
  },
  crystal: {
    edge: 0x111c3b,
    earth: 0x24385c,
    facets: [0x304d77, 0x3c6090, 0x1b2b4d],
    surface: 0x50cbd9,
    light: 0xb4f6ef,
    dark: 0x287991,
    wood: 0x747a91,
    woodLight: 0xa6c9d1,
    metal: 0x27485f,
  },
};
const terrainCaches = new WeakMap<Phaser.Game, Map<string, Set<string>>>();
function rememberTexture(scene: Phaser.Scene, mapId: string, key: string) {
  let maps = terrainCaches.get(scene.game);
  if (!maps) {
    maps = new Map();
    terrainCaches.set(scene.game, maps);
  }
  const keys = maps.get(mapId) ?? new Set<string>();
  keys.add(key);
  maps.delete(mapId);
  maps.set(mapId, keys);
  while (maps.size > 3) {
    const oldest = maps.keys().next().value!;
    for (const stale of maps.get(oldest)!) scene.textures.remove(stale);
    maps.delete(oldest);
  }
}
function randomFor(id: string) {
  let state = [...id].reduce((n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function rootCurve(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  cx: number,
  cy: number,
  endX: number,
  endY: number,
) {
  g.beginPath().moveTo(x, y);
  for (let i = 1; i <= 16; i++) {
    const t = i / 16,
      u = 1 - t;
    g.lineTo(u * u * x + 2 * u * t * cx + t * t * endX, u * u * y + 2 * u * t * cy + t * t * endY);
  }
  g.strokePath();
}
/** One unbroken silhouette per collider, drawn at world scale: no repeated end caps. */
export function terrainPlatform(
  scene: Phaser.Scene,
  map: GameMap,
  p: Platform,
  theme: TerrainTheme,
) {
  if (theme !== 'crystal') return generatedPlatform(scene, map, p, theme);
  return legacyPlatform(scene, map, p, theme);
}
function legacyPlatform(scene: Phaser.Scene, map: GameMap, p: Platform, theme: TerrainTheme) {
  const c = palettes[theme],
    rng = randomFor(`${map.id}:${p.id}`),
    w = p.width;
  const dock = p.id === 'fishing-dock';
  const timber = theme === 'village' && p.oneWay;
  const h = !p.oneWay
    ? Math.max(180, map.height - p.y + 120)
    : timber
      ? 36
      : dock
        ? 82
        : 66 + Math.round(rng() * 16);
  const key = `terrain-platform-v1:${map.id}:${p.id}`;
  const pad = 24,
    textureW = Math.ceil(w + pad * 2),
    textureH = Math.ceil(h + pad * 2);
  const data = {
    platformId: p.id,
    surfaceY: p.y,
    artSurfaceY: 0,
    terrainWidth: w,
    terrainHeight: h,
    theme,
    continuous: true,
    material: timber ? 'timber' : dock ? 'fishing' : 'terrain',
  };
  rememberTexture(scene, map.id, key);
  const image = () =>
    scene.add
      .image(p.x, p.y, key)
      .setOrigin(pad / textureW, pad / textureH)
      .setDepth(0)
      .setName('terrain-platform')
      .setData(data);
  if (scene.textures.exists(key)) return image();
  const g = scene.add.graphics();
  g.save().translateCanvas(pad, pad);
  const finish = () => {
    g.restore().generateTexture(key, textureW, textureH);
    g.destroy();
    return image();
  };
  if (timber) {
    g.fillStyle(c.edge).fillRoundedRect(0, 0, w, h, 6);
    g.fillStyle(c.wood).fillRoundedRect(3, 3, w - 6, h - 7, 4);
    g.fillStyle(c.woodLight).fillRect(7, 4, w - 14, 4);
    g.fillStyle(0x795032).fillRect(3, h - 12, w - 6, 7);
    g.lineStyle(1, c.edge, 0.55);
    for (let x = 23; x < w - 12; x += 28) g.lineBetween(x, 9, x - 3, h - 15);
    for (const x of [18, w - 48]) {
      g.fillStyle(c.edge).fillTriangle(x, h - 4, x + 30, h - 4, x + 15, h + 23);
      g.fillStyle(c.wood).fillTriangle(x + 5, h - 4, x + 25, h - 4, x + 15, h + 14);
    }
    return finish();
  }
  const outline: { x: number; y: number }[] = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
  ];
  if (p.oneWay) {
    outline.push({ x: w, y: 24 }, { x: w - 12, y: h * 0.62 }, { x: w - 30, y: h * 0.83 });
    for (let x = w - 70; x > 35; x -= 65) outline.push({ x, y: h * (0.81 + rng() * 0.19) });
    outline.push({ x: 20, y: h * 0.77 }, { x: 0, y: 26 });
  } else outline.push({ x: w, y: h }, { x: 0, y: h });
  g.fillStyle(c.earth).fillPoints(outline, true);
  if (theme === 'crystal') {
    // Mineral planes run together inside a single rock silhouette.
    for (let x = 24; x < w - 40; ) {
      const width = Math.min(88 + rng() * 75, w - x - 10),
        bottom = p.oneWay ? h * 0.69 : 80 + rng() * 65;
      g.fillStyle(c.facets[Math.floor(rng() * c.facets.length)], 0.9).fillPoints(
        [
          { x, y: 19 },
          { x: x + width * 0.6, y: 18 },
          { x: x + width, y: 31 },
          { x: x + width * 0.66, y: bottom },
          { x: x + width * 0.2, y: bottom - 10 },
        ],
        true,
      );
      if (rng() > 0.45) {
        const cx = x + width * 0.5;
        g.fillStyle(0x347f9e).fillTriangle(cx, 24, cx + 10, 49, cx - 7, 58);
        g.fillStyle(0x6adddf).fillTriangle(cx, 24, cx + 2, 45, cx - 7, 58);
        g.fillStyle(0xacf2ed).fillTriangle(cx, 24, cx + 1, 38, cx - 3, 42);
      }
      x += width * 0.88;
    }
  } else {
    // Long earth strata and curved roots replace repeated outlined rock chunks.
    const depth = p.oneWay ? h * 0.62 : 145,
      phase = rng() * 4;
    for (const band of [0, 1]) {
      const points: { x: number; y: number }[] = [];
      for (let x = 20; x <= w - 20; x += 12)
        points.push({ x, y: 24 + band * depth * 0.3 + Math.sin(x / 85 + phase) * 6 });
      for (let x = w - 20; x >= 20; x -= 12)
        points.push({ x, y: 38 + band * depth * 0.3 + Math.sin(x / 105 + phase) * 7 });
      g.fillStyle(c.facets[band], 0.45).fillPoints(points, true);
    }
    for (let x = 28; x < w - 25; x += 35 + rng() * 45) {
      const y = 24 + rng() * (depth - 24),
        rw = 5 + rng() * 9;
      g.fillStyle(c.facets[2], 0.8).fillEllipse(x, y, rw + 3, 6);
      g.fillStyle(c.facets[1], 0.9).fillEllipse(x, y - 1, rw, 3);
    }
    for (let x = 45; x < w - 30; x += 95 + rng() * 95) {
      const endY = p.oneWay ? h * 0.78 : 80 + rng() * 58,
        bend = (rng() - 0.5) * 34;
      g.lineStyle(5, 0x403323, 0.85);
      rootCurve(g, x, 16, x + bend, 34, x + 12, endY);
      g.lineStyle(3, 0x927044, 0.9);
      rootCurve(g, x, 16, x + bend, 34, x + 12, endY);
      g.lineStyle(2, 0x705033, 0.85);
      rootCurve(g, x + 7, endY * 0.66, x + 20, endY * 0.7, x + 32, endY * 0.77);
    }
  }
  if (p.oneWay) g.lineStyle(3, c.edge).strokePoints(outline, true);
  else
    g.lineStyle(3, c.edge)
      .beginPath()
      .moveTo(0, h)
      .lineTo(0, 0)
      .lineTo(w, 0)
      .lineTo(w, h)
      .strokePath();
  // A single continuous surface spans the entire route at the collision height.
  g.fillStyle(c.dark).fillRoundedRect(0, 0, w, 19, 5);
  g.fillStyle(c.surface).fillRoundedRect(0, 0, w, 12, 5);
  g.fillStyle(c.light).fillRoundedRect(5, 1, w - 10, 3, 1);
  if (theme !== 'crystal') {
    // Overlapping moss crowns share a dark rim instead of hard rectangular cap edges.
    for (let x = 8; x < w - 5; x += 14 + rng() * 8) {
      const size = Math.min(23 + rng() * 12, (w - x) * 2 - 2);
      g.fillStyle(c.dark).fillEllipse(x, 12, size, 14);
      g.fillStyle(c.surface).fillEllipse(x, 6, size, 11);
      g.fillStyle(c.light, 0.65).fillEllipse(x - 2, 3, size * 0.7, 3);
    }
    for (let x = 24; x < w - 18; x += 72 + rng() * 65) {
      g.lineStyle(3, c.dark).lineBetween(x, 4, x + 3, -4);
      g.fillStyle(c.surface).fillEllipse(x + 1, -1, 9, 5);
      g.fillStyle(c.light).fillEllipse(x + 5, -4, 7, 3);
    }
    if (p.oneWay && !dock)
      for (let x = 38; x < w - 28; x += 95 + rng() * 65) {
        const y = h * 0.86;
        g.lineStyle(4, 0x49392b);
        rootCurve(g, x, y - 9, x - 8, y + 3, x + 3, y + 12);
        g.lineStyle(1, 0xb08750, 0.7);
        rootCurve(g, x, y - 6, x - 5, y + 3, x + 3, y + 12);
      }
  } else {
    g.fillStyle(c.light, 0.65).fillRoundedRect(6, 2, w - 12, 2, 1);
    for (let x = 26; x < w - 18; x += 58 + rng() * 55) {
      g.fillStyle(c.dark).fillTriangle(x, 9, x + 18, 9, x + 8, 23);
      g.fillStyle(c.surface).fillTriangle(x + 2, 8, x + 16, 8, x + 8, 17);
      g.lineStyle(1, c.light, 0.7).lineBetween(x + 1, 6, x + 9, 10);
    }
  }
  if (dock) {
    // The fishing pool belongs to the same continuous bank; its deck shares the ladder timber.
    g.fillStyle(c.edge).fillEllipse(w * 0.5, 40, w - 24, 47);
    g.fillStyle(theme === 'crystal' ? 0x367ec1 : 0x358a99).fillEllipse(w * 0.5, 37, w - 34, 36);
    g.lineStyle(2, 0x9de7d9, 0.6).lineBetween(32, 32, w * 0.55, 32);
    g.lineBetween(w * 0.58, 42, w - 35, 42);
    g.fillStyle(c.edge).fillRoundedRect(0, 0, w, 15, 4);
    g.fillStyle(c.wood).fillRoundedRect(2, 1, w - 4, 10, 3);
    g.fillStyle(c.woodLight).fillRect(6, 2, w - 12, 2);
    g.lineStyle(1, c.edge, 0.6);
    for (let x = 22; x < w - 10; x += 26) g.lineBetween(x, 5, x, 11);
  }
  return finish();
}
/** Full-height rails and evenly spaced rungs; join hardware sits on the actual surfaces. */
export function terrainLadder(scene: Phaser.Scene, l: Ladder, theme: TerrainTheme) {
  if (theme !== 'crystal') return generatedLadder(scene, l, theme);
  return legacyLadder(scene, l, theme);
}
function legacyLadder(scene: Phaser.Scene, l: Ladder, theme: TerrainTheme) {
  const c = palettes[theme],
    height = l.bottom - l.top;
  const key = `terrain-ladder-v1:${theme}:${height}`,
    pad = 20,
    width = 82,
    textureH = height + pad * 2;
  const data = {
    top: l.top,
    bottom: l.bottom,
    from: l.from,
    to: l.to,
    theme,
    continuous: true,
    railTop: l.top - 14,
    railBottom: l.bottom + 4,
  };
  const image = () =>
    scene.add
      .image(l.x, l.top, key)
      .setOrigin(0.5, pad / textureH)
      .setDepth(3)
      .setName('terrain-ladder')
      .setData(data);
  if (scene.textures.exists(key)) return image();
  const g = scene.add.graphics();
  g.save().translateCanvas(width / 2, pad);
  for (const x of [-19, 10]) {
    g.fillStyle(c.edge).fillRoundedRect(x, -14, 9, height + 18, 4);
    g.fillStyle(c.wood).fillRoundedRect(x + 2, -12, 5, height + 14, 2);
    g.fillStyle(c.woodLight, 0.85).fillRect(x + 2, -9, 1, height + 8);
  }
  const count = Math.max(2, Math.floor((height - 12) / 23) + 1),
    step = (height - 18) / (count - 1);
  for (let i = 0; i < count; i++) {
    const y = 8 + i * step;
    g.fillStyle(c.edge).fillRoundedRect(-19, y - 4, 38, 9, 3);
    g.fillStyle(c.wood).fillRoundedRect(-17, y - 2, 34, 5, 2);
    g.fillStyle(c.woodLight).fillRect(-15, y - 2, 30, 1);
  }
  for (const y of [12, height - 6])
    for (const x of [-19, 10]) {
      g.fillStyle(c.metal).fillRoundedRect(x - 2, y - 5, 13, 10, 2);
      g.fillStyle(theme === 'crystal' ? 0xa4e5ea : 0xb4b8a1).fillCircle(x + 4, y, 1.5);
    }
  if (theme === 'woods') {
    g.lineStyle(2, 0x527b39)
      .beginPath()
      .moveTo(-20, 5)
      .lineTo(-23, 30)
      .lineTo(-18, 48)
      .strokePath();
    g.fillStyle(0x75a64c).fillEllipse(-22, 29, 8, 4);
  }
  g.restore().generateTexture(key, width, textureH);
  g.destroy();
  return image();
}
