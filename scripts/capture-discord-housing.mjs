import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  for (const size of ['small']) {
    await page.evaluate(
      async ({ shared, size }) => {
        window.interiorTest?.game.destroy(true);
        window.interiorTest?.host.remove();
        const { mountGame } = await import('/src/game.ts'),
          { createPlayer } = await import(shared),
          { HOUSE_LAYOUTS } = await import(
            shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
          );
        const l = HOUSE_LAYOUTS[size],
          p = createPlayer('owner', 'Adventurer', `house-${size}`);
        p.houseOwnerId = p.id;
        p.housing = {
          size,
          stage: 3,
          invited: [],
          furniture: l.floors.map((_, floor) => ({
            id: `chair-${floor}`,
            item: 'oak-chair',
            x: 0,
            floor,
          })),
        };
        p.housingView = { ownerId: p.id, ownerName: p.name, ...p.housing };
        const host = document.createElement('div');
        Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 9999 });
        document.body.append(host);
        const calls = [],
          bridge = {
            id: p.id,
            held: {},
            send: (type, value) => calls.push({ type, value }),
            snapshot: { mapId: p.mapId, players: [p], wolves: [], drops: [], time: Date.now() },
          };
        window.interiorTest = { host, bridge, calls, game: mountGame(host, bridge) };
      },
      {
        shared: '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
        size,
      },
    );
    await page.waitForFunction(
      () => window.interiorTest.host.getAttribute('aria-busy') === 'false',
    );
    await page.evaluate(() => {
      const s = window.interiorTest.game.scene.getScene('realm');
      s.cameras.main.stopFollow();
      s.cameras.main.setZoom(1);
      s.cameras.main.centerOn(500, 220);
      s.interior.refresh();
    });
    await page.waitForTimeout(700);
    await page.screenshot({path:'docs/community/discord/housing-gameplay.png'});
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
}
