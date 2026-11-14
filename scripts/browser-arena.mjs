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
  await page.evaluate(async () => {
    const { mountGame } = await import('/src/game.ts');
    const { World, createPlayer } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
    );
    const { MAPS } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
    );
    const w = new World(MAPS.murkmire),
      p = createPlayer('hero', 'Arena Scout', 'murkmire');
    Object.assign(p, {
      x: 440,
      y: 820,
      level: 30,
      skin: 'knight',
      classId: 'knight',
      weapon: 'swamp-sword',
    });
    w.players.set(p.id, p);
    const host = document.createElement('div');
    Object.assign(host.style, { position: 'fixed', inset: 0, zIndex: 999 });
    document.body.append(host);
    const sends = [],
      bridge = {
        id: p.id,
        blocked: true,
        held: {},
        send: (t, v) => sends.push([t, v]),
        snapshot: w.snapshot(100000),
      };
    window.ar = { host, bridge, sends, game: mountGame(host, bridge) };
  });
  await page.waitForFunction(() => window.ar.host.getAttribute('aria-busy') === 'false');
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.ar.game.scene
          .getScene('realm')
          .children.list.some((x) => x.name === 'arena-entrance'),
      ),
    )
    .toBe(true);
  const entrance = await page.evaluate(() => {
    const s = window.ar.game.scene.getScene('realm'),
      x = s.children.list.find((x) => x.name === 'arena-entrance');
    x.emit('pointerdown');
    return { sx: x.scaleX, sy: x.scaleY, generated: x.getData('generated') };
  });
  expect(entrance.sx).toBe(entrance.sy);
  expect(entrance.generated).toBe(true);
  expect(await page.evaluate(() => window.ar.sends.some(([t]) => t === 'travel'))).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/arena-entrance-desktop.png' });
  await page.evaluate(async () => {
    const { World, createPlayer } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/shared/src/index.ts'
    );
    const { MAPS } = await import(
      '/@fs/workspace/RealmOfShadowsPlatformer/packages/game-data/src/index.ts'
    );
    const { default: React } = await import('/node_modules/.vite/deps/react.js'),
      {
        default: { createRoot },
      } = await import('/node_modules/.vite/deps/react-dom_client.js'),
      { ArenaHud } = await import('/src/arena-hud.tsx');
    const w = new World(MAPS['murkmire-arena']),
      a = createPlayer('hero', 'Celestial Knight', 'murkmire-arena'),
      b = createPlayer('rival', 'Mire Rogue', 'murkmire-arena');
    Object.assign(a, { level: 30, skin: 'knight', classId: 'knight', weapon: 'swamp-sword' });
    Object.assign(b, { level: 30, skin: 'rogue', classId: 'rogue', weapon: 'swamp-dagger' });
    for (const p of [a, b]) {
      w.players.set(p.id, p);
      w.arena.join(p);
    }
    const hud = document.createElement('div');
    Object.assign(hud.style, { position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' });
    document.body.append(hud);
    const root = createRoot(hud),
      t = window.ar;
    t.world = w;
    t.a = a;
    t.b = b;
    t.now = 100000;
    t.refresh = () => {
      t.bridge.snapshot = w.snapshot(t.now);
      root.render(
        React.createElement(ArenaHud, {
          player: a,
          players: [a, b],
          time: t.now,
          send: (type, v) => {
            t.sends.push([type, v]);
            if (type === 'arena') {
              w.arena.ready(a, v, t.now);
              t.refresh();
            }
          },
        }),
      );
    };
    t.refresh();
  });
  await page.waitForFunction(
    () =>
      window.ar.host.getAttribute('aria-busy') === 'false' &&
      window.ar.game.scene.getScene('realm').map.id === 'murkmire-arena',
  );
  await expect(page.getByRole('region', { name: 'Arena duel' })).toBeVisible();
  await page.getByRole('button', { name: 'Ready to duel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel ready' })).toBeVisible();
  await page.evaluate(() => {
    const t = window.ar;
    t.world.arena.ready(t.b, true, t.now);
    t.refresh();
  });
  await expect(page.getByRole('heading', { name: 'Duel begins in 5' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/arena-countdown-desktop.png' });
  await page.evaluate(() => {
    const t = window.ar;
    t.now += 5000;
    t.world.step(0, t.now, new Map());
    t.a.x = 750;
    t.b.x = 1000;
    t.refresh();
  });
  await expect(page.getByRole('heading', { name: '3:00' })).toBeVisible();
  const terrain = await page.evaluate(() =>
    window.ar.game.scene
      .getScene('realm')
      .children.list.filter((x) => x.name === 'terrain-platform')
      .map((x) => ({ sx: x.scaleX, sy: x.scaleY })),
  );
  expect(terrain.length).toBe(4);
  expect(terrain.every((x) => x.sx === x.sy)).toBe(true);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/arena-duel-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const bounds = await page.getByRole('region', { name: 'Arena duel' }).boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'artifacts/arena-duel-mobile.png' });
  await page.evaluate(() => {
    const t = window.ar;
    t.world.arena.finish(t.a.id, 'Knockout', t.now);
    t.refresh();
  });
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  const beforeLeave = await page.evaluate(
    () => window.ar.sends.filter(([t]) => t === 'travel').length,
  );
  await page.getByRole('button', { name: 'Leave arena', exact: true }).click();
  expect(await page.evaluate(() => window.ar.sends.filter(([t]) => t === 'travel').length)).toBe(
    beforeLeave + 1,
  );
  expect(errors).toEqual([]);
  console.log(
    'Arena generated entrance, map transition, unstretched terrain, Ready/countdown/live/result controls and mobile HUD passed.',
  );
} finally {
  await browser.close();
}
