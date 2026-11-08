import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 650 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '999' });
    document.body.appendChild(host);
    const bridge = {
      id: 'test',
      snapshot: { players: [], wolves: [], drops: [], mapId: 'woods', time: Date.now() },
      held: {},
      send: () => {},
    };
    window.woodsTest = { host, bridge, game: mountGame(host, bridge) };
  });
  await page.waitForFunction(() => window.woodsTest?.host.getAttribute('aria-busy') === 'false');
  const inspect = () =>
    page.evaluate(() => {
      const s = window.woodsTest.game.scene.getScene('realm'),
        w = s.woods,
        c = s.cameras.main,
        b = w.background.getBounds();
      return {
        platforms: w.platforms.map((p) => ({
          id: p.getData('platformId'),
          surface: p.getData('surfaceY'),
        })),
        resourceFrames: w.resources
          .filter((r) => r.texture?.key === 'woods-resources')
          .map((r) => r.frame.name),
        ladders: w.ladders.length,
        props: [...new Set(w.props.map((p) => p.frame.name))],
        b: { x: b.x, y: b.y, right: b.right, bottom: b.bottom },
        v: {
          x: c.worldView.x,
          y: c.worldView.y,
          right: c.worldView.right,
          bottom: c.worldView.bottom,
        },
        bodies: s.floor.getChildren().length,
        soilBottom: w.soil?.getBounds().bottom,
        ratio: w.background.displayWidth / w.background.displayHeight,
      };
    });
  for (const [name, x, y] of [
    ['west', 300, 650],
    ['center', 1200, 600],
    ['east', 2100, 650],
    ['canopy', 1470, 320],
  ]) {
    await page.evaluate(
      ({ x, y }) => {
        window.woodsTest.game.scene.getScene('realm').cameras.main.centerOn(x, y);
      },
      { x, y },
    );
    await page.waitForTimeout(150);
    const s = await inspect();
    expect([...new Set(s.platforms.map((p) => p.id))]).toEqual([
      'ground',
      'moss',
      'canopy',
      'ridge',
      'fishing-dock',
      'oak-terrace',
      'herb-garden',
      'mining-ledge',
    ]);
    for (const p of s.platforms)
      expect(p.surface).toBeCloseTo(
        p.id === 'ground' ? 760 : ['canopy', 'herb-garden'].includes(p.id) ? 350 : 555,
        5,
      );
    expect(s.resourceFrames).toEqual(['iron-deposit', 'oak-tree', 'greenleaf-patch']);
    expect(s.ladders).toBeGreaterThanOrEqual(7);
    expect(s.props.length).toBe(12);
    expect(s.bodies).toBe(8);
    expect(s.b.x).toBeLessThanOrEqual(s.v.x);
    expect(s.b.right).toBeGreaterThanOrEqual(s.v.right);
    expect(s.b.y).toBeLessThanOrEqual(s.v.y);
    expect(s.b.bottom).toBeGreaterThanOrEqual(s.v.bottom);
    expect(s.ratio).toBeCloseTo(1.5, 5);
    await page.screenshot({ path: `artifacts/woods-${name}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const c = window.woodsTest.game.scene.getScene('realm').cameras.main;
    c.setZoom(0.85);
    c.centerOn(1600, 550);
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'artifacts/woods-mobile.png' });
  const mobile = await inspect();
  expect(mobile.b.x).toBeLessThanOrEqual(mobile.v.x);
  expect(mobile.b.right).toBeGreaterThanOrEqual(mobile.v.right);
  expect(mobile.b.y).toBeLessThanOrEqual(mobile.v.y);
  expect(mobile.b.bottom).toBeGreaterThanOrEqual(mobile.v.bottom);
  expect(mobile.soilBottom).toBeGreaterThan(mobile.v.bottom);
  expect(errors).toEqual([]);
  console.log(
    'PASS: continuous Woods terrain renders; eight collision-aligned platforms, seven full-height ladders, twelve prop types; background covers map edges, canopy and mobile zoom without stretching.',
  );
} finally {
  await browser.close();
}
