import { chromium, expect } from '@playwright/test';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
const manifest = JSON.parse(
  await readFile(new URL('../apps/web/public/assets/optimized-manifest.json', import.meta.url)),
);
const reverse = Object.fromEntries(Object.entries(manifest).map(([a, b]) => [b, a]));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const errors = [],
  images = new Set();
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
  if (/\.(png|webp)$/.test(r.url())) images.add(new URL(r.url()).pathname);
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(shared);
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const world = new World(MAPS['woods-3']),
        p = createPlayer('hero', 'Hero', 'woods-3');
      world.players.set(p.id, p);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        held: {},
        blocked: true,
        send: () => {},
        snapshot: world.snapshot(Date.now()),
      };
      window.performanceTest = { host, bridge, world, createPlayer, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(
    () => window.performanceTest.host.getAttribute('aria-busy') === 'false',
  );
  await page.waitForTimeout(400);
  const initialImages = [...images];
  const requestedSources = initialImages.map((p) => reverse[p] ?? p);
  expect(requestedSources.filter((p) => /\/characters\/(armed|gathering)\//.test(p))).toEqual([]);
  let sourceBytes = 0,
    deliveryBytes = 0;
  for (const path of initialImages.filter((p) => reverse[p])) {
    sourceBytes += (await stat(new URL('../apps/web/public' + reverse[path], import.meta.url)))
      .size;
    deliveryBytes += (await stat(new URL('../apps/web/public' + path, import.meta.url))).size;
  }
  await page.evaluate(() => {
    const t = window.performanceTest;
    for (let i = 0; i < 24; i++) {
      const p = t.createPlayer(i === 0 ? 'hero' : `actor-${i}`, `Adventurer ${i}`, 'woods-3');
      Object.assign(p, {
        appearance: i % 2 ? 'female' : 'male',
        outfit: ['sage', 'ember', 'tide'][i % 3],
        weapon: `woods-${['sword', 'bow', 'staff', 'dagger'][i % 4]}`,
        classId: ['knight', 'archer', 'mage', 'rogue'][i % 4],
        level: 20,
        hp: 1000,
        auto: true,
        x: 700 + (i % 6) * 170,
        y: 760,
      });
      t.world.players.set(p.id, p);
    }
    t.timer = setInterval(() => {
      const now = Date.now();
      t.world.step(1 / 15, now, new Map());
      t.bridge.snapshot = t.world.snapshot(now);
      const scene = t.game.scene.getScene('realm');
      for (const e of t.world.events) scene.events.emit('float', e);
      t.world.events = [];
    }, 1000 / 15);
  });
  await page.waitForFunction(
    () => window.performanceTest.game.scene.getScene('realm').characters.size === 24,
  );
  await page.waitForTimeout(3500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 2 });
  const measured = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let previous = 0;
        const start = performance.now();
        function frame(now) {
          if (previous) times.push(now - previous);
          previous = now;
          if (now - start < 5000) {
            requestAnimationFrame(frame);
            return;
          }
          const scene = window.performanceTest.game.scene.getScene('realm'),
            textures = Object.values(scene.textures.list),
            bytes = textures.reduce(
              (total, t) => total + t.source.reduce((n, s) => n + s.width * s.height * 4, 0),
              0,
            ),
            sorted = times.slice().sort((a, b) => a - b);
          resolve({
            actors: scene.characters.size,
            monsters: scene.wolves.size,
            frames: times.length,
            averageFrameMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2),
            frameP95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2),
            estimatedDecodedTextureMiB: +(bytes / 1048576).toFixed(1),
            textures: textures.length,
            jsHeapMiB: performance.memory
              ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1)
              : null,
          });
        }
        requestAnimationFrame(frame);
      }),
  );
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  expect(measured.actors).toBe(24);
  expect(measured.monsters).toBe(10);
  expect(errors).toEqual([]);
  const report = {
    ...measured,
    viewport: '390x844 at device scale 2',
    cpuThrottle: 2,
    measurementSeconds: 5,
    initialSourceImageBytes: sourceBytes,
    initialDeliveryImageBytes: deliveryBytes,
    losslessImageReductionPercent: +(100 * (1 - deliveryBytes / sourceBytes)).toFixed(1),
    initialArmedOrGatheringSheets: 0,
    scope:
      'Chromium mobile emulation with 24 actors and 10 monsters, after warmup. Frame/heap/decoded-texture estimates are local measurements, not physical-phone or production-capacity results.',
  };
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/mobile-performance.json', JSON.stringify(report, null, 2));
  await page.screenshot({ path: 'artifacts/mobile-performance.png' });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await page
    .evaluate(() => {
      clearInterval(window.performanceTest?.timer);
      window.performanceTest?.game.destroy(true);
    })
    .catch(() => {});
  await browser.close();
}
