import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 2100, height: 1400 } }),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await mkdir('artifacts', { recursive: true });
  await page.goto('http://localhost:5173');
  for (const size of ['small', 'medium', 'large']) {
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
          p = createPlayer('owner', 'Homeowner', `house-${size}`);
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
    const n = { small: 1, medium: 2, large: 3 }[size];
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window.interiorTest.game.scene
              .getScene('realm')
              .children.list.filter((n) => n.name === 'house-furniture').length,
        ),
      )
      .toBe(n);
    const counts = await page.evaluate(() => {
      const s = window.interiorTest.game.scene.getScene('realm');
      return {
        floors: s.children.list.filter((n) => n.name === 'house-floor').length,
        ladders: s.children.list.filter((n) => n.name === 'house-ladder').length,
        uniform: s.children.list
          .filter((n) => n.type === 'Image')
          .every((n) => Math.abs(n.scaleX - n.scaleY) < 0.001),
      };
    });
    expect(counts.floors).toBe(n);
    expect(counts.ladders).toBe(n - 1);
    expect(counts.uniform).toBe(true);
    await page.screenshot({ path: `artifacts/${size}-house-interior.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/house-interior-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: generated interior assets, three proportional maps, one/two/three floors, ladders and furniture per floor, desktop/mobile.',
  );
} finally {
  await browser.close();
}
