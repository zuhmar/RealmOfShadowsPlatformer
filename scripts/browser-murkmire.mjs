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
  for (const id of ['murkmire', 'murkmire-2', 'murkmire-3', 'murkmire-boss']) {
    await page.evaluate(async (id) => {
      window.mt?.game.destroy(true);
      window.mt?.host.remove();
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
      );
      const { MAPS, maxHp } = await import(
        '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
      );
      const world = new World(MAPS[id]);
      const p = createPlayer('hero', 'MireTester', id);
      Object.assign(p, {
        x: id === 'murkmire-boss' ? 1000 : 900,
        y: 820,
        grounded: true,
        platform: 'ground',
        level: 30,
        hp: maxHp(30),
        weapon: 'swamp-sword',
      });
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
      window.mt = { world, p, host, bridge, game: mountGame(host, bridge) };
    }, id);
    await page.waitForFunction(() => window.mt.host.getAttribute('aria-busy') === 'false');
    await page.waitForTimeout(500);
    await expect
      .poll(() => page.evaluate(() => window.mt.game.scene.getScene('realm').wolves.size))
      .toBe(id === 'murkmire-boss' ? 1 : 10);
    const terrain = await page.evaluate(() =>
      window.mt.game.scene
        .getScene('realm')
        .children.list.filter((x) => x.name === 'terrain-platform')
        .map((x) => ({ id: x.getData('platformId'), sx: x.scaleX, sy: x.scaleY })),
    );
    expect(terrain.every((p) => p.sx === p.sy)).toBe(true);
    await page.screenshot({ path: `artifacts/${id}-desktop.png` });
    if (id === 'murkmire-boss') {
      await page.evaluate(() => {
        const t = window.mt;
        const w = t.world.wolves[0];
        w.special = { x: 1100, y: 820, radius: 150, startedAt: 10000, impactAt: 11800 };
        w.slamStartedAt = 10000;
        t.bridge.snapshot = t.world.snapshot(10900);
      });
      await expect
        .poll(() =>
          page.evaluate(() =>
            window.mt.game.scene
              .getScene('realm')
              .children.list.some((x) => x.name === 'boss-venom-warning'),
          ),
        )
        .toBe(true);
      await page.screenshot({ path: 'artifacts/hydra-warning.png' });
      await page.evaluate(() => {
        const s = window.mt.game.scene.getScene('realm');
        s.events.emit('float', {
          type: 'bossAttack',
          monster: 'hydra',
          x: 1100,
          y: 820,
          radius: 150,
          text: 'VENOM ERUPTION!',
        });
      });
      // emit the same event type used by the world.
      const fx = await page.evaluate(async () => {
        const { bossImpact } = await import('/src/boss-attacks.ts');
        const s = window.mt.game.scene.getScene('realm');
        bossImpact(s, {
          type: 'bossAttack',
          monster: 'hydra',
          x: 1100,
          y: 820,
          radius: 150,
          text: '',
        });
        return s.children.list.some((x) => x.name === 'boss-venom-impact');
      });
      expect(fx).toBe(true);
      await page.waitForTimeout(230);
      await page.screenshot({ path: 'artifacts/hydra-impact.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(350);
      await page.screenshot({ path: 'artifacts/murkmire-mobile.png' });
    }
  }
  expect(errors).toEqual([]);
  console.log(
    'All four Murkmire maps render, 31 monsters, uniform terrain scaling, generated Hydra warning and impact; no browser errors.',
  );
} finally {
  await browser.close();
}
