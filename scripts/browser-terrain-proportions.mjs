import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox'],
  }),
  page = await browser.newPage({ viewport: { width: 1200, height: 800 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  for (const mapId of [
    'village',
    'woods',
    'woods-2',
    'woods-3',
    'woods-boss',
    'crystal',
    'crystal-2',
    'crystal-3',
    'crystal-boss',
  ]) {
    await page.evaluate(
      async ({ mapId, shared }) => {
        window.terrainTest?.game.destroy(true);
        window.terrainTest?.host.remove();
        const { mountGame } = await import('/src/game.ts');
        const { World } = await import(shared);
        const { MAPS } = await import(
          shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
        );
        const world = new World(MAPS[mapId]),
          host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
        document.body.append(host);
        window.terrainTest = {
          host,
          world,
          game: mountGame(host, {
            id: 'fixture',
            held: {},
            blocked: true,
            send: () => {},
            snapshot: world.snapshot(Date.now()),
          }),
        };
      },
      {
        mapId,
        shared: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
      },
    );
    await page.waitForFunction(() => window.terrainTest.host.getAttribute('aria-busy') === 'false');
    for (const [width, height] of [
      [1200, 800],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => {
        const s = window.terrainTest.game.scene.getScene('realm');
        s.cameras.main.centerOn(s.map.width / 2, 600);
      });
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => {
        const s = window.terrainTest.game.scene.getScene('realm'),
          bad = [];
        const visit = (n) => {
          if (
            ['Image', 'Sprite'].includes(n.type) &&
            Math.abs(Math.abs(n.scaleX) - Math.abs(n.scaleY)) > 0.001
          )
            bad.push(`${n.name}:${n.texture.key}`);
          n.list?.forEach(visit);
        };
        s.children.list.forEach(visit);
        const background = (s.crystal ?? s.woods ?? s.village).background.getBounds(),
          c = s.cameras.main.worldView;
        const tiles = s.children.list.filter((n) => n.name === 'crystal-platform');
        const coverage = s.map.platforms.map((p) => ({
          id: p.id,
          expected: p.width,
          covered: tiles
            .filter((n) => n.getData('platformId') === p.id)
            .reduce((n, t) => n + t.getData('cropLength'), 0),
          surface: tiles
            .filter((n) => n.getData('platformId') === p.id)
            .every((n) => Math.abs(n.y - p.y) < 0.01),
        }));
        return {
          bad,
          coverage,
          covered:
            background.left <= c.left + 0.01 &&
            background.right >= c.right - 0.01 &&
            background.top <= c.top + 0.01 &&
            background.bottom >= c.bottom - 0.01,
        };
      });
      expect(state.bad).toEqual([]);
      expect(state.covered).toBe(true);
      if (mapId.startsWith('crystal'))
        for (const p of state.coverage) {
          expect(p.covered).toBeCloseTo(p.expected, 3);
          expect(p.surface).toBe(true);
        }
      await page.screenshot({ path: `artifacts/terrain-${mapId}-${width}.png` });
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: all nine playable maps preserve image/sprite proportions, backgrounds cover desktop/mobile viewports, and Crystal tiles exactly cover all collision surfaces.',
  );
} finally {
  await browser.close();
}
