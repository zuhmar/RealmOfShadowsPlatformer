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
    await page.waitForFunction(() => {
      const s = window.interiorTest.game.scene.getScene('realm'),
        b = s.children.getByName('house-sky')?.getBounds(),
        v = s.cameras.main.worldView;
      return b && b.left <= v.left && b.right >= v.right && b.top <= v.top && b.bottom >= v.bottom;
    });
    expect(
      await page.evaluate(
        () =>
          window.interiorTest.game.scene.getScene('realm').children.getByName('house-backdrop')
            .displayTexture.key,
      ),
    ).toBe('house-plaster');
    await page.evaluate(() => {
      const t = window.interiorTest,
        p = t.bridge.snapshot.players[0];
      p.x = -500;
      p.y = -500;
    });
    await page.waitForFunction(() => {
      const s = window.interiorTest.game.scene.getScene('realm'),
        v = s.characters.get('owner')?.container,
        b = s.map.interiorBounds;
      return v && v.x >= b.left + 28 && v.y >= b.top + 80;
    });
    await page.evaluate(() => {
      const t = window.interiorTest,
        s = t.game.scene.getScene('realm'),
        p = t.bridge.snapshot.players[0];
      p.x = s.map.spawn.x;
      p.y = s.map.spawn.y;
    });

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
    const shell = await page.evaluate(() => {
      const s = window.interiorTest.game.scene.getScene('realm'),
        roof = s.children.getByName('house-roof'),
        plaster = s.children.getByName('house-backdrop'),
        edges = s.children.list.filter((o) => o.name === 'house-wall-edge');
      return {
        roofTexture: roof.texture.key,
        roofUniform: roof.scaleX === roof.scaleY,
        edges: edges.map((e) => e.displayTexture.key),
        plasterBelowRoof: plaster.y >= roof.y - 8,
        plasterInsideWalls: plaster.x === 64 && plaster.width === s.map.width - 128 &&
          plaster.getBounds().bottom <= s.map.interiorBounds.bottom + 28,
        windowOpenings: !!plaster.mask?.invertAlpha,
        outdoorTexture: s.children.getByName('house-outdoors').texture.key,
        foundationTheme: s.children.getByName('house-foundation').getData('theme'),
      };
    });
    expect(shell.roofTexture).toBe('house-roof');
    expect(shell.roofUniform).toBe(true);
    expect(shell.edges).toEqual(['house-wall-edge', 'house-wall-edge']);
    expect(shell.plasterBelowRoof).toBe(true);
    expect(shell.plasterInsideWalls).toBe(true);
    expect(shell.windowOpenings).toBe(true);
    expect(shell.outdoorTexture).toBe('house-outdoors');
    expect(shell.foundationTheme).toBe('village');

    await page.waitForTimeout(200);
    await page.screenshot({ path: `artifacts/${size}-house-interior.png` });
    await page.evaluate(() => {
      const s = window.interiorTest.game.scene.getScene('realm');
      s.cameras.main.stopFollow();
      s.cameras.main.centerOn(s.map.width / 2, s.map.interiorBounds.top - 80);
      s.interior.refresh();
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `artifacts/${size}-house-roof.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.waitForFunction(() => {
    const s = window.interiorTest.game.scene.getScene('realm'),
      b = s.children.getByName('house-sky').getBounds(),
      v = s.cameras.main.worldView;
    return b.left <= v.left && b.right >= v.right && b.top <= v.top && b.bottom >= v.bottom;
  });
  await page.screenshot({ path: 'artifacts/house-interior-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS: generated interior assets, three proportional maps, full-viewport backdrop, bounded character rendering, one/two/three floors, ladders and furniture per floor, desktop/mobile.',
  );
} finally {
  await browser.close();
}
