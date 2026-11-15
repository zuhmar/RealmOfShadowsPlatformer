import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 750 }, hasTouch: true }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:5173');
  await page.evaluate(
    async (shared) => {
      const { mountGame } = await import('/src/game.ts');
      const { World, createPlayer } = await import(shared);
      const snapshot = (id) => {
        const w = new World(window.clickMaps[id]),
          p = createPlayer('hero', 'Clicker', id);
        p.level = 40;
        p.houseOwnerId = p.id;
        if (id.startsWith('house-'))
          p.housing = {
            size: 'small',
            stage: 3,
            invited: [],
            furniture: [{ id: 'chest', item: 'oak-chest', x: 0, floor: 0 }],
          };
        w.players.set(p.id, p);
        return w.snapshot(Date.now());
      };
      const { MAPS } = await import(
        shared.replace('shared/src/index.ts', 'game-data/src/index.ts')
      );
      window.clickMaps = MAPS;
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:10000';
      document.body.append(host);
      const messages = [];
      const bridge = {
        id: 'hero',
        held: {},
        blocked: false,
        snapshot: snapshot('village'),
        send: (type, value) => {
          if (type !== 'input') messages.push([type, value]);
        },
        onChest: (id) => messages.push(['chest', id]),
      };
      window.clickTest = { host, bridge, messages, snapshot, game: mountGame(host, bridge) };
    },
    '/@fs' + new URL('../packages/shared/src/index.ts', import.meta.url).pathname,
  );
  await page.waitForFunction(() => window.clickTest.host.getAttribute('aria-busy') === 'false');
  async function map(id) {
    await page.evaluate((id) => {
      const t = window.clickTest;
      if (t.bridge.snapshot.mapId !== id) t.bridge.snapshot = t.snapshot(id);
    }, id);
    await page.waitForFunction((id) => {
      const t = window.clickTest,
        s = t.game.scene.getScene('realm');
      return s?.map?.id === id && t.host.getAttribute('aria-busy') === 'false';
    }, id);
  }
  async function click(name, expected, touch = false) {
    const target = await page.evaluate((name) => {
      const t = window.clickTest,
        s = t.game.scene.getScene('realm');
      const object = s.children.list.find((c) =>
        name === 'Mining'
          ? c.input && c.text === 'Mining • E'
          : name === 'chest'
            ? c.name === 'house-furniture' && c.frame?.name === 'oak-chest'
            : c.name === name,
      );
      if (!object) throw Error('Missing clickable target ' + name);
      const b = object.getBounds();
      t.point = { x: b.centerX, y: b.centerY };
      s.cameras.main.stopFollow();
      s.cameras.main.centerOn(t.point.x, t.point.y);
      return t.messages.length;
    }, name);
    await page.waitForTimeout(150);
    const point = await page.evaluate(() => {
      const t = window.clickTest,
        c = t.game.scene.getScene('realm').cameras.main;
      return { x: (t.point.x - c.worldView.x) * c.zoom, y: (t.point.y - c.worldView.y) * c.zoom };
    });
    if (touch) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect
      .poll(() => page.evaluate((n) => window.clickTest.messages.slice(n), target))
      .toContainEqual(expected);
  }
  for (const touch of [false, true]) {
    if (touch) await page.setViewportSize({ width: 390, height: 844 });
    await map('village');
    await click('interact-mira', ['interact', { npcId: 'mira' }], touch);
    await click('interact-cooking-station', ['interact', { npcId: 'cooking-station' }], touch);
    await click('travel-portal', ['portal', 'woods'], touch);
    await map('woods');
    await click('Mining', ['gather', 'woods-iron'], touch);
    await map('woods-3');
    await click('boss-entrance-prop', ['portal', 'woods-boss'], touch);
    await map('house-small');
    await click('house-exit', ['housing', { action: 'exit' }], touch);
    await click('chest', ['chest', 'chest'], touch);
  }
  expect(errors).toEqual([]);
  console.log(
    'PASS: mouse clicks and touch taps on NPCs, benches, portals, gathering nodes, keyed boss props, house doors and storage chests.',
  );
} finally {
  await browser.close();
}
