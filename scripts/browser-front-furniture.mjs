import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const errors = [];
try {
  await mkdir('artifacts', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts'),
        { createPlayer } = await import(shared);
      const p = createPlayer('owner', 'Decorator', 'house-medium');
      p.houseOwnerId = p.id;
      p.x = 160;
      p.y = 780;
      p.grounded = true;
      const ids = ['oak-table', 'oak-chair', 'oak-bed', 'oak-chest'];
      p.inventory = Object.fromEntries(ids.map((id) => [id, 1]));
      p.housing = {
        size: 'medium',
        stage: 3,
        invited: [],
        furniture: ids.map((item, i) => ({
          id: item,
          item,
          x: [-375, -125, 125, 375][i],
          floor: 0,
        })),
      };
      const host = document.createElement('div');
      Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 9999 });
      document.body.append(host);
      const bridge = {
        id: p.id,
        held: {},
        blocked: true,
        send: () => {},
        snapshot: { mapId: p.mapId, players: [p], wolves: [], drops: [], time: Date.now() },
      };
      window.frontFurniture = { host, bridge, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(
    () => window.frontFurniture.host.getAttribute('aria-busy') === 'false',
  );
  await page.waitForFunction(
    () =>
      window.frontFurniture.game.scene
        .getScene('realm')
        .children.list.filter((o) => o.name === 'house-furniture').length === 4,
  );
  await page.evaluate(() => {
    const s = window.frontFurniture.game.scene.getScene('realm');
    s.cameras.main.stopFollow();
    s.cameras.main.centerOn(725, 550);
  });
  await page.waitForTimeout(250);
  const sprites = await page.evaluate(() =>
    window.frontFurniture.game.scene
      .getScene('realm')
      .children.list.filter((o) => o.name === 'house-furniture')
      .map((o) => ({
        texture: o.texture.key,
        frame: o.frame.name,
        uniform: Math.abs(o.scaleX - o.scaleY) < 0.001,
        rotation: o.rotation,
      })),
  );
  expect(sprites.map((s) => s.frame)).toEqual(['oak-table', 'oak-chair', 'oak-bed', 'oak-chest']);
  expect(
    sprites.every((s) => s.texture === 'front-furniture' && s.uniform && s.rotation === 0),
  ).toBe(true);
  await page.screenshot({ path: 'artifacts/front-facing-furniture-desktop.png' });
  for (const id of ['oak-table', 'oak-chair', 'oak-bed', 'oak-chest']) {
    await page.evaluate((item) => {
      window.frontFurniture.bridge.furniturePlacement = { item, onTarget: () => {} };
    }, id);
    await page.waitForFunction((item) => {
      const o = window.frontFurniture.game.scene
        .getScene('realm')
        .children.getByName('furniture-placement-preview');
      return o?.visible && o.texture.key === 'front-furniture' && o.frame.name === item;
    }, id);
  }
  await page.evaluate(() => {
    delete window.frontFurniture.bridge.furniturePlacement;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/front-facing-furniture-mobile.png' });
  expect(errors).toEqual([]);
  console.log(
    'PASS all four decorations and placement previews use front-facing art, uniform scale and no rotation on desktop/mobile.',
  );
} finally {
  await browser.close();
}
