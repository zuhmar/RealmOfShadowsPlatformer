import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
try {
  await page.goto('http://localhost:5173');
  for (const id of ['woods', 'crystal', 'murkmire']) {
    await page.evaluate(async (id) => {
      window.ft?.game.destroy(true);
      window.ft?.host.remove();
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
      );
      const { MAPS } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
      );
      const world = new World(MAPS[id]),
        p = createPlayer('hero', 'FishingTester', id),
        node = MAPS[id].resources.find((n) => n.skill === 'Fishing');
      Object.assign(p, {
        x: node.x + 20,
        y: node.y,
        grounded: true,
        platform: node.platform,
        level: 30,
        gatheringSkills: { Fishing: { level: 30, xp: 0 } },
      });
      world.players.set(p.id, p);
      const gathering = world.startGathering(p, node.id, 10000);
      if (!gathering || p.x !== node.x || p.facing !== 1)
        throw new Error('Fishing did not align with dock.');
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
      window.ft = { world, p, host, bridge, game: mountGame(host, bridge) };
    }, id);
    await page.waitForFunction(() => window.ft.host.getAttribute('aria-busy') === 'false');
    await page.waitForTimeout(500);
    const art = await page.evaluate(async () => {
      const t = window.ft,
        s = t.game.scene.getScene('realm'),
        pond = s.children.list.find(
          (x) => x.name === 'terrain-platform' && x.getData('platformId') === 'fishing-dock',
        );
      const { fishingCast } = await import('/src/island-traversal.ts');
      const cast = fishingCast(t.p);
      return {
        key: pond.texture.key,
        uniform: pond.scaleX === pond.scaleY,
        water: pond.getData('waterOnTop'),
        cast: cast.x + t.p.x,
        target: pond.getData('castX'),
        waterY: pond.getData('waterY'),
        castY: cast.y + t.p.y,
        ladders: s.children.list
          .filter((x) => x.name === 'terrain-ladder')
          .map((l) => ({
            key: l.getData('sourceAtlas'),
            top: l.getData('railTop'),
            end: l.getData('railBottom'),
            expectedTop: l.getData('top'),
            expectedEnd: l.getData('bottom'),
          })),
      };
    });
    expect(art.key).toBe(`traversal-${id}`);
    expect(art.uniform && art.water).toBe(true);
    expect(art.cast).toBeCloseTo(art.target, 5);
    expect(art.castY).toBeCloseTo(art.waterY, 5);
    expect(art.ladders.length).toBeGreaterThan(3);
    expect(
      art.ladders.every(
        (l) => l.key === `traversal-${id}` && l.top < l.expectedTop && l.end > l.expectedEnd,
      ),
    ).toBe(true);
    await page.screenshot({ path: `artifacts/${id}-fishing-pond-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `artifacts/${id}-fishing-pond-mobile.png` });
    await page.setViewportSize({ width: 1200, height: 800 });
  }
  expect(errors).toEqual([]);
  console.log(
    'Three playable islands: generated themed ladders join both landings; proportional ponds hold water on top, players stand on docks, bobbers land in pools; desktop/mobile without errors.',
  );
} finally {
  await browser.close();
}
