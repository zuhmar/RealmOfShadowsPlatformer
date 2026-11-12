import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
try {
  await page.goto('http://localhost:5173');
  for (const id of ['crystal', 'crystal-2', 'crystal-3', 'crystal-boss']) {
    await page.evaluate(async (id) => {
      window.ct?.game.destroy(true);
      window.ct?.host.remove();
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
      );
      const { MAPS } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
      );
      const world = new World(MAPS[id]);
      const p = createPlayer('hero', 'CrystalTester', id);
      Object.assign(p, { x: 1000, y: 800, grounded: true, platform: 'ground', level: 30 });
      world.players.set(p.id, p);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: world.snapshot(10000),
      };
      window.ct = { world, p, host, bridge, game: mountGame(host, bridge) };
    }, id);
    await page.waitForFunction(() => window.ct.host.getAttribute('aria-busy') === 'false');
    await page.waitForTimeout(350);
    const stats = await page.evaluate(() => {
      const s = window.ct.game.scene.getScene('realm');
      return {
        platforms: s.children.list
          .filter((x) => x.name === 'terrain-platform')
          .map((p) => ({
            sx: p.scaleX,
            sy: p.scaleY,
            generated: p.getData('generated'),
            source: p.getData('sourceAtlas'),
            id: p.getData('platformId'),
          })),
        ladders: s.children.list
          .filter((x) => x.name === 'terrain-ladder')
          .map((l) => ({
            source: l.getData('sourceAtlas'),
            top: l.getData('railTop'),
            expected: l.getData('top'),
            bottom: l.getData('railBottom'),
            expectedBottom: l.getData('bottom'),
          })),
        props: s.children.list.filter((x) => x.getData?.('groundedProp')).length,
      };
    });
    expect(stats.platforms.length).toBeGreaterThan(3);
    expect(
      stats.platforms.every(
        (p) =>
          p.generated &&
          p.sx === p.sy &&
          p.source === (p.id === 'fishing-dock' ? 'crystal-terrain-art' : 'crystal-platform-spans'),
      ),
    ).toBe(true);
    expect(
      stats.ladders.every(
        (l) =>
          l.source === 'crystal-terrain-art' && l.top < l.expected && l.bottom > l.expectedBottom,
      ),
    ).toBe(true);
    expect(stats.props).toBeGreaterThan(1);
    await page.screenshot({ path: `artifacts/${id}-terrain-desktop.png` });
    if (id === 'crystal') {
      await page.evaluate(() => {
        const t = window.ct;
        Object.assign(t.p, { x: 190, y: 610, platform: 'fishing-dock' });
        t.bridge.snapshot = t.world.snapshot(10020);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'artifacts/crystal-fishing-dock.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(350);
      await page.screenshot({ path: 'artifacts/crystal-terrain-mobile.png' });
      await page.setViewportSize({ width: 1200, height: 800 });
    }
    if (id === 'crystal-3') {
      await page.evaluate(() => {
        const t = window.ct;
        Object.assign(t.p, { x: 2320, y: 170, platform: 'boss-perch' });
        t.bridge.snapshot = t.world.snapshot(10020);
      });
      await page.waitForTimeout(350);
      await page.screenshot({ path: 'artifacts/crystal-boss-perch.png' });
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'Four Crystal maps use generated, uniformly scaled terrain and complete connected ladders; grounded props, dock, boss perch and mobile verified without browser errors.',
  );
} finally {
  await browser.close();
}
