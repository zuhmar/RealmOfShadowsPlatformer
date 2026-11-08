import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const errors = [],
  requests = [];
page.on('pageerror', (e) => {
  errors.push(e.message);
  console.log('PAGE ERROR', e.message);
});
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
page.on('request', (r) => {
  if (/\.(png|webp)$/.test(r.url())) requests.push(r.url());
});
const report = [];
const prepare = process.env.PREPARE_TRAVEL === '1';
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(shared);
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const snapshot = (id) => {
        const w = new World(MAPS[id]);
        const p = Object.assign(createPlayer('hero', 'Hero', id), {
          level: 30,
          classId: 'knight',
          skin: 'knight',
          weapon: 'crystal-sword',
        });
        w.players.set(p.id, p);
        return w.snapshot(Date.now());
      };
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:10000';
      document.body.append(host);
      const bridge = {
        id: 'hero',
        held: {},
        blocked: true,
        send: () => {},
        snapshot: snapshot('village'),
      };
      const game = mountGame(host, bridge);
      window.travelTest = { host, bridge, game, snapshot };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.travelTest?.host.getAttribute('aria-busy') === 'false');
  await page.evaluate(() => {
    const t = window.travelTest;
    t.canvas = t.game.canvas;
    t.body = t.game.textures.get('citizen-male-sage');
  });
  const path = [
    'woods',
    'woods-2',
    'woods-3',
    'woods-boss',
    'crystal',
    'crystal-2',
    'crystal-3',
    'crystal-boss',
    'village',
    'woods',
    'woods-2',
    'woods',
    'woods-2',
  ];
  for (const mapId of path) {
    console.log('Travel to', mapId);
    if (prepare) {
      await page.evaluate((id) => {
        const t = window.travelTest;
        t.preparedScene = t.game.scene.getScene('realm');
        t.bridge.prepareMap(id);
      }, mapId);
      await page.waitForFunction((id) => {
        const t = window.travelTest,
          s = t.game.scene.getScene('realm');
        return (
          !s.load.isLoading() &&
          s === t.preparedScene &&
          t.host.getAttribute('aria-busy') === 'false'
        );
      }, mapId);
    }
    const start = Date.now(),
      before = requests.length;
    await page.evaluate((id) => {
      const t = window.travelTest;
      t.oldScene = t.game.scene.getScene('realm');
      t.bridge.snapshot = t.snapshot(id);
    }, mapId);
    await page.waitForFunction(
      (id) => {
        const t = window.travelTest;
        const s = t.game.scene.getScene('realm');
        return (
          s !== t.oldScene &&
          s?.map?.id === id &&
          s.characters.size === 1 &&
          t.host.getAttribute('aria-busy') === 'false'
        );
      },
      mapId,
      { timeout: 15000 },
    );
    const check = await page.evaluate(() => {
      const t = window.travelTest,
        s = t.game.scene.getScene('realm');
      return {
        sameCanvas: t.canvas === t.game.canvas,
        sameBody: t.body === t.game.textures.get('citizen-male-sage'),
        background: (s.woods ?? s.crystal ?? s.village).background.texture.key,
        expectedBackground: s.map.background ?? '/assets/backgrounds/whispering-woods.png',
        scenes: t.game.scene.scenes.length,
        backgrounds: t.game.textures
          .getTextureKeys()
          .filter((k) => k.startsWith('woods-background:') || k.startsWith('crystal-background:'))
          .length,
        textures: t.game.textures
          .getTextureKeys()
          .filter((key) => t.game.textures.get(key).getSourceImage() instanceof HTMLImageElement)
          .length,
        actors: s.characters.size,
      };
    });
    expect(check.sameCanvas).toBe(true);
    expect(check.sameBody).toBe(true);
    expect(check.scenes).toBe(1);
    expect(check.actors).toBe(1);
    expect(check.backgrounds).toBeLessThanOrEqual(3);
    if (mapId !== 'village') expect(check.background).toContain(check.expectedBackground);
    if (prepare) expect(requests.length - before).toBe(0);
    report.push({
      mapId,
      readyMs: Date.now() - start,
      imageRequests: requests.length - before,
      ...check,
    });
  }
  expect(report.at(-1).imageRequests).toBe(0);
  expect(report.at(-2).imageRequests).toBe(0);
  expect(report.at(-1).textures).toBe(report.at(-2).textures);
  expect(errors).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/travel-cache-mobile.png' });
  await writeFile(
    prepare ? 'artifacts/travel-prepared.json' : 'artifacts/travel-cache.json',
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  console.log(
    'PASS: one renderer across 13 travels, shared textures reused, correct backgrounds, bounded background cache and zero image reloads on warm travel.',
  );
} catch (e) {
  console.log(
    'STATE',
    await page.evaluate(() => {
      const t = window.travelTest,
        s = t.game.scene.getScene('realm');
      return {
        map: s?.map?.id,
        active: s?.sys?.isActive(),
        status: s?.sys?.settings.status,
        actors: s?.characters?.size,
        busy: t.host.getAttribute('aria-busy'),
        snap: t.bridge.snapshot?.mapId,
      };
    }),
  );
  throw e;
} finally {
  await browser.close();
}
