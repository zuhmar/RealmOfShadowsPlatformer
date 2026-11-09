import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 850 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts'),
        { createPlayer } = await import(shared);
      const p = createPlayer('owner', 'ExistingPlot', 'village');
      Object.assign(p, {
        x: 900,
        y: 240,
        platform: 'housing',
        housing: { size: 'small', stage: 0, invited: [], furniture: [] },
      });
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 99999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        held: {},
        send: () => {},
        snapshot: { players: [p], wolves: [], drops: [], mapId: 'village', time: Date.now() },
      };
      window.plotCheck = { host, p, bridge, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.plotCheck.host.getAttribute('aria-busy') === 'false');
  await page.waitForFunction(
    () =>
      !!window.plotCheck.game.scene.getScene('realm').children.getByName('housing-plot-markers'),
  );
  expect(
    await page.evaluate(
      () =>
        window.plotCheck.game.scene.getScene('realm').children.getByName('housing-build-hint').text,
    ),
  ).toContain('Build Foundation');
  await page.evaluate(() => {
    window.plotCheck.p.housing.stage = 1;
    window.plotCheck.bridge.snapshot = { ...window.plotCheck.bridge.snapshot, time: Date.now() };
  });
  await page.waitForFunction(
    () => !window.plotCheck.game.scene.getScene('realm').children.getByName('housing-plot-markers'),
  );
  expect(
    await page.evaluate(() =>
      window.plotCheck.game.scene
        .getScene('realm')
        .children.list.some(
          (n) => n.texture?.key === 'housing-art' && n.frame.name === 'house-frame',
        ),
    ),
  ).toBe(true);
  await page.evaluate(() => {
    delete window.plotCheck.p.housing;
  });
  await page.waitForFunction(
    () =>
      !window.plotCheck.game.scene
        .getScene('realm')
        .children.list.some((n) => n.texture?.key === 'housing-art'),
  );
  expect(errors).toEqual([]);
  console.log(
    'PASS: existing stage-zero plot renders markers without a view payload, next-step hint appears, foundation replaces markers, empty plot clears private art.',
  );
} finally {
  await browser.close();
}
