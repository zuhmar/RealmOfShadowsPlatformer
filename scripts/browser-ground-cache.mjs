import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 750 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const { World, createPlayer } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
    );
    const { MAPS } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
    );
    const world = new World(MAPS.village),
      p = createPlayer('hero', 'Traveller', 'village');
    world.players.set(p.id, p);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
    document.body.append(host);
    const bridge = {
      id: p.id,
      blocked: true,
      held: {},
      send: () => {},
      snapshot: world.snapshot(Date.now()),
    };
    window.gc = { game: mountGame(host, bridge), host };
  });
  await page.waitForFunction(() => window.gc.host.getAttribute('aria-busy') === 'false');
  const result = await page.evaluate(async () => {
    const { generatedPlatform, generatedSoil } = await import('/src/generated-terrain.ts');
    const s = window.gc.game.scene.getScene('realm'),
      ground = s.map.platforms.find((p) => !p.oneWay);
    const pixels = (texture) => {
      const a = texture.context.getImageData(
        0,
        0,
        texture.canvas.width,
        texture.canvas.height,
      ).data;
      let n = 0;
      for (let i = 3; i < a.length; i += 4) if (a[i] > 0) n++;
      return n;
    };
    const cycles = [];
    for (let i = 0; i < 6; i++) {
      const old = s.children.list.find(
          (o) => o.name === 'terrain-platform' && o.getData('platformId') === 'ground',
        ),
        canvas = old.texture.canvas,
        key = old.texture.key;
      old.destroy();
      s.textures.remove(key);
      const next = generatedPlatform(s, s.map, ground, 'village');
      cycles.push({ sameCanvas: canvas === next.texture.canvas, pixels: pixels(next.texture) });
      const soil = s.children.list.find((o) => o.name === 'terrain-soil'),
        soilKey = soil.displayTexture.key;
      soil.destroy();
      s.textures.remove(soilKey);
      const nextSoil = generatedSoil(s, s.map, 'village');
      cycles.push({ soil: true, pixels: pixels(nextSoil.displayTexture) });
    }
    return cycles;
  });
  console.log(JSON.stringify(result));
  expect(result.some((c) => c.sameCanvas)).toBe(true);
  expect(result.every((c) => c.pixels > 0)).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'Ground and soil remain painted across six real pooled-canvas eviction/recreation cycles.',
  );
} finally {
  await browser.close();
}
