import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer, idleInput } = await import(shared);
      const { MAPS, maxHp } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      const world = new World(MAPS['woods-boss']),
        p = createPlayer('hero', 'DodgeTester', 'woods-boss');
      Object.assign(p, {
        x: 1350,
        y: 760,
        platform: 'ground',
        grounded: true,
        level: 50,
        hp: maxHp(50),
        weapon: 'elderwood-blade',
      });
      world.players.set(p.id, p);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
      document.body.appendChild(host);
      const bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: () => {},
        snapshot: world.snapshot(10000),
      };
      window.bossTest = { world, p, host, bridge, game: mountGame(host, bridge), idleInput };
      window.bossTest.tick = (now, input = idleInput()) => {
        const t = window.bossTest;
        t.world.step(0.02, now, new Map([[p.id, input]]));
        t.bridge.snapshot = t.world.snapshot(now);
        const s = t.game.scene.getScene('realm');
        for (const e of t.world.events) s.events.emit('float', e);
      };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.bossTest.host.getAttribute('aria-busy') === 'false');
  await expect
    .poll(() => page.evaluate(() => window.bossTest.game.scene.getScene('realm').wolves.size))
    .toBe(1);
  expect(
    await page.evaluate(
      () => [...window.bossTest.game.scene.getScene('realm').wolves.values()][0].sprite.scaleX,
    ),
  ).toBe(1.44);
  await page.evaluate(() => {
    const t = window.bossTest;
    t.world.wolves[0].nextSpecialAt = 10000;
    t.tick(10000);
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.bossTest.game.scene
          .getScene('realm')
          .children.list.some((c) => c.name === 'boss-danger-zone'),
      ),
    )
    .toBe(true);
  for (const [label, width, height] of [
    ['desktop', 1100, 750],
    ['mobile', 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `artifacts/boss-slam-warning-${label}.png` });
  }
  const dodge = await page.evaluate(() => {
    const t = window.bossTest,
      hp = t.p.hp,
      target = t.world.wolves[0].special.x;
    for (let n = 1; n <= 55; n++) t.tick(10000 + n * 20, { ...t.idleInput(), right: true });
    const locked = t.world.wolves[0].special.x;
    t.tick(11800);
    return { hp, after: t.p.hp, target, locked, x: t.p.x };
  });
  expect(dodge.target).toBe(dodge.locked);
  expect(dodge.x).toBeGreaterThan(dodge.target + 150);
  expect(dodge.after).toBe(dodge.hp);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.bossTest.game.scene
          .getScene('realm')
          .children.list.some((c) => c.name === 'boss-danger-zone'),
      ),
    )
    .toBe(false);
  const hit = await page.evaluate(() => {
    const t = window.bossTest;
    t.p.x = 1350;
    t.tick(19800);
    const before = t.p.hp;
    t.tick(21600);
    return before - t.p.hp;
  });
  expect(hit).toBe(88);
  await page.screenshot({ path: 'artifacts/boss-slam-impact.png' });
  await page.evaluate(() => {
    const t = window.bossTest;
    t.tick(29600);
    t.world.hitWolf(t.p, t.world.wolves[0], 10000, 29650);
    t.bridge.snapshot = t.world.snapshot(29650);
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.bossTest.game.scene
          .getScene('realm')
          .children.list.some((c) => c.name === 'boss-danger-zone'),
      ),
    )
    .toBe(false);
  expect(errors).toEqual([]);
  console.log(
    'PASS: doubled boss sprite, desktop/mobile warning, fixed target, movement dodge, 88 damage on failed dodge, impact visual and cancelled warning on boss death.',
  );
} finally {
  await browser.close();
}
