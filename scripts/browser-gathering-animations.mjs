import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 750 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/assets/')) errors.push(`${r.status()} ${r.url()}`);
});
try {
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async ({ sharedPath, dataPath }) => {
      const { mountGame } = await import('/src/game.ts');
      const { createPlayer } = await import(sharedPath);
      const { WOODS_RESOURCE_NODES } = await import(dataPath);
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: 999 });
      document.body.appendChild(host);
      const players = ['male', 'female'].flatMap((appearance, row) =>
        WOODS_RESOURCE_NODES.map((node, i) =>
          Object.assign(createPlayer(`${appearance}-${node.skill}`, node.skill), {
            appearance,
            outfit: row ? 'tide' : 'sage',
            x: 650 + i * 150,
            y: row ? 760 : 555,
            grounded: true,
            platform: row ? 'ground' : 'moss',
            weapon: 'elderwood-blade',
            gathering: { nodeId: node.id, startedAt: Date.now(), finishAt: Date.now() + 30000 },
          }),
        ),
      );
      const bridge = {
        id: 'test',
        snapshot: {
          mapId: 'woods',
          players,
          wolves: [],
          drops: [],
          projectiles: [],
          time: Date.now(),
        },
        held: {},
        send: () => {},
      };
      window.gatherAnimationTest = { host, bridge, game: mountGame(host, bridge), frames: {} };
    },
    {
      sharedPath: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
      dataPath: '/@fs' + new URL('../packages/game-data/src/index.ts', import.meta.url).pathname,
    },
  );
  await page.waitForFunction(
    () => window.gatherAnimationTest.host.getAttribute('aria-busy') === 'false',
  );
  await page.evaluate(() => {
    const t = window.gatherAnimationTest,
      s = t.game.scene.getScene('realm');
    s.cameras.main.centerOn(875, 560);
    s.time.addEvent({
      delay: 35,
      loop: true,
      callback: () => {
        for (const [id, v] of s.characters) {
          (t.frames[id] ??= []).push(v.sprite.frame.name);
        }
      },
    });
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const t = window.gatherAnimationTest;
          return (
            t.game.scene.getScene('realm').characters.size === 8 &&
            Object.values(t.frames).length === 8 &&
            Object.values(t.frames).every((frames) => new Set(frames).size === 6)
          );
        }),
      { timeout: 7000 },
    )
    .toBe(true);
  expect(
    await page.evaluate(() =>
      [...window.gatherAnimationTest.game.scene.getScene('realm').characters.values()].every(
        (v) => v.key.endsWith('-gathering') && v.drawnWeapon === 'unarmed',
      ),
    ),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/gathering-held-tools.png' });
  await page.evaluate(() => {
    for (const p of window.gatherAnimationTest.bridge.snapshot.players) delete p.gathering;
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...window.gatherAnimationTest.game.scene.getScene('realm').characters.values()].every(
          (v) => v.key.endsWith('-sword'),
        ),
      ),
    )
    .toBe(true);
  expect(errors).toEqual([]);
  console.log(
    'PASS: both appearances play all6frames of4 held-tool gathering loops, outfit tint, live fishing line and restore equipped weapon afterward.',
  );
} finally {
  await browser.close();
}
